import { randomUUID } from "node:crypto";
import { db } from "./client";
import { toPlain, toPlainArray } from "./utils";

export type RequestStatus = "new" | "under_review" | "accepted" | "rejected" | "completed";

export type CampaignRequestRow = {
  id: string;
  name: string;
  username: string | null;
  relationship_type: string | null;
  campaign_url: string;
  email: string | null;
  notes: string | null;
  status: RequestStatus;
  admin_notes: string | null;
  converted_campaign_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Public-facing: called from the /contact page's "request a campaign" form. */
export function createCampaignRequest(input: {
  name: string;
  username?: string | null;
  relationshipType?: string | null;
  campaignUrl: string;
  email?: string | null;
  notes?: string | null;
}): CampaignRequestRow {
  const now = new Date().toISOString();
  const row: CampaignRequestRow = {
    id: randomUUID(),
    name: input.name,
    username: input.username || null,
    relationship_type: input.relationshipType || null,
    campaign_url: input.campaignUrl,
    email: input.email || null,
    notes: input.notes || null,
    status: "new",
    admin_notes: null,
    converted_campaign_id: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO campaign_requests
      (id, name, username, relationship_type, campaign_url, email, notes, status, admin_notes, converted_campaign_id, archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.name,
    row.username,
    row.relationship_type,
    row.campaign_url,
    row.email,
    row.notes,
    row.status,
    row.admin_notes,
    row.converted_campaign_id,
    row.archived_at,
    row.created_at,
    row.updated_at,
  );
  return row;
}

export function listCampaignRequests(options?: { includeArchived?: boolean }): CampaignRequestRow[] {
  if (options?.includeArchived) {
    return toPlainArray(
      db.prepare("SELECT * FROM campaign_requests ORDER BY created_at DESC").all() as CampaignRequestRow[],
    );
  }
  return toPlainArray(
    db
      .prepare("SELECT * FROM campaign_requests WHERE archived_at IS NULL ORDER BY created_at DESC")
      .all() as CampaignRequestRow[],
  );
}

export function getCampaignRequestById(id: string): CampaignRequestRow | undefined {
  const row = db.prepare("SELECT * FROM campaign_requests WHERE id = ?").get(id) as CampaignRequestRow | undefined;
  return row ? toPlain(row) : undefined;
}

export function updateCampaignRequestStatus(id: string, status: RequestStatus): void {
  db.prepare("UPDATE campaign_requests SET status = ?, updated_at = ? WHERE id = ?").run(
    status,
    new Date().toISOString(),
    id,
  );
}

export function updateCampaignRequestNotes(id: string, adminNotes: string): void {
  db.prepare("UPDATE campaign_requests SET admin_notes = ?, updated_at = ? WHERE id = ?").run(
    adminNotes,
    new Date().toISOString(),
    id,
  );
}

export function markCampaignRequestConverted(id: string, campaignId: string): void {
  db.prepare(
    "UPDATE campaign_requests SET status = 'completed', converted_campaign_id = ?, updated_at = ? WHERE id = ?",
  ).run(campaignId, new Date().toISOString(), id);
}

export function setCampaignRequestArchived(id: string, archived: boolean): void {
  db.prepare("UPDATE campaign_requests SET archived_at = ?, updated_at = ? WHERE id = ?").run(
    archived ? new Date().toISOString() : null,
    new Date().toISOString(),
    id,
  );
}

/** Same day-bucketing convention as `campaignsCreatedByDay` in campaignsRepo.ts — for the "requests over time" analytics chart. */
export function requestsCreatedByDay(): { day: string; count: number }[] {
  return toPlainArray(
    db
      .prepare("SELECT substr(created_at, 1, 10) as day, COUNT(*) as count FROM campaign_requests GROUP BY day ORDER BY day ASC")
      .all() as { day: string; count: number }[],
  );
}

export function countRequestsByStatus(): Record<RequestStatus, number> {
  const rows = db
    .prepare("SELECT status, COUNT(*) as count FROM campaign_requests WHERE archived_at IS NULL GROUP BY status")
    .all() as { status: RequestStatus; count: number }[];
  const result: Record<RequestStatus, number> = { new: 0, under_review: 0, accepted: 0, rejected: 0, completed: 0 };
  for (const row of rows) result[row.status] = row.count;
  return result;
}
