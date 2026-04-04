import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Battle } from '../types';
import { api } from '../utils/api';
import BattleCard from '../components/BattleCard';

export default function Home() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listBattles()
      .then(setBattles)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const waitingBattles = battles.filter(b => b.status === 'waiting');
  const activeBattles = battles.filter(b => b.status === 'active');
  const finishedBattles = battles.filter(b => b.status === 'finished');

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

      {!loading && battles.length === 0 && (
        <div className="text-center py-12">
          <p className="pixel-font text-sm text-dark-muted mb-4">
            No battles yet...
          </p>
          <p className="text-dark-muted">
            Be the first to create a battle!
          </p>
        </div>
      )}
    </div>
  );
}
