"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, LinkIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { copyText } from "@/app/lib/overlay/copyText";
import { track } from "@/app/lib/analytics/track";

const CONFIRMATION_MS = 2000;

/**
 * The one share action on every campaign card (CampaignCard and
 * AlmostThereCard): a small pale, translucent circle pinned to the card's
 * top end corner that copies the campaign's public link in one tap.
 *
 * It sits above the card's stretched detail-page link (`relative z-10`) and
 * also stops the click itself, so copying never opens the campaign or
 * triggers a donation. The "copied" confirmation is a small toast portalled
 * to <body> (cards are transformed on hover, which would otherwise trap a
 * fixed element inside them), so it never covers card text or badges.
 *
 * Cards must keep their top end corner clear for it — see the `pe-10`
 * wrapper around the memorial line and badges in both card components.
 */
export default function CampaignCopyLinkButton({
  campaign,
  className = "top-3",
}: {
  campaign: Campaign;
  /** Vertical placement override (AlmostThereCard sits lower to clear its #1 badge). */
  className?: string;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  const completed = campaign.status === "completed";

  useEffect(() => () => window.clearTimeout(timeout.current), []);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const path = campaign.shortCode
      ? "/c/" + encodeURIComponent(campaign.shortCode)
      : "/cases/active/" + encodeURIComponent(campaign.slug);
    void copyText(window.location.origin + path, () => {
      setCopied(true);
      track({ type: "campaign_link_copy", campaignId: campaign.id });
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? t.campaignDetail.linkCopied : t.campaignDetail.copyLink}
        title={t.campaignDetail.copyLink}
        className={`copy-link-btn ${completed ? "copy-link-btn--completed" : ""} absolute end-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${className}`}
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      </button>
      {copied &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 bottom-6 z-[100] mx-auto w-fit rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg ${
              completed ? "bg-completed" : "bg-primary-dark"
            }`}
          >
            {t.campaignDetail.linkCopied}
          </div>,
          document.body,
        )}
    </>
  );
}
