# River Bankers — Playtest Notes (Claude)

**Date:** 2026-06-22
**Config:** 3 players · asymmetric (species starters ON) · double-card auctions OFF
**Me:** Muskrat (mud workhorse) · **Opponents:** Beaver AI (logs), Otter AI (reeds) · Mink off
**Played via:** the browser prototype at `games/river-bankers/web/index.html`, driven over CDP/Playwright. I read the rulebook + strategy guide first.

This is a turn-by-turn diary: my reasoning *before* each action, what actually happened, and flags for anything confusing (vs. the rulebook) or anything that felt clever/interesting/fun.

---

## Pre-game plan

I deliberately picked **Muskrat** to test the "workhorse middle" lane — both prior 3P and 2P Claude playtests ran Mink (clay), so mud is unexplored territory. The strategy guide pegs mud as middle-demand, middle-payoff, with a −1 species discount (Mud Burrow) and a dedicated engine in **Burrow Network** (+3★ per built mud structure of mine, max +9). The killer combo it names: "Mud Burrow's discount feeds a wide mud tableau; Streambank Hollow pays you tempo for the recall-heavy mud game; Floodgate (mud+clay) is a strong splash into Mink's material."

The draft handed me a near-perfect hand for that plan:
- **Burrow Network** (the mud engine itself — the single card I'd most want to draw)
- **Floodgate** (mud + clay — splash, and a once/game card)
- **Stone Pool** (stones — off-lane, but a flexible staple + a deck-peek/reorder effect)

So the plan picks itself:
- Draft **Mud Burrow** (the ★ bias): mud icons cost 1 less fish/item. 0 VP itself, but the guide is explicit — draft bias cards for the engine, not points. With Burrow Network already in hand, committing to mud is clearly correct.
- Build wide in mud, feed Burrow Network. Use Floodgate as a mud+clay splash. Aim to get Burrow Network down *early* so its end-of-game multiplier counts every later mud build.
- Spend tempo like a miser (3P finish line is 109 fish, on lap 2): prefer cheap single-worker grabs that keep the chair; let logs (Beaver) and reeds (Otter) drift dear.
- **Table read:** Both AIs are slightly off-lane. Beaver (log bias) holds Salmon Run / Vine Trellis / Reed Walkway — reed/vine engines, no logs. Otter (reed bias) holds Clay Vault / Confluence / Cattail Patch — a clay engine and a diversity scorer, off its reed bias. Neither opponent's *bias* is mud, so mud should be lightly contested for me — exactly the conditions the guide says reward commitment. Watch whether the AIs chase their off-lane engine cards (which would pull them toward materials I don't want anyway).

Tiebreaker is *lower* final fish, so I also want to finish lean.

Stack order is [Muskrat(me), Otter, Beaver] — **I take the very first turn.**

---

## Turn-by-turn

### Draft — took Mud Burrow
As planned. The Muskrat starter modal showed all three options (Mud Burrow / Channel Clearer / Marsh Lookout). With Burrow Network *and* Floodgate already in hand, committing to mud was a no-brainer. Stack order put me first.

### The mud drought (turns 1–~5) — *the most interesting design tension I hit*
**The opening Headwaters had nothing for me: two vines + one logs, and the river was empty.** My entire hand wants mud/reeds/clay/stones. Mud was buried in the deck and didn't surface for *five-plus turns*. This created a genuinely awkward situation worth flagging:

- **A player who dutifully commits to a material (as the species draft + strategy guide both push you to do) can have *no strong proactive play* when that material simply isn't on the board.** I had to burn cheap Invents and a speculative reed pull just to do *something* while waiting. A new player could feel stranded/punished for following the guide's "commit early" advice.
- It *self-corrected* — once mud appeared, nobody else wanted it and I ran away with it. So the tension is real but ultimately rewarding. Still, the first ~5 turns of "I literally can't act on my plan" felt bad, and I'd flag it as the sharpest new-player friction point in this game.

