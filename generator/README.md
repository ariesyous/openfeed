# Generator

Advances the synthetic world by one generation cycle: calls OpenRouter, validates the
result, and writes new feed batches under `public/data/`. See `ProjectSpecifications.md`
(sections 11–19, 25–27) for the full spec this implements.

```bash
pnpm generate
```

Requires `OPENROUTER_API_KEY` in the environment (see `.env.example` at the repo root).
On first run (when `generator/state/world.json` has no initialized world), it bootstraps
the initial account population and world state, then immediately generates the first
normal batch in the same run. On every later run, it advances the existing world by one
cycle.

## Files

- `config.ts` — tunable constants (items/comments per cycle, retention window, retry
  budget, world-state bounds), each overridable via env vars.
- `env.ts` — loads `.env` locally (`process.loadEnvFile`) and reads `OPENROUTER_API_KEY`.
- `openrouter.ts` — low-level, single-attempt OpenRouter chat completion call. Classifies
  every failure as retryable, a structured-output-unsupported fallback case, or fatal.
  Never logs the API key.
- `retry.ts` — `generateValidated()`: the retry/backoff/validation loop shared by
  bootstrap and advance-world calls (up to 5 attempts, exponential backoff with jitter,
  markdown-fence stripping, a fallback out of structured-output mode, and a
  correction message appended to the prompt on validation failure).
- `rawSchemas.ts` — Zod schemas for exactly what the LLM is allowed to return (accounts
  and posts reference each other by handle/tempId, never real ids), plus cross-reference
  checks Zod alone can't express.
- `enrich.ts` — the only place real ids, timestamps, `meta`, and engagement numbers get
  generated, mapping raw LLM output onto the shared `../schemas` types.
- `engagement.ts` / `ids.ts` — small app-side helpers (engagement synthesis, id/run-id
  generation). Intentionally independent of `scripts/seed/`'s versions of the same ideas
  — that seed generator is a separate, decoupled frontend-dev fixture.
- `worldState.ts` — the persistent, bounded world state (`generator/state/world.json`):
  active storylines, character memories, running jokes, conflicts, trends, and recent
  cycle summaries. Bounded on every merge so it never grows without limit.
- `promptBuilder.ts` + `prompts/*.md` — version-controlled prompt templates with
  `{{PLACEHOLDER}}` substitution.
- `bootstrap.ts` / `advanceWorld.ts` — the two generation flows.
- `publish.ts` — builds the complete candidate (batch, manifest, accounts, world state)
  in memory, validates everything, and only then writes to disk. Also prunes batches
  older than the configured retention window (age-based only, by design — repost/
  reaction references are restricted to the same generation cycle, so pruning can never
  leave a dangling reference).
- `generate.ts` — CLI entry point (`pnpm generate`) that ties it all together.

Run `pnpm test` for unit coverage (mocked `fetch`, no real network access) of the retry
logic, enrichment, and the no-disk-writes-on-a-failed-candidate guarantee.

## What's not here yet

Scheduled/automated runs, transactional persistence back to the repo via GitHub Actions
on a recurring cadence, and concurrency protection across overlapping runs are Phase 3
(`ProjectSpecifications.md` §26–27). `.github/workflows/generate.yml` currently only
supports a manual `workflow_dispatch` run.
