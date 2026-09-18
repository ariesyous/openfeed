# Openfeed product review

September 18, 2026 · Research and recommendations only

Reviewed main: `5737dd548129b3a6b1e0f6a0e3a8bc50e660e4c9`. Live desktop review matched its newest edition. Repository instructions were read first. No application, content, workflow, secret or deployment changes, model calls, merges or dispatches were made. This document and its [evidence appendix](openfeed-product-review-evidence.md) are the deliverables.

## Executive recommendation

**Make each visit reliably worth reading before increasing production.** Openfeed already has a compelling identity: a small personal magazine with the pace of a feed, moving between culture, ideas, useful technical developments and news. Its best pieces offer a memorable idea or a real interpretive disagreement. The static architecture is adequate for the next stage.

The most consequential weakness is **editorial trust and substance, not insufficient topic shuffling**. A real citation currently accompanies sentences that sometimes misidentify the subject, change a relationship or exaggerate a finding. In the latest edition, a post attributes a comet's spin reversal to 3I/ATLAS; the NASA report identifies 41P. Some other posts merely restate a headline or discuss the generator's source limitations.

Do these three improvements first:

1. **Make published claims traceable to coherent source context.** Build on pending PR #34's process-language fix; address the separate factual-support gap and correct verified errors through the existing publisher.
2. **Make the writing deliver one worthwhile idea, with discussion only when it adds something.** Pilot richer culture/ideas material within existing formats and call budgets; preserve independently valid posts when optional discussion fails.
3. **Finish Cards as a trustworthy reading surface.** Show temporal context and complete real-phone fit/touch verification, repairing only reproduced defects.

Keep `openrouter/free`, the twenty-post target as a ceiling rather than a promise, bounded retries, permanent content and current navigation. Defer a recommender, a larger batch target and a broad archive feature set. Try one curated related-reading path after the editorial work proves worthwhile.

**Begin with work package 1.** Better recommendation or swipe mechanics would otherwise distribute fluent mistakes more efficiently. This includes using the work already in #34, not starting another implementation of it.

## Evidence and confidence

The audit read 50 complete posts and discussions across all 28 batches, eleven topics and four formats. Selection took each batch's middle item, then each topic's newest and oldest remaining item. Eight sampled items were handcrafted launch/sampler material; 42 came from recurring generation. Nine sampled source pages and one supplemental citation were checked, plus two primary follow-ups. Exact IDs, judgments, source checks and reproducible selection are in the appendix. This is a deliberately broad diagnostic sample, not a random error-rate estimate; most individual claims remain unchecked.

All 25 generation runs and job logs in **September 16 19:00–September 18 19:00 UTC** were examined. Desktop browser testing used **1363 × 936**. The available browser has no viewport-resizing/mobile-touch capability, so no phone, landscape or enlarged-text claim is made. Current code and automated tests support hypotheses about those cases, not visual verification.

Baseline verification passed: typecheck, lint, **149 tests**, production build. Tests use mocked providers/jsdom and do not establish factual correctness or real touch reliability. Build: **226 articles, eleven topic pages, 2.14 MiB**. The checkout remained unchanged until these research documents were added.

## What the product actually does

Code references below are at the reviewed commit. `AGENTS.md` and `docs/reading-roadmap.md` supersede the fictional prototype in `ProjectSpecifications.md`; old bootstrap/world-generation and engagement code are not the active editorial product.

