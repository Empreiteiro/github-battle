// Edge Function that injects dynamic OG meta tags for battle pages
// Runs on /battle/* routes — bots get enriched HTML, browsers get the SPA

import type { Context } from "https://edge.netlify.com";

const BOT_UA = /bot|crawl|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegram|discord|preview/i;

export default async function handler(request: Request, context: Context) {
  const ua = request.headers.get("user-agent") || "";

  // Let browsers through to the SPA
  if (!BOT_UA.test(ua)) {
    return context.next();
  }

  // Extract battle ID from URL
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/battle\/([^/]+)/);
  if (!match) return context.next();

  const battleId = match[1];

  // Fetch battle data from our own API
  try {
    const apiUrl = new URL(`/api/battles-get?id=${battleId}`, url.origin);
    const res = await fetch(apiUrl.toString());
    if (!res.ok) return context.next();

    const battle = await res.json();

    const participants = battle.participants || [];
    const names = participants.map((p: { username: string }) => p.username).join(" vs ");
    const leader = [...participants].sort((a: { score: number }, b: { score: number }) => b.score - a.score)[0];
    const statusText = battle.status === "finished"
      ? `Winner: ${leader?.username} (${leader?.score} pts)`
      : battle.status === "waiting"
        ? `${participants[0]?.username} is looking for a challenger!`
        : `${participants.length} fighters competing — ${names}`;

    const title = `${battle.name} — GitHub Battle`;
    const description = statusText;
    const siteUrl = url.href;

    // Build OG image URL using participant avatars
    const avatarParams = participants
      .slice(0, 4)
      .map((p: { avatarUrl: string }, i: number) => `a${i}=${encodeURIComponent(p.avatarUrl)}`)
      .join("&");
    const ogImage = `${url.origin}/api/og-image?title=${encodeURIComponent(battle.name)}&status=${encodeURIComponent(statusText)}&${avatarParams}`;

    // Return enriched HTML for bots
    const html = `<!DOCTYPE html>
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

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return context.next();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const config = {
  path: "/battle/*",
};
