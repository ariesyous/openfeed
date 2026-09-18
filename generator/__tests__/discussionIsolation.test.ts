// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildPublishPlan, writePublishPlan } from "../publish";
import { loadWorldState } from "../worldState";
import { makeEditorialWorld } from "../editorial/state";
import { editorialAccounts } from "../editorial/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEditorial, validateCitedDraft } from "../editorial/generate";
import { prepareEvidence } from "../editorial/evidence";
import type { EditorialAuditChunk } from "../editorial/audit";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-09-18T00:00:00Z");
const packets: SourcePacket[] = Array.from({ length: 6 }, (_, i) => ({
  id: `source${i}`, title: `Trial number ${i}`, publisher: `Publisher ${i}`,
  topic: "ai_agents", url: `https://example.com/${i}`, publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "The system is being tested before any broader release.\n\nA separate assessment will examine the trial's limitations.",
}));
const turn = { voice: "Context", body: "Testing is a condition for considering release, not a promise of release.", evidenceIds: ["S1E2"] };
const post = { format: "news", title: "A trial before wider release", body: "Testing precedes the decision about a broader release.",
  topic: null, spoilers: true, evidenceIds: ["S1E1"], discussion: [turn, { ...turn, voice: "Reply" }] };
const completion = (value: unknown) => new Response(JSON.stringify({ model: "test/model", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] }));
function check(candidate: unknown, sources = packets) {
  return validateCitedDraft(candidate, prepareEvidence(sources).evidenceById, sources, now);
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("optional discussion isolation", () => {
  it.each([
    [[], "schema"], [[turn], "schema"], [[turn, { ...turn, body: "short" }], "schema"],
    [[turn, { ...turn, evidenceIds: ["unknown"] }], "unknown_evidence"],
    [[turn, { ...turn, evidenceIds: ["S1E1','S1E2"] }], "unknown_evidence"],
    [[turn, { ...turn, evidenceIds: ["S2E1"] }], "support_or_voice"],
    [[turn, { ...turn, body: "The excerpt does not say what happens next." }], "support_or_voice"],
    [[turn, { ...turn, body: "See https://example.com for the story." }], "support_or_voice"],
  ])("omits the whole invalid array, preserving parent and spoiler flag (%j)", (discussion, reason) => {
    const input = { posts: [{ ...post, discussion }] };
    const original = structuredClone(input);
    const result = check(input);
    expect(input).toEqual(original);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected valid parent");
    expect(result.value.posts[0]).toMatchObject({ title: post.title, body: post.body, spoilers: true });
    expect(result.value.posts[0].discussion).toBeUndefined();
    expect(result.selection[0]).toMatchObject({ discussion: null, discussionOmission: reason });
  });

  it("does not salvage invalid parents, ambiguous envelopes, or stale news", () => {
    for (const candidate of [
      { ...post, evidenceIds: ["unknown"] }, { ...post, body: "too short" },
      { ...post, title: "The excerpt doesn't say what happened" },
      { ...post, body: "The supplied material does not explain the trial." },
      { ...post, discussion: { turns: post.discussion } }, { ...post, discussion: "none" },
      { ...post, discussion: null, discussions: post.discussion }, { ...post, spoilers: "yes" },
    ]) expect(check({ posts: [candidate] }).ok).toBe(false);
    expect(check({ posts: [post], extra: "ambiguous" }).ok).toBe(false);
    expect(check({ posts: [post] }, packets.map(p => ({ ...p, evergreen: true }))).ok).toBe(false);
    expect(check({ posts: [post] }, packets.map(p => ({ ...p, publishedAt: "2025-01-01T00:00:00Z" }))).ok).toBe(false);
    expect(check({ posts: [post, { ...post, discussion: [] }] }).ok).toBe(false);
  });

  it("keeps exact quotation support checks for both parent and discussion", () => {
    for (const id of ["S1E1", "S1E2"]) {
      const evidence = prepareEvidence(packets).evidenceById;
      evidence.set(id, { sourceId: packets[0].id, quote: "This quotation was never in the source." });
      const result = validateCitedDraft({ posts: [post] }, evidence, packets, now);
      expect(result.ok).toBe(id === "S1E2");
      if (result.ok) expect(result.value.posts[0].discussion).toBeUndefined();
    }
  });

  it.each([false, true])("uses identical gates and sanitized support in structured/fallback mode (%s)", async fallback => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    const audits: EditorialAuditChunk[] = [];
    let calls = 0;
    const items = await generateEditorial("secret-key", [packets[0]], now, "isolated", [], {
      sleepImpl: async () => {}, onAcceptedChunk: chunk => audits.push(chunk),
      fetchImpl: async (_url, init) => {
        if (++calls === 1 && fallback) return new Response("response_format not supported", { status: 400 });
        expect(Boolean(JSON.parse(String(init?.body)).response_format)).toBe(!fallback);
        return completion({ posts: [{ ...post, discussion: [turn, { ...turn, evidenceIds: ["secret-key Bearer secret sk-or-token"] }] }] });
      },
    });
    expect(calls).toBe(fallback ? 2 : 1);
    expect(items).toHaveLength(1);
    expect(items[0].editorial).toMatchObject({ spoilers: true });
    expect(items[0].editorial?.discussion).toBeUndefined();
    expect(audits[0].posts[0]).toMatchObject({ postId: items[0].id, discussion: [], discussionOmission: "unknown_evidence" });
    expect(audits[0].evidence.map(e => e.id)).toEqual(["S1E1"]);
    const log = logs.mock.calls.flat().join(" ");
    expect(log).toContain("generatedDrafts=1 discussionOmissions=1");
    expect(log).toContain(`providerFailures=${fallback ? 1 : 0} rejectedResponses=0`);
    expect(log).not.toMatch(/secret-key|Bearer secret|sk-or-token/);
  });

  it("omits one sibling's discussion without losing another sibling's audited support", async () => {
    const audits: EditorialAuditChunk[] = [];
    const items = await generateEditorial("secret", packets.slice(0, 2), now, "siblings", [], {
      fetchImpl: async () => completion({ posts: [
        { ...post, discussion: [turn] },
        { ...post, title: "A second trial", evidenceIds: ["S2E1"], discussion: post.discussion.map(t => ({ ...t, evidenceIds: ["S2E2"] })) },
      ] }), onAcceptedChunk: chunk => audits.push(chunk),
    });
    expect(items).toHaveLength(2);
    expect(items[0].editorial?.discussion).toBeUndefined();
    expect(items[1].editorial?.discussion).toHaveLength(2);
    expect(audits[0].posts.map(p => p.postId)).toEqual(items.map(p => p.id));
    expect(audits[0].posts.map(p => p.discussionOmission)).toEqual(["schema", undefined]);
    expect(audits[0].evidence.map(e => e.id)).toEqual(["S1E1", "S2E1", "S2E2"]);
  });

  it("retains valid supported discussion and its spoiler flag unchanged", async () => {
    const audits: EditorialAuditChunk[] = [];
    const items = await generateEditorial("secret", [packets[0]], now, "kept", [], {
      fetchImpl: async () => completion({ posts: [post] }), onAcceptedChunk: chunk => audits.push(chunk),
    });
    expect(items[0].editorial?.discussion).toEqual(post.discussion.map(({ voice, body }) => ({ voice, body })));
    expect(items[0].editorial?.spoilers).toBe(true);
    expect(audits[0].evidence.map(e => e.id)).toEqual(["S1E1", "S1E2"]);
    expect(audits[0].posts[0].discussionOmission).toBeUndefined();
  });

  it.each(["publisher", "title"])("never counts omissions from rejected cross-chunk %s responses", async gate => {
    const sources = packets.map((p, i) => ({ ...p, publisher: gate === "publisher" && i < 3 ? "BBC World" : p.publisher }));
    const audits: EditorialAuditChunk[] = [];
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    let calls = 0;
    const items = await generateEditorial("secret", sources, now, "cross-chunk", [], {
      sleepImpl: async () => {}, onAcceptedChunk: chunk => audits.push(chunk),
      fetchImpl: async (_url, init) => {
        const input = JSON.parse(JSON.parse(String(init?.body)).messages[1].content.split("\n\nYour previous")[0]);
        calls++;
        const chosen = input.sources.slice(0, calls === 1 ? 1 : 2);
        return completion({ posts: chosen.map((s: { title: string; evidence: { id: string }[] }) => ({
          ...post, title: gate === "title" ? post.title : s.title, evidenceIds: [s.evidence[0].id],
          discussion: calls === 1 ? null : [],
        })) });
      },
    });
    expect(calls).toBe(8);
    expect(items).toHaveLength(1);
    expect(audits).toHaveLength(1);
    expect(logs.mock.calls.flat().join(" ")).toContain("discussionOmissions=0 providerFailures=0 rejectedResponses=7");
  });

  it.each(["attempts", "deadline"])("preserves isolated partial success at the shared %s limit", async limit => {
    let calls = 0, elapsed = 0;
    const audits: EditorialAuditChunk[] = [];
    const items = await generateEditorial("secret", packets, now, "partial", [], {
      sleepImpl: async () => {}, nowImpl: () => elapsed, onAcceptedChunk: chunk => audits.push(chunk),
      fetchImpl: async () => {
        if (++calls === 1) {
          if (limit === "deadline") elapsed = 45 * 60_000 - 30_000;
          return completion({ posts: [{ ...post, discussion: [] }] });
        }
        return new Response("unavailable", { status: 503 });
      },
    });
    expect(calls).toBe(limit === "deadline" ? 1 : 8);
    expect(items).toHaveLength(1);
    expect(audits).toHaveLength(1);
  });


  it("publishes only surviving content through the validated writer and redacts the Actions summary", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "openfeed-discussion-"));
    try {
      const summary = path.join(directory, "summary.md");
      vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
      const items = await generateEditorial("secret-key", [packets[0]], now, "published", [], {
        fetchImpl: async () => new Response(JSON.stringify({ model: "secret-key", choices: [{ message: {
          content: JSON.stringify({ posts: [{ ...post, discussion: [{ ...turn, body: "discarded text" }] }] }),
        } }] })),
      });
      const plan = buildPublishPlan({ runId: "published", now, items, accounts: editorialAccounts(now), accountsChanged: true,
        nextWorld: makeEditorialWorld(loadWorldState(), items, now, "published"),
        previousManifest: { schemaVersion: 1, generatedAt: now.toISOString(), latestRunId: "", batches: [] },
      });
      writePublishPlan(plan, { dataDir: directory, worldStatePath: path.join(directory, "world.json") });
      const batch = readFileSync(path.join(directory, "batches/published.json"), "utf8");
      expect(batch).not.toMatch(/discarded text|discussionOmission|evidenceIds/);
      expect(JSON.parse(batch).items[0].editorial.spoilers).toBe(true);
      expect(JSON.parse(batch).items[0].slug).toBeTruthy();
      const text = readFileSync(summary, "utf8");
      expect(text).toContain("discussionOmissions=1");
      expect(text).toContain("[REDACTED]");
      expect(text).not.toContain("secret-key");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("never salvages malformed JSON or dumps completions, even with the old debug flag", async () => {
    vi.stubEnv("DEBUG_RAW_CONTENT", "1");
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    await expect(generateEditorial("secret", packets, now, "broken", [], {
      sleepImpl: async () => {}, fetchImpl: async () => {
        calls++;
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"posts":["secret malformed' } }] }));
      },
    })).rejects.toThrow("all 8 attempts failed");
    expect(calls).toBe(8);
    expect(errors).not.toHaveBeenCalled();
    expect(logs.mock.calls.flat().join(" ")).not.toContain("secret malformed");
  });
});
