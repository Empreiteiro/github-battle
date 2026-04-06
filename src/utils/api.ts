import type { Battle, CreateBattleRequest, JoinBattleRequest, VoteRequest, Tournament, CreateTournamentRequest } from '../types';
import { localStore } from './localStore';

const BASE = '/api';
let useLocal = false;

// Single probe to check if backend is available, shared across all callers
let backendProbe: Promise<boolean> | null = null;

async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/battles-list`, { method: 'GET' });
    const contentType = res.headers.get('content-type') || '';
    // Backend must respond with JSON — Vite SPA fallback returns text/html
    return res.ok && contentType.includes('application/json');
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

  leaveBattle: (id: string, username: string) =>
    withFallback(
      () => request<Battle>('/battles-leave', { method: 'POST', body: JSON.stringify({ id, username }) }),
      () => localStore.leaveBattle(id, username),
    ),

  deleteBattle: (id: string, createdBy: string) =>
    withFallback(
      () => request<{ success: boolean }>('/battles-delete', { method: 'POST', body: JSON.stringify({ id, createdBy }) }),
      () => localStore.deleteBattle(id, createdBy),
    ),

  // Tournaments
  listTournaments: () =>
    withFallback(
      () => request<Tournament[]>('/tournaments-list'),
      () => localStore.listTournaments(),
    ),

  createTournament: (data: CreateTournamentRequest) =>
    withFallback(
      () => request<Tournament>('/tournaments-create', { method: 'POST', body: JSON.stringify(data) }),
      () => localStore.createTournament(data),
    ),

  getTournament: (id: string) =>
    withFallback(
      () => request<Tournament>(`/tournaments-get?id=${id}`),
      () => localStore.getTournament(id),
    ),

  joinTournament: (id: string, username: string) =>
    withFallback(
      () => request<Tournament>('/tournaments-join', { method: 'POST', body: JSON.stringify({ id, username }) }),
      () => localStore.joinTournament(id, username),
    ),
};
