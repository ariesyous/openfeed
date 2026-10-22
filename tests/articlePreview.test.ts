// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { BatchFileSchema, ManifestSchema } from "../schemas";
import { layoutPreviewTitle, previewContent, renderArticlePreview, writeArticlePreview } from "../scripts/articlePreview";

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
        expect(png.length).toBeLessThan(300_000);
      }
    } finally { rmSync(dist, { recursive: true, force: true }); }
  });
});
