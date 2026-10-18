// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEditorial } from "../editorial/generate";
import { buildReviewInput, validateReview, reviewDigest, ReviewResponseSchema, type ReviewInput, type ReviewResponse } from "../editorial/review";
import { prepareEvidence } from "../editorial/evidence";
import { createEditorialAudit, EditorialReviewAuditSchema, REVIEW_FILE_NAME, type EditorialAuditChunk, type EditorialReviewRecord } from "../editorial/audit";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-10-18T00:00:00Z");
const packets: SourcePacket[] = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, publisher: `Publisher ${i}`, title: `Source ${i}`,
  url: `https://example.com/${i}`, topic: "technology", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "Children may expect dangerous people to be nasty from the start.\n\nThe charity works through professionals who know the families.",
  sections: ["Children may expect dangerous people to be nasty from the start.", "The charity works through professionals who know the families."],
}));
const prepared = prepareEvidence(packets);
const makePost = (title: string, evidenceId: string) => ({ title, format: "news", topic: null, spoilers: true,
  body: "Children can mistake the absence of immediate nastiness for safety.", evidenceIds: [evidenceId],
  discussion: [
    { voice: "Take", body: "A villain waiting to twirl a moustache is a poor warning system.", evidenceIds: [evidenceId] },
    { voice: "Pushback", body: "I would rather teach a useful boundary than audition people for the role of obvious villain.", evidenceIds: [evidenceId] },
  ],
});
const post = makePost("A misleading expectation", "S1E1");
const completion = (value: unknown) => new Response(JSON.stringify({ model: "test/resolved", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] }));
const isReview = (request: { messages: { content: string }[] }) => request.messages[0].content.startsWith("You are the publication editor");
function pass(input: ReviewInput): ReviewResponse {
  return { posts: input.posts.map(p => ({ key: p.key,
    titleAttribution: { titleText: p.units[0].text, titleActor: null, sourceActor: null, sourceEvidenceId: null, relation: "no_attributed_claim" },
    checks: p.units.map(u => ({
    target: u.target, verdict: u.target.startsWith("discussion.") ? "opinion" : "supported",
    claim: null, reason: null, explanation: "The factual premise is supported; the metaphor and preference add a perspective.", evidenceIds: u.evidenceIds.slice(0, 1),
    segments: [{ text: u.text, kind: u.target.startsWith("discussion.") ? "opinion" : "supported_fact",
      evidenceIds: u.evidenceIds.slice(0, 1), explanation: "Selected premise supports this mock judgment." }],
  })) })) };
}
function reject(input: ReviewInput, category: "reversed_fact" | "unsupported_claim" = "reversed_fact") {
  const result = pass(input);
  Object.assign(result.posts[0].checks[2], { verdict: "reject", reason: category,
    claim: input.posts[0].units[2].text.slice(0, 100),
    explanation: category === "reversed_fact" ? "The source says children expect nastiness, not friendliness." : "Professional referrals do not establish that a disconnected family has no possible route to help." });
  result.posts[0].checks[2].segments![0].kind = "unsupported_fact";
  return result;
}
const roots: string[] = [];
afterEach(() => { vi.restoreAllMocks(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("review coverage and source boundaries", () => {
  it("enforces local segment bounds in addition to provider constraints", () => {
    const input = buildReviewInput([post], prepared);
    const result = pass(input);
    result.posts[0].checks[0].segments![0].explanation = "x".repeat(241);
    expect(validateReview(result, input).ok).toBe(false);
    result.posts[0].checks[0].segments![0].explanation = "Supported premise.";
    result.posts[0].checks[0].segments = Array.from({ length: 33 }, () => result.posts[0].checks[0].segments![0]);
    expect(validateReview(result, input).ok).toBe(false);
  });
  it("requires complete unchanged claim accounting and disallows borrowing support from another unit", () => {
    const candidate = { ...post, body: "The charity works through professionals. It opened in 2017.",
      discussion: [{ ...post.discussion[0], evidenceIds: ["S1E2"] }, post.discussion[1]] };
    const input = buildReviewInput([candidate], prepareEvidence([{ ...packets[0], sections: undefined,
      excerpt: "The charity works through professionals.\n\nIt opened in 2017." }]));
    expect(input.posts[0].units[1].selectedEvidence.map(e => e.id)).toEqual(["S1E1"]);
    for (const mutate of [
      (r: ReviewResponse) => { delete r.posts[0].checks[1].segments; },
      (r: ReviewResponse) => { r.posts[0].checks[1].segments![0].text = "The charity works through professionals."; },
      (r: ReviewResponse) => { r.posts[0].checks[1].segments![0].text += " Extra claim."; },
      (r: ReviewResponse) => { r.posts[0].checks[1].segments![0].evidenceIds = ["S1E2"]; },
      (r: ReviewResponse) => { r.posts[0].checks[1].segments![0].evidenceIds = []; },
      (r: ReviewResponse) => { r.posts[0].checks[1].evidenceIds = ["S1E1", "S1E2"]; },
      (r: ReviewResponse) => { r.posts[0].checks[1].segments![0].kind = "unsupported_fact"; },
    ]) { const result = pass(input); mutate(result); expect(validateReview(result, input).ok).toBe(false); }
    const historical = pass(input); delete historical.posts[0].checks[1].segments;
    expect(ReviewResponseSchema.safeParse(historical).success).toBe(true);
  });
  it("allows separate pure banter and rejects an unsupported fact even when wider context contains it", () => {
    const candidate = { ...post, body: "The charity works through professionals. It opened in 2017.",
      discussion: [{ ...post.discussion[0], body: "Bureaucracy found its boxing gloves." }, post.discussion[1]] };
    const input = buildReviewInput([candidate], prepareEvidence([{ ...packets[0], sections: undefined,
      excerpt: "The charity works through professionals.\n\nIt opened in 2017." }]));
    const result = pass(input);
    result.posts[0].checks[2].segments![0].evidenceIds = [];
    const check = result.posts[0].checks[1];
    check.segments = [
      { text: "The charity works through professionals.", kind: "supported_fact", evidenceIds: ["S1E1"], explanation: "Mock selected support." },
      { text: "It opened in 2017.", kind: "unsupported_fact", evidenceIds: [], explanation: "The selected evidence does not supply the year." },
    ];
    Object.assign(check, { verdict: "reject", reason: "unsupported_claim", claim: "It opened in 2017." });
    expect(validateReview(result, input).ok).toBe(true);
    check.segments.reverse();
    expect(validateReview(result, input).ok).toBe(false);
  });
  it("requires a literal title attribution trace while retaining historical audit compatibility", () => {
    const input = buildReviewInput([post], prepared);
    const result = pass(input);
    delete result.posts[0].titleAttribution;
    expect(validateReview(result, input).ok).toBe(false);
    expect(ReviewResponseSchema.safeParse(result).success).toBe(true);
  });
  it("rejects a repaired-title explanation and prevents an attribution mismatch from passing", () => {
    const source = { ...packets[0], sections: undefined, excerpt: "The jury praised the family's quiet resilience in the documentary." };
    const candidate = { ...post, title: "The Documentary That Praises Quiet Resilience" };
    const input = buildReviewInput([candidate], prepareEvidence([source]));
    const result = pass(input);
    result.posts[0].titleAttribution = { titleText: candidate.title, titleActor: "Documentary", sourceActor: "jury", sourceEvidenceId: "S1E1", relation: "mismatch" };
    expect(validateReview(result, input).ok).toBe(false);
    Object.assign(result.posts[0].checks[0], { verdict: "reject", reason: "misattribution", claim: "Documentary That Praises", explanation: "The jury praises the family; the title attributes that evaluation to the documentary." });
    result.posts[0].checks[0].segments![0].kind = "unsupported_fact";
    expect(validateReview(result, input).ok).toBe(true);
    result.posts[0].titleAttribution.titleActor = "jury";
    expect(validateReview(result, input).ok).toBe(false);
    result.posts[0].titleAttribution.titleActor = "Documentary";
    result.posts[0].titleAttribution.sourceActor = "director";
    expect(validateReview(result, input).ok).toBe(false);
    result.posts[0].titleAttribution.sourceActor = "jury";
    result.posts[0].titleAttribution.titleText = "A Jury Praises Quiet Resilience";
    expect(validateReview(result, input).ok).toBe(false);
  });
  it("allows an editorial title interpretation with a selected premise instead of forcing source speech", () => {
    const input = buildReviewInput([{ ...post, title: "Quiet resilience deserves a louder conversation" }],
      prepareEvidence([{ ...packets[0], sections: undefined, excerpt: "The jury praised the family's quiet resilience in the documentary." }]));
    const result = pass(input);
    result.posts[0].titleAttribution = { titleText: input.posts[0].units[0].text, titleActor: null, sourceActor: null, sourceEvidenceId: "S1E1", relation: "interpretation" };
    result.posts[0].checks[0].verdict = "opinion";
    expect(validateReview(result, input).ok).toBe(true);
    result.posts[0].titleAttribution.sourceEvidenceId = "S2E1";
    expect(validateReview(result, input).ok).toBe(false);
  });
  it("offers complete context only from the post's attached sources", () => {
    const input = buildReviewInput([post], prepared);
    expect(input.posts[0].sources).toHaveLength(1);
    expect(input.posts[0].sources[0].readingContext?.map(s => s.text)).toEqual(packets[0].sections);
    expect(validateReview(pass(input), input).ok).toBe(true);
  });
  it("fails closed on missing/duplicate targets, unknown posts, cross-source IDs and unsupported pass claims", () => {
    const input = buildReviewInput([post], prepared);
    for (const mutate of [
      (r: ReviewResponse) => { r.posts[0].checks.pop(); },
      (r: ReviewResponse) => { r.posts[0].checks[1] = r.posts[0].checks[0]; },
      (r: ReviewResponse) => { r.posts[0].key = "P99"; },
      (r: ReviewResponse) => { r.posts[0].checks[0].evidenceIds = ["S2E1"]; },
      (r: ReviewResponse) => { r.posts[0].checks[0].evidenceIds = []; },
      (r: ReviewResponse) => { r.posts[0].checks[0].reason = "reversed_fact"; },
    ]) {
      const result = pass(input); mutate(result);
      expect(validateReview(result, input).ok).toBe(false);
    }
    const result = reject(input); result.posts[0].checks[2].claim = "Invented claim not present in the post";
    expect(validateReview(result, input).ok).toBe(false);
  });
});

describe("mandatory editorial gate", () => {
  it("reviews two-post requests and reaches eight only within the shared eight calls", async () => {
    let calls = 0;
    const items = await generateEditorial("secret", packets, now, "small-chunks", [], {
      fetchImpl: async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body));
        const input = JSON.parse(request.messages[1].content);
        if (isReview(request)) { expect(input.posts).toHaveLength(2); return completion(pass(input)); }
        expect(input.maxPosts).toBe(2);
        return completion({ posts: input.sources.slice(0, input.maxPosts).map((s: { title: string; evidence: { id: string }[] }) => makePost(s.title, s.evidence[0].id)) });
      },
    });
    expect(calls).toBe(8); expect(items).toHaveLength(8);
  });
  // These fixtures simulate reviewer judgments; they do not claim an offline test
  // can determine whether a live model recognizes semantic mistakes.
  it.each(["reversed_fact", "unsupported_claim"] as const)("withholds the whole %s post and preserves the neighboring joke unchanged", async category => {
    const first = { ...post, discussion: [ { ...post.discussion[0], body: category === "reversed_fact"
      ? "Children expect friendliness at the start rather than nastiness."
      : "A household out of contact with professionals has no route in at all." }, post.discussion[1]] };
    const second = makePost("A worthwhile neighbor", "S2E1");
    const audits: EditorialAuditChunk[] = [], reviews: EditorialReviewRecord[] = [];
    let calls = 0;
    const items = await generateEditorial("secret", packets.slice(0, 2), now, "test", [], {
      onAcceptedChunk: c => audits.push(c), onReviewedChunk: r => reviews.push(r),
      fetchImpl: async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body));
        return completion(isReview(request) ? reject(JSON.parse(request.messages[1].content), category) : { posts: [first, second] });
      },
    });
    expect(calls).toBe(2);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: second.title, editorial: { spoilers: true,
      discussion: second.discussion.map(({ voice, body }) => ({ voice, body })) } });
    expect(audits[0].posts[0].postId).toBe(items[0].id);
    expect(audits[0].review?.candidateDigests).toEqual([reviewDigest(second)]);
    expect(reviews[0].decisions.posts[0].checks[2].reason).toBe(category);
    expect(audits[0].sources.map(s => s.id)).toEqual([packets[1].id]);
  });
  it("persists all-rejected decisions outside public data and returns an empty publication", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "openfeed-review-")); roots.push(root);
    const audit = createEditorialAudit({ root, directory: "artifacts", runId: "review", now });
    const items = await generateEditorial("secret", packets.slice(0, 1), now, "review", [], {
      onReviewedChunk: audit.onReviewedChunk,
      onAcceptedChunk: () => { throw new Error("Rejected content reached accepted audit"); },
      fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        if (!isReview(request)) return completion({ posts: [post] });
        const decision = reject(JSON.parse(request.messages[1].content));
        decision.posts[0].checks[2].explanation += " secret Bearer hidden-token sk-or-hidden-token";
        return completion(decision);
      },
    });
    expect(items).toEqual([]);
    const saved = EditorialReviewAuditSchema.parse(JSON.parse(readFileSync(path.join(root, "artifacts", REVIEW_FILE_NAME), "utf8")));
    expect(saved.reviews).toHaveLength(1);
    expect(JSON.stringify(saved)).not.toMatch(/readingContext|apiKey|messages|completion|secret|hidden-token/);
    expect(JSON.stringify(saved)).toContain("[REDACTED]");
  });
  it.each(["malformed", "provider"])("never releases an unreviewed candidate after %s review failure", async failure => {
    let calls = 0;
    await expect(generateEditorial("secret", packets.slice(0, 1), now, "failure", [], {
      sleepImpl: async () => {},
      fetchImpl: async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body));
        if (!isReview(request)) return completion({ posts: [post] });
        return failure === "provider" ? new Response("unavailable", { status: 503 }) : completion({ posts: [] });
      },
    })).rejects.toThrow("all 2 attempts failed");
    expect(calls).toBe(3);
  });
  it("applies identical review validation after structured output fallback", async () => {
    let reviewCalls = 0;
    const items = await generateEditorial("secret", packets.slice(0, 1), now, "fallback", [], {
      sleepImpl: async () => {}, fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        if (!isReview(request)) return completion({ posts: [post] });
        if (++reviewCalls === 1) return new Response("response_format not supported", { status: 400 });
        expect(request.response_format).toBeUndefined();
        const input = JSON.parse(request.messages[1].content.split("\n\nRespond with raw JSON")[0]);
        return completion(pass(input));
      },
    });
    expect(reviewCalls).toBe(2); expect(items).toHaveLength(1);
  });
  it("reserves the last of eight total provider attempts for review", async () => {
    let calls = 0;
    const items = await generateEditorial("secret", packets.slice(0, 1), now, "budget", [], {
      sleepImpl: async () => {}, fetchImpl: async (_url, init) => {
        calls++;
        if (calls <= 6) return new Response("unavailable", { status: 503 });
        const request = JSON.parse(String(init?.body));
        return completion(isReview(request) ? pass(JSON.parse(request.messages[1].content)) : { posts: [post] });
      },
    });
    expect(calls).toBe(8); expect(items).toHaveLength(1);
  });
  it("does not publish a candidate when generation uses the remaining deadline", async () => {
    let elapsed = 0, calls = 0;
    await expect(generateEditorial("secret", packets.slice(0, 1), now, "deadline", [], {
      nowImpl: () => elapsed, fetchImpl: async () => { calls++; elapsed = 45 * 60_000 - 30_000; return completion({ posts: [post] }); },
    })).rejects.toThrow("edition time budget exhausted");
    expect(calls).toBe(1);
  });
  it("retains only reviewed earlier chunks if a later review fails", async () => {
    let calls = 0;
    const items = await generateEditorial("secret", packets, now, "partial", [], {
      sleepImpl: async () => {}, fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init?.body)); calls++;
        if (calls >= 4) return new Response("unavailable", { status: 503 });
        const input = JSON.parse(request.messages[1].content);
        if (isReview(request)) return completion(pass(input));
        return completion({ posts: input.sources.slice(0, input.maxPosts).map((s: { title: string; evidence: { id: string }[] }) => makePost(s.title, s.evidence[0].id)) });
      },
    });
    expect(items).toHaveLength(2); expect(calls).toBe(5);
  });
  it("stops before publication when the review audit cannot be persisted", async () => {
    await expect(generateEditorial("secret", packets.slice(0, 1), now, "audit-failure", [], {
      onReviewedChunk: () => { throw new Error("review audit persistence failed"); },
      onAcceptedChunk: () => { throw new Error("must not reach accepted audit"); },
      fetchImpl: async (_url, init) => { const request = JSON.parse(String(init?.body));
        return completion(isReview(request) ? pass(JSON.parse(request.messages[1].content)) : { posts: [post] }); },
    })).rejects.toThrow("review audit persistence failed");
  });
});
