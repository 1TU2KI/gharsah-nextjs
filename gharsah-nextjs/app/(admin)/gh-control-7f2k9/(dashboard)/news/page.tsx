import type { Metadata } from "next";
import { listAllNewsItems } from "@/app/lib/db/newsRepo";
import NewsTable from "@/app/components/admin/NewsTable";

export const metadata: Metadata = { title: "الأخبار | لوحة تحكم غرسة" };

export default async function AdminNewsPage() {
  const rows = await listAllNewsItems();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">الأخبار والتحديثات</h1>
        <p className="mt-1 text-sm text-muted">
          {rows.length} عنصر — يشمل التحديثات التلقائية (إضافة/اكتمال حالة) والتحديثات اليدوية (عاجل، صيانة، تحديث من المطور، عام).
        </p>
      </div>
      <NewsTable rows={rows} />
    </div>
  );
}
