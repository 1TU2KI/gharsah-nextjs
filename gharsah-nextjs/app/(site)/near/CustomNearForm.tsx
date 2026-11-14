"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MemorialLine } from "@/app/components/home/CampaignCard";
import { CheckIcon, LinkIcon } from "@/app/components/home/icons";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { copyText } from "@/app/lib/overlay/copyText";
import type { Campaign } from "@/app/lib/campaigns";
import { createCustomNearPage, updateCustomNearPage, type CustomNearResult } from "./custom-actions";

/** Mirrors customNear/store.ts's limits for instant feedback only — the server re-validates everything. */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 280;
const CAMPAIGNS_MAX = 3;

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/20";
const labelClass = "text-sm font-medium text-foreground/80";
const panelClass = "tier2-elevated glass-surface glass-clear relative rounded-2xl border border-border bg-background/88 p-6 backdrop-blur-md sm:p-8";
const primaryButtonClass =
  "rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.4)] transition-all hover:bg-accent-strong active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";
const smallButtonClass =
  "rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * «اصنع صفحتك» create + edit screen (local prototype). Title, description,
 * 1–3 of the current public active campaigns, in the creator's order (no
 * live preview on this screen). The page itself only ever stores references,
 * so the public /n/<id> page's cards and donation links are always the
 * campaigns' own.
 */
