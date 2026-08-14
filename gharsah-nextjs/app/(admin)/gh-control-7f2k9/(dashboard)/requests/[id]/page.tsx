import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignRequestById } from "@/app/lib/db/requests";
import RequestDetailPanel from "@/app/components/admin/RequestDetailPanel";

export const metadata: Metadata = { title: "تفاصيل الطلب | لوحة تحكم غرسة" };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getCampaignRequestById(id);
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">طلب من {request.name}</h1>
      </div>
      <RequestDetailPanel request={request} />
    </div>
  );
}
