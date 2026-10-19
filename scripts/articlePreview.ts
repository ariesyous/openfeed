import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import type { FeedItem } from "../schemas";
import { articleRouteSlug } from "../shared/articles";
import { topicLabel } from "../shared/topics";

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
const FAMILY = "CoBanter Preview";
let fontsLoaded = false;

function loadFonts() {
  if (fontsLoaded) return;
  for (const weight of ["Regular", "Bold"]) {
    const file = fileURLToPath(new URL(`./assets/fonts/NotoSans-${weight}.ttf`, import.meta.url));
    if (!GlobalFonts.registerFromPath(file, FAMILY)) throw new Error(`Cannot load preview font: ${weight}`);
  }
  fontsLoaded = true;
}

/** Only public, spoiler-safe headline metadata is eligible for the image. */
export function previewContent(item: FeedItem) {
  return {
    title: (item.title ?? "A little more worth reading.").replace(/\s+/gu, " ").trim(),
    topic: topicLabel(item.community),
    format: ({ news: "News", explainer: "Explained", story: "Story", banter: "Banter" } as const)[item.editorial!.format],
    spoilers: Boolean(item.editorial!.spoilers),
  };
}

function wrapText(ctx: SKRSContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) { line = next; continue; }
    if (line) { lines.push(line); line = ""; }
    // Break exceptionally long words without dropping characters or splitting accents.
    for (const { segment } of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)) {
      if (line && ctx.measureText(line + segment).width > width) { lines.push(line); line = ""; }
      line += segment;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function layoutPreviewTitle(title: string) {
  loadFonts();
  const ctx = createCanvas(1, 1).getContext("2d");
  for (let fontSize = 64; fontSize >= 32; fontSize -= 2) {
    ctx.font = `700 ${fontSize}px "${FAMILY}"`;
    const lines = wrapText(ctx, title, 1056);
    const lineHeight = Math.ceil(fontSize * 1.2);
    if (lines.length * lineHeight <= 252 && lines.every(line => ctx.measureText(line).width <= 1056)) {
      return { fontSize, lineHeight, lines, widths: lines.map(line => ctx.measureText(line).width) };
    }
  }
  throw new Error("Article preview headline does not fit");
}

export function renderArticlePreview(item: FeedItem): Buffer {
  const content = previewContent(item);
  const layout = layoutPreviewTitle(content.title);
  const canvas = createCanvas(PREVIEW_WIDTH, PREVIEW_HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101215";
  ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  ctx.fillStyle = "#bba1ff";
  ctx.fillRect(0, 0, PREVIEW_WIDTH, 8);

  // A small conversation mark, matching the site's restrained lavender palette.
  ctx.fillStyle = "#292338";
  ctx.beginPath(); ctx.roundRect(72, 54, 58, 48, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(88, 98); ctx.lineTo(88, 112); ctx.lineTo(104, 98); ctx.fill();
  ctx.fillStyle = "#bba1ff";
  for (const x of [88, 101, 114]) { ctx.beginPath(); ctx.arc(x, 78, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.font = `700 40px "${FAMILY}"`;
  ctx.fillStyle = "#e9edf3";
  ctx.fillText("CoBanter", 148, 94);
  ctx.font = `400 22px "${FAMILY}"`;
  ctx.fillStyle = "#a5aebb";
  ctx.textAlign = "right";
  ctx.fillText("A little more worth reading.", 1128, 89);
  ctx.textAlign = "left";
  ctx.fillStyle = "#30353e";
  ctx.fillRect(72, 142, 1056, 1);

  ctx.font = `700 23px "${FAMILY}"`;
  ctx.fillStyle = "#bba1ff";
  ctx.fillText(content.topic.toUpperCase(), 72, 203);
  ctx.font = `400 22px "${FAMILY}"`;
  ctx.fillStyle = "#a5aebb";
  ctx.textAlign = "right";
  ctx.fillText(content.format, 1128, 203);
  ctx.textAlign = "left";

  ctx.font = `700 ${layout.fontSize}px "${FAMILY}"`;
  ctx.fillStyle = "#e9edf3";
  layout.lines.forEach((line, index) => ctx.fillText(line, 72, 248 + layout.fontSize + index * layout.lineHeight));

  ctx.fillStyle = "#30353e";
  ctx.fillRect(72, 538, 1056, 1);
  ctx.font = `400 21px "${FAMILY}"`;
  ctx.fillStyle = "#a5aebb";
  ctx.fillText(content.spoilers ? "Spoiler-protected read" : "Real sources. Fresh perspectives.", 72, 586);
  ctx.font = `700 21px "${FAMILY}"`;
  ctx.fillStyle = "#bba1ff";
  ctx.textAlign = "right";
  ctx.fillText("cobanter.com", 1128, 586);
  return canvas.encodeSync("png");
}

export function writeArticlePreview(item: FeedItem, dist: string, base: string, origin: string) {
  const png = renderArticlePreview(item);
  // Content addressing gives corrected headlines/designs a fresh image cache key.
  const digest = createHash("sha256").update(png).digest("hex").slice(0, 16);
  const filename = `${articleRouteSlug(item)}-${digest}.png`;
  const directory = path.join(dist, "og");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, filename), png);
  return {
    url: new URL(`${base}og/${filename}`, origin).href,
    alt: `CoBanter · ${topicLabel(item.community)}: ${previewContent(item).title}`,
  };
}