Concretely I opened with **two Invents (N=2 each)** — purely to cycle toward mud structures and stay cheap while the board developed. Both whiffed (drew Royal Lodge/Treaty Stone, then Trading Post/Portage — all off-lane), so I kept my original hand both times.

> **Confusing-vs-rulebook (minor, resolved):** I tried to Invent **N=1**; the number input correctly clamped the floor to **2** (rulebook: "Invent N from 2–5"). So the cheapest possible non-river-auction action is actually 2🐟, not 1. Not a bug — the input enforces the rule — but I'd initially mis-assumed 1 was legal. Worth a one-line callout in a tutorial.

### The reed jam (turn ~3) — a weapon that cuts both ways
To break the deadlock (I had the chair but nothing to do, and the AIs were stuck behind me), I **pulled Reed Stand (HW3) and bid 2** — reasoning that reeds are contested here (Otter's bias + Beaver's Reed Walkway) so I should buy them while cheap, and that the spend would hand the chair to the AIs so they'd develop the board.

**Result: a triple jam.** Beaver bid 4, Otter bid 4, me 2 → total 10 vs 5 icons, overbid 5 → *everyone took zero.* I paid 6🐟 (pull+bid) for nothing; the AIs paid 4 each. This was a hard lesson exactly matching the guide's "don't get into a shoving match over staples" — I triggered an auction on the single most-contested material at the table and fed a mutual jam. Silver lining: I bid the least (2 vs their 4), so I cost *both* opponents more tempo than I lost, and the pull revealed the first **Clay Bank**.

**Takeaway for the designer:** the pay-first / jam math makes "trigger a contested auction to bleed opponents" a real (if blunt) weapon — but it punishes the trigger-er too. That's good tension. The lesson landed.

> **Looked-like-a-bug, verified correct:** On a later reed auction the log read `🦦 River Otter bid 4, took 0 (advance 4🐟)` while `🦫 Beaver bid 5, took 1 (advance 10🐟)` — same auction, River 1 (2🐟/item). Otter paying 4 for 4 workers (not 8) briefly looked like a fish-charge bug. I checked the code (`billable * playerCardCost(card, idx)`): it's **Otter's Kelp Bed reed discount** (reeds −1/item → 1/item even at River 1). Working as intended. **UX suggestion:** the bid-result log doesn't say *why* two players pay different rates for the same bid count — annotating the discounted per-item rate (e.g. "bid 4 ×1🐟 [Kelp Bed]") would prevent a player from suspecting a bug, as I momentarily did.

### Pivoting onto mud (turns ~5–8)
Once mud surfaced I executed the plan cleanly, and the table's structure paid off: **mud was completely uncontested** (no opponent's bias is mud), so I bought it at 1🐟/item with the Mud Burrow discount while Beaver and Otter spent themselves jamming over reeds and vines. Key grabs:
- **Pulled Mud Flat (HW3), bid 5** for a full haul — Otter reflexively jam-bid 1 (took 0, paid 1), so I got 4 mud. Amortizing the fixed pull cost over a big uncontested haul is the textbook "buy your specialty upstream cheap."
- **Pulled Hidden Inlet (HW3 reeds), bid 2** for Burrow Network's 2 reeds — grabbed while *both AIs were tapped out* (supply 0), a recurring window I exploited all game: when opponents have no workers in supply, even contested materials go uncontested.

### Build 1 — Burrow Network + a clever free conversion (turn ~9)
Built **Burrow Network** (mud3+reeds2) *first* so its "when you build a mud structure, move a worker" trigger would fire on my *later* mud builds (sequencing matters — build the engine before the things it rewards).

