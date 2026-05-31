# River Bankers

A 2–4 player card game in which rival semi-aquatic mammals — **beavers, river otters, muskrats, and minks** — bid workers on materials drifting downriver and spend them to build structures along the bank. Every action costs **fish** — workers eat them to swim against the current — paid out on a shared track, and the player furthest *back* on the track always acts next.

## Components

- 1 game board (with the Headwaters, river, shoreline, and 60-space fish track)
- 24 material cards (6 materials × 4 cards each: 4-, 5-, 7-, and 8-icon variants)
- 32 structure cards
- 32 worker discs (0.63" diameter × 0.4" thick) — 8 in each of 4 species colors: **brown beaver, red river otter, green muskrat, purple mink**
- 4 fish-track pawns — one 0.63" disc per species, same colors as that species' workers
- 28 blank chits (0.75" diameter, printed)
- 1 rulebook

## Game Elements

- **Material deck.** Cards each show one material (Logs, Stones, Reeds, Mud, Vines, Clay) and a row of item icons. Cards do *not* carry a printed cost — every cost is determined by where the card sits. Items are not separate tokens; players claim them by placing workers directly on the icons. The deck scales with player count: 2 cards per material are *always* included (5 and 7 icons); 1 more card per material with 4 icons is added at **3+ players**; and 1 more card per material with 8 icons is added at **4 players**. Totals: 12 cards (2P) / 18 cards (3P) / 24 cards (4P). **Eight of the 24 cards carry printed effects** (wildcards, fish-track bonuses, position-gated yield) — see [`MATERIALS.md`](MATERIALS.md) for the full list. Effects are gated by tier so 2P games only see those that work without a crowded board.
- **Blank tokens.** Round chits from a shared pool. A blank is dropped onto any icon a worker leaves behind, marking it as already-sold and removing it from future auctions.
- **Headwaters.** Three numbered slots above the river: **Headwaters 1, 2, 3** counting away from the river. Headwaters 1 is closest to the river, Headwaters 3 is farthest upstream. Each slot has a fixed *move cost* (2🐟 / 3🐟 / 4🐟 respectively) — pay it to pull whichever card is in that slot down into the river. (Headwaters auctions themselves resolve at a flat **Headwaters rate of 1🐟/item**, slightly cheaper than River 1.)
- **River track.** Four spaces. Each river space has a fixed *per-item cost*: **River 1 = 2🐟/item, River 2 = 3🐟/item, River 3 = 4🐟/item, River 4 = 5🐟/item.** That's how many fish each worker you win on a card costs you — cards drifting farther downriver demand longer swims and bigger meals. Cards enter the river at space 1 (after a Headwaters move). **Multiple cards can occupy the same space** — they pile up there. A card only moves when *it itself* is auctioned and still has uncovered icons afterward: it slides one space downriver, where the per-item cost is one higher. New cards arriving from the Headwaters don't push the cards already in the river. Past the fourth (last) space is the **shoreline**.
- **Shoreline.** A column past the river where graduated cards collect. Shoreline cards can't be auctioned; their icon counts no longer matter. Workers still on them can be spent on builds. A shoreline card with no workers left is removed.
- **Structure deck.** Cards each show a structure, the materials required to build it, the fish cost to build, and a victory-point value. Discarded structure cards form a face-up discard pile next to the deck; whenever the deck runs out, shuffle the discard pile to form a new deck.
- **Worker tokens.** Each player gets **8 disc workers** of their species color (0.63" diameter, sized to fully cover one icon on a material card). **In 4-player games, each player returns 1 worker to the box, starting with 7.** The premium edition swaps these for sculpted miniatures with the same 0.63" base footprint, so they slot onto icons identically.
- **Fish track.** A 60-space loop with one pawn per player. Pawns advance forward, wrapping back to 0 after space 59. If a pawn is *lapped* (caught up to from behind by another pawn), it gets flipped over and **exhausted** — it sits out, can't take turns, and can't bid in auctions, until the lapper passes it again (a second time around). The next "pass" wakes it back up.

## Setup

1. Each player picks a species, takes its workers (8 in 2–3 player games; 7 in 4-player games, with the eighth returned to the box) and a pawn. Place all pawns on space 0, stacked in player order with the first player on top.
2. Shuffle the structure deck. Deal 3 cards face-down to each player as a private hand.
3. Shuffle the material deck. Reveal **3 material cards** into the river (all on space 1) and **3 more** into the Headwaters (one per slot). Place the rest face-down beside the Headwaters.
4. The player on top of the stack at space 0 takes the first turn.

## Goal

Score the most victory points from built structures. Tiebreaker: fewer spaces advanced on the fish track.

## Turn order

There are no rounds. The next player to act is whoever's *non-exhausted* pawn is on the **lowest space** of the fish track; if pawns share that space, the one **on top of the stack** acts first. A pawn moving onto a space stacks on top. Exhausted pawns are skipped until they're revived by the next lap pass.

## Your turn

Take exactly **one** action. Every action advances your pawn forward by its fish cost. **Any action that triggers an auction (1, 2, or 3) requires at least one worker available** — in your supply or placed on a card you could recall (see *Pre-auction recall* under Auctions).

1. **Auction a Headwaters card — 2, 3, or 4🐟.** Choose a card in the Headwaters and pay the move cost on its slot (2🐟 for Headwaters 1, 3🐟 for Headwaters 2, 4🐟 for Headwaters 3). The card is pulled into the river and an auction immediately runs on it at the **Headwaters rate of 1🐟/item**. You must bid at least one worker. Card movement after the auction follows the universal rule below.
2. **Auction an existing river card — 1🐟 flat.** Choose any river card that still has uncovered icons. You must bid at least one worker. The flat fish is paid immediately; per-item fish still applies on whatever you win, set by the card's current river space (2/3/4/5🐟).
3. **Flush the Headwaters — 5🐟.** Set aside all cards currently in the Headwaters. Refill from the top of the deck (revealing 3 fresh cards). Then **shuffle the set-aside cards back into the material deck**. Pick one of the newly-revealed cards and run an auction on it at the Headwaters rate (1🐟/item); triggering this auction is *free* — the 5🐟 already paid covers it — but you still pay for your own bid normally and **must bid at least one worker** on it. The other two newly-revealed Headwaters cards stay in their slots. After the auction settles, the auctioned card's slot refills as usual. If the deck has fewer than 3 cards left when you flush, the Headwaters refills with whatever's available before the set-aside cards are shuffled in. **You can't flush once the material deck is empty** — without fresh cards to draw, the action is illegal.
4. **Invent structures — N🐟 (you choose N from 1–5).** Draw N structure cards from the deck, then discard N cards from your hand (any mix of new draws and old). Discards go face-up onto the structure discard pile. If the deck runs out mid-draw, shuffle the discard pile to refill it.
5. **Build a structure — fish cost printed on the card.** For each material listed, pick up that many of *your* workers from cards of the matching type and return them to your supply. Drop a blank on each uncovered river-card icon. (Shoreline cards don't need blanks.) Place the structure face-up in front of you for scoring, then draw a replacement structure card so your hand returns to 3.

After your action resolves (and any auction settles), check the fish track again. If you're still on top of the lowest occupied space, take another turn.

## Auctions

Triggered by action 1, 2, or 3. The action's flat fish cost is paid immediately (2/3/4🐟 to auction a Headwaters card, 1🐟 for an existing river card, 5🐟 to flush the Headwaters); auction results may cost additional fish.

### Pre-auction recall

Immediately before any auction (yours or another player's), each player may recall any number of their own workers from river cards back to their supply. Drop a blank onto each river-card icon you uncover. Workers recalled from shoreline cards do not need blanks. Recall is free — no fish cost — and the recalled workers are immediately available to bid in the auction that's about to take place.

Recalls are public and resolve before bidding begins. They're not an action; they don't move any card.

### Bidding

Everyone — including the active player — secretly chooses how many workers from their supply to bid. The triggering player must bid at least one; other players may bid zero. A bid is capped only by your remaining supply.

When everyone's ready, all bids are revealed at the same time. Add them up and compare the total to the number of uncovered icons still on the card.

### Plenty to go around

If the total of all bids is **no more than** the number of uncovered icons, everyone wins exactly what they bid. For each winner: take that many of your workers from your supply, place one on each of the icons you've claimed, and slide your pawn forward on the fish track by your bid count multiplied by the card's current per-item rate (1🐟 in the Headwaters, or 2/3/4/5🐟 for River 1/2/3/4).

Then move the card per the **card movement rule** below.

### Too many bidders for what's there

If the total of all bids is **greater than** the number of uncovered icons, the river jams. Nobody simply gets what they asked for. To work out what each player actually takes, look at their bid and ask: "after I subtract *everyone else's* bids from the uncovered icons, how many would still be left for me?" That answer, capped at your own bid (and never less than zero), is what you take.

**You pay for every worker you bid, win or lose.** Slide your pawn forward by `bid × per-item cost` — the full bid count, not just what you clinched. Workers that didn't claim an icon return to your supply (no extra cost), but the fish they ate are gone. This makes blanket over-bidding to "block" a card expensive and self-correcting.

Then move the card per the **card movement rule** below.

> **Example.** A card on River 2 has 5 uncovered log icons. You bid 4 workers. Your opponent bids 4. Together that's 8 — more than the card has. From your point of view: 5 logs minus your opponent's 4 leaves 1 log for you. From their point of view: 5 logs minus your 4 leaves 1 log for them. You each cover 1 icon with one of your workers; both of you advance 4 × 3🐟 = 12🐟 (River 2's per-item rate × your bid count, even though only 1 of those 4 workers clinched). The 3 uncovered icons stay where they are, and the card slides to River 3.

> **Example.** A card on River 1 has 5 uncovered log icons. You bid 1, opponent bids 6. Together that's 7. From your point of view: 5 logs minus their 6 is negative — you take nothing. You still pay 1 × 2🐟 = 2🐟 for the bid. From their point of view: 5 logs minus your 1 leaves 4, capped at their bid of 6, so they take 4. They advance 6 × 2🐟 = 12🐟 (the full bid). 1 icon stays uncovered; the card slides to River 2.

Workers that didn't clinch an icon return to your supply (the fish you fed them is the only cost). Workers placed on icons stay there until you spend them on a structure or call them home.

## Card movement rule

Only the card being auctioned can move. Other cards in the river — even ones at the same space — stay put. The river isn't a queue; it's a set of four spaces that can each hold any number of cards.

After **any** auction (plenty or jam) on a card:

- **If any icons are still uncovered**, the card slides one space downstream — Headwaters → River 1, River 1 → River 2, and so on. From River 4 it graduates to the **shoreline** (the card leaves the river entirely, with its workers). When the card lands on a deeper river space, its per-item cost matches the new space (one higher than before).
- **If every icon was claimed**, the card has nothing left to auction and goes straight to the **shoreline**.

After a Headwaters card vacates its slot, any Headwaters cards in higher-numbered slots (farther from the river) advance one slot toward the river to fill the gap. Then a new card from the top of the material deck enters the now-empty Headwaters 3 (farthest upstream). Cards that did *not* lose a slot in front of them stay where they are.

When a card reaches the shoreline, return any blanks on it to the pool. Workers stay on it until spent on a build. Once the last worker leaves a shoreline card, the card is discarded.

Spending or recalling a worker from a river card does *not* move the card — it just leaves a blank on the icon. The card keeps drifting normally. New material cards only enter the river by being pulled out of the Headwaters. (See *Pre-auction recall* under Auctions for the recall step that runs immediately before bidding.)

## Lapping (and getting winded)

The fish track wraps around every 60 spaces. When your pawn passes another player's pawn by going all the way around the loop — i.e., your pawn catches up to their space N from behind, having gone the long way around — **you** (the lapper) get **exhausted**. Flip your pawn upside-down and sit out:

- Your pawn doesn't take turns. The next non-exhausted pawn at the lowest space acts.
- You can't bid on auctions while exhausted; you implicitly bid 0.

You stay exhausted until each player you lapped **catches up to your spot on the track**. Each such catch-up wakes you with respect to that one player; you remain exhausted until *all* the players you lapped have caught back up. Once they all have, flip your pawn back upright; you can act and bid as normal.

Lapping the same player again later (after they've caught up and you've woken) exhausts you again.

## Endgame & game end

The moment the **material deck runs out**, the endgame begins:

1. Move all pawns to spaces 1, 2, 3, … on the fish track, preserving their relative order (the player with the lowest pre-endgame fish total sits at 1, next at 2, and so on). Lap-shadow / exhaustion is cleared.
2. Play continues with the same turn order (lowest non-retired pawn acts next; ties → top of stack). Legal actions are: auctioning river cards, pulling from the Headwaters, browsing, and building. (Flushing the Headwaters is illegal during endgame — the material deck is empty by definition.)
3. A player **retires** (and their pawn is removed) when:
   - their action advances them to space 59 or beyond, **or**
   - they pass (have no productive action) — this typically signals they've used up their hand and material supply.
4. Retired players don't take turns and don't bid in auctions; their built structures stay on the table for scoring.

The game ends as soon as **every player has retired**. Total the victory points on each player's built structures, **plus 1★ per pair of same-type leftover workers** on the board (river + shoreline). For each material, count your workers across all your cards of that material and score floor(workers / 2). Singletons score nothing. Wildcard cards (Driftwood Tangle, Mud Slick) let each of their workers count toward either of their two materials — assign each worker individually to maximize your pair count.

Examples (one player's leftover workers):
- 4 logs, 4 mud → 2★ + 2★ = **4★**
- 3 logs, 3 reeds → 1★ + 1★ = **2★** (one singleton in each pile)
- 2 logs, 1 reed, 1 mud, 1 vines, 1 clay → **1★** (only logs pair up)
- 8 logs (extreme specialist) → **4★**
- 1 worker on each of 6 materials → **0★** (all singletons)

Highest total wins; ties broken by fewer spaces the retired pawn ended on (i.e., whoever retired earliest).
