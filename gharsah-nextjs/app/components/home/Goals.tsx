"use client";

import { CheckBadgeIcon, DuaIcon, HeartIcon, LeafIcon, UsersIcon } from "./icons";
import { useLanguage } from "../../lib/i18n/LanguageProvider";

const goalIcons = [HeartIcon, CheckBadgeIcon, LeafIcon, UsersIcon, DuaIcon];

export default function Goals() {
  const { t, locale } = useLanguage();

  return (
    <section id="goals" className="bg-accent/90 backdrop-blur-sm">
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
