import { revalidatePath } from "next/cache";

/**
 * Called after every admin mutation that changes what a visitor sees.
 * Explicit and unconditional (not relying on Next's automatic dynamic-data
 * detection) because campaign data is read via a plain synchronous SQLite
 * call, not `fetch()` — Next has no built-in visibility into that being
 * "dynamic," so without this an edit could sit behind a stale cached page
 * until the next unrelated revalidation. This is what makes "changes made
 * in admin immediately affect the public website" actually true rather
 * than aspirational.
 */
export function revalidatePublicCampaignPages(slug?: string): void {
  revalidatePath("/");
  revalidatePath("/near");
  revalidatePath("/cases/active");
  revalidatePath("/cases/completed");
  if (slug) {
    revalidatePath(`/cases/active/${slug}`);
  } else {
    revalidatePath("/cases/active/[slug]", "page");
  }
}

/** Called after any news mutation (manual CRUD/publish, or an automatic campaign_added/campaign_completed event) that changes what the public feed shows — same explicit-revalidation reasoning as revalidatePublicCampaignPages above, since news_items is read via a plain DB call, not `fetch()`. */
export function revalidatePublicNewsPages(): void {
  revalidatePath("/");
  revalidatePath("/updates");
}