| Stage | Verified behavior | Main references |
| --- | --- | --- |
| Discover | 27 fixed feeds across 23 publisher groups; RSS 2.0, RSS 1.0 and Atom. Eight accepted articles/feed; normal intake age seven days with explicit longer culture/research windows. Fifty fixed evergreen pages, consumed once through durable URL coverage. Latest logs: fifteen unconsumed, two unavailable. | `generator/editorial/sources.ts:13–58,96–226`; `evergreen.ts:6–99`; `docs/source-feeds.md` |
| Retrieve | RSS descriptions/content, **not general linked-article retrieval**. Evergreen HTML paragraph extraction. HTTPS/domain checks, no redirects, 20-second timeout, 1 MB response bound. Excerpts cap at 6,000 characters; RSS minimum 80, evergreen minimum 300. Length is not coherent evidence. | `sources.ts:67–94,119–134,176–226`; `evergreen.ts:64–99` |
| Prepare evidence | Prefer longer excerpts within each topic; round-robin up to sixteen sources. Supply first twelve code-numbered spans/source, each at most 25 words/300 characters: at most 300 words/source. Metadata accompanies these spans. No semantic passage selection. | `generator/editorial/evidence.ts:9–53` |
| Write | Model selects topics, formats and up to four posts/request; title ≤150 characters, body 20–1,800 characters, one to three evidence IDs/post; optional two-to-four-turn discussion with evidence. Prompt requests variety, supported commentary, roughly half lasting material, no invented facts. These are aspirations, not enforced quality quotas. | `generator/editorial/prompt.md`; `generate.ts:18–70` |
| Validate | Code resolves IDs, checks exact provenance, dates, publisher/URL rules, source reuse and output-title duplication. News requires dated non-evergreen sources within 72 hours. Across chunks: at most two distinct sources/publisher group. No semantic claim-support or usefulness check. | `generator/editorial/generate.ts:74–175,277–285` |
| Retry / accept | Twenty-post edition; ≤4/request, **eight attempts total**, 45-minute shared deadline, ≤15 minutes/request, no new request with <1 minute left. Structured-output rejection may fall back to plain JSON with identical local gates; retry/backoff/jitter/Retry-After already exist. Empty successful selections defer offered sources for this run. Later failure preserves accepted chunks. | `generator/editorial/generate.ts:224–321`; `generator/retry.ts:65–180`; `generator/openrouter.ts:49–161` |
| Persist | One validated publish plan, then batch/manifest/accounts/world writes; accepted content committed once. No archive pruning. Permanent source URLs and normalized source headlines; only five recent summaries, ≤500 characters each, enter prompts. Enrichment discards exact evidence mappings, retaining citation metadata. | `generator/generate.ts:14–38`; `generator/publish.ts:40–125`; `generator/editorial/state.ts:22–46`; `generate.ts:177–222` |
| Run / deploy | Cron `17 * * * *`, manual trigger, schedule pinned to free-router; manual default free with optional other models. Serialized generation, 55-minute job timeout. Successful publication explicitly dispatches Deploy. PRs validate only; main/manual deploy validates and publishes Pages. | `.github/workflows/generate.yml`; `.github/workflows/deploy.yml` |
| Build / read | Vite plus static archive builder: stable article HTML/JSON, topic HTML, indexes of ≤50 **batch references**. Initial feed loads accounts, newest index and one batch. Topic indexes select matching editions but still download whole mixed-topic batches. Direct article pages do not download the feed. | `scripts/buildArchive.ts:8–102`; `shared/articles.ts`; `src/hooks/useFeed.ts:40–132`; `src/App.tsx:12–73` |
| Choose / return | All 226 engagement records are zero, so legacy ranking effectively leaves newest editions/model order. Explicit arrivals preserve active reading; in-app Back restores feed/topic/position. Cards prefer unseen different topics, keep ≤10,000 presented IDs locally, Undo ≤30, search ≤3 additional chunks/action. Ordinary feed has no persistent read history. | `src/lib/ranking.ts`; `src/lib/cardSelection.ts`; `src/hooks/useCardDeck.ts`; `src/App.tsx:80–129` |

Architectural commitments are static Pages delivery, offline generation, versioned JSON and no browser inference/backend. Permanent retention and the existing controls are product decisions. Batch size, attempts, evidence selection, optional discussion, topic balance, static indexes and ranking are configurable. Fictional personas, fake engagement and the old retention policy are historical scaffolding, not requirements to revive.

### Current work and backlog

