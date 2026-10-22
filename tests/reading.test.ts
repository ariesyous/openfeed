// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { splitParagraphs } from "../shared/reading";
import { relatedReading } from "../shared/related";
import { searchArticles, type SearchRow } from "../shared/search";
import { articlePath, withArticleSlug } from "../shared/articles";
import { BatchFileSchema, type Manifest } from "../schemas";

const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const template = BatchFileSchema.parse(JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8"))).items.find(item => item.editorial)!;

describe("reading helpers", () => {
  it("splits on blank lines without rewriting text", () => {
    expect(splitParagraphs("One.\n\nTwo\nlines.\n \n\nThree.")).toEqual(["One.", "Two\nlines.", "Three."]);
    expect(splitParagraphs("Single paragraph.")).toEqual(["Single paragraph."]);
    expect(splitParagraphs("")).toEqual([""]);
  });
});

describe("related reading", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g"].map((id, index) => withArticleSlug({ ...template, id, slug: undefined, title: id, createdAt: `2026-10-${String(20 - index).padStart(2, "0")}T00:00:00Z` }));
  it("pairs newer/older neighbours with the nearest other articles", () => {
    const related = relatedReading(items[3], items, "/");
    expect(related.newer?.title).toBe("c");
    expect(related.older?.title).toBe("e");
    expect(related.more.map(entry => entry.title)).toEqual(["a", "b", "f", "g"]);
    expect(related.more[0].path).toBe(articlePath(items[0]));
  });
  it("handles topic edges and unknown articles", () => {
    const first = relatedReading(items[0], items, "/");
    expect(first.newer).toBeUndefined();
    expect(first.older?.title).toBe("b");
    expect(first.more.map(entry => entry.title)).toEqual(["c", "d", "e", "f"]);
    expect(relatedReading({ ...items[0], id: "missing" }, items, "/").more).toEqual([]);
  });
});

describe("search", () => {
  const rows: SearchRow[] = [
    ["Pericles and the Athenian démos", "/p/a/", "greek_roman_mythology", "explainer", "2026-10-03T00:00:00Z", "Aeon"],
    ["Mars rover sets a driving record", "/p/b/", "science", "news", "2026-10-02T00:00:00Z", "NASA"],
    ["Rates hold steady", "/p/c/", "economics", "news", "2026-10-01T00:00:00Z", "BBC Business"],
  ];
  it("matches every folded token across title, topic label and publishers", () => {
    expect(searchArticles(rows, "demos athenian").map(row => row[1])).toEqual(["/p/a/"]);
    expect(searchArticles(rows, "mythology").map(row => row[1])).toEqual(["/p/a/"]);
    expect(searchArticles(rows, "nasa record").map(row => row[1])).toEqual(["/p/b/"]);
    expect(searchArticles(rows, "nasa rates")).toEqual([]);
  });
  it("applies topic and format filters, and needs a query or filter", () => {
    expect(searchArticles(rows, "")).toEqual([]);
    expect(searchArticles(rows, "", { format: "news" }).map(row => row[1])).toEqual(["/p/b/", "/p/c/"]);
    expect(searchArticles(rows, "rates", { topic: "science" })).toEqual([]);
  });
});
