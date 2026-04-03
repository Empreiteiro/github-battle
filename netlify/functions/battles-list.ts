import type { Context } from '@netlify/functions';
import { getAllBattles, sanitizeBattle } from './store.js';

export default async function handler(_request: Request, _context: Context) {
  try {
    const battles = await getAllBattles();
    const publicBattles = battles
      .map(sanitizeBattle)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return new Response(JSON.stringify(publicBattles), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to list battles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
