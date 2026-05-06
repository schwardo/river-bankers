# River Bankers

A 2–4 player card game in which rival semi-aquatic mammals — **beavers, sea otters, muskrats, and minks** — bid workers on materials drifting downriver and spend them to build structures along the bank. Every action costs time on a shared track, and the player furthest *back* on the track always acts next.

## Components

- **Material deck.** Cards each show one material (Logs, Stones, Reeds, Mud, Fish), a row of 3–7 item icons, and a starting cost of 1–3. Items are not separate tokens — players claim them by placing workers directly on the icons.
- **Blank tokens.** Round chits from a shared pool. A blank is dropped onto any icon a worker leaves behind, marking it as already-sold and removing it from future auctions.
- **River track.** Four spaces. New cards enter at the upriver end (space 1). **Multiple cards can occupy the same space** — they pile up there. A card only moves when *it itself* is jammed in an auction it lost: it slides one space downriver and its cost goes up by 1. New cards arriving upstream don't push the cards that are already in the river. Past the fourth (last) space is the **shoreline**.
- **Shoreline.** A column past the river where graduated cards collect. Shoreline cards can't be auctioned; their icon counts no longer matter. Workers still on them can be spent on builds. A shoreline card with no workers left is removed.
- **Structure deck.** Cards each show a structure, the materials required to build it, the time cost to build, and a victory-point value.
- **Worker tokens.** Each player gets **8 meeples** of their species.
- **Time track.** A long shared track with one pawn per player. Sized so no player runs out of room.

## Setup

1. Each player picks a species, takes its 8 workers and a pawn. Place all pawns on space 0, stacked in player order with the first player on top.
2. Shuffle the structure deck. Deal 3 cards face-down to each player as a private hand.
3. Shuffle the material deck. Roll out **3 material cards** at the upriver end. Place the rest face-down beside the river.
4. The player on top of the stack at space 0 takes the first turn.

## Goal

Score the most victory points from built structures. Tiebreaker: fewer spaces advanced on the time track.

## Turn order

There are no rounds. The next player to act is whoever's pawn is on the **lowest space** of the time track; if pawns share that space, the one **on top of the stack** acts first. A pawn moving onto a space stacks on top.

## Your turn

**Optional first:** *Call workers home.* Pick up any number of your own workers from any cards on the river and return them to your supply. Drop a blank onto each icon you uncovered. Free; not an action.

Then take exactly **one** action. Every action advances your pawn forward by its time cost.

1. **Auction an existing river card — 1 time.** Choose any river card that still has uncovered icons. You must bid at least one worker.
2. **Roll out a new material card and auction it — 2 time.** Reveal the top card of the material deck onto the upriver end of the river and auction it. The new card joins any cards already at the upriver space; it doesn't push them. The triggering player may bid zero.
3. **Browse the structure deck — N time (you choose N).** Draw N structure cards, then discard N cards from your hand (any mix of new draws and old). Discards go face-down out of play.
4. **Build a structure — time printed on the card.** For each material listed, pick up that many of *your* workers from cards of the matching type and return them to your supply. Drop a blank on each uncovered river-card icon. (Shoreline cards don't need blanks.) Place the structure face-up in front of you for scoring, then draw a replacement structure card so your hand returns to 3.

After your action resolves (and any auction settles), check the time track again. If you're still on top of the lowest occupied space, take another turn.

## Auctions

Triggered by action 1 or action 2. The action's flat time cost is paid immediately; auction results may cost additional time.

Everyone — including the active player — secretly chooses how many workers from their supply to bid. The triggering player must bid at least one for action 1; for action 2 anyone may bid zero. A bid is capped only by your remaining supply.

When everyone's ready, all bids are revealed at the same time. Add them up and compare the total to the number of uncovered icons still on the card.

### Plenty to go around

If the total of all bids is **no more than** the number of uncovered icons, everyone wins exactly what they bid. For each winner: take that many of your workers from your supply, place one on each of the icons you've claimed, and slide your pawn forward on the time track by your bid count multiplied by the card's current cost. Any icons that no one bid on are washed downstream — the card now **moves to the shoreline**, taking its workers with it.

### Too many bidders for what's there

If the total of all bids is **greater than** the number of uncovered icons, the river jams. Nobody simply gets what they asked for. To work out what each player actually takes, look at their bid and ask: "after I subtract *everyone else's* bids from the uncovered icons, how many would still be left for me?" That answer, capped at your own bid (and never less than zero), is what you take.

After resolution, any icons still uncovered stay on the card, and the card slides one space downriver — its cost rises by 1. If the card was already on the last river space, sliding any further graduates it to the shoreline: it leaves the river entirely (with its workers).

> **Example.** A card has 5 uncovered log icons. You bid 4 workers. Your opponent bids 4. Together that's 8 — more than the card has. From your point of view: 5 logs minus your opponent's 4 leaves 1 log for you. From their point of view: 5 logs minus your 4 leaves 1 log for them. You each cover 1 icon with one of your workers and slide your pawn forward by 1 × the card's current cost. The 3 uncovered icons stay where they are, and the card slides one space downriver — its cost rises by 1.

> **Example.** A card has 5 uncovered log icons. You bid 1, opponent bids 6. Together that's 7. From your point of view: 5 logs minus their 6 is negative — you take nothing. From their point of view: 5 logs minus your 1 leaves 4, capped at their bid of 6, so they take 4. They cover 4 icons with their workers and advance by 4 × the card's cost. 1 icon stays uncovered; the card slides one space downriver and its cost rises by 1.

If your bid took nothing, those workers return to your supply at no extra cost.

Workers placed on icons stay there until you spend them on a structure or call them home.

## Card movement summary

Only the card being auctioned can move. Other cards in the river — even ones at the same space — stay put. The river isn't a queue; it's a set of four spaces that can each hold any number of cards.

A material card moves to the shoreline when either:

1. An auction resolves "plenty to go around" (any unbid icons wash away), or
2. The card jams on the last river space and would slide past it.

When a card reaches the shoreline, return any blanks on it to the pool. Workers stay on it until spent on a build. Once the last worker leaves a shoreline card, the card is discarded.

Spending or recalling a worker from a river card does *not* move the card — it just leaves a blank on the icon. The card keeps drifting normally. New material cards only enter the river via action 2.

## Game end

The game ends after a turn in which **all** of the following are true:

- The material deck is empty.
- No river card has any uncovered icons left.
- No player's hand contains a structure they could still build with their current workers (on the river or shoreline).

Total the victory points on each player's built structures. Highest total wins; ties broken by fewer spaces advanced on the time track.
