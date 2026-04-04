import type { Context } from '@netlify/functions';
import { saveBattle, sanitizeBattle } from './store.js';
import type { StoredBattle } from './store.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const INTERVAL_MS: Record<string, number> = {
  '1h': 3600_000,
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

function getEndDate(startDate: string, interval: string): string {
  const start = new Date(startDate);
  return new Date(start.getTime() + (INTERVAL_MS[interval] || 24 * 3600_000)).toISOString();
}

async function fetchAvatar(username: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return `https://github.com/${username}.png`;
    const data = await res.json();
    return data.avatar_url;
  } catch {
    return `https://github.com/${username}.png`;
  }
}

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await request.json();
    const { name, password, interval, participants, maxParticipants, customStart, customEnd, scoring, repos } = body;

    if (!name || !interval || !participants || !Array.isArray(participants) || participants.length < 1) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const now = new Date();
    const id = generateId();
    const nowISO = now.toISOString();

    let startDate: string;
    let endDate: string;
    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else {
      const lookback = INTERVAL_MS[interval] || 24 * 3600_000;
      startDate = new Date(now.getTime() - lookback).toISOString();
      endDate = getEndDate(nowISO, interval);
    }

    const participantList = await Promise.all(
      participants.map(async (username: string) => {
        const avatarUrl = await fetchAvatar(username);
        return {
          username,
          avatarUrl,
          score: 0,
          stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 },
          hp: 100,
        };
      }),
    );

    const battle: StoredBattle = {
      id,
      name,
      password: password || null,
      interval,
      startDate,
      endDate,
      status: participantList.length >= 2 ? 'active' : 'waiting',
      participants: participantList,
      votes: {},
      maxParticipants: maxParticipants || 10,
      scoring: scoring || undefined,
      repos: repos && repos.length > 0 ? repos : undefined,
      lastRefresh: startDate,
      createdAt: nowISO,
    };

    await saveBattle(battle);

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to create battle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
