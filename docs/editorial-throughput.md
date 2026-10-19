# Generation capacity and reliability — October 19, 2026

Follow-up: [provider and review reliability](editorial-provider-reliability.md)
records the first two ordinary generation results (sixteen and eight articles)
and the subsequent transport, request-schema and revision-batching improvements.

The reader requested substantially more articles without weaker source checks.
[39196115867](https://github.com/ariesyous/openfeed/actions/runs/39196115867) had
15 usable sources, six reviewed candidates, five reviewer rejections and two writer
responses with incomplete sentence selections. It published one post after eight
calls. [39198037811](https://github.com/ariesyous/openfeed/actions/runs/39198037811)
failed both review attempts because copied claim spans did not reproduce the prose.

## Capacity

The ceiling is now **20 posts**, with **32 shared provider attempts** and the same
45-minute deadline/55-minute workflow timeout. Ordinary writer/reviewer chunks stay
at two posts. Writers have at most three local attempts (including schema fallback);
reviewers have at most two. A writer must leave a call for review. Ten flawless pairs
can produce twenty; retries, rejections, time and sources reduce the result. The larger
budget can spend more API credit; billing/key limits are never raised. DeepSeek Flash,
default reasoning and token limits are unchanged.

Intake retains at most 24 dated entries per fixed feed (formerly eight), then considers
at most 72 article-context candidates and six per publisher group,
with four concurrent fetches. Publication still permits only **two distinct sources
per publisher group** across the edition. Only inspected adapters or substantial full
feed content qualify. HTTPS/host checks, redirect rejection, 20-second/1-MB bounds,
date rules, complete paragraphs and the 6,000-character context cap remain.

Four explicit adapters add Ars Technica, MIT News, Aeon essays and JSTOR Daily. Ars
requires one `article.h-entry` and reads only separate `div.post-content` blocks;
intervening modules and author bios do not join the body. MIT uses the inner article
body, Aeon requires its essay/drop-cap body (excluding audio labels and pull quotes),
and JSTOR excludes its inline signup module. Missing/ambiguous bodies fail closed.
Eight retrieved-page checks are recorded in
`fixtures/editorial-throughput-layouts-20261019.json`: five qualify, three are skipped.
NASA's inspected image layouts and oversized AWS pages were not admitted by weakening
the parser. Covered pages used for layout inspection are never revived for generation.

The final local live intake snapshot returned 35 unused sources across ten publisher
groups, versus 15 in the reported run. With two groups supplying only one source each,
that snapshot permits at most 18 distinct source uses, before editorial rejection.
This is a supply snapshot, not a post-count promise or a recurring-quality result.

## Evidence choices and review ranges

`selection.ts` offers whole sentence groups as `S1G1` choices with a `snippetCount`.
The writer returns `evidenceGroupIds`. Code resolves each explicitly selected group
to all its original snippet IDs before the existing `validateCitedDraft` gates. It
does not repair an incomplete model-supplied snippet selection. Unknown groups,
legacy fields and duplicate choices fail. Expanded support still fits six snippets
per parent and three per turn; over-budget choices retry. Groups retain the existing
paragraph/section and short-qualification handling; omitted modules never join. Sources without a discussion-sized group are
skipped. Quotes remain exact, bounded source substrings. Review, digests, audits and
publication retain the original snippet contract and historical compatibility.
The process-commentary guard rejects new `S1G1` labels in reader-facing prose as well
as the existing snippet-label patterns; ordinary TV episode notation remains valid.

The transport places support before title/body/turn prose as well as instructing the
writer to plan that support first, selecting identity, antecedents, scope and
qualifications for each unit. Reading context constrains claims; it cannot add facts.

Each unchanged title/body/turn includes indexed words. Review segments and offending
claims use inclusive `firstWord`/`lastWord` ranges. Code requires complete, ordered,
non-overlapping coverage through the final word, materializes exact original spans,
then calls the existing live review validator. Unknown posts/targets, missing units,
borrowed citations, incomplete support, unsupported passing segments and attribution
mismatches still fail. Models cannot submit rewritten span text. Code records the
exact original title; actor/source attribution is still reviewed.

All semantic judgments remain required and fallible. Removing prose-copy failures
does not certify accuracy. Persisted audits retain complete original spans, rejected
candidates and digests, without index tables or reading context. Record/chunk counts
accommodate 32 calls; 512-KiB byte bounds, redaction, 14-day retention and blocking
audit-persistence failures remain unchanged.

## Recovery

A withheld candidate gets one deliberate whole-post revision using its source titles,
original prose and precise rejection feedback. Feedback is not evidence. The revision
must pass every provenance, discussion, cross-chunk and fresh-review gate. Approved
neighbors are never rewritten. A second rejection defers the source for this run.
No rejected or merely fetched source is durably marked covered.

Exhausted local retries withhold candidates and try other unused sources under the
same shared limits, even before the first approval. Fatal HTTP/provider authentication,
permission and billing errors stop further calls; earlier reviewed chunks can still
be retained. Empty/failed editions preserve history.

## Verification

Offline regressions reproduce split-sentence and prose-copy failures, unknown groups,
expanded citation budgets, fabricated quotes, missing/overlapping/reordered ranges,
cross-unit support, fatal key limits, fresh review of revisions and recovery after two
malformed reviews. A mocked integration produces twenty articles after a transient
failure and persists all ten review/support chunks within the audit bound. These tests
establish contracts and capacity, not live accuracy or a guaranteed twenty-post yield.
Live controls and ordinary-run yield require separate observation. Historical review
counts, original publications and audits remain unchanged.

## Live control gate

[39200596347](https://github.com/ariesyous/openfeed/actions/runs/39200596347), on
implementation `207e6cd`, passed all four synthetic suites: eight deliberately wrong
candidates were withheld and eight supported/opinionated counterparts passed. This
includes the formerly unrun population/antecedent and reporter-attribution suite.
Five DeepSeek Flash calls took 318,509 ms. The first three suites passed immediately;
the fourth needed a retry after omitting a selected-premise citation. The original
local gate rejected that incomplete response. There were no prose-copy/range failures.
The bounded original decisions are retained in
`fixtures/editorial-throughput-controls-20261019.json`; they are synthetic controls,
not ordinary-edition observations or proof of general semantic accuracy.

Linux [validation](https://github.com/ariesyous/openfeed/actions/runs/39200844785)
passed typecheck, lint, all 355 tests and the production build. The local rebased build
also retained all 2,383 articles. A further live intake against the latest coverage
state returned 36 sources/eleven publisher groups, with nineteen source slots before
editorial rejection. Availability varies; ordinary generation yield remains to be measured.
