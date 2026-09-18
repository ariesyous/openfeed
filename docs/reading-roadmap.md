# OpenFeed: permanent reading and return visits

Decision record, September 17, 2026. Implements the direction agreed in #18–#21.

## Product decision

A personal reading magazine with social-feed pacing: useful news, explainers,
true stories, criticism and labelled AI discussion. Build for Aries first while
keeping the public site usable. Aim for roughly half timely and half lasting
material when evidence supports it. Content is retained forever; age and capacity
must never automatically delete articles. Dark theme and openrouter/free remain
the defaults. No request-time backend or browser inference is introduced.

## Permanent content and URLs

The publisher retains every editorial batch and its metadata in Git. Article slugs
are assigned once in code and stored with posts. A readable title prefix plus an
injective encoding of the existing ID avoids collisions; title edits preserve the
stored slug. Existing articles have been backfilled without new publication dates.
The historical deleted batches were checked: they belong to the retired fictional
prototype, not lost editorial content. That prototype is not resurrected.

The build emits real `/openfeed/p/<slug>/index.html` pages with readable article
content, sources, canonical links and article-specific sharing metadata. Spoiler
content is inside a native disclosure before JavaScript loads, and is excluded
from metadata descriptions. The React app supports in-place article navigation
and direct links; direct pages do not download the feed. JS/CSS assets are shared.

Hash and query routes would simplify deployment but provide weaker standalone
sharing previews. Real static pages are the selected approach. `SITE_BASE_PATH`
and `SITE_ORIGIN` control generated URLs; the Vite base must match the configured
base when moving deployments. The current deployment remains `/openfeed/`.

The complete publication manifest remains a generator-side catalog. Build output
partitions its references into pages of at most 50, filled from oldest to newest
so appending new editions doesn't shift historical page boundaries. The browser
loads these indexes and article batches on demand. An old article is reachable
through the feed archive and its original link, not merely through Git history.

## Generation decision

Target twenty posts per run, with requests of at most four posts (normally five four-post chunks).
All requests and retries share one eight-attempt edition budget; the
maximum request duration remains 15 minutes. Successful chunks consume attempts
too. A shared 45-minute generation deadline bounds requests and retry waits;
requests use the smaller of 15 minutes or the remaining budget, and no new request
starts with less than one minute left. The workflow has a 55-minute safety timeout
to leave room for publication. Workflow concurrency continues to serialize generation.

Each chunk gets fresh, unused evidence. Source identity, exact normalized source
headlines, output titles, freshness and publisher limits are checked across the
edition; BBC sections count as one publisher. Historical covered URLs and source
headlines are retained durably, while only five recent edition summaries enter the
prompt. Headline normalization catches exact syndicated repeats; it does not
claim semantic event-level deduplication.

A later provider failure preserves accepted, fully validated chunks and publishes
one partial edition. No accepted chunks means no publication. Empty/thin intake
preserves the existing edition. Diagnostics explain target, actual count,
shortfall, attempts, runtime, models and topics. No free-router result is fabricated
or replaced silently with a paid model to hit twenty.

After run #36 stopped at four posts on an empty second response, empty selections
now defer only the sources actually offered in that request and move on to other
unused evidence. Deferral lasts for one run; only published sources enter durable
coverage. Empty responses still consume the same eight-attempt budget and never
reset the shared deadline. Stop when no untried evidence remains. Candidate,
offered, deferred and empty-selection counts make the shortfall visible.

The curated evergreen shelf has expanded to fifty-nine retrieved publisher pages;
see [the WP2 source pilot](editorial-depth.md) for the latest nine additions.
The September 18 addition contains twenty-five pages from Stanford Encyclopedia
of Philosophy, Internet Encyclopedia of Philosophy, NASA, and The Metropolitan
Museum of Art, covering philosophy, economics, film theory, Greek culture and
science. Each added URL returned usable prose through the existing article parser;
blocked, missing, thin and duplicate-title candidates were excluded. Only URL and
editorial metadata are committed; article prose is retrieved at run time.
Guardian film and Sopranos RSS also broaden recurring culture intake. Consumed URLs are no longer fetched, and intake reports remaining shelf
size. This is a finite editorial backlog alongside recurring RSS, not an unlimited
source supply: replenish it as consumed, particularly film/Sopranos criticism.
Twenty useful posts and a half-evergreen mix cannot be promised for every hour.

