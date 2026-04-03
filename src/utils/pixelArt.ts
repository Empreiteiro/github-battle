// Procedural pixel art character generator based on username hash

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// 8x12 base character template (1 = body, 2 = detail, 3 = eye, 0 = empty)
// Only left half - we mirror it for symmetry
const CHARACTER_TEMPLATE_LEFT = [
  [0, 0, 1, 1],
  [0, 1, 1, 1],
  [0, 1, 3, 1],
  [0, 1, 1, 1],
  [0, 0, 1, 1],
  [0, 2, 2, 2],
  [0, 1, 2, 1],
  [0, 1, 2, 1],
  [0, 1, 1, 1],
  [0, 1, 0, 1],
  [0, 1, 0, 1],
  [0, 2, 0, 2],
];

export interface CharacterColors {
  body: [number, number, number];
  detail: [number, number, number];
  eye: [number, number, number];
  outline: [number, number, number];
}

export function getCharacterColors(username: string): CharacterColors {
  const hash = hashString(username);
  const hue = hash % 360;
  const body = hslToRgb(hue, 70, 55);
  const detail = hslToRgb((hue + 30) % 360, 80, 45);
  const eye = [255, 255, 255] as [number, number, number];
  const outline = hslToRgb(hue, 50, 20);
  return { body, detail, eye, outline };
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  username: string,
  flipped: boolean = false,
  flashWhite: boolean = false,
) {
  const colors = getCharacterColors(username);
  const pixelSize = scale;
  const template = CHARACTER_TEMPLATE_LEFT;
  const width = 8;

  for (let row = 0; row < template.length; row++) {
    for (let col = 0; col < width; col++) {
      const halfCol = col < 4 ? col : 7 - col; // mirror
      const cellType = template[row][halfCol];
      if (cellType === 0) continue;

      let color: [number, number, number];
      if (flashWhite) {
        color = [255, 255, 255];
      } else if (cellType === 1) {
        color = colors.body;
      } else if (cellType === 2) {
        color = colors.detail;
      } else {
        color = colors.eye;
      }

      const drawCol = flipped ? (width - 1 - col) : col;
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.fillRect(x + drawCol * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
    }
  }

  // Draw outline
  if (!flashWhite) {
    ctx.strokeStyle = `rgb(${colors.outline[0]}, ${colors.outline[1]}, ${colors.outline[2]})`;
    ctx.lineWidth = 1;
    for (let row = 0; row < template.length; row++) {
      for (let col = 0; col < width; col++) {
        const halfCol = col < 4 ? col : 7 - col;
        const cellType = template[row][halfCol];
        if (cellType === 0) continue;

        const drawCol = flipped ? (width - 1 - col) : col;
        const px = x + drawCol * pixelSize;
        const py = y + row * pixelSize;

        // Check neighbors and draw border where empty
        const checkEmpty = (r: number, c: number) => {
          if (r < 0 || r >= template.length || c < 0 || c >= width) return true;
          const hc = c < 4 ? c : 7 - c;
          return template[r][hc] === 0;
        };

        if (checkEmpty(row - 1, col)) ctx.fillRect(px, py, pixelSize, 1);
        if (checkEmpty(row + 1, col)) ctx.fillRect(px, py + pixelSize - 1, pixelSize, 1);
        if (checkEmpty(row, col - 1)) ctx.fillRect(px, py, 1, pixelSize);
        if (checkEmpty(row, col + 1)) ctx.fillRect(px + pixelSize - 1, py, 1, pixelSize);
      }
    }
  }
}

// Fixed palette of 10 high-contrast colors for territory
const TERRITORY_PALETTE = [
  '#39d353', // green
  '#58a6ff', // blue
  '#bc8cff', // purple
  '#f85149', // red
  '#d29922', // orange
  '#e3b341', // yellow
  '#3fb950', // lime
  '#79c0ff', // light blue
  '#d2a8ff', // lavender
  '#ff7b72', // salmon
];

export function getParticipantColor(index: number): string {
  return TERRITORY_PALETTE[index % TERRITORY_PALETTE.length];
}

// Returns 4 intensity levels for a base hex color (like GitHub's contribution levels)
export function getIntensityLevels(hex: string): string[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [
    `rgba(${r}, ${g}, ${b}, 0.25)`,
    `rgba(${r}, ${g}, ${b}, 0.50)`,
    `rgba(${r}, ${g}, ${b}, 0.75)`,
    `rgba(${r}, ${g}, ${b}, 1.00)`,
  ];
}

export const NEUTRAL_CELL = '#161b22';
export const CELL_BORDER = '#0d1117';

export function drawArenaBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Dark ground
  const groundY = height * 0.7;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#0d1117');
  skyGrad.addColorStop(1, '#161b22');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, groundY);

  // Stars
  const seed = 42;
  for (let i = 0; i < 30; i++) {
    const sx = ((seed * (i + 1) * 7) % width);
    const sy = ((seed * (i + 1) * 13) % (groundY * 0.8));
    const brightness = 100 + ((i * 37) % 155);
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness + 50}, 0.8)`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
  groundGrad.addColorStop(0, '#21262d');
  groundGrad.addColorStop(1, '#0d1117');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, width, height - groundY);

  // Ground line
  ctx.fillStyle = '#30363d';
  ctx.fillRect(0, groundY, width, 2);

  // Grid lines on ground
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const gy = groundY + (height - groundY) * (i / 10);
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }
}
