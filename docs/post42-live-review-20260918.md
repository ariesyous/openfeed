# Post-42 manual-edition editorial review — September 18, 2026

The fresh edition is more substantive in several places and contains no observed internal
evidence-ID or generator-process narration. It still needs ten targeted corrections. This
is early, **unblinded manual evidence from a different requested model**, not proof that
#37 improved the ordinary free-router feed. Both #36 and #37 remain open.

## Verified baseline and publication chain

- #38 merged at 21:20:04 UTC as `c5fd886383be0c7eeacafc98ab2d6d3cd26d8ddd`: coherent extraction, contextual evidence, retained support and benchmark.
- #39 merged at 21:41:34 UTC as `a4d0c85268e310e14da231871ba8d3f8599868a9`: payoff guidance and independent optional-discussion validation.
- #42 merged at 23:12:27 UTC as `9be086a8438adb0fdcdc9450348c4e4cd311e000`: first ordinary-edition corrections, prompt examples and evidence-ID narration guard.
- Manual [run 35405624271](https://github.com/ariesyous/openfeed/actions/runs/35405624271), attempt 1, actually checked out `9be086a8438adb0fdcdc9450348c4e4cd311e000`. Job `105794679955` logs `git log -1 --format=%H` at 23:25:28 UTC. All three changes were active. This matters because checkout uses the current branch ref, not necessarily the run's original SHA.
- The job requested **`deepseek/deepseek-v4.1-flash`**, and all five accepted chunks report that same resolved model. It did **not** request `openrouter/free`. No model cost is inferred from the logs; this review made no model calls.
- [Artifact 10572606551](https://github.com/ariesyous/openfeed/actions/runs/35405624271/artifacts/10572606551), `editorial-support-35405624271-1`, records `data_written` for batch `20260918T232533Z-bd16`. Upload succeeded before publication. Its Actions expiry is October 2 at 23:36:14 UTC.
- [Publication commit 6e83fe7](https://github.com/ariesyous/openfeed/commit/6e83fe73f9dbf654c11f43cbece1bae10e89f54f) contains exactly twenty new posts, their catalog entry and coverage state. [Deploy 35406348072](https://github.com/ariesyous/openfeed/actions/runs/35406348072) succeeded for that revision. Live browser article content matched the original batch.

The immutable [selected-support snapshot](fixtures/post42-selected-support-20260918.json)
is a 34,218-byte copy of the bounded artifact, kept as evidence for this specific review.
It contains selected excerpts, not complete pages, prompts or completions. It remains outside
public/build assets. Workflow diagnostic retention is still fourteen days; this explicit
review fixture is permanent documentation. ZIP and JSON hashes, original article URLs,
source metadata, all selected IDs and per-claim/turn assessments are in the
[review ledger](fixtures/post42-live-review-20260918.json). IDs are chunk-local.

## What improved, and what did not

All twenty original articles and all 27 discussion turns were reviewed, including weak and
unavailable-source cases. The suspense article teaches an attributed fear/hope/uncertainty
account; rice versus music makes non-rivalry concrete; the payments article explains why
queue order and batch size matter. Cambodian music's TV/CD recovery detail adds real value
in discussion. Short PBS briefs preserve the distinction between a reported intention or
critics' fear and an established outcome. These are better signs than length alone.

Seven original complete posts (0, 4, 6, 7, 12, 16, 19) were judged supported and independently
worth reading with current-page verification. Post 3 remains unresolved. The other twelve
include ten corrected posts, one repetitive retained-only brief (15), and a useful payment
body with repetitive discussion (17). This is a conservative subjective census, **not** a
7/20 model accuracy score or comparable causal improvement rate. A small error can disqualify
an otherwise worthwhile article; ten corrections do not mean ten wholly false articles.
Median original body length is 109 words, versus the earlier review's 63-word overall-feed
snapshot; those are different populations and length is not quality.

No internal evidence IDs, generator self-critique, invented people, or teaser questions
presented as established answers were observed in this edition. That supports a limited
observation about #42's failure mode, not a universal guard guarantee. Several posts still
select IDs that do not cover all their details, often skipping long-sentence continuations.
Some extra details were verified on current pages, which **does not establish that they were
in the model's original input**. The artifact stores selected support, not all offered text.

Optional discussion was absent on eight posts, present on twelve, and automatically omitted
on **zero**. Every response passed local validation on its first attempt. There is therefore
no live example here of #39 rescuing a sound article by omitting an invalid optional block,
and no measured retry savings. Semantically unsupported commentary still passed provenance
checks. This review removes the GDP discussion and repairs several others through reviewed
content corrections; those interventions are not generator-omission successes.

## Per-post assessment of original content

Every suffix below belongs to `post-20260918T232533Z-bd16-`. Full permanent links, source
URLs, original titles, body claims, all discussion turns and evidence IDs are in the ledger.
“Unsupported” is distinct from “false”; an inaccessible page remains unresolved.

| Suffix | Subject | Assessment and disposition |
| --- | --- | --- |
| 0 | Suspense | Specific, attributed mechanism and useful hypothetical scene interpretation. SEP page supports details missing from selected body IDs. Unchanged. |
| 1 | Rice/music | Strong example; non-rivalry does not imply zero price/cost. Narrow final sentence. Historical names/examples verified on SEP but not all selected. |
| 2 | GlobalEye | Core request supported; no evidence for what Conservatives did not allege or what probes had not found. Remove negative inference. CBC full-page check unresolved. |
| 3 | Paramount | Useful financing/approval distinction. Saved spans are incomplete; 25% direct/indirect rule and 28 stations not retained. Ars 403: unresolved, not labelled false; unchanged. |
| 4 | Albania | NASA confirms 73rd signatory, future ceremony/date, officials and principles. Logistics are low-value but factual. Unchanged. |
| 5 | Mouse sleep | Title loses inhibitory-neuron denominator retained correctly in body. Correct title. Ars full-page check unresolved; saved continuation gaps remain documented. |
| 6 | Cambodian music | JSTOR supports killed-musician population and interruption, plus Mamula's dated fieldwork/TV/CD discussion payoff. Unchanged. |
| 7 | White House outlets | Complete saved support and PBS agree; preserves “says” and explicit lack of implementation details. Unchanged. |
| 8 | Agent skills | AWS indexed passage confirms technical body details beyond parent IDs. Qualify vendor capabilities; replace invented detection times/universal habits while preserving the qualified maintenance concern and teardown commentary. |
| 9 | Asteroids | False enlarged superlative: Vesta becomes largest body, and an invented single-substantial-object metaphor compounds it. Narrow to supported size/mass facts and repair discussion. |
| 10 | Women miners | Source's “largely erased” becomes no women in the record. Narrow discussion and categorical labour-policy implication; preserve documented family/law mechanism. |
| 11 | GDPNow | “Why” title promises an unprovided explanation; discussion attributes unlike-period numeric gap to models. Explain time bases; omit contradictory discussion. Source itself gives puzzling 1.5–1.7 band: omit without guessing a replacement. |
| 12 | Saudi nuclear agreement | Supported brief, with critics' concern clearly attributed. Unchanged. |
| 13 | Fed path | Preserve sourced rate/breakeven values, distinguish prediction from guarantee, remove unsupported immediate-repricing certainty. |
| 14 | Hedonism paradox | Restore “overly conscious” qualifier; remove “very few people” and surviving-most-attacks claims. Preserve practical philosophical tension. Unexplained “incompetence account” remains an editorial weakness. |
| 15 | First Nations case | Complete retained support; CBC page unavailable. Repetitive final sentence limits depth. Unchanged; no falsehood inferred from timeout. |
| 16 | Manitoba clocks | Global News confirms daylight-time consequence; source qualification and advocates' attribution retained. Unchanged. |
| 17 | Payment reordering | Saved summary/current abstract support size-dependent tradeoff and ML role. Gross-settlement gloss is background, not a retained study claim. Discussion mostly repeats body. Unchanged; weakness recorded. |
| 18 | Hedonism | Body examples supported; discussion conflates value theory with universal choice explanation. Replace that inference with a question about the value claim. |
| 19 | MIT Reads | Anniversary, fiction/memoir focus and Bourg attribution supported. Final reflection is useful interpretation, not an invented measured outcome. Unchanged. |

The [NASA asteroid introduction](https://science.nasa.gov/solar-system/asteroids/) describes
an asteroid size range; [NASA's Ceres facts](https://science.nasa.gov/dwarf-planets/ceres/facts/)
explicitly identify a larger belt object. That independent check confirms the comparison-class
error in post 9. The correction stays within the original citation's supported dimensions;
it does not add a new Ceres claim or change the source list. For post 11,
[the Econbrowser article](https://econbrowser.com/archives/2026/09/gdpnow-goes-gangbusters)
was retrieved directly despite the search reader failing; the interval anomaly is present
in the source. Do not misreport it as a hallucinated figure.

## Source access and rendered verification

Fifteen of twenty linked source pages returned readable HTML. Both CBC pages timed out;
both Ars pages returned 403. AWS timed out directly, but its official indexed article
passage confirmed the deployment details. A subsequent web-reader open still failed, so it
is reported as partial indexed verification, not a retrieved full page. No paywall or site
restriction was bypassed. The ledger stores retrieval outcomes and successful HTML hashes.
Full publisher HTML stays outside the repository.

Live desktop browser inspection covered the homepage, suspense article and GDP article:
headings, original bodies, source links/dates, permanent URLs and all discussion turns were
visible. A viewport screenshot of the GDP article confirmed the original text and conflicting
turns on the rendered page. One full-page screenshot timed out; the viewport capture worked.
This verifies deployed originals, **not these unmerged corrections**, physical mobile
behavior or Cards fit. No unrelated UI changes were made.

## Output, latency and supply

| Measure | Manual run 35405624271 |
| --- | --- |
| Target / identifiable JSON drafts / accepted / committed / deployed | 20 / 20 / 20 / 20 / 20 |
| Provider requests | 5 of 8 allowed; five four-post chunks |
| Rejected responses / provider failures / empty selections | 0 / 0 / 0 |
| Optional discussion omissions | 0; no rejected optional blocks observed |
| Generation loop | 638,593 ms (10m38.593s) |
| Job | 23:25:25–23:36:22 UTC; 10m57s |
| Approximate per-request elapsed time | 32s, 89s, 111s, 211s, 196s; log success totals are cumulative |
| Source candidates collected / unused before generation | 206 / 138 |
| Source uses / publisher groups | 20 distinct URLs / 12 groups; maximum two each |
| Evergreen shelf | 18/59 unconsumed before fetch; eight unavailable; five evergreen sources used |
| Offered / deferred | 16 offered per chunk; zero deferred |
| Artifact | 34,218-byte JSON / 7,997-byte ZIP |

No partial publication or rejected drafts occurred in this run. The earlier ordinary WP1
run published 16/20 in eight attempts and about 35m51s generation time; the earlier three-run
baseline published 29/60 in 23 attempts. Different requested/resolved models, source supply
and manual versus scheduled selection make those observations incomparable as a treatment
effect. Do not credit faster runtime to discussion isolation when no omission occurred.

Nine topics appear: economics 4; Canada, United States and philosophy 3 each; world and science
2 each; movies, AI/agents and technology 1 each. Formats are 10 explainers, 7 news, 3 stories.
Movie theory and Cambodian music provide cultural substance, but no mythology or Sopranos
post appears. Seven Met pages and Marcus Aurelius were unavailable during intake. Candidate
volume alone does not establish usable culture supply.

The manual angle review compared all twenty originals with all titles and relevant bodies
in the previous two ordinary editions (`20260918T213919Z-f7d9` and
`20260918T182557Z-8bc1`). No repeated event/angle was confirmed. The two hedonism articles
share a theme but address pursuit strategy versus the breadth of value; both relate to the
previous well-being definition without repeating it. SageMaker skills differ from the prior
inference-capability roundup. This is a small manual judgment, not a semantic deduplication
service or a corpus-wide originality claim.

## Corrections, safeguards and validation

`node --import tsx scripts/correctPost42Audit.ts` applies the ten exact
[before/after records](../scripts/fixtures/editorial-post42-corrections-20260918.json) through
the established `buildPublishPlan`/`writePublishPlan` migration. It rejects changed targets
before any write, preserves IDs/slugs/timestamps/format/source lists/catalog/state/unrelated
articles, and does no writes when reapplied. The regression includes a later edition arriving
before this historical correction: the new edition and catalog remain untouched. No history
is deleted or regenerated; original support is preserved unmodified.

Prompt guidance adds the observed distinctions: denominators in titles, comparison classes,
growth periods, non-rivalry versus price, “largely” versus “none,” value versus motivation,
and unsupported discussion generalizations. It explicitly disallows using a later reply to
excuse an earlier unsupported assertion, and reiterates parent support within the three-ID
limit. No broad text-stripping rule or new semantic rejection heuristic was added. Parent
validation and independent optional-discussion handling are unchanged.

Eight benchmark cases add wrong/supported pairs for growth periods, title denominators,
non-rivalry/price and asteroid comparison class. The benchmark now has 24 cases; **ten
semantic counterexamples still pass provenance checks**. These are reviewed expectations,
not an automated accuracy test. Prompt adherence still requires live observation.

Required verification: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, plus
`pnpm editorial:benchmark`, guarded migration idempotence and exact correction-scope checks.
All passed: **262 tests across 28 files**; production/archive build retained **262 articles,
11 topic pages and 2.45 MiB**. The migration rerun performed no writes; the 24-case benchmark
reported the ten known semantic limitations without claiming factual certification. Ledger
coverage, artifact hashes and original/corrected identity were checked against the publication
commit. Existing pnpm configuration and jsdom scrollTo warnings were non-fatal. No model generation, merge or manual deployment
was performed. Schedule, free-router default and generation limits are unchanged.

## Ordinary observation gates and continuation

At the 23:53 UTC Actions listing check, there was no generation newer than
the manual run. It covers back through all relevant merge boundaries, including failures
and no-op runs if present; none were skipped to select successful examples. The previous
scheduled run's checkout was reverified from job `105770632939`: `c5fd886...`, requested
`openrouter/free`, before #39. Its later publication time does not make it WP2 evidence.

| Gate | Eligible observed evidence | Exact remaining work |
| --- | --- | --- |
| #36 | 16 source-reviewed posts across 1 ordinary edition; this manual census adds 0 qualifying editions/posts | At least 4 more normal published editions and at least 4 more posts by the numeric minimum. Follow the fixed first-four rule, normally adding 16 posts for 32 total; supplement discussion and missing culture without replacing weak cases. Explicitly account for prior unresolved source checks. |
| #37 | 0 of 10 ordinary scheduled free-router runs on #39 or compatible successors | All 10 eligible runs, including failures/no-ops; fixed article sampling, blinded comparative reading against frozen baseline, then support/event-angle review and operational comparison. |

Across both reviews, 36 originals were inspected in total, but only sixteen are in #36's
ordinary cohort. Do not count this manual other-model edition toward either gate. The
manual event review is useful supplemental evidence, not completion of #37's required
scheduled comparative review. Previously familiar articles cannot honestly be called blind.

For each next ordinary edition, preserve both rules: #36 takes its first four posts; #37 uses
unique `floor(k*(n-1)/3)` positions for k=0..3 (all if fewer than four). Reuse overlapping
support work, supplement the union for discussion/culture, and retain separate denominators.
For twenty posts the union is positions 0,1,2,3,6,12,19 before supplements. Apply #37's opaque
SHA-256 ordering and initial source-hidden reading before revealing support/cohort information.
Failures/no-publication runs count operationally for #37 but not as #36 published editions.
Do not dispatch additional generation, wait indefinitely or reduce either gate.

**Next useful work without waiting:** review a bounded set of unconsumed culture/ideas source
packets after extraction and numbering. Prefer passages whose complete payoff fits the
three-ID allowance; inspect truncated or caption-heavy candidates and quarantine only proven
problematic inputs. This addresses the observed support-selection gaps and fragile culture
supply before considering any semantic-review experiment. This review does not establish
that excluding a whole publisher would solve model misinterpretation.
