# Scheduled editorial review — September 19, 2026

The first eligible scheduled WP2 run does **not establish an editorial improvement**.
It contains no observed evidence-ID leakage or generator self-commentary, but only six
of twenty targeted posts were published, two require corrections, a brief is thin, and
an AgentCore angle repeats a preceding ordinary edition. This is one run on pre-#43 code,
not an evaluation of #43's guidance. Both #36 and #37 remain open.

## Cutoff, eligibility and lineage

The cutoff was fixed at **2026-09-19 02:39:19 UTC**, before reading new article bodies.
The repository Actions listing (`actions/runs?per_page=100`) covered the relevant merge
boundaries back through September 16. It contained one new scheduled generation and no
newer generation, failed generation, no-op or in-progress generation by the cutoff.
Deploy and PR checks are not generation runs. Nothing was dispatched or awaited to enlarge
the cohort. Later runs are outside this review regardless of their outcome.

Verified merged revisions:

| PR | Merge commit | Role |
| --- | --- | --- |
| #38 | `c5fd886383be0c7eeacafc98ab2d6d3cd26d8ddd` | Coherent extraction, contextual evidence and support audits |
| #39 | `a4d0c85268e310e14da231871ba8d3f8599868a9` | Payoff guidance and independent optional-discussion validation |
| #42 | `9be086a8438adb0fdcdc9450348c4e4cd311e000` | First ordinary review, corrections and evidence-ID voice guard |
| #43 | `16203454a3b4489cf451af207f2ade9f6c95da8b` | Manual DeepSeek review and corrections; current main at session start |

#43's [Deploy 35416108952](https://github.com/ariesyous/openfeed/actions/runs/35416108952)
succeeded on that exact merge. The historical report and its original support/correction
fixtures remain unchanged. Their then-unmerged wording describes the prior cutoff, not
current deployment status.

