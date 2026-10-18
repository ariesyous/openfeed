# Source based review before publication

New editorial posts now need a separate model review after deterministic evidence
validation and before entering the accepted edition. The reviewer examines the title,
body and every discussion turn against their selected evidence and bounded source
context. It checks reversed meaning, unsupported empirical claims, missing scope,
misattribution and discussion that contributes nothing beyond repetition.

The reviewer explicitly allows opinions, conditional interpretations, disagreement,
metaphors and jokes with supported premises. A source need not express the generated
opinion. The review cannot rewrite prose: it either approves a complete post or
withholds it. Approved neighbors retain their exact discussion and spoiler setting.
Rejected sources are deferred only within this run and are not marked covered.
No historical articles are regenerated or corrected by this gate.

## Request and acceptance contract

`review.ts` builds a separate request with the candidate's text, selected IDs and only
its attached sources. The same prepared source packet supplies ordered reading context
and numbered evidence; there are no additional fetches. Context can invalidate an angle
but cannot license a factual claim absent from that unit's selected support. The
reviewer uses the configured model in a separate call. This is a second assessment,
not an independent model or independent verification of publisher reporting.

Every post and unit must have exactly one decision. Unknown or duplicate targets,
missing turns, cross-source IDs, unsupported passing IDs and rejection claims that are
not exact substrings fail local validation. Each rejection includes a fixed reason,
a maximum 200-character claim fragment and a maximum 400-character explanation.
Passing judgments also explain their basis. A strict JSON response schema and plain
JSON fallback use the same validation. A malformed review never counts as approval.

Live reviews additionally return a bounded title-attribution trace: the exact title,
its actor as an exact title span, the source actor as an exact selected-evidence span,
the evidence ID and a relationship judgment. A mismatch must reject the title for
misattribution. Replacing the title's subject in the explanation cannot validate an
invented title-actor span. Aligned claims require both actors; clearly editorial
interpretations can cite a premise without pretending to quote a speaker. Titles
without an attributed claim use explicit null actor fields. Actor identification
and the relationship judgment remain model decisions, not a grammatical fact checker.
Older audits without the trace remain readable; new live responses cannot omit it.

Live checks also require a complete-text `segments` ledger. Contiguous copied spans,
joined in order, must reproduce the entire unit (whitespace normalization only).
Each span is a supported fact, unsupported fact or opinion, with a bounded explanation.
Every supported fact requires IDs from that unit's own selection. All citations on
a passing check must also be selected by that unit; one valid citation can no longer
cover for other borrowed IDs. Each unit receives its selected quotation texts directly.
Unselected source context remains available only to contradict or qualify a claim.
Any unsupported factual span requires rejection of the whole post. Pure opinions can
have no segment citation, while the unit still identifies its selected factual premise.
The model must separate factual clauses from jokes; this classification and semantic
entailment remain fallible. Complete text accounting is not proof of correct judgment.
Older audits can omit segments. Current reviews cannot.

One rejected unit withholds the whole parent and its exchange. Survivors pass the
existing cross-chunk validator again before enrichment and the sole validated
publisher. A review timeout, malformed result or provider failure cannot release its
pending candidate. Previously reviewed accepted chunks can survive a later provider
failure. Audit persistence failure aborts publication instead of silently losing records.

## Shared cost and time limits

Writer and reviewer calls share eight total provider attempts and the existing
45-minute deadline. Starting a writer request reserves at least one attempt for review;
each review gets at most two remaining attempts, including schema fallback or retries.
A run with only one attempt remaining does not start another candidate. Empty writer
responses require no review. There is no separate unlimited review or rewrite budget.
Eight posts remains a ceiling rather than a target. Review can yield an empty edition,
which preserves existing content and durable coverage state.

Ordinary writer requests now ask for at most two posts, so their detailed reviews also
have at most two candidates. This follows two live runs with valid writer output but
two empty, length-limited reviewer completions each. The transport/historical schema
still supports up to four. Four flawless writer/review pairs can reach eight posts;
retries reduce that achievable count. Model, token limit, source context, total attempt
budget and deadline remain unchanged. This is a latency/reliability mitigation to
observe, not proof that smaller batches resolve provider failures.

## Inspecting review decisions

When `EDITORIAL_AUDIT_DIR` is set, `editorial-review.json` persists each completed
review immediately, including all-rejected runs. It holds bounded selected support,
candidate titles and SHA-256 digests, decisions, and requested/resolved reviewer model
identities. Digests cover the title, body, evidence IDs and discussion actually reviewed.
The new claim ledger copies candidate prose into bounded parsed spans, so a rejected
candidate's text can now be reconstructed from its review. This is intentional claim
coverage, not raw completion storage. Each unit has at most 32 spans, each at most
1,800 characters with a 240-character explanation; full-unit coverage limits their
combined text to the actual candidate. No full reading context,
reasoning, prompts or credentials are retained. An individual source passage referenced
only to explain a contradiction may not be in the selected-support snapshot; retrieve
that publisher page when assessing the judgment. This is not a full request replay.

Accepted support chunks additionally record reviewer model identities and the approved
candidate digests, in accepted-post order. Historical support without these optional
fields remains readable. The review file is separately limited to 512 KiB and eight
four-post records, outside public/build paths. Both audit files are uploaded by the
existing Actions artifact step with fourteen-day retention before the publication
commit. Reviews do not establish that public writes, a push or deployment succeeded.

## Verification and limits

The focused tests exercise whole-post rejection for the observed reversal and unsupported
absolute, approval without rewriting banter, required complete coverage, source isolation,
structured-output fallback, exhausted budgets/deadlines, partial success, audit persistence
failure and credential redaction. These use mocked judgments; they demonstrate gate
behavior, not a model's ability to recognize arbitrary factual errors. Existing writer
tests mock approval to isolate their earlier provenance/retry contracts; the new review
suite exercises actual separate reviewer requests through the provider wrapper.

The manually dispatched `Check editorial reviewer` workflow runs one bounded live
check against reversal, unsupported absolutes and title-attribution errors, alongside
corrected counterparts and editorial titles with opinion and metaphor. A third suite
tests facts supplied only by another turn or unselected source text, then the same
prose with the required IDs selected. Three four-post suites use DeepSeek Flash,
at most six calls and a shared 15-minute request deadline. The 96-KiB bounded result
never includes raw completions; the check never fetches sources or writes public content/state. This optional
manual check is separate from each ordinary edition's shared budget. Its small,
prompt-aligned controls demonstrate targeted behavior, not general accuracy.

Live review remains necessary. Measure false negatives and false positives, retained
banter, publication counts, source availability, call counts and latency. Do not describe
an approved post as automatically fact-checked or treat fewer published posts as proof
of improved quality. The same model can repeat its writer's mistake, and a reviewer
can be too literal about a joke. Ordinary-run observation cohorts remain separate
from manual validation runs.

## Evidence-label correction

The voice guard rejects square-bracket source references such as `[S3E6]` and
`[S3E7, S3E8]` through the existing retry path; it never silently strips fresh prose.
Plain and parenthesized TV season/episode notation remains supported. Three already
published bodies in batch `20261018T172715Z-7712` are corrected by
`scripts/correctEvidenceLabels.ts` using exact before/after snapshots and the existing
guarded publisher. Only those labels are removed. Words, discussions, IDs, slugs,
dates, sources and publication catalog are preserved; the original audit stays frozen.
