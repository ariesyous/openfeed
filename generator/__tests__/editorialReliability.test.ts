// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareEvidence } from "../editorial/evidence";
import { prepareWriterEvidence, resolveWriterSelection, writerResponseSchema } from "../editorial/selection";
import { buildReviewInput, reviewTransportSchema, validateReviewTransport, type ReviewInput } from "../editorial/review";
import { generateEditorial, validateCitedDraft } from "../editorial/generate";
import { createEditorialAudit, EditorialReviewAuditSchema, REVIEW_FILE_NAME, MAX_AUDIT_BYTES } from "../editorial/audit";
import type { SourcePacket } from "../editorial/sources";
import { rangeReviewFixture } from "./helpers/transport";

const now = new Date("2026-10-19T00:00:00Z");
const source: SourcePacket = { id: "one", title: "A cautious trial", topic: "technology", publisher: "Publisher",
  url: "https://example.com/one", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "The operator tested moving terminals during a limited trial in the northern region." };
const candidate = (title = source.title, id = "S1G1") => ({ title, format: "news", topic: null, spoilers: true,
  body: "The operator tested moving terminals during a limited trial in the northern region.", evidenceGroupIds: [id],
  discussion: [
    { voice: "Take", body: "I like a trial that puts the inconvenience on the table before asking for applause.", evidenceGroupIds: [id] },
    { voice: "Pushback", body: "I would save the applause for a convincing tradeoff. Testing is the opening argument, not the verdict.", evidenceGroupIds: [id] },
  ],
});
const prepared = prepareEvidence([source]);
const selected = { ...candidate(), evidenceIds: ["S1E1"], discussion: candidate().discussion.map(turn => ({ ...turn, evidenceIds: ["S1E1"] })) };
const completion = (value: unknown) => new Response(JSON.stringify({ model: "test/resolved", choices: [{ finish_reason: "stop", message: { content: JSON.stringify((value as ReturnType<typeof approve>)?.posts?.[0]?.checks ? rangeReviewFixture(value as ReturnType<typeof approve>) : value) } }] }));
// Mock judgments verify transport/accounting, never semantic accuracy of a live model.
function approve(input: ReviewInput) {
  return { posts: input.posts.map(post => ({ key: post.key,
    titleAttribution: { titleActor: null, sourceActor: null, sourceEvidenceId: null, relation: "no_attributed_claim" },
    checks: post.units.map(unit => ({ target: unit.target, verdict: "supported", reason: null, claim: null,
      explanation: "Mock approval of the selected premise.", evidenceIds: unit.evidenceIds,
      segments: [{ firstWord: 0, lastWord: unit.words.length - 1, kind: unit.target.startsWith("discussion.") ? "opinion" : "supported_fact",
        evidenceIds: unit.evidenceIds, explanation: "Mock unit assessment." }],
    })),
  })) };
}
afterEach(() => vi.restoreAllMocks());

