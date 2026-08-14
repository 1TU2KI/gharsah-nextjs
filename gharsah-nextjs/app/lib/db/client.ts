import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { runSeed } from "./seed";

/**
 * Persistence for the whole admin system (campaigns, requests, messages,
 * activity log, settings, admin accounts) — SQLite via Node's built-in
 * `node:sqlite` (stable enough on the Node version this project runs on;
 * verified directly before choosing it). Deliberately NOT a static file or
 * localStorage: every admin mutation must actually persist and immediately
 * affect the public site, which a file constant or browser storage can't do
 * from server components/actions.
 *
 * Chosen over better-sqlite3/Prisma specifically to avoid native-module
 * compilation (no build toolchain assumptions on the host) and Prisma's
 * engine-download step — `node:sqlite` ships with Node itself, so
 * `npm install` alone is enough to run this project.
 *
 * Deployment note (see CLAUDE.md's own "Persistent data store" deferred item):
 * this is a single on-disk file (`data/gharsah.db` by default, overridable
 * via DATABASE_PATH). That's correct for local dev and any traditional
 * always-on Node host, but Vercel's serverless filesystem is ephemeral — a
 * production deploy there needs this file on a persistent volume, or the
 * `db` export below swapped for a hosted SQLite-compatible service (e.g.
 * Turso/libSQL, which speaks the same SQL). The repository modules in this
 * folder are the only code that imports `db` directly, so that swap stays
 * localized to this one file.
 */
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "gharsah.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
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
  -- Set the moment status actually transitions TO 'completed', cleared if it
  -- later moves away from it -- deliberately NOT updated_at (which changes
  -- on every unrelated edit) so "completion activity over time" on the
  -- Statistics page is a real, honestly-tracked event, not a proxy. Seeded
  -- campaigns that started out already completed have no true historical
  -- date, so this stays NULL for them rather than guessing one.
  completed_at TEXT,
  -- Admins only ever enter Arabic; *_en columns above are AI-generated from
  -- it (see app/lib/translate.ts). 'ok' = every *_en column matches the
  -- current *_ar content; 'error' = the last translate attempt failed and
  -- at least one *_en column may be stale or (on first create) missing —
  -- surfaced in the admin UI with a retry action, never hidden.
  translation_status TEXT NOT NULL DEFAULT 'ok' CHECK (translation_status IN ('ok','error')),
  translation_error TEXT,
  -- How description_ar/title_ar got their current value: 'fetched' = pulled
  -- from the official platform page (currently Ehsan only, see
  -- app/lib/admin/fetchOfficialCampaignContent.ts) and not since hand-edited;
  -- 'manual' = the admin typed/edited it directly, or the platform has no
  -- extractor. Purely informational (shown as a small status line in the
  -- admin form) — never affects what the public site renders.
  description_source TEXT CHECK (description_source IN ('fetched','manual')),
  title_source TEXT CHECK (title_source IN ('fetched','manual'))
);
CREATE INDEX IF NOT EXISTS idx_campaigns_order ON campaigns (order_index);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

CREATE TABLE IF NOT EXISTS campaign_requests (
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
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON campaign_requests (status);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_read ON contact_messages (is_read);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT,
  admin_username TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log (created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Real, first-party analytics for the PUBLIC site only (see
-- app/lib/analytics/ — never written to from admin-side code). One row per
-- tracked interaction; the admin Statistics page aggregates this table on
-- read rather than maintaining separate rollup tables, since this project's
-- traffic scale doesn't need pre-aggregation.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  -- References campaigns.id loosely (no FK) — a campaign can be deleted
  -- while its historical events stay meaningful for trend charts, so this
  -- deliberately never cascades.
  campaign_id TEXT,
  route TEXT,
  -- Two anonymous, non-identifying random UUIDs, both cookie-based (see
  -- app/lib/analytics/trackAction.ts): visitor_id is long-lived (~400 days,
  -- "unique visitors"), session_id is a 30-minute sliding window ("visits").
  -- Neither is derived from IP, device fingerprint, or any personal data.
  visitor_id TEXT,
  session_id TEXT,
  -- Bucketed label (e.g. "google", "instagram", "direct"), never the raw
  -- referrer URL — see app/lib/analytics/referrer.ts.
  referrer_source TEXT,
  device_category TEXT,
  browser TEXT,
  os TEXT,
  -- Small plain-text tag for event-specific context (e.g. which nav link),
  -- never free-form user input / form contents.
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_campaign ON analytics_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events (visitor_id);
`;

/**
 * `CREATE TABLE IF NOT EXISTS` is a no-op on a database file that already
 * exists from a previous run — it does NOT retroactively add columns a
 * later schema change introduced (translation_status/translation_error
 * were added after this project's dev database was already created and
 * seeded). This adds any column present in `SCHEMA` but missing from the
 * actual on-disk table, so existing local databases pick up new columns
 * without needing to be deleted and reseeded.
 */
function migrateColumns(database: DatabaseSync): void {
  const existing = new Set(
    (database.prepare("PRAGMA table_info(campaigns)").all() as { name: string }[]).map((c) => c.name),
  );
  const additions: [string, string][] = [
    ["translation_status", "TEXT NOT NULL DEFAULT 'ok'"],
    ["translation_error", "TEXT"],
    // Existing rows predate these columns and were all hand-authored, not
    // fetched — 'manual' is the accurate default, not a guess.
    ["description_source", "TEXT DEFAULT 'manual'"],
    ["title_source", "TEXT DEFAULT 'manual'"],
  ];
  for (const [column, definition] of additions) {
    if (!existing.has(column)) {
      database.exec(`ALTER TABLE campaigns ADD COLUMN ${column} ${definition};`);
    }
  }
}

function createDb(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(SCHEMA);
  migrateColumns(database);
  runSeed(database);
  return database;
}

// Next.js dev mode hot-reloads server modules on every save, which would
// otherwise open a fresh SQLite handle each time. Cache the instance on
// `globalThis` (same pattern used for Prisma clients in Next.js docs) so dev
// reloads reuse the same open database instead of leaking file handles.
declare global {
  var __gharsahDb: DatabaseSync | undefined;
}

export const db: DatabaseSync = globalThis.__gharsahDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__gharsahDb = db;
}
