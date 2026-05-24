# River Bankers — Structure Effects

Design notes for giving structure cards either **constant** (passive, always-on) or **one-time** (triggered when built) effects. Names are thematic to the river/burrow/dam vocabulary already in `RULES.md`.

> **Trigger convention.** Where a constant effect would otherwise be "once per loop of the fish track," use **"when you pass 0 on the fish track"** instead — much easier to track. Most pass-0 triggers fire immediately (claim a free thing, peek the deck); a few "bank" a use that lasts until you pass 0 again.

---

## Constant effects (passive, while structure is in play)

### Fish-track levers

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Otter Slide** | 2 mud, 1 log | 1🐟 | When you build, advance 3 fewer fish (min 1). |
| **Mill Wheel** | 3 logs, 3 stones | 4🐟 | Any time you would pass 0 on the fish track, stop at space 1 instead. |
| **Slipstream** | 2 mud, 2 vines | 3🐟 | Once per game, take a turn immediately after another player takes their turn, even if you are not next on the fish track. |

### Bidding / auction

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Lookout Tree** | 5 logs, 2 stones | 4🐟 | Peek at the top card of the material deck at any time. |
| **Spy Mound** | 4 stones, 1 clay | 3🐟 | Once per game, you may decide your auction bid after the other players have revealed their bids. |
| **Otter Raft** | 4 logs, 1 reed | 3🐟 | Whenever you place fewer workers than your bid due to a jammed auction, pay fish for one fewer worker. |
| **Heron Roost** | 3 reeds, 2 vines | 3🐟 | At the start of your turn you may pay 1 fish to replace a Headwaters card of your choice with the top card of the material deck.  The replaced card is discarded. |
| **Driftwood Snag** | 2 logs, 2 reeds, 1 mud | 3🐟 | At the start of your turn you may pay 1 fish to add a blank to any uncovered icon — either on the river or in the Headwaters. |

### Material / build

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Reed Bed** | 3 reeds, 1 mud | 2🐟 | Reed icons cost you 1 less fish per item (min 1). |
| **Charcoal Pit** | 4 clay, 2 logs | 3🐟 | When building, 1 Clay worker may substitute for any other material. |
| **Cattail Marsh** | 4 reeds, 2 mud | 3🐟 | Each Reed worker you spend on a build counts as 2 reeds. |
| **Treaty Stone** | 3 stones, 2 clay | 3🐟 | When building, you may spend 2 of any one material as 1 of any other material. Once per build. |
| **Wood Pile** | 4 logs | 2🐟 | When you pass 0, claim 1 uncovered Log icon from any river card for 1🐟. |

### Worker logistics

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Hollowed-out Log** | 3 logs, 1 reed | 2🐟 | When you pass 0, recall one worker from a river card without dropping a blank. |
| **Pack Rat Burrow** | 2 reeds, 2 mud | 2🐟 | When you pass 0 on the fish track, you may discard 1 structure from your hand and take a structure of your choice from the discard pile. |
| **Cache Burrow** | 2 mud, 2 reeds | 2🐟 | Your hand size is 4 instead of 3. |
| **Granary** | 4 reeds, 1 clay | 3🐟 | Once per game, your build costs 1 fewer of one listed material (your choice). |
| **Floodgate** | 4 mud, 3 clay | 4🐟 | Once per game, before an auction resolves, slide the auctioned card 1 space upstream — toward the Headwaters (cheaper). |
| **Otter Den** | 3 mud, 1 vine | 2🐟 | When you recall your workers, move backwards on the fish card by the number of recalled workers. |

### Shoreline / endgame scoring

> **Print convention.** Any card whose VP comes from its effect prints **VP: *** (asterisk). The "*" refers to the effect text. These cards' baseline printed VP is treated as 0 so the effect determines the entire contribution.

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Pier** | 3 logs, 2 stones | 3🐟 | End game: +2 VP per shoreline card with at least one of your workers on it (max +6). |
| **Vine Ladder** | 4 vines, 2 stones | 4🐟 | End game: +4 VP per built structure of yours that uses Vines. |
| **Cattail Patch** | 3 reeds, 2 mud | 3🐟 | End game: 1/1/2/3/5/8 VP for 1/2/3/4/5/6 distinct materials across your built structures. |

---

## One-time effects (resolve once when built, then dormant)

### Tempo bursts

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Royal Lodge** | 6 logs, 2 vines | 5🐟 | Take an immediate extra turn after building. |
| **Burrow Run** | 3 vines, 1 mud | 0🐟 | Slide your pawn back 5 on the fish track. |
| **Snag Pile** | 2 reeds, 1 stone | 2🐟 | Pull a Headwaters card to River 1 for free; an auction immediately runs on it at 1🐟/item. *(Your bid still costs at the new river rate.)* |

