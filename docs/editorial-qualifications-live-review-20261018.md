# Qualification and discussion review — October 18, 2026

**The exchanges contribute more distinct points, but factual qualification remains
unreliable.** This two-post edition has one discussion turn that reverses its source
and another that turns a plausible access concern into an unsupported absolute.
I would correct the child-safety post and revise the charity post. Neither is ready
to retain unchanged. These are editorial dispositions, not an accuracy percentage.

## Execution and verification

Implementation `7939c85` and regression follow-up `3997d1c` added bounded ordered
reading context, up to six body evidence IDs, a two-turn default and a conservative
near-copy retry guard. [Code deployment](https://github.com/ariesyous/openfeed/actions/runs/39099522018)
passed the complete Linux checks and deployed successfully. Locally, typecheck, lint
and build passed; tests had 298 passes and seven existing Windows-specific failures.

[Manual generation 39099607441](https://github.com/ariesyous/openfeed/actions/runs/39099607441)
checked out `3997d1c`. Requested and resolved model were both
`deepseek/deepseek-v4.1-flash`, the same as the preceding reviewed run. It started
at 1:10 a.m. Eastern on October 18 and published batch `20261018T051009Z-4d71`
in commit `6917f1e`. [Edition deployment](https://github.com/ariesyous/openfeed/actions/runs/39099788711)
succeeded. Both live static articles return HTTP 200 and contain every discussion
turn; the deployed batch matches the frozen local edition. At the resumed check,
newer scheduled editions had already moved the live manifest forward to
`20261018T155406Z-ea87`. Those later editions are outside this review.

The generation phase took 166 seconds and one of eight attempts: two draft objects,
two accepted posts, five turns, zero rejected responses, provider failures, empty
selections or discussion omissions. Intake had 21 unused feed candidates, selected
five for context and accepted three, all in the BBC publisher group. Nine unconsumed
evergreen entries yielded no usable pages. The run stopped for insufficient unused
evidence or publisher diversity; the BBC two-source limit constrained publication.
Two posts is not evidence that the model rejected six other posts on quality grounds.

Both bodies used all six permitted evidence IDs. All 17 selected support snippets
matched the retrieved source text. The near-copy guard did not reject a response.
Neither fact establishes semantic correctness or shows that the guard caused the
observed improvement. Reading context was available, but was not copied into public
data or the bounded selected-support audit.

## Review of both posts

### Child safety: correct the final turn

The body retains the important population restriction: these are platforms named
in Childline counselling, not a ranking of every child's exposure. It attributes
the criticism of the proposed ban to Simmons-Read and the safety concerns to Roome.
It should also introduce Simmons-Read's role and make the policy jurisdiction
explicit. The first turn preserves Roome's claim as her opinion and builds a
conditional argument from it. The second adds the useful question of continuing
detection work, with a memorable ribbon-cutting joke, although describing a ban as
announced once underplays its continuing enforcement.

The third turn says children expect friendliness rather than nastiness at the
start. The source describes the opposite expectation: children may expect a
dangerous person to appear nasty immediately, leaving them less alert to friendly
grooming. The generated interpretation rests on that reversal. This contradicts
its own selected IDs `S1E21–S1E22`; it is not a qualification lost beyond the snippet
cap. [BBC source](https://www.bbc.co.uk/news/articles/cq33xd6j1dv5o).

### Guernsey charity: keep the argument, qualify its premises

The concrete grant inventory, shift toward individual families, attributed
cost-of-living explanation and professional referral process give the body a
useful reading payoff. Calling individual grants a judgment rather than a programme
adds an unnecessary false contrast.

The two voices genuinely engage: professional knowledge can help identify need,
but dependence on professional contact may leave gaps. The first turn invents a
comparison with burdensome forms and presents efficiency too confidently. The
second says a disconnected household has no route in at all. The article describes
professional referrals; it does not establish that such households cannot seek a
referral or that every possible access route has been ruled out. Phrase this as a
risk of missing families, and keep the disagreement and concrete image of bare
floors. [BBC source](https://www.bbc.co.uk/news/articles/c615jnxv7n45o).

## What improved and what remains

The preceding six-post edition had 19 turns, or 3.17 per post; this edition has
2.5 per post. Bodies total 262 words and discussions 235, compared with 667 and
809 previously. Average turn length actually rose from about 43 to 47 words.
The useful change is fewer, more distinct moves, not uniformly shorter writing.
Different sources and a sample of two prevent a causal quality claim.

More context and citation capacity address missing qualifications, but cannot
ensure the model reads a qualification correctly. The next meaningful safeguard
to evaluate is a separate semantic editorial check for reversed meaning,
attribution and unsupported absolutes, alongside turn contribution. That check
is not implemented or validated by this work. Another prompt rule alone would not
demonstrate that these failures are fixed. Banter should remain; its factual
premises need scrutiny.

## Retained review evidence

The [claim ledger](fixtures/editorial-qualifications-review-20261018.json) records
body claims and all five turns against the [frozen edition](fixtures/editorial-qualifications-edition-20261018.json)
and [selected-support audit](fixtures/editorial-qualifications-support-20261018.json).
The original audit artifact is `12125558125`, named
`editorial-support-39099607441-1`, with expiry November 1, 2026 at 05:12:59 UTC.
The ledger retains its SHA-256 and source retrieval hashes. Full fetched pages
remain in ignored local artifacts; no full reading context or raw model completion
is committed. The review compares claims with publisher reporting, not independent
verification of each underlying event.

No published prose or historical editions were rewritten. This manual run does
not advance the ordinary-run observation counts for #36 or #37.
