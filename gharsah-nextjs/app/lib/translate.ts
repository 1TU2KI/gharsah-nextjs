import "server-only";

import { ARABIC_LETTERS, cleanArabic, isValidEnglish, normalizeArabic } from "@/app/lib/translation/arabic";
import { campaignSubjects, findPersonPhrases, translateRelationByRules, translateTitleByRules } from "@/app/lib/translation/rules";
import { knownDescriptionEnglish } from "@/app/lib/translation/knownTexts";
import type { TranslatedField } from "@/app/lib/translation/meta";
import { cacheKey, getCachedTranslations, putCachedTranslation, type CachedTranslation } from "@/app/lib/db/translationCache";

/**
 * Arabic → English for campaign text. Everything runs on infrastructure
 * Gharsah controls — no paid or third-party API:
 *
 * 1. Curated texts and the cache — the same Arabic is never translated twice.
 * 2. Rules + names dictionary (app/lib/translation/rules.ts) for formulaic
 *    titles/subtitles. Works with the engine offline. A proper name missing
 *    from the dictionary is transliterated and the result is published,
 *    flagged "Review recommended".
 * 3. Self-hosted engine (translation-service/, Opus-MT ar-en) for
 *    descriptions and any title/subtitle the rules can't fully account for.
 *    People (kinship + name, kunya, honorific + name), @handles, links and
 *    religious phrases are replaced by placeholders first, so only the
 *    surrounding wording is machine-translated; names are transliterated,
 *    never translated as words. Engine titles/subtitles are always flagged
 *    "Review recommended".
 *
 * Every result is validated: any Arabic letter, lost placeholder, runaway
 * repetition or typical model filler fails the WHOLE field — partial
 * translations are never returned. A failure says whether the engine was
 * unreachable ("unavailable" → pending, retry later) or produced bad output
 * ("invalid"). Never throws.
 *
 * Env: TRANSLATION_ENGINE_URL (e.g. http://127.0.0.1:8089) and
 * TRANSLATION_ENGINE_KEY (the service's shared secret).
 */

export type FieldTranslation =
  | { state: "ok"; english: string; method: "rules" | "engine"; review: boolean }
  | { state: "error"; kind: "unavailable" | "invalid"; error: string };

export type TranslationRequest = Partial<Record<TranslatedField, string>>;
export type TranslationResults = Partial<Record<TranslatedField, FieldTranslation>>;
export type TranslationContext = { titleAr?: string; relationAr?: string; memorialPrefixAr?: string | null };

type PersonPhrase = { arabic: string; english: string; guessed: boolean };

const REQUEST_TIMEOUT_MS = 30_000;

