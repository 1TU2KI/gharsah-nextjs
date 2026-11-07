"use client";

import { useEffect, useRef } from "react";

/*
 * Light Mode background, rebuilt from the "Mint tonic" reference video
 * (D:\DOWNLOAD\twitter_media_harvest\Mint tonic (1).mp4, 1920×1412 @ 30fps).
 * Every number below was MEASURED from the video's frames, not eyeballed:
 *
 * - 80px-wide vertical slats, mirrored around the horizontal center, sliding
 *   OUTWARD (left half moves left, right half moves right) by exactly one
 *   slat width per 104 frames = 3.4667s, then the pattern repeats — a new
 *   slat grows out of the center line each cycle. Slat edges are crisp
 *   (flat color across each slat's width; the "lines" are just the seams
 *   between neighbouring slats).
 * - Every slat shows the SAME vertical color ramp (deep green → mint →
 *   pale cream), shifted vertically by CURVE evaluated at the slat's own
 *   current center x — a smooth diagonal curve low on the right, high on the
 *   left. That's what makes the seams visible: neighbours sit at slightly
 *   different heights.
 * - No grain, no glow, no other motion: frames are flat outside the ramp.
 *
 * Verified by rendering this exact model offline and diffing against real
 * steady-state video frames: mean error ≈0.5/255 per channel, 0% of pixels
 * off by more than 12/255.
 *
 * Drawn in the video's own 1920×1412 coordinate space and scaled to COVER
 * the viewport (centered crop), like the video would if used as a cover
 * background. The phase is derived from wall-clock time, so every mounted
 * instance (the fixed page background AND InitialLoadOverlay's cover) is
 * frame-for-frame in sync — the overlay's fade-out reveals the identical
 * picture underneath with no seam.
 *
 * Three measured presets share this exact model (see PRESETS). Light Mode:
 * "mint" (site-wide default) and "petrol" (Petrol.mp4, Completed Campaigns
 * page only — chosen by route in AmbientBackground/InitialLoadOverlay).
 * Dark Mode: "saffron" (Saffron ink.mp4) on every page. The theme is read
 * live, so switching themes repaints with the other preset at once.
 */

const DESIGN_W = 1920;
const DESIGN_H = 1412;
const CENTER_X = DESIGN_W / 2;
const CURVE_X0 = -40;
const CURVE_STEP = 40;
const RAMP_STEP = 20;

type SlatPreset = {
  /** Slat width in design px. */
  slatW: number;
  /** Time for the slats to slide by exactly one slat width. */
  loopMs: number;
  /** 1 = slats slide outward from the center (default), -1 = inward. */
  direction?: 1 | -1;
  /** y (design px) of the ramp's 50% point, sampled at x = -40, 0, 40, … 1960. */
  curve: number[];
  /** Vertical ramp, one stop every 20 design px starting rampAbove px above
      the 50% point. Solid first color above, solid last color below. */
  ramp: string[];
  rampAbove: number;
};

export type SlatVariant = "mint" | "petrol" | "saffron";

