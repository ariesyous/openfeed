# Recurring source expansion

September 18, 2026. Run #37 published 12 posts after exhausting eligible sources
and publisher allowances. This change adds 14 recurring feeds from additional
publishers, bringing intake from 13 to 27 feeds and from 9 to 23 publisher groups.
These groups identify editorial outlets, not independent corporate owners. BBC
sections still share one allowance and both Guardian feeds share another.

## Live retrieval snapshot

Each added endpoint returned HTTP 200 without redirects, stayed within the 1 MB
response limit, and supplied candidates through the production parser. The table
reports the capped candidate count and median extracted excerpt length from that
retrieval. All 106 candidates passed the existing URL/title coverage filter
against main at bfc428f. Counts change as feeds update and posts are published.
Parser acceptance establishes usable inputs, not that every candidate supports
a publishable post; the editorial model and validation still decide that.

| Publisher/feed | Topic routing | Age window | Candidates | Median excerpt characters |
| --- | --- | ---: | ---: | ---: |
| [Ars Technica](https://feeds.arstechnica.com/arstechnica/index) | Technology | 7 days | 8 | 1,237 |
| [MIT News: AI](https://news.mit.edu/rss/topic/artificial-intelligence2) | AI | 7 days | 5 | 6,000 |
| [Quanta Magazine](https://www.quantamagazine.org/feed/) | Science | 30 days | 5 | 408 |
| [JSTOR Daily](https://daily.jstor.org/feed/) | Philosophy / lasting stories | 90 days | 8 | 5,428 |
| [The Conversation Canada](https://theconversation.com/ca/articles.atom) | Canada | 7 days | 8 | 6,000 |
| [NPR](https://feeds.npr.org/1001/rss.xml) | US news | 7 days | 8 | 240 |
| [PBS NewsHour](https://www.pbs.org/newshour/feeds/rss/headlines) | US news | 7 days | 8 | 322 |
| [Deutsche Welle](https://rss.dw.com/rdf/rss-en-world) | World news | 7 days | 8 | 206 |
| [IndieWire](https://www.indiewire.com/feed/) | Movies | 30 days | 8 | 147 |
| [Deadline: film](https://deadline.com/v/film/feed/) | Movies | 30 days | 8 | 344 |
| [Senses of Cinema](https://www.sensesofcinema.com/feed/) | Film criticism | 90 days | 8 | 333 |
| [Psyche](https://psyche.co/feed.rss) | Philosophy | 90 days | 8 | 160 |
| [Econbrowser](https://econbrowser.com/feed) | Economics | 7 days | 8 | 1,148 |
| [Bank of Canada: research](https://www.bankofcanada.ca/content_type/research,boc-review-article,fsr-article/feed/) | Economics | 30 days | 8 | 327 |

Broader feeds contain several subjects; topic routing is a hint, and the model
must choose the post topic from its actual content. Longer windows support
criticism, research and explainers. News still requires publication within 72
hours. Model prompts continue to forbid filling short excerpts with unsupported
claims; some sources supply much less material than others.

Headline-only feeds such as the checked Hugging Face and Google Research feeds
were not added. Blocked endpoints were excluded. Bank of Canada's general feed
included future events and its speeches feed mostly short announcements, so the
research feed was selected for substantive abstracts. No fetched article text or
feed snapshots are committed.

## Feed compatibility and limits

- RSS 2.0 uses item pubDate; RSS 1.0 uses item dc:date.
- Atom uses entry published and the alternate HTML article link. Entry updated
  and feed/channel timestamps never substitute for a publication date.
- Escaped HTML is decoded before stripping markup, scripts and styles. This
  fixes escaped paragraph tags in MIT's excerpts. Atom HTML content and plain
  summaries are supported; arbitrary XHTML trees are not flattened into evidence.
- All formats retain HTTPS and publisher-host validation, invalid/future/stale
  date rejection, DTD/entity rejection, an 80-character excerpt minimum, a
  6,000-character excerpt maximum, and eight newest accepted articles per feed.
- Requests remain fixed to the configured feed URLs, reject redirects, use a
  20-second timeout and the 1 MB bounded reader. One unavailable feed does not
  block the others. Per-feed usable counts expose empty or declining feeds.
- Generation still targets 20 posts in chunks of four with eight total attempts,
  a 45-minute generation budget, and two distinct sources per publisher group.
  Scheduled runs and the manual default remain openrouter/free.

Tests cover RSS 1.0 and Atom dates, alternate link selection, URL restrictions,
escaped HTML, sorting/count bounds, and entity rejection. Local validation makes
no model calls and publishes nothing. After merge, live generation logs should
confirm yield and editorial mix from the Actions runner; publisher availability
can differ between environments.
