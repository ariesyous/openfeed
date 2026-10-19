// @vitest-environment node
import { describe, expect, it } from "vitest";
import { prepareEvidence } from "../editorial/evidence";
import { prepareWriterEvidence, remapPreviousSupport, resolveWriterSelection, writerResponseSchema } from "../editorial/selection";
import { validateCitedDraft } from "../editorial/generate";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-10-19T00:00:00Z");
const packet: SourcePacket = { id: "ballot", title: "A ballot and its researcher", publisher: "Test publisher", topic: "canada",
  url: "https://example.com/ballot", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "Researcher Jared Wesley studied the ballot.\n\nThe ballot contains ten questions.\n\nWesley said the wording could confuse voters." };
const p = (text: string, ...evidenceGroupIds: string[]) => ({ evidenceGroupIds, text });
const candidate = () => ({ format: "news", topic: null, spoilers: null,
  title: p("Ten ballot questions and a warning about wording", "S1G2", "S1G3"),
  body: [[p("Researcher Jared Wesley studied the ballot.", "S1G1"), p("It contains ten questions.", "S1G2")],
    [p("Wesley says the wording could confuse voters.", "S1G3")]],
  discussion: [
    { voice: "Take", body: [[p("Ten questions: I would want clarity before stamina becomes the qualification for voting.", "S1G2")]] },
    { voice: "Reply", body: [[p("I would start with the wording. A question should invite a decision rather than a decoding contest.", "S1G3")]] },
  ],
});
const prepared = prepareEvidence([packet]), writer = prepareWriterEvidence(prepared);

describe("passage support before prose", () => {
  it("unions only explicit choices across title and body, preserving prose and paragraph layout", () => {
    const result = resolveWriterSelection({ posts: [candidate()] }, writer.groups, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.issues.join(" "));
    const post = result.value.posts[0];
    expect(post.title).toBe("Ten ballot questions and a warning about wording");
    expect(post.body).toBe("Researcher Jared Wesley studied the ballot. It contains ten questions.\n\nWesley says the wording could confuse voters.");
    expect(post.evidenceIds).toEqual(["S1E2", "S1E3", "S1E1"]);
    expect(post.discussion.map(turn => turn.evidenceIds)).toEqual([["S1E2"], ["S1E3"]]);
    expect(validateCitedDraft(result.value, prepared.evidenceById, [packet], now, true).ok).toBe(true);
    expect(JSON.stringify(post)).not.toMatch(/evidenceGroupIds|"text"/);
  });
  it("requires explicit known choices in every passage, in structured output and JSON fallback", () => {
    for (const ids of [[], ["S1G99"], ["S1E1"], ["S1G1", "S1G1"]]) {
      const draft = candidate(); draft.body[0][0].evidenceGroupIds = ids;
      expect(resolveWriterSelection({ posts: [draft] }, writer.groups, 2).ok).toBe(false);
    }
    const draft = candidate();
    Object.assign(draft.body[0][0], { evidenceIds: ["S1E1"] });
    expect(writerResponseSchema(writer.groups, 2).safeParse({ posts: [draft] }).success).toBe(false);
    expect(resolveWriterSelection({ posts: [draft] }, writer.groups, 2).ok).toBe(false);
  });
  it("keeps the whole-unit caps when individually valid passages select different groups", () => {
    const rich = prepareEvidence([{ ...packet, excerpt: Array.from({ length: 8 }, (_, i) =>
      `The ballot study recorded result number ${i} for its research team.`).join("\n\n") }]);
    const groups = prepareWriterEvidence(rich).groups;
    const draft = candidate();
    draft.title.evidenceGroupIds = ["S1G1"];
    draft.body = [[p("First supported thought.", "S1G2", "S1G3", "S1G4"),
      p("Another supported thought.", "S1G5", "S1G6", "S1G7")]];
    const body = resolveWriterSelection({ posts: [draft] }, groups, 2);
    expect(body.ok).toBe(false);
    if (!body.ok) expect(body.issues.join(" ")).toMatch(/title\/body.*6-snippet.*WHOLE unit/);
    draft.body = [[p("A shorter thought with support.", "S1G1")]];
    draft.discussion[0].body = [[p("First point.", "S1G1", "S1G2"), p("Second point.", "S1G3", "S1G4")]];
    const turn = resolveWriterSelection({ posts: [draft] }, groups, 2);
    expect(turn.ok).toBe(false);
    if (!turn.ok) expect(turn.issues.join(" ")).toMatch(/discussion.0.*3-snippet.*WHOLE unit/);
  });
  it("does not fill missing support from prose, another turn or the source context", () => {
    const draft = candidate();
    // This deliberately wrong name/count selection is still a semantic task for
    // mandatory review. The compiler must NOT infer/add the missing S1G1/S1G2.
    draft.title = p("A question about clarity", "S1G3");
    draft.body = [[p("Researcher Jared Wesley studied ten ballot questions.", "S1G3")]];
    const result = resolveWriterSelection({ posts: [draft] }, writer.groups, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.posts[0].evidenceIds).toEqual(["S1E3"]);
  });
});

describe("revision support diagnostics", () => {
  it("remaps complete support by source and exact quote after request-local IDs move", () => {
    const other = { ...packet, id: "other", title: "Another source", publisher: "Other", url: "https://example.com/other" };
    const old = prepareEvidence([other, packet]);
    const evidence = [old.evidenceById.get("S2E1")!, old.evidenceById.get("S2E2")!];
    const mapped = remapPreviousSupport([{ target: "title/body", evidence }], prepared, writer.groups);
    expect(mapped).toEqual([{ target: "title/body", evidenceGroupIds: ["S1G1", "S1G2"], unavailableSnippetCount: 0 }]);
    const wrongSource = prepareEvidence([other]);
    expect(remapPreviousSupport([{ target: "body", evidence }], wrongSource, prepareWriterEvidence(wrongSource).groups))
      .toEqual([{ target: "body", evidenceGroupIds: [], unavailableSnippetCount: 2 }]);
  });
  it("does not suggest a group for half a sentence or a changed quote", () => {
    const long = { ...packet, excerpt: "Of 422 pre-teens surveyed between the ages of 11 and 13, 68 per cent said their faith, religion or spiritual journey is an important part of who they are." };
    const prepared = prepareEvidence([long]), groups = prepareWriterEvidence(prepared).groups;
    expect([...prepared.evidenceById]).toHaveLength(2);
    for (const evidence of [[prepared.evidenceById.get("S1E1")!],
      [...prepared.evidenceById.values()].map(entry => ({ ...entry, quote: entry.quote + " changed" }))]) {
      expect(remapPreviousSupport([{ target: "discussion.0", evidence }], prepared, groups)[0].evidenceGroupIds).toEqual([]);
    }
  });
});
