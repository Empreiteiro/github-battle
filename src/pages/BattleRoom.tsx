import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBattlePolling } from '../hooks/useBattle';
import type { Battle, BadgeDefinition } from '../types';
import { INTERVAL_LABELS } from '../types';
import TerritoryArena from '../components/TerritoryArena';
import VotePanel from '../components/VotePanel';
import ParticipantList from '../components/ParticipantList';
import PasswordModal from '../components/PasswordModal';
import ShareButton from '../components/ShareButton';
import ReplayPlayer from '../components/ReplayPlayer';
import EmbedModal from '../components/EmbedModal';
import ActivityHeatmap from '../components/ActivityHeatmap';
import BadgeToast from '../components/BadgeToast';
import { useAuth } from '../auth/AuthContext';
import { canManageBattle, getCreatorId } from '../utils/identity';
import { api } from '../utils/api';
import { BADGE_MAP } from '../data/badges';

export default function BattleRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { battle, loading, error, vote, join, leave } = useBattlePolling(id);
  const { user } = useAuth();
  const [prevBattle, setPrevBattle] = useState<Battle | null>(null);
  const prevRef = useRef<Battle | null>(null);

  const [showJoin, setShowJoin] = useState(false);
  const [joinUsername, setJoinUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeDefinition[]>([]);
  const hasReplay = !!(battle?.scoreHistory && battle.scoreHistory.length >= 2);
  const hasHeatmap = !!(battle?.status !== 'waiting' && battle?.participants.some(p => p.heatmap));

  // Track previous battle state for attack animations
  useEffect(() => {
    if (battle && prevRef.current) {
      setPrevBattle(prevRef.current);
    }
    prevRef.current = battle;
  }, [battle]);

  // Show badge toast when battle finishes with new badges for the current user
  useEffect(() => {
    if (battle?.newBadges && user) {
      const myBadgeIds = battle.newBadges[user.username];
      if (myBadgeIds?.length) {
        const defs = myBadgeIds
          .map(id => BADGE_MAP[id as keyof typeof BADGE_MAP])
          .filter(Boolean);
        if (defs.length > 0) setEarnedBadges(defs);
      }
    }
  }, [battle?.newBadges, user]);

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

        <div className="flex flex-col items-end gap-2">
          {/* Action buttons — equal width */}
          <div className="flex flex-wrap gap-2 w-full max-w-[520px] justify-end">
            <ShareButton battle={battle} />

            {/* Replay toggle */}
            <button
              onClick={() => { if (hasReplay) { setShowReplay(!showReplay); setShowHeatmap(false); } }}
              disabled={!hasReplay}
              className={`pixel-font text-[10px] py-2 px-4 rounded border transition-colors cursor-pointer text-center min-w-[80px] ${
                !hasReplay
                  ? 'bg-dark-bg text-dark-muted/40 border-dark-border/50 cursor-not-allowed'
                  : showReplay
                    ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/50'
                    : 'bg-dark-bg text-dark-muted border-dark-border hover:bg-dark-border/50 hover:text-dark-text'
              }`}
            >
              REPLAY
            </button>

            {/* Heatmap toggle */}
            <button
              onClick={() => { if (hasHeatmap) { setShowHeatmap(!showHeatmap); setShowReplay(false); } }}
              disabled={!hasHeatmap}
              className={`pixel-font text-[10px] py-2 px-4 rounded border transition-colors cursor-pointer text-center min-w-[80px] ${
                !hasHeatmap
                  ? 'bg-dark-bg text-dark-muted/40 border-dark-border/50 cursor-not-allowed'
                  : showHeatmap
                    ? 'bg-accent-orange/20 text-accent-orange border-accent-orange/50'
                    : 'bg-dark-bg text-dark-muted border-dark-border hover:bg-dark-border/50 hover:text-dark-text'
              }`}
            >
              HEATMAP
            </button>

            {/* Embed button */}
            <button
              onClick={() => setShowEmbed(true)}
              className="pixel-font text-[10px] bg-dark-bg text-dark-muted border border-dark-border py-2 px-4 rounded hover:bg-dark-border/50 hover:text-dark-text transition-colors cursor-pointer text-center min-w-[80px]"
            >
              EMBED
            </button>

            {/* Join or Leave */}
            {user && battle.participants.some(p => p.username === user.username) && battle.status !== 'finished' ? (
              <button
                onClick={() => leave(user.username)}
                className="pixel-font text-[10px] bg-accent-red/20 text-accent-red border border-accent-red/50 py-2 px-4 rounded hover:bg-accent-red/30 transition-colors cursor-pointer text-center min-w-[80px]"
              >
                LEAVE
              </button>
            ) : (battle.status === 'active' || battle.status === 'waiting') && battle.participants.length < (battle.maxParticipants || 10) ? (
              <button
                onClick={() => showJoin ? handleJoinClick() : setShowJoin(true)}
                className="pixel-font text-[10px] bg-accent-blue/20 text-accent-blue border border-accent-blue/50 py-2 px-4 rounded hover:bg-accent-blue/30 transition-colors cursor-pointer text-center min-w-[80px]"
              >
                + JOIN
              </button>
            ) : null}

            {/* Delete — only for battle creator */}
            {canManageBattle(battle.createdBy) && (
              <button
                onClick={async () => {
                  if (!confirm('Delete this battle permanently?')) return;
                  try {
                    await api.deleteBattle(battle.id, getCreatorId());
                    navigate('/');
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to delete');
                  }
                }}
                className="pixel-font text-[10px] bg-accent-red/10 text-accent-red/70 border border-accent-red/30 py-2 px-4 rounded hover:bg-accent-red/20 hover:text-accent-red transition-colors cursor-pointer text-center min-w-[80px]"
              >
                DELETE
              </button>
            )}
          </div>

          {/* Join input (expanded below buttons) */}
          {showJoin && (battle.status === 'active' || battle.status === 'waiting') && (
            <div className="flex items-center gap-2 w-full max-w-[520px]">
              <input
                type="text"
                value={joinUsername}
                onChange={e => setJoinUsername(e.target.value)}
                placeholder="GitHub username"
                className="flex-1 bg-dark-bg border border-dark-border text-dark-text px-3 py-2 rounded text-sm focus:border-accent-green outline-none"
                onKeyDown={e => e.key === 'Enter' && handleJoinClick()}
              />
              <button
                onClick={handleJoinClick}
                className="pixel-font text-[10px] bg-accent-green/20 text-accent-green border border-accent-green/50 px-3 py-2 rounded hover:bg-accent-green/30 transition-colors cursor-pointer"
              >
                GO
              </button>
              <button
                onClick={() => { setShowJoin(false); setJoinError(null); }}
                className="text-dark-muted hover:text-dark-text px-2 cursor-pointer"
              >
                &#10005;
              </button>
            </div>
          )}
        </div>
      </div>

      {joinError && !showPassword && (
        <p className="text-accent-red text-xs mb-4">{joinError}</p>
      )}

      {/* Territory Arena / Replay / Heatmap — full width, swappable */}
      <div className="mb-6">
        {showReplay && hasReplay ? (
          <ReplayPlayer battle={battle} />
        ) : showHeatmap && hasHeatmap ? (
          <ActivityHeatmap
            participants={battle.participants}
            participantIndices={new Map(battle.participants.map((p, i) => [p.username, i]))}
          />
        ) : (
          <TerritoryArena battle={battle} prevBattle={prevBattle} />
        )}
      </div>

      {/* Details Grid — stretch columns to equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Scoreboard — takes 2 columns */}
        <div className="lg:col-span-2 flex flex-col">
          <ParticipantList participants={battle.participants} scoring={battle.scoring} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <VotePanel battle={battle} onVote={vote} />

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
              {battle.repos && battle.repos.length > 0 && (
                <div className="pt-2 border-t border-dark-border/50">
                  <span className="block mb-1">Repos</span>
                  <div className="flex flex-wrap gap-1">
                    {battle.repos.map(repo => (
                      <a
                        key={repo}
                        href={`https://github.com/${repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-accent-blue/15 text-accent-blue text-[10px] px-2 py-0.5 rounded border border-accent-blue/30 no-underline hover:bg-accent-blue/25 transition-colors"
                      >
                        {repo}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Private contributions tip */}
          <div className="pixel-border bg-dark-card p-3 rounded-lg text-center">
            <p className="text-[10px] text-dark-muted">
              &#128274; Private contributions not showing? Enable <b>Private contributions</b> in your{' '}
              <a href="https://github.com/settings/profile" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline hover:text-accent-blue/80">
                GitHub settings
              </a>.
            </p>
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

      {/* Embed Modal */}
      {showEmbed && id && (
        <EmbedModal battleId={id} onClose={() => setShowEmbed(false)} />
      )}

      {/* Badge Toast */}
      {earnedBadges.length > 0 && (
        <BadgeToast badges={earnedBadges} onDismiss={() => setEarnedBadges([])} />
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
