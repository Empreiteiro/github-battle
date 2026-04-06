import { Link } from 'react-router-dom';
import type { Battle } from '../types';
import { INTERVAL_LABELS } from '../types';

interface Props {
  battle: Battle;
}

export default function BattleCard({ battle }: Props) {
  const totalVotes = Object.values(battle.votes).reduce((a, b) => a + b, 0);
  const timeLeft = getTimeLeft(battle.endDate);
  const statusColors = {
    waiting: 'text-accent-yellow',
    active: 'text-accent-green',
    finished: 'text-dark-muted',
  };

  return (
    <Link
      to={`/battle/${battle.id}`}
      className="flex flex-col pixel-border bg-dark-card p-4 rounded-lg hover:bg-dark-card/80 transition-colors no-underline h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="pixel-font text-xs text-accent-blue m-0 leading-relaxed">
          {battle.name}
        </h3>
        <span className={`pixel-font text-[10px] ${statusColors[battle.status]}`}>
          {battle.status === 'active' ? 'LIVE' : battle.status === 'waiting' ? 'WAITING' : 'FINISHED'}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-2">
          {battle.participants.slice(0, 5).map(p => (
            <img
              key={p.username}
              src={p.avatarUrl}
              alt={p.username}
              className="w-8 h-8 rounded-full border-2 border-dark-card"
            />
          ))}
        </div>
        <span className="text-dark-muted text-sm">
          {battle.participants.length} fighters
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span>{INTERVAL_LABELS[battle.interval]}</span>
        <span>{totalVotes} votes</span>
        {battle.status === 'active' && <span className="text-accent-orange">{timeLeft}</span>}
        {battle.hasPassword && <span title="Private room">&#128274;</span>}
      </div>

      {battle.participants.length >= 1 && (
        <div className="mt-auto pt-3 text-center">
          {battle.status === 'waiting' ? (
            <span className="pixel-font text-[10px] text-accent-orange">
              {battle.participants[0]?.username} awaits a challenger!
            </span>
          ) : battle.participants.length === 2 ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-right">
                <span className="pixel-font text-[10px] text-accent-green">
                  {battle.participants[0]?.username}
                </span>
              </div>
              <span className="pixel-font text-[10px] text-accent-red">VS</span>
              <div className="flex-1">
                <span className="pixel-font text-[10px] text-accent-purple">
                  {battle.participants[1]?.username}
                </span>
              </div>
            </div>
          ) : (
            <span className="pixel-font text-[10px] text-dark-muted">
              {battle.participants.length}-player battle
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function getTimeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Finished';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
