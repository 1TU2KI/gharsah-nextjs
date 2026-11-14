"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AlmostThereGrid from "@/app/components/home/AlmostThereGrid";
import EmptyState from "@/app/components/ui/EmptyState";
import { HeartIcon } from "@/app/components/home/icons";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import type { Campaign } from "@/app/lib/campaigns";
import CustomNearForm from "./CustomNearForm";
import { loadCustomNearPageForEdit } from "./custom-actions";

type Loaded = { title: string; description: string; campaignSlugs: string[] };

/** Shared page shell for the «اصنع صفحتك» create and edit screens (same layout as /near). */
export function CustomNearEditorScreen({ mode, campaigns }: { mode: "create" | "edit"; campaigns: Campaign[] }) {
  const { t } = useLanguage();
  const c = t.customNear;
  // Edit mode: the private token lives in the URL fragment (/near/edit#<token>),
  // which the browser never sends to the server — read it here and pass it
  // to the server action as an argument only.
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null | "invalid">(null);

  useEffect(() => {
    if (mode !== "edit") return;
    const fromHash = window.location.hash.slice(1);
    loadCustomNearPageForEdit(fromHash).then((page) => {
      setToken(fromHash);
      setLoaded(page ?? "invalid");
    });
  }, [mode]);

  return (
    <main className="flex-1">
      <section className="relative overflow-clip py-10 sm:py-16">
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <h1 className="on-slat-bg text-3xl font-extrabold text-foreground sm:text-4xl">
              {mode === "edit" ? c.editHeading : c.createHeading}
            </h1>
            <p className="on-slat-bg mx-auto mt-3 max-w-xl text-muted">{mode === "edit" ? c.editIntro : c.createIntro}</p>
            <p className="on-slat-bg mt-2 text-xs text-muted">{c.prototypeNote}</p>
          </div>

          <div className="mt-10">
            {mode === "create" ? (
              <CustomNearForm mode="create" campaigns={campaigns} />
            ) : loaded === null ? (
              <p className="on-slat-bg text-center text-sm text-muted">{c.loading}</p>
            ) : loaded === "invalid" ? (
              <EmptyState icon={HeartIcon} title={c.invalidEditLink} message={c.prototypeNote} />
            ) : (
              <CustomNearForm mode="edit" campaigns={campaigns} editToken={token ?? undefined} initial={loaded} />
            )}
          </div>

          <p className="on-slat-bg mt-12 text-center text-sm">
            <Link href="/near" className="font-semibold text-primary-dark transition-colors hover:underline active:opacity-70">
              {c.backToNear}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

/** The shared (unlisted) custom page: the creator's title/description + the current Almost There cards. */
export function CustomNearViewScreen({ title, description, campaigns }: { title: string; description: string; campaigns: Campaign[] }) {
  const { t } = useLanguage();
  return (
    <main className="flex-1">
      <section className="relative overflow-clip py-10 sm:py-16">
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h1 className="on-slat-bg text-3xl font-extrabold text-foreground sm:text-4xl">{title}</h1>
            {description && <p className="on-slat-bg mx-auto mt-3 max-w-xl text-muted">{description}</p>}
          </div>
          <div className="mt-12">
            {campaigns.length > 0 ? (
              <AlmostThereGrid campaigns={campaigns} showClosestLabel={false} />
            ) : (
              <EmptyState icon={HeartIcon} title={t.customNear.viewEmpty} message={t.almostThere.emptyMessage} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
