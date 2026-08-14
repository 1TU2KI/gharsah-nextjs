"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { CampaignRequestRow, RequestStatus } from "@/app/lib/db/requests";
import { changeRequestStatusAction, updateRequestNotesAction, setRequestArchivedAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/requests/actions";
import { REQUEST_STATUS_LABEL } from "./RequestsTable";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

export default function RequestDetailPanel({ request }: { request: CampaignRequestRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(request.admin_notes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);

  function handleStatusChange(status: RequestStatus) {
    startTransition(async () => {
      await changeRequestStatusAction(request.id, status);
      router.refresh();
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateRequestNotesAction(request.id, notes);
      setNotesSaved(true);
      window.setTimeout(() => setNotesSaved(false), 2000);
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      await setRequestArchivedAction(request.id, !request.archived_at);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">بيانات مقدّم الطلب</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">الاسم</dt>
              <dd className="text-sm font-medium text-foreground">{request.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">اسم المستخدم / المعرّف</dt>
              <dd dir="ltr" className="text-start text-sm font-medium text-foreground">
                {request.username || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">الصلة</dt>
              <dd className="text-sm font-medium text-foreground">{request.relationship_type || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">البريد الإلكتروني</dt>
              <dd dir="ltr" className="text-start text-sm font-medium text-foreground">
                {request.email || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">رابط الحملة</dt>
              <dd dir="ltr" className="text-start text-sm font-medium text-primary-dark">
                <a href={request.campaign_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {request.campaign_url}
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">ملاحظات مقدّم الطلب</dt>
              <dd className="whitespace-pre-wrap text-sm text-foreground">{request.notes || "لا توجد ملاحظات"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">تاريخ الإرسال</dt>
              <dd className="text-sm text-foreground">{new Date(request.created_at).toLocaleString("ar-SA")}</dd>
            </div>
          </dl>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">ملاحظات إدارية خاصة</h2>
          <p className="mt-1 text-xs text-muted">مرئية للمشرفين فقط، لا تظهر لمقدّم الطلب.</p>
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

      <aside className="space-y-4">
        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">الحالة</h2>
          <div className="mt-3 grid grid-cols-1 gap-1.5">
            {(Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusChange(status)}
                disabled={pending}
                className={`rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors ${
                  request.status === status ? "bg-accent text-on-accent" : "bg-wash text-foreground hover:bg-primary-100"
                }`}
              >
                {REQUEST_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </section>

        <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-foreground">إجراءات</h2>
          <div className="mt-3 space-y-2">
            {request.converted_campaign_id ? (
              <Link
                href={`${ADMIN_BASE_PATH}/campaigns/${request.converted_campaign_id}`}
                className="block rounded-lg bg-primary-50 px-3 py-2 text-center text-xs font-semibold text-primary-dark hover:bg-primary-100"
              >
                تم التحويل — عرض الحملة ↗
              </Link>
            ) : (
              <Link
                href={`${ADMIN_BASE_PATH}/campaigns/new?fromRequest=${request.id}`}
                className="block rounded-full bg-accent px-3 py-2 text-center text-xs font-semibold text-on-accent hover:bg-accent-strong"
              >
                تحويل إلى حملة
              </Link>
            )}
            <button
              type="button"
              onClick={handleArchiveToggle}
              disabled={pending}
              className="w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-wash disabled:opacity-50"
            >
              {request.archived_at ? "إلغاء الأرشفة" : "أرشفة (طلب مزعج/غير صالح)"}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}
