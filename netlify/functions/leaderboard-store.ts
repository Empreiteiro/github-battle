import { getStore } from '@netlify/blobs';

export interface StoredPlayerRecord {
  username: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  draws: number;
  battlesPlayed: number;
  totalScore: number;
  highestScore: number;
  totalCommits: number;
  totalPRs: number;
  totalReviews: number;
  battlesCreated: number;
  currentWinStreak: number;
  longestWinStreak: number;
  uniqueOpponents: string[];
  badges: { badgeId: string; earnedAt: string; battleId: string }[];
  battleHistory: { battleId: string; date: string; score: number; won: boolean; opponentCount: number }[];
  lastUpdated: string;
}

function getLeaderboardStore() {
  return getStore({ name: 'leaderboard', consistency: 'strong' });
}

export async function getPlayerRecord(username: string): Promise<StoredPlayerRecord | null> {
  const store = getLeaderboardStore();
  try {
    const data = await store.get(username.toLowerCase(), { type: 'json' });
    return (data as StoredPlayerRecord) || null;
  } catch {
    return null;
  }
}

export async function savePlayerRecord(record: StoredPlayerRecord): Promise<void> {
  const store = getLeaderboardStore();
  await store.setJSON(record.username.toLowerCase(), record);
}

export async function getAllPlayerRecords(): Promise<StoredPlayerRecord[]> {
  const store = getLeaderboardStore();
  const { blobs } = await store.list();
  const records: StoredPlayerRecord[] = [];
  for (const blob of blobs) {
    try {
      const data = await store.get(blob.key, { type: 'json' });
      if (data) records.push(data as StoredPlayerRecord);
    } catch {
      // skip corrupt entries
    }
  }
  return records;
}

export function createEmptyRecord(username: string, avatarUrl: string): StoredPlayerRecord {
  return {
    username,
    avatarUrl,
    wins: 0,
    losses: 0,
    draws: 0,
    battlesPlayed: 0,
    totalScore: 0,
    highestScore: 0,
    totalCommits: 0,
    totalPRs: 0,
    totalReviews: 0,
    battlesCreated: 0,
    currentWinStreak: 0,
    longestWinStreak: 0,
    uniqueOpponents: [],
    badges: [],
    battleHistory: [],
    lastUpdated: new Date().toISOString(),
  };
}
