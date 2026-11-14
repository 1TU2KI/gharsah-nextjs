import "server-only";

import { MEMORIAL_PREFIX_EN } from "@/app/lib/admin/memorialPrefixOptions";

/**
 * Arabic -> English for admin-entered campaign text, through Gharsah's own
 * SELF-HOSTED translation engine (translation-service/ in this repo —
 * Opus-MT ar-en running on a server we control). Campaign text is only ever
 * sent to TRANSLATION_ENGINE_URL; no third-party API is involved.
 *
 * The engine is a plain machine translator, so everything Gharsah-specific
 * is handled HERE, before and after it:
 * - Fixed religious/memorial phrases are never machine-translated: they're
 *   cut out of the text and replaced by their fixed English — the same
 *   MEMORIAL_PREFIX_EN mapping the memorial-phrase field uses, plus the
 *   «صدقة جارية» wording Gharsah already used.
 * - @handles and URLs pass through unchanged.
 * - Output that still contains Arabic letters is rejected, so Arabic is
 *   never stored as "English".
 * Machine translation can still mistranslate personal names (they may be
 * read as ordinary words); admins can correct any field by hand in the
 * campaign form, and hand-typed English is never auto-overwritten.
 *
 * Env: TRANSLATION_ENGINE_URL (e.g. http://127.0.0.1:8089) and
 * TRANSLATION_ENGINE_KEY (the service's shared secret).
 */

export type TranslatableCampaignFields = {
  title?: string;
  relation?: string;
  description?: string;
};

export type TranslationResult =
  | { ok: true; fields: TranslatableCampaignFields }
  | { ok: false; error: string };

const REQUEST_TIMEOUT_MS = 30_000;
const ARABIC_LETTERS = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;

/** Fixed English for protected phrases — longest first so «صدقة جارية عن» wins over «صدقة جارية». */
const FIXED_PHRASES: [string, string][] = (
  [
    ["صدقة جارية عن", "Ongoing charity (sadaqah jariyah) on behalf of"],
    ["صدقة جارية", "ongoing charity (sadaqah jariyah)"],
    ...Object.entries(MEMORIAL_PREFIX_EN),
  ] as [string, string][]
).sort((a, b) => b[0].length - a[0].length);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PROTECTED = new RegExp(
  `(${[...FIXED_PHRASES.map(([ar]) => escapeRegExp(ar)), "https?:\\/\\/\\S+", "@[A-Za-z0-9_.]+"].join("|")})`,
  "gu",
);

type Segment = { kind: "fixed"; text: string } | { kind: "translate"; text: string };

/** Splits Arabic text into fixed pieces (phrases, handles, URLs) and pieces the engine should translate. */
function segment(text: string, leadingOnBehalfOf = false): Segment[] {
  const segments: Segment[] = [];
  // Relation lines ("عن جدة أنس") use «عن» as "on behalf of", which the
  // engine renders as "About" — pinned for that field only (in descriptions
  // «عن» usually does mean "about").
  const lead = leadingOnBehalfOf ? text.match(/^عن\s+/u) : null;
  if (lead) {
    segments.push({ kind: "fixed", text: "on behalf of" });
    text = text.slice(lead[0].length);
  }
  for (const part of text.split(PROTECTED)) {
    if (!part) continue;
    const fixed = FIXED_PHRASES.find(([ar]) => ar === part);
    if (fixed) segments.push({ kind: "fixed", text: fixed[1] });
    else if (/^(https?:\/\/|@)/u.test(part)) segments.push({ kind: "fixed", text: part });
    else if (ARABIC_LETTERS.test(part)) segments.push({ kind: "translate", text: part.trim() });
    else if (part.trim()) segments.push({ kind: "fixed", text: part.trim() }); // digits/punctuation
  }
  return segments;
}

/** Joins translated pieces and tidies Arabic punctuation and spacing. */
function assemble(pieces: string[]): string {
  let text = pieces.filter(Boolean).join(" ");
  text = text.replace(/،/g, ",").replace(/؛/g, ";").replace(/؟/g, "?");
  text = text.replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function callEngine(texts: string[]): Promise<{ ok: true; translations: string[] } | { ok: false; error: string }> {
  const baseUrl = process.env.TRANSLATION_ENGINE_URL?.trim();
  if (!baseUrl) {
    return {
      ok: false,
      error:
        "محرك الترجمة الذاتي غير مُعدّ (TRANSLATION_ENGINE_URL). حُفظ المحتوى العربي، ويمكنك إدخال الإنجليزية يدويًا أو إعادة المحاولة لاحقًا.",
    };
  }
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/translate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-translation-key": process.env.TRANSLATION_ENGINE_KEY ?? "",
      },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: `محرك الترجمة أعاد خطأ (${response.status}). حُفظ المحتوى العربي دون تغيير الإنجليزية.` };
    }
    const data = (await response.json()) as { translations?: unknown };
    const translations = data.translations;
    if (!Array.isArray(translations) || translations.length !== texts.length || !translations.every((t) => typeof t === "string")) {
      return { ok: false, error: "استجابة غير صالحة من محرك الترجمة." };
    }
    return { ok: true, translations: translations as string[] };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      error: timedOut
        ? "انتهت مهلة محرك الترجمة. حُفظ المحتوى العربي دون تغيير الإنجليزية."
        : "تعذّر الاتصال بمحرك الترجمة الذاتي. حُفظ المحتوى العربي دون تغيير الإنجليزية.",
    };
  }
}

/**
 * Translates whichever fields are provided, in one engine request. Never
 * throws. All-or-nothing: if any requested field can't be produced as real
 * English, the whole result is an error and callers keep their saved English.
 */
export async function translateCampaignFields(fields: TranslatableCampaignFields): Promise<TranslationResult> {
  const entries = (Object.entries(fields) as [keyof TranslatableCampaignFields, string | undefined][]).filter(
    (entry): entry is [keyof TranslatableCampaignFields, string] => Boolean(entry[1]?.trim()),
  );
  if (entries.length === 0) return { ok: true, fields: {} };

  const segmented = entries.map(([key, value]) => ({ key, segments: segment(value.trim(), key === "relation") }));
  const toTranslate = segmented.flatMap(({ segments }) => segments.filter((s) => s.kind === "translate").map((s) => s.text));

  let translated: string[] = [];
  if (toTranslate.length > 0) {
    const engine = await callEngine(toTranslate);
    if (!engine.ok) return engine;
    translated = engine.translations;
  }

  const result: TranslatableCampaignFields = {};
  let cursor = 0;
  for (const { key, segments } of segmented) {
    const pieces = segments.map((s) => {
      if (s.kind === "fixed") return s.text;
      let out = (translated[cursor++] ?? "").trim().replace(/\.{2,}/g, ".");
      // The engine ends every fragment with a period; drop it when the
      // Arabic fragment didn't end a sentence (it's mid-sentence, before a
      // fixed phrase, a handle, etc.).
      if (!/[.!?؟]\s*$/u.test(s.text)) out = out.replace(/[.]+$/, "");
      return out;
    });
    const english = assemble(pieces);
    if (!english || ARABIC_LETTERS.test(english)) {
      return { ok: false, error: `لم يُنتج محرك الترجمة نصًا إنجليزيًا صالحًا (${key}). لم تُغيَّر الإنجليزية المحفوظة.` };
    }
    result[key] = english;
  }
  return { ok: true, fields: result };
}
