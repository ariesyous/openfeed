import { describe, expect, it } from "vitest";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { sitemapFiles } from "../scripts/discovery";
import { inlineJson } from "../shared/seo";

describe("discovery documents", () => {
  it("splits the complete deduplicated catalog into valid XML sitemaps", () => {
    const site = { base: "/reading/", origin: "https://example.com" };
    const urls = ["https://example.com/reading/", "https://example.com/reading/a?x=1&y=2", "https://example.com/reading/old/", "https://example.com/reading/old/"];
    const files = sitemapFiles(urls, site, 2);
    expect([...files.keys()]).toEqual(["sitemaps/page-1.xml", "sitemaps/page-2.xml", "sitemap.xml"]);
    for (const xml of files.values()) expect(XMLValidator.validate(xml)).toBe(true);
    const parser = new XMLParser({ isArray: name => name === "url" || name === "sitemap" });
    const index = parser.parse(files.get("sitemap.xml")!).sitemapindex.sitemap;
    expect(index.map((entry: { loc: string }) => entry.loc)).toEqual(["https://example.com/reading/sitemaps/page-1.xml", "https://example.com/reading/sitemaps/page-2.xml"]);
    const restored = [...files].filter(([name]) => name !== "sitemap.xml").flatMap(([, xml]) => parser.parse(xml).urlset.url.map((entry: { loc: string }) => entry.loc));
    expect(restored).toEqual(urls.slice(0, 3));
    expect(files.get("sitemaps/page-1.xml")).toContain("?x=1&amp;y=2");
    expect(() => sitemapFiles(urls, site, 50_001)).toThrow("Invalid sitemap page size");
  });
  it("escapes embedded JSON without changing stored article text", () => {
    const value = { title: '</script><script>alert("x")</script>' };
    expect(inlineJson(value)).not.toContain("<");
    expect(JSON.parse(inlineJson(value))).toEqual(value);
  });
});
