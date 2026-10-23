# Site experience: brand, reading, following and search

Decision record, October 21, 2026. The user asked for a pass on website quality and
marketability and chose four areas: brand and first impression, reading experience,
following and sharing, and search and performance. Headlines is an optional view and
the full feed stays the default. A newsletter is deferred because it needs an
external service. All earlier settled decisions remain: dark default, no
Saved/Mark read/Mark caught up controls or topic dropdown, spoiler gates, expanded
discussions, the unchanged Cards fitting contract, permanent URLs, no backend and
no model calls in the browser.

## Brand and first load

- `public/favicon.svg` is the conversation mark that also appears in share images.
- `scripts/brandAssets.ts` renders full-bleed (maskable-safe) PNG icons at 180, 192
  and 512 px and writes `site.webmanifest`. There is no service worker.
- Every generated page links the touch icon, the manifest and the RSS feeds.
- `index.html` applies a saved light preference before first paint, which removes
  the dark flash. Dark remains the default and the OS preference is deliberately
  not followed.
- Build-time HTML stays visible while React loads offscreen. `src/main.tsx` mounts
  the app into a hidden sibling, and `markReady()` (`src/lib/ready.ts`) swaps it in
  once the feed, article, card deck, search or an error state has content. A
  four-second fallback guards against getting stuck.
- Home and topic pages have their own 1200×630 share images under `og/site/`. They
  use the article-image frame and contain only the page title and description.
- Archive, About, topic, search and 404 pages share the app's header, footer and
  stylesheet. Standalone pages still omit the app script.

## Reading

- Bodies split into paragraphs on blank lines (`shared/reading.ts`). The stored
  text is never rewritten. Cards are unchanged.
- Article pages use a reading measure, a system serif stack (no webfont) and a
  byline with the Added date. A reading-time label was tried and dropped:
  2,592 of 2,596 articles rounded to "1 min read", which told readers nothing.
- Related reading is computed at build time from the same topic: newer/older
  neighbours plus up to four nearest others. It is rendered in static HTML and
  written to `p/<slug>/related.json` for in-app navigation. Entries contain titles,
  paths, Added dates and formats only. Titles are already spoiler-safe.
- Headlines (`PostCardCompact`) is a browser-local preference
  (`cobanter-density`). It shows the format, topic, title, the first paragraph
  clamped to two lines, the Added date and the publishers.
  Spoiler posts show only a reveal notice. It is a reading layout, not read or
  saved state.

## Following and sharing

- `scripts/feeds.ts` writes RSS 2.0 at `/feed.xml` and `/topics/<slug>/feed.xml`
  (50 newest articles each). Items carry paragraphs, the labelled AI discussion
  and source links.
- Spoiler items publish only a reveal notice and their sources. Their prose and
  discussion never enter feeds.
- `lastBuildDate` is the newest article date, so unchanged builds stay stable.
- Share uses the native share sheet when available and otherwise copies the link.
- `/about/` ("How CoBanter works") states plainly what the provenance checks and
  the AI review do. They are not human fact-checking. Discussion voices are not
  people. The page also covers dates, spoilers and corrections. Keep its claims
  aligned with AGENTS.md.

## Search and bundle

- `data/search-index.json` holds `[title, path, topic, format, addedAt,
  publishers]` for every article: headlines and metadata only, no bodies or
  discussion. It is about 540 KB raw (about 190 KB gzipped) and loads only when
  search opens.
- Matching folds case and diacritics. Every token must appear in the title, topic
  label or publishers. Results are newest first, with optional topic and format
  filters.
- `/search/` is an app route with a noindex static shell. Queries sync to `?q=`.
  `/` opens search from anywhere outside a text field.
- Cards and Search are code-split with `React.lazy`. Batch fetches keep
  revalidating, because corrections can rewrite batch files in place.

## Deploy size (October 23, 2026)

GitHub Pages publishes at most 1 GB per site. Every article ships a share image and
static pages, so output grows with the permanent archive.

| Build of the same 2,696 articles | Deployed output | Per article |
| --- | --- | --- |
| Before (October 22 deploy) | 251.2 MiB | ~93 KiB |
| Palette share images + old-address redirect pages | 122.6 MiB | 46.6 KiB |

