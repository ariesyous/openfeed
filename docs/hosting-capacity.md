# Hosting capacity — October 23, 2026

Recommendation record. Nothing here has been migrated. DNS, Cloudflare and GitHub
account settings stay unchanged until the user decides. Retention is permanent
(`AGENTS.md`), so every option below keeps every article URL, old slug address and
share image working. Deleting content is not an option.

## Recommendation

**Move cobanter.com to one Cloudflare Worker.** It serves the bounded part of the
site (app shell, home, topics, archive pages, `data/`, feeds, sitemap) as Workers
static assets. The unbounded per-article tree (`p/**` and `og/**`) lives in an R2
bucket under the same paths. Article pages, share images and old-slug redirect pages
are byte-for-byte the same files at the same URLs. Only the place they are stored
changes.

- **Decide by December 1, 2026.** Plan the cutover for the first week of January
  2027, before the build's 750 MiB warning (January 17–30) and GitHub Pages' 1 GB
  limit (February 14 – March 3). The dates assume ariesyous/openfeed#64 merges; see
  "Growth" below.
- **Expected cost: $0–5 a month.** R2 stays inside its free tier for several years.
  Workers Free covers up to 100,000 Worker requests a day. Workers Paid ($5 a month)
  removes the risk of archive URLs failing on a busy day.
- **Separately, and soon:** stop re-rendering every share PNG on every build. This
  matters on any host (see "Build time").

GitHub Pages cannot get past 1 GB by restructuring, because the bytes are images and
HTML, not duplicate files. Cloudflare Pages and Workers static assets on their own
hit a file-count limit before or soon after the 1 GB date. Netlify's per-deploy
pricing doesn't fit eight deploys a day. R2 has no object or size limit, and it is
already reachable through the Cloudflare zone that cobanter.com uses.

## Current footprint

These numbers come from the #64 branch's `dist/` (2,696 articles, built October 23).

| Part | Files | Size | Grows per new article |
| --- | ---: | ---: | --- |
| `og/` share PNGs | 2,708 | 62.9 MiB | 1 file, ~24.4 KB |
| `p/<slug>/index.html`, canonical | 2,696 | 29.1 MiB | 1 file, ~11.3 KB |
| `p/<old-slug>/index.html`, redirect pages | 2,382 | 7.0 MiB | none (fixed historical set) |
| `p/**/article.json` (both routes) | 5,078 | 7.9 MiB | 1 file, ~1.6 KB |
| `p/**/related.json` (both routes) | 5,078 | 6.6 MiB | 1 file, ~1.4 KB |
| `data/`, topics, archive, feeds, sitemap, assets | 298 | ~9 MiB | ~3 KB (batch, search row, sitemap, archive line) |
| **Total** | **18,240** | **122.6 MiB** | **4 files, ~41 KB** |

New articles store short slugs from the start
(`post-20261022T213830Z-2a10-0` → `meta-s-founder-alignment-agreement-gives-zuckerberg-extra-sh--f4266189f2`),
so the 2,382 redirect pages never grow.

## Growth

These figures assume the planning maximum of eight 20-post editions a day (160
articles). October actually averaged about half that, which would double every
interval below.

| Limit | Rate basis | Reached |
| --- | --- | --- |
| Build's 750 MiB warning | 7.3 MiB/day (#64's 46.6 KiB × 160) | ~January 17, 2027 |
| | 6.4 MiB/day (measured ~41 KB per *new* article) | ~January 30, 2027 |
| GitHub Pages 1 GB (10⁹ bytes) | 7.3 MiB/day | ~February 14, 2027 |
| | 6.4 MiB/day | ~March 3, 2027 |
| 20,000 files (Cloudflare Pages / Workers Free) | 640 files/day | ~October 26, 2026 (days away) |
| 100,000 files (Cloudflare Pages / Workers Paid), unchanged layout | 640 files/day | ~February 28, 2027 |

