# Editorial depth and independent optional discussion

Implementation for [#37](https://github.com/ariesyous/openfeed/issues/37), based on the
[research in #35](https://github.com/ariesyous/openfeed/pull/35). Baseline is
`c5fd886383be0c7eeacafc98ab2d6d3cd26d8ddd`, the merge of #38; its production Deploy
[35396233621](https://github.com/ariesyous/openfeed/actions/runs/35396233621) succeeded.
The #34 voice guard is already incorporated. This work does not repeat its detector,
change historical posts, implement Cards #25, or complete either observation gate.

## Validation path and decisions

1. Structured requests still advertise the full strict schema, current evidence-ID enum
   and at most four posts. Unsupported structured output consumes an attempt and falls
   back through the same local validator. JSON must parse; the existing whole-response
   code-fence handling is unchanged. No JSON/ID repair is attempted.
2. The local envelope requires ordinary parent fields plus a named `discussion` array
   or null. Unknown envelope/parent keys, missing required fields and object/string
   discussion shapes reject the response. There is no guessing at nested `turns`, renamed
   fields or ambiguous article boundaries.
3. Resolve parent IDs and run the unchanged `validateDraft` on **all parents without
   discussion**. Evidence provenance, voice, URLs, freshness, duplicate source use and
   publisher limits must pass. An invalid parent still rejects the request; valid siblings
   are not rescued by a new per-field/per-post salvage system.
4. Validate each non-null discussion independently, including its 2–4-turn schema,
   every evidence ID, parent-source restriction, exact quotations, URL and voice checks.
   Reuse `validateDraft` for the supported parent plus discussion rather than duplicating
   its gates. A failing block is omitted in full; no individual turn or sentence is fixed.
   Unknown IDs never gain support. Valid interpretations, jokes and uncertainty still pass.
5. The retained response must then pass remaining-request count, article-title duplication
   and combined cross-chunk `validateDraft` checks. A proposed omission from a rejected
   response is neither counted nor audited as an accepted omission. Retries use the existing
   edition-wide attempt/time budget. Later failure preserves previously accepted chunks.
6. Only the sanitized accepted selection reaches `buildAuditChunk`. Discussion-only IDs
   disappear when discussion is omitted; body support and retained discussion stay intact.
   A bounded optional `discussionOmission` reason is attached to the audit post. The schema
   rejects a record claiming both an omission and retained discussion support.
7. `enrichEditorial` validates again. The original spoiler flag remains, even if only the
   removed discussion needed it; removing discussion never ungates the parent. The unchanged
   `buildPublishPlan`/`writePublishPlan` remain the public-data writer. No diagnostics or
   evidence IDs enter public articles. Audit persistence/upload requirements remain intact.

Omission reasons are `schema`, `unknown_evidence`, or `support_or_voice`; the last includes
cross-source/quotation/URL failures. These fixed categories intentionally avoid storing
untrusted completion text or IDs. Attempt logs identify the accepted edition-relative post
index. Audits map the reason to its stable post ID. Null means deliberately absent, not an
omission. Empty/one-turn/oversized arrays are invalid optional blocks and are omitted.

Diagnostics distinguish:

| Field | Meaning |
| --- | --- |
| `generatedDrafts` | Count of identifiable post objects in parsed JSON responses, including rejected drafts and repeats on retries; not unique stories. Malformed JSON or ambiguous non-object entries have no measurable draft count. |
| `actual` | Validator-accepted candidate articles; the later writer/commit/deploy determine publication. |
| `discussionOmissions` | Whole blocks omitted from accepted chunks only, at most one per accepted article. |
| `providerFailures` | Provider/transport failures, including structured-output incompatibility; separate from omissions. |
| `rejectedResponses` | Invalid JSON or article/edition validation failures. |
| `emptySelections` | Valid empty responses, still charged to the same attempt budget. |

Existing failure logs remain authoritative if a run fails before an edition summary.
No new raw-response archive is created. The old `DEBUG_RAW_CONTENT` completion dump is
removed; attempt logs and the Actions model summary share credential redaction and bounds.
Audit schema version 1 remains backward readable: the reason is optional; old records have
no omission information. The strict old reader will need the updated schema for new records.

## Source pilot: actual extraction, not a reading-list endorsement

Thirteen coherent pages were retrieved with `readBounded`, passed through the unchanged
`articleExcerpt`, and inspected **after** `prepareEvidence` numbered them. The review checked
potential title payoff against 1–3 actually offered IDs per page, including split-sentence
continuations. It is a source/editorial pilot, not thirteen generated or accepted posts.

The [review snapshot](fixtures/editorial-source-pilot.json) contains URLs, retrieval times,
excerpt hashes/lengths, offered counts, selected short supporting spans with context markers,
potential titles, human payoff judgments and explicit boundaries. No full HTML/articles are
committed. `S1` is page-local in this single-page review; live request IDs vary with selection.
The snapshot's quotes preserve extraction exactly, including existing encoded entities.

| Page | Supported payoff | Shelf action |
| --- | --- | --- |
| [Theater in Ancient Greece](https://www.metmuseum.org/essays/theater-in-ancient-greece) | Rebuilding complicates inference about early theatrical spaces. | Add |
| [Greek Gods and Religious Practices](https://www.metmuseum.org/essays/greek-gods-and-religious-practices) | Athena combines armour with weaving/carpentry patronage. | Existing, rechecked |
| [Death, Burial, and the Afterlife](https://www.metmuseum.org/essays/death-burial-and-the-afterlife-in-ancient-greece) | Achilles prefers humble life to rule over the dead in the Odyssey. | Add |
| [Mystery Cults](https://www.metmuseum.org/essays/mystery-cults-in-the-greek-and-roman-world) | Ritual, afterlife hopes and social bonds; preserve variation. | Add |
| [TV's a crowd](https://www.bfi.org.uk/sight-and-sound/features/tvs-crowd) | A critic's tension between sympathy and repugnance in television protagonists. | Covered; review only |
| [The Paradox of Suspense](https://plato.stanford.edu/entries/paradox-suspense/) | One attributed account combines fear, hope and uncertainty. | Add |
| [Philosophy of Humor](https://plato.stanford.edu/entries/humor/) | A narrow historical distinction between the word's current use and older laughter/comedy discussions. | Add |
| [Fiction](https://plato.stanford.edu/entries/fiction/) | Different appraisal of factual departures, illustrated by historical novels. | Add |
| [Public Goods](https://plato.stanford.edu/entries/public-goods/) | Rice versus music makes non-rivalry concrete. | Add |
| [Aristotle: Ethics](https://iep.utm.edu/aristotle-ethics/) | An attributed challenge to translating virtue as passive habit. | Covered; review only |
| [Roman Sarcophagi](https://www.metmuseum.org/essays/roman-sarcophagi) | A banquet-couch lid and its cultural inspiration. | Add |
| [Roman Copies of Greek Statues](https://www.metmuseum.org/essays/roman-copies-of-greek-statues) | Material strength explains tree-trunk supports on marble copies. | Add |
| [The Many Saints of Newark](https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos) | A critic sees the prequel's strength in distance from its parent. | Covered; review only |

Nine additions expand the fixed shelf from 50 to 59. Covered URLs remain covered. Nine
other candidates were excluded from this pilot: guessed Dionysos/Roman Religion/Greek
vase essay URLs and SEP Horror returned 404; IEP Aesthetic Distance failed retrieval;
World History Encyclopedia Persephone produced no recognized prose; SEP Definition of Art
produced prose but no eligible evidence under the complete-group cap. SEP Imagination's
opening was abstract and weak for this pilot. SEP Moral Luck omitted the displayed Control
Principle between paragraphs: it cannot support a full explanation of that principle.
No adapters, extraction bounds or date rules were weakened to admit these candidates.

A bounded recheck is available; it fetches only the thirteen reviewed fixed URLs and writes
no data, prompts or completions. It exits nonzero on unavailable or changed support, requiring
human review; this is not a semantic judge or a required network-dependent CI check.

```sh
node --import tsx scripts/reviewEditorialSources.ts         # offline description
node --import tsx scripts/reviewEditorialSources.ts --live  # optional public-page retrieval
```

The prompt now chooses by a concrete supported payoff, requires titles to deliver their
promise, and defaults discussion to null unless it adds a supported perspective. It removes
soft length targets and the suggested half-and-half/three-interest targets. Existing formats,
voice freedom and spoiler instructions remain. Selection examples are explicitly conditional
on supplied evidence; they are not facts the model may import into unrelated posts.

Tradeoffs: nine extra one-time shelf fetches, each still limited to 1 MB/20 seconds; no broad
crawler. The shelf is finite. Additions concentrate on two already represented publishers,
so their shared two-source allowances still constrain each edition. BFI availability has
varied across checks, and the Sopranos pages are already covered. More shelf pages do not
promise more posts or repair that topic's recurring supply. The sixteen-source/twelve-ID
input caps are unchanged; richer excerpts can occupy more of the existing allowance and
displace other candidates. The prompt is somewhat larger. Fewer forced turns may reduce
output tokens/retries, but neither that benefit nor improved reader value is measured yet.

## Fixed evaluation protocol (requirements remain open)

Use the three latest ordinary scheduled `openrouter/free` baseline runs recorded in #35:
[35330968341](https://github.com/ariesyous/openfeed/actions/runs/35330968341),
[35356489904](https://github.com/ariesyous/openfeed/actions/runs/35356489904), and
[35380122228](https://github.com/ariesyous/openfeed/actions/runs/35380122228).
They published 29 posts against 60 targeted in 23 attempts and 103m09s job time. Two of
four validation failures involved optional discussion; nine provider/empty-completion
failures show that isolation cannot solve overall reliability. These runs predate #38;
no subsequent ordinary run was present in the inspected latest-ten run listing. Their
historical input packets cannot be reconstructed as if audit artifacts had existed.

Freeze baseline articles at the commit above, which includes #38's four factual corrections.
Flag corrected articles as manual interventions and report them separately in any generated-
quality comparison. The sampling positions are zero-based
`floor(k * (n - 1) / 3)` for k=0..3, unique, or all articles for n<4. Keep stored batch order.
Do not replace weak pieces with more interesting choices. This yields twelve baseline
articles; the [worksheet](editorial-depth-baseline.md) records exact IDs and preparatory
unblinded reading notes. Their factual support is not newly certified by this implementation.

After deployment, take the **first ten ordinary scheduled free-router runs** on this change
(or a clearly documented compatible successor). Include failures and no-ops; exclude manual
runs and other models. Do not dispatch experiments or wait for those runs in this PR.
Apply the same sampling rule to each nonempty edition. Report run count, accepted population,
actual sample size, missing artifacts and model identities; do not silently substitute runs.

For the actual comparative review, pool baseline/subsequent sampled articles, replace visible
IDs with opaque labels and order by SHA-256 of `openfeed-wp2-v1:` plus post ID. Hide cohort,
model, dates and source links during the initial reading, then reveal sources/audits for the
support check. This is reviewer blinding, not random assignment. The baseline and subsequent
windows have different source availability and #38 safeguards; report those confounders.

Record for each post:

- Title payoff: 0 absent, 1 partial, 2 delivered by a specific detail, consequence or idea.
- Memorable substance: 0 headline restatement, 1 useful brief/detail, 2 a clear mechanism,
  story, cultural distinction or attributed interpretive disagreement. Short can score 2.
- Factual support: supported / unsupported / unresolved for **each material claim**, including
  discussion; record evidence IDs and qualifications. Missing audit means unavailable evidence,
  not automatically false or supported. Check the linked original where accessible.
- Commentary: absent / adds perspective / redundant / unsupported. Process complaints are
  defects. Do not penalize an absent discussion or reward number of turns.
- Worthwhile: manual yes/no/unresolved. A yes requires delivered payoff, at least one useful
  detail, supported material claims and no misleading/redundant filler. Record a one-line reason.
- Event/angle: compare each sampled post's event/claim with all titles and relevant bodies in
  its own and previous two ordinary editions. Mark distinct, useful update, or repeated angle;
  record the related IDs. This remains a small manual review, not semantic deduplication.

Keep **generated JSON drafts**, validator-accepted candidates, writer-confirmed published posts
and manually judged supported/worthwhile sampled posts in separate columns. Do not infer draft
counts from malformed completions or turn omissions, or extrapolate a total worthwhile yield
from this small systematic sample. Log attempts, provider failures, omissions by reason,
source availability and elapsed time alongside those counts. Discussion savings are a hypothesis,
not the number of omitted blocks: counterfactual retry costs are unknown.

Keep #36 open for twenty source-checked posts across at least five subsequent normal editions,
including discussion and two culture topics. Its sample may overlap this review, but supplement
culture/discussion deliberately if necessary and label those additional selections separately.
Keep #37 open through at least ten ordinary runs and the comparative editorial/event-angle
review. No completion or satisfaction claim follows from this PR's fixtures, thirteen source
reviews, publication count or session duration. If richer prose produces padding, factual errors
or unreadable Cards, prefer narrower claims and better source selection. If isolation saves
little, do not expand it into generic salvage. Physical Cards verification remains #25.

## Local verification

### September 19 scheduled continuation

The [bounded scheduled review](scheduled-review-culture-20260919.md) advances the ordinary
cohort to **1/10 runs** at its fixed cutoff, with four fixed sampled articles and two
unblinded supplements. It does not establish an improvement or omission-path savings.
Actual checkout preceded #43. The frozen baseline, imperfect baseline blinding, per-claim
findings and repeated AgentCore angle are recorded. A [12-page source pass](culture-source-review-20260919.md)
adds four complete narrow-payoff packets; resulting generated quality remains unobserved.

### Post-42 early observation

#39 and #42 are merged. The [manual follow-up](post42-live-review-20260918.md) inspected
all twenty posts and 27 discussion turns from run 35405624271. It used
`deepseek/deepseek-v4.1-flash`, not the scheduled free router, and contributes zero of
the ten required ordinary runs. It shows useful concrete explanations and zero observed
evidence-ID leaks, but also semantic errors despite valid provenance. There were zero
automatic discussion omissions, so live retry savings are unproven. Ten reviewed content
corrections and focused prompt/benchmark additions are documented separately from observed
generated quality. The fixed evaluation protocol and open #36/#37 requirements stand.

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` passed: 212 tests in 25 files;
226 permanent articles and eleven topic pages remain in the production archive build.
Tests exercise structured/fallback handling, whole-block omissions, strict parents, unknown/
cross-source support, voice, publisher/cross-chunk gates, spoiler flags, sanitized audit IDs,
redacted omission/model diagnostics, the validated writer, malformed JSON, partial success,
and exhausted attempts/deadlines. Existing jsdom scrollTo and local pnpm configuration warnings
remain. No model generation, merge, deployment, secret change or historical rewrite was performed.

## Movie and Sopranos source replenishment — September 19

The [bounded twelve-page review](movie-sopranos-source-review-20260919.md) adds three movie
packets and one Sopranos character-analysis packet (63 → 67 shelf URLs). A narrow ASC
single-story body selector fixes a reproduced layout mismatch without joining sections
or changing evidence limits. Offline packet/provenance checks and local retrieval do not
advance either issue’s historical scheduled-observation counts or establish generated quality.
