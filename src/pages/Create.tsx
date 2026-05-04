import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { BattleInterval, ScoringConfig, ScoringKey, ScoringMode, Team, TournamentSize } from '../types';
import { INTERVAL_LABELS, DEFAULT_SCORING, SCORING_LABELS, TEAM_COLORS } from '../types';
import { api } from '../utils/api';
import { getCreatorId } from '../utils/identity';
import { teamClasses } from '../utils/teamColors';
import RepoFilter from '../components/RepoFilter';

type Mode = 'battle' | 'tournament';

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function genTeamId(): string {
  return 't_' + Math.random().toString(36).slice(2, 9);
}

export default function Create() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Seed mode + tournament size from URL params (e.g. ?type=tournament&size=4)
  const initialMode: Mode = searchParams.get('type') === 'tournament' ? 'tournament' : 'battle';
  const paramSize = parseInt(searchParams.get('size') || '', 10);
  const initialBracket: TournamentSize = ([4, 8, 16] as TournamentSize[]).includes(paramSize as TournamentSize)
    ? (paramSize as TournamentSize)
    : 4;

  const [mode, setMode] = useState<Mode>(initialMode);

  // Shared state
  const [name, setName] = useState('');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('window');
  const [scoring, setScoring] = useState<ScoringConfig>(structuredClone(DEFAULT_SCORING));
  const [repos, setRepos] = useState<string[]>([]);
  const [participants, setParticipants] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Battle-specific
  const [password, setPassword] = useState('');
  const [interval, setInterval] = useState<BattleInterval>('24h');
  const [customStart, setCustomStart] = useState(toLocalDatetime(new Date(Date.now() - 24 * 3600_000)));
  const [customEnd, setCustomEnd] = useState(toLocalDatetime(new Date(Date.now() + 24 * 3600_000)));
  const [maxParticipants, setMaxParticipants] = useState(10);

  // Tournament-specific
  const [bracketSize, setBracketSize] = useState<TournamentSize>(initialBracket);
  const [roundDuration, setRoundDuration] = useState<BattleInterval>('24h');

  // Team mode (battle only) — allows 1v2, 2v2, 1v3, etc.
  const [teamMode, setTeamMode] = useState(false);
  const [teams, setTeams] = useState<Team[]>([
    { id: genTeamId(), name: 'Team 1', color: TEAM_COLORS[0], members: [] },
    { id: genTeamId(), name: 'Team 2', color: TEAM_COLORS[1], members: [] },
  ]);

  const assignedUsernames = useMemo(() => {
    const set = new Set<string>();
    for (const t of teams) for (const m of t.members) set.add(m.toLowerCase());
    return set;
  }, [teams]);

  const validParticipants = useMemo(
    () => participants.map(p => p.trim()).filter(p => p.length > 0),
    [participants],
  );

  const addTeam = () => {
    const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
    setTeams([...teams, { id: genTeamId(), name: `Team ${teams.length + 1}`, color, members: [] }]);
  };
  const removeTeam = (id: string) => {
    if (teams.length <= 2) return;
    setTeams(teams.filter(t => t.id !== id));
  };
  const renameTeam = (id: string, name: string) => {
    setTeams(teams.map(t => t.id === id ? { ...t, name } : t));
  };
  const togglePlayerInTeam = (teamId: string, username: string) => {
    setTeams(prev => prev.map(t => {
      // remove from all other teams; toggle within target team
      if (t.id === teamId) {
        return t.members.includes(username)
          ? { ...t, members: t.members.filter(m => m !== username) }
          : { ...t, members: [...t.members, username] };
      }
      return { ...t, members: t.members.filter(m => m !== username) };
    }));
  };

  // Keep team members in sync when a participant is removed / renamed.
  useEffect(() => {
    const valid = new Set(validParticipants);
    setTeams(ts => {
      let changed = false;
      const next = ts.map(t => {
        const filtered = t.members.filter(m => valid.has(m));
        if (filtered.length !== t.members.length) changed = true;
        return { ...t, members: filtered };
      });
      return changed ? next : ts;
    });
  }, [validParticipants]);

  // Team summary like "2 vs 1" or "2 vs 2 vs 1"
  const teamSummary = teams
    .filter(t => t.members.length > 0)
    .map(t => t.members.length)
    .join(' vs ');

  const toggleScoringType = (key: ScoringKey) => {
    setScoring(prev => ({ ...prev, enabled: { ...prev.enabled, [key]: !prev.enabled[key] } }));
  };
  const updatePoints = (key: ScoringKey, value: number) => {
    setScoring(prev => ({ ...prev, points: { ...prev.points, [key]: Math.max(0, value) } }));
  };

  const presets = (Object.keys(INTERVAL_LABELS) as BattleInterval[]);
  const durationPresets = presets.filter(k => k !== 'custom');

  const handleIntervalSelect = (key: BattleInterval) => {
    setInterval(key);
    if (key !== 'custom') {
      const ms: Record<string, number> = { '1h': 3600_000, '6h': 6 * 3600_000, '24h': 24 * 3600_000, '7d': 7 * 24 * 3600_000, '30d': 30 * 24 * 3600_000 };
      const span = ms[key] || 24 * 3600_000;
      // Sprint mode races forward from now; window mode keeps the symmetric past+future window.
      const startMs = scoringMode === 'sprint' ? Date.now() : Date.now() - span;
      setCustomStart(toLocalDatetime(new Date(startMs)));
      setCustomEnd(toLocalDatetime(new Date(Date.now() + span)));
    }
  };

  // Switching to sprint mode forces start = now and disables the 'custom' window pickers.
  const handleScoringModeChange = (mode: ScoringMode) => {
    setScoringMode(mode);
    if (mode === 'sprint') {
      const ms: Record<string, number> = { '1h': 3600_000, '6h': 6 * 3600_000, '24h': 24 * 3600_000, '7d': 7 * 24 * 3600_000, '30d': 30 * 24 * 3600_000 };
      const span = ms[interval === 'custom' ? '24h' : interval] || 24 * 3600_000;
      if (interval === 'custom') setInterval('24h');
      setCustomStart(toLocalDatetime(new Date()));
      setCustomEnd(toLocalDatetime(new Date(Date.now() + span)));
    }
  };

  const maxP = mode === 'tournament' ? bracketSize : maxParticipants;
  const addParticipant = () => { if (participants.length < maxP) setParticipants([...participants, '']); };
  const removeParticipant = (i: number) => { if (participants.length > 1) setParticipants(participants.filter((_, idx) => idx !== i)); };
  const updateParticipant = (i: number, v: string) => { const u = [...participants]; u[i] = v.trim(); setParticipants(u); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Choose a name'); return; }

    const validP = participants.filter(p => p.length > 0);

    if (mode === 'battle') {
      if (validP.length < 1) { setError('Add at least 1 participant'); return; }
      if (new Date(customStart) >= new Date(customEnd)) { setError('Start date must be before end date'); return; }

      // Team-mode validation: require ≥2 non-empty teams and every participant assigned.
      let teamsPayload: Team[] | undefined = undefined;
      if (teamMode) {
        const nonEmpty = teams.filter(t => t.members.length > 0);
        if (nonEmpty.length < 2) {
          setError('Team mode needs at least 2 teams with members');
          return;
        }
        const assigned = new Set(nonEmpty.flatMap(t => t.members));
        const unassigned = validP.filter(p => !assigned.has(p));
        if (unassigned.length > 0) {
          setError(`Assign all fighters to a team: ${unassigned.join(', ')}`);
          return;
        }
        teamsPayload = nonEmpty.map(t => ({
          id: t.id,
          name: t.name.trim() || 'Team',
          color: t.color,
          members: t.members,
        }));
      }

      setLoading(true);
      try {
        const battle = await api.createBattle({
          name: name.trim(), password: password || undefined, interval,
          scoringMode,
          customStart: new Date(customStart).toISOString(), customEnd: new Date(customEnd).toISOString(),
          participants: validP, maxParticipants, scoring,
          repos: repos.length > 0 ? repos : undefined,
          createdBy: getCreatorId(),
          teams: teamsPayload,
        });
        navigate(`/battle/${battle.id}`);
      } catch (err) { setError(err instanceof Error ? err.message : 'Error creating battle'); }
      finally { setLoading(false); }
    } else {
      setLoading(true);
      try {
        const tournament = await api.createTournament({
          name: name.trim(), size: bracketSize, roundDuration,
          scoringMode, scoring,
          repos: repos.length > 0 ? repos : undefined,
          participants: validP.length > 0 ? validP : undefined,
        });
        navigate(`/tournament/${tournament.id}`);
      } catch (err) { setError(err instanceof Error ? err.message : 'Error creating tournament'); }
      finally { setLoading(false); }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="pixel-font text-base text-accent-green mb-6 text-center">
        &#9876;&#65039; NEW COMPETITION
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mode selector */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">TYPE</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('battle')}
              className={`pixel-font text-sm py-3 rounded border transition-colors cursor-pointer ${mode === 'battle' ? 'bg-accent-green/20 text-accent-green border-accent-green/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
              &#9876;&#65039; Battle
            </button>
            <button type="button" onClick={() => setMode('tournament')}
              className={`pixel-font text-sm py-3 rounded border transition-colors cursor-pointer ${mode === 'tournament' ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
              &#127942; Tournament
            </button>
          </div>
          <p className="text-[10px] text-dark-muted mt-2 text-center">
            {mode === 'battle' ? 'Free-form battle — any number of fighters, custom time window.' : 'Bracket elimination — 4, 8, or 16 players in 1v1 rounds until a champion is crowned.'}
          </p>
        </div>

        {/* Name */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">NAME</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder={mode === 'battle' ? 'Ex: Frontend vs Backend' : 'Ex: Spring Championship'}
            className="w-full bg-dark-bg border border-dark-border text-dark-text p-3 rounded focus:border-accent-blue outline-none" maxLength={50} />
        </div>

        {/* Scoring Mode (window vs forward-only sprint) */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">SCORING MODE</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleScoringModeChange('window')}
              className={`pixel-font text-xs py-3 rounded border transition-colors cursor-pointer ${scoringMode === 'window' ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
              &#129534; Scoring Window
            </button>
            <button type="button" onClick={() => handleScoringModeChange('sprint')}
              className={`pixel-font text-xs py-3 rounded border transition-colors cursor-pointer ${scoringMode === 'sprint' ? 'bg-accent-orange/20 text-accent-orange border-accent-orange/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
              &#9889; Live Sprint
            </button>
          </div>
          <p className="text-[10px] text-dark-muted mt-2">
            {scoringMode === 'window'
              ? 'Counts past + future activity inside the chosen window. Past contributions count.'
              : 'Race forward from the moment the battle starts. Only activity from now until the end counts.'}
          </p>
        </div>

        {/* Tournament: Bracket Size */}
        {mode === 'tournament' && (
          <div className="pixel-border bg-dark-card p-4 rounded-lg">
            <label className="pixel-font text-[10px] text-accent-blue block mb-2">BRACKET SIZE</label>
            <div className="grid grid-cols-3 gap-2">
              {([4, 8, 16] as TournamentSize[]).map(s => (
                <button key={s} type="button" onClick={() => setBracketSize(s)}
                  className={`pixel-font text-sm py-3 rounded border transition-colors cursor-pointer ${bracketSize === s ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
                  {s} Players
                </button>
              ))}
            </div>
            <p className="text-[10px] text-dark-muted mt-2">{Math.log2(bracketSize)} rounds of single elimination</p>
          </div>
        )}

        {/* Battle: Scoring Window / Sprint Duration */}
        {mode === 'battle' && (
          <div className="pixel-border bg-dark-card p-4 rounded-lg">
            <label className="pixel-font text-[10px] text-accent-blue block mb-2">
              {scoringMode === 'sprint' ? 'SPRINT DURATION' : 'SCORING WINDOW'}
            </label>
            <div className={`grid ${scoringMode === 'sprint' ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-3 md:grid-cols-6'} gap-2 mb-4`}>
              {(scoringMode === 'sprint' ? durationPresets : presets).map(key => (
                <button key={key} type="button" onClick={() => handleIntervalSelect(key)}
                  className={`pixel-font text-[10px] py-2 px-1 rounded border transition-colors cursor-pointer ${interval === key ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
                  {INTERVAL_LABELS[key]}
                </button>
              ))}
            </div>
            {scoringMode === 'window' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="pixel-font text-[10px] text-accent-green block mb-1">SCORING FROM</label>
                    <input type="datetime-local" value={customStart} onChange={e => { setCustomStart(e.target.value); setInterval('custom'); }}
                      onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                      className="datetime-green w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded transition-colors duration-150 hover:border-dark-muted focus:border-accent-green outline-none text-sm cursor-pointer" />
                  </div>
                  <div>
                    <label className="pixel-font text-[10px] text-accent-orange block mb-1">SCORING UNTIL</label>
                    <input type="datetime-local" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setInterval('custom'); }}
                      onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                      className="datetime-orange w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded transition-colors duration-150 hover:border-dark-muted focus:border-accent-orange outline-none text-sm cursor-pointer" />
                  </div>
                </div>
                <p className="text-[10px] text-dark-muted mt-2">GitHub activity within this window is scored. Past activity counts!</p>
              </>
            ) : (
              <p className="text-[10px] text-dark-muted">Battle starts now and runs for {INTERVAL_LABELS[interval === 'custom' ? '24h' : interval]}. Only activity from start counts.</p>
            )}
          </div>
        )}

        {/* Tournament: Round Duration */}
        {mode === 'tournament' && (
          <div className="pixel-border bg-dark-card p-4 rounded-lg">
            <label className="pixel-font text-[10px] text-accent-blue block mb-2">ROUND DURATION</label>
            <div className="grid grid-cols-5 gap-2">
              {durationPresets.map(key => (
                <button key={key} type="button" onClick={() => setRoundDuration(key)}
                  className={`pixel-font text-[10px] py-2 px-1 rounded border transition-colors cursor-pointer ${roundDuration === key ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/50' : 'bg-dark-bg text-dark-muted border-dark-border hover:border-dark-muted'}`}>
                  {INTERVAL_LABELS[key]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-dark-muted mt-2">
              {scoringMode === 'sprint'
                ? 'Each round runs forward from its start for this duration.'
                : 'Each matchup battle uses a window of this size around the round start.'}
            </p>
          </div>
        )}

        {/* Scoring Config */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-3">CONTRIBUTION TYPES &amp; POINTS</label>
          <div className="space-y-2">
            {(Object.keys(SCORING_LABELS) as ScoringKey[]).map(key => (
              <div key={key} className="flex items-center gap-3">
                <button type="button" onClick={() => toggleScoringType(key)}
                  className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs cursor-pointer transition-colors ${scoring.enabled[key] ? 'bg-accent-green/30 border-accent-green text-accent-green' : 'bg-dark-bg border-dark-border text-dark-muted'}`}>
                  {scoring.enabled[key] ? '\u2713' : ''}
                </button>
                <span className={`text-sm flex-1 ${scoring.enabled[key] ? 'text-dark-text' : 'text-dark-muted line-through'}`}>{SCORING_LABELS[key]}</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={scoring.points[key]} onChange={e => updatePoints(key, parseInt(e.target.value) || 0)} disabled={!scoring.enabled[key]} min={0} max={100}
                    className="w-14 bg-dark-bg border border-dark-border text-dark-text p-1 rounded text-center text-xs focus:border-accent-blue outline-none disabled:opacity-40" />
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

        {/* Participants */}
        <div className="pixel-border bg-dark-card p-4 rounded-lg">
          <label className="pixel-font text-[10px] text-accent-blue block mb-2">
            {mode === 'battle' ? 'FIGHTERS (GitHub usernames)' : `PLAYERS (optional \u2014 others can join later, max ${bracketSize})`}
          </label>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={p} onChange={e => updateParticipant(i, e.target.value)}
                  placeholder={`${mode === 'battle' ? 'Fighter' : 'Player'} ${i + 1}`}
                  className="flex-1 bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-green outline-none" />
                {participants.length > 1 && (
                  <button type="button" onClick={() => removeParticipant(i)} className="text-accent-red hover:bg-accent-red/20 px-2 rounded transition-colors cursor-pointer">&#10005;</button>
                )}
              </div>
            ))}
          </div>
          {participants.length < maxP && (
            <button type="button" onClick={addParticipant} className="mt-2 pixel-font text-[10px] text-accent-green hover:bg-accent-green/10 px-3 py-1 rounded transition-colors cursor-pointer">
              + ADD {mode === 'battle' ? 'FIGHTER' : 'PLAYER'}
            </button>
          )}
          {mode === 'tournament' && (
            <p className="text-[10px] text-dark-muted mt-2">Tournament starts automatically when all {bracketSize} slots are filled.</p>
          )}
        </div>

        {/* Battle-only: Team Mode */}
        {mode === 'battle' && (
          <div className="pixel-border bg-dark-card p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="pixel-font text-[10px] text-accent-blue">&#128101; TEAM MODE</label>
              <button
                type="button"
                onClick={() => setTeamMode(v => !v)}
                role="switch"
                aria-checked={teamMode}
                className={`relative w-11 h-6 rounded-full border transition-colors cursor-pointer ${teamMode ? 'bg-accent-green/30 border-accent-green/60' : 'bg-dark-bg border-dark-border'}`}
              >
                <span className={`absolute top-0.5 ${teamMode ? 'right-0.5 bg-accent-green' : 'left-0.5 bg-dark-muted'} w-5 h-5 rounded-full transition-all`} />
              </button>
            </div>
            <p className="text-[10px] text-dark-muted mb-3">
              Group fighters into teams for free combinations like <b>1v2</b>, <b>2v2</b>, <b>1v3</b>, or even <b>2v2v1</b>.
            </p>

            {teamMode && (
              <>
                {validParticipants.length === 0 ? (
                  <p className="text-[10px] text-accent-orange">Add fighters above, then assign them to teams.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="pixel-font text-[10px] text-dark-muted">
                        {teamSummary ? `Matchup: ${teamSummary}` : 'No team has members yet'}
                      </span>
                      <span className="text-[10px] text-dark-muted">
                        {assignedUsernames.size}/{validParticipants.length} assigned
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teams.map((team) => {
                        const c = teamClasses(team.color);
                        return (
                          <div key={team.id} className={`rounded-lg border p-3 bg-dark-bg/40 ${c.softBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={team.name}
                                onChange={e => renameTeam(team.id, e.target.value)}
                                maxLength={30}
                                className={`flex-1 bg-dark-bg border border-dark-border ${c.text} pixel-font text-xs p-2 rounded focus:${c.border} outline-none`}
                              />
                              <span className={`pixel-font text-[10px] ${c.text}`}>{team.members.length}</span>
                              {teams.length > 2 && (
                                <button type="button" onClick={() => removeTeam(team.id)} className="text-accent-red hover:bg-accent-red/20 px-2 py-1 rounded transition-colors cursor-pointer" aria-label="Remove team">
                                  &#10005;
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {validParticipants.map(username => {
                                const inThisTeam = team.members.includes(username);
                                const inOtherTeam = !inThisTeam && assignedUsernames.has(username.toLowerCase());
                                return (
                                  <button
                                    key={username}
                                    type="button"
                                    onClick={() => togglePlayerInTeam(team.id, username)}
                                    className={`text-[10px] px-2 py-1 rounded border transition-colors cursor-pointer ${
                                      inThisTeam
                                        ? `${c.softBg} ${c.text} ${c.border}`
                                        : inOtherTeam
                                          ? 'bg-dark-bg/60 text-dark-muted/60 border-dark-border/60 hover:bg-dark-border/30'
                                          : 'bg-dark-bg text-dark-muted border-dark-border hover:text-dark-text hover:border-dark-muted'
                                    }`}
                                    title={inOtherTeam ? 'Move to this team' : undefined}
                                  >
                                    {inThisTeam ? '\u2713 ' : ''}{username}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={addTeam}
                      className="mt-3 pixel-font text-[10px] text-accent-green hover:bg-accent-green/10 px-3 py-1 rounded transition-colors cursor-pointer"
                    >
                      + ADD TEAM
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Battle-only: Password + Max Fighters */}
        {mode === 'battle' && (
          <>
            <div className="pixel-border bg-dark-card p-4 rounded-lg">
              <label className="pixel-font text-[10px] text-accent-yellow block mb-2">&#128274; PASSWORD (optional)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave empty for open room"
                className="w-full bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-yellow outline-none" />
              <p className="text-[10px] text-dark-muted mt-1">Viewers can always watch. Password is for joining as a competitor.</p>
            </div>
            <div className="pixel-border bg-dark-card p-4 rounded-lg">
              <label className="pixel-font text-[10px] text-accent-blue block mb-2">MAX FIGHTERS</label>
              <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))} min={2} max={20}
                className="w-24 bg-dark-bg border border-dark-border text-dark-text p-2 rounded focus:border-accent-blue outline-none" />
            </div>
          </>
        )}

        {error && <p className="pixel-font text-xs text-accent-red text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className={`w-full pixel-font text-sm py-4 rounded transition-colors disabled:opacity-50 cursor-pointer ${mode === 'battle' ? 'bg-accent-green text-dark-bg hover:bg-accent-green/90' : 'bg-accent-purple text-dark-bg hover:bg-accent-purple/90'}`}>
          {loading ? 'CREATING...' : mode === 'battle' ? '\u2694\uFE0F START BATTLE' : '\u{1F3C6} CREATE TOURNAMENT'}
        </button>
      </form>
    </div>
  );
}
