import type { Context } from '@netlify/functions';
import { getBattle, saveBattle, sanitizeBattle } from './store.js';
import { fetchStatsGraphQL } from './github-graphql.js';

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing battle id' }), { status: 400 });
  }

  try {
    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    // Check if battle has ended
    const now = new Date();
    if (now > new Date(battle.endDate) && battle.status === 'active') {
      battle.status = 'finished';
    }

    // Cache: only refresh if 60+ seconds since last refresh
    const lastRefresh = new Date(battle.lastRefresh).getTime();
    const neverFetched = battle.participants.every(p => p.score === 0);
    const shouldRefresh = now.getTime() - lastRefresh > 60_000 || neverFetched;

    if (shouldRefresh && battle.status === 'active') {
      // Fetch all participant stats in parallel using GraphQL (falls back to REST)
      const statsPromises = battle.participants.map(p =>
        fetchStatsGraphQL(p.username, battle.startDate, battle.endDate),
      );
      const allStats = await Promise.all(statsPromises);

      // Update participants using battle's scoring config
      const sc = battle.scoring || {
        enabled: { commit: true, pr: true, pr_merged: true, issue: true, review: true, comment: true },
        points: { commit: 5, pr: 10, pr_merged: 15, issue: 3, review: 8, comment: 1 },
      };
      let maxScore = 0;
      for (let i = 0; i < battle.participants.length; i++) {
        const s = allStats[i];
        battle.participants[i].stats = s;
        let score = 0;
        if (sc.enabled.commit) score += s.commits * sc.points.commit;
        if (sc.enabled.pr) score += s.pullRequests * sc.points.pr;
        if (sc.enabled.pr_merged) score += s.pullRequestsMerged * sc.points.pr_merged;
        if (sc.enabled.issue) score += s.issues * sc.points.issue;
        if (sc.enabled.review) score += s.reviews * sc.points.review;
        if (sc.enabled.comment) score += s.comments * sc.points.comment;
        battle.participants[i].score = score;
        if (score > maxScore) maxScore = score;
      }

      // Calculate HP based on relative scores
      for (const p of battle.participants) {
        p.hp = maxScore === 0 ? 100 : Math.max(5, Math.round((p.score / maxScore) * 100));
      }

      battle.lastRefresh = now.toISOString();
      await saveBattle(battle);
    }

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to refresh scores' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
