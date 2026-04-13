import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BadgeId } from '../types';
import { useAuth } from '../auth/AuthContext';
import { api } from '../utils/api';
import { BADGE_DEFINITIONS } from '../data/badges';

const CATEGORIES = [
  { key: 'wins', label: 'Victories', color: 'text-accent-green' },
  { key: 'streaks', label: 'Streaks', color: 'text-accent-orange' },
  { key: 'activity', label: 'Activity', color: 'text-accent-blue' },
  { key: 'special', label: 'Special', color: 'text-accent-purple' },
] as const;

export default function BadgesPage() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Set<BadgeId>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.getPlayerBadges(user.username)
        .then(data => setEarned(new Set(data.badges.map(b => b.badgeId as BadgeId))))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  const earnedCount = BADGE_DEFINITIONS.filter(b => earned.has(b.id)).length;

  return (
    <div>
      <div className="text-center py-6">
        <h1 className="pixel-font text-xl md:text-2xl text-accent-purple mb-2">
          &#127941; Achievements
        </h1>
        <p className="text-dark-muted text-sm">
          Earn badges by completing challenges across battles
        </p>
        {user && !loading && (
          <p className="pixel-font text-[10px] text-accent-green mt-3">
            {earnedCount} / {BADGE_DEFINITIONS.length} UNLOCKED
          </p>
        )}
        {!user && (
          <p className="text-[10px] text-dark-muted mt-3">
            Sign in to see your progress
          </p>
        )}
      </div>

      {CATEGORIES.map(cat => {
        const badges = BADGE_DEFINITIONS.filter(b => b.category === cat.key);
        if (badges.length === 0) return null;
        return (
          <section key={cat.key} className="mb-8">
            <h2 className={`pixel-font text-[10px] ${cat.color} mb-4`}>
              {cat.label.toUpperCase()}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {badges.map(badge => {
                const unlocked = earned.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`pixel-border bg-dark-card p-4 rounded-lg text-center transition-all ${
                      unlocked
                        ? 'border-accent-purple/30'
                        : 'opacity-50 grayscale'
                    }`}
                  >
                    <div className="text-3xl mb-2">
                      {unlocked ? badge.icon : '🔒'}
                    </div>
                    <h3 className="pixel-font text-[10px] text-dark-text mb-1">
                      {badge.name}
                    </h3>
                    <p className="text-[10px] text-dark-muted leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="text-center mt-8">
        <Link
          to="/leaderboard"
          className="pixel-font text-[10px] text-dark-muted hover:text-accent-yellow transition-colors no-underline"
        >
          &larr; Back to Leaderboard
        </Link>
      </div>
    </div>
  );
}