describe("atomic writer selections", () => {
  const long = "Of 422 pre-teens surveyed between the ages of 11 and 13, 68 per cent said their faith, religion or spiritual journey is an important part of who they are.";
  it("offers the complete observed survey sentence as one choice, then checks each original quote", () => {
    const packet = { ...source, excerpt: long };
    const prepared = prepareEvidence([packet]), writer = prepareWriterEvidence(prepared);
    expect(writer.sources[0].evidence).toEqual([{ id: "S1G1", text: long, snippetCount: 2, section: undefined, paragraph: 1 }]);
    expect(JSON.stringify(writerResponseSchema(writer.groups, 2))).not.toContain("S1E1");
    const result = resolveWriterSelection({ posts: [candidate()] }, writer.groups, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error("Expected an atomic group selection");
    expect(result.value.posts[0].evidenceIds).toEqual(["S1E1", "S1E2"]);
    expect(result.value.posts[0].discussion[0].evidenceIds).toEqual(["S1E1", "S1E2"]);
    expect(validateCitedDraft(result.value, prepared.evidenceById, [packet], now, true).ok).toBe(true);
    prepared.evidenceById.get("S1E2")!.quote = "A fabricated continuation cannot pass provenance.";
    expect(validateCitedDraft(result.value, prepared.evidenceById, [packet], now, true).ok).toBe(false);
  });
  it("rejects half-sentence IDs, unknown/duplicate groups, excessive expanded cost and extra legacy fields", () => {
    const writer = prepareWriterEvidence(prepareEvidence([{ ...source, excerpt: Array(4).fill(long).join("\n\n") }]));
    for (const evidenceGroupIds of [["S1E1"], ["unknown"], ["S1G1", "S1G1"], ["S1G1", "S1G2", "S1G3", "S1G4"]]) {
      expect(resolveWriterSelection({ posts: [{ ...candidate(), evidenceGroupIds }] }, writer.groups, 2).ok).toBe(false);
    }
    const overTurn = candidate(); overTurn.discussion[0].evidenceGroupIds = ["S1G1", "S1G2"];
    expect(resolveWriterSelection({ posts: [overTurn] }, writer.groups, 2).ok).toBe(false);
    expect(resolveWriterSelection({ posts: [{ ...candidate(), evidenceIds: ["S1E1"] }] }, writer.groups, 2).ok).toBe(false);
  });
  it("narrows sectioned choice packets while retaining full contexts and prioritizing a revision", () => {
    const packets = Array.from({ length: 12 }, (_, i) => ({ ...source, id: `context${i}`, title: `Context ${i}`,
      sections: [source.excerpt], excerpt: source.excerpt }));
    const small = prepareEvidence(packets, { sourceLimit: 4, priorityIds: new Set(["context11"]) });
    expect(small.sources).toHaveLength(4); expect(small.sources[0].title).toBe("Context 11");
    for (const offered of small.sources) {
      expect(offered.readingContext).toEqual([{ section: 1, text: source.excerpt }]);
      expect(offered.evidence[0].text).toBe(source.excerpt);
    }
    expect(prepareEvidence(packets, { sourceLimit: 100 }).sources).toHaveLength(8);
  });
});

describe("review without prose copying", () => {
  const input = buildReviewInput([{ ...selected, body: "The operator tested terminals.\n\nIt called the trial ‘limited’." }], prepared);
  it("materializes exact original words, punctuation and whitespace into the existing audit contract", () => {
    const reply = approve(input), check = reply.posts[0].checks[1];
    check.segments = [ { ...check.segments[0], firstWord: 0, lastWord: 3 }, { ...check.segments[0], firstWord: 4, lastWord: input.posts[0].units[1].words.length - 1 } ];
    const result = validateReviewTransport(rangeReviewFixture(reply), input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.posts[0].checks[1].segments?.map(segment => segment.text)).toEqual(["The operator tested terminals.", "It called the trial ‘limited’."]);
      expect(result.value.posts[0].titleAttribution?.titleText).toBe(selected.title);
    }
  });
  it("rejects gaps, overlaps, reversals, out-of-range words, omitted units and model-supplied rewrites", () => {
    for (const change of [
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].firstWord = 1; },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].lastWord--; },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments.push(r.posts[0].checks[1].segments[0]); },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].lastWord = 999; },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].lastWord = 0; r.posts[0].checks[1].segments[0].firstWord = 1; },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks.pop(); },
      (r: ReturnType<typeof approve>) => { Object.assign(r.posts[0].checks[1].segments[0], { text: "A rewritten sentence" }); },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].evidenceIds = ["S2E1"]; },
      (r: ReturnType<typeof approve>) => { r.posts[0].checks[1].segments[0].kind = "unsupported_fact"; },
    ]) { const reply = approve(input); change(reply); expect(validateReviewTransport(rangeReviewFixture(reply), input).ok).toBe(false); }
  });
  it("binds each required unit to its own evidence in both schema and fallback validation", () => {
    const mixed = buildReviewInput([{ ...selected, evidenceIds: ["S1E1", "S1E2"],
      discussion: selected.discussion.map(turn => ({ ...turn, evidenceIds: ["S1E1"] })) }],
    prepareEvidence([{ ...source, excerpt: source.excerpt + "\n\nThe second trial began in 2017." }]));
    const schema = reviewTransportSchema(mixed);
    const good = rangeReviewFixture(approve(mixed));
    expect(schema.safeParse(good).success).toBe(true);
    for (const mutate of [
      (r: typeof good) => { Object.assign(r.posts.P1.checks["discussion.0"], { evidenceIds: [] }); },
      (r: typeof good) => { Object.assign(r.posts.P1.checks["discussion.0"], { evidenceIds: ["S1E2"] }); },
      (r: typeof good) => { delete r.posts.P1.checks.body; },
      (r: typeof good) => { r.posts.P99 = r.posts.P1; },
    ]) { const bad = structuredClone(good); mutate(bad); expect(schema.safeParse(bad).success).toBe(false); expect(validateReviewTransport(bad, mixed).ok).toBe(false); }
    const borrowed = rangeReviewFixture(approve(mixed));
    Object.assign(borrowed.posts.P1.checks["discussion.0"], { segments: [{ firstWord: 0, lastWord: mixed.posts[0].units[2].words.length - 1,
      kind: "supported_fact", evidenceIds: ["S1E2"], explanation: "Borrowed support." }] });
    expect(schema.safeParse(borrowed).success).toBe(false);
  });
});

