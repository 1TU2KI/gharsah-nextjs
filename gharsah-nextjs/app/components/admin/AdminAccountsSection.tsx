"use client";

import { useActionState } from "react";
import type { AdminRow } from "@/app/lib/db/admins";
import { createAdminAccountAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/settings/actions";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15";

export default function AdminAccountsSection({ admins, currentAdminId }: { admins: AdminRow[]; currentAdminId: string }) {
  const [state, formAction, pending] = useActionState(createAdminAccountAction, { message: null, error: null });

  return (
    <section className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-bold text-foreground">حسابات المشرفين</h2>
      <p className="mt-1 text-xs text-muted">النظام مبني ليدعم أكثر من مشرف — أضف حسابًا جديدًا عند الحاجة.</p>

      <ul className="mt-4 divide-y divide-wash">
        {admins.map((admin) => (
          <li key={admin.id} className="flex items-center justify-between py-2 text-sm">
            <span dir="ltr" className="font-medium text-foreground">
              {admin.username}
              {admin.id === currentAdminId && <span className="ms-2 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary">أنت</span>}
            </span>
            <span className="text-xs text-muted">{new Date(admin.created_at).toLocaleDateString("ar-SA")}</span>
          </li>
        ))}
      </ul>

      <form action={formAction} className="mt-4 grid gap-3 border-t border-primary-100 pt-4 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="newAdminUsername">
            اسم المستخدم
          </label>
          <input id="newAdminUsername" name="username" dir="ltr" required className={fieldClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="newAdminPassword">
            كلمة المرور
          </label>
          <input id="newAdminPassword" name="password" type="password" dir="ltr" required minLength={8} className={fieldClass} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-50"
          >
            إضافة مشرف
          </button>
        </div>
        {state.message && <p className="text-xs font-medium text-primary sm:col-span-3">{state.message}</p>}
        {state.error && <p className="text-xs font-medium text-red-600 sm:col-span-3">{state.error}</p>}
      </form>
    </section>
  );
}
