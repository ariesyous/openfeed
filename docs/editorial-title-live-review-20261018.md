# Title attribution and open discussions: live follow-up

**The tighter reviewer caught a real attribution error and kept the banter. The
fresh edition is worth reading in parts, but is not consistently finished copy.**
Seven posts and fifteen discussion turns were published; one candidate was withheld.
Three published bodies expose internal evidence IDs. Some approved claims agree with
the full publisher page but lack support in their unit's selected evidence. The new
title controls passed, which is narrower evidence than a general accuracy guarantee.

## Deployment and UI

Implementation `a0896ff1e9deabb294ba3592105ba502aee273a7` deployed in
[39149474212](https://github.com/ariesyous/openfeed/actions/runs/39149474212).
Typecheck, lint, all 321 Linux tests and build passed. Locally, typecheck/lint/build
passed, with the seven existing Windows symlink/path/CRLF test failures; new tests passed.

Live reviews must copy the exact title and record its actor, the selected source's
actor, and their relationship. A mismatch must reject the title for misattribution.
An accurate body cannot repair the headline. This detects inconsistent review traces;
recognizing the actor and evaluating meaning remain model judgments. Historical audit
records remain readable without the new trace.

The deployed feed was checked in the browser: all ordinary discussions started
expanded without clicking; collapse and reopen worked. Tests verify that both turns
remain hidden on spoiler-marked posts until Show spoilers, then open together.
Card mode and its link to the full discussion remain unchanged.
After the fresh edition deployed, the browser showed seven expanded discussions and
zero collapsed discussion controls on initial load.

## Live controls

[Control run 39149494765](https://github.com/ariesyous/openfeed/actions/runs/39149494765)
requested and resolved `deepseek/deepseek-v4.1-flash`. Both four-post suites passed
on their first attempt: two calls, 16.5 seconds, no publication or coverage changes.

| Deliberate error | Result |
| --- | --- |
| Dangerous people expected to be friendly instead of nasty | Rejected: reversed fact |
| No possible help for households outside professional contact | Rejected: unsupported absolute |
| Documentary credited with the jury's praise | Rejected: title misattribution |
| Director credited with the jury's praise | Rejected: title misattribution |

The four supported/opinionated counterparts passed, including the villain-costume
joke, referral skepticism, correct jury attribution and a playful editorial title.
Both turns on the title-error candidates were independently approved; rejection was
about their headlines, not their opinions. These controls mirror prompt examples,
so they are not an unseen benchmark or a measured false-positive/false-negative rate.

## Fresh edition

[Manual generation 39149634407](https://github.com/ariesyous/openfeed/actions/runs/39149634407)
checked out `a0896ff`. Writer and reviewer requested and resolved DeepSeek V4.1 Flash.
Publication commit `deeefe968e01ce7b7ca57b4b369a55c57e73b12c` contains batch
`20261018T172715Z-7712`; [edition deployment 39150760444](https://github.com/ariesyous/openfeed/actions/runs/39150760444)
succeeded. The live batch matches the frozen edition. All seven article pages return
HTTP 200 and contain every discussion turn. Published prose/support digests match
the accepted review records.

Intake had 38 unused candidates, selected 14 for context and accepted 11; eight were
offered initially. The nine remaining evergreen shelf candidates yielded no usable
pages. Three writer calls produced eight drafts. Four reviewer calls included one
validation retry: a no-attributed-claim trace incorrectly contained actor/source fields.
The corrected review passed. Seven of eight shared calls were used; generation stopped
because the remaining slot could not cover both another writer and review call.
There were no provider failures, empty selections or dropped discussions.

Generation took 840 seconds. Review accounted for approximately 608 seconds across
four calls, including the retry. This run's latency came mainly from review, unlike
the previous edition's writer failures. The eight-post ceiling remains a ceiling.

The withheld post concerned photographer Heidi Levine. Its final turn said the
ambassador's demand was one she cited. The [AP report carried by PBS](https://www.pbs.org/newshour/world/photographer-attacked-by-settlers-in-the-west-bank-feels-insulted-by-netanyahu)
reports the ambassador's statement separately; it does not establish Levine invoked
it. I agree with the rejection. Only the bounded offending fragment, title, decisions
and selected support survive, so this is not a retrospective review of the full
rejected draft. No fresh title was rejected: the title-specific interception evidence
comes from the controls, while the ordinary fresh candidate demonstrated discussion
attribution enforcement.

## Manual reading and support audit

All eight publisher pages were retrieved with HTTP 200. All 83 selected snippets,
including the withheld candidate's support, match their pages. Five pages used the
production adapters for this check. Ars and the two Conversation pages were manually
read from retrieved HTML paragraphs because they have no production article adapter;
generation admitted their substantial feed prose. The initial helper's zero-section
results for those three pages therefore do not mean retrieval failed. No parser was
relaxed. Full fetched pages remain ignored local artifacts.

| Post | Reading assessment and remaining issue |
| --- | --- |
| Netflix box office | Correct actor, figures, planned window and comparison. Discussion adds awards strategy and selective disclosure. Remove leaked evidence markers and the redundant final body sentence. |
| Anthropic/METR | Correct access/actor facts; useful access-versus-independence debate. It omits material safeguards in the full page: no Anthropic payment, no company publication veto, and specified redaction rights. Those details need selected support before use. Also leaks IDs. |
| Alberta separatism | Useful attributed explanation of entering governing parties; the reply adds ballot complexity. Leaks IDs. The speculation that the prize was never the vote is more absolute than its evidence warrants, despite being framed as an inference. |
| Pope Leo XIV | Concise, source-aligned report. The exchange distinguishes a visitor's miracle reaction from gratitude, but the claim that the pope did not frame his own recovery is too strong given his reported words about the delicate phase being behind him. The visitor attribution also needs its surrounding selected sentence. |
| Whisky tourism | Strongest qualification handling: reports both perceived barriers and mostly pleasant personal experience, then adds regional youth retention. Retain the editorial approach; complete the selected sentence group that currently stops before the qualification's final clause. |
| Confiscated turtles | Concrete story plus a useful legal reform discussion. The headline's reporting-law premise and several discussion facts are absent from their selected IDs, although on the full page. The reviewer approves them anyway. Tighten “law stops asking” to the actual public-reporting gap. |
| Georgina Cates | The June/October distinction avoids suggesting a newly occurring death. The three turns respond to one another. The long body includes birth/family/move details absent from its selected IDs and borrows tribute details selected only for the final turn. Shorter body, complete support. |

The pope source itself contains a timing inconsistency: it says four days after surgery
but later names Tuesday in a report about Sunday. The generator reproduces the source's
four-day wording. This audit establishes publisher agreement, not independent medical,
legal, political or event verification.

Bodies total 742 words; discussions total 803 across fifteen turns (about 54 words
each). This is a longer exchange style than the previous edition's roughly 28 words
per turn. Most turns contribute a specific inference, challenge or detail, but the
turtle pair reads more as sequential explanation than banter. No forced joke is needed.
The current failure is not simply insufficient context: the reviewer sometimes treats
unselected context or another turn's support as permission for a factual clause.

Priority follow-ups are narrowly detecting leaked citation syntax while preserving
TV episode notation, enforcing clause-level support within each unit's selected IDs,
and carrying material countervailing context into debates. Keep the humor and opinions.
This audit did not rewrite any historical or fresh published prose and does not advance
the scheduled/free-router observation cohorts.

## Retained evidence

The [ledger](fixtures/editorial-title-review-ledger-20261018.json) covers every title,
body claim group and discussion turn, alongside digest/source/live checks. Snapshots:
[edition](fixtures/editorial-title-review-edition-20261018.json),
[selected support](fixtures/editorial-title-review-support-20261018.json),
[review decisions](fixtures/editorial-title-review-decisions-20261018.json), and
[live controls](fixtures/editorial-title-review-controls-20261018.json).
Generation artifact `12145510505` expires November 1 at 17:41:33 UTC; control artifact
`12144637505` expires November 1 at 17:25:42 UTC. Bounded snapshots preserve the evidence
beyond those expirations; raw completions and full reading context are not retained here.
