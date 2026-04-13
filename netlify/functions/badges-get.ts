import type { Context } from '@netlify/functions';
import { getPlayerRecord } from './leaderboard-store.js';

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Missing username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const record = await getPlayerRecord(username.toLowerCase());
    const badges = record?.badges ?? [];

    return new Response(JSON.stringify({ username, badges }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch badges' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
