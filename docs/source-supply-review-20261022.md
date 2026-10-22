# Source supply review — October 22, 2026

**Why Sopranos, mythology and lasting reading dried up, the intake fixes, and 33
reviewed shelf additions.** The shelf grows **67 → 100** pages; **9** unreachable
pages are retired, so unconsumed, fetchable shelf supply goes **0 → 33**: 11
mythology, 10 Sopranos and 12 philosophy. This is **source packet validation**, not
observed generated-article quality. No generation was run, and the #36/#37
observation counts are unchanged.

## Diagnosis

Baseline: main `798d5c6`. In the week before review (642 articles), news was 61% of
posts, The Sopranos had **0** articles and mythology **1**. Run 39681251180 used all
40 usable sources and published 18 of a possible 20, so output was limited by
supply, not by editorial selection. The mix mirrored what intake could deliver.

- **The shelf ran out.** 58 of 67 pages were consumed between September 16 and 19.
  No shelf page has been published since. Every run since then logged the
  remaining 9 as unavailable.
  - **The Met (8 essays):** metmuseum.org now serves a Vercel Security Checkpoint.
    It returns HTTP 429 to every automated request, including `robots.txt`. That
    is bot detection, and CoBanter never bypasses it.
  - **World History Encyclopedia (Marcus Aurelius):** pages now embed inline SVG
    with `<!DOCTYPE svg …>` declarations. The extractor's DTD guard rejects them,
    which is correct fail-closed behaviour. Neither guard is loosened.
- **The Sopranos feed was excluded.** Since `0c5af0d` (October 18), feed blurbs
  are discovery only. An item needs full feed prose or an inspected publisher-body
  adapter, and The Guardian had no adapter. All items from the Guardian Sopranos
  feed were therefore dropped before writing. At review time, 12 of its 20 items
  were uncovered.
- **The Guardian film feed always failed.** `https://www.theguardian.com/film/rss`
  now redirects (302) to `/uk/film/rss`, and intake correctly refuses redirects.
  Logs named both Guardian feeds just "The Guardian", which hid which one failed.
- **Philosophy was slow, not broken.** Aeon, Psyche and JSTOR Daily publish a few
  pieces a week, and almost everything usable was being consumed.

## Intake changes

- **Guardian adapter.** The body is the single `div` that has both
  `article-body-commercial-selector` and `article-body-viewer-selector`. Pull
  quotes (`aside`), images (`figure`) and credits (`footer`) are already excluded
  and stay section boundaries. Inspected on a 2026 Sopranos interview. All 44
  then-current items from both Guardian feeds (24 film, 20 Sopranos) produced at
  least 300 characters. Liveblogs and other layouts lack the container and are
  skipped.
  - Known limitation: some pieces end with a short author or book credit
    paragraph. The Sopranos tag also includes peripheral pieces, such as a
    "mob wife" fashion list.
- **Film feed URL** is now `https://www.theguardian.com/uk/film/rss`. Redirects
  remain rejected.
- **Diagnostics.** Feed lines name the topic, e.g. `The Guardian (the_sopranos)`.
  Failures and unavailable shelf pages include a bounded, credential-free reason,
  such as `RSS request failed (429)`.
- **Retirement, not deletion.** The 9 pages keep their entries, IDs and review
  fixtures, with a dated `retired` reason. `collectEvergreen` never requests
  them.
- **Shelf adapters.** Shelf pages from publishers with an inspected adapter
  (Guardian, JSTOR Daily, Aeon) use that adapter's first section of at least
  300 characters. They never join across its module boundaries. Layouts the
  adapter does not recognize keep the generic single-section reader. This
  preserves the earlier reviewed Falco page.

## Discovery and bounded intake

Discovery used web search for JSTOR Daily, Aeon, The Ringer and The Conversation,
and the Guardian's own Sopranos tag pages 1–5. Philosophy used Stanford
Encyclopedia entry URLs. All 60 candidates were screened through the production
shelf path on October 22, between 03:25 and 03:27 UTC:
- HTTPS, no redirects, the 20-second timeout and the 1 MB bounded reader;
- the same extractor and the `prepareEvidence` 12-snippet cap;
- each host's `robots.txt` rules for `*`, all of which allowed the pages;
- existing URL and normalized-title coverage.

The Conversation pages return HTTP 200, but the generic reader finds no
recognized prose. No new Conversation adapter was added, so those 14 pages are
excluded.

