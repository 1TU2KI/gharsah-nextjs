"use client";

import { useState, useTransition } from "react";
import { regenerateShortCodeAction, setCustomShortCodeAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/campaigns/actions";
import { LinkIcon, ExternalLinkIcon, CheckIcon } from "./icons";

const COPY_CONFIRMATION_MS = 2000;

/**
 * Per-campaign short-link management, shown on the campaign edit page (see
 * `campaigns/[id]/page.tsx`) — not the create form, since a code doesn't
 * exist until the row itself does (`createCampaignRow` assigns one
 * automatically). Mirrors the public detail page's own copy-link
 * affordance (icon + "copied" swap) so the pattern reads as familiar rather
 * than a one-off widget.
 */
export default function ShortLinkPanel({ campaignId, initialCode }: { campaignId: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode);
  const [editValue, setEditValue] = useState(initialCode ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const shortUrl = code ? `gharsah.sa/c/${code}` : null;

  function handleCopy() {
    if (!code) return;
    const shareUrl = `${window.location.origin}/c/${code}`;
    navigator.clipboard
      ?.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), COPY_CONFIRMATION_MS);
      })
      .catch(() => {
        // Clipboard write denied/unavailable — fail quietly, same as every
        // other copy-link button in this project.
      });
  }

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateShortCodeAction(campaignId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode(result.code);
      setEditValue(result.code ?? "");
    });
  }

  function handleSaveCustom() {
    setError(null);
    startTransition(async () => {
      const result = await setCustomShortCodeAction(campaignId, editValue);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCode(result.code);
      setEditing(false);
    });
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-wash/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground">الرابط المختصر</p>
        <p className="text-[11px] text-muted">للمشاركة أثناء البث — يحوّل تلقائيًا لصفحة الحالة على غرسة</p>
      </div>

      {!editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span dir="ltr" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
            {shortUrl ?? "—"}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
          >
            {copied ? <CheckIcon className="h-3.5 w-3.5 text-primary-dark" /> : <LinkIcon className="h-3.5 w-3.5" />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          {code && (
            <a
              href={`/c/${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-wash"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              فتح
            </a>
          )}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={pending}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
          >
            إعادة توليد
          </button>
          <button
            type="button"
            onClick={() => {
              setEditValue(code ?? "");
              setError(null);
              setEditing(true);
            }}
            disabled={pending}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
          >
            تخصيص
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span dir="ltr" className="text-xs text-muted">
            gharsah.sa/c/
          </span>
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            dir="ltr"
            placeholder="مثال: turki"
            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/15"
          />
          <button
            type="button"
            onClick={handleSaveCustom}
            disabled={pending || !editValue.trim()}
            className="rounded-lg bg-primary-dark px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            تراجع
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
