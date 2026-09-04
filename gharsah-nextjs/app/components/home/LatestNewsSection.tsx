import LatestNewsSectionClient from "./LatestNewsSectionClient";
import { getPublicNewsFeed } from "../../lib/news/data";

/**
 * "آخر التحديثات" — the latest 3 published news items (automatic campaign
 * events + manual admin posts), a small preview of the full `/updates`
 * feed. Same "fetch server-side, render null if empty" convention as
 * AlmostThereSection.tsx.
 */
export default async function LatestNewsSection() {
  const items = await getPublicNewsFeed(3);
  if (items.length === 0) return null;

  return <LatestNewsSectionClient items={items} />;
}
