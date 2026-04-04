import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BattleInterval, ScoringConfig, ScoringKey, TournamentSize } from '../types';
import { INTERVAL_LABELS, DEFAULT_SCORING, SCORING_LABELS } from '../types';
import { api } from '../utils/api';
import RepoFilter from '../components/RepoFilter';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [size, setSize] = useState<TournamentSize>(4);
  const [roundDuration, setRoundDuration] = useState<BattleInterval>('24h');
  const [scoring, setScoring] = useState<ScoringConfig>(structuredClone(DEFAULT_SCORING));
  const [repos, setRepos] = useState<string[]>([]);
  const [participants, setParticipants] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScoringType = (key: ScoringKey) => {
    setScoring(prev => ({ ...prev, enabled: { ...prev.enabled, [key]: !prev.enabled[key] } }));
  };
  const updatePoints = (key: ScoringKey, value: number) => {
    setScoring(prev => ({ ...prev, points: { ...prev.points, [key]: Math.max(0, value) } }));
  };
  const addParticipant = () => { if (participants.length < size) setParticipants([...participants, '']); };
  const removeParticipant = (i: number) => { if (participants.length > 1) setParticipants(participants.filter((_, idx) => idx !== i)); };
  const updateParticipant = (i: number, v: string) => { const u = [...participants]; u[i] = v.trim(); setParticipants(u); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Choose a tournament name'); return; }

    setLoading(true);
    try {
      const validP = participants.filter(p => p.length > 0);
      const tournament = await api.createTournament({
        name: name.trim(),
        size,
        roundDuration,
        scoring,
        repos: repos.length > 0 ? repos : undefined,
        participants: validP.length > 0 ? validP : undefined,
      });
      navigate(`/tournament/${tournament.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating tournament');
    } finally {
      setLoading(false);
    }
  };

  const durations = (Object.keys(INTERVAL_LABELS) as BattleInterval[]).filter(k => k !== 'custom');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="pixel-font text-base text-accent-purple mb-6 text-center">
        &#127942; NEW TOURNAMENT
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">TOURNAMENT NAME</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Spring Championship" className="w-full bg-dark-bg border border-dark-border text-dark-text p-3 rounded focus:border-accent-blue outline-none" maxLength={50} />
        </div>

        {/* Bracket Size */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">BRACKET SIZE</label>
          <div className="grid grid-cols-3 gap-2">
            {([4, 8, 16] as TournamentSize[]).map(s => (
              <button key={s} type="button" onClick={() => setSize(s)} className={`pixel-font text-sm py-3 rounded border transition-colors cursor-pointer ${size === s ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
                {s} Players
              </button>
            ))}
          </div>
          <p className="text-[10px] text-dark-muted mt-2">{Math.log2(size)} rounds of single elimination</p>
        </div>

        {/* Round Duration */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">ROUND DURATION</label>
          <div className="grid grid-cols-5 gap-2">
            {durations.map(key => (
              <button key={key} type="button" onClick={() => setRoundDuration(key)} className={`pixel-font text-[10px] py-2 px-1 rounded border transition-colors cursor-pointer ${roundDuration === key ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
                {INTERVAL_LABELS[key]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-dark-muted mt-2">Each matchup battle lasts this long</p>
        </div>

        {/* Scoring */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-3">CONTRIBUTION TYPES &amp; POINTS</label>
          <div className="space-y-2">
            {(Object.keys(SCORING_LABELS) as ScoringKey[]).map(key => (
              <div key={key} className="flex items-center gap-3">
                <button type="button" onClick={() => toggleScoringType(key)} className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs cursor-pointer transition-colors ${scoring.enabled[key] ? 'bg-accent-green/30 border-accent-green text-accent-green' : 'bg-dark-bg border-dark-border text-dark-muted'}`}>
                  {scoring.enabled[key] ? '\u2713' : ''}
                </button>
                <span className={`text-sm flex-1 ${scoring.enabled[key] ? 'text-dark-text' : 'text-dark-muted line-through'}`}>{SCORING_LABELS[key]}</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={scoring.points[key]} onChange={e => updatePoints(key, parseInt(e.target.value) || 0)} disabled={!scoring.enabled[key]} min={0} max={100} className="w-14 bg-dark-bg border border-dark-border text-dark-text p-1 rounded text-center text-xs focus:border-accent-blue outline-none disabled:opacity-40" />
                  <span className="text-[10px] text-dark-muted">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Repo Filter */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">FILTER BY REPOS (optional)</label>
          <RepoFilter repos={repos} onChange={setRepos} />
          <p className="text-[10px] text-dark-muted mt-2">Only activity in these repos will count. Leave empty for all repos.</p>
        </div>

        {/* Initial Participants */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">INITIAL PLAYERS (optional — others can join later)</label>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={p} onChange={e => updateParticipant(i, e.target.value)} placeholder={`Player ${i + 1}`} className="flex-1 bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-green outline-none" />
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeParticipant(i)} className="text-accent-red hover:bg-accent-red/20 px-2 rounded transition-colors cursor-pointer">&#10005;</button>
                )}
              </div>
            ))}
          </div>
          {participants.length < size && (
            <button type="button" onClick={addParticipant} className="mt-2 pixel-font text-[10px] text-accent-green hover:bg-accent-green/10 px-3 py-1 rounded transition-colors cursor-pointer">+ ADD PLAYER</button>
          )}
          <p className="text-[10px] text-dark-muted mt-2">Tournament starts automatically when all {size} slots are filled.</p>
        </div>

        {error && <p className="pixel-font text-xs text-accent-red text-center">{error}</p>}

        <button type="submit" disabled={loading} className="w-full pixel-font text-sm bg-accent-purple text-dark-bg py-4 rounded hover:bg-accent-purple/90 transition-colors disabled:opacity-50 cursor-pointer">
          {loading ? 'CREATING...' : '\u{1F3C6} CREATE TOURNAMENT'}
        </button>
      </form>
    </div>
  );
}