/** Regex source matching a phrase across common spelling variants (ة/ه, ى/ي, alef forms). */
function tolerant(phrase: string): string {
  return [...phrase]
    .map((ch) => {
      if (ch === "ة" || ch === "ه") return "[ةه]";
      if (ch === "ى" || ch === "ي") return "[ىي]";
      if ("اأإآ".includes(ch)) return "[اأإآ]";
      if (ch === " ") return "\\s+";
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
}

/** Whole-word match for Arabic phrases (JS \b only knows ASCII). */
const word = (source: string) => new RegExp(`(?<![\\p{L}\\p{M}])${source}(?![\\p{L}\\p{M}])`, "gu");

/**
 * Fixed English for protected phrases inside free text. Memorial phrases
 * carry their own leading comma ("…Zamzami's father, may God have mercy on
 * him") — tidied up after substitution.
 */
const FIXED_PHRASES: [string, string][] = [
  // Common charity phrasing the engine gets wrong — notably plural
  // imperatives, which without diacritics it reads as past tense
  // («ساهموا معنا» "contribute with us" → "they contributed").
  ["جعلها الله في ميزان حسناته", "may God place it in the balance of his good deeds"],
  ["جعلها الله في ميزان حسناتها", "may God place it in the balance of her good deeds"],
  ["جعلها الله في ميزان حسناتهم", "may God place it in the balance of their good deeds"],
  ["في ميزان حسناته", "in the balance of his good deeds"],
  ["في ميزان حسناتها", "in the balance of her good deeds"],
  ["في ميزان حسناتهم", "in the balance of their good deeds"],
  ["تقبل الله منا ومنكم", "may God accept it from us and from you"],
  ["تقبل الله منه", "may God accept it from him"],
  ["تقبل الله منها", "may God accept it from her"],
  ["لا تنسوه من دعائكم", "please remember him in your prayers"],
  ["لا تنسوها من دعائكم", "please remember her in your prayers"],
  ["لا تنسوهم من دعائكم", "please remember them in your prayers"],
  ["لا تنسونا من دعائكم", "please remember us in your prayers"],
  ["ساهموا معنا", "contribute with us"],
  ["ساهم معنا", "contribute with us"],
  ["شاركونا", "join us"],
  ["تبرعوا", "donate"],
  ["زوروا", "visit"],
  ["انشروا", "share"],
  ["ادعوا له", "pray for him"],
  ["ادعوا لها", "pray for her"],
  ["ادعوا لهم", "pray for them"],
  ["ولو بالقليل", "even with a little"],
  ["عن روح", "on behalf of the soul of"],
  ["على روح", "for the soul of"],
  ["لروح", "for the soul of"],
  ["سقيا ماء", "water provision"],
  ["صدقة جارية", "an ongoing charity"],
  ["رحمهم الله تعالى", ", may God have mercy on them"],
  ["رحمها الله تعالى", ", may God have mercy on her"],
  ["رحمه الله تعالى", ", may God have mercy on him"],
  ["رحمهم الله", ", may God have mercy on them"],
  ["رحمها الله", ", may God have mercy on her"],
  ["رحمه الله", ", may God have mercy on him"],
];

type Protected = { text: string; tokens: Map<string, string>; guessed: boolean } | null;

/**
 * Swaps everything the engine must not translate for letter-only
 * placeholders (XQA, XQB…; verified to pass through Opus-MT unchanged, unlike
 * digits or Latin names, which it rewrites or hallucinates over): URLs,
 * @handles, other Latin text, the campaign's own people (with their
 * rule-based English) and fixed religious phrases. The engine then
 * translates whole sentences, which reads far better than translating the
 * pieces between protected phrases separately.
 */
function protect(arabic: string, subjects: PersonPhrase[]): Protected {
  const tokens = new Map<string, string>();
  let guessed = false;
  let text = cleanArabic(arabic);
  const nextToken = () => {
    const n = tokens.size;
    if (n >= 26) return null;
    return `XQ${String.fromCharCode(65 + n)}`;
  };
  let overflow = false;
  const swap = (re: RegExp, english: (match: string) => string) => {
    text = text.replace(re, (match) => {
      const token = nextToken();
      if (!token) {
        overflow = true;
        return match;
      }
      tokens.set(token, english(match));
      return ` ${token} `;
    });
  };

  // A sentence's closing punctuation is not part of the link.
  swap(/https?:\/\/\S+?(?=[.,،؛!?؟)]*(?:\s|$))/g, (m) => m);
  swap(/@[A-Za-z0-9_.]+/g, (m) => m);
  // Other Latin words (names typed in English, brand names) — one token each,
  // never re-matching the placeholders already inserted above.
  swap(/\b(?!XQ[A-Z]\b)[A-Za-z][A-Za-z0-9_.'’-]*/g, (m) => m);
  for (const subject of subjects) {
    const before = tokens.size;
    // Optional «عن » before, or an attached «ل»/«و» ("for"/"and").
    swap(word(`(?:عن\\s+|[لو](?=${tolerant(subject.arabic.charAt(0))}))?${tolerant(subject.arabic)}`), (m) => {
      const attached = !normalizeArabic(m).startsWith(subject.arabic);
      if (/^عن\s/u.test(m) || (attached && m.startsWith("ل"))) return `for ${subject.english}`;
      if (attached && m.startsWith("و")) return `and ${subject.english}`;
      return subject.english;
    });
    if (tokens.size > before && subject.guessed) guessed = true;
  }
  for (const [ar, en] of FIXED_PHRASES) swap(word(tolerant(ar)), () => en);
  if (overflow) return null;
  // No space before punctuation: Opus-MT tends to invent filler ("…th.",
  // ", I'm not sure.") after a detached "." or "،".
  const tidy = text.replace(/\s+/g, " ").replace(/\s+([.,،؛؟!:])/g, "$1").trim();
  return { text: tidy, tokens, guessed };
}

/** Puts the protected English back; null if the engine lost or duplicated a placeholder. */
function restore(english: string, tokens: Map<string, string>): string | null {
  let out = english;
  for (const [token, value] of tokens) {
    const re = new RegExp(`\\b${token}\\b`, "g");
    if ((out.match(re) ?? []).length !== 1) return null;
    out = out.replace(re, value);
  }
  out = out
    .replace(/،/g, ",")
    .replace(/؛/g, ";")
    .replace(/؟/g, "?")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\s*,\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    // Sentences that now start with a substituted phrase ("…her. contribute with us").
    .replace(/([.!?]\s+)([a-z])/g, (_, end: string, letter: string) => end + letter.toUpperCase());
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Rejects engine output that isn't trustworthy English for the given Arabic. */
function checkOutput(arabic: string, english: string): string | null {
  if (!english.trim()) return "empty";
  if (ARABIC_LETTERS.test(english)) return "arabic";
  if (/\b(\w+)(?:\W+\1\b){3,}/iu.test(english)) return "repetition";
  // Typical filler the model invents at sentence edges; never part of campaign text.
  const prose = english.replace(/https?:\/\/\S+|@[A-Za-z0-9_.]+/g, "");
  if (/\b(I'm not sure|I don't know|I am not sure|I think|you know)\b/i.test(prose) || /[a-z]\.[a-z]{1,3}\./i.test(prose)) {
    return "hallucination";
  }
  const ratio = english.length / Math.max(arabic.length, 1);
  if (ratio < 0.3 || ratio > 6) return "length";
  return null;
}

type EngineResult = { ok: true; translations: string[] } | { ok: false; kind: "unavailable" | "invalid"; error: string };

async function callEngine(texts: string[]): Promise<EngineResult> {
  const baseUrl = process.env.TRANSLATION_ENGINE_URL?.trim();
  if (!baseUrl) {
    return { ok: false, kind: "unavailable", error: "محرك الترجمة الذاتي غير مُعدّ (TRANSLATION_ENGINE_URL). الترجمة معلّقة حتى يتوفر المحرك." };
  }
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-translation-key": process.env.TRANSLATION_ENGINE_KEY ?? "" },
      body: JSON.stringify({ texts }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, kind: "unavailable", error: `محرك الترجمة أعاد خطأ (${response.status}). الترجمة معلّقة — أعد المحاولة لاحقًا.` };
    }
    const data = (await response.json()) as { translations?: unknown };
    const translations = data.translations;
    if (!Array.isArray(translations) || translations.length !== texts.length || !translations.every((t) => typeof t === "string")) {
      return { ok: false, kind: "invalid", error: "استجابة غير صالحة من محرك الترجمة. بقيت الإنجليزية المحفوظة كما هي." };
    }
    return { ok: true, translations: translations as string[] };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      kind: "unavailable",
      error: timedOut
        ? "انتهت مهلة محرك الترجمة. الترجمة معلّقة — أعد المحاولة لاحقًا."
        : "تعذّر الاتصال بمحرك الترجمة الذاتي (متوقف أو غير قابل للوصول). الترجمة معلّقة — أعد المحاولة بعد تشغيله.",
    };
  }
}

/** Quick reachability check for the admin UI. */
export async function getTranslationEngineHealth(): Promise<"online" | "offline" | "not-configured"> {
  const baseUrl = process.env.TRANSLATION_ENGINE_URL?.trim();
  if (!baseUrl) return "not-configured";
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const data = (await response.json()) as { ok?: boolean; ready?: boolean; onDemand?: boolean };
    // An on-demand deployment loads the bundled model on its first
    // authenticated translation. A cold instance is reachable, not offline.
    return response.ok && data.ok && (data.ready || data.onDemand) ? "online" : "offline";
  } catch {
    return "offline";
  }
}

