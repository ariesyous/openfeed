import { readFileSync } from "node:fs";
import { z } from "zod";
import { FeedItemSchema, type FeedItem } from "../../schemas";
import { generateValidated, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
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
// Strict structured output requires all object properties to be required. Nullable
// transport fields represent omitted optional fields; local parsing normalizes them.
const ResponseSchema = DraftSchema.extend({
  posts: z.array(DraftSchema.shape.posts.element.extend({
    topic: z.enum(TOPICS).nullable(),
    discussion: z.array(DiscussionTurn).min(2).max(4).nullable(),
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
  const result = await generateValidated({
    ...dependencies,
    apiKey,
    jsonSchema: EDITORIAL_JSON_SCHEMA,
    systemPrompt: readFileSync(new URL("./prompt.md", import.meta.url), "utf8"),
    initialUserPrompt: JSON.stringify({
      now: now.toISOString(),
      sources: packets,
      recentEditions,
      maxPosts: EDITORIAL_MAX_POSTS,
    }),
    parse: (json) => validateDraft(json, packets, now),
    maxTokens: ADVANCE_WORLD_MAX_TOKENS,
    timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    onAttempt: (info) => logEditorialAttempt(info, apiKey, Date.now() - started),
  });
  console.log(`[editorial] completed in ${result.attempts} attempt(s); structured output: ${result.usedStructuredOutput}`);
  return enrichEditorial(result.value, packets, now, runId);
}
