"use client";

import { useRef, useState } from "react";
import { create } from "qrcode";
import { createSlatFramePainter } from "@/app/components/decor/MintTonicBackground";
import { LinkIcon } from "@/app/components/home/icons";
import type { Campaign } from "@/app/lib/campaigns";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";

const WIDTH = 1080;
const HEIGHT = 1920;
const SITE_ORIGIN = "https://gharsah.sa";

const copy = {
  ar: {
    open: "شارك الحالة كستوري",
    heading: "معاينة الستوري",
    close: "إغلاق",
    preview: "صورة عمودية لمشاركة الحالة",
    preparing: "جارٍ تجهيز الصورة…",
    share: "مشاركة الصورة",
    download: "تحميل الصورة",
    copy: "نسخ رابط الحالة",
    copied: "تم نسخ رابط الحالة.",
    hint: "لإضافة رابط قابل للضغط، انسخ رابط الحالة وألصقه في ملصق الرابط داخل تطبيق الستوري.",
    shareError: "تعذّرت المشاركة من المتصفح. حمّل الصورة وارفعها من داخل التطبيق.",
    copyError: "تعذّر النسخ التلقائي. يمكنك تحديد الرابط ونسخه يدويًا.",
    imageError: "تعذّر تجهيز الصورة. جرّب فتح المعاينة مرة أخرى أو انسخ الرابط.",
    storyLabel: "حملة تبرع موثوقة",
    progress: (percent: number) => String(percent) + "٪ مكتملة",
    scan: "امسح الرمز لفتح الحالة",
  },
  en: {
    open: "Share as a story",
    heading: "Story preview",
    close: "Close",
    preview: "Vertical campaign story image",
    preparing: "Preparing image…",
    share: "Share image",
    download: "Download image",
    copy: "Copy campaign link",
    copied: "Campaign link copied.",
    hint: "For a tappable link, copy the campaign URL and paste it into your story app’s link sticker.",
    shareError: "Your browser couldn’t share the image. Download it and upload it from your app.",
    copyError: "Automatic copying failed. You can select and copy the link manually.",
    imageError: "Couldn’t prepare the image. Reopen the preview to try again or copy the link.",
    storyLabel: "Verified donation campaign",
    progress: (percent: number) => String(percent) + "% complete",
    scan: "Scan to open the campaign",
  },
} as const;

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  value: string,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
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
  for (const [index, text] of lines.slice(0, maxLines).entries()) {
    const visibleText = index === maxLines - 1 && lines.length > maxLines ? text + "…" : text;
    ctx.fillText(visibleText, WIDTH / 2, y + index * lineHeight, maxWidth);
  }
}

function drawQrCode(ctx: CanvasRenderingContext2D, url: string) {
  const { modules } = create(url, { errorCorrectionLevel: "M" });
  const quietZone = 4;
  const availableSize = 320;
  const totalModules = modules.size + quietZone * 2;
  const moduleSize = Math.floor(availableSize / totalModules);
  const size = totalModules * moduleSize;
  const x = Math.floor((WIDTH - size) / 2);
  const y = 1265 + Math.floor((availableSize - size) / 2);

  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#10231f";
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (!modules.get(row, column)) continue;
      ctx.fillRect(
        x + (column + quietZone) * moduleSize,
        y + (row + quietZone) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }
}

function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.shadowColor = "rgba(12, 48, 38, 0.19)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "rgba(249, 253, 247, 0.94)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 48);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.stroke();
}

