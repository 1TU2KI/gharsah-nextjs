import { neon } from "@neondatabase/serverless";
import { runSeed } from "./seed";
import { backfillCampaignShortCodes } from "./shortCode";

/**
 * Persistence for the whole admin system (campaigns, requests, messages,
 * activity log, settings, admin accounts) — Neon Postgres via
 * `@neondatabase/serverless`'s HTTP-based `neon()` driver.
 *
 * This used to be a local SQLite file (`node:sqlite`, see git history) —
 * that broke in production because Vercel's serverless filesystem is
 * read-only/ephemeral (`ENOENT: no such file or directory, mkdir
 * '/var/task/.../data'` the moment anything imported this module). Neon's
 * HTTP driver needs no persistent TCP connection and no local disk, which is
 * exactly what a serverless function needs: every query is a plain `fetch`.
 *
 * `DATABASE_URL` (a Postgres connection string, e.g. from a Vercel Neon
 * integration) is the only required environment variable for this file.
 *
 * Every SQL string throughout this `db/` folder was written for SQLite and
 * still uses its `?`-style placeholders unchanged — `toPgPlaceholders`
 * below is the one place that adapts them to Postgres's `$1, $2, ...` for
 * the driver. This keeps the migration a mechanical call-site change
 * (`db.prepare(sql).run(...)` -> `await run(sql, [...])`) rather than a
 * rewrite of every query.
 */
const DATABASE_URL = process.env.DATABASE_URL;

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export type RawQuery = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

function toPgPlaceholders(text: string): string {
  let n = 0;
  return text.replace(/\?/g, () => `$${++n}`);
}

/**
 * Ungated — talks to Postgres directly, without waiting on
 * `ensureInitialized()`. Used only by `initialize()` itself (schema
 * creation, column migration, seeding) and internally by the gated
 * `all`/`get`/`run` below. Repo files must never import this directly: if
 * `initialize()` (which runs seeding) called through the gated wrappers, it
 * would await the very initialization promise it's in the middle of
 * building, deadlocking forever.
 */
const rawQuery: RawQuery = async (text, params = []) => {
  if (!sql) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres connection string (e.g. from a Vercel Neon integration) to the environment.",
    );
  }
  const rows = await sql.query(toPgPlaceholders(text), params as unknown[]);
  return rows as Record<string, unknown>[] as never;
};

// campaigns: completed_at is set the moment status actually transitions TO
// 'completed', cleared if it later moves away from it — deliberately NOT
// updated_at (which changes on every unrelated edit) so "completion
// activity over time" on the Statistics page is a real, honestly-tracked
// event, not a proxy. Seeded campaigns that started out already completed
// have no true historical date, so this stays NULL for them rather than
// guessing one.
//
// Admins only ever enter Arabic; *_en columns are AI-generated from it (see
// app/lib/translate.ts). translation_status 'ok' = every *_en column
// matches the current *_ar content; 'error' = the last translate attempt
// failed and at least one *_en column may be stale or missing — surfaced in
// the admin UI with a retry action, never hidden.
//
// description_source/title_source record how description_ar/title_ar got
// their current value: 'fetched' = pulled from the official platform page
// (Ehsan only, see app/lib/admin/fetchOfficialCampaignContent.ts) and not
// since hand-edited; 'manual' = the admin typed/edited it directly, or the
// platform has no extractor. Purely informational — never affects what the
// public site renders.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    order_index INTEGER NOT NULL,
    url TEXT NOT NULL,
    platform TEXT NOT NULL,
    memorial_prefix_ar TEXT,
    memorial_prefix_en TEXT,
    username TEXT,
    relation_ar TEXT NOT NULL,
    relation_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active','completed','closed')),
    description_ar TEXT,
    description_en TEXT NOT NULL,
    percent INTEGER,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    translation_status TEXT NOT NULL DEFAULT 'ok' CHECK (translation_status IN ('ok','error')),
    translation_error TEXT,
    description_source TEXT CHECK (description_source IN ('fetched','manual')),
    title_source TEXT CHECK (title_source IN ('fetched','manual')),
    -- Compact public redirect code for /c/<code> (see app/c/[code]/route.ts
    -- and app/lib/db/shortCode.ts) — auto-generated on create, admin can
    -- regenerate or replace with a custom alias from the edit page. Never
    -- reused for ordering/status; persists independently of both.
    short_code TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_order ON campaigns (order_index)`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status)`,
  `CREATE TABLE IF NOT EXISTS campaign_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT,
    relationship_type TEXT,
    campaign_url TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','under_review','accepted','rejected','completed')),
    admin_notes TEXT,
    converted_campaign_id TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_requests_status ON campaign_requests (status)`,
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    admin_notes TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_read ON contact_messages (is_read)`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    target_label TEXT,
    admin_username TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // Real, first-party analytics for the PUBLIC site only (see
  // app/lib/analytics/ — never written to from admin-side code). One row per
  // tracked interaction; the admin Statistics page aggregates this table on
  // read rather than maintaining separate rollup tables, since this
  // project's traffic scale doesn't need pre-aggregation. visitor_id/
  // session_id are two anonymous, non-identifying random UUIDs, both
  // cookie-based (see app/lib/analytics/trackAction.ts): visitor_id is
  // long-lived (~400 days, "unique visitors"), session_id is a 30-minute
  // sliding window ("visits"). Neither is derived from IP, device
  // fingerprint, or any personal data. referrer_source is a bucketed label
  // (e.g. "google", "instagram", "direct"), never the raw referrer URL.
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    campaign_id TEXT,
    route TEXT,
    visitor_id TEXT,
    session_id TEXT,
    referrer_source TEXT,
    device_category TEXT,
    browser TEXT,
    os TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign ON analytics_events (campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events (visitor_id)`,
];

