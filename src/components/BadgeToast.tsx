import { useEffect } from 'react';
import type { BadgeDefinition } from '../types';

interface Props {
  badges: BadgeDefinition[];
  onDismiss: () => void;
}

export default function BadgeToast({ badges, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (badges.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 animate-slide-up">
      {badges.map(badge => (
        <div
          key={badge.id}
          className="pixel-border bg-dark-card border-accent-purple/50 px-4 py-3 rounded-lg flex items-center gap-3 shadow-lg shadow-accent-purple/20"
        >
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <p className="pixel-font text-[10px] text-accent-purple">BADGE UNLOCKED!</p>
            <p className="text-sm text-dark-text font-bold">{badge.name}</p>
            <p className="text-[10px] text-dark-muted">{badge.description}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-dark-muted hover:text-dark-text cursor-pointer ml-2"
          >
            &#10005;
          </button>
        </div>
      ))}
    </div>
  );
}
