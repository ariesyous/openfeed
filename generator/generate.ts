// Entry point for `pnpm generate`. The OpenRouter-backed generator described in
// ProjectSpecifications.md (§12–19, §25–27) is Phase 2 work and does not exist yet —
// this only exists so the command has a clear, honest failure mode instead of a
// missing-file error.
console.error(
  "generator/generate.ts: not implemented yet. The OpenRouter-backed feed generator " +
    "is Phase 2 work — see ProjectSpecifications.md and generator/README.md. " +
    "Phase 1 uses checked-in seed data via `pnpm seed` instead.",
);
process.exit(1);
