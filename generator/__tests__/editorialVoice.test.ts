// @vitest-environment node
import { describe, expect, it } from "vitest";
import { editorialVoiceIssues, hasSourceProcessCommentary } from "../editorial/voice";
import { generateEditorial, validateDraft } from "../editorial/generate";
import type { SourcePacket } from "../editorial/sources";
import { prepareEvidence } from "../editorial/evidence";
import { validateCitedDraft } from "../editorial/generate";

const now = new Date("2026-09-18T00:00:00Z");
const source: SourcePacket = {
  id: "trial", url: "https://example.com/trial", publisher: "Publisher", topic: "ai_agents",
  title: "A trial before release", excerpt: "The company will test its new system before deciding whether to release it more widely.",
  publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
};
const evidence = [{ sourceId: source.id, quote: "test its new system" }];
const draft = { format: "news", title: "A trial before release",
  body: "The company plans to test its system before deciding on a wider release.",
  sourceIds: [source.id], evidence,
};

describe("editorial voice", () => {
  it("catches the reported failure patterns including typographic apostrophes", () => {
    for (const text of [
      "The excerpt doesn't say why the nomination was pulled.",
      "The excerpt doesn’t say why the nomination was pulled.",
      "The excerpt\ndoes not specify the requirements.",
      "The segment does not specify in the available excerpt which requirements changed.",
      "That's about as far as the supplied material goes: a premise and a cast.",
      "We're looking at a market listing and a panel roster, not criticism.",
      "Nothing here establishes whether the film works or who it's for.",
      "On the evidence given, we simply don't know.",
      "The speeches change the norms, as S1E1 and S1E2 establish.",
      "S2E2 raises how this trend has changed the economy.",
      "The two deployment paths work as S5E3 states.",
      "S6E2 notes it is newly launched.",
    ]) expect(hasSourceProcessCommentary(text), text).toBe(true);
  });

  it("keeps attribution, substantive criticism, uncertainty, interpretation and banter", () => {
    for (const text of [
      "According to NPR, the White House withdrew its nominee.",
      "Researchers caution that the study does not establish causation.",
      "Police said the cause remains unknown. The investigation continues.",
      "The company claims an improvement; a controlled experiment is different from a production deployment.",
      "A comedy about co-parenting puts affection and resentment at the same dinner table.",
      "Parental devotion gives the comedy emotional stakes, while post-marital acrimony supplies the friction.",
      "Does the dashboard measure value, or just activity?",
      "The author read an excerpt from her novel at the festival.",
      "Available evidence suggests a correlation, according to the researchers.",
      "That interpretation overlooks how the character behaves in the final scene.",
      "The Sopranos S1E1 introduces Tony through his first therapy appointment.",
      "Compare the pilot (S1E1) with the finale (S6E21).",
      "The finale revisits the same question as S1E1 did.",
    ]) expect(editorialVoiceIssues({title: "An editorial observation", body: text,
      discussion: [{body: text}]}), text).toEqual([]);
  });

  it("rejects evidence-ID narration in parents but independently omits a leaking discussion", () => {
    const prepared = prepareEvidence([source]);
    const parent = {format: "news", title: draft.title, body: draft.body,
      topic: null, spoilers: null, evidenceIds: ["S1E1"], discussion: null};
    for (const field of ["title", "body"] as const) {
      const result = validateCitedDraft({posts: [{...parent, [field]: "The trial is planned, as S1E1 reports."}]},
        prepared.evidenceById, [source], now);
      expect(result.ok).toBe(false);
    }
    const input = {posts: [{...parent, discussion: [
      {voice: "Take", body: "The trial should inform the release decision.", evidenceIds: ["S1E1"]},
      {voice: "Reply", body: "S1E1 states that a trial precedes release.", evidenceIds: ["S1E1"]},
    ]}]};
    const before = structuredClone(input);
    const result = validateCitedDraft(input, prepared.evidenceById, [source], now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.issues.join("; "));
    expect(result.value.posts[0].body).toBe(draft.body);
    expect(result.value.posts[0].discussion).toBeUndefined();
    expect(result.selection[0].discussionOmission).toBe("support_or_voice");
    expect(input).toEqual(before);
  });

  it("rejects process commentary in titles, bodies and discussion without rewriting it", () => {
    const bad = "The excerpt does not say whether the trial will succeed.";
    const candidates = [
      {...draft, title: bad}, {...draft, body: bad},
      {...draft, discussion: [
        {voice: "Take", body: "A trial seems a sensible first step.", evidence},
        {voice: "Pushback", body: bad, evidence},
      ]},
    ];
    for (const candidate of candidates) {
      const before = structuredClone(candidate);
      const result = validateDraft({posts: [candidate]}, [source], now);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Process commentary passed validation");
      expect(result.issues.join(" ")).toContain("Source-process commentary");
      expect(candidate).toEqual(before);
    }
    expect(validateDraft({posts: [draft]}, [source], now).ok).toBe(true);
  });

  it("keeps evidence and freshness validation after the voice passes", () => {
    expect(validateDraft({posts: [{...draft, evidence: [{sourceId: source.id, quote: "invented evidence"}]}]}, [source], now).ok).toBe(false);
    expect(validateDraft({posts: [draft]}, [{...source, publishedAt: "2026-01-01T00:00:00Z"}], now).ok).toBe(false);
  });

  it("retries parent process commentary and preserves supported discussion in both response modes", async () => {
    for (const fallback of [false, true]) {
      let calls = 0;
      const fetchImpl: typeof fetch = async (_url, init) => {
        calls++;
        const request = JSON.parse(String(init?.body));
        if (fallback && calls === 1) return new Response("response_format not supported", {status: 400});
        const corrected = calls === (fallback ? 3 : 2);
        if (corrected) expect(request.messages[1].content).toContain("Source-process commentary in body");
        if (fallback) expect(request.response_format).toBeUndefined();
        const post = {format: "news", title: draft.title, body: corrected ? draft.body : "The excerpt does not tell us enough to assess the trial.",
          topic: null, spoilers: null, evidenceIds: ["S1E1"], discussion: [
            {voice: "Take", body: "A trial seems a sensible first step.", evidenceIds: ["S1E1"]},
            {voice: "Pushback", body: "Testing should inform the decision, not become a rubber stamp for release.", evidenceIds: ["S1E1"]},
          ]};
        return new Response(JSON.stringify({model: "test/model", choices: [{finish_reason: "stop", message: {content: JSON.stringify({posts: [post]})}}]}));
      };
      const items = await generateEditorial("secret", [source], now, "voice", [], {fetchImpl, sleepImpl: async () => {}});
      expect(calls).toBe(fallback ? 3 : 2);
      expect(items).toHaveLength(1);
      expect(items[0].editorial?.discussion).toHaveLength(2);
      expect(items[0].editorial?.discussion?.[1].body).toContain("rubber stamp");
    }
  });
});