const PRESETS: Record<SlatVariant, SlatPreset> = {
  // "Mint tonic (1).mp4" — the site-wide Light Mode background. 24 slats
  // per width, one slat per 104 frames @30fps.
  mint: {
    slatW: 80,
    loopMs: (104 / 30) * 1000,
    curve: [
      609.5, 610, 610.8, 612.1, 614.2, 617.7, 622.8, 629, 635.5, 641.5, 648.9, 657.1, 666.1, 676.1, 686.5, 697,
      708.7, 720.7, 732, 744, 756.8, 769.6, 782.2, 795.1, 808.4, 821.9, 834.8, 847.6, 860.6, 873, 885.8, 898.5,
      910.6, 922.4, 934.7, 946.5, 957, 966.9, 976.6, 985.3, 993.9, 1001.4, 1009.1, 1015.7, 1020.5, 1025.3, 1029.1,
      1031.6, 1033.1, 1033, 1033.7,
    ],
    ramp: [
      "#163e35", "#163e35", "#164138", "#18463c", "#1a4b42", "#1a5046", "#1c554b", "#1e5b51", "#1f6155",
      "#20685b", "#226f61", "#277768", "#2d806e", "#338873", "#39927a", "#409a80", "#47a487", "#4eae8e",
      "#57b694", "#63bc99", "#70c19d", "#7cc6a1", "#87cba5", "#92d0aa", "#9dd5ae", "#a7d9b2", "#afddb5",
      "#b8dfb9", "#bee1bc", "#c4e4be", "#cbe6c1", "#d0e7c3", "#d6ebc7", "#dcedc8", "#e0eeca", "#e4f1cc",
      "#e4f1cc",
    ],
    rampAbove: 340,
  },
  // "Petrol.mp4" — Completed Campaigns page (/cases/completed) only
  // (replaces the earlier Glacier preset entirely). 24 slats per width,
  // sliding INWARD toward the center at 23.04 design px/s (one slat per
  // 3.472s); steeper curve whose right end runs below the frame. Measured
  // the same way as Mint (mean error vs. settled video frames ≈0.4/255).
  petrol: {
    slatW: 80,
    loopMs: 3472,
    direction: -1,
    curve: [
      617.8, 618.1, 619.1, 621, 624.8, 631.1, 639.2, 648.8, 660.7, 674.2, 689.4, 706.1, 724.4, 743.6, 764.1,
      785.9, 808.8, 832.4, 856.7, 881.8, 907.8, 934, 960.6, 987.6, 1014.8, 1042.1, 1069.4, 1096.4, 1123.6,
      1150.3, 1176.5, 1202.2, 1227.4, 1251.9, 1275.4, 1298, 1319.7, 1340.3, 1359.7, 1377.6, 1394.1, 1409.5,
      1422.9, 1434.5, 1444.3, 1452.8, 1459.2, 1463.3, 1464.9, 1465.2, 1465.9,
    ],
    ramp: [
      "#113d48", "#113f4b", "#124350", "#144854", "#154e5a", "#175460", "#195a66", "#1a616c", "#1c6873",
      "#1d6f7a", "#217781", "#287e88", "#2e848d", "#358c93", "#3c9399", "#439aa0", "#4ba2a6", "#53aaac",
      "#5eb1b0", "#6bb7b4", "#78bdb9", "#84c4bd", "#90cac1", "#9bd0c5", "#a7d7c9", "#b0dbcb", "#b8decd",
      "#c0e1cf", "#c8e5d1", "#cfe7d2", "#d6ead4", "#dcebd3", "#e2efd5", "#e7f1d6", "#ecf3d8", "#edf4d9",
    ],
    rampAbove: 340,
  },
  // "Saffron ink.mp4" — the public site's Dark Mode background (every
  // page). Same model: 87.22px slats mirrored about the center, sliding
  // OUTWARD at 20.1 design px/s (one slat per 130.18 frames = 4.339s),
  // deep navy → mauve → saffron → cream. Measured the same way (steady
  // frames 240–298, mean error vs. the video ≈0.45/255, 0% of pixels off
  // by more than 12/255).
  saffron: {
    slatW: 87.22,
    loopMs: (87.22 / 0.67001 / 30) * 1000,
    curve: [
      598.8, 601.7, 602.9, 604.2, 606.8, 610.7, 615.2, 620.6, 626.9, 634.3, 641.9, 650.2, 659.4, 668.9, 679.1, 689.4,
      700.6, 712.5, 724.4, 736.5, 748.9, 761.8, 774.8, 787.6, 801, 814.5, 827.4, 840.3, 853.4, 866.3, 879, 891.6, 904,
      916, 927.5, 938.7, 949.1, 959.2, 968.9, 978.2, 986.7, 994.4, 1001.1, 1007.3, 1012.6, 1017.2, 1020.8, 1023.6,
      1025.4, 1026.1, 1025,
    ],
    ramp: [
      "#262a43", "#262a43", "#292b45", "#2f2f48", "#34324c", "#3b3651", "#413954", "#483e58", "#50435e",
      "#584863", "#604d68", "#69526c", "#72576d", "#7d5d70", "#876272", "#916773", "#9c6d74", "#a87276",
      "#b27777", "#ba7d76", "#c28374", "#c98972", "#d0906f", "#d7956d", "#dd9a69", "#e5a067", "#e9a667",
      "#ebad6e", "#edb375", "#efb97b", "#f0be81", "#f1c488", "#f2ca8f", "#f3ce93", "#f4d398", "#f4d79d",
      "#f6d9a0", "#f6d9a0",
    ],
    rampAbove: 340,
  },
};

