import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { App } from "../src/App";
import { PostCard } from "../src/components/PostCard";
import { articlePath } from "../shared/articles";
import { topicLabel } from "../shared/topics";
import type { RelatedReading } from "../shared/related";
import { searchRow, type SearchIndex } from "../shared/search";
import type { BatchFile, FeedItem, Manifest } from "../schemas";

const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const batch = JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")) as BatchFile;
const accounts = JSON.parse(readFileSync("public/data/accounts.json", "utf8"));
const [first, second] = batch.items.filter(item => item.editorial);
const spoiler: FeedItem = { ...second, body: "SECRET ENDING", editorial: { ...second.editorial!, spoilers: true } };
const feedBatch = { ...batch, items: batch.items.map(item => item.id === second.id ? spoiler : item) };
const searchIndex: SearchIndex = { version: 1, articles: [searchRow(first, "/"), searchRow(second, "/")] };
let routes: Record<string, unknown> = {};
const jsonResponse = (url: string) => {
  const match = Object.entries(routes).find(([suffix]) => url.endsWith(suffix));
  return match ? { ok: true, json: async () => match[1] } : { ok: false, json: async () => null };
};

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  routes = {};
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("manifest.json")
    ? { ok: true, json: async () => ({ ...manifest, batches: [manifest.batches[0]] }) }
    : url.endsWith("accounts.json") ? { ok: true, json: async () => accounts }
    : url.includes("/batches/") ? { ok: true, json: async () => feedBatch }
    : jsonResponse(url)));
});
afterEach(() => {
  document.getElementById("article-data")?.remove();
  // Page metadata persists in the shared document head; a stale og:image would look like a direct load.
  document.head.querySelectorAll('meta[data-seo], link[rel="canonical"], #page-structured-data').forEach(node => node.remove());
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

describe("headlines view", () => {
  it("is an opt-in, remembered layout that keeps spoilers hidden", async () => {
    const view = render(<App />);
    await screen.findByRole("link", { name: first.title });
    expect(screen.getByRole("button", { name: "Full posts" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Headlines" }));
    expect(document.querySelectorAll(".post-card--compact")).toHaveLength(batch.items.filter(item => item.editorial).length);
    expect(screen.queryByText("SECRET ENDING")).not.toBeInTheDocument();
    // Scope to the card this test marks as a spoiler; real editions can contain other spoiler posts.
    expect(within(document.getElementById(second.id)!).getByText("Contains spoilers — open the article to reveal.")).toBeVisible();
    expect(screen.getByRole("link", { name: second.title })).toHaveAttribute("href", articlePath(second));
    expect(localStorage.getItem("cobanter-density")).toBe("headlines");
    view.unmount();
    render(<App />);
    await screen.findByRole("link", { name: first.title });
    expect(screen.getByRole("button", { name: "Headlines" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("article reading", () => {
  const item: FeedItem = { ...first, body: "Opening paragraph.\n\nSecond paragraph." };
  it("renders paragraphs and a byline in place of the feed header", () => {
    const { container } = render(<PostCard item={item} articleView accountsById={new Map()} />);
    expect([...container.querySelectorAll(".post-card-body p")].map(node => node.textContent)).toEqual(["Opening paragraph.", "Second paragraph."]);
    expect(container.querySelector(".article-byline")).toHaveTextContent(/^CoBanter · AI-edited · Added .+$/);
    expect(container.querySelector(".post-card-header")).toBeNull();
  });
  it("uses the native share sheet when one exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    render(<PostCard item={item} articleView accountsById={new Map()} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Share" })); });
    expect(share).toHaveBeenCalledWith({ title: item.title, url: `${window.location.origin}${articlePath(item)}` });
  });
  it("navigates through related reading in the app and returns to the feed", async () => {
    const related: RelatedReading = { topic: first.community, older: { title: second.title!, path: articlePath(second), createdAt: second.createdAt, format: second.editorial!.format }, more: [] };
    routes = { [`${articlePath(first)}related.json`]: related, [`${articlePath(second)}article.json`]: second };
    render(<App />);
    fireEvent.click(await screen.findByRole("link", { name: first.title }));
    const nav = await screen.findByRole("navigation", { name: "Related reading" });
    fireEvent.click(within(nav).getByRole("link", { name: new RegExp(second.title!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }));
    expect(await screen.findByRole("heading", { level: 1, name: second.title })).toBeVisible();
    expect(window.location.pathname).toBe(articlePath(second));
    fireEvent.click(screen.getByRole("link", { name: "← Back to feed" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Article" })).not.toBeInTheDocument());
  });
});

describe("collection share images", () => {
  const ogImage = () => document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
  it("keeps home and topic images through in-app navigation", async () => {
    const images = { "": { url: "https://cobanter.com/og/site/home-1.png", alt: "CoBanter · Home" }, [first.community]: { url: "https://cobanter.com/og/site/topic-2.png", alt: "CoBanter · Topic" } };
    routes = { "/data/share-images.json": images };
    render(<App />);
    await screen.findByRole("link", { name: first.title });
    await waitFor(() => expect(ogImage()).toBe(images[""].url));
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content).toBe("summary_large_image");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: topicLabel(first.community) }));
    await waitFor(() => expect(ogImage()).toBe(images[first.community].url));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: "All topics" }));
    await waitFor(() => expect(ogImage()).toBe(images[""].url));
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith("share-images.json"))).toHaveLength(1);
  });
  it("reuses a directly loaded page's image without fetching the map", async () => {
    for (const [property, content] of [["og:image", "https://cobanter.com/og/site/home-static.png"], ["og:image:alt", "CoBanter · Static"]]) {
      const meta = document.createElement("meta");
      meta.setAttribute("property", property); meta.content = content; meta.dataset.seo = ""; document.head.append(meta);
    }
    render(<App />);
    await screen.findByRole("link", { name: first.title });
    expect(ogImage()).toBe("https://cobanter.com/og/site/home-static.png");
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]')?.content).toBe("CoBanter · Static");
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("share-images.json"))).toBe(false);
  });
  it("ignores a malformed image map", async () => {
    routes = { "/data/share-images.json": { "": { url: "javascript:alert(1)", alt: "x" } } };
    render(<App />);
    await screen.findByRole("link", { name: first.title });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("share-images.json"))).toBe(true));
    expect(ogImage()).toBeUndefined();
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content).toBe("summary");
  });
});

