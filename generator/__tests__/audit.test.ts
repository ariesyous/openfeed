// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AUDIT_FILE_NAME, buildAuditChunk, createEditorialAudit, publishWithAudit, serializeEditorialAudit, type EditorialAuditChunk } from "../editorial/audit";
import { generateEditorial, validateDraft } from "../editorial/generate";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-09-18T12:00:00Z");
const packet: SourcePacket = {
  id: "source-1", topic: "science", publisher: "Publisher", title: "A measured trial",
  url: "https://example.com/report", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "The measured trial supports a cautious conclusion before a broader release is considered.",
};
const roots: string[] = [];
function root() { const directory = mkdtempSync(path.join(tmpdir(), "openfeed-audit-")); roots.push(directory); return directory; }
afterEach(() => { for (const directory of roots.splice(0)) rmSync(directory, { recursive: true, force: true }); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function chunk(overrides: Partial<Parameters<typeof buildAuditChunk>[0]> = {}) {
  return buildAuditChunk({ index: 1, runId: "test", postOffset: 0, requestedModel: "openrouter/free", resolvedModel: "resolved/model", apiKey: "secret-key",
    packets: [packet], posts: [{ evidenceIds: ["S1E1"] }],
    evidenceById: new Map([["S1E1", { sourceId: packet.id, quote: packet.excerpt }]]), ...overrides });
}
const envelope = (chunks: EditorialAuditChunk[]) => ({ schemaVersion: 1, runId: "test", startedAt: now.toISOString(), status: "validated_candidate", chunks });

describe("bounded editorial support records", () => {
  it("retains every selected body and discussion ID, but excludes full articles and raw completions", () => {
    const evidenceById = new Map(Array.from({ length: 12 }, (_, i) => [`S1E${i + 1}`, { sourceId: packet.id, quote: `Selected supporting sentence ${i + 1}.` }]));
    const result = chunk({ evidenceById, packets: [{ ...packet, excerpt: "Unselected full article prose must not be included." }],
      posts: [{ evidenceIds: ["S1E1", "S1E2", "S1E3"], discussion: [
        { voice: "Take", evidenceIds: ["S1E4", "S1E5", "S1E6"] },
        { voice: "Pushback", evidenceIds: ["S1E7", "S1E8", "S1E9"] },
        { voice: "Reply", evidenceIds: ["S1E10", "S1E11", "S1E12"] },
        { voice: "Context", evidenceIds: ["S1E1", "S1E8", "S1E12"] },
      ] }] });
    expect(result.evidence).toHaveLength(12);
    expect(result.posts[0].discussion).toHaveLength(4);
    expect(result.sources[0]).toMatchObject({ retrievedAt: now.toISOString(), publishedAt: now.toISOString() });
    const serialized = serializeEditorialAudit(envelope([result]));
    expect(serialized).not.toMatch(/Unselected full article|"excerpt"|"completion"|"apiKey"/);
  });

  it("redacts exact keys, bearer tokens and OpenRouter tokens in retained metadata and evidence", () => {
    const result = chunk({ requestedModel: "secret-key", resolvedModel: "secret-key", packets: [{ ...packet,
      title: "Bearer another-token", url: "https://example.com/?key=secret-key", publisher: "sk-or-example-token",
    }], evidenceById: new Map([["S1E1", { sourceId: packet.id, quote: "secret-key\nBearer third-token and sk-or-fourth-token" }]]) });
    const serialized = serializeEditorialAudit(envelope([result]));
    expect(result.redactionsApplied).toBe(true);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toMatch(/secret-key|another-token|third-token|sk-or-example-token|sk-or-fourth-token/);
  });

  it("preserves ordinary multiline evidence whitespace exactly through JSON serialization", () => {
    const quote = "A measured\ttrial preserves its\r\nqualified conclusion.\nFurther testing remains necessary.";
    const result = chunk({ evidenceById: new Map([["S1E1", { sourceId: packet.id, quote }]]) });
    expect(result.redactionsApplied).toBe(false);
    expect(JSON.parse(serializeEditorialAudit(envelope([result]))).chunks[0].evidence[0].quote).toBe(quote);
  });

  it("rejects unknown IDs, missing source metadata, invalid cross-source discussion and excessive records", () => {
    expect(() => chunk({ posts: [{ evidenceIds: ["unknown"] }] })).toThrow(/invalid evidence/);
    expect(() => chunk({ packets: [] })).toThrow(/missing source/);
    expect(() => chunk({ posts: Array.from({ length: 5 }, () => ({ evidenceIds: ["S1E1"] })) })).toThrow(/bounds/);
    const invalid = chunk(); invalid.posts[0].discussion.push({ turnIndex: 0, voice: "Take", evidenceIds: ["unknown"] });
    expect(() => serializeEditorialAudit(envelope([invalid]))).toThrow(/invalid/);
    const chunks = Array.from({ length: 6 }, (_, index) => chunk({ index: index + 1, postOffset: index * 4,
      posts: Array.from({ length: 4 }, () => ({ evidenceIds: ["S1E1"] })),
    }));
    expect(() => serializeEditorialAudit(envelope(chunks))).toThrow(/bounds/);
  });

  it("enforces the final UTF-8 byte cap without silently truncating selected support", () => {
    const chunks = Array.from({ length: 5 }, (_, index) => {
      const sources = Array.from({ length: 12 }, (_, s) => ({ ...packet, id: `source-${s}`, url: `https://example.com/${"界".repeat(4000)}/${s}` }));
      return chunk({ index: index + 1, postOffset: index * 4, packets: sources,
        evidenceById: new Map(sources.map((source, s) => [`S${s}E1`, { sourceId: source.id, quote: packet.excerpt }])),
        posts: Array.from({ length: 4 }, (_, p) => ({ evidenceIds: Array.from({ length: 3 }, (_, s) => `S${p * 3 + s}E1`) })),
      });
    });
    expect(() => serializeEditorialAudit(envelope(chunks))).toThrow(/byte limit/);
  });

  it("persists candidate before local writes and marks data_written only after success", () => {
    const directory = root(), audit = createEditorialAudit({ root: directory, directory: "artifacts", runId: "test", now });
    audit.onAcceptedChunk(chunk());
    const file = path.join(directory, "artifacts", AUDIT_FILE_NAME);
    const failure = new Error("publisher failed");
    expect(() => publishWithAudit(audit, ["post-test-0"], () => {
      expect(JSON.parse(readFileSync(file, "utf8")).status).toBe("validated_candidate"); throw failure;
    })).toThrow(failure);
    expect(JSON.parse(readFileSync(file, "utf8")).status).toBe("validated_candidate");
    publishWithAudit(audit, ["post-test-0"], () => {});
    expect(JSON.parse(readFileSync(file, "utf8")).status).toBe("data_written");
    expect(existsSync(path.join(directory, "public"))).toBe(false);
    expect(existsSync(path.join(directory, "dist"))).toBe(false);
  });

  it("fails before publishing if the audit cannot be written; disabled audit needs no filesystem", () => {
    const directory = root(), audit = createEditorialAudit({ root: directory, directory: "artifacts", runId: "test", now });
    audit.onAcceptedChunk(chunk());
    rmSync(path.join(directory, "artifacts"), { recursive: true });
    writeFileSync(path.join(directory, "artifacts"), "blocks directory");
    const publish = vi.fn();
    expect(() => publishWithAudit(audit, ["post-test-0"], publish)).toThrow();
    expect(publish).not.toHaveBeenCalled();
    publishWithAudit(undefined, ["post-test-0"], publish);
    expect(publish).toHaveBeenCalledOnce();
  });

  it("rejects deployment paths and symlinks into them, and removes stale run records", () => {
    const directory = root(); mkdirSync(path.join(directory, "public"));
    symlinkSync(path.join(directory, "public"), path.join(directory, "linked-public"));
    for (const target of ["public/data", "dist/audit", "dist-ssr/audit", "linked-public/audit"])
      expect(() => createEditorialAudit({ root: directory, directory: target, runId: "test", now })).toThrow(/outside/);
    const artifacts = path.join(directory, "artifacts"); mkdirSync(artifacts);
    writeFileSync(path.join(artifacts, AUDIT_FILE_NAME), "old run");
    createEditorialAudit({ root: directory, directory: "artifacts", runId: "test", now });
    expect(existsSync(path.join(artifacts, AUDIT_FILE_NAME))).toBe(false);
  });
});

describe("audit through the real bounded generation path", () => {
  const packets = Array.from({ length: 8 }, (_, index) => ({ ...packet, id: `source-${index}`,
    title: `Distinct trial ${index}`, publisher: `Publisher ${index}`, url: `https://example.com/${index}`,
    excerpt: `Trial ${index} supports a cautious conclusion before a broader release is considered.`,
  }));
  async function generate(partial: boolean, reportModel = true) {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("OPENROUTER_MODEL", "openrouter/free");
    const chunks: EditorialAuditChunk[] = []; let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls++;
      if (partial && calls > 1) return new Response("unavailable", { status: 503 });
      const input = JSON.parse(JSON.parse(String(init?.body)).messages[1].content);
      const posts = input.sources.slice(0, 4).map((source: { title: string; evidence: { id: string }[] }) => ({
        title: source.title, body: "The trial supports a cautious interpretation of the finding.", format: "news", topic: null, spoilers: null,
        evidenceIds: [source.evidence[0].id], discussion: [
          { voice: "Take", body: "A limited trial can still be a useful first step.", evidenceIds: [source.evidence[0].id] },
          { voice: "Pushback", body: "A wider rollout would be a separate judgment.", evidenceIds: [source.evidence[0].id] },
        ],
      }));
      return new Response(JSON.stringify({ ...(reportModel ? { model: `resolved/model-${calls}` } : {}), choices: [{ message: { content: JSON.stringify({ posts }) }, finish_reason: "stop" }] }));
    };
    const items = await generateEditorial("secret-key", packets, now, "test", [], { fetchImpl, sleepImpl: async () => {}, onAcceptedChunk: chunk => chunks.push(chunk) });
    return { chunks, items, calls };
  }
  it("scopes reused evidence IDs per accepted chunk and maps final post IDs and resolved models", async () => {
    const { chunks, items, calls } = await generate(false);
    expect(calls).toBe(2); expect(items).toHaveLength(8); expect(chunks).toHaveLength(2);
    expect(chunks.map(chunk => chunk.evidence[0].id)).toEqual(["S1E1", "S1E1"]);
    expect(chunks[0].evidence[0].sourceId).not.toBe(chunks[1].evidence[0].sourceId);
    expect(chunks.map(chunk => chunk.requestedModel)).toEqual(["openrouter/free", "openrouter/free"]);
    expect(chunks.map(chunk => chunk.resolvedModel)).toEqual(["resolved/model-1", "resolved/model-2"]);
    expect(chunks.flatMap(chunk => chunk.posts.map(post => post.postId))).toEqual(items.map(item => item.id));
    expect(JSON.stringify(items)).not.toMatch(/evidenceIds|redactionsApplied|resolved\/model/);
    expect(() => serializeEditorialAudit(envelope(chunks))).not.toThrow();
  });
  it("records null resolved model when the provider does not identify the model", async () => {
    const { chunks, items } = await generate(false, false);
    expect(items).toHaveLength(8);
    expect(chunks.map(chunk => chunk.resolvedModel)).toEqual([null, null]);
    expect(chunks.map(chunk => chunk.requestedModel)).toEqual(["openrouter/free", "openrouter/free"]);
    expect(() => serializeEditorialAudit(envelope(chunks))).not.toThrow();
  });
  it("keeps only accepted support when later provider attempts exhaust the shared budget", async () => {
    const { chunks, items, calls } = await generate(true);
    expect(calls).toBe(8); expect(items).toHaveLength(4); expect(chunks).toHaveLength(1);
    expect(chunks[0].posts.map(post => post.postId)).toEqual(items.map(item => item.id));
  });
});

it("rejects a fabricated second quotation even when the first quote from that source is valid", () => {
  const result = validateDraft({ posts: [{ format: "news", title: "A measured trial", body: "The trial supports a cautious conclusion.",
    sourceIds: [packet.id], evidence: [{ sourceId: packet.id, quote: packet.excerpt }, { sourceId: packet.id, quote: "This fabricated detail does not occur in the source." }],
  }] }, [packet], now);
  expect(result.ok).toBe(false);
});