If #64 does not merge, the site is 251 MiB today and grows about 14 MiB a day, so 1 GB
arrives around mid-December 2026. Merge #64 regardless of this decision.

## Options compared

All limits and prices were checked on October 23, 2026 against the official pages
linked under "Sources".

### 1. Stay on GitHub Pages and restructure

GitHub Pages documents a 1 GB published-site limit, a 10-minute deployment timeout
and a soft 100 GB/month bandwidth limit. It documents no file-count limit. GitHub
says that over quota it "may be unable to serve your site".

Restructuring reduces file counts but barely changes bytes:

| Change | Files saved | Bytes saved |
| --- | --- | --- |
| Merge `related.json` into `article.json` | 1 per article | ~0 (same JSON) |
| Read `#article-data` already embedded in `index.html`, drop `article.json` | 1 per article | ~1.6 KB per article |
| Drop the JSON copies at the 2,382 old slugs (client maps old to canonical) | 4,764 once | ~7 MiB once |
| Old-slug redirects from a rules file | none on Pages (it has no redirect rules) | — |

Every new article is still about 24 KB of PNG plus 11 KB of HTML, so the best case
moves 1 GB by a few days. Only removing per-article share images moves the date
materially (about 60% of new bytes). That is a product change, and it still ends at
1 GB later. **Not recommended as the end state.** Merging the JSON files is still
worth doing on whatever host is chosen, because it halves in-app article fetches.

### 2. Cloudflare Pages

- Free: 20,000 files per site. Paid plans: 100,000 (needs
  `PAGES_WRANGLER_MAJOR_VERSION=4`).
- 25 MiB per file, 20-minute build timeout, 500 builds a month on Free.
- `_redirects` allows 2,000 static rules plus 100 dynamic ones.

The site already has 18,240 files, so Free is out within days. Paid gets about 128
days on today's layout, and about 190 days after merging the JSON and dropping
old-slug duplicates. The 2,382 old-slug redirects don't fit in `_redirects` (2,000
static rules). They aren't derivable by pattern either, because the old suffix is the
hex id and the new one is a hash. Account-level Bulk Redirects allow 10,000 URLs on
Free and would hold them, but they need a proxied hostname and live outside Git.
**Not recommended.** This is the same wall as
GitHub Pages, measured in files instead of bytes.

### 3. Workers static assets only

The limits match Pages: 20,000 files per Worker version on Free and 100,000 on Paid
(Wrangler 4.34.0 or newer), 25 MiB per file, and the same `_redirects` caps. Static
asset requests are "free and unlimited". Upload is incremental: Wrangler sends a
hash manifest and uploads only files the account doesn't already have.

Even at one file per article (PNGs elsewhere, JSON embedded), 100,000 files arrives
around June 2028. **Not recommended alone.** It is the right home for the bounded
part of the site, which is option 4.

### 4. Worker + R2 (recommended)

- **R2 limits:** unlimited objects and storage per bucket, 5 TiB per object, one
  write per second to the same key.
- **Free tier:** 10 GB-month of storage, 1M Class A (write/list) and 10M Class B
  (read) operations a month.
- **Paid rates:** $0.015/GB-month, $4.50 per million Class A, $0.36 per million
  Class B. Egress is free.
- **Domain:** a custom domain must be a zone in the same account (cobanter.com
  already is). r2.dev is rate-limited and not for production.
- **Directory index:** a public bucket doesn't serve `index.html` for `/p/x/`, so a
  Worker maps paths to keys.

Rough usage:

- **Storage.** Per-article objects add about 2.3 GiB a year at the planning maximum,
  so the 10 GB free tier lasts about four years. After that, 20 GB costs about $0.30
  a month.
- **Writes.** An edition writes about 20 PNGs, about 60 new article files, and the
  related-reading HTML/JSON of earlier neighbours in the same topic. That is a few
  hundred Class A operations, or roughly 50,000 a month. An app-shell change rewrites
  every article page, because each page references Vite's hashed bundle (2,700
  writes now, about 60,000 in a year). That still fits the free tier unless the app
  ships many times a month.
