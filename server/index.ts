// HTTP server that replaces the Netlify runtime.
//
// It reproduces exactly what netlify.toml declared:
//
//   /api/*    -> the handler in netlify/functions/<name>
//   /battle/* -> OG metadata for bots, SPA for browsers (the Edge Function)
//   /*        -> dist/index.html (SPA fallback)
//
// The functions already export the Web-standard
// (request: Request) => Promise<Response> shape and none of them touch the
// Netlify `context`, so they are mounted unchanged; this file only adapts
// between node:http and Request/Response.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BOT_UA, battleIdFromPath, renderBattleOgHtml, type OgBattle } from "./og.js";

const PORT = Number(process.env.PORT) || 8080;
const HOST = "0.0.0.0";

// Compiled layout is dist-server/server/index.js, so dist/ is two levels up and
// the functions land beside this file's parent (see tsconfig.server.json).
const DIST_DIR = fileURLToPath(new URL("../../dist/", import.meta.url));
const FUNCTIONS_DIR = new URL("../netlify/functions/", import.meta.url);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

type FunctionHandler = (request: Request, context: unknown) => Promise<Response> | Response;

/**
 * Either the handler, or why there isn't one. "missing" is a 404: no such
 * function, or a module with no default export — the store modules that sit in
 * the same directory are helpers, not endpoints. "broken" is a 500: the module
 * exists but threw while loading, e.g. DATABASE_URL is not set. Collapsing the
 * two would report a configuration error as a missing route.
 */
type HandlerLookup =
  | { kind: "ok"; handler: FunctionHandler }
  | { kind: "missing" }
  | { kind: "broken"; error: unknown };

const handlerCache = new Map<string, HandlerLookup>();

async function loadHandler(name: string): Promise<HandlerLookup> {
  const cached = handlerCache.get(name);
  if (cached) return cached;

  const result = await resolveHandler(name);
  // A broken module is usually broken because of the environment, which can
  // change without a code change, so let the next request try again.
  if (result.kind !== "broken") handlerCache.set(name, result);
  return result;
}

async function resolveHandler(name: string): Promise<HandlerLookup> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return { kind: "missing" };

  try {
    const mod = await import(new URL(`${name}.js`, FUNCTIONS_DIR).href);
    return typeof mod.default === "function"
      ? { kind: "ok", handler: mod.default as FunctionHandler }
      : { kind: "missing" };
  } catch (err) {
    if ((err as { code?: string }).code === "ERR_MODULE_NOT_FOUND") {
      return { kind: "missing" };
    }
    console.error(`[api] function "${name}" failed to load:`, err);
    return { kind: "broken", error: err };
  }
}

/** node:http request -> Web Request. */
async function toWebRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v);
  }

  const method = req.method ?? "GET";
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks);
  }

  return new Request(new URL(req.url ?? "/", origin), {
    method,
    headers,
    // Buffer is a Uint8Array but its TS type does not satisfy BodyInit, so pass
    // a plain view over the same bytes.
    body: body && body.length ? new Uint8Array(body) : undefined,
  });
}

/** Web Response -> node:http response. */
async function sendWebResponse(res: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, key) => {
    headers[key] = key === "set-cookie" ? [value] : value;
  });
  res.writeHead(response.status, headers);
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

/** Resolve a URL path to a file inside dist/, or null. Rejects traversal. */
async function resolveStatic(pathname: string): Promise<string | null> {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  if (relative === ".." || relative.startsWith(`..${sep}`)) return null;

  const candidate = join(DIST_DIR, relative);
  if (!candidate.startsWith(DIST_DIR)) return null;

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
  } catch {
    /* not a file */
  }
  return null;
}

async function sendFile(res: ServerResponse, file: string, status = 200): Promise<void> {
  const body = await readFile(file);
  const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  const immutable = file.includes(`${sep}assets${sep}`);
  res.writeHead(status, {
    "content-type": type,
    "content-length": String(body.byteLength),
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
  });
  res.end(body);
}

/** The Edge Function's job: enriched HTML for bots on /battle/<id>. */
async function tryBattleOg(req: IncomingMessage, url: URL): Promise<Response | null> {
  const ua = req.headers["user-agent"] ?? "";
  if (!BOT_UA.test(Array.isArray(ua) ? ua.join(" ") : ua)) return null;

  const battleId = battleIdFromPath(url.pathname);
  if (!battleId) return null;

  try {
    const lookup = await loadHandler("battles-get");
    if (lookup.kind !== "ok") return null;

    const apiUrl = new URL(`/api/battles-get?id=${encodeURIComponent(battleId)}`, url.origin);
    const apiRes = await lookup.handler(new Request(apiUrl), {});
    if (!apiRes.ok) return null;

    const battle = (await apiRes.json()) as OgBattle;
    return new Response(renderBattleOgHtml(battle, url), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[og] failed to render battle metadata:", err);
    return null;
  }
}

/**
 * The origin as the client sees it. Railway terminates TLS and forwards over
 * plain HTTP, so the scheme has to come from x-forwarded-proto — otherwise the
 * absolute URLs built from it (og:url, og:image) go out as http:// and
 * crawlers reject or downgrade them.
 */
function externalOrigin(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  const scheme = first === "https" || first === "http" ? first : "http";
  return `${scheme}://${req.headers.host ?? `localhost:${PORT}`}`;
}

/**
 * Netlify answered www.gitbattle.pro with a 301 to the apex. Railway serves
 * every custom domain attached to a service without redirecting between them,
 * so both hostnames would answer 200 and the site would exist twice. The
 * canonicalisation has to happen here.
 *
 * Only a host that literally starts with "www." is redirected, which leaves
 * the *.up.railway.app hostname and localhost alone.
 */
function apexRedirect(url: URL): Response | null {
  if (!url.host.startsWith("www.")) return null;

  const target = new URL(url);
  target.host = url.host.slice("www.".length);
  return new Response(null, {
    status: 301,
    headers: { location: target.href, "cache-control": "public, max-age=0, must-revalidate" },
  });
}

const server = createServer(async (req, res) => {
  const origin = externalOrigin(req);
  const url = new URL(req.url ?? "/", origin);

  try {
    const canonical = apexRedirect(url);
    if (canonical) {
      await sendWebResponse(res, canonical);
      return;
    }

    // /api/* -> netlify/functions/*
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice("/api/".length).replace(/\/+$/, "");
      const lookup = await loadHandler(name);

      if (lookup.kind === "missing") {
        res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: `No such function: ${name}` }));
        return;
      }
      if (lookup.kind === "broken") {
        res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            error: `Function "${name}" failed to load`,
            detail: lookup.error instanceof Error ? lookup.error.message : String(lookup.error),
          }),
        );
        return;
      }

      const response = await lookup.handler(await toWebRequest(req, origin), {});
      await sendWebResponse(res, response);
      return;
    }

    // Real file in dist/
    const file = await resolveStatic(url.pathname);
    if (file) {
      await sendFile(res, file);
      return;
    }

    // /battle/* -> OG metadata for bots
    const og = await tryBattleOg(req, url);
    if (og) {
      await sendWebResponse(res, og);
      return;
    }

    // SPA fallback
    await sendFile(res, join(DIST_DIR, "index.html"));
  } catch (err) {
    console.error(`[server] ${req.method} ${req.url} failed:`, err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`github-battle listening on http://${HOST}:${PORT}`);
  console.log(`serving static files from ${DIST_DIR}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
