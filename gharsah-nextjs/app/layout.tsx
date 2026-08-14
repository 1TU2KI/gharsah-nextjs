import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "غرسة | دليل الحملات الخيرية الموثوقة",
  description:
    "غرسة دليل يعرض حملات تبرع موثوقة من جهات رسمية مثل إحسان ودعوة القصبة، والتبرع يتم مباشرة عبر منصة الجهة الرسمية.",
};

/**
 * Deliberately bare: the true App Router root, shared by BOTH the public
 * site (`app/(site)/...`) and the private admin area (`app/(admin)/...`).
 * Only what genuinely belongs to every page lives here — the `<html>`/
 * `<body>` shell, the Cairo font, global CSS, and the anti-flash
 * theme/language script (both areas default to Arabic/RTL and both use the
 * same dark-mode class, so both benefit from it equally).
 *
 * Everything visitor-facing (Header, Footer, AmbientBackground,
 * InitialLoadOverlay, LanguageProvider) moved to `app/(site)/layout.tsx` —
 * NOT here — so the admin area never inherits public chrome. See
 * `app/(admin)/README.md` for the admin layout's own chrome.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}" +
              "try{var l=localStorage.getItem('lang');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
