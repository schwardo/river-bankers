# River Bankers — 3-player web playtest (Claude vs Friendly Otter + Greedy Muskrat)

- **Date:** 2026-09-07 (Mon), played on the live site: https://leftfield.games/games/river-bankers/play/
- **Player:** Claude ("You") as 🦫 Beaver, driving the real browser UI
- **Opponents:** 🦦 River Otter (Friendly AI), 🐭 Muskrat (Greedy AI)
- **Optional rules:** defaults — species starter cards ON, double-card auctions OFF, first-mover advantage (initiator consolation) ON
- **Prep:** read the rulebook and strategy guide PDFs before playing
- **Result:** **Muskrat 28★ (93🐟) · Beaver (me) 26★ (95🐟) · Otter 19★ (94🐟)** — lost by 2★
- Sim time 57:08; "average decision time 109.4s/turn over 19 turns" (that's browser-automation latency, not deliberation — though some of it was)

## Setup & draft

Dealt hand: **Lookout Tree** (8★, Logs×5 Stones×2), **Pier** (0★+2/shoreline, Logs×3 Stones×2), **Cache Burrow** (4★, Mud×2 Reeds×2). With a log-heavy 8★ in hand I drafted **Lodge Foundation** (logs builds cost 1 fewer fish), per the strategy guide. Otter took Kelp Bed, Muskrat took Mud Burrow. Opening Headwaters: Mud Wallow / Trailing Vine / Clay Seep.

## Turn-by-turn log

Numbers are fish-track positions after the event. "HW" = Headwaters. My bids listed as me/otter/muskrat.

1. **Me — Pull Clay Seep (HW1, 2🐟), bid 2.** Bids 2/0/1, fits. I take 2 clay, Muskrat 1. (me 4, o 0, m 1). Mud Slick (clay/mud wild ×7) refills.
2. **Otter — Pull Trailing Vine (vines ×5).** Bids 0/2/4 — **jam #1** (6 on 5). Otter 1 vine, Muskrat 3 vines. Logjam (logs ×7) refills. (4/4/5)
3. **Otter — Pull Logjam (logs ×7, pays the 4🐟 trigger).** I ride the auction: bids 4/4/1 — **jam #2** (9 on 7), Muskrat's 1-worker snipe converts a clean split into a jam. I take 2 logs (wanted 4), Otter 2. Cairn (stones ×4) refills. (8/12/6)
4. **Muskrat — Pull Cairn.** Bids 1/2/3 — **jam #3** (6 on 4). Only Muskrat scores (1 stone). I burn 1🐟 for nothing. (9/14/13)
5. **Me — Swim Logjam @R1, bid 3.** Bids 3/1/0 — **jam #4**, Otter's snipe this time. I take 2 logs for 7🐟 total (4 logs now). (16/16/13)
6. **Muskrat — builds Vine Trellis (0★ engine), then Swim Cairn @R1.** Bids 2/1/3 — **jam #5, FULL jam** (6 on 3): nobody clinches, **initiator consolation** gives Muskrat 1 stone. I burn 4🐟. (20/18/22)
7. **Otter — Swim Cairn @R2.** I pass (discipline per guide — stones were a knife fight). Bids 0/2/1 — still jams; Otter gets 1 stone for 6🐟, Muskrat snipe burns 3🐟. (20/24/25)
8. **Me — Swim Logjam @R2, bid 1 (uncontested).** Log #5 for 4🐟. Logjam graduates to shoreline with my 5 log workers aboard. (24/25/25)
9. **Me — Swim Cairn @R3, bid 1 (uncontested).** Stone #1 for 5🐟. Supply now 0. (29/25/25)
10. **Muskrat — Pull Driftwood Tangle (logs/reeds wild ×5).** I pass (0 supply; refused to recall). Bids 0/1/4 — exact fit for once. Muskrat takes 4 wilds → Reed Walkway fuel. (29/26/33)
11. **Otter — Pull Mud Wallow (mud ×4).** I pass. 0/2/2 exact fit; the "most workers moves back 2" shoreline bonus **ties → nobody**. (29/30/35)
12. **Me — Invent 2 (2🐟).** Drew Hidden Cache, **Burrow Run** (Vines×3 Mud×1, 4★, "slide back 5 when built"). Kept Lookout/Cache Burrow/Burrow Run, ditched Pier + Hidden Cache. (31/30/35)
13. **Otter — Swim Trailing Vine @R1 (last vine).** Pass; Otter takes it. (31/33/35)
14. **Me — Pull Mud Slick (clay/mud wild ×7) at the cheap 2🐟 slot, recalling my 2 clay to fund the bid.** Key read: *everyone was at 0 supply and the Greedy profile never voluntarily recalls* — Muskrat literally could not bid. Uncontested: 2 wilds for 4🐟. **Rocky Shoal (stones ×5) refills** — the missing Lookout stone appears. (35/33/35)
15. **Otter — builds Slipstream (5★), freeing 4 workers.**
16. **Me — Pull Rocky Shoal (4🐟), recall 1 wild, bid 1.** Second big read: only Otter could fight, and their Heron Watch demand (~4 stones) plus my 1 fits inside 5 icons. Bids 1/3/0 — clean fit. **Stone #2 for Lookout.** (40/39/35)
17. **Muskrat — builds Reed Walkway (0★ engine) with the Driftwood wilds, then auctions Mud Slick @R1** — I can't bid: my only recallable worker is on the auctioned card itself (recall from the auctioned card is barred). Muskrat takes 2 wilds.
18. **Otter — builds Mill Wheel (6★).**
19. **Me — BUILD LOOKOUT TREE: 8★ for 3🐟** (Lodge Foundation discount). 7 workers freed. (43 all tied)
20. **Me (chair kept) — Pull Vine Curtain (vines ×4), bid 3.** Bids 3/2/2 — **jam #6, FULL jam** (7 on 4): nobody clinches, consolation hands me 1 vine for 6🐟. AIs burn 2🐟 each. (49/45/45)
21. **Muskrat — Swim Vine Curtain @R1.** Bids 1/1/3 — **jam #7**: Muskrat max-bids, takes 1 vine for 6🐟; Otter and I burn 2🐟 each. (51/47/52)
22. **Otter — Pull Vine Thicket (vines ×7).** Bids 3/3/2 — **jam #8** (8 on 7), mild: I take 2 vines (Burrow Run funded), Otter 2, Muskrat 1. (54/54/54 — all three pawns stacked on one space)
23. **Muskrat — builds Clay Vault (0★, +3★/clay structure engine)** — and uses the Vine Curtain peek to move a Clay card to the top of the deck.
24. **Otter — Swim Rocky Shoal last stone.** Pass (1-icon initiator auctions are unwinnable for riders). (54/57/56)
25. **Me — BUILD BURROW RUN: logged as 0🐟, 4★, then slide back 5.** Net *gain* of track position. Spending Vine Curtain workers triggered *my* peek — I reordered the deck to **Mud ×7 before Clay ×5**, delaying Muskrat's Vault fuel. (49/57/56)
26. **Me — Pull Reed Stand (reeds ×5), bid 2.** Bids 2/1/3 — **jam #9**. I take 1 reed, Muskrat 2. Silt Bank (the Mud ×7 I ordered up) refills. (53/58/59)
27. **Me — Swim Reed Stand @R1, bid 1 (uncontested).** Reed #2. (56/58/59)
28. **Me — Invent 2.** Drew Stone Pool + **Flush Channel** (Mud×3 Reeds×1, 6★, "discard 1 HW card out of game"). Kept Cache Burrow / Sap Drip / Flush Channel. (58/58/59)
29. **Me — Pull Silt Bank (mud ×7, 4🐟), bid 5.** The haul of the game: bids 5/0/1 — clean, **5 mud for 9🐟**. Cache Burrow fully funded + Flush Channel's mud. (67/58/60)
30. **Otter — Swim Vine Thicket; Muskrat — Pull Boulder Field (stones ×7)** — I pass both. Muskrat takes 3 stones; Hidden Inlet refills. Otter builds **Portage (6★)**.
31. **Otter — Swim Boulder Field**, takes 2 stones (Heron Watch chase). Muskrat builds **Confluence (5★)**; Reed Walkway's perk places a free worker to snipe the last Clay Seep clay.
32. **Me — BUILD CACHE BURROW (2🐟, 4★).** +1 hand size, draws: Charcoal Pit, Cattail Marsh. Still my turn (stacked on top at 69). VP check at this point: **18 / 18 / 18 — dead heat.**
33. **Me — Pull Marsh Edge (reeds ×7), bid 3.** Bids 3/1/2 — clean. 3 reeds for 5🐟. Fallen Limb (logs ×4) refills — the deck's last log card, which Lookout's peek had telegraphed. (74/70/71)
34. **Otter — Portage swap #1** (converted a reed worker into Muskrat's stone), then **Pull Fallen Limb.** Bids 2/2/1 — **jam #10** (Muskrat snipe). 1 log each for me and Otter. **Material deck empty → +1🐟/turn drift begins.** (76/79/72)
35. **Muskrat — Swim Fallen Limb @R1.** I ride with 1: 1/0/1 exact fit — log #2 for Sap Drip. (78/79/75)
36. **Me — BUILD FLUSH CHANNEL (2🐟, 6★)** and use its effect to **discard Clay Bank (clay ×5) out of the game** — Muskrat's Clay Vault engine is now capped at +3. (81/…)
37. **Muskrat — builds Reed Bed (4★).** Otter picks up a reed with Kelp Bed discount visible in the log ("2🐟 [Kelp Bed]").
38. **Me — Swim Vine Curtain @R2, bid 2.** Bids 2/0/1 — **jam #11** (Muskrat's 8th snipe of the game). 1 vine for 7🐟; needed 2 for Sap Drip. (88/…)
39. **Muskrat — Pull Hidden Inlet (reeds ×4), takes 3 reeds, crosses, retires at 91.**
40. **Otter — the play of the game against me: Portage pays 3🐟 to swap their stone worker for MY vine worker** — Sap Drip's vines gone — then auctions the other vine as initiator (unbeatable) and takes it. **Crosses, retires at 94.** (I had planned a snipe-proof consolation-trigger swim on that vine; Otter deleted the plan one move earlier.)
41. **Me — alone on the river.** Best remaining conversion: Swim Boulder Field @R2, bid 1 (uncontested) — a stone to pair with the stone Portage forced on me (+1★). Cross at 93 +1 drift → **retire at 95.**
42. **Final builds:** Muskrat builds **Snag Pile (3★)** — the winning margin. Otter and I have nothing buildable.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🐭 Muskrat (Greedy) | **28★** | 93🐟 | 7 | 12 printed + Trellis +4 + **Reed Walkway +8** + Clay Vault +3 + 1 pair |
| 2 | 🦫 Beaver (me) | **26★** | 95🐟 | 5 | 23 printed (Lodge 1, Lookout 8, Burrow Run 4, Cache 4, Flush 6) + 3 pairs |
| 3 | 🦦 Otter (Friendly) | **19★** | 94🐟 | 4 | 17 printed + 2 pairs |

## Moments that felt smart

- **The worker-freeze read (turns 14/16).** Realizing the Greedy profile never voluntarily recalls meant that when the whole table hit 0 supply, Muskrat was frozen out of auctions entirely. I recalled my dead clay into the cheap Mud Slick wild pull uncontested, then rode Otter's known stone demand into a guaranteed-fit 1-bid on Rocky Shoal for Lookout's last stone. Two auctions, zero jam risk, and it converted directly into the 8★ build. Best sequence of my game.
- **Burrow Run tempo loop (turn 25).** 4★ that *pays* 3 net track spaces, plus the Vine Curtain peek let me stack Mud ×7 ahead of Muskrat's Clay ×5. Deck manipulation + tempo + points in one action felt fantastic.
- **Flush Channel as a weapon (turn 36).** Discarding Clay Bank out of the game to hard-cap Muskrat's Clay Vault at +3 (it would have been up to +12). Muskrat still won, so arguably this was the difference between losing by 2 and losing by ~8.
- **The snipe-proof vine plan (turn 39)** — trigger a 1-icon auction so any jam resolves to me via initiator consolation. It was correct and it *still* died, because Otter's Portage stole the vine off my card a move earlier. Being out-thought by the AI here was honestly delightful.
- **The consolation rule is load-bearing.** It fired 3 times (Muskrat turn 6, me turn 20, and it shaped turns 39-40 planning). Without it, full jams would feel purely punitive; with it, triggering an auction is a real "floor" you can build plans on, exactly as the strategy guide describes.

## What beat me (self-critique, not game critique)

- **~15🐟 torched on losing/jammed bids in the first third.** The strategy guide's "bid for what you can win" is genuinely hard to follow when a Greedy bot makes every auction a knife fight; I calibrated to the table only around turn 7.
- Muskrat's **0★-engine bodies** (Trellis, Walkway) looked like they were losing all game — 6★ behind at one point — then scored +15 at the end. I under-weighted engine cards vs printed VP when choosing Invent keeps. Reed Walkway counting *any reed-using structure* (including 2 built later) is a quietly huge card.
- I retired at 95 (worst tiebreak spot). Didn't matter, but the last crossing bought +1★ for 4🐟 when bid-2-on-reeds three turns earlier would have been +1★ for 2🐟 and a better spot.

## Game-design observations

- **Jam frequency with a Greedy AI is extreme: 11 of ~24 auctions jammed**, and 8 of those involved a Muskrat 1-worker snipe. It's legal, thematic ("contention burns fish"), and it does punish the sniper too — Muskrat burned plenty — but as the human it felt relentless for the first half. Notably Muskrat *won*, so the snipe-tax strategy is at minimum not throwing. Worth watching whether human tables converge on constant 1-worker sniping, since it slows every auction and adds a lot of feels-bad; the queued-bid cap ("can't bid for items that aren't there") already softens it, and the consolation rule covers full jams, but partial-jam sniping has no cost asymmetry beyond the sniper's own fish.
- **The three-way 18/18/18 tie at mid-game** (turn 32) suggests the scoring bands are well balanced across three very different lines (my tempo/printed-VP, Otter's mixed, Muskrat's engines). Final spread 19–28 is healthy.
- **Portage is a monster in the endgame** — two uses in this game: converting a spare into a needed material, and surgically deleting my Sap Drip by swapping my vine away. Great card; possibly *the* Otter card.
- **Species discounts read well in play.** Lodge Foundation saved me fish on both log builds; Kelp Bed's discount showed up in the log lines; Mud Burrow's "min 1" floor made Headwaters mud pulls discount-neutral, which I exploited on the Silt Bank haul.
- The endgame drift (+1🐟/turn after deck-out) worked as advertised — the last ~8 turns moved briskly and nobody could stall.

## Bugs / UX issues found

1. **Recall-picker default silently prefers shoreline workers — a material-losing footgun.** Twice (Mud Slick pull, Rocky Shoal pull) the bid dialog auto-populated the required recall with **1 Log from my shoreline Logjam** — i.e. it defaulted to forfeiting a claimed material I needed for Lookout Tree, presumably because shoreline recalls "drop no blank." A player who doesn't notice the default would quietly lose build materials. Suggest defaulting to *no* recall selection (force an explicit pick), or preferring river workers of the material the player holds most of / least needs.
2. ~~**Burrow Run's build logged as "(0🐟, 4★)" but the card's printed fish cost is 2.**~~ **Not a bug** — checked after the game: `time: 0` is the printed cost in both `web/index.html` and `sim.js`, so the 0🐟 build is correct. My mistake in-game (I assumed a 2🐟 cost I never actually saw). It does mean Burrow Run is a 4★ card that costs nothing and *pays* 5 fish of tempo — a balance question, not a bug; see card balance section.
3. **In-game log is capped at 200 lines**, so by game end the opening ~40 events were gone. Fine for play; annoying for post-game review — the Game Over screen's breakdown partly compensates. A "download full log" affordance would be nice for playtesting.
4. **Setup screen renders text-only cards until the PNGs load** (headless quirk?): the starter-draft modal at first showed styled text cards, then imgs with alt text. Cosmetic only.
5. Minor text nit: auction-begin line for wilds reads "Auction begins on / Mud Slick (Clay/Mud wild)" — a stray leading slash before the card name (icon didn't render in text form, probably fine in the real UI).
6. **Not a bug, worth knowing:** the "average decision time" stat on the Game Over screen counts all human wall-clock time (109.4s/turn here was automation overhead) — as designed per the tooltip, but it will make remote/async playtests look slow.

## AI observations

- **Greedy (Muskrat) is a strong opponent and won deservedly**: relentless snipes, max-bids on things it needed, never wasted recalls, and its engine assembly (Trellis→Walkway→Vault→Reed Bed→Snag Pile) was coherent. Its stated design note ("plays at roughly fair share") undersells it at this table.
- **Friendly (Otter) bid more contentiously than its name implies** (its 1-worker ride-alongs caused two of my jams) but under-converted: 4 structures, 19★, and it left Heron Watch unbuilt despite collecting ~6 stones. The two Portage plays were its best moves — the vine steal was the single most impactful AI action of the game.
- Neither AI ever used Flush; the Flush action also went unused by me. Sample of one game, but it may be priced out at 5🐟.

## Card balance impressions (one game — treat as tentative)

**Possibly over-powered:**

- **Reed Walkway** — the game's winning card. 0★ printed, cheap to build mid-game (4 reeds + 1 mud, and Muskrat paid much of it with wildcards), then scored **+8★** by counting *every* reed-using structure built afterwards (Reed Bed, Snag Pile, itself, Cattail-family). Its in-game perk (free worker placement on a River 1 card on qualifying builds) also stole two icons outright, including the last Clay Seep clay. Compare Vine Trellis, same shape, which only managed +4. If reeds-using structures are simply more numerous in the deck (the quick-ref suggests reed/mud structures are the widest band), Walkway's ceiling is systematically higher than its siblings'.
- **Portage** — 6★ printed *plus* a repeatable as-an-action swap that is both a fixer (turn a spare into the material you need) and a targeted attack (it deleted my Sap Drip by swapping my vine worker away, ~4★ swing, for 3🐟). Every other "interaction" card I saw is once-per-game; Portage is every-turn-if-you-pay. It was the most impactful single card in the game and it's also the only one that produced a genuine feels-bad moment — see anti-fun below.
- **Burrow Run** — 4★ for vines×3 + mud×1, and the build *itself* logged 0🐟 and slid me back 5: strictly positive tempo attached to positive VP. Even at the printed 2🐟 it's excellent; at the observed 0🐟 (see bug #2) it's an auto-take. If the 0🐟 is real and intended, I'd call it the best tempo card in the deck by a wide margin.

**Possibly not worth their cost:**

- **Pier** — 0★ for logs×3 + stones×2, paying +2★ per shoreline card *with at least one of your workers*. The award fights the game's core loop: your shoreline workers are exactly the materials you want to spend on builds, so Pier asks you to strand inventory (which itself only pairs for ½★) to activate it. Five contested-staple icons for a card that pays only if you play badly-adjacent. I discarded it without regret.
- **Hidden Cache** — vines×2 + stones×3 + clay×2: seven icons across the three most awkward materials for a diversity bonus capped at +9, on a 0★ body. The cost profile (three different colors, all specialist/contested) makes the "max" feel theoretical.
- **Heron Watch** — Otter hoarded ~6 stones all game and still never built it (stones×4 + logs×2 for +1★/shoreline card, max +6). Shoreline count is slow to develop and partially opponent-controlled; the cost is two staples that always jam. Its non-build was a big part of why Otter finished last.
- **Cattail Marsh** — the "each reed worker counts as 2 reeds" discount is lovely, but the card costs reeds×4 + mud×2 *itself* and doesn't benefit from its own effect, so the discount arrives exactly one reed-war too late. By the time I drew it (late), it was unplayable; I suspect it's only good drawn early by the Otter.

**Anti-fun watch list:**

- **Portage's worker steal** (swap targeting an opponent) is the one moment I'd flag: strategically great, emotionally rough — it invalidated a two-turn plan with zero counterplay for the victim (no reaction window, no cost paid *to* me, unlike Tribute Stone's 3🐟 compensation). If it ever needs a touch, making the swapped-away player's compensation mirror Tribute Stone (slide back 1–3🐟) would keep the play while softening the sting. I'd playtest more before changing anything — being outplayed is allowed to hurt.
- **Material-card effects mostly whiffed this game:** Mud Wallow's most-workers bonus **tied → nobody** (feels like a dead letter on a 4-icon card at 3P where 2/2 splits are natural), and Hidden Inlet's solo-worker bonus never fired visibly. The wilds and Vine Curtain's peek, by contrast, all pulled real weight. Cheap fix for Mud Wallow if it whiffs often: ties go to the earlier-placed (or farthest-back) player instead of nobody.
- Nothing on the table read as broken-OP in the "warps every game" sense; the closest is Reed Walkway's ceiling, which is worth tracking across the BGA alpha stats.

## Verdict

Terrific session. The tempo economy (fish = turns) is the real game and it *sings* once you internalize it — my favorite decisions were all "who pays, and when," not "what do I take." Losing 26–28 to the Greedy bot after leading most of the way, with the winning margin traceable to two specific AI plays (the Portage steal and the Snag Pile final build), is exactly the kind of loss that makes you queue up a rematch.
