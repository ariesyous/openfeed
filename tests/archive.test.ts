// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { TOPICS, topicFromPath, topicPath, topicSlug } from "../shared/topics";
import { articleSlug, articleRouteSlug, articlePath, withArticleSlug } from "../shared/articles";
import { articleMarkup, buildArchive, paginateManifest } from "../scripts/buildArchive";
import { BatchFileSchema, ManifestSchema, type Manifest } from "../schemas";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const item = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8"))).items[0];
describe("permanent articles", () => {
  it("creates safe slugs and preserves identity after title edits", () => {
    const first = withArticleSlug({ ...item, id: "one/../", title: "Héllo & Rome?!", slug: undefined });
    expect(first.slug).toMatch(/^hello-rome--[a-f0-9]{10}$/);
    expect(articleSlug({ ...first, title: "A corrected headline" })).toBe(first.slug);
    expect(articleSlug({ ...first, id: "different", slug: undefined })).not.toBe(first.slug);
    expect(articleSlug({ ...first, title: "!!!", slug: undefined })).toMatch(/^article--/);
    expect(articlePath(first, "/openfeed/")).toBe(`/openfeed/p/${first.slug}/`);
  });
  it("shortens legacy addresses without changing stored slugs or following title edits", () => {
    const legacy = { ...item, id: "historical-article-id", slug: `original-headline--${Buffer.from("historical-article-id").toString("hex")}` };
    expect(articleRouteSlug(legacy)).toMatch(/^original-headline--[a-f0-9]{10}$/);
    expect(articlePath({ ...legacy, title: "Corrected headline" })).toBe(articlePath(legacy));
    expect(withArticleSlug(legacy).slug).toBe(legacy.slug);
    expect(articleSlug(legacy)).toBe(legacy.slug);
    const long = withArticleSlug({ ...item, slug: undefined, title: "a".repeat(150) });
    expect(articleRouteSlug(long).length).toBeLessThanOrEqual(72);
  });
  it.each(["/", "/openfeed/"])("builds short and historical pages with short sharing metadata under %s", (base) => {
    const root = mkdtempSync(path.join(tmpdir(), "openfeed-short-urls-"));
    const fixture = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")));
    const legacy = { ...item, id: "historical-article-id", slug: `original-headline--${Buffer.from("historical-article-id").toString("hex")}`, body: "PRIVATE SPOILER BODY", editorial: { ...item.editorial!, spoilers: true } };
    const fresh = withArticleSlug({ ...item, id: "new-article-id", slug: undefined });
    vi.stubEnv("SITE_BASE_PATH", base);
    vi.stubEnv("SITE_ORIGIN", "https://cobanter.com");
    try {
      mkdirSync(path.join(root, "public/data/batches"), { recursive: true });
      mkdirSync(path.join(root, "dist"));
      writeFileSync(path.join(root, "dist/index.html"), '<html><head><title>CoBanter</title></head><body><div id="root"></div></body></html>');
      writeFileSync(path.join(root, "public/data/manifest.json"), JSON.stringify({ ...manifest, batches: [manifest.batches[0]] }));
      const batchFile = path.join(root, "public/data", manifest.batches[0].file);
      writeFileSync(batchFile, JSON.stringify({ ...fixture, items: [legacy, fresh] }));
      buildArchive(root);
      for (const slug of [legacy.slug, articleRouteSlug(legacy), fresh.slug!]) {
        const expected = slug === fresh.slug ? fresh : legacy;
        const html = readFileSync(path.join(root, "dist/p", slug, "index.html"), "utf8");
        const url = `https://cobanter.com${articlePath(expected, base)}`;
        expect(html).toContain(`rel="canonical" href="${url}"`);
        expect(html).toContain(`property="og:url" content="${url}"`);
        const imageUrl = html.match(/property="og:image" content="([^"]+)"/)?.[1];
        expect(imageUrl).toMatch(new RegExp(`^https://cobanter\\.com${base}og/[a-z0-9-]+\\.png$`));
        expect(html).toContain('property="og:image:width" content="1200"');
        expect(html).toContain('property="og:image:height" content="630"');
        expect(html).toContain('name="twitter:card" content="summary_large_image"');
        expect(html).toContain(`name="twitter:image" content="${imageUrl}"`);
        const image = readFileSync(path.join(root, "dist", new URL(imageUrl!).pathname.slice(base.length)));
        expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
        expect(image.readUInt32BE(16)).toBe(1200);
        expect(image.readUInt32BE(20)).toBe(630);
        expect(JSON.parse(readFileSync(path.join(root, "dist/p", slug, "article.json"), "utf8"))).toEqual(expected);
        if (expected === legacy) {
          expect(html).toContain('<details class="spoiler-gate"><summary>Show spoilers</summary><div class="post-card-body"><p>PRIVATE SPOILER BODY');
          expect(html).toContain('<div data-nosnippet><details class="spoiler-gate">');
          expect(html).toContain('property="og:description" content="A spoiler-protected CoBanter article. Open to read."');
        }
      }
      const oldHtml = readFileSync(path.join(root, "dist/p", legacy.slug, "index.html"), "utf8");
      const newHtml = readFileSync(path.join(root, "dist/p", articleRouteSlug(legacy), "index.html"), "utf8");
      expect(oldHtml.match(/property="og:image" content="([^"]+)"/)?.[1]).toBe(newHtml.match(/property="og:image" content="([^"]+)"/)?.[1]);
      const sitemap = readFileSync(path.join(root, "dist/sitemap.xml"), "utf8");
      expect(sitemap).toContain(`<loc>https://cobanter.com${articlePath(legacy, base)}</loc>`);
      expect(sitemap).toContain(`<loc>https://cobanter.com${articlePath(fresh, base)}</loc>`);
      expect(sitemap).not.toContain(`/p/${legacy.slug}/`);
      expect(sitemap).not.toContain("article.json");
      expect(sitemap).not.toContain("?view=cards");
      expect(sitemap).not.toContain("<lastmod>");
      const robots = readFileSync(path.join(root, "dist/robots.txt"), "utf8");
      expect(robots).toContain("User-agent: *\nAllow: /\n");
      expect(robots).toContain(`Sitemap: https://cobanter.com${base}sitemap.xml`);
      const llms = readFileSync(path.join(root, "dist/llms.txt"), "utf8");
      expect(llms).toContain(`# CoBanter\n`);
      expect(llms).toContain(`https://cobanter.com${base}archive/`);
      expect(llms).not.toContain("PRIVATE SPOILER BODY");
      const home = readFileSync(path.join(root, "dist/index.html"), "utf8");
      expect(home).toContain(`rel="canonical" href="https://cobanter.com${base}"`);
      expect(home).toContain(`href="${articlePath(legacy, base)}"`);
      expect(home).toContain(`href="${topicPath(legacy.community, base)}"`);
      expect(home).toContain('<details class="spoiler-gate"><summary>Show spoilers</summary><div class="post-card-body"><p>PRIVATE SPOILER BODY');
      const schema = JSON.parse(oldHtml.match(/<script id="page-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
      expect(schema["@type"]).toBe("Article");
      expect(schema.url).toBe(`https://cobanter.com${articlePath(legacy, base)}`);
      expect(schema.author).toEqual({ "@type": "Organization", name: "CoBanter", url: `https://cobanter.com${base}` });
      expect(schema.citation).toEqual(legacy.editorial.sources.map(source => source.url));
      expect(schema.datePublished).toBe(legacy.createdAt);
      expect(JSON.stringify(schema)).not.toContain("PRIVATE SPOILER BODY");
      expect(oldHtml.match(/rel="canonical"/g)).toHaveLength(1);
      expect(oldHtml.match(/name="description"/g)).toHaveLength(1);
      expect(readFileSync(path.join(root, "dist/404.html"), "utf8")).toContain('name="robots" content="noindex, follow"');
      // A future stored address must never overwrite another article's short alias.
      const collision = { ...fresh, slug: articleRouteSlug(legacy) };
      writeFileSync(batchFile, JSON.stringify({ ...fixture, items: [legacy, collision] }));
      expect(() => buildArchive(root)).toThrow("Duplicate article slug");
    } finally {
      vi.unstubAllEnvs();
      rmSync(root, { recursive: true, force: true });
    }
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
    expect(html).toContain("<details class=\"spoiler-gate\"><summary>Show spoilers</summary>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert');
    expect(html).toContain(item.editorial!.sources[0].url.replaceAll("&", "&amp;"));
    expect(html).toContain('href="/openfeed/"');
  });
  it("distinguishes added and source dates even before JavaScript loads", () => {
    const fixture = { ...item, createdAt: "2026-09-18T00:00:00Z", editorial: { ...item.editorial!, sources: [
      { ...item.editorial!.sources[0], publishedAt: "2025-08-24T19:40:16Z" },
      { ...item.editorial!.sources[0], publishedAt: undefined },
      { ...item.editorial!.sources[0], publishedAt: "2999-01-01T00:00:00Z" },
    ] } };
    const html = articleMarkup(fixture, "/openfeed/");
    expect(html).toContain('<time datetime="2026-09-18T00:00:00Z">Added Sep 18, 2026</time>');
    expect(html).toContain('<time datetime="2025-08-24T19:40:16Z">Published Aug 24, 2025</time>');
    expect(html.match(/Publication date unavailable/g)).toHaveLength(2);
    expect(html).not.toContain("Background reading");
    expect(html).not.toContain('datetime="2999');
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
      writeFileSync(path.join(root, "dist/index.html"), '<html><head><title>CoBanter</title><script type="module" src="/openfeed/assets/app.js"></script></head><body><div id="root"></div></body></html>');
      writeFileSync(path.join(root, "public/data/manifest.json"), JSON.stringify({ ...manifest, batches: refs }));
      refs.forEach((ref, index) => writeFileSync(path.join(root, "public/data", ref.file), JSON.stringify({ ...fixture, batchId: ref.id, items: [{ ...item, id: `topic-post-${index}`, slug: undefined, community: index === 0 ? "movies" : "ai_agents", title: `Title ${index}`, body: "SPOILER BODY", editorial: { ...item.editorial!, spoilers: true } }] })));
      buildArchive(root);
      const html = readFileSync(path.join(root, "dist/topics/ai-agents/index.html"), "utf8");
      expect(html).toContain('<title>AI &amp; Agents · CoBanter</title>');
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
      const firstArchive = readFileSync(path.join(root, "dist/archive/index.html"), "utf8");
      const secondArchive = readFileSync(path.join(root, "dist/archive/page-2/index.html"), "utf8");
      expect(firstArchive).toContain('rel="next" href="/openfeed/archive/page-2/"');
      expect(secondArchive).toContain('rel="prev" href="/openfeed/archive/"');
      expect(firstArchive + secondArchive).not.toContain('src="/openfeed/assets/app.js"');
      expect(firstArchive + secondArchive).not.toContain("SPOILER BODY");
      const allArticleLinks = (firstArchive + secondArchive).match(/href="\/openfeed\/p\//g);
      expect(allArticleLinks).toHaveLength(refs.length);
      const sitemap = readFileSync(path.join(root, "dist/sitemap.xml"), "utf8");
      expect(sitemap.match(/<loc>https:\/\/ariesyous.github.io\/openfeed\/p\//g)).toHaveLength(refs.length);
      expect(sitemap).toContain("https://ariesyous.github.io/openfeed/archive/page-2/");
    } finally {
      vi.unstubAllEnvs();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
