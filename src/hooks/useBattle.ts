import { useState, useEffect, useCallback, useRef } from 'react';
import type { Battle } from '../types';
import { api } from '../utils/api';

export function useBattle(id: string | undefined) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBattle = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.refreshScores(id);
      setBattle(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch battle');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBattle();
  }, [fetchBattle]);

  return { battle, loading, error, refetch: fetchBattle, setBattle };
}

export function useBattlePolling(id: string | undefined, intervalMs = 30_000) {
  const { battle, loading, error, refetch, setBattle } = useBattle(id);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!id || battle?.status === 'finished') return;

    intervalRef.current = setInterval(refetch, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, intervalMs, refetch, battle?.status]);

  const vote = useCallback(async (username: string) => {
    if (!id) return;
    try {
      const updated = await api.vote(id, { username });
      setBattle(updated);
    } catch (err) {
      console.error('Vote failed:', err);
    }
  }, [id, setBattle]);

  const join = useCallback(async (username: string, password?: string) => {
    if (!id) return;
    const updated = await api.joinBattle(id, { username, password });
    setBattle(updated);
  }, [id, setBattle]);

  return { battle, loading, error, vote, join, refetch };
}