describe("larger bounded editions", () => {
  it("publishes twenty reviewed posts through ten persisted audit chunks, with room for retries", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const root = mkdtempSync(path.join(tmpdir(), "cobanter-volume-"));
    try {
      const audit = createEditorialAudit({ root, directory: "audit", runId: "volume", now });
      const packets = Array.from({ length: 24 }, (_, i) => ({ ...source, sections: [source.excerpt], id: `source${i}`, url: `https://example.com/${i}`, title: `Source ${i}`, publisher: `Publisher ${i}` }));
      let calls = 0;
      const items = await generateEditorial("secret", packets, now, "volume", [], {
        onAcceptedChunk: audit.onAcceptedChunk, onReviewedChunk: audit.onReviewedChunk, sleepImpl: async () => {},
        fetchImpl: async (_url, init) => {
          calls++;
          if (calls === 1) return new Response("unavailable", { status: 503 });
          const request = JSON.parse(String(init?.body)), input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
          if (request.messages[0].content.startsWith("You are the publication editor")) return completion(approve(input));
          expect(input.sources.length).toBeLessThanOrEqual(4);
          expect(input.sources[0].readingContext).toEqual([{ section: 1, text: source.excerpt }]);
          return completion({ posts: input.sources.slice(0, input.maxPosts).map((s: { title: string; evidence: { id: string }[] }) => candidate(s.title, s.evidence[0].id)) });
        },
      });
      expect(items).toHaveLength(20); expect(calls).toBe(21);
      expect(new Set(items.flatMap(item => item.editorial!.sources.map(source => source.url))).size).toBe(20);
      expect(items.every(item => item.editorial!.discussion!.length === 2 && item.editorial!.spoilers)).toBe(true);
      audit.writeCandidate(items.map(item => item.id));
      const saved = readFileSync(path.join(root, "audit", REVIEW_FILE_NAME), "utf8");
      expect(Buffer.byteLength(saved)).toBeLessThan(MAX_AUDIT_BYTES);
      expect(EditorialReviewAuditSchema.parse(JSON.parse(saved)).reviews).toHaveLength(10);
      expect(saved).not.toMatch(/readingContext|firstWord|lastWord|messages/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it("gives a rejected candidate one deliberate revision and requires another complete review", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    let calls = 0;
    const items = await generateEditorial("secret", [source], now, "revision", [], {
      fetchImpl: async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body)), input = JSON.parse(request.messages[1].content);
        if (calls === 1) return completion({ posts: [{ ...candidate(), body: candidate().body + " It opened in 2017." }] });
        if (calls === 3) { expect(input.revisionFeedback[0].defects[0].reason).toBe("unsupported_claim"); return completion({ posts: [candidate()] }); }
        const review = approve(input);
        if (calls === 2) Object.assign(review.posts[0].checks[1], { verdict: "reject", reason: "unsupported_claim", claim: { firstWord: 0, lastWord: 0 },
          segments: [{ ...review.posts[0].checks[1].segments[0], kind: "unsupported_fact" }] });
        return completion(review);
      },
    });
    expect(calls).toBe(4); expect(items).toHaveLength(1); expect(items[0].body).toBe(candidate().body);
  });
  it("fills a single revision's second slot with a new source and freshly reviews both", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const packets = Array.from({ length: 3 }, (_, i) => ({ ...source, id: `fill${i}`, title: `Fill ${i}`, publisher: `Publisher ${i}`, url: `https://example.com/fill${i}` }));
    let calls = 0;
    const items = await generateEditorial("secret", packets, now, "fill", [], {
      fetchImpl: async (_url, init) => {
        calls++; const request = JSON.parse(String(init?.body)), input = JSON.parse(request.messages[1].content);
        if (calls % 2) {
          if (calls === 3) {
            expect(input.revisionFeedback).toHaveLength(1);
            expect(input.sources.map((s: { title: string }) => s.title)).toEqual(["Fill 0", "Fill 2"]);
          }
          return completion({ posts: input.sources.slice(0, 2).map((s: { title: string; evidence: { id: string }[] }) => candidate(s.title, s.evidence[0].id)) });
        }
        const review = approve(input);
        if (calls === 2) Object.assign(review.posts[0].checks[1], { verdict: "reject", reason: "unsupported_claim", claim: { firstWord: 0, lastWord: 0 },
          segments: [{ ...review.posts[0].checks[1].segments[0], kind: "unsupported_fact" }] });
        return completion(review);
      },
    });
    expect(calls).toBe(4); expect(items).toHaveLength(3);
  });
  it("tries different sources after malformed review retries even when nothing has passed yet", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const packets = Array.from({ length: 4 }, (_, i) => ({ ...source, id: `p${i}`, title: `Candidate ${i}`, url: `https://example.com/${i}`, publisher: `Publisher ${i}` }));
    let calls = 0;
    const items = await generateEditorial("secret", packets, now, "recover", [], {
      sleepImpl: async () => {}, fetchImpl: async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body)), input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
        if (request.messages[0].content.startsWith("You are the publication editor")) {
          const reply = approve(input);
          if (calls < 4) reply.posts[0].checks[0].segments[0].firstWord = 1;
          return completion(reply);
        }
        return completion({ posts: input.sources.slice(0, input.maxPosts).map((s: { title: string; evidence: { id: string }[] }) => candidate(s.title, s.evidence[0].id)) });
      },
    });
    expect(calls).toBe(5); expect(items.map(item => item.title)).toEqual(["Candidate 2", "Candidate 3"]);
  });
  it("keeps quota/authentication failures fatal instead of spending the larger retry budget", async () => {
    let calls = 0;
    await expect(generateEditorial("secret", [source], now, "quota", [], { fetchImpl: async () => { calls++; return new Response("quota exhausted", { status: 403 }); } })).rejects.toMatchObject({ fatal: true });
    expect(calls).toBe(1);
  });
});
