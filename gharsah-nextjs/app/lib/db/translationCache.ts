import { all, run } from "./client";
import { sourceHash } from "../translation/arabic";

/**
 * Successful Arabic → English translations, keyed by field kind + a hash of
 * the normalized Arabic (and a rules version, so improving the rules never
 * serves outdated output). Only publishable results are stored — never a
 * guess, a failure, or Arabic.
 */
export type CacheKind = "title" | "relation" | "description";

/** Bump when rules/dictionaries change in a way that should invalidate cached output. */
const CACHE_VERSION = "v5"; // v5: names transliterated + published with a review flag; memorial-aware titles; phrase table; names after "my <kin>"

export function cacheKey(kind: CacheKind, arabic: string): string {
  return `${CACHE_VERSION}:${kind}:${sourceHash(arabic)}`;
}

export type CachedTranslation = { english: string; method: "rules" | "engine"; review: boolean };

export async function getCachedTranslations(keys: string[]): Promise<Map<string, CachedTranslation>> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return new Map();
  const rows = await all<{ key: string; english: string; method: string }>(
    `SELECT key, english, method FROM translation_cache WHERE key IN (${unique.map(() => "?").join(", ")})`,
    unique,
  );
  // method is stored as "rules" | "engine" | "reviewed", with ":review" appended when flagged.
  return new Map(
    rows.map((row) => [
      row.key,
      { english: row.english, method: row.method.startsWith("engine") ? "engine" : "rules", review: row.method.endsWith(":review") },
    ]),
  );
}

export async function putCachedTranslation(kind: CacheKind, arabic: string, english: string, method: string, review = false): Promise<void> {
  await run(
    `INSERT INTO translation_cache (key, kind, english, method, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET english = EXCLUDED.english, method = EXCLUDED.method, created_at = EXCLUDED.created_at`,
    [cacheKey(kind, arabic), kind, english, review ? `${method}:review` : method, new Date().toISOString()],
  );
}
