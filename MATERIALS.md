# River Bankers — Material Cards

Every (material, icon-count) slot in the 24-card material deck (see `rulebook/rulebook.html`) carries a unique card name so cards are easy to reference in playtest notes, the action log, and the rules PDF. **Eight slots are effect-bearing** (listed in the tier tables below); the remaining sixteen are vanilla — they yield one material per claimed icon, no extras.

## Full naming table

| Material | 4 icons       | 5 icons             | 7 icons              | 8 icons              |
|----------|---------------|---------------------|----------------------|----------------------|
| Logs     | Fallen Limb   | **Driftwood Tangle** | Logjam              | **Old Growth**       |
| Stones   | Cairn         | Rocky Shoal         | Boulder Field        | Quarry Bank          |
| Reeds    | **Hidden Inlet** | Reed Stand       | Marsh Edge           | **Cattail Cluster**  |
| Mud      | **Mud Wallow** | Mud Flat           | Silt Bank            | Floodplain           |
| Vines    | **Vine Curtain** | Trailing Vine    | Vine Thicket         | Strangler Knot       |
| Clay     | Clay Seep     | Clay Bank           | **Mud Slick**        | **Slipping Sandbar** |

**Bold** = effect-bearing card (8 of 24). Deck inclusion by player count: 5- and 7-icon cards always; 4-icon cards added at 3+ players; 8-icon cards added at 4 players (12 / 18 / 24 cards by player count).

> **Goal.** Repurpose existing deck slots without changing total card count (12/18/24 for 2P/3P/4P), so game length stays where it is. Effects are placed at the same tier as the card they replace, so 2P only sees effects that work without a crowded board.

> **Fish-track convention.** "Move N spaces backward on the fish track" is the standard phrasing wherever an effect grants fish. Backward = good (you act sooner). Cards never grant raw "fish" — only track movement.

---

## Always tier — in deck at 2P+ (2 swaps)

| New card | Replaces | Material(s) / icons | Effect |
|------|------|------|--------|
| **Driftwood Tangle** | Logs-5 | Wild Logs/Reeds, 5 | Each claimed icon yields Logs OR Reeds (chosen at retrieve). |
| **Mud Slick** | Clay-7 | Wild Mud/Clay, 7 | Each claimed icon yields Mud OR Clay (chosen at retrieve). |

Wildcards are the only effect family that works cleanly at 2P — flexibility-on-yield matters regardless of opponent count, and there's no per-player tracking.

---

## 3+ tier — in deck at 3P and 4P (3 swaps)

| New card | Replaces | Material(s) / icons | Effect |
|------|------|------|--------|
| **Hidden Inlet** | Reeds-4 | Reeds, 4 | At retrieve, if you are the *only* player with workers on this card, move 1 space backward on the fish track per worker you retrieve from this card. |
| **Vine Curtain** | Vines-4 | Vines, 4 | When you retrieve from here, peek at the top 2 material cards and rearrange them. |
| **Mud Wallow** | Mud-4 | Mud, 4 | At retrieve, the player with the most workers on this card moves 2 spaces backward on the fish track. (Ties: nobody.) |

Hidden Inlet and Mud Wallow are opposing levers: Inlet rewards solo picks on quiet cards, Wallow rewards out-committing rivals on contested ones. Both are dead at 2P (binary outcomes), so they're 3+ only.

---

## 4+ tier — in deck only at 4P (3 swaps)

| New card | Replaces | Material(s) / icons | Effect |
|------|------|------|--------|
| **Cattail Cluster** | Reeds-8 | Reeds, 8 | Vanilla yield (1 Reed per claimed icon). At retrieve, the player with the most workers on this card moves 3 spaces backward on the fish track. (Ties: nobody.) |
| **Slipping Sandbar** | Clay-8 | Clay, 8 | When this card enters the river (from pre-river or via flush), place it at **River 4** instead of River 1. After any auction in which workers were placed on this card, slide it one slot upstream (toward River 1). If at River 1 with uncovered icons remaining, the card moves to shoreline. |
| **Old Growth** | Logs-8 | Logs, 8 | If this card is at River 3 or 4, each worker you retrieve yields 2 Logs instead of 1. |

The 8-icon "fat card" slot is where dramatic effects pay off — high competition, big stakes. Cattail Cluster scales Mud Wallow's tempo bonus up for the bigger card. Slipping Sandbar creates a use-it-before-it-leaves race. Old Growth's River 3/4 gate roughly cancels the higher per-item fish cost, so the payoff is *density* (4 workers can pull 8 Logs in one auction) rather than raw efficiency.

---

## Engine touchpoints

Effects in this set require the following hooks (none required for the existing vanilla deck):

- **Wildcard retrieve-time material choice** (Driftwood Tangle, Mud Slick): each worker on a wild card stores its chosen material at retrieve. Implemented as a two-pass build — vanilla cards are consumed first, then wild cards greedily fill any remaining material deficits in either of their two materials. Works for AI and human. No per-worker UI prompt yet; assignment is automatic.
- **Solo-occupant check** (Hidden Inlet): at retrieve, count distinct player workers on the card.
- **Most-workers check** (Mud Wallow, Cattail Cluster): at retrieve, find unique max — no bonus on ties.
- **Fish-track move helper**: shared helper that walks a pawn backward N spaces, no lap effects (since we're moving backward, not forward).
- **Material-deck peek + rearrange** (Vine Curtain): when a worker is consumed from Vine Curtain during a build, the building player peeks at and may reorder the top 2 of the material deck. Human gets a reorder modal; AI swaps greedily (puts the material that matches more of its hand on top).
- **Special entry slot** (Slipping Sandbar): pre-river → River 4 instead of River 1.
- **Post-auction upstream slide** (Slipping Sandbar): after auction resolves, if any workers were placed, slide card one slot toward River 1; at River 1 with leftover icons, send to shoreline.
- **Position-gated yield multiplier** (Old Growth): at retrieve, check current slot and double if River 3/4.

The fish-track helper unlocks 4 of the 8 cards on its own, so it's the cheapest engine win to land first.

---

## Balance notes (pre-sim)

- **Wildcards** are mild: flexibility but no extra material. Likely ±0 VP.
- **Hidden Inlet** depends on undervalued-card frequency; in dense bidding it stays dormant. Expect mild positive Δ at low player counts (3P) and near-zero at 4P.
- **Mud Wallow / Cattail Cluster** reward going all-in. The "ties → nobody" clause keeps them from rewarding cheap 1-worker plops.
- **Vine Curtain** is info-only and almost free — should be near-zero Δ but adds decision texture.
- **Slipping Sandbar** is self-limiting; the upstream drift shortens the runway every turn. Risk is everyone ignores it because of the placement gate.
- **Old Growth** is a *waiting* card — you want it to drift down before triggering. Risk is someone else triggers it cheaply at River 1 (still yields 1 each, no bonus).

Sim each via the existing ablation harness once wired. Aim for ΔVP in the ±1 band, same target as the structure-card rebalance pass.