### Worker reshuffle

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Sap Drip** | 2 logs, 2 vines | 2🐟 | Place 2 free workers from your supply onto any uncovered icons on a single river card. No auction, no fish. |

### Information / hand

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Vine Lattice** | 3 vines, 2 reeds | 3🐟 | Draw 3 structure cards, keep 1, discard 2. |
| **Stone Pool** | 3 stones, 2 clay | 3🐟 | Look at the top 5 material cards; rearrange them in any order. |
| **Salt Lick** | 3 stones, 2 logs, 1 clay | 3🐟 | Look at every opponent's hand of structure cards. |

### Disruption

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Beaver Dam** | 4 logs, 2 mud | 2🐟 | Wash **one** River 1 card of your choice to the shoreline (workers carry along). Slide back 2🐟 on the fish track. |
| **Mud Levee** | 3 mud, 2 stones | 3🐟 | Drop 2 blanks on any uncovered icons in the river. |
| **Flush Channel** | 4 mud, 1 reed | 2🐟 | Discard 1 Headwaters card of your choice (out of game). Refill that slot from the top of the material deck. No auction. |

### Conditional VP (resolved at game end)

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Hidden Cache** | 2 vines, 2 stones, 2 clay | 3🐟 | +3 VP per 2 distinct materials in your built structures (max +9). |
| **Heron Watch** | 4 stones, 2 logs | 4🐟 | End game: +1 VP per shoreline card on the table, max +9 VP. |

---

## Pure-VP card name ideas

Names reserved for plain monument cards — no special effect, just material cost → VP. Costs and VP TBD.

- **Granite Spire**
- **Twig Bridge**
- **Reed Snare**
- **Stone Hearth**
- **Sun-Warmed Rock**
- **Stone Cairn**

---

## Proposed (pre-sim) — novel-action cards

Brainstormed in `games/board-games.org` ("Design more structure cards with novel action shapes"). First-pass costs below; need AI-loop simulation to validate before promoting into the tables above.

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Otter Trail** | 3 vines, 2 stones | 3🐟 | At the start of your turn, pick one of your workers on a river card A and another worker (yours or an opponent's) on a different river card B. Pay A's per-item cost in fish; swap the two workers. No blanks drop. |
| **Tribute Stone** | 2 clay, 2 stones | 3🐟 | Once per game, at the start of your turn, force an opponent to recall one of their workers from the river. The opponent slides back 3🐟 in compensation. |
| **Salmon Run** | 4 logs, 2 vines | 4🐟 | As your main action, place 1–5 workers from your supply onto uncovered icons of a single river card (no auction). Cumulative fish cost for 1/2/3/4/5 workers placed is 2🐟 / 5🐟 / 10🐟 / 18🐟 / 31🐟 (marginal: 2/3/5/8/13). |
| **Beaver Tow** | 4 mud, 2 clay, 1 vine | 4🐟 | As your main action, pay 2🐟 to slide a river card one slot upstream (toward the Headwaters). |

**Pricing anchors:**
- *Otter Trail* ↔ Heron Roost (3 reeds, 2 vines, 3🐟) — same utility footprint; the per-item cost gates abuse so no per-turn cap is needed in the first draft.
- *Tribute Stone* ↔ Spy Mound (4 stones, 1 clay, 3🐟) — same once-per-game anti-opponent footprint; slightly cheaper because the 3🐟 compensation softens the attack. Other "mean-with-comp" variants worth simming: discard from hand for 2🐟, steal a Headwaters card for 4🐟.
- *Salmon Run* ↔ Royal Lodge (6 logs, 2 vines, 5🐟) — one tier down on time/mats because each use is a main action, not a free extra turn. Fibonacci-ish escalation caps practical use at 3–4 workers (10🐟 for 3, 18🐟 for 4).
- *Beaver Tow* ↔ Floodgate (4 mud, 3 clay, 4🐟) — repeatable version swaps 1 clay for 1 vine to widen material draw; per-use 2🐟 self-limits.

**Watch list.** Salmon Run and Beaver Tow both bypass core auction tension — sim first; expect retuning.

---

## Tuning notes

- **Pass-0 triggers** are the cleanest cadence — there's already a clear physical event (your pawn crossing the wrap point) so no extra tracking. Banked pass-0 abilities (e.g. Spy Mound) just refresh on each crossing.
- **Constant scaling.** Pass-0 effects scale linearly with how aggressively you advance — players who race the fish track get more uses, players who hoard fish get fewer. Price them assuming ~2–4 uses per game.
- **One-time effects** are easier to balance: they're effectively a discount on a future action. Cheap structures (2–3 VP) can carry the strong-but-narrow ones (Sap Drip, Burrow Run); reserve full board-reset effects (Beaver Dam, Royal Lodge) for the 7–10 VP slots.
- **Watch list.** Royal Lodge and Floodgate are the most dangerous designs — playtest those first.
