// PostgreSQL-backed replacement for @netlify/blobs.
//
// Netlify Blobs only exists inside Netlify's runtime. The three store modules
// under netlify/functions use four of its methods against JSON values, so this
// exposes the same surface over a single Postgres table and nothing more:
//
//   list()                     -> { blobs: [{ key }] }
//   get(key, { type: 'json' }) -> parsed value, or null when absent
//   setJSON(key, value)        -> upsert
//   delete(key)                -> remove
//
// Each named store is one value of the `store` column, so the three logical
// stores share the table and stay isolated by primary key.

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. The blob store needs PostgreSQL; on Railway, " +
      "reference the Postgres service (e.g. ${{Postgres.DATABASE_URL}}).",
  );
}

// Railway's managed Postgres presents a certificate the default trust store
// does not carry, so verification is disabled for it specifically. A provider
// whose chain does validate can drop this by setting PGSSLMODE=verify-full.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /\bsslmode=disable\b/.test(DATABASE_URL)
    ? false
    : { rejectUnauthorized: false },
});

const TABLE = "blob_store";

let ready: Promise<void> | null = null;

/** Create the table once per process, on the first store operation. */
function ensureTable(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
         store      TEXT        NOT NULL,
         key        TEXT        NOT NULL,
         value      JSONB       NOT NULL,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         PRIMARY KEY (store, key)
       )`,
    )
    .then(() => undefined);
  return ready;
}

export interface BlobListResult {
  blobs: { key: string }[];
}

export interface BlobStore {
  list(): Promise<BlobListResult>;
  get(key: string, options?: { type?: "json" }): Promise<unknown>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Drop-in stand-in for @netlify/blobs' getStore. `consistency` is accepted and
 * ignored: reads here are always strongly consistent.
 */
export function getStore(
  options: { name: string; consistency?: "strong" | "eventual" } | string,
): BlobStore {
  const name = typeof options === "string" ? options : options.name;

  return {
    async list() {
      await ensureTable();
      const res = await pool.query<{ key: string }>(
        `SELECT key FROM ${TABLE} WHERE store = $1 ORDER BY key`,
        [name],
      );
      return { blobs: res.rows.map((r) => ({ key: r.key })) };
    },

    async get(key) {
      await ensureTable();
      const res = await pool.query<{ value: unknown }>(
        `SELECT value FROM ${TABLE} WHERE store = $1 AND key = $2`,
        [name, key],
      );
      // Netlify Blobs returns null for a missing key rather than throwing.
      return res.rows.length ? res.rows[0].value : null;
    },

    async setJSON(key, value) {
      await ensureTable();
      await pool.query(
        `INSERT INTO ${TABLE} (store, key, value) VALUES ($1, $2, $3)
         ON CONFLICT (store, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [name, key, JSON.stringify(value)],
      );
    },

    async delete(key) {
      await ensureTable();
      await pool.query(`DELETE FROM ${TABLE} WHERE store = $1 AND key = $2`, [
        name,
        key,
      ]);
    },
  };
}
