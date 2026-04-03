import type { ParticipantStats } from '../types';
import { SCORING } from '../types';

export function calculateScore(stats: ParticipantStats): number {
  return (
    stats.commits * SCORING.commit +
    stats.pullRequests * SCORING.pr +
    stats.pullRequestsMerged * SCORING.pr_merged +
    stats.issues * SCORING.issue +
    stats.reviews * SCORING.review +
    stats.comments * SCORING.comment
  );
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
