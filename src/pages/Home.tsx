import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Battle, Tournament } from '../types';
import { api } from '../utils/api';
import BattleCard from '../components/BattleCard';
import TournamentCard from '../components/TournamentCard';

function matchesBattle(battle: Battle, q: string): boolean {
  const lower = q.toLowerCase();
  if (battle.name.toLowerCase().includes(lower)) return true;
  if (battle.participants.some(p => p.username.toLowerCase().includes(lower))) return true;
  if (battle.repos?.some(r => r.toLowerCase().includes(lower))) return true;
  return false;
}

function matchesTournament(tournament: Tournament, q: string): boolean {
  const lower = q.toLowerCase();
  if (tournament.name.toLowerCase().includes(lower)) return true;
  if (tournament.participants.some(p => p.toLowerCase().includes(lower))) return true;
  if (tournament.repos?.some(r => r.toLowerCase().includes(lower))) return true;
  if (tournament.champion?.toLowerCase().includes(lower)) return true;
  return false;
}

export default function Home() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.listBattles().catch(() => [] as Battle[]),
      api.listTournaments().catch(() => [] as Tournament[]),
    ]).then(([b, t]) => {
      setBattles(b);
      setTournaments(t);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim();
  const filteredBattles = useMemo(
    () => q ? battles.filter(b => matchesBattle(b, q)) : battles,
    [battles, q],
  );
  const filteredTournaments = useMemo(
    () => q ? tournaments.filter(t => matchesTournament(t, q)) : tournaments,
    [tournaments, q],
  );

  const waitingBattles = filteredBattles.filter(b => b.status === 'waiting');
  const activeBattles = filteredBattles.filter(b => b.status === 'active');
  const finishedBattles = filteredBattles.filter(b => b.status === 'finished');

  const totalResults = filteredBattles.length + filteredTournaments.length;

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-8 md:py-12">
        <h1 className="pixel-font text-xl md:text-3xl text-accent-green mb-4 leading-relaxed">
          &#9876;&#65039; GitHub Battle
        </h1>
        <p className="text-dark-muted text-lg mb-6 max-w-2xl mx-auto">
          Create battle rooms and see who's the most active dev on GitHub!
          RPG pixel art animations based on real activity.
        </p>
        <Link
          to="/create"
          className="inline-block pixel-font text-sm bg-accent-green text-dark-bg px-8 py-3 rounded hover:bg-accent-green/90 transition-colors no-underline animate-pulse-glow"
        >
          CREATE BATTLE
        </Link>
      </div>

      {/* Scoring info */}
      <div className="pixel-border bg-dark-card p-4 rounded-lg mb-8">
        <h3 className="pixel-font text-[10px] text-accent-yellow mb-3 text-center">SCORING SYSTEM</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-dark-muted">
          <span>&#128308; Commit: <b className="text-accent-green">5 pts</b></span>
          <span>&#128309; PR Opened: <b className="text-accent-blue">10 pts</b></span>
          <span>&#128995; PR Merged: <b className="text-accent-purple">15 pts</b></span>
          <span>&#128992; Issue: <b className="text-accent-orange">3 pts</b></span>
          <span>&#128994; Review: <b className="text-accent-red">8 pts</b></span>
          <span>&#9898; Comment: <b className="text-dark-text">1 pt</b></span>
        </div>
        <p className="text-[10px] text-dark-muted mt-3 text-center">
          &#128274; Want private repo contributions to count? Enable <b>Private contributions</b> in your{' '}
          <a href="https://github.com/settings/profile" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline hover:text-accent-blue/80">
            GitHub profile settings
          </a>.
        </p>
      </div>

      {/* Search filter */}
      {!loading && (battles.length > 0 || tournaments.length > 0) && (
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search battles, tournaments, players, or repos..."
              className="w-full bg-dark-card border border-dark-border text-dark-text pl-10 pr-10 py-3 rounded-lg focus:border-accent-blue outline-none text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text cursor-pointer"
              >
                &#10005;
              </button>
            )}
          </div>
          {q && (
            <p className="text-[10px] text-dark-muted mt-2 text-center">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{q}"
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="pixel-font text-sm text-accent-blue animate-pulse">
            Loading battles...
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-accent-red mb-4">{error}</p>
          <p className="text-dark-muted text-sm">
            If running locally, make sure the Netlify CLI is running.
          </p>
        </div>
      )}

      {/* Waiting for Challengers */}
      {waitingBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="pixel-font text-sm text-accent-orange mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
            LOOKING FOR CHALLENGERS ({waitingBattles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {waitingBattles.map(b => (
              <BattleCard key={b.id} battle={b} />
            ))}
          </div>
        </section>
      )}

      {/* Active Battles */}
      {activeBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="pixel-font text-sm text-accent-red mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-red animate-pulse" />
            LIVE BATTLES ({activeBattles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBattles.map(b => (
              <BattleCard key={b.id} battle={b} />
            ))}
          </div>
        </section>
      )}

      {/* Finished Battles */}
      {finishedBattles.length > 0 && (
        <section className="mb-8">
          <h2 className="pixel-font text-sm text-dark-muted mb-4">
            &#127942; FINISHED BATTLES ({finishedBattles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedBattles.map(b => (
              <BattleCard key={b.id} battle={b} />
            ))}
          </div>
        </section>
      )}

      {/* Tournaments */}
      {filteredTournaments.length > 0 && (
        <>
          {filteredTournaments.filter(t => t.status === 'registration').length > 0 && (
            <section className="mb-8">
              <h2 className="pixel-font text-sm text-accent-purple mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                TOURNAMENTS — OPEN REGISTRATION ({filteredTournaments.filter(t => t.status === 'registration').length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.filter(t => t.status === 'registration').map(t => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}

          {filteredTournaments.filter(t => t.status === 'active').length > 0 && (
            <section className="mb-8">
              <h2 className="pixel-font text-sm text-accent-green mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                TOURNAMENTS — LIVE ({filteredTournaments.filter(t => t.status === 'active').length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.filter(t => t.status === 'active').map(t => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}

          {filteredTournaments.filter(t => t.status === 'finished').length > 0 && (
            <section className="mb-8">
              <h2 className="pixel-font text-sm text-dark-muted mb-4">
                &#127942; TOURNAMENTS — FINISHED ({filteredTournaments.filter(t => t.status === 'finished').length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.filter(t => t.status === 'finished').map(t => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && totalResults === 0 && !q && (
        <div className="text-center py-12">
          <p className="pixel-font text-sm text-dark-muted mb-4">
            No battles or tournaments yet...
          </p>
          <p className="text-dark-muted">
            Be the first to create one!
          </p>
        </div>
      )}

      {!loading && totalResults === 0 && q && (
        <div className="text-center py-12">
          <p className="pixel-font text-sm text-dark-muted mb-4">
            No results for "{q}"
          </p>
          <p className="text-dark-muted">
            Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}
