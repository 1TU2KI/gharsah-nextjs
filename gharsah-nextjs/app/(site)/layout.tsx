import AmbientBackground from "@/app/components/decor/AmbientBackground";
import Footer from "@/app/components/home/Footer";
import Header from "@/app/components/home/Header";
import InitialLoadOverlay from "@/app/components/ui/InitialLoadOverlay";
import PageViewTracker from "@/app/components/analytics/PageViewTracker";
import { LanguageProvider } from "@/app/lib/i18n/LanguageProvider";
import { getDevBadgeVisible, getMaintenanceMessage } from "@/app/lib/db/settings";

/**
 * Public Gharsah chrome — everything that used to live directly in the root
 * layout, moved here so it applies ONLY to the public site (`/`, `/about`,
 * `/cases/...`, `/contact`, `/terms`) and never to the private admin area,
 * which has its own layout under `app/(admin)/`. The route group's parens
 * add no URL segment, so every public path is unchanged.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const devBadgeVisible = getDevBadgeVisible();
  const maintenanceMessage = getMaintenanceMessage();

  return (
    <LanguageProvider>
      <PageViewTracker />
      <AmbientBackground />
      <InitialLoadOverlay />
      {/* Set from Settings → إعدادات عامة. Purely informational — the site
          stays fully usable underneath; this is a heads-up banner, not a
          gate. */}
      {maintenanceMessage && (
        <div role="status" className="relative z-40 bg-amber-500/15 px-6 py-2 text-center text-xs font-medium text-amber-800 [html[data-theme=dark]_&]:text-amber-300">
          {maintenanceMessage}
        </div>
      )}
      <Header devBadgeVisible={devBadgeVisible} />
      {children}
      <Footer />
    </LanguageProvider>
  );
}
