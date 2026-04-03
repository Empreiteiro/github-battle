import type { Context } from '@netlify/functions';
import { getBattle, saveBattle, sanitizeBattle } from './store.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, username } = await request.json();

    if (!id || !username) {
      return new Response(JSON.stringify({ error: 'Missing id or username' }), { status: 400 });
    }

    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    if (!battle.participants.some(p => p.username === username)) {
      return new Response(JSON.stringify({ error: 'Participant not in battle' }), { status: 400 });
    }

    battle.votes[username] = (battle.votes[username] || 0) + 1;

    await saveBattle(battle);

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to vote' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
