// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareEvidence } from "../editorial/evidence";
import { discussionRepetitionIssues } from "../editorial/discussion";
import { editorialJsonSchema, generateEditorial, validateCitedDraft } from "../editorial/generate";
import { buildAuditChunk, EditorialAuditSchema } from "../editorial/audit";
import type { SourcePacket } from "../editorial/sources";

vi.mock("../editorial/review", async importOriginal => ({
  ...await importOriginal<typeof import("../editorial/review")>(),
  reviewEditorial: (await import("./helpers/review")).approveReview,
}));

const now = new Date("2026-10-18T00:00:00Z");
const packet: SourcePacket = { id: "report", title: "A limited service trial", publisher: "Publisher", topic: "technology",
  url: "https://example.com/report", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  excerpt: "The trial operator reported a restriction on moving terminals during a limited test in the northern region." };
const discussion = [
  { voice: "Take", body: "A trial can reveal the shape of a tradeoff without settling whether the compromise is worth making.", evidenceIds: ["S1E1"] },
  { voice: "Pushback", body: "That is a generous reading. I would want the inconvenience explained before applauding the compromise.", evidenceIds: ["S1E1"] },
];
const post = { format: "news", title: "A limited trial", body: packet.excerpt, topic: null, spoilers: null, evidenceIds: ["S1E1"], discussion };
const completion = (value: unknown) => new Response(JSON.stringify({ model: "test/model", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }] }));
afterEach(() => vi.restoreAllMocks());

describe("qualifications alongside selectable evidence", () => {
  it("rejects incomplete split sentences per new unit without repairing selections or changing historical validation", () => {
    const source = { ...packet, excerpt: "Of 422 pre-teens surveyed between the ages of 11 and 13, 68 per cent said their faith, religion or spiritual journey is an important part of who they are." };
    const prepared = prepareEvidence([source]);
    const ids = [...prepared.evidenceById.keys()];
    expect(ids).toHaveLength(2);
    const candidate = { ...post, evidenceIds: ids,
      discussion: discussion.map(turn => ({ ...turn, evidenceIds: ids })) };
    expect(validateCitedDraft({ posts: [candidate] }, prepared.evidenceById, [source], now, true).ok).toBe(true);
    const incomplete = { ...candidate, discussion: [{ ...candidate.discussion[0], evidenceIds: [ids[0]] }, candidate.discussion[1]] };
    const result = validateCitedDraft({ posts: [incomplete] }, prepared.evidenceById, [source], now, true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toContain("complete sentence group");
    expect(incomplete.discussion[0].evidenceIds).toEqual([ids[0]]);
    expect(validateCitedDraft({ posts: [incomplete] }, prepared.evidenceById, [source], now).ok).toBe(true);
    expect(validateCitedDraft({ posts: [{ ...candidate, evidenceIds: [ids[0]] }] }, prepared.evidenceById, [source], now, true).ok).toBe(false);
  });
  it("keeps a later scope qualification beside the mechanism even beyond the snippet cap", () => {
    // Synthetic counterpart of the observed multi-section report: the previous
    // interleaving could expose a threshold but omit the following scope paragraph.
    const lead = Array.from({ length: 8 }, (_, i) => `Officials described development number ${i} and said the teams would continue to meet local representatives while considering the next steps in the talks before deciding what to do.`).join("\n\n");
    const qualification = "The restriction applied only in the northern region. Responsibility for the change remained disputed.";
    const mechanism = [packet.excerpt, "A connection stopped when a terminal exceeded the trial's stated movement threshold.", qualification].join("\n\n");
    const sections = Array.from({ length: 8 }, (_, i) => i === 4 ? mechanism : lead);
    const rich = { ...packet, sections, excerpt: sections.join("\n\n") };
    // Stay within the real extraction cap while retaining many competing groups.
    rich.sections = rich.sections.map((text, i) => i === 4 ? text : text.split("\n\n").slice(0, 4).join("\n\n"));
    rich.excerpt = rich.sections.join("\n\n");
    const offered = prepareEvidence([rich]).sources[0];
    expect(offered.evidence.length).toBeLessThanOrEqual(24);
    expect(offered.evidence.some(e => e.text.includes("movement threshold"))).toBe(true);
    expect(offered.evidence.some(e => e.text.includes("only in the northern region"))).toBe(false);
    expect(offered.readingContext?.[4]).toEqual({ section: 5, text: mechanism });
    expect(offered.readingContext?.[4].text).toContain(qualification);
    expect(offered.readingContext?.map(s => s.text)).toEqual(rich.sections);
  });

  it("keeps programme replacement and attributed beliefs intact without inventing evidence IDs", () => {
    const sections = ["The deputy believed that household savings had not been measured.\n\nThe trial was ended, but fruit was added to the existing meals programme.",
      "The evaluation found little change in consumption. No estimate of household savings was reported in the evaluation."];
    const rich = { ...packet, sections, excerpt: sections.join("\n\n") };
    const prepared = prepareEvidence([rich]);
    expect(prepared.sources[0].readingContext).toEqual(sections.map((text, i) => ({ section: i + 1, text })));
    expect(validateCitedDraft({ posts: [{ ...post, evidenceIds: ["section-1"] }] }, prepared.evidenceById, [rich], now, true).ok).toBe(false);
    expect(prepareEvidence([{ ...rich, sections: ["foreign text that is not in this source"] }]).sources[0].readingContext).toBeUndefined();
    const oversized = "A complete source sentence with a clear subject and qualification. ".repeat(100);
    expect(prepareEvidence([{ ...packet, sections: [oversized], excerpt: oversized }]).sources[0].readingContext).toBeUndefined();
    expect(prepareEvidence([packet]).sources[0].readingContext).toBeUndefined();
  });

  it("sends coherent reading context through the actual generation request without publishing it", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const sections = [packet.excerpt, "The restriction did not apply outside the trial region. Responsibility remained disputed."];
    const rich = { ...packet, sections, excerpt: sections.join("\n\n") };
    const items = await generateEditorial("secret", [rich], now, "context", [], {
      fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        const input = JSON.parse(request.messages.find((m: { role: string }) => m.role === "user").content);
        expect(input.sources[0].readingContext[1].text).toBe(sections[1]);
        return completion({ posts: [post] });
      },
    });
    expect(items).toHaveLength(1);
    expect(JSON.stringify(items)).not.toContain("readingContext");
    expect(JSON.stringify(items)).not.toContain(sections[1]);
  });

  it("allows six body citations for identity, mechanism and qualifications, while turns remain capped at three", () => {
    const excerpt = Array.from({ length: 7 }, (_, i) => `Qualification number ${i} limits the interpretation of the reported service trial.`).join("\n\n");
    const source = { ...packet, excerpt };
    const prepared = prepareEvidence([source]);
    const evidenceIds = [...prepared.evidenceById.keys()].slice(0, 6);
    expect(validateCitedDraft({ posts: [{ ...post, evidenceIds }] }, prepared.evidenceById, [source], now, true).ok).toBe(true);
    expect(validateCitedDraft({ posts: [{ ...post, evidenceIds: [...evidenceIds, "S1E7"] }] }, prepared.evidenceById, [source], now, true).ok).toBe(false);
    expect(validateCitedDraft({ posts: [{ ...post, evidenceIds, discussion: discussion.map(d => ({ ...d, evidenceIds: evidenceIds.slice(0, 4) })) }] }, prepared.evidenceById, [source], now, true).ok).toBe(false);
    const schema = editorialJsonSchema([...prepared.evidenceById.keys()], 4).schema;
    const schemaText = JSON.stringify(schema);
    expect(schemaText).toContain('"maxItems":6');
    expect(schemaText).toContain('"maxItems":3');
  });

  it("audits the full bounded support of four posts with six body and twelve discussion citations each", () => {
    const packets = Array.from({ length: 4 }, (_, i) => ({ ...packet, id: `p${i}`, url: `https://example.com/${i}` }));
    const evidenceById = new Map(packets.flatMap(p => Array.from({ length: 18 }, (_, i) => [`${p.id}E${i}`, { sourceId: p.id, quote: `Original supporting statement number ${i}.` }] as const)));
    const chunk = buildAuditChunk({ index: 1, runId: "audit", postOffset: 0, requestedModel: "test", resolvedModel: null, apiKey: "", packets, evidenceById,
      posts: packets.map(p => ({ evidenceIds: Array.from({ length: 6 }, (_, i) => `${p.id}E${i}`),
        discussion: ["Take", "Pushback", "Reply", "Context"].map((voice, turn) => ({ voice, evidenceIds: Array.from({ length: 3 }, (_, i) => `${p.id}E${6 + turn * 3 + i}`) })) })),
    });
    expect(chunk.evidence).toHaveLength(72);
    expect(EditorialAuditSchema.safeParse({ schemaVersion: 1, runId: "audit", startedAt: now.toISOString(), status: "validated_candidate", chunks: [chunk] }).success).toBe(true);
    expect(JSON.stringify(chunk)).not.toContain("readingContext");
  });
});

