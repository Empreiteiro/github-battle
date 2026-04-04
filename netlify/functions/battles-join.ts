import type { Context } from '@netlify/functions';
import { getBattle, saveBattle, sanitizeBattle } from './store.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, username, password } = await request.json();

    if (!id || !username) {
      return new Response(JSON.stringify({ error: 'Missing id or username' }), { status: 400 });
    }

    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    if (battle.password && battle.password !== password) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 403 });
    }

    if (battle.participants.length >= battle.maxParticipants) {
      return new Response(JSON.stringify({ error: 'Battle is full' }), { status: 400 });
    }

    if (battle.participants.some(p => p.username === username)) {
      return new Response(JSON.stringify({ error: 'Already in battle' }), { status: 400 });
    }

    let avatarUrl = `https://github.com/${username}.png`;
    try {
      const res = await fetch(`https://api.github.com/users/${username}`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (res.ok) {
        const data = await res.json();
        avatarUrl = data.avatar_url;
      }
    } catch { /* use fallback */ }

    battle.participants.push({
      username,
      avatarUrl,
      score: 0,
      stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 },
      hp: 100,
    });

    // Activate battle when a challenger joins a waiting battle
    if (battle.status === 'waiting' && battle.participants.length >= 2) {
      battle.status = 'active';
      battle.lastRefresh = battle.startDate; // force immediate score refresh
    }

    await saveBattle(battle);

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to join battle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
