import type { Battle } from '../types';
import GitHubAvatar from './GitHubAvatar';

interface Props {
  battle: Battle;
  onVote: (username: string) => void;
}

export default function VotePanel({ battle, onVote }: Props) {
  const totalVotes = Object.values(battle.votes).reduce((a, b) => a + b, 0);

  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg">
      <h3 className="pixel-font text-xs text-accent-yellow mb-4 text-center">
        &#127942; PUBLIC VOTES
      </h3>

      <div className="space-y-3">
        {battle.participants.map(p => {
          const votes = battle.votes[p.username] || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

          return (
            <div key={p.username} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} className="w-6 h-6" />
                  <span className="text-sm text-dark-text">{p.username}</span>
                </div>
                <span className="pixel-font text-[10px] text-dark-muted">
                  {votes} ({percentage}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-dark-bg rounded overflow-hidden">
                  <div
                    className="h-full bg-accent-purple transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <button
                  onClick={() => onVote(p.username)}
                  disabled={battle.status === 'finished'}
                  className="pixel-font text-[8px] bg-accent-purple/20 text-accent-purple border border-accent-purple/50 px-2 py-1 rounded hover:bg-accent-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  VOTE
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <span className="pixel-font text-[10px] text-dark-muted">
          Total: {totalVotes} votes
        </span>
      </div>
    </div>
  );
}
