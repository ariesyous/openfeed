# OpenFeed agent notes

## Current direction — September 15, 2026

The user explicitly rejected fictional people, places, and manufactured drama. The
current product is a source-grounded reading feed: useful explainers, real stories,
relevant news, and clearly labelled generated banter. Dark mode is on by default.
This direction supersedes the original fictional-world specification.

## Active architecture

- `src/`, `schemas/`, `public/data/`: static React frontend and shared contracts.
- `generator/generate.ts`: active entry point, calls `generator/editorial/`.
- `editorial/sources.ts`: fixed publisher feeds, bounded XML, date/domain validation.
- `editorial/prompt.md`: editorial voice, source grounding, no fictional news.
- `editorial/generate.ts`: validates citations/evidence, enriches source metadata.
- `editorial/state.ts`: tracks covered source URLs, never invented storylines.
- `generator/publish.ts`: sole validated writer for public data and world state.
- `.github/workflows/generate.yml`: manual plus enabled hourly schedule using openrouter/free.
- `.github/workflows/deploy.yml`: validates, builds, and deploys pushes to main.

The old bootstrap/advanceWorld modules and `scripts/seed/` are historical code, not the
active generator. Do not reconnect them to `pnpm generate` or the live feed. `seed:legacy`
is only for intentionally recreating the old development fixtures.

## Important behaviour

Every editorial post has real source links, original publication dates, and a format.
News requires sources within 72 hours. News-oriented RSS intake is at most seven days old; culture feeds have explicit longer windows.
A bounded evergreen article shelf supports older criticism and reference material.
Evergreen sources never qualify as news; missing publication dates stay unknown.
Unknown source IDs, mismatched evidence quotes, duplicate coverage, unsupported URL
schemes, and publisher-domain mismatches fail validation. Never fabricate sources as a
fallback. An empty intake or empty editorial result preserves the existing feed.
Exact-quote checks establish provenance, not semantic fact-checking; live editorial
quality and entailment still require review. Thin excerpts must not be padded with
unsourced facts. Banter is visibly generated commentary, not eyewitness testimony.

The launch edition was prepared from retrieved source packets to demonstrate the new
format. It is not evidence of successful recurring OpenRouter generations. The user approved hourly scheduling after successful live run 35104908350;
the former FEED_SCHEDULE_ENABLED rollout gate has been removed.

## Verification and credentials

Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before pushing changes.
Never commit/log OPENROUTER_API_KEY or put it in frontend code. No model calls in browser.
Model choice is configurable via OPENROUTER_MODEL (manual Actions uses its dropdown).
All public/state writes must go through buildPublishPlan/writePublishPlan after validation.


## Reader direction — September 16, 2026
Movies, The Sopranos, agentic AI, Canada/US/world news, Greek and Roman mythology,
philosophy, economics, interesting facts and stories. Prefer a varied reading mix,
roughly half timely and half lasting material when supported. Recent edition summaries
are passed into generation to discourage repeated angles.

Editorial discussions are optional 2–4 AI-generated perspectives in editorial.discussion,
not legacy comments, synthetic people, or fake engagement. Each draft turn has evidence
from its post's attached sources; exact provenance is still not semantic verification.
Spoiler-marked bodies and discussions stay hidden until requested; titles must be safe.
The interests-discussion sampler is a manually prepared, retrieved-source edition,
not a live OpenRouter run. The evergreen shelf is finite and must be expanded as used.


## Editorial generation reliability
The editorial request carries a strict JSON schema derived from Zod; nullable transport
fields normalize to optional draft values. Both structured and fallback output pass the
same local evidence validation. Editions target ten posts in requests capped at four, sharing five total attempts. The user explicitly wants
`openrouter/free` as the default. Keep it as the manual default; Gemini is optional.
Scheduled runs are enabled hourly at minute 17 and pinned to `openrouter/free`.
Keep attempt diagnostics bounded and credential-redacted; log failure details and
available resolved-model/finish metadata instead of dumping completions.


## Numbered evidence
Active editorial generation uses evidenceIds chosen from code-built verbatim snippets.
`evidence.ts` bounds input to 16 sources across topics and 12 snippets per source.
`validateCitedDraft` resolves IDs before calling the unchanged core evidence checks;
model-supplied quotation text is not used. Keep unknown-ID and cross-source discussion
checks strict. These checks prove provenance, not semantic entailment.
Local tests use mocked provider responses. Live free-router run 35104908350 and its
deployment succeeded; continue monitoring recurring output quality.

## Permanent content and reader state — September 17, 2026
The user explicitly requires forever retention. Never reintroduce automatic age- or
capacity-based content deletion. Keep source batch files and stable article slugs.
`shared/articles.ts` assigns slugs; `scripts/buildArchive.ts` builds static article
HTML/JSON and paginated deployment indexes. `public/data/manifest.json` in Git remains
the complete publication catalog; the deployed manifest is only the newest index page.
`pnpm archive:backfill` validates through the publish plan before writing migrations.

Generator URL and normalized-source-title coverage is durable; only recent summaries
are passed to models. Requests share one five-attempt budget across the whole edition.
Cross-chunk evidence, freshness and publisher validation must remain strict. Preserve
accepted chunks on later provider failure, but publish only once after validation.

The user subsequently rejected Saved, Mark read, Mark caught up and the topic dropdown.
Keep those controls removed; use a desktop topic sidebar and mobile horizontal topic
buttons. Preserve feed filters/position on in-app Back, explicit new-arrival loading,
and spoiler protection in both prebuilt HTML and React. Tests and the build
run for PRs without deployment. Read docs/reading-roadmap.md for settled decisions.
