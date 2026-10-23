# Repeated stories: DW article IDs and same-event deferral — October 23, 2026

An October 23 content analysis of 65 editions found two kinds of repeated story.
Readers see both as repetition:

1. **The same article under a new slug.** Deutsche Welle (DW) republishes one article
   under new slugs and keeps its `/a-<digits>` ID.
2. **The same event from several publishers**, sometimes in one edition.

This change handles the first durably and the second with a run-local heuristic.
Every evidence, review, citation, publisher, budget and deadline rule is unchanged.

## DW article-ID coverage

`coverageUrl` in `generator/editorial/coverage.ts` now keys `dw.com`/`www.dw.com`
paths ending in `/a-<digits>` (optional trailing slash, query ignored) as
`dw.com#a-<id>`. This is the same pattern as The Conversation's numeric ID. State still
stores exact URLs and keys are derived at check time, so no migration is needed.

Evidence: ten DW article IDs were each published more than once between September 19
and October 17, 21 posts in all. All are in `generator/state/world.json` and the batches:
a-79331945, a-79417294, a-79507122, a-79533857 (three times), a-79535336, a-79629555,
a-79629971, a-79634509, a-79681977 and a-79685584. They are listed in
`generator/__tests__/coverage.test.ts`. Some were live-updating stories (the Brazil
election ID moved from "voting has begun" to "head to runoff"). Keying on the ID means
a later update to the same DW article is not covered again. That is intended: readers
saw those posts as repeats.

## Same-event deferral

`generator/editorial/sameEvent.ts` compares each candidate's **source headline** with:

- source headlines published in the previous **48 hours**, read from the batch files
  listed in the Git manifest (`generator/generate.ts`); and
- source headlines of posts accepted **earlier in the same run**.

Headlines are normalised: NFKC, lower case, punctuation removed, `'s` dropped, simple
plurals folded. Stopwords, headline boilerplate ("review", "exclusive", "live"…),
single characters and bare years are removed. A token is *distinctive* unless it
appears in more than 2% (and more than two) of the reference headlines. This removes
words like "trump", "nasa", "amazon bedrock" and "alberta" during the referendum
period. A candidate **matches** when it shares at least **three** distinctive tokens
with one reference headline.

A match adds the candidate to the run's `deferredSources`, exactly like
empty-selection deferral. It is never marked covered, never rejected durably, and
never bypasses any other check. Diagnostics log each deferral
(`[editorial] same-event deferral: "<candidate>" resembles "<reference>" (shared: …)`)
and the run summary reports `sameEventDeferrals=N`. Outside the window the candidate
is eligible again. In practice a deferred news candidate will often age past the
72-hour news limit first.

**This is a heuristic, not semantic deduplication.** It reads headlines only. It
cannot tell a follow-up from a repeat, and it misses same-event stories whose
headlines share fewer than three distinctive words.

Known gap: two same-event candidates offered in the **same** writer request can both
be accepted in that chunk. Only later chunks and runs see the accepted one. The
positions of the seven same-run pairs below suggest most came from different chunks. Hiding
twins within one request would also stop multi-source posts (12 of 1,049, mostly
same-event syntheses), so it was not added.

## Calibration (October 9–22: 65 editions, 1,049 posts)

Reproduce with `node --import tsx scripts/calibrateSameEvent.ts 2026-10-09 [hours]`.
The script replays the rule over `public/data/batches/*.json`. For each published
post, the reference set is the sources published within the window before its batch,
plus earlier posts in the same batch. It reports the first match for each source.
Pairs whose URLs share a coverage key (the DW and Conversation ID repeats) are counted
as coverage and excluded. The labels are one manual reading of the headlines.

| Rule | Matched sources | Same event | Same story or work, different angle or later development | Unrelated |
|---|---|---|---|---|
| 48 h, 3 shared, 2% frequency (chosen) | 70, in 69 posts (6.6%) | 31 | 30 | 9 |

Each generation candidate is one source, so matches are counted per source.