- `scripts/palettePng.ts` writes share images as opaque 8-bit indexed PNGs. Each image
  has about 650 colours (flat areas plus text antialiasing). The 256 most frequent stay
  exact and the rest map to their nearest kept colour: 59–78 KB became 21–28 KB with no
  visible difference. Encoding is deterministic, so content-hashed URLs stay stable.
- 2,382 older articles have a stored long slug as well as the short canonical route.
  That address is now a ~3 KB page with the article's sharing tags, canonical link,
  an instant same-origin redirect that keeps the query and fragment, and a meta
  refresh. Both routes keep `article.json` and `related.json`.
- After this change, images are about 63 MiB, canonical article HTML about 36 MiB and
  article JSON about 14 MiB. The build log prints KiB per article. PNG row filters
  and other deflate strategies were tried and saved under 1%.
- This buys time, not unlimited capacity. At the configured 8 editions × 20 posts a
  day (about 7.3 MiB/day), the 750 MiB warning arrives around mid-January 2027 and
  1 GB around mid-February 2027; at the ~80 posts/day actually observed in October,
  about twice as long. A hosting decision that keeps every permalink is needed before
  then. Never delete content or routes to save space.

## Phone reading pass (October 23, 2026)

An October 23 review at 375×812 found the first post starting about 470 px down,
under a two-line banner, a tagline, an RSS line, wrapped control rows and a card
header that repeated the format chip. The user chose this pass. Every earlier
decision above is unchanged: Full posts by default, expanded discussions,
spoiler gates, Cards and its fitting contract, dark by default.

- **No column header on editorial cards.** There are only four "columns", one
  per format, so the avatar, column name ("The Brief") and "AI-edited column"
  added nothing. The user approved removing them. The Added date sits at the
  right end of the format/topic row. The author profile filter and profile card
  are gone with it. Legacy non-editorial posts keep their author header.
- **Bylines say "CoBanter · AI-written · Added …"** in the app article view and
  the static article page, matching the homepage summaries.
- **Above the fold at ≤600 px** (and on screens ≤500 px tall): the banner shows
  a one-line short form (the clipped words stay available to screen readers),
  the h1 is smaller, the tagline is hidden, and the visible "Topics" label is
  hidden while the topic buttons stay. The format tabs and Full/Headlines share
  one horizontally scrollable row, with the RSS link ("RSS"; its accessible name
  is still "Follow … by RSS") beside it. The header uses tighter padding, which
  keeps 360 px phones on one header row. The format tabs are a `role="group"`.
  The static homepage banner keeps its long text until the app swaps in.
- **The footer is reachable.** The scroll sentinel auto-loads at most two older
  batches per mounted feed (`AUTO_LOAD_LIMIT` in `useFeed.ts`). After that,
  "Load older posts" stays the way to continue, and About/Archive/RSS links in
  the footer can be reached.
- **New posts stay in reach.** "Show N new posts" is sticky just under the
  header (its height is measured into `--header-height`) inside an always-mounted
  polite live region.
- **Hidden tabs do not poll.** The five-minute manifest check is skipped while
  the document is hidden, and runs once when the tab becomes visible again.

Measured with `pnpm preview` in the desktop app's emulated viewport (CSS px from
the top, scrolled to 0):

| Viewport | Root text | First post before → after | First title before → after |
| --- | --- | --- | --- |
| 375×812 | 100% | 473 → 223 | 572 → 272 |
| 390×844 | 100% | 473 → 223 | 572 → 272 |
| 360×740 | 100% | 519 → 223 | 618 → 272 |
| 844×390 | 100% | 386 → 252 | 485 → 300 |
| 375×812 | 200% | 1342 → 628 | 1555 → 766 |
| 360×740 | 200% | 1407 → 628 | 1652 → 766 |
| 844×390 | 200% | 1123 → 609 | 1306 → 705 |

This is emulation, not a physical phone. The pane was hidden during part of the
check, so IntersectionObserver and ResizeObserver only ran when screenshots
forced a frame.

## Not done

- No newsletter, analytics change (Cloudflare Web Analytics already runs), service
  worker, or semantic/body search.
- Physical-phone verification of Cards (#25) remains open. This work was checked
  only in an emulated 375×812 viewport and on desktop.
