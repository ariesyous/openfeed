import type { reviewEditorial } from "../../editorial/review";

// Existing suites isolate writer/provenance behavior. The dedicated review suite
// exercises real reviewer calls, failures, decisions and the shared provider budget.
export async function approveReview(options: Parameters<typeof reviewEditorial>[0]) {
  const input = { posts: options.posts.map((post, index) => ({ key: `P${index + 1}`, units: [
    { target: "title", evidenceIds: post.evidenceIds }, { target: "body", evidenceIds: post.evidenceIds },
    ...(post.discussion ?? []).map((turn, i) => ({ target: `discussion.${i}`, evidenceIds: turn.evidenceIds })),
  ] })) };
  return { value: { posts: input.posts.map(post => ({ key: post.key,
    checks: post.units.map(unit => ({ target: unit.target, verdict: "supported" as const,
      reason: null, claim: null, explanation: "Mock approval for writer-focused tests.", evidenceIds: unit.evidenceIds.slice(0, 1) })),
  })) }, attempts: 0, modelUsed: "test/reviewer", requestedModel: "test/reviewer", resolvedModel: "test/reviewer", usedStructuredOutput: true };
}
