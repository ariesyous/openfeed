import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { getApiKey, loadEnvFile } from "../generator/env";
import { generateValidated } from "../generator/retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../generator/config";
import { prepareEvidence } from "../generator/editorial/evidence";
import { prepareWriterEvidence, resolveWriterSelection, writerResponseSchema } from "../generator/editorial/selection";
import { validateCitedDraft } from "../generator/editorial/generate";
import { buildAuditChunk } from "../generator/editorial/audit";
import { logEditorialAttempt } from "../generator/editorial/diagnostics";
import { reviewDigest, reviewEditorial, type ReviewPost } from "../generator/editorial/review";
import type { SourcePacket } from "../generator/editorial/sources";

// Synthetic selection controls, NOT reports about real events or ordinary yield.
// No fetched pages, publication/state writes, model comparisons or secret output.
// Two two-post suites, at most eight calls/shared fifteen minutes, 192-KiB output.
loadEnvFile();
const now = new Date(), started = Date.now(), deadlineMs = started + 15 * 60_000;
const apiKey = getApiKey();
const packet = (id: string, topic: SourcePacket["topic"], title: string, paragraphs: string[]): SourcePacket => ({
  id, topic, title, publisher: `Synthetic control ${id}`, url: `https://example.com/writer-control-${id}`,
  publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  sections: [paragraphs.join("\n\n")], excerpt: paragraphs.join("\n\n"),
});
const suites = [
  { name: "identity_counts_and_discussion_support", packets: [
    packet("ballot", "canada", "Ten questions, and a warning about wording", [
      "The proposed provincial ballot contains ten questions, five of them about immigration.",
      "Political scientist Morgan Vale reviewed the wording of the proposed questions.",
      "Vale said voters could confuse a vote on holding a future referendum with a decision to leave the country.",
      "The ballot would ask whether the province should hold a later referendum on independence; it would not itself authorize independence.",
      "The provincial government has not set a date for that later referendum.",
      "Vale argues that describing the first ballot as an independence vote obscures the distinction between the two decisions.",
      "The five immigration questions concern proposed provincial powers rather than an already enacted transfer of authority.",
      "The reporter describes a constitutional amendment as a separate process requiring agreement beyond the province; the report does not enumerate its participants.",
    ]),
    packet("actor", "movies", "An actor builds the character before the script begins", [
      "Actor Mira Lane says she imagines a character at seven years old before rehearsing the adult role.",
      "She invents ordinary childhood routines for the character as a private preparation exercise, rather than adding those scenes to the film.",
      "Lane has worked as an actor for three decades.",
      "She says the exercise helps her think about habits the adult character might not explain aloud.",
      "Lane also says audiences expect familiar performances while she worries about becoming bored with her own work.",
      "The interviewer interprets that tension as a problem of staying recognizable without repeating oneself.",
      "The interview does not establish that the childhood exercise caused her career longevity or prevented boredom.",
    ]),
  ] },
  { name: "reporter_attribution_and_technical_background", packets: [
    packet("studio", "movies", "A consultancy between studios and AI vendors", [
      "The Screen Desk reports that a new consultancy called Framehouse will help film studios evaluate AI vendors.",
      "The consultancy says its work will include testing production tools and advising studios about adopting them.",
      "The Screen Desk lists Northlight Fund and Harbor Ventures among Framehouse's investors.",
      "That investor list is the reporter's narration, rather than a quotation or statement attributed to Framehouse.",
      "Framehouse says its founders previously worked in film production and software procurement.",
      "The article describes film workers' concern about AI adoption but does not report a finding that Framehouse's evaluations are biased.",
      "The reporter says the consultancy aims to serve as a bridge between studios and tool makers.",
    ]),
    packet("cache", "ai_agents", "A cache reused on the next agent turn", [
      "In the team's multi-turn agent test, a request reused attention-cache blocks created during the preceding turn.",
      "Reusing those blocks avoided recomputing the same prefix tokens when the next request began.",
      "The implementation stores reusable blocks outside the active worker and fetches them when another turn needs them.",
      "Operators can configure a minimum prefix length before the reuse path is attempted.",
      "The engineering post credits a contributor to the open-source ServingBench project for adapting the implementation to the team's accelerator.",
      "The authors tested the change on that accelerator; the post does not present a comparison covering every hardware platform.",
      "The post does not claim that fetching cached blocks is always cheaper than recomputing them.",
    ]),
  ] },
];
const results: object[] = [];
for (const suite of suites) {
  const prepared = prepareEvidence(suite.packets), writer = prepareWriterEvidence(prepared);
  let selected: ReviewPost[] | undefined;
  const writing = await generateValidated({ apiKey, deadlineMs, maxAttempts: 2,
    maxTokens: ADVANCE_WORLD_MAX_TOKENS, timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    jsonSchema: { name: "editorial_edition", schema: z.toJSONSchema(writerResponseSchema(writer.groups, 2)) },
    systemPrompt: readFileSync(new URL("../generator/editorial/prompt.md", import.meta.url), "utf8"),
    initialUserPrompt: JSON.stringify({ now: now.toISOString(), maxPosts: 2, recentEditions: [], revisionFeedback: [],
      sources: writer.sources.map(source => ({ ...source, publisherGroup: source.publisher })),
      publisherSlotsRemaining: Object.fromEntries(writer.sources.map(source => [source.publisher, 2])) }),
    parse: json => {
      const resolved = resolveWriterSelection(json, writer.groups, 2);
      if (!resolved.ok) return resolved;
      const draft = validateCitedDraft(resolved.value, prepared.evidenceById, suite.packets, now, true);
      if (!draft.ok) return draft;
      if (draft.value.posts.length !== 2) return { ok: false as const, issues: ["This synthetic two-source control requires two complete candidates"] };
      selected = draft.selection;
      return draft;
    },
    onAttempt: info => logEditorialAttempt(info, apiKey, Date.now() - started),
  });
  if (!selected) throw new Error("Writer control did not produce a selection");
  const review = await reviewEditorial({ apiKey, posts: selected, prepared, deadlineMs, maxAttempts: 2,
    onAttempt: info => logEditorialAttempt(info, apiKey, Date.now() - started) });
  const rejected = review.value.posts.filter(post => post.checks.some(check => check.verdict === "reject")).map(post => post.key);
  results.push({ name: suite.name, writer: { attempts: writing.attempts, requestedModel: writing.requestedModel, resolvedModel: writing.resolvedModel },
    reviewer: { attempts: review.attempts, requestedModel: review.requestedModel, resolvedModel: review.resolvedModel },
    passed: !rejected.length, rejected, decisions: review.value,
    support: buildAuditChunk({ index: results.length + 1, runId: `writer-control-${started}`, postOffset: 0,
      requestedModel: writing.requestedModel, resolvedModel: writing.resolvedModel, apiKey,
      posts: selected, evidenceById: prepared.evidenceById, packets: suite.packets }),
    candidateDigests: selected.map(reviewDigest),
  });
  const output = JSON.stringify({ kind: "synthetic_writer_selection_controls", elapsedMs: Date.now() - started, results },
    (_key, value: unknown) => typeof value === "string" ? value.split(apiKey).join("[REDACTED]")
      .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]").replace(/sk-or-[\w-]+/g, "[REDACTED]") : value, 2);
  if (Buffer.byteLength(output) > 192 * 1024) throw new Error("Writer controls exceed their bounded artifact allowance");
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/editorial-writer-check.json", output, { flag: "w" });
  console.log(`[writer-control] ${suite.name}: approved=${2 - rejected.length}/2; writer=${writing.attempts} review=${review.attempts} calls`);
  if (rejected.length) process.exitCode = 1;
}
