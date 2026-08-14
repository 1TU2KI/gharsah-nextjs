"use client";

import { useActionState, useState } from "react";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { submitCampaignRequestAction, submitContactMessageAction } from "./actions";
import { idleSubmitState } from "./schema";

type TabKey = "campaign" | "other";

/**
 * Visible state progression: default → hover (border hint) → focus (a real
 * ring, not just a subtle tint — unmistakable at a glance which field is
 * active) → filled (`:not(:placeholder-shown)`, a persistent marker once
 * there's a value, pure CSS — no JS/state needed) → invalid (`:user-invalid`,
 * only after the user has actually interacted with a required/typed field,
 * using the existing `--foreground` token rather than introducing a new
 * error color). */
const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all hover:border-primary/60 focus:border-primary focus:bg-primary/10 focus:ring-4 focus:ring-primary/20 [&:not(:placeholder-shown)]:border-primary-300 [&:user-invalid]:border-foreground [&:user-invalid]:border-2";
const labelClass = "text-sm font-medium text-foreground/80";

/**
 * `initialTab`: which form (if any) is shown before the user picks an
 * option. The dedicated /contact page defaults to "campaign" (unchanged,
 * pre-existing behavior). The homepage's Contact section explicitly passes
 * `null` so neither form appears until the user chooses one.
 *
 * `collapsible`: when true, clicking the currently-open option collapses it
 * (both forms can end up closed). Only the homepage section opts into this —
 * the dedicated /contact page keeps its original always-one-open behavior.
 */
