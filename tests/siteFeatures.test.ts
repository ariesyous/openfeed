// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { buildArchive } from "../scripts/buildArchive";
import { articlePath, withArticleSlug } from "../shared/articles";
import { TOPICS, topicPath, topicSlug } from "../shared/topics";
import type { RelatedReading } from "../shared/related";
import type { SearchIndex } from "../shared/search";
import { BatchFileSchema, type FeedItem, type Manifest } from "../schemas";

const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const fixture = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")));
const template = fixture.items.find(item => item.editorial)!;
const make = (id: string, createdAt: string, extra: Partial<FeedItem> = {}) => withArticleSlug({
  // The newest real post may be spoiler-flagged; tests that need a spoiler pass their own editorial.
  ...template, editorial: { ...template.editorial!, spoilers: false }, id, slug: undefined, createdAt, community: "science", title: `Headline ${id}`,
  body: `First paragraph of ${id}.\n\nSecond paragraph of ${id}.`, ...extra,
});
const newest = make("newest", "2026-10-03T00:00:00Z");
const middle = make("middle", "2026-10-02T00:00:00Z");
const spoiler = make("spoiler", "2026-10-01T00:00:00Z", { body: "SECRET ENDING", editorial: { ...template.editorial!, spoilers: true, discussion: [{ voice: "Take", body: "SECRET TAKE" }, { voice: "Reply", body: "SECRET REPLY" }] } });
const other = make("other", "2026-09-30T00:00:00Z", { community: "movies" });

let root = "";
const read = (file: string) => readFileSync(path.join(root, "dist", file), "utf8");
beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "cobanter-site-"));
  mkdirSync(path.join(root, "public/data/batches"), { recursive: true });
  mkdirSync(path.join(root, "dist"));
  writeFileSync(path.join(root, "dist/index.html"), '<html><head><link rel="stylesheet" href="/assets/index-test.css"><title>CoBanter</title></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>');
  writeFileSync(path.join(root, "public/data/manifest.json"), JSON.stringify({ ...manifest, batches: [manifest.batches[0]] }));
  writeFileSync(path.join(root, "public/data", manifest.batches[0].file), JSON.stringify({ ...fixture, items: [newest, middle, spoiler, other] }));
  vi.stubEnv("SITE_BASE_PATH", "/");
  vi.stubEnv("SITE_ORIGIN", "https://cobanter.com");
  buildArchive(root);
});
afterAll(() => { vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });

describe("reader feeds", () => {
  it("publishes valid site and topic RSS without spoiler prose", () => {
    const site = read("feed.xml");
    expect(XMLValidator.validate(site)).toBe(true);
    const items = new XMLParser({ isArray: name => name === "item" }).parse(site).rss.channel.item;
    expect(items.map((item: { link: string }) => item.link)).toEqual([newest, middle, spoiler, other].map(item => `https://cobanter.com${articlePath(item)}`));
    expect(site).toContain("&lt;p&gt;First paragraph of newest.&lt;/p&gt;&lt;p&gt;Second paragraph of newest.&lt;/p&gt;");
    expect(site).toContain("AI-generated discussion");
    for (const secret of ["SECRET ENDING", "SECRET TAKE", "SECRET REPLY"]) expect(site).not.toContain(secret);
    const topic = read(`topics/${topicSlug("science")}/feed.xml`);
    expect(XMLValidator.validate(topic)).toBe(true);
    expect(topic).toContain(`https://cobanter.com${articlePath(middle)}`);
    expect(topic).not.toContain(`https://cobanter.com${articlePath(other)}`);
    expect(topic).toContain('<atom:link href="https://cobanter.com/topics/science/feed.xml" rel="self"');
  });
  it("advertises feeds, icons and the manifest on every generated page", () => {
    for (const file of ["index.html", `p/${middle.slug}/index.html`, "archive/index.html", "about/index.html", "404.html"]) {
      const html = read(file);
      expect(html).toContain('rel="alternate" type="application/rss+xml" title="CoBanter" href="https://cobanter.com/feed.xml"');
      expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
      expect(html).toContain('<link rel="manifest" href="/site.webmanifest">');
      expect(html).toContain('href="/about/">How CoBanter works');
    }
    expect(read(`topics/${topicSlug("science")}/index.html`)).toContain('title="Science · CoBanter" href="https://cobanter.com/topics/science/feed.xml"');
    const webManifest = JSON.parse(read("site.webmanifest"));
    expect(webManifest).toMatchObject({ name: "CoBanter", start_url: "/", display: "standalone" });
    for (const [file, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]] as const) {
      const png = readFileSync(path.join(root, "dist", file));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(size);
    }
  });
});

