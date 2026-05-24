# River Bankers — Species Starters

Design notes for **asymmetric play** via species-specific starter structures.

## Overview

Each species (Beaver, Sea Otter, Muskrat, Mink) has a private pool of **3 thematic structure cards**. At game start, each player drafts **1 of their 3** to begin the game with that structure already built in their tableau (in addition to their normal 3-card starting hand of regular structures). The other 2 species cards go out of game.

> **Print convention.** Species starter cards are physically distinct from the main structure deck — they're handed to each player as a personal mini-pool at setup, never shuffled into the shared structure deck.

### Material-bias map

| Species | Bonus material | Theme link |
|---|---|---|
| **Beaver** | Logs | Dam construction |
| **Sea Otter** | Reeds | Kelp wrapping |
| **Muskrat** | Mud | Burrows |
| **Mink** | Clay | Den-making |

**Stones** and **Vines** are intentionally unbiased — they remain the "common" materials no species owns from turn 1, so the auction tension on those two stays open.

---

## 🦫 Beaver — industrious dam-builder

| Name | Type | Effect |
|------|------|--------|
| **Lodge Foundation** ⭐ | Constant — material bonus | Logs icons cost you 1 less fish per item (min 1). |
| **Tail Slap** | Constant — disruption | At the start of your turn, you may pay 1🐟 to drop a blank on any uncovered icon on a River 1 card. |
| **Cache Burrow** | Constant — worker logistics | Your hand size is 4 instead of 3. (Same as the main-deck card of the same name.) |

⭐ = material-bias starter

---

## 🦦 Sea Otter — playful, tool-using, communal

| Name | Type | Effect |
|------|------|--------|
| **Kelp Bed** ⭐ | Constant — material bonus | Reeds icons cost you 1 less fish per item (min 1). |
| **Rolling Float** | Constant — worker swap | Once per game, swap one of your workers on a river card with another worker (yours or an opponent's) on another card in the **same river slot**. No fish cost. |
| **Stone Tool** | Constant — build flexibility | When building, 1 of your Stones workers may substitute for any other material. (Mirrors Charcoal Pit's effect for Stones instead of Clay.) |

---

## 🐀 Muskrat — marsh-burrower, channel-clearer

| Name | Type | Effect |
|------|------|--------|
| **Mud Burrow** ⭐ | Constant — material bonus | Mud icons cost you 1 less fish per item (min 1). |
| **Channel Clearer** | Constant — soft attack | At the start of your turn, you may discard 1 Reed worker from any river card (yours or an opponent's). The worker returns to that player's supply without a blank. |
| **Marsh Lookout** | Constant — information | Peek at the top card of the material deck at any time. (Same as the main-deck Lookout Tree card.) |

---

## 🐺 Mink — agile predator, ambusher

| Name | Type | Effect |
|------|------|--------|
| **Clay Den** ⭐ | Constant — material bonus | Clay icons cost you 1 less fish per item (min 1). |
| **Quick Strike** | Constant — bidding | When you trigger an auction, you may declare your bid last (after all other bids are revealed). |
| **Snare Set** | Constant — disruption, once-per-game | Once per game, force an opponent to recall one of their workers from a river card (drops a blank). The opponent slides back 3🐟 in compensation. (Same as the main-deck Tribute Stone card.) |

---

## Draft mechanic (Option A)

At game start, after each player picks a species:

1. Hand each player their **3 species starter cards** face-up. Other players cannot see them.
2. Each player **selects 1 of the 3** to start the game with already built in their tableau.
3. The other 2 cards are **removed from the game** (not shuffled into the main deck, not held in hand).
4. The drafted card grants its effect from turn 1.

### Why draft-of-3 instead of fixed starter

- **Replay value.** Each species has 3 distinct play patterns; no two games with the same matchup feel identical.
- **Easier to balance.** If one of a species' 3 options is dominant, just tune that single card. Fixed starters force every Beaver player into the same role.
- **Lower power floor.** Players never start with *all* their themed effects active — only one — keeping the asymmetric tax on the core game small.

---

## Engine touchpoints (when this lands in code)

- **Template registry.** Add the 12 starter cards to `STRUCTURE_TEMPLATES` with a `species: 'beaver' | 'otter' | 'muskrat' | 'mink'` flag (parallel to the existing `only2P` flag).
- **Deck builder.** `buildStructureDeck` should *exclude* any template with a `species` flag — these cards never appear in the shared draw deck.
- **Setup phase.** `newGame` collects each player's 3 species starters, presents the draft (AI: greedy by `aiEffectValue`; human: modal in web/index.html), and appends the chosen card to `player.built[]` before the first turn.
- **Effect-fire reuse.** Most of the starters re-use existing structure effects (Cache Burrow, Lookout Tree, Tribute Stone, Charcoal-Pit-style substitution, Otter-Trail-style swap). The new effect machinery needed:
  - **Lodge Foundation / Kelp Bed / Mud Burrow / Clay Den** — per-item-cost discount per material. Reed Bed already implements the same shape for Reeds; generalize `playerCardCost` to handle any (effect-name, material) pair.
  - **Tail Slap** — per-turn paid blank-drop with River-1 restriction. Variant of Driftwood Snag.
  - **Rolling Float** — once-per-game neighbor-swap. Variant of Otter Trail (with a `rollingFloatUsed` flag).
  - **Channel Clearer** — start-of-turn worker eviction. Soft attack (no blank, no fish compensation).
  - **Quick Strike** — auction deferral. Variant of Spy Mound (with no use limit).

---

## Balance notes (pre-sim)

- Material-bonus cards (the ⭐ row) are intentionally the safest in each pool: same effect family as Reed Bed, very tunable.
- The other two cards per species range from utility (Cache Burrow, Marsh Lookout) to interaction (Channel Clearer, Snare Set, Quick Strike). Power should sit in the same band as their main-deck cousins; if any species' draft pool ends up dominated by one card, we'll know from the ablation pass.
- **Don't ship until** the [structure-card rebalance](board-games.org "Rebalance all structure cards") is stable and a **species-specific ablation harness** is in place. Asymmetry on top of an unstable baseline is double-jeopardy.
- **Target:** win-rate within ±5% of the no-asymmetry baseline per species; per-game ΔVP within ±1 like the structure-card rebalance band.

If the math doesn't converge cleanly, fall back to a **single fixed starter per species** (the material-bonus card from each pool — those are the easiest to tune).
