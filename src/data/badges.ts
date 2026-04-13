import type { BadgeDefinition, BadgeId } from '../types';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Wins
  { id: 'first_blood', name: 'First Blood', description: 'Win your first battle', icon: '🩸', category: 'wins' },
  { id: 'champion', name: 'Champion', description: 'Win 10 battles', icon: '🏆', category: 'wins' },
  { id: 'arena_master', name: 'Arena Master', description: 'Create 10 battles', icon: '🏟️', category: 'wins' },

  // Streaks
  { id: 'on_fire', name: 'On Fire', description: 'Win 3 battles in a row', icon: '🔥', category: 'streaks' },

  // Activity
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Participate in 10+ battles', icon: '🌍', category: 'activity' },
  { id: 'committer', name: 'Committer', description: 'Accumulate 1000+ commits across all battles', icon: '📝', category: 'activity' },
  { id: 'pr_machine', name: 'PR Machine', description: 'Accumulate 100+ pull requests across all battles', icon: '🔀', category: 'activity' },
  { id: 'reviewer', name: 'Reviewer', description: 'Accumulate 50+ code reviews across all battles', icon: '👀', category: 'activity' },

  // Special
  { id: 'underdog', name: 'Underdog', description: 'Win a battle while having fewer public votes', icon: '🐶', category: 'special' },
  { id: 'dominator', name: 'Dominator', description: 'Finish a battle with 90%+ territory', icon: '👑', category: 'special' },
  { id: 'flawless', name: 'Flawless', description: 'Win a battle where opponent scored 0', icon: '💀', category: 'special' },
  { id: 'challenger', name: 'Challenger', description: 'Accept and win a 1v1 challenge (waiting battle)', icon: '⚔️', category: 'special' },
  { id: 'sniper', name: 'Sniper', description: 'Win a battle by 1 point margin', icon: '🎯', category: 'special' },
];

export const BADGE_MAP: Record<BadgeId, BadgeDefinition> = Object.fromEntries(
  BADGE_DEFINITIONS.map(b => [b.id, b]),
) as Record<BadgeId, BadgeDefinition>;
