import { appendFileSync, readFileSync } from "node:fs";
import { z } from "zod";
import { FeedItemSchema, type FeedItem } from "../../schemas";
import { generateValidated, GenerationDeadlineError, GenerationFailedError, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence, type EvidenceEntry } from "./evidence";
import { logEditorialAttempt } from "./diagnostics";
import { coverageTitle } from "./coverage";
import { editorialVoiceIssues } from "./voice";
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
    })).min(2).max(4).nullable(),
    spoilers: z.boolean().nullable(),
  })).max(maxPosts),
  });
}
const ResponseSchema = responseSchema(z.string().min(1).max(40));
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
      const evidence = post.evidence.find((e) => e.sourceId === id);
      if (
        !evidence ||
        evidence.quote.trim().split(/\s+/).length > 25 ||
        !(
          source.title.includes(evidence.quote) ||
          source.excerpt.includes(evidence.quote)
        )
      )
        issues.push(`Missing or unsupported evidence for ${id}`);
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
): ParseOutcome<Draft> {
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) return {
    ok: false,
    issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
  const issues: string[] = [];
  const resolve = (ids: string[], path: string) => ids.flatMap((id) => {
    const entry = evidenceById.get(id);
    if (!entry) { issues.push(`${path}: unknown evidence ID ${id}; select a supplied ID`); return []; }
    return [entry];
  });
  const posts = parsed.data.posts.map((post, index) => {
    const evidence = resolve(post.evidenceIds, `posts.${index}.evidenceIds`);
    return {
      ...post,
      evidence,
      sourceIds: [...new Set(evidence.map((entry) => entry.sourceId))],
      discussion: post.discussion?.map((turn, turnIndex) => ({
        ...turn,
        evidence: resolve(turn.evidenceIds, `posts.${index}.discussion.${turnIndex}.evidenceIds`),
      })),
    };
  });
  if (issues.length) return { ok: false, issues };
  // Same provenance, freshness, duplicate-coverage and discussion-source checks as before.
  return validateDraft({ posts }, packets, now);
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
  dependencies: { fetchImpl?: typeof fetch; sleepImpl?: (ms: number) => Promise<void>; nowImpl?: () => number } = {},
): Promise<FeedItem[]> {
  const clock = dependencies.nowImpl ?? Date.now;
  const started = clock();
  const deadlineMs = started + EDITORIAL_TIME_BUDGET_MS;
  const accepted: Draft["posts"] = [];
  // Empty selections are deferred only for this run, never marked as published.
  const deferredSources = new Set<string>();
  let emptySelections = 0;
  let attempts = 0;
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
          const draft = validateCitedDraft(json, prepared.evidenceById, available, now);
          if (!draft.ok) return draft;
          if (draft.value.posts.length > maxPosts) return { ok: false, issues: [`At most ${maxPosts} posts remain in this edition`] };
          const titles = [...accepted, ...draft.value.posts].map(post => post.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
          if (new Set(titles).size !== titles.length) return { ok: false, issues: ["Duplicate article title in this edition"] };
          const combined = validateDraft({ posts: [...accepted, ...draft.value.posts] }, packets, now);
          return combined.ok ? draft : combined;
        },
        maxTokens: ADVANCE_WORLD_MAX_TOKENS, timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
        onAttempt: (info) => logEditorialAttempt({ ...info, attempt: attempts + info.attempt }, apiKey, clock() - started),
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
  const summary = `[editorial] target=${EDITORIAL_MAX_POSTS} actual=${items.length} attempts=${attempts}/${EDITORIAL_MAX_ATTEMPTS} emptySelections=${emptySelections} deferredSources=${deferredSources.size} elapsedMs=${clock() - started}; ${reason}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const safe = (text: string) => text.replace(/[\r\n<>`|]/g, " ").slice(0, 200);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Editorial generation\n\n${summary}\n\nModels: ${[...models].map(safe).join(", ") || "none"}\n\nTopics: ${items.map(item => item.community).join(", ")}\n\nOutcome: ${items.length ? "validated candidate ready for publication" : "no-op; existing edition retained"}\n`);
  }
  return items;
}
