import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";

export type ActivityAction =
  | "campaign_created"
  | "campaign_updated"
  | "campaign_deleted"
  | "campaign_archived"
  | "campaign_restored"
  | "campaign_status_changed"
  | "campaign_reordered"
  | "campaign_duplicated"
  | "request_status_changed"
  | "request_note_added"
  | "request_archived"
  | "request_converted"
  | "message_read_changed"
  | "message_note_added"
  | "message_archived"
  | "settings_updated"
  | "admin_login"
  | "admin_logout"
  | "admin_password_changed"
  | "admin_created";

export type ActivityLogRow = {
  id: string;
  action: ActivityAction;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  admin_username: string;
  details: string | null;
  created_at: string;
};

/**
 * One shared helper, called from every mutating admin action (campaigns,
 * requests, messages, settings, auth) — see the doc comment on
 * `ActivityAction` for the exact vocabulary. Never called from public-site
 * code; this is purely an admin-side audit trail.
 */
export async function logActivity(entry: {
  action: ActivityAction;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  adminUsername: string;
  details?: string | null;
}): Promise<void> {
  await run(
    `INSERT INTO activity_log (id, action, target_type, target_id, target_label, admin_username, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      entry.action,
      entry.targetType,
      entry.targetId ?? null,
      entry.targetLabel ?? null,
      entry.adminUsername,
      entry.details ?? null,
      new Date().toISOString(),
    ],
  );
}

export async function listActivity(limit = 200): Promise<ActivityLogRow[]> {
  return all<ActivityLogRow>("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?", [limit]);
}

export async function countActivity(): Promise<number> {
  const row = await get<{ count: number }>("SELECT COUNT(*)::int as count FROM activity_log");
  return row?.count ?? 0;
}
