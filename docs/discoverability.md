# Discoverability — October 19, 2026

Every `pnpm build` derives discovery files from the validated complete publication
catalog. New editions automatically update these files on the existing Pages deployment.
There is no separate upload step or model call.

- `/robots.txt` allows crawling and advertises the absolute sitemap URL. It does
  not add separate AI-training permissions or change Cloudflare settings.
- `/sitemap.xml` includes the homepage, topic destinations, HTML archive pages,
  and every canonical editorial article. Historical aliases, JSON payloads, card
  query variants and 404 pages are excluded. At more than 10,000 URLs it becomes
  an index of bounded `/sitemaps/page-N.xml` files. No build-time `lastmod` dates
  are invented: there is no reliable stored article modification timestamp.
- `/llms.txt` is a bounded Markdown guide to the site, topics, recent articles,
  complete catalog and public JSON indexes. It explains AI authorship, original
  publisher links, separate source/added dates, spoilers and fallible review.
  It follows the [llms.txt proposal](https://llmstxt.org/); it is not a search
  engine submission protocol or an indexing guarantee.
- The homepage contains recent unchanged article text, protected discussions and
  real article/topic links in the delivered HTML. React supplies the interactive
  reader after loading. The complete `/archive/` has 50 article links per page
  with ordinary newer/older navigation. Archive pages use the shared CSS without
  booting React, so they remain a usable archive with JavaScript enabled or disabled.
- Homepage, topic, archive and article HTML contain titles, descriptions, canonical
  URLs and Open Graph/Twitter metadata. JSON-LD describes the site, organization,
  collections and articles. CoBanter is the organizational author; source URLs are
  citations, not claims that the source publishers wrote CoBanter's text. Discussion
  voices are not people, reviews, reader comments or engagement statistics.
- Article structured dates use the article's original CoBanter added timestamp;
  publisher dates remain in their source panels. Spoiler body/discussion text stays
  inside native disclosures, marked `data-nosnippet` for search snippets, and out
  of descriptions, JSON-LD and the agent guide.
- In-app navigation updates the canonical, description, social tags and JSON-LD.
  Stale article images and dates are cleared on navigation; prebuilt sharing images
  are retained for direct article loads. Cards canonicalize to the homepage. Missing
  topics/articles have `noindex` metadata and the deployed 404 retains HTTP 404.

`SITE_ORIGIN` defaults to `https://cobanter.com`; it must be an HTTPS origin without
credentials, a path, query or fragment. `SITE_BASE_PATH` stays identical across Vite
and the archive builder. A robots file under a project subpath cannot set the
host-root crawler policy; production uses the domain root.

## Search engine onboarding

After deployment, verify that the public robots file actually includes the sitemap
line: Cloudflare can prepend or replace crawler content independently of GitHub Pages.
Confirm the sitemap, agent guide, archive and a sample article return HTTP 200,
with canonical URLs on the HTTPS apex. Keep the existing www redirect and domain
verification records.

The account owner can then:

1. Add or open the `cobanter.com` domain property in
   [Google Search Console](https://search.google.com/search-console/), complete its
   ownership verification if needed, and submit `https://cobanter.com/sitemap.xml`
   in Sitemaps. Inspect the homepage and representative article/topic URLs.
2. Add the site in [Bing Webmaster Tools](https://www.bing.com/webmasters/), or
   import the verified Google property, and submit the same sitemap.
3. Monitor crawl errors, indexed pages and search impressions. Crawlability,
   structured data and sitemap submission do not guarantee indexing or ranking.

No verification tokens are fabricated, no billing settings change, and account
verification/submission is not implied by the presence of these files. Google can
discover a sitemap through its robots reference; Search Console submission adds
reporting. See Google's [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
and [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).
