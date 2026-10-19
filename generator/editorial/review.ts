import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { generateValidated, type GenerateValidatedOptions, type ParseOutcome } from "../retry";
import { ADVANCE_WORLD_TIMEOUT_MS } from "../config";
import { prepareEvidence } from "./evidence";

export interface ReviewPost {
  title: string; body: string; evidenceIds: string[];
  discussion?: { body: string; voice: string; evidenceIds: string[] }[] | null;
}
const reason = z.enum(["reversed_fact", "unsupported_claim", "missing_qualification", "misattribution", "noncontributing"]);
const TitleAttributionSchema = z.object({
  titleText: z.string().min(1).max(150),
  titleActor: z.string().min(1).max(120).nullable(),
  sourceActor: z.string().min(1).max(120).nullable(),
  sourceEvidenceId: z.string().min(1).max(40).nullable(),
  relation: z.enum(["aligned", "interpretation", "mismatch", "no_attributed_claim"]),
}).strict();
const SegmentSchema = z.object({
  text: z.string().min(1).max(1800),
  kind: z.enum(["supported_fact", "unsupported_fact", "opinion"]),
  evidenceIds: z.array(z.string().min(1).max(40)).max(6),
  explanation: z.string().min(1).max(240),
}).strict();
const CheckSchema = z.object({
  target: z.string().min(1).max(24),
  verdict: z.enum(["supported", "opinion", "reject"]),
  reason: reason.nullable(),
  claim: z.string().min(1).max(200).nullable(),
  explanation: z.string().min(1).max(400),
  evidenceIds: z.array(z.string().min(1).max(40)).max(6),
  // Historical review artifacts predate complete-text claim accounting.
  segments: z.array(SegmentSchema).min(1).max(32).optional(),
}).strict();
export const ReviewResponseSchema = z.object({
  posts: z.array(z.object({
    key: z.string().min(1).max(8), checks: z.array(CheckSchema).min(4).max(6),
    // Older bounded audits remain readable; live reviews require the trace below.
    titleAttribution: TitleAttributionSchema.optional(),
  }).strict()).min(1).max(4),
}).strict();
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
export const LiveReviewResponseSchema = ReviewResponseSchema.extend({ posts: z.array(
  ReviewResponseSchema.shape.posts.element.extend({ titleAttribution: TitleAttributionSchema,
    checks: z.array(CheckSchema.extend({ segments: z.array(SegmentSchema).min(1).max(32) })).min(4).max(6),
  }),
).min(1).max(4) });
export type ReviewInput = ReturnType<typeof buildReviewInput>;
export const reviewDigest = (post: ReviewPost) => createHash("sha256").update(JSON.stringify({
  title: post.title, body: post.body, evidenceIds: post.evidenceIds,
  discussion: post.discussion?.map(({ voice, body, evidenceIds }) => ({ voice, body, evidenceIds })),
})).digest("hex");

const wordSpans = (text: string) => [...text.matchAll(/\S+/g)].map((match, index) => ({ index, text: match[0], start: match.index }));

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
      ].map(unit => ({ ...unit, words: wordSpans(unit.text).map(({ index, text }) => ({ index, text })), selectedEvidence: unit.evidenceIds.map(id => ({
        id, text: prepared.evidenceById.get(id)!.quote,
      })) })),
      sources: prepared.sources.filter(source => source.evidence.some(entry => attached.has(prepared.evidenceById.get(entry.id)?.sourceId))),
    };
  }) };
}

const WordRange = z.object({ firstWord: z.number().int().min(0).max(1800), lastWord: z.number().int().min(0).max(1800) }).strict();
const PartitionSegment = SegmentSchema.omit({ text: true }).extend({ lastWord: WordRange.shape.lastWord }).strict();
const AttributionTransport = TitleAttributionSchema.omit({ titleText: true }).strict();
type BoundCheck = Omit<z.infer<typeof CheckSchema>, "target" | "claim" | "segments"> & {
  claim: z.infer<typeof WordRange> | null; segments: z.infer<typeof PartitionSegment>[];
  finalSegment: z.infer<typeof PartitionSegment>;
};
type BoundPost = { titleAttribution: z.infer<typeof AttributionTransport>; checks: Record<string, BoundCheck> };

