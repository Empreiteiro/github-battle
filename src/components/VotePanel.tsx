import { useState, useEffect } from 'react';
import type { Battle } from '../types';
import GitHubAvatar from './GitHubAvatar';

interface Props {
  battle: Battle;
  onVote: (username: string) => void;
}

function getVoteKey(battleId: string): string {
  return `github-battle-vote-${battleId}`;
}

function getExistingVote(battleId: string): string | null {
  try {
    return localStorage.getItem(getVoteKey(battleId));
  } catch {
    return null;
  }
}

function saveVote(battleId: string, username: string) {
  try {
    localStorage.setItem(getVoteKey(battleId), username);
  } catch { /* ignore */ }
}

export default function VotePanel({ battle, onVote }: Props) {
  const totalVotes = Object.values(battle.votes).reduce((a, b) => a + b, 0);
  const [votedFor, setVotedFor] = useState<string | null>(null);

  useEffect(() => {
    setVotedFor(getExistingVote(battle.id));
  }, [battle.id]);

  const handleVote = (username: string) => {
    if (votedFor) return;
    saveVote(battle.id, username);
    setVotedFor(username);
    onVote(username);
  };

  const hasVoted = votedFor !== null;

  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg">
      <h3 className="pixel-font text-xs text-accent-yellow mb-4 text-center">
        &#127942; PUBLIC VOTES
      </h3>

      <div className="space-y-3">
        {battle.participants.map(p => {
          const votes = battle.votes[p.username] || 0;
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = votedFor === p.username;

          return (
            <div key={p.username} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} className="w-6 h-6" />
                  <span className="text-sm text-dark-text">{p.username}</span>
                  {isMyVote && <span className="text-[8px] text-accent-green">YOUR VOTE</span>}
                </div>
                <span className="pixel-font text-[10px] text-dark-muted">
                  {votes} ({percentage}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-dark-bg rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isMyVote ? 'bg-accent-green' : 'bg-accent-purple'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <button
                  onClick={() => handleVote(p.username)}
                  disabled={battle.status === 'finished' || hasVoted}
                  className={`pixel-font text-[8px] px-2 py-1 rounded border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    isMyVote
                      ? 'bg-accent-green/20 text-accent-green border-accent-green/50'
                      : hasVoted
                        ? 'bg-dark-bg text-dark-muted border-dark-border opacity-40'
                        : 'bg-accent-purple/20 text-accent-purple border-accent-purple/50 hover:bg-accent-purple/30'
                  }`}
                >
                  {isMyVote ? 'VOTED' : 'VOTE'}
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
        {hasVoted && (
          <span className="pixel-font text-[10px] text-accent-green block mt-1">
            You voted for {votedFor}
          </span>
        )}
      </div>
    </div>
  );
}
