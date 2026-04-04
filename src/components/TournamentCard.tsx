import { Link } from 'react-router-dom';
import type { Tournament } from '../types';
import { ROUND_NAMES } from '../types';

interface Props {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: Props) {
  const statusColors = {
    registration: 'text-accent-yellow',
    active: 'text-accent-green',
    finished: 'text-dark-muted',
  };
  const statusLabels = {
    registration: 'OPEN',
    active: 'LIVE',
    finished: 'FINISHED',
  };

  const activeRound = tournament.rounds.find(r => r.status === 'active');
  const roundLabel = activeRound
    ? ROUND_NAMES[tournament.size]?.[activeRound.roundNumber] || `Round ${activeRound.roundNumber}`
    : tournament.status === 'finished' ? 'Completed' : 'Waiting for players';

  return (
    <Link
      to={`/tournament/${tournament.id}`}
      className="block pixel-border bg-dark-card p-4 rounded-lg hover:bg-dark-card/80 transition-colors no-underline"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="pixel-font text-xs text-accent-purple m-0 leading-relaxed">
          {tournament.name}
        </h3>
        <span className={`pixel-font text-[10px] ${statusColors[tournament.status]}`}>
          {statusLabels[tournament.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-2">
          {tournament.participants.slice(0, 6).map(username => (
            <img
              key={username}
              src={tournament.participantAvatars[username] || `https://github.com/${username}.png`}
              alt={username}
              className="w-7 h-7 rounded-full border-2 border-dark-card"
            />
          ))}
        </div>
        <span className="text-dark-muted text-sm">
          {tournament.participants.length}/{tournament.size} players
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span>{tournament.size}-player bracket</span>
        <span>{roundLabel}</span>
        {tournament.champion && (
          <span className="text-accent-yellow">&#127942; {tournament.champion}</span>
        )}
      </div>
    </Link>
  );
}
