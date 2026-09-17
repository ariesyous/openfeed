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
the model for local runs; manual Actions runs use the model dropdown. Scheduled runs
are enabled at minute 17 of every hour (`17 * * * *`, UTC) and always use
`openrouter/free`. Successful editions are committed and deployed automatically.
Concurrency prevents overlapping generation jobs. The old `FEED_SCHEDULE_ENABLED`
rollout gate is no longer used; pause automation by disabling the workflow in Actions.

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


## Generation diagnostics and manual validation

Editorial generation requests strict JSON-schema output and retains local citation,
evidence, freshness, and publisher checks. Providers that explicitly reject structured
output fall back to plain JSON within the same five-attempt budget. Optional transport
fields use null and normalize to omitted values before publication.

Editions target ten posts in requests of at most four, sharing five total provider attempts.
Validated partial editions can publish when a later request fails; weak evidence never gets padded. Manual Actions runs default to
`openrouter/free`; Gemini remains an optional manual selection. Hourly scheduled runs
always use `openrouter/free`, independent of the repository model variable.

Attempt logs include elapsed time, available resolved-model/finish metadata, and bounded,
redacted validation/provider failure details. Malformed-JSON logs report completion size
and finish reason without dumping the response. A successful run reports whether
structured output was used. No live paid generation was performed to validate this change.


### Numbered evidence for free-model reliability

The active model response now selects `evidenceIds` from numbered source excerpts for
each post and discussion turn. Code copies the original quotation and derives source
IDs; the existing provenance, freshness, publisher, duplicate-coverage, and
discussion-source checks still run. Unknown IDs or cross-source discussion citations
are rejected. This removes exact quotation transcription from the model's job without
treating a valid citation as proof of semantic correctness.

Each request receives at most 16 sources, selected round-robin across available topics
with richer excerpts preferred within each topic, and at most 12 numbered excerpts per
source. Excerpts preserve original text and stay within 25 words/300 characters. The
model must ground claims in these excerpts, not fill gaps from its memory.

`openrouter/free` remains the default. Provider failures can still occur; diagnostics now
distinguish absent choices, empty text with finish/reasoning/refusal metadata, and
provider errors returned inside HTTP 200 responses. No raw reasoning is logged.

## Permanent articles and returning readers

Published editorial content is retained forever. Every article has a stable readable
URL and a real HTML page under `/openfeed/p/<slug>/`, with article-specific sharing
metadata. The feed and archive load batches incrementally; initial navigation never
requires the entire archive. The build emits indexes with at most 50 batch refs each.

Browse topics from a visible left sidebar on desktop or a horizontally scrollable
button bar on smaller screens. In-app article navigation preserves the feed, filters
and scroll position on Back. Newly published posts load when you choose to show them.
There are no saved-article or manual read-tracking controls.

`pnpm build` runs Vite and the static archive builder. `pnpm archive:backfill` is an
idempotent, validated migration for existing posts that lack stored slugs or source
coverage history. It preserves original publication dates. New publication stores
slugs automatically. Source coverage is durable; model prompt summaries stay bounded.

The evergreen shelf is finite (currently 18 reviewed publisher pages) alongside
recurring RSS. Intake logs remaining unconsumed shelf entries; replenish culture and
background reading as needed. Ten is a quality-dependent target, not a filler quota.

Pull requests run typecheck, lint, tests and the full static build without deploying.
Main pushes and manual Deploy dispatches publish GitHub Pages as before.

See [the research and architecture decisions](docs/reading-roadmap.md) for capacity
estimates, review thresholds and the post-merge reading trial.
