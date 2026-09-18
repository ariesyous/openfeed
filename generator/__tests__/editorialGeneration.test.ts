// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { editorialJsonSchema, generateEditorial, validateCitedDraft } from "../editorial/generate";
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
        name: "editorial_edition", strict: true, schema: editorialJsonSchema([...prepareEvidence([source]).evidenceById.keys()], 4).schema,
      }});
      const schema = editorialJsonSchema([...prepareEvidence([source]).evidenceById.keys()], 4).schema;
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

  it("continues after an empty second chunk using different evidence and preserves the first chunk", async () => {
    let calls = 0;
    let declined: string[] = [];
    let firstTitles: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const input = JSON.parse(request.messages[1].content);
      const titles = input.sources.map((entry: { title: string }) => entry.title);
      if (calls === 0) firstTitles = titles.slice(0, 4);
      if (++calls === 2) {
        declined = titles;
        return completion({ posts: [] });
      }
      if (calls > 2) expect(titles.every((title: string) => !declined.includes(title))).toBe(true);
      return completion({ posts: chunk(init) });
    };
    const items = await generateEditorial("secret", packets, now, "empty-second", [], { fetchImpl });
    expect(calls).toBe(3);
    expect(items).toHaveLength(8);
    expect(items.slice(0, 4).map(item => item.title)).toEqual(firstTitles);
    expect(items.every(item => !declined.includes(item.title!))).toBe(true);
    // Deferral is run-local: these sources can be selected on a later run.
    const next = await generateEditorial("secret", packets.filter(packet => declined.includes(packet.title)), now, "later", [], {
      fetchImpl: async (_url, init) => completion({ posts: chunk(init) }),
    });
    expect(next).toHaveLength(16);
  });

  it("stops after exhausting distinct selections without repeating an empty request", async () => {
    const offered = new Set<string>();
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls++;
      const input = JSON.parse(JSON.parse(String(init?.body)).messages[1].content);
      for (const entry of input.sources) {
        expect(offered.has(entry.title)).toBe(false);
        offered.add(entry.title);
      }
      return completion({ posts: [] });
    };
    const items = await generateEditorial("secret", packets, now, "all-empty", [], { fetchImpl });
    expect(calls).toBe(2);
    expect(offered.size).toBe(24);
    expect(items).toEqual([]);
    expect(await generateEditorial("secret", [], now, "no-sources", [], { fetchImpl })).toEqual([]);
    expect(calls).toBe(2);
  });

  it("can still reach twenty posts after an empty initial selection", async () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ ...source,
      id: `initial-${index}`, url: `https://example.com/initial-${index}`,
      publisher: `Publisher ${index}`, title: `Initial source ${index}`,
    }));
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => completion({
      posts: ++calls === 1 ? [] : chunk(init),
    });
    const items = await generateEditorial("secret", many, now, "initial-empty", [], { fetchImpl });
    expect(calls).toBe(6);
    expect(items).toHaveLength(20);
    expect(new Set(items.map(item => item.editorial!.sources[0].url)).size).toBe(20);
  });

  it("charges empty selections and provider retries to the same eight-attempt budget", async () => {
    const many = Array.from({ length: 160 }, (_, index) => ({ ...source,
      id: `many-${index}`, url: `https://example.com/many-${index}`,
      publisher: `Publisher ${index}`, title: `Source number ${index}`,
    }));
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls++;
      if (calls === 1) return completion({ posts: chunk(init) });
      if (calls === 3) return new Response("unavailable", { status: 503 });
      return completion({ posts: [] });
    };
    const items = await generateEditorial("secret", many, now, "bounded-empty", [], { fetchImpl, sleepImpl: async () => {} });
    expect(calls).toBe(8);
    expect(items).toHaveLength(4);
  });

  it("does not reset the shared deadline after an empty selection", async () => {
    const many = Array.from({ length: 60 }, (_, index) => ({ ...source,
      id: `time-${index}`, url: `https://example.com/time-${index}`,
      publisher: `Publisher ${index}`, title: `Timed source ${index}`,
    }));
    let calls = 0;
    let elapsed = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      if (++calls === 1) return completion({ posts: chunk(init) });
      elapsed = 45 * 60_000 - 30_000;
      return completion({ posts: [] });
    };
    const items = await generateEditorial("secret", many, now, "empty-deadline", [], {
      fetchImpl, nowImpl: () => elapsed,
    });
    expect(calls).toBe(2);
    expect(items).toHaveLength(4);
  });

});

describe("run 31 validation regressions", () => {
  it("constrains post and discussion evidence to exactly the current request IDs", () => {
    const schema = editorialJsonSchema(["S1E1", "S2E3"], 2).schema;
    let fields = 0;
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const value = node as Record<string, unknown>;
      if (value.evidenceIds) {
        const field = value.evidenceIds as { items: { enum: string[] } };
        expect(field.items.enum).toEqual(["S1E1", "S2E3"]);
        expect(field.items.enum).not.toContain("S1E1','S2E3");
        fields++;
      }
      Object.values(value).forEach(child => Array.isArray(child) ? child.forEach(walk) : walk(child));
    };
    walk(schema);
    expect(fields).toBe(2);
    expect(schema.properties?.posts).toMatchObject({ maxItems: 2 });
    expect(JSON.stringify(editorialJsonSchema(["S1E2"], 4))).not.toContain('"S2E3"');
  });

  it("rejects concatenated evidence IDs even when a provider falls back to plain JSON", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      if (++calls === 1) return new Response("response_format not supported", {status: 400});
      expect(request.response_format).toBeUndefined();
      if (calls === 2) return completion({posts: [{...post, evidenceIds: ["S1E1','S1E2"]}]});
      expect(request.messages[1].content).toContain("unknown evidence ID S1E1','S1E2");
      return completion({posts: [post]});
    };
    const items = await generateEditorial("secret", [source], now, "ids", [], {fetchImpl, sleepImpl: async () => {}});
    expect(calls).toBe(3);
    expect(items).toHaveLength(1);
  });

  it("states fresh and remaining publisher budgets and still rejects cross-chunk excess", async () => {
    const publishers = ["BBC Technology", "BBC World", "BBC Business", "OpenAI", "OpenAI", "OpenAI", "Global News Canada", "Global News Canada", "Global News Canada"];
    const packets = publishers.map((publisher, i) => ({...source, publisher,
      id: `p${i}`, title: `Article ${i}`, url: `https://example.com/${i}`,
    }));
    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
      calls++;
      expect(input.publisherSlotsRemaining).toEqual({BBC: calls === 1 ? 2 : 1, OpenAI: calls === 1 ? 2 : 1, "Global News Canada": calls === 1 ? 2 : 1});
      for (const entry of input.sources) {
        expect(entry.publisherGroup).toBe(entry.publisher.startsWith("BBC") ? "BBC" : entry.publisher);
      }
      // First chunk uses one source per group; the next improperly selects two OpenAI sources.
      const indices = calls === 1 ? [0, 3, 6] : calls === 2 ? [4, 5] : [1, 4, 7];
      if (calls === 3) expect(request.messages[1].content).toContain("Too many posts from OpenAI");
      return completion({posts: indices.map(i => {
        const entry = input.sources.find((entry: {title: string}) => entry.title === `Article ${i}`);
        return {...post, title: entry.title, evidenceIds: [entry.evidence[0].id]};
      })});
    };
    const items = await generateEditorial("secret", packets, now, "publishers", [], {fetchImpl, sleepImpl: async () => {}});
    expect(calls).toBe(3);
    expect(items).toHaveLength(6);
    expect(items.map(item => item.title)).not.toContain("Article 5");
  });
});
