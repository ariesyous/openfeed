# AGENTS.md

Context for AI coding agents working in this repo. See [`ProjectSpecifications.md`](./ProjectSpecifications.md) for the full product/architecture spec — this file is a working-notes supplement, not a replacement.

## What this is

Dopamine Feed: a static, entirely-synthetic AI social-media feed. Static React/Vite/TS frontend + static JSON data + an OpenRouter-backed generator that runs in GitHub Actions. No backend, no database, no auth.

## Repo layout

- `src/`, `schemas/`, `public/data/` — the frontend and the shared data contract (`schemas/` is imported by both the frontend and the generator; never diverge them).
- `scripts/seed/` — a deterministic, non-LLM fixture generator for frontend dev (`pnpm seed`). Fully independent of `generator/`; don't couple the two.
- `generator/` — the real OpenRouter pipeline. See below.
- `.github/workflows/deploy.yml` — builds/deploys the frontend on push to `main`.
- `.github/workflows/generate.yml` — manual dispatch plus an opt-in six-hour schedule gated by `FEED_SCHEDULE_ENABLED == true`. Runs `pnpm generate` in CI using the `OPENROUTER_API_KEY` repo secret and commits the result. Keep scheduling disabled until several manual cycles establish quality and cost.

## Commands

```bash
pnpm install
pnpm dev / build / preview
pnpm typecheck / lint / test
pnpm seed        # regenerate public/data/* deterministically, no API key needed
pnpm generate     # run the real generator, needs OPENROUTER_API_KEY
```

Always run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` before pushing generator or frontend changes.

## The generator (`generator/`)

Two flows, both going through `generator/retry.ts`'s `generateValidated()` (retry/backoff/validation loop):

- **`bootstrap.ts`** — one-time: invents ~30-50 accounts + initial world state. Triggered when `generator/state/world.json` has `initialized: false` (or doesn't parse). Immediately followed by a first `advance-world` call in the same run — nothing is published until *both* succeed (see `publish.ts`).
- **`advanceWorld.ts`** — runs every cycle: advances the world by one generation, ~20 items + comments.

The model is never trusted to produce ids, timestamps, `meta`, or engagement numbers (spec §13) — `enrich.ts` is the sole source of those, mapping "raw" LLM output (`rawSchemas.ts`, referencing accounts/items by handle/tempId) onto the real `schemas/` types. Every enriched object is re-validated with `.parse()`.

**Neither call uses structured output (`response_format`) right now** — both were switched to plain prompt-engineered JSON after live testing showed `openrouter/free`'s randomly-picked models reliably returned empty/truncated completions under strict JSON-schema mode. See the commit history on `generator/bootstrap.ts` / `generator/advanceWorld.ts` (PRs #6, #7) before reintroducing it.

### Model / provider override

`generator/config.ts`: `OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free"`. You are **not locked to `openrouter/free`** — set `OPENROUTER_MODEL` (and use whatever `OPENROUTER_API_KEY` matches) to point at any OpenRouter-routed model, e.g.:

```bash
OPENROUTER_API_KEY=sk-... OPENROUTER_MODEL=anthropic/claude-... pnpm generate
```

### Known reliability status

A complete generation run and deployments succeeded on September 15, 2026 (run 35018390324); the committed world is initialized at cycle 1. This confirms one successful cycle, not recurring reliability or free-model reliability. The notes below describe the earlier testing rounds.

Live-tested against `openrouter/free` via `.github/workflows/generate.yml` (`workflow_dispatch`), several rounds of fixes (chronologically: explicit `max_tokens`, per-call timeouts raised to 15 min, dropped structured output on both calls, flattened `advance-world`'s nested `items→comments` into two parallel top-level arrays with no ordering constraints — see PRs #3-#9):

- **`bootstrap`**: reliable, 3/3 successful live runs (different random free model resolved each time — `nvidia/nemotron-...`, `cohere/north-mini-code:free`, etc.), typically succeeding within 2-4 attempts.
- **`advanceWorld`**: failed 15/15 attempts across 3 consecutive full runs *before* the items/comments flattening fix (PR #9, merged) — empty completions, invalid JSON, and timeouts even at the 15-minute ceiling. The flattening fix has not yet been live-verified end-to-end (the verification run was cancelled mid-flight).
- Current working theory: `openrouter/free`'s random model pool struggles disproportionately with **deeply nested JSON output and multi-step ordering constraints**, not raw output size — bootstrap's ask is larger but flatter (one array of fairly simple objects) than `advance-world`'s pre-fix shape (nested arrays + forward/backward reference bookkeeping).
- **Current plan discussed with the user**: run `bootstrap` locally/out-of-band against a stronger/paid model (via `OPENROUTER_MODEL` above) and commit the resulting `public/data/accounts.json`, `manifest.json`, the new batch file, and `generator/state/world.json`, rather than relying on `openrouter/free` for the one-time bootstrap. `advance-world`'s recurring cycles may be more tractable for `openrouter/free` now that its schema is flatter — that still needs a live end-to-end confirmation.

### If you're picking this up fresh

1. Read the "Known reliability status" section above before assuming either call is broken or working — it may be stale by the time you're reading it. Check `.github/workflows/generate.yml`'s recent run history for the actual current state.
2. Once `generator/state/world.json` has `initialized: true` (from a successful bootstrap, local or CI), subsequent runs skip bootstrap entirely and only exercise `advanceWorld` — this is the steady-state path that matters for Phase 3's eventual scheduled cadence.
3. `buildPublishPlan`/`writePublishPlan` in `publish.ts` are the only functions allowed to touch `public/data/*` or `generator/state/world.json`, and only after full validation — never write those paths any other way.
4. Never commit a real `OPENROUTER_API_KEY`. Never log it either (`generator/openrouter.ts` is careful about this — keep it that way).
