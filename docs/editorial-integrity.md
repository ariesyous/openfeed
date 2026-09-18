# Editorial integrity: source context and support audits

Implementation for [#36](https://github.com/ariesyous/openfeed/issues/36), incorporating the voice guard and three reviewed process-commentary edits from [#34](https://github.com/ariesyous/openfeed/pull/34). This improves source context and makes accepted evidence inspectable. It is not an automated factual judge. Subsequent normal editions still need the observation described below.

## Evidence contract

`generator/editorial/evergreen.ts` extracts one coherent prose section from a recognized article container. Headings, sections, related items and teaser modules create boundaries. Navigation, captions and other page furniture are excluded. NASA `type-topic` hubs admit only direct WordPress prose paragraphs, so a general Comets introduction is not joined to separately linked 41P and 3I/ATLAS features. Formatting whitespace does not split neighboring paragraphs.

The existing 1 MB fetch limit, 20-second timeout and 6,000-character excerpt cap remain. The excerpt ends at a complete paragraph. Evergreen intake still requires 300 characters; unavailable, unrecognized or undersized text is skipped. No new pages are fetched and no dependency was added; the existing XML parser is used with entity processing disabled and DTDs rejected. This is a conservative adapter for the reviewed shelf, not a general HTML readability service.

`generator/editorial/evidence.ts` still offers at most 16 sources, 12 evidence IDs per source, and 25 words/300 characters per quotation. It preserves sentence and paragraph boundaries, including short caveats. A long sentence is split into ordered parts; the complete group must fit under the 12-ID cap. Request metadata identifies paragraph, context group, part/count and whether later text was omitted. These fields consume additional input tokens. They do not enlarge the output quota or authorize inference about omitted material.

The prompt asks for an internal review of entity identity, relationships, numbers, units and qualifiers in both the post and discussion. Selecting an ID proves only that the quotation came from an allowed source. The validator now checks **every** selected quotation, fixing a gap where only the first quotation for each parent source was checked. Existing freshness, source, publisher, cross-chunk and publication gates remain in force. The focused voice guard rejects recognizable narration about generator inputs while allowing attribution, supported uncertainty and interpretation.

Live HTML spot checks on September 18, 2026 retained coherent text from Comets (458 characters), Black Holes (656), Asteroids (492), Exoplanets (812), Socrates (1,830), Plato (2,964) and the Met's Greek Gods page (4,199). Titan and Dark Matter hubs returned no eligible prose and were skipped. BFI and World History Encyclopedia fetches returned 403 in this check, so their current layouts were not freshly confirmed. This is a limited extraction check, not a complete source-availability or generated-quality evaluation.

## Inspecting selected support

The generation workflow sets `EDITORIAL_AUDIT_DIR=artifacts`. Successful nonempty candidates create `artifacts/editorial-audit.json`, uploaded as `editorial-support-<Actions run ID>-<attempt>` before the publication commit. Local runs omit the file unless this environment variable is set. Audit paths inside public/build directories, including symlink aliases, are rejected; `artifacts/` is ignored by Git.

The bounded record contains:

- Accepted post IDs and each body's selected evidence IDs; discussion turn indexes, voices and their selected IDs.
- The selected quotation text and its source ID, URL, title, publisher, retrieval time, known publication time and evergreen flag.
- Per-chunk `requestedModel` and provider-reported `resolvedModel`; the latter is `null` if missing or only a routing alias. Evidence IDs such as `S1E1` are local to their chunk, not globally unique.

It does not contain complete fetched articles, unselected evidence, prompts, raw completions or reasoning. Normal quotation whitespace is preserved exactly. Exact supplied credentials and recognizable token strings are redacted; `redactionsApplied` identifies altered records. Public-repository artifacts are **not confidential**. A selected-support record helps check a claim but is not a replay of the complete original request.

`validated_candidate` means the candidate support was saved before the validated publisher ran. `data_written` means local public-data writes completed. Neither status means a Git push or Pages deployment succeeded. Audit persistence failures stop the workflow before commit; artifact upload failure also blocks commit/deployment. A failed publisher can leave a candidate-only artifact for diagnosis. No-op runs clear stale local audit files and produce no new record.

Limits are eight accepted chunks, twenty posts and **512 KiB per JSON file**, with schema bounds on all retained fields. Oversized support fails instead of silently discarding evidence. The workflow requests **14-day retention**, independently of permanent post retention; repository retention settings may further constrain artifact availability. Download support needed for an ongoing investigation before it expires. See [GitHub's artifact documentation](https://docs.github.com/en/actions/tutorials/store-and-share-data).

Measured offline examples were 1,980 bytes for one post and 33,223 bytes for twenty posts/five chunks. These synthetic examples used one source, three distinct 126-character quotes and two discussion turns per post, plus source/model metadata; they are not live-run averages. At hourly success, retaining that twenty-post example for fourteen days would be about 10.6 MiB of uncompressed JSON; the hard cap implies at most 168 MiB for 336 such scheduled runs. Manual runs add artifacts. Compression and GitHub storage accounting differ from these estimates.

No extra model calls are introduced. The twenty-post target, four-post request cap, eight-attempt limit, 45-minute generation deadline, hourly schedule and `openrouter/free` default are unchanged. Parsing and artifact transfer add work; live runtime has not been measured. The stricter extraction can reduce eligible material and useful output, which must be assessed separately from provider reliability. Audit and benchmark code stays outside browser bundles.

## Benchmark and reviewed corrections

Run the offline diagnostic without providers, source fetches or publication:

```sh
pnpm editorial:benchmark
```

`generator/editorial/integrityBenchmark.ts` contains twelve reviewed examples: wrong and supported versions of the four verified factual errors, process leakage, a fabricated second quotation, supported uncertainty and useful commentary. The short rechecked source passages are evaluation fixtures, not saved historical prompts. Each example has a human editorial expectation; the command separately reports what deterministic gates actually do.

**Four semantically wrong examples currently pass provenance checks.** The benchmark intentionally exposes that gap rather than reporting a misleading factual-accuracy score. Voice and fabricated-quotation cases fail deterministically; supported examples remain allowed. Changes to this benchmark should preserve the distinction between expected editorial judgment and automated enforcement.

The comet, lunar crater, family relationship and Curiosity discussion corrections are documented in [the correction record](editorial-corrections-20260918.md). Their guarded migration uses `buildPublishPlan`/`writePublishPlan`, preserves article IDs/slugs/dates and all unrelated content, and does no writes on a second run. The three #34 edits remain intact. No historical editions were regenerated.

## Validation and completion gate

Local validation passed: typecheck, lint, 192 tests across 24 files, and production/archive build. The build retains 226 permanent articles and 11 topic pages; output is 2.14 MiB. Regression coverage includes mixed modules, whitespace boundaries, short caveats, long-sentence limits, secret redaction, unknown model metadata, chunk mappings, partial success, audit write failures and correction preservation/idempotence. No live model generation was used for this implementation.

Keep #36 open after implementation until twenty posts across at least five subsequent normal editions have been source-checked, including discussion and two culture topics. For each sampled post, record edition/post ID, artifact/run link, resolved model if known, each material factual claim's support, any entity/relationship/quantity/qualification error, and whether the post was independently worth reading. Record newly discovered errors separately from the fixture results. Also compare eligible source count, accepted/useful posts, attempts and run time; fewer accepted posts alone does not prove worse quality.

If serious errors persist, narrow source eligibility before considering a bounded semantic-review experiment. If an adapter repeatedly returns mixed or boilerplate text, exclude it; do not weaken extraction to fill a quota. Revisit a voice heuristic that routinely rejects supported interpretation. Editorial depth/discussion salvage (#37) and Cards (#25) remain separate work packages.

## WP2 follow-up

[Editorial depth and discussion isolation](editorial-depth.md) builds on this contract.
Accepted audit posts can now include the optional fixed `discussionOmission` reason. The
selection passed to the audit builder contains only surviving discussion; omitted-only
IDs are excluded. Article and cross-chunk gates, conservative spoiler flags, artifact
retention and the validated public-data writer remain unchanged. See that document for
the thirteen-page source pilot and separate still-open #36/#37 observation requirements.
