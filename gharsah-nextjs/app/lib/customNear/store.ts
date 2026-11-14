import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * «اصنع صفحتك» — custom اقتربت... pages. LOCAL PROTOTYPE: pages live in an
 * in-memory mock store on the dev server (kept across hot reloads via
 * globalThis, lost on restart). Nothing here touches the database; the
 * proposed table is in db/proposals/custom-near-pages.sql, for review.
 *
 * Off in production builds (CUSTOM_NEAR_PROTOTYPE), so a deploy can never
 * expose a store that doesn't persist: the /near button is hidden and the
 * create/edit/view routes 404.
 */
export const CUSTOM_NEAR_PROTOTYPE = process.env.NODE_ENV !== "production";

/** Same limits enforced by the server actions (and mirrored, for convenience only, by the form). */
export const CUSTOM_NEAR_LIMITS = { titleMin: 3, titleMax: 80, descriptionMax: 280, campaignsMax: 3 } as const;

export const customNearInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(CUSTOM_NEAR_LIMITS.titleMin, `العنوان مطلوب (${CUSTOM_NEAR_LIMITS.titleMin} أحرف على الأقل)`)
    .max(CUSTOM_NEAR_LIMITS.titleMax, `العنوان طويل جدًا (الحد ${CUSTOM_NEAR_LIMITS.titleMax} حرفًا)`),
  description: z
    .string()
    .trim()
    .max(CUSTOM_NEAR_LIMITS.descriptionMax, `الوصف طويل جدًا (الحد ${CUSTOM_NEAR_LIMITS.descriptionMax} حرفًا)`),
  campaignSlugs: z
    .array(z.string().trim().regex(/^[a-z0-9-]{1,120}$/i, "حالة غير صالحة"))
    .min(1, "اختر حالة واحدة على الأقل")
    .max(CUSTOM_NEAR_LIMITS.campaignsMax, `يمكن اختيار ${CUSTOM_NEAR_LIMITS.campaignsMax} حالات كحد أقصى`)
    .refine((s) => new Set(s).size === s.length, "لا يمكن اختيار الحالة نفسها مرتين"),
});

export type CustomNearInput = z.infer<typeof customNearInputSchema>;

/** What a stored page holds. Never the edit token itself — only its SHA-256 hash. */
export type CustomNearPage = {
  id: string;
  title: string;
  description: string;
  /** Campaign references only, in the creator's chosen order (position 1 = the prominent center card). */
  campaignSlugs: string[];
  createdAt: string;
  updatedAt: string;
};

type StoredPage = CustomNearPage & { editTokenHash: string };

const g = globalThis as unknown as {
  __gharsahCustomNear?: { pages: Map<string, StoredPage>; byTokenHash: Map<string, string> };
};
const store = (g.__gharsahCustomNear ??= { pages: new Map(), byTokenHash: new Map() });

// No look-alike characters (0/O, 1/l/I), so the short viewing link survives
// being read aloud or retyped.
const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ID_LENGTH = 12; // 56^12 ≈ 2^69.7 — unguessable, still short

function randomViewId(): string {
  let id = "";
  while (id.length < ID_LENGTH) {
    for (const byte of randomBytes(ID_LENGTH * 2)) {
      // Rejection sampling: 224 = 4 × 56, so no modulo bias.
      if (byte < 224 && id.length < ID_LENGTH) id += ID_ALPHABET[byte % 56];
    }
  }
  return store.pages.has(id) ? randomViewId() : id;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Viewing links are /n/<id>; anything else is rejected before any lookup. */
export const CUSTOM_NEAR_ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);
const EDIT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function publicView(p: StoredPage): CustomNearPage {
  const { editTokenHash: _hidden, ...page } = p;
  void _hidden;
  return page;
}

export function createPage(input: CustomNearInput): { page: CustomNearPage; editToken: string } {
  const editToken = randomBytes(32).toString("base64url"); // 256-bit private edit token
  const now = new Date().toISOString();
  const page: StoredPage = { id: randomViewId(), ...input, createdAt: now, updatedAt: now, editTokenHash: hashToken(editToken) };
  store.pages.set(page.id, page);
  store.byTokenHash.set(page.editTokenHash, page.id);
  return { page: publicView(page), editToken };
}

export function getPageById(id: string): CustomNearPage | null {
  if (!CUSTOM_NEAR_ID_PATTERN.test(id)) return null;
  const p = store.pages.get(id);
  return p ? publicView(p) : null;
}

export function getPageByEditToken(token: string): CustomNearPage | null {
  if (!EDIT_TOKEN_PATTERN.test(token)) return null;
  const id = store.byTokenHash.get(hashToken(token));
  const p = id ? store.pages.get(id) : undefined;
  return p ? publicView(p) : null;
}

/** Same id (so the viewing link never changes), new content. */
export function updatePageByEditToken(token: string, input: CustomNearInput): CustomNearPage | null {
  const existing = getPageByEditToken(token);
  if (!existing) return null;
  const stored = store.pages.get(existing.id)!;
  const updated: StoredPage = { ...stored, ...input, updatedAt: new Date().toISOString() };
  store.pages.set(updated.id, updated);
  return publicView(updated);
}
