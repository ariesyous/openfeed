# CoBanter agent notes

## Current direction — September 15, 2026

The user explicitly rejected fictional people, places, and manufactured drama. The
current product is a source-grounded reading feed: useful explainers, real stories,
relevant news, and clearly labelled generated banter. Dark mode is on by default.
This direction supersedes the original fictional-world specification.

## Active architecture

- `src/`, `schemas/`, `public/data/`: static React frontend and shared contracts.
- `generator/generate.ts`: active entry point, calls `generator/editorial/`.
- `editorial/sources.ts`: fixed publisher feeds, bounded XML, date/domain validation.
- `editorial/prompt.md`: editorial voice, source grounding, no fictional news.
- `editorial/generate.ts`: validates citations/evidence, enriches source metadata.
- `editorial/state.ts`: tracks covered source URLs, never invented storylines.
- `generator/publish.ts`: sole validated writer for public data and world state.
- `.github/workflows/generate.yml`: manual model selection plus enabled schedule every three hours using deepseek/deepseek-v4.1-flash.
- `.github/workflows/deploy.yml`: validates, builds, and deploys pushes to main.

The old bootstrap/advanceWorld modules and `scripts/seed/` are historical code, not the
active generator. Do not reconnect them to `pnpm generate` or the live feed. `seed:legacy`
is only for intentionally recreating the old development fixtures.

## Important behaviour

Every editorial post has real source links, original publication dates, and a format.
News requires sources within 72 hours. News-oriented RSS intake is at most seven days old; culture feeds have explicit longer windows.
A bounded evergreen article shelf supports older criticism and reference material.
Evergreen sources never qualify as news; missing publication dates stay unknown.
Unknown source IDs, mismatched evidence quotes, duplicate coverage, unsupported URL
schemes, and publisher-domain mismatches fail validation. Never fabricate sources as a
fallback. An empty intake or empty editorial result preserves the existing feed.
Exact-quote checks establish provenance, not semantic fact-checking; live editorial
quality and entailment still require review. Thin excerpts must not be padded with
unsourced facts. Banter is visibly generated commentary, not eyewitness testimony.

The launch edition was prepared from retrieved source packets to demonstrate the new
format. It is not evidence of successful recurring OpenRouter generations. The user approved hourly scheduling after successful live run 35104908350;
the former FEED_SCHEDULE_ENABLED rollout gate has been removed.

## Verification and credentials

Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before pushing changes.
Never commit/log OPENROUTER_API_KEY or put it in frontend code. No model calls in browser.
Model choice is configurable via OPENROUTER_MODEL (manual Actions uses its dropdown).
All public/state writes must go through buildPublishPlan/writePublishPlan after validation.


## Reader direction — September 16, 2026
Movies, The Sopranos, agentic AI, Canada/US/world news, Greek and Roman mythology,
philosophy, economics, interesting facts and stories. Prefer a varied reading mix,
roughly half timely and half lasting material when supported. Recent edition summaries
are passed into generation to discourage repeated angles.

Editorial discussions are optional 2–4 AI-generated perspectives in editorial.discussion,
not legacy comments, synthetic people, or fake engagement. Each draft turn has evidence
from its post's attached sources; exact provenance is still not semantic verification.
Spoiler-marked bodies and discussions stay hidden until requested; titles must be safe.
The interests-discussion sampler is a manually prepared, retrieved-source edition,
not a live OpenRouter run. The evergreen shelf is finite and must be expanded as used.


## Editorial generation reliability
The editorial request carries a strict JSON schema derived from Zod; nullable transport
fields normalize to optional draft values. Both structured and fallback output pass the
same local evidence validation. Editions target twenty posts in requests capped at four, sharing eight total attempts and a shared 45-minute generation deadline (55-minute workflow timeout). Keep `openrouter/free` as the manual default; Gemini, DeepSeek Flash, and (added September 27) `stealth/space-bunny-alpha` are optional manual selections.
At the user’s request on September 19, scheduled runs are enabled every three hours at minute 17 (UTC)
and pinned to `deepseek/deepseek-v4.1-flash`. Earlier free-router observation records
remain historical; scheduled DeepSeek runs are not free-router cohort evidence.
Keep attempt diagnostics bounded and credential-redacted; log failure details and
available resolved-model/finish metadata instead of dumping completions.


