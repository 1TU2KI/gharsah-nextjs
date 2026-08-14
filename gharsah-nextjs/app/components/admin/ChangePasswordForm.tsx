"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction } from "@/app/(admin)/gh-control-7f2k9/(dashboard)/settings/actions";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary-light focus:ring-4 focus:ring-primary-light/15";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, { message: null, error: null });

  return (
    <form action={formAction} className="card-elevated rounded-2xl border border-border bg-background/90 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-bold text-foreground">تغيير كلمة المرور</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="currentPassword">
            كلمة المرور الحالية
          </label>
          <input id="currentPassword" name="currentPassword" type="password" dir="ltr" required className={fieldClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="newPassword">
            كلمة المرور الجديدة
          </label>
          <input id="newPassword" name="newPassword" type="password" dir="ltr" required minLength={8} className={fieldClass} />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground" htmlFor="confirmPassword">
            تأكيد كلمة المرور
          </label>
          <input id="confirmPassword" name="confirmPassword" type="password" dir="ltr" required minLength={8} className={fieldClass} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary-darker px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          تحديث كلمة المرور
        </button>
        {state.message && <span className="text-xs font-medium text-primary">{state.message}</span>}
        {state.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
