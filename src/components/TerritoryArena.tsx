import { useRef, useEffect, useState, useMemo } from 'react';
import type { Battle } from '../types';
import { getParticipantColor, getTeamMemberColor, getIntensityLevels, NEUTRAL_CELL, CELL_BORDER } from '../utils/pixelArt';
import { getAttackName, getAttackColor } from '../utils/scoring';
import GitHubAvatar from './GitHubAvatar';

const COLS = 52;
const ROWS = 7;
const TOTAL_CELLS = COLS * ROWS;

interface CellOwner {
  participantIndex: number; // -1 = neutral
  intensity: number;        // 0-3
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

interface Props {
  battle: Battle;
  prevBattle: Battle | null;
}

function buildTerritoryGrid(battle: Battle): CellOwner[] {
  const grid: CellOwner[] = Array.from({ length: TOTAL_CELLS }, () => ({
    participantIndex: -1,
    intensity: 0,
  }));

  const totalScore = battle.participants.reduce((sum, p) => sum + p.score, 0);
  if (totalScore === 0) return grid;

  // Sort participants by score descending for visual placement
  const sorted = battle.participants
    .map((p, i) => ({ index: i, score: p.score }))
    .sort((a, b) => b.score - a.score);

  let cellIndex = 0;
  for (const { index, score } of sorted) {
    if (score === 0) continue;
    const cellCount = Math.max(1, Math.floor(TOTAL_CELLS * (score / totalScore)));
    for (let i = 0; i < cellCount && cellIndex < TOTAL_CELLS; i++) {
      // MurmurHash3-style mixing for natural randomness
      let h = (cellIndex * 374761393 + index * 668265263) >>> 0;
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      h = (h ^ (h >>> 16)) >>> 0;
      const intensity = h % 4 as 0 | 1 | 2 | 3;
      grid[cellIndex] = { participantIndex: index, intensity };
      cellIndex++;
    }
  }

  return grid;
}

export default function TerritoryArena({ battle, prevBattle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [animatingCells, setAnimatingCells] = useState<Set<number>>(new Set());
  const prevGridRef = useRef<CellOwner[]>([]);

  const grid = useMemo(() => buildTerritoryGrid(battle), [battle]);

  // When battle.teams is set, each participant gets a shade of their team's
  // base color so teammates read as one cohort on the map. Falls back to the
  // global distinct-color palette when there are no teams.
  const participantColors = useMemo<string[]>(() => {
    const colors = battle.participants.map((_, i) => getParticipantColor(i));
    if (!battle.teams || battle.teams.length < 2) return colors;
    for (const team of battle.teams) {
      team.members.forEach((username, memberIdx) => {
        const pIdx = battle.participants.findIndex(p => p.username === username);
        if (pIdx !== -1) {
          colors[pIdx] = getTeamMemberColor(team.color, memberIdx);
        }
      });
    }
    return colors;
  }, [battle.participants, battle.teams]);

  const colorFor = (idx: number) => participantColors[idx] ?? getParticipantColor(idx);

  // Detect new cells conquered and animate them
  useEffect(() => {
    if (!prevBattle) {
      prevGridRef.current = grid;
      return;
    }

    const prevGrid = prevGridRef.current;
    const newCells = new Set<number>();

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const prev = prevGrid[i];
      const curr = grid[i];
      if (curr.participantIndex !== -1 && (
        !prev || prev.participantIndex !== curr.participantIndex
      )) {
        newCells.add(i);
      }
    }

    if (newCells.size > 0) {
      setAnimatingCells(newCells);
      setTimeout(() => setAnimatingCells(new Set()), 1000);

      // Generate floating text for score changes
      for (const p of battle.participants) {
        const prev = prevBattle.participants.find(pp => pp.username === p.username);
        if (!prev) continue;
        const diff = p.score - prev.score;
        if (diff > 0) {
          const pIdx = battle.participants.indexOf(p);
          const diffs = [
            { type: 'commit', d: p.stats.commits - prev.stats.commits },
            { type: 'pr', d: p.stats.pullRequests - prev.stats.pullRequests },
            { type: 'pr_merged', d: p.stats.pullRequestsMerged - prev.stats.pullRequestsMerged },
            { type: 'issue', d: p.stats.issues - prev.stats.issues },
            { type: 'review', d: p.stats.reviews - prev.stats.reviews },
            { type: 'comment', d: p.stats.comments - prev.stats.comments },
          ].filter(x => x.d > 0);

          for (const { type, d } of diffs) {
            const id = `${p.username}-${type}-${Date.now()}-${Math.random()}`;
            const xPct = 10 + (pIdx / battle.participants.length) * 70;
            setFloatingTexts(prev => [...prev, {
              id,
              text: `${getAttackName(type)} x${d}`,
              x: xPct,
              y: 10,
              color: getAttackColor(type),
              createdAt: Date.now(),
            }]);
            setTimeout(() => {
              setFloatingTexts(prev => prev.filter(t => t.id !== id));
            }, 1500);
          }
        }
      }
    }

    prevGridRef.current = grid;
  }, [grid, battle, prevBattle]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const containerWidth = parent.clientWidth;
    // Larger gap and cells on desktop, compact on mobile
    const isDesktop = containerWidth > 640;
    const gap = isDesktop ? 4 : 3;
    const cellSize = Math.max(6, Math.floor((containerWidth - gap * (COLS + 1)) / COLS));
    const totalWidth = COLS * (cellSize + gap) + gap;
    const totalHeight = ROWS * (cellSize + gap) + gap;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Build color caches (team-aware when battle.teams is set)
    const colorCache: Record<number, string[]> = {};
    for (let i = 0; i < battle.participants.length; i++) {
      colorCache[i] = getIntensityLevels(colorFor(i));
    }

    // Draw cells
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      const x = gap + col * (cellSize + gap);
      const y = gap + row * (cellSize + gap);

      const cell = grid[i];
      const isAnimating = animatingCells.has(i);

      if (cell.participantIndex === -1) {
        ctx.fillStyle = NEUTRAL_CELL;
      } else {
        const levels = colorCache[cell.participantIndex];
        ctx.fillStyle = levels[cell.intensity];
      }

      // Rounded rect
      const radius = Math.max(2, cellSize * 0.15);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, radius);
      ctx.fill();

      // Glow effect for newly conquered cells
      if (isAnimating && cell.participantIndex !== -1) {
        const baseColor = colorFor(cell.participantIndex);
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, radius);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Cell border
      ctx.strokeStyle = CELL_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, radius);
      ctx.stroke();
    }
  }, [grid, battle.participants, participantColors, animatingCells]);

  // Territory stats per participant
  const territoryStats = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const cell of grid) {
      if (cell.participantIndex !== -1) {
        counts[cell.participantIndex] = (counts[cell.participantIndex] || 0) + 1;
      }
    }
    return counts;
  }, [grid]);

  const totalScore = battle.participants.reduce((sum, p) => sum + p.score, 0);
  const winner = battle.status === 'finished'
    ? [...battle.participants].sort((a, b) => b.score - a.score)[0]
    : null;

  return (
    <div className="pixel-border bg-dark-card rounded-lg overflow-hidden">
      {/* Title */}
      <div className="p-3 bg-dark-bg/50 text-center">
        {battle.status === 'active' ? (
          <span className="pixel-font text-[10px] text-accent-green animate-pulse">
            &#9876;&#65039; TERRITORY CONQUEST IN PROGRESS
          </span>
        ) : battle.status === 'finished' ? (
          <span className="pixel-font text-[10px] text-accent-yellow">
            &#127942; BATTLE OVER &mdash; WINNER: {winner?.username}
          </span>
        ) : (
          <span className="pixel-font text-[10px] text-accent-orange animate-pulse">
            &#9876;&#65039; WAITING FOR CHALLENGERS
          </span>
        )}
      </div>

      {/* Waiting state — challenge prompt */}
      {battle.status === 'waiting' && (
        <div className="p-8 text-center">
          <div className="mb-4">
            {battle.participants[0] && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <GitHubAvatar username={battle.participants[0].username} avatarUrl={battle.participants[0].avatarUrl} className="w-12 h-12" />
                <div className="text-left">
                  <a href={`https://github.com/${battle.participants[0].username}`} target="_blank" rel="noopener noreferrer" className="pixel-font text-sm text-accent-green no-underline hover:text-accent-blue transition-colors">{battle.participants[0].username}</a>
                  <p className="text-dark-muted text-xs">is looking for a challenger!</p>
                </div>
              </div>
            )}
          </div>
          <p className="pixel-font text-[10px] text-dark-muted mb-2">
            Scores will be revealed once a challenger joins.
          </p>
          <p className="text-dark-muted text-xs">
            Click <b className="text-accent-blue">+ JOIN BATTLE</b> above to accept the challenge.
          </p>
        </div>
      )}

      {/* Territory Grid — hidden during waiting */}
      {battle.status !== 'waiting' && <div className="relative p-4">
        <canvas ref={canvasRef} className="w-full block" style={{ imageRendering: 'pixelated' }} />

        {/* Floating texts */}
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className="absolute animate-float-up pointer-events-none pixel-font text-[10px]"
            style={{
              left: `${ft.x}%`,
              top: `${ft.y}%`,
              color: ft.color,
              textShadow: '2px 2px 0 #000',
            }}
          >
            {ft.text}
          </div>
        ))}
      </div>}

      {/* Legend / Scoreboard — hidden during waiting */}
      {battle.status !== 'waiting' && <div className="p-4 bg-dark-bg/30 border-t border-dark-border">
        {battle.teams && battle.teams.length >= 2 ? (
          // Team mode: group entries by team so the shared color family reads clearly
          <div className="space-y-3">
            {battle.teams.map(team => {
              const members = team.members
                .map(username => battle.participants.find(p => p.username === username))
                .filter((p): p is typeof battle.participants[number] => !!p);
              const teamTotal = members.reduce((sum, p) => sum + p.score, 0);
              const teamPct = totalScore > 0 ? Math.round((teamTotal / totalScore) * 100) : 0;
              const teamCells = members.reduce((sum, p) => sum + (territoryStats[battle.participants.indexOf(p)] || 0), 0);
              return (
                <div key={team.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="pixel-font text-[10px]" style={{ color: colorFor(battle.participants.indexOf(members[0])) }}>
                      {team.name}
                    </span>
                    <span className="text-[10px] text-dark-muted">
                      {teamTotal} pts &middot; {teamCells}/{TOTAL_CELLS} cells &middot; {teamPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[...members].sort((a, b) => b.score - a.score).map(p => {
                      const idx = battle.participants.indexOf(p);
                      const color = colorFor(idx);
                      const cells = territoryStats[idx] || 0;
                      const pct = totalScore > 0 ? Math.round((p.score / totalScore) * 100) : 0;
                      const levels = getIntensityLevels(color);
                      return (
                        <div key={p.username} className="flex items-center gap-3 bg-dark-bg/50 p-2 rounded">
                          <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-dark-text truncate">{p.username}</span>
                              <div className="flex gap-[2px]">
                                {levels.map((lv, li) => (
                                  <div key={li} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: lv }} />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-dark-muted">
                              <span className="pixel-font" style={{ color }}>{p.score} pts</span>
                              <span>&middot;</span>
                              <span>{cells}/{TOTAL_CELLS} cells</span>
                              <span>&middot;</span>
                              <span>{pct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...battle.participants]
              .sort((a, b) => b.score - a.score)
              .map((p) => {
                const idx = battle.participants.indexOf(p);
                const color = colorFor(idx);
                const cells = territoryStats[idx] || 0;
                const pct = totalScore > 0 ? Math.round((p.score / totalScore) * 100) : 0;
                const levels = getIntensityLevels(color);

                return (
                  <div key={p.username} className="flex items-center gap-3 bg-dark-bg/50 p-2 rounded">
                    <GitHubAvatar username={p.username} avatarUrl={p.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-dark-text truncate">{p.username}</span>
                        <div className="flex gap-[2px]">
                          {levels.map((lv, li) => (
                            <div
                              key={li}
                              className="w-[10px] h-[10px] rounded-[2px]"
                              style={{ backgroundColor: lv }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-dark-muted">
                        <span className="pixel-font" style={{ color }}>{p.score} pts</span>
                        <span>&middot;</span>
                        <span>{cells}/{TOTAL_CELLS} cells</span>
                        <span>&middot;</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>}
    </div>
  );
}
