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

## Not done

- No newsletter, analytics change (Cloudflare Web Analytics already runs), service
  worker, or semantic/body search.
- Physical-phone verification of Cards (#25) remains open. This work was checked
  only in an emulated 375×812 viewport and on desktop.
