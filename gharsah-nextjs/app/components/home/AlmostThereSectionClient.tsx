"use client";

import AlmostThereCard from "./AlmostThereCard";
import SectionBackdrop from "../decor/SectionBackdrop";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import type { Campaign } from "../../lib/campaigns";

/**
 * "اقتربت..." / "Almost There" — a spotlight of (at most) the 3 active
 * campaigns closest to completion, not a browsable list, so unlike
 * ActiveCasesSectionClient this has no "view all" link or total count: the
 * whole point is a short, always-current highlight reel a streamer can
 * glance at, not a section to paginate through. Same green identity/backdrop
 * tone as Active Cases (see AlmostThereCard.tsx's own doc comment for how
 * the extra emphasis is carried instead — rank badges and explicit
 * remaining-% text, never a different color family).
 */
export default function AlmostThereSectionClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();

  return (
    <section className="relative overflow-x-hidden py-20">
      <SectionBackdrop tone="green" />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2
            className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
          >
            {t.almostThere.heading}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted">{t.almostThere.description}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign, index) => (
            <AlmostThereCard key={campaign.slug} campaign={campaign} rank={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
