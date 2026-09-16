# OpenFeed

Useful reading about the real world: news, explainers, true stories, and clearly labelled
AI-written banter. Dark mode is the default; an explicit light preference is saved locally.

The frontend is static React/TypeScript on GitHub Pages. Generation happens offline in
GitHub Actions through OpenRouter. The browser never receives API keys or calls a model.

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Content pipeline

`pnpm generate` fetches RSS from the publishers configured in
`generator/editorial/sources.ts` (initially BBC Technology, BBC World, and NASA).
It uses dated publisher descriptions or bounded text supplied in the feed. This is not
an unrestricted web search or a guarantee of comprehensive news coverage.

The editor receives actual source packets, skips URLs already covered, and returns
structured drafts. Validation checks source IDs, exact supporting excerpts, freshness,
and duplicate coverage. Code attaches publisher links and dates. These checks prevent
invented citations; they do not independently prove that every paraphrase is correct.
The prompt requires the model to skip weak evidence and separate commentary from fact.

News sources must be no older than 72 hours; the intake window for other formats is
seven days. Sources dated in the future, non-HTTPS/off-domain article URLs, unsafe XML,
and oversized feeds are rejected. Failed feeds are skipped; if nothing publishable
remains, the last edition stays online. Nothing is generated from model memory as a
substitute for unavailable news. No simulated likes, views, or fictional commenters are
shown for editorial posts.

The checked-in launch edition contains five editorial examples prepared from retrieved
sources. It demonstrates the new format; recurring model-generated editions still need
live quality evaluation. Thin RSS descriptions may support only short briefs, not deep
explainers. Full articles remain linked for context.

Set `OPENROUTER_API_KEY` locally or as a repository secret. `OPENROUTER_MODEL` selects
the model for local runs; manual Actions runs use the model dropdown. A six-hour schedule
exists but stays disabled until `FEED_SCHEDULE_ENABLED=true`. Validate several manual
editions for accuracy, variety, usefulness, and cost before enabling it.

## Historical prototype

The original fictional-world modules and deterministic fixture generator remain for
reference and their unit tests. `pnpm seed:legacy` recreates fictional test fixtures and
must not be used for the live editorial feed. The active entry point is
`generator/generate.ts`, which uses only `generator/editorial/`.


## Reading interests and discussions

The feed now targets movies, The Sopranos, agentic AI, Canadian/US/world news,
Greek and Roman mythology, philosophy, economics, and worthwhile discoveries.
`generator/editorial/prompt.md` controls editorial selection and voice;
`sources.ts` contains RSS sources and age windows; `evergreen.ts` contains a finite,
reviewed shelf of background articles. Add more shelf entries as they are consumed.
Unavailable or thin sources are skipped. Dates are never invented for undated readings.

Posts may carry 2–4 labelled AI-generated perspectives with a preview and expandable
exchange. These are interpretations/banter, not real public comments. Each generated
turn must cite evidence from the post's sources. Plot spoilers require an explicit reveal.
The new four-post sampler was prepared from retrieved BFI, World History Encyclopedia,
and Stanford Encyclopedia of Philosophy material. It illustrates the intended writing;
recurring model quality still needs a manual generation run after merge.
