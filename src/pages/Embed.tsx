import { useParams } from 'react-router-dom';
import { useBattlePolling } from '../hooks/useBattle';
import TerritoryArena from '../components/TerritoryArena';
import { useState, useRef, useEffect } from 'react';
import type { Battle } from '../types';

export default function Embed() {
  const { id } = useParams<{ id: string }>();
  const { battle, loading } = useBattlePolling(id, 30_000);
  const [prevBattle, setPrevBattle] = useState<Battle | null>(null);
  const prevRef = useRef<Battle | null>(null);

  useEffect(() => {
    if (battle && prevRef.current) {
      setPrevBattle(prevRef.current);
    }
    prevRef.current = battle;
  }, [battle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <span className="pixel-font text-[10px] text-accent-blue animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <span className="pixel-font text-[10px] text-accent-red">Battle not found</span>
      </div>
    );
  }

  const fullUrl = `${window.location.origin}/battle/${id}`;

  return (
    <div
      className="min-h-screen bg-dark-bg cursor-pointer"
      onClick={() => window.open(fullUrl, '_blank')}
      title="Click to open full battle"
    >
      <TerritoryArena battle={battle} prevBattle={prevBattle} />
    </div>
  );
}
