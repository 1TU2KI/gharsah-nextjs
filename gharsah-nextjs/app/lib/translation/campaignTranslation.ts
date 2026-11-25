import "server-only";

import { translateCampaignText, type TranslationRequest } from "@/app/lib/translate";
import { isValidEnglish, normalizeArabic, sourceHash } from "./arabic";
import { knownDescriptionEnglish } from "./knownTexts";
import {
  fieldStatus,
  isTranslated,
  needsAutomaticTranslation,
  parseManual,
  parseMeta,
  serializeMeta,
  TRANSLATED_FIELDS,
  type FieldStatus,
  type TranslatedField,
  type TranslationMeta,
} from "./meta";

/**
 * Decides, per field, what English a campaign should store — shared by the
 * admin save, "retry translation" and "retry all" so all follow the same rules:
 *
 * - Hand-typed English (translation_manual) is never auto-overwritten.
 * - English that still matches the current Arabic is kept (no engine call).
 *   Older hand-written English is kept too, as long as it's valid and the
 *   Arabic hasn't changed.
 * - Missing / pending / failed / stale fields are (re)translated.
 * - A complete translation (rules, dictionary + transliterated names, or the
 *   engine with names protected) is saved and published; if it relies on a
 *   transliterated name or machine wording it's flagged "Review recommended".
 * - When nothing complete can be produced (engine unreachable → pending, or
 *   its output rejected → failed), the previous valid English is kept, the
 *   reason is recorded, and the field stays retryable. A generic fallback,
 *   missing description or partial text is never counted as translated.
 *   Invalid English (Arabic text, a URL) is never kept.
 */
export type FieldInput = {
  arabic: string;
  /** Arabic saved before this edit (undefined on create). */
  previousArabic?: string;
  previousEnglish: string;
  /** English typed in the form; undefined = not submitted. */
  submitted?: string;
};

export type CampaignTranslationOutcome = {
  english: Record<TranslatedField, string>;
  translationStatus: "ok" | "error";
  translationError: string | null;
  translationManual: string | null;
  translationMeta: string | null;
  statuses: Record<TranslatedField, FieldStatus>;
};

export async function resolveCampaignEnglish(
  fields: Record<TranslatedField, FieldInput>,
  existing: { translation_manual: string | null; translation_meta: string | null } | undefined,
  context: { memorialPrefixAr?: string | null } = {},
): Promise<CampaignTranslationOutcome> {
  const manual = parseManual(existing?.translation_manual);
  const meta: TranslationMeta = parseMeta(existing?.translation_meta);
  const english = {} as Record<TranslatedField, string>;
  const request: TranslationRequest = {};

  for (const field of TRANSLATED_FIELDS) {
    const { arabic, previousArabic, previousEnglish, submitted } = fields[field];
    english[field] = previousEnglish;
    if (!arabic.trim()) {
      // Only clear English when the admin actually removed Arabic that was
      // there before. Older campaigns have hand-written English with NO
      // Arabic counterpart (e.g. descriptions) — that English is kept.
      if (previousArabic?.trim()) {
        english[field] = "";
        manual.delete(field);
        delete meta[field];
      } else {
        const typed = submitted?.trim();
        if (typed !== undefined && typed !== previousEnglish.trim()) english[field] = typed;
      }
      continue;
    }
    const hash = sourceHash(arabic);
    const typed = submitted?.trim();
    if (typed !== undefined && typed !== previousEnglish.trim()) {
      if (typed) {
        english[field] = typed;
        manual.add(field);
        meta[field] = { src: hash, method: "manual" };
        continue;
      }
      // Cleared by the admin: back to automatic translation.
      english[field] = "";
      manual.delete(field);
      delete meta[field];
    }
    if (manual.has(field)) continue;

    // Older row (no provenance yet) whose Arabic just changed: its English
    // belongs to the old text.
    const legacyChanged =
      !meta[field] && previousArabic !== undefined && normalizeArabic(previousArabic) !== normalizeArabic(arabic);
    const status = legacyChanged ? "stale" : fieldStatus(arabic, english[field], false, meta[field]);
    if (status === "current" || status === "review_recommended") {
      if (!meta[field]?.src) meta[field] = { src: hash, method: "legacy" };
      // Machine output gets upgraded once a hand-checked text exists for it.
      const known = field === "description" && meta[field]?.method === "engine" ? knownDescriptionEnglish(arabic) : null;
      if (known && known !== english[field]) request[field] = arabic;
      continue;
    }
    if (needsAutomaticTranslation(status)) request[field] = arabic;
  }

  const results =
    Object.keys(request).length > 0
      ? await translateCampaignText(request, {
          titleAr: fields.title.arabic,
          relationAr: fields.relation.arabic,
          memorialPrefixAr: context.memorialPrefixAr,
        })
      : {};
  const now = new Date().toISOString();
  const errors: string[] = [];

  for (const field of TRANSLATED_FIELDS) {
    // Never keep Arabic or a URL in an English column.
    if (!isValidEnglish(english[field])) english[field] = "";
    if (manual.has(field) || !fields[field].arabic.trim()) continue;
    const result = results[field];
    if (!result) continue;
    const hash = sourceHash(fields[field].arabic);
    if (result.state === "ok") {
      english[field] = result.english;
      meta[field] = { src: hash, method: result.method, ...(result.review ? { review: true } : {}) };
    } else {
      meta[field] = { ...meta[field], pending: { src: hash, kind: result.kind, error: result.error, at: now } };
      errors.push(result.error);
    }
  }

  const statuses = {} as Record<TranslatedField, FieldStatus>;
  for (const field of TRANSLATED_FIELDS) {
    statuses[field] = fieldStatus(fields[field].arabic, english[field], manual.has(field), meta[field]);
  }
  const translated = TRANSLATED_FIELDS.every((f) => isTranslated(statuses[f]));

  return {
    english,
    translationStatus: translated ? "ok" : "error",
    translationError: translated ? null : (errors[0] ?? "بعض الحقول بلا ترجمة كاملة للنص العربي الحالي."),
    translationManual: manual.size > 0 ? TRANSLATED_FIELDS.filter((f) => manual.has(f)).join(",") : null,
    translationMeta: serializeMeta(meta),
    statuses,
  };
}

type RowLike = {
  title_ar: string;
  title_en: string;
  relation_ar: string;
  relation_en: string;
  description_ar: string | null;
  description_en: string;
  translation_manual: string | null;
  translation_meta: string | null;
};

/** Per-field statuses for a saved row (admin display, retry-all selection). */
export function campaignFieldStatuses(row: RowLike): Record<TranslatedField, FieldStatus> {
  const manual = parseManual(row.translation_manual);
  const meta = parseMeta(row.translation_meta);
  return {
    title: fieldStatus(row.title_ar, row.title_en, manual.has("title"), meta.title),
    relation: fieldStatus(row.relation_ar, row.relation_en, manual.has("relation"), meta.relation),
    description: fieldStatus(row.description_ar, row.description_en, manual.has("description"), meta.description),
  };
}

/** The first recorded pending/failed reason for the current Arabic, if any. */
export function campaignTranslationError(row: RowLike): string | null {
  const meta = parseMeta(row.translation_meta);
  const statuses = campaignFieldStatuses(row);
  for (const field of TRANSLATED_FIELDS) {
    if (statuses[field] === "failed" || statuses[field] === "pending") return meta[field]?.pending?.error ?? null;
  }
  return null;
}
