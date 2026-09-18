import { appendFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import { FeedItemSchema, type FeedItem } from "../../schemas";
import { generateValidated, GenerationDeadlineError, GenerationFailedError, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence, type EvidenceEntry } from "./evidence";
import { logEditorialAttempt, redactEditorialDiagnostic } from "./diagnostics";
import { coverageTitle } from "./coverage";
import { editorialVoiceIssues } from "./voice";
import { buildAuditChunk, type EditorialAuditChunk, type DiscussionOmissionReason } from "./audit";
import { FORMATS, TOPICS } from "./accounts";
import type { SourcePacket } from "./sources";

export const EDITORIAL_MAX_POSTS = 20;
export const EDITORIAL_REQUEST_POSTS = 4;
export const EDITORIAL_MAX_ATTEMPTS = 8;
export const EDITORIAL_TIME_BUDGET_MS = 45 * 60_000;
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
          .max(3),
      }),
    )
    .max(EDITORIAL_MAX_POSTS),
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
    evidenceIds: EvidenceIds,
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
  return {
    name: "editorial_edition",
    schema: z.toJSONSchema(responseSchema(z.enum(evidenceIds), maxPosts)),
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
): CitedDraftOutcome {
  const parsed = ResponseEnvelope.safeParse(json);
  if (!parsed.success) return {
    ok: false,
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
  const resolve = (ids: string[], issues: string[], path: string) => ids.flatMap((id) => {
    const entry = evidenceById.get(id);
    if (!entry) { issues.push(`${path}: unknown evidence ID ${id}; select a supplied ID`); return []; }
    return [entry];
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
    if (discussionIssues.length) { selected.discussionOmission = "unknown_evidence"; continue; }
    const parent = checked.value.posts[index];
    const withDiscussion = validateDraft({ posts: [{ ...parent, discussion }] }, packets, now);
    if (!withDiscussion.ok) { selected.discussionOmission = "support_or_voice"; continue; }
    parent.discussion = withDiscussion.value.posts[0].discussion;
    selected.discussion = block.data;
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
  dependencies: { fetchImpl?: typeof fetch; sleepImpl?: (ms: number) => Promise<void>; nowImpl?: () => number; onAcceptedChunk?: (chunk: EditorialAuditChunk) => void } = {},
): Promise<FeedItem[]> {
  const clock = dependencies.nowImpl ?? Date.now;
  const started = clock();
  const deadlineMs = started + EDITORIAL_TIME_BUDGET_MS;
  const accepted: Draft["posts"] = [];
  // Empty selections are deferred only for this run, never marked as published.
  const deferredSources = new Set<string>();
  let emptySelections = 0;
  let generatedDrafts = 0;
  let discussionOmissions = 0;
  let providerFailures = 0;
  let rejectedResponses = 0;
  let attempts = 0;
  let acceptedChunks = 0;
  let reason = "target reached";
  const models = new Set<string>();
  while (accepted.length < EDITORIAL_MAX_POSTS && attempts < EDITORIAL_MAX_ATTEMPTS) {
    const used = new Set(accepted.flatMap(post => post.sourceIds));
    const usedTitles = new Set(packets.filter(packet => used.has(packet.id)).map(packet => coverageTitle(packet.title)));
    const publishers = new Map<string, number>();
    for (const packet of packets.filter(packet => used.has(packet.id))) {
      const key = publisherKey(packet.publisher);
      publishers.set(key, (publishers.get(key) ?? 0) + 1);
    }
    const available = packets.filter(packet => !deferredSources.has(packet.id) && !used.has(packet.id) && !usedTitles.has(coverageTitle(packet.title)) && (publishers.get(publisherKey(packet.publisher)) ?? 0) < 2);
    const distinctSources = [...new Map(available.map(packet => [coverageTitle(packet.title), packet])).values()];
    const prepared = prepareEvidence(distinctSources);
    if (!prepared.sources.length) {
      reason = emptySelections ? "no untried evidence remains after empty selections" : "insufficient unused evidence or publisher diversity";
      break;
    }
    const offeredIds = new Set([...prepared.evidenceById.values()].map(entry => entry.sourceId));
    console.log(`[editorial] candidates=${distinctSources.length} offered=${offeredIds.size} deferred=${deferredSources.size} accepted=${accepted.length}/${EDITORIAL_MAX_POSTS}`);
    const maxPosts = Math.min(EDITORIAL_REQUEST_POSTS, EDITORIAL_MAX_POSTS - accepted.length);
    const requestSources = prepared.sources.map(source => ({
      ...source,
      publisherGroup: publisherKey(source.publisher),
    }));
    const publisherSlotsRemaining = Object.fromEntries(requestSources.map(source => [
      source.publisherGroup, 2 - (publishers.get(source.publisherGroup) ?? 0),
    ]));
    let selected: CitedSelection[] | undefined;
    try {
      const result = await generateValidated({
        ...dependencies, apiKey, deadlineMs, maxAttempts: EDITORIAL_MAX_ATTEMPTS - attempts,
        jsonSchema: editorialJsonSchema([...prepared.evidenceById.keys()], maxPosts),
        systemPrompt: readFileSync(new URL("./prompt.md", import.meta.url), "utf8"),
        initialUserPrompt: JSON.stringify({
          now: now.toISOString(), sources: requestSources, maxPosts,
          recentEditions: [...recentEditions, ...accepted.map(post => post.title)],
          publisherSlotsRemaining,
        }),
        parse: (json) => {
          // Count identifiable JSON post objects, even when their parent validation fails.
          // Malformed JSON/ambiguous non-object entries are unmeasurable, not zero drafts.
          const rawPosts = json && typeof json === "object" && "posts" in json ? json.posts : undefined;
          if (Array.isArray(rawPosts)) generatedDrafts += rawPosts.filter(post =>
            post !== null && typeof post === "object" && !Array.isArray(post)).length;
          const draft = validateCitedDraft(json, prepared.evidenceById, available, now);
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
      acceptedChunks++;
      if (!selected) throw new Error("Accepted editorial evidence selection is missing");
      for (const [index, post] of selected.entries()) {
        if (!post.discussionOmission) continue;
        discussionOmissions++;
        logEditorialAttempt({ attempt: attempts, outcomeKind: "discussion_omitted",
          detail: `postIndex=${accepted.length + index} reason=${post.discussionOmission}`,
        }, apiKey, clock() - started);
      }
      if (dependencies.onAcceptedChunk) {
        dependencies.onAcceptedChunk(buildAuditChunk({
          index: acceptedChunks, runId, postOffset: accepted.length,
          requestedModel: result.requestedModel, resolvedModel: result.resolvedModel, apiKey,
          posts: selected, evidenceById: prepared.evidenceById, packets: available,
        }));
      }
      accepted.push(...result.value.posts);
    } catch (error) {
      if (!(error instanceof GenerationFailedError)) throw error;
      attempts += error.attempts;
      reason = error instanceof GenerationDeadlineError ? "edition time budget exhausted" : "provider or validation budget exhausted";
      if (!accepted.length) throw error;
      break;
    }
  }
  if (accepted.length < EDITORIAL_MAX_POSTS && reason === "target reached") reason = "edition attempt budget exhausted";
  const items = enrichEditorial({ posts: accepted }, packets, now, runId);
  const summary = `[editorial] target=${EDITORIAL_MAX_POSTS} actual=${items.length} attempts=${attempts}/${EDITORIAL_MAX_ATTEMPTS} generatedDrafts=${generatedDrafts} discussionOmissions=${discussionOmissions} providerFailures=${providerFailures} rejectedResponses=${rejectedResponses} emptySelections=${emptySelections} deferredSources=${deferredSources.size} elapsedMs=${clock() - started}; ${reason}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const safe = (text: string) => redactEditorialDiagnostic(text, apiKey).replace(/[<>`|]/g, " ").slice(0, 200);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Editorial generation\n\n${summary}\n\nModels: ${[...models].map(safe).join(", ") || "none"}\n\nTopics: ${items.map(item => item.community).join(", ")}\n\nOutcome: ${items.length ? "validated candidate ready for publication" : "no-op; existing edition retained"}\n`);
  }
  return items;
}
