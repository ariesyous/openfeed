import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { App } from "../src/App";
import { topicLabel } from "../src/lib/topics";
import { articlePath } from "../shared/articles";
import type { BatchFile, Manifest } from "../schemas";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8")) as Manifest;
const batch = JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")) as BatchFile;
const accounts = JSON.parse(readFileSync("public/data/accounts.json", "utf8"));
const post = batch.items[0];
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
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("button", { name: topicLabel(post.community) }));
    const before = screen.getAllByRole("article").length;
    fireEvent.click(screen.getByRole("link", { name: post.title }));
    const article = await screen.findByRole("region", { name: "Article" });
    expect(window.location.pathname).toBe(articlePath(post));
    expect(within(article).getByRole("button", { name: "Copy link" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Save|Mark read|Mark caught up/ })).not.toBeInTheDocument();
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    await waitFor(() => expect(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("button", { name: topicLabel(post.community) })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getAllByRole("article")).toHaveLength(before);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("manifest.json"))).toHaveLength(1);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save|Mark read|Mark caught up/ })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Topics" })).getByRole("button", { name: "All topics" }));
    expect(screen.getAllByRole("article")).toHaveLength(batch.items.length);
  });
  it("renders a direct static article without downloading the feed, and survives a remount", async () => {
    window.history.replaceState({}, "", articlePath(post));
    const data = document.createElement("script");
    data.id = "article-data"; data.type = "application/json"; data.textContent = JSON.stringify(post); document.body.append(data);
    const view = render(<App />);
    expect(screen.getByRole("heading", { name: post.title })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    view.unmount(); render(<App />);
    expect(screen.getByRole("heading", { name: post.title })).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("shows a retryable failure for a missing article", async () => {
    window.history.replaceState({}, "", "/p/not-found/");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    render(<App />);
    expect(await screen.findByText(/This article couldn't be loaded/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
