# Selected-evidence review and label corrections — October 18, 2026

The generator now requires complete, ordered claim accounting for every title, body
and discussion turn. Each factual segment must cite that unit's selected evidence;
unselected page context and another turn's citations cannot supply missing support.
Any unsupported factual segment withholds the whole post. Pure opinion, disagreement
and jokes remain welcome. Local validation enforces coverage and citation boundaries;
the model's entailment judgments remain fallible.

Implementation `f1c341c` deployed successfully in run
[39154425316](https://github.com/ariesyous/openfeed/actions/runs/39154425316).
The guarded correction script removed only leaked bracketed evidence labels from
three bodies in batch `20261018T172715Z-7712` (Netflix, Anthropic and Alberta).
All other prose, discussions, identities, dates, slugs and source links were preserved.
The correction changed three posts, then zero on an idempotency check. Live batch
equality and the three stable article pages without labels were verified. Original
audit snapshots remain frozen; the exact correction fixture records the difference.

## Live controls

DeepSeek Flash run [39154425208](https://github.com/ariesyous/openfeed/actions/runs/39154425208)
passed all three four-post suites in three calls and 88,618 ms. All six deliberately
bad controls were withheld; all six supported or opinionated counterparts passed.
The new cases rejected a 2017 commencement date selected only elsewhere, both in a
body and in a discussion turn. Identical prose with the missing support selected
passed, preserving its turtle-clock metaphor. Requested and resolved models were
both `deepseek/deepseek-v4.1-flash`.

The bounded decision fixture is
`fixtures/editorial-selected-evidence-controls-deepseek-20261018.json`.
These synthetic controls closely mirror prompt examples; they are not a general
accuracy benchmark or evidence of improved ordinary editions.

After the transport change, Gemini Flash run
[39157275763](https://github.com/ariesyous/openfeed/actions/runs/39157275763)
also passed all three suites on their first attempt: three calls, 131,529 ms,
six incorrect posts withheld and six supported/opinionated counterparts accepted.
Inspection confirmed the precise reversal, absolute, title-speaker and missing
selected-date defects. Requested/resolved model: `google/gemini-3.8-flash`.
Decisions are in `fixtures/editorial-selected-evidence-controls-gemini-20261018.json`.
This establishes compatibility for these controls, not universal provider reliability.

## Fresh generation attempts

| Run | Model | Outcome |
| --- | --- | --- |
| [39154620467](https://github.com/ariesyous/openfeed/actions/runs/39154620467) | DeepSeek Flash | Writer succeeded on call 2; both reviewer calls returned empty at length. Four calls, about 319 seconds. |
| [39155097241](https://github.com/ariesyous/openfeed/actions/runs/39155097241) | DeepSeek Flash | Writer succeeded on call 3 after truncated/empty output; both reviewer calls returned empty at length. Five calls, about 546 seconds. |
| [39156228382](https://github.com/ariesyous/openfeed/actions/runs/39156228382) | DeepSeek Flash | Two-post requests: writer succeeded on call 2; both reviewer calls returned empty at length. Four calls, about 332 seconds. |
| [39156789285](https://github.com/ariesyous/openfeed/actions/runs/39156789285) | Gemini Flash | Writer succeeded; review request failed with provider HTTP 400 INVALID_ARGUMENT. Two calls, about 39 seconds. |

None of these runs completed review or published a candidate. None produced an
inspectable completed-review artifact. They do not demonstrate better new posts.
Existing feed content was preserved.

Commit `8db3708` reduced ordinary requests to two posts, retaining the eight-post
ceiling and shared eight-call/45-minute limits. Four successful writer/reviewer pairs
can reach the ceiling; retries reduce throughput. Deployment
[39156083100](https://github.com/ariesyous/openfeed/actions/runs/39156083100)
passed all 324 Linux tests, type checking, lint and build.

Commit `c552ac9` removes string/array size bounds only from the provider transport
schema; required fields, enums and strict objects remain. All local bounds and
claim-support rules still apply. This addresses a plausible compatibility issue:
[Google documents complex schemas as a possible cause of HTTP 400](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/control-generated-output).
The generic error does not establish that cause. No broad 400 fallback was added.
The manual control workflow can now explicitly select Gemini Flash. Scheduled model
and schedule remain unchanged. Gemini comparisons are separate from DeepSeek evidence.

Local checks for that follow-up passed type checking and build, with 318/325 tests
passing; the same seven Windows symlink/path/line-ending failures remained. Lint
passed with an unrelated ignored `artifacts/check-domain.mjs` excluded. Deployment CI
checks the committed tree on Linux. Domain-routing changes in concurrent commits
`6687635` and `4af4239` belong to separate user work.

Deployment [39157275733](https://github.com/ariesyous/openfeed/actions/runs/39157275733)
completed successfully with type checking, lint, all 325 Linux tests and build passing.

## Subsequent user direction: DeepSeek only

During fresh Gemini run `39157487829`, the user requested removal of every other model.
Cancellation was requested immediately, followed by force-cancellation while the run
was still active. The controls above remain historical evidence, not an available
model option. Local generation, scheduled/manual generation and reviewer controls
are now pinned to DeepSeek Flash; legacy environment model overrides are ignored.
Workflow dropdowns were removed. The three-hour schedule is unchanged.

Run `39157487829` had completed review of two candidates before cancellation, but
publication and deployment steps were skipped. It is not a published edition.
DeepSeek-only commit `08b6e73` deployed in run
[39157764456](https://github.com/ariesyous/openfeed/actions/runs/39157764456), with
all 325 Linux tests passing. HTTPS verification of CoBanter.com returned HTTP 200.

DeepSeek controls [39157764229](https://github.com/ariesyous/openfeed/actions/runs/39157764229)
passed the reversal suite, then failed local schema validation on both title-suite
attempts under the simplified transport. Fresh generation
[39157766374](https://github.com/ariesyous/openfeed/actions/runs/39157766374)
produced a valid writer response, then two empty-at-length review responses:
three calls, about 218 seconds, no completed review or publication.

The Gemini-specific transport simplification was consequently retired. Full provider
bounds are restored alongside unchanged local validation. DeepSeek calls explicitly
request `reasoning.effort: low` while retaining reasoning, the 24,000-token cap,
the same context and all publication gates. The public OpenRouter model metadata
retrieved October 18 lists `max`, `high`, `low`, `none`, with `high` as default.
[OpenRouter documents that reasoning and visible output share the token budget](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).
The empty-at-length responses with reasoning present are consistent with budget
exhaustion, though the logs do not include a measured reasoning-token breakdown.
This is a reliability adjustment whose editorial quality still needs observation.

### Retired low-reasoning experiment

Commit `588a4f2` deployed with all 326 Linux tests passing. Its controls
[39158146087](https://github.com/ariesyous/openfeed/actions/runs/39158146087)
passed the reversal suite after a retry, then exhausted both title-suite attempts
on missing selected premises, inconsistent title judgments and altered/incomplete
text accounting. It did not complete the controls and was not used for a fresh edition.
Low reasoning was retired rather than relaxing validation.

The final configuration restores DeepSeek's default reasoning and the full bounded
provider schema. Review calls allow 48,000 tokens; writer calls retain 24,000.
The shared eight-call/45-minute budget and all evidence/review checks are unchanged.
This supplies headroom for reasoning plus the expanded claim-accounting response.
