// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { articleSlug, articlePath, withArticleSlug } from "../shared/articles";
import { articleMarkup, paginateManifest } from "../scripts/buildArchive";
import { BatchFileSchema, type Manifest } from "../schemas";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const item = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8"))).items[0];
describe("permanent articles", () => {
  it("creates safe slugs and preserves identity after title edits", () => {
    const first = withArticleSlug({ ...item, id: "one/../", title: "Héllo & Rome?!", slug: undefined });
    expect(first.slug).toMatch(/^hello-rome--[a-f0-9]+$/);
    expect(articleSlug({ ...first, title: "A corrected headline" })).toBe(first.slug);
    expect(articleSlug({ ...first, id: "different", slug: undefined })).not.toBe(first.slug);
    expect(articleSlug({ ...first, title: "!!!", slug: undefined })).toMatch(/^article--/);
    expect(articlePath(first, "/openfeed/")).toBe(`/openfeed/p/${first.slug}/`);
  });
  it("serves every historical batch through small stable pages", () => {
    const batches = Array.from({ length: 121 }, (_, index) => ({ ...manifest.batches[0], id: `batch-${121-index}` }));
    const pages = paginateManifest({ ...manifest, batches });
    let page = pages.get("manifest.json")!;
    const ids: string[] = [];
    while (page) {
      expect(page.batches.length).toBeLessThanOrEqual(50);
      ids.push(...page.batches.map(batch => batch.id));
      if (!page.olderManifest) break;
      page = pages.get(page.olderManifest)!;
    }
    expect(ids).toEqual(batches.map(batch => batch.id));
    const next = paginateManifest({ ...manifest, batches: [{ ...batches[0], id: "new" }, ...batches] });
    expect(next.get("archive/page-0.json")).toEqual(pages.get("archive/page-0.json"));
  });
  it("renders original content and sources safely, protecting spoilers without JavaScript", () => {
    const html = articleMarkup({ ...item, body: '<script>alert("x")</script>', editorial: { ...item.editorial!, spoilers: true } }, "/openfeed/");
    expect(html).toContain("<details><summary>Show spoilers</summary>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert');
    expect(html).toContain(item.editorial!.sources[0].url.replaceAll("&", "&amp;"));
    expect(html).toContain('href="/openfeed/"');
  });
});