## Numbered evidence
Active editorial generation uses evidenceIds chosen from code-built verbatim snippets.
`evidence.ts` bounds input to 16 sources across topics and 12 snippets per source.
`validateCitedDraft` resolves IDs before calling the unchanged core evidence checks;
model-supplied quotation text is not used. Keep unknown-ID and cross-source discussion
checks strict. These checks prove provenance, not semantic entailment.
Local tests use mocked provider responses. Live free-router run 35104908350 and its
deployment succeeded; continue monitoring recurring output quality.

## Permanent content and reader state — September 17, 2026
The user explicitly requires forever retention. Never reintroduce automatic age- or
capacity-based content deletion. Keep source batch files and stable article slugs.
`shared/articles.ts` assigns slugs; `scripts/buildArchive.ts` builds static article
HTML/JSON and paginated deployment indexes. `public/data/manifest.json` in Git remains
the complete publication catalog; the deployed manifest is only the newest index page.
`pnpm archive:backfill` validates through the publish plan before writing migrations.

Generator URL and normalized-source-title coverage is durable; only recent summaries
are passed to models. Requests share one eight-attempt budget across the whole edition.
Cross-chunk evidence, freshness and publisher validation must remain strict. Preserve
accepted chunks on later provider failure, but publish only once after validation.

The user subsequently rejected Saved, Mark read, Mark caught up and the topic dropdown.
Keep those controls removed; use a desktop topic sidebar and mobile horizontal topic
buttons. Preserve feed filters/position on in-app Back, explicit new-arrival loading,
and spoiler protection in both prebuilt HTML and React. Tests and the build
run for PRs without deployment. Read docs/reading-roadmap.md for settled decisions.

## Topic URLs — September 17, 2026
Topics are destinations, not temporary filters. `shared/topics.ts` owns stable topic
IDs/slugs and is shared with the generator. Sidebar and article topic labels must
remain real links; ordinary clicks navigate in-app, modified clicks stay native.
The archive build emits `/topics/<slug>/index.html` and bounded per-topic indexes,
referencing existing source batches. Topic archive cursors remain relative to
`data/`. Article Back keeps the active topic feed mounted; switching topics starts
that topic's own feed. Unknown topic routes show a not-found state.

## Card mode — September 17, 2026
The user authorized implementation of #25. Cards are an alternative view of the
same existing title/body/source data. Do not add summaries, shorten copy, change
generation, or introduce page/internal scrolling. `SwipeCard` measures the reading
area and scales the unchanged text to fit, down to a body floor of .8125rem
(13px with default settings). The user requested adaptive sizing after mobile
overflow. Only if that still fails, show an explicit article-link notice; never
silently clip content. Explicitly advancing past an unfit card excludes it for the
mounted session, without falsely recording it as presented. Browser layout verification is
still needed after deployment because local previews are blocked in the managed
browser. Keep article discussion available through the full article link.

Cards browse all topics via `?view=cards`. Left means a different unseen topic;
right means the next unseen article, not a like. `useCardDeck` bounds archive search,
retains the current card during article navigation/new editions, and allows explicit
Undo/revisiting. Seen IDs are versioned, browser-local, and recorded only for visible,
fitting cards; hidden tabs and loaded batches are not presentation. No Saves/manual
read controls. Never delete content in response to card actions.


### Request-specific evidence and publisher allowances
Each request's JSON schema enumerates only its supplied evidence IDs for posts and
individual discussion turns, and caps the response at the remaining requested post count.
Providers falling back to plain JSON still pass the same local evidence checks; malformed
IDs are rejected rather than repaired. Every offered publisher group has an explicit
remaining distinct-source allowance, including unused publishers (two slots). BBC sections
share one group. Multiple excerpts from one source consume one slot; two different sources
consume two even inside one post. Cross-chunk validation remains authoritative.

