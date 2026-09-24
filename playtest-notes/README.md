# Scripted web playtests: driver pitfalls

Claude playtests `web/index.html` by driving it through Playwright and reading
the page as text. Several "bugs" reported in past logs came from the driver
itself, not from the game. **Check this list before reporting a UI bug.**

## False positives that keep coming back

1. **The "stray /" before wildcard names is not a bug.** It has been reported in
   2026-09-07, 09-20, 09-22 and 09-23, and every time it was a false positive.
   `cardMatIcons()` renders a wildcard as `<svg>/<svg>`, which is two material
   icons with a slash between them, i.e. "logs OR reeds". `innerText` drops the
   SVGs and keeps the slash, so scraped text reads "Your bid — / Driftwood
   Tangle". On screen it shows correctly as icon/icon. Log lines already strip
   it (`data-strip`). **Only report it if a screenshot shows a bare slash.**
2. **Native `alert()` on an under-supplied bid.** The Submit button is disabled
   while recalls are short. Calling `state.humanBidContext.submit()` directly
   skips that check and falls through to the alert.
3. **The background image stopping at about 1200px** in full-page screenshots.
   The background is `background-attachment: fixed`, so Playwright paints it
   only over the first viewport.

## Driver hazards

- **Never `page.evaluate` a human action that can open a modal.**
  `humanSelectBuild(i)` (Spillway, Stone Pool, Burrow Network…) and other
  `human*` calls return a promise that waits for a modal click. `evaluate`
  awaits it, and a single-threaded driver deadlocks. Fire actions
  asynchronously instead: `setTimeout(() => { humanSelectBuild(0) }, 0)`.
  Then poll for `.modal` and click its buttons.
- **Call the dispatcher, not the inner `human*` function, for Flush.** The
  Flush button runs `humanFlushUpstream().then(() => humanResolver())`.
  Calling `humanFlushUpstream()` directly skips the resolver, and after the
  flush auction the game sits at `phase=idle` with nobody acting. It looks
  like a stall bug, but it isn't. Recover with
  `setTimeout(() => humanResolver(), 0)` (2026-09-23 3P #6).
- **The setup-screen radios are hidden inputs styled by their labels.** Set
  `.checked = true` and dispatch `change`; clicking `#role-<species>-you`
  directly fails.
- **Another session's driver may already hold the port.** Use a different one
  rather than killing a process you didn't start.
