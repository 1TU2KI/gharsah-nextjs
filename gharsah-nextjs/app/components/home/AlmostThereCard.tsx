"use client";

import Link from "next/link";
import type { Campaign } from "../../lib/campaigns";
import { MemorialLine, statusTheme } from "./CampaignCard";
import { ExternalLinkIcon, PulseIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import DonationTransition from "../cases/DonationTransition";
import { track } from "../../lib/analytics/track";

/**
 * Dedicated card for the اقتربت.../"Almost There" spotlight (see
 * AlmostThereGrid.tsx, used by both the homepage section and the dedicated
 * /near page) — deliberately its OWN component rather than a variant prop
 * bolted onto CampaignCard, so CampaignCard's already-stable markup/classes
 * never need to change for this. Reuses CampaignCard's shared building
 * blocks (MemorialLine, the `active` status theme, DonationTransition) so
 * it still reads as unmistakably the same Gharsah green identity. Every
 * campaign passed in is guaranteed active with a real percent (see
 * getAlmostThereCampaigns), so — unlike CampaignCard — the progress block
 * is never conditionally hidden.
 *
 * No short-link copy action here on purpose: that's a detail-page-only
 * affordance (CampaignDetailClient.tsx) once a visitor has actually opened
 * a specific campaign — these list cards stay focused on getting someone
 * to the campaign itself, not on link management. The short-link system
 * (and its admin panel) is unaffected either way.
 *
 * `rank` drives two things: on `md:`+ screens, AlmostThereGrid's `order-*`
 * classes place #1 in the visual center with #2/#3 flanking it, and the two
 * tiers scale in opposite directions from their shared natural size — #1
 * `md:scale-110` (10% larger), #2/#3 `md:scale-x-95 md:scale-y-95` (~5%
 * smaller on each axis) — so the size gap between them reads clearly
 * without #1 itself ever changing. `md:z-10` on #1 alongside its scale-up
 * keeps its edges/glow from being visually clipped under its now-smaller
 * neighbors. Every other "how prominent this card looks" cue comes from
 * almost-there-card(-rank1) below (background-image + box-shadow) — border
 * color aside, this component no longer borrows CampaignCard's shared
 * statusTheme shadows at all — see that file for the full recipe and why
 * it lives there instead of as composed Tailwind utilities.
 */
export default function AlmostThereCard({ campaign, rank }: { campaign: Campaign; rank: number }) {
  const { t, locale } = useLanguage();
  const theme = statusTheme.active;
  const title = campaign.title[locale];
  const description = campaign.description[locale];
  const percent = campaign.percent ?? 0;
  const remaining = Math.max(0, 100 - percent);
  const isCenter = rank === 1;

  const orderClass = rank === 1 ? "md:order-2" : rank === 2 ? "md:order-1" : "md:order-3";
  // #1 stays exactly as-is — `md:scale-110` plus `md:z-10` so it stacks
  // above its neighbors instead of being clipped under them. #2/#3 instead
  // get a modest scale-DOWN (`scale-x-95`/`scale-y-95`, ~5% off each axis —
  // real Tailwind scale utilities, not a plain CSS class, specifically so
  // they compose correctly with the article's own `hover:-translate-y-2`
  // through Tailwind's shared --tw-scale-x/-y transform variables, exactly
  // like #1's scale-110 already does; a hand-written `transform: scale(...)`
  // override would instead replace the WHOLE transform and silently kill
  // the hover-lift). Both land within the requested 5–7% range; -95 is the
  // closest step on Tailwind's own scale to the requested "~6–8%" width
  // figure without reaching for an arbitrary value here. Symmetric
  // (center-origin) shrink keeps each side card centered on itself, and
  // AlmostThereGrid's `align-items: center` keeps that centered relative to
  // #1 — no separate "re-center" logic needed.
  const prominenceClass = isCenter ? "md:z-10 md:scale-110" : "md:scale-x-95 md:scale-y-95";

  // Border color is still the primary ranking signal — #1 solid brand
  // green, #2/#3 literal white — at the exact same border-2 (2px) weight
  // on all three, unchanged from before. Every other visual "premium" cue
  // (gradient, glow, the dark separation ring that makes the white border
  // actually read against the page, hover response) now lives entirely in
  // one self-contained CSS class per tier — see its own comment in
  // globals.css for why a plain class instead of composed Tailwind ring/
  // shadow utilities, and why it needs an explicit dark-mode override.
  const borderClass = isCenter ? "border-2 border-primary" : "border-2 border-white";
  const glowClass = isCenter ? "almost-there-card-rank1" : "almost-there-card";
  // #1's badge is a solid green fill + white number (vs. #2/#3's neutral
  // white/light fill + green number) so the ranking is legible from the
  // badge alone, not just the card border. #2/#3's badge border now matches
  // their own card's white outline (was the generic --border token before)
  // — plus the same dark-green separation ring the card itself uses (see
  // globals.css), for the same reason: a white ring alone doesn't read
  // against the bright page without it — so the badge visibly "belongs" to
  // its card instead of using a border color that appears nowhere else on
  // it.
  const badgeClass = isCenter
    ? "border-2 border-primary bg-primary text-white ring-2 ring-primary/15"
    : "border-2 border-white bg-background text-primary-dark ring-1 ring-primary-darker/25";

  return (
    <article
      className={`relative flex h-full w-full flex-col rounded-2xl ${borderClass} bg-background/95 ${glowClass} p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-2 has-[a:active]:translate-y-0 md:flex-1 md:basis-0 ${orderClass} ${prominenceClass}`}
    >
      <Link
        href={`/cases/active/${campaign.slug}`}
        onClick={() => track({ type: "campaign_card_click", campaignId: campaign.id, metadata: "almost_there" })}
        className="absolute inset-0 rounded-2xl transition-colors active:bg-primary/5"
        aria-label={title}
      />

      {/* Understated rank badge — a small numbered circle, not a banner.
          #1 is a solid green circle with a white number (see badgeClass);
          #2/#3 keep the original neutral white/light circle + green number. */}
      <span className={`absolute -top-3 start-6 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold shadow-sm ${badgeClass}`}>
        {rank}
      </span>

      {/* #1-only "الأقرب للاكتمال" badge — mirrors the rank circle above
          (same -top-3 offset, same 6-unit inset, opposite edge: start/right
          for the rank circle, end/left for this) so the two read as a
          deliberate top-corner pair rather than one floating and one
          inline. Was previously inline next to the "نشطة" badge; moved here
          and given an OPAQUE bg (bg-primary-50, not the old translucent
          bg-accent/15) specifically so the card's own border doesn't show
          through where this now overlaps it — same mint/green tone and
          text as before, just solid instead of see-through. */}
      {isCenter && (
        <span className="absolute -top-3 end-6 inline-flex items-center whitespace-nowrap rounded-full border border-primary/20 bg-primary-50 px-3 py-1 text-xs font-semibold leading-none text-accent-strong shadow-sm">
          {t.almostThere.closestLabel}
        </span>
      )}

      {/* `justify-between` here — deliberately NOT the same "one giant gap"
          problem a `flex-1`/`mt-auto`/`justify-between`-on-two-groups
          pattern caused before: this container's direct children are SIX
          real, separate content groups (memorial+badges, title,
          description, percent, progress bar, donate button), so the SAME
          leftover vertical space that used to collapse into a single dead
          zone above the footer is now spread across all 5 gaps BETWEEN
          them instead — one gap per pair, matching the brief's named list
          (badges↔title, title↔description, description↔percent,
          percent↔bar, bar↔button) exactly, none of them oversized. `h-full`
          makes this fill the card's own aspect-ratio-driven height (see
          globals.css), and it naturally re-distributes per campaign — a
          shorter title/description just means slightly larger (still
          equal) gaps, never overflow, never a lone empty rectangle. */}
      <div className="flex h-full flex-col justify-between pt-1">
        <div>
          <MemorialLine campaign={campaign} />

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-dark px-3 py-1 text-xs font-semibold leading-none text-white">
              <PulseIcon className="h-3.5 w-3.5" />
              {t.campaignCard.status.active}
            </span>
            <a
              href={campaign.platformHomepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none transition-all active:scale-90 active:brightness-95 ${theme.platformPillClass}`}
            >
              {campaign.platformLabel[locale]}
              {campaign.platformLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny decorative brand mark, not an optimization-critical image
                <img src={campaign.platformLogo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
              ) : (
                <ExternalLinkIcon className="h-3 w-3" />
              )}
            </a>
          </div>
        </div>

        <h3 className="line-clamp-2 text-lg font-bold leading-7 text-foreground">{title}</h3>

        {description && <p className="line-clamp-3 text-sm leading-6 text-muted">{description}</p>}

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-2xl font-extrabold text-primary-dark">{t.almostThere.percentComplete(percent)}</p>
          <p className="text-xs font-semibold text-muted">{t.almostThere.percentRemaining(remaining)}</p>
        </div>

        <div className={`h-2 w-full overflow-hidden rounded-full ${theme.progressTrackClass}`}>
          <div className={`h-full rounded-full ${theme.progressFillClass}`} style={{ width: `${percent}%` }} />
        </div>

        <DonationTransition url={campaign.url} campaignId={campaign.id}>
          {(onDonateClick) => (
            <a
              href={campaign.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDonateClick}
              className={`relative flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all active:scale-95 active:brightness-95 ${theme.buttonClass}`}
            >
              {t.campaignCard.donateButton}
            </a>
          )}
        </DonationTransition>
      </div>
    </article>
  );
}
