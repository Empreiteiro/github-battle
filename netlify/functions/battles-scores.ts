import type { Context } from '@netlify/functions';
import { getBattle, saveBattle, sanitizeBattle } from './store.js';

const SCORING = {
  commits: 5,
  pullRequests: 10,
  pullRequestsMerged: 15,
  issues: 3,
  reviews: 8,
  comments: 1,
};

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: {
    action?: string;
    pull_request?: { merged?: boolean };
    size?: number;
    commits?: unknown[];
  };
}

async function fetchStats(username: string, since: string) {
  const stats = {
    commits: 0,
    pullRequests: 0,
    pullRequestsMerged: 0,
    issues: 0,
    reviews: 0,
    comments: 0,
  };

  try {
    const sinceDate = new Date(since).getTime();
    let page = 1;
    let done = false;

    while (!done && page <= 3) {
      const res = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
        { headers: { Accept: 'application/vnd.github.v3+json' } },
      );
      if (!res.ok) break;
      const events: GitHubEvent[] = await res.json();
      if (events.length === 0) break;

      for (const event of events) {
        if (new Date(event.created_at).getTime() < sinceDate) {
          done = true;
          break;
        }
        switch (event.type) {
          case 'PushEvent':
            stats.commits += event.payload?.commits?.length || event.payload?.size || 1;
            break;
          case 'PullRequestEvent':
            if (event.payload?.action === 'opened') stats.pullRequests++;
            if (event.payload?.pull_request?.merged) stats.pullRequestsMerged++;
            break;
          case 'IssuesEvent':
            if (event.payload?.action === 'opened') stats.issues++;
            break;
          case 'PullRequestReviewEvent':
            stats.reviews++;
            break;
          case 'IssueCommentEvent':
          case 'CommitCommentEvent':
          case 'PullRequestReviewCommentEvent':
            stats.comments++;
            break;
        }
      }
      page++;
    }
  } catch { /* partial stats */ }

  return stats;
}

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
    const shouldRefresh = now.getTime() - lastRefresh > 60_000;

    if (shouldRefresh && battle.status === 'active') {
      // Fetch all participant stats in parallel
      const statsPromises = battle.participants.map(p =>
        fetchStats(p.username, battle.startDate),
      );
      const allStats = await Promise.all(statsPromises);

      // Update participants
      let maxScore = 0;
      for (let i = 0; i < battle.participants.length; i++) {
        const s = allStats[i];
        battle.participants[i].stats = s;
        battle.participants[i].score =
          s.commits * SCORING.commits +
          s.pullRequests * SCORING.pullRequests +
          s.pullRequestsMerged * SCORING.pullRequestsMerged +
          s.issues * SCORING.issues +
          s.reviews * SCORING.reviews +
          s.comments * SCORING.comments;
        if (battle.participants[i].score > maxScore) {
          maxScore = battle.participants[i].score;
        }
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
