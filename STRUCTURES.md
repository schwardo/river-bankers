# River Bankers — Structure Effects

Design notes for giving structure cards either **constant** (passive, always-on) or **one-time** (triggered when built) effects. Names are thematic to the river/burrow/dam vocabulary already in `rulebook/rulebook.html`.

> **Trigger convention.** Where a constant effect would otherwise be "once per loop of the fish track," use **"when you pass 0 on the fish track"** instead — much easier to track. Most pass-0 triggers fire immediately (claim a free thing, peek the deck); a few "bank" a use that lasts until you pass 0 again.

---

## Constant effects (passive, while structure is in play)

### Fish-track levers

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Log Flume** | 2 mud, 1 log | 1🐟 | When you build: advance 3 fewer 🐟 (min 1). |
| **Mill Wheel** | 3 logs, 2 stones | 4🐟 | When built: activate one "when built" effect of a built structure controlled by the player to your left or right. As an action: activate the "as an action" ability of a built structure controlled by the player to your left or right. |
| **Slipstream** | 2 mud, 2 vines | 3🐟 | Once per game (flip card): take a turn immediately after another player, even if you are not next on 🐟 track. |

### Bidding / auction

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Lookout Tree** | 5 logs, 2 stones | 4🐟 | Peek at the top of the material deck at any time. |
| **Spy Mound** | 4 stones, 1 clay | 3🐟 | Once per game (flip card): decide your auction bid after the other players reveal theirs. |
| **Pontoon** | 4 logs, 1 reed | 3🐟 | When a jammed auction makes you place fewer workers than your bid, pay 🐟 for one fewer worker. |
| **Heron Roost** | 3 reeds, 2 vines | 3🐟 | As an action: pay 1🐟 to replace a Headwaters card with the top of the material deck. |
| **Driftwood Snag** | 2 logs, 2 reeds, 1 mud | 3🐟 | As an action: pay 1🐟 to add a blank to any uncovered icon. |

### Material / build

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Reed Bed** | 3 reeds, 1 mud | 2🐟 | Reed icons cost you 1 less 🐟 per item (min 1). |
| **Charcoal Pit** | 4 clay, 2 logs | 3🐟 | When you build: 1 of your Clay workers may substitute for any other material. |
| **Cattail Marsh** | 4 reeds, 2 mud | 3🐟 | When you build: each Reed worker counts as 2 reeds. |
| **Treaty Stone** | 3 stones, 2 clay | 3🐟 | When you build: you may spend 2 of any one material as 1 of any other. Once per build. |
| **Wood Pile** | 4 logs | 2🐟 | Once per game (flip card): claim 1 uncovered Log icon from any river card for 1🐟. |

### Worker logistics

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Hollowed-out Log** | 3 logs, 1 reed | 2🐟 | Once per game (flip card): recall one worker from a river card (no blank). |
| **Pack Rat Burrow** | 2 reeds, 2 mud | 2🐟 | Once per game (flip card): discard 1 structure from your hand and take one of your choice from the discard pile. |
| **Cache Burrow** | 2 mud, 2 reeds | 2🐟 | +1 to your hand size. When built, draw a structure card. |
| **Granary** | 4 reeds, 1 clay | 3🐟 | Once per game (flip card): your build costs 1 fewer of one listed material. |
| **Floodgate** | 4 mud, 3 clay | 4🐟 | Once per game (flip card): before an auction resolves, slide the auctioned card 1 space toward the Headwaters. |
| **Streambank Hollow** | 3 mud, 1 vine | 2🐟 | When you recall workers before an auction, slide back 1🐟 per worker recalled. |

### Shoreline / endgame scoring

> **Print convention.** Any card whose VP comes from its effect prints **VP: *** (asterisk). The "*" refers to the effect text. These cards' baseline printed VP is treated as 0 so the effect determines the entire contribution.

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Pier** | 3 logs, 2 stones | 3🐟 | End of game: +2 VP per shoreline card with at least one of your workers. |
| **Vine Ladder** | 4 vines, 2 stones | 4🐟 | End of game: +4 VP per built structure of yours that uses Vines (max +12). |
| **Vine Trellis** | 3 vines, 1 stone | 2🐟 | When you build a structure that uses Vines: slide back 1🐟. End of game: +2 VP per built structure of yours that uses Vines. |
| **Stone Causeway** | 3 stones, 2 logs | 3🐟 | When you build a structure that uses Stones: draw 1 structure card and discard 1. End of game: +2 VP per built structure of yours that uses Stones (max +8). |
| **Reed Walkway** | 4 reeds, 1 mud | 3🐟 | When you build a structure that uses Reeds: place 1 free worker on a River 1 card. End of game: +2 VP per built structure of yours that uses Reeds. |
| **Clay Vault** | 3 clay, 2 vines | 3🐟 | When you build a structure that uses Clay: peek at the top of the structure deck; you may swap it with 1 card from your hand. End of game: +3 VP per built structure of yours that uses Clay (max +12). |
| **Burrow Network** | 3 mud, 2 reeds | 2🐟 | When you build a structure that uses Mud: move one of your workers to another river card with at least one of your workers (may replace a blank). End of game: +3 VP per built structure of yours that uses Mud (max +9). |
| **Cattail Patch** | 3 reeds, 2 mud | 3🐟 | End of game: VP equal to 1/1/2/3/5/8 for 1/2/3/4/5/6 distinct materials across your built structures. |