/** Named required properties bind each decision to its immutable post/unit. Citations
 * are constrained where they are used, rather than a request-wide ID menu. */
export function reviewTransportSchema(input: ReviewInput) {
  const posts: Record<string, z.ZodType<BoundPost>> = {};
  for (const post of input.posts) {
    const checks: Record<string, z.ZodType<BoundCheck>> = {};
    const attached = [...new Set(post.sources.flatMap(source => source.evidence.map(entry => entry.id)))];
    for (const unit of post.units) {
      const own = z.array(z.enum(unit.evidenceIds)).max(6);
      const range = WordRange.extend({ lastWord: z.number().int().min(0).max(unit.words.length - 1),
        firstWord: z.number().int().min(0).max(unit.words.length - 1) });
      const segment = PartitionSegment.extend({ lastWord: range.shape.lastWord, evidenceIds: own });
      const passingSegment = segment.extend({ kind: z.enum(["supported_fact", "opinion"]) });
      const finalSegment = segment.extend({ lastWord: z.literal(unit.words.length - 1) });
      const base = z.object({
        // Assess the spans first, then give the unit verdict. No missing-premise
        // citation or unsupported passing ID is expressible in strict output.
        // Explicit partition ends cover from word zero through a required final
        // segment. No gap or omitted suffix is expressible, and every word still
        // receives its own model-supplied classification/support judgment.
        segments: z.array(segment).max(31), finalSegment, verdict: CheckSchema.shape.verdict,
        reason: CheckSchema.shape.reason, claim: range.nullable(),
        explanation: CheckSchema.shape.explanation, evidenceIds: CheckSchema.shape.evidenceIds,
      }).strict();
      const rejected = base.extend({ verdict: z.literal("reject"), evidenceIds: z.array(z.enum(attached)).max(6), reason,
        claim: range });
      checks[unit.target] = z.union([
        base.extend({ verdict: z.enum(["supported", "opinion"]), evidenceIds: own.min(1), reason: z.null(), claim: z.null(),
          segments: z.array(passingSegment).max(31), finalSegment: passingSegment.extend({ lastWord: z.literal(unit.words.length - 1) }) }),
        rejected,
      ]);
    }
    const attribution = AttributionTransport.extend({ sourceEvidenceId: z.enum(post.units[0].evidenceIds).nullable() });
    posts[post.key] = z.object({
      // Keep cross-field attribution consistency in the unchanged local gate.
      // Conditional post-level schemas failed the bounded DeepSeek controls.
      titleAttribution: attribution,
      checks: z.object(checks).strict(),
    }).strict();
  }
  return z.object({ posts: z.object(posts).strict() }).strict();
}

/** Explain the branch the reviewer explicitly chose, without logging its prose or
 * accepting/repairing anything. A generic union error cannot guide a bounded retry. */
function reviewSchemaIssues(issues: readonly z.core.$ZodIssue[], json: unknown, prefix: PropertyKey[] = []): z.core.$ZodIssue[] {
  return issues.flatMap(issue => {
    const path = [...prefix, ...issue.path];
    if (issue.code !== "invalid_union") return [{ ...issue, path }];
    let value: unknown = json;
    for (const key of path) value = value && typeof value === "object"
      ? (value as Record<PropertyKey, unknown>)[key] : undefined;
    const object = value && typeof value === "object" ? value as Record<string, unknown> : undefined;
    let branch: number | undefined;
    if (path.length === 4 && path[2] === "checks" && typeof object?.verdict === "string")
      branch = object.verdict === "reject" ? 1 : 0;
    const options = branch === undefined ? issue.errors : [issue.errors[branch]];
    return options.map(errors => reviewSchemaIssues(errors, json, path)).sort((a, b) => a.length - b.length)[0];
  });
}

