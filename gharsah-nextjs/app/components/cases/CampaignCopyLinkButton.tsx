"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, LinkIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { copyText } from "@/app/lib/overlay/copyText";
import { track } from "@/app/lib/analytics/track";

const CONFIRMATION_MS = 2000;
// Explicit one-campaign rollout requested for Turki's grandmother. Duplicates
// or renamed/other campaigns never accidentally inherit this experiment.
const STORY_PREVIEW_CAMPAIGN_ID = "fa762fc9-4982-4e21-917b-cad9460f899c";

/**
 * The one share action on every campaign card (CampaignCard and
 * AlmostThereCard): a small pale, translucent circle pinned to the card's
 * top end corner that copies the campaign's public link in one tap.
 * Turki's grandmother alone also offers the opt-in transparent PNG preview.
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
  const { t, locale } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const timeout = useRef<number | undefined>(undefined);
  const source = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  const downloads = useRef<string[]>([]);
  const completed = campaign.status === "completed";
  const storyPreview = campaign.id === STORY_PREVIEW_CAMPAIGN_ID;
  const labels = locale === "ar"
    ? { share: "مشاركة البطاقة", loading: "جارٍ تجهيز البطاقة…", retry: "إعادة تجهيز البطاقة", close: "إغلاق", hint: "صورة شفافة. أضف ملصق الرابط داخل تطبيق الستوري.", error: "تعذّر تجهيز الصورة. الرابط منسوخ ويمكنك إعادة المحاولة.", saved: "حُفظت البطاقة الشفافة. ألصق الرابط المنسوخ في ملصق الرابط داخل التطبيق." }
    : { share: "Share card", loading: "Preparing card…", retry: "Prepare card again", close: "Close", hint: "Transparent image. Add a link sticker in your story app.", error: "Could not prepare the image. Your link is copied; you can retry.", saved: "Transparent card saved. Paste the copied link into your app’s link sticker." };

  useEffect(() => {
    mounted.current = true;
    const urls = downloads.current;
    return () => {
      mounted.current = false;
      window.clearTimeout(timeout.current);
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  async function prepareCard() {
    if (!source.current) return;
    setPreparing(true);
    setShareFile(null);
    setShareMessage("");
    try {
      const { createCampaignShareImage } = await import("./campaignShareImage");
      const file = await createCampaignShareImage(campaign, locale, source.current, {
        status: t.campaignCard.status[campaign.status],
        progress: campaign.percent === undefined ? "" : t.campaignCard.progressLabel(campaign.percent),
      });
      if (mounted.current) setShareFile(file);
    } catch {
      if (mounted.current) setShareMessage(labels.error);
    } finally {
      if (mounted.current) setPreparing(false);
    }
  }

  async function shareCard() {
    if (!shareFile) return void prepareCard();
    if (navigator.canShare?.({ files: [shareFile] }) && navigator.share) {
      try {
        await navigator.share({ files: [shareFile] });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // Save the same transparent PNG if file sharing is unavailable.
      }
    }
    const url = URL.createObjectURL(shareFile);
    downloads.current.push(url);
    const link = document.createElement("a");
    link.href = url;
    link.download = shareFile.name;
    document.body.append(link);
    link.click();
    link.remove();
    setShareMessage(labels.saved);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    source.current = event.currentTarget.closest("article");
    const path = campaign.shortCode
      ? "/c/" + encodeURIComponent(campaign.shortCode)
      : "/cases/active/" + encodeURIComponent(campaign.slug);
    void copyText(window.location.origin + path, () => {
      setCopied(true);
      if (storyPreview) {
        setShareOpen(true);
        void prepareCard();
      }
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
      {copied && !storyPreview &&
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
      {storyPreview && shareOpen && createPortal(
        <aside
          data-campaign-share-preview={campaign.slug}
          aria-label={labels.share}
          className="fixed inset-x-4 bottom-6 z-[100] mx-auto w-auto max-w-sm rounded-2xl border border-border bg-background/95 p-4 text-foreground shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="flex items-center gap-2 text-sm font-semibold"><CheckIcon className="h-4 w-4 text-primary" />{t.campaignDetail.linkCopied}</p>
            <button type="button" onClick={() => setShareOpen(false)} aria-label={labels.close} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary/10">×</button>
          </div>
          <button type="button" onClick={shareCard} disabled={preparing} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
            {preparing ? labels.loading : shareFile ? labels.share : labels.retry}
          </button>
          <p className="mt-2 text-xs leading-5 text-muted" role="status" aria-live="polite">{shareMessage || labels.hint}</p>
        </aside>, document.body,
      )}
    </>
  );
}
