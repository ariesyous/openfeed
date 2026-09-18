# Openfeed product review: evidence appendix

September 18, 2026 · Snapshot `5737dd548129b3a6b1e0f6a0e3a8bc50e660e4c9`

Companion to [the decision document](openfeed-product-review.md). These are investigation records, not product changes. Post identifiers resolve within the named source batch; stored slugs remain authoritative. The selected full post bodies were read, not just titles or these annotations.

## Method and limits

Read 50 complete post bodies and their attached discussions from the repository. Reproducible selection: traverse `public/data/manifest.json` in stored newest-first order; take the item at zero-based `floor(itemCount/2)` from every batch (28); for each of the eleven topics in lexical order, take the newest and oldest remaining item in that same traversal (22 more). Final display order is manifest/batch order. This covers all 28 batches, all eleven topics and all four formats, and gives 18 September 18 items, 12 September 17, 15 September 16, and five September 15. Eight of the sample are explicitly handcrafted launch/sampler posts, leaving 42 recurring-generation examples. The manual examples establish an editorial target, not recurring-model reliability. This endpoint/batch-stratified sample overweights small batches and manual editions; do not report its subjective quality judgments as population error rates. Exact 50-item ledger follows.

Also scanned every title and performed a full-corpus word-count/phrase census. Targeted supplemental checks covered the three complaints supplied by the user, duplicate-event pairs, and the latest comet post highlighted in live review; these are not part of the 50-item sample or evidence of prevalence. Source-checked nine sampled cited originals plus the supplemental comet citation (ten original cited pages), with two primary follow-ups to settle factual disagreements. These checks are deliberately diagnostic, not random claim-level verification; most claims remain unchecked. Web checks show source text available at review time; the historical model packet is not persisted in public content, so exact historical input cannot be reconstructed from published JSON alone.

## Census (all 226 posts, 28 batches)

- 225 posts cite one source; one cites two. 127 include an AI discussion. Provenance is commonplace; triangulation is almost absent.
- Body word count: minimum 15, median 63, maximum 193; 30 under 40 words, 100 under 60, and 29 over 100. Shortness itself is not a defect, but many “explainers” have room only for an abstract summary.
- Formats: explainer 90, news 84, story 44, banter 8. “Not news” must not be treated as an evergreen label; old obituaries and fresh corporate releases appear as stories/explainers.
- Topics: Canada 36; AI & Agents 33; movies 29; science 28; philosophy 26; economics 20; technology 17; United States 11; world 11; Sopranos 10; mythology 5. The mythology promise is materially under-supplied. Routing can follow publisher region rather than subject: sampled marine invasion is under Canada, while the body discusses global/Caribbean mechanisms.
- 31 post bodies contain `excerpt` or `packet` (case-insensitive whole-word singular/plural); 19 posts contain those terms in discussion. These are lexical flags, not 50 distinct defects or a complete leakage count. The obvious “supplied material” complaint is missed by that regex. Latest edition includes the same leakage; it is not only historical.
- Largest source counts: Variety 25, NASA 25, SEP 22, CBC 20, AWS Machine Learning 18. BBC sections total 37. Publisher limits per edition are real, but topical relevance and worthwhile selection are a different issue.


## Citation checks