/** Partition boundaries name immutable original words. No model-copied prose is
 * accepted or repaired. Unknown/overlapping/reversed ends and absent final judgments
 * fail closed; every word is included in an explicitly classified segment.
 * Materialize the original spans, then run ALL existing semantic-decision gates.
 */
export function validateReviewTransport(json: unknown, input: ReviewInput): ParseOutcome<ReviewResponse> {
  const parsed = reviewTransportSchema(input).safeParse(json);
  if (!parsed.success) return { ok: false, issues: reviewSchemaIssues(parsed.error.issues, json).slice(0, 8).map(issue =>
    `${issue.path.join(".")}: ${issue.message.slice(0, 250)}. Keep the declared attribution/verdict consistent; use this unit's selected IDs and explicit complete partitions`) };
  const issues: string[] = [];
  const posts = Object.entries(parsed.data.posts).map(([key, post]) => {
    const original = input.posts.find(candidate => candidate.key === key)!;
    return { key, titleAttribution: { ...post.titleAttribution, titleText: original.units[0].text },
      checks: Object.entries(post.checks).map(([target, decision]) => {
        const { segments: prefix, finalSegment, ...rest } = decision;
        const check = { ...rest, target };
        const unit = original.units.find(candidate => candidate.target === check.target);
        if (!unit) { issues.push(`${key}.${check.target}: unknown unit`); return check; }
        const words = wordSpans(unit.text);
        const span = ({ firstWord, lastWord }: z.infer<typeof WordRange>) => {
          if (lastWord < firstWord || !words[firstWord] || !words[lastWord]) {
            issues.push(`${key}.${check.target}: range is outside the original word indices`); return "";
          }
          return unit.text.slice(words[firstWord].start, words[lastWord].start + words[lastWord].text.length);
        };
        let nextWord = 0;
        const segments = [...prefix, finalSegment].map(({ lastWord, ...segment }) => {
          const firstWord = nextWord;
          nextWord = lastWord + 1;
          return { ...segment, text: span({ firstWord, lastWord }) };
        });
        if (nextWord !== words.length) issues.push(`${key}.${check.target}: ranges must end at lastWord ${words.length - 1}`);
        return { ...check, claim: check.claim === null ? null : span(check.claim), segments };
      }),
    };
  });
  if (issues.length) return { ok: false, issues: [...new Set(issues)] };
  return validateReview({ posts }, input);
}