- **Reads.** One Class B read per Worker-served file. Cache them with the Cache API to
  cut repeat reads.

Workers billing:

- Requests that match a static asset never invoke the Worker and are free.
- Requests for `p/**` and `og/**` invoke it. Free allows 100,000 a day, after which
  those URLs fail.
- Paid is a $5 minimum with 10 million requests a month, then $0.30 per million.

There is no traffic data in the repository. Check Cloudflare Web Analytics for daily
article views before the cutover. Use Paid if article views plus share-image fetches
can approach 100,000 on a single day.

### 5. Netlify

- Free: 300 credits a month (hard limit). Personal: $9 for 1,000 credits. Pro: $20
  for 3,000 credits.
- Each production deploy costs 15 credits, bandwidth 20 credits per GB, and 10,000
  web requests 2 credits.
- Eight deploys a day is about 3,600 credits a month before any traffic, which is
  over the Pro allowance. Free would cover 20 deploys a month.

Netlify documents a 25,000-file limit for ZIP deploys. The limit for digest deploys is
only stated in forum answers, so it is unverified. **Not recommended:** the per-deploy
pricing conflicts with the publishing cadence.

### 6. Vercel

The limits page (updated September 16, 2026) lists:

- CLI static uploads of 100 MB on Hobby and 1 GB on Pro;
- 15,000 source files per CLI deployment;
- a 45-minute build cap when building on Vercel.

The site already exceeds the Hobby upload size and the file count. Pro has the same
1 GB ceiling as GitHub Pages and costs $20 a month. **Not recommended.**

### Hybrid: share images on an R2 subdomain, HTML stays on Pages

This would avoid changing the apex. But `og:image` URLs would move to a new host, and
the existing `cobanter.com/og/*` URLs would have to stay on Pages, because Pages can't
redirect an image. New-article growth falls to about 2.6 MiB a day, which pushes 1 GB
to roughly late 2027. **Not recommended:** it costs about as much work as option 4
and still ends at a limit. Treat it as a fallback only if the apex move is rejected.

## Build time (any host)

- On October 22, the archive step took 96 s for 2,696 articles. That is about 36 ms
  per article, almost all of it PNG rendering. This was measured before #64's palette
  encoder.
- Every deploy re-renders every PNG. At 160 articles a day, the step takes about
  8.6 minutes by early January 2027 and about 36 minutes by October 2027.
- That cost is paid on up to eight deploys a day and on every pull request's
  `pnpm build`.
- The GitHub Pages artifact upload (10 s at 251 MiB) and the deploy step (10-minute
  timeout) also grow with the full site.

The fix doesn't depend on the host:

- Key each preview on a digest of its inputs: title, topic, format and a renderer
  version.
- Keep a small `preview-index.json` mapping input digest to the existing
  content-hashed filename, and skip rendering when the digest is unchanged.
- On GitHub Pages, keep the rendered PNGs in an Actions cache. With R2, the bucket
  itself is the cache.

The output URLs stay unchanged, because the filename is still the PNG's own hash.

With R2, the uploader also sends only changed objects:

- It compares against a `_sync/manifest.json` in the bucket (key → sha256).
- It never deletes, which matches permanent retention, so superseded hashed PNGs
  remain harmlessly.
- Deploy time then tracks the edition's size, not the archive's.

## Migration sketch

Each step can be rolled back. Steps 3 and 6 are the user's account actions.