## Return-visit decision

The initial implementation added browser-local saves, read IDs and a previous-visit
checkpoint. The user rejected those controls after trying them on September 17:
Saved, Mark read and Mark caught up made the reading interface feel cluttered.
That decision supersedes the original save/read-tracking plan. The controls,
new-since-last-visit labels and tracking hook have been removed. Existing stored
reader data is left untouched, but is no longer read or written by the app.

Topics are now directly clickable in a left sidebar on desktop and a horizontally
scrollable bar on smaller screens. In-app Back keeps loaded batches and filters
mounted and restores the previous scroll position. Explicit fresh-edition loading
is preserved; new arrivals don't reorder an active session automatically. Permanent
article URLs, copying links and forever content retention remain unchanged.

## Capacity and evaluation

Initial measured build: 41 articles, about 0.61 MiB total output including shared
assets. With the current article mix, a linear estimate at 175,200 articles/year
(twenty per hour, every hour) is about 1.2 GiB/year. This is an estimate, not a
benchmark or capacity guarantee: content length, build time and Git growth need
monitoring. Build output reports article count and bytes and warns at 750 MiB.
If hosting/storage must change, preserve content and permalinks. No TTL is an
acceptable capacity fallback.

Finish implementation with automated navigation, archive, validation and
publication tests. After merge, inspect a small sample of scheduled editions for
writing quality, topic variety, repetition and actual post counts. A short personal
trial of around ten reading sessions can ask: was there something worth knowing,
saving or sharing; was there useful new material; could an enjoyed item be found
again? This is a pragmatic trial, not statistical proof of retention uplift.

Provider behavior is covered with injected responses; live editions remain the
check on real free-model output quality. The UI simplification passes 109 tests,
including topic filtering, article navigation and Back restoration, plus typecheck,
lint and the production build. A managed browser can inspect the deployed site,
but blocked access to the unmerged localhost preview (`ERR_BLOCKED_BY_CLIENT`).
The new desktop/mobile layout therefore still needs a rendered-browser check
after deployment.

## Research basis

- [NN/g: Infinite scrolling](https://www.nngroup.com/articles/infinite-scrolling-tips/):
  preserve low interaction effort while addressing navigation and refinding.
- [YouTube: recommendation system](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/):
  satisfaction feedback matters alongside consumption measures.
- [TikTok: For You](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you):
  diversity, feedback and avoiding repetition inform the direction.
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
  and [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
  inform capacity and freshness expectations.

The platform accounts are design inputs, not causal evidence that these features
have already increased OpenFeed engagement. Topic weights, related reading,
recurring columns, archive search and RSS remain follow-on candidates.

## Topic permalink follow-up

The user pointed out that sidebar topics should have URLs too. Topic navigation now
uses real links such as `/openfeed/topics/the-sopranos/`. Static topic HTML provides
a title, canonical/sharing metadata and up to 20 recent article links; it never
embeds article bodies or spoiler discussions. React opens the matching topic on a
direct visit or refresh, and browser Back/Forward follows topic navigation.

Each topic has an index of batches containing matching posts, paginated at the same
50-reference limit as the all-topic feed. Indexes reuse existing batch JSON; their
counts include only matching posts. An empty topic remains a valid page. Article
Back preserves the active topic's loaded posts, format and scroll position;
switching between topics starts the selected topic feed from its newest edition.
Vite development filters the source manifest; the production build emits the
optimized topic indexes. No content is deleted or moved.


## Twenty-post rollout review

After two days, compare actual posts published, attempt counts, generation duration,
partial editions/failures, topic mix and repeated angles. Twenty is a target, not
a quota that justifies weaker evidence. Five full successful requests reach the
target; eight attempts leave three retries. At 24 runs this is at least 120
requests/day for full editions, up to 192 attempts/day, excluding manual runs and
other API usage. Check the OpenRouter account allowance if rate limits occur.
