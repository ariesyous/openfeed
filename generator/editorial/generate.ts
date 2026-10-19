import { appendFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import { FeedItemSchema, type FeedItem } from "../../schemas";
import { generateValidated, GenerationDeadlineError, GenerationFailedError, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence, type EvidenceEntry } from "./evidence";
import { prepareWriterEvidence, remapPreviousSupport, resolveWriterSelection, writerResponseSchema, type PreviousWriterSupport } from "./selection";
import { EDITORIAL_MAX_POSTS, EDITORIAL_MAX_ATTEMPTS, EDITORIAL_TIME_BUDGET_MS } from "./limits";
export { EDITORIAL_MAX_POSTS, EDITORIAL_MAX_ATTEMPTS, EDITORIAL_TIME_BUDGET_MS } from "./limits";
import { logEditorialAttempt, redactEditorialDiagnostic } from "./diagnostics";
import { coverageTitle } from "./coverage";
import { editorialVoiceIssues } from "./voice";
import { discussionRepetitionIssues } from "./discussion";
import { buildAuditChunk, type EditorialAuditChunk, type EditorialReviewRecord, type DiscussionOmissionReason } from "./audit";
import { reviewEditorial, reviewDigest } from "./review";
import { FORMATS, TOPICS } from "./accounts";
import type { SourcePacket } from "./sources";

// A ceiling, not a quota. Historical validation still accepts twenty-post batches.
export const EDITORIAL_REQUEST_POSTS = 4;
// Keep the transport/historical bound at four, but give detailed claim review
// smaller ordinary batches after repeated live length-limit failures.
export const EDITORIAL_GENERATION_POSTS = 2;
const publisherKey = (publisher: string) => publisher.startsWith("BBC") ? "BBC" : publisher;

const DiscussionTurn = z.object({
  voice: z.enum(["Take", "Pushback", "Reply", "Context"]),
  body: z.string().min(10).max(700),
  evidence: z.array(z.object({sourceId: z.string(), quote: z.string().min(12).max(300)})).min(1).max(3),
});
const DraftSchema = z.object({
  posts: z
    .array(
      z.object({
        format: z.enum(FORMATS),
        title: z.string().min(1).max(150),
        topic: z.enum(TOPICS).nullish().transform((value) => value ?? undefined).optional(),
        body: z.string().min(20).max(1800),
        sourceIds: z.array(z.string()).min(1).max(3),
        discussion: z.array(DiscussionTurn).min(2).max(4).nullish().transform((value) => value ?? undefined).optional(),
        spoilers: z.boolean().nullish().transform((value) => value ?? undefined).optional(),
        evidence: z
          .array(
            z.object({
              sourceId: z.string(),
              quote: z.string().min(12).max(300),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .max(20),
});
// Models select existing evidence IDs; only code copies quotations and source IDs.
// Strict output uses required nullable properties for optional editorial fields.
function responseSchema(evidenceId: z.ZodType<string>, maxPosts = EDITORIAL_REQUEST_POSTS) {
  const EvidenceIds = z.array(evidenceId).min(1).max(3);
  return z.object({
  posts: z.array(DraftSchema.shape.posts.element.omit({
    sourceIds: true, evidence: true, discussion: true,
  }).extend({
    topic: z.enum(TOPICS).nullable(),
    evidenceIds: z.array(evidenceId).min(1).max(6),
    discussion: z.array(DiscussionTurn.omit({ evidence: true }).extend({
      evidenceIds: EvidenceIds,
    }).strict()).min(2).max(4).nullable(),
    spoilers: z.boolean().nullable(),
  })).max(maxPosts),
  });
}
const ResponseSchema = responseSchema(z.string().min(1).max(40));
// Only a clearly separated array (or null) is eligible for discussion isolation.
// Unknown parent/envelope keys and non-array discussion shapes fail closed.
const ResponseEnvelope = z.object({
  posts: z.array(ResponseSchema.shape.posts.element.extend({
    discussion: z.array(z.unknown()).nullable(),
  }).strict()).max(EDITORIAL_REQUEST_POSTS),
}).strict();
type CitedSelection = z.infer<typeof ResponseSchema>["posts"][number] & {
  discussionOmission?: DiscussionOmissionReason;
};
type CitedDraftOutcome = { ok: true; value: Draft; selection: CitedSelection[] }
  | { ok: false; issues: string[] };
export function editorialJsonSchema(evidenceIds: string[], maxPosts: number) {
  if (!evidenceIds.length) throw new Error("Cannot generate without evidence IDs");
  const post = responseSchema(z.enum(evidenceIds), maxPosts).shape.posts.element;
  return {
    name: "editorial_edition",
    schema: z.toJSONSchema(z.object({ posts: z.array(post.extend({
      discussion: post.shape.discussion.unwrap(),
    })).max(maxPosts) })),
  };
}

type Draft = z.infer<typeof DraftSchema>;
export function validateDraft(
  json: unknown,
  packets: SourcePacket[],
  now: Date,
): ParseOutcome<Draft> {
  const parsed = DraftSchema.safeParse(json);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    };
  const sources = new Map(packets.map((p) => [p.id, p]));
  const issues: string[] = [],
    used = new Set<string>();
  const publishers = new Map<string, number>();
  for (const post of parsed.data.posts) {
    issues.push(...editorialVoiceIssues(post));
    if (/https?:\/\//i.test(post.body))
      issues.push("URLs must come from the source list, not the body");
    if (new Set(post.sourceIds).size !== post.sourceIds.length)
      issues.push("Duplicate source ID");
    for (const id of post.sourceIds) {
      const source = sources.get(id);
      if (!source) {
        issues.push(`Unknown source ${id}`);
        continue;
      }
      if (used.has(id))
        issues.push(`Source ${id} already used in this edition`);
      used.add(id);
      publishers.set(
        publisherKey(source.publisher),
        (publishers.get(publisherKey(source.publisher)) ?? 0) + 1,
      );
      if ((publishers.get(publisherKey(source.publisher)) ?? 0) > 2)
        issues.push(`Too many posts from ${source.publisher}`);
      const age = now.getTime() - new Date(source.publishedAt ?? "").getTime();
      if (post.format === "news" && (source.evergreen || !Number.isFinite(age) || age < 0 || age > 72 * 3_600_000))
        issues.push(`Source ${id} is not recent enough for news`);
      if (!post.evidence.some((entry) => entry.sourceId === id))
        issues.push(`Missing or unsupported evidence for ${id}`);
    }
    // Every selected span needs provenance, not just the first span for a source.
    for (const evidence of post.evidence) {
      const source = sources.get(evidence.sourceId);
      if (!source || evidence.quote.trim().split(/\s+/).length > 25 ||
        !(source.title.includes(evidence.quote) || source.excerpt.includes(evidence.quote)))
        issues.push(`Missing or unsupported evidence for ${evidence.sourceId}`);
    }
    for (const turn of post.discussion ?? []) {
      if (/https?:\/\//i.test(turn.body)) issues.push("Discussion URLs must use attached sources");
      for (const evidence of turn.evidence) {
        const source = sources.get(evidence.sourceId);
        if (!post.sourceIds.includes(evidence.sourceId) || !source ||
          evidence.quote.trim().split(/\s+/).length > 25 ||
          !(source.title.includes(evidence.quote) || source.excerpt.includes(evidence.quote))) {
          issues.push("Discussion evidence must match an attached source excerpt");
        }
      }
    }
    if (post.evidence.some((e) => !post.sourceIds.includes(e.sourceId)))
      issues.push("Evidence must match attached sources");
  }
  return issues.length
    ? { ok: false, issues }
    : { ok: true, value: parsed.data };
}
export function validateCitedDraft(
  json: unknown,
  evidenceById: Map<string, EvidenceEntry>,
  packets: SourcePacket[],
  now: Date,
  requireDiscussion = false,
): CitedDraftOutcome {
  const parsed = ResponseEnvelope.safeParse(json);
  if (!parsed.success) return {
    ok: false,
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
  const resolve = (ids: string[], issues: string[], path: string) => ids.flatMap((id) => {
    const entry = evidenceById.get(id);
    if (!entry) { issues.push(`${path}: unknown evidence ID ${id}; select a supplied ID`); return []; }
    if (requireDiscussion && entry.groupIds?.some(part => !ids.includes(part)))
      issues.push(`${path}: select the complete sentence group ${entry.groupIds.join(", ")} or choose a different supported claim; never omit a sentence's continuation`);
    return [{ sourceId: entry.sourceId, quote: entry.quote }];
  });
  const issues: string[] = [];
  const parents = parsed.data.posts.map((post, index) => {
    const evidence = resolve(post.evidenceIds, issues, `posts.${index}.evidenceIds`);
    return { ...post, evidence, discussion: undefined,
      sourceIds: [...new Set(evidence.map((entry) => entry.sourceId))] };
  });
  if (issues.length) return { ok: false, issues };
  // All parent/within-request gates precede optional-block handling. No parent salvage.
  const checked = validateDraft({ posts: parents }, packets, now);
  if (!checked.ok) return checked;
  const selection: CitedSelection[] = [];
  for (const [index, post] of parsed.data.posts.entries()) {
    const selected: CitedSelection = { ...post, discussion: null };
    selection.push(selected);
    if (post.discussion === null) continue;
    const block = ResponseSchema.shape.posts.element.shape.discussion.safeParse(post.discussion);
    if (!block.success) { selected.discussionOmission = "schema"; continue; }
    const discussionIssues: string[] = [];
    const discussion = block.data!.map((turn, turnIndex) => ({ ...turn,
      evidence: resolve(turn.evidenceIds, discussionIssues, `discussion.${turnIndex}.evidenceIds`),
    }));
    if (discussionIssues.length) {
      if (requireDiscussion) return { ok: false, issues: discussionIssues };
      selected.discussionOmission = "unknown_evidence"; continue;
    }
    const parent = checked.value.posts[index];
    const withDiscussion = validateDraft({ posts: [{ ...parent, discussion }] }, packets, now);
    if (!withDiscussion.ok) { selected.discussionOmission = "support_or_voice"; continue; }
    parent.discussion = withDiscussion.value.posts[0].discussion;
    selected.discussion = block.data;
  }
  // New generations require a complete exchange. Historical callers retain the
  // optional-block isolation contract; no existing articles are rewritten.
  if (requireDiscussion && checked.value.posts.some(post => !post.discussion ||
    new Set(post.discussion.map(turn => turn.voice)).size < 2 ||
    new Set(post.discussion.map(turn => turn.body.trim().toLocaleLowerCase("en"))).size !== post.discussion.length)) {
    return { ok: false, issues: ["Every published post needs a valid 2–4-turn AI exchange with distinct perspectives; revise the whole post or omit it"] };
  }
  if (requireDiscussion) {
    const repetition = checked.value.posts.flatMap((post, index) =>
      discussionRepetitionIssues(post.body, post.discussion ?? []).map(issue => `posts.${index}.${issue}`));
    if (repetition.length) return { ok: false, issues: repetition };
  }
  // No IDs are repaired and no individual turns/sentences are rewritten.
  return { ok: true, value: checked.value, selection };
}

export function enrichEditorial(
  draft: Draft,
  packets: SourcePacket[],
  now: Date,
  runId: string,
): FeedItem[] {
  const checked = validateDraft(draft, packets, now);
  if (!checked.ok) throw new Error(checked.issues.join("; "));
  return draft.posts.map((post, index) => {
    const selected = post.sourceIds.map(
      (id) => packets.find((p) => p.id === id)!,
    );
    return FeedItemSchema.parse({
      id: `post-${runId}-${index}`,
      kind: "text_post",
      authorId: `editorial-${post.format}`,
      community: post.topic ?? selected[0].topic,
      title: post.title,
      body: post.body,
      createdAt: now.toISOString(),
      meta: { kind: "generic" },
      comments: [],
      engagement: {
        likes: 0,
        replies: 0,
        reposts: 0,
        views: 0,
        viralityScore: 0,
      },
      editorial: {
        format: post.format,
        basis: "publisher_excerpt",
        spoilers: post.spoilers,
        discussion: post.discussion?.map(({voice, body}) => ({voice, body})),
        sources: selected.map(
          ({ url, title, publisher, publishedAt, retrievedAt }) => ({
            url,
            title,
            publisher,
            publishedAt,
            retrievedAt,
          }),
        ),
      },
    });
  });
}
export async function generateEditorial(
  apiKey: string,
  packets: SourcePacket[],
  now: Date,
  runId: string,
  recentEditions: string[] = [],
  dependencies: { fetchImpl?: typeof fetch; sleepImpl?: (ms: number) => Promise<void>; nowImpl?: () => number; onAcceptedChunk?: (chunk: EditorialAuditChunk) => void; onReviewedChunk?: (record: EditorialReviewRecord, apiKey: string) => void } = {},
): Promise<FeedItem[]> {
  const clock = dependencies.nowImpl ?? Date.now;
  const started = clock();
  const deadlineMs = started + EDITORIAL_TIME_BUDGET_MS;
  const accepted: Draft["posts"] = [];
  // Empty selections are deferred only for this run, never marked as published.
  const deferredSources = new Set<string>();
  const revisionCounts = new Map<string, number>();
  const revisions = new Map<string, { sourceTitles: string[]; candidate: { title: string; body: string; discussion: { voice: string; body: string }[] }; support: PreviousWriterSupport; defects: { target: string; reason: string | null; claim: string | null; explanation: string }[] }>();
  let emptySelections = 0;
  let generatedDrafts = 0;
  let discussionOmissions = 0;
  let providerFailures = 0;
  let rejectedResponses = 0;
  let attempts = 0;
  let acceptedChunks = 0;
  let reviewCalls = 0;
  let reviewedChunks = 0;
  let reviewRejectedPosts = 0;
  let reason = "edition ceiling reached";
  const models = new Set<string>();
  while (accepted.length < EDITORIAL_MAX_POSTS && attempts < EDITORIAL_MAX_ATTEMPTS) {
    // A candidate must have at least one remaining call for its mandatory review.
    if (EDITORIAL_MAX_ATTEMPTS - attempts < 2) { reason = "insufficient attempt budget for generation and review"; break; }
    const used = new Set(accepted.flatMap(post => post.sourceIds));
    const usedTitles = new Set(packets.filter(packet => used.has(packet.id)).map(packet => coverageTitle(packet.title)));
    const publishers = new Map<string, number>();
    for (const packet of packets.filter(packet => used.has(packet.id))) {
      const key = publisherKey(packet.publisher);
      publishers.set(key, (publishers.get(key) ?? 0) + 1);
    }
    const available = packets.filter(packet => !deferredSources.has(packet.id) && !used.has(packet.id) && !usedTitles.has(coverageTitle(packet.title)) && (publishers.get(publisherKey(packet.publisher)) ?? 0) < 2);
    const distinctSources = [...new Map(available.map(packet => [coverageTitle(packet.title), packet])).values()];
    const pendingRevisions = distinctSources.filter(packet => revisions.has(packet.id));
    // A single revision should not monopolize a two-post writer/reviewer pair.
    // Select revisions first, then fill the packet with other eligible sources.
    const prepared = prepareEvidence([...pendingRevisions,
      ...distinctSources.filter(packet => !revisions.has(packet.id))], {
      priorityIds: new Set(pendingRevisions.map(packet => packet.id)),
      // Four complete contexts are enough choice for two posts. Keep every
      // paragraph/snippet per offered source; other candidates stay available.
      sourceLimit: distinctSources.some(packet => packet.sections) ? 4 : undefined,
    });
    const writerEvidence = prepareWriterEvidence(prepared);
    const offeredIds = new Set([...writerEvidence.groups.values()].flatMap(ids => ids.map(id => prepared.evidenceById.get(id)!.sourceId)));
    const preparedIds = new Set([...prepared.evidenceById.values()].map(entry => entry.sourceId));
    for (const id of preparedIds) if (!offeredIds.has(id)) deferredSources.add(id);
    if (!writerEvidence.sources.length) {
      if (preparedIds.size) continue; // Unusable group sizes must not hide later usable sources.
      reason = emptySelections ? "no untried evidence remains after empty selections" : "insufficient unused evidence or publisher diversity";
      break;
    }
    console.log(`[editorial] candidates=${distinctSources.length} offered=${offeredIds.size} deferred=${deferredSources.size} accepted=${accepted.length}/${EDITORIAL_MAX_POSTS}`);
    const maxPosts = Math.min(EDITORIAL_GENERATION_POSTS, EDITORIAL_MAX_POSTS - accepted.length);
    const requestSources = writerEvidence.sources.map(source => ({
      ...source,
      publisherGroup: publisherKey(source.publisher),
    }));
    const publisherSlotsRemaining = Object.fromEntries(requestSources.map(source => [
      source.publisherGroup, 2 - (publishers.get(source.publisherGroup) ?? 0),
    ]));
    let selected: CitedSelection[] | undefined;
    try {
      const result = await generateValidated({
        ...dependencies, apiKey, deadlineMs, maxAttempts: Math.min(3, EDITORIAL_MAX_ATTEMPTS - attempts - 1),
        jsonSchema: { name: "editorial_edition", schema: z.toJSONSchema(writerResponseSchema(writerEvidence.groups, maxPosts)) },
        systemPrompt: readFileSync(new URL("./prompt.md", import.meta.url), "utf8"),
        initialUserPrompt: JSON.stringify({
          now: now.toISOString(), sources: requestSources, maxPosts,
          recentEditions: [...recentEditions, ...accepted.map(post => post.title)],
          publisherSlotsRemaining,
          revisionFeedback: [...new Set([...offeredIds].flatMap(id => revisions.has(id) ? [revisions.get(id)!] : []))]
            .map(({ support, ...feedback }) => ({ ...feedback,
              previousSupport: remapPreviousSupport(support, prepared, writerEvidence.groups) })),
        }),
        parse: (json) => {
          // Count identifiable JSON post objects, even when their parent validation fails.
          // Malformed JSON/ambiguous non-object entries are unmeasurable, not zero drafts.
          const rawPosts = json && typeof json === "object" && "posts" in json ? json.posts : undefined;
          if (Array.isArray(rawPosts)) generatedDrafts += rawPosts.filter(post =>
            post !== null && typeof post === "object" && !Array.isArray(post)).length;
          const resolved = resolveWriterSelection(json, writerEvidence.groups, maxPosts);
          if (!resolved.ok) return resolved;
          const draft = validateCitedDraft(resolved.value, prepared.evidenceById, available, now, true);
          if (!draft.ok) return draft;
          if (draft.value.posts.length > maxPosts) return { ok: false, issues: [`At most ${maxPosts} posts remain in this edition`] };
          const titles = [...accepted, ...draft.value.posts].map(post => post.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
          if (new Set(titles).size !== titles.length) return { ok: false, issues: ["Duplicate article title in this edition"] };
          const combined = validateDraft({ posts: [...accepted, ...draft.value.posts] }, packets, now);
          if (!combined.ok) return combined;
          // Retain request-local evidence IDs only for the response that passed every gate.
          selected = draft.selection;
          return draft;
        },
        maxTokens: ADVANCE_WORLD_MAX_TOKENS, timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
        onAttempt: (info) => {
          if (["retryable", "fatal", "unsupported_structured_output"].includes(info.outcomeKind)) providerFailures++;
          if (["validation_failed", "invalid_json"].includes(info.outcomeKind)) rejectedResponses++;
          logEditorialAttempt({ ...info, attempt: attempts + info.attempt }, apiKey, clock() - started);
        },
      });
      attempts += result.attempts;
      models.add(result.modelUsed);
      console.log(`[editorial] completed chunk in ${result.attempts} attempt(s); structured output: ${result.usedStructuredOutput}`);
      if (!result.value.posts.length) {
        emptySelections++;
        for (const id of offeredIds) deferredSources.add(id);
        console.log(`[editorial] empty selection: deferred ${offeredIds.size} sources for this run; checking other evidence within the remaining budget`);
        continue;
      }
      if (!selected) throw new Error("Accepted editorial evidence selection is missing");
      const review = await reviewEditorial({
        ...dependencies, apiKey, posts: selected, prepared, deadlineMs,
        maxAttempts: Math.min(2, EDITORIAL_MAX_ATTEMPTS - attempts),
        onAttempt: info => {
          reviewCalls++;
          if (["retryable", "fatal", "unsupported_structured_output"].includes(info.outcomeKind)) providerFailures++;
          logEditorialAttempt({ ...info, attempt: attempts + info.attempt, outcomeKind: `review_${info.outcomeKind}` }, apiKey, clock() - started);
        },
      });
      attempts += review.attempts;
      models.add(review.modelUsed);
      reviewedChunks++;
      dependencies.onReviewedChunk?.({
        support: buildAuditChunk({ index: reviewedChunks, runId: `review-${runId}-${reviewedChunks}`, postOffset: 0,
          requestedModel: review.requestedModel, resolvedModel: review.resolvedModel, apiKey,
          posts: selected, evidenceById: prepared.evidenceById, packets: available }),
        decisions: review.value,
        candidates: selected.map(post => ({ title: post.title, digest: reviewDigest(post) })),
      }, apiKey);
      const passed: number[] = [];
      for (const index of selected.keys()) {
        const decision = review.value.posts.find(p => p.key === `P${index + 1}`)!;
        const rejected = decision.checks.filter(check => check.verdict === "reject");
        if (!rejected.length) { passed.push(index); continue; }
        reviewRejectedPosts++;
        const candidate = result.value.posts[index];
        if (candidate.sourceIds.every(id => !revisionCounts.has(id))) {
          // One deliberate whole-post revision, followed by the SAME provenance
          // gates and a fresh independent review. No silent citation/text repair.
          const feedback = {
            sourceTitles: candidate.sourceIds.map(id => packets.find(packet => packet.id === id)!.title),
            candidate: { title: candidate.title, body: candidate.body,
              discussion: candidate.discussion!.map(({ voice, body }) => ({ voice, body })) },
            support: [{ target: "title/body", evidence: selected[index].evidenceIds.map(id => prepared.evidenceById.get(id)!) },
              ...selected[index].discussion!.map((turn, j) => ({ target: `discussion.${j}`,
                evidence: turn.evidenceIds.map(id => prepared.evidenceById.get(id)!) }))],
            defects: rejected.map(({ target, reason, claim, explanation }) => ({ target, reason, claim, explanation })),
          };
          for (const id of candidate.sourceIds) { revisionCounts.set(id, 1); revisions.set(id, feedback); }
        } else for (const id of candidate.sourceIds) deferredSources.add(id);
        logEditorialAttempt({ attempt: attempts, outcomeKind: "review_withheld",
          detail: `candidate=${index} reasons=${rejected.map(check => `${check.target}:${check.reason}`).join(",")}` }, apiKey, clock() - started);
      }
      // Filter whole posts only. Never let review rewrite, strip or flatten the exchange.
      const reviewedPosts = passed.map(index => result.value.posts[index]);
      selected = passed.map(index => selected![index]);
      if (!reviewedPosts.length) continue;
      const finalCheck = validateDraft({ posts: [...accepted, ...reviewedPosts] }, packets, now);
      if (!finalCheck.ok) throw new Error("Reviewed candidate failed publication validation");
      acceptedChunks++;
      for (const [index, post] of selected.entries()) {
        if (!post.discussionOmission) continue;
        discussionOmissions++;
        logEditorialAttempt({ attempt: attempts, outcomeKind: "discussion_omitted",
          detail: `postIndex=${accepted.length + index} reason=${post.discussionOmission}`,
        }, apiKey, clock() - started);
      }
      if (dependencies.onAcceptedChunk) {
        const chunk = buildAuditChunk({
          index: acceptedChunks, runId, postOffset: accepted.length,
          requestedModel: result.requestedModel, resolvedModel: result.resolvedModel, apiKey,
          posts: selected, evidenceById: prepared.evidenceById, packets: available,
        });
        chunk.review = { requestedModel: redactEditorialDiagnostic(review.requestedModel, apiKey).slice(0, 200),
          resolvedModel: review.resolvedModel === null ? null : redactEditorialDiagnostic(review.resolvedModel, apiKey).slice(0, 200),
          candidateDigests: selected.map(reviewDigest) };
        dependencies.onAcceptedChunk(chunk);
      }
      accepted.push(...reviewedPosts);
    } catch (error) {
      if (!(error instanceof GenerationFailedError)) throw error;
      attempts += error.attempts;
      reason = error instanceof GenerationDeadlineError ? "edition time budget exhausted" : "provider or validation budget exhausted";
      if (error instanceof GenerationDeadlineError || error.fatal) {
        if (!accepted.length) throw error;
        break;
      }
      // Exhausted local retries withhold these candidates, not the entire run.
      // Try other sources within the SAME call/deadline budget, even before a pass.
      const failedIds = selected?.flatMap(post => post.evidenceIds.map(id => prepared.evidenceById.get(id)!.sourceId)) ?? [...offeredIds];
      for (const id of failedIds) deferredSources.add(id);
      logEditorialAttempt({ attempt: attempts, outcomeKind: "chunk_withheld", detail: "Local writer/reviewer retries exhausted; trying other unused evidence" }, apiKey, clock() - started);
      reason = "edition ceiling reached";
    }
  }
  if (accepted.length < EDITORIAL_MAX_POSTS && reason === "edition ceiling reached") reason = "edition attempt budget exhausted";
  const items = enrichEditorial({ posts: accepted }, packets, now, runId);
  const summary = `[editorial] ceiling=${EDITORIAL_MAX_POSTS} actual=${items.length} attempts=${attempts}/${EDITORIAL_MAX_ATTEMPTS} generatedDrafts=${generatedDrafts} discussionOmissions=${discussionOmissions} providerFailures=${providerFailures} rejectedResponses=${rejectedResponses} emptySelections=${emptySelections} deferredSources=${deferredSources.size} reviewCalls=${reviewCalls} reviewRejectedPosts=${reviewRejectedPosts} elapsedMs=${clock() - started}; ${reason}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const safe = (text: string) => redactEditorialDiagnostic(text, apiKey).replace(/[<>`|]/g, " ").slice(0, 200);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Editorial generation\n\nReady for publication: **${items.length}/${EDITORIAL_MAX_POSTS} articles**\n\nProvider calls: ${attempts}/${EDITORIAL_MAX_ATTEMPTS}. Reviewer withholdings: ${reviewRejectedPosts} (includes revision decisions). Stop: ${reason}.\n\n${summary}\n\nModels: ${[...models].map(safe).join(", ") || "none"}\n\nTopics: ${items.map(item => item.community).join(", ")}\n\nOutcome: ${items.length ? "validated candidate ready for publication" : "no-op; existing edition retained"}\n`);
  }
  return items;
}