type EngineInput = { field: TranslatedField; arabic: string; people: PersonPhrase[] };
type EngineOutput = { english: string; guessed: boolean } | { kind: "unavailable" | "invalid"; error: string };

/** Machine-translates whole fields (placeholders protect people/phrases/links) in ONE engine request. */
async function translateWithEngine(inputs: EngineInput[]): Promise<Map<TranslatedField, EngineOutput>> {
  const out = new Map<TranslatedField, EngineOutput>();
  const plans = inputs.map((input) => ({ ...input, protected: protect(input.arabic, input.people) }));
  const sendable = plans.filter((p) => p.protected && ARABIC_LETTERS.test(p.protected.text));
  for (const p of plans) {
    if (!p.protected) {
      out.set(p.field, { kind: "invalid", error: "النص يحتوي على عناصر محمية كثيرة جدًا للترجمة الآلية. بقيت الإنجليزية المحفوظة كما هي." });
    } else if (!ARABIC_LETTERS.test(p.protected.text)) {
      const english = restore(p.protected.text, p.protected.tokens);
      out.set(
        p.field,
        english && isValidEnglish(english) ? { english, guessed: p.protected.guessed } : { kind: "invalid", error: "تعذّرت الترجمة." },
      );
    }
  }
  if (sendable.length === 0) return out;

  const engine = await callEngine(sendable.map((p) => p.protected!.text));
  if (!engine.ok) {
    for (const p of sendable) out.set(p.field, { kind: engine.kind, error: engine.error });
    return out;
  }
  sendable.forEach((p, i) => {
    const raw = engine.translations[i] ?? "";
    const english = restore(raw, p.protected!.tokens);
    const problem = english === null ? "placeholder" : checkOutput(p.arabic, english);
    if (problem || !english || !isValidEnglish(english)) {
      out.set(p.field, {
        kind: "invalid",
        error: `أنتج محرك الترجمة نصًا غير صالح لهذا الحقل (${problem ?? "invalid"}). بقيت الإنجليزية المحفوظة كما هي.`,
      });
    } else {
      out.set(p.field, { english, guessed: p.protected!.guessed });
    }
  });
  return out;
}

