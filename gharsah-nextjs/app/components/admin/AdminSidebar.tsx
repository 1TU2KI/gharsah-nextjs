"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "./adminNav";
import {
  GridIcon,
  ListIcon,
  PlusCircleIcon,
  InboxIcon,
  MailIcon,
  ChartIcon,
  HistoryIcon,
  GearIcon,
  TrendingUpIcon,
} from "./icons";

const ICONS = {
  overview: GridIcon,
  campaigns: ListIcon,
  addCampaign: PlusCircleIcon,
  almostThere: TrendingUpIcon,
  requests: InboxIcon,
  messages: MailIcon,
  statistics: ChartIcon,
  activity: HistoryIcon,
  settings: GearIcon,
} as const;

export default function AdminSidebar({
  counts,
  onNavigate,
}: {
  counts: { requests: number; messages: number };
  /** Called after a link is clicked — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      {/* Same logo mark as Header.tsx/Footer.tsx (white circle + /logo.png)
          — no separate admin logo, per the brief. */}
      <div className="mb-4 flex items-center gap-2.5 px-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image src="/logo.png" alt="غرسة" width={36} height={36} className="h-full w-full object-cover" />
        </span>
        <div>
          <p className="text-sm font-bold text-white">غرسة</p>
          <p className="text-[11px] text-white/50">لوحة التحكم</p>
        </div>
      </div>

      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-primary-light" : "text-white/40 group-hover:text-white/70"}`} />
            <span className="flex-1">{item.label}</span>
            {badgeCount > 0 && (
              <span className="rounded-full bg-primary-light/25 px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-light">
                {badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