1. **Moon crater, sampled #35. Confirmed material distortion.** `post-20260916T223444Z-3323-2` calls it the largest crater ever found in the solar system and says a mountain-sized rock hit. The [cited NASA report](https://science.nasa.gov/solar-system/moon/nasas-moon-orbiter-spots-new-once-in-century-moon-crater/) says largest newly formed crater found, measures it at 728 feet wide, and estimates a three-to-six-story-building-sized impactor. Dropping the qualifying category and inflating the object changes the claim, despite a credible citation.
2. **Curiosity, sampled #29. Core scene largely supported; discussion invents/confuses background.** The [cited photojournal](https://science.nasa.gov/photojournal/curiosity-postcard-celebrates-rovers-5000th-day-on-mars/) supports date/time, camera, colouring, ridge, deck, antenna and MMRTG details. It does not support the discussion's 90-sol design lifetime or 4% annual power claim. A [NASA history page](https://www.nasa.gov/history/curiosity-celebrates-10-years-on-mars/) specifies an originally planned Martian year/687 Earth days, and the end of the prime mission on sol 669. Thus 90 sols is specifically wrong; other added discussion details were not fully checked.
3. **Many Saints, sampled #38. Confirmed relationship error.** The post and Context voice call Dickie an uncle to Tony Soprano's son. The [cited BFI review](https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos) identifies him as Christopher's father and an “uncle” to Johnny's son Tony. A simple subject/object relationship was altered.
4. **Nietzsche, sampled #3. Supported.** The [SEP entry](https://plato.stanford.edu/entries/nietzsche/) introduction directly connects psychological suspicion with proposals for values and cultural renewal. Good narrow synthesis. The generic discussion caveat about whether proposals succeeded adds little.
5. **MCP authorization, sampled #22. Mostly faithful mechanism; overbroad guarantee.** The [AWS walkthrough](https://aws.amazon.com/blogs/machine-learning/implementing-defense-in-depth-authorization-for-mcp-tools-on-amazon-quick/) describes sequential JWT checks, RBAC/ABAC, and server-side rechecks even if its interceptor is misconfigured. Openfeed generalizes this to assurance that a single misconfiguration cannot bypass compliance or expose data. That universal wording exceeds the specific configuration/pattern demonstrated; this is a scope warning, not proof that the whole post is false.
6. **Mythology, sampled #19. Main account supported, broadness should be qualified.** [World History Encyclopedia](https://www.worldhistory.org/mythology/) supplies the Gomme account and psychological meaning/order discussion. Openfeed generalizes this interpretive tradition across cultures; discussion's “deductive reasoning” gloss is not specifically established. It would be better to frame it as one way scholars have understood myth, preserving variants and other functions.
7. **SpaceX missions, sampled #1. Supported factual digest.** [NASA's announcement](https://www.nasa.gov/missions/station/commercial-crew/nasa-awards-spacex-three-crew-flights-to-space-station/) supports three named missions, $946m, contract type, services and total 17. The discussion's absent-date caveat is unnecessary to the useful summary.
8. **Sopranos visual style, sampled #42, handcrafted. Supported interpretive disagreement.** The [BFI essay](https://www.bfi.org.uk/sight-and-sound/features/tvs-crowd) contrasts director-specific cinema with recurring television house styles; the sample preserves the critic's position while inviting disagreement without fabricating scenes. Good voice reference, not evidence recurring generation reliably achieves it.
9. **Black-hole horizon, sampled #13. Body mostly faithful, discussion loses directionality.** [NASA's overview](https://science.nasa.gov/universe/black-holes/) says nothing can escape from beneath the event horizon. The Pushback says a boundary “nothing ... can cross,” a materially imprecise simplification. Good explanatory title and body should survive a stricter discussion check.
10. **Latest comet, targeted supplemental check, not in 50. Confirmed wrong entity.** `post-20260918T182557Z-8bc1-5` attributes a spin reversal to 3I/ATLAS. Its [NASA Comets landing-page citation](https://science.nasa.gov/solar-system/comets/) has unrelated feature teasers and a separate 3I/ATLAS list entry. The linked [NASA Hubble report](https://science.nasa.gov/missions/hubble/nasas-hubble-detects-first-ever-spin-reversal-of-tiny-comet/) identifies 41P/Tuttle–Giacobini–Kresák and dates the report March 26, 2026. Inference: unscoped landing-page prose let the model stitch different features together. Whatever the cause, the current published entity is unsupported and conflicts with the linked report.


## Sample ledger

Each ID maps to `public/data/batches/<batch>.json`, with the ID's final integer locating the post. Live article URL is `https://ariesyous.github.io/openfeed/p/<stored slug>/`. Notes are reviewer judgments; unless marked source-checked above, factual claims are not verified.

| # | Post identifier | Topic / format | Qualitative annotation |
|---|---|---|---|
| 1 | `post-20260918T182557Z-8bc1-0` | science / news | Concrete, supported contract digest; bureaucratic opening; discussion adds excerpt caveat. |
| 2 | `post-20260918T182557Z-8bc1-1` | technology / explainer | Good trust question, weakened by process framing; reported ad details not checked. |
| 3 | `post-20260918T182557Z-8bc1-2` | philosophy / explainer | Supported narrow philosophical idea; title rather abstract; unnecessary generic Pushback. |
| 4 | `post-20260918T182557Z-8bc1-3` | movies / explainer | Delivers taxonomy but no concrete film example; traditions list feels textbook-like. |
| 5 | `post-20260918T182557Z-8bc1-6` | canada / explainer | Specific research mechanism; Canada label poorly fits global/Caribbean subject. |
| 6 | `post-20260918T182557Z-8bc1-7` | ai_agents / news | Useful release specifications; enthusiastic vendor language; specifications not checked. |
| 7 | `post-20260918T182557Z-8bc1-8` | ai_agents / explainer | Relevant engineering distinction and attribution; repeated excerpt caveat. |
| 8 | `post-20260918T182557Z-8bc1-9` | economics / explainer | Useful nominal/real distinction; geographic scope omitted and excerpt caveat distracts. |
| 9 | `post-20260918T142908Z-67e3-2` | canada / story | Interesting Canadian relevance; title/claims need careful qualification; not source-checked. |
| 10 | `post-20260918T094304Z-2e4a-1` | united_states / news | Self-contained policy brief with coverage consequence; claims not checked. |
| 11 | `post-20260918T094304Z-2e4a-2` | world / news | Clear short royal-dispute summary, but little relevance or memorable discovery. |
| 12 | `post-20260918T094304Z-2e4a-4` | technology / story | Good concrete 40-foot-bridge hook; coherent brief; no broader tradeoff. |
| 13 | `post-20260918T055248Z-a06c-10` | science / explainer | Strong conceptual title/body; source-checked discussion loses escape directionality. |
| 14 | `post-20260918T052850Z-6af9-6` | ai_agents / news | Worthwhile activity-versus-value question, buried in missing-packet criticism. |
| 15 | `post-20260918T051502Z-5698-2` | movies / news | Useful dates/names; awards-positioning final paragraph asserts a generic signal. |
| 16 | `post-20260918T044314Z-6f06-7` | philosophy / story | Evocative prose, but recommends an unseen film rather than teaching much from it. |
| 17 | `post-20260918T044314Z-6f06-10` | the_sopranos / story | 25-word obituary body; discussion reveals betrayal with no spoiler flag; generic critics attribution. |
| 18 | `post-20260918T001434Z-fca7-8` | canada / news | Generic weather/harvest restatement; no distinctive quantity, mechanism or stakes. |
| 19 | `post-20260917T225126Z-4ac8-1` | greek_roman_mythology / explainer | Useful scholarly interpretation; broad universal framing and deductive-reasoning gloss. |
| 20 | `post-20260917T225126Z-4ac8-7` | the_sopranos / explainer | Concrete institutional history/branding tension; discussion can overstate necessity. |
| 21 | `post-20260917T221544Z-b692-7` | the_sopranos / explainer | Clear acting/character interpretation; redundant final sentence and excerpt caveat. |
| 22 | `post-20260917T211901Z-b489-5` | ai_agents / explainer | Useful authn/authz mechanism; overbroad security guarantee exceeds specific pattern. |
| 23 | `post-20260917T210452Z-a764-5` | ai_agents / explainer | Strong real implementation narrative; useful projected-versus-realised-savings pushback. |
| 24 | `post-20260917T181110Z-79ec-2` | ai_agents / explainer | Good feature digest but sounds like vendor marketing; asserted fairness/transparency not examined. |
| 25 | `post-20260917T165732Z-e5b6-2` | movies / news | Casting brief adds premise; discussion about crowded cast is manufactured tension. |
| 26 | `post-20260917T132440Z-8a01-5` | canada / news | Title promises mechanism; body never explains how fish challenged reactor safety. |
| 27 | `post-20260917T073610Z-8adf-4` | economics / news | One-sentence announcement gives little beyond headline; economics label weak. |
| 28 | `post-20260917T064428Z-a4d7-2` | science / story | Interesting physical imagery/numbers; Reply adds unchecked stellar-lifetime claim. |
| 29 | `post-20260917T055240Z-e9e1-4` | science / story | Rich concrete narrative and long body; discussion contains verified 90-sol error. |
| 30 | `post-20260917T012239Z-ee7a-2` | movies / story | Clear box-office projection; positive generic hype and speculative objection. |
| 31 | `post-20260916T234501Z-3d6a-2` | canada / story | Locally relevant industrial news; future possibility/cause wording needs checking. |
| 32 | `post-20260916T234501Z-3d6a-3` | movies / news | Efficient festival-selection brief, limited depth; title delivers. |
| 33 | `post-20260916T225444Z-f4f4-2` | canada / story | Specific sporting accomplishment; title grammar awkward and factual brief very short. |
| 34 | `post-20260916T223444Z-3323-0` | united_states / news | Striking conflict imagery; broad devastated-US-presence wording overstates what images establish. |
| 35 | `post-20260916T223444Z-3323-2` | science / story | Compelling discovery hook; verified crater-superlative and impactor-scale errors. |
| 36 | `post-20260916T163241Z-59da-2` | movies / explainer | Interesting cinema/TV theme; examples sketchy and 3D grouped loosely with widescreen. |
| 37 | `post-20260916T135418Z-305e-1` | philosophy / explainer | Useful overview but textbook title; discussion repeats body and process caveat. |
| 38 | `post-20260916T135418Z-305e-2` | the_sopranos / story | Good cultural context; verified family-relationship error repeated in Context. |
| 39 | `post-20260916T135418Z-305e-3` | canada / news | Competing electoral interpretations preserved; minor grammar error; evidence not checked. |
| 40 | `post-20260916T043253Z-14b2-2` | science / story | Institutional awards filler; title promises seven people but body names none. |
| 41 | `post-20260916T043253Z-14b2-3` | ai_agents / explainer | Compact useful caching mechanism; savings caveat/cache-hit condition included. |
| 42 | `post-interests-discussion-sampler-2026-09-16-0` | the_sopranos / explainer | Manual sampler: strong supported aesthetic disagreement; distinctive invitation to think. |
| 43 | `post-interests-discussion-sampler-2026-09-16-1` | greek_roman_mythology / story | Manual sampler: good myth-variation premise and nuance about audience expectations. |
| 44 | `post-interests-discussion-sampler-2026-09-16-2` | philosophy / explainer | Manual sampler: memorable practice-versus-perfection frame; good human voice. |
| 45 | `post-interests-discussion-sampler-2026-09-16-3` | economics / explainer | Manual sampler: one concrete economic mechanism and worthwhile ethical distinction. |
| 46 | `post-20260915T222213Z-0690-2` | science / explainer | Useful split between crops/health investigations; dense lists and likely simulants typo. |
| 47 | `post-editorial-launch-20260915-1` | world / news | Manual launch: sensible investment-pitch distinction, then excerpt leakage. |
| 48 | `post-editorial-launch-20260915-2` | technology / news | Manual launch: useful eligibility/adoption distinction, then excerpt leakage. |
| 49 | `post-editorial-launch-20260915-3` | science / story | Manual launch: concrete mission-systems distinction; claims not independently checked. |
| 50 | `post-editorial-launch-20260915-4` | technology / banter | Manual launch: brief genuine joke linked to topic; explicit generated-commentary label. |


## Workflow measurement and complete run ledger

Window: **2026-09-16 19:00:00Z through 2026-09-18 19:00:00Z**. Queried public repository actions/runs (first 100 returned records cover back through Sep15), filtered 25 generation runs in window, retrieved every job and its log. No missing runs in API response window. Metrics are actual job started_at → completed_at elapsed seconds, not billing records or token cost. Job time includes setup/publication; separate deployments excluded. Publication counts are explicitly logged successful public writes and are not editorial quality scores.

- 25 generation runs: 22 success, three failure, **201 published posts**. Total generation-job time 296m58s.
- 22 successful jobs: mean **12m52s**, median **11m07s**, total 283m00s.
- 20 jobs selected `openrouter/free`: 150 posts, 89 attempts; 18 succeeded. These span substantially different revisions and targets, so aggregate is descriptive, not a forecast of current behavior.
- Six free-router jobs at 20-post target: 75 published / 120 target, 43 attempts. Their sources/gates changed during period.
- **Current 27-feed cohort:** four runs. One manual DeepSeek yielded 20 in five attempts / 6m30s job time; three scheduled free-router jobs yielded 29 in 23 attempts / 103m09s total job time. This is the most relevant current-code free-router evidence but only n=3.
- Current free-router attempts: eight accepted chunks, nine retryable transport/empty completions, two invalid JSON, four validation rejections. Of the latter, two involved optional discussion (single turn or evidence unrelated to parent source), two excess evidence-ID counts. This supports investigating simpler discussion generation or independent acceptance after strict source checks; it does not justify weakening factual checks.
- Current free-router per-post observed job time: ~3.56 minutes/published post (not per useful post). Don't extrapolate exact monthly cost from three runs.
- Earliest two failures in window: successful candidate generation then old world-state `recentBatchSummaries` >5 bug, resolved before later runs. Third: manual invalid `deepseek/deepseek-flash-latest` model ID, since corrected. These are not current recurring free-router fatal failures.
- Scheduled starts: 12; min gap 2h28m, max 6h13m, median 4h29m. Eleven intervals observed; manual triggers are excluded. Configured schedule did not deliver hourly cadence in this window. Cause unknown.
- 47 Deploy-named workflows in this same window all reported success, but this includes PR validation and must not be reported as 47 production deployments.

Current-code examples:

| Run | Target / published | Attempts | Job time | Initial unused candidates | Main limiting evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| [35330968341](https://github.com/ariesyous/openfeed/actions/runs/35330968341) | 20 / 9 | 8 | 33m07s | 123 | 3 empty completions, one invalid JSON, one evidence-count rejection; one accepted chunk contained one post |
| [35356489904](https://github.com/ariesyous/openfeed/actions/runs/35356489904) | 20 / 4 | 7 | 45m16s | 141 | 45m budget reached after repeated empty completions/timeouts |
| [35380122228](https://github.com/ariesyous/openfeed/actions/runs/35380122228) | 20 / 16 | 8 | 24m46s | 155 | Optional discussion validation twice, evidence-count rejection once, empty completion once |
| [35312535630](https://github.com/ariesyous/openfeed/actions/runs/35312535630) | 20 / 20 | 5 | 6m30s | 132 | Manual DeepSeek, not free-router evidence |

Full run audit, newest first:

| Run | Start UTC | Trigger | Requested model | Conclusion | Published | Attempts | Job mm:ss |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| [35380122228](https://github.com/ariesyous/openfeed/actions/runs/35380122228) | 2026-09-18 18:25:46 | Scheduled | openrouter/free | success | 16 | 8 | 24:46 |
| [35356489904](https://github.com/ariesyous/openfeed/actions/runs/35356489904) | 2026-09-18 14:28:58 | Scheduled | openrouter/free | success | 4 | 7 | 45:16 |
| [35330968341](https://github.com/ariesyous/openfeed/actions/runs/35330968341) | 2026-09-18 09:42:53 | Scheduled | openrouter/free | success | 9 | 8 | 33:07 |
| [35312535630](https://github.com/ariesyous/openfeed/actions/runs/35312535630) | 2026-09-18 05:52:38 | Manual | deepseek/deepseek-v4.1-flash | success | 20 | 5 | 6:30 |
| [35310943867](https://github.com/ariesyous/openfeed/actions/runs/35310943867) | 2026-09-18 05:28:36 | Manual | deepseek/deepseek-v4.1-flash | success | 12 | 5 | 5:11 |
| [35310044742](https://github.com/ariesyous/openfeed/actions/runs/35310044742) | 2026-09-18 05:14:45 | Manual | deepseek/deepseek-v4.1-flash | success | 4 | 2 | 1:13 |
| [35309823975](https://github.com/ariesyous/openfeed/actions/runs/35309823975) | 2026-09-18 05:11:19 | Manual | deepseek/deepseek-flash-latest | failure | 0 | 1 | 0:15 |
| [35308019367](https://github.com/ariesyous/openfeed/actions/runs/35308019367) | 2026-09-18 04:43:00 | Scheduled | openrouter/free | success | 15 | 5 | 11:42 |
| [35290332260](https://github.com/ariesyous/openfeed/actions/runs/35290332260) | 2026-09-18 00:14:20 | Scheduled | openrouter/free | success | 16 | 7 | 30:56 |
| [35284074823](https://github.com/ariesyous/openfeed/actions/runs/35284074823) | 2026-09-17 22:51:13 | Manual | google/gemini-3.8-flash | success | 15 | 7 | 3:45 |
| [35281099399](https://github.com/ariesyous/openfeed/actions/runs/35281099399) | 2026-09-17 22:15:32 | Manual | openrouter/free | success | 15 | 8 | 16:11 |
| [35275949220](https://github.com/ariesyous/openfeed/actions/runs/35275949220) | 2026-09-17 21:18:49 | Scheduled | openrouter/free | success | 10 | 5 | 15:49 |
| [35274604582](https://github.com/ariesyous/openfeed/actions/runs/35274604582) | 2026-09-17 21:04:40 | Manual | openrouter/free | success | 10 | 4 | 4:49 |
| [35257250635](https://github.com/ariesyous/openfeed/actions/runs/35257250635) | 2026-09-17 18:10:57 | Scheduled | openrouter/free | success | 4 | 5 | 12:40 |
| [35249737884](https://github.com/ariesyous/openfeed/actions/runs/35249737884) | 2026-09-17 16:57:16 | Manual | openrouter/free | success | 4 | 5 | 17:08 |
| [35226874178](https://github.com/ariesyous/openfeed/actions/runs/35226874178) | 2026-09-17 13:24:30 | Scheduled | openrouter/free | success | 10 | 5 | 6:09 |
| [35195334919](https://github.com/ariesyous/openfeed/actions/runs/35195334919) | 2026-09-17 07:35:56 | Scheduled | openrouter/free | success | 8 | 5 | 10:32 |
| [35191157715](https://github.com/ariesyous/openfeed/actions/runs/35191157715) | 2026-09-17 06:44:14 | Manual | openrouter/free | success | 4 | 5 | 14:27 |
| [35187455068](https://github.com/ariesyous/openfeed/actions/runs/35187455068) | 2026-09-17 05:52:29 | Manual | openrouter/free | success | 9 | 5 | 15:04 |
| [35170298004](https://github.com/ariesyous/openfeed/actions/runs/35170298004) | 2026-09-17 01:22:28 | Scheduled | openrouter/free | success | 4 | 1 | 3:31 |
| [35163632906](https://github.com/ariesyous/openfeed/actions/runs/35163632906) | 2026-09-16 23:44:50 | Manual | openrouter/free | success | 4 | 1 | 1:19 |
| [35159898320](https://github.com/ariesyous/openfeed/actions/runs/35159898320) | 2026-09-16 22:54:31 | Scheduled | openrouter/free | success | 4 | 1 | 1:47 |
| [35158340992](https://github.com/ariesyous/openfeed/actions/runs/35158340992) | 2026-09-16 22:34:28 | Manual | openrouter/free | success | 4 | 1 | 1:08 |
| [35155614645](https://github.com/ariesyous/openfeed/actions/runs/35155614645) | 2026-09-16 22:02:28 | Manual | openrouter/free | failure | 0 | 1 | 8:28 |
| [35144440899](https://github.com/ariesyous/openfeed/actions/runs/35144440899) | 2026-09-16 20:05:26 | Scheduled | openrouter/free | failure | 0 | 2 | 5:15 |


## Live UX observation record

Browser: live GitHub Pages, desktop 1363×936, September 18. Matched newest source edition `20260918T182557Z-8bc1`. No supported mobile viewport or touch emulation was exposed; physical phone, landscape and enlarged-text checks were not performed.

| Exercise | Direct observation | Limit |
| --- | --- | --- |
| Initial feed | Dark theme; visible topic sidebar, four format filters, source dates, no rejected save/read controls. | Desktop only; no timing benchmark. |
| Topic navigation | The Sopranos link opened its real topic URL and relevant posts; old dated obituaries appeared beside recent generated ages. | Topic labels alone do not establish temporal relevance. |
| Article | Pastore heading opened permanent article, full discussion and source link; in-app Back returned to the topic. | Spoiler in discussion was already visible without a gate. |
| Cards progression | Twelve Next actions passed beyond the original first two posts; later distinct headings included retail sales, AgentCore, SuperCinema, Camus and reserve composition. | Not an exhaustive traversal of 226 posts. |
| Undo / article return | Undo restored Camus after advance; article→Back to cards retained Camus. | Mounted-session check. |
| Other controls | Keyboard right advanced to Poland/Pawlikowski; mouse drag on card background advanced to social-science measurement. | Mouse does not establish native phone touch reliability. |
| Layout | At a sampled fitting card, document height 936 matched viewport 936; visible card client/scroll height 789 matched. Full visible body and controls fit. | Does not establish longest-body fit or 200% text behavior. |
| Return visit | Reload selected Solipsism after earlier cards had been presented, consistent with local seen-ID persistence. | No cross-device persistence; presentation is not proof of reading. |
| Dates | Card displayed topic/format/source publisher, no source or post dates. | Verified both rendered state and SwipeCard code. |

No app-level error was established from the browser console: the captured errors were extension metadata messages and were not attributed to Openfeed.

## Baseline verification and capacity measurement

`pnpm install --frozen-lockfile`, typecheck, lint, 149 tests and production build completed successfully. Local pnpm was 11.19.0; package declares 10.33.0. Install emitted a warning that its package.json pnpm configuration location is no longer read by that local version. No lockfile/product changes resulted. Tests emitted jsdom scrollTo warnings; actual desktop Back was separately exercised. This is local validation, not a new CI/deploy run.

Build produced 226 articles, 11 topic pages, 508 files, 2,245,314 bytes. JS 343.96KB/104.56KB gzip; CSS 13.83KB/3.42KB gzip. Batch JSON 431,853 bytes across 28 batches; full source manifest 5,001 bytes. Article HTML/JSON pairs 1,378,248 bytes. Pair-plus-batch average 8,009 bytes/post is the linear projection basis. These are byte counts, not browser-memory or slow-network benchmarks.

Source-code references throughout the main document are fixed to the reviewed commit. GitHub API inspection established public repository visibility; the first 100 returned workflow records covered the entire stated 48-hour measurement window. All 25 generation jobs/logs were examined. No billing records, private account quota or model token-cost data were accessed.
