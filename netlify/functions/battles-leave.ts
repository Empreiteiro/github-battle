import type { Context } from '@netlify/functions';
import { getBattle, saveBattle, sanitizeBattle } from './store.js';
import { verifyGitHubToken } from './verify-token.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, username } = await request.json();

    if (!id || !username) {
      return new Response(JSON.stringify({ error: 'Missing id or username' }), { status: 400 });
    }

    // Verify the caller is actually this user via OAuth token
    const authHeader = request.headers.get('Authorization');
    const verifiedUsername = await verifyGitHubToken(authHeader);

    if (verifiedUsername && verifiedUsername !== username) {
      return new Response(JSON.stringify({ error: 'Token does not match username' }), { status: 403 });
    }

    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    const idx = battle.participants.findIndex(p => p.username === username);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Not in this battle' }), { status: 400 });
    }

    battle.participants.splice(idx, 1);
    delete battle.votes[username];

    if (battle.participants.length === 0) {
      battle.status = 'finished';
    } else if (battle.participants.length < 2 && battle.status === 'active') {
      battle.status = 'waiting';
    }

    await saveBattle(battle);

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to leave battle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