/** Dark Mode always uses the Saffron ink slats; Light Mode the route's preset. */
const DARK_VARIANT: SlatVariant = "saffron";

function curveAt(curve: number[], x: number): number {
  const i = Math.max(0, Math.min(curve.length - 1.0001, (x - CURVE_X0) / CURVE_STEP));
  const a = Math.floor(i);
  const t = i - a;
  return curve[a] * (1 - t) + curve[a + 1] * t;
}

function rampSpan(p: SlatPreset): number {
  return (p.ramp.length - 1) * RAMP_STEP;
}

function buildRamp(p: SlatPreset): HTMLCanvasElement {
  const span = rampSpan(p);
  const ramp = document.createElement("canvas");
  ramp.width = 1;
  ramp.height = span;
  const rctx = ramp.getContext("2d")!;
  const g = rctx.createLinearGradient(0, 0, 0, span);
  p.ramp.forEach((c, i) => g.addColorStop(i / (p.ramp.length - 1), c));
  rctx.fillStyle = g;
  rctx.fillRect(0, 0, 1, span);
  return ramp;
}

/** Draws the same cover-scaled background on the site and on exported story images. */
export function createSlatFramePainter(variant: SlatVariant) {
  const preset = PRESETS[variant];
  const { slatW: SLAT_W, loopMs: LOOP_MS, curve: CURVE, rampAbove: RAMP_ABOVE } = preset;
  const RAMP_SPAN = rampSpan(preset);
  const TOP_COLOR = preset.ramp[0];
  const BOTTOM_COLOR = preset.ramp[preset.ramp.length - 1];
  const ramp = buildRamp(preset);

  return (ctx: CanvasRenderingContext2D, nowMs: number) => {
    const { width: cw, height: ch } = ctx.canvas;
    const s = Math.max(cw / DESIGN_W, ch / DESIGN_H);
    const ox = (cw - DESIGN_W * s) / 2;
    const oy = (ch - DESIGN_H * s) / 2;
    const phase = (nowMs % LOOP_MS) / LOOP_MS;
    const u = (preset.direction === -1 ? 1 - phase : phase) * SLAT_W;

    ctx.imageSmoothingEnabled = true;

    // Slat boundaries measured outward from center: 0, u, u+w, u+2w, …
    const bounds = [0];
    for (let d = u; d < CENTER_X + SLAT_W; d += SLAT_W) if (d > 0) bounds.push(d);

    for (const side of [-1, 1]) {
      for (let i = 0; i < bounds.length - 1; i++) {
        const a = bounds[i];
        const b = bounds[i + 1];
        const xa = CENTER_X + side * a;
        const xb = CENTER_X + side * b;
        const left = Math.round(ox + Math.min(xa, xb) * s);
        const right = Math.round(ox + Math.max(xa, xb) * s);
        const x0 = Math.max(0, left);
        const x1 = Math.min(cw, right);
        if (x1 <= x0) continue;

        const y50 = curveAt(CURVE, CENTER_X + side * ((a + b) / 2));
        const rampTop = oy + (y50 - RAMP_ABOVE) * s;
        const rampH = RAMP_SPAN * s;
        const w = x1 - x0;

        const topEnd = Math.max(0, Math.min(ch, Math.round(rampTop)));
        if (topEnd > 0) {
          ctx.fillStyle = TOP_COLOR;
          ctx.fillRect(x0, 0, w, topEnd);
        }
        ctx.drawImage(ramp, 0, 0, 1, RAMP_SPAN, x0, rampTop, w, rampH);
        const botStart = Math.max(0, Math.round(rampTop + rampH));
        if (botStart < ch) {
          ctx.fillStyle = BOTTOM_COLOR;
          ctx.fillRect(x0, botStart, w, ch - botStart);
        }
      }
    }
  };
}

