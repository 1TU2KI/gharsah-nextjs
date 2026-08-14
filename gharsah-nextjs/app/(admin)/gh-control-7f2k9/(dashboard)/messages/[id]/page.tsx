import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContactMessageById } from "@/app/lib/db/messages";
import MessageDetailPanel from "@/app/components/admin/MessageDetailPanel";
import { markMessageReadAction } from "../actions";

export const metadata: Metadata = { title: "تفاصيل الرسالة | لوحة تحكم غرسة" };

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const message = await getContactMessageById(id);
  if (!message) notFound();

  // Opening a message marks it read — the standard inbox convention. Only
  // fires the mutation when it's actually still unread, so re-visiting an
  // already-read message doesn't churn the activity log every time.
  if (!message.is_read) {
    await markMessageReadAction(id, true);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">رسالة من {message.name}</h1>
      </div>
      <MessageDetailPanel message={{ ...message, is_read: 1 }} />
    </div>
  );
}
