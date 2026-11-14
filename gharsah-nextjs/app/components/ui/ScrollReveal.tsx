"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * Site-wide scroll entrance motion for the public pages, modelled on
 * ehsan.sa (AOS defaults it uses: fade-up, 100px travel, 2s `ease`,
 * triggered 120px before the element's top enters the viewport, `once:
 * false` — it replays when scrolled back up and down again). Timing values
 * live in globals.css (`--motion-reveal-*`); this component only decides
 * WHICH elements reveal and WHEN.
 *
 * Targets are picked here by selector (no per-component attributes):
 * section headings and their intro paragraphs, and every card-like glass
 * surface inside <main>, each animating on its own like Ehsan's cards. A
 * target nested in another target is skipped. Excluded: the homepage hero
 * (Ehsan's hero isn't animated), anything inside the phone swipe row (the
 * row itself reveals, so cards never move inside a clipped scroller), the
 * header/drawer/footer (outside <main>).
 *
 * Never blocks interaction: only opacity/transform change, pointer events
 * and navigation are untouched. With prefers-reduced-motion it does nothing.
 */
const TARGETS = [
  "main section h1",
  "main section h2",
  "main section h1 ~ p",
  "main section h2 ~ p",
  "main .campaign-swipe",
  "main .glass-surface",
  // Opt-in: reveal a whole interactive block as one unit, so the glass
  // surfaces inside it (skipped as nested targets) never get reveal state
  // that a React className re-render could wipe (see ContactForms.tsx).
  "main [data-reveal-group]",
].join(",");

/** AOS offset 120px, minus the 100px the hidden element is already shifted down. */
const ROOT_MARGIN = "0px 0px -20px 0px";

export default function ScrollReveal() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add("is-revealed");
          } else if (entry.rootBounds && entry.boundingClientRect.top > entry.rootBounds.bottom) {
            // Back below the trigger line (scrolled up past it): reset so it
            // replays next time — AOS `once: false`. Elements that left
            // through the TOP stay revealed.
            el.classList.remove("is-revealed");
          }
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    const tracked = new Set<Element>();

    function scan() {
      // Content streamed in after a loading boundary replaces earlier nodes.
      tracked.forEach((el) => {
        if (!el.isConnected) {
          observer.unobserve(el);
          tracked.delete(el);
        }
      });
      const hero = pathname === "/" ? document.querySelector("main > section:first-child") : null;
      const fresh: HTMLElement[] = [];
      document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
        if (tracked.has(el)) return;
        if (hero?.contains(el)) return;
        if (el.closest(".campaign-swipe") && !el.classList.contains("campaign-swipe")) return;
        // Skip a target nested inside another target (it moves with its parent).
        if (el.parentElement?.closest(TARGETS)) return;
        tracked.add(el);
        fresh.push(el);
      });
      if (!fresh.length) return;
      // Apply the hidden start state without animating INTO it.
      for (const el of fresh) {
        el.classList.add("reveal-instant");
        el.setAttribute("data-reveal", "");
      }
      void document.body.offsetHeight;
      for (const el of fresh) {
        el.classList.remove("reveal-instant");
        observer.observe(el);
      }
    }

    scan();

    // Content that renders later (streamed after the loading boundary,
    // sorting, client components) — <body>, since <main> itself is replaced.
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      tracked.forEach((el) => {
        el.removeAttribute("data-reveal");
        el.classList.remove("is-revealed");
      });
    };
  }, [pathname]);

  return null;
}
