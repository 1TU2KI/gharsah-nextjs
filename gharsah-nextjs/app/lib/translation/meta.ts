import { isValidEnglish, sourceHash } from "./arabic";

/**
 * Per-field translation provenance, stored as JSON in
 * `campaigns.translation_meta`. A field's status is always DERIVED from this
 * plus the current Arabic/English — never from a stored "ok" flag — so a
 * translation can't stay "current" after its Arabic changed.
 */
export type TranslatedField = "title" | "relation" | "description";
export const TRANSLATED_FIELDS: TranslatedField[] = ["title", "relation", "description"];

export type TranslationMethod = "rules" | "engine" | "manual" | "reviewed" | "legacy";

export type FieldMeta = {
  /** sourceHash() of the Arabic the saved English was produced from. */
  src?: string;
  method?: TranslationMethod;
  /**
   * The saved English is a complete translation and is published, but part
   * of it is a transliterated name or machine wording — an admin should
   * read it once ("Review recommended").
   */
  review?: boolean;
  /** The latest attempt for the CURRENT Arabic didn't produce English. */
  pending?: {
    src: string;
    /** "unavailable" = the engine couldn't be reached (pending); "invalid" = its output was rejected. */
    kind: "unavailable" | "invalid";
    error: string;
    at: string;
  };
};

export type TranslationMeta = Partial<Record<TranslatedField, FieldMeta>>;

export function parseMeta(raw: string | null | undefined): TranslationMeta {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? (value as TranslationMeta) : {};
  } catch {
    return {};
  }
}

export function serializeMeta(meta: TranslationMeta): string | null {
  const clean: TranslationMeta = {};
  for (const field of TRANSLATED_FIELDS) {
    const m = meta[field];
    if (m && (m.src || m.method || m.pending)) clean[field] = m;
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

/**
 * none               — no Arabic, nothing to translate
 * current            — complete English for the current Arabic (or older hand-written English)
 * review_recommended — complete English for the current Arabic, published, with transliterated names / machine wording
 * manual             — typed by an admin; never auto-overwritten
 * manual_outdated    — typed by an admin, and the Arabic has changed since (still never overwritten)
 * pending            — no English for the current Arabic yet: the engine was unreachable (retry once it's back)
 * failed             — no English for the current Arabic: the engine's output was rejected
 * stale              — saved English belongs to an older Arabic text
 * missing            — no usable English at all (empty, Arabic, or a URL)
 */
export type FieldStatus =
  | "none"
  | "current"
  | "review_recommended"
  | "manual"
  | "manual_outdated"
  | "pending"
  | "failed"
  | "stale"
  | "missing";

export function fieldStatus(arabic: string | null | undefined, english: string | null | undefined, manual: boolean, meta: FieldMeta | undefined): FieldStatus {
  if (!arabic?.trim()) return "none";
  const hash = sourceHash(arabic);
  const valid = isValidEnglish(english);
  if (manual) {
    if (!valid) return "missing";
    return meta?.src && meta.src !== hash ? "manual_outdated" : "manual";
  }
  if (valid && (meta?.src === hash || (!meta?.src && !meta?.pending))) return meta?.review ? "review_recommended" : "current";
  if (meta?.pending?.src === hash) return meta.pending.kind === "unavailable" ? "pending" : "failed";
  return valid ? "stale" : "missing";
}

/** Complete, publishable English for the current Arabic — the only statuses that count as translated. */
export function isTranslated(status: FieldStatus): boolean {
  return (
    status === "none" ||
    status === "current" ||
    status === "review_recommended" ||
    status === "manual" ||
    status === "manual_outdated"
  );
}

/** @deprecated name kept for callers — same as isTranslated. */
export const isSettled = isTranslated;

/** Statuses an automatic save/retry (re)translates — never manual or current English. */
export function needsAutomaticTranslation(status: FieldStatus): boolean {
  return status === "pending" || status === "failed" || status === "stale" || status === "missing";
}

/**
 * Whether live-synced Arabic (Ehsan) may replace this field's English with a
 * cached translation of the live text: only when the saved English is
 * missing/invalid or was itself generated automatically. Hand-typed,
 * reviewed and legacy (hand-authored) English is never replaced by live sync.
 */
export function isLiveReplaceable(english: string | null | undefined, manual: boolean, meta: FieldMeta | undefined): boolean {
  if (manual) return false;
  if (!isValidEnglish(english)) return true;
  return meta?.method === "rules" || meta?.method === "engine";
}

export function parseManual(value: string | null | undefined): Set<TranslatedField> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is TranslatedField => (TRANSLATED_FIELDS as string[]).includes(s)),
  );
}

export const FIELD_STATUS_LABEL_AR: Record<FieldStatus, string> = {
  none: "لا يوجد نص",
  current: "مترجم",
  review_recommended: "مترجم — يُنصح بالمراجعة",
  manual: "إنجليزي يدوي",
  manual_outdated: "إنجليزي يدوي — تغيّر العربي بعده",
  pending: "بانتظار محرك الترجمة",
  failed: "فشلت الترجمة",
  stale: "ترجمة قديمة",
  missing: "لا توجد ترجمة",
};