A 72-hour window matched 88 sources in 87 posts. It caught the Stellantis strike vote (49 hours
apart), the October 11→13 Pope Leo pair and the Oregon school shooting. It also added
more unrelated or loosely related matches: White House press stories, Tallinn and
"I Play Rocky" festival items, AWS how-to posts and military-base fires. The window
was kept at the requested 48 hours. Two shared tokens matched far more unrelated pairs.
Without the frequency rule, AWS Bedrock and NASA headlines matched each other on
boilerplate alone.

The reported examples:

- **Alberta Court of Appeal** (CBC and Global News, October 10, same run): caught.
- **"The Julia Set" sale and "Bad Fairies" cast** (Variety and Deadline, October 16): caught,
  including IndieWire's October 17 sales round-up.
- **Pope Leo's lung surgery**: October 17→18 posts caught. October 11, 13 and 17 were each
  more than 48 hours apart, so they are missed.
- **Stellantis strike vote** (Global News October 17, CBC October 19): missed. They are
  49 hours apart.

Other misses seen in the uncaught pairs: the Russian diesel-deal backlash and the
Ukraine strike-resumption stories ("trump", "russia" and "ukraine" were too common to
count), and the DW/PBS Oregon school shooting headlines.

### Caught: same event (31)

- 10-10 (same run): Global News Canada: Alberta Court of Appeal says Impact Assessment Act is still unconstitutional ← CBC Canada: Alberta Court of Appeal says Ottawa's Impact Assessment Act is still unconstitutional — court, appeal, impact, assessment, act, still, unconstitutional
- 10-10: PBS NewsHour: What to expect as Hurricane Isaias bears down on the Gulf Coast as a major storm ← PBS NewsHour: Gulf Coast prepares for landfall as Hurricane Isaias gains power — hurricane, isaia, gulf, coast
- 10-11: Ars Technica: NASA issues long-awaited call to industry for private space stations ← NASA: NASA Seeks US Industry Plans for Commercial Space Stations — industry, space, station
- 10-11: BBC World: Riyadh airport attack another dangerous moment in already tense conflict ← NPR: Attack on Riyadh airport killed 12 people and wounded over 300 more, Saudi authorities say — riyadh, airport, attack
- 10-11: IndieWire: Oscars: U.K. Selects ‘Rehearsals for a Revolution,’ Documentary About Iran, as Best Internationa… ← Deadline: Oscars: UK Selects ‘Rehearsals For A Revolution’ For Best International Feature Film — oscar, select, rehearsal, revolution, best, international, feature
- 10-11: Variety Film: Box Office: ‘The Social Reckoning’ Flops With $5.5 Million Debut, ‘Other Mommy’ Tops Box Offi… ← Variety Film: Box Office: ‘Other Mommy’ Spooks Up $12.6 Million on Opening Day, ‘The Social Reckoning’ Debu… — box, office, social, reckoning, million, debut, mommy
- 10-12 (same run): IndieWire: Box Office: ‘NAZA,’ Documentary About Israel’s Attacks on Gaza That Was Too Hot for Distributors… ← Deadline: Palme d’Or Prestige: ‘Fjord’ Tops Indie Openers, ‘Naza’ Eyes $500k Surge – Specialty Box Office — box, office, naza
- 10-12: IndieWire: ‘The Social Reckoning’ Bombs with $5.5 Million Opening. Why Did Aaron Sorkin’s Facebook Follow-U… ← Variety Film: Box Office: ‘Other Mommy’ Spooks Up $12.6 Million on Opening Day, ‘The Social Reckoning’ Debu… — social, reckoning, million, opening
- 10-12: PBS NewsHour: Trump claims Russia and Ukraine agree to 'energy ceasefire' despite continued attacks ← Deutsche Welle: Trump announces 'energy ceasefire' between Russia and Ukraine — trump, russia, ukraine, energy, ceasefire
- 10-13: NASA: Voyager Technologies’ Griffin-1 Completes Environmental Testing at NASA JPL ← NASA: NASA JPL Testing Readies Voyager Technologies Lander for Moon Mission — voyager, technology, testing, nasa, jpl
- 10-13: NPR: A judge blocks the government's tree-clearing spree at a municipal D.C. golf course ← PBS NewsHour: Federal judge orders Trump administration to halt work for a day on historic D.C. golf course — judge, golf, course
- 10-14: NASA: Hurricane Simon Lurks Off the Mexican Coast ← NPR: Hurricane Simon pounds resorts and vulnerable towns along Mexico's Pacific coast — hurricane, simon, coast
- 10-14: CBC Canada: Prime Minister Carney to attend 2 Forever Canadian rallies in Alberta ahead of Oct. 19 referendum ← Global News Canada: Mark Carney to attend ‘Forever Canadian’ rallies ahead of Alberta referendum — carney, attend, forever, canadian, rally, alberta, ahead, referendum
- 10-15: NPR: Social Security benefits to get a boost. And, Hasan Piker defends his rhetoric ← NPR: Inflation sizzled in September — and Social Security benefits will get a boost — social, benefit, boost
- 10-16: Deadline: Greta Gerwig On Securing Led Zeppelin’s “Stairway to Heaven” For ‘Narnia’ Trailer: “They Too Love… ← Ars Technica: Greta Gerwig channels Bowie in psychedelic The Magician's Nephew trailer — greta, gerwig, trailer
- 10-16: Variety Film: Netflix Shocker: Bela Bajaria Leaving After 10 Years Amid Layoffs, Peter Rice to Replace as C… ← Variety Film: Why Did Netflix Boot Bela Bajaria? — netflix, bela, bajaria
- 10-16: Global News Canada: Stelco negotiations still on the table, Joly says amid layoffs ← CBC Canada: 'Everything is on the table,' Joly says, as Ottawa weighs legal action over Stelco layoffs — stelco, table, joly, layoff
- 10-16: PBS NewsHour: News Wrap: Trump says Fort Hood shooter's execution will not be livestreamed ← PBS NewsHour: Trump says Fort Hood shooter execution won't be livestreamed after bipartisan backlash — fort, hood, shooter, execution, livestreamed
- 10-16: Deadline: Kylie Minogue, Jonathan Groff & Catherine Tate Join ‘Bad Fairies’ Cast With Cynthia Erivo ← Variety Film: Cynthia Erivo’s ‘Bad Fairies’ Adds Kylie Minogue, Jonathan Groff and Catherine Tate to Voice… — kylie, minogue, jonathan, groff, catherine, tate, bad, fairy, cast, cynthia, erivo
- 10-16: NASA: Artemis II Heat Shield After Splashdown ← NASA: Rigorous Analysis Confirms NASA’s Artemis II Heat Shield Performance — artemis, ii, heat, shield
- 10-16: Deadline: Chase Infiniti-Starring ‘The Julia Set’ Acquired By Sony Pictures Classics After TIFF Premiere ← Variety Film: ‘The Julia Set,’ Starring Chase Infiniti, Lands at Sony Pictures Classics Following TIFF Prem… — chase, infiniti, starring, julia, set, sony, picture, classic, tiff, premiere
- 10-17: CBC Canada: Police release more details on fiery, fatal bus crash in Calgary ← Global News Canada: Cause of fiery Calgary bus crash that killed 3 passengers, injured 16 under investigation — fiery, bus, crash, calgary
- 10-17: PBS NewsHour: Israeli settlers attack Palestinians during West Bank olive harvest and beat U.S. photojourna… ← NPR: Israeli settlers beat Palestinians and a U.S. photojournalist in West Bank attacks — israeli, settler, attack, palestinian, west, bank, beat, photojournalist
- 10-17: IndieWire: Fall Festival Movies Sold So Far: Niki Byrne’s Chase Infiniti-Starring College Drama ‘The Julia… ← Variety Film: ‘The Julia Set,’ Starring Chase Infiniti, Lands at Sony Pictures Classics Following TIFF Prem… — chase, infiniti, starring, julia, set
- 10-17: CBC Canada: Waymo is coming to Toronto. Will its self-driving cars be winter-ready? ← CBC Canada: Waymo to launch first phase of driverless taxi testing in Toronto 'in the coming days' — waymo, coming, toronto
- 10-17: Variety Film: Harry Styles ‘Together, Together’ Tour Doc Coming From John Wilson, Universal Pictures Conten… ← IndieWire: John Wilson’s Next Documentary Will Reportedly Show Audiences ‘How to’ Tour Like Harry Styles — harry, style, tour, john, wilson
- 10-18: PBS NewsHour: Zelenskyy urges support for new U.S. sanctions on Russia put on hold by Trump ← NPR: Zelenskyy urges support for new US sanctions on Russia after Trump puts them on hold — zelenskyy, urge, support, sanction, put, hold
- 10-20: NPR: 2026 midterms could be the most expensive on record. And, Macron condemns protests ← PBS NewsHour: Macron condemns those who 'sought to bring down the Republic' after rioting mars nationwide p… — macron, condemn, protest
- 10-20: NPR: DOJ charges 28 with voting crimes. And, TikTok ignored staff's child safety concerns ← NPR: DOJ charges 28 in California with voting crimes as election tensions escalate — doj, charge, 28, voting, crime
- 10-21 (same run): NPR: Nigeria confirms an Ebola case in Abuja as a woman arriving from Uganda tests positive ← PBS NewsHour: Nigeria confirms Ebola case in its capital as woman who arrived from Uganda tests positive — nigeria, confirm, ebola, case, woman, uganda, test, positive
- 10-21: BBC US & Canada: US citizen Stephen Hubbard freed by Russia as Trump envoy meets Putin ← BBC World: US envoy to meet Putin in Russia as Zelensky says intelligence sharing 'works now' — russia, envoy, meet, putin

