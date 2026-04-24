import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Battle, Tournament } from '../types';
import { ROUND_NAMES } from '../types';
import { api } from '../utils/api';
import Bracket from '../components/Bracket';

export default function TournamentView() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeBattles, setActiveBattles] = useState<Record<string, Battle>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinUsername, setJoinUsername] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchTournament = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getTournament(id);
      setTournament(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  // Poll every 30s for active tournaments
  useEffect(() => {
    if (!id || tournament?.status === 'finished') return;
    intervalRef.current = setInterval(fetchTournament, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id, fetchTournament, tournament?.status]);

  // Fetch live battle data for active matches so the chips can show current scores
  useEffect(() => {
    if (!tournament) return;
    const activeRound = tournament.rounds.find(r => r.status === 'active');
    if (!activeRound) { setActiveBattles({}); return; }
    const ids = activeRound.matches.filter(m => m.battleId && !m.winner).map(m => m.battleId!);
    if (ids.length === 0) { setActiveBattles({}); return; }
    let cancelled = false;
    Promise.all(ids.map(bid => api.getBattle(bid).catch(() => null))).then(results => {
      if (cancelled) return;
      const map: Record<string, Battle> = {};
      results.forEach(b => { if (b) map[b.id] = b; });
      setActiveBattles(map);
    });
    return () => { cancelled = true; };
  }, [tournament]);

  const handleJoin = async () => {
    if (!id || !joinUsername.trim()) { setJoinError('Enter a GitHub username'); return; }
    try {
      const updated = await api.joinTournament(id, joinUsername.trim());
      setTournament(updated);
      setShowJoin(false);
      setJoinError(null);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Error joining');
    }
  };

  if (loading) {
    return <div className="text-center py-20"><span className="pixel-font text-sm text-accent-blue animate-pulse">Loading tournament...</span></div>;
  }
  if (error || !tournament) {
    return <div className="text-center py-20"><span className="pixel-font text-sm text-accent-red">{error || 'Tournament not found'}</span></div>;
  }

  const activeRound = tournament.rounds.find(r => r.status === 'active');
  const roundLabel = activeRound
    ? ROUND_NAMES[tournament.size]?.[activeRound.roundNumber] || `Round ${activeRound.roundNumber}`
    : null;

  return (
    <div className="xl:relative xl:left-1/2 xl:right-1/2 xl:-mx-[50vw] xl:w-screen xl:px-6">
     <div className="xl:max-w-[1600px] xl:mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="pixel-font text-base md:text-lg text-accent-purple mb-1">{tournament.name}</h1>
          <div className="flex items-center gap-3 text-xs text-dark-muted">
            <span>{tournament.size}-player bracket</span>
            <span>|</span>
            <span>{tournament.participants.length}/{tournament.size} registered</span>
            <span>|</span>
            <span className={tournament.scoringMode === 'sprint' ? 'text-accent-orange' : 'text-accent-blue'}>
              {tournament.scoringMode === 'sprint' ? '\u26A1 Live Sprint' : '\u{1F7AE} Scoring Window'}
            </span>
            {roundLabel && (
              <>
                <span>|</span>
                <span className="text-accent-green">{roundLabel} in progress</span>
              </>
            )}
            {tournament.champion && (
              <>
                <span>|</span>
                <span className="text-accent-yellow">&#127942; Champion: {tournament.champion}</span>
              </>
            )}
          </div>
        </div>

        {/* Join */}
        {tournament.status === 'registration' && (
          <div className="flex items-center gap-2">
            {showJoin ? (
              <div className="flex items-center gap-2">
                <input type="text" value={joinUsername} onChange={e => setJoinUsername(e.target.value)} placeholder="GitHub username" className="bg-dark-bg border border-dark-border text-dark-text px-3 py-2 rounded text-sm focus:border-accent-green outline-none" onKeyDown={e => e.key === 'Enter' && handleJoin()} />
                <button onClick={handleJoin} className="pixel-font text-[10px] bg-accent-green/20 text-accent-green border border-accent-green/50 px-3 py-2 rounded hover:bg-accent-green/30 transition-colors cursor-pointer">JOIN</button>
                <button onClick={() => { setShowJoin(false); setJoinError(null); }} className="text-dark-muted hover:text-dark-text px-2 cursor-pointer">&#10005;</button>
              </div>
            ) : (
              <button onClick={() => setShowJoin(true)} className="pixel-font text-[10px] bg-accent-purple/20 text-accent-purple border border-accent-purple/50 px-4 py-2 rounded hover:bg-accent-purple/30 transition-colors cursor-pointer">+ REGISTER</button>
            )}
          </div>
        )}
      </div>

      {joinError && <p className="text-accent-red text-xs mb-4">{joinError}</p>}

      {/* Status banner */}
      {tournament.status === 'registration' && (
        <div className="pixel-border bg-dark-card p-6 rounded-lg text-center mb-6">
          <span className="pixel-font text-sm text-accent-yellow animate-pulse">REGISTRATION OPEN</span>
          <p className="text-dark-muted text-sm mt-2">
            {tournament.size - tournament.participants.length} slot{tournament.size - tournament.participants.length !== 1 ? 's' : ''} remaining. Tournament starts automatically when full.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {tournament.participants.map(username => (
              <div key={username} className="flex items-center gap-2 bg-dark-bg/50 px-3 py-1 rounded">
                <img src={tournament.participantAvatars[username] || `https://github.com/${username}.png`} alt={username} className="w-6 h-6 rounded-full" />
                <span className="text-xs text-dark-text">{username}</span>
              </div>
            ))}
            {Array.from({ length: tournament.size - tournament.participants.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2 bg-dark-bg/30 px-3 py-1 rounded border border-dashed border-dark-border">
                <span className="text-xs text-dark-muted italic">Open slot</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket */}
      {tournament.status !== 'registration' && (
        <div className="mb-6">
          <Bracket tournament={tournament} />
        </div>
      )}

      {/* Active matches */}
      {activeRound && (
        <div className="mb-6">
          <h2 className="pixel-font text-xs text-accent-green mb-3">&#9876;&#65039; ACTIVE MATCHES</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeRound.matches.filter(m => m.battleId && !m.winner).map((match, i) => {
              const battle = activeBattles[match.battleId!];
              const score1 = battle?.participants.find(p => p.username === match.player1)?.score;
              const score2 = battle?.participants.find(p => p.username === match.player2)?.score;
              return (
                <Link key={i} to={`/battle/${match.battleId}`} className="pixel-border bg-dark-card p-3 rounded-lg flex items-center justify-between no-underline hover:bg-dark-bg/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={tournament.participantAvatars[match.player1!] || ''} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                    <span className="text-sm text-dark-text truncate">{match.player1}</span>
                    <span className="pixel-font text-[10px] text-accent-yellow flex-shrink-0">{score1 ?? '—'}</span>
                  </div>
                  <span className="pixel-font text-[10px] text-accent-red px-2">VS</span>
                  <div className="flex items-center gap-2 min-w-0 justify-end">
                    <span className="pixel-font text-[10px] text-accent-yellow flex-shrink-0">{score2 ?? '—'}</span>
                    <span className="text-sm text-dark-text truncate">{match.player2}</span>
                    <img src={tournament.participantAvatars[match.player2!] || ''} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Champion banner */}
      {tournament.champion && (
        <div className="pixel-border bg-dark-card p-6 rounded-lg text-center animate-pulse-glow">
          <span className="pixel-font text-lg text-accent-yellow">&#127942; CHAMPION</span>
          <div className="mt-3">
            <img src={tournament.participantAvatars[tournament.champion] || ''} alt={tournament.champion} className="w-16 h-16 rounded-full mx-auto mb-2" />
            <span className="pixel-font text-base text-accent-yellow block">{tournament.champion}</span>
          </div>
        </div>
      )}
     </div>
    </div>
  );
}