describe("search", () => {
  it("loads the index on demand, syncs the query and opens results", async () => {
    window.history.replaceState({}, "", "/search/");
    routes = { "/data/search-index.json": searchIndex, [`${articlePath(second)}article.json`]: second };
    render(<App />);
    const input = await screen.findByRole("searchbox");
    await screen.findByText(/Search 2 articles/);
    const word = second.title!.split(/\s+/).find(token => token.length > 4 && !first.title!.includes(token))!;
    fireEvent.change(input, { target: { value: word } });
    const results = await screen.findByRole("list");
    expect(within(results).getAllByRole("link").map(link => link.textContent)).toEqual([second.title]);
    expect(new URLSearchParams(window.location.search).get("q")).toBe(word);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe("noindex, follow");
    fireEvent.click(within(results).getByRole("link"));
    expect(await screen.findByRole("heading", { level: 1, name: second.title })).toBeVisible();
    expect(screen.getByRole("link", { name: "← Back to search" })).toBeVisible();
  });
  it("opens from the header and the slash shortcut", async () => {
    routes = { "/data/search-index.json": searchIndex };
    render(<App />);
    await screen.findByRole("link", { name: first.title });
    fireEvent.keyDown(window, { key: "/" });
    expect(await screen.findByRole("searchbox")).toBeVisible();
    expect(window.location.pathname).toBe("/search/");
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
  });
});