[PR #34](https://github.com/ariesyous/openfeed/pull/34) is **open, unmerged**. Its inspected diff adds explicit finished-writing instructions, preserves useful commentary and evidence-backed uncertainty, and adds a focused process-language regex gate to titles, bodies and discussion. It also corrects the three reported `20260918T055248Z-a06c` posts. It is not deployed and does not provide semantic fact-checking. Do not duplicate it or assume all older leakage will disappear.

PRs #27–33 are merged: adaptive Cards/gesture fixes, twenty-post editions, request-specific evidence/publisher constraints, corrected manual model choice, empty-selection recovery and expanded feeds. Issues #18–21 are closed. [Issue #25](https://github.com/ariesyous/openfeed/issues/25) remains open specifically for mobile/accessibility/usability verification; Cards itself exists. The roadmap's remaining ideas include topic weights, related reading, recurring columns, archive search and RSS. Saved/Mark read/Mark caught up remain rejected.

## Content and experience findings

### What already works

The best recurring material gives a portable idea: Nietzsche's suspicion as part of a constructive project (`post-20260918T182557Z-8bc1-2`) is a supported narrow synthesis. The MRH Trowe implementation story (`post-20260917T210452Z-a764-5`) makes a technical case concrete and distinguishes projected savings in discussion, although its claims were not independently checked here. The handcrafted Marcus Aurelius and Sopranos visual-style posts show the desired voice: a specific idea and an interpretation worth considering, rather than an artificial argument.

Dark default, prominent desktop topics, permanent articles, source links and Back restoration work in the live desktop review. Twelve Next actions, keyboard advance, mouse-background dragging, Undo, article→Back and reload reached different posts; the former two-card loop was not reproduced. The measured visible card and page fit the desktop viewport without vertical scrolling. A fresh return skipped previously presented cards in this browser. This does not prove phone behavior or that presented means read.

### Four different problems

| Problem class | Evidence and implication |
| --- | --- |
| **Content quality** | Latest comet `...8bc1-5` names the wrong comet. Moon crater `...3323-2` turns a newly formed-crater finding into a largest-ever solar-system claim and inflates impactor scale. Many Saints `...305e-2` changes Dickie's relationship to Tony. Curiosity `...e9e1-4` adds an incorrect 90-sol lifetime in discussion. Sources/checks below. These require editorial support, not CSS or more retries alone. |
| **Generation reliability** | Current free-router cohort produces partial editions despite ample input. Optional discussion failures waste some attempts, but transport/empty completions dominate. A green job is not proof of twenty posts, much less twenty useful posts. |
| **Feed selection** | Only **11/225 adjacent pairs** share a topic; newest edition has one such pair. Coarse variety already works. Exact URL/headline coverage misses repeated events: Saskatoon closing-argument posts `...b692-12` and `...6af9-11`; crocodile/Olympic hook `...8a01-3` and `...b489-0`. Event novelty matters more than a topic shuffle. |
| **Interface / time context** | Cards omit both post and source dates. A story generated recently from a 2025 obituary can look current, especially in Cards. Feed source dates exist but compete with prominent generation age. Mobile fit/touch remain unverified. These need temporal presentation and device testing, not generator rewrites. |

The [NASA Hubble report](https://science.nasa.gov/missions/hubble/nasas-hubble-detects-first-ever-spin-reversal-of-tiny-comet/) identifies **41P**, while Openfeed's latest comet piece says **3I/ATLAS** and cites a broad [Comets landing page](https://science.nasa.gov/solar-system/comets/). That page juxtaposes separate features. Mixed-source-context stitching is a plausible cause, not a reconstructed historical trace. The [NASA crater report](https://science.nasa.gov/solar-system/moon/nasas-moon-orbiter-spots-new-once-in-century-moon-crater/) and [BFI Many Saints review](https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos) directly support the other corrections. See the appendix for Curiosity and all ten citation checks.

Of 226 posts, **225 cite one source**; median body length is **63 words**, with 100 under sixty. This is not automatically too short. The problem is promise versus payoff: the fish/reactor title (`...8a01-5`) never explains the safety mechanism; a NASA awards item (`...14b2-2`) names none of its seven researchers; the continental film-philosophy item (`...8bc1-3`) lists traditions without a film example. Longer output from the same thin packet would invite invention.

Format census: 90 explainers, 84 news, 44 stories, eight banter. **Non-news is not equivalent to evergreen.** Topics include Canada 36, AI 33, movies 29, philosophy 26, Sopranos ten, mythology five. Broad candidate abundance conceals shortages in particular interests. Routing also sometimes follows publisher rather than subject: Caribbean/global marine invasion appears under Canada.

Discussion can add an actual disagreement, but often restates the body or invents generic pushback. It is present on 127 posts. The Pastore obituary (`...6f06-10`) exposes a plot betrayal in its preview without a spoiler flag and attributes an objection to unspecified critics. Main still contains source-process language in recent ads, AgentCore and retail items. Lexical census flags “excerpt/packet” in 31 bodies and nineteen posts' discussions; these overlap and are flags, **not a measured defect rate**. Preserve ordinary attribution and real-world uncertainty while removing drafting-room commentary.

## Throughput: would more content help?

In the 48-hour window, 25 generation runs produced **201 published posts**; 22 succeeded and three failed. Successful job duration averaged **12m52s**, median **11m07s**. This mixes revisions and manual models and is not a current free-router forecast. Earlier failures were a now-resolved state-summary overflow and an invalid manual model ID.

The current 27-feed scheduled free-router cohort is more informative, though only three runs:

| Run | Published / target | Attempts | Generation-job duration | Unused source candidates |
| --- | ---: | ---: | ---: | ---: |
| [35330968341](https://github.com/ariesyous/openfeed/actions/runs/35330968341) | 9 / 20 | 8 | 33m07s | 123 |
| [35356489904](https://github.com/ariesyous/openfeed/actions/runs/35356489904) | 4 / 20 | 7 | 45m16s | 141 |
| [35380122228](https://github.com/ariesyous/openfeed/actions/runs/35380122228) | 16 / 20 | 8 | 24m46s | 155 |

**29 published / 60 targeted**, 23 attempts, **103m09s** job time. Eight accepted chunks; nine transport/empty-completion retries; two invalid JSON; four validation failures, two involving optional discussion. These are published counts, not 29 reader-useful posts. A separate manual DeepSeek run's twenty posts in 6m30s must not be credited to free-router.

Only twelve scheduled starts appeared in 48 hours, with intervals **2h28m–6h13m**. Hourly cron is verified; hourly execution is not. GitHub documents that schedules can be delayed or dropped, but these logs do not establish the cause of these gaps. Show actual publication time rather than promising hourly freshness. [GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The repository is public and uses standard `ubuntu-latest` runners. GitHub documents standard public-repository runner use as free/unlimited: included private-repository minutes are not the demonstrated financial bottleneck here. Latency, concurrency, provider limits and maintenance still matter. The account's OpenRouter allowance was not inspected. [GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits).

More **useful, supported, distinct** material could solve genuine depletion. Raising the target alone currently amplifies defects and cannot reach forty with four posts/request and eight attempts: even eight perfect calls yield at most 32. Keep the current budget; compare useful output and actual reader exhaustion before expanding it. The latest candidate counts argue against another indiscriminate feed expansion as the throughput fix.

## Prioritized opportunities

Effort estimates assume one maintainer familiar with this code and include focused tests, not elapsed waiting for a ten-run/ten-session evaluation. They are planning ranges, not commitments. No retention uplift has been measured.

| Priority | Recommendation and reader example | Evidence / expected value | Cost and tradeoff |
| --- | --- | --- | --- |
| **1** | Coherent evidence and finished, supportable posts. The comet piece describes the correctly identified object; uncertainty and interpretation retain their proper scope. | Strong: verified contradictions, latest leakage, lost evidence trace. Highest trust value. | Medium, ~3–5 development days; no extra model calls required initially. More abstention is acceptable; deterministic rules cannot prove semantics. |
| **2** | Evidence-matched depth and selective discussion. A film item explains one sourced craft decision; a myth item identifies a variant; a technical post explains a concrete tradeoff. A brief stays brief. | Strong evidence of shallow/forced output; positive examples establish direction. Reader-value improvement remains a hypothesis. | Medium, ~2–4 days plus bounded editorial curation. Same call budget; potentially fewer tokens/retries. Depends on #1's coherent input. |
| **3** | Temporal honesty and verified Cards. An old obituary visibly says when it was reported; a full unchanged post fits supported phones or has the explicit article escape. | Strong missing-date evidence; mobile failure status uncertain. High usability/trust value without new navigation. | Small–medium, ~1–3 days plus physical-device access; zero model calls. Metadata competes for card space. |
| **4, later pilot** | One curated three-post reading path, e.g. an existing Marcus Aurelius item → Stoicism → a contrasting account of well-being, only after each link teaches something distinct. | Observed external pattern; archive relevance not yet proven. More promising than arbitrary shuffle, but weaker evidence than #1–3. | Small, ~1–2 days, ongoing curation; zero model calls. A few ID/reason links, no duplicated bodies. Forced links or spoilers would damage discovery. |
| **5, monitor then act** | Capacity/runway reporting and targeted payload reduction. Reader gets fast access to old work without losing URLs. | Measured linear storage/rebuild growth; current output is tiny. | Hours for a report; future optimization medium. Zero model calls. No migration or premature caching/virtualization project now. |

### Mechanisms and practical limits

**1 — Improve support before adding a model judge.** Treat landing-page teasers as separate entities, reject unscoped collections as article evidence, and preserve sentence/paragraph context within existing limits. A bounded audit artifact should capture selected evidence text/IDs, URL, retrieval time, accepted post IDs and resolved model; keep it out of `public/data` and avoid whole copyrighted articles. An Actions artifact in this public repository must not be described as confidential. An illustrative 2–8 KiB/post support record would add roughly 0.34–1.37 GiB/year at the full 480/day ceiling if retained forever, or 28–113 MiB for a rolling thirty-day window. This is a sizing assumption, not a bound: body and discussion may reference fifteen distinct snippets, plus metadata/context. Measure representative records and use bounded diagnostic retention, independently of permanent post retention. Better source selection may reduce available output initially. Explicit quote/ID checks, number/entity flags and fixtures are useful filters, not semantic guarantees. AP's approach of treating generated output as unvetted editorial material supports this distinction; Openfeed does not adopt AP's different publishing model. [AP AI standards](https://www.ap.org/the-definitive-source/behind-the-news/standards-around-generative-ai/).

**2 — Spend the same generation budget on payoff.** The existing prompt already asks for rich formats; merely adding adjectives will not fix it. Pilot twelve to twenty coherent, topic-relevant source packets, prioritizing mythology/culture gaps, with two explicit exemplars: a concrete mechanism and a supported interpretive disagreement. Use existing formats and body limits; no uniform length requirement, new personas or compulsory debate. A post must answer its title with at least one specific supported detail or consequence. Default discussion to absent unless a real tension is supported. Parse optional discussion independently so its failure can omit that whole optional block only after the parent and all edition gates pass; never repair evidence IDs or drop factual safeguards. This could recover some wasted calls, not the nine transport failures in the current cohort. Public payload should stay similar or fall if fewer discussions; richer bodies may offset that. Retrieval remains bounded and allowlisted; no new crawling service. More curation is an ongoing cost, so measure supported worthwhile posts per editorial hour as well as per model attempt.

**3 — Make age and fit explicit.** Use existing source dates to distinguish “reported [date]” from “added [date]”; undated background remains undated. Apply a compact version to Cards and clarify feed age labels. Do not call every explainer evergreen. Preserve content, font floor, source links, spoiler gates, Next/Different topic/Undo and no vertical card scrolling. W3C text-resize/reflow guidance makes enlarged reading a real requirement, but does not require every article to occupy one screen. Arbitrary unchanged text, arbitrary small viewport, readable type and zero scrolling cannot all be guaranteed. The existing article fallback is honest; smaller and smaller type is not a general solution. No schema migration/model calls; page-byte increase is negligible relative to current JS, with slightly more layout work. [W3C Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

**4 — Prove one discovery path before building a graph.** SEP exposes meaningful [related entries](https://plato.stanford.edu/entries/stoicism/#Rel); [Kagi Small Web](https://kagi.com/smallweb/) offers category/Similar/next discovery. These demonstrate mechanisms, not causal retention results. Begin with a small reviewed mapping on full article pages, one purposeful onward link and a truthful reason. Build emits references, not generated summaries; approximately a few kilobytes for the entire pilot. No start-up archive download or global recommender. Abandon if most connections merely share a topic, repeat the same fact, or fail to make follow-up reading worthwhile. Only then test a small explicitly reviewed evergreen shelf with “From the archive,” using local presented IDs as optional repeat avoidance. Do not treat a swipe as a durable preference.

**5 — Measure growth, preserve retention.** Current output is 2,245,314 bytes/508 files. Article HTML/JSON plus original batches add roughly **8,009 deployed bytes/post** at this mix. Bodies appear in batch JSON, article JSON, rendered HTML and embedded HTML data. Every deployment rebuilds the entire archive. At 120 published posts/day, linear content growth is ~335 MiB/year; at 480/day, ~1,338 MiB/year, reaching the existing 750 MiB warning in ~204 days and decimal 1 GB in ~260 days. These estimates exclude changing lengths, Git compression/history and index/state overhead. Pages' published-site limit is 1 GB; permanent positive growth cannot fit finite hosting forever. This does not justify deleting content or migrating now. Track bytes/post, build/upload duration and runway; investigate redundancy/static sharding before <6 months of projected headroom, a proposed operating threshold. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

Initial downloads are already bounded: newest batch ~30.6 KB uncompressed, JS ~344 KB/~105 KB gzip, CSS ~14 KB/~3.4 KB gzip. Archive growth affects full builds, Git catalog/coverage, uploads and long browsing sessions, not automatically first-load bytes. Feed and Cards retain independent loaded arrays; normal feed DOM is unbounded. Add virtualization/cache work only after a long-session benchmark reproduces a problem. Lazy static search such as [Pagefind](https://pagefind.app/) is feasible later, not a reason to add a backend now.

## Three implementation work packages

### WP1 — Source context, editorial integrity and auditability

**Scope:** Review/integrate #34's existing work in a future implementation; scope evergreen extraction to coherent article/section prose and reject mixed teaser collections; retain a bounded support audit record; add an editorial benchmark of twelve good/bad examples including the four verified factual errors, appropriate attribution, real uncertainty and acceptable commentary. Review and correct verified published mistakes through `buildPublishPlan/writePublishPlan`, preserving IDs/slugs/dates and a correction record. This assignment did not make those corrections.

**Likely files:** `generator/editorial/{evergreen,evidence,generate,diagnostics,prompt}.ts/md`, pending `voice.ts`, generator fixtures/tests, `generator/publish.ts` only if correction metadata requires it; diagnostic artifact upload in `generate.yml` only during authorized implementation. Do not put evidence packets in frontend bundles.

**Acceptance:** mixed comet-feature fixtures cannot become one evidentiary subject; accepted claims preserve named entities, relationships, numbers and qualifiers in the reviewed benchmark; exact input support is inspectable for sampled new posts. Process-language examples fail while legitimate uncertainty/humor pass. Existing provenance/freshness/publisher/publish-plan checks remain strict. No claim of universal automated fact-checking.

**Testing/validation:** extraction and negative publication fixtures, #34 voice regressions, existing CI, then source-check twenty posts across at least five subsequent editions, including discussion and two culture topics. Record newly found error types separately from fixture passes. Abandon a source adapter that repeatedly yields mixed/boilerplate context; fall back to exclusion or coherent shorter material. Reject a detector that routinely blocks supported interpretation. If fresh serious errors persist, tighten source eligibility and trial a bounded semantic-review step before broadening output; a second free model must earn its added calls on this benchmark.

### WP2 — Worthwhile depth and optional discussion

**Scope:** On WP1's coherent inputs, trial twelve to twenty source packets for concrete mechanisms, myth variants/cultural context and sourced interpretive disagreement. Improve the existing prompt examples and evidence selection without adding format labels or length quotas. Independently validate optional discussion; omit it with a diagnostic when the entire parent still passes. Add a small manual event/angle review to the evaluation; do not build a semantic dedup service.

**Likely files:** `generator/editorial/{prompt,evidence,generate,evergreen,diagnostics}`, `generator/__tests__/{editorialGeneration,editorial,evidence}.test.ts`, existing diagnostics documentation. No frontend or provider-default change required.

**Acceptance:** no compulsory Take/Pushback; no extra facts smuggled through opinion; weak source packets may yield fewer posts. The parent never survives its own invalid evidence/voice/freshness/edition checks. Invalid discussion never reaches publication; dropped discussion is counted. Twenty/four/eight/45-minute constraints and partial-publication behavior stay unchanged. Recurring output includes some supported culture/ideas depth, without pretending all eleven topics can be filled each hour.

**Testing/validation:** focused cases for valid parent/invalid discussion, invalid parent/valid discussion, cross-source citations, publisher limits, spoilers and exhausted budgets. Blind-read comparable baseline and pilot pieces for title payoff, one memorable detail, unsupported claims and redundant commentary. Observe at least ten scheduled free-router runs, recording raw candidates, accepted/published count and sampled useful yield separately. This future trial replaces normal generation within its budget; no model experiment ran for this review. If depth adds padding, makes cards unusable or raises errors, abandon the forced depth and improve source selection. If independent discussion validation saves little, keep it simple and do not extend it into complicated per-field salvage.

### WP3 — Temporal context and completion of Cards verification

**Scope:** Compact source-date/context labels on Cards; distinguish feed generation time from reported time. Complete issue #25's device matrix with current longest posts and the added metadata. Retain unchanged article text and explicit no-fit article link. Fix only reproduced interaction/layout defects; no rewritten summaries or replacement card framework.

**Likely files:** `src/components/{SwipeCard,PostCard,CardView}.tsx`, `src/lib/{relativeTime,fitCardText}.ts`, `src/index.css`, relevant component/card tests, `docs/card-mode.md`.

**Acceptance:** fresh news, old dated stories, multiple source dates and undated background are unambiguous; unknown dates are never inferred from retrieval/generation. At 390×844 and 360×740 portrait, navigation/sources and fitting full copy remain visible without vertical scrolling; no clipping or text below the agreed floor. Non-fitting content has a usable article escape and skipping cannot loop. Physical touch tests cover title/source starts, diagonal/cancelled/multi-touch gestures; taps, text selection, Undo and article Back remain correct. Test landscape, enlarged text and reduced motion; document exceptions rather than claiming universal fit.

**Testing/validation:** date fixtures plus existing gesture/fit tests; rendered desktop/mobile checks and a short physical-phone trial are the release gate. Record which long posts need fallback and whether reading feels comfortable, not just whether dimensions fit. No browser-local event is called “read.” If extra metadata makes common cards unusable, simplify its layout; if unchanged long copy cannot fit accessibly, keep the explicit article escape rather than silently shrinking, cropping or rewriting. Do not close #25 solely because jsdom passes.

## Evaluation without an analytics backend

Use ten ordinary reading sessions, changing one layer at a time. Keep a small local/manual diary: “worth the visit?”, one remembered idea, one disappointing post ID, unwanted repeated events, useful unseen material exhausted, and any trust/fit failure. Session length, swipes and source clicks are diagnostic signals, not success outcomes.

Maintain three separate counts: **generated drafts → validator-accepted/published posts → sampled source-supported and worthwhile posts**. The last category requires judgment: a clear payoff, supported material claims, no process complaints and a materially distinct contribution. Do not extrapolate a useful-post total from this non-random fifty-item sample. In a future rollout, use a fixed per-edition sampling rule and report numerator/denominator and rubric, not just a model quality score.

Existing logs already support attempts, duration, resolved model, failure reason, target and publication count. Add a compact review worksheet and optional exportable local fit/repeat diagnostics only if useful. Local state is device-specific, clearable and may be blocked; absence means missing evidence, not zero reading. No accounts, central telemetry, read/save buttons or persistent dislike inferred from Next are needed.

## Do not build now

- **Forty-post batches, larger retry budgets or more arbitrary feeds:** current useful yield and latency do not justify them; aggregate input supply is ample. Revisit only after the reader repeatedly exhausts supported worthwhile inventory.
- **Generic diversity ranking or heavy personalization:** coarse topic sequencing already works. MMR offers a valid relevance/novelty mechanism, not evidence this feed needs a recommender. Explicit optional topic preferences could later be browser-local; don't infer them from Next. [Original MMR paper](https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf).
- **A second summary/daily dashboard by default:** [Kagi News](https://help.kagi.com/kagi/news/) demonstrates digest/depth choices, but Openfeed's posts are already short and this reader dislikes extra controls. Trial a curated selection before shipping another surface.
- **Mandatory model judge or debate on every post:** adds cost, latency and correlated mistakes. A small controlled semantic-review experiment is justified only if it detects errors better than cheaper source restrictions and audits.
- **Large related graph, full search, embeddings service, backend/accounts or framework rewrite:** no evidence these solve today's highest-value problems. One reviewed path and lazy static search remain viable later.
- **Streaks, notifications, fake social proof, invented people or manufactured controversy:** conflict with the product's reading/trust objective.
- **Automatic deletion or silent shortening for capacity/card fit:** violate settled retention and reading requirements. Preserve access and be explicit about physical/hosting limits.

## Unresolved questions

Real-phone touch/fit, source packet contents at the time of old generations, schedule-gap causes, account-level OpenRouter limits and general reader satisfaction remain unknown. A source check today cannot fully recover an old model input. Three current free-router runs are too few to predict long-term yield. Whether deeper pieces or related paths improve return visits needs the bounded personal trial, not a retention claim borrowed from another product.

The proposed sequence intentionally improves source integrity, editorial payoff and reading reliability before adding a new discovery system. Its strongest opportunity is to make the promising compact magazine already present in Openfeed dependable.
