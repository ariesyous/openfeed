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
