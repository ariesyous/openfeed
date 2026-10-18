# Generator

The active pipeline is `generate.ts` → `editorial/sources.ts` →
`editorial/generate.ts` → `publish.ts`.

Run `pnpm generate` with `OPENROUTER_API_KEY`. All generation and review uses
`deepseek/deepseek-v4.1-flash`; legacy `OPENROUTER_MODEL` values are ignored.
Source configuration and editorial instructions are in `editorial/`.
See the root README and AGENTS.md for quality constraints, scheduling, and validation.

`bootstrap.ts`, `advanceWorld.ts`, and their supporting simulation code are the legacy
fictional prototype. They are retained for reference and tests, not invoked by the
active entry point. Do not use them to populate the editorial feed.
