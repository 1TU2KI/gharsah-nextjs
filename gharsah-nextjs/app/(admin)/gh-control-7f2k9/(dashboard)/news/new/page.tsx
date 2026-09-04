import type { Metadata } from "next";
import NewsForm from "@/app/components/admin/NewsForm";
import { createNewsItemAction } from "../actions";

export const metadata: Metadata = { title: "تحديث جديد | لوحة تحكم غرسة" };

export default function NewNewsItemPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">تحديث جديد</h1>
        <p className="mt-1 text-sm text-muted">عاجل، صيانة، تحديث من المطور، أو تحديث عام — تظهر التحديثات المنشورة فورًا في «الأخبار».</p>
      </div>

      <NewsForm
        mode="create"
        action={createNewsItemAction}
        initialValues={{ type: "general", titleAr: "", bodyAr: "", customUrl: "", published: true }}
      />
    </div>
  );
}
