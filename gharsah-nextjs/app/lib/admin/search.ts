"use server";

import { all } from "../db/client";
import { requireAdminSession } from "../auth/guard";
import { ADMIN_BASE_PATH } from "../auth/constants";

export type AdminSearchResult = {
  type: "campaign" | "request" | "message";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type CampaignSearchRow = { id: string; title_ar: string; username: string | null; platform: string };
type RequestSearchRow = { id: string; name: string; email: string | null; campaign_url: string };
type MessageSearchRow = { id: string; name: string; email: string | null; message: string };

/**
 * One global search across everything an admin might be looking for —
 * campaign title/username/platform/URL, request sender/email/contents,
 * message sender/email/contents — per the "Global admin search"
 * requirement. A single LIKE query per table (small dataset by design — see
 * CLAUDE.md's own low-volume scoping) rather than a search index, which
 * would be overkill here.
 */
export async function searchAdmin(query: string): Promise<AdminSearchResult[]> {
  await requireAdminSession();

  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const campaigns = await all<CampaignSearchRow>(
    `SELECT id, title_ar, username, platform FROM campaigns
     WHERE title_ar LIKE ? OR title_en LIKE ? OR username LIKE ? OR platform LIKE ? OR url LIKE ? OR relation_ar LIKE ? OR relation_en LIKE ?
     ORDER BY order_index ASC LIMIT 8`,
    [like, like, like, like, like, like, like],
  );

  const requests = await all<RequestSearchRow>(
    `SELECT id, name, email, campaign_url FROM campaign_requests
     WHERE name LIKE ? OR username LIKE ? OR email LIKE ? OR campaign_url LIKE ? OR notes LIKE ?
     ORDER BY created_at DESC LIMIT 8`,
    [like, like, like, like, like],
  );

  const messages = await all<MessageSearchRow>(
    `SELECT id, name, email, message FROM contact_messages
     WHERE name LIKE ? OR email LIKE ? OR message LIKE ?
     ORDER BY created_at DESC LIMIT 8`,
    [like, like, like],
  );

  return [
    ...campaigns.map((c) => ({
      type: "campaign" as const,
      id: c.id,
      title: c.title_ar,
      subtitle: `${c.platform}${c.username ? ` · @${c.username}` : ""}`,
      href: `${ADMIN_BASE_PATH}/campaigns/${c.id}`,
    })),
    ...requests.map((r) => ({
      type: "request" as const,
      id: r.id,
      title: r.name,
      subtitle: r.email || r.campaign_url,
      href: `${ADMIN_BASE_PATH}/requests/${r.id}`,
    })),
    ...messages.map((m) => ({
      type: "message" as const,
      id: m.id,
      title: m.name,
      subtitle: m.message.length > 60 ? `${m.message.slice(0, 60)}…` : m.message,
      href: `${ADMIN_BASE_PATH}/messages/${m.id}`,
    })),
  ];
}
