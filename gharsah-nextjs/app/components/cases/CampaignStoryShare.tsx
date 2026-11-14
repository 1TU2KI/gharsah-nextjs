"use client";

import { useEffect, useRef, useState } from "react";
import { LinkIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";

const CARD_WIDTH = 888;
const SITE_ORIGIN = "https://gharsah.sa";

const copy = {
  ar: {
    open: "شارك الحالة كستوري",
    heading: "شارك الحالة كستوري",
    close: "إغلاق",
    preview: "بطاقة الحالة بخلفية شفافة",
    preparing: "جارٍ تجهيز الصورة…",
    share: "مشاركة كستوري",
    download: "تحميل الصورة",
    copy: "نسخ رابط الحالة",
    copied: "تم نسخ رابط الحالة.",
    linkHint: "البطاقة بخلفية شفافة لتضعها فوق صورتك أو مقطعك. إذا وصلت الصورة وحدها إلى إنستغرام أو سناب شات، انسخ رابط الحالة وألصقه في ملصق الرابط داخل الستوري.",
    noShare: "متصفحك لا يدعم المشاركة المباشرة، فحمّلنا الصورة لك. ارفعها من داخل التطبيق.",
    shareError: "تعذّرت المشاركة. حمّل الصورة وارفعها من داخل التطبيق.",
    copyError: "تعذّر النسخ التلقائي. يمكنك تحديد الرابط ونسخه يدويًا.",
    imageError: "تعذّر تجهيز الصورة. انسخ رابط الحالة بدلًا من ذلك.",
    progress: (percent: number) => String(percent) + "٪ مكتملة",
  },
  en: {
    open: "Share as a story",
    heading: "Share as a story",
    close: "Close",
    preview: "Campaign card with a transparent background",
    preparing: "Preparing image…",
    share: "Share as a story",
    download: "Download image",
    copy: "Copy campaign link",
    copied: "Campaign link copied.",
    linkHint: "The card has a transparent background so you can place it over your own photo or video. If Instagram or Snapchat receives only the image, copy the campaign link and paste it into the story’s link sticker.",
    noShare: "Your browser can’t share directly, so we downloaded the image. Upload it from your app.",
    shareError: "Sharing failed. Download the image and upload it from your app.",
    copyError: "Automatic copying failed. You can select and copy the link manually.",
    imageError: "Couldn’t prepare the image. Copy the campaign link instead.",
    progress: (percent: number) => String(percent) + "% complete",
  },
} as const;

/** Splits text into at most `maxLines` lines that fit `maxWidth`. */
function wrapLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\s+/u)) {
    const candidate = line ? line + " " + word : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[maxLines - 1] += "…";
  return visible;
}

/**
 * The story card as a standalone transparent PNG, cropped tightly around
 * the rounded card: everything outside it is fully transparent, the card's
 * own fill is a partially transparent glass (72–78% white, so the visitor's
 * photo or video shows through while the dark title stays ≥4.8:1 even over
 * pure black), with a thin reflective edge and a soft top sheen. The title,
 * percentage and progress bar are drawn fully opaque.
 */
async function renderStory(campaign: Campaign, locale: keyof typeof copy, fontFamily: string): Promise<File> {
  const labels = copy[locale];
  await document.fonts.ready;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas is unavailable.");
  measure.font = "bold 64px " + fontFamily;
  const lines = wrapLines(measure, campaign.title[locale], 760, 5);
  const percent =
    typeof campaign.percent === "number" && Number.isFinite(campaign.percent)
      ? Math.max(0, Math.min(100, campaign.percent))
      : null;

  const inset = 4; // room for the edge stroke's antialiasing
  const lineHeight = 84;
  const padding = 80;
  const cardHeight = padding * 2 + lines.length * lineHeight + (percent === null ? 0 : 150);
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH + inset * 2;
  canvas.height = cardHeight + inset * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  const x = inset;
  const y = inset;
  const radius = 56;
  const card = new Path2D();
  card.roundRect(x, y, CARD_WIDTH, cardHeight, radius);

  // Glass fill: partially transparent, slightly clearer toward the bottom.
  const fill = ctx.createLinearGradient(0, y, 0, y + cardHeight);
  fill.addColorStop(0, "rgba(249, 253, 247, 0.78)");
  fill.addColorStop(1, "rgba(249, 253, 247, 0.72)");
  ctx.fillStyle = fill;
  ctx.fill(card);

  // Soft sheen across the top of the card (inside the card only).
  ctx.save();
  ctx.clip(card);
  const sheen = ctx.createLinearGradient(0, y, 0, y + cardHeight * 0.45);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, CARD_WIDTH, cardHeight * 0.45);
  ctx.restore();

  // Thin reflective edge: bright at the top-left, fading, catching light
  // again at the bottom-right; plus a faint inner line for definition.
  const edge = ctx.createLinearGradient(x, y, x + CARD_WIDTH, y + cardHeight);
  edge.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  edge.addColorStop(0.45, "rgba(255, 255, 255, 0.4)");
  edge.addColorStop(1, "rgba(255, 255, 255, 0.85)");
  ctx.lineWidth = 3;
  ctx.strokeStyle = edge;
  ctx.stroke(card);
  const innerEdge = new Path2D();
  innerEdge.roundRect(x + 3, y + 3, CARD_WIDTH - 6, cardHeight - 6, radius - 3);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(23, 62, 54, 0.12)";
  ctx.stroke(innerEdge);

  // Opaque content.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = locale === "ar" ? "rtl" : "ltr";
  const centerX = x + CARD_WIDTH / 2;
  ctx.fillStyle = "#173e36";
  ctx.font = "bold 64px " + fontFamily;
  lines.forEach((line, index) => ctx.fillText(line, centerX, y + padding + lineHeight / 2 + index * lineHeight, 760));

  if (percent !== null) {
    const textY = y + padding + lines.length * lineHeight + 60;
    ctx.font = "bold 44px " + fontFamily;
    ctx.fillText(labels.progress(percent), centerX, textY);
    const barX = centerX - 320;
    ctx.fillStyle = "#acddb5";
    ctx.beginPath();
    ctx.roundRect(barX, textY + 50, 640, 14, 7);
    ctx.fill();
    const fillWidth = (640 * percent) / 100;
    if (fillWidth > 0) {
      ctx.fillStyle = "#247465";
      ctx.beginPath();
      ctx.roundRect(locale === "ar" ? barX + 640 - fillWidth : barX, textY + 50, fillWidth, 14, 7);
      ctx.fill();
    }
  }

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve(new File([blob], "gharsah-story-card.png", { type: "image/png" }));
    }, "image/png");
  });
}

