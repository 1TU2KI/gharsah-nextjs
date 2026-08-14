import "server-only";

/**
 * Auto-translates admin-entered Arabic campaign text to English via the
 * Anthropic Messages API — chosen (over a free MT API) specifically for
 * quality on this content: campaign text carries religious/memorial phrasing
 * ("رحمه الله") and proper names that a literal machine translator renders
 * poorly or disrespectfully. The admin only ever enters Arabic; every public
 * English field is produced here and persisted (see campaignsRepo.ts) so it
 * survives without a network call on every page view.
 *
 * Requires ANTHROPIC_API_KEY (paid, billed per request — a campaign's few
 * short fields cost a fraction of a cent). Model is overridable via
 * ANTHROPIC_TRANSLATE_MODEL; defaults to Sonnet 5 for translation quality
 * over the cheaper Haiku, since this content is sensitive and infrequent
 * (only on admin create/edit, not per page view).
 */
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You translate short Arabic charity-campaign text into natural, warm, respectful English for Gharsah, a platform listing verified Islamic charity campaigns (mostly ongoing charity — "صدقة جارية" / sadaqah jariyah — dedicated to a deceased relative).

Rules:
- Translate meaning and tone, never word-for-word. It must read as if originally written in English by a thoughtful person, not machine-translated.
- Preserve personal/proper names as standard English transliterations — never translate a name's meaning, never omit it.
- Render religious phrases with the dignity English-speaking Muslims use, e.g. "رحمه الله" -> "may God have mercy on him", "رحمها الله" -> "may God have mercy on her", "صدقة جارية" -> "ongoing charity (sadaqah jariyah)". Reuse exactly these forms when the phrase appears.
- Never invent content that isn't in the source text.
- The input never contains usernames, @handles, URLs, or IDs — if you ever see one regardless, copy it through completely unchanged.
- Output strict JSON only: {"title": "...", "relation": "...", "description": "...", "memorialPrefix": "..."} — include only the keys that were present in the input, omit any that were empty/absent. No prose, no markdown fences, no explanation.`;

export type TranslatableCampaignFields = {
  title?: string;
  relation?: string;
  description?: string;
  memorialPrefix?: string;
};

export type TranslationResult =
  | { ok: true; fields: TranslatableCampaignFields }
  | { ok: false; error: string };

/**
 * Translates whichever of the four fields are provided in a single request
 * (cheaper and faster than one call per field). Empty/absent fields are
 * left out of both the request and the response. Never throws — callers
 * always get a typed ok/error result so a translation outage can be
 * surfaced to the admin instead of crashing the save.
 */
export async function translateCampaignFields(fields: TranslatableCampaignFields): Promise<TranslationResult> {
  const entries = Object.entries(fields).filter(([, value]) => value && value.trim().length > 0) as [
    keyof TranslatableCampaignFields,
    string,
  ][];

  if (entries.length === 0) {
    return { ok: true, fields: {} };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY غير مُعرَّف — أضفه في .env.local لتفعيل الترجمة التلقائية.",
    };
  }

  const payload: Record<string, string> = {};
  for (const [key, value] of entries) payload[key] = value.trim();

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_TRANSLATE_MODEL || DEFAULT_MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `فشل طلب الترجمة (${response.status}): ${body.slice(0, 300)}` };
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const textBlock = data.content?.find((block) => block.type === "text");
    const raw = textBlock?.text?.trim();
    if (!raw) return { ok: false, error: "استجابة الترجمة فارغة." };

    const parsed = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
    const result: TranslatableCampaignFields = {};
    for (const key of Object.keys(payload) as (keyof TranslatableCampaignFields)[]) {
      const value = parsed[key];
      if (typeof value === "string" && value.trim()) result[key] = value.trim();
    }

    // Every field we asked for must come back — a partial response means
    // something is off with the model's output, treat it as a failure
    // rather than silently saving an incomplete translation.
    const missing = entries.filter(([key]) => !result[key]);
    if (missing.length > 0) {
      return { ok: false, error: `لم تُترجَم كل الحقول (${missing.map(([k]) => k).join(", ")}).` };
    }

    return { ok: true, fields: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `تعذّر الاتصال بخدمة الترجمة: ${message}` };
  }
}

/** The model occasionally wraps JSON in ```json fences despite instructions not to — strip them defensively rather than failing the parse. */
function stripCodeFence(text: string): string {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}
