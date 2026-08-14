import { randomUUID } from "node:crypto";
import { all, get, run } from "./client";
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
export async function createCampaignRequest(input: {
  name: string;
  username?: string | null;
  relationshipType?: string | null;
  campaignUrl: string;
  email?: string | null;
  notes?: string | null;
}): Promise<CampaignRequestRow> {
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
  await run(
    `INSERT INTO campaign_requests
      (id, name, username, relationship_type, campaign_url, email, notes, status, admin_notes, converted_campaign_id, archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
  );
  return row;
}

export async function listCampaignRequests(options?: { includeArchived?: boolean }): Promise<CampaignRequestRow[]> {
  if (options?.includeArchived) {
    return toPlainArray(await all<CampaignRequestRow>("SELECT * FROM campaign_requests ORDER BY created_at DESC"));
  }
  return toPlainArray(
    await all<CampaignRequestRow>(
      "SELECT * FROM campaign_requests WHERE archived_at IS NULL ORDER BY created_at DESC",
    ),
  );
}

export async function getCampaignRequestById(id: string): Promise<CampaignRequestRow | undefined> {
  const row = await get<CampaignRequestRow>("SELECT * FROM campaign_requests WHERE id = ?", [id]);
  return row ? toPlain(row) : undefined;
}

export async function updateCampaignRequestStatus(id: string, status: RequestStatus): Promise<void> {
  await run("UPDATE campaign_requests SET status = ?, updated_at = ? WHERE id = ?", [
    status,
    new Date().toISOString(),
    id,
  ]);
}

export async function updateCampaignRequestNotes(id: string, adminNotes: string): Promise<void> {
  await run("UPDATE campaign_requests SET admin_notes = ?, updated_at = ? WHERE id = ?", [
    adminNotes,
    new Date().toISOString(),
    id,
  ]);
}

export async function markCampaignRequestConverted(id: string, campaignId: string): Promise<void> {
  await run("UPDATE campaign_requests SET status = 'completed', converted_campaign_id = ?, updated_at = ? WHERE id = ?", [
    campaignId,
    new Date().toISOString(),
    id,
  ]);
}

export async function setCampaignRequestArchived(id: string, archived: boolean): Promise<void> {
  await run("UPDATE campaign_requests SET archived_at = ?, updated_at = ? WHERE id = ?", [
    archived ? new Date().toISOString() : null,
    new Date().toISOString(),
    id,
  ]);
}

/** Same day-bucketing convention as `campaignsCreatedByDay` in campaignsRepo.ts — for the "requests over time" analytics chart. */
export async function requestsCreatedByDay(): Promise<{ day: string; count: number }[]> {
  return toPlainArray(
    await all<{ day: string; count: number }>(
      "SELECT substr(created_at, 1, 10) as day, COUNT(*)::int as count FROM campaign_requests GROUP BY day ORDER BY day ASC",
    ),
  );
}

export async function countRequestsByStatus(): Promise<Record<RequestStatus, number>> {
  const rows = await all<{ status: RequestStatus; count: number }>(
    "SELECT status, COUNT(*)::int as count FROM campaign_requests WHERE archived_at IS NULL GROUP BY status",
  );
  const result: Record<RequestStatus, number> = { new: 0, under_review: 0, accepted: 0, rejected: 0, completed: 0 };
  for (const row of rows) result[row.status] = row.count;
  return result;
}
