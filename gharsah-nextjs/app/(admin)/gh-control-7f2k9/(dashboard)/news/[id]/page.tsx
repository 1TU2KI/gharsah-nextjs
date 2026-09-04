import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsItemById, type ManualNewsType } from "@/app/lib/db/newsRepo";
import { NEWS_TYPE_META } from "@/app/lib/news/presentation";
import NewsForm from "@/app/components/admin/NewsForm";
import { updateNewsItemAction } from "../actions";

export const metadata: Metadata = { title: "تعديل تحديث | لوحة تحكم غرسة" };

/**
 * Automatic rows (campaign_added/campaign_completed) render a read-only
 * preview instead of the edit form — their underlying meaning can never be
 * changed here (see the brief); hiding one from the public feed is only
 * ever done via the "إلغاء النشر" toggle on the list page.
 */
export default async function EditNewsItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getNewsItemById(id);
  if (!item) notFound();

  const meta = NEWS_TYPE_META[item.type];

  if (item.source === "automatic") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">عنصر تلقائي</h1>
          <p className="mt-1 text-sm text-muted">
            هذا العنصر أُنشئ تلقائيًا من نظام الحملات ولا يمكن تعديل نصه أو نوعه — يمكن فقط إخفاؤه من الصفحة العامة عبر
            زر «إلغاء النشر» في قائمة الأخبار.
          </p>
        </div>
        <div className={`rounded-2xl border p-5 ${meta.themeClass}`}>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>{meta.labelAr}</span>
          <h2 className="mt-3 text-base font-bold text-foreground">{item.title_ar}</h2>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground/80">{item.body_ar}</p>
          <p className="mt-3 text-xs text-muted">{item.published ? "منشور حاليًا" : "غير منشور حاليًا"}</p>
        </div>
      </div>
    );
  }

  const boundAction = updateNewsItemAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">تعديل التحديث</h1>
      </div>
      <NewsForm
        mode="edit"
        action={boundAction}
        initialValues={{
          type: item.type as ManualNewsType,
          titleAr: item.title_ar ?? "",
          bodyAr: item.body_ar,
          customUrl: item.custom_url ?? "",
          published: item.published === 1,
        }}
      />
    </div>
  );
}
