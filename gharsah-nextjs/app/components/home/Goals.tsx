"use client";

import { DuaIcon, HeartIcon, SproutIcon, TargetIcon, UsersIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

// items[0]="تخليد الأثر بالصدقة", items[1]="جمع حملات المجتمع" (unchanged),
// items[2]="اجعل نيتك أوسع", items[3]/[4] unchanged.
const goalIcons = [SproutIcon, TargetIcon, HeartIcon, UsersIcon, DuaIcon];

export default function Goals() {
  const { t, locale } = useLanguage();

  return (
    // Deliberately a flat, fully OPAQUE `bg-accent` with no mask/blur — a
    // clean, hard-edged block against the surrounding page background, per
    // the brief ("sharp, solid, no gradient/fade/blur transition"). This
    // supersedes the previous feathered-backdrop treatment (see git history
    // if that soft-blend version is ever wanted back).
    <section id="goals" className="bg-accent">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2
          className={`text-center text-2xl font-extrabold text-on-accent sm:text-3xl ${locale === "en" ? "tracking-tight" : ""}`}
        >
          {t.goals.heading}
        </h2>

        {/* flex-wrap + justify-center (not a plain grid) is what centers the
            trailing two-card row on wide screens once the five cards wrap to
            3 + 2, instead of leaving them stuck to one side. */}
        <div className="mt-10 flex flex-wrap justify-center gap-8">
          {t.goals.items.map((goal, index) => {
            const Icon = goalIcons[index];
            return (
              <div
                key={goal.title}
                className="w-full text-center text-on-accent sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)]"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-on-accent/10">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-sm font-bold sm:text-base">{goal.title}</h3>
                <p className="mt-2 text-xs leading-6 text-on-accent/70 sm:text-sm">{goal.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
