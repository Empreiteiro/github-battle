import type { Battle, CreateBattleRequest, JoinBattleRequest, VoteRequest } from '../types';
import { localStore } from './localStore';

const BASE = '/api';
let useLocal = false;

// Single probe to check if backend is available, shared across all callers
let backendProbe: Promise<boolean> | null = null;

async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/battles-list`, { method: 'GET' });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function ensureBackendProbe(): Promise<boolean> {
  if (useLocal) return Promise.resolve(false);
  if (!backendProbe) {
    backendProbe = checkBackend().then(available => {
      if (!available) {
        useLocal = true;
        console.info('[GitHub Battle] Backend unavailable, using local mode (localStorage)');
      }
      return available;
    });
  }
  return backendProbe;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function withFallback<T>(remoteFn: () => Promise<T>, localFn: () => Promise<T>): Promise<T> {
  const available = await ensureBackendProbe();
  if (!available) return localFn();
  try {
    return await remoteFn();
  } catch {
    useLocal = true;
    return localFn();
  }
}

export function isLocalMode() {
  return useLocal;
}

export const api = {
  listBattles: () =>
    withFallback(
      () => request<Battle[]>('/battles-list'),
      () => localStore.listBattles(),
    ),

  getBattle: (id: string) =>
    withFallback(
      () => request<Battle>(`/battles-get?id=${id}`),
      () => localStore.getBattle(id),
    ),

  createBattle: (data: CreateBattleRequest) =>
    withFallback(
      () => request<Battle>('/battles-create', { method: 'POST', body: JSON.stringify(data) }),
      () => localStore.createBattle(data),
    ),

  joinBattle: (id: string, data: JoinBattleRequest) =>
    withFallback(
      () => request<Battle>(`/battles-join`, { method: 'POST', body: JSON.stringify({ id, ...data }) }),
      () => localStore.joinBattle(id, data),
    ),

  vote: (id: string, data: VoteRequest) =>
    withFallback(
      () => request<Battle>(`/battles-vote`, { method: 'POST', body: JSON.stringify({ id, ...data }) }),
      () => localStore.vote(id, data),
    ),

  refreshScores: (id: string) =>
    withFallback(
      () => request<Battle>(`/battles-scores?id=${id}`),
      () => localStore.refreshScores(id),
    ),
};
