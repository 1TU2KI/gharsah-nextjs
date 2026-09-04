"use server";

import { z } from "zod";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import { setOverlaySettings, type OverlaySettings } from "@/app/lib/db/settings";

const overlaySettingsSchema = z.object({
  enabled: z.boolean(),
  campaignCount: z.number().int().min(1).max(10),
  displayDurationMs: z.number().int().min(2000).max(60000),
  transitionDurationMs: z.number().int().min(100).max(3000),
  restDurationMs: z.number().int().min(0).max(300000),
  showProgress: z.boolean(),
  showRemaining: z.boolean(),
  showShortLink: z.boolean(),
  showLogo: z.boolean(),
  position: z.enum(["top-right", "top-left", "bottom-right", "bottom-left"]),
  theme: z.enum(["dark", "light"]),
  compact: z.boolean(),
  titleText: z.string().trim().max(60),
});

export type OverlaySettingsFormState = { message: string | null; error: string | null };

/**
 * Takes the settings object as built by OverlaySettingsPanel's own local
 * state (mirrors what the live preview is already rendering) rather than
 * FormData — the panel needs full client-side state anyway for the instant
 * preview, so re-deriving it from a submitted form here would just be a
 * second, redundant parse of the same data.
 */
export async function updateOverlaySettingsAction(settings: OverlaySettings): Promise<OverlaySettingsFormState> {
  const session = await requireAdminSession();

  const parsed = overlaySettingsSchema.safeParse(settings);
  if (!parsed.success) {
    return { message: null, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  await setOverlaySettings(parsed.data);
  await logActivity({ action: "settings_updated", targetType: "settings", targetLabel: "overlay", adminUsername: session.username });

  return { message: "تم حفظ إعدادات الأوفرلاي — كل روابط OBS المفتوحة ستأخذ التحديث تلقائيًا خلال ثوانٍ", error: null };
}