describe("discussion contribution", () => {
  it("rejects lightly reworded copies while allowing a shared premise and an actual response", () => {
    const body = "The operator announced a limited service trial in the northern region after engineers reported a problem with moving terminals during testing.";
    expect(discussionRepetitionIssues(body, [{ body: body.replace("announced", "described") }])).toHaveLength(1);
    expect(discussionRepetitionIssues("A separate body.", [{ body }, { body: `Indeed, ${body.toLowerCase()}` }])).toHaveLength(1);
    expect(discussionRepetitionIssues(body, discussion)).toEqual([]);
    expect(discussionRepetitionIssues(body, [{ body: "A moving terminal sounds like a railway station with ambition. The inconvenience is less funny if your connection disappears." },
      { body: "The joke works; the service still needs a clear account of who bears that inconvenience. A trial is not a verdict." }])).toEqual([]);
  });

  it.each([false, true])("retries repetition in structured/fallback mode without silently removing the exchange (%s)", async fallback => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    let calls = 0;
    const items = await generateEditorial("secret", [packet], now, "repetition", [], {
      sleepImpl: async () => {},
      fetchImpl: async () => {
        calls++;
        if (fallback && calls === 1) return new Response("response_format not supported", { status: 400 });
        const repeat = calls === (fallback ? 2 : 1);
        return completion({ posts: [{ ...post, discussion: repeat ? [{ ...discussion[0], body: packet.excerpt }, discussion[1]] : discussion }] });
      },
    });
    expect(calls).toBe(fallback ? 3 : 2);
    expect(items[0].editorial?.discussion).toEqual(discussion.map(({ voice, body }) => ({ voice, body })));
  });
});