1. **Worker and uploader, no traffic.**
   - Add `worker/` and `wrangler.jsonc` with an assets directory: `dist/` without
     `p/` and `og/`, keeping `not_found_handling` off so misses reach the Worker.
   - Add an R2 binding, plus `scripts/syncR2.ts`, which uploads changed `dist/p/**`,
     `dist/og/**` and `dist/assets/**` objects.
   - Copying `assets/**` to R2 too means article pages that still reference an older
     hashed bundle keep loading after an app release.
   - The Worker only runs on asset misses:
     - map `/p/x/` to `p/x/index.html`;
     - redirect `/p/x` to `/p/x/` the way GitHub Pages does;
     - support `GET`/`HEAD` and conditional requests;
     - send `max-age=600` for HTML/JSON, matching Pages today, and `immutable` for
       `og/*` and `assets/*`;
     - serve `404.html` with status 404 for anything else.
   - The old-slug redirect pages move unchanged, so their query/fragment handling and
     sharing tags stay exactly as #64 made them. An HTTP 301 from a slug map in the
     Worker can replace them later, which is optional.
2. **Parallel publishing.**
   - `deploy.yml` keeps deploying GitHub Pages and also runs `syncR2.ts` and
     `wrangler deploy`.
   - This needs a repository secret: a Cloudflare API token scoped to Workers Scripts
     and R2 for this account. Creating it is the user's action.
   - Verify on the `workers.dev` hostname, or on a staging hostname if the user adds
     one. Check every sitemap URL, every `og:image` URL, all 2,382 old-slug addresses
     with `?x=1#y`, `article.json`/`related.json` at both routes, feeds, `/search/`
     and a missing path (expect 404). Compare bytes with GitHub Pages.
3. **Cutover (user, in Cloudflare).**
   - Lower the apex TTL. Delete the apex CNAME to `ariesyous.github.io`, then add
     cobanter.com as the Worker's Custom Domain. Cloudflare refuses a Custom Domain
     while a CNAME exists, and it issues the certificate itself.
   - Leave the `www` record and the `Redirect www to secure cobanter.com` rule as
     they are. Keep the GitHub verification TXT record.
4. **Verify live.**
   - Run the same URL sweep against `https://cobanter.com/`. Check TLS, social
     previews for one new and one old-slug article, and Cloudflare Web Analytics.
   - Confirm that legacy `ariesyous.github.io/openfeed/...` links still redirect to
     cobanter.com. That depends on keeping the Pages site and its custom-domain
     setting. GitHub's behaviour once DNS stops pointing at it is unverified, so test
     it right after cutover.
5. **Keep GitHub Pages as a stub.**
   - When Pages nears its limit, deploy only a small site so the github.io custom
     domain redirect survives, instead of removing the site.
   - Rollback before then: remove the Worker Custom Domain and restore the DNS-only
     CNAME. GitHub may need to re-issue its apex certificate.
6. **Afterwards.**
   - Add incremental PNG rendering if it isn't done already, and merge
     `related.json` into `article.json`.
   - Watch the daily Worker request count. Upgrade to Workers Paid if it passes about
     half the free limit.

## Follow-ups this growth also exposes

These are out of scope for this decision and listed for planning.

- `data/search-index.json` is 563 KB for 2,696 articles and loads whole when search
  opens. It reaches about 12 MB in a year, long before the 25 MiB per-file limit.
  Sharding by year or topic is a reader-experience change.
- The repository is about 3.7 MB on GitHub, and `public/data` grows about 0.35 MiB a
  day. Both are far from GitHub's 1 GB repository recommendation for years.

## Sources

Checked October 23, 2026.

- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Workers limits (static assets, `_redirects`, daily requests): https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Static assets billing and routing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/, https://developers.cloudflare.com/workers/static-assets/binding/, https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
- Static assets incremental upload: https://developers.cloudflare.com/workers/static-assets/direct-upload/
- Workers `_redirects`: https://developers.cloudflare.com/workers/static-assets/redirects/
- Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- R2 limits: https://developers.cloudflare.com/r2/platform/limits/
- R2 public buckets and custom domains: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Bulk Redirects quotas: https://developers.cloudflare.com/rules/url-forwarding/
- Netlify pricing and credits: https://www.netlify.com/pricing/, https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Netlify ZIP deploy file limit: https://docs.netlify.com/api/get-started
- Vercel limits: https://vercel.com/docs/limits