const MEMORIAL_TAIL =
  /\s*[,،]?\s*(?:(?:ي)?رحم(?:ه|ها|هم|هما)\s+الله|الله\s+يرحم(?:ه|ها|هم|هما)|غفر\s+الله\s+ل(?:ه|ها|هم|هما))(?:\s+تعال[ىي])?\s*$/u;

/**
 * Translates the given fields. Never throws; each field gets its own result.
 * "ok" results are complete and publishable (cached); review=true means a
 * proper name was transliterated or wording was machine-translated.
 * "error" means no English for this Arabic yet — keep the saved English.
 */
export async function translateCampaignText(request: TranslationRequest, context: TranslationContext = {}): Promise<TranslationResults> {
  const results: TranslationResults = {};
  // The title's memorial phrase is left to the card's memorial line only
  // when the campaign has one selected; otherwise it's translated.
  const keepMemorial = !context.memorialPrefixAr?.trim();
  const entries = (Object.entries(request) as [TranslatedField, string | undefined][])
    .map(([field, value]) => [field, cleanArabic(value ?? "")] as const)
    .filter(([, value]) => value.length > 0);
  if (entries.length === 0) return results;
  const keyText = (field: TranslatedField, arabic: string) => (field === "title" && keepMemorial ? `${arabic} [memorial]` : arabic);

  let cached = new Map<string, CachedTranslation>();
  try {
    cached = await getCachedTranslations(entries.map(([field, value]) => cacheKey(field, keyText(field, value))));
  } catch (error) {
    console.error("[translate] cache read failed", error instanceof Error ? error.message : error);
  }

  const forEngine: EngineInput[] = [];
  const subjects = campaignSubjects(context.titleAr ?? request.title ?? "", context.relationAr ?? request.relation ?? "");
  for (const [field, arabic] of entries) {
    const known = field === "description" ? knownDescriptionEnglish(arabic) : null;
    if (known) {
      results[field] = { state: "ok", english: known, method: "rules", review: false };
      continue;
    }
    const hit = cached.get(cacheKey(field, keyText(field, arabic)));
    if (hit && isValidEnglish(hit.english)) {
      results[field] = { state: "ok", english: hit.english, method: hit.method, review: hit.review };
      continue;
    }
    if (field === "title" || field === "relation") {
      const rule = field === "title" ? translateTitleByRules(arabic, { keepMemorial }) : translateRelationByRules(arabic);
      if (rule && isValidEnglish(rule.english)) {
        results[field] = { state: "ok", english: rule.english, method: "rules", review: rule.kind === "guess" };
        continue;
      }
    }
    // Machine path: protect every person found in the text (plus, for
    // descriptions, the campaign's own people). A title whose memorial phrase
    // is shown on the card's memorial line drops it first, like the rules do.
    const text = field === "title" && !keepMemorial ? arabic.replace(MEMORIAL_TAIL, "") : arabic;
    const people = [...(field === "description" ? subjects : []), ...findPersonPhrases(text)];
    forEngine.push({ field, arabic: text, people });
  }

  if (forEngine.length > 0) {
    const engine = await translateWithEngine(forEngine);
    for (const { field } of forEngine) {
      const value = engine.get(field);
      if (!value || "error" in value) {
        results[field] = { state: "error", kind: value?.kind ?? "invalid", error: value?.error ?? "تعذّرت الترجمة." };
      } else {
        // Machine wording in a title/subtitle, or any transliterated name, is
        // published but flagged for an admin to read once.
        results[field] = { state: "ok", english: value.english, method: "engine", review: true };
      }
    }
  }

  for (const [field, arabic] of entries) {
    const result = results[field];
    if (result?.state !== "ok") continue;
    const key = cacheKey(field, keyText(field, arabic));
    const known = field === "description" && knownDescriptionEnglish(arabic) !== null;
    // Hand-checked texts always overwrite whatever the cache held (e.g. older machine output).
    if (known ? cached.get(key)?.english !== result.english : !cached.has(key)) {
      try {
        await putCachedTranslation(field, keyText(field, arabic), result.english, result.method, result.review);
      } catch (error) {
        console.error("[translate] cache write failed", error instanceof Error ? error.message : error);
      }
    }
  }
  return results;
}
