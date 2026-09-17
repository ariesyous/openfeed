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

The app uses dynamic viewport height, safe-area padding, compact mobile spacing,
and a flexible reading area. After the user's mobile feedback, `fitCardText` now
measures the unchanged headline/body and finds the largest fitting font scale with
an eight-step binary search before paint. Body text scales down to .8125rem (13px
with a 16px root); the floor follows the root font setting. A ResizeObserver
recalculates on layout changes and restores the normal size when space increases.
No line clamps, summaries or scrolling are introduced. If even the minimum cannot
fit, the existing explicit article-link notice remains and the card is not marked
presented. Arbitrary content cannot be guaranteed to fit every screen/text setting.

Mobile swipes can start on linked headlines and sources; taps still open links.
The card reserves single-finger movement for gestures while preserving pinch zoom
(`touch-action: pinch-zoom`). Movement is more forgiving of diagonal paths and
shorter distances; vertical, cancelled and multi-pointer gestures do not advance.
Transferring implicit touch capture from a child to the card no longer cancels the
swipe when the child's lost-capture event bubbles. Delayed clicks after a drag
are suppressed. Mouse links and body text retain native interaction.

The original version passed desktop live checks at 1363×936, but the user reported
failed phone swipes, overflow notices and a two-card loop. Desktop checks did not
validate mobile behavior. Localhost/local-file previews remain blocked by the
managed browser's security policy; the current browser has no mobile emulation
API. Automated layout tests simulate reflow and are not real-device verification.

## Selection and storage

Only visible, fitting cards (including an intentional spoiler gate) are presented.
Fetching/selecting a card and background tabs do not record presentation. Browser
storage holds a versioned list of up to 10,000 recent IDs; session history continues
in memory when writes fail. Retained IDs prevent repeats; clearing storage or rolling
past the retained limit can allow older IDs to appear again. This is not cross-device
history. Explicit Undo and Revisit are the only intended repeats within that history.

Explicitly advancing also excludes the departing card for the mounted session,
even if it did not fit and was never presented. This fixes the two-card loop where
unfit cards repeatedly selected each other instead of reaching the rest of the
archive. Session exclusions are not persisted as seen; Revisit clears them.

Search is bounded to three additional archive chunks per action. Each chunk follows
at most five index pages and fetches at most one batch. A continuation action is
required when the budget is spent. End-of-archive and no-alternative-topic states
have explicit fallback choices. Retries preserve the active card. New editions
require a click to load and never automatically displace it.

## Verification

Automated coverage exercises selection, persistence, corrupt/denied storage,
presentation versus prefetch, hidden tabs, bounded archive continuation, exhaustion,
explicit revisiting, retry, new editions, swipes/cancellation, keyboard/buttons,
Undo, original copy/source links, spoilers, adaptive sizing/resizing, overflow
notice, skipped-unfit-card archive progression, touch capture transfer, headline
swipes versus taps, multi-touch, article return and mode switching. Existing feed/archive/generation checks remain in the full suite.

After deployment, check actual posts at desktop and phone sizes (including 390×844
and 360×740), the longest headlines/bodies, enlarged text and landscape. Verify no
page/internal scrolling, touch accuracy, selectable text, source links, browser Back,
and reduced motion. Record any fit-notice cases honestly; do not change original
content to make a screenshot pass.