---

## One-time effects (resolve once when built, then dormant)

### Tempo bursts

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Royal Lodge** | 6 logs, 2 vines | 5🐟 | When built: take an immediate extra turn. |
| **Burrow Run** | 3 vines, 1 mud | 0🐟 | When built: slide your pawn back 5 on 🐟 track. |
| **Snag Pile** | 2 reeds, 1 stone | 2🐟 | When built: pull a Headwaters card to River 1; run an auction on it at 1🐟/item. |

### Worker reshuffle

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Sap Drip** | 2 logs, 2 vines | 2🐟 | When built: place 2 free workers from your supply onto uncovered icons of one river card. |

### Information / hand

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Vine Lattice** | 3 vines, 2 reeds | 3🐟 | When built: draw 3 structure cards, keep 1, discard 2. |
| **Stone Pool** | 3 stones, 2 clay | 3🐟 | When built: look at the top 5 material cards and rearrange them in any order. |
| **Salt Lick** | 3 stones, 2 logs, 1 clay | 3🐟 | When built: look at every opponent's hand of structure cards. |

### Disruption

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Spillway** | 4 logs, 2 mud | 0🐟 | When built: wash one card from River 1 to the shoreline (workers carry along). |
| **Mud Levee** | 3 mud, 2 stones | 3🐟 | When built: drop 2 blanks on uncovered icons in the river. |
| **Flush Channel** | 3 mud, 1 reed | 2🐟 | When built: discard 1 Headwaters card (out of game) and refill that slot from the material deck. No auction. |

### Conditional VP (resolved at game end)

| Name | Cost | Time | Effect |
|------|------|------|--------|
| **Hidden Cache** | 2 vines, 3 stones, 2 clay | 3🐟 | End of game: +3 VP per 2 distinct materials in your built structures (max +9). |
| **Heron Watch** | 4 stones, 2 logs | 4🐟 | End of game: +1 VP per shoreline card on the table (max +6). |

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
| **Portage** | 3 vines, 2 stones | 3🐟 | As an action: swap one of your workers on a river card with another worker on a different river card. Pay the source card's per-item cost in 🐟. |
| **Tribute Stone** | 2 clay, 2 stones | 3🐟 | Once per game (flip card): force an opponent to recall one of their workers from a river card (drops a blank). They slide back 3🐟 in compensation. |
| **Salmon Run** | 4 logs, 2 vines | 4🐟 | As an action: place 1-5 workers from your supply onto uncovered icons of one river card. 🐟 cost escalates 1/2/3/5/8 per successive worker. |
| **Tow Line** | 4 mud, 2 clay, 1 vine | 4🐟 | As an action: pay 2🐟 to slide a river card 1 space toward the Headwaters. |

**Pricing anchors:**
- *Portage* ↔ Heron Roost (3 reeds, 2 vines, 3🐟) — same utility footprint; the per-item cost gates abuse so no per-turn cap is needed in the first draft.
- *Tribute Stone* ↔ Spy Mound (4 stones, 1 clay, 3🐟) — same once-per-game anti-opponent footprint; slightly cheaper because the 3🐟 compensation softens the attack. Other "mean-with-comp" variants worth simming: discard from hand for 2🐟, steal a Headwaters card for 4🐟.
- *Salmon Run* ↔ Royal Lodge (6 logs, 2 vines, 5🐟) — one tier down on time/mats because each use is a main action, not a free extra turn. Escalation 1/2/3/5/8 keeps 1–2 worker placements near R1-auction parity but makes 3–4 worker dumps a real bulk-grab at R2+ (6🐟 for 3 workers vs ~10🐟 at R2; 11🐟 for 4 vs ~13🐟 at R2).
- *Tow Line* ↔ Floodgate (4 mud, 3 clay, 4🐟) — repeatable version swaps 1 clay for 1 vine to widen material draw; per-use 2🐟 self-limits.

**Watch list.** Salmon Run and Tow Line both bypass core auction tension — sim first; expect retuning.

---

## Tuning notes

- **Pass-0 triggers** are the cleanest cadence — there's already a clear physical event (your pawn crossing the wrap point) so no extra tracking. Banked pass-0 abilities (e.g. Spy Mound) just refresh on each crossing.
- **Constant scaling.** Pass-0 effects scale linearly with how aggressively you advance — players who race the fish track get more uses, players who hoard fish get fewer. Price them assuming ~2–4 uses per game.
- **One-time effects** are easier to balance: they're effectively a discount on a future action. Cheap structures (2–3 VP) can carry the strong-but-narrow ones (Sap Drip, Burrow Run); reserve full board-reset effects (Royal Lodge) for the 8–10 VP slots.
- **Watch list.** Royal Lodge and Floodgate are the most dangerous designs — playtest those first.
