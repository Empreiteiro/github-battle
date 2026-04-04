import type { Context } from '@netlify/functions';

// Generates a dynamic SVG-based OG image for social media previews
export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);
  const title = url.searchParams.get('title') || 'GitHub Battle';
  const status = url.searchParams.get('status') || '';
  const avatars = [
    url.searchParams.get('a0'),
    url.searchParams.get('a1'),
    url.searchParams.get('a2'),
    url.searchParams.get('a3'),
  ].filter(Boolean) as string[];

  // Generate avatar circles as embedded images
  const avatarSvg = avatars
    .map((avatarUrl, i) => {
      const x = 200 + i * 90;
      return `
        <clipPath id="clip${i}"><circle cx="${x}" cy="260" r="35"/></clipPath>
        <image href="${avatarUrl}" x="${x - 35}" y="225" width="70" height="70" clip-path="url(#clip${i})"/>
        <circle cx="${x}" cy="260" r="35" fill="none" stroke="#30363d" stroke-width="3"/>
      `;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d1117"/>
        <stop offset="100%" stop-color="#161b22"/>
      </linearGradient>
      ${avatars.map((_, i) => `<clipPath id="clip${i}"><circle cx="${200 + i * 90}" cy="260" r="35"/></clipPath>`).join('')}
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>

    <!-- Border -->
    <rect x="20" y="20" width="1160" height="590" rx="12" fill="none" stroke="#30363d" stroke-width="2"/>

    <!-- Territory grid decoration -->
    ${generateMiniGrid()}

    <!-- Title -->
    <text x="600" y="140" text-anchor="middle" font-family="monospace" font-size="42" font-weight="bold" fill="#39d353">
      ${escapeXml(truncate(title, 30))}
    </text>

    <!-- Swords emoji -->
    <text x="600" y="80" text-anchor="middle" font-size="40">&#9876;&#65039;</text>

    <!-- Avatars -->
    ${avatarSvg}

    <!-- Status -->
    <text x="600" y="350" text-anchor="middle" font-family="monospace" font-size="22" fill="#8b949e">
      ${escapeXml(truncate(status, 60))}
    </text>

    <!-- Branding -->
    <text x="600" y="560" text-anchor="middle" font-family="monospace" font-size="18" fill="#484f58">
      GitHub Battle Arena
    </text>
    <text x="600" y="590" text-anchor="middle" font-family="monospace" font-size="14" fill="#30363d">
      gitbattle.pro
    </text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function generateMiniGrid(): string {
  const colors = ['#39d353', '#58a6ff', '#bc8cff', '#f85149'];
  const cells: string[] = [];
  const startX = 100;
  const startY = 400;
  const size = 14;
  const gap = 3;
  const cols = 60;
  const rows = 5;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = startX + col * (size + gap);
      const y = startY + row * (size + gap);
      // Deterministic pseudo-random color
      const hash = (col * 374761393 + row * 668265263) >>> 0;
      const colorIdx = hash % (colors.length + 2); // +2 for neutral cells
      const color = colorIdx < colors.length
        ? colors[colorIdx]
        : '#21262d';
      const opacity = colorIdx < colors.length
        ? [0.3, 0.5, 0.7, 1.0][(hash >> 8) % 4]
        : 0.5;
      cells.push(`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${color}" opacity="${opacity}"/>`);
    }
  }

  return cells.join('\n    ');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}