**Cleverest moment of the game:** Burrow Network's move-worker trigger let me **move my last mud worker onto the board's final open clay icon — converting mud→clay for free.** Clay was the scarce, Otter-contested material I needed 1 more of for Floodgate; mud was the cheap one I had spare. So I dodged a contested clay auction entirely and locked Floodgate's clay (3) for free. This kind of "use an engine trigger to launder a cheap material into a scarce one" is exactly the satisfying combo the game wants, and it felt great.

### Builds 2–3 — Floodgate, then Pack Rat Burrow caps the engine (turns ~10–16)
- **Floodgate** (mud4+clay3, **8★**) — my 2nd mud structure. A small bonus along the way: taking the last icon of **Mud Wallow** shorelined it with me holding the most workers → its effect **moved me back 2🐟** (a tempo *gain*). Nice.
- **Pack Rat Burrow** (mud2+reeds2, 4★) — my 3rd mud structure, **capping Burrow Network's engine at +9** (max). I fed its mud from the wild **Mud Slick** (clay/mud, 7 icons) I'd grabbed at 1🐟/item while the AIs were tapped. Burrow Network's trigger fired again — this time I **converted a wild worker → stone** (moving it onto an open Cairn stone icon) to set up Stone Pool. Same trick, second flavor: launder a flexible material into the one I needed.

### Builds 4–6 — padding once the engine was capped (turns ~17–25)
Engine maxed, so additional builds were just raw VP. I added:
- **Stone Pool** (stones3+clay2, **6★**) — using 3 stones (2 bought uncontested + 1 from the wild→stone conversion) and 2 wild-as-clay. (Its "reorder top 5 material cards" effect was moot — only 2 cards left in the deck.)
- **Sap Drip** (logs2+vines2, **4★**) and **Snag Pile** (reeds2+stones1, **3★**) — cheap pads off abundant late-game materials. The wild **Driftwood Tangle** (logs/reeds) covered Snag Pile's reeds as reeds.

### The Floodgate-ability prompt (worth knowing about)
When I triggered an auction on a **River 2+** card *after* building Floodgate, the game popped a **"🚪 Floodgate? Slide this card 1 space toward the Headwaters? (Use it / Skip)"** modal *before* bidding. This is correct (it's Floodgate's once-per-game ability), and I used it well: sliding a **Silt Bank** mud card from River 2 (2🐟/item for me) to River 1 (**1🐟/item** with my Mud Burrow discount) **halved my mud cost** — 3 mud for 3🐟. Good combo. (Flagging it only because it's an easy-to-miss extra prompt that interrupts the normal pull→bid flow; for a human at the table it's clearly visible.)

### A chase that didn't pan out — Streambank Hollow
I tried to squeeze in a 4th mud structure (**Streambank Hollow**, mud3+vines1, the recall-tempo card the strategy guide names for Muskrat) for one more pad. I bought the 3 mud (via the Floodgate slide above) but **every vine icon on the board was already claimed and the deck was empty** — so I could not get the single vine it needed and the build was dead. Those 3 mud stranded (scored 1★ as a pair). A reminder that committing fish to a build before you've secured *all* its materials is risky once the deck dries up.