/** Complete coverage and exact claim locations are mandatory even without structured output. */
export function validateReview(json: unknown, input: ReviewInput): ParseOutcome<ReviewResponse> {
  const parsed = LiveReviewResponseSchema.safeParse(json);
  if (!parsed.success) return { ok: false, issues: ["Return the complete editorial review schema with all posts and units"] };
  const errors: string[] = [];
  if (parsed.data.posts.length !== input.posts.length || new Set(parsed.data.posts.map(p => p.key)).size !== input.posts.length)
    errors.push("Review must cover every post exactly once");
  for (const post of parsed.data.posts) {
    const original = input.posts.find(p => p.key === post.key);
    if (!original) { errors.push("Unknown reviewed post"); continue; }
    const allowed = new Set(original.sources.flatMap(source => source.evidence.map(entry => entry.id)));
    const title = original.units.find(unit => unit.target === "title")!;
    const trace = post.titleAttribution;
    const titleCheck = post.checks.find(check => check.target === "title");
    const sourceSpan = original.sources.flatMap(source => source.evidence).find(entry => entry.id === trace.sourceEvidenceId);
    if (trace.titleText !== title.text || (trace.titleActor !== null && !title.text.includes(trace.titleActor)))
      errors.push("Title attribution must assess the exact original title and an actor actually present in it; do not silently rewrite its subject");
    if (trace.sourceEvidenceId !== null && !title.evidenceIds.includes(trace.sourceEvidenceId))
      errors.push("Title attribution must use the title's selected evidence");
    if (trace.sourceActor !== null && (!sourceSpan || !sourceSpan.text.includes(trace.sourceActor)))
      errors.push("Source actor must be an exact span of the identified selected evidence");
    if (trace.relation === "no_attributed_claim") {
      if (trace.titleActor !== null || trace.sourceActor !== null || trace.sourceEvidenceId !== null)
        errors.push("A title without an attributed claim must have null actor and source fields");
    } else if (trace.relation === "aligned" && (!trace.titleActor || !trace.sourceActor || !trace.sourceEvidenceId)) {
      errors.push("Aligned attribution requires both actors and their selected source evidence");
    } else if (trace.relation === "interpretation" && !trace.sourceEvidenceId) {
      errors.push("A title interpretation requires a selected factual premise");
    }
    if (trace.relation === "mismatch" && (!trace.titleActor || titleCheck?.verdict !== "reject" || titleCheck.reason !== "misattribution"))
      errors.push(`${post.key}.title: A title attribution mismatch must reject the title for misattribution; use verdict reject and reason misattribution without changing the actual actor judgment`);
    if (titleCheck?.reason === "misattribution" && trace.relation !== "mismatch")
      errors.push("Title rejection and attribution trace must agree about misattribution");
    if (post.checks.length !== original.units.length || new Set(post.checks.map(c => c.target)).size !== original.units.length)
      errors.push("Review every title, body and discussion turn exactly once");
    for (const check of post.checks) {
      const unit = original.units.find(u => u.target === check.target);
      if (!unit || check.evidenceIds.some(id => !allowed.has(id))) errors.push("Review target or evidence does not belong to this post");
      if (unit) {
        if (check.verdict !== "reject") for (const id of unit.evidenceIds) {
          const snippet = original.sources.flatMap(source => source.evidence).find(entry => entry.id === id);
          if (snippet && original.sources.flatMap(source => source.evidence)
            .some(entry => entry.contextGroup === snippet.contextGroup && !unit.evidenceIds.includes(entry.id)))
            errors.push("Passing units must select every part of a split source sentence; incomplete evidence groups cannot authorize publication");
        }
        const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
        if (normalize(check.segments.map(segment => segment.text).join(" ")) !== normalize(unit.text))
          errors.push("Claim segments must cover the complete unchanged unit in order, with no missing, duplicated or rewritten words");
        for (const segment of check.segments) {
          if (!normalize(unit.text).includes(normalize(segment.text)))
            errors.push("Every claim segment must be an exact span of its unit, ignoring whitespace only");
          if (segment.evidenceIds.some(id => !unit.evidenceIds.includes(id)))
            errors.push("Claim support must come only from this unit's selected evidence, never another turn or unselected context");
          if (segment.kind === "supported_fact" && !segment.evidenceIds.length)
            errors.push("Every supported factual segment requires selected evidence");
        }
        const unsupported = check.segments.some(segment => segment.kind === "unsupported_fact");
        if (unsupported && (check.verdict !== "reject" || check.reason === "noncontributing"))
          errors.push("Any unsupported factual segment must reject its unit for a factual defect");
        if (check.verdict === "reject" && check.reason !== "noncontributing" && !unsupported)
          errors.push("A factual rejection must identify an unsupported factual segment");
        if (check.verdict !== "reject" && check.evidenceIds.some(id => !unit.evidenceIds.includes(id)))
          errors.push("Every passing check citation must belong to that unit's selected evidence");
      }
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
    // Compact indices avoid resending an object/property name for every word.
    // All prose, selected support and full bounded reading context are retained.
    initialUserPrompt: JSON.stringify({ posts: input.posts.map(post => ({ ...post,
      units: post.units.map(unit => ({ ...unit, finalWordIndex: unit.words.length - 1,
        words: unit.words.map(({ index, text }) => [index, text]) })),
    })) }),
    jsonSchema: { name: "editorial_review", schema: z.toJSONSchema(reviewTransportSchema(input), { reused: "ref" }) },
    // Complete-text review plus DeepSeek's default reasoning repeatedly exhausted
    // the writer's 24k cap. Keep review reasoning quality and allow output headroom.
    maxTokens: 48_000, timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    parse: json => validateReviewTransport(json, input),
  });
  return result;
}
