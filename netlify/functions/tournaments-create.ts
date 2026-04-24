import type { Context } from '@netlify/functions';
import { saveTournament } from './tournament-store.js';
import type { StoredTournament } from './tournament-store.js';

function generateId(): string {
  return 't' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export default async function handler(request: Request, _context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { name, size, roundDuration, scoringMode, scoring, repos, participants } = await request.json();
    const mode: 'window' | 'sprint' = scoringMode === 'sprint' ? 'sprint' : 'window';

    if (!name || !size || !roundDuration) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    if (![4, 8, 16].includes(size)) {
      return new Response(JSON.stringify({ error: 'Size must be 4, 8, or 16' }), { status: 400 });
    }

    const id = generateId();
    const numRounds = Math.log2(size);
    const rounds: StoredTournament['rounds'] = [];
    for (let r = 1; r <= numRounds; r++) {
      const matchCount = size / Math.pow(2, r);
      rounds.push({
        roundNumber: r,
        matches: Array.from({ length: matchCount }, () => ({
          battleId: null,
          player1: null,
          player2: null,
          winner: null,
        })),
        status: 'pending',
      });
    }

    // Fetch avatars for initial participants
    const avatars: Record<string, string> = {};
    const initialParticipants: string[] = [];
    if (participants && Array.isArray(participants)) {
      for (const username of participants.slice(0, size)) {
        if (!username.trim()) continue;
        initialParticipants.push(username.trim());
        try {
          const res = await fetch(`https://api.github.com/users/${username.trim()}`);
          if (res.ok) {
            const d = await res.json();
            avatars[username.trim()] = d.avatar_url;
          } else {
            avatars[username.trim()] = `https://github.com/${username.trim()}.png`;
          }
        } catch {
          avatars[username.trim()] = `https://github.com/${username.trim()}.png`;
        }
      }
    }

    const tournament: StoredTournament = {
      id,
      name,
      size,
      roundDuration,
      scoringMode: mode,
      scoring: scoring || undefined,
      repos: repos && repos.length > 0 ? repos : undefined,
      status: initialParticipants.length >= size ? 'active' : 'registration',
      participants: initialParticipants,
      participantAvatars: avatars,
      rounds,
      createdAt: new Date().toISOString(),
    };

    await saveTournament(tournament);

    return new Response(JSON.stringify(tournament), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to create tournament' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
