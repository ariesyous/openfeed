# Card mode implementation and verification

Implements issue #25 using the existing title, body and sources. No content schema,
generator, article body, source batch or permanent URL is changed.

## Reading experience

- Feed / Cards toggle; cards also open at `/openfeed/?view=cards`.
- Cards browse across all topics. The scope is stated above the card.
- Left: a different unseen topic. Right: the next unseen article, preferring variety.
- Touch swipes, header/background mouse drags, keyboard arrows, labelled buttons.
- Text selection and link activation remain native. Cancelled, short, vertical and
  multi-pointer gestures do not advance a card; reduced motion removes animation.
- Undo restores up to 30 previous cards in the current mounted session. It does not
  erase seen history. Returning from an article restores the same card.
- Source links use publisher labels, with full source titles available to assistive
  technology and in tooltips. Discussion remains on the linked article page.

## Content fit

The app uses the dynamic viewport height, safe-area padding, and a flexible reading
area. Body text is at least 1rem. No line clamps, rewritten summaries or text scaling
are used. A ResizeObserver checks the original headline/body against available room,
including changes in text size and viewport dimensions. If it cannot fit, the view
explicitly explains that and links to the full article; it does not silently crop
content, skip the post or mark it as presented. This is an honest fallback for small
screens/large text, not a claim that arbitrary content fits every viewport.

The current 50-post archive's longest body is 174 words. Actual browser fit still
needs verification: the managed browser's security policy rejected both localhost
and local-file preview URLs. Automated DOM tests simulate dimensions to verify the
fit/fallback logic; they do not prove the rendered layout fits real devices.

## Selection and storage

Only visible, fitting cards (including an intentional spoiler gate) are presented.
Fetching/selecting a card and background tabs do not record presentation. Browser
storage holds a versioned list of up to 10,000 recent IDs; session history continues
in memory when writes fail. Retained IDs prevent repeats; clearing storage or rolling
past the retained limit can allow older IDs to appear again. This is not cross-device
history. Explicit Undo and Revisit are the only intended repeats within that history.

Search is bounded to three additional archive chunks per action. Each chunk follows
at most five index pages and fetches at most one batch. A continuation action is
required when the budget is spent. End-of-archive and no-alternative-topic states
have explicit fallback choices. Retries preserve the active card. New editions
require a click to load and never automatically displace it.

## Verification

Automated coverage exercises selection, persistence, corrupt/denied storage,
presentation versus prefetch, hidden tabs, bounded archive continuation, exhaustion,
explicit revisiting, retry, new editions, swipes/cancellation, keyboard/buttons,
Undo, original copy/source links, spoilers, overflow notice, article return and mode
switching. Existing feed/archive/generation checks remain in the full suite.

After deployment, check actual posts at desktop and phone sizes (including 390×844
and 360×740), the longest headlines/bodies, enlarged text and landscape. Verify no
page/internal scrolling, touch accuracy, selectable text, source links, browser Back,
and reduced motion. Record any fit-notice cases honestly; do not change original
content to make a screenshot pass.