### Caught: same story or work, different angle or later development (30)

Ongoing stories (Houthi strikes on Saudi Arabia, the Pope's recovery), several reviews or
features about one film, and same-publisher series. Readers reported these as repetition too,
but a genuinely new development can be deferred.

- 10-10 (same run): Deadline: ‘14th’ Review: Ava DuVernay’s Impassioned Defense Of Constitution Takes Aim At Trump & Attempted… ← Variety Film: ‘14th’ Review: Ava DuVernay’s Powerful Sequel to ‘13th’ Turns a Constitutional Amendment into… — 14th, ava, duvernay
- 10-11: IndieWire: Ava Duvernay Didn’t Make a Sequel — She Made ‘14th’ ← Variety Film: ‘14th’ Review: Ava DuVernay’s Powerful Sequel to ‘13th’ Turns a Constitutional Amendment into… — ava, duvernay, sequel, 14th
- 10-11 (same run): IndieWire: ‘Wildwood’ Review: Laika’s Epic Stop-Motion Wonder Lacks the Magic of the Studio’s Best Movies ← Deadline: ‘Wildwood’ Review: Carey Mulligan Leads Voice Cast Of Laika’s Ambitious And Visually Stunning Sto… — wildwood, laika, epic, stop, motion
- 10-12: NPR: Russia hits Ukraine gas facilities after Trump claims 'energy ceasefire' ← Deutsche Welle: Trump claims Russia and Ukraine agreed to 'energy ceasefire' — claim, energy, ceasefire
- 10-13: Variety Film: Laika’s ‘Wildwood’ VFX Supervisor Steve Emerson Details the Making of Travis Knight’s Stop-Mo… ← Deadline: ‘Wildwood’ Review: Carey Mulligan Leads Voice Cast Of Laika’s Ambitious And Visually Stunning Sto… — laika, wildwood, stop, motion, epic
- 10-14: PBS NewsHour: White House press secretary's debut brings news of Guilfoyle's exit ← NPR: New White House press secretary a 'devoted fan' of Trump and MAGA — white, house, press, secretary
- 10-14: PBS NewsHour: Iran-backed Houthis strike Saudi oil company Aramco's headquarters, officials say ← PBS NewsHour: Saudi conflict with Houthis escalates with new strikes — houthis, strike, saudi
- 10-15: IndieWire: Netflix Is Finally Reporting Box Office Data. Why Is It Starting with ‘La Bola Negra’? ← Variety Film: Variety’s 2026 Artisans to Watch: ‘Obsession’ Makeup Head, ‘Project Hail Mary’ Animation Supe… — la, bola, negra
- 10-15: Ars Technica: NATO may redeploy anti-drone defenses as attacks sink more Black Sea shipping ← Deutsche Welle: India urges Russia, Ukraine to protect Black Sea shipping — black, sea, shipping
- 10-16: CBC Canada: ‘Crypto King’ spent $16.3M of investor funds on cars, credit cards, jets, security, accountant… ← CBC Canada: Real estate developer testifies he gave 'Crypto King’ Aiden Pleterski $4.5M to invest — crypto, king, testify
- 10-17: PBS NewsHour: DOJ says California officials who process ballots from suspected noncitizens risk prosecution ← PBS NewsHour: Trump administration sues California to block counting of alleged noncitizen mail ballots — california, ballot, noncitizen
- 10-17 (same run): IndieWire: ‘You Can See Everything,’ A24’s Elizabeth Holmes Documentary, Scores an Impressive $1.75 Million… ← Variety Film: Elizabeth Holmes’ Partner Billy Evans Admits ‘She Looks Insane’ in ‘You Can See Everything’ T… — see, everything, elizabeth, holme
- 10-17: Deadline: ‘Whalefall’ Review: Austin Abrams Wrestles With Grief, Toxic Masculinity & Grotesque Whale Innard… ← IndieWire: ‘Whalefall’ Review: Austin Abrams Battles a Bellyful of Daddy Issues in Brutal Survival Thriller — whalefall, austin, abram
- 10-17: Variety Film: ‘Sense and Sensibility’ Costume Designer on Blending Historical Accuracy and Modern Styling f… ← Deadline: Jane Austen Adaptations & Where They Are Streaming: ‘Sense And Sensibility’ To ‘Sanditon’ — sense, sensibility, jane, austen
- 10-17: Global News Canada: Expert says bus model involved in deadly Calgary crash considered ‘extremely safe’ ← Global News Canada: Cause of fiery Calgary bus crash that killed 3 passengers, injured 16 under investigation — bus, calgary, crash
- 10-18: PBS NewsHour: Masked settlers attack European diplomats in the occupied West Bank ← NPR: Israeli settlers beat Palestinians and a U.S. photojournalist in West Bank attacks — settler, attack, west, bank
- 10-18: BBC World: European diplomats attacked by Israeli settlers in West Bank ← NPR: Israeli settlers beat Palestinians and a U.S. photojournalist in West Bank attacks — israeli, settler, west, bank
- 10-18: Variety Film: Box Office: ‘You Can See Everything’ Stuns With $15 Million Debut, ‘Street Fighter’ Leads Wit… ← IndieWire: ‘You Can See Everything,’ A24’s Elizabeth Holmes Documentary, Scores an Impressive $1.75 Million… — see, everything, million
- 10-18: NPR: Pope Leo says he will gradually resume duties after cancer surgery ← NPR: Pope Leo XIV leaves hospital days after lung cancer surgery — pope, leo, cancer, surgery
- 10-18: Variety Film: Box Office: ‘La Bola Negra’ Scores $277,500 From Four Theaters as Netflix Reports Grosses for… ← Deadline: ‘La Bola Negra’ Directing Duo Los Javis Reveal How Spanish Sensation Became “The Journey Of Our L… — la, bola, negra
- 10-18: PBS NewsHour: Pope Leo tells faithful in St. Peter's Square he will gradually resume duties after cancer su… ← NPR: Pope Leo XIV leaves hospital days after lung cancer surgery — pope, leo, cancer, surgery
- 10-19: PBS NewsHour: Egypt's top security body agrees to help Saudi Arabia defend itself against Houthi attacks ← PBS NewsHour: Houthi strikes on Saudi Arabia show the Yemeni rebels' growing strength — saudi, arabia, houthi
- 10-19: PBS NewsHour: Iran-backed Houthi rebels strike Yemen's government forces with ballistic missiles, killing a… ← PBS NewsHour: Houthi strikes on Saudi Arabia show the Yemeni rebels' growing strength — houthi, rebel, strike
- 10-19: AWS Machine Learning: Improve TTFT for multi-turn agentic workloads with bi-directional KV transfer in vLLM ← AWS Machine Learning: Push-based KV transfer to improve TTFT and TPOT for disaggregated inference in vLLM — improve, ttft, kv, transfer, vllm
- 10-20: Variety Film: ‘Percy Jackson’ Stars Will Attend Lucca Comics, Seeking to ‘Get Up Close and Personal With Th… ← Variety Film: Lucca Comics Chief Emanuele Vietina on Celebrating the Crossover Between Movies and Video Gam… — lucca, comic, chief
- 10-20: Variety Film: Why ‘You Can See Everything’ Could Win Best Picture at the Oscars ← Variety Film: ‘You Can See Everything’ Sets Oscar Campaigns for Best Picture, Supporting Actress and More C… — see, everything, best, picture, oscar
- 10-20: PBS NewsHour: News Wrap: Britain sending air support to Saudi Arabia amid Houthi attacks ← PBS NewsHour: Egypt's top security body agrees to help Saudi Arabia defend itself against Houthi attacks — saudi, arabia, houthi, attack
- 10-21: AWS Machine Learning: Build a semantic layer for agentic AI on AWS with Strategy Mosaic and Amazon Bedrock… ← AWS Machine Learning: Build a semantic layer for agentic AI on AWS with AtScale and Amazon Bedrock AgentCore — build, semantic, layer, agentic, agentcore
- 10-22: BBC World: US orders some diplomats to leave Saudi Arabia as Houthi attacks escalate ← PBS NewsHour: News Wrap: Britain sending air support to Saudi Arabia amid Houthi attacks — saudi, arabia, houthi, attack
- 10-22: AWS Machine Learning: Build a semantic layer for agentic AI on AWS with Denodo and Amazon Bedrock AgentCore ← AWS Machine Learning: Build a semantic layer for agentic AI on AWS with AtScale and Amazon Bedrock AgentCore — build, semantic, layer, agentic, agentcore

### False positives: unrelated (9)

- 10-10: Deadline: Marie-Clémentine Dusabejambo On Directing Rwanda’s Oscar Submission ‘Ben’Imana’: “We Need To Unde… ← Deadline: Léa Seydoux & Marie Kreutzer On The “Earthquake” At The Heart Of ‘Gentle Monster’ — Contenders Lo… — marie, contender, london
- 10-12: Deadline: Palme d’Or Prestige: ‘Fjord’ Tops Indie Openers, ‘Naza’ Eyes $500k Surge – Specialty Box Office ← Variety Film: Box Office: ‘The Social Reckoning’ Flops With $5.5 Million Debut, ‘Other Mommy’ Tops Box Offi… — top, box, office
- 10-16: NASA: NASA to Help Unlock Mysteries of Mars’ Moons in Upcoming Mission ← NASA: NASA to Discuss Artemis Acceleration, Status of Upcoming Moon Missions — moon, upcoming, mission
- 10-16: PBS NewsHour: White House press secretary Katie Zacharia leaving the job after Trump casts doubt ← PBS NewsHour: Attorney for banned outlets on legal fight over White House press access — white, house, press
- 10-16: Bank of Canada: Conduct of Monetary Policy under Housing Market Imbalances ← Bank of Canada: Demand roars, supply whispers: Monetary policy and housing in Canada — monetary, policy, housing
- 10-16: Bank of Canada: Beyond "Looking Through": Monetary Policy Responses and Communication Under Supply-Driven I… ← Bank of Canada: Demand roars, supply whispers: Monetary policy and housing in Canada — monetary, policy, supply
- 10-17: PBS NewsHour: News Wrap: Zacharia out as White House press secretary after less than a week on the job ← PBS NewsHour: Attorney for banned outlets on legal fight over White House press access — white, house, press
- 10-19: Variety Film: Julianne Moore Says ‘The Debut’ Is ‘One of the Best Scripts I’ve Ever Read’ as Jesse Eisenber… ← Variety Film: Sergei Loznitsa’s ‘Imperium’ Wins Best Film at BFI London Film Festival — best, london, festival
- 10-20 (same run): The Conversation Canada: Protecting children from harm isn’t enough — welfare systems must support healing… ← The Conversation Canada: Wainwright fire shows the importance of health-care system resilience to Canadian… — system, health, care
