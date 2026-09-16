import { readFileSync } from "node:fs";
import { z } from "zod";
import { FeedItemSchema, type FeedItem } from "../../schemas";
import { generateValidated, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence, type EvidenceEntry } from "./evidence";
import { logEditorialAttempt } from "./diagnostics";
import { FORMATS, TOPICS } from "./accounts";
import type { SourcePacket } from "./sources";

export const EDITORIAL_MAX_POSTS = 4;

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
const EvidenceIds = z.array(z.string().min(1).max(40)).min(1).max(3);
const ResponseSchema = z.object({
  posts: z.array(DraftSchema.shape.posts.element.omit({
    sourceIds: true, evidence: true, discussion: true,
  }).extend({
    topic: z.enum(TOPICS).nullable(),
    evidenceIds: EvidenceIds,
    discussion: z.array(DiscussionTurn.omit({ evidence: true }).extend({
      evidenceIds: EvidenceIds,
    })).min(2).max(4).nullable(),
    spoilers: z.boolean().nullable(),
  })).max(EDITORIAL_MAX_POSTS),
});
export const EDITORIAL_JSON_SCHEMA = {
  name: "editorial_edition",
  schema: z.toJSONSchema(ResponseSchema),
};

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
        source.publisher,
        (publishers.get(source.publisher) ?? 0) + 1,
      );
      if ((publishers.get(source.publisher) ?? 0) > 2)
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
  dependencies: { fetchImpl?: typeof fetch; sleepImpl?: (ms: number) => Promise<void> } = {},
): Promise<FeedItem[]> {
  const started = Date.now();
  const prepared = prepareEvidence(packets);
  if (!prepared.sources.length) return [];
  const result = await generateValidated({
    ...dependencies,
    apiKey,
    jsonSchema: EDITORIAL_JSON_SCHEMA,
    systemPrompt: readFileSync(new URL("./prompt.md", import.meta.url), "utf8"),
    initialUserPrompt: JSON.stringify({
      now: now.toISOString(),
      sources: prepared.sources,
      recentEditions,
      maxPosts: EDITORIAL_MAX_POSTS,
    }),
    parse: (json) => validateCitedDraft(json, prepared.evidenceById, packets, now),
    maxTokens: ADVANCE_WORLD_MAX_TOKENS,
    timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    onAttempt: (info) => logEditorialAttempt(info, apiKey, Date.now() - started),
  });
  console.log(`[editorial] completed in ${result.attempts} attempt(s); structured output: ${result.usedStructuredOutput}`);
  return enrichEditorial(result.value, packets, now, runId);
}
