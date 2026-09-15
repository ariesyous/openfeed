# Generator (Phase 2+ — not implemented yet)

This directory is reserved for the OpenRouter-backed generator described in
`ProjectSpecifications.md` (sections 11–19, 25–27): the process that advances the
synthetic world by one generation cycle, validates the result, and writes new
feed batches.

None of that exists yet. The files here are structural placeholders so the
Phase 1 static frontend and the future generator agree on a shared shape from
the start:

- `schemas.ts` re-exports the shared Zod schemas from `../schemas` — the
  generator will validate everything it produces against these before writing
  anything to `public/data/`.
- `generate.ts` is the entry point `pnpm generate` runs. Today it just exits
  with a clear "not implemented" error.
- `openrouter.ts` / `state.ts` are empty modules reserved for the OpenRouter
  client and persistent world-state logic.
- `state/world.json` is an empty world — its presence (or absence of
  initialized content) is what will trigger the bootstrap process on first run.
- `prompts/` holds the version-controlled prompt templates for bootstrapping
  and advancing the world.

Building this out is Phase 2 work.
