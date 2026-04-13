export interface ParticipantStats {
  commits: number;
  pullRequests: number;
  pullRequestsMerged: number;
  issues: number;
  reviews: number;
  comments: number;
}

// Bucketed event counts for heatmap: [dayOfWeek 0-6][hour 0-23] = count
export type HeatmapData = number[][];

export interface Participant {
  username: string;
  avatarUrl: string;
  score: number;
  stats: ParticipantStats;
  heatmap?: HeatmapData;
  hp: number; // 0-100, visual representation
}

export type BattleInterval = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
export type BattleStatus = 'waiting' | 'active' | 'finished';

export type ScoringKey = 'commit' | 'pr' | 'pr_merged' | 'issue' | 'review' | 'comment';

export interface ScoringConfig {
  enabled: Record<ScoringKey, boolean>;
  points: Record<ScoringKey, number>;
}

export const DEFAULT_SCORING: ScoringConfig = {
  enabled: { commit: true, pr: true, pr_merged: true, issue: true, review: true, comment: true },
  points: { commit: 5, pr: 10, pr_merged: 15, issue: 3, review: 8, comment: 1 },
};

export const SCORING_LABELS: Record<ScoringKey, string> = {
  commit: 'Commits',
  pr: 'PRs Opened',
  pr_merged: 'PRs Merged',
  issue: 'Issues',
  review: 'Code Reviews',
  comment: 'Comments',
};

export interface ScoreSnapshot {
  timestamp: string;
  scores: Record<string, number>; // username -> score
}

export interface Battle {
  id: string;
  name: string;
  hasPassword: boolean;
  interval: BattleInterval;
  startDate: string;
  endDate: string;
  status: BattleStatus;
  participants: Participant[];
  votes: Record<string, number>;
  maxParticipants: number;
  scoring: ScoringConfig;
  repos?: string[];
  tournamentId?: string;
  scoreHistory?: ScoreSnapshot[];
  createdBy?: string; // GitHub username or browser ID
  lastRefresh: string;
  createdAt: string;
  newBadges?: Record<string, string[]>;
}

export interface CreateBattleRequest {
  name: string;
  password?: string;
  interval: BattleInterval;
  customStart?: string;
  customEnd?: string;
  participants: string[];
  maxParticipants: number;
  scoring?: ScoringConfig;
  repos?: string[];
  createdBy?: string;
}

export interface JoinBattleRequest {
  username: string;
  password?: string;
}

export interface VoteRequest {
  username: string;

}

export interface AttackEvent {
  id: string;
  attacker: string;
  type: 'commit' | 'pr' | 'pr_merged' | 'issue' | 'review' | 'comment';
  damage: number;
  timestamp: number;
}

export const INTERVAL_LABELS: Record<BattleInterval, string> = {
  '1h': '1 Hour',
  '6h': '6 Hours',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  'custom': 'Custom',
};

export const SCORING: Record<string, number> = {
  commit: 5,
  pr: 10,
  pr_merged: 15,
  issue: 3,
  review: 8,
  comment: 1,
};

// --- Tournaments ---

export type TournamentSize = 4 | 8 | 16;
export type TournamentStatus = 'registration' | 'active' | 'finished';

export interface TournamentMatch {
  battleId: string | null;
  player1: string | null;
  player2: string | null;
  winner: string | null;
}

export interface TournamentRound {
  roundNumber: number;
  matches: TournamentMatch[];
  status: 'pending' | 'active' | 'finished';
}

export interface Tournament {
  id: string;
  name: string;
  size: TournamentSize;
  roundDuration: BattleInterval;
  scoring: ScoringConfig;
  repos?: string[];
  status: TournamentStatus;
  participants: string[];
  participantAvatars: Record<string, string>;
  rounds: TournamentRound[];
  champion?: string;
  createdAt: string;
}

export interface CreateTournamentRequest {
  name: string;
  size: TournamentSize;
  roundDuration: BattleInterval;
  scoring?: ScoringConfig;
  repos?: string[];
  participants?: string[];
}

export const ROUND_NAMES: Record<number, Record<number, string>> = {
  4: { 1: 'Semifinals', 2: 'Final' },
  8: { 1: 'Quarterfinals', 2: 'Semifinals', 3: 'Final' },
  16: { 1: 'Round of 16', 2: 'Quarterfinals', 3: 'Semifinals', 4: 'Final' },
};

// --- Leaderboard & Badges ---

export type BadgeId =
  | 'first_blood'
  | 'champion'
  | 'underdog'
  | 'on_fire'
  | 'dominator'
  | 'flawless'
  | 'challenger'
  | 'social_butterfly'
  | 'committer'
  | 'pr_machine'
  | 'reviewer'
  | 'sniper'
  | 'arena_master';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  category: 'wins' | 'activity' | 'streaks' | 'special';
}

export interface EarnedBadge {
  badgeId: BadgeId;
  earnedAt: string;
  battleId: string;
}

export interface BattleHistoryEntry {
  battleId: string;
  date: string;
  score: number;
  won: boolean;
  opponentCount: number;
}

export interface PlayerRecord {
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
  badges: EarnedBadge[];
  battleHistory: BattleHistoryEntry[];
  lastUpdated: string;
}

export interface LeaderboardEntry {
  username: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  battlesPlayed: number;
  totalScore: number;
  highestScore: number;
  winRate: number;
  badges: EarnedBadge[];
}

export type LeaderboardTimeFilter = 'all-time' | 'month' | 'week';
