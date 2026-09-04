import type { Metadata } from "next";
import UpdatesPageClient from "./UpdatesPageClient";
import { getPublicNewsFeed } from "@/app/lib/news/data";

export const metadata: Metadata = {
  title: "الأخبار والتحديثات | غرسة",
};

/**
 * Public "الأخبار" feed — every published news item (automatic campaign
 * events + manual admin posts), newest first. See app/lib/news/data.ts for
 * how each item's campaign link is resolved fresh on every read.
 */
export default async function UpdatesPage() {
  const items = await getPublicNewsFeed();
  return <UpdatesPageClient items={items} />;
}
