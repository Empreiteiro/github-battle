import type { Context } from '@netlify/functions';
import { getAllPlayerRecords, type StoredPlayerRecord } from './leaderboard-store.js';

interface LeaderboardEntry {
  username: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  battlesPlayed: number;
  totalScore: number;
  highestScore: number;
  winRate: number;
  badges: { badgeId: string; earnedAt: string; battleId: string }[];
}

function toEntry(r: StoredPlayerRecord): LeaderboardEntry {
  return {
    username: r.username,
    avatarUrl: r.avatarUrl,
    wins: r.wins,
    losses: r.losses,
    battlesPlayed: r.battlesPlayed,
    totalScore: r.totalScore,
    highestScore: r.highestScore,
    winRate: r.battlesPlayed > 0 ? r.wins / r.battlesPlayed : 0,
    badges: r.badges,
  };
}

function toFilteredEntry(r: StoredPlayerRecord, cutoff: Date): LeaderboardEntry {
  const recent = r.battleHistory.filter(h => new Date(h.date) >= cutoff);
  const wins = recent.filter(h => h.won).length;
  const played = recent.length;
  const totalScore = recent.reduce((sum, h) => sum + h.score, 0);
  const highestScore = recent.reduce((max, h) => Math.max(max, h.score), 0);

  return {
    username: r.username,
    avatarUrl: r.avatarUrl,
    wins,
    losses: played - wins,
    battlesPlayed: played,
    totalScore,
    highestScore,
    winRate: played > 0 ? wins / played : 0,
    badges: r.badges,
  };
}

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'all-time';

  try {
    const records = await getAllPlayerRecords();

    let entries: LeaderboardEntry[];
    if (filter === 'all-time') {
      entries = records.map(r => toEntry(r));
    } else {
      const cutoff = filter === 'month'
        ? new Date(Date.now() - 30 * 24 * 3600_000)
        : new Date(Date.now() - 7 * 24 * 3600_000);
      entries = records.map(r => toFilteredEntry(r, cutoff));
    }

    // Filter out players with 0 battles in this time window
    entries = entries.filter(e => e.battlesPlayed > 0);

    // Sort: wins desc, then winRate desc, then totalScore desc
    entries.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.totalScore - a.totalScore);

    return new Response(JSON.stringify(entries), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
