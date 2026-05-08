# River Bankers — Structure Effects

Design notes for giving structure cards either **constant** (passive, always-on) or **one-time** (triggered when built) effects. Names are thematic to the river/burrow/dam vocabulary already in `RULES.md`.

> **Trigger convention.** Where a constant effect would otherwise be "once per loop of the time track," use **"when you pass 0 on the time track"** instead — much easier to track. Most pass-0 triggers fire immediately (claim a free thing, peek the deck); a few "bank" a use that lasts until you pass 0 again.

---

## Constant effects (passive, while structure is in play)

### Time-track levers

| Name | Effect |
|------|--------|
| **Otter Slide** | When you build, advance 1 less time (min 1). |
| **Mill Wheel** | When you pass 0, your next action's time cost is halved (round up). |
| **Treaty Stone** | You cannot be lapped. *(Probably the priciest constant — price it high.)* |
| **Sun-Warmed Rock** | When another player laps you, advance 5 instead of being exhausted. |

### Bidding / auction

| Name | Effect |
|------|--------|
| **Lookout Tree** | Peek at the top card of the material deck at any time. |
| **Spy Mound** | When you pass 0, your next auction is resolved with your bid revealed *after* opponents reveal theirs. *(Banks until next pass-0; muskrat-flavored.)* |
| **Otter Raft** | In a jammed auction, workers that didn't clinch refund half their time (round down). |
| **Heron Roost** | When you pass 0, look at the top 2 of the material deck; you may swap one into the empty upstream slot if any. |
| **Driftwood Snag** | When you pass 0, drop 1 blank on any uncovered icon — either on a river card or an upstream-queue card. |

### Material / build

| Name | Effect |
|------|--------|
| **Reed Bed** | Reed icons cost you 1 less time per item (min 1). |
| **Charcoal Pit** | When building, 1 Clay worker may substitute for any other material. |
| **Cattail Marsh** | Each Reed worker you spend on a build counts as 2 reeds. |
| **Wood Pile** | When you pass 0, claim 1 uncovered Log icon from any river card for 0 time. |

### Worker logistics

| Name | Effect |
|------|--------|
| **Mink Tunnel** | When you pass 0, recall one worker from a river card without dropping a blank. |
| **Cache Burrow** | Your hand size is 4 instead of 3. |
| **Granary** | When you pass 0, your next build costs 1 fewer of one listed material (your choice). Banks until used. |
| **Floodgate** | Once per game, before an auction resolves, slide the auctioned card 1 space upstream (cheaper). |

### Shoreline / endgame scoring

| Name | Effect |
|------|--------|
| **Pier** | End game: +1 VP per shoreline card with at least one of your workers on it. |
| **Vine Ladder** | End game: +2 VP per built structure of yours that uses Vines. |
| **Stone Cairn** | End game: +1 VP per distinct material across your built structures (max +5). |

---

## One-time effects (resolve once when built, then dormant)

### Tempo bursts

| Name | Effect |
|------|--------|
| **Royal Lodge** | Take an immediate extra turn after building. |
| **Burrow Run** | Slide your pawn back 5 on the time track. |
| **Snag Pile** | Pull a pre-river card to River 1 for free; an auction immediately runs on it at 0t/item. *(Your bid still costs at the new river rate.)* |

### Worker reshuffle

| Name | Effect |
|------|--------|
| **Otter Den** | Recall all your workers from the river (drop blanks as normal). |
| **Driftwood Catch** | Take any 2 of your workers off river cards (drop blanks). |
| **Sap Drip** | Place 2 free workers from your supply onto any uncovered icons on a single river card. No auction, no time. |

### Information / hand

| Name | Effect |
|------|--------|
| **Vine Lattice** | Draw 3 structure cards, keep 1, discard 2. |
| **Stone Pool** | Look at the top 5 material cards; rearrange them in any order. |
| **Salt Lick** | Look at every opponent's hand of structure cards. |

### Disruption

| Name | Effect |
|------|--------|
| **Beaver Dam** | Wash every card currently in River 1 to the shoreline (carry workers along). |
| **Mud Levee** | Drop 2 blanks on any uncovered icons in the river. |
| **Flush Channel** | Trigger a free upstream-flush (skip the 5⏳ cost; deck still refills and the auction step still runs as normal). |

### Conditional VP (resolved at game end)

| Name | Effect |
|------|--------|
| **Hidden Cache** | +5 VP if your built structures include at least 1 of each material; otherwise +2. |
| **Heron Watch** | +1 VP per shoreline card on the table at game end. |

---

## Tuning notes

- **Pass-0 triggers** are the cleanest cadence — there's already a clear physical event (your pawn crossing the wrap point) so no extra tracking. Banked pass-0 abilities (e.g. Spy Mound) just refresh on each crossing.
- **Constant scaling.** Pass-0 effects scale linearly with how aggressively you advance — players who race the time track get more uses, players who hoard time get fewer. Price them assuming ~2–4 uses per game.
- **One-time effects** are easier to balance: they're effectively a discount on a future action. Cheap structures (2–3 VP) can carry the strong-but-narrow ones (Sap Drip, Burrow Run); reserve full board-reset effects (Beaver Dam, Royal Lodge) for the 7–10 VP slots.
- **Watch list.** Treaty Stone, Royal Lodge, and Floodgate are the most dangerous designs — playtest those first.
- **Species hooks.** Spy Mound (muskrat), Mink Tunnel (mink), Otter Slide / Otter Raft / Otter Den (sea otter), and Beaver Dam (beaver) all lean into the four-species flavor without forcing asymmetric play.