export default function ContactForms({
  initialTab = "campaign",
  collapsible = false,
}: {
  initialTab?: TabKey | null;
  collapsible?: boolean;
}) {
  const { t } = useLanguage();
  const [active, setActive] = useState<TabKey | null>(initialTab);
  // Two independent Server Actions (app/(site)/contact/actions.ts) — these
  // used to just call `e.preventDefault()` and show a static "coming soon"
  // notice; now every submission actually persists (campaign_requests /
  // contact_messages tables) and shows up in the admin dashboard's
  // Requests/Messages inbox.
  const [campaignState, campaignFormAction, campaignPending] = useActionState(submitCampaignRequestAction, idleSubmitState);
  const [otherState, otherFormAction, otherPending] = useActionState(submitContactMessageAction, idleSubmitState);

  const tabs: { key: TabKey; title: string; description: string }[] = [
    { key: "campaign", title: t.contact.tabs.campaign.title, description: t.contact.tabs.campaign.description },
    { key: "other", title: t.contact.tabs.other.title, description: t.contact.tabs.other.description },
  ];

  function selectTab(key: TabKey) {
    setActive((prev) => (collapsible && prev === key ? null : key));
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              aria-pressed={isActive}
              className={`rounded-2xl border p-5 text-start backdrop-blur-md transition-all active:scale-95 ${
                isActive
                  ? "border-primary bg-primary-50/85"
                  : "border-border bg-background/80 hover:bg-primary-50/60"
              }`}
            >
              <span className={`block text-base font-bold ${isActive ? "text-primary-dark" : "text-foreground"}`}>
                {tab.title}
              </span>
              <p className="mt-1 text-xs leading-6 text-muted">{tab.description}</p>
            </button>
          );
        })}
      </div>

      {/* Wrapper margin only appears once a form is selected, so the
          collapsed (unselected) state takes up no extra space below the
          option cards. Transitions in sync with the grid-row reveal below. */}
      <div className={`transition-[margin-top] duration-300 ease-in-out ${active ? "mt-6" : "mt-0"}`}>
        {/* Each form lives in its own grid-row collapse container (the
            0fr/1fr trick) so switching tabs smoothly collapses the
            previous form while the new one expands, with no abrupt swap. */}
        <div
          aria-hidden={active !== "campaign"}
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            active === "campaign" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <form
              action={campaignFormAction}
              className="tier2-elevated rounded-2xl border border-border bg-background/88 p-8 backdrop-blur-md"
            >
              <h3 className="text-center text-base font-bold text-foreground">{t.contact.campaignForm.heading}</h3>
              <p className="mt-1.5 text-center text-sm leading-6 text-muted">{t.contact.campaignForm.subheading}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="campaign-name" className={labelClass}>
                    {t.contact.campaignForm.name.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.name.helper}</p>
                  <input
                    id="campaign-name"
                    name="name"
                    type="text"
                    required
                    placeholder={t.contact.campaignForm.name.placeholder}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="campaign-username" className={labelClass}>
                    {t.contact.campaignForm.username.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.username.helper}</p>
                  <input
                    id="campaign-username"
                    name="username"
                    type="text"
                    required
                    placeholder={t.contact.campaignForm.username.placeholder}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="campaign-relationship" className={labelClass}>
                    {t.contact.campaignForm.relationship.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.relationship.helper}</p>
                  <input
                    id="campaign-relationship"
                    name="relationshipType"
                    type="text"
                    required
                    placeholder={t.contact.campaignForm.relationship.placeholder}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="campaign-url" className={labelClass}>
                    {t.contact.campaignForm.campaignUrl.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.campaignUrl.helper}</p>
                  <input
                    id="campaign-url"
                    name="campaignUrl"
                    type="url"
                    required
                    placeholder="https://ehsan.sa/campaign/XXXXXXXXXX"
                    dir="ltr"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="campaign-email" className={labelClass}>
                    {t.contact.campaignForm.email.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.email.helper}</p>
                  <input
                    id="campaign-email"
                    name="email"
                    type="email"
                    placeholder={t.contact.campaignForm.email.placeholder}
                    dir="ltr"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="campaign-notes" className={labelClass}>
                    {t.contact.campaignForm.notes.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.notes.helper}</p>
                  <textarea
                    id="campaign-notes"
                    name="notes"
                    rows={3}
                    placeholder={t.contact.campaignForm.notes.placeholder}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              <p className="mt-6 text-center text-xs leading-5 text-muted">{t.contact.campaignForm.disclaimer}</p>

              <button
                type="submit"
                disabled={campaignPending}
                className="mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.4)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.5)] active:scale-95 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {campaignPending ? t.contact.campaignForm.submitting : t.contact.campaignForm.submit}
              </button>

              {campaignState.status === "success" && (
                <p role="status" className="mt-3 text-center text-sm text-muted">
                  {t.contact.campaignForm.submittedNotice}
                </p>
              )}
              {campaignState.status === "error" && (
                <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
                  {campaignState.message}
                </p>
              )}
            </form>
          </div>
        </div>

        <div
          aria-hidden={active !== "other"}
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            active === "other" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <form
              action={otherFormAction}
              className="tier2-elevated rounded-2xl border border-border bg-background/88 p-8 backdrop-blur-md"
            >
              <h3 className="text-center text-base font-bold text-foreground">{t.contact.otherForm.heading}</h3>
              <p className="mt-1.5 text-center text-sm leading-6 text-muted">{t.contact.otherForm.subheading}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="other-name" className={labelClass}>
                    {t.contact.otherForm.name.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.otherForm.name.helper}</p>
                  <input
                    id="other-name"
                    name="name"
                    type="text"
                    required
                    placeholder={t.contact.otherForm.name.placeholder}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="other-email" className={labelClass}>
                    {t.contact.otherForm.email.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.otherForm.email.helper}</p>
                  <input
                    id="other-email"
                    name="email"
                    type="email"
                    placeholder={t.contact.otherForm.email.placeholder}
                    dir="ltr"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="other-message" className={labelClass}>
                    {t.contact.otherForm.message.label}
                  </label>
                  <p className="mt-1 text-xs leading-6 text-muted">{t.contact.otherForm.message.helper}</p>
                  <textarea
                    id="other-message"
                    name="message"
                    rows={4}
                    required
                    placeholder={t.contact.otherForm.message.placeholder}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={otherPending}
                className="mt-6 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.4)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.5)] active:scale-95 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otherPending ? t.contact.otherForm.submitting : t.contact.otherForm.submit}
              </button>

              {otherState.status === "success" && (
                <p role="status" className="mt-3 text-center text-sm text-muted">
                  {t.contact.otherForm.submittedNotice}
                </p>
              )}
              {otherState.status === "error" && (
                <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
                  {otherState.message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
