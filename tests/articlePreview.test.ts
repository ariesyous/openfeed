// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BatchFileSchema, ManifestSchema } from "../schemas";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { layoutPreviewTitle, previewContent, renderArticlePreview, writeArticlePreview } from "../scripts/articlePreview";
import { encodePalettePng } from "../scripts/palettePng";

const manifest = ManifestSchema.parse(JSON.parse(readFileSync("public/data/manifest.json", "utf8")));
const items = manifest.batches.flatMap(ref => BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${ref.file}`, "utf8"))).items.filter(item => item.editorial));
const item = items[0];

describe("article sharing images", () => {
  it("fits every published headline and long Unicode/word edge cases without truncation", () => {
    for (const title of [...items.map(item => previewContent(item).title), "W".repeat(150), "Économie — μῦθος & ‘cinéma’: <stories> ".repeat(4).trim()]) {
      const layout = layoutPreviewTitle(title);
      expect(layout.lines.join("").replaceAll(" ", "")).toBe(title.replaceAll(" ", ""));
      expect(layout.lines.length * layout.lineHeight).toBeLessThanOrEqual(252);
      expect(Math.max(...layout.widths)).toBeLessThanOrEqual(1056);
    }
  // Lays out every published headline, so its runtime grows with the permanent archive.
  }, 30_000);

  it("uses only headline metadata and never leaks a spoiler body or discussion into pixels", () => {
    const spoiler = { ...item, editorial: { ...item.editorial!, spoilers: true } };
    const changed = { ...spoiler, body: "SECRET ENDING", editorial: { ...spoiler.editorial, discussion: [{ voice: "Take" as const, body: "SECRET DISCUSSION ENDING" }, { voice: "Reply" as const, body: "ANOTHER SECRET ENDING" }] } };
    expect(renderArticlePreview(changed)).toEqual(renderArticlePreview(spoiler));
    expect(previewContent(changed)).not.toHaveProperty("body");
    expect(previewContent(changed)).not.toHaveProperty("discussion");
  });

  it("gives headline corrections fresh image URLs while both renders remain valid PNGs", () => {
    const dist = mkdtempSync(path.join(tmpdir(), "openfeed-preview-"));
    try {
      const first = writeArticlePreview(item, dist, "/", "https://cobanter.com");
      const repeated = writeArticlePreview(item, dist, "/", "https://cobanter.com");
      const corrected = writeArticlePreview({ ...item, title: 'A different headline with <tags> & "quotes"' }, dist, "/", "https://cobanter.com");
      expect(first.url).toBe(repeated.url);
      expect(corrected.url).not.toBe(first.url);
      expect(readdirSync(path.join(dist, "og"))).toHaveLength(2);
      for (const file of readdirSync(path.join(dist, "og"))) {
        const png = readFileSync(path.join(dist, "og", file));
        expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(png.readUInt32BE(16)).toBe(1200);
        expect(png.readUInt32BE(20)).toBe(630);
        expect(png[25]).toBe(3); // indexed colour keeps the deployed archive small
        expect(png.length).toBeLessThan(40_000);
      }
    } finally { rmSync(dist, { recursive: true, force: true }); }
  });

  it("palette encoding keeps flat colours exact and maps rare blends to the nearest kept colour", async () => {
    const width = 20, height = 20, data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      // 300 distinct colours: pixels 0–299 unique, the rest one flat background.
      data.set(i < 300 ? [i % 256, Math.floor(i / 256) * 100, 50, 255] : [16, 18, 21, 255], i * 4);
    }
    const decoded = await loadImage(encodePalettePng(data, width, height));
    const ctx = createCanvas(width, height).getContext("2d");
    ctx.drawImage(decoded, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    expect([...pixels.subarray(399 * 4, 400 * 4)]).toEqual([16, 18, 21, 255]);
    for (let i = 0; i < 300; i++) {
      const distance = Math.hypot(pixels[i * 4] - data[i * 4], pixels[i * 4 + 1] - data[i * 4 + 1], pixels[i * 4 + 2] - data[i * 4 + 2]);
      expect(distance).toBeLessThanOrEqual(45);
    }
    expect(() => encodePalettePng(new Uint8ClampedArray(4), 1, 1)).toThrow(/opaque/);
  });
});
