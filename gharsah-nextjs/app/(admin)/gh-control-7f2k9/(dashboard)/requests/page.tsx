import type { Metadata } from "next";
import { listCampaignRequests } from "@/app/lib/db/requests";
import RequestsTable from "@/app/components/admin/RequestsTable";

export const metadata: Metadata = { title: "الطلبات | لوحة تحكم غرسة" };

export default function RequestsPage() {
  const rows = listCampaignRequests({ includeArchived: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">طلبات إضافة حملة</h1>
        <p className="mt-1 text-sm text-muted">{rows.length} طلب — مرسلة من نموذج «تواصل معنا» في الموقع العام</p>
      </div>
      <RequestsTable rows={rows} />
    </div>
  );
}
