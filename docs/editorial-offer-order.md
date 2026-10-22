# Offer order: lasting and under-covered topics earlier — October 22, 2026

The user asked for lasting (shelf) reading and under-covered topics to be offered
earlier, specifically The Sopranos, mythology and philosophy. They asked for a
**preference, not a quota**. This changes only the order in which candidates reach
the writer. Every check, cap and budget is unchanged.

## Why the mix stayed news-heavy

After the October 22 supply fixes ([source supply review](source-supply-review-20261022.md)),
run 39722415520 had 77 usable sources, including all 33 new shelf pages, and published
20 of 20. Even so, only 2 shelf pages were used, 11 of 20 posts were news, and no
philosophy was published.

Two things caused this:
- **Topic order.** Each two-post writer call is offered four sources, picked
  round-robin across topics in the order topics first appear in intake. Feed
  articles are collected before shelf pages, so the same leading topics filled the
  four slots on every call.
- **Excerpt length.** Within a topic, the longest excerpt won. A full feed article
  of up to 6,000 characters always beat a shelf page.

## Ordering

`orderOfferCandidates` (`generator/editorial/offerOrder.ts`) orders the candidates
before `prepareEvidence`. That function then keeps the given order within each topic
(`keepTopicOrder`). Revisions keep their existing priority.

1. **Topics** are ordered by, in turn:
   - fewest accepted posts so far in this run;
   - fewest offers so far in this run;
   - the preferred list (The Sopranos, Greek & Roman mythology, philosophy);
   - original intake order.
2. **Sources within a topic** are ordered by, in turn:
   - fewest offers so far in this run;
   - shelf (evergreen) pages before feed items;
   - longer context first.

So the first call offers the preferred topics. After that, topics rotate:
- each topic is offered once before any is offered twice;
- a topic the writer passes over waits its turn instead of holding a slot;
- a source the writer passes over yields to its topic's next candidate.

Offer counts last only for the run. Nothing is filtered, deferred or marked
covered by this ordering.

## Unchanged

- The writer still chooses what to write, or nothing.
- Unchanged checks and caps:
  - evidence, freshness, provenance and coverage checks;
  - mandatory review;
  - citation caps;
  - the two-sources-per-publisher-group limit.
- Unchanged budgets: the 20-post ceiling, 32 calls and the 45-minute deadline.

The publisher limit naturally paces the shelf. For example, at most two Stanford
Encyclopedia, JSTOR Daily, Aeon or Guardian sources can be used per edition.
Other callers of `prepareEvidence` keep longest-first ordering within a topic.

## Verification and limits

`generator/__tests__/offerOrder.test.ts` covers the ordering rules. A mocked
generation run (long sectioned news contexts first in intake, shelf pages last)
checks that:
- the first call includes all three preferred topics;
- every topic is offered once before any repeats;
- preferred topics publish;
- news topics also publish;
- source URLs stay distinct.

This shows ordering, not live yield or quality. The real mix depends on what the
writer chooses and what review approves, so it should be checked on the next
ordinary editions.
