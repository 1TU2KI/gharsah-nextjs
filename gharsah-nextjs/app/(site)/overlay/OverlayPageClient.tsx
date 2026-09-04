"use client";

import { useState } from "react";
import OverlayPromoSection from "@/app/components/overlay/OverlayPromoSection";
import GharsahOverlayPromoSection from "@/app/components/overlay/GharsahOverlayPromoSection";
import type { OverlayApiResponse, PickableCampaign } from "@/app/lib/overlay/types";
import type { GharsahOverlayApiResponse } from "@/app/lib/overlay/gharsah/types";

type OverlayCategory = "campaign" | "gharsah";

/**
 * Page shell for the dedicated `/overlay` page — same shell pattern as
 * `/near`/`/cases/active` (centered heading over the shared global
 * background), now hosting
 * TWO overlay categories behind a small client-side tab switch:
 * "أوفرلاي الحملات" (the pre-existing/default one, exactly as it worked
 * before this feature) and "أوفرلاي غرسة" (new). Only the ACTIVE tab's
 * section is ever rendered — never both at once — so an inactive tab's own
 * live-preview polling/timers never run in the background, and switching
 * feels immediate since each section already has real server-fetched data
 * to start from the moment it mounts.
 */
export default function OverlayPageClient({
  overlayUrl,
  overlayData,
  pickableCampaigns,
  gharsahOverlayUrl,
  gharsahOverlayData,
}: {
  overlayUrl: string;
  overlayData: OverlayApiResponse;
  pickableCampaigns: PickableCampaign[];
  gharsahOverlayUrl: string;
  gharsahOverlayData: GharsahOverlayApiResponse;
}) {
  const [category, setCategory] = useState<OverlayCategory>("campaign");

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">الأوفرلاي</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">أدوات البث المباشر الخاصة بغرسة — اختر نوع الأوفرلاي الذي تريد استخدامه في بثك.</p>
          </div>

          {/* اختر نوع الأوفرلاي — "أوفرلاي الحملات" stays the default
              selection (pre-existing behavior, unchanged). Switching tabs
              is purely local UI state, never a navigation/reload. */}
          <div className="mt-8">
            <p className="text-center text-sm font-bold text-foreground">اختر نوع الأوفرلاي</p>
            <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory("campaign")}
                aria-pressed={category === "campaign"}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  category === "campaign"
                    ? "border-primary/50 bg-primary-50/70 text-primary-dark"
                    : "border-primary/15 text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                أوفرلاي الحملات
              </button>
              <button
                type="button"
                onClick={() => setCategory("gharsah")}
                aria-pressed={category === "gharsah"}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  category === "gharsah"
                    ? "border-primary/50 bg-primary-50/70 text-primary-dark"
                    : "border-primary/15 text-muted hover:border-primary/30 hover:text-foreground"
                }`}
              >
                أوفرلاي غرسة
              </button>
            </div>
          </div>

          {category === "campaign" ? (
            <OverlayPromoSection overlayUrl={overlayUrl} overlayData={overlayData} pickableCampaigns={pickableCampaigns} />
          ) : (
            <GharsahOverlayPromoSection overlayUrl={gharsahOverlayUrl} overlayData={gharsahOverlayData} />
          )}
        </div>
      </section>
    </main>
  );
}
