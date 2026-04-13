import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardEntry, LeaderboardTimeFilter } from '../types';
import { api } from '../utils/api';
import { BADGE_MAP } from '../data/badges';

const FILTERS: { key: LeaderboardTimeFilter; label: string }[] = [
  { key: 'all-time', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg" title="1st place">&#129351;</span>;
  if (rank === 2) return <span className="text-lg" title="2nd place">&#129352;</span>;
  if (rank === 3) return <span className="text-lg" title="3rd place">&#129353;</span>;
  return <span className="text-dark-muted text-sm font-mono">#{rank}</span>;
}

function BadgeIcons({ badges }: { badges: LeaderboardEntry['badges'] }) {
  if (badges.length === 0) return null;
  const shown = badges.slice(0, 5);
  const extra = badges.length - shown.length;
  return (
    <span className="inline-flex items-center gap-0.5">
      {shown.map((b, i) => {
        const def = BADGE_MAP[b.badgeId as keyof typeof BADGE_MAP];
        return def ? (
          <span key={i} title={def.name} className="text-sm cursor-default">{def.icon}</span>
        ) : null;
      })}
      {extra > 0 && <span className="text-[10px] text-dark-muted ml-0.5">+{extra}</span>}
    </span>
  );
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<LeaderboardTimeFilter>('all-time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getLeaderboard(filter)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="text-center py-6">
        <h1 className="pixel-font text-xl md:text-2xl text-accent-yellow mb-2">
          &#127942; Leaderboard
        </h1>
        <p className="text-dark-muted text-sm">
          All-time player rankings across all battles
        </p>
      </div>

      {/* Time Filters */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`pixel-font text-[10px] px-4 py-2 rounded border transition-colors cursor-pointer ${
              filter === f.key
                ? 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/50'
                : 'bg-dark-card text-dark-muted border-dark-border hover:border-dark-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="pixel-font text-sm text-accent-blue animate-pulse">
            Loading rankings...
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-12">
          <p className="pixel-font text-sm text-dark-muted mb-4">
            No ranked players yet
          </p>
          <p className="text-dark-muted text-sm mb-6">
            Complete a battle to appear on the leaderboard!
          </p>
          <Link
            to="/create"
            className="inline-block pixel-font text-[10px] bg-accent-green/20 text-accent-green border border-accent-green/50 px-6 py-2 rounded hover:bg-accent-green/30 transition-colors no-underline"
          >
            Create a Battle
          </Link>
        </div>
      )}

      {/* Desktop Table */}
      {!loading && entries.length > 0 && (
        <div className="hidden md:block pixel-border bg-dark-card rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-left w-16">RANK</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-left">PLAYER</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-center">W</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-center">L</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-center">WIN%</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-right">TOTAL</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-right">BEST</th>
                <th className="pixel-font text-[10px] text-dark-muted p-3 text-center">BADGES</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.username} className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors">
                  <td className="p-3 text-center">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="p-3">
                    <a
                      href={`https://github.com/${entry.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={entry.avatarUrl}
                        alt={entry.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-sm text-dark-text">{entry.username}</span>
                    </a>
                  </td>
                  <td className="p-3 text-center text-accent-green font-bold text-sm">{entry.wins}</td>
                  <td className="p-3 text-center text-accent-red text-sm">{entry.losses}</td>
                  <td className="p-3 text-center text-dark-text text-sm">
                    {Math.round(entry.winRate * 100)}%
                  </td>
                  <td className="p-3 text-right text-accent-blue text-sm">{entry.totalScore}</td>
                  <td className="p-3 text-right text-accent-purple text-sm">{entry.highestScore}</td>
                  <td className="p-3 text-center">
                    <BadgeIcons badges={entry.badges} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {!loading && entries.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {entries.map((entry, i) => (
            <div key={entry.username} className="pixel-border bg-dark-card p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <RankBadge rank={i + 1} />
                <a
                  href={`https://github.com/${entry.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity"
                >
                  <img
                    src={entry.avatarUrl}
                    alt={entry.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-dark-text font-bold">{entry.username}</span>
                </a>
                <div className="ml-auto">
                  <BadgeIcons badges={entry.badges} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-dark-muted">Wins: </span>
                  <span className="text-accent-green font-bold">{entry.wins}</span>
                </div>
                <div>
                  <span className="text-dark-muted">Losses: </span>
                  <span className="text-accent-red">{entry.losses}</span>
                </div>
                <div>
                  <span className="text-dark-muted">Win Rate: </span>
                  <span className="text-dark-text">{Math.round(entry.winRate * 100)}%</span>
                </div>
                <div>
                  <span className="text-dark-muted">Total: </span>
                  <span className="text-accent-blue">{entry.totalScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link to Badges */}
      {!loading && (
        <div className="text-center mt-8">
          <Link
            to="/badges"
            className="pixel-font text-[10px] text-dark-muted hover:text-accent-purple transition-colors no-underline"
          >
            View all achievements &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
