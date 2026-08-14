import type { Metadata } from "next";
import { getAdminSession } from "@/app/lib/auth/guard";
import { listAdmins } from "@/app/lib/db/admins";
import {
  getPlatforms,
  getDevBadgeVisible,
  getMaintenanceMessage,
  getPublicContactEmail,
  getDefaultCampaignSort,
} from "@/app/lib/db/settings";
import PlatformsSettings from "@/app/components/admin/PlatformsSettings";
import GeneralSettingsForm from "@/app/components/admin/GeneralSettingsForm";
import ChangePasswordForm from "@/app/components/admin/ChangePasswordForm";
import AdminAccountsSection from "@/app/components/admin/AdminAccountsSection";

export const metadata: Metadata = { title: "الإعدادات | لوحة تحكم غرسة" };

export default async function SettingsPage() {
  const session = await getAdminSession();
  const admins = await listAdmins();
  const platforms = await getPlatforms();
  const devBadgeVisible = await getDevBadgeVisible();
  const maintenanceMessage = await getMaintenanceMessage();
  const contactEmail = await getPublicContactEmail();
  const defaultCampaignSort = await getDefaultCampaignSort();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted">تغييرات هنا تنعكس مباشرة على الموقع العام حسب الإعداد</p>
      </div>

      <PlatformsSettings initialPlatforms={platforms} />

      <GeneralSettingsForm
        devBadgeVisible={devBadgeVisible}
        maintenanceMessage={maintenanceMessage}
        contactEmail={contactEmail}
        defaultCampaignSort={defaultCampaignSort}
      />

      <ChangePasswordForm />

      {session && <AdminAccountsSection admins={admins} currentAdminId={session.sub} />}
    </div>
  );
}
