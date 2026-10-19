/** Synthetic writer fixtures use one snippet per sentence. Keep their historical
 * snippet form for direct validator tests; emit explicit group choices on the wire.
 */
export function writerFixture(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(writerFixture);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => key === "evidenceIds"
    ? ["evidenceGroupIds", (entry as string[]).map(id => id.replace(/^S(\d+)E(\d+)$/, "S$1G$2"))]
    : [key, writerFixture(entry)]));
}

import type { ReviewResponse } from "../../editorial/review";
export function reviewFixture(value: ReviewResponse) {
  return { posts: value.posts.map(post => ({ ...post,
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
  })) };
}
