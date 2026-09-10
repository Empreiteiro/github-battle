// Move the contents of the Netlify Blobs stores into the Postgres store that
// server/blobs.ts reads.
//
// The two halves run in different places, so they are separate subcommands:
//
//   export  needs the Netlify CLI and access to the site; writes <dir>/<store>/<key>.json
//   import  needs DATABASE_URL pointing at a reachable Postgres; upserts what export wrote
//
//   node dist-server/scripts/blobs-transfer.js export --dir ./blobs-dump
//   node dist-server/scripts/blobs-transfer.js import --dir ./blobs-dump --dry-run
//   node dist-server/scripts/blobs-transfer.js import --dir ./blobs-dump
//
// The import writes through getStore().setJSON, the same path the running app
// uses, so there is no second serialisation to drift from it.

import { execFile } from "node:child_process";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// server/blobs.js is loaded lazily, inside the import path only: it demands
// DATABASE_URL at module load, and `export` and `readDump` have no business
// needing a database.

const run = promisify(execFile);

/** The stores the app actually uses — see the three modules in netlify/functions. */
const STORES = ["battles", "leaderboard", "tournaments"] as const;

export interface DumpEntry {
  store: string;
  key: string;
  value: unknown;
}

// ---------------------------------------------------------------------------
// export
// ---------------------------------------------------------------------------

/** Keys in a store, tolerating both list shapes the CLI has used. */
function keysFromListJson(raw: string): string[] {
  const parsed: unknown = JSON.parse(raw);
  const blobs = Array.isArray(parsed)
    ? parsed
    : ((parsed as { blobs?: unknown }).blobs ?? []);
  if (!Array.isArray(blobs)) return [];
  return blobs
    .map((b) => (typeof b === "string" ? b : (b as { key?: unknown }).key))
    .filter((k): k is string => typeof k === "string" && k.length > 0);
}

async function exportStores(dir: string): Promise<void> {
  for (const store of STORES) {
    const outDir = join(dir, store);
    await mkdir(outDir, { recursive: true });

    let keys: string[];
    try {
      const { stdout } = await run("npx", ["netlify", "blobs:list", store, "--json"]);
      keys = keysFromListJson(stdout);
    } catch (err) {
      console.error(`[export] could not list "${store}": ${describe(err)}`);
      continue;
    }

    console.log(`[export] ${store}: ${keys.length} key(s)`);
    for (const key of keys) {
      const file = join(outDir, `${encodeURIComponent(key)}.json`);
      try {
        await run("npx", ["netlify", "blobs:get", store, key, "--output", file]);
      } catch (err) {
        console.error(`[export] ${store}/${key} failed: ${describe(err)}`);
      }
    }
  }
  console.log(`[export] done -> ${dir}`);
}

// ---------------------------------------------------------------------------
// import
// ---------------------------------------------------------------------------

/**
 * Read a dump directory into entries. Kept free of database access so it can be
 * exercised against a fixture directory on its own.
 */
export async function readDump(dir: string): Promise<DumpEntry[]> {
  const entries: DumpEntry[] = [];

  const stores = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const store of stores) {
    const files = (await readdir(join(dir, store), { withFileTypes: true }))
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name)
      .sort();

    for (const file of files) {
      const path = join(dir, store, file);
      const text = await readFile(path, "utf8");
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch (err) {
        throw new Error(`${path} is not valid JSON: ${describe(err)}`);
      }
      // export encodes the key so it is a safe filename; undo that here.
      entries.push({ store, key: decodeURIComponent(file.slice(0, -".json".length)), value });
    }
  }

  return entries;
}

async function importDump(dir: string, dryRun: boolean): Promise<void> {
  const entries = await readDump(dir);
  if (!entries.length) {
    console.log(`[import] nothing to do: no <store>/<key>.json under ${dir}`);
    return;
  }

  const perStore = new Map<string, number>();
  for (const e of entries) perStore.set(e.store, (perStore.get(e.store) ?? 0) + 1);
  for (const [store, n] of [...perStore].sort()) console.log(`[import] ${store}: ${n} key(s)`);

  if (dryRun) {
    console.log(`[import] --dry-run: ${entries.length} key(s) would be written, nothing sent`);
    return;
  }

  const { getStore } = await import("../server/blobs.js");

  let written = 0;
  for (const { store, key, value } of entries) {
    await getStore({ name: store }).setJSON(key, value);
    written += 1;
  }
  console.log(`[import] wrote ${written} of ${entries.length} key(s)`);
  if (written !== entries.length) process.exitCode = 1;
}

// ---------------------------------------------------------------------------

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const dir = flagValue(argv, "--dir");

  if ((command !== "export" && command !== "import") || !dir) {
    console.error(
      "usage:\n" +
        "  blobs-transfer export --dir <path>              (needs the Netlify CLI)\n" +
        "  blobs-transfer import --dir <path> [--dry-run]  (needs DATABASE_URL)",
    );
    process.exitCode = 2;
    return;
  }

  if (command === "export") {
    await exportStores(dir);
    return;
  }
  await importDump(dir, argv.includes("--dry-run"));
}

// Only run when invoked directly, so readDump can be imported and exercised
// without the CLI taking over the process.
const invokedDirectly =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    () => process.exit(process.exitCode ?? 0),
    (err) => {
      console.error(`[blobs-transfer] ${describe(err)}`);
      process.exit(1);
    },
  );
}