async function renderStory(
  canvas: HTMLCanvasElement,
  campaign: Campaign,
  locale: keyof typeof copy,
  link: string,
) {
  const labels = copy[locale];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  const fontFamily = getComputedStyle(canvas).fontFamily;
  const logo = new Image();
  logo.src = "/logo.png";
  await Promise.all([document.fonts.ready, logo.decode().catch(() => undefined)]);

  // Export a still frame of Gharsah’s existing Light Mode background.
  createSlatFramePainter("mint")(ctx, 1600);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = locale === "ar" ? "rtl" : "ltr";

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(540, 288, 75, 0, Math.PI * 2);
  ctx.fill();
  if (logo.naturalWidth > 0) {
    const scale = 115 / Math.max(logo.naturalWidth, logo.naturalHeight);
    const width = logo.naturalWidth * scale;
    const height = logo.naturalHeight * scale;
    ctx.drawImage(logo, 540 - width / 2, 288 - height / 2, width, height);
  } else {
    ctx.fillStyle = "#173e36";
    ctx.font = "bold 36px " + fontFamily;
    ctx.fillText("غرسة", 540, 288);
  }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 55px " + fontFamily;
  ctx.fillText(locale === "ar" ? "غرسة" : "Gharsah", 540, 412);

  drawPanel(ctx, 96, 510, 888, 622);
  ctx.fillStyle = "#247465";
  ctx.font = "bold 33px " + fontFamily;
  ctx.fillText(labels.storyLabel, 540, 618, 740);
  ctx.fillStyle = "#173e36";
  ctx.font = "bold 58px " + fontFamily;
  drawWrappedText(ctx, campaign.title[locale], 730, 740, 75, 4);

  const percent = campaign.percent;
  if (typeof percent === "number" && Number.isFinite(percent)) {
    const progress = Math.max(0, Math.min(100, percent));
    ctx.font = "bold 42px " + fontFamily;
    ctx.fillText(labels.progress(progress), 540, 1034);
    ctx.fillStyle = "#acddb5";
    ctx.fillRect(220, 1076, 640, 12);
    ctx.fillStyle = "#247465";
    const fillWidth = 640 * progress / 100;
    ctx.fillRect(locale === "ar" ? 860 - fillWidth : 220, 1076, fillWidth, 12);
  }

  drawPanel(ctx, 205, 1172, 670, 506);
  ctx.fillStyle = "#173e36";
  ctx.font = "bold 36px " + fontFamily;
  ctx.fillText(labels.scan, 540, 1230, 590);
  drawQrCode(ctx, link);
  ctx.fillStyle = "#173e36";
  ctx.direction = "ltr";
  ctx.font = "bold 31px " + fontFamily;
  ctx.fillText(link.replace("https://", ""), 540, 1629, 582);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve(new File([blob], "gharsah-story.png", { type: "image/png" }));
    }, "image/png");
  });
}

export default function CampaignStoryShare({ campaign }: { campaign: Campaign }) {
  const { locale } = useLanguage();
  const labels = copy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");
  const path = campaign.shortCode
    ? "/c/" + encodeURIComponent(campaign.shortCode)
    : "/cases/active/" + encodeURIComponent(campaign.slug);
  const link = SITE_ORIGIN + path;

  async function openPreview() {
    if (!dialog.current || !canvas.current || preparing) return;
    setFile(null);
    setMessage("");
    dialog.current.showModal();
    setPreparing(true);
    try {
      setFile(await renderStory(canvas.current, campaign, locale, link));
    } catch {
      setMessage(labels.imageError);
    } finally {
      setPreparing(false);
    }
  }

  async function shareImage() {
    if (!file) return;
    const data = { files: [file] };
    try {
      if (!navigator.canShare?.(data)) {
        setMessage(labels.shareError);
        return;
      }
      await navigator.share(data);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage(labels.shareError);
      }
    }
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage(labels.copied);
    } catch {
      setMessage(labels.copyError);
    }
  }

  const actionClass = "rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-primary-50 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        disabled={preparing}
        className="relative mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-primary-50 disabled:opacity-50"
      >
        <LinkIcon className="h-4 w-4" />
        {labels.open}
      </button>

      <dialog
        ref={dialog}
        aria-label={labels.heading}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl backdrop:bg-black/65 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{labels.heading}</h2>
          <button type="button" onClick={() => dialog.current?.close()} className={actionClass}>
            {labels.close}
          </button>
        </div>

        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          role="img"
          aria-label={labels.preview}
          className={file ? "mx-auto my-4 h-auto w-full max-w-[230px] rounded-xl" : "sr-only"}
        />
        {preparing && <p role="status" className="my-4 text-sm text-muted">{labels.preparing}</p>}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={shareImage} disabled={!file} className={actionClass}>
            {labels.share}
          </button>
          <button type="button" onClick={downloadImage} disabled={!file} className={actionClass}>
            {labels.download}
          </button>
          <button type="button" onClick={copyLink} className={actionClass}>
            {labels.copy}
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">{labels.hint}</p>
        <input
          dir="ltr"
          readOnly
          aria-label={labels.copy}
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        {message && <p role="status" className="mt-3 text-sm text-foreground">{message}</p>}
      </dialog>
    </>
  );
}
