import { Link } from 'react-router-dom';
import type { Tournament, TournamentMatch } from '../types';
import { ROUND_NAMES } from '../types';

interface Props {
  tournament: Tournament;
}

function MatchCard({ match, roundStatus }: { match: TournamentMatch; roundStatus: string }) {
  const isActive = roundStatus === 'active';
  const isFinished = roundStatus === 'finished';

  const playerSlot = (username: string | null, isWinner: boolean) => {
    if (!username) {
      return (
        <div className="flex items-center gap-2 px-2 py-1 text-dark-muted text-xs italic">
          TBD
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 px-2 py-1 text-xs transition-colors ${
        isWinner ? 'text-accent-green font-bold' : match.winner && !isWinner ? 'text-dark-muted opacity-50' : 'text-dark-text'
      }`}>
        <span className="truncate max-w-[100px]">{username}</span>
        {isWinner && <span className="text-accent-yellow text-[8px]">&#127942;</span>}
      </div>
    );
  };

  return (
    <div className={`pixel-border rounded overflow-hidden text-xs min-w-[150px] ${
      isActive ? 'border-accent-green/50 bg-dark-card' : isFinished ? 'bg-dark-bg/50' : 'bg-dark-bg/30 opacity-60'
    }`}>
      {match.battleId ? (
        <Link to={`/battle/${match.battleId}`} className="block no-underline hover:bg-dark-bg/30 transition-colors">
          {playerSlot(match.player1, match.winner === match.player1)}
          <div className="border-t border-dark-border/50" />
          {playerSlot(match.player2, match.winner === match.player2)}
        </Link>
      ) : (
        <div>
          {playerSlot(match.player1, false)}
          <div className="border-t border-dark-border/50" />
          {playerSlot(match.player2, false)}
        </div>
      )}
    </div>
  );
}

export default function Bracket({ tournament }: Props) {
  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg overflow-x-auto">
      <h3 className="pixel-font text-[10px] text-accent-purple mb-4 text-center">
        &#127942; BRACKET
      </h3>

      <div className="flex gap-8 items-center min-w-max">
        {tournament.rounds.map(round => {
          const roundName = ROUND_NAMES[tournament.size]?.[round.roundNumber] || `Round ${round.roundNumber}`;
          const matchGap = round.roundNumber === 1 ? 'gap-3' : 'gap-6';

          return (
            <div key={round.roundNumber} className="flex flex-col items-center">
              <div className={`pixel-font text-[9px] mb-3 ${
                round.status === 'active' ? 'text-accent-green' :
                round.status === 'finished' ? 'text-dark-muted' : 'text-dark-muted/50'
              }`}>
                {roundName}
                {round.status === 'active' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />}
              </div>

              <div className={`flex flex-col ${matchGap}`}>
                {round.matches.map((match, i) => (
                  <MatchCard key={i} match={match} roundStatus={round.status} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Champion */}
        {tournament.champion && (
          <div className="flex flex-col items-center">
            <div className="pixel-font text-[9px] text-accent-yellow mb-3">CHAMPION</div>
            <div className="pixel-border bg-dark-card p-3 rounded text-center animate-pulse-glow">
              <img
                src={tournament.participantAvatars[tournament.champion] || `https://github.com/${tournament.champion}.png`}
                alt={tournament.champion}
                className="w-10 h-10 rounded-full mx-auto mb-1"
              />
              <span className="pixel-font text-[10px] text-accent-yellow block">{tournament.champion}</span>
              <span className="text-[8px] text-dark-muted">&#127942;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
