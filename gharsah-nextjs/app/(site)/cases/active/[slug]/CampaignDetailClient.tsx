"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MemorialLine, statusTheme } from "@/app/components/home/CampaignCard";
import { CheckBadgeIcon, CheckIcon, ExternalLinkIcon, LinkIcon, PulseIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import SectionBackdrop from "@/app/components/decor/SectionBackdrop";
import DonationTransition from "@/app/components/cases/DonationTransition";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { track } from "@/app/lib/analytics/track";

const COPY_CONFIRMATION_MS = 2000;

export default function CampaignDetailClient({ campaign }: { campaign: Campaign }) {
  const { t, locale } = useLanguage();
  const theme = statusTheme[campaign.status];
  const platformLogo = campaign.platformLogo;
  // Same "completed" grouping already used for the backdrop tone below —
  // kept as one condition so the back link stays consistent with it rather
  // than introducing a second, differently-scoped status rule.
  const isCompleted = campaign.status === "completed";
  const backdropTone = isCompleted ? "teal" : "green";
  const backLinkHref = isCompleted ? "/cases/completed" : "/cases/active";
  const backLinkLabel = isCompleted ? t.campaignDetail.backLinkCompleted : t.campaignDetail.backLinkActive;
  const backLinkColorClass = isCompleted ? "text-[#0C787E]" : "text-primary-dark";
  // Reuses the exact same status-colored tokens the rest of this page/the
  // cards already use (`#0C787E`/`#E7F2F2`/`#DBEBEC` for completed, the
  // `primary`/`primary-50`/`primary-100`/`primary-dark` scale for active) —
  // no new colors, just applied to this one secondary button too.
  const copyLinkButtonClass = isCompleted
    ? "border-[#0C787E]/30 bg-[#E7F2F2]/70 text-[#0C787E] hover:border-[#0C787E]/60 hover:bg-[#DBEBEC] active:bg-[#DBEBEC]"
    : "border-primary/30 bg-primary-50/70 text-primary-dark hover:border-primary/60 hover:bg-primary-100 active:bg-primary-100";
  const copyLinkCopiedClass = isCompleted
    ? "border-[#0C787E]/60 bg-[#DBEBEC] text-[#0C787E]"
    : "border-primary/60 bg-primary-100 text-primary-dark";
  const title = campaign.title[locale];
  const description = campaign.description[locale];
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(copyTimeoutRef.current);
  }, []);

  // Once per mount (a fresh navigation to this detail page, from any
  // source — a card, a shared/copied link, the random-pick feature, a
  // search engine, directly typing the URL) — deliberately not re-fired on
  // e.g. a language toggle, which re-renders this component but isn't a new
  // "view". The ref guard (same pattern as PageViewTracker.tsx) is what
  // keeps this to exactly one event despite React's development-only
  // Strict Mode replaying effects (mount→cleanup→mount) on initial mount —
  // confirmed by direct testing that without it, this fires twice.
  const detailViewTracked = useRef<string | null>(null);
  useEffect(() => {
    if (detailViewTracked.current === campaign.id) return;
    detailViewTracked.current = campaign.id;
    track({ type: "campaign_detail_view", campaignId: campaign.id });
  }, [campaign.id]);

  async function handleCopyLink() {
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers / non-secure contexts without the
        // Clipboard API — a temporary offscreen textarea + execCommand.
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
      track({ type: "campaign_link_copy", campaignId: campaign.id });
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setLinkCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Clipboard write denied/unavailable — fail quietly, no broken UI;
      // the button simply never shows the "copied" confirmation.
    }
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <SectionBackdrop tone={backdropTone} />

        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={backLinkHref}
              className={`text-sm font-semibold transition-colors hover:underline active:opacity-70 ${backLinkColorClass}`}
            >
              {backLinkLabel}
            </Link>

            {/* Secondary utility action, deliberately kept small/outlined
                (not the donate button's filled, high-emphasis style) and
                placed away from it — shares the internal Gharsah page link,
                never the external donation URL. */}
            <button
              type="button"
              onClick={handleCopyLink}
              aria-live="polite"
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                linkCopied ? copyLinkCopiedClass : copyLinkButtonClass
              }`}
            >
              {linkCopied ? (
                <CheckIcon className="h-4 w-4 shrink-0" />
              ) : (
                <LinkIcon className="h-4 w-4 shrink-0" />
              )}
              {linkCopied ? t.campaignDetail.linkCopied : t.campaignDetail.copyLink}
            </button>
          </div>

          {/* Tier 2 material: a distinctly deeper shadow (detailShadowClass)
              than the grid card's own Tier 3 shadow, so the focused detail
              view visibly sits "higher" than a list card. */}
          <div
            className={`mt-6 overflow-hidden rounded-2xl border border-border bg-background/88 p-8 backdrop-blur-md transition-shadow ${theme.detailShadowClass}`}
          >
            <MemorialLine campaign={campaign} />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${theme.badgeClass}`}
              >
                {campaign.status === "completed" && <CheckBadgeIcon className="h-3.5 w-3.5" />}
                {campaign.status === "active" && <PulseIcon className="h-3.5 w-3.5" />}
                {t.campaignCard.status[campaign.status]}
              </span>

              <a
                href={campaign.platformHomepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-90 active:brightness-95 ${theme.platformPillClass}`}
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

            <h1 className="mt-2 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">{title}</h1>

            {description && <p className="mt-4 leading-8 text-foreground/80">{description}</p>}

            {campaign.percent !== undefined && (
              <div className="mt-6 rounded-2xl bg-wash/60 p-5">
                <div className={`h-2.5 w-full overflow-hidden rounded-full ${theme.progressTrackClass}`}>
                  <div
                    className={`h-full rounded-full ${theme.progressFillClass}`}
                    style={{ width: `${campaign.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">{t.campaignCard.progressLabel(campaign.percent)}</p>
              </div>
            )}

            {/* The donate link itself — href, target, rel, classes, and
                label — is completely unchanged from before; DonationTransition
                only supplies the click handler that inserts the brief pause,
                via a render prop, so this element's design is untouched. */}
            <DonationTransition url={campaign.url} campaignId={campaign.id}>
              {(onDonateClick) => (
                <a
                  href={campaign.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onDonateClick}
                  className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-base font-semibold transition-all active:scale-95 active:brightness-95 ${theme.buttonClass}`}
                >
                  {t.campaignCard.donateButton}
                </a>
              )}
            </DonationTransition>
            <p className="mt-3 text-center text-xs text-muted">{t.campaignDetail.donateDisclaimer}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
