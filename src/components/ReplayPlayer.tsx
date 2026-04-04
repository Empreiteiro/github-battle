import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Battle, ScoreSnapshot } from '../types';
import { getParticipantColor, getIntensityLevels, NEUTRAL_CELL, CELL_BORDER } from '../utils/pixelArt';

const COLS = 52;
const ROWS = 7;
const TOTAL_CELLS = COLS * ROWS;

interface Props {
  battle: Battle;
}

type Speed = 1 | 2 | 5;

function buildGridFromScores(
  participants: Battle['participants'],
  scores: Record<string, number>,
): { participantIndex: number; intensity: number }[] {
  const grid = Array.from({ length: TOTAL_CELLS }, () => ({
    participantIndex: -1,
    intensity: 0,
  }));

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalScore === 0) return grid;

  const sorted = participants
    .map((p, i) => ({ index: i, score: scores[p.username] || 0 }))
    .sort((a, b) => b.score - a.score);

  let cellIndex = 0;
  for (const { index, score } of sorted) {
    if (score === 0) continue;
    const cellCount = Math.max(1, Math.floor(TOTAL_CELLS * (score / totalScore)));
    for (let i = 0; i < cellCount && cellIndex < TOTAL_CELLS; i++) {
      let h = (cellIndex * 374761393 + index * 668265263) >>> 0;
      h = Math.imul(h ^ (h >>> 15), 2246822519);
      h = Math.imul(h ^ (h >>> 13), 3266489917);
      h = (h ^ (h >>> 16)) >>> 0;
      const intensity = h % 4;
      grid[cellIndex] = { participantIndex: index, intensity };
      cellIndex++;
    }
  }

  return grid;
}

export default function ReplayPlayer({ battle }: Props) {
  const history = battle.scoreHistory || [];
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const frameCount = history.length;

  const currentSnapshot: ScoreSnapshot | null = useMemo(
    () => (frameCount > 0 ? history[Math.min(currentFrame, frameCount - 1)] : null),
    [history, currentFrame, frameCount],
  );

  const grid = useMemo(() => {
    if (!currentSnapshot) return Array.from({ length: TOTAL_CELLS }, () => ({ participantIndex: -1, intensity: 0 }));
    return buildGridFromScores(battle.participants, currentSnapshot.scores);
  }, [currentSnapshot, battle.participants]);

  // Playback logic
  const advance = useCallback(() => {
    setCurrentFrame(prev => {
      if (prev >= frameCount - 1) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [frameCount]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(advance, 1000 / speed);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, speed, advance]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const containerWidth = parent.clientWidth;
    const isDesktop = containerWidth > 640;
    const gap = isDesktop ? 4 : 3;
    const cellSize = Math.max(6, Math.floor((containerWidth - gap * (COLS + 1)) / COLS));
    const totalWidth = COLS * (cellSize + gap) + gap;
    const totalHeight = ROWS * (cellSize + gap) + gap;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    const colorCache: Record<number, string[]> = {};
    for (let idx = 0; idx < battle.participants.length; idx++) {
      colorCache[idx] = getIntensityLevels(getParticipantColor(idx));
    }

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      const x = gap + col * (cellSize + gap);
      const y = gap + row * (cellSize + gap);

      const cell = grid[i];
      ctx.fillStyle = cell.participantIndex === -1
        ? NEUTRAL_CELL
        : colorCache[cell.participantIndex][cell.intensity];

      const radius = Math.max(2, cellSize * 0.15);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, radius);
      ctx.fill();

      ctx.strokeStyle = CELL_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, radius);
      ctx.stroke();
    }
  }, [grid, battle.participants]);

  if (frameCount < 2) {
    return (
      <div className="pixel-border bg-dark-card p-4 rounded-lg text-center">
        <span className="pixel-font text-[10px] text-dark-muted">
          Not enough data for replay (need at least 2 snapshots).
        </span>
      </div>
    );
  }

  const progress = frameCount > 1 ? (currentFrame / (frameCount - 1)) * 100 : 0;
  const ts = currentSnapshot ? new Date(currentSnapshot.timestamp).toLocaleString('en-US') : '';

  // Score display at current frame
  const leader = currentSnapshot
    ? Object.entries(currentSnapshot.scores).sort(([, a], [, b]) => b - a)[0]
    : null;

  return (
    <div className="pixel-border bg-dark-card rounded-lg overflow-hidden">
      <div className="p-3 bg-dark-bg/50 text-center">
        <span className="pixel-font text-[10px] text-accent-purple">
          &#127916; BATTLE REPLAY
        </span>
      </div>

      {/* Territory canvas */}
      <div className="p-4">
        <canvas ref={canvasRef} className="w-full block" style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={frameCount - 1}
            value={currentFrame}
            onChange={e => { setCurrentFrame(Number(e.target.value)); setPlaying(false); }}
            className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-accent-purple"
          />
          <div className="flex justify-between text-[10px] text-dark-muted">
            <span>Frame {currentFrame + 1}/{frameCount}</span>
            <span>{ts}</span>
          </div>
        </div>

        {/* Playback buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setCurrentFrame(0); setPlaying(false); }}
            className="pixel-font text-[10px] text-dark-muted hover:text-dark-text px-2 py-1 cursor-pointer"
            title="Restart"
          >
            &#9198;
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="pixel-font text-sm bg-accent-purple/20 text-accent-purple border border-accent-purple/50 px-4 py-2 rounded hover:bg-accent-purple/30 transition-colors cursor-pointer"
          >
            {playing ? '\u23F8 PAUSE' : '\u25B6 PLAY'}
          </button>
          <button
            onClick={() => { setCurrentFrame(frameCount - 1); setPlaying(false); }}
            className="pixel-font text-[10px] text-dark-muted hover:text-dark-text px-2 py-1 cursor-pointer"
            title="Skip to end"
          >
            &#9197;
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-4">
            {([1, 2, 5] as Speed[]).map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`pixel-font text-[10px] px-2 py-1 rounded border cursor-pointer transition-colors ${
                  speed === s
                    ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/50'
                    : 'text-dark-muted border-dark-border hover:border-dark-muted'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Score at current frame */}
        {currentSnapshot && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {battle.participants.map((p, idx) => {
              const score = currentSnapshot.scores[p.username] || 0;
              const color = getParticipantColor(idx);
              const isLeader = leader && leader[0] === p.username;
              return (
                <span key={p.username} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
                  <span className={isLeader ? 'text-dark-text font-bold' : 'text-dark-muted'}>
                    {p.username}: {score}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Progress bar visual */}
        <div className="h-1 bg-dark-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-purple transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
