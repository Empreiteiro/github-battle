export interface ParticipantStats {
  commits: number;
  pullRequests: number;
  pullRequestsMerged: number;
  issues: number;
  reviews: number;
  comments: number;
}

export interface Participant {
  username: string;
  avatarUrl: string;
  score: number;
  stats: ParticipantStats;
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
  scoreHistory?: ScoreSnapshot[];
  lastRefresh: string;
  createdAt: string;
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
