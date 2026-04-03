import type { ParticipantStats, ScoringConfig } from '../types';
import { DEFAULT_SCORING } from '../types';

export function calculateScore(stats: ParticipantStats, config?: ScoringConfig): number {
  const c = config || DEFAULT_SCORING;
  let score = 0;
  if (c.enabled.commit) score += stats.commits * c.points.commit;
  if (c.enabled.pr) score += stats.pullRequests * c.points.pr;
  if (c.enabled.pr_merged) score += stats.pullRequestsMerged * c.points.pr_merged;
  if (c.enabled.issue) score += stats.issues * c.points.issue;
  if (c.enabled.review) score += stats.reviews * c.points.review;
  if (c.enabled.comment) score += stats.comments * c.points.comment;
  return score;
}

export function calculateHP(myScore: number, maxScore: number): number {
  if (maxScore === 0) return 100;
  return Math.max(5, Math.round((myScore / maxScore) * 100));
}

export function getAttackName(type: string): string {
  const names: Record<string, string> = {
    commit: 'COMMIT SLASH',
    pr: 'PR STRIKE',
    pr_merged: 'MERGE BLAST',
    issue: 'ISSUE THROW',
    review: 'REVIEW BEAM',
    comment: 'COMMENT JAB',
  };
  return names[type] || 'ATTACK';
}

export function getAttackColor(type: string): string {
  const colors: Record<string, string> = {
    commit: '#39d353',
    pr: '#58a6ff',
    pr_merged: '#bc8cff',
    issue: '#d29922',
    review: '#f85149',
    comment: '#8b949e',
  };
  return colors[type] || '#c9d1d9';
}
