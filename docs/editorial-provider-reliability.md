# Provider and review reliability — October 19, 2026

The first throughput implementation published sixteen articles in
[39201229564](https://github.com/ariesyous/openfeed/actions/runs/39201229564) and
eight in [39259511428](https://github.com/ariesyous/openfeed/actions/runs/39259511428).
Both deployed, and all twenty-four public articles matched their approved review
digests and complete unit ledgers. Both retained required discussions and had no
leaked evidence labels. This verified publication, not a new semantic audit.

| Run | Published | Calls | Completed reviews | Withheld candidates | Provider failures | Stop |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 39201229564 | 16 | 32 | 14 | 8 | 3 | Call budget |
| 39259511428 | 8 | 28 | 10 | 10 | 5 | 45-minute deadline |
| 39294295875 | 13 | 32 | 13 | 13 | 0 | Call budget |

The second run had two writer completions empty at the token limit, a terminated
response, another empty completion and a final response timeout. Three review
attempts failed local validation: a title actor absent from the title, a missing
passing-premise citation, and support borrowed from another unit. Those responses
were rejected correctly. Increasing throughput must remove avoidable work rather
than accept them. The first run's review/support audits were 327,010/51,712 bytes;
the second's review audit was 266,598 bytes, within the unchanged 512-KiB limits.

## Transport and routing

Requests now stream Chat Completions, using OpenRouter's documented SSE heartbeats
to avoid a completely idle connection during long generations. The bounded parser
handles split UTF-8, line endings, comments and repeated terminal usage frames. It
discards reasoning as frames arrive. It requires a terminal choice and `[DONE]`;
a valid JSON prefix, disconnection, malformed event or mid-stream error cannot
release a completion. Every completed response still passes the same JSON and
local evidence/review validation. No partial output is salvaged or JSON repaired.
The stream has an 8-MiB wire bound and the same per-call/edition deadlines. JSON
responses remain supported for provider errors and transport compatibility.

Provider preferences sort the same DeepSeek Flash model's endpoints by throughput,
require support for requested parameters, and retain same-model fallbacks. There
is no provider blacklist, alternate model, priority-tier suffix or reasoning change.
Writer/reviewer token caps remain 24,000/48,000. Routing can change per-token cost;
no account billing limit or key limit is changed. Authentication/billing failures
remain fatal, including streamed errors. Streaming cannot prevent a model from
using its entire token budget without producing a final answer.

References: [OpenRouter streaming](https://openrouter.ai/docs/api/reference/streaming)
and [provider selection](https://openrouter.ai/docs/guides/routing/provider-selection).
The changes are a reliability hypothesis to measure, not an uptime guarantee.

## Smaller choices and fewer malformed reviews

Two-post sectioned writer requests now offer four complete source contexts instead
of eight. Each offered source keeps all its existing bounded paragraphs and evidence;
the remaining candidates stay eligible for later requests. Legacy evidence preparation
retains its previous bounds. Sources, snippets, sentence groups, publisher allowances,
freshness and extraction checks are unchanged. A pending revision is prioritized,
then other eligible sources fill the packet so a single revision can share its
writer/reviewer pair with a new article. Every article still receives fresh review.

Reviewer responses use required named post/unit objects rather than freely selected
array keys. The request schema binds each segment's citation menu to that unit's
selected IDs, and passing check citations must be nonempty and from that unit.
Rejected checks can still identify contradictions in other attached evidence, or
have no citation when support is missing. They cannot add support to the candidate.
Unstructured fallback must match the same schema. Word indices retain exact original
ranges; compact `[index, word]` input pairs remove repeated JSON property names.
Shared JSON-schema definitions avoid expanding repeated constraints. All candidate
text, selected quotations and complete bounded source reading context remain.

Code materializes the named decisions back into the original audit contract before
the unchanged full-coverage, provenance, attribution and claim-accounting gates.
Unknown/missing units, gaps, borrowed support, fabricated actors and unsupported
passing segments still fail. No accepted article, rejected historical decision or
publication identity is rewritten. Reviews remain fallible semantic judgments.

## Verification

Regressions cover streamed partial JSON, missing terminal markers, malformed/error
frames, split Unicode, discarded reasoning, fatal key errors, same-unit schema
boundaries, empty passing-premise citations, full source context, and fresh review
of a revision paired with a new article. The existing twenty-post integration and
strict validation regressions remain. Live controls and ordinary-run performance
must be recorded separately; synthetic controls do not establish consistent yield.

Typecheck, lint, all 366 tests and the production build passed locally; the archive
retained all 2,407 permanent articles. Linux CI
[39293453033](https://github.com/ariesyous/openfeed/actions/runs/39293453033)
passed the same checks on implementation `f8872ae`.

Live control [39293451703](https://github.com/ariesyous/openfeed/actions/runs/39293451703)
passed all four existing suites on that implementation: eight deliberately wrong
posts were withheld, and eight supported or opinionated counterparts passed.
Every suite passed its first call, with no transport or local-validation retry;
four DeepSeek Flash calls took 127,470 ms. The previous throughput controls used
five calls and 318,509 ms. This is one small synthetic comparison, not a prediction
of ordinary latency or general accuracy. The bounded original decisions are in
`fixtures/editorial-provider-controls-20261019.json`; earlier fixtures remain frozen.

A fresh read-only intake against the current durable coverage returned 44 usable
unused sources across twelve publisher groups and 22 distinct-source slots under
the unchanged two-per-group rule. This is supply before editorial rejection, not
a promise of twenty articles. It predates the ordinary run below.

## First ordinary run and final review-format follow-up

[39294295875](https://github.com/ariesyous/openfeed/actions/runs/39294295875), on
merged implementation `01316a3`, published thirteen articles in 1,695,953 ms
(28 minutes 16 seconds), with **zero provider failures**. Its thirteen completed
reviews assessed twenty-six candidates and withheld thirteen. All thirteen published
articles matched their approved digests, complete unit ledgers and attached source
URLs on the live site, with required discussions and no evidence-label leakage.
Deployment [39298349492](https://github.com/ariesyous/openfeed/actions/runs/39298349492)
succeeded. The review audit was 349,104 bytes. Original decisions remain frozen.

Three malformed review calls still consumed the budget: one omitted a title's final
word, another omitted a turn's final word, and the last combined unsupported segments
and a title-attribution mismatch with passing decisions. That final response did not
authorize its two candidates, which were withheld. Two writer retries caught process
commentary and an excessive expanded evidence allowance. This is a concrete improvement
in provider reliability and elapsed time, not evidence of consistent twenty-post yield.
The source-based rejections remain part of the strict publication boundary.

The follow-up transport lets reviewers explicitly classify contiguous partitions using
inclusive lastWord boundaries. Prefix segments start at zero/after the preceding end;
a required finalSegment explicitly classifies the remaining suffix and has the unit's
final word fixed in the request schema. A short unit can consist solely of that final
judgment. No missing suffix is filled after the response: an absent final judgment,
wrong final index, reversed/repeated end, forbidden firstWord or unknown property fails.
Every unchanged word still receives a model-supplied support/opinion judgment, and the
materialized original spans pass the unchanged complete-coverage and evidence gates.
There are still at most 32 segments total, with the same span/explanation bounds.

Passing transport branches cannot contain unsupported_fact segments. The unchanged
local attribution gate requires any mismatch judgment to reject the title with reason
misattribution. Local consistency checks remain authoritative after materialization
and in JSON fallback. No inconsistent response can authorize publication; the model's
factual classifications remain fallible.
The writer also receives concrete examples of the observed first-name, count,
background-credit, narration/statement and causal-bridge selection errors. These are
guidance, not a new semantic gate, and preserve grounded opinions and banter.

The first follow-up control,
[39299176126](https://github.com/ariesyous/openfeed/actions/runs/39299176126),
passed the reversal suite, then exhausted both attempts on local object-schema
validation for the two wrong-title controls. The generic union errors identified
only the posts, not their conflicting fields. That implementation was not merged.
Retry diagnostics now report bounded leaf-field issues from the explicitly declared
attribution/verdict branch. They retain no candidate prose or raw completion and
change no acceptance rule. This failed control remains distinct from later results.

The diagnostic follow-up,
[39299993544](https://github.com/ariesyous/openfeed/actions/runs/39299993544),
again passed the first suite but failed twice on title reasons required by a
conditional post-level schema. That conditional transport was retired rather than
shipping a format that repeatedly exhausted review attempts. The same title
consistency requirement remains enforced locally, with a specific post/title retry
instruction. Required units, same-unit IDs, segment bounds and complete claim
accounting were not relaxed. Diagnostics now preserve full post/unit paths through
nested schema errors, and each input unit explicitly supplies finalWordIndex.

Final compatible control
[39300768072](https://github.com/ariesyous/openfeed/actions/runs/39300768072)
on `c3bf9ab` passed all four suites on their first attempts: eight wrong candidates
withheld and eight supported/opinionated counterparts allowed, in four DeepSeek
Flash calls and 109,239 ms. The exact bounded decisions are retained separately in
`fixtures/editorial-review-partition-controls-20261019.json`. Linux
[CI](https://github.com/ariesyous/openfeed/actions/runs/39300776580) passed typecheck,
lint, all 367 tests and the production build retaining 2,420 permanent articles.
This verifies the targeted controls and compatibility, not final-format ordinary
yield or general semantic accuracy. The two failed conditional-format controls and
the original thirteen-post edition remain unchanged.