export default function CustomNearForm({
  campaigns,
  mode,
  editToken,
  initial,
}: {
  /** Current public active campaigns (server-provided). */
  campaigns: Campaign[];
  mode: "create" | "edit";
  /** Edit mode only — read by the edit page from the URL fragment, never from the server. */
  editToken?: string;
  initial?: { title: string; description: string; campaignSlugs: string[] };
}) {
  const { t, locale } = useLanguage();
  const c = t.customNear;
  const bySlug = useMemo(() => new Map(campaigns.map((x) => [x.slug, x])), [campaigns]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // A campaign that's no longer public simply drops out of the selection.
  const [slugs, setSlugs] = useState<string[]>(() => (initial?.campaignSlugs ?? []).filter((s) => bySlug.has(s)));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomNearResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = slugs.map((s) => bySlug.get(s)).filter((x): x is Campaign => Boolean(x));

  function toggle(slug: string) {
    setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < CAMPAIGNS_MAX ? [...prev, slug] : prev));
  }
  function move(index: number, delta: -1 | 1) {
    setSlugs((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { title, description, campaignSlugs: slugs };
    startTransition(async () => {
      const res = mode === "edit" && editToken ? await updateCustomNearPage(editToken, payload) : await createCustomNearPage(payload);
      if (res.status === "error") setError(res.message);
      else setResult(res);
    });
  }

  if (result?.status === "success") {
    return (
      <ResultPanel
        viewId={result.viewId}
        editToken={mode === "create" ? result.editToken : undefined}
        title={mode === "create" ? c.createdTitle : c.savedTitle}
        onKeepEditing={mode === "edit" ? () => setResult(null) : undefined}
      />
    );
  }

  return (
    <div>
      <form onSubmit={submit} className={panelClass}>
        <div className="space-y-5">
          <div>
            <label htmlFor="custom-near-title" className={labelClass}>
              {c.titleLabel}
            </label>
            <input
              id="custom-near-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={TITLE_MAX}
              placeholder={c.titlePlaceholder}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="custom-near-description" className={labelClass}>
              {c.descriptionLabel}
            </label>
            <textarea
              id="custom-near-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={DESCRIPTION_MAX}
              placeholder={c.descriptionPlaceholder}
              className={`${inputClass} resize-none`}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>{c.campaignsLabel}</legend>
            <p className="mt-1 text-xs leading-6 text-muted">{c.campaignsHelper}</p>
            <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto pe-1 sm:grid-cols-2">
              {campaigns.map((campaign) => {
                const isOn = slugs.includes(campaign.slug);
                const isFull = !isOn && slugs.length >= CAMPAIGNS_MAX;
                return (
                  <label
                    key={campaign.slug}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-start transition-colors ${
                      isOn ? "border-primary/50 bg-primary-50/70" : "border-border bg-background/60"
                    } ${isFull ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/40"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      disabled={isFull}
                      onChange={() => toggle(campaign.slug)}
                      className="mt-1 h-4 w-4 shrink-0"
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{campaign.title[locale]}</span>
                      <MemorialLine campaign={campaign} />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {selected.length > 0 && (
            <div>
              <p className={labelClass}>{c.orderLabel}</p>
              <p className="mt-1 text-xs leading-6 text-muted">{c.orderHelper}</p>
              <ol className="mt-2 space-y-2">
                {selected.map((campaign, index) => (
                  <li key={campaign.slug} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{campaign.title[locale]}</span>
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={smallButtonClass}>
                      {c.moveUp}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === selected.length - 1}
                      className={smallButtonClass}
                    >
                      {c.moveDown}
                    </button>
                    <button type="button" onClick={() => toggle(campaign.slug)} className={smallButtonClass}>
                      {c.remove}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-5 text-center text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-center">
          <button type="submit" disabled={pending || selected.length === 0} className={primaryButtonClass}>
            {mode === "edit" ? (pending ? c.saving : c.save) : pending ? c.creating : c.create}
          </button>
        </div>
      </form>
    </div>
  );
}

/** The two links after creating (or the same viewing link after saving an edit). */
function ResultPanel({
  viewId,
  editToken,
  title,
  onKeepEditing,
}: {
  viewId: string;
  editToken?: string;
  title: string;
  onKeepEditing?: () => void;
}) {
  const { t } = useLanguage();
  const c = t.customNear;
  // Only ever rendered in the browser, after a submit — never server-side.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const viewUrl = `${origin}/n/${viewId}`;
  // The token goes in the fragment: never sent to the server, never in
  // analytics (PageViewTracker records the path only), never in a Referer.
  const editUrl = editToken ? `${origin}/near/edit#${editToken}` : null;

  return (
    <div role="status" className={`${panelClass} text-center`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-dark">
        <CheckIcon className="h-6 w-6" />
      </span>
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-lg font-bold text-foreground outline-none">
        {title}
      </h2>

      {/* Public share link — its own «نسخ الرابط» / «تم نسخ الرابط» button.
          The private edit link below stays a separate row and button. */}
      <LinkRow
        label={c.viewLinkLabel}
        help={c.viewLinkHelp}
        url={viewUrl}
        copyLabel={c.copyShareLink}
        copiedLabel={c.shareLinkCopied}
      />
      {editUrl && <LinkRow label={c.editLinkLabel} help={c.editLinkHelp} url={editUrl} />}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href={`/n/${viewId}`} className={`flex-1 text-center ${primaryButtonClass}`}>
          {c.openPage}
        </Link>
        {(onKeepEditing || editUrl) && (
          <a
            href={editUrl ?? undefined}
            onClick={
              onKeepEditing
                ? (e) => {
                    e.preventDefault();
                    onKeepEditing();
                  }
                : undefined
            }
            className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-primary-50 active:scale-95"
          >
            {c.keepEditing}
          </a>
        )}
      </div>
    </div>
  );
}

function LinkRow({
  label,
  help,
  url,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  help: string;
  url: string;
  /** Button labels; default to the generic «نسخ» / «تم النسخ». */
  copyLabel?: string;
  copiedLabel?: string;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 text-start">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-6 text-muted">{help}</p>
      <div className="mt-2 flex items-center gap-2">
        <input readOnly value={url} dir="ltr" onFocus={(e) => e.target.select()} className={`${inputClass} mt-0 flex-1 font-mono text-xs`} />
        <button
          type="button"
          onClick={() => copyText(url, (ok) => setCopied(ok))}
          aria-live="polite"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-primary-50 active:scale-95"
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
          {copied ? (copiedLabel ?? t.customNear.copied) : (copyLabel ?? t.customNear.copy)}
        </button>
      </div>
    </div>
  );
}
