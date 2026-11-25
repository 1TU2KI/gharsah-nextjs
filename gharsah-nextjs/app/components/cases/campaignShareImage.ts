import type { Campaign } from "@/app/lib/campaigns";

type Labels = { status: string; progress: string };
const resources = new Map<string, Promise<string>>();

function dataUrl(url: string): Promise<string> {
  let cached = resources.get(url);
  if (!cached) {
    cached = fetch(url, { cache: "force-cache", credentials: "omit" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Share asset unavailable");
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Share asset could not be read"));
          reader.readAsDataURL(blob);
        });
      })
      .catch((error) => {
        resources.delete(url);
        throw error;
      });
    resources.set(url, cached);
  }
  return cached;
}

/** Embed the actual page's Cairo files, including weights and Unicode ranges. */
async function embeddedFonts(family: string): Promise<string> {
  const faces: { css: string; base: string }[] = [];
  const scan = (rules: CSSRuleList, base: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) {
        const name = rule.style.fontFamily.replace(/["']/g, "").trim();
        if (name && family.includes(name) && /url\(/i.test(rule.style.getPropertyValue("src"))) faces.push({ css: rule.cssText, base });
      } else if ("cssRules" in rule) {
        scan((rule as CSSGroupingRule).cssRules, base);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      scan(sheet.cssRules, sheet.href || document.baseURI);
    } catch {
      // Cross-origin unrelated stylesheets cannot be read. Next's own font
      // stylesheet is same-origin and is the only source needed here.
    }
  }
  if (!faces.length) throw new Error("Campaign font unavailable");
  const embedded = await Promise.all(
    faces.map(async ({ css, base }) => {
      const matches = [...css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)];
      for (const match of matches) css = css.replace(match[0], `url("${await dataUrl(new URL(match[1], base).href)}")`);
      return css;
    }),
  );
  return embedded.join("\n");
}

/**
 * Narrow, transparent story card. Text is real browser-laid-out HTML (bdi
 * included), at the site's visible font sizes; 3x export adds pixels only.
 * No donate button, link rectangle, photo background or clickable-link claim.
 */
export async function createCampaignShareImage(
  campaign: Campaign,
  locale: "ar" | "en",
  source: HTMLElement,
  labels: Labels,
): Promise<File> {
  const sourceStyle = getComputedStyle(source);
  const family = sourceStyle.fontFamily;
  const fonts = await embeddedFonts(family);
  await document.fonts.ready;
  const dark = document.documentElement.dataset.theme === "dark";
  const token = (name: string, fallback: string) => sourceStyle.getPropertyValue(name).trim() || fallback;
  const ink = token("--foreground", "#173e36");
  const muted = token("--muted", "#5b6b63");
  const primary = token("--primary", "#247465");
  const primaryDark = token("--primary-dark", "#173e36");
  const light = token("--primary-light", "#55b895");
  const track = token("--primary-100", "#acddb5");
  const width = Math.max(300, Math.min(380, Math.round(source.getBoundingClientRect().width)));
  const handle = source.querySelector("bdi");
  const handleStyle = handle ? getComputedStyle(handle) : null;
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none;visibility:hidden";
  const card = document.createElement("article");
  card.className = "shared-campaign";
  card.dir = locale === "ar" ? "rtl" : "ltr";
  const style = document.createElement("style");
  style.textContent = `${fonts}
    .shared-campaign,.shared-campaign *{box-sizing:border-box}
    .shared-campaign{width:${width}px;min-height:${Math.round(width / 1.85)}px;padding:16px;border:1px solid ${primary};border-radius:16px;display:flex;flex-direction:column;font-family:${family};font-size:16px;font-weight:400;line-height:24px;text-align:start;color:${ink};background:${dark ? "rgba(34,37,60,.82)" : "rgba(240,249,229,.74)"};background-image:linear-gradient(150deg,rgba(255,255,255,.2),transparent 55%,rgba(255,255,255,.07));box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
    .shared-campaign p,.shared-campaign h3{margin:0}
    .shared-campaign .memorial{font-size:14px;line-height:20px;color:${muted}}
    .shared-campaign bdi{direction:ltr;unicode-bidi:isolate;font-weight:700;color:${handleStyle?.color || primary};text-shadow:${handleStyle?.textShadow || "none"}}
    .shared-campaign .badges{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}
    .shared-campaign .badge{display:inline-flex;gap:6px;align-items:center;padding:4px 12px;border-radius:999px;font-size:12px;line-height:12px;font-weight:600;background:${primaryDark};color:white}
    .shared-campaign .platform{background:${token("--primary-50", "#e5f1cd")};color:${primaryDark}}
    .shared-campaign .badge svg,.shared-campaign .badge img{width:14px;height:14px;object-fit:contain}
    .shared-campaign h3{margin-top:8px;font-size:18px;line-height:28px;font-weight:700;overflow-wrap:anywhere}
    .shared-campaign .description{margin-top:8px;font-size:14px;line-height:24px;font-weight:400;color:${muted};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .shared-campaign .progress{margin-top:auto;padding-top:16px}
    .shared-campaign .track{height:8px;overflow:hidden;border-radius:999px;background:${track}}
    .shared-campaign .fill{height:100%;border-radius:999px;background:linear-gradient(to left,${primary},${light})}
    .shared-campaign .caption{margin-top:6px;font-size:12px;line-height:16px;color:${muted}}
  `;
  const memorial = document.createElement("p");
  memorial.className = "memorial";
  memorial.append(document.createTextNode(campaign.relation[locale]));
  if (campaign.username) {
    const username = document.createElement("bdi");
    username.dir = "ltr";
    username.textContent = `@${campaign.username}`;
    memorial.append(" ", username);
  }
  if (campaign.memorialPrefix) memorial.append(` ${campaign.memorialPrefix[locale]}`);
  card.append(memorial);
  const badges = document.createElement("div");
  badges.className = "badges";
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M2 12h4l2-7 4 14 2-7h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  badge.append(labels.status);
  const platform = document.createElement("span");
  platform.className = "badge platform";
  platform.append(campaign.platformLabel[locale]);
  if (campaign.platformLogo) {
    try {
      const logo = document.createElement("img");
      logo.src = await dataUrl(new URL(campaign.platformLogo, document.baseURI).href);
      logo.alt = "";
      platform.append(logo);
    } catch {
      // The platform's readable name remains if its optional logo fails.
    }
  }
  badges.append(badge, platform);
  card.append(badges);
  const title = document.createElement("h3");
  title.textContent = campaign.title[locale];
  card.append(title);
  if (campaign.description[locale]) {
    const description = document.createElement("p");
    description.className = "description";
    description.textContent = campaign.description[locale]!;
    card.append(description);
  }
  if (typeof campaign.percent === "number" && Number.isFinite(campaign.percent)) {
    const progress = document.createElement("div");
    progress.className = "progress";
    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.max(0, Math.min(100, campaign.percent))}%`;
    track.append(fill);
    const caption = document.createElement("p");
    caption.className = "caption";
    caption.textContent = labels.progress;
    progress.append(track, caption);
    card.append(progress);
  }
  wrapper.append(style, card);
  document.body.append(wrapper);
  try {
    const height = Math.ceil(card.getBoundingClientRect().height);
    const node = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    node.style.cssText = `width:${width}px;height:${height}px`;
    node.append(style.cloneNode(true), card.cloneNode(true));
    const html = new XMLSerializer().serializeToString(node);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="${width}" height="${height}">${html}</foreignObject></svg>`;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * 3;
    canvas.height = height * 3;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG unavailable"))), "image/png"),
    );
    return new File([blob], `gharsah-${campaign.slug}.png`, { type: "image/png" });
  } finally {
    wrapper.remove();
  }
}
