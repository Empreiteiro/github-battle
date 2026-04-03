import type { Battle, CreateBattleRequest, JoinBattleRequest, VoteRequest } from '../types';
import { fetchGitHubEvents } from './github';
import { calculateScore, calculateHP } from './scoring';

const STORAGE_KEY = 'github-battle-data';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const INTERVAL_MS: Record<string, number> = {
  '1h': 3600_000,
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

function getEndDate(startDate: string, interval: string): string {
  const start = new Date(startDate);
  return new Date(start.getTime() + (INTERVAL_MS[interval] || 24 * 3600_000)).toISOString();
}

function readAll(): Record<string, Battle> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Battle>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function save(battle: Battle) {
  const all = readAll();
  all[battle.id] = battle;
  writeAll(all);
}

export const localStore = {
  async listBattles(): Promise<Battle[]> {
    const all = readAll();
    return Object.values(all).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  async getBattle(id: string): Promise<Battle> {
    const all = readAll();
    const battle = all[id];
    if (!battle) throw new Error('Battle not found');
    return battle;
  },

  async createBattle(data: CreateBattleRequest): Promise<Battle> {
    const now = new Date();
    const id = generateId();

    // Use custom dates if provided, otherwise calculate from interval
    let startDate: string;
    let endDate: string;
    if (data.customStart && data.customEnd) {
      startDate = data.customStart;
      endDate = data.customEnd;
    } else {
      const lookback = INTERVAL_MS[data.interval] || 24 * 3600_000;
      startDate = new Date(now.getTime() - lookback).toISOString();
      endDate = getEndDate(now.toISOString(), data.interval);
    }

    const participants = await Promise.all(
      data.participants.filter(u => u.trim()).map(async username => {
        let avatarUrl = `https://github.com/${username}.png`;
        try {
          const res = await fetch(`https://api.github.com/users/${username}`);
          if (res.ok) {
            const d = await res.json();
            avatarUrl = d.avatar_url;
          }
        } catch { /* fallback */ }
        return {
          username,
          avatarUrl,
          score: 0,
          stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 },
          hp: 100,
        };
      }),
    );

    const battle: Battle = {
      id,
      name: data.name,
      hasPassword: !!data.password,
      interval: data.interval,
      startDate,
      endDate,
      status: 'active',
      participants,
      votes: {},
      maxParticipants: data.maxParticipants || 10,
      lastRefresh: startDate, // force immediate refresh on first load
      createdAt: now.toISOString(),
    };

    save(battle);
    return battle;
  },

  async joinBattle(id: string, data: JoinBattleRequest): Promise<Battle> {
    const battle = await localStore.getBattle(id);

    if (battle.participants.some(p => p.username === data.username)) {
      throw new Error('Already in battle');
    }
    if (battle.participants.length >= battle.maxParticipants) {
      throw new Error('Battle is full');
    }

    let avatarUrl = `https://github.com/${data.username}.png`;
    try {
      const res = await fetch(`https://api.github.com/users/${data.username}`);
      if (res.ok) {
        const d = await res.json();
        avatarUrl = d.avatar_url;
      }
    } catch { /* fallback */ }

    battle.participants.push({
      username: data.username,
      avatarUrl,
      score: 0,
      stats: { commits: 0, pullRequests: 0, pullRequestsMerged: 0, issues: 0, reviews: 0, comments: 0 },
      hp: 100,
    });

    save(battle);
    return battle;
  },

  async vote(id: string, data: VoteRequest): Promise<Battle> {
    const battle = await localStore.getBattle(id);
    battle.votes[data.username] = (battle.votes[data.username] || 0) + 1;
    save(battle);
    return battle;
  },

  async refreshScores(id: string): Promise<Battle> {
    const battle = await localStore.getBattle(id);

    // Check if ended
    if (new Date() > new Date(battle.endDate) && battle.status === 'active') {
      battle.status = 'finished';
    }

    // Refresh if 60+ seconds since last, or if scores have never been fetched
    const timeSinceRefresh = Date.now() - new Date(battle.lastRefresh).getTime();
    const neverFetched = battle.participants.every(p => p.score === 0 && p.stats.commits === 0);
    if ((timeSinceRefresh > 60_000 || neverFetched) && battle.status === 'active') {
      const statsPromises = battle.participants.map(p =>
        fetchGitHubEvents(p.username, battle.startDate),
      );
      const allStats = await Promise.all(statsPromises);

      let maxScore = 0;
      for (let i = 0; i < battle.participants.length; i++) {
        battle.participants[i].stats = allStats[i];
        battle.participants[i].score = calculateScore(allStats[i]);
        if (battle.participants[i].score > maxScore) {
          maxScore = battle.participants[i].score;
        }
      }

      for (const p of battle.participants) {
        p.hp = calculateHP(p.score, maxScore);
      }

      battle.lastRefresh = new Date().toISOString();
    }

    save(battle);
    return battle;
  },
};
