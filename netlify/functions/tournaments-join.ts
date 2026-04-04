import type { Context } from '@netlify/functions';
import { getTournament, saveTournament } from './tournament-store.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, username } = await request.json();
    if (!id || !username) {
      return new Response(JSON.stringify({ error: 'Missing id or username' }), { status: 400 });
    }

    const tournament = await getTournament(id);
    if (!tournament) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), { status: 404 });
    }
    if (tournament.status !== 'registration') {
      return new Response(JSON.stringify({ error: 'Registration closed' }), { status: 400 });
    }
    if (tournament.participants.includes(username)) {
      return new Response(JSON.stringify({ error: 'Already registered' }), { status: 400 });
    }
    if (tournament.participants.length >= tournament.size) {
      return new Response(JSON.stringify({ error: 'Tournament is full' }), { status: 400 });
    }

    // Fetch avatar
    let avatarUrl = `https://github.com/${username}.png`;
    try {
      const res = await fetch(`https://api.github.com/users/${username}`);
      if (res.ok) {
        const d = await res.json();
        avatarUrl = d.avatar_url;
      }
    } catch { /* fallback */ }

    tournament.participants.push(username);
    tournament.participantAvatars[username] = avatarUrl;

    // Auto-start if full
    if (tournament.participants.length >= tournament.size) {
      tournament.status = 'active';
      // Note: bracket generation + battle creation happens in tournaments-get
      // to avoid slow response here
    }

    await saveTournament(tournament);

    return new Response(JSON.stringify(tournament), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to join tournament' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
