"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCampaignAction, setCampaignArchivedAction, duplicateCampaignAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/campaigns/actions";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

/**
 * Destructive-action guardrails: delete requires typing the campaign's own
 * slug into a confirmation field (not just an OK/Cancel click) — "make it
 * difficult to delete accidentally," per the brief. Archive is offered as
 * the reversible alternative right next to it.
 */
export default function CampaignEditToolbar({
  campaignId,
  slug,
  archived,
}: {
  campaignId: string;
  slug: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function handleDuplicate() {
    startTransition(() => duplicateCampaignAction(campaignId));
  }

  function handleArchiveToggle() {
    startTransition(() => setCampaignArchivedAction(campaignId, !archived));
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCampaignAction(campaignId);
      router.push(`${ADMIN_BASE_PATH}/campaigns`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={pending}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
      >
        تكرار الحملة
      </button>
      <button
        type="button"
        onClick={handleArchiveToggle}
        disabled={pending}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-wash disabled:opacity-50"
      >
        {archived ? "إلغاء الأرشفة" : "أرشفة"}
      </button>

      {!confirmingDelete ? (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          حذف نهائي
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
          <span className="text-xs text-red-700">
            اكتب <bdi dir="ltr" className="font-bold">{slug}</bdi> للتأكيد
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            dir="ltr"
            className="w-28 rounded-md border border-red-300 bg-background px-2 py-1 text-xs outline-none focus:border-red-500"
          />
          <button
            type="button"
            disabled={confirmText !== slug || pending}
            onClick={handleDelete}
            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            حذف
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              setConfirmText("");
            }}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            تراجع
          </button>
        </div>
      )}
    </div>
  );
}
