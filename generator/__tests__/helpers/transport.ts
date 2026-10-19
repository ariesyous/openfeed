/** Synthetic fixtures keep historical prose/snippet forms for direct validators.
 * Mock writer responses explicitly choose the same groups for their passages.
 */
export function writerFixture(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(writerFixture);
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const groups = obj.evidenceGroupIds ?? (Array.isArray(obj.evidenceIds)
    ? obj.evidenceIds.map(id => String(id).replace(/^S(\d+)E(\d+)$/, "S$1G$2")) : undefined);
  if (typeof obj.body === "string" && groups) {
    const { evidenceIds: _ids, evidenceGroupIds: _groups, title, ...rest } = obj;
    void _ids; void _groups;
    const passage = (text: string) => ({ evidenceGroupIds: groups, text });
    return { ...Object.fromEntries(Object.entries(rest).map(([key, entry]) => [key, writerFixture(entry)])),
      ...(typeof title === "string" ? { title: passage(title) } : {}),
      body: obj.body.split("\n\n").map(paragraph => [passage(paragraph)]),
    };
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => key === "evidenceIds"
    ? ["evidenceGroupIds", (entry as string[]).map(id => id.replace(/^S(\d+)E(\d+)$/, "S$1G$2"))]
    : [key, writerFixture(entry)]));
}

import type { ReviewResponse } from "../../editorial/review";
export function reviewFixture(value: ReviewResponse) {
  return rangeReviewFixture({ posts: value.posts.map(post => ({ ...post,
    titleAttribution: post.titleAttribution && Object.fromEntries(Object.entries(post.titleAttribution).filter(([key]) => key !== "titleText")),
    checks: post.checks.map(check => {
      let nextWord = 0;
      return { ...check, claim: check.claim === null ? null : { firstWord: 0, lastWord: 0 },
        segments: check.segments?.map(({ text, ...segment }) => {
          const firstWord = nextWord; nextWord += text.trim().split(/\s+/).length;
          return { ...segment, firstWord, lastWord: nextWord - 1 };
        }),
      };
    }),
  })) });
}

/** Adapt synthetic range arrays to the required per-post/per-unit wire objects. */
export function rangeReviewFixture(value: { posts: { key: string; titleAttribution: unknown; checks: { target: string }[] }[] }) {
  return { posts: Object.fromEntries(value.posts.map(({ key, titleAttribution, checks }) => [key, {
    titleAttribution, checks: Object.fromEntries(checks.map(({ target, ...check }) => {
      const { segments, ...rest } = check as typeof check & { segments?: { firstWord: number; lastWord: number; [key: string]: unknown }[] };
      let nextWord = 0;
      const partitions = segments?.map(({ firstWord, lastWord, ...segment }) => {
        const invalidStart = firstWord !== nextWord; nextWord = lastWord + 1;
        // Preserve deliberate malformed fixture starts as forbidden wire fields.
        return { ...segment, lastWord, ...(invalidStart ? { firstWord } : {}) };
      });
      return [target, { ...rest, segments: partitions?.slice(0, -1), finalSegment: partitions?.at(-1) }];
    })),
  }])) };
}
