"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/app/lib/i18n/LanguageProvider";
import { CheckBadgeIcon } from "@/app/components/home/icons";
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
/** The forms' own glass panel — shared by the confirmation that replaces them. */
const panelClass = "tier2-elevated glass-surface glass-clear relative rounded-2xl border border-border bg-background/88 p-8 backdrop-blur-md";
const primaryButtonClass =
  "rounded-full bg-accent py-2.5 text-sm font-semibold text-on-accent shadow-[0_8px_20px_-8px_rgba(20,83,45,0.4)] transition-all hover:bg-accent-strong hover:shadow-[0_10px_24px_-8px_rgba(20,83,45,0.5)] active:scale-95 active:brightness-95";

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
  // Bumping a form's key remounts it: a fresh, empty copy with its own new
  // action state ("send another" on the confirmation screen).
  const [campaignKey, setCampaignKey] = useState(0);
  const [otherKey, setOtherKey] = useState(0);

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
              className={`glass-surface glass-clear relative rounded-2xl border p-5 text-start backdrop-blur-md transition-all active:scale-95 ${
                isActive
                  ? "glass-surface--selected border-primary bg-primary-50/85"
                  : "glass-surface--hover-select border-border bg-background/80 hover:bg-primary-50/60"
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
            <CampaignRequestForm key={campaignKey} onAnother={() => setCampaignKey((k) => k + 1)} />
          </div>
        </div>

        <div
          aria-hidden={active !== "other"}
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            active === "other" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <ContactMessageForm key={otherKey} onAnother={() => setOtherKey((k) => k + 1)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Server Action (app/(site)/contact/actions.ts) → every accepted submission
 * persists (campaign_requests table) and shows up in the admin inbox. Only
 * once the server accepts it is the form replaced by the confirmation; on an
 * error the visitor's input is restored from the action's `values` (React
 * resets the form after every action).
 */
function CampaignRequestForm({ onAnother }: { onAnother: () => void }) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(submitCampaignRequestAction, idleSubmitState);
  const v = state.status === "error" ? state.values : undefined;

  if (state.status === "success") {
    return (
      <SubmitSuccess
        title={t.contact.success.requestTitle}
        condolence={
          state.condolence === "female"
            ? t.contact.success.condolenceFemale
            : state.condolence === "male"
              ? t.contact.success.condolenceMale
              : null
        }
        previewLabel={t.contact.success.notesPreviewLabel}
        preview={state.preview ?? null}
        anotherLabel={t.contact.success.anotherRequest}
        onAnother={onAnother}
      />
    );
  }

  return (
    <form action={formAction} className={panelClass}>
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
            defaultValue={v?.name}
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
            defaultValue={v?.username}
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
            defaultValue={v?.relationshipType}
            placeholder={t.contact.campaignForm.relationship.placeholder}
            className={inputClass}
          />
        </div>

        {/* Explicit deceased-person choice — decides the confirmation's
            condolence line (see actions.ts); restored on an error like the
            other fields. */}
        <div>
          <label htmlFor="campaign-memorial" className={labelClass}>
            {t.contact.campaignForm.memorial.label}
          </label>
          <p className="mt-1 text-xs leading-6 text-muted">{t.contact.campaignForm.memorial.helper}</p>
          {/* `key`: React only applies a select's defaultValue on mount, so
              remount it with the value returned by a failed submission —
              otherwise the post-action form reset falls back to "none". */}
          <select
            key={v?.memorial ?? ""}
            id="campaign-memorial"
            name="memorial"
            defaultValue={v?.memorial ?? ""}
            className={inputClass}
          >
            <option value="">{t.contact.campaignForm.memorial.none}</option>
            <option value="male">{t.contact.campaignForm.memorial.male}</option>
            <option value="female">{t.contact.campaignForm.memorial.female}</option>
          </select>
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
            defaultValue={v?.campaignUrl}
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
            defaultValue={v?.email}
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
            defaultValue={v?.notes}
            placeholder={t.contact.campaignForm.notes.placeholder}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-muted">{t.contact.campaignForm.disclaimer}</p>

      <button
        type="submit"
        disabled={pending}
        className={`mt-3 w-full ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? t.contact.campaignForm.submitting : t.contact.campaignForm.submit}
      </button>

      {state.status === "error" && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Same pattern for the questions/suggestions form (contact_messages table). */
function ContactMessageForm({ onAnother }: { onAnother: () => void }) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(submitContactMessageAction, idleSubmitState);
  const v = state.status === "error" ? state.values : undefined;

  if (state.status === "success") {
    return (
      <SubmitSuccess
        title={t.contact.success.messageTitle}
        condolence={null}
        previewLabel={t.contact.success.messagePreviewLabel}
        preview={state.preview ?? null}
        anotherLabel={t.contact.success.anotherMessage}
        onAnother={onAnother}
      />
    );
  }

  return (
    <form action={formAction} className={panelClass}>
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
            defaultValue={v?.name}
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
            defaultValue={v?.email}
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
            defaultValue={v?.message}
            placeholder={t.contact.otherForm.message.placeholder}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`mt-6 w-full ${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? t.contact.otherForm.submitting : t.contact.otherForm.submit}
      </button>

      {state.status === "error" && (
        <p role="alert" className="mt-3 text-center text-sm font-medium text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * Replaces a form after the server accepts it: same glass panel, the
 * confirmation, an optional condolence line, a read-only preview of the
 * message/notes the visitor just sent (only what they wrote there — never
 * their name or contact details, and only in this page's memory), and
 * exactly two actions. Focus moves to the heading so screen readers
 * announce the result.
 */
function SubmitSuccess({
  title,
  condolence,
  previewLabel,
  preview,
  anotherLabel,
  onAnother,
}: {
  title: string;
  condolence: string | null;
  previewLabel: string;
  preview: string | null;
  anotherLabel: string;
  onAnother: () => void;
}) {
  const { t } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="status" className={`${panelClass} text-center`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-dark">
        <CheckBadgeIcon className="h-6 w-6" />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="mt-4 text-lg font-bold text-foreground outline-none">
        {title}
      </h3>
      {condolence && <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-foreground">{condolence}</p>}

      {preview && (
        <div className="mt-6 text-start">
          <p className="text-xs font-semibold text-muted">{previewLabel}</p>
          <p
            dir="auto"
            className="mt-1.5 whitespace-pre-line rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-foreground"
          >
            {preview}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={`flex-1 px-5 text-center ${primaryButtonClass}`}>
          {t.contact.success.home}
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-primary-50 active:scale-95"
        >
          {anotherLabel}
        </button>
      </div>
    </div>
  );
}