## Empty-selection recovery — September 18, 2026
An empty successful response consumes an attempt and defers its offered evidence
sources only for the current run. Try other unused sources under the same shared
eight-attempt/45-minute limits; never resend that empty selection or mark deferred
sources as covered. Keep accepted chunks and all cross-chunk validation intact.
Diagnostics include candidate/offered/deferred counts and empty-selection totals.
The finite evergreen shelf now contains 50 reviewed pages. Its 25 new URLs were
retrieved and checked with the existing article parser; do not weaken extraction
or date rules to admit blocked/thin pages. Replenish the shelf as it is consumed.

## Recurring publisher expansion — September 18, 2026
Intake now has 27 feeds across 23 publisher groups (BBC sections stay grouped).
The 14 additions returned 106 unused, parser-valid candidates in the local live
snapshot; this is not a guaranteed post count. See docs/source-feeds.md.
Parse RSS 2.0, RSS 1.0 item dc:date, and Atom entry published; never use Atom
updated or a channel date as publication. Atom article links must pass the same
HTTPS/host checks. Keep the 1 MB, 20-second, eight-articles-per-feed bounds and
the existing generation/publisher limits. Decode escaped HTML before stripping
markup so it does not enter evidence. Only selected fixed feed URLs are fetched.

## Editorial voice — September 18, 2026
The user wants useful commentary, opinions, banter and disagreement preserved.
Reject narration about the generator's own inputs or limitations ("the excerpt
doesn't say", "the supplied material only gives us...") in titles, bodies and
discussion turns. Keep normal attribution and evidence-backed uncertainty about
the subject. Missing input is not proof that a fact is unknown or undisclosed.
The prompt keeps these judgments internal; voice.ts catches recognizable process
commentary and feeds correction instructions into the existing bounded retry path.
This heuristic is not a semantic editorial review. Do not erase all commentary or
silently strip sentences from newly generated posts to pass validation.
The three reported posts in batch 20260918T055248Z-a06c were manually edited through
the validated publish plan, preserving their IDs, slugs, dates, sources and discussion
arrays. Other historical posts have not been bulk rewritten.

## Editorial integrity and support audits — September 18, 2026
Read docs/editorial-integrity.md for the coherent-section extraction and numbered
sentence/paragraph evidence contract. Keep whole long-sentence groups within the
existing evidence cap; do not reconnect prose across omitted page modules or pad
missing context from model memory. Validate every selected quotation.

EDITORIAL_AUDIT_DIR enables bounded selected-support records outside public/build
paths. The workflow uploads them with fourteen-day retention before the publication
commit; audit persistence/upload failures block that commit. Records are not secret
and must contain neither credentials nor full fetched articles. Keep requested and
provider-reported resolved model identity distinct; unknown resolution stays null.
data_written denotes local writes, not deployment. Post retention remains permanent.

pnpm editorial:benchmark is an offline set of reviewed expectations, not a semantic
judge. Four known factual counterexamples pass deterministic provenance gates.
The four documented factual corrections use the guarded validated publisher migration
in scripts/correctEditorialIntegrity.ts; preserve its exact correction record and
stable article URLs. New generated quality still needs the #36 observation gate.

## Optional discussion and source payoff — WP2
Read docs/editorial-depth.md. `validateCitedDraft` validates parents without discussion,
then isolates only a named array/null discussion block. Invalid arrays are omitted whole;
ambiguous structures and invalid parents still fail. Cross-chunk gates precede omission
counts/audits. Keep `validateDraft` strict for accepted content and publication. Audit only
the sanitized selection; an omitted block has a fixed reason and no discussion-only support.
Preserve the spoiler flag conservatively. Never repair IDs/JSON or revive raw completion dumps.
The shelf has 59 fixed pages after nine reviewed additions; thirteen page-level evidence
reviews are in docs/fixtures/editorial-source-pilot.json. Discussion defaults to null in
prompt guidance; short supported posts remain welcome. No length/topic quotas. Generated
JSON drafts, accepted posts and manually worthwhile samples are different counts. #36's
five-edition check and #37's ten ordinary-run evaluation remain open; no model experiment
or historical regeneration is part of this implementation.

