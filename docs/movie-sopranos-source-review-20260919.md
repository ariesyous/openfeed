# Movie and Sopranos source curation — September 19, 2026

**Four additions from twelve substantive candidate pages:** three movies, one Sopranos.
The fixed shelf grows **63 → 67**; unconsumed inventory at the checked main snapshot grows
**17 → 21**, with movie/Sopranos unconsumed supply growing from **0/0 → 3/1**. This is
**source packet validation**, not observed generated-article quality. No generation was run.

## Baseline and scope

Repository instructions, both September 19 reports and their associated evidence ledgers,
`editorial-depth.md`, `editorial-integrity.md`, extraction/evidence/validation/state code and
existing packet tests were read before new curation. Main was
`c61ccb89402f759ddf09949de4fd591e811caa24`, PR #44's verified merge. Its
[Deploy 35417124686](https://github.com/ariesyous/openfeed/actions/runs/35417124686) succeeded.
The preceding twelve-candidate pass added symposium practices, personal identity,
coordination/information failure and Ceres, increasing 59 to 63. Its reports/fixtures remain
historical records, including their then-unmerged wording.

The four existing movie shelf pages (film philosophy, continental film philosophy,
suspense and films about television) and both Sopranos pages (BFI's *TV's a crowd* and
*Many Saints*) are all consumed. Their URLs, titles and URL-hashed IDs are preserved.
Published titles and relevant movie/Sopranos bodies show industry announcements,
film-philosophy introductions, HBO history, cast obituaries, Chase's new project and
broad house-style criticism. Concrete production choices and Carmela's selective
self-deception are useful gaps. This targeted angle comparison is not a historical
quality census or a new scheduled-cohort review.

The previous BFI control remains consumed. The People/Gandolfini 402 and speculative
film-route 404 findings were read, not repeated. Discovery this time used actual publisher
links: ASC's Yvan Lucas index, BFI's home page, Guardian's Sopranos index and its linked
second page; profiles were traced from references on the search-returned Sopranos page.
Vanity Fair and New Yorker links were resolved to their publisher-returned canonical URLs
before bounded intake. Old DGA, Stanford Magazine and Salon reference links were dead ends;
they are **not** counted as substantive candidate evaluations or shelf additions.

## Bounded intake and decisions

Retrievals: **03:59:26–04:01:55 UTC, September 19, 2026**. All twelve intended pages returned
HTTP 200, but Vanity Fair exceeded the existing response-size limit. Eleven completed
`readBounded`; two of those still produced no recognized prose after the ASC fix. Initial ASC extraction returned
zero on all three ASC candidates; the narrow fix below exposed their actual story sections.

The [machine-readable ledger](fixtures/movie-sopranos-source-review-20260919.json) records
individual discovery URLs, canonical URLs, retrieval times, successful HTML/excerpt hashes,
lengths, decisions, and all twelve numbered snippets for each addition. The table numbers
match the ledger. Excerpt/ID counts below are **after** the targeted ASC fix.

| # | Page | Extracted characters / offered IDs | Decision |
| --- | --- | --- | --- |
| 1 | [Wide Wide West: The Hateful Eight](https://theasc.com/article/wide-wide-west-the-hateful-eight/) | 2,377 / 12 | **Add:** cold soundstage conditions produce visible breath. |
| 2 | [Wages of Sin: The Irishman](https://theasc.com/article/the-irishman/) | 865 / 9 | Reject: credits and general introduction before a video boundary; specific memory/emulsion explanation unavailable in this section. |
| 3 | [Finessing Killers of the Flower Moon at Company 3](https://theasc.com/article/finessing-killers-of-the-flower-moon-at-company-3/) | 1,139 / 12 | **Add:** Yvan Lucas explains his film-style digital grading approach. Later film-specific looks are outside the packet. |
| 4 | [Sophy Romvari on Blue Heron](https://www.bfi.org.uk/sight-and-sound/interviews/i-realised-any-attempt-replicate-going-be-failure-sophy-romvari-blue-heron) | 1,497 / 12 | **Add:** a shift to the adult filmmaker changes the story into a search through memory. This is the interviewer's criticism, not Romvari's answer. |
| 5 | [Mission Statement: the Tom Cruise interview](https://www.bfi.org.uk/sight-and-sound/interviews/i-never-made-movie-just-go-make-movie-it-was-always-exploration-filmmaking-our-world-exclusive-interview-with-tom-cruise) | 2,076 / 12 | Reject: introductory persona/entrance material; the stronger contrast and interview answers do not reach offered evidence. |
| 6 | [Family Guy](https://www.newyorker.com/magazine/2007/06/04/family-guy) | 0 / 0 | Reject: intended accessible page, no recognized article prose; no extra adapter. |
| 7 | [The Family That Preys Together](https://www.vanityfair.com/news/2007/03/chase200703) | Fetch rejected | Reject: response exceeds 1 MB; no limit increase or reader substitution. |
| 8 | [The dark origins of The Sopranos](https://unherd.com/2021/09/the-sopranos-didnt-need-an-origin-story/) | 0 / 0 | Reject: no recognized prose; no extra adapter. |
| 9 | [Black Comedy and the Mob](https://www.splicetoday.com/pop-culture/black-comedy-and-the-mob) | 5,374 / 12 | Reject for this pass: broad moral contrasts are offered, but concrete Sopranos causal/therapy examples are later. Prefer the more specific Carmela packet. |
| 10 | [The Sopranos cast reunites at Tribeca](https://www.theguardian.com/tv-and-radio/article/2024/jun/14/the-sopranos-cast-reunite-documentary-tribeca) | 715 / 6 | Defer, not a parser failure: a music-choice anecdote is usable, but only it and a thematic introduction survive. Prioritize character construction in this small pass; retain no lyric-bearing fixture. |
| 11 | [Edie Falco interview](https://www.theguardian.com/tv-and-radio/2021/dec/01/edie-falco-interview-tv-actor-alcohol-hillary-clinton-sopranos) | 2,249 / 12 | **Add:** Carmela confronts infidelity while avoiding its financial/moral backdrop. The offered contrast is complete. |
| 12 | [Michael Imperioli interview](https://www.theguardian.com/tv-and-radio/2021/nov/04/sopranos-star-michael-imperioli-i-thought-they-were-going-to-fire-me) | 1,359 / 11 | Reject for Sopranos supply: opening is entirely Goodfellas history. The fuller setup, accident and resolution do not all fit three IDs. |

No replacements or publisher bans. Rejected pages remain possible future candidates only
if a separate concrete need justifies revisiting them; this pass stops at twelve.

## Exact supported selections and editorial limits

All IDs here are page-local `S1`; real request numbering varies. Each addition supplies
at least one complete angle using no more than three IDs, including every split-sentence
continuation. All offered entries, group/paragraph/part metadata and manually written
validation probes are in the ledger. Probes are neither model output nor publication drafts.

| Source | Selected IDs and complete groups | Supported payoff and attribution | Date and spoilers |
| --- | --- | --- | --- |
| Hateful Eight | E1–E2, G1 parts 1–2 | Michael Goldman's production reporting gives the transferred set, Red Studios Hollywood, 30°F, 80% humidity **and the reason: visible breath**. Do not substitute Celsius or infer how all snow was made. | Online June 28, 2023; originally AC December 2015. Selected angle is spoiler-safe. |
| Yvan Lucas | E2 (G2), E7–E8 (G6 parts 1–2) | E2 names the interviewee; E7–E8 give the custom-film-stock comparison, printer-point adjustments in Baselight and intended film finish. Preserve this as Lucas's preference, not a universal technical superiority claim. | December 2, 2023. Selected workflow is spoiler-safe. |
| Blue Heron | E9 (G8), E10–E11 (G9 parts 1–2) | Hope Rangaswami describes the temporal shift and adult Sasha's documentary as an attempt to process memories of Jeremy. The shift and its purpose are both present. Do not attribute introductory criticism to Romvari. | September 17, 2026. Structural revelation: **spoilers=true**, with a non-revealing title. |
| Edie Falco | E8–E9, G6 parts 1–2 | Hadley Freeman's character reading contrasts Carmela confronting Tony's mistresses with refusing to acknowledge worse conduct funding her life. This is criticism, not Falco's own belief or a diagnosis. | December 1, 2021. General premise, no episode outcome; selected angle is spoiler-safe. |

The normal evergreen path deliberately supplies **no `publishedAt`** for all four;
these manually verified source dates are review metadata only. Retrieval dates never stand
in for publication dates, and these packets cannot qualify as news. BFI/Guardian page titles
are source metadata, not permission to promise answers absent from their offered passages.

The first Hateful Eight section later includes scene material; E12 ends at the name initial
“Samuel L.” under the existing sentence segmenter and is **not a usable claim**. It is retained
in the full offered ledger honestly, not selected or silently repaired. The other selected
groups are complete. The Irishman credit paragraph remains a reason to reject that candidate;
the fix does not purport to remove every unmarked credit paragraph from all publishers.

Duplicate-angle checks found no selected URL or normalized source-title collision and no
matching angle in existing movie/Sopranos posts. Relevant comparisons include
`post-interests-discussion-sampler-2026-09-16-0` (house style),
`post-20260916T135418Z-305e-2` (Many Saints),
`post-20260917T221544Z-b692-7` (Big Pussy's toughness/tenderness),
`post-20260918T001434Z-fca7-15` (Hesh), and
`post-20260918T232533Z-bd16-0` (suspense). These are different subjects or mechanisms;
sharing actors, a series or the word “cinema” is not an angle duplicate. No historical
post was rewritten and no new factual correction is proposed by this replenishment pass.

## Narrow extraction fix and regression evidence

All three live ASC HTML responses identify the single story using
`data-elementor-type="single-post"`, `elementor-location-single`, and `type-article`.
Its body is a descendant with **both** `article-template-content` and
`data-widget_type="theme-post-content.default"`. Actual `<article>` elements instead belong
to recommendation tiles. The baseline selected a tile and extracted zero characters;
this prevented two otherwise useful packets from entering intake.

`articleExcerpt` now recognizes that exact structural combination. Missing body markers
in a recognized single-story layout fail closed instead of falling back to a recommendation.
Generic content divs and archive layouts are not promoted. The unchanged paragraph walker
still separates headings, figures, sections and related modules; it never reconnects prose
across omitted video/image modules. That is why The Irishman's better later content stays
unavailable. No evidence selection, segmentation, validation or prompt change was made.

Regression fixtures retain captured prose prefixes inside **reduced structural representations**,
not complete copyrighted pages or faithful full-layout snapshots. ASC wrappers preserve the
relevant original class/data markers and explicitly synthetic caption, later-section and
recommendation sentinels. BFI/Guardian wrappers are minimal `<article>` representations.
Tests compare the selected offline evidence entries exactly to the full live numbering and
require all continuation parts; the reduced prefixes do not reproduce every later offered ID.
Successful full retrievals have hashes and lengths; the oversized response has an error,
not an invented complete-response hash.

A separate local **normal `collectEvergreen` recheck at 04:04:12 UTC** fetched only the four
unconsumed additions, using real fetch → `readBounded` → extraction → evidence preparation.
All four returned exactly the saved full offered evidence. URL-derived IDs are
`232aa59e7debd695`, `c8940bdba4736d02`, `f8246b093f63e165`, and `aadf0a7bd74f9479` respectively.
This is local availability; **GitHub Actions availability is unproven**.

## Validation, gates and next action

The focused tests exercise the four reduced packets, split groups, manual probe provenance
and spoiler flag, normal bounded intake, stable URL IDs, unknown dates, consumed-source
non-refetch, body selection and conservative rejection of missing/generic markers.
Validation passed: `pnpm typecheck`, `pnpm lint`, **278 tests in 31 files** via
`pnpm test`, and `pnpm build` (268 permanent articles, 11 topic pages). The existing
pnpm settings warning and jsdom `scrollTo` warnings are non-fatal. No dependency or
package-manager configuration changed.

Sources still compete within sixteen offered sources, twelve snippets per source and
three selected IDs per article. Both ASC additions share the two-source publisher allowance;
BFI and The Guardian also share their existing publisher groups with other intake. Adding
four fixed URLs adds at most four one-time unconsumed fetches, each under 1 MB/20 seconds.
No selection, generation or publication is guaranteed. Existing IDs, consumed state, public
history, slugs, timestamps, hourly scheduling, budgets, `openrouter/free`, optional-discussion
validation, UI and static Pages hosting are unchanged.

#37 was found closed despite its incomplete observation gate; reopen it per this task.
Both issues remain open. Historical counts stay **#36: 20 primary + 2 supplemental posts
across two ordinary editions; #37: 1/10 eligible runs** at the prior fixed cutoff. This
pass adds zero observed articles, editions or runs. It does not clear prior access gaps.

Next useful action: review/merge this PR, then let normal hourly intake run. When a selected
source first appears in an ordinary edition, inspect its retained support and actual article
under the existing observation protocol. Do not launch another generation or curation loop
to manufacture that evidence. Direct Sopranos production interviews, sound/editing coverage
and reliable Actions retrieval remain gaps; one character-analysis packet does not exhaust
them.
