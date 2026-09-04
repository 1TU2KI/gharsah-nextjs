"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/lib/auth/guard";
import { logActivity } from "@/app/lib/db/activity";
import { revalidatePublicNewsPages } from "@/app/lib/admin/revalidate";
import { revalidatePath } from "next/cache";
import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";
import { newsFormSchema, type NewsFormFieldErrors, type NewsFormState } from "@/app/lib/admin/newsSchema";
import {
  createManualNewsItem,
  updateManualNewsItem,
  deleteManualNewsItem,
  setNewsItemPublished,
  getNewsItemById,
} from "@/app/lib/db/newsRepo";

function refresh() {
  revalidatePath(`${ADMIN_BASE_PATH}/news`);
  revalidatePublicNewsPages();
}

function parseForm(formData: FormData) {
  return newsFormSchema.safeParse({
    type: formData.get("type"),
    titleAr: formData.get("titleAr"),
    bodyAr: formData.get("bodyAr"),
    customUrl: formData.get("customUrl"),
    published: formData.get("published") === "on",
  });
}

export async function createNewsItemAction(_prevState: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const session = await requireAdminSession();

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as NewsFormFieldErrors, formError: null };
  }

  const row = await createManualNewsItem(parsed.data);
  await logActivity({
    action: "news_created",
    targetType: "news",
    targetId: row.id,
    targetLabel: row.title_ar ?? row.type,
    adminUsername: session.username,
  });

  refresh();
  redirect(`${ADMIN_BASE_PATH}/news`);
}

export async function updateNewsItemAction(id: string, _prevState: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const session = await requireAdminSession();

  const existing = await getNewsItemById(id);
  if (!existing || existing.source !== "manual") {
    return { fieldErrors: {}, formError: "لا يمكن تعديل هذا العنصر — عناصر الأخبار التلقائية غير قابلة للتعديل." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as NewsFormFieldErrors, formError: null };
  }

  await updateManualNewsItem(id, parsed.data);
  await logActivity({
    action: "news_updated",
    targetType: "news",
    targetId: id,
    targetLabel: parsed.data.titleAr || parsed.data.type,
    adminUsername: session.username,
  });

  refresh();
  redirect(`${ADMIN_BASE_PATH}/news`);
}

/** Manual posts only — deleteManualNewsItem itself refuses to delete an automatic row (see newsRepo.ts), this is just the belt-and-suspenders admin-side check. */
export async function deleteNewsItemAction(id: string): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getNewsItemById(id);
  if (!existing || existing.source !== "manual") return;

  await deleteManualNewsItem(id);
  await logActivity({
    action: "news_deleted",
    targetType: "news",
    targetId: id,
    targetLabel: existing.title_ar ?? existing.type,
    adminUsername: session.username,
  });
  refresh();
}

/** Works for BOTH manual and automatic rows — hides a post from the public feed without deleting the underlying record (see the brief, and setNewsItemPublished's own comment). */
export async function setNewsPublishedAction(id: string, published: boolean): Promise<void> {
  const session = await requireAdminSession();
  const existing = await getNewsItemById(id);
  if (!existing) return;

  await setNewsItemPublished(id, published);
  await logActivity({
    action: "news_published_changed",
    targetType: "news",
    targetId: id,
    targetLabel: existing.title_ar ?? existing.type,
    adminUsername: session.username,
    details: published ? "published" : "unpublished",
  });
  refresh();
}
