import { getStore } from '@netlify/blobs';

export interface StoredTournament {
  id: string;
  name: string;
  size: 4 | 8 | 16;
  roundDuration: string;
  scoring?: { enabled: Record<string, boolean>; points: Record<string, number> };
  repos?: string[];
  status: 'registration' | 'active' | 'finished';
  participants: string[];
  participantAvatars: Record<string, string>;
  rounds: {
    roundNumber: number;
    matches: { battleId: string | null; player1: string | null; player2: string | null; winner: string | null }[];
    status: 'pending' | 'active' | 'finished';
  }[];
  champion?: string;
  createdAt: string;
}

function getTournamentStore() {
  return getStore({ name: 'tournaments', consistency: 'strong' });
}

export async function getAllTournaments(): Promise<StoredTournament[]> {
  const store = getTournamentStore();
  const { blobs } = await store.list();
  const tournaments: StoredTournament[] = [];
  for (const blob of blobs) {
    try {
      const data = await store.get(blob.key, { type: 'json' });
      if (data) tournaments.push(data as StoredTournament);
    } catch { /* skip */ }
  }
  return tournaments;
}

export async function getTournament(id: string): Promise<StoredTournament | null> {
  const store = getTournamentStore();
  try {
    const data = await store.get(id, { type: 'json' });
    return (data as StoredTournament) || null;
  } catch {
    return null;
  }
}

export async function saveTournament(tournament: StoredTournament): Promise<void> {
  const store = getTournamentStore();
  await store.setJSON(tournament.id, tournament);
}
