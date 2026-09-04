"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ExternalLinkIcon, LinkIcon } from "@/app/components/home/icons";
import { copyText } from "@/app/lib/overlay/copyText";

const COPY_CONFIRMATION_MS = 2000;

/**
 * The generated custom URL box — code field + copy button + معاينة link —
 * shared verbatim between Campaign Overlay and Gharsah Overlay. Owns its
 * own copied-confirmation state internally, so each instance is fully
 * independent (one overlay type's "تم نسخ الرابط" confirmation can never
 * leak into the other's, even if both were ever mounted at once).
 *
 * The معاينة link always opens `url` exactly as given — the caller is
 * responsible for `url` already reflecting whatever settings are currently
 * selected (mode/campaigns/interval for Campaign Overlay, just interval for
 * Gharsah Overlay), never the bare default route unless that's genuinely
 * what the current settings resolve to.
 */
export default function GeneratedUrlBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  function handleCopy() {
    copyText(url, (ok) => {
      if (!ok) return;
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground">الرابط المخصص بهذا الإعداد</p>
      <code dir="ltr" className="mt-1.5 block truncate rounded-lg border border-primary/20 bg-primary-50/40 px-3 py-2 text-xs text-foreground/80">
        {url}
      </code>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
            copied ? "border-primary/60 bg-primary-100 text-primary-dark" : "border-primary/30 bg-primary-50/70 text-primary-dark hover:border-primary/60 hover:bg-primary-100"
          }`}
        >
          {copied ? <CheckIcon className="h-4 w-4 shrink-0" /> : <LinkIcon className="h-4 w-4 shrink-0" />}
          {copied ? "تم نسخ الرابط" : "نسخ الرابط المخصص"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-50/70 px-4 py-2 text-xs font-semibold text-primary-dark transition-all hover:border-primary/60 hover:bg-primary-100 active:scale-95"
        >
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
          معاينة
        </a>
      </div>
    </div>
  );
}
