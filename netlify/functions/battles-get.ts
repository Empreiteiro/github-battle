import type { Context } from '@netlify/functions';
import { getBattle, sanitizeBattle } from './store.js';

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing battle id' }), { status: 400 });
  }

  try {
    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    return new Response(JSON.stringify(sanitizeBattle(battle)), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to get battle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
