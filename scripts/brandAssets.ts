import { writeFileSync } from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { escapeHtml, SITE_DESCRIPTION } from "../shared/seo";

export const BRAND_BACKGROUND = "#101215";
export const BRAND_ACCENT = "#bba1ff";
export const ICON_SIZES = [180, 192, 512] as const;

/** The favicon.svg conversation mark, scaled for touch and install icons. */
export function renderIcon(size: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  // Full-bleed background keeps the mark inside maskable and iOS safe areas.
  ctx.fillStyle = BRAND_ACCENT;
  ctx.fillRect(0, 0, size, size);
  const unit = size / 64 * 0.78;
  const offset = (size - 64 * unit) / 2;
  const at = (value: number) => offset + value * unit;
  ctx.fillStyle = BRAND_BACKGROUND;
  ctx.beginPath(); ctx.roundRect(at(12), at(15), 40 * unit, 28 * unit, 8 * unit); ctx.fill();
  ctx.beginPath(); ctx.moveTo(at(20), at(41)); ctx.lineTo(at(20), at(51)); ctx.lineTo(at(31), at(41)); ctx.fill();
  ctx.fillStyle = BRAND_ACCENT;
  for (const x of [22, 32, 42]) { ctx.beginPath(); ctx.arc(at(x), at(29), 3.6 * unit, 0, Math.PI * 2); ctx.fill(); }
  return canvas.encodeSync("png");
}

export const iconFile = (size: number) => size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;

export function webManifest(base: string) {
  return {
    name: "CoBanter",
    short_name: "CoBanter",
    description: SITE_DESCRIPTION,
    start_url: base,
    scope: base,
    display: "standalone",
    background_color: BRAND_BACKGROUND,
    theme_color: BRAND_BACKGROUND,
    icons: [
      { src: `${base}favicon.svg`, sizes: "any", type: "image/svg+xml" },
      ...ICON_SIZES.filter(size => size !== 180).map(size => ({ src: `${base}${iconFile(size)}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any maskable" })),
    ],
  };
}

/** Head links shared by every generated page; the SVG favicon is also in index.html for development. */
export function brandHead(base: string): string {
  return `<link rel="apple-touch-icon" href="${escapeHtml(base)}apple-touch-icon.png"><link rel="manifest" href="${escapeHtml(base)}site.webmanifest">`;
}

export function writeBrandAssets(dist: string, base: string) {
  for (const size of ICON_SIZES) writeFileSync(path.join(dist, iconFile(size)), renderIcon(size));
  writeFileSync(path.join(dist, "site.webmanifest"), JSON.stringify(webManifest(base), null, 2));
}
