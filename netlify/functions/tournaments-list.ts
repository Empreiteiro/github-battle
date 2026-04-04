import type { Context } from '@netlify/functions';
import { getAllTournaments } from './tournament-store.js';

export default async function handler(_request: Request, _context: Context) {
  try {
    const tournaments = await getAllTournaments();
    const sorted = tournaments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return new Response(JSON.stringify(sorted), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to list tournaments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
