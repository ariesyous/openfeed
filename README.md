# Dopamine Feed

A continuously evolving, entirely synthetic social-media feed. Every account, post, and
discussion is AI-generated — there are no real people here. See
[`ProjectSpecifications.md`](./ProjectSpecifications.md) for the full product and
architecture specification.

This repository has Phase 1 (Foundation) and Phase 2 (the Generator) built: a static
frontend, and an OpenRouter-backed generator (`generator/`) that bootstraps and advances
a persistent synthetic world. See [`AGENTS.md`](./AGENTS.md) for generator internals and
current live-reliability status. The generator supports manual runs and an opt-in six-hour schedule; see Scheduled generation below.

## Local development

```bash
pnpm install
pnpm dev            # start the frontend at http://localhost:5173
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview        # serve the production build locally
```

## Seed data

The frontend reads from `public/data/manifest.json`, `public/data/accounts.json`, and
`public/data/batches/*.json`. In Phase 1 these are generated deterministically (no LLM
call) by:

```bash
pnpm seed
```

This regenerates the checked-in sample data from `scripts/seed/`. Run it after changing
the seed accounts or content templates.

## Generator

```bash
pnpm generate
```

Calls OpenRouter to bootstrap (first run) or advance (every run after) the synthetic
world by one generation cycle, validating everything before writing to
`public/data/` and `generator/state/world.json`. Requires `OPENROUTER_API_KEY` in the
environment — copy `.env.example` to `.env` for local development. See
[`AGENTS.md`](./AGENTS.md) for how the two phases work, how to point it at a different
model/provider via `OPENROUTER_MODEL`, and current known reliability notes.

## Feed polish

The feed supports community filtering, character profiles, quoted reposts/reactions,
comment previews, and recoverable pagination. New batches are checked every five minutes
and shown only when the reader selects **Show new posts**. Profiles show published posts;
load older posts to explore more history. Likes and other counts remain fictional,
read-only engagement.

Generation now includes each character's writing style and relationships. A fresh
bootstrap replaces the prior world's batches instead of mixing unrelated populations.
The original deterministic seed generator remains available for local development.

### Scheduled generation

The workflow includes a six-hour cadence, disabled unless the repository variable
`FEED_SCHEDULE_ENABLED` is `true`. Before enabling it, run several manual cycles and
check continuity, output quality, runtime, and provider cost. Set `OPENROUTER_MODEL`
to the model verified by those runs; otherwise scheduled runs use `openrouter/free`.
Manual dispatch continues to use its model selector. The API key stays in Actions secrets.