| Run | Eligibility decision |
| --- | --- |
| [35408871596](https://github.com/ariesyous/openfeed/actions/runs/35408871596) | New ordinary scheduled `openrouter/free` run; counts for both gates. Actual checkout includes #39/#42 but **not #43**. |
| [35405624271](https://github.com/ariesyous/openfeed/actions/runs/35405624271) | Previously reviewed manual explicitly requested DeepSeek; excluded from both ordinary cohorts. |
| [35397839301](https://github.com/ariesyous/openfeed/actions/runs/35397839301) | Previously reviewed #36 edition. Rechecked job `105770632939`: checkout `c5fd886`, before #39, so excluded from #37 despite later publication. No recount. |

The new run's job `105804226934` logs `git log -1 --format=%H` at 00:18:01 UTC and
prints **`6e83fe73f9dbf654c11f43cbece1bae10e89f54f`**. Here reported head and actual
checkout agree; the conclusion is based on the log, not metadata or publication time.
The environment logs `OPENROUTER_MODEL: openrouter/free`.

The lineage is checkout `6e83fe7` → three accepted chunks → support artifact
[10574371285](https://github.com/ariesyous/openfeed/actions/runs/35408871596/artifacts/10574371285)
(`editorial-support-35408871596-1`, `data_written`) → successful upload at 00:44:31 →
[publication `fb9b7f5077802360ce411e5453526d2d025c4c89`](https://github.com/ariesyous/openfeed/commit/fb9b7f5077802360ce411e5453526d2d025c4c89)
→ batch `20260919T001812Z-2397` → successful
[Deploy 35410380018](https://github.com/ariesyous/openfeed/actions/runs/35410380018).
The artifact expires October 3 at 00:44:30 UTC. A byte-identical **9,599-byte**
[selected-support snapshot](fixtures/scheduled-selected-support-20260919.json) is retained
outside public/build assets. ZIP/JSON hashes, full revisions, diagnostics, permanent URLs,
source references and claim-level judgments are in the
[review ledger](fixtures/scheduled-review-20260919.json). This is selected support, not
the complete prompt, offered packet, rejected completion or full publisher articles.

## Operational results

| Measure | New scheduled run |
| --- | --- |
| Target / identifiable parsed drafts / accepted / committed / deployed | 20 / 10 / 6 / 6 / 6 |
| Accepted chunk sizes | 1, 1, 4 |
| Attempts / provider failures / rejected responses | 8 / 3 / 2 |
| Empty selections / discussion omissions | 0 / 0 |
| Generation loop / approximate job log span | 1,573,805 ms / 26m36s |
| Collected / unused source candidates | 203 / 120 |
| Evergreen unconsumed / total / failed intake | 13 / 59 / 8 |
| Published distinct sources / publisher groups / evergreen sources | 6 / 5 / 0 |
| Published topics | Technology 2; Economics, US, Canada, AI & Agents 1 each |
| Original discussion | Two posts, four turns; four posts have none |

All attempts remain in the record:

| Attempt | Assigned model (requested model always `openrouter/free`) | Outcome | Cumulative loop time |
| --- | --- | --- | --- |
| 1 | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Invalid JSON, 8,823 characters; draft count unknown | 67s |
| 2 | Same model | Accepted one post | 263s |
| 3 | `deepseek/deepseek-v4-flash-0731:free` | Empty completion, finish `length`, reasoning present | 961s |
| 4 | `nex-agi/nex-n2.5-pro:free` | Empty completion, finish `length`, reasoning present | 1,332s |
| 5 | `z-ai/glm-5.2:free` | Accepted one post | 1,352s |
| 6 | `poolside/laguna-s-2.1:free` | Parent evidence arrays exceeded three IDs | 1,525s |
| 7 | `nex-agi/nex-n2.5-mini:free` | Accepted four posts | 1,566s |
| 8 | `poolside/laguna-xs-2.1:free` | Empty completion, finish `stop`, reasoning present | 1,574s |

The last failure preserved the six accepted posts. The ten-draft diagnostic is not ten
unique stories; rejected attempts may repeat them. Invalid JSON and empty completions do
not have invented draft counts. There were no accepted discussion omissions, so this run
does not observe the rescue path or establish retry savings. Semantic errors in discussion
still passed provenance. The rejected parent arrays must remain rejected; discussion
isolation is not a reason to relax the three-ID gate.

The prior baseline remains 29/60 posts in 23 attempts and 103m09s documented job time.
Its three jobs were re-read: actual checkouts were `ce4354f`, `e51e646`, and `ba2e6b3`.
Assigned models, attempts, publication commits and batch mapping are retained in this
ledger. Historical generated-draft counts and original input audits are unavailable;
do not infer them from published totals. One new run cannot establish a yield or latency
trend against those three runs.

## Initial source-hidden comparison

The twelve fixed baseline articles were loaded from `c5fd886`, not current corrected
copies. The new six-post batch uses unique positions **0, 1, 3, 5** for #37. The pool was
ordered by SHA-256 of `openfeed-wp2-v1:` plus stable post ID, with opaque labels and
cohort/model/date metadata/source links hidden. Title, body and all optional discussion
were read; initial payoff/substance/commentary judgments were saved **before revealing
the source evidence** in the [initial worksheet](fixtures/scheduled-blind-reading-20260919.json).

Limitation: the required protocol documentation led through the baseline preparatory
worksheet first, so baseline subjects could be recognized. This is source/cohort-hidden
reading with imperfect baseline blinding, not an independent randomized experiment. New
sampled bodies had not been inspected beforehand. Support and worthwhile judgments were
made only after reveal. Two remaining new articles were then reviewed as an explicitly
unblinded supplement, completing a bounded six-post census.

| Group | Articles | Initial payoff total (max 2/article) | Substance total (max 2/article) | Complete original posts judged supported/worthwhile |
| --- | --- | --- | --- | --- |
| Frozen baseline | 12 | 21/24 | 16/24 | 3 unassisted; plus the already manually corrected comet, reported separately |
| New fixed #37 sample | 4 | 7/8 | 3/8 | 0 |
| New supplemental articles | 2 | Not part of blinded comparison | Not part of blinded comparison | SID yes; CBC unresolved |

These are small subjective samples with different topics, source availability, model
routing and code, not accuracy percentages or a causal effect estimate. A factual error
can disqualify an otherwise interesting item. SID's concrete method/data cutoff is a useful
example, but it is outside the fixed #37 positions and cannot replace a weak sample.

## New original articles and all optional discussion

Suffixes below belong to `post-20260919T001812Z-2397-`. Full original text, permanent
links, chunk-local selected IDs, page-access evidence and each discussion turn are retained
in the ledger. Current page confirmation does not retroactively fill historical support gaps.

| Suffix | Assessment of original | Disposition |
| --- | --- | --- |
| 0 — ship | `S10E3` says nuclear arms **program components**, not arms. Parent IDs end mid-sentence; discussion `S10E7` attributes the war assessment to one CNN source, not officials collectively. First turn offers a defensible risk interpretation; second repeats and hardens the assessment. | Correct object and attribution; omit redundant overstated discussion. |
| 1 — security research | `S10E3` permits suggesting changes; it does not say changes were made. Current page confirms paid vulnerability research but does not establish company-directed competitive aggression. Both discussion turns add supported humor/conditional risk analysis. | Narrow body; preserve both turns. |
| 2 — SID | `S5E1–E3` and the Bank of Canada abstract support segmentation, stable-rate periods, near-2% trend inflation since early 2024 and the December 2025 data cutoff. | Supported, worthwhile brief; unchanged. |
| 3 — Newsom | `S2E2` and PBS transcript support the order and **possible** switch. The article does not fuse the adjacent Trump story. Almost no substance beyond title. | Editorial weakness, not factual error; unchanged. |
| 4 — Alberta | Complete retained `S4E1–E2` support the competing referendum positions. CBC retrieval timed out. | Retained-support supported; underlying-page verification unresolved, not false; unchanged. |
| 5 — AgentCore | `S6E1,E2,E6` and AWS page support vendor-attributed responsibilities. It repeats agent-logic versus infrastructure relief from `post-20260918T182557Z-8bc1-8`. | Supported but repetitive; preserve history, record weakness. |

All six were checked for leakage, invented subjects and unanswered teaser questions. None
has observed process narration or internal evidence IDs. There is no culture article.
Three post bodies are quite brief; brevity alone is not a defect. SID delivers a method,
whereas Newsom largely restates its headline and AgentCore supplies no new angle.

Event/angle comparison used all titles and relevant bodies in the new edition and the
preceding two **ordinary** editions (`20260918T213919Z-f7d9`, `20260918T182557Z-8bc1`).
The intervening manual DeepSeek edition was not substituted for an ordinary comparison
window. AgentCore is a confirmed repeated angle; no other new same-event repetition was
found in those windows. Baseline windows and per-post decisions are also recorded. Broad
shared themes such as AI or galaxies were not classified as repeated events by themselves.

## Guarded corrections and limits

`scripts/correctScheduledAudit.ts` reuses the existing guarded correction planner and
validated publisher. Its [exact before/after record](../scripts/fixtures/editorial-scheduled-corrections-20260919.json)
contains nine posts: the two new posts above; six frozen-baseline current copies; and one
related article encountered during angle comparison. None of the original comparison
scores is overwritten by a corrected score.

Additional current-copy corrections are:

- `post-20260918T182557Z-8bc1-0`: replace NASA input-process discussion with sourced docked-lifeboat context.
- `post-20260918T094304Z-2e4a-0`: remove evidence IDs and separate historical 18-minute charging language from the review's approximately 20-minute current-model expectation on suitable chargers.
- `post-20260918T094304Z-2e4a-5`: remove unsupported size-to-recency inference and assertion that estimates were unreleased; use PBS's dated images/dimensions.
- `post-20260918T142908Z-67e3-1`: narrow the unanswered “why” title to the morphology actually described.
- `post-20260918T142908Z-67e3-2`: attribute the sovereignty/insurance interpretation to The Conversation's analysis rather than to Carney.
- `post-20260918T142908Z-67e3-3`: identify AWS's performance claim as a vendor claim and remove a universal idle-waste guarantee while retaining the operating tradeoff.
- `post-20260918T182557Z-8bc1-8`: incidental angle-comparison finding; remove two explicit descriptions of the excerpt, retaining vendor attribution and qualified operational commentary.

The migration preserves IDs, slugs, timestamps, sources, formats, unrelated posts,
coverage state, catalog and earlier correction records. It is idempotent, fails before
writing on an unexpected concurrent edit, and preserves a later edition in a focused test.
Permanent URLs continue to use original slugs even where the title is narrowed. These
changes are proposed by this PR; they are not deployed merely because local files changed.

Four benchmark examples add wrong/supported pairs for **components versus finished
weapons** and **permission versus performed action**. The 28-case benchmark now exposes
**twelve** semantic counterexamples that still pass deterministic provenance. It is not an
automatic fact-checker. No additional prompt heuristic is warranted here: #43 already
addresses qualifications, attribution and incomplete IDs, and has no eligible scheduled
observation yet. Independent optional-discussion validation remains intact.

## Source curation and access

The separate [12-page curation report](culture-source-review-20260919.md) adds four
validated narrow-payoff packets. It excludes the otherwise usable Medusa packet because
its angle is already published. No extraction/selection code, publisher bans, provider,
budget, schedule, architecture or frontend behavior changes.

Direct retrieval succeeded for eleven of eighteen distinct baseline/new source URLs.
Four Ars requests returned 403, two AWS requests timed out, and CBC timed out. The web
reader supplied readable originals for the four Ars and two AWS URLs; **CBC alone remains
unresolved among these eighteen**. Successful direct HTML hashes and separate web-reader
outcomes are recorded; access failure is never used as evidence of falsehood.
Prior #36 unresolved checks remain explicitly open: CBC Morrisseau post `...f7d9-11` and
AWS inference-review post `...f7d9-14`. Reading a different AWS source does not clear either.

Live desktop browser inspection covered the feed, ship article with both discussion turns,
and SID article with source/date display. Rendered originals matched the publication batch.
This verifies the published originals, not unmerged corrections, physical mobile behavior
or Cards fit. No manual deployment was performed.

## Gates and continuation

| Issue | Cumulative evidence at cutoff | Remaining |
| --- | --- | --- |
| #36 | **20 primary reviewed posts across 2 ordinary editions**, plus 2 new supplemental checks: **22 reviewed total**. First edition was the prior 16-post census; new primary sample is positions 0–3. Supplements are 4–5. | **3 more ordinary published editions**. Numeric twenty-post minimum is met, but five-edition and culture gates are not. First four from each next edition adds 12, giving 32 primary / 34 total before future supplements. Include required discussion/culture and account for unresolved checks. |
| #37 | **1/10 eligible runs**, 6 published, 4 fixed sampled articles, 2 supplemental. Frozen baseline remains 12 articles from 3 runs. | **9 more eligible ordinary scheduled free-router runs**, including failures/no-ops, with fixed sampling, initial source-hidden reading then claim/event-angle review. Segment pre-/post-#43 code. |

Offline source fixtures add **zero** observed articles or editions to either gate.
Keep both issues open. Future failures/no-ops count operationally for #37, not as published
#36 editions. Continue both sampling rules without selecting only successful or attractive
outputs. Reuse this frozen baseline assessment; disclose familiarity in future readings.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` passed, using the environment's
`--config.verify-deps-before-run=false` option to use installed dependencies without pnpm
12's automatic reinstall attempt. No project package-manager setting was changed.
The first lint check caught an unused variable in a temporary retrieval script; that scratch
script was moved out of the repository before rerunning. **270 tests in 30 files** pass;
build retains **268 permanent articles, 11 topic pages, 2.49 MiB**. Existing pnpm setting and
jsdom scroll warnings remain non-fatal. The 28-case benchmark, exact-support offline fixtures,
normal intake/consumed-source check, migration idempotence and concurrent/new-edition
preservation checks passed. No live generation was used as a test.

**Next useful action without waiting:** find a small set of accessible, unconsumed movie
craft and Sopranos interviews/criticism with complete offered payoffs. This pass's candidates
did not repair those two gaps; another generic reference-page quota would not do so.
