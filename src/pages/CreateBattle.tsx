import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BattleInterval, ScoringConfig, ScoringKey } from '../types';
import { INTERVAL_LABELS, DEFAULT_SCORING, SCORING_LABELS } from '../types';
import { api } from '../utils/api';

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateBattle() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [interval, setInterval] = useState<BattleInterval>('24h');
  const [customStart, setCustomStart] = useState(toLocalDatetime(new Date(Date.now() - 24 * 3600_000)));
  const [customEnd, setCustomEnd] = useState(toLocalDatetime(new Date(Date.now() + 24 * 3600_000)));
  const [participants, setParticipants] = useState(['']);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [scoring, setScoring] = useState<ScoringConfig>(structuredClone(DEFAULT_SCORING));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScoringType = (key: ScoringKey) => {
    setScoring(prev => ({
      ...prev,
      enabled: { ...prev.enabled, [key]: !prev.enabled[key] },
    }));
  };

  const updatePoints = (key: ScoringKey, value: number) => {
    setScoring(prev => ({
      ...prev,
      points: { ...prev.points, [key]: Math.max(0, value) },
    }));
  };

  const presets = Object.keys(INTERVAL_LABELS) as BattleInterval[];

  const handleIntervalSelect = (key: BattleInterval) => {
    setInterval(key);
    if (key !== 'custom') {
      const ms: Record<string, number> = {
        '1h': 3600_000,
        '6h': 6 * 3600_000,
        '24h': 24 * 3600_000,
        '7d': 7 * 24 * 3600_000,
        '30d': 30 * 24 * 3600_000,
      };
      const lookback = ms[key] || 24 * 3600_000;
      setCustomStart(toLocalDatetime(new Date(Date.now() - lookback)));
      setCustomEnd(toLocalDatetime(new Date(Date.now() + lookback)));
    }
  };

  const addParticipant = () => {
    if (participants.length < maxParticipants) {
      setParticipants([...participants, '']);
    }
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, value: string) => {
    const updated = [...participants];
    updated[index] = value.trim();
    setParticipants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validParticipants = participants.filter(p => p.length > 0);
    if (!name.trim()) {
      setError('Choose a battle name');
      return;
    }
    if (validParticipants.length < 1) {
      setError('Add at least 1 participant');
      return;
    }
    if (new Date(customStart) >= new Date(customEnd)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const battle = await api.createBattle({
        name: name.trim(),
        password: password || undefined,
        interval,
        customStart: new Date(customStart).toISOString(),
        customEnd: new Date(customEnd).toISOString(),
        participants: validParticipants,
        maxParticipants,
        scoring,
      });
      navigate(`/battle/${battle.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating battle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="pixel-font text-base text-accent-green mb-6 text-center">
        &#9876;&#65039; NEW BATTLE
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Battle Name */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            BATTLE NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Frontend vs Backend"
            className="w-full bg-dark-bg border border-dark-border text-dark-text p-3 rounded focus:border-accent-blue outline-none"
            maxLength={50}
          />
        </div>

        {/* Interval presets */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            SCORING WINDOW
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {presets.map(key => (
              <button
                key={key}
                type="button"
                onClick={() => handleIntervalSelect(key)}
                className={`pixel-font text-[10px] py-2 px-1 rounded border transition-colors cursor-pointer ${
                  interval === key
                    ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50'
                    : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'
                }`}
              >
                {INTERVAL_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Date/time pickers — always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="pixel-font text-[10px] text-accent-green block mb-1">
                SCORING FROM
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={e => { setCustomStart(e.target.value); setInterval('custom'); }}
                className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-green outline-none text-sm"
              />
            </div>
            <div>
              <label className="pixel-font text-[10px] text-accent-orange block mb-1">
                SCORING UNTIL
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={e => { setCustomEnd(e.target.value); setInterval('custom'); }}
                className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-orange outline-none text-sm"
              />
            </div>
          </div>

          <p className="text-[10px] text-dark-muted mt-2">
            GitHub activity within this window is scored. Presets auto-fill the dates. Past activity counts!
          </p>
        </div>

        {/* Scoring Config */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-3">
            CONTRIBUTION TYPES &amp; POINTS
          </label>
          <div className="space-y-2">
            {(Object.keys(SCORING_LABELS) as ScoringKey[]).map(key => (
              <div key={key} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleScoringType(key)}
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs cursor-pointer transition-colors ${
                    scoring.enabled[key]
                      ? 'bg-accent-green/30 border-accent-green text-accent-green'
                      : 'bg-dark-bg border-dark-border text-dark-muted'
                  }`}
                >
                  {scoring.enabled[key] ? '\u2713' : ''}
                </button>
                <span className={`text-sm flex-1 ${scoring.enabled[key] ? 'text-dark-text' : 'text-dark-muted line-through'}`}>
                  {SCORING_LABELS[key]}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={scoring.points[key]}
                    onChange={e => updatePoints(key, parseInt(e.target.value) || 0)}
                    disabled={!scoring.enabled[key]}
                    min={0}
                    max={100}
                    className="w-14 bg-dark-bg border border-dark-border text-dark-text p-1 rounded text-center text-xs focus:border-accent-blue outline-none disabled:opacity-40"
                  />
                  <span className="text-[10px] text-dark-muted">pts</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-dark-muted mt-2">
            Toggle which GitHub activities count and customize point values per type.
          </p>
        </div>

        {/* Participants */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            FIGHTERS (GitHub usernames)
          </label>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={p}
                  onChange={e => updateParticipant(i, e.target.value)}
                  placeholder={`Fighter ${i + 1}`}
                  className="flex-1 bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-green outline-none"
                />
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(i)}
                    className="text-accent-red hover:bg-accent-red/20 px-2 rounded transition-colors cursor-pointer"
                  >
                    &#10005;
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addParticipant}
            className="mt-2 pixel-font text-[10px] text-accent-green hover:bg-accent-green/10 px-3 py-1 rounded transition-colors cursor-pointer"
          >
            + ADD FIGHTER
          </button>
        </div>

        {/* Password (optional) */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-yellow block mb-2">
            &#128274; PASSWORD (optional — private room for competitors)
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Leave empty for open room"
            className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-yellow outline-none"
          />
          <p className="text-[10px] text-dark-muted mt-1">
            Viewers can always watch. Password is for joining as a competitor.
          </p>
        </div>

        {/* Max Participants */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            MAX FIGHTERS
          </label>
          <input
            type="number"
            value={maxParticipants}
            onChange={e => setMaxParticipants(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
            min={2}
            max={20}
            className="w-24 bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-blue outline-none"
          />
        </div>

        {error && (
          <p className="pixel-font text-xs text-accent-red text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full pixel-font text-sm bg-accent-green text-dark-bg py-4 rounded hover:bg-accent-green/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'CREATING...' : '\u2694\uFE0F START BATTLE'}
        </button>
      </form>
    </div>
  );
}
