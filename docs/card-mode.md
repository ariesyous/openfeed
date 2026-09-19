# Card mode implementation and verification

Implements issue #25 using the existing title, body and sources. No content schema,
generator, article body, source batch or permanent URL is changed.

Latest evidence: [September 19 bounded verification](#september-19-bounded-verification).
Earlier records below remain historical, including their environment limitations.

## Reading experience

- Feed / Cards toggle; cards also open at `/openfeed/?view=cards`.
- Cards browse across all topics. The scope is stated above the card.
- Left: a different unseen topic. Right: the next unseen article, preferring variety.
- Touch swipes, header/background mouse drags, keyboard arrows, labelled buttons.
- Text selection and link activation remain native. Cancelled, short, vertical and
  multi-pointer gestures do not advance a card; reduced motion removes animation.
- Undo restores up to 30 previous cards in the current mounted session. It does not
  erase seen history. Returning from an article restores the same card.
- Source links use publisher labels, with full source titles available to assistive
  technology and in tooltips. Discussion remains on the linked article page.

## Content fit

The app uses dynamic viewport height, safe-area padding, compact mobile spacing,
and a flexible reading area. After the user's mobile feedback, `fitCardText` now
measures the unchanged headline/body and finds the largest fitting font scale with
an eight-step binary search before paint. Body text scales down to .8125rem (13px
with a 16px root); the floor follows the root font setting. A ResizeObserver
recalculates on layout changes and restores the normal size when space increases.
No line clamps, summaries or scrolling are introduced. If even the minimum cannot
fit, the existing explicit article-link notice remains and the card is not marked
presented. Arbitrary content cannot be guaranteed to fit every screen/text setting.

Mobile swipes can start on linked headlines and sources; taps still open links.
The card reserves single-finger movement for gestures while preserving pinch zoom
(`touch-action: pinch-zoom`). Movement is more forgiving of diagonal paths and
shorter distances; vertical, cancelled and multi-pointer gestures do not advance.
Transferring implicit touch capture from a child to the card no longer cancels the
swipe when the child's lost-capture event bubbles. Delayed clicks after a drag
are suppressed. Mouse links and body text retain native interaction.

The original version passed desktop live checks at 1363×936, but the user reported
failed phone swipes, overflow notices and a two-card loop. Desktop checks did not
validate mobile behavior. Localhost/local-file previews remain blocked by the
managed browser's security policy; the current browser has no mobile emulation
API. Automated layout tests simulate reflow and are not real-device verification.

## Selection and storage

Only visible, fitting cards (including an intentional spoiler gate) are presented.
Fetching/selecting a card and background tabs do not record presentation. Browser
storage holds a versioned list of up to 10,000 recent IDs; session history continues
in memory when writes fail. Retained IDs prevent repeats; clearing storage or rolling
past the retained limit can allow older IDs to appear again. This is not cross-device
history. Explicit Undo and Revisit are the only intended repeats within that history.

Explicitly advancing also excludes the departing card for the mounted session,
even if it did not fit and was never presented. This fixes the two-card loop where
unfit cards repeatedly selected each other instead of reaching the rest of the
archive. Session exclusions are not persisted as seen; Revisit clears them.

Search is bounded to three additional archive chunks per action. Each chunk follows
at most five index pages and fetches at most one batch. A continuation action is
required when the budget is spent. End-of-archive and no-alternative-topic states
have explicit fallback choices. Retries preserve the active card. New editions
require a click to load and never automatically displace it.

## Automated coverage

Automated coverage exercises selection, persistence, corrupt/denied storage,
presentation versus prefetch, hidden tabs, bounded archive continuation, exhaustion,
explicit revisiting, retry, new editions, swipes/cancellation, keyboard/buttons,
Undo, original copy/source links, spoilers, adaptive sizing/resizing, overflow
notice, skipped-unfit-card archive progression, touch capture transfer, headline
swipes versus taps, multi-touch, article return and mode switching. Existing feed/archive/generation checks remain in the full suite.

## Temporal context — WP3 (#25)

Initial baseline: `a4d0c85`, including merged #38 and #39. The PR was subsequently
rebased onto `802118b`, which merges #35’s two research documents. Consulted both
at their original head `1c6eff825c0437c82649dcc6ca33ff08e218b6a4`. Their missing-date finding
still reproduced. The old two-card loop did not reproduce. No gesture, selection,
adaptive sizing or navigation rewrite was warranted by this session's evidence.

`shared/publicationDate.ts` validates the existing UTC datetime contract and formats
absolute UTC calendar dates **with the year every time**. `PublicationDate` is shared
by Cards, the normal feed and the React article. Prebuilt article HTML uses the same
helper and meaningful `<time datetime>` values, so the distinction also exists before
JavaScript loads. Feed and React article headers use `relativeTime` for Openfeed's
creation age (for example, `Added 1h ago`), restoring the quick age scan requested
after #40. The exact UTC creation timestamp remains in `datetime` and the tooltip.
Posts older than the relative formatter's five-week window use an absolute date
with the year. Prebuilt HTML keeps an absolute Added date so it cannot show a stale
build-time age; React computes the relative age when rendered. Source publication
dates remain absolute and are never inferred from the post's creation age.

| Metadata | Visible presentation | Meaning |
| --- | --- | --- |
| Recent source, `2026-09-18T16:02:31.000Z` | `NASA ↗ · Published Sep 18, 2026` | Actual source publication date, never retrieval/edition time. |
| Older source, `2025-08-24T19:40:16.000Z` | `The Guardian ↗ · Published Aug 24, 2025` | Old reporting stays visibly old even when added in 2026. |
| Multiple sources | Each publisher has its own adjacent date | No newest-source shortcut or aggregate date that obscures older material; distinct same-day timestamps remain in `datetime`. |
| Mixed dated/undated | Dated publisher's date; `Publication date unavailable` beside the other | No claim that all supporting material is recent. |
| Entirely undated | `Publication date unavailable` for each source | No automatic evergreen/background label, regardless of news/story/explainer format. |
| Invalid or future source timestamp | `Publication date unavailable`; reason in tooltip | Not treated as established dated reporting. No invalid/future `<time>` or substitution from `retrievedAt`/`createdAt`. |
| Article `createdAt` in feed/article header | `Added 1h ago` / `Added 1d ago` | Openfeed's creation age, **not** a source or event date; exact UTC timestamp and explanation in tooltip. Older posts and prebuilt HTML use an absolute Added date. Missing/invalid/future creation time says `Added date unavailable`. |

No inferred source freshness badges or invented event dates. The date is a publisher's
publication date, not proof that the reported event happened that day. Cards keep
only source dates on their small reading surface; the full article shows Added.
Date fields, source links/titles and post copy are not rewritten. Per-source rows
wrap within the existing footer; its height participates in the existing flexible
reading area and ResizeObserver fitting. The feed header's longer Added label can
wrap. Neither the body floor nor metadata font size was reduced to accommodate dates.

## September 18 verification record

**The branch's new date UI has not been rendered in a browser in this environment.**
The managed Chrome browser exposes neither viewport/mobile-touch nor reduced-motion
emulation. Navigating the local preview was rejected with `ERR_BLOCKED_BY_CLIENT`.
Vite starts on `127.0.0.1`; a same-process HTTP check served/transformed the manual
sample entry point successfully. That is not a browser execution or visual pass.
No bypass, external preview deployment, physical phone or model generation was used.

| Surface/settings | Evidence and result |
| --- | --- |
| Deployed baseline, Chrome desktop **1363 × 936**, root **16px**, normal motion, mouse/keyboard | 109 distinct post IDs inspected with rendered DOM geometry; all sampled copy fit. Full ledger: [cards-desktop-verification.json](fixtures/cards-desktop-verification.json). Source links/footer and controls were inside the initial and longest-body screenshots; document height was 936px on initial and all 51 final progression checks. This is pre-change desktop evidence only. |
| Branch, **390 × 844** portrait | **Not run**: viewport emulation and local browser preview unavailable. All fixed samples below are required. |
| Branch, **360 × 740** portrait | **Not run** for the same reason. |
| Branch, **844 × 390** landscape | **Not run**. Reading area/fallback and safe-area left/right need actual rendering. |
| Branch, **1363 × 936** desktop | **Not run**: local preview blocked. Do not transfer the deployed baseline's pass to the added metadata. |
| Branch, both portrait sizes at **200% root text (32px)** | Automated sizing-contract check only: floor remains **26px**. Actual wrapping, fit, controls and comfort **not run**. |
| Branch, portrait + landscape with reduced motion | Existing CSS inspected; real preference emulation/physical setting **not run**. |
| iOS/Android physical phone, browser chrome expanded/collapsed, rotation, pinch zoom, system text size and safe areas | **No device access**. No physical-phone pass claimed. |

### Desktop baseline findings

- Progression crossed several editions and reached the archive's longest-body post.
  Some immediate snapshots at archive boundaries still showed the departing card
  while loading; subsequent cards continued normally. This was not a two-card loop.
- Different topic moved `post-20260918T094304Z-2e4a-7` (Technology) to
  `post-20260918T055248Z-a06c-0` (AI & Agents). Right arrow then reached
  `post-20260918T055248Z-a06c-1` (Economics). Header/background mouse drag reached
  `post-20260918T055248Z-a06c-2` (Philosophy). No persistent like/dislike is recorded
  by those actions; that semantic is additionally covered in the existing code/tests.
- Undo restored `post-20260918T094304Z-2e4a-7`. Its footer article link and an actual
  click on the wrapped headline both opened the article; in-app Back and browser
  Back restored the same card. The automation's center-point click initially hit
  whitespace between wrapped headline fragments; clicking visible text worked.
- Mouse selection of body text in `post-20260918T055248Z-a06c-2` stayed native; Right
  arrow while text was selected did not advance. Its JSTOR source link opened the
  correct publisher article in a new tab. This does not establish touch selection.
- Longest headline `post-20260918T044314Z-6f06-6`: copy height **166px** within
  **652px** available; normal **18.88px** body. Longest body
  `post-20260917T210452Z-a764-1`: **394px / 652px**, **18.88px** body. The latter
  screenshot showed the complete text at a comfortable desktop size with substantial
  unused space; the wide line length is not evidence of phone reading comfort.
- Two-source `post-20260917T225126Z-4ac8-14`: **192px / 652px** at **18.88px**.
  Older reporting `post-20260918T044314Z-6f06-14`: **129px / 652px**. These source
  footers lacked the new date labels, so they must be rechecked on the branch.
- No fit notice occurred in the recorded desktop sample. **Actual phone/landscape/
  enlarged-text fallback cases remain unknown**, not zero. Automated tests exercise
  the explicit fallback, 13px/26px floors, resize recovery, no false presentation,
  and advancing beyond unfit cards without cycling. They cannot prove readable fit.

### Fixed sample for remaining checks

`tests/browser/cardSamples.ts` fixes eight unchanged posts against the baseline's
226-post catalog. "Longest" refers to title/body character counts in that catalog.

| Sample query | Exact post ID | Coverage |
| --- | --- | --- |
| `recent` | `post-20260918T182557Z-8bc1-0` | Recent dated reporting. |
| `longest-title` | `post-20260918T044314Z-6f06-6` | Longest title, 2026 reporting. |
| `longest-body` | `post-20260917T210452Z-a764-1` | Longest body; primary fit stress case. |
| `paragraphs` | `post-editorial-launch-20260915-4` | Multiple line/paragraph breaks preserved. |
| `multiple-sources` | `post-20260917T225126Z-4ac8-14` | Two publishers with different timestamps on the same day. |
| `spoilers` | `post-20260918T044314Z-6f06-0` | Gate and revealed original body. |
| `undated` | `post-20260918T182557Z-8bc1-2` | Entirely undated source. |
| `older` | `post-20260918T044314Z-6f06-14` | 2025 obituary added in 2026; a story is not automatically evergreen. |

Run `pnpm dev --host 127.0.0.1 --port 5174` in an ordinary local environment, use a
fresh browser profile for the test origin, and open
`http://127.0.0.1:5174/tests/browser/cards.html?view=cards`. This development-only page
runs the actual App/deck/gestures/fitter with a bounded catalog of the eight original
posts, loading only their historical batches. It does not edit files or ship in the
production build. Selection still prefers another topic, so order can vary. Append
`&sample=longest-body` (or any query above) to isolate a case. Seen history still
works: use Revisit articles when needed, or a fresh test profile. For a physical phone on your local network, use your normal LAN-accessible Vite
host/address instead of loopback. The test page uses the same viewport meta tag as
the app. Use the normal app route as well for full archive/new-edition/navigation tests. The sample page itself
has been typechecked and served, **not browser-executed here**.

`tests/publicationDate.test.tsx` also uses explicitly in-memory variants of the
multiple-source post for **different calendar years** and **mixed dated/undated**
sources. Missing, invalid, future, leap-day, UTC-boundary and later-revisit fixtures
are deterministic tests. These variants do not alter public data and have no rendered
verification claim. All eight real samples have original-copy/source regression checks.

### Short phone/accessibility/usability checklist before closing #25

1. Run all eight samples at **390×844**, **360×740**, **844×390**, and **1363×936**;
   repeat portrait at a **32px root / 200% text**, and portrait/landscape with reduced
   motion. Record OS/browser, actual CSS viewport, text setting, sample ID, computed
   body size, fit/fallback and comfort. On a physical phone, also show/hide browser
   chrome and rotate; inspect notch/home-indicator safe areas. Emulation is separate
   evidence and does not replace this phone trial.
2. Confirm all original copy, each source/date and navigation controls are visible
   without page/internal vertical scrolling. If a card cannot fit at >=.8125rem,
   confirm the notice and full-article link are reachable. Advance through at least
   three such cards, Undo, and confirm unfit IDs were not stored as presented. Log
   actual fallback IDs/settings; never shrink below the floor or shorten copy.
3. Swipe left/right from background, headline and source links. Left changes to an
   unseen topic; right advances. Try short, near-45° diagonal, vertical, cancelled
   and two-finger gestures: no accidental advance. Taps open the correct links;
   long-press selection and pinch zoom remain usable. Intentional predominantly
   horizontal diagonals still follow #27's threshold, rather than all diagonal
   movement being categorically rejected.
4. Check buttons, arrow keys, Z/Undo, focus visibility and screen-reader announcement
   of publisher/date relationships and fallback links. Reveal spoilers, visit the
   article, then use both Back paths. Check pending arrival → Load keeps the active
   card. Hidden tabs, merely loaded cards and unfit copy must not add presented IDs.
5. Do a short personal reading trial: are dates clear, long text comfortable, and
   swipes predictable? Record concrete failures before changing layout/gestures.

Validation passed: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` —
**246 tests in 26 files**, production build plus **226 articles / 11 topic pages**.
Existing pnpm configuration and jsdom `scrollTo` warnings remain; browser Back was
separately checked above. The development sample is absent from `dist`.
WP3 preserves #38/#39 editorial safeguards, diagnostics, pilot, public content,
schedules and budgets. #25 stays open until the branch's rendered mobile,
physical-phone, accessibility and usability checks pass. #36's five-edition and
#37's ten-ordinary-run observation gates remain independent and open.

## September 19 bounded verification

**Outcome: desktop date rendering and the eight fixed sample IDs verified; no
reproduced product defect, so no application-code change. Keep #25 open.** Mobile,
enlarged-root, physical touch and rendered fallback checks remain incomplete.

### Baseline and environment

- Started from main `b6455bc8e0320dc1f6ab9b9ddd41ed042009b873`. Read `AGENTS.md`,
  #25 and its comment, merged #40 (`3b27456`), this document, fixed samples,
  App/CardView/SwipeCard, deck/selection/fitting logic, CSS and relevant tests.
- The live Chrome cloud browser rendered **1363×936 CSS pixels**, **16px root**,
  dark theme, default motion, with automated mouse/keyboard input. Browser version
  and host OS were not independently established. This is neither mobile emulation
  nor a physical device. Its asset URLs `index-CqzZiTEO.js` / `index-DSKRfACr.css`
  match the production build at the tested revision. This verifies the deployed
  date implementation, unlike the September 18 pre-date desktop record.
- Fresh capability discovery exposed no viewport, touch, root-font or motion
  emulation. Vite started successfully, but opening the fixed sample URL at
  `http://127.0.0.1:5174/tests/browser/cards.html?view=cards` returned
  `ERR_BLOCKED_BY_CLIENT`. The same eight IDs were instead reached through the
  deployed deck. The development-only sample route itself remains unexecuted.
- A browser zoom key attempt did not change the measured viewport or 16px root;
  it is **not** a 200% text pass. No device emulation or browser restriction bypass
  was used. Existing local presentation history was retained. Explicit
  **Revisit articles** enabled inspection of previously presented fixed samples.
- Before publication, incorporated concurrent content-only main
  `da1cedf5e07230562d7f54b30bc73914bca6d1ec` (edition `20260919T041616Z-6005`).
  UI source/assets are unchanged. The schedule remains `17 */3 * * *` UTC with
  scheduled `deepseek/deepseek-v4.1-flash` and the existing manual model dropdown.

### Rendered sample matrix

All rows below use the desktop settings above. Each received DOM geometry and a
screenshot review, with the complete title/body (or intentional spoiler gate),
publisher/date rows, article escape and navigation visible. Body text was
**18.88px**, with no fitting reduction. Footer bottom was **843.41px**, navigation
bottom **928px**, document height **936px**. Full identifiers and measurements:
[September 19 ledger](fixtures/cards-verification-20260919.json).

| Sample / exact article ID | Copy / available height | Outcome |
| --- | --- | --- |
| Recent: `post-20260918T182557Z-8bc1-0` | 209 / 652px | NASA date Sep 18, 2026; source link opens the expected NASA article in a new tab. |
| Longest title: `post-20260918T044314Z-6f06-6` | 166 / 652px | Complete two-line title and body; source/date and article link visible. |
| Longest body: `post-20260917T210452Z-a764-1` | 394 / 652px | Full unchanged body visible, with substantial remaining room. |
| Paragraphs: `post-editorial-launch-20260915-4` | 209 / 652px | Original line breaks and blank paragraph preserved. |
| Multiple sources: `post-20260917T225126Z-4ac8-14` | 192 / 634px | Both BBC publisher rows show Sep 17, 2026; distinct `datetime` values remain 16:18:35Z and 19:59:54Z. |
| Spoilers: `post-20260918T044314Z-6f06-0` | Gate 92 / 652px; revealed 235 / 652px | Body absent before reveal; Enter on Show spoilers reveals the full body. Sources/date remain visible in both states. |
| Undated: `post-20260918T182557Z-8bc1-2` | 182 / 652px | Stanford Encyclopedia of Philosophy explicitly says Publication date unavailable. |
| Older: `post-20260918T044314Z-6f06-14` | 129 / 652px | Published Aug 24, 2025; opening the article separately shows Added 23h ago. Back restores the card. |

“Longest” still denotes the fixed September 18 catalog, not a fresh maximum over
all later editions. Visual assessment: the body sizes, spacing and uncut lines
were readable on this desktop; the long body has wide lines and source/date text
is smaller than the body. Pixel fit and this screenshot review do not establish
phone comfort or replace the user's personal reading trial. **No rendered unfit
case occurred in these settings**; fallback success on smaller screens is unknown.

### Interaction evidence and exceptions

- On `post-20260919T001812Z-2397-0`, Different topic selected `...-2397-2`
  (Technology → Economics), and Undo restored `...-2397-0`. Right arrow selected
  `...-2397-3`; Z restored `...-2397-0`. A leftward background mouse drag later
  selected `...-2397-4` (Canada). These are navigation actions, not preferences.
- Next progressed across many real batch boundaries to the launch edition.
  When bounded search could not immediately find unseen content, the explicit
  **Keep looking for unseen cards** prompt appeared with visible controls.
  Continuing eventually reached `post-20260917T210452Z-a764-2`. At the end,
  **Revisit articles** explicitly restarted the deck; no two-card loop reproduced.
  Busy/covered departing cards were not treated as new visible presentations.
- Both the headline and footer link on `...-2397-0` opened its permanent article.
  In-app Back and browser Back restored the same card. A locator center click
  first landed in whitespace between wrapped headline fragments; clicking an
  observed text fragment worked. This was an automation targeting issue, not a
  broken headline. The article showed **Added 4h ago**, separately from its source
  publication date. Topic navigation entered the Technology feed route; switching
  to Cards restored the active card. Topic-feed content loading was not audited.
- Tab from the Cards region reached its topic link with a visible **3px outline**.
  Region, navigation, buttons, headline and full publisher/source-title accessible
  names were present. Keyboard spoiler reveal worked. This is basic keyboard/DOM
  evidence, not a screen-reader or comprehensive focus-order audit.
- A 15px mouse drag and a roughly 45-degree mouse drag did not advance.
  The diagonal selected text; a subsequent drag correctly remained blocked until
  selection was cleared by a normal click. Native body selection on the longest
  body produced `Building an AI agent th`; Right arrow did not advance while
  selected. These mouse checks do not establish touch selection or touch gestures.
- A real pending **20 new · Load** button appeared during the trial. Clicking it
  removed the notice and retained `post-20260917T210452Z-a764-1`. No generation was
  manually triggered. The new edition was not editorially assessed.
- A synthesized wheel action timed out in browser transport. A subsequent DOM
  read still showed page and reading-area scroll offsets of zero and document
  height 936px; **do not count the timed-out gesture as a wheel-interaction pass**.
  Geometry/screenshots independently establish complete visibility for the rows
  above. No application repair was inferred from this transport error.

### Coverage still open

| Requested check | Current evidence / remaining work |
| --- | --- |
| 390×844 and 360×740 portrait | Not rendered: no viewport capability. Run all fixed samples and inspect controls, dates, comfort and fallback. |
| 844×390 landscape | Not rendered; footer/fallback reachability and horizontal safe areas remain unknown. |
| 200% root text (32px) | Existing simulated fitter test retains a 26px floor. Actual wrapping, controls and escape remain unverified. Browser zoom is not equivalent. |
| Reduced motion | CSS inspected and unchanged; preference rendering not exercised. |
| Physical phone and browser chrome | No device: expanded/collapsed chrome, notches, home indicator, rotation and comfort unverified. |
| Headline/source touch swipes versus taps; short/diagonal/cancelled/multi-touch; pinch and long-press | Existing jsdom synthetic PointerEvents only for applicable handler cases. No live touch synthesis or physical touch; pinch and long-press unverified. |
| Explicit unfit skip, no false presented history, article escape | Existing mocked-layout/deck tests pass; no rendered fallback case or live storage inspection. Must verify in a constrained viewport. |
| Different-year and mixed dated/undated source variants | Existing deterministic date tests; in-memory variants not browser-rendered. |
| Screen reader, complete focus sequence and subjective reading trial | Still required; basic desktop keyboard/names checks above are narrower. |

### Reproducible phone handoff

1. Use the development sample instructions above in an ordinary browser/LAN
   setup. Test all eight samples at 390×844, 360×740 and 844×390, then 32px root
   text and reduced motion. Record actual CSS viewport, OS/browser, sample ID,
   body size, fit/fallback and comfort. On the phone, rotate and expand/collapse
   browser chrome; inspect notch/home-indicator clearance.
2. For a nonfitting case (start with longest-body in landscape/32px root), confirm
   the notice and Open article escape are reachable. In the eight-card deck,
   explicitly skip at least three unfit cards, Undo, and check that unfit IDs were
   not recorded as presented. Do not shrink below the root-relative floor.
3. Swipe from headline, source and background, then test ordinary taps, short,
   diagonal, cancelled and two-finger gestures, long-press selection and pinch.
   Confirm Next, Different topic, Undo, topic return and article Back. Check focus
   and source/date announcements with VoiceOver or TalkBack, and report concrete
   reading-comfort failures with the sample/settings.

No new tests were added for this documentation-only slice. Existing fit, skipped
unfit progression, inactive/hidden presentation, bounded search, synthetic touch,
date and navigation regressions were reviewed and run. Validation on the initial
baseline: `pnpm typecheck`, `pnpm lint`, **278 tests / 31 files**, `pnpm build`
(**268 articles / 11 topic pages**) all passed. Existing pnpm configuration and
jsdom `scrollTo` warnings remain. The same four checks passed again on final base
`da1cedf`: **278 tests / 31 files**, **288 articles / 11 topic pages**, identical
frontend asset names. `git diff --check` also passed.
No public copy, source metadata, application behavior, editorial counts or
generation configuration was changed by this slice.
