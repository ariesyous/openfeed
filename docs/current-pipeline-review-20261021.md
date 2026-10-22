# Current-pipeline source review — October 21, 2026

This review restarts #36's observation gate on the current pipeline, as proposed in
the October 21 status comment. It also covers #37's unfinished event/angle review
(#37 was closed as superseded). The September WP1/WP2 cohorts stay frozen; nothing
here is added to their counts.

## Scope and sampling

- **Editions:** the five ordinary scheduled editions after the first passage-writer
  run 39323911203, in order. All checked out the same post-#53 code; requested and
  resolved model was `deepseek/deepseek-v4.1-flash`.

| Run | Batch | Checkout | Published |
| --- | --- | --- | --- |
| [39347270767](https://github.com/ariesyous/openfeed/actions/runs/39347270767) | `20261020T002250Z-7d94` | `a6e6389` | 16 |
| [39394485655](https://github.com/ariesyous/openfeed/actions/runs/39394485655) | `20261020T083530Z-de5d` | `7f8336f` | 13 |
| [39438162354](https://github.com/ariesyous/openfeed/actions/runs/39438162354) | `20261020T141937Z-226f` | `a131945` | 13 |
| [39482308447](https://github.com/ariesyous/openfeed/actions/runs/39482308447) | `20261020T191837Z-a41c` | `209e65a` | 19 |
| [39518064365](https://github.com/ariesyous/openfeed/actions/runs/39518064365) | `20261020T235513Z-2bfa` | `4f53f03` | 17 |

- **Sample rule:** the first four posts in publication order from each edition (20
  primary posts, 44 discussion turns), plus the first philosophy post as a culture
  supplement (1 post, 2 turns). Movies is covered by a primary sample.
- **Method:** each title, body and turn was read against its own selected evidence
  from the run's `editorial-support` artifact (still within retention). All 21 linked
  publisher pages were then retrieved (HTTP 200) and the surrounding paragraphs were
  checked for antecedents, attribution, numbers and scope. Full pages stay outside
  the repository.
- **Limits:** this was a single unblinded reviewer (an assistant, not a human fact
  checker) with no baseline comparison. Like earlier audits, it checks support
  against the publisher page, not the truth of the publisher's reporting.

## Result

**No factual errors found in the 20 primary posts or the supplement.** Numbers,
names, attributions and qualifiers matched the source in every unit. Every
reviewer-flagged antecedent check resolved correctly against the full page. Remaining
issues are payoff and clarity, plus one minor discussion premise. None warrants a
correction under the guarded publisher, so no published content was changed.

| Post | Topic | Verdict | Notes |
| --- | --- | --- | --- |
| `post-20261020T002250Z-7d94-0` | World | Supported | Morocco PM. Turnout, proverb and Ramid attribution match. |
| `post-20261020T002250Z-7d94-1` | Science | Supported | CHAPEA dates, habitat size and email-only contact match. |
| `post-20261020T002250Z-7d94-2` | World | Supported | The 22 named storms belong to the eastern Pacific paragraph (verified on page); Isaias is the Atlantic's one hurricane. |
| `post-20261020T002250Z-7d94-3` | Technology | Supported | Plex honeypot timing and both payloads match. |
| `post-20261020T083530Z-de5d-0` | Science | Supported | GRACE mechanism and map dates match. |
| `post-20261020T083530Z-de5d-1` | U.S. | Supported | "A number of them" refers to the 28 charged (page para 22). The request for information comes from the paragraph about the 20,000-name ballot filing; the 28 came from that list, so it's acceptable compression. |
| `post-20261020T083530Z-de5d-2` | U.S. | Supported | Page confirms the 416-foot homer was Díaz's, and that Lowe's RBI single drove in Cleveland's first run. |
| `post-20261020T083530Z-de5d-3` | World | Supported | Albania figures and quotes match; the activist's stance is fairly represented. |
| `post-20261020T141937Z-226f-0` | Technology | Supported | CMA/Apple positions are attributed to each side. |
| `post-20261020T141937Z-226f-1` | Canada | Supported; clarity | Facts match. "Young's decision" never says who Young is (Justice Barbara Young). |
| `post-20261020T141937Z-226f-2` | Economics | Supported | ONS figures match. |
| `post-20261020T141937Z-226f-3` | Technology | Supported | Slate price, range and showroom details match. |
| `post-20261020T191837Z-a41c-0` | Technology | Supported | Google Cloud region, banks and report counts match. |
| `post-20261020T191837Z-a41c-1` | Science | Supported | VIPER and LTV sequencing match; "design intent" is labelled interpretation. |
| `post-20261020T191837Z-a41c-2` | U.S. | Supported | Headline is more cautious than the publisher's ("failed to act"). |
| `post-20261020T191837Z-a41c-3` | Science | Supported; minor turn premise | Body matches. Turn 1's "beat Ingenuity in a wind tunnel" isn't in that turn's evidence. The page credits the Ingenuity range comparison to simulation and doesn't say how the stall comparison was made. |
| `post-20261020T235513Z-2bfa-0` | Technology | Supported | SR-1 details match. |
| `post-20261020T235513Z-2bfa-1` | Technology | Supported; weak payoff | Facts match (page confirms Centerline AI was the Madison County team's). The body stops at "tried a fresh approach" without saying it was Othram's genetic genealogy or that it identified a suspect. Turn 0 says "the company's chief executive" without naming Othram; "Lawrence" is never identified. |
| `post-20261020T235513Z-2bfa-2` | Economics | Supported | Musk quotes, valuations and the 50% hurdle match. |
| `post-20261020T235513Z-2bfa-3` | Movies | Supported | Golden Globes rule and appeal window match. |
| `post-20261020T141937Z-226f-5` (supplement) | Philosophy | Supported; clarity | Villa Diodati facts and the Vampyre reading match. "The group" is never introduced. |

## Event and angle review

The 20 primary posts were compared with every post from October 19–21 (fifteen
editions). **No primary sample repeats an earlier event angle.** The DOJ charges
were followed a day later by a separate ballot-segregation filing
(`20261021T045233Z-b699-11`), which is a new development. The Michael awards-category
post follows an October 19 post about the actor's preparation, a different angle.

Outside the fixed sample:

- **Confirmed repeated angle, source-eligibility gap.** `20261019T045037Z-a30d-10`
  and `20261020T141937Z-226f-6` both argue that Alberta's and Québec's independence
  movements differ. Both cite The Conversation article **294387**. The publisher
  reused the article ID under a new slug after the vote, so durable URL coverage and
  normalized-title coverage both missed it. A fix would key The Conversation sources
  by their numeric article ID. This is a generator change and was not made here.
- **Overlap, distinct angles.** `20261020T002250Z-7d94-4` (Seyfried awards campaign)
  and `20261020T235513Z-2bfa-11` (box-office record) are different Variety articles
  about the same documentary, and both repeat its $15 million opening.
  `20261021T045233Z-b699-15` and `-16` cover the Nigeria Ebola case from PBS and NPR
  in the same edition, from different angles.
- **Concentration, not repetition.** Alberta referendum coverage appears in six posts
  across three days, mostly new developments. KV-cache and AWS SageMaker/Bedrock items
  recur in ai_agents.

## Gate accounting

- 20 primary source checks across 5 ordinary editions: **met**.
- Discussion included (44 primary turns, 2 supplemental): **met**.
- Two culture topics (movies, philosophy): **met**.
- Unavailable pages: **none in this cohort**; all 21 pages were retrieved. The
  older unresolved CBC Alberta, CBC Morrisseau and AWS inference checks belong to the
  frozen WP1 cohort and remain unresolved there. They are not part of this gate.
- New errors and source eligibility: **assessed**. No factual errors; one
  dedup gap (above); recurring payoff/clarity weaknesses where a body withholds the
  detail its title promises or uses an unintroduced name.

This is one reviewer's sample of 21 posts, not proof of general accuracy or
sustained yield. The mandatory model review remains fallible, and provenance plus
model approval are still not human fact-checking.