function relLum([r, g, b]: number[]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Relative luminance of the background at a viewport point (CSS px) at a
 * given time — the same cover-scaled slat geometry createSlatFramePainter
 * draws, evaluated analytically (no canvas pixel reads).
 */
function createSlatLuminanceSampler(variant: SlatVariant) {
  const p = PRESETS[variant];
  const span = rampSpan(p);
  const stops = p.ramp.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const lum = new Float32Array(span + 1);
  for (let r = 0; r <= span; r++) {
    const i = r / RAMP_STEP;
    const a = Math.min(stops.length - 2, Math.floor(i));
    const t = i - a;
    lum[r] = relLum([0, 1, 2].map((k) => stops[a][k] * (1 - t) + stops[a + 1][k] * t));
  }

  return (x: number, y: number, vw: number, vh: number, nowMs: number) => {
    const s = Math.max(vw / DESIGN_W, vh / DESIGN_H);
    const dx = (x - (vw - DESIGN_W * s) / 2) / s;
    const dy = (y - (vh - DESIGN_H * s) / 2) / s;
    const phase = (nowMs % p.loopMs) / p.loopMs;
    const u = (p.direction === -1 ? 1 - phase : phase) * p.slatW;
    const side = dx < CENTER_X ? -1 : 1;
    const d = Math.abs(dx - CENTER_X);
    // Slat boundaries from the center: 0, u, u+w, u+2w, … (see the painter).
    const center = d < u ? u / 2 : u + (Math.floor((d - u) / p.slatW) + 0.5) * p.slatW;
    const r = dy - (curveAt(p.curve, CENTER_X + side * center) - p.rampAbove);
    return r <= 0 ? lum[0] : r >= span ? lum[span] : lum[Math.round(r)];
  };
}

/* Adaptive text color for `.on-slat-bg` text (see globals.css): for every
   element carrying one of these role classes inside an `.on-slat-bg`
   group, compare the worst-case contrast of its light vs. dark color over
   the background currently behind its text, and set --slat-t (0 light /
   1 dark). Luminances are the WORST member of each color set (Willow
   Mist / Inked Willow), so whichever side wins holds for every role. */
const ROLE_SELECTOR =
  ".text-foreground, .text-foreground\\/90, .text-muted, .text-muted\\/70, .text-primary-dark, .text-completed-link";
// Per theme: [worst light-text luminance, worst dark-text luminance].
// Light Mode: Moss Silk #acddb5 (the `.accent-link` light color, dimmest
// light role) / Inked Willow. Dark Mode (Saffron ink): gold-cream #f2ca8f
// (`.accent-link`) / deep navy #1f2237 (see globals.css).
const TEXT_L = {
  light: [relLum([172, 221, 181]), relLum([23, 62, 54])],
  dark: [relLum([242, 202, 143]), relLum([31, 34, 55])],
} as const;
// The other color must be this much better before an element switches,
// so text sitting right at the boundary doesn't flip back and forth.
const SWITCH_MARGIN = 1.15;

function startAdaptiveText(variant: SlatVariant, reduceMotion: boolean) {
  const sampleLight = createSlatLuminanceSampler(variant);
  const sampleDark = createSlatLuminanceSampler(DARK_VARIANT);
  const current = new WeakMap<Element, number>();
  let frame = 0;

  function update() {
    frame = 0;
    const dark = isDark();
    const sample = dark ? sampleDark : sampleLight;
    const [LIGHT_TEXT_L, DARK_TEXT_L] = dark ? TEXT_L.dark : TEXT_L.light;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const now = reduceMotion ? 0 : performance.timeOrigin + performance.now();
    const groups = new Map<Element, DOMRect[]>();

    for (const host of document.querySelectorAll(".on-slat-bg")) {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const role = node.parentElement?.closest(ROLE_SELECTOR);
        if (!role || !host.contains(role)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = groups.get(role) ?? [];
        for (const rect of range.getClientRects()) {
          if (rect.width >= 1 && rect.bottom > 0 && rect.top < vh) rects.push(rect);
        }
        groups.set(role, rects);
      }
    }

    for (const [role, rects] of groups) {
      if (!rects.length) continue;
      let worstLight = Infinity;
      let worstDark = Infinity;
      for (const rect of rects) {
        const stepX = Math.max(8, rect.width / 16);
        for (const fy of [0.3, 0.7]) {
          const y = rect.top + rect.height * fy;
          for (let x = rect.left + 2; x < rect.right; x += stepX) {
            const bg = sample(x, y, vw, vh, now);
            worstLight = Math.min(worstLight, (LIGHT_TEXT_L + 0.05) / (bg + 0.05));
            worstDark = Math.min(worstDark, (bg + 0.05) / (DARK_TEXT_L + 0.05));
          }
        }
      }
      const was = current.get(role) ?? 0;
      let next = was;
      if (was === 0 && worstDark > worstLight * SWITCH_MARGIN) next = 1;
      else if (was === 1 && worstLight > worstDark * SWITCH_MARGIN) next = 0;
      if (next !== was || !current.has(role)) {
        current.set(role, next);
        (role as HTMLElement).style.setProperty("--slat-t", String(next));
      }
    }
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  update();
  // ~10x/s follows the animation; scroll moves text over the fixed background.
  const interval = reduceMotion ? 0 : window.setInterval(update, 100);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return () => {
    clearInterval(interval);
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

function isDark(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/** Static pre-hydration fallback (no slats) so first paint is the right tones. */
function fallbackBg(p: SlatPreset): string {
  const mid = curveAt(p.curve, CENTER_X);
  const pct = (y: number) => `${((y / DESIGN_H) * 100).toFixed(1)}%`;
  return `linear-gradient(to bottom, ${p.ramp[0]} ${pct(mid - p.rampAbove)}, ${p.ramp[Math.round(p.rampAbove / RAMP_STEP)]} ${pct(mid)}, ${p.ramp[p.ramp.length - 1]} ${pct(mid - p.rampAbove + rampSpan(p))})`;
}

export default function MintTonicBackground({
  className = "",
  variant = "mint",
  adaptText = false,
}: {
  className?: string;
  variant?: SlatVariant;
  /** Drive the adaptive `.on-slat-bg` text color (page background only). */
  adaptText?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paintLight = createSlatFramePainter(variant);
    const paintDark = createSlatFramePainter(DARK_VARIANT);
    const draw = (time: number) => (isDark() ? paintDark : paintLight)(ctx, time);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafId = 0;
    let running = false;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
    }

    const now = () => performance.timeOrigin + performance.now();

    function loop() {
      if (!running) return;
      draw(now());
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      // Always paint one frame immediately (even in a background tab), so
      // the canvas is never blank; only the rAF loop waits for visibility.
      draw(reduceMotion ? 0 : now());
      if (reduceMotion || document.hidden) return;
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    resize();
    start();
    const stopAdaptiveText = adaptText ? startAdaptiveText(variant, reduceMotion) : undefined;

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    let resizeTimeout: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resize();
        draw(reduceMotion ? 0 : now());
      }, 100);
    }

    // Theme switch: repaint at once with the other preset (the rAF loop, if
    // running, simply continues with it).
    const themeObserver = new MutationObserver(() => start());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);

    return () => {
      stop();
      stopAdaptiveText?.();
      clearTimeout(resizeTimeout);
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
    };
  }, [variant, adaptText]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`mint-tonic-bg pointer-events-none ${className}`}
      // Pre-hydration fallback per theme (globals.css picks one).
      style={
        {
          "--slat-fb-light": fallbackBg(PRESETS[variant]),
          "--slat-fb-dark": fallbackBg(PRESETS[DARK_VARIANT]),
        } as React.CSSProperties
      }
    />
  );
}
