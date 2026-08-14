import type { Metadata } from "next";
import { listContactMessages } from "@/app/lib/db/messages";
import MessagesTable from "@/app/components/admin/MessagesTable";

export const metadata: Metadata = { title: "الرسائل | لوحة تحكم غرسة" };

export default async function MessagesPage() {
  const rows = await listContactMessages({ includeArchived: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">رسائل التواصل</h1>
        <p className="mt-1 text-sm text-muted">{rows.length} رسالة — مرسلة من نموذج «تواصل معنا» العام في الموقع</p>
      </div>
      <MessagesTable rows={rows} />
    </div>
  );
}
