"use client";

import Link from "next/link";
import type { Campaign } from "../../lib/campaigns";
import { CheckBadgeIcon, ExternalLinkIcon, PulseIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import DonationTransition from "../cases/DonationTransition";
import { track } from "../../lib/analytics/track";

/**
 * All status-dependent visual styling in one place. Completed campaigns use
 * a dedicated blue-green palette built from one exact brand color, #0C787E
 * (badge, progress bar, platform pill, donate button, and card hover
 * accents all derive from it) so the whole card/detail page reads as
 * "completed" at a glance, while active campaigns keep the existing green
 * identity untouched.
 */
export const statusTheme: Record<
  Campaign["status"],
  {
    badgeClass: string;
    platformPillClass: string;
    progressTrackClass: string;
    progressFillClass: string;
    buttonClass: string;
    cardBorderHoverClass: string;
    cardShadowClass: string;
    /** Tier 2 material for the campaign detail page — a distinctly deeper
     * shadow than the grid card's own (Tier 3), same color family per
     * status, so the detail view visibly sits "higher" than a list card. */
    detailShadowClass: string;
    usernameClass: string;
  }
> = {
  active: {
    badgeClass: "bg-primary-dark text-white",
    platformPillClass: "bg-primary-50 text-primary-dark hover:bg-primary-100",
    progressTrackClass: "bg-primary-100",
    progressFillClass: "bg-gradient-to-l from-primary to-primary-light",
    buttonClass:
      "bg-accent text-on-accent shadow-[0_6px_16px_-6px_rgba(20,83,45,0.4)] hover:bg-accent-strong hover:shadow-[0_8px_20px_-6px_rgba(20,83,45,0.5)]",
    cardBorderHoverClass: "hover:border-primary/30",
    cardShadowClass:
      "shadow-[0_1px_2px_rgba(20,83,45,0.05),0_16px_32px_-12px_rgba(20,83,45,0.16)] hover:shadow-[0_2px_4px_rgba(20,83,45,0.07),0_22px_40px_-12px_rgba(20,83,45,0.22)]",
    detailShadowClass: "shadow-[0_4px_10px_rgba(20,83,45,0.10),0_32px_64px_-20px_rgba(20,83,45,0.30)]",
    usernameClass: "text-primary",
  },
  completed: {
    badgeClass: "bg-[#0C787E] text-white",
    platformPillClass: "bg-[#E7F2F2] text-[#0C787E] hover:bg-[#DBEBEC]",
    progressTrackClass: "bg-[#DBEBEC]",
    progressFillClass: "bg-gradient-to-l from-[#0C787E] to-[#308C91]",
    buttonClass:
      "bg-[#0C787E] text-white shadow-[0_6px_16px_-6px_rgba(12,120,126,0.45)] hover:bg-[#0A666B] hover:shadow-[0_8px_20px_-6px_rgba(12,120,126,0.55)]",
    cardBorderHoverClass: "hover:border-[#0C787E]/30",
    cardShadowClass:
      "shadow-[0_1px_2px_rgba(12,120,126,0.06),0_16px_32px_-12px_rgba(12,120,126,0.18)] hover:shadow-[0_2px_4px_rgba(12,120,126,0.08),0_22px_40px_-12px_rgba(12,120,126,0.24)]",
    detailShadowClass: "shadow-[0_4px_10px_rgba(12,120,126,0.12),0_32px_64px_-20px_rgba(12,120,126,0.32)]",
    usernameClass: "text-[#0C787E]",
  },
  closed: {
    badgeClass: "bg-border text-muted",
    platformPillClass: "bg-primary-50 text-primary-dark hover:bg-primary-100",
    progressTrackClass: "bg-primary-100",
    progressFillClass: "bg-gradient-to-l from-primary to-primary-light",
    buttonClass:
      "bg-accent text-on-accent shadow-[0_6px_16px_-6px_rgba(20,83,45,0.4)] hover:bg-accent-strong hover:shadow-[0_8px_20px_-6px_rgba(20,83,45,0.5)]",
    cardBorderHoverClass: "hover:border-primary/30",
    usernameClass: "text-primary",
    cardShadowClass:
      "shadow-[0_1px_2px_rgba(20,83,45,0.05),0_16px_32px_-12px_rgba(20,83,45,0.16)] hover:shadow-[0_2px_4px_rgba(20,83,45,0.07),0_22px_40px_-12px_rgba(20,83,45,0.22)]",
    detailShadowClass: "shadow-[0_4px_10px_rgba(20,83,45,0.10),0_32px_64px_-20px_rgba(20,83,45,0.30)]",
  },
};

/**
 * Single canonical memorial-line format, used everywhere a campaign is
 * shown (cards, detail pages, homepage previews) so every campaign is
 * guaranteed identical structure with no per-place exceptions:
 *
 *   {relation} {@username} {رحمه/رحمها الله}
 *
 * Relation always comes first, the username (if any) immediately after in
 * an isolated LTR span (correct bidi handling for mixed Arabic/English),
 * and the "رحمه/رحمها الله" phrase (if any) always last. No separators
 * ("/", "·", "|") — exactly one space between whichever parts exist.
 * Campaigns with neither a username nor a prefix (e.g. a community
 * campaign) simply show the relation text alone.
 */
export function MemorialLine({ campaign }: { campaign: Campaign }) {
  const { locale } = useLanguage();

  return (
    <p className="text-sm text-muted">
      {campaign.relation[locale]}
      {campaign.username && (
        <>
          {" "}
          <bdi className={`font-bold ${statusTheme[campaign.status].usernameClass}`} dir="ltr">
            @{campaign.username}
          </bdi>
        </>
      )}
      {campaign.memorialPrefix && ` ${campaign.memorialPrefix[locale]}`}
    </p>
  );
}

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { t, locale } = useLanguage();
  const theme = statusTheme[campaign.status];
  const platformLogo = campaign.platformLogo;
  const title = campaign.title[locale];
  const description = campaign.description[locale];

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border border-border bg-background/90 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-2 has-[a:active]:translate-y-0 ${theme.cardShadowClass} ${theme.cardBorderHoverClass}`}
    >
      {/* Stretched link: makes the entire card clickable to the detail page.
          Sits below the platform pill and donate button in stacking order
          (they're `relative`, this is `absolute`) so those two remain
          independently clickable without any JS event handling. */}
      <Link
        href={`/cases/active/${campaign.slug}`}
        onClick={() => track({ type: "campaign_card_click", campaignId: campaign.id })}
        className="absolute inset-0 rounded-2xl transition-colors active:bg-primary/5"
        aria-label={title}
      />

      <div className="flex flex-1 flex-col">
        <div>
          <MemorialLine campaign={campaign} />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none ${theme.badgeClass}`}
            >
              {campaign.status === "completed" && <CheckBadgeIcon className="h-3.5 w-3.5" />}
              {campaign.status === "active" && <PulseIcon className="h-3.5 w-3.5" />}
              {t.campaignCard.status[campaign.status]}
            </span>

            <a
              href={campaign.platformHomepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none transition-all active:scale-90 active:brightness-95 ${theme.platformPillClass}`}
            >
              {campaign.platformLabel[locale]}
              {platformLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- tiny decorative brand mark, not an optimization-critical image
                <img src={platformLogo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
              ) : (
                <ExternalLinkIcon className="h-3 w-3" />
              )}
            </a>
          </div>

          <h3 className="mt-2 text-lg font-bold leading-7 text-foreground">{title}</h3>

          {description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{description}</p>}
        </div>

        {/* Anchored to the bottom of the flex-1 area (not right after the
            description) so its vertical position stays fixed across cards
            regardless of title/description/memorial-line length — only the
            whitespace above it grows or shrinks. */}
        {campaign.percent !== undefined && (
          <div className="mt-auto pt-4">
            <div className={`h-2 w-full overflow-hidden rounded-full ${theme.progressTrackClass}`}>
              <div
                className={`h-full rounded-full ${theme.progressFillClass}`}
                style={{ width: `${campaign.percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">{t.campaignCard.progressLabel(campaign.percent)}</p>
          </div>
        )}
      </div>

      {/* The donate link itself — href, target, rel, classes, and label —
          is completely unchanged; DonationTransition only supplies the
          click handler that inserts the shared "اجعل نيتك أوسع" pause
          before opening the official campaign, via a render prop, so this
          element's design stays untouched here too. */}
      <DonationTransition url={campaign.url} campaignId={campaign.id}>
        {(onDonateClick) => (
          <a
            href={campaign.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDonateClick}
            className={`relative mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all active:scale-95 active:brightness-95 ${theme.buttonClass}`}
          >
            {t.campaignCard.donateButton}
          </a>
        )}
      </DonationTransition>
    </article>
  );
}
