# Richer context and complete AI discussions — October 18, 2026

The reader wants fewer worthwhile posts with a back-and-forth AI discussion on every
new post. Commentary, humour and strong interpretations remain part of the product.
The change addresses source access and selection; it does not retroactively edit articles
or establish that the next generated edition will be factually correct.

## Source context

RSS descriptions are discovery material. Recurring sources qualify through substantial
`content:encoded`/Atom content, or through a retrieved article body with an explicit
publisher adapter. Current adapters cover CBC, PBS NewsHour, NPR, BBC, Psyche and
Variety. Other publishers need usable full feed prose; a long description alone is not
enough. The existing reviewed evergreen extraction remains available unchanged.

Before article retrieval, intake removes covered URLs and normalized titles. Selection
rotates across topics, with up to 24 candidates and three per publisher group; BBC
sections share one group. Retrieval uses at most four concurrent requests, 20 seconds
per request, and 1 MB per response. Only HTTPS article URLs discovered in configured
feeds and matching that publisher's allowed hosts qualify. Redirects are rejected.
No linked-page crawling, script execution, or general-purpose body fallback is used.

The HTML parser requires one matching body, excludes navigation, captions and related
modules, and retains complete paragraphs up to 6,000 characters. Headings, omitted
modules and sections create explicit boundaries. Missing, ambiguous, blocked or thin
bodies are skipped, without restoring a feed blurb as generation material. These layout
adapters will need maintenance when publisher markup changes.

Requests with sectioned context offer at most eight sources. Each sectioned source has
up to 24 evidence snippets, rotating through the leading complete sentence groups of
its sections. This exposes later mechanisms and qualifications while preserving section,
paragraph and continuation markers. Evergreen-only requests retain the previous
16-source/12-snippet bounds. Each snippet remains verbatim, at most 25 words and 300
characters; complete long-sentence groups must fit together. The maximum offered
snippet count remains 192. No full fetched articles enter public data or audit artifacts.

## Publication selection and voice

Eight posts is the edition ceiling, down from twenty. Four posts per request, eight
total attempts and the shared 45-minute generation deadline remain unchanged. There
is no minimum, length requirement or topic quota. Empty selections still defer their
sources for this run and try alternatives within the same budget. Previously accepted
chunks survive a later provider failure; publication still goes through the validated
publisher once.

Prompt guidance requires a concrete payoff: a mechanism, result, revealing detail or
useful interpretation. Announcing that details exist does not deliver those details.
The body should deliver the story; the exchange should develop a perspective or joke,
rather than repeat the body. Opinions need a supported premise, not a quotation of
someone else's opinion. Empirical generalizations and motive claims still require evidence.

Every newly generated post requires two to four valid turns, at least two voice labels,
and distinct turn text. Strict JSON output requires an array; fallback JSON passes the
same local validation. An invalid exchange rejects the response for bounded correction
or omission of the post. It cannot be silently removed before publishing a bare article.
Existing articles and historical validation retain their optional discussion contract.

Distinct voices and citations do not prove a meaningful exchange or factual entailment.
The concrete-payoff and responsive-conversation criteria remain editorial judgments;
the deterministic checks enforce structure and provenance. Review a fresh ordinary
edition before claiming better generated writing or advancing the existing observation
counts. No live model generation was used for this implementation.

## Verification

Reduced publisher layouts exercise extraction, exact support, later sections, unsafe
URLs, unavailable/thin pages, byte and concurrency limits, covered-title exclusion and
full feed content. Provider mocks exercise required discussions in both structured and
fallback responses, bounded retries, and preservation of previously accepted chunks.
Existing reviewed culture and film evidence fixtures remain unchanged.

Six locally cached source pages retrieved during the October 18 audit yielded 3,254–5,527
characters of article prose, with 23–24 offered snippets spanning every extracted section
in those examples. This validates retrieval and evidence reach, not generated quality.

A read-only live intake at 04:28 UTC on October 18 yielded 22 usable packets across eight
topics, using the local checkout's coverage state. Both article retrieval and full feed
content contributed; there were no model calls or public/state writes. This snapshot is
not a guaranteed future intake or a count of publishable posts, and the local coverage
state predates the latest remote editions.

Typecheck, lint and the production build passed. The full Windows suite returned
289 passing tests and seven failures already present before these changes (symlink
permissions and path/line-ending assumptions in historical migration tests). After
the final schema assertions, all 94 focused generator and source-fixture tests passed.
The full suite is therefore not recorded as green on this machine.
