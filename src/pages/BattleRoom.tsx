import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBattlePolling } from '../hooks/useBattle';
import type { Battle } from '../types';
import { INTERVAL_LABELS } from '../types';
import TerritoryArena from '../components/TerritoryArena';
import VotePanel from '../components/VotePanel';
import ParticipantList from '../components/ParticipantList';
import PasswordModal from '../components/PasswordModal';

export default function BattleRoom() {
  const { id } = useParams<{ id: string }>();
  const { battle, loading, error, vote, join } = useBattlePolling(id);
  const [prevBattle, setPrevBattle] = useState<Battle | null>(null);
  const prevRef = useRef<Battle | null>(null);

  const [showJoin, setShowJoin] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Track previous battle state for attack animations
  useEffect(() => {
    if (battle && prevRef.current) {
      setPrevBattle(prevRef.current);
    }
    prevRef.current = battle;
  }, [battle]);

  const handleJoin = async (password?: string) => {
    if (!joinUsername.trim()) {
      setJoinError('Enter a GitHub username');
      return;
    }
    try {
      await join(joinUsername.trim(), password);
      setShowJoin(false);
      setShowPassword(false);
      setJoinError(null);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Error joining');
    }
  };

  const handleJoinClick = () => {
    if (battle?.hasPassword) {
      setShowPassword(true);
    } else {
      handleJoin();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="pixel-font text-sm text-accent-blue animate-pulse">
          Loading battle...
        </div>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="text-center py-20">
        <p className="pixel-font text-sm text-accent-red mb-4">
          {error || 'Battle not found'}
        </p>
      </div>
    );
  }

  const timeLeft = getTimeLeft(battle.endDate);

  return (
    <div>
      {/* Battle Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="pixel-font text-base md:text-lg text-accent-green mb-1">
            {battle.name}
          </h1>
          <div className="flex items-center gap-3 text-xs text-dark-muted">
            <span>{INTERVAL_LABELS[battle.interval]}</span>
            <span>|</span>
            <span>{battle.participants.length} fighters</span>
            {battle.hasPassword && <span>&#128274; Private</span>}
            {battle.status === 'active' && (
              <>
                <span>|</span>
                <span className="text-accent-orange">{timeLeft} remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Join button */}
        {battle.status === 'active' && battle.participants.length < (battle.maxParticipants || 10) && (
          <div className="flex items-center gap-2">
            {showJoin ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={joinUsername}
                  onChange={e => setJoinUsername(e.target.value)}
                  placeholder="GitHub username"
                  className="bg-dark-bg border border-dark-border text-dark-text px-3 py-2 rounded text-sm focus:border-accent-green outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleJoinClick()}
                />
                <button
                  onClick={handleJoinClick}
                  className="pixel-font text-[10px] bg-accent-green/20 text-accent-green border border-accent-green/50 px-3 py-2 rounded hover:bg-accent-green/30 transition-colors cursor-pointer"
                >
                  JOIN
                </button>
                <button
                  onClick={() => { setShowJoin(false); setJoinError(null); }}
                  className="text-dark-muted hover:text-dark-text px-2 cursor-pointer"
                >
                  &#10005;
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowJoin(true)}
                className="pixel-font text-[10px] bg-accent-blue/20 text-accent-blue border border-accent-blue/50 px-4 py-2 rounded hover:bg-accent-blue/30 transition-colors cursor-pointer"
              >
                + JOIN BATTLE
              </button>
            )}
          </div>
        )}
      </div>

      {joinError && !showPassword && (
        <p className="text-accent-red text-xs mb-4">{joinError}</p>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arena - takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <TerritoryArena battle={battle} prevBattle={prevBattle} />

          {/* Participant details on mobile */}
          <div className="lg:hidden">
            <ParticipantList participants={battle.participants} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <VotePanel battle={battle} onVote={vote} />
          <div className="hidden lg:block">
            <ParticipantList participants={battle.participants} />
          </div>

          {/* Battle Info */}
          <div className="pixel-border bg-dark-card p-4 rounded-lg">
            <h3 className="pixel-font text-[10px] text-dark-muted mb-3 text-center">INFO</h3>
            <div className="space-y-2 text-xs text-dark-muted">
              <div className="flex justify-between">
                <span>Start</span>
                <span className="text-dark-text">{new Date(battle.startDate).toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>End</span>
                <span className="text-dark-text">{new Date(battle.endDate).toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span className="text-dark-text">{new Date(battle.lastRefresh).toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>Refresh</span>
                <span className="text-accent-green">every 30s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPassword && (
        <PasswordModal
          onSubmit={(pw) => handleJoin(pw)}
          onCancel={() => { setShowPassword(false); setJoinError(null); }}
          error={joinError}
        />
      )}
    </div>
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
