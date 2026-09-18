# WP1: first ordinary-edition source review

**Partial observation, with confirmed defects corrected for review. Keep [#36](https://github.com/ariesyous/openfeed/issues/36) open.** All 16 posts in the only available post-WP1 ordinary edition were checked against their retained selected support, including all 30 discussion turns. Fourteen linked pages were retrieved; CBC and AWS timed out on two attempts each. This is one edition, not the required five. Corrections are human-reviewed publication changes, not evidence that the generator produced correct copies.

## Scope and provenance

- Inspected main: `bb251e04ba670cca9ac6e2746212aad33abfd3c5`.
- Scheduled [run 35397839301](https://github.com/ariesyous/openfeed/actions/runs/35397839301) checked out `c5fd886383be0c7eeacafc98ab2d6d3cd26d8ddd`, the merged WP1 implementation.
- Edition: `20260918T213919Z-f7d9`; publication commit `1eba5614b1387151e56e810b30ea012e781b3794`.
- [Support artifact 10570390428](https://github.com/ariesyous/openfeed/actions/runs/35397839301/artifacts/10570390428), `editorial-support-35397839301-1`, expires October 2, 2026 at 22:15:22 UTC. ZIP SHA-256: `983cdc93524b9c41b23ea4a04d9a667162021a53e493ade0cea34e225bef9089`.
- Artifact status `data_written` is corroborated by the publication commit and successful deployment; it alone would not establish publication.
- Selection: census of the edition, before inspecting quality. No posts excluded, no model calls, no manual generation and no historical regeneration.
- WP2 merged while this job was running. Its optional-discussion isolation and new prompt were **not** in the checkout. This run must not count as a post-WP2 trial even though the publication commit landed after #39.

The [claim-by-claim ledger](fixtures/wp1-live-review-20260918.json) preserves IDs, original source URLs, exact chunk/model mappings, selected evidence IDs, source-retrieval hashes and reviewer judgments. IDs are local to their chunk. It includes both body and discussion findings. Full publisher pages and raw logs stay out of Git and public data. The [guarded correction record](../scripts/fixtures/editorial-first-live-corrections-20260918.json) preserves exact before/after posts and hashes. The original Actions artifact is left unchanged: it describes original generation, not manually corrected text.

## Findings on original output

IDs below abbreviate the shared prefix `post-20260918T213919Z-f7d9-`. “Supported” means the inspected claims match the available evidence; it does not independently prove the publisher's reporting. A selected-support gap is not automatically a false claim. Fresh full-page verification is also not proof that the model received that material.

| Suffix | Subject | Finding and disposition |
| --- | --- | --- |
| 0 | XRISM / BP Crucis | Body and discussion supported, including entity, mechanism, distance and location. Unchanged. |
| 1 | Federal Register / Qwen | Removal and FBI allegation accurately distinguished; discussion makes a supported distinction. Unchanged. |
| 2 | Two profit measures | Wrong citation: selected evidence and attached article discuss production, not profits. Replace with the rechecked profit article already cited by post 10; preserve the supported argument and discussion. |
| 3 | Well-being | SEP supports prudential value and the distinction from moral/aesthetic value. Discussion remains useful. Unchanged. |
| 4 | University EDI | Conflates three surveys/populations and turns an aggregate attitude result into a categorical exclusion of hostility toward Jewish people. Separate the populations; retain the supported 70%/1% figures and replace the discussion with narrower interpretation. |
| 5 | COSI | Assembly story supported by NASA's page, but selected body IDs omit some continuations. Discussion adds unsupported telescope physics and leadership claims. Preserve body, omit whole optional block. |
| 6 | FAA SMART | Full page supports the body and its planned/possible qualifiers; selected body IDs are incomplete. Discussion adds an unsupported congestion superlative and safety framing. Keep body and replace discussion with qualified analysis of a limited advisory rollout. |
| 7 | Hempstead | Joins seventeenth-century settlement to much later commercial photo captions and overstates disappearance of the town pattern. Discussion adds unsupported spending/date claims. Correct chronology using the retrieved article's rail/retail explanation; retain grounded interpretation. |
| 8 | Robot simulation | Body is supported but too thin to deliver much as an explainer. Both discussion turns exceed the one-sentence retained input. Remove discussion; do not label related full-page facts false or retroactively count them as model input. |
| 9 | Clancy juror | Accurately attributes the position to the juror/lawyer, not a court finding. No discussion. Unchanged. |
| 10 | Manufacturing profits | Attributes the author's critique to Antoni, the subject of the critique; discussion asserts sector strength the analysis questions. Correct attribution and retain the useful accounting distinction. |
| 11 | Morrisseau | Retained evidence supports forty-year storage, gallery, lender and attributed descriptions. CBC page timed out; current-page verification remains unresolved. Unchanged. |
| 12 | Blanche | Body supported. Discussion exposes internal IDs and repeats the body. Omit optional block. |
| 13 | Cyprus | First statement supported; body narrates an evidence ID and discussion infers answers from a teaser question. Narrow to the supported migration/investment statement, omit discussion. |
| 14 | SageMaker | Internal IDs appear throughout. Retained evidence lacks continuations for detailed path/technical claims; AWS page timed out. Narrow to instance billing, two paths and thirteen capabilities supported by the saved text; omit discussion. Full original-body verification remains unresolved. |
| 15 | BetterHalf / Galeo | Names and festival selection supported by Variety's retrieved opening. Repair the two-title relationship, remove ID narration and omit redundant/unsupported discussion. |

Eleven posts receive reviewed corrections. Four have substantive source/attribution/population/chronology defects (2, 4, 7, 10); other changes address unsupported elaboration and internal-ID narration. Categories overlap: this is not “eleven false articles.” Repairing post 2's citation also makes its overlap with post 10 explicit; both historical articles remain retained, and this is not two distinct discovery payoffs. Four posts contain evidence-ID narration (12–15). No new error is hidden inside the old benchmark's pass count.

Four original complete posts (0, 1, 3, 9) were judged supported and independently worthwhile with a successful current-page check. Post 11 is additionally supported and worthwhile on retained evidence, provisionally, with its page unavailable. Thus the conservative verified numerator is **4/16**, plus **1/16 retained-only provisional**. This subjective, unblinded census is not a general usefulness rate or a statistically comparable improvement claim. Other bodies have worthwhile material but their complete published posts require correction. No claim is made that every corrected piece becomes an excellent read.

## Runtime and supply

| Measure | This ordinary run |
| --- | --- |
| Sources collected / unused | 194 / 135 |
| Remaining evergreen entries before fetch | 10 of 50 |
| Accepted and published | 16 of 20 targeted |
| Provider attempts | 8 of 8 |
| Empty-completion attempts | 4; these are not successful empty selections |
| Generation loop | 2,151,339 ms, about 35m51s |
| Job elapsed | About 36m15s from setup to cleanup |
| Retained JSON / compressed artifact | 30,704 bytes / 7,314 bytes |
| Accepted chunk models | nex-n2.5-pro; nemotron-3-ultra-550b-a55b; nemotron-3-super-120b-a12b; nemotron-3.5-lightning (all `:free`; full names in ledger) |

The [earlier three-run baseline](openfeed-product-review-evidence.md) published 29/60 targeted posts with 23 attempts and 103m09s total job time. This run's 16/20 and eight attempts show partial publication within the existing budget; one run with different routed models cannot establish improvement. Four empty completions still consume time. The prior baseline lacks comparable retained claim-level support, so no before/after supported-useful yield is calculated. This run's 135 unused candidates show that aggregate source shortage did not explain its four-post shortfall. Topic-specific supply and a finite culture shelf remain constraints.

## Corrective implementation and limits

The existing voice guard now rejects the observed citation-like grammar (`as S5E1 describes`, `S2E2 raises`, multiple IDs followed by attribution verbs). It does not blanket-ban season/episode labels such as `S1E1`. Under current main's WP2 contract, a leaking parent fails; leakage confined to an otherwise isolatable optional discussion omits that whole block. Evidence arrays remain valid transport data. This guard does not judge entailment or detect every possible form of process narration.

Prompt guidance distinguishes speaker attribution, survey populations, teaser questions and photo chronology. The offline benchmark grows from twelve to sixteen examples, adding wrong-source and speaker-attribution pairs. **Six semantically wrong examples still pass deterministic provenance validation.** These examples document the limitation; they are not an automated fact-checker.

`node --import tsx scripts/correctFirstLiveAudit.ts` applies only the eleven exact reviewed before/after records through `buildPublishPlan`/`writePublishPlan`. It fails before writing if any target changed, preserves IDs/slugs/dates/counts and unrelated posts, retains old coverage and is idempotent. The earlier four-correction migration keeps its original default record and behavior. The replacement economics citation was already covered, so this migration needs no state change. Publication-source metadata is corrected only for post 2; original generation artifacts are not rewritten.

Source restriction remains preferable to adding a mandatory second model call if further serious errors persist. This edition shows model misattribution even with correct article prose; excluding an entire publisher is not established as a remedy. Caption-heavy or question-only packets must earn eligibility through coherent, sufficient evidence in any next source-selection change. No source adapter is claimed fixed by this voice patch, and no semantic-judge experiment is introduced. The remaining observation is necessary to assess those risks.

## Remaining gate and next sampling rule

Progress is **16 reviewed posts / one ordinary edition**, with two current-page retrievals unresolved. The requirement remains at least twenty posts across at least five subsequent normal editions, including discussion and two culture topics. Philosophy and movies are represented; explicitly include another culture topic such as mythology or The Sopranos before declaring the cultural coverage sufficient.

Continue with the first four posts in publication order from each of the next four qualifying scheduled, published editions (or all posts if an edition has fewer). This keeps selection independent of quality and normally takes the total to 32, rather than cherry-picking four more successes. Add, without replacing those samples, the first available discussion-bearing post and required culture examples if missing. Extend to further ordinary editions when needed; failures/no-publication runs contribute operational evidence, not an edition count. Record errors and unresolved retrievals honestly, and keep original versus corrected quality separate. Do not count fixtures, manual runs or this pre-WP2 checkout as WP2 observation.

Validation passed: typecheck, lint, all **258 tests across 27 files**, production/archive build (**242 permanent articles, 11 topic pages, 2.27 MiB**), the sixteen-example offline benchmark and whitespace checks. The correction rerun performed no writes. The ledger was checked against all sixteen original posts, thirty discussion turns and eleven before/after records. #36 cannot close from this partial cohort; #37 and #25 are unchanged.
