-- PROPOSAL ONLY — NOT APPLIED. For review before anything touches the live
-- (Neon Postgres) database. No application code reads this file; the
-- «اصنع صفحتك» feature currently runs on an in-memory mock store
-- (app/lib/customNear/store.ts) and is disabled in production builds.
--
-- Once approved, the plan is:
--   1. Add these statements to app/lib/db/client.ts's startup schema list
--      (same CREATE ... IF NOT EXISTS style as the existing tables).
--   2. Swap store.ts's Map for SQL queries (same function signatures).
--   3. Remove the CUSTOM_NEAR_PROTOTYPE production gate.

CREATE TABLE IF NOT EXISTS custom_near_pages (
  -- Short, unguessable public viewing id: /n/<id>. 12 chars from a
  -- 56-symbol alphabet without look-alikes (≈ 2^69.7 possibilities).
  id TEXT PRIMARY KEY,
  -- SHA-256 (hex) of the private 256-bit edit token. The token itself is
  -- never stored, so a database leak can't be used to edit pages.
  edit_token_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Campaign REFERENCES only, in the creator's order (position 1 = the
-- prominent center card). Cards and donation links always come from the
-- campaigns table itself, so editing a custom page never changes a campaign.
-- Deleting a campaign removes it from custom pages automatically; a campaign
-- that's merely no longer public is filtered out at read time.
CREATE TABLE IF NOT EXISTS custom_near_page_campaigns (
  page_id TEXT NOT NULL REFERENCES custom_near_pages (id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  PRIMARY KEY (page_id, position),
  UNIQUE (page_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_near_page_campaigns_campaign ON custom_near_page_campaigns (campaign_id);
