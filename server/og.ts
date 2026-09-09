// Shared OG-metadata rendering for /battle/* pages.
//
// Bots get enriched HTML with Open Graph tags; browsers get the SPA. This module
// holds the parts that are runtime-agnostic so both entry points can use it: the
// Node server in server/index.ts and the Netlify Edge Function in
// netlify/edge-functions/og-metadata.ts. Keep it free of Node and Deno imports.

export const BOT_UA =
  /bot|crawl|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegram|discord|preview/i;

export interface OgParticipant {
  username: string;
  avatarUrl: string;
  score: number;
}

export interface OgBattle {
  name: string;
  status?: string;
  participants?: OgParticipant[];
}

/** Battle id from a /battle/<id> pathname, or null when the path is not one. */
export function battleIdFromPath(pathname: string): string | null {
  return pathname.match(/^\/battle\/([^/]+)/)?.[1] ?? null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBattleOgHtml(battle: OgBattle, url: URL): string {
  const participants = battle.participants || [];
  const names = participants.map((p) => p.username).join(" vs ");
  const leader = [...participants].sort((a, b) => b.score - a.score)[0];
  const statusText =
    battle.status === "finished"
      ? `Winner: ${leader?.username} (${leader?.score} pts)`
      : battle.status === "waiting"
        ? `${participants[0]?.username} is looking for a challenger!`
        : `${participants.length} fighters competing — ${names}`;

  const title = `${battle.name} — GitHub Battle`;
  const description = statusText;
  const siteUrl = url.href;

  const avatarParams = participants
    .slice(0, 4)
    .map((p, i) => `a${i}=${encodeURIComponent(p.avatarUrl)}`)
    .join("&");
  const ogImage = `${url.origin}/api/og-image?title=${encodeURIComponent(battle.name)}&status=${encodeURIComponent(statusText)}&${avatarParams}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(siteUrl)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:site_name" content="GitHub Battle Arena">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
</head>
<body>
  <h1>${escapeHtml(battle.name)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(siteUrl)}">View battle</a></p>
</body>
</html>`;
}
