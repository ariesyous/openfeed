# Reviewed editorial corrections — September 18, 2026

These four corrections address confirmed errors from the product review. They do not regenerate an edition or alter the three separate process-commentary corrections from PR #34.

The [correction record](../scripts/fixtures/editorial-integrity-corrections-20260918.json) contains the exact original and replacement posts, SHA-256 content hashes, reasons, checked URLs and source publication dates. Source pages were checked on September 18, 2026; the new comet citation records its actual retrieval time.

| Post | Correction | Verification |
|---|---|---|
| `post-20260918T182557Z-8bc1-5` | Replace 3I/ATLAS with 41P/Tuttle–Giacobini–Kresák, distinguish observational evidence from the proposed mechanism, and frame the research as March 2026. Replace the general Comets landing-page citation with the specific Hubble report. | [NASA Hubble report](https://science.nasa.gov/missions/hubble/nasas-hubble-detects-first-ever-spin-reversal-of-tiny-comet/), March 26, 2026. |
| `post-20260916T223444Z-3323-2` | Restore the *newly formed* qualification to the crater comparison and change the mountain-sized impactor to NASA's building-scale estimate. | [NASA crater report](https://science.nasa.gov/solar-system/moon/nasas-moon-orbiter-spots-new-once-in-century-moon-crater/), September 16, 2026. |
| `post-20260916T135418Z-305e-2` | Correct both the body and Context turn: Dickie is an uncle figure to Tony, who is Johnny's son. | [BFI review](https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos), September 24, 2021. |
| `post-20260917T055240Z-e9e1-4` | Remove the discussion's incorrect 90-sol mission lifetime and unsupported power-loss/Perseverance assertions. Keep a compact description and two perspectives about the image's construction, grounded in the existing photojournal citation. | [NASA photojournal](https://science.nasa.gov/photojournal/curiosity-postcard-celebrates-rovers-5000th-day-on-mars/), September 16, 2026; [NASA mission history](https://www.nasa.gov/history/curiosity-celebrates-10-years-on-mars/), August 8, 2022, establishes the planned Martian-year mission. |

## Reproduction and preservation

From the repository root, run:

```sh
node --import tsx scripts/correctEditorialIntegrity.ts
```

The script accepts only the complete reviewed original or already-corrected version of each post. An unexpected change to any target fails before writing; it also rechecks the loaded files immediately before publication. Successful writes go exclusively through `buildPublishPlan` and `writePublishPlan`. Re-running after successful correction performs no writes.

Post IDs, stored slugs, creation dates, batch dates, manifest order/counts and account data remain unchanged. The comet's historical slug deliberately retains its old wording so existing links continue to resolve. Its format remains `explainer`, and its March 2026 date is explicit in the text. The source provides a publication date without a verified timestamp; the date is recorded above and in the correction fixture, rather than inventing a `publishedAt` time.

The replacement comet URL and normalized source title are appended to durable coverage. The original Comets URL/title remain covered; cycle counts and recent batch summaries remain unchanged. The record preserves the original copy for auditability without retaining it as the reader-facing article.

Tests replay the migration against a temporary copy of the complete catalog, check preservation of every unrelated post and metadata, exercise idempotence, and confirm changed bodies, titles, discussion or citations cannot be silently overwritten. This is a reviewed migration, not an automated factual-correction service.
