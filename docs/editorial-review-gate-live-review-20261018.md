# First edition with prepublication review

**The four fresh posts are useful, concise reads with responsive discussions. I would
retain three and tighten the film-awards title.** The separate reviewer approved all
four, so this edition demonstrates publication through the gate and preserved opinions,
but not an intercepted factual error. A separate live control check rejected both
deliberate errors while approving their corrected, opinionated counterparts.

## Deployment and execution

Implementation `1645b43` adds the [mandatory source review](editorial-prepublication-review.md).
[Code deployment 39146589282](https://github.com/ariesyous/openfeed/actions/runs/39146589282)
passed typecheck, lint, all 317 Linux tests and build. The full local Windows suite
has the seven existing symlink/path/line-ending failures; new review tests pass.
The verification-only follow-up `1292f43` also passed
[deployment checks](https://github.com/ariesyous/openfeed/actions/runs/39147894586).

[Manual generation 39146696530](https://github.com/ariesyous/openfeed/actions/runs/39146696530)
checked out `1645b43`. Writer and reviewer both requested and resolved
`deepseek/deepseek-v4.1-flash`. It started at 12:48 p.m. Eastern on October 18,
published batch `20261018T164847Z-b1c0` in `d7edf82`, and completed successfully.
[Edition deployment 39147607299](https://github.com/ariesyous/openfeed/actions/runs/39147607299)
succeeded. The live batch matches the frozen edition; all four static articles return
HTTP 200 and contain every discussion turn. Each approved candidate digest matches
the published title, body, discussion and support IDs reconstructed from the audit.

Intake found 37 unused feed candidates, selected 13 for article context, and accepted
nine. Eight were offered initially. The nine unconsumed evergreen shelf entries again
yielded no usable pages. The first writer call produced four valid posts in 135 seconds;
review took approximately 21 seconds and approved all 16 units: four titles, four
bodies and eight opinion turns. There were no review rejections or discussion omissions.

Five later writer calls returned empty completions with `finish=length` and reasoning
present. They yielded no inspectable drafts; no reasoning/raw completion was retained.
The reviewed first chunk survived. Total generation time was 713 seconds over seven
provider calls: six writer calls and one reviewer call. The reserved review slot was
unused after the later writer budget ran out. The long runtime was mostly failed
writer attempts, not the 21-second review. Four published posts is not evidence that
the reviewer rejected four inferior ones.

## Source and writing review

All four publisher pages were retrieved successfully. All 25 selected support snippets
match the extracted source text. I checked 17 body-claim groups and all eight turns.
This establishes agreement with the reporting, not independent verification of the
underlying events. Editorial dispositions below are judgments, not accuracy scores.

| Post | Disposition | Reading payoff and remaining concern |
| --- | --- | --- |
| French demonstrations | Retain | Keeps the mostly-peaceful qualification beside the damage figures and attributes the injury/shop counts. The exchange genuinely debates whether disorder should dominate coverage. Plural protests and a France reference would make the title more precise. |
| Noah Adams | Retain | The train/small-town reporting method makes a concrete tribute. The response adds notebook and shorthand detail, expanding listening into observation. The press-conference contrast reads as advice, not a claim he never attended one. |
| Concrete Land at BFI | Revise title | The body correctly attributes the award and jury assessment. The exchange makes a specific argument about documentary taste, then challenges equating dignity with passivity. The title shifts praise from the jury to the documentary itself. |
| Amelia Earhart search | Retain | Describes a resumed investigation without promising a discovery. The fallen-tree alternative remains attributed to skeptics. The exchange balances an evidentiary baseline against reflexive dismissal. |

The film headline says the documentary praises quiet resilience; the source establishes
that the jury praised the family's resilience. The reviewer approved it by paraphrasing
it with the jury as speaker, missing the small attribution shift. A more precise title
would be **Concrete Land Wins the Grierson Award as Its Jury Praises Quiet Resilience**.
The source is [Variety's festival report](https://variety.com/2026/film/festivals/sergei-loznitsa-imperium-best-film-london-film-festival-1236915621/).
No published wording was changed during this review.

Bodies total 315 words; discussions total 225 words across eight turns. All posts have
two turns, averaging about 28 words each, compared with 47 in the preceding two-post
edition. They feel more focused: each response has an identifiable addition rather
than a compulsory synthesis. Opinions remain lively; these mostly serious subjects
do not need forced punchlines. Different sources and a tiny sample prevent attributing
the better reading experience solely to the reviewer.

## Live controls for the two known error patterns

The [manual check 39147911060](https://github.com/ariesyous/openfeed/actions/runs/39147911060)
ran the same reviewer/model on two synthetic incorrect posts and two corrected
counterparts. It used one call and 8.8 seconds, with no source fetches, publication or
coverage-state changes. It is separate from the ordinary edition's shared call budget.

- The reversed expectation was rejected as `reversed_fact`, identifying the exact
  friendliness-versus-nastiness inversion.
- The claim that households outside professional contact have no route to help was
  rejected as `unsupported_claim`.
- Both corrected counterparts passed. The reviewer explicitly allowed the villain-costume
  metaphor, subjective preference and conditional concern about referral blind spots.

These are small controls aligned with examples in the prompt. Success demonstrates
the requested distinction in those cases, not a general false-negative/false-positive
rate. It did not replay or rewrite the historical posts. An initial local probe could
not execute because its API key had expired; the successful check used the configured
Actions credential. No credential was printed or committed.

## Retained evidence

The [claim ledger](fixtures/editorial-review-gate-ledger-20261018.json) links all
claims and turns to the [frozen edition](fixtures/editorial-review-gate-edition-20261018.json),
[selected support](fixtures/editorial-review-gate-support-20261018.json) and
[model decisions](fixtures/editorial-review-gate-decisions-20261018.json). It records
retrieval hashes and matching candidate digests. Full fetched pages remain ignored
local artifacts. [Live control decisions](fixtures/editorial-review-gate-controls-20261018.json)
correspond to the synthetic inputs in `scripts/checkEditorialReview.ts` at `1292f43`.

Fresh-run artifact `12144305445` expires November 1, 2026 at 17:00:44 UTC; control
artifact `12144022105` expires at 17:05:06 UTC that day. These snapshots preserve
bounded review evidence beyond artifact expiry. No raw model output, reasoning or
full reading context is committed. Manual runs do not advance #36/#37 ordinary-run
observation cohorts. More ordinary editions are needed to measure missed errors,
unnecessary rejections and whether the feed stays enjoyable.
