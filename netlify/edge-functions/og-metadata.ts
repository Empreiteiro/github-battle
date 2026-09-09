// Edge Function that injects dynamic OG meta tags for battle pages
// Runs on /battle/* routes — bots get enriched HTML, browsers get the SPA
//
// The rendering itself lives in server/og.ts so that this and the Node server
// in server/index.ts cannot drift apart.

import type { Context } from "https://edge.netlify.com";
import {
  BOT_UA,
  battleIdFromPath,
  renderBattleOgHtml,
  type OgBattle,
} from "../../server/og.ts";

export default async function handler(request: Request, context: Context) {
  const ua = request.headers.get("user-agent") || "";

  // Let browsers through to the SPA
  if (!BOT_UA.test(ua)) {
    return context.next();
  }

  const url = new URL(request.url);
  const battleId = battleIdFromPath(url.pathname);
  if (!battleId) return context.next();

  // Fetch battle data from our own API
  try {
    const apiUrl = new URL(`/api/battles-get?id=${encodeURIComponent(battleId)}`, url.origin);
    const res = await fetch(apiUrl.toString());
    if (!res.ok) return context.next();

    const battle = (await res.json()) as OgBattle;

    return new Response(renderBattleOgHtml(battle, url), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return context.next();
  }
}

export const config = {
  path: "/battle/*",
};