/**
 * `CREATE TABLE IF NOT EXISTS` is a no-op against a database that already
 * exists from a previous deploy — it does NOT retroactively add columns a
 * later schema change introduced. Postgres supports `ADD COLUMN IF NOT
 * EXISTS` natively, so (unlike the old SQLite version) this needs no
 * `information_schema` probing first. Existing rows predate these columns
 * and were all hand-authored, not fetched — 'manual' is the accurate
 * default for description_source/title_source, not a guess.
 */
const CAMPAIGN_COLUMN_MIGRATIONS = [
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS translation_status TEXT NOT NULL DEFAULT 'ok'`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS translation_error TEXT`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS description_source TEXT DEFAULT 'manual'`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title_source TEXT DEFAULT 'manual'`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS short_code TEXT`,
  // Safe to create while existing rows are still NULL — Postgres allows any
  // number of NULLs in a unique index; `backfillCampaignShortCodes` (run
  // right after seeding, below) is what actually fills them in, at which
  // point this index starts enforcing real uniqueness.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_short_code ON campaigns (short_code)`,
];

async function initialize(): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await rawQuery(statement);
  }
  for (const statement of CAMPAIGN_COLUMN_MIGRATIONS) {
    await rawQuery(statement);
  }
  // Seeds the 22 original campaigns only if the table is empty, and
  // bootstraps the first admin from ADMIN_USERNAME/ADMIN_PASSWORD only if
  // no admin exists yet — see seed.ts. Never touches a non-empty table, so
  // redeploys never reset production data or the admin password.
  await runSeed(rawQuery);
  // Catches both rows that predate this feature and rows `runSeed` just
  // inserted (its INSERT doesn't set a short_code itself) — see shortCode.ts.
  await backfillCampaignShortCodes(rawQuery);
}

// Cached on `globalThis` (not a module-level `let`) so Next.js dev-mode hot
// reloads and repeated warm invocations of the same serverless instance
// reuse one in-flight/completed initialization instead of re-running
// schema+migration+seed on every request. Cached in every environment
// (unlike the old SQLite version's dev-only cache) — that guard existed to
// avoid leaking file handles, which doesn't apply to a stateless HTTP
// driver; here the goal is simply "run this once per warm instance."
declare global {
  var __gharsahDbInit: Promise<void> | undefined;
}

function ensureInitialized(): Promise<void> {
  if (!globalThis.__gharsahDbInit) {
    globalThis.__gharsahDbInit = initialize().catch((err) => {
      // Don't cache a permanent failure — a transient cold-start/network
      // blip talking to Neon shouldn't brick every request for the rest of
      // this instance's lifetime; the next call gets to retry.
      globalThis.__gharsahDbInit = undefined;
      throw err;
    });
  }
  return globalThis.__gharsahDbInit;
}

/** Gated: every call waits for schema+migration+seed to be ready first. This is what every repo file (`admins.ts`, `campaignsRepo.ts`, etc.) should use — never `rawQuery` directly. */
export async function all<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureInitialized();
  return rawQuery<T>(text, params);
}

export async function get<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await all<T>(text, params);
  return rows[0];
}

export async function run(text: string, params: unknown[] = []): Promise<void> {
  await ensureInitialized();
  await rawQuery(text, params);
}