describe("site pages", () => {
  it("gives home and topic pages their own large share images", () => {
    for (const file of ["index.html", `topics/${topicSlug("science")}/index.html`]) {
      const html = read(file);
      const image = html.match(/property="og:image" content="([^"]+)"/)?.[1];
      expect(image).toMatch(/^https:\/\/cobanter\.com\/og\/site\/[a-z0-9-]+-[a-f0-9]{16}\.png$/);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(existsSync(path.join(root, "dist", new URL(image!).pathname))).toBe(true);
    }
  });
  it("publishes the home and topic share images for in-app navigation", () => {
    const images = JSON.parse(read("data/share-images.json")) as Record<string, { url: string; alt: string }>;
    expect(Object.keys(images).sort()).toEqual(["", ...TOPICS].sort());
    for (const [topic, file] of [["", "index.html"], ["science", `topics/${topicSlug("science")}/index.html`]]) {
      const html = read(file);
      expect(html).toContain(`property="og:image" content="${images[topic].url}"`);
      expect(html).toContain(`property="og:image:alt" content="${images[topic].alt}"`);
    }
  });
  it("publishes an honest standalone About page in the sitemap and agent guide", () => {
    const about = read("about/index.html");
    expect(about).not.toContain('type="module"');
    expect(about).toContain("<h1>How CoBanter works</h1>");
    expect(about).toContain("They are not human fact-checking");
    expect(about).toContain("They are not real people");
    expect(about).toContain('href="/feed.xml"');
    expect(JSON.parse(about.match(/<script id="page-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])["@type"]).toBe("AboutPage");
    expect(read("sitemap.xml")).toContain("<loc>https://cobanter.com/about/</loc>");
    expect(read("sitemap.xml")).not.toContain("/search/");
    expect(read("llms.txt")).toContain("https://cobanter.com/about/");
    expect(read("llms.txt")).toContain("https://cobanter.com/feed.xml");
  });
  it("styles the 404 and keeps the search shell out of the index", () => {
    const notFound = read("404.html");
    expect(notFound).toContain('<link rel="stylesheet" href="/assets/index-test.css">');
    expect(notFound).toContain('name="robots" content="noindex, follow"');
    expect(notFound).toContain('class="app-header"');
    expect(notFound).not.toContain('type="module"');
    const search = read("search/index.html");
    expect(search).toContain('name="robots" content="noindex, follow"');
    expect(search).toContain('type="module"');
  });
});

describe("related reading and search", () => {
  it("links each article to its topic neighbours in HTML and JSON", () => {
    const related = JSON.parse(read(`p/${middle.slug}/related.json`)) as RelatedReading;
    expect(related.topic).toBe("science");
    expect(related.newer?.path).toBe(articlePath(newest));
    expect(related.older?.path).toBe(articlePath(spoiler));
    expect(related.older?.title).toBe(spoiler.title);
    expect(JSON.stringify(related)).not.toContain("SECRET");
    expect(JSON.stringify(related)).not.toContain(articlePath(other));
    const html = read(`p/${middle.slug}/index.html`);
    expect(html).toContain(`Newer in Science</span><a href="${articlePath(newest)}">`);
    // Only three science articles exist, so the neighbours leave no extra "More in" list.
    expect(related.more).toEqual([]);
    expect(html).not.toContain("<h2>More in");
    expect(read(`p/${newest.slug}/index.html`)).toContain(`Older in Science</span><a href="${articlePath(middle)}">`);
    expect(html).toContain(`class="post-card-community" href="${topicPath("science")}"`);
    expect(html).toContain('<div class="post-card-body"><p>First paragraph of middle.</p><p>Second paragraph of middle.</p></div>');
    expect(html).toContain('<p class="article-byline">CoBanter · AI-written · <time datetime="2026-10-02T00:00:00Z">Added Oct 2, 2026</time></p>');
  });
  it("indexes headlines and metadata, never bodies or discussion", () => {
    const index = JSON.parse(read("data/search-index.json")) as SearchIndex;
    expect(index.version).toBe(1);
    expect(index.articles.map(row => row[1])).toEqual([newest, middle, spoiler, other].map(item => articlePath(item)));
    expect(index.articles[0]).toEqual([newest.title, articlePath(newest), "science", newest.editorial!.format, newest.createdAt, expect.any(String)]);
    const raw = read("data/search-index.json");
    for (const text of ["SECRET", "First paragraph"]) expect(raw).not.toContain(text);
  });
});
