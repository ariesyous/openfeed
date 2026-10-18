# First richer-context edition — October 18, 2026

**The new edition is more engaging, and the discussions are a real improvement. It is
still uneven as finished editorial writing.** I would keep the Jimmy Stewart and
creativity posts substantially as published and revise the other four. This is an
editorial judgment, not a factual-accuracy score. The Bettany post has the strongest
exchange despite needing a tighter body. The remaining problem is selection and
qualification inside a richer packet, rather than simply lack of source text.

## Execution and scope

Generator changes landed as `0c5af0d`, after preserving the intervening published
editions. [Code deployment 39098121521](https://github.com/ariesyous/openfeed/actions/runs/39098121521)
passed typecheck, lint, the complete Linux test suite and build.
[Manual generation 39098215670](https://github.com/ariesyous/openfeed/actions/runs/39098215670)
used `deepseek/deepseek-v4.1-flash`, matching the requested and resolved model in the
earlier audit. It published commit `954232c`, batch `20261018T044607Z-39d1`.
[Edition deployment 39098708103](https://github.com/ariesyous/openfeed/actions/runs/39098708103)
succeeded. The deployed manifest and batch were checked, and the static Stewart article
contained all three labelled AI turns after HTML entity decoding.

Generation started at 12:46 a.m. Eastern on October 18. Its generation phase took
485 seconds, using five of eight attempts. The first two returned empty content with
`finish=length` and reasoning present; three subsequent responses succeeded. There
were six identifiable draft objects, zero validation rejections and zero discussion
omissions. No raw reasoning or completions were inspected or retained.

Intake had 27 unused feed candidates, selected nine for context and accepted seven.
The nine unconsumed evergreen shelf entries yielded no usable pages. Six posts were
published; the run stopped for insufficient unused evidence or publisher diversity,
not an explicit editorial rejection of two posts to meet a quality threshold. Fewer
posts is observed, but this run cannot attribute that solely to the new ceiling.

I reviewed all six bodies and 19 discussion turns, the selected-support artifact,
and all six publisher pages retrieved through ordinary public requests. All 23 selected
support snippets matched the current extracted source text. That establishes provenance
and source agreement, not independent verification of every real-world event.
The Psyche video itself was not watched; its description supports the two named prompts.

## Comparison with the earlier audit

| Measure | Earlier audited edition | New edition |
| --- | ---: | ---: |
| Published posts | 10 | 6 |
| Posts with an AI discussion | 5 | 6 |
| Discussion turns | 11 | 19 |
| Keep substantially as published | 2 | 2 |
| Revise / correct in that review | 6 / 2 | 4 / 0 |
| Provider attempts | 8 | 5 |
| Generation time | 169 seconds | 485 seconds |

These are two unblinded, different-source editions, not a controlled comparison or an
accuracy percentage. The new run is manual, not another scheduled observation. Do not
advance the historical #36/#37 counts on this basis. Zero posts in the final correction
category does not mean there are no support problems; four need revision as described below.

There is direct evidence that deeper source material was used: the Starshield threshold
and Stewart's family-store fallback are both selected as `E17`, and the Bettany exchange
uses later support through `E13`. These details reach beyond the former 12-snippet cap.
Their presence in the accepted audit is stronger evidence than merely counting fetched
article characters. Current extraction reproduces the relevant details in later sections.

## Assessment of each post

| Post | Decision | What works and what needs attention |
| --- | --- | --- |
| Free-fruit trial | Revise | A useful distinction between consumption and household cost, but the title/body harden a politician's concern into an established assessment failure. Discussion assumes savings without evidence of their size or existence. The source also describes fruit moving into the school-meal programme. |
| Starshield | Revise | A concrete threshold and operational consequence make this more informative than a headline expansion. Keep the Ukraine scope and attribution explicit. The claims that the filter ignores identity and sorts only by movement exceed the selected evidence; the page reports Ukraine-specific restrictions. |
| Jimmy Stewart | Retain | The possible return to his father's store is a memorable, supported biographical detail. The exchange considers how to dramatize uncertainty and questions the source's framing of being forgotten. It offers recognizable film opinions, rather than pretending to have watched the film. |
| Palestine Action post | Revise | The police outcome is supported, and criminality versus defensibility is a fair distinction. But the article omits the speaker's name and the substance of the post while repeating that distinction through body and discussion. The paraphrase that the law had nothing to say is broader than the police's stated threshold decision. |
| Bettany | Revise body; retain the exchange | The discussion introduces specific sourced evidence and separates the distance between two people from responsibility for what they wrote. That is substantive pushback. The body and first turn repeat the same metaphor and make sweeping claims about what transcripts can establish. |
| Creative prompts | Retain, with optional tightening | Two actual prompts give the reader something to try. The exchange interprets why they might help and challenges whether one is easier. Its psychological explanation is an editorial reading, not a demonstrated universal mechanism. Introduce Campbell Walker by full name and avoid turning the closing interpretation into a universal claim. |

Article links and claim-by-claim support, including every discussion turn, are in the
[review ledger](fixtures/editorial-quality-live-review-20261018.json).

The [BBC fruit report](https://www.bbc.co.uk/news/articles/cqde8zk6d916o) supports the
wastage explanation and attributes the cost-of-living objection to Louise Doublet. It
also reports a replacement route for supplying fruit and her acceptance of the weak
consumption result. The generated argument is cleaner than the actual policy dispute.
A local reconstruction of the current page offers those details within the 24 snippets;
the artifact retains selected support only, so that reconstruction is not a recording
of the complete live prompt.

The [PBS/AP report](https://www.pbs.org/newshour/world/zelenskyy-urges-support-for-new-u-s-sanctions-on-russia-put-on-hold-by-trump)
supports the speed threshold. Later paragraphs describe geographical scope and disputed
responsibility. Current bounded reconstruction reaches the threshold but omits those
later qualifications while rotating through other sections. This reveals a limit of
the new approach: spreading snippets across sections can expose a mechanism without
its immediately following scope. The model must not extrapolate a universal rule.

The [Stewart interview](https://variety.com/2026/film/columns/kj-apa-jimmy-stewart-mr-fantasy-addictions-recovery-1236912309/)
provides an actual career crossroads, which is why that post works. The
[Bettany report](https://variety.com/2026/film/news/paul-bettany-johnny-depp-hadnt-spoken-in-years-libel-trial-1236915108/)
provides enough additional detail for the exchange to challenge its opening perspective.
Those are the changes worth preserving.

## What I would improve next

1. Keep nearby qualifications with a selected mechanism: geography, speaker, conditions,
   counter-evidence and what happened next. Test the observed Starshield scope and fruit
   replacement examples before changing evidence selection; simply raising every cap is
   not a demonstrated fix.
2. Make each discussion turn add a distinction, supported detail or worthwhile joke.
   Two good turns are enough. Three or four should earn their space. Across this edition,
   discussions contain 809 words versus 667 in bodies; that is not inherently excessive,
   but the police item and Bettany opening show avoidable repetition.
3. Preserve attribution through interpretation. A reported concern about unmeasured savings
   is not proof of realized savings. A limited police outcome is not a broad legal verdict.
   Opinion and humour should remain; factual premises and scope need more care.
4. Replenish usable lasting material. This edition has five topics but four news posts,
   two movie items, and no mythology, Sopranos, Canadian news or agentic AI. The remaining
   shelf did not contribute, so broader context alone has not restored the desired mix.
5. Investigate the two length-limited empty responses separately from writing quality.
   This run succeeded within budget, but the added context and required exchanges did
   not make generation faster. One run cannot isolate the cause.

## Evidence retention and limits

The [published edition snapshot](fixtures/editorial-quality-edition-20261018.json) and
[selected-support artifact](fixtures/editorial-quality-support-20261018.json) are retained
outside public data. Artifact `12126050724` expires November 1, 2026; its byte-level SHA-256
is `31988e1d851eef0b2d12c6cf9b31ffbe73bb72751cf7f5388f3b7f7c8ab8e924`.
Retrieval metadata and review decisions are in the ledger. Full fetched pages, workflow
logs and reconstructed evidence remain only in ignored local artifacts.

No generated post was rewritten during this review. The review does not declare the
feed generally reliable or complete the existing observation gates. The result supports
continuing with richer context and universal discussion, while addressing selection,
qualification and repetition next.
