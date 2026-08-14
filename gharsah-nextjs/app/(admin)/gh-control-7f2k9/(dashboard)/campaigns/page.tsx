import type { Metadata } from "next";
import Link from "next/link";
import { listAllCampaignRows } from "@/app/lib/db/campaignsRepo";
import { campaignEngagement } from "@/app/lib/db/analyticsRepo";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { PlusCircleIcon } from "@/app/components/admin/icons";
import CampaignsTable from "@/app/components/admin/CampaignsTable";

export const metadata: Metadata = { title: "الحملات | لوحة تحكم غرسة" };

export default async function CampaignsListPage() {
  const rows = await listAllCampaignRows();
  const engagement = await campaignEngagement();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">الحملات</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} حملة — يظهر الترتيب هنا كما يظهر في الموقع العام</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`${ADMIN_BASE_PATH}/statistics`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            تحليلات التفاعل الكاملة ←
          </Link>
          <Link
            href={`${ADMIN_BASE_PATH}/campaigns/new`}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            <PlusCircleIcon className="h-4 w-4" />
            إضافة حملة
          </Link>
        </div>
      </div>

      <CampaignsTable initialRows={rows} engagement={engagement} />
    </div>
  );
}
