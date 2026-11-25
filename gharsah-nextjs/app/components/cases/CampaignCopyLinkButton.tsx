"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, LinkIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { copyText } from "@/app/lib/overlay/copyText";
import { track } from "@/app/lib/analytics/track";

const CONFIRMATION_MS = 2000;
const LINK_COPIED_EVENT = "gharsah:campaign-link-copied";

/**
 * The one share action on every campaign card (CampaignCard and
 * AlmostThereCard): a small pale, translucent circle pinned to the card's
 * top end corner that copies the official campaign URL in one tap.
 * Every active campaign also offers a transparent PNG download.
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
  const copyActionId = useId();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [saveToPhotos, setSaveToPhotos] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const timeout = useRef<number | undefined>(undefined);
  const source = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  const downloads = useRef<string[]>([]);
  const photoClose = useRef<HTMLButtonElement>(null);
  const completed = campaign.status === "completed";
  const cardDownloadEnabled = campaign.status === "active";
  const labels = locale === "ar"
    ? { download: "تحميل البطاقة", photos: "حفظ البطاقة في الصور", photoHint: "افتح البطاقة واحفظها في الصور بالضغط المطوّل.", photoFooter: "احفظ البطاقة، ثم أضفها فوق أي خلفية وألصق رابط الحالة المنسوخ عليها.", mobileHint: "افتح البطاقة واحفظها في الصور بالضغط المطوّل.", loading: "جارٍ تجهيز البطاقة…", retry: "إعادة تجهيز البطاقة", close: "إغلاق", hint: "حمّل البطاقة وضعها فوق أي خلفية، ثم ألصق رابط الحالة المنسوخ عليها.", error: "تعذّر تجهيز الصورة. الرابط منسوخ ويمكنك إعادة المحاولة.", saved: "بدأ تحميل البطاقة. ضعها فوق أي خلفية، ثم ألصق رابط الحالة المنسوخ عليها." }
    : { download: "Download card", photos: "Save card to Photos", photoHint: "Open the card, then touch and hold the image to save it to Photos.", photoFooter: "Save the card, place it over any background, then paste the copied campaign link onto it.", mobileHint: "Open the card, then touch and hold the image to save it to Photos.", loading: "Preparing card…", retry: "Prepare card again", close: "Close", hint: "Download the card, place it over any background, then paste the copied campaign link onto it.", error: "Could not prepare the image. Your link is copied; you can retry.", saved: "Download started. Place the card over any background, then paste the copied campaign link onto it." };

  useEffect(() => {
    mounted.current = true;
    const urls = downloads.current;
    // Only the card whose link is on the clipboard may offer a download,
    // including when the same campaign appears in multiple homepage sections.
    function dismissOtherCards(event: Event) {
      if ((event as CustomEvent<string>).detail === copyActionId) return;
      setCopied(false);
      setShareOpen(false);
      setPhotoUrl(null);
    }
    window.addEventListener(LINK_COPIED_EVENT, dismissOtherCards);
    return () => {
      mounted.current = false;
      window.removeEventListener(LINK_COPIED_EVENT, dismissOtherCards);
      window.clearTimeout(timeout.current);
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [copyActionId]);

  useEffect(() => {
    if (!photoUrl) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    photoClose.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoUrl(null);
      if (event.key === "Tab") {
        event.preventDefault();
        photoClose.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      URL.revokeObjectURL(photoUrl);
      previousFocus?.focus();
    };
  }, [photoUrl]);

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

  function downloadCard() {
    if (!shareFile) return void prepareCard();
    const url = URL.createObjectURL(shareFile);
    downloads.current.push(url);
    if (saveToPhotos) {
      // Browsers cannot write directly to the Photos library. A real image
      // preserves the mobile browser's native long-press Save Image action.
      setPhotoUrl(url);
      return;
    }
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
    void copyText(campaign.url, () => {
      window.dispatchEvent(new CustomEvent(LINK_COPIED_EVENT, { detail: copyActionId }));
      setCopied(true);
      if (cardDownloadEnabled) {
        setSaveToPhotos(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024));
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
        aria-label={copied ? t.campaignDetail.linkCopied : t.campaignCard.copyLink}
        title={t.campaignCard.copyLink}
        className={`copy-link-btn ${completed ? "copy-link-btn--completed" : ""} absolute end-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${className}`}
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      </button>
      {copied && !cardDownloadEnabled &&
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
      {cardDownloadEnabled && shareOpen && createPortal(
        <aside
          data-campaign-share-preview={campaign.slug}
          aria-label={labels.download}
          className="glass-surface glass-clear fixed inset-x-4 bottom-6 z-[100] mx-auto w-auto max-w-[21rem] rounded-2xl border border-border/50 p-4 text-foreground shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="flex items-center gap-2 text-sm font-semibold"><CheckIcon className="h-4 w-4 text-primary" />{t.campaignDetail.linkCopied}</p>
            <button type="button" onClick={() => setShareOpen(false)} aria-label={labels.close} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-primary/10">×</button>
          </div>
          <button type="button" onClick={downloadCard} disabled={preparing} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
            {preparing ? labels.loading : shareFile ? (saveToPhotos ? labels.photos : labels.download) : labels.retry}
          </button>
          <p className="mt-2 text-xs leading-5 text-muted" role="status" aria-live="polite">{shareMessage || (saveToPhotos ? labels.mobileHint : labels.hint)}</p>
        </aside>, document.body,
      )}
      {photoUrl && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.photos}
          data-campaign-photo-save={campaign.slug}
          onClick={(event) => { if (event.target === event.currentTarget) setPhotoUrl(null); }}
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="glass-surface glass-clear relative w-full max-w-lg rounded-2xl border border-border/50 p-4 text-foreground shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">{labels.photos}</h2>
              <button ref={photoClose} type="button" onClick={() => setPhotoUrl(null)} aria-label={labels.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-primary/10">×</button>
            </div>
            <p className="mb-4 text-sm leading-6 text-foreground">{labels.photoHint}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- A native blob image is required for mobile long-press Save Image. */}
            <img src={photoUrl} alt={campaign.title[locale]} className="block max-h-[60dvh] w-full select-auto object-contain" style={{ WebkitTouchCallout: "default" }} />
            <p className="mt-4 text-xs leading-5 text-muted">{labels.photoFooter}</p>
          </div>
        </div>, document.body,
      )}
    </>
  );
}
