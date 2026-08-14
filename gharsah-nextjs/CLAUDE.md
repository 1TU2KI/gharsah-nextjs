# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Goal

Build a modern donation platform called Gharsah using Next.js, TypeScript and Tailwind CSS.

## Critical Rules

- Never delete existing features.
- Never redesign existing pages unless requested.
- Never create a new page unless explicitly requested.
- Always reuse existing components.
- Modify the minimum number of files possible.
- Read the entire project before making changes.
- Explain the implementation plan before writing code.
- Wait for my approval before editing files.
- Keep the UI consistent.
- Fix TypeScript and ESLint issues immediately.
- Never break existing functionality.

## Workflow

1. Read the project.
2. Explain the plan.
3. Wait for approval.
4. Implement.
5. Verify nothing broke.
6. Summarize changes.

## Development Priorities

1. Homepage
2. Donation Cases
3. Case Details
4. Donation Flow
5. Active Campaigns
6. Status System
7. Search & Filters
8. Authentication
9. Admin Dashboard
10. Performance & SEO

## Campaign Data Sync

### Currently implemented (2026-07-28): scoped live sync for Ehsan — status, title, description, percentage

`app/lib/campaignLiveSync.ts` fetches each Ehsan campaign's own page server-side, revalidated at most once an hour (`next: { revalidate: 3600 }`), and extracts four fields from that single response: `status`, `title`, `description`, `percent`. `app/lib/campaigns.ts` holds the manual fallback values (used when the platform isn't Ehsan, or the live fetch/field-extraction fails). Every page that displays these fields (`/cases/active`, `/cases/completed`, the two homepage sections, the detail page) calls the `*Live`/`*WithLiveFields` functions from `campaignLiveSync.ts`, never the raw static data, for these four fields specifically. Active/Completed page placement follows the **live** status, not the manual fallback.

**Corrected finding (2026-07-28):** the original investigation (below) claimed the donate button's `disabled` class was a second, redundant status signal alongside the achievement message. This was wrong — verified by direct comparison that `disabled` is present on the button for BOTH an active (52%) and a completed (100%) campaign; Ehsan renders it disabled by default regardless of status, presumably enabling it client-side via JS once a donor selects an amount. Do not add the button-disabled check back as a "confirmation" signal — it will misclassify active campaigns as completed.

**Corrected finding (2026-07-29):** the achievement message alone ("...تم الوصول للمبلغ المستهدف") is NOT a sufficient status signal either. Two campaigns stuck showing "active" in production turned out to be at 107% and 102% of their target — confirmed via direct `curl` that the achievement banner is simply absent from the server HTML once a campaign keeps collecting past its target, even though it's clearly done. **Status is now: completed if the achievement message is present OR `percent >= 100`** (`percent` reads the same redundant `data-value`/`aria-valuenow` pair already used for display, confirmed unambiguous — exactly one match each in both broken cases). If you're ever tempted to drop the percent-based check and rely on the banner text alone again, don't — it silently leaves overshot campaigns stuck in Active.

Still deliberately excluded from sync (raised amount, goal amount, donor count, image — see reliability findings below): unchanged from the original plan. No database, no admin panel, no persistence beyond Next's own fetch cache exist yet.

### Step 0 investigation — findings (one correction noted above)

Before building sync, per-field reliability was actually investigated against live Ehsan pages (both an active and a fully-funded campaign), not assumed:

- **No official API exists.** Checked `robots.txt` (404 on ehsan.sa), `/api`, `/api-docs`, `/developers`, `/swagger`, `/openapi.json` (all 404), and inspected real network traffic from a live campaign page (86 requests) — zero JSON data APIs for campaign stats. The page is fully server-rendered; every stat is present in the raw HTML with **no JavaScript execution required** (confirmed via plain `curl`).
- **Reliable to extract** (stable, semantic anchors): title (`og:title`), description (`og:description`), percentage (`data-value="52"` **and** `aria-valuenow="52"`, redundant), status (the achievement message alone — see correction above; the donate-button-disabled signal is NOT reliable, do not use it).
- **Fetchable but fragile** (works today, but depends on exact div/label nesting, not a standard format): raised amount and goal (anchored to Arabic label text "تم جمع" / "المبلغ المستهدف"), donor count (anchored to "عدد عمليات التبرع"). Deliberately not synced — see requirements below.
- **Cannot be relied on**: cover image — two URLs exist (inline photo + a dedicated `og:image` on a third S3 bucket), both hosted in AWS `me-south-1`, the same region that timed out from this dev environment; Ehsan's own page has a client-side `onerror` fallback on that exact `<img>` tag, meaning even Ehsan doesn't trust it to always load. "Last update time" doesn't exist as a real field at all (no standard element for it on the page template).
- **Scope limit**: all of the above is Ehsan-specific. Dawa Al-Qasba (source of campaign #4) returned almost nothing under inspection — a completely different platform requires its own separate detector; nothing here generalizes automatically to new platforms. Dawa Al-Qasba campaigns always use the manual fallback in `campaigns.ts` for all four synced fields.
- **Legal**: no `robots.txt` and no discoverable Terms of Use prohibiting automated access were found (only a bare privacy policy) — but this is not legal clearance. Ehsan operates under SDAIA (confirmed via its own JSON-LD `parentOrganization`), a Saudi government authority. Get an actual decision from the project owner on the legal/reputational risk before scaling this beyond the current low-volume, hourly-revalidated scoped sync.

### What's still deferred, and why

Raised amount, goal amount, donor count, and cover image remain unsynced and undisplayed — they didn't clear the reliability bar (fragile or unreliable, per above), not because of missing infrastructure. Donor count specifically is worth re-attempting if a future session verifies its extraction is actually reliable in practice (same caveat as before: "fragile," not "unreliable," worth verifying rather than assuming).

The larger deferred phase (unchanged, still not started):

1. **Persistent data store** — move `campaigns.ts` off a static file into a real database (e.g. Vercel Postgres or Vercel KV). Needed for anything that must persist across deploys/instances in production (Vercel's serverless filesystem is ephemeral) — the current scoped sync avoids this need entirely by using Next's fetch cache instead of a database, which is why it could ship without this.
2. **Image caching** — only if a reliable image source is ever found; do not resurrect the old inline-image approach as-is given the reliability findings above. Fetch server-side, upload a permanent copy to Vercel Blob (or Cloudflare R2), store as `cachedImageUrl` alongside `sourceImageUrl` (reference/re-fetch) and `imageStatus`. None of these fields exist on `Campaign` right now.
3. **Full data sync** (raised/goal/donor count, if donor count is later confirmed reliable) — would need real persistence (point 1) since "last successful value" needs to survive longer than an hourly cache window, unlike the current four scoped fields where an hourly re-fetch is an acceptable refresh cadence.
4. **Admin panel with auth** — shared-password login (env var + cookie) to start. Must support: manual "Refresh" per campaign, visible sync/image status (cached / failed / no image / last successful sync time), manual image upload as a fallback.
5. **Public staleness indicator** — once persistent sync timestamps exist, surface a "last updated" indicator on cards/detail pages.

None of items 1–5 should be attempted piecemeal (e.g. Blob without a DB, or a sync job without admin visibility into failures) — they depend on each other. The current scoped status/title/description/percent sync deliberately sidesteps this dependency chain by not needing persistence at all.

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint (flat config via `eslint.config.mjs`)

There is no test setup in this project (no test runner, no test files).

## Architecture

This is a freshly scaffolded `create-next-app` project (Next.js 16.2.12, React 19.2.4) using the App Router. It currently contains only the default starter page — no custom features have been built yet.

- `app/layout.tsx` — root layout; loads Geist Sans/Mono via `next/font/google` and sets them as CSS variables consumed by Tailwind.
- `app/page.tsx` — the single route (`/`), the default starter homepage.
- `app/globals.css` — Tailwind v4 is configured here via `@import "tailwindcss"` and an inline `@theme` block (no `tailwind.config.*` file — v4 uses CSS-based theme config). Light/dark colors are set via CSS variables and `prefers-color-scheme`.
- `public/` — static assets (SVGs) referenced directly by the starter page.
- Path alias `@/*` maps to the project root (`tsconfig.json`).

**Note on Next.js version**: `AGENTS.md` (imported above) warns that this Next.js version postdates this model's training data and may have breaking API/convention changes. The installed package ships its own docs at `node_modules/next/dist/docs/` — consult them before relying on prior Next.js knowledge, especially for anything beyond basic App Router usage.