## WP1 first ordinary-edition review
Read docs/wp1-live-review-20260918.md and its claim ledger. Only one qualifying
post-WP1 edition was available: sixteen posts reviewed, fourteen source pages
retrieved, two unresolved page checks. Keep #36 open for at least five editions
and the remaining culture coverage. This run predates WP2's checkout despite
publishing after #39; do not count it toward #37.
The voice guard rejects observed evidence-ID attribution grammar, preserving
ordinary TV episode notation. Six semantic counterexamples still pass provenance
checks in the expanded sixteen-example benchmark; never call it fact-checking.
The eleven additional reviewed corrections use scripts/correctFirstLiveAudit.ts
and its exact before/after record through the existing validated publisher. Preserve
original artifacts, identities, dates, historical content and the earlier migration.

## Post-42 manual review
Read docs/post42-live-review-20260918.md for the twenty-post, 27-turn follow-up.
Run 35405624271 used deepseek/deepseek-v4.1-flash explicitly; it is not scheduled
free-router evidence. #36 remains at sixteen posts/one ordinary edition; #37 has
zero eligible ordinary runs at the recorded cutoff. Recheck runs before advancing counts.
The ten exact corrections in scripts/correctPost42Audit.ts use the same guarded
publisher; preserve original support, permanent identity, later editions and earlier
correction records. The 24-case benchmark exposes ten semantic failures that still
pass provenance. Prompt distinctions are guidance, not automatic semantic enforcement.

## Scheduled continuation and source curation — September 19
Read docs/scheduled-review-culture-20260919.md and docs/culture-source-review-20260919.md.
At the fixed 02:39:19 UTC cutoff, one new ordinary free-router run was eligible: six posts,
pre-#43 checkout. #36 has 20 primary checks plus 2 supplemental (22 total) across 2 editions;
three more editions and culture coverage remain. #37 has 1/10 runs and four fixed sampled
articles; preserve its baseline and blinding limitation. Offline packets do not count.
Four reviewed shelf additions bring the inventory to 63; do not revive consumed URLs or
add the duplicate Medusa angle. Nine exact corrections use scripts/correctScheduledAudit.ts.
The 28-case benchmark exposes twelve semantic counterexamples; no new automatic semantic
gate or prompt change was added. Keep both observation issues open.

## Movie and Sopranos shelf — September 19
Read docs/movie-sopranos-source-review-20260919.md and its reduced fixtures. Four additions
bring the shelf to 67. ASC single stories use a specifically marked div body; recommendation
article tiles are not that body. Keep the exact layout markers, fail closed on missing body,
and preserve coherent-section boundaries. Source packet validation is not generated quality;
#36/#37 historical observation counts are unchanged. Blue Heron’s structural angle needs
spoiler protection; Carmela’s analysis is the interviewer’s interpretation, not Falco’s belief.

## Richer context and required discussion — October 18, 2026
The user explicitly wants a back-and-forth AI discussion on every newly published post.
Read docs/editorial-generation-quality.md. New generation has an eight-post ceiling,
not a quota, and requires 2–4 supported turns with distinct voices and turn text.
Invalid discussion rejects the response for bounded retry; never publish a bare parent
after dropping its exchange. Keep historical optional-discussion validation compatible.
Preserve humour, opinions and disagreement; ground factual premises and require a concrete
reading payoff rather than padding a headline. These are not semantic fact-checking gates.

RSS blurbs are discovery only. Substantial full feed prose or explicit publisher-body
retrieval supplies recurring context. Keep the six fixed publisher adapters, validated
HTTPS hosts, no redirects, 24-candidate/four-concurrent/20-second/1-MB fetch bounds and
6,000-character complete-paragraph limit. Skip unsupported or thin pages without fallback.
Sectioned requests offer at most eight sources and 24 snippets per sectioned source;
legacy/evergreen evidence retains its prior bounds and fixtures. Never join across omitted
modules or split a long-sentence group at the cap. Eight attempts and the shared generation
deadline remain unchanged. No historical posts, schedule or model settings were changed.

