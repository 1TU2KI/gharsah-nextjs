import type { RawQuery } from "./client";

/**
 * Base32-like alphabet, deliberately excluding visually ambiguous characters
 * (0/O, 1/I/L) — these codes are meant to be read off a stream overlay, typed
 * from memory, or spoken in chat, so a misreadable character is a real cost
 * here in a way it isn't for e.g. a campaign's internal `slug`.
 */
const SHORT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SHORT_CODE_LENGTH = 4;

/** Format/length rule for a CUSTOM alias (e.g. "turki") — looser than the auto-generated alphabet (admins may want lowercase, digits, underscores), but still URL-safe and short enough to stay "compact." */
export const SHORT_CODE_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

export function randomShortCode(): string {
  let code = "";
  for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
    code += SHORT_CODE_ALPHABET[Math.floor(Math.random() * SHORT_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Assigns a short code to every campaign row that doesn't have one yet.
 * Runs on every startup (a cheap no-op once every row is caught up) so it
 * picks up both rows that existed before this feature shipped and rows
 * `seed.ts` just inserted (the seed INSERT doesn't set one itself — this is
 * the single place that does, for both paths at once). Takes the raw,
 * ungated query function since it runs from inside client.ts's own
 * `initialize()`, before the gated `all/get/run` wrappers may be used.
 */
export async function backfillCampaignShortCodes(rawQuery: RawQuery): Promise<void> {
  const missing = await rawQuery<{ id: string }>("SELECT id FROM campaigns WHERE short_code IS NULL");
  if (missing.length === 0) return;

  const existing = await rawQuery<{ short_code: string }>(
    "SELECT short_code FROM campaigns WHERE short_code IS NOT NULL",
  );
  const used = new Set(existing.map((r) => r.short_code.toUpperCase()));

  for (const row of missing) {
    let code = randomShortCode();
    while (used.has(code)) {
      code = randomShortCode();
    }
    used.add(code);
    await rawQuery("UPDATE campaigns SET short_code = ? WHERE id = ?", [code, row.id]);
  }
}
