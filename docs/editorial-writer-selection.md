# Writer evidence selection — October 19, 2026

The thirteen-post ordinary run
[39294295875](https://github.com/ariesyous/openfeed/actions/runs/39294295875)
had zero provider failures but thirteen source-based candidate rejections, including
revisions. Repeated defects were names, ballot counts, career length, engineering
credits and location taken from reading context without selecting their evidence
in the unit making the claim. Others attributed reporter narration to a company
or introduced an unsupported causal bridge. These original decisions remain frozen.
The later partition-format run is a separate baseline, not a test of this change.

## Explicit support beside each passage

The writer now returns the title as an evidence/text passage, and bodies as ordered
paragraphs of passages. Each passage explicitly selects complete evidence groups
immediately before its text. Discussion uses the same structure. Instructions ask
for one thought per passage, selecting identity, quantity, attribution and limiting
context before composing that thought. Opinions and jokes select their factual
premise; neither needs the publisher to express the same opinion.

Code joins passages with a space and paragraphs with a blank line. It copies the
writer's words and unions only its explicit choices. Repeated support across
passages is intentional; duplicate IDs within a passage, unknown groups and old
unstructured fields fail. The title and **whole body together** must still fit six
original snippets; **each whole turn** must still fit three. Paragraphs create no
additional allowance. Atomic groups still expand to every original continuation.
There is no inferred citation, factual enrichment, prose rewrite or omitted turn.

The materialized article then passes the unchanged strict provenance, freshness,
publisher, coverage, discussion and voice gates, followed by the same separate
source-based review of its title, complete body and every complete turn. Reviews
remain at whole-unit scope and do not trust a writer's passage choices as semantic
proof. A misplaced citation, invented fact or causal bridge can still be rejected.
The compiler does not claim to check factual entailment.

## Revisions retain their support map

A withheld post's next request includes its earlier per-unit support choices,
remapped to current groups by source identity and exact quotation. A partial group,
changed quote or identical quote from another source cannot match. Unavailable
support is reported as a count. This diagnostic map neither selects evidence in the
new response nor authorizes facts: the writer must choose every passage's support
again. The goal is to fix an omission without dropping another necessary citation.
The one-revision limit and fresh mandatory review remain.

## Limits and verification

The ordinary path adds no provider call. Two-post chunks, twenty-post ceiling,
32 shared calls, three writer attempts, two review attempts and the shared
45-minute deadline are unchanged, as are model, token caps, source extraction,
four-context packets, publication limits and account/key billing limits. Historical
articles, review decisions, audit/digest contracts and retention remain unchanged.

Regressions cover explicit passage selection, natural paragraph rendering, title/body
and turn unions, unchanged whole-unit caps, malformed/unknown/duplicate choices,
no automatic filling from context or another turn, and exact revision remapping
after request-local IDs change. The existing mocked twenty-post integration still
fits the shared budget and audit bounds. Local typecheck, lint and all 373 tests pass.

`review-check.yml` with `writer_selection=true` is a manual synthetic check:
two two-post suites, at most eight
writer/reviewer calls and fifteen shared minutes, with no publication/state writes
or page retrieval. It exercises identity/count ownership, career background,
reporter attribution and technical mechanisms using the production writer prompt,
transport, local validation and reviewer. Its parsed support/decision artifact is
bounded to 192 KiB and retained fourteen days; no raw completion, reasoning or full
reading context is saved. Control results and ordinary-run yield must be recorded
separately. Neither advances the historical semantic observation cohorts.
