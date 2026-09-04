import AlmostThereCard from "./AlmostThereCard";
import type { Campaign } from "../../lib/campaigns";

/**
 * Shared "podium" arrangement for the اقتربت.../Almost There campaigns —
 * used by BOTH the homepage's compact section (AlmostThereSectionClient)
 * and the dedicated /near page, so the visual layout (and the ranking that
 * feeds it, see almostThere.ts) is defined in exactly one place rather than
 * duplicated per surface.
 *
 * Mobile: a plain top-to-bottom stack in rank order (#1, #2, #3) — DOM
 * order already IS rank order, so this needs no CSS at all below `md:`.
 * From `md:` up, `order-*` rearranges the SAME three cards into a podium:
 * #1 visually centered and physically larger (`md:scale-110`, see
 * AlmostThereCard's own doc comment), #2 and #3 flanking it at the same
 * (smaller) size as each other. Using `order` rather than reordering the
 * DOM means this naturally mirrors for English (ltr) the same way every
 * other bidi-aware layout in this project already does via the page's
 * `dir` attribute — nothing new introduced here.
 *
 * Vertical alignment on the podium row is `align-items: center` (not
 * `stretch`): #2/#3 share one natural height, and centering distributes
 * #1's scaled-up extra size evenly above AND below them on the row's cross
 * axis, rather than `stretch`'s effect of anchoring every card to the same
 * top edge (which would read as #1's extra size as pure downward
 * overflow). This is a plain named class (`.almost-there-grid` in
 * globals.css) rather than a `md:items-*` Tailwind utility: this project's
 * Tailwind build has proven unreliable at picking up brand-new
 * utility/variant combinations on save (same category of issue already
 * documented for arbitrary bracket values elsewhere in globals.css) — a
 * named rule sidesteps that risk entirely.
 */
export default function AlmostThereGrid({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="almost-there-grid flex flex-col gap-6 md:flex-row">
      {campaigns.map((campaign, index) => (
        <AlmostThereCard key={campaign.slug} campaign={campaign} rank={index + 1} />
      ))}
    </div>
  );
}
