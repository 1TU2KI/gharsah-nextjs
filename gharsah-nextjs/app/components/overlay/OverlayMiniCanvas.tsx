"use client";

import { useEffect, useRef, useState } from "react";

export const OVERLAY_CANVAS_WIDTH = 1920;
export const OVERLAY_CANVAS_HEIGHT = 1080;

/**
 * One canvas implementation, shared by BOTH overlay types' small/large
 * previews (originally built for Campaign Overlay only) — never a second
 * hand-maintained scaling implementation. `renderOverlay` is a render prop
 * so this component never needs to know whether it's mounting the campaign
 * or the Gharsah client — keeps the two rendering paths fully separated
 * (see the implementation plan) while sharing every pixel of the actual
 * scaling/canvas mechanics.
 *
 * What differs between "مصغرة" and "كبيرة" is only:
 * 1. the actual rendered width of the container this sits in (set by the
 *    caller's layout), and
 * 2. the virtual canvas's own reference size (`canvasWidth`/`canvasHeight`,
 *    defaulting to the real 1920×1080 OBS canvas) — a compact preview
 *    passes a much smaller virtual canvas so the SAME unmodified card ends
 *    up filling most of the frame instead of sitting tiny in a corner, a
 *    genuine zoom rather than a resized container.
 *
 * The rendered overlay's own wrapper is `position: fixed`, which would
 * otherwise anchor to the real browser viewport — this canvas's CSS
 * `transform` makes it the containing block for fixed-positioned
 * descendants per spec, so the overlay correctly anchors within THIS
 * virtual canvas instead. Scale is measured live via ResizeObserver (not a
 * fixed guess) so the virtual canvas fits whatever width it's actually
 * given, at any screen size, while its height always keeps the same 16:9
 * ratio as the container.
 *
 * `center` (only ever passed for "معاينة مصغرة") is forwarded straight
 * through to `renderOverlay` so the caller's own client component can
 * flex-center the card in the middle of the canvas via its own `center`
 * prop, instead of the real overlay's corner-anchored `position`.
 */
export default function OverlayMiniCanvas({
  label,
  hint,
  canvasWidth = OVERLAY_CANVAS_WIDTH,
  center = false,
  renderOverlay,
}: {
  label: string;
  hint: string;
  /** Reference width of the virtual canvas the overlay anchors within — smaller means the same real card fills more of the frame. Defaults to the true 1920 OBS canvas width. */
  canvasWidth?: number;
  center?: boolean;
  /** Mounts the actual overlay client for this frame — receives `center` to forward to its own client component. */
  renderOverlay: (center: boolean) => React.ReactNode;
}) {
  const canvasHeight = canvasWidth * (OVERLAY_CANVAS_HEIGHT / OVERLAY_CANVAS_WIDTH);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(width / canvasWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvasWidth]);

  return (
    <div>
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div ref={canvasRef} className="overlay-public-preview relative mt-1.5 w-full overflow-hidden rounded-xl border border-primary/15">
        {scale > 0 && (
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})` }}>
            {renderOverlay(center)}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">{hint}</p>
    </div>
  );
}
