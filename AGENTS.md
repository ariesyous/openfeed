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
- `.github/workflows/generate.yml`: manual plus opt-in six-hour schedule.
- `.github/workflows/deploy.yml`: validates, builds, and deploys pushes to main.

The old bootstrap/advanceWorld modules and `scripts/seed/` are historical code, not the
active generator. Do not reconnect them to `pnpm generate` or the live feed. `seed:legacy`
is only for intentionally recreating the old development fixtures.

## Important behaviour

Every editorial post has real source links, original publication dates, and a format.
News requires sources within 72 hours. Other intake sources are at most seven days old.
Unknown source IDs, mismatched evidence quotes, duplicate coverage, unsupported URL
schemes, and publisher-domain mismatches fail validation. Never fabricate sources as a
fallback. An empty intake or empty editorial result preserves the existing feed.
Exact-quote checks establish provenance, not semantic fact-checking; live editorial
quality and entailment still require review. Thin excerpts must not be padded with
unsourced facts. Banter is visibly generated commentary, not eyewitness testimony.

The launch edition was prepared from retrieved source packets to demonstrate the new
format. It is not evidence of successful recurring OpenRouter generations. Scheduling
remains gated by `FEED_SCHEDULE_ENABLED`; do not enable it before live validation.

## Verification and credentials

Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before pushing changes.
Never commit/log OPENROUTER_API_KEY or put it in frontend code. No model calls in browser.
Model choice is configurable via OPENROUTER_MODEL (manual Actions uses its dropdown).
All public/state writes must go through buildPublishPlan/writePublishPlan after validation.
