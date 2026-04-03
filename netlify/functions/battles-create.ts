import type { Context } from '@netlify/functions';
import { saveBattle, sanitizeBattle } from './store.js';
import type { StoredBattle } from './store.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getEndDate(startDate: string, interval: string): string {
  const start = new Date(startDate);
  switch (interval) {
    case '1h': return new Date(start.getTime() + 60 * 60 * 1000).toISOString();
    case '6h': return new Date(start.getTime() + 6 * 60 * 60 * 1000).toISOString();
    case '24h': return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
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
    const { name, password, interval, participants, maxParticipants } = body;

    if (!name || !interval || !participants || !Array.isArray(participants) || participants.length < 1) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const id = generateId();

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
      startDate: now,
      endDate: getEndDate(now, interval),
      status: 'active',
      participants: participantList,
      votes: {},
      maxParticipants: maxParticipants || 10,
      lastRefresh: now,
      createdAt: now,
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