## Qualifications and discussion contribution — October 18, 2026
Read docs/editorial-qualifications.md. Sectioned requests now include bounded readingContext
(6,000 characters/source, at most eight sources), preserving section and paragraph order.
It constrains interpretation but never authorizes facts without numbered evidence IDs.
Body support allows six IDs; turns retain three. The audit's selected-support cap is 72
per four-post chunk; never retain full readingContext in audits or public data.
Prefer two worthwhile turns; extra turns must add a detail, challenge, interpretation or
joke. Keep banter. A conservative near-copy guard retries repetition against the body or
earlier turns, only for new generation. It is not a semantic novelty or fact-checking gate.
Keep all existing source/provenance and shared generation budgets; preserve history.

## Mandatory prepublication review — October 18, 2026
Read docs/editorial-prepublication-review.md. Every new candidate receives a separate
source-based model review of title, body and all discussion turns after provenance
validation. Review must cover every unit exactly once. Withhold whole rejected posts;
never rewrite or strip approved banter. Opinions and jokes need supported premises,
not a source expressing the opinion. Review is fallible, not certified fact checking.
Writer and reviewer share eight provider calls and the 45-minute deadline; reserve a
review call before starting generation, with at most two attempts per review. Failed
review cannot publish its candidate; retain only previously reviewed accepted chunks.
Persist bounded editorial-review.json decisions outside public/build paths, including
all-rejected runs, with credential redaction and 14-day workflow artifact retention.
No raw completions or full readingContext in audits. Accepted support records contain
reviewer model identity and candidate digests; historical audit compatibility remains.

## Title attribution and open discussions — October 18, 2026
Live reviewer responses require titleAttribution: exact title text and actor span,
source actor and selected evidence ID, and a relationship judgment. A mismatch must
reject the title for misattribution; never approve by silently replacing its subject.
Keep subjective editorial titles and banter with supported premises. Historical review
audits can omit this trace; current responses cannot. Manual live controls now use two
four-post suites (at most four calls/shared 15-minute deadline), separate from generation.
Editorial discussions start expanded in feed and article views. Preserve the spoiler
gate over both body and discussion and retain the manual collapse option. Card mode
continues to link to the full discussion; its fitting contract is unchanged.

## Review transport compatibility — October 18, 2026
The temporary Gemini compatibility schema was retired after the DeepSeek-only user
direction. Reviewer transport and local live schemas both retain all bounds and
complete claim accounting. Generic HTTP 400 errors remain fatal. See
docs/editorial-selected-evidence-live-review-20261018.md for controls and failed runs.

## DeepSeek only and CoBanter — October 18, 2026 (latest user direction)
The user removed all other model choices. Local generation, scheduled/manual Actions
and reviewer controls use only `deepseek/deepseek-v4.1-flash`; there is no model dropdown
and stale `OPENROUTER_MODEL` settings are ignored. This supersedes all older model
selection instructions, including the comparison option above. Preserve historical
model identities and audits. Hosting is now CoBanter.com; preserve the concurrent
domain/routing changes and use the current domain for live verification.
DeepSeek uses default reasoning. Review calls allow 48,000 tokens after repeated
empty-at-length responses at 24,000; writers retain 24,000. A low reasoning experiment
failed controls and was retired. Shared call/deadline limits, full context and strict
review rules remain unchanged. Distinguish reliability from accuracy in live review.

## Complete selected sentences — October 18, 2026
The first successful strict-claim run published one of eight candidates. Manual review
found its survey turn selected only the first part of a split sentence. New generation
now requires every groupIds/contextGroup part within each parent's or turn's own IDs,
before review; passing reviewer judgments must satisfy the same rule. Never repair
missing IDs or raise citation caps: narrow claims to fit complete groups. Historical
validation remains compatible and existing publication/audit identities stay frozen.

## Final selected-support audit — October 18, 2026
Read docs/editorial-selected-evidence-live-review-20261018.md. Final run 39159920672
published one of four drafts (two completed reviews: one pass, one rejection; two
later drafts remained unreviewed). Manual review still found population scope and
reporter/interviewee attribution misses. scripts/correctSelectedSupport.ts applies
one exact reviewed correction through the guarded publisher, retaining identity and
the price/access discussion. Original edition/decisions remain frozen. New prompt
guidance and the fourth manual-control suite address these misses but are NOT yet
live-validated: OpenRouter reported its $5 monthly key limit exhausted, resetting
2026-11-01 UTC. Never raise billing limits automatically. The earlier three suites
passed; do not imply all four have passed or that model approval proves entailment.

