import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { collectEvergreen } from "./evergreen";
import type { FeedSource } from "../../schemas";

export interface SourceFeed {
  publisher: string;
  url: string;
  hosts: string[];
  topic: string;
  maxAgeDays?: number;
}
export const SOURCE_FEEDS: SourceFeed[] = [
  {
    publisher: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    hosts: ["bbc.co.uk", "bbc.com"],
    topic: "technology",
  },
  {
    publisher: "NASA",
    url: "https://www.nasa.gov/feed/",
    hosts: ["nasa.gov"],
    topic: "science",
  },
  {
    publisher: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    hosts: ["bbc.co.uk", "bbc.com"],
    topic: "world",
  },
  { publisher: "Global News Canada", url: "https://globalnews.ca/canada/feed/", hosts: ["globalnews.ca"], topic: "canada" },
  { publisher: "CBC Canada", url: "https://www.cbc.ca/webfeed/rss/rss-canada", hosts: ["cbc.ca"], topic: "canada" },
  { publisher: "BBC US & Canada", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", hosts: ["bbc.co.uk", "bbc.com"], topic: "united_states" },
  { publisher: "OpenAI", url: "https://openai.com/news/rss.xml", hosts: ["openai.com"], topic: "ai_agents" },
  { publisher: "AWS Machine Learning", url: "https://aws.amazon.com/blogs/machine-learning/feed/", hosts: ["aws.amazon.com"], topic: "ai_agents" },
  { publisher: "Variety Film", url: "https://variety.com/v/film/feed/", hosts: ["variety.com"], topic: "movies", maxAgeDays: 30 },
  { publisher: "Aeon", url: "https://aeon.co/feed.rss", hosts: ["aeon.co"], topic: "philosophy", maxAgeDays: 90 },
  { publisher: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", hosts: ["bbc.co.uk", "bbc.com"], topic: "economics" },
];
export interface SourcePacket extends FeedSource {
  evergreen?: boolean;
  id: string;
  excerpt: string;
  topic: string;
}
const MAX_BYTES = 1_000_000;

export function plainText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:amp|lt|gt|quot|apos|nbsp);/g,
      (entity) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&apos;": "'",
          "&nbsp;": " ",
        })[entity] ?? entity,
    )
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, value: string) => {
      const number = value.toLowerCase().startsWith("x")
        ? parseInt(value.slice(1), 16)
        : parseInt(value, 10);
      return number > 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}
export function parseSourceFeed(
  xml: string,
  feed: SourceFeed,
  now: Date,
): SourcePacket[] {
  // Never expand untrusted DTDs or entities. RSS is evidence, never instructions.
  if (/<!DOCTYPE|<!ENTITY/i.test(xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")))
    throw new Error("RSS declarations are not allowed");
  const parsed = new XMLParser({
    processEntities: false,
    ignoreAttributes: true,
    parseTagValue: false,
  }).parse(xml);
  const entries: unknown = parsed?.rss?.channel?.item;
  const rows = Array.isArray(entries) ? entries : entries ? [entries] : [];
  const packets: SourcePacket[] = [];
  for (const row of rows) {
    const title = plainText(row.title).slice(0, 300);
    const excerpt = plainText(row["content:encoded"] || row.description).slice(
      0,
      6000,
    );
    const published = new Date(row.pubDate);
    if (!title || excerpt.length < 80 || !Number.isFinite(published.getTime()))
      continue;
    if (
      published.getTime() > now.getTime() ||
      now.getTime() - published.getTime() > (feed.maxAgeDays ?? 7) * 24 * 60 * 60_000
    )
      continue;
    let url: URL;
    try {
      url = new URL(plainText(row.link));
    } catch {
      continue;
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !feed.hosts.some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
      )
    )
      continue;
    for (const key of [...url.searchParams.keys()])
      if (key.startsWith("utm_") || key.startsWith("at_"))
        url.searchParams.delete(key);
    url.hash = "";
    packets.push({
      id: createHash("sha256").update(url.href).digest("hex").slice(0, 16),
      url: url.href,
      title,
      excerpt,
      publisher: feed.publisher,
      topic: feed.topic,
      publishedAt: published.toISOString(),
      retrievedAt: now.toISOString(),
    });
  }
  return packets
    .sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))
    .slice(0, 8);
}
export async function readBounded(response: Response): Promise<string> {
  if (!response.ok || !response.body)
    throw new Error(`RSS request failed (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("RSS exceeds size limit");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export async function collectSources(
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<SourcePacket[]> {
  const results = await Promise.allSettled(
    SOURCE_FEEDS.map(async (feed) => {
      const response = await fetchImpl(feed.url, {
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      return parseSourceFeed(await readBounded(response), feed, now);
    }),
  );
  const packets: SourcePacket[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") packets.push(...result.value);
    else
      console.warn(
        `[sources] ${SOURCE_FEEDS[index].publisher} unavailable; skipping`,
      );
  });
  packets.push(...await collectEvergreen(now, fetchImpl));
  return [...new Map(packets.map((p) => [p.url, p])).values()];
}
