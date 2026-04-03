import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BattleInterval } from '../types';
import { INTERVAL_LABELS } from '../types';
import { api } from '../utils/api';

export default function CreateBattle() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [interval, setInterval] = useState<BattleInterval>('24h');
  const [participants, setParticipants] = useState(['', '']);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addParticipant = () => {
    if (participants.length < maxParticipants) {
      setParticipants([...participants, '']);
    }
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
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
    if (validParticipants.length < 2) {
      setError('Add at least 2 participants');
      return;
    }

    setLoading(true);
    try {
      const battle = await api.createBattle({
        name: name.trim(),
        password: password || undefined,
        interval,
        participants: validParticipants,
        maxParticipants,
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

        {/* Interval */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            BATTLE DURATION
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(INTERVAL_LABELS) as BattleInterval[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setInterval(key)}
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
                {participants.length > 2 && (
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
