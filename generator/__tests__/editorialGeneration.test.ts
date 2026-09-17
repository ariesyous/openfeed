// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { EDITORIAL_JSON_SCHEMA, generateEditorial, validateCitedDraft } from "../editorial/generate";
import { prepareEvidence } from "../editorial/evidence";
import { logEditorialAttempt } from "../editorial/diagnostics";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-09-16T00:00:00Z");
const source: SourcePacket = {
  id: "source1", topic: "ai_agents", publisher: "Publisher",
  title: "A cautious rollout", excerpt: "The new system will be tested before a broader release is considered.",
  url: "https://example.com/report", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
};
const post = {
  format: "news", title: "A cautious rollout", body: "The publisher describes a trial before a wider release.",
  topic: null, discussion: null, spoilers: null,
  evidenceIds: ["S1E1"],
};
const completion = (value: unknown) => new Response(JSON.stringify({
  model: "test/resolved-model", choices: [{finish_reason: "stop", message: {content: JSON.stringify(value)}}],
}));

// Exercise the real editorial -> retry -> OpenRouter path without paid model calls.
describe("editorial structured generation", () => {
  it("sends a strict schema with required nullable fields and normalizes nulls before publishing", async () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const requests: Record<string, unknown>[] = [];
      const fetchImpl: typeof fetch = async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return completion({posts: [post]});
      };
      const items = await generateEditorial("secret", [source], now, "test", [], {fetchImpl});
      expect(requests[0].response_format).toEqual({type: "json_schema", json_schema: {
        name: "editorial_edition", strict: true, schema: EDITORIAL_JSON_SCHEMA.schema,
      }});
      const schema = EDITORIAL_JSON_SCHEMA.schema;
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        const value = node as Record<string, unknown>;
        if (value.type === "object") {
          expect(value.additionalProperties).toBe(false);
          expect([...(value.required as string[])].sort()).toEqual(Object.keys(value.properties as object).sort());
        }
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) child.forEach(walk); else walk(child);
        }
      };
      walk(schema);
      expect(items[0].community).toBe("ai_agents");
      expect(items[0].editorial?.discussion).toBeUndefined();
      expect(items[0].editorial?.spoilers).toBeUndefined();
      expect(logger.mock.calls.flat().join(" ")).toContain("model=test/resolved-model");
    } finally { logger.mockRestore(); }
  });

  it("falls back after schema rejection, logs evidence failures, then accepts a corrected draft", async () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const requests: Record<string, unknown>[] = [];
      const fetchImpl: typeof fetch = async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        if (requests.length === 1) return new Response("response_format not supported", {status: 400});
        if (requests.length === 2) return completion({posts: [{...post, evidenceIds: ["invented"]}]});
        return completion({posts: [post]});
      };
      const items = await generateEditorial("secret", [source], now, "test", [], {fetchImpl, sleepImpl: async () => {}});
      expect(items).toHaveLength(1);
      expect(requests.map((r) => Boolean(r.response_format))).toEqual([true, false, false]);
      const log = logger.mock.calls.flat().join(" ");
      expect(log).toContain("unsupported_structured_output");
      expect(log).toContain("posts.0.evidenceIds: unknown evidence ID invented");
      expect(log).toContain("structured output: false");
    } finally { logger.mockRestore(); }
  });

  it("rejects oversized editions even when structured output is unavailable", () => {
    const result = validateCitedDraft({posts: Array.from({length: 5}, () => post)}, prepareEvidence([source]).evidenceById, [source], now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("posts");
  });
});

it("redacts credentials, strips control characters, and bounds diagnostic output", () => {
  const logger = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    logEditorialAttempt({attempt: 2, outcomeKind: "retryable", detail: 'secret-key\nBearer another-token sk-or-v1-example ' + 'x'.repeat(4000)}, "secret-key", 1200);
    const message = logger.mock.calls[0][0] as string;
    expect(message).toContain("[REDACTED]");
    expect(message).not.toMatch(/secret-key|another-token|sk-or-v1-example|\n/);
    expect(message.length).toBeLessThanOrEqual(2000);
  } finally { logger.mockRestore(); }
});

describe("twenty-post edition budgeting", () => {
  const packets = Array.from({ length: 24 }, (_, index) => ({ ...source,
    id: `source-${index}`, url: `https://example.com/${index}`, publisher: `Publisher ${index}`,
    title: `Distinct source ${index}`, excerpt: `Source ${index} reports a carefully monitored trial before any wider release is considered.`,
  }));
  function chunk(init?: RequestInit) {
    const request = JSON.parse(String(init?.body));
    const input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
    return input.sources.slice(0, input.maxPosts).map((entry: { title: string; evidence: { id: string }[] }) => ({ ...post, title: entry.title, evidenceIds: [entry.evidence[0].id] }));
  }
  it("produces twenty distinct posts in five four-post chunks with one total attempt budget", async () => {
    const sizes: number[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      const posts = chunk(init); sizes.push(posts.length); return completion({ posts });
    };
    const items = await generateEditorial("secret", packets, now, "ten", [], { fetchImpl });
    expect(sizes).toEqual([4, 4, 4, 4, 4]);
    expect(items).toHaveLength(20);
    expect(new Set(items.flatMap(item => item.editorial!.sources.map(entry => entry.url))).size).toBe(20);
  });
  it("publishes an already validated partial edition when later attempts fail", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      if (++calls === 1) return completion({ posts: chunk(init) });
      return new Response("unavailable", { status: 503 });
    };
    const items = await generateEditorial("secret", packets, now, "partial", [], { fetchImpl, sleepImpl: async () => {} });
    expect(calls).toBe(8);
    expect(items).toHaveLength(4);
  });
  it("rejects a cross-chunk repeated title and leaves the accepted chunk intact", async () => {
    let calls = 0;
    let firstTitle = "";
    const fetchImpl: typeof fetch = async (_url, init) => {
      const posts = chunk(init);
      if (++calls === 1) firstTitle = posts[0].title;
      else posts[0].title = firstTitle;
      return completion({ posts });
    };
    const items = await generateEditorial("secret", packets, now, "duplicate", [], { fetchImpl, sleepImpl: async () => {} });
    expect(calls).toBe(8);
    expect(items).toHaveLength(4);
  });
  it("retains valid chunks when the shared deadline leaves no room for another request", async () => {
    let elapsed = 0;
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls++;
      elapsed = 45 * 60_000 - 30_000;
      return completion({ posts: chunk(init) });
    };
    const items = await generateEditorial("secret", packets, now, "deadline", [], {
      fetchImpl, nowImpl: () => elapsed,
    });
    expect(calls).toBe(1);
    expect(items).toHaveLength(4);
  });
  it("reaches twenty despite three transient provider failures", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      if (++calls <= 3) return new Response("unavailable", { status: 503 });
      return completion({ posts: chunk(init) });
    };
    const items = await generateEditorial("secret", packets, now, "retry", [], { fetchImpl, sleepImpl: async () => {} });
    expect(calls).toBe(8);
    expect(items).toHaveLength(20);
  });

});
