import { useState } from 'react';
import type { Participant, HeatmapData } from '../types';
import { getParticipantColor, getIntensityLevels } from '../utils/pixelArt';

interface Props {
  participants: Participant[];
  participantIndices: Map<string, number>; // username -> original index for color
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getMaxValue(heatmap: HeatmapData): number {
  let max = 0;
  for (const row of heatmap) {
    for (const val of row) {
      if (val > max) max = val;
    }
  }
  return max;
}

function emptyHeatmap(): HeatmapData {
  return Array.from({ length: 7 }, () => Array(24).fill(0));
}

function mergeHeatmaps(participants: Participant[]): HeatmapData {
  const merged = emptyHeatmap();
  for (const p of participants) {
    if (!p.heatmap) continue;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        merged[d][h] += p.heatmap[d]?.[h] || 0;
      }
    }
  }
  return merged;
}

export default function ActivityHeatmap({ participants, participantIndices }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | 'all'>('all');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const hasAnyData = participants.some(p => p.heatmap && getMaxValue(p.heatmap) > 0);
  if (!hasAnyData) return null;

  const currentHeatmap = selectedPlayer === 'all'
    ? mergeHeatmaps(participants)
    : participants.find(p => p.username === selectedPlayer)?.heatmap || emptyHeatmap();

  const maxVal = getMaxValue(currentHeatmap);
  const colorIdx = selectedPlayer === 'all' ? 0 : (participantIndices.get(selectedPlayer) ?? 0);
  const baseColor = getParticipantColor(colorIdx);
  const levels = getIntensityLevels(baseColor);

  function getCellColor(value: number): string {
    if (value === 0 || maxVal === 0) return '#161b22';
    const ratio = value / maxVal;
    if (ratio <= 0.25) return levels[0];
    if (ratio <= 0.5) return levels[1];
    if (ratio <= 0.75) return levels[2];
    return levels[3];
  }

  function formatHour(h: number): string {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
  }

  return (
    <div className="pixel-border bg-dark-card p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="pixel-font text-[10px] text-accent-orange">
          &#128293; ACTIVITY HEATMAP
        </h3>
        {/* Player selector */}
        <select
          value={selectedPlayer}
          onChange={e => setSelectedPlayer(e.target.value)}
          className="bg-dark-bg border border-dark-border text-dark-text text-xs px-2 py-1 rounded outline-none focus:border-accent-blue cursor-pointer"
        >
          <option value="all">All players</option>
          {participants.map(p => (
            <option key={p.username} value={p.username}>{p.username}</option>
          ))}
        </select>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto relative" onMouseLeave={() => setTooltip(null)}>
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex ml-10">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[8px] text-dark-muted">
                {h % 3 === 0 ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((dayLabel, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1 mb-[2px]">
              <span className="w-9 text-[9px] text-dark-muted text-right flex-shrink-0">{dayLabel}</span>
              <div className="flex flex-1 gap-[2px]">
                {HOURS.map(h => {
                  const value = currentHeatmap[dayIdx]?.[h] || 0;
                  return (
                    <div
                      key={h}
                      className="flex-1 aspect-square rounded-[2px] cursor-pointer transition-transform hover:scale-125 hover:z-10 relative"
                      style={{ backgroundColor: getCellColor(value), minWidth: '8px', minHeight: '8px' }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parent = e.currentTarget.closest('.overflow-x-auto')?.getBoundingClientRect();
                        if (parent) {
                          setTooltip({
                            text: `${dayLabel} ${formatHour(h)}: ${value} event${value !== 1 ? 's' : ''}`,
                            x: rect.left - parent.left + rect.width / 2,
                            y: rect.top - parent.top - 4,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none pixel-font text-[8px] bg-dark-bg/95 text-dark-text border border-dark-border px-2 py-1 rounded whitespace-nowrap z-20"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3 text-[8px] text-dark-muted">
        <span>Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: '#161b22' }} />
        {levels.map((lv, i) => (
          <div key={i} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: lv }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
