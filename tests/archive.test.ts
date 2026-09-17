// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { TOPICS, topicFromPath, topicPath, topicSlug } from "../shared/topics";
import { articleSlug, articlePath, withArticleSlug } from "../shared/articles";
import { articleMarkup, buildArchive, paginateManifest } from "../scripts/buildArchive";
import { BatchFileSchema, ManifestSchema, type Manifest } from "../schemas";
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

describe("permanent topic pages", () => {
  it("maps every topic to a unique readable URL under the Pages base path", () => {
    expect(new Set(TOPICS.map(topicSlug)).size).toBe(TOPICS.length);
    for (const topic of TOPICS) {
      expect(topicFromPath(topicPath(topic, "/openfeed/"), "/openfeed/")).toBe(topic);
    }
    expect(topicPath("ai_agents", "/openfeed/")).toBe("/openfeed/topics/ai-agents/");
    expect(topicFromPath("/openfeed/topics/../", "/openfeed/")).toBeNull();
    expect(topicFromPath("/openfeed/topics/not-a-topic/", "/openfeed/")).toBeNull();
  });
  it("builds refreshable HTML and bounded topic indexes covering older content", () => {
    const root = mkdtempSync(path.join(tmpdir(), "openfeed-topics-"));
    const fixture = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")));
    const refs = Array.from({ length: 54 }, (_, index) => ({ ...manifest.batches[0], id: `batch-${index}`, file: `batches/${index}.json`, itemCount: 1 }));
    vi.stubEnv("SITE_BASE_PATH", "/openfeed/");
    vi.stubEnv("SITE_ORIGIN", "https://ariesyous.github.io");
    try {
      mkdirSync(path.join(root, "public/data/batches"), { recursive: true });
      mkdirSync(path.join(root, "dist"));
      writeFileSync(path.join(root, "dist/index.html"), '<html><head><title>OpenFeed</title><script src="/openfeed/assets/app.js"></script></head><body><div id="root"></div></body></html>');
      writeFileSync(path.join(root, "public/data/manifest.json"), JSON.stringify({ ...manifest, batches: refs }));
      refs.forEach((ref, index) => writeFileSync(path.join(root, "public/data", ref.file), JSON.stringify({ ...fixture, batchId: ref.id, items: [{ ...item, id: `topic-post-${index}`, slug: undefined, community: index === 0 ? "movies" : "ai_agents", title: `Title ${index}`, body: "SPOILER BODY", editorial: { ...item.editorial!, spoilers: true } }] })));
      buildArchive(root);
      const html = readFileSync(path.join(root, "dist/topics/ai-agents/index.html"), "utf8");
      expect(html).toContain('<title>AI &amp; Agents · OpenFeed</title>');
      expect(html).toContain('rel="canonical" href="https://ariesyous.github.io/openfeed/topics/ai-agents/"');
      expect(html).toContain('src="/openfeed/assets/app.js"');
      expect(html).toContain('href="/openfeed/p/title-1--');
      expect(html).not.toContain("SPOILER BODY");
      let file: string | undefined = "topics/ai-agents/manifest.json";
      const ids: string[] = [];
      while (file) {
        const page: Manifest = ManifestSchema.parse(JSON.parse(readFileSync(path.join(root, "dist/data", file), "utf8")));
        expect(page.batches.length).toBeLessThanOrEqual(50);
        ids.push(...page.batches.map(ref => ref.id));
        file = page.olderManifest;
      }
      expect(ids).toEqual(refs.slice(1).map(ref => ref.id));
      const empty = ManifestSchema.parse(JSON.parse(readFileSync(path.join(root, "dist/data/topics/canada/manifest.json"), "utf8")));
      expect(empty.batches).toEqual([]);
      expect(readFileSync(path.join(root, "dist/topics/canada/index.html"), "utf8")).toContain("No posts here yet.");
    } finally {
      vi.unstubAllEnvs();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