/**
 * «شارك الحالة كستوري»: a quick share flow. The transparent story card is prepared in
 * the background as soon as the share icon is on the page, so the preview
 * opens ready and «مشاركة كستوري» calls the native share sheet directly
 * inside the tap (browsers require a fresh tap for `navigator.share`). The
 * image and the public campaign link are shared together where the browser
 * allows; story apps may still keep only the image, so the link-sticker
 * hint and the copy-link fallback stay visible.
 */
export default function CampaignStoryShare({ campaign }: { campaign: Campaign }) {
  const { locale } = useLanguage();
  const labels = copy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const path = campaign.shortCode
    ? "/c/" + encodeURIComponent(campaign.shortCode)
    : "/cases/active/" + encodeURIComponent(campaign.slug);
  // The one public campaign link: shared with the image and copied by "Copy campaign link".
  const link = SITE_ORIGIN + path;

  // Prepare the image ahead of time (and again if the language changes).
  useEffect(() => {
    if (!button.current) return;
    let cancelled = false;
    let url: string | null = null;
    const fontFamily = getComputedStyle(button.current).fontFamily;
    renderStory(campaign, locale, fontFamily)
      .then((result) => {
        if (cancelled) return;
        url = URL.createObjectURL(result);
        setFile(result);
        setPreviewUrl(url);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [campaign, locale]);

  function openDialog() {
    setMessage("");
    dialog.current?.showModal();
  }

  function downloadImage() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  // No `await` before navigator.share: it must run inside the tap itself.
  function shareStory() {
    if (!file) return;
    setMessage("");
    const withLink: ShareData = { files: [file], url: link };
    const imageOnly: ShareData = { files: [file] };
    const data = navigator.canShare?.(withLink) ? withLink : navigator.canShare?.(imageOnly) ? imageOnly : null;
    if (!data) {
      downloadImage();
      setMessage(labels.noShare);
      return;
    }
    navigator.share(data).catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage(labels.shareError);
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage(labels.copied);
    } catch {
      setMessage(labels.copyError);
    }
  }

  const smallActionClass =
    "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary-50 disabled:opacity-50";

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={openDialog}
        aria-label={labels.open}
        // Icon-only, pinned to the card's top end corner (top-left in Arabic).
        // CampaignCard pads the memorial line so text never runs under it.
        className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground transition-colors hover:bg-primary-50 active:scale-95"
      >
        <LinkIcon className="h-4 w-4" />
      </button>

      <dialog
        ref={dialog}
        aria-label={labels.heading}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xs overflow-y-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl backdrop:bg-black/65"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{labels.heading}</h2>
          <button type="button" onClick={() => dialog.current?.close()} className={smallActionClass}>
            {labels.close}
          </button>
        </div>

        {/* Checkerboard behind the card so its transparency is obvious. */}
        <div className="story-card-checker mt-3 flex min-h-32 items-center justify-center overflow-hidden rounded-xl border border-border p-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview of the generated PNG (the same file shared/downloaded)
            <img src={previewUrl} alt={labels.preview} className="h-auto w-full" />
          ) : (
            <p role="status" className="text-center text-xs text-muted">
              {failed ? labels.imageError : labels.preparing}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={shareStory}
          disabled={!file}
          className="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent transition-all hover:bg-accent-strong active:scale-95 disabled:opacity-50"
        >
          {labels.share}
        </button>

        <div className="mt-2 flex justify-center gap-2">
          <button type="button" onClick={downloadImage} disabled={!file} className={smallActionClass}>
            {labels.download}
          </button>
          <button type="button" onClick={copyLink} className={smallActionClass}>
            {labels.copy}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-muted">{labels.linkHint}</p>
        {message && (
          <p role="status" className="mt-2 text-xs text-foreground">
            {message}
          </p>
        )}
      </dialog>
    </>
  );
}
