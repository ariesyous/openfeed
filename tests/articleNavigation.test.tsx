import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { App } from "../src/App";
import { topicLabel, topicPath } from "../shared/topics";
import { articlePath } from "../shared/articles";
import type { BatchFile, Manifest } from "../schemas";
import { articleDescription, SITE_DESCRIPTION } from "../shared/seo";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const batch = JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")) as BatchFile;
const accounts = JSON.parse(readFileSync("public/data/accounts.json", "utf8"));
const post = batch.items[0];
// Article pages also request optional related reading; these checks concern feed/article data.
const dataRequests = () => vi.mocked(fetch).mock.calls.filter(([url]) => !String(url).endsWith("/related.json"));
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes("manifest.json") ? { ...manifest, batches: [manifest.batches[0]] } : url.endsWith("accounts.json") ? accounts : url.endsWith("article.json") ? post : batch })));
});
afterEach(() => { document.getElementById("article-data")?.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("article navigation", () => {
  it("opens an article, then restores topic selection and loaded feed on browser Back", async () => {
    render(<App />);
    await screen.findByRole("link", { name: post.title });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: topicLabel(post.community) }));
    await screen.findByRole("link", { name: post.title });
    expect(window.location.pathname).toBe(topicPath(post.community));
    const before = screen.getAllByRole("article").length;
    const requestsBeforeArticle = dataRequests().length;
    fireEvent.click(screen.getByRole("link", { name: post.title }));
    const article = await screen.findByRole("region", { name: "Article" });
    expect(window.location.pathname).toBe(articlePath(post));
    expect(new URL(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href).pathname).toBe(articlePath(post));
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(articleDescription(post));
    expect(JSON.parse(document.getElementById("page-structured-data")!.textContent!)["@type"]).toBe("Article");
    expect(within(article).getByRole("button", { name: "Share" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Save|Mark read|Mark caught up/ })).not.toBeInTheDocument();
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.pathname).toBe(topicPath(post.community)));
    await waitFor(() => expect(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: topicLabel(post.community) })).toHaveAttribute("aria-current", "page"));
    expect(screen.getAllByRole("article")).toHaveLength(before);
    expect(dataRequests()).toHaveLength(requestsBeforeArticle);
    expect(new URL(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href).pathname).toBe(topicPath(post.community));
    expect(document.head.querySelector('meta[property="article:published_time"]')).toBeNull();
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save|Mark read|Mark caught up/ })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: "All topics" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(batch.items.length));
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(SITE_DESCRIPTION);
  });
  it("loads a bookmarked topic, survives refresh, and handles topic Back/Forward", async () => {
    window.history.replaceState({}, "", topicPath(post.community));
    const view = render(<App />);
    await screen.findByRole("link", { name: post.title });
    expect(document.title).toBe(`${topicLabel(post.community)} · CoBanter`);
    const nav = () => within(screen.getByRole("navigation", { name: "Topics" }));
    expect(nav().getByRole("link", { name: topicLabel(post.community) })).toHaveAttribute("href", topicPath(post.community));
    expect(screen.getAllByRole("article")).toHaveLength(batch.items.filter(item => item.community === post.community).length);
    view.unmount(); render(<App />);
    await screen.findByRole("link", { name: post.title });
    expect(nav().getByRole("link", { name: topicLabel(post.community) })).toHaveAttribute("aria-current", "page");
    fireEvent.click(nav().getByRole("link", { name: "All topics" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(batch.items.length));
    expect(window.location.pathname).toBe("/");
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.pathname).toBe(topicPath(post.community)));
    await screen.findByRole("heading", { name: topicLabel(post.community), level: 1 });
    await act(async () => { window.history.forward(); });
    await screen.findByRole("heading", { name: "Leave with something worth knowing." });
    expect(window.location.pathname).toBe("/");
  });
  it("leaves modified topic clicks to the browser and exposes topic links on articles", async () => {
    render(<App />);
    await screen.findByRole("link", { name: post.title });
    const topic = within(screen.getByRole("navigation", { name: "Topics" })).getByRole("link", { name: topicLabel(post.community) });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
    let intercepted = true;
    const preventJsdomNavigation = (event: Event) => {
      intercepted = event.defaultPrevented;
      event.preventDefault(); // jsdom cannot perform the browser's new-tab action.
    };
    document.addEventListener("click", preventJsdomNavigation, { once: true });
    topic.dispatchEvent(click);
    expect(intercepted).toBe(false);
    expect(window.location.pathname).toBe("/");
    fireEvent.click(screen.getByRole("link", { name: post.title }));
    const article = await screen.findByRole("region", { name: "Article" });
    fireEvent.click(within(article).getByRole("link", { name: topicLabel(post.community) }));
    await screen.findByRole("heading", { name: topicLabel(post.community), level: 1 });
    expect(window.location.pathname).toBe(topicPath(post.community));
  });
  it("shows an unknown topic instead of silently opening the all-topic feed", () => {
    window.history.replaceState({}, "", "/topics/not-a-topic/");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Topic not found" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe("noindex, follow");
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
  it("renders a direct static article without downloading the feed, and survives a remount", async () => {
    window.history.replaceState({}, "", articlePath(post));
    const data = document.createElement("script");
    data.id = "article-data"; data.type = "application/json"; data.textContent = JSON.stringify(post); document.body.append(data);
    const view = render(<App />);
    expect(screen.getByRole("heading", { name: post.title })).toBeVisible();
    expect(dataRequests()).toHaveLength(0);
    view.unmount(); render(<App />);
    expect(screen.getByRole("heading", { name: post.title })).toBeVisible();
    expect(dataRequests()).toHaveLength(0);
  });
  it("shows a retryable failure for a missing article", async () => {
    window.history.replaceState({}, "", "/p/not-found/");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    render(<App />);
    expect(await screen.findByText(/This article couldn't be loaded/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe("noindex, follow");
  });
  it.each([true, false])("opens a legacy URL and replaces it with the short sharing URL (embedded: %s)", async (embedded) => {
    const legacy = { ...post, slug: `original-headline--${Buffer.from(post.id).toString("hex")}` };
    const oldPath = `/p/${legacy.slug}/`;
    expect(oldPath).not.toBe(articlePath(legacy));
    window.history.replaceState({ preserved: true }, "", `${oldPath}?ref=message#sources`);
    if (embedded) {
      const data = document.createElement("script");
      data.id = "article-data"; data.type = "application/json"; data.textContent = JSON.stringify(legacy); document.body.append(data);
    } else vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => legacy })));
    const clipboard = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: clipboard } });
    render(<App />);
    expect(await screen.findByRole("heading", { name: post.title })).toBeVisible();
    await waitFor(() => expect(window.location.pathname).toBe(articlePath(legacy)));
    expect(window.location.search + window.location.hash).toBe("?ref=message#sources");
    expect(window.history.state).toEqual({ preserved: true });
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(clipboard).toHaveBeenCalledWith(`${window.location.origin}${articlePath(legacy)}`);
    if (embedded) expect(dataRequests()).toHaveLength(0);
    else expect(dataRequests()).toHaveLength(1);
  });
  it("rejects an article payload belonging to a different address", async () => {
    window.history.replaceState({}, "", "/p/another-article--1234567890/");
    render(<App />);
    expect(await screen.findByText(/This article couldn't be loaded/)).toBeVisible();
    expect(screen.queryByRole("heading", { name: post.title })).not.toBeInTheDocument();
  });
});
