# Qualifications and discussion contribution — October 18, 2026

October 19 update: [higher throughput and atomic evidence/review transports](editorial-throughput.md) supersedes the earlier capacity, writer-selection and prose-copy transport details below. Source checks and historical records remain compatible.

The first richer-context edition showed two distinct problems: an offered mechanism
could lose its nearby scope at the snippet cap, and discussions could repeat one point
across multiple voices. The reader explicitly requested another implementation and live
review while keeping banter on every published post.

## Context and support

Sectioned sources now include `readingContext`: the extracted sections in their original
order, with original paragraph breaks. This is at most 6,000 text characters per source,
and only included when every section belongs to the source excerpt. At most eight such
sources are offered, so the added reading text is bounded to 48,000 characters per request.
There are no extra article requests and no relaxed domain, extraction or date rules.
The original 24 snippets per sectioned source, exact quote bounds and 192-snippet request
ceiling remain unchanged. Legacy/evergreen fixtures retain their previous evidence shape.

This deliberately increases prompt context instead of trying to identify qualifications
through a keyword heuristic. The model must read it for scope, attribution, alternatives
and what happened next. Context can constrain or invalidate a proposed angle, but only
numbered evidence IDs authorize factual claims. If the necessary qualification cannot be
cited, the writer must narrow or skip the claim. Context remains untrusted publisher text.

Bodies can cite one to six IDs, up from three, so identities and limiting clauses need
not compete with the mechanism for the same three slots. Discussion turns retain their
one-to-three-ID limit and must cite sources attached to the parent. Exact matching,
freshness, duplicate coverage and cross-chunk publisher limits remain authoritative.
The bounded audit permits 72 selected snippets per four-post chunk: four times six body
IDs plus four times four turns times three IDs. Reading context is neither published
nor copied into the selected-support audit. The 512-KB audit ceiling remains unchanged.

More context does not automatically make a draft faithful. The prompt explicitly preserves
the difference between a reported belief and an established result, one programme and
its replacement, a regional restriction and a universal rule, and a limited assessment
and a sweeping verdict. A later rebuttal cannot repair an earlier unsupported premise.

## Discussion

Two turns are the default; three or four are allowed when they add a distinct supported
detail, challenge, interpretation or joke. There is no minimum length, mandatory synthesis
or fixed Take/Pushback/Reply/Context sequence. The first turn should start where the body
leaves off, and the next should engage it. Humour, strong tastes and playful disagreement
remain explicitly welcome. A new fact is not required for a new contribution.

A conservative guard catches near-verbatim repetition of the body or a previous turn:
for turns of at least 16 normalized words, at least 85% must be covered by matching
four-word phrases for rejection. It returns a bounded correction instruction and uses
the existing shared retry budget. It never strips a sentence, deletes a turn or publishes
a bare parent. Historical validators retain compatibility. The guard does not detect
all paraphrased repetition, determine semantic novelty, or certify factual correctness.

## Verification and live-review criteria

Synthetic regressions cover scope following a mechanism in a multi-section report,
programme replacement and attributed beliefs, context bounds, context in the actual
provider request, non-publication of context, six body versus three turn citations,
full bounded audit capacity, genuine responsive banter, and repetition retries through
structured and fallback generation. Existing reviewed evidence fixtures remain unchanged.
Typecheck, lint and production build passed locally. The full Windows suite had 298
passes and the same seven pre-existing symlink/path/line-ending failures; all new tests
passed. Linux deployment checks remain the publication gate.

The next live review should inspect every new body and turn against selected support
and current sources, identify whether qualifications survive, and distinguish substantive
response from paraphrase. Keep the model the same as the preceding DeepSeek run and
record source scarcity, retries and context limitations. A fresh edition can be empty
when no unused material qualifies; never revive covered URLs to manufacture a sample.
