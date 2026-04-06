import type { Context } from '@netlify/functions';
import { getBattle, deleteBattle } from './store.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, createdBy } = await request.json();

    if (!id || !createdBy) {
      return new Response(JSON.stringify({ error: 'Missing id or createdBy' }), { status: 400 });
    }

    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    // Verify ownership: createdBy must match (GitHub username or browser ID)
    if (battle.createdBy && battle.createdBy !== createdBy) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this battle' }), { status: 403 });
    }

    // If no createdBy was stored on the battle (legacy), deny deletion
    if (!battle.createdBy) {
      return new Response(JSON.stringify({ error: 'Cannot determine battle owner' }), { status: 403 });
    }

    await deleteBattle(id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to delete battle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
