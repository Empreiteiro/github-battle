import { useRef, useEffect, useState, useCallback } from 'react';
import type { Battle, AttackEvent } from '../types';
import { drawCharacter, drawArenaBackground } from '../utils/pixelArt';
import { getAttackName, getAttackColor } from '../utils/scoring';
import HealthBar from './HealthBar';

interface Props {
  battle: Battle;
  prevBattle: Battle | null;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

export default function BattleArena({ battle, prevBattle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shakeLeft, setShakeLeft] = useState(false);
  const [shakeRight, setShakeRight] = useState(false);
  const [attackQueue, setAttackQueue] = useState<AttackEvent[]>([]);
  const [currentAttack, setCurrentAttack] = useState<AttackEvent | null>(null);

  const p1 = battle.participants[0];
  const p2 = battle.participants[1];

  // Detect score changes and generate attack events
  useEffect(() => {
    if (!prevBattle || battle.participants.length < 2) return;

    const attacks: AttackEvent[] = [];

    for (const curr of battle.participants) {
      const prev = prevBattle.participants.find(p => p.username === curr.username);
      if (!prev) continue;

      const diffs = [
        { type: 'commit', diff: curr.stats.commits - prev.stats.commits },
        { type: 'pr', diff: curr.stats.pullRequests - prev.stats.pullRequests },
        { type: 'pr_merged', diff: curr.stats.pullRequestsMerged - prev.stats.pullRequestsMerged },
        { type: 'issue', diff: curr.stats.issues - prev.stats.issues },
        { type: 'review', diff: curr.stats.reviews - prev.stats.reviews },
        { type: 'comment', diff: curr.stats.comments - prev.stats.comments },
      ];

      for (const { type, diff } of diffs) {
        if (diff > 0) {
          attacks.push({
            id: `${curr.username}-${type}-${Date.now()}-${Math.random()}`,
            attacker: curr.username,
            type: type as AttackEvent['type'],
            damage: diff,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (attacks.length > 0) {
      setAttackQueue(prev => [...prev, ...attacks]);
    }
  }, [battle, prevBattle]);

  // Process attack queue
  useEffect(() => {
    if (attackQueue.length === 0 || currentAttack) return;

    const next = attackQueue[0];
    setCurrentAttack(next);
    setAttackQueue(prev => prev.slice(1));

    const isP1Attacking = next.attacker === p1?.username;

    // Shake the defender
    if (isP1Attacking) {
      setShakeRight(true);
      setTimeout(() => setShakeRight(false), 300);
    } else {
      setShakeLeft(true);
      setTimeout(() => setShakeLeft(false), 300);
    }

    // Floating damage text
    const textX = isP1Attacking ? 65 : 25;
    setFloatingTexts(prev => [
      ...prev,
      {
        id: next.id,
        text: `${getAttackName(next.type)} -${next.damage}`,
        x: textX,
        y: 40,
        color: getAttackColor(next.type),
        createdAt: Date.now(),
      },
    ]);

    setTimeout(() => {
      setCurrentAttack(null);
    }, 800);

    // Cleanup floating texts
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== next.id));
    }, 1200);
  }, [attackQueue, currentAttack, p1?.username]);

  // Canvas rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawArenaBackground(ctx, width, height);

    if (battle.participants.length < 2) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for fighters...', width / 2, height / 2);
      return;
    }

    const scale = Math.max(4, Math.floor(width / 80));
    const groundY = height * 0.7 - 12 * scale;

    // Draw P1 (left)
    const p1x = width * 0.2;
    const p1Flash = currentAttack?.attacker !== p1?.username && currentAttack !== null;
    drawCharacter(ctx, p1x, groundY, scale, p1.username, false, p1Flash);

    // Draw P2 (right)
    const p2x = width * 0.65;
    const p2Flash = currentAttack?.attacker !== p2?.username && currentAttack !== null;
    drawCharacter(ctx, p2x, groundY, scale, p2.username, true, p2Flash);

    // Draw VS text
    ctx.fillStyle = '#f85149';
    ctx.font = `${Math.max(12, scale * 2)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', width / 2, height * 0.55);

    // Draw attack effect line
    if (currentAttack) {
      const isP1 = currentAttack.attacker === p1?.username;
      const fromX = isP1 ? p1x + 8 * scale : p2x;
      const toX = isP1 ? p2x : p1x + 8 * scale;
      const y = groundY + 6 * scale;

      ctx.strokeStyle = getAttackColor(currentAttack.type);
      ctx.lineWidth = 3;
      ctx.shadowColor = getAttackColor(currentAttack.type);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(fromX, y);
      ctx.lineTo(toX, y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [battle.participants, p1, p2, currentAttack]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = Math.min(400, parent.clientWidth * 0.5);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="pixel-border bg-dark-card rounded-lg overflow-hidden">
      {/* HP Bars */}
      {battle.participants.length >= 2 && (
        <div className="flex items-start justify-between p-3 bg-dark-bg/50">
          <HealthBar hp={p1.hp} label={p1.username} side="left" />
          <HealthBar hp={p2.hp} label={p2.username} side="right" />
        </div>
      )}

      {/* Arena */}
      <div className="relative">
        <canvas ref={canvasRef} className="w-full block" />

        {/* Floating damage texts */}
        {floatingTexts.map(ft => (
          <div
            key={ft.id}
            className="absolute animate-float-up pointer-events-none pixel-font text-xs"
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

        {/* Shake overlays */}
        {shakeLeft && (
          <div className="absolute left-0 top-0 w-1/2 h-full animate-shake pointer-events-none" />
        )}
        {shakeRight && (
          <div className="absolute right-0 top-0 w-1/2 h-full animate-shake pointer-events-none" />
        )}
      </div>

      {/* Battle status */}
      <div className="p-2 bg-dark-bg/50 text-center">
        {battle.status === 'active' ? (
          <span className="pixel-font text-[10px] text-accent-green animate-pulse">
            &#9876;&#65039; BATTLE IN PROGRESS
          </span>
        ) : battle.status === 'finished' ? (
          <span className="pixel-font text-[10px] text-accent-yellow">
            &#127942; BATTLE OVER — WINNER: {
              [...battle.participants].sort((a, b) => b.score - a.score)[0]?.username
            }
          </span>
        ) : (
          <span className="pixel-font text-[10px] text-dark-muted">
            Waiting to start...
          </span>
        )}
      </div>
    </div>
  );
}
