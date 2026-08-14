import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/app/lib/auth/guard";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import LoginForm from "@/app/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول | لوحة تحكم غرسة",
};

export default async function AdminLoginPage() {
  // Already signed in — no reason to show the login form again.
  const session = await getAdminSession();
  if (session) redirect(ADMIN_BASE_PATH);

  return (
    // No background of its own — the shared body gradient (globals.css,
    // same one behind the public site) already shows through here since
    // this page never paints an opaque background over it. That's the
    // whole point: this should read as a Gharsah page, not a separate
    // product's login screen.
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* Exact same logo mark as Header.tsx/Footer.tsx — no separate admin logo. */}
          <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(20,83,45,0.35)]">
            <Image src="/logo.png" alt="غرسة" width={56} height={56} className="h-full w-full object-cover" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-foreground">غرسة</h1>
          <p className="mt-1 text-sm font-medium text-primary-dark">لوحة التحكم</p>
          <p className="mt-2 text-xs text-muted">للمشرفين فقط — الدخول يتطلب حساب صالح</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
