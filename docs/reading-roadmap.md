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

Target ten posts per run, with requests of at most four posts (normally 4/4/2).
All requests and retries share the existing five-attempt edition budget; the
maximum request duration remains 15 minutes. Successful chunks consume attempts
too. This bounds provider calls, although a slow run can still exceed the hourly
cadence. Workflow concurrency continues to serialize generation.

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
or replaced silently with a paid model to hit ten.

The curated evergreen shelf has expanded from nine to eighteen verified publisher
pages. Consumed URLs are no longer fetched, and intake reports remaining shelf
size. This is a finite editorial backlog alongside recurring RSS, not an unlimited
source supply: replenish it as consumed, particularly film/Sopranos criticism.
Ten useful posts and a half-evergreen mix cannot be promised for every hour.

## Return-visit decision

Saved articles, opened/read IDs and the previous visit checkpoint live in the
browser. The feed labels new items among loaded posts; simply loading a batch does
not mark it read. Opening an article or selecting Mark read does. Mark caught up
advances the checkpoint. In-app Back keeps loaded batches and filters mounted and
restores the previous scroll position. Explicit fresh-edition loading is preserved.

Saved metadata is capped at 500 entries (never silently evicted); read IDs at 2,000.
These device-local limits do not affect published content. Unavailable storage
still permits in-memory use. No cross-device sync or centrally collected analytics
is implied. New arrivals don't reorder an active session automatically.

## Capacity and evaluation

Initial measured build: 41 articles, about 0.61 MiB total output including shared
assets. With the current article mix, a linear estimate at 87,600 articles/year
(ten per hour, every hour) is about 611 MiB/year. This is an estimate, not a
benchmark or capacity guarantee: content length, build time and Git growth need
monitoring. Build output reports article count and bytes and warns at 750 MiB.
If hosting/storage must change, preserve content and permalinks. No TTL is an
acceptable capacity fallback.

Finish implementation with automated navigation, storage, archive, validation and
publication tests. After merge, inspect a small sample of scheduled editions for
writing quality, topic variety, repetition and actual post counts. A short personal
trial of around ten reading sessions can ask: was there something worth knowing,
saving or sharing; was there useful new material; could an enjoyed item be found
again? This is a pragmatic trial, not statistical proof of retention uplift.

Live model generation and a rendered-browser check were not available in the
implementation environment. Provider behavior is covered with injected responses;
DOM integration tests cover route/save/Back flows. The first live editions remain
the check on real free-model output quality.

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
