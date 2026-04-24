import { getStore } from '@netlify/blobs';

export interface StoredBattle {
  id: string;
  name: string;
  password: string | null;
  interval: string;
  scoringMode?: 'window' | 'sprint'; // default 'window' for legacy battles
  startDate: string;
  endDate: string;
  status: 'waiting' | 'active' | 'finished';
  participants: {
    username: string;
    avatarUrl: string;
    score: number;
    stats: {
      commits: number;
      pullRequests: number;
      pullRequestsMerged: number;
      issues: number;
      reviews: number;
      comments: number;
    };
    heatmap?: number[][];
    hp: number;
  }[];
  votes: Record<string, number>;
  maxParticipants: number;
  scoring?: {
    enabled: Record<string, boolean>;
    points: Record<string, number>;
  };
  repos?: string[];
  createdBy?: string;
  scoreHistory?: { timestamp: string; scores: Record<string, number> }[];
  lastRefresh: string;
  createdAt: string;
  leaderboardUpdated?: boolean;
  teams?: {
    id: string;
    name: string;
    color?: string;
    members: string[];
  }[];
}

function getBattleStore() {
  return getStore({ name: 'battles', consistency: 'strong' });
}

export async function getAllBattles(): Promise<StoredBattle[]> {
  const store = getBattleStore();
  const { blobs } = await store.list();
  const battles: StoredBattle[] = [];
  for (const blob of blobs) {
    try {
      const data = await store.get(blob.key, { type: 'json' });
      if (data) battles.push(data as StoredBattle);
    } catch {
      // skip corrupt entries
    }
  }
  return battles;
}

export async function getBattle(id: string): Promise<StoredBattle | null> {
  const store = getBattleStore();
  try {
    const data = await store.get(id, { type: 'json' });
    return (data as StoredBattle) || null;
  } catch {
    return null;
  }
}

export async function saveBattle(battle: StoredBattle): Promise<void> {
  const store = getBattleStore();
  await store.setJSON(battle.id, battle);
}

export async function deleteBattle(id: string): Promise<void> {
  const store = getBattleStore();
  await store.delete(id);
}

export function sanitizeBattle(battle: StoredBattle): StoredBattle & { hasPassword: boolean } {
  return {
    ...battle,
    password: null,
    hasPassword: battle.password !== null,
  };
}
