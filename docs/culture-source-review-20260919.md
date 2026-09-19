# Culture and ideas packet review — September 19, 2026

Twelve fixed candidate pages were exercised through the actual `readBounded` →
`articleExcerpt` → `prepareEvidence` path. Four new pages are added; eight are excluded
or already consumed. This validates **source packets**, not observed generated articles.
No model call, extraction change, quota, second provider or new curation system is added.

## Why this pass

Scheduled run 35408871596 had only 13/59 unconsumed shelf pages; eight were unavailable
to that run, including all seven remaining Met pages. It published no culture articles.
Prior review found finite/exhausted Sopranos coverage, caption/teaser hazards and source
packets whose offered opening fails to deliver the promised explanation. Local retrieval
is a different environment from Actions; local success does not erase the observed Met
availability problem or establish that the next scheduled runner can fetch it.

The current parser conservatively selects the first substantial coherent section. SEP's
`main-text` selection may omit an introductory overview; `prepareEvidence` offers at most
twelve IDs, and an article may select three. A long page therefore does not imply a usable
full explanation. We tested what the model can actually be offered and selected narrow
angles with complete sentence groups. No missing clauses were supplied from memory.

The [fixture ledger](fixtures/culture-source-review-20260919.json) stores retrieval times,
URLs, full retrieved-HTML/excerpt hashes and lengths, selected spans with context groups,
coverage status, decisions, proposed payoff and limitations. It retains reduced paragraph
fixtures for offline extraction, not whole HTML/pages. Those fixture containers are minimized
representations with captured paragraphs, not a claim to reproduce the full live layout.
The selected page-local IDs were first verified against **full live extraction**; live
request numbering may differ. The supported examples are manually authored review probes,
not generated output or proposed feed posts.

## Candidate decisions

| Candidate | Actual packet result | Decision |
| --- | --- | --- |
| [The Symposium in Ancient Greece](https://www.metmuseum.org/essays/the-symposium-in-ancient-greece) | 1,532 excerpt characters; 12 offered IDs. E6 + E7–E8 fully explain wine mixing, who sets strength and the usual ratio/service. | **Add**, mythology/cultural context. Keep historical male-aristocratic setting and slavery explicit where relevant; no universal Greek drinking rule. |
| [Medusa in Ancient Greek Art](https://www.metmuseum.org/essays/medusa-in-ancient-greek-art) | 5,498 characters; 12 IDs, truncated. E3–E5 support protective terror. | **Exclude duplicate angle**: `post-20260917T055240Z-e9e1-7` already explains protective Medusa. A new URL does not make the angle new. |
| [Theseus](https://www.worldhistory.org/Theseus/) | Retrieved, but zero recognized article prose. | Exclude; no adapter workaround. |
| [TV's a crowd](https://www.bfi.org.uk/sight-and-sound/features/tvs-crowd) | 5,455 characters; 11 IDs. Usable criticism, but URL already consumed. | Review-only control; preserve coverage and identifier. |
| [Van Zandt on Gandolfini's workload](https://people.com/steven-van-zandt-says-james-gandolfini-contemplated-quitting-the-sopranos-often-8707383) | HTTP 402 through actual fetch path. | Exclude; indexed description is not a usable generation packet. |
| BFI candidate “How Twin Peaks stretches television into the unknown” | Candidate route returned 404. | Exclude unverified route. Search result did not establish an accessible article URL. |
| SEP candidate “Philosophy of Documentary Film” | Candidate route returned 404. | Exclude unverified route. |
| SEP candidate “The Experience Machine” | Candidate route returned 404. | Exclude unverified route. |
| [Personal Identity](https://plato.stanford.edu/entries/identity-personal/) | 5,769 characters; 12 IDs, truncated. E3 + E11–E12 distinguish attached self-characterization as contingent/changeable. | **Add**, philosophy. Does not establish bodily/psychological persistence theories or solve the identity problem. |
| [Real-Life Examples of Opportunity Cost](https://www.stlouisfed.org/open-vault/2020/january/real-life-examples-opportunity-cost) | Retrieved, but zero recognized article prose. | Exclude; no new adapter for one page. |
| [The Free Rider Problem](https://plato.stanford.edu/entries/free-rider/) | 5,841 characters; 11 IDs, truncated. E4 + E5–E6 explain coordination failure through missing information rather than conflicting interests. | **Add**, economics, for that distinction only. Do not promise the whole free-rider mechanism from this packet. |
| [Ceres Facts](https://science.nasa.gov/dwarf-planets/ceres/facts/) | 628 characters; 7 IDs. E3–E4 support discovery in 1801 and first dwarf-planet spacecraft visit in 2015. | **Add**, factual science story. Historical milestones, not new discovery or unsupported geology. |

The four additions bring the shelf from **59 to 63**, and unconsumed inventory at this
main snapshot from **13 to 17**. All existing URLs/titles and URL-hashed source IDs are
unchanged; no consumed source is revived. Archive titles and relevant bodies were checked:
the coordination-information distinction differs from the existing prisoner's-dilemma
incentive trap; Ceres's two milestones differ from the earlier asteroid size-range article;
symposium wine service and contingent self-description have no observed prior angle match.

## Offline verification and limits

`generator/__tests__/culturePackets.test.ts` exercises extraction and evidence numbering
for reduced real-paragraph fixtures. It verifies exact selected text/context, inclusion of
every continuation for each selected sentence group, the three-ID allowance, and ordinary
draft validation of the manually reviewed probe. It also calls `collectEvergreen` with
mocked fixed responses to verify URL-derived identifiers, unknown publication dates and
that covered additions are never fetched again. These deterministic checks establish
packet integrity and unchanged intake behavior, not semantic correctness of future prose.

No movie/Sopranos page was added: one control is already consumed, one new Sopranos page
is inaccessible, and film candidates failed. No publisher is banned. Two additions use
SEP's existing publisher group and remain subject to its two-source edition allowance.
One uses the Met, whose Actions availability remains uncertain. Sources still compete
within the sixteen-source/twelve-ID offering bounds; selected additions are not guaranteed
to be offered, chosen or published. The source shelf remains finite.

The next independent curation task should target verified movie craft and Sopranos
interview/criticism URLs, with the same complete-payoff check, instead of expanding this
pass indefinitely or treating more source URLs as demonstrated reader value.
