import { ADMIN_BASE_PATH } from "@/app/lib/auth/constants";

/**
 * Single source of truth for the admin sidebar's nav structure — matches
 * the section list from the dashboard brief (نظرة عامة، الحملات، إضافة
 * حملة، الطلبات، الرسائل، الإحصائيات، سجل النشاط، الإعدادات). `badgeKey`
 * links an item to a live count supplied by the dashboard layout (new
 * requests, unread messages) so the sidebar can show a small number badge
 * without every page needing to know about it individually.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: "overview" | "campaigns" | "addCampaign" | "requests" | "messages" | "statistics" | "activity" | "settings";
  badgeKey?: "requests" | "messages";
  /** Exact-match only (not prefix) — used for the Overview link so it doesn't stay highlighted on every nested page. */
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: ADMIN_BASE_PATH, label: "نظرة عامة", icon: "overview", exact: true },
  { href: `${ADMIN_BASE_PATH}/campaigns`, label: "الحملات", icon: "campaigns" },
  { href: `${ADMIN_BASE_PATH}/campaigns/new`, label: "إضافة حملة", icon: "addCampaign", exact: true },
  { href: `${ADMIN_BASE_PATH}/requests`, label: "الطلبات", icon: "requests", badgeKey: "requests" },
  { href: `${ADMIN_BASE_PATH}/messages`, label: "الرسائل", icon: "messages", badgeKey: "messages" },
  { href: `${ADMIN_BASE_PATH}/statistics`, label: "الإحصائيات", icon: "statistics" },
  { href: `${ADMIN_BASE_PATH}/activity`, label: "سجل النشاط", icon: "activity" },
  { href: `${ADMIN_BASE_PATH}/settings`, label: "الإعدادات", icon: "settings" },
];
