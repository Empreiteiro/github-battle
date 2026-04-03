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

export type BattleInterval = '1h' | '6h' | '24h' | '7d' | '30d';
export type BattleStatus = 'waiting' | 'active' | 'finished';

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
  lastRefresh: string;
  createdAt: string;
}

export interface CreateBattleRequest {
  name: string;
  password?: string;
  interval: BattleInterval;
  participants: string[];
  maxParticipants: number;
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
};

export const SCORING: Record<string, number> = {
  commit: 5,
  pr: 10,
  pr_merged: 15,
  issue: 3,
  review: 8,
  comment: 1,
};
