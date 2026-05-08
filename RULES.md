# River Bankers

A 2–4 player card game in which rival semi-aquatic mammals — **beavers, sea otters, muskrats, and minks** — bid workers on materials drifting downriver and spend them to build structures along the bank. Every action costs **fish** — workers eat them to swim against the current — paid out on a shared track, and the player furthest *back* on the track always acts next.

## Components

- **Material deck.** Cards each show one material (Logs, Stones, Reeds, Mud, Vines, Clay) and a row of item icons. Cards do *not* carry a printed cost — every cost is determined by where the card sits. Items are not separate tokens; players claim them by placing workers directly on the icons. The deck scales with player count: 2 cards per material are *always* included (5 and 7 icons); 1 more card per material with 4 icons is added at **3+ players**; and 1 more card per material with 8 icons is added at **4 players**. Totals: 12 cards (2P) / 18 cards (3P) / 24 cards (4P).
- **Blank tokens.** Round chits from a shared pool. A blank is dropped onto any icon a worker leaves behind, marking it as already-sold and removing it from future auctions.
- **Pre-river queue.** Three numbered slots upstream of the river: **slot 1, 2, 3** counting away from the river. Slot 1 is closest to the river, slot 3 is farthest upstream. Each slot has a fixed *move cost* (2🐟 / 3🐟 / 4🐟 respectively) — pay it to pull whichever card is in that slot down into the river. (Pre-river auctions themselves resolve at a flat **upstream rate of 1🐟/item**, slightly cheaper than River 1.)
- **River track.** Four spaces. Each river space has a fixed *per-item cost*: **River 1 = 2🐟/item, River 2 = 3🐟/item, River 3 = 4🐟/item, River 4 = 5🐟/item.** That's how many fish each worker you win on a card costs you — cards drifting farther downriver demand longer swims and bigger meals. Cards enter the river at space 1 (after a pre-river move). **Multiple cards can occupy the same space** — they pile up there. A card only moves when *it itself* is auctioned and still has uncovered icons afterward: it slides one space downriver, where the per-item cost is one higher. New cards arriving upstream don't push the cards already in the river. Past the fourth (last) space is the **shoreline**.
- **Shoreline.** A column past the river where graduated cards collect. Shoreline cards can't be auctioned; their icon counts no longer matter. Workers still on them can be spent on builds. A shoreline card with no workers left is removed.
- **Structure deck.** Cards each show a structure, the materials required to build it, the fish cost to build, and a victory-point value.
- **Worker tokens.** Each player gets **8 meeples** of their species.
- **Fish track.** A 60-space loop with one pawn per player. Pawns advance forward, wrapping back to 0 after space 59. If a pawn is *lapped* (caught up to from behind by another pawn), it gets flipped over and **exhausted** — it sits out, can't take turns, and can't bid in auctions, until the lapper passes it again (a second time around). The next "pass" wakes it back up.

## Setup

1. Each player picks a species, takes its 8 workers and a pawn. Place all pawns on space 0, stacked in player order with the first player on top.
2. Shuffle the structure deck. Deal 3 cards face-down to each player as a private hand.
3. Shuffle the material deck. Reveal **3 material cards** into the river (all on space 1) and **3 more** into the pre-river queue (one per slot). Place the rest face-down beside the queue.
4. The player on top of the stack at space 0 takes the first turn.

## Goal

Score the most victory points from built structures. Tiebreaker: fewer spaces advanced on the fish track.

## Turn order

There are no rounds. The next player to act is whoever's *non-exhausted* pawn is on the **lowest space** of the fish track; if pawns share that space, the one **on top of the stack** acts first. A pawn moving onto a space stacks on top. Exhausted pawns are skipped until they're revived by the next lap pass.

## Your turn

**Optional first:** *Call workers home.* Pick up any number of your own workers from any cards on the river and return them to your supply. Drop a blank onto each icon you uncovered. Free; not an action.

Then take exactly **one** action. Every action advances your pawn forward by its fish cost. **Any action that triggers an auction (1, 2, or 5) requires at least one worker in your supply** — you can't start an auction you can't bid in.

