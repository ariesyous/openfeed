import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { generateValidated, type GenerateValidatedOptions, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_MAX_TOKENS, ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence } from "./evidence";

export interface ReviewPost {
  title: string; body: string; evidenceIds: string[];
  discussion?: { body: string; voice: string; evidenceIds: string[] }[] | null;
}
const reason = z.enum(["reversed_fact", "unsupported_claim", "missing_qualification", "misattribution", "noncontributing"]);
const CheckSchema = z.object({
  target: z.string().min(1).max(24),
  verdict: z.enum(["supported", "opinion", "reject"]),
  reason: reason.nullable(),
  claim: z.string().min(1).max(200).nullable(),
  explanation: z.string().min(1).max(400),
  evidenceIds: z.array(z.string().min(1).max(40)).max(3),
}).strict();
export const ReviewResponseSchema = z.object({
  posts: z.array(z.object({
    key: z.string().min(1).max(8), checks: z.array(CheckSchema).min(4).max(6),
  }).strict()).min(1).max(4),
}).strict();
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export type ReviewInput = ReturnType<typeof buildReviewInput>;
export const reviewDigest = (post: ReviewPost) => createHash("sha256").update(JSON.stringify({
  title: post.title, body: post.body, evidenceIds: post.evidenceIds,
  discussion: post.discussion?.map(({ voice, body, evidenceIds }) => ({ voice, body, evidenceIds })),
})).digest("hex");

export function buildReviewInput(posts: ReviewPost[], prepared: ReturnType<typeof prepareEvidence>) {
  const sourceIds = (ids: string[]) => new Set(ids.map(id => prepared.evidenceById.get(id)?.sourceId));
  return { posts: posts.map((post, index) => {
    const attached = sourceIds(post.evidenceIds);
    return {
      key: `P${index + 1}`,
      units: [
        { target: "title", text: post.title, evidenceIds: post.evidenceIds },
        { target: "body", text: post.body, evidenceIds: post.evidenceIds },
        ...(post.discussion ?? []).map((turn, i) => ({ target: `discussion.${i}`, text: turn.body, evidenceIds: turn.evidenceIds })),
      ],
      sources: prepared.sources.filter(source => source.evidence.some(entry => attached.has(prepared.evidenceById.get(entry.id)?.sourceId))),
    };
  }) };
}

/** Complete coverage and exact claim locations are mandatory even without structured output. */
export function validateReview(json: unknown, input: ReviewInput): ParseOutcome<ReviewResponse> {
  const parsed = ReviewResponseSchema.safeParse(json);
  if (!parsed.success) return { ok: false, issues: ["Return the complete editorial review schema with all posts and units"] };
  const errors: string[] = [];
  if (parsed.data.posts.length !== input.posts.length || new Set(parsed.data.posts.map(p => p.key)).size !== input.posts.length)
    errors.push("Review must cover every post exactly once");
  for (const post of parsed.data.posts) {
    const original = input.posts.find(p => p.key === post.key);
    if (!original) { errors.push("Unknown reviewed post"); continue; }
    const allowed = new Set(original.sources.flatMap(source => source.evidence.map(entry => entry.id)));
    if (post.checks.length !== original.units.length || new Set(post.checks.map(c => c.target)).size !== original.units.length)
      errors.push("Review every title, body and discussion turn exactly once");
    for (const check of post.checks) {
      const unit = original.units.find(u => u.target === check.target);
      if (!unit || check.evidenceIds.some(id => !allowed.has(id))) errors.push("Review target or evidence does not belong to this post");
      if (check.verdict === "reject") {
        if (!check.reason || !check.claim || !unit?.text.includes(check.claim)) errors.push("Rejected units require a reason and exact short claim from that unit");
        if (check.reason === "noncontributing" && !check.target.startsWith("discussion.")) errors.push("Contribution judgments apply only to discussion turns");
      } else if (check.reason !== null || check.claim !== null) errors.push("Passing units must have null rejection reason and claim");
      if (check.verdict !== "reject" && !check.evidenceIds.some(id => unit?.evidenceIds.includes(id)))
        errors.push("Passing units must identify their selected factual premise");
    }
  }
  return errors.length ? { ok: false, issues: [...new Set(errors)] } : { ok: true, value: parsed.data };
}

export async function reviewEditorial(options: {
  posts: ReviewPost[]; prepared: ReturnType<typeof prepareEvidence>;
} & Pick<GenerateValidatedOptions<ReviewResponse>, "apiKey" | "maxAttempts" | "deadlineMs" | "fetchImpl" | "sleepImpl" | "nowImpl" | "onAttempt">) {
  const input = buildReviewInput(options.posts, options.prepared);
  const result = await generateValidated({
    ...options,
    systemPrompt: readFileSync(new URL("./review-prompt.md", import.meta.url), "utf8"),
    initialUserPrompt: JSON.stringify(input),
    jsonSchema: { name: "editorial_review", schema: z.toJSONSchema(ReviewResponseSchema) },
    maxTokens: ADVANCE_WORLD_MAX_TOKENS, timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    parse: json => validateReview(json, input),
  });
  return result;
}
