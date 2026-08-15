"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Campaign } from "../../lib/campaigns";
import { MemorialLine, statusTheme } from "./CampaignCard";
import { CheckIcon, ExternalLinkIcon, LinkIcon, PulseIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";
import DonationTransition from "../cases/DonationTransition";
import { track } from "../../lib/analytics/track";

const COPY_CONFIRMATION_MS = 2000;

/**
 * Dedicated card for the اقتربت.../"Almost There" spotlight section (see
 * AlmostThereSection.tsx) — deliberately its OWN component rather than a
 * variant prop bolted onto CampaignCard, so CampaignCard's already-stable
 * markup/classes never need to change for this. Reuses CampaignCard's
 * shared building blocks (MemorialLine, the `active` status theme,
 * DonationTransition) so it still reads as unmistakably the same Gharsah
 * green identity — just with more emphasis (rank badge, explicit remaining
 * %, a short-link copy action) than the grid card gives any single
 * campaign. Every campaign passed in is guaranteed active with a real
 * percent (see getAlmostThereCampaigns), so — unlike CampaignCard — the
 * progress block is never conditionally hidden.
 */
export default function AlmostThereCard({ campaign, rank }: { campaign: Campaign; rank: number }) {
  const { t, locale } = useLanguage();
  const theme = statusTheme.active;
  const title = campaign.title[locale];
  const description = campaign.description[locale];
  const percent = campaign.percent ?? 0;
  const remaining = Math.max(0, 100 - percent);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef<number | undefined>(undefined);

  async function handleCopyShortLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!campaign.shortCode) return;
    const shareUrl = `${window.location.origin}/c/${campaign.shortCode}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      track({ type: "campaign_link_copy", campaignId: campaign.id, metadata: "short_link" });
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setLinkCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Clipboard write denied/unavailable — fail quietly, same as the
      // detail page's own copy-link button.
    }
  }

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border border-primary/20 bg-background/95 p-6 shadow-[0_1px_2px_rgba(20,83,45,0.06),0_18px_36px_-14px_rgba(20,83,45,0.24)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-2 hover:border-primary/35 hover:shadow-[0_2px_4px_rgba(20,83,45,0.08),0_24px_44px_-14px_rgba(20,83,45,0.3)] has-[a:active]:translate-y-0`}
    >
      <Link
        href={`/cases/active/${campaign.slug}`}
        onClick={() => track({ type: "campaign_card_click", campaignId: campaign.id, metadata: "almost_there" })}
        className="absolute inset-0 rounded-2xl transition-colors active:bg-primary/5"
        aria-label={title}
      />

      {/* Understated rank badge — a small numbered circle, not a banner or
          a color change, per the brief's "keep this understated." */}
      <span className="absolute -top-3 start-6 flex h-7 w-7 items-center justify-center rounded-full border border-primary/25 bg-background text-xs font-extrabold text-primary-dark shadow-sm">
        {rank}
      </span>

      <div className="flex flex-1 flex-col pt-1">
        <div>
          <MemorialLine campaign={campaign} />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-dark px-3 py-1 text-xs font-semibold leading-none text-white">
              <PulseIcon className="h-3.5 w-3.5" />
              {t.campaignCard.status.active}
            </span>
            {rank === 1 && (
              <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold leading-none text-accent-strong">
                {t.almostThere.closestLabel}
              </span>
            )}
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

          <h3 className="mt-2 text-lg font-bold leading-7 text-foreground">{title}</h3>

          {description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{description}</p>}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-extrabold text-primary-dark">{t.almostThere.percentComplete(percent)}</p>
            <p className="text-xs font-semibold text-muted">{t.almostThere.percentRemaining(remaining)}</p>
          </div>
          <div className={`mt-2 h-2 w-full overflow-hidden rounded-full ${theme.progressTrackClass}`}>
            <div className={`h-full rounded-full ${theme.progressFillClass}`} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <DonationTransition url={campaign.url} campaignId={campaign.id}>
            {(onDonateClick) => (
              <a
                href={campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onDonateClick}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all active:scale-95 active:brightness-95 ${theme.buttonClass}`}
              >
                {t.campaignCard.donateButton}
              </a>
            )}
          </DonationTransition>

          {/* Streamer-sharing hook: the compact /c/<code> link, copyable
              right from the card — the whole point of this section existing
              is to make sharing effortless during a stream. */}
          {campaign.shortCode && (
            <button
              type="button"
              onClick={handleCopyShortLink}
              aria-live="polite"
              title={linkCopied ? t.almostThere.shortLinkCopied : t.almostThere.copyShortLink}
              className={`relative flex shrink-0 items-center justify-center rounded-full border p-2.5 transition-all active:scale-95 ${
                linkCopied
                  ? "border-primary/60 bg-primary-100 text-primary-dark"
                  : "border-primary/30 bg-primary-50/70 text-primary-dark hover:border-primary/60 hover:bg-primary-100"
              }`}
            >
              {linkCopied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
