import type { Context } from '@netlify/functions';
import { getBattle, deleteBattle } from './store.js';
import { verifyGitHubToken, isModerator } from './verify-token.js';

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { id, createdBy } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing battle id' }), { status: 400 });
    }

    const battle = await getBattle(id);
    if (!battle) {
      return new Response(JSON.stringify({ error: 'Battle not found' }), { status: 404 });
    }

    // Try to verify identity via GitHub OAuth token (secure path)
    const authHeader = request.headers.get('Authorization');
    const verifiedUsername = await verifyGitHubToken(authHeader);

    if (verifiedUsername) {
      // Token-verified: check if moderator or owner
      const isMod = isModerator(verifiedUsername);
      const isOwner = battle.createdBy === verifiedUsername;

      if (!isMod && !isOwner) {
        return new Response(JSON.stringify({ error: 'Not authorized to delete this battle' }), { status: 403 });
      }
    } else {
      // No valid token: fall back to browser ID check (non-logged-in creator)
      // This only works for browser-ID-based creators (b_xxx format)
      if (!createdBy || !battle.createdBy) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
      }
      // Only allow if createdBy is a browser ID (starts with b_) and matches
      if (!battle.createdBy.startsWith('b_') || battle.createdBy !== createdBy) {
        return new Response(JSON.stringify({ error: 'Not authorized to delete this battle' }), { status: 403 });
      }
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
