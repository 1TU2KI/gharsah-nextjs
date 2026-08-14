"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ContactMessageRow } from "@/app/lib/db/messages";
import { updateMessageNotesAction, setMessageArchivedAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/messages/actions";

export default function MessageDetailPanel({ message }: { message: ContactMessageRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(message.admin_notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);

  function handleSaveNotes() {
    startTransition(async () => {
      await updateMessageNotesAction(message.id, notes);
      setNotesSaved(true);
      window.setTimeout(() => setNotesSaved(false), 2000);
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      await setMessageArchivedAction(message.id, !message.archived_at);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">الاسم</dt>
              <dd className="text-sm font-medium text-foreground">{message.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">البريد الإلكتروني</dt>
              <dd dir="ltr" className="text-start text-sm font-medium text-foreground">
                {message.email || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">تاريخ الإرسال</dt>
              <dd className="text-sm text-foreground">{new Date(message.created_at).toLocaleString("ar-SA")}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-primary-100 pt-4">
            <dt className="text-xs text-muted">الرسالة</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-7 text-foreground">{message.message}</dd>
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">ملاحظات إدارية خاصة</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={pending}
              className="rounded-full bg-primary-darker px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              حفظ الملاحظات
            </button>
            {notesSaved && <span className="text-xs font-medium text-primary">تم الحفظ ✓</span>}
          </div>
        </section>
      </div>

      <aside>
        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">إجراءات</h2>
          <div className="mt-3 space-y-2">
            {message.email && (
              <a
                href={`mailto:${message.email}`}
                className="block rounded-full bg-accent px-3 py-2 text-center text-xs font-semibold text-on-accent hover:bg-accent-strong"
              >
                الرد عبر البريد
              </a>
            )}
            <button
              type="button"
              onClick={handleArchiveToggle}
              disabled={pending}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-wash disabled:opacity-50"
            >
              {message.archived_at ? "إلغاء الأرشفة" : "أرشفة"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