### Endgame — finish line, retire, coda
- **Beaver crossed 109 first** and retired to 110, which **unlocked Retire for everyone.**
- With no buildable card left (Streambank Hollow dead; Charcoal Pit needed 4 clay I didn't have), I **retired to the lowest open spot, 109** — claiming the low finish (also the tiebreaker, though I was already ahead on VP).
- Otter crossed to 112. The **coda** ran ("each player may make one last build with workers they hold") — all three of us had **no final build available**, so it resolved immediately into scoring.

---

## Final result

| Place | Player | VP | Fish | Structures | Breakdown |
|------:|--------|---:|-----:|-----------:|-----------|
| 🥇 1 | **Muskrat (me)** | **35★** | 109 | 7 | 25 printed + **9 Burrow Network engine** (3 mud structures ×3, capped) + 1 worker pair (3 mud) |
| 2 | Beaver | 23★ | 110 | 5 | 12 printed + 6 Vine Trellis (×3 vine structures) + 2 Reed Walkway + 3 worker pairs |
| 3 | River Otter | 11★ | 112 | 3 | 7 printed + 3 Cattail Patch (4 distinct materials) + 1 worker pair |

I also finished farthest back (109), so I'd have won the tiebreaker too.

---

## Did the strategy guide hold up? (yes)

The guide's Muskrat plan worked almost to the letter:
- **"Commit to your material early, feed Burrow Network."** Drafting Mud Burrow + building 3 mud structures to cap the +9 engine was the spine of a 35-point game.
- **"Mud is the flexible middle… contested enough to matter, cheap enough to win."** In this 3P table (logs Beaver, reeds Otter), **mud was effectively *un*contested** — I almost always took it at 1🐟/item while the AIs jammed each other over reeds/vines. The "win the material nobody else wants" thesis was the whole game.
- **"Specialize *or* diversify, not both."** I specialized (mud engine), capped it at +9, *then* padded with off-engine VP (Stone Pool/Sap Drip/Snag Pile) — which is the right move only because the engine was already maxed.
- **"Hold a worker until the structure that needs it is in hand."** The Burrow Network move-trigger conversions (mud→clay, wild→stone) were the standout expression of this — laundering cheap held material into scarce material for free.

## Things that were clever / interesting / fun
1. **Burrow Network's move-worker trigger as a free material converter** (mud→clay, then wild→stone) — dodging contested auctions by relocating a worker onto the icon I actually needed. Most satisfying mechanic of the session.
2. **Floodgate sliding a mud card to River 1** to halve my per-item cost via the Mud Burrow discount — a clean species-engine combo.
3. **Exploiting opponents' "tapped out" windows** (supply 0): when both AIs had all workers committed, even their pet materials (reeds) went uncontested for me.
4. **Mud Wallow's shoreline "most workers → back 2🐟"** giving me a tempo *gain* on a purchase.
5. **Sitting out the reed/vine jams** while Beaver and Otter repeatedly burned 4🐟 each fighting over staples — the contrarian-material thesis in action.

## Things to flag for the designer
1. **Mud-drought / "can't act on my plan" friction (most important):** a player whose hand + species commit hard to one material can spend the first several turns with *no productive action* if that material doesn't surface. Realistic market tension, and it self-corrects, but it's the sharpest new-player frustration point. Possibly worth a small mitigation (e.g., guarantee ≥1 of each material in the opening Headwaters or first few deck cards) or at least a strategy-guide line acknowledging "if your material isn't out yet, cycle cheaply and wait — don't force it."
2. **Auction-log doesn't explain per-player discount rates.** Two players paying different fish for the same bid count (Kelp Bed) momentarily reads as a bug. Annotate the effective rate in the result line.
3. **Otter AI over-contested.** It repeatedly bid 1 into auctions it couldn't win (took 0, paid full freight) and pulled off-bias materials (mud, stones, vines — presumably chasing Cattail Patch diversity), ending with only 3 structures / 11 pts. Beaver played a far more coherent vine+reed engine (23 pts). Worth checking whether the AI's contest heuristic is too trigger-happy and whether it under-values just *building*.
4. **Invent floor is 2** (correct per rules) but easy to mis-expect as 1 — minor.
5. **The "build before you've secured every material" trap** (my dead Streambank Hollow) is a real risk once the deck empties and a needed material is fully claimed — the game gives no warning, which is fine, but it's a sharp edge.

## Harness/driver note (not about the game)
I drove this via CDP/Playwright. Two self-inflicted snags worth recording so the next run avoids them: (a) the **Floodgate "Use it/Skip" modal** fires before bidding on River-2+ auctions once Floodgate is built — a driver must answer it or the auction appears to "hang"; (b) the **built-in Undo** ("↶ undo last move," snapshotted at the start of each human turn) cleanly recovered me from a stuck state — a nice, robust UX feature in its own right.

