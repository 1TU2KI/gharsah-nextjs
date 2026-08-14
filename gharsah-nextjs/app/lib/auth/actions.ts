"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "../db/admins";
import { logActivity } from "../db/activity";
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./session";
import { isRateLimited, recordFailedAttempt, clearAttempts, remainingLockoutSeconds } from "./rateLimit";
import { ADMIN_BASE_PATH, ADMIN_LOGIN_PATH } from "./constants";

export type LoginState = { error: string | null };

async function getClientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** The login form's Server Action (React 19 `useActionState`). Rate-limited per client key; see rateLimit.ts for its documented scope limits. */
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const clientKey = await getClientKey();

  if (isRateLimited(clientKey)) {
    const minutes = Math.ceil(remainingLockoutSeconds(clientKey) / 60);
    return { error: `محاولات دخول كثيرة جدًا. حاول مرة أخرى بعد ${minutes} دقيقة${minutes === 1 ? "" : "تين"}.` };
  }

  if (!username || !password) {
    return { error: "الرجاء إدخال اسم المستخدم وكلمة المرور." };
  }

  const admin = verifyAdminCredentials(username, password);
  if (!admin) {
    recordFailedAttempt(clientKey);
    return { error: "اسم المستخدم أو كلمة المرور غير صحيحة." };
  }

  clearAttempts(clientKey);

  const token = await createSessionToken(admin);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  logActivity({
    action: "admin_login",
    targetType: "admin",
    targetId: admin.id,
    targetLabel: admin.username,
    adminUsername: admin.username,
  });

  redirect(ADMIN_BASE_PATH);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  store.delete(SESSION_COOKIE_NAME);

  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      logActivity({
        action: "admin_logout",
        targetType: "admin",
        targetId: session.sub,
        targetLabel: session.username,
        adminUsername: session.username,
      });
    }
  }

  redirect(ADMIN_LOGIN_PATH);
}
