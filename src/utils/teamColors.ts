import type { TeamColor } from '../types';

// Static Tailwind class strings per team color.
// Tailwind v4 scans source files at build time — dynamic template strings like
// `text-accent-${color}` are NOT picked up, so we keep every variant spelled out
// here. Extend this map when adding a new team color.

export interface TeamColorClasses {
  text: string;          // solid accent text color
  softBg: string;        // 25% translucent accent background
  softBgHover: string;
  border: string;        // 60% translucent accent border
  softBorder: string;    // 40% translucent accent border
  barBg: string;         // progress bar fill
  dot: string;           // solid dot background (for status indicator)
}

const CLASSES: Record<TeamColor, TeamColorClasses> = {
  green: {
    text: 'text-accent-green',
    softBg: 'bg-accent-green/25',
    softBgHover: 'hover:bg-accent-green/30',
    border: 'border-accent-green/60',
    softBorder: 'border-accent-green/40',
    barBg: 'bg-accent-green',
    dot: 'bg-accent-green',
  },
  blue: {
    text: 'text-accent-blue',
    softBg: 'bg-accent-blue/25',
    softBgHover: 'hover:bg-accent-blue/30',
    border: 'border-accent-blue/60',
    softBorder: 'border-accent-blue/40',
    barBg: 'bg-accent-blue',
    dot: 'bg-accent-blue',
  },
  purple: {
    text: 'text-accent-purple',
    softBg: 'bg-accent-purple/25',
    softBgHover: 'hover:bg-accent-purple/30',
    border: 'border-accent-purple/60',
    softBorder: 'border-accent-purple/40',
    barBg: 'bg-accent-purple',
    dot: 'bg-accent-purple',
  },
  orange: {
    text: 'text-accent-orange',
    softBg: 'bg-accent-orange/25',
    softBgHover: 'hover:bg-accent-orange/30',
    border: 'border-accent-orange/60',
    softBorder: 'border-accent-orange/40',
    barBg: 'bg-accent-orange',
    dot: 'bg-accent-orange',
  },
  red: {
    text: 'text-accent-red',
    softBg: 'bg-accent-red/25',
    softBgHover: 'hover:bg-accent-red/30',
    border: 'border-accent-red/60',
    softBorder: 'border-accent-red/40',
    barBg: 'bg-accent-red',
    dot: 'bg-accent-red',
  },
  yellow: {
    text: 'text-accent-yellow',
    softBg: 'bg-accent-yellow/25',
    softBgHover: 'hover:bg-accent-yellow/30',
    border: 'border-accent-yellow/60',
    softBorder: 'border-accent-yellow/40',
    barBg: 'bg-accent-yellow',
    dot: 'bg-accent-yellow',
  },
};

export function teamClasses(color: string | undefined): TeamColorClasses {
  return CLASSES[(color as TeamColor) || 'green'] ?? CLASSES.green;
}