1. **Auction an existing river card — 1🐟 flat.** Choose any river card that still has uncovered icons. You must bid at least one worker. The flat fish is paid immediately; per-item fish still applies on whatever you win, set by the card's current river space (2/3/4/5🐟).
2. **Pull a pre-river card into the river — 2, 3, or 4🐟.** Choose a card in the pre-river queue and pay the move cost on its slot (2🐟 for slot 1, 3🐟 for slot 2, 4🐟 for slot 3). An auction immediately runs on it at the **upstream rate of 1🐟/item**. You must bid at least one worker. Card movement after the auction follows the universal rule below.
3. **Invent — N🐟 (you choose N from 1–5).** Draw N structure cards from the deck, then discard N cards from your hand (any mix of new draws and old). Discards go face-down out of play.
4. **Build a structure — fish cost printed on the card.** For each material listed, pick up that many of *your* workers from cards of the matching type and return them to your supply. Drop a blank on each uncovered river-card icon. (Shoreline cards don't need blanks.) Place the structure face-up in front of you for scoring, then draw a replacement structure card so your hand returns to 3.
5. **Flush the upstream — 5🐟.** Discard all cards currently in the upstream queue (out of game). Refill the queue from the top of the deck (revealing 3 fresh cards). Pick one of those new cards and run an auction on it at the upstream rate (1🐟/item); triggering this auction is *free* — the 5🐟 already paid covers it — but you still pay for your own bid normally and **must bid at least one worker** on it. The other two newly-revealed upstream cards stay in the queue. After the auction settles, the auctioned card's slot refills as usual. If the deck has fewer than 3 cards left when you flush, the queue refills with whatever's available.

After your action resolves (and any auction settles), check the fish track again. If you're still on top of the lowest occupied space, take another turn.

## Auctions

Triggered by action 1 or action 2. The action's flat fish cost is paid immediately (1🐟 for an existing river card, 2/3/4🐟 to pull a pre-river card into River 1); auction results may cost additional fish.

Everyone — including the active player — secretly chooses how many workers from their supply to bid. The triggering player must bid at least one; other players may bid zero. A bid is capped only by your remaining supply.

When everyone's ready, all bids are revealed at the same time. Add them up and compare the total to the number of uncovered icons still on the card.

### Plenty to go around

If the total of all bids is **no more than** the number of uncovered icons, everyone wins exactly what they bid. For each winner: take that many of your workers from your supply, place one on each of the icons you've claimed, and slide your pawn forward on the fish track by your bid count multiplied by the card's current per-item rate (1🐟 upstream, or 2/3/4/5🐟 for River 1/2/3/4).

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

- **If any icons are still uncovered**, the card slides one space downstream — pre-river → River 1, River 1 → River 2, and so on. From River 4 it graduates to the **shoreline** (the card leaves the river entirely, with its workers). When the card lands on a deeper river space, its per-item cost matches the new space (one higher than before).
- **If every icon was claimed**, the card has nothing left to auction and goes straight to the **shoreline**.

After a pre-river card vacates its slot, any pre-river cards in higher-numbered slots (farther from the river) advance one slot toward the river to fill the gap. Then a new card from the top of the material deck enters the now-empty slot 3 (farthest upstream). Cards that did *not* lose a slot in front of them stay where they are.

When a card reaches the shoreline, return any blanks on it to the pool. Workers stay on it until spent on a build. Once the last worker leaves a shoreline card, the card is discarded.

Spending or recalling a worker from a river card does *not* move the card — it just leaves a blank on the icon. The card keeps drifting normally. New material cards only enter the river by being pulled out of the pre-river queue.

## Getting lapped

The fish track wraps around every 60 spaces. If your pawn is at space N and another player's pawn passes you (catches up to space N from behind, having gone around the loop), you're **lapped** — flip your pawn upside-down and sit out:

- Your pawn doesn't take turns. The next non-exhausted pawn at the lowest space acts.
- You can't bid on auctions while exhausted; you implicitly bid 0.

You stay exhausted until the player who lapped you **passes you again** (a second loop). At that moment, flip your pawn back upright; you can act and bid as normal. If they lap you a third time, you're exhausted again — and so on.

Multiple lappers stack: if two different opponents have lapped you and only one has caught back up, you stay exhausted until the other passes you too.

## Endgame & game end

The moment the **material deck runs out**, the endgame begins:

1. Move all pawns to spaces 1, 2, 3, … on the fish track, preserving their relative order (the player with the lowest pre-endgame fish total sits at 1, next at 2, and so on). Lap-shadow / exhaustion is cleared.
2. Play continues with the same turn order (lowest non-retired pawn acts next; ties → top of stack). All actions are still legal: auctioning river cards, pulling upstream, browsing, building, and flushing the upstream queue (the flush still pays 5🐟 but skips the deck-draw step when the deck is empty — it just clears upstream and ends).
3. A player **retires** (and their pawn is removed) when:
   - their action advances them to space 59 or beyond, **or**
   - they pass (have no productive action) — this typically signals they've used up their hand and material supply.
4. Retired players don't take turns and don't bid in auctions; their built structures stay on the table for scoring.

The game ends as soon as **every player has retired**. Total the victory points on each player's built structures. Highest total wins; ties broken by fewer spaces the retired pawn ended on (i.e., whoever retired earliest).
