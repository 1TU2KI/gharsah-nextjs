"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/lib/auth/actions";

const initialState: LoginState = { error: null };

/** Same input recipe as the public contact form (ContactForms.tsx `inputClass`) — border/background/focus-ring all pull from the shared CSS variables, not admin-only colors. */
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted hover:border-primary/60 focus:border-primary focus:bg-primary/10 focus:ring-4 focus:ring-primary/20";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="tier2-elevated space-y-4 rounded-2xl border border-border bg-background/88 p-6 backdrop-blur-md"
    >
      <div>
        <label htmlFor="username" className="text-sm font-medium text-foreground/80">
          اسم المستخدم
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          dir="ltr"
          disabled={pending}
          className={fieldClass}
          placeholder="username"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-foreground/80">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          disabled={pending}
          className={fieldClass}
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p role="alert" aria-live="polite" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.4)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.5)] active:scale-95 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "جارٍ التحقق..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
