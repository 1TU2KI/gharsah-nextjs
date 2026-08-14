import type { ComponentType } from "react";
import { LeafIcon } from "../home/icons";

type EmptyStateProps = {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  message: string;
  /** "green" (default) for active-campaign contexts, "blue" for completed-campaign contexts. */
  tone?: "green" | "blue";
};

export default function EmptyState({ icon: Icon = LeafIcon, title, message, tone = "green" }: EmptyStateProps) {
  const toneClass = tone === "blue" ? "bg-[#E7F2F2] text-[#0C787E]" : "bg-primary-50 text-primary";

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-background/70 px-6 py-16 text-center backdrop-blur-md">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
