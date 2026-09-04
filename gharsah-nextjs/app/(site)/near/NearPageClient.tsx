"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AlmostThereGrid from "@/app/components/home/AlmostThereGrid";
import EmptyState from "@/app/components/ui/EmptyState";
import { CheckIcon, HeartIcon, LinkIcon } from "@/app/components/home/icons";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { Campaign } from "@/app/lib/campaigns";

const COPY_CONFIRMATION_MS = 2000;

/**
 * Full, focused view of اقتربت... — same page-shell pattern as
 * /cases/active (centered heading + grid over the shared global background,
 * see AmbientBackground/globals.css), so this reads as a real Gharsah page
 * rather than a re-styled copy of the homepage
 * block. Same ranking + the same AlmostThereGrid podium layout the
 * homepage section uses (see page.tsx) — nothing duplicated here.
 *
 * Deliberately campaign-only: the OBS/streamer overlay tools that used to
 * be embedded here now live on their own `/overlay` page — this page only
 * links out to it (the CTA at the very end), never renders any overlay UI
 * itself, so it stays focused on the "اقتربت..." campaigns as its one job.
 */
export default function NearPageClient({ campaigns }: { campaigns: Campaign[] }) {
  const { t, locale } = useLanguage();
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(copyTimeoutRef.current);
  }, []);

  // Always the current origin + /near — this page's own URL, whatever host
  // it's actually served from (localhost during dev, the real domain once
  // deployed) — never hardcoded, and never a single campaign's link (that's
  // the detail page's own copy-link action, untouched).
  async function handleCopyPageLink() {
    const shareUrl = `${window.location.origin}/near`;
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
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setLinkCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Clipboard write denied/unavailable — fail quietly, same as every
      // other copy-link button in this project.
    }
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-x-hidden py-16">
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h1
              className={`text-3xl font-extrabold text-foreground sm:text-4xl ${locale === "en" ? "tracking-tight" : ""}`}
            >
              {t.almostThere.heading}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t.almostThere.description}</p>

            {/* The random-campaign pick moved into the shared site Header
                (see Header.tsx) — this is now just the page's own copy-link
                action again, for the WHOLE page (this URL), not any
                individual campaign (that action only ever lives on a
                campaign's own detail page). */}
            <button
              type="button"
              onClick={handleCopyPageLink}
              aria-live="polite"
              className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                linkCopied
                  ? "border-primary/60 bg-primary-100 text-primary-dark"
                  : "border-primary/30 bg-primary-50/70 text-primary-dark hover:border-primary/60 hover:bg-primary-100"
              }`}
            >
              {linkCopied ? <CheckIcon className="h-4 w-4 shrink-0" /> : <LinkIcon className="h-4 w-4 shrink-0" />}
              {linkCopied ? t.almostThere.linkCopied : t.almostThere.copyPageLink}
            </button>
          </div>

          {campaigns.length > 0 ? (
            <div className="mt-12">
              <AlmostThereGrid campaigns={campaigns} />
            </div>
          ) : (
            <div className="mt-12">
              <EmptyState icon={HeartIcon} title={t.almostThere.emptyTitle} message={t.almostThere.emptyMessage} />
            </div>
          )}

          {/* Subtle CTA to the dedicated OBS/streamer overlay page — this
              page never embeds that UI itself (see the module doc comment
              above), just points to it. */}
          <p className="mt-12 text-center text-sm">
            <Link href="/overlay" className="font-semibold text-primary-dark transition-colors hover:underline active:opacity-70">
              {t.almostThere.overlayCta}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
