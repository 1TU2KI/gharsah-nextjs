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
  const admins = listAdmins();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted">تغييرات هنا تنعكس مباشرة على الموقع العام حسب الإعداد</p>
      </div>

      <PlatformsSettings initialPlatforms={getPlatforms()} />

      <GeneralSettingsForm
        devBadgeVisible={getDevBadgeVisible()}
        maintenanceMessage={getMaintenanceMessage()}
        contactEmail={getPublicContactEmail()}
        defaultCampaignSort={getDefaultCampaignSort()}
      />

      <ChangePasswordForm />

      {session && <AdminAccountsSection admins={admins} currentAdminId={session.sub} />}
    </div>
  );
}