Each addition has a complete, specific angle within **three** evidence IDs,
including every split-sentence part. Attribution is limited to what the selected
IDs say. Each also has a manually written probe that passes `validateCitedDraft`.
Two Sopranos additions concern a first-season killing and the finale reaction.
They are `spoilers: true` with non-revealing titles. The ledger
[`fixtures/source-supply-review-20261022.json`](fixtures/source-supply-review-20261022.json)
records, for every candidate:
- retrieval time, status, hashes and lengths;
- all offered evidence and the selected IDs;
- probes and limitations;
- page-reported author and date metadata, when the page has it;
- reduced offline prefixes.

A final normal-intake recheck through `collectEvergreen` at 03:32 UTC reproduced exactly the
reviewed offered evidence for all 33 additions. All 33 kept an unknown
`publishedAt`.

### Mythology

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [Healing and Memory in Ancient Greece](https://daily.jstor.org/healing-and-memory-in-ancient-greece/) (JSTOR Daily) | 1,051 / 10 | E2, E3, E6 | **Add:** A night with the healing god, after an offering to Memory |
| [The Unusual, Unexpected Erechtheion](https://daily.jstor.org/the-unusual-unexpected-erechtheion/) (JSTOR Daily) | 1,363 / 12 | E7, E8, E11 | **Add:** The Acropolis temple that is two temples squeezed into one |
| [Smoke Gets in Your Eyes: Animal Sacrifice and the Greek Gods](https://daily.jstor.org/smoke-gets-in-your-eyes-animal-sacrifice-and-the-greek-gods/) (JSTOR Daily) | 1,338 / 12 | E11, E12 | **Add:** What the Greek gods actually got from a sacrifice |
| [Venus of the Sewers](https://daily.jstor.org/venus-of-the-sewers/) (JSTOR Daily) | 533 / 6 | E1, E2, E3 | **Add:** The Roman Forum's shrine to the Venus of the Sewers |
| [Replicants and robots: what can the ancient Greeks teach us?](https://aeon.co/essays/replicants-and-robots-what-can-the-ancient-greeks-teach-us) (Aeon) | 3,487 / 12 | E8, E11, E12 | **Add:** Medea's blood-for-herbs rejuvenation of Jason's father |
| [How Do We Know That Epic Poems Were Recited from Memory?](https://daily.jstor.org/how-do-we-know-that-epic-poems-were-recited-from-memory/) (JSTOR Daily) | 1,281 / 11 | E4, E5, E8 | **Add:** How Milman Parry showed long epics could live in memory |
| [Super Mario, Homer’s Odyssey, and the Meaning of Marriage](https://daily.jstor.org/super-mario-homers-odyssey-and-the-meaning-of-marriage/) (JSTOR Daily) | 1,453 / 12 | E5, E6, E7 | **Add:** Super Mario Odyssey borrows more than Homer's title |
| [How a vanished ancient Greek city helps us think about disasters](https://aeon.co/essays/how-a-vanished-ancient-greek-city-helps-us-think-about-disasters) (Aeon) | 5,783 / 12 | E6, E7, E9 | **Add:** Helike, the Greek city an earthquake and a wave erased |
| [The ancient world teemed with birds; now we think with them](https://aeon.co/essays/the-ancient-world-teemed-with-birds-now-we-think-with-them) (Aeon) | 1,629 / 11 | E8, E9, E10 | **Add:** The birdsong of ancient Athens and Rome |
| [When Homer envisioned Achilles, did he see a black man?](https://aeon.co/essays/when-homer-envisioned-achilles-did-he-see-a-black-man) (Aeon) | 5,189 / 12 | E2, E3, E8 | **Add:** Greek statues that were never white |
| [Why it pays to read for acrostics in the Classics](https://aeon.co/essays/why-it-pays-to-read-for-acrostics-in-the-classics) (Aeon) | 3,945 / 12 | E10, E11, E12 | **Add:** The Roman poem read for centuries as a prophecy of Christ |
| [In Pursuit of Peace, Ancient Athens Created a Goddess - JSTOR Daily](https://daily.jstor.org/in-pursuit-of-peace-ancient-athens-created-a-goddess/) | 1,314 / 12 | — | Exclude: Offered evidence covers only Athens' wars; the Eirene cult payoff is beyond the twelve offered snippets. |
| [The Pomegranate in History and Myth - JSTOR Daily](https://daily.jstor.org/the-pomegranate-in-history-and-myth/) | 1,212 / 11 | — | Exclude: Offered evidence is entirely medical herbals; no myth content reaches the evidence. |
| [Mermaids: Myth, Kith and Kin - JSTOR Daily](https://daily.jstor.org/mermaids-myth-kith-and-kin/) | 854 / 8 | — | Exclude: About Hans Christian Andersen and Disney, not Greek or Roman myth. |
| [Xenophilia: Golden Rule of the Stranger - JSTOR Daily](https://daily.jstor.org/xenophilia-golden-rule-of-the-stranger/) | 1,681 / 12 | — | Exclude: Homeric examples are beyond the offered evidence; the offered material is a general definition. |
| [The ancient Greeks had alternative facts too – they were just more chill about i](https://theconversation.com/the-ancient-greeks-had-alternative-facts-too-they-were-just-more-chill-about-it-131815) | 421 / 6 | — | Exclude: Generic extraction stops at the Oedipus setup; the alternative versions never reach the evidence. No Conversation page adapter. |
| [Explainer: the story of Demeter and Persephone](https://theconversation.com/explainer-the-story-of-demeter-and-persephone-110898) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Guide to the Classics: Homer’s Odyssey](https://theconversation.com/guide-to-the-classics-homers-odyssey-82911) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [The dog who waited for Odysseus: Argos reflects the deep human-animal bonds of a](https://theconversation.com/the-dog-who-waited-for-odysseus-argos-reflects-the-deep-human-animal-bonds-of-ancient-greece-288214) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [What ancient Greek stories of humans transformed into plants can teach us about ](https://theconversation.com/what-ancient-greek-stories-of-humans-transformed-into-plants-can-teach-us-about-fragility-and-resilience-207462) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Angry, wise, or plain horny? Zeus comes in many forms onscreen – just as he did ](https://theconversation.com/angry-wise-or-plain-horny-zeus-comes-in-many-forms-onscreen-just-as-he-did-in-the-original-myths-237477) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [We’ve told this story for 2,500 years: how Hadestown playfully brings alive an a](https://theconversation.com/weve-told-this-story-for-2-500-years-how-hadestown-playfully-brings-alive-an-ancient-greek-myth-249718) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [What Greek mythology teaches us about women’s resistance and rebellion](https://theconversation.com/what-greek-mythology-teaches-us-about-womens-resistance-and-rebellion-200519) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Who is Odysseus, hero of Christopher Nolan’s new epic?](https://theconversation.com/who-is-odysseus-hero-of-christopher-nolans-new-epic-261781) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [The Odyssey is haunted by the mysterious ‘Sea Peoples’ – but who were they, real](https://theconversation.com/the-odyssey-is-haunted-by-the-mysterious-sea-peoples-but-who-were-they-really-287686) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |

### The Sopranos

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [The Sopranos: 10 years since it finished, it's still the most masterful show eve](https://www.theguardian.com/tv-and-radio/2017/jun/08/the-sopranos-10-years-since-it-finished-its-still-the-most-masterful-show-ever) (The Guardian) | 1,788 / 12 | E9, E10, E11 | **Add:** Why Tony Soprano made viewers want to stay on his good side |
| [The Sopranos at 20: how the hit show changed the gangster genre](https://www.theguardian.com/tv-and-radio/2019/jan/14/the-sopranos-at-20-how-the-hit-show-changed-the-gangster-genre) (The Guardian) | 519 / 5 | E1, E2, E3 | **Add:** The Sopranos and Analyze This arrived two months apart |
| [The Sopranos, glorious pioneer of today’s TV golden age](https://www.theguardian.com/commentisfree/2019/jan/13/the-sopranos-glorious-pioneer-of-todays-tv-golden-age) (The Guardian) | 2,461 / 12 | E4, E5, E6 | **Add (spoilers):** The killing HBO's chief feared would lose viewers |
| [David Chase on why he wrote The Sopranos: 'I needed help. I needed therapy'](https://www.theguardian.com/tv-and-radio/2019/sep/16/david-chase-the-sopranos-best-tv-21st-century) (The Guardian) | 1,761 / 11 | E1, E2, E3 | **Add:** The first image David Chase had for The Sopranos |
| [The Sopranos: from enduring TV hit to the hottest show of lockdown](https://www.theguardian.com/tv-and-radio/2020/dec/19/sopranos-hit-social-media-generation-mafia-series-emotional-struggles) (The Guardian) | 1,267 / 12 | E11, E12 | **Add:** When every Monday belonged to The Sopranos |
| [The Sopranos: David Chase and Vincent Curatola on how they made a TV classic](https://www.theguardian.com/tv-and-radio/2021/mar/08/sopranos-david-chase-mobster-johnny-sack-how-they-made-tv-classic-fox-mob-murders) (The Guardian) | 1,032 / 11 | E5, E6 | **Add:** Why Fox passed on the first Sopranos draft |
| [David Chase: I was annoyed that fans wanted Tony Soprano dead](https://www.theguardian.com/tv-and-radio/2021/nov/03/david-chase-i-was-annoyed-that-fans-wanted-tony-soprano-dead) (The Guardian) | 1,220 / 12 | E5, E6 | **Add (spoilers):** What really bothered David Chase about the reaction to the ending |
| [Half a Wiseguy: The Genius and the Menace of Paulie Walnuts](https://www.theringer.com/2022/07/10/tv/sopranos-tony-sirico-obituary-paulie-walnuts-gualtieri) (The Ringer) | 5,268 / 11 | E3, E7, E11 | **Add:** "Where's my arc, Paulie?" |
| [Two Assholes Lost in the Woods: An Oral History of ‘Pine Barrens’](https://www.theringer.com/2021/05/05/tv/sopranos-pine-barrens-oral-history) (The Ringer) | 2,885 / 12 | E9, E10, E11 | **Add:** Why David Chase calls 'Pine Barrens' a fairy tale |
| [How ‘Goodfellas’ Serves As the Bridge Between ‘The Godfather’ and ‘The Sopranos’](https://www.theringer.com/2020/09/17/movies/goodfellas-martin-scorsese-the-godfather-the-sopranos) (The Ringer) | 2,123 / 12 | E5, E10, E11 | **Add:** The film between The Godfather and The Sopranos |
| [From Gypsy to The Sopranos, what do real psychotherapists think of TV shrinks? /](https://www.theguardian.com/tv-and-radio/2017/jul/18/what-do-real-psychotherapists-think-of-tv-shrinks-gypsy-sopranos) | 1,610 / 12 | — | Exclude: The therapists' views are beyond the offered evidence; offered material is the critic's framing. |
| [Ten of the best Sopranos episodes, chosen by its stars / The Sopranos / The Guar](https://www.theguardian.com/tv-and-radio/2020/aug/01/steve-schirripa-michael-imperioli-sopranos-ten-best-episodes) | 884 / 8 | — | Exclude: Offered evidence stops at the podcast introduction; no episode choices reach the evidence. |
| [Life, death and gabagool: how The Sopranos explains everything / The Sopranos / ](https://www.theguardian.com/tv-and-radio/2021/sep/04/life-death-and-gabagool-how-the-sopranos-explains-everything) | 358 / 3 | — | Exclude: Only a three-sentence generic premise section is offered. |
| [Edie Falco: 'I've never loved the work more, but I'm not cut out for the busines](https://www.theguardian.com/film/2018/apr/11/edie-falco-the-sopranos-outside-in-interview) | 722 / 8 | — | Exclude: Offered section concerns Outside In and drama school, not The Sopranos. |
| [​Alessandro Nivola: ​'It's been nice picking through my dad's experiences for th](https://www.theguardian.com/tv-and-radio/2019/apr/14/alessandro-nivola-interview-sopranos-movie-prequel-many-saints-of-newark) | 5,749 / 12 | — | Exclude: Career biography plus one research remark; the substantive answer is beyond the offered evidence. |
| [Lorraine Bracco on Goodfellas, therapy, and almost turning down The Sopranos / F](https://www.theguardian.com/film/2017/feb/20/lorraine-bracco-goodfellas-the-sopranos-martin-scorsese) | 1,093 / 11 | — | Exclude: Offered section is entirely a Goodfellas screening anecdote. |
| [The Sopranos at 25: mafia tale of murder, mayhem and family created a golden age](https://theconversation.com/the-sopranos-at-25-mafia-tale-of-murder-mayhem-and-family-created-a-golden-age-of-television-221233) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Still with the Tony Soprano memes? Young audiences are watching the series with ](https://theconversation.com/still-with-the-tony-soprano-memes-young-audiences-are-watching-the-series-with-fresh-eyes-237982) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |

### Philosophy

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [Socrates](https://plato.stanford.edu/entries/socrates/) (Stanford Encyclopedia of Philosophy) | 4,359 / 12 | E4, E5, E12 | **Add:** The ugly, cold-proof Socrates his statues hide |
| [Ancient Theories of Soul](https://plato.stanford.edu/entries/ancient-soul/) (Stanford Encyclopedia of Philosophy) | 5,954 / 11 | E3, E4, E5 | **Add:** The Homeric soul: risked in battle, a shade in the underworld |
| [Presocratic Philosophy](https://plato.stanford.edu/entries/presocratics/) (Stanford Encyclopedia of Philosophy) | 3,661 / 11 | E2, E3, E11 | **Add:** Philosophers known only from fragments |
| [Pythagoras](https://plato.stanford.edu/entries/pythagoras/) (Stanford Encyclopedia of Philosophy) | 2,707 / 11 | E2, E10, E11 | **Add:** The forged books that made Pythagoras a master philosopher |
| [Kant’s Moral Philosophy](https://plato.stanford.edu/entries/kant-moral/) (Stanford Encyclopedia of Philosophy) | 5,641 / 12 | E1, E2, E7 | **Add:** Kant's search for a morality for all times and cultures |
| [Simone de Beauvoir](https://plato.stanford.edu/entries/beauvoir/) (Stanford Encyclopedia of Philosophy) | 4,674 / 11 | E6, E10, E11 | **Add:** Beauvoir, Zaza and a childhood vow |
| [Confucius](https://plato.stanford.edu/entries/confucius/) (Stanford Encyclopedia of Philosophy) | 5,346 / 11 | E3, E6, E7 | **Add:** Before he was a philosopher, Confucius received temple offerings |
| [Moral Luck](https://plato.stanford.edu/entries/moral-luck/) (Stanford Encyclopedia of Philosophy) | 5,949 / 10 | E8, E9, E10 | **Add:** Why blame evaporates when someone was pushed |
| [Happiness](https://plato.stanford.edu/entries/happiness/) (Stanford Encyclopedia of Philosophy) | 4,632 / 12 | E10, E11, E12 | **Add:** Is happiness, as a mental state, even valuable? |
| [Heraclitus](https://plato.stanford.edu/entries/heraclitus/) (Stanford Encyclopedia of Philosophy) | 3,230 / 12 | E4, E8, E9 | **Add:** The philosopher who left his book in a temple |
| [Democritus](https://plato.stanford.edu/entries/democritus/) (Stanford Encyclopedia of Philosophy) | 2,048 / 12 | E6, E7, E8 | **Add:** Democritus, known mostly through his rival Aristotle |
| [Aristotle](https://plato.stanford.edu/entries/aristotle/) (Stanford Encyclopedia of Philosophy) | 4,597 / 11 | E6, E7, E8 | **Add:** Aristotle's turn to marine biology |
| [Guide to the Classics: how Marcus Aurelius’ Meditations can help us in a time of](https://theconversation.com/guide-to-the-classics-how-marcus-aurelius-meditations-can-help-us-in-a-time-of-pandemic-142659) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Guide to the classics: Plato’s Republic](https://theconversation.com/guide-to-the-classics-platos-republic-127724) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [The Real Spartacus: or What is Philosophy as a Way of Life?](https://theconversation.com/the-real-spartacus-or-what-is-philosophy-as-a-way-of-life-76404) | 0 / 0 | — | Exclude: HTTP 200, but no recognized prose in the shelf extractor; no new adapter added. |
| [Death (Stanford Encyclopedia of Philosophy)](https://plato.stanford.edu/entries/death/) | 784 / 8 | — | Exclude: Offered section is definitional scaffolding with no concrete payoff. |
| [David Hume (Stanford Encyclopedia of Philosophy)](https://plato.stanford.edu/entries/hume/) | 5,798 / 12 | — | Exclude: Already on the shelf and consumed. |

## Limits and follow-ups

- **Extraction is not fact-checking.** Probes prove provenance against the
  selected text only. Live generation still goes through writer validation and
  mandatory review, which are fallible.
- **The shelf is still finite.** At the September consumption rate, 33 pages could
  be used within a few days. Pacing shelf use per run was proposed separately.
  It is **not** part of this change.
- **Stanford Encyclopedia evidence keeps raw HTML entities** (for example
  `&rsquo;`), as it did for the earlier SEP pages. This is unchanged here.