## Complete claim accounting and evidence labels — October 18, 2026
Live reviews require ordered segments covering each complete unchanged unit, classified
as supported fact, unsupported fact or opinion. Every factual support ID and every
passing check ID must be selected by that same unit. Context and another turn cannot
authorize facts. Unsupported segments reject the whole post; pure banter remains free
to express opinions. Semantic classification is still fallible. Historical audit schemas
allow missing segments; current responses do not. Bounded parsed review spans now retain
the candidate prose, including rejected candidates; never retain raw completions, reasoning
or readingContext. Preserve the 512-KiB audit and shared eight-call/45-minute limits.
Manual controls have three four-post suites, at most six calls/shared 15 minutes, with a
96-KiB result bound. Square-bracket evidence labels retry through the voice guard; plain
and parenthesized TV episode notation remains valid. The three exact label-only corrections
in scripts/correctEvidenceLabels.ts use the guarded publisher; preserve original audits,
permanent identities, dates, discussions and the exact correction record.
After two live runs exhausted review attempts on empty length-limited completions,
ordinary writing requests are capped at two posts so each detailed review is smaller.
The transport/historical four-post bound remains compatible. Four writer/review pairs
can reach the eight-post ceiling only without retries; keep the shared budget unchanged.

## Custom domain — October 18, 2026
Production is `https://cobanter.com/` on the existing GitHub Pages workflow.
Cloudflare's apex flattened CNAME points to `ariesyous.github.io` with DNS-only
routing; GitHub owns apex TLS and legacy project redirects. The `www` CNAME points
to the same target with proxying enabled. Cloudflare's exact-host rule `Redirect
www to secure cobanter.com` redirects both schemes to the HTTPS apex, retaining
the path and query string. Keep that proxy enabled for the redirect. The domain is
verified in the `ariesyous` GitHub account; retain its DNS challenge TXT record.
Vite and the archive builder default to `/`; archive metadata defaults to the new
origin. Keep `SITE_BASE_PATH` consistent across both build stages when overriding.
Preserve all article slugs, batches and publication dates. Earlier `/openfeed/`
examples and audit links describe the original project URL; GitHub redirects those
URLs to the corresponding custom-domain paths.

## Higher throughput without weaker checks — October 19, 2026
Read docs/editorial-throughput.md. The user explicitly requested substantially more
articles per run. The ceiling is now twenty, with 32 shared provider calls, the same
45-minute deadline and two-post ordinary chunks. Writers get at most three local
attempts, reviewers two; always reserve review. No billing/key limit changes.
Fixed feeds retain up to 24 dated entries each. Intake considers up to 72 context
candidates/six per publisher group, still fetching
four concurrently with the existing host, body, timeout and size checks. Publication
still allows two distinct sources per publisher group. No blurbs/thin-page fallback.
Four inspected adapters add Ars Technica, MIT News, Aeon essays and JSTOR Daily;
retain their exact inner-body markers and module/section exclusions. Inspected NASA
image pages and oversized AWS pages remain skipped; never loosen extraction for them.
Writer transport selects atomic evidenceGroupIds; code expands explicit choices to
complete original snippet groups before all existing strict checks. Six/three snippet
caps remain. Historical snippet validation and persisted identities stay compatible.
Reviewer transport uses indexed word ranges; code checks complete ordered coverage,
materializes exact spans, then applies the unchanged live decision/attribution gates.
No gaps, borrowed support, rewritten prose or unsupported passing units are accepted.
Whole rejected posts may get one deliberate revision plus a fresh mandatory review.
Malformed/exhausted local chunks defer sources and allow other candidates under the
same shared limits. Fatal authentication/billing failures stop calls. Audits retain
original spans, decisions and digests; 512-KiB bounds and blocking persistence remain.
Mocked twenty-post integration demonstrates capacity, not live accuracy or yield.
