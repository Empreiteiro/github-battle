import type { Battle, CreateBattleRequest, JoinBattleRequest, VoteRequest, Tournament, CreateTournamentRequest, TournamentRound } from '../types';
import { DEFAULT_SCORING } from '../types';
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
      status: participants.length >= 2 ? 'active' : 'waiting',
      participants,
      votes: {},
      maxParticipants: data.maxParticipants || 10,
      scoring: data.scoring || DEFAULT_SCORING,
      repos: data.repos && data.repos.length > 0 ? data.repos : undefined,
      createdBy: data.createdBy,
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

    // Activate battle when a challenger joins a waiting battle
    if (battle.status === 'waiting' && battle.participants.length >= 2) {
      battle.status = 'active';
      battle.lastRefresh = battle.startDate; // force immediate score refresh
    }

    save(battle);
    return battle;
  },

  async deleteBattle(id: string, createdBy: string): Promise<{ success: boolean }> {
    const battle = await localStore.getBattle(id);
    if (battle.createdBy !== createdBy) throw new Error('Not authorized');
    const all = readAll();
    delete all[id];
    writeAll(all);
    return { success: true };
  },

  async leaveBattle(id: string, username: string): Promise<Battle> {
    const battle = await localStore.getBattle(id);
    const idx = battle.participants.findIndex(p => p.username === username);
    if (idx === -1) throw new Error('Not in this battle');
    battle.participants.splice(idx, 1);
    delete battle.votes[username];
    if (battle.participants.length === 0) battle.status = 'finished';
    else if (battle.participants.length < 2 && battle.status === 'active') battle.status = 'waiting';
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
        fetchGitHubEvents(p.username, battle.startDate, battle.repos),
      );
      const allResults = await Promise.all(statsPromises);

      let maxScore = 0;
      for (let i = 0; i < battle.participants.length; i++) {
        battle.participants[i].stats = allResults[i].stats;
        battle.participants[i].heatmap = allResults[i].heatmap;
        battle.participants[i].score = calculateScore(allResults[i].stats, battle.scoring);
        if (battle.participants[i].score > maxScore) {
          maxScore = battle.participants[i].score;
        }
      }

      for (const p of battle.participants) {
        p.hp = calculateHP(p.score, maxScore);
      }

      // Record score snapshot for replay
      const snapshot: Record<string, number> = {};
      for (const p of battle.participants) {
        snapshot[p.username] = p.score;
      }
      if (!battle.scoreHistory) battle.scoreHistory = [];
      battle.scoreHistory.push({ timestamp: new Date().toISOString(), scores: snapshot });

      battle.lastRefresh = new Date().toISOString();
    }

    save(battle);
    return battle;
  },

  // --- Tournaments ---

  async listTournaments(): Promise<Tournament[]> {
    try {
      const data = JSON.parse(localStorage.getItem('github-battle-tournaments') || '{}');
      return Object.values(data as Record<string, Tournament>).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch { return []; }
  },

  async createTournament(data: CreateTournamentRequest): Promise<Tournament> {
    const id = 't' + generateId();
    const numRounds = Math.log2(data.size);
    const rounds: TournamentRound[] = [];
    for (let r = 1; r <= numRounds; r++) {
      const matchCount = data.size / Math.pow(2, r);
      rounds.push({
        roundNumber: r,
        matches: Array.from({ length: matchCount }, () => ({
          battleId: null, player1: null, player2: null, winner: null,
        })),
        status: 'pending',
      });
    }

    const participants: string[] = [];
    const participantAvatars: Record<string, string> = {};
    if (data.participants) {
      for (const u of data.participants.filter(x => x.trim())) {
        participants.push(u.trim());
        participantAvatars[u.trim()] = `https://github.com/${u.trim()}.png`;
      }
    }

    const tournament: Tournament = {
      id, name: data.name, size: data.size,
      roundDuration: data.roundDuration,
      scoring: data.scoring || DEFAULT_SCORING,
      repos: data.repos,
      status: participants.length >= data.size ? 'active' : 'registration',
      participants, participantAvatars, rounds,
      createdAt: new Date().toISOString(),
    };

    const all = JSON.parse(localStorage.getItem('github-battle-tournaments') || '{}');
    all[id] = tournament;
    localStorage.setItem('github-battle-tournaments', JSON.stringify(all));
    return tournament;
  },

  async getTournament(id: string): Promise<Tournament> {
    const all = JSON.parse(localStorage.getItem('github-battle-tournaments') || '{}');
    const t = all[id] as Tournament;
    if (!t) throw new Error('Tournament not found');
    return t;
  },

  async joinTournament(id: string, username: string): Promise<Tournament> {
    const all = JSON.parse(localStorage.getItem('github-battle-tournaments') || '{}');
    const t = all[id] as Tournament;
    if (!t) throw new Error('Tournament not found');
    if (t.status !== 'registration') throw new Error('Registration closed');
    if (t.participants.includes(username)) throw new Error('Already registered');
    t.participants.push(username);
    t.participantAvatars[username] = `https://github.com/${username}.png`;
    if (t.participants.length >= t.size) t.status = 'active';
    all[id] = t;
    localStorage.setItem('github-battle-tournaments', JSON.stringify(all));
    return t;
  },
};
