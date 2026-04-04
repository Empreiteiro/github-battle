import type { Context } from '@netlify/functions';
import { getTournament, saveTournament } from './tournament-store.js';
import { getBattle, saveBattle } from './store.js';
import type { StoredBattle } from './store.js';

const INTERVAL_MS: Record<string, number> = {
  '1h': 3600_000,
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function createMatchBattle(
  tournamentId: string,
  tournamentName: string,
  round: number,
  matchNum: number,
  player1: string,
  player2: string,
  avatar1: string,
  avatar2: string,
  roundDuration: string,
  scoring?: Record<string, unknown>,
  repos?: string[],
): Promise<string> {
  const id = generateId();
  const now = new Date();
  const ms = INTERVAL_MS[roundDuration] || 24 * 3600_000;
  const startDate = new Date(now.getTime() - ms).toISOString();
  const endDate = new Date(now.getTime() + ms).toISOString();

  const battle: StoredBattle = {
    id,
    name: `${tournamentName} \u2014 R${round} M${matchNum}`,
    password: null,
    interval: roundDuration,
    startDate,
    endDate,
    status: 'active',
    participants: [
      { username: player1, avatarUrl: avatar1, score: 0, stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 }, hp: 100 },
      { username: player2, avatarUrl: avatar2, score: 0, stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 }, hp: 100 },
    ],
    votes: {},
    maxParticipants: 2,
    scoring: scoring as StoredBattle['scoring'],
    repos: repos,
    lastRefresh: startDate,
    createdAt: now.toISOString(),
  };

  await saveBattle(battle);
  return id;
}

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing tournament id' }), { status: 400 });
  }

  try {
    const tournament = await getTournament(id);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), { status: 404 });
    }

    let changed = false;

    // If tournament just became active and round 1 has no battles, generate bracket
    if (tournament.status === 'active' && tournament.rounds[0]?.status === 'pending') {
      const shuffled = shuffle(tournament.participants);
      const round1 = tournament.rounds[0];

      for (let i = 0; i < round1.matches.length; i++) {
        const p1 = shuffled[i * 2];
        const p2 = shuffled[i * 2 + 1];
        round1.matches[i].player1 = p1;
        round1.matches[i].player2 = p2;

        const battleId = await createMatchBattle(
          tournament.id,
          tournament.name,
          1,
          i + 1,
          p1,
          p2,
          tournament.participantAvatars[p1] || `https://github.com/${p1}.png`,
          tournament.participantAvatars[p2] || `https://github.com/${p2}.png`,
          tournament.roundDuration,
          tournament.scoring,
          tournament.repos,
        );
        round1.matches[i].battleId = battleId;
      }

      round1.status = 'active';
      changed = true;
    }

    // Check active round for completion and advance
    const activeRoundIdx = tournament.rounds.findIndex(r => r.status === 'active');
    if (activeRoundIdx >= 0) {
      const activeRound = tournament.rounds[activeRoundIdx];
      let allFinished = true;

      for (const match of activeRound.matches) {
        if (!match.battleId || match.winner) continue;

        const battle = await getBattle(match.battleId);
        if (!battle || battle.status !== 'finished') {
          allFinished = false;
          continue;
        }

        // Determine winner
        const sorted = [...battle.participants].sort((a, b) => b.score - a.score);
        match.winner = sorted[0]?.username || match.player1;
        changed = true;
      }

      // Check if some matches still have no winner
      if (activeRound.matches.some(m => !m.winner)) {
        allFinished = false;
      }

      // Advance to next round
      if (allFinished) {
        activeRound.status = 'finished';
        changed = true;

        const nextRoundIdx = activeRoundIdx + 1;
        if (nextRoundIdx < tournament.rounds.length) {
          // Populate next round with winners
          const nextRound = tournament.rounds[nextRoundIdx];
          const winners = activeRound.matches.map(m => m.winner!);

          for (let i = 0; i < nextRound.matches.length; i++) {
            const p1 = winners[i * 2];
            const p2 = winners[i * 2 + 1];
            nextRound.matches[i].player1 = p1;
            nextRound.matches[i].player2 = p2;

            const battleId = await createMatchBattle(
              tournament.id,
              tournament.name,
              nextRound.roundNumber,
              i + 1,
              p1,
              p2,
              tournament.participantAvatars[p1] || `https://github.com/${p1}.png`,
              tournament.participantAvatars[p2] || `https://github.com/${p2}.png`,
              tournament.roundDuration,
              tournament.scoring,
              tournament.repos,
            );
            nextRound.matches[i].battleId = battleId;
          }

          nextRound.status = 'active';
        } else {
          // Final round finished — tournament complete
          tournament.status = 'finished';
          tournament.champion = activeRound.matches[0]?.winner || undefined;
        }
      }
    }

    if (changed) {
      await saveTournament(tournament);
    }

    return new Response(JSON.stringify(tournament), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to get tournament' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
