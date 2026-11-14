"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating Liquid Glass thumb for the MAIN page scrollbar (public site only —
 * mounted in app/(site)/layout.tsx).
 *
 * Why it exists: on Windows (classic scrollbars) Chrome/Edge always give the
 * page scrollbar its own lane beside the layout, so the header and the fixed
 * background stop short of the screen edge and a strip of the base color
 * shows. No CSS can make that native bar overlay the page any more
 * (`overflow: overlay` is now just `auto`). So, ONLY where the browser uses
 * classic space-taking scrollbars, the native page bar is hidden
 * (`html[data-custom-scrollbar]`, globals.css) and this thumb floats over the
 * page instead. Where scrollbars already overlay (macOS, phones, tablets),
 * nothing changes and this renders nothing.
 *
 * Scrolling itself stays fully native (wheel, trackpad, touch, keyboard,
 * find-in-page); this only mirrors the position and adds pointer dragging and
 * click-to-jump on an invisible lane. Inner scrollers keep their own native
 * scrollbars. Hidden from assistive tech — the page remains natively
 * scrollable, so nothing is lost.
 */

const INSET = 6; // px gap above/below the thumb's travel
const LENGTH_FACTOR = 0.7; // shorter than the native thumb
const MIN_LENGTH = 40;

/** Width the browser reserves for a classic scrollbar (0 = overlay scrollbars). */
function classicScrollbarWidth(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;";
  document.body.appendChild(probe);
  const w = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return w;
}

export default function PageScrollbar() {
  const [enabled, setEnabled] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const metrics = useRef({ track: 0, thumb: 0, max: 0 });

  useEffect(() => {
    if (classicScrollbarWidth() === 0) return;
    const root = document.documentElement;
    root.setAttribute("data-custom-scrollbar", "");
    // Hiding the native bar is an external-system sync, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
    return () => root.removeAttribute("data-custom-scrollbar");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const thumb = thumbRef.current;
    const lane = laneRef.current;
    if (!thumb || !lane) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const content = document.documentElement.scrollHeight;
      const max = content - viewport;
      // Body `overflow: hidden` (open mobile menu) locks the page: like the
      // native bar, the thumb goes away while nothing can scroll.
      const locked = getComputedStyle(document.body).overflowY === "hidden";
      const show = max > 1 && !locked;
      lane.style.display = show ? "" : "none";
      if (!show) return;
      const track = viewport - INSET * 2;
      const length = Math.max(MIN_LENGTH, Math.round((viewport / content) * track * LENGTH_FACTOR));
      const top = INSET + (window.scrollY / max) * (track - length);
      metrics.current = { track, thumb: length, max };
      thumb.style.height = `${length}px`;
      thumb.style.transform = `translate3d(0, ${top}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    const bodyStyle = new MutationObserver(schedule);
    bodyStyle.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });

    // Drag the thumb: pointer movement maps 1:1 onto the thumb's travel.
    let dragStartY = 0;
    let dragStartScroll = 0;
    const onThumbDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragStartY = e.clientY;
      dragStartScroll = window.scrollY;
      thumb.setPointerCapture(e.pointerId);
      thumb.classList.add("is-dragging");
    };
    const onThumbMove = (e: PointerEvent) => {
      if (!thumb.hasPointerCapture(e.pointerId)) return;
      const { track, thumb: length, max } = metrics.current;
      const travel = track - length;
      if (travel <= 0) return;
      window.scrollTo({ top: dragStartScroll + ((e.clientY - dragStartY) / travel) * max, behavior: "instant" });
    };
    const onThumbUp = (e: PointerEvent) => {
      if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
      thumb.classList.remove("is-dragging");
    };
    // Click the empty lane: jump so the thumb centers on the pointer.
    const onLaneDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.target === thumb) return;
      e.preventDefault();
      const { track, thumb: length, max } = metrics.current;
      const travel = track - length;
      if (travel <= 0) return;
      const ratio = Math.min(1, Math.max(0, (e.clientY - INSET - length / 2) / travel));
      window.scrollTo({ top: ratio * max, behavior: "instant" });
    };

    thumb.addEventListener("pointerdown", onThumbDown);
    thumb.addEventListener("pointermove", onThumbMove);
    thumb.addEventListener("pointerup", onThumbUp);
    thumb.addEventListener("pointercancel", onThumbUp);
    lane.addEventListener("pointerdown", onLaneDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
      bodyStyle.disconnect();
      thumb.removeEventListener("pointerdown", onThumbDown);
      thumb.removeEventListener("pointermove", onThumbMove);
      thumb.removeEventListener("pointerup", onThumbUp);
      thumb.removeEventListener("pointercancel", onThumbUp);
      lane.removeEventListener("pointerdown", onLaneDown);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={laneRef} className="page-scrollbar-lane" aria-hidden="true">
      <div ref={thumbRef} className="page-scrollbar-thumb" />
    </div>
  );
}
