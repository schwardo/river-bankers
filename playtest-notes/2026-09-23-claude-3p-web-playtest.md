# River Bankers — 3-player web playtest #3 (Claude as Muskrat vs Greedy Beaver + Friendly Mink)

- **Date:** 2026-09-23 (Wed), local build `web/index.html` @ 922c06e (after the 2P fixes), driven through the browser UI via Playwright
- **Player:** Claude ("You") as 🐭 **Muskrat**. This is the first logged web game with Muskrat in the human seat. I've now played every species at least once.
- **Opponents:** 🦫 Beaver (**Greedy**), 🦡 Mink (**Friendly**)
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF (so the effect cards and the raft are live).
- **Prep:** read the rulebook (16pp) and strategy guide (11pp). I followed the guide's Muskrat line on purpose: *"Burrow Network. Mud Burrow's discount feeds a wide mud tableau."* My opening hand was Spillway, Driftwood Snag and Burrow Network, and all three use mud, so drafting **Mud Burrow** was an easy choice.
- **Result:** **Muskrat (me) 34★ (92🐟) · Beaver 20★ (90🐟) · Mink 16★ (91🐟)**, a 14★ win
- 18 of my own decisions. **35 auctions:** 25 fit, 10 jammed (17 workers overbid in total), and none had zero bids. Zero console errors or page exceptions.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🐭 Muskrat (me) | **34★** | 92🐟 | 6 | 24 printed (Spillway, Stone Pool, Driftwood Snag, Heron Roost) + Burrow Network **+9** + 1 pair |
| 2 | 🦫 Beaver (Greedy) | **20★** | 90🐟 | 4 | 12 printed + Stone Causeway +6 + 2 pairs |
| 3 | 🦡 Mink (Friendly) | **16★** | 91🐟 | 4 | 14 printed + 2 pairs |

**My line:** Mud Burrow draft → Burrow Network (fish 23, *first build*) → Spillway (0🐟, so I kept the chair) → Stone Pool (reordered the last 3 material cards) → Driftwood Snag (maxed Burrow Network at +9) → Heron Roost (the crossing build).

**Why it worked:**
- I built the 0★ engine first and fed it afterwards, exactly as the guide says ("commit to one early and feed it all game").
- Burrow Network reached its +9 cap from Burrow Network, Spillway and Snag. That's the same three-structure cap I hit as Otter in the 2P game. I had to work for it this time, though. **Mud was the only material I needed that nobody else wanted:** Beaver bid on a pure-mud card only once (1 worker, on Mud Wallow), and Mink never initiated a mud auction.
- Tempo was the other half. Two 0-or-cheap actions (the Spillway build and a 1-icon mud swim) each gave me a second turn straight away.

## Game story in eight beats

1. **Turn 1: the raft that sank on launch.** Mink opened by pulling **Flotsam Raft** at Headwaters 1, and all three of us bid 2. That's 6 of 6 icons, so every icon was claimed and the card "graduated" straight toward the shoreline. The raft never reaches the shoreline, so that triggers last call. The river was empty, so nobody had anywhere to ferry to. All six workers went home and **6🐟 of opening tempo simply vanished** (2 each). I bid 2 without seeing it coming. See Rules #1.
2. **A free Driftwood Tangle from a full jam.** I pulled Driftwood Tangle and bid 2. Beaver bid 4 and Mink 3: 9 bids on 5 icons, overbid 4, so nobody clinched and **first-mover** gave me 1 wild for 6🐟. Beaver and Mink paid 7🐟 between them for nothing. The consolation rule did exactly what the guide says it's for.
3. **Muskrat's river discount.** Mud Flat drifted into River 1 with 1 icon left. With Mud Burrow, that swim cost me **2🐟 flat and couldn't be contested** (a lone icon always goes to the initiator). It left me on top of the lowest space, so I got another turn. That's the "string of small, cheap, decisive actions" from the guide.
4. **Mud Wallow: the felt-smart moment.** Both rivals were down to 1 worker in supply. I pulled Mud Wallow (4 mud) and bid 2, expecting 1+1 from them. They did bid 1+1, so the card filled exactly and went straight to the shoreline. I had the most workers on it, so **I moved back 2**. Net cost: 2 mud for 3🐟, pull fee included. Reading rival supply → sizing my bid to *fill* the card → triggering its own effect on myself felt like the game working exactly as intended.
5. **Striking when they're empty.** At fish 32 both rivals were at 0 supply. I pulled Fallen Limb (4 logs) and bid 3. Greedy Beaver **recalled a worker off Basking Rocks, a river card**, just to bid 1 (see Rules #3). The total fit, so I still took 3 logs at 1🐟 each. That set up Spillway: 0🐟 to build, 6★, it washed an empty card to the shoreline, and I kept the chair.
6. **Stone Pool as deck control.** With 3 cards left in the material deck, Stone Pool's reorder let me put the Mud 7 (Silt Bank) on top and the Reeds 4 (Hidden Inlet) at the bottom. That's a strong effect late in a 3P game. It's weak in the modal UI because the cards appear as "Mud (7 icons)" with no names (UI #3).
7. **Getting punished.** Beaver's Tribute Stone made me recall my Vine Curtain vine (+3🐟 back for me, which was fine). Then Beaver **used Mill Wheel to copy *my* Driftwood Snag** and blanked a Silt Bank mud icon. That was a smart denial of the mud I was about to need, and it's the first time I've seen an AI use Mill Wheel against the player it copies from. The same turn, a 4-icon Vine Thicket swim of mine turned into a 7-on-4 pile-on (me 1, Beaver 4, Mink 2). Beaver got 1 vine for 8🐟, and Mink and I paid 4🐟 and 2🐟 for nothing.
8. **Flush with one card left.** I needed a third reed for Heron Roost, and the only reed card left was at the bottom of a 1-card deck, which I'd put there myself with Stone Pool. **Flush** (5🐟) dealt it into the Headwaters, and I auctioned **Hidden Inlet**. I bid all 4, hoping to fill it solo and slide back 4 (Hidden Inlet: "exactly one player's workers when it reaches the shoreline"). Mink spoiled it with 2, so I got 2 reeds and no bonus. On the last turn I built Heron Roost from 89 to cross the line and retired on 92, behind Beaver (90) and Mink (91). The tiebreak didn't matter.

## Rules / engine issues (highest value first)

1. **A fully-claimed Flotsam Raft at the Headwaters is destroyed on the spot.** This is consistent with the text, but it's a trap:
   - **What happens:** the raft is auctioned at 1🐟/item. If every icon is claimed, the universal movement rule sends it to the shoreline, and the raft rule turns that into last call. On turn 1 the river is empty, so there is nowhere to ferry, and every worker comes home with its fish spent.
   - **Why it's a trap:** in 3P a 6-icon raft fills exactly from a 2/2/2 split, which is the *natural* bid for everyone who read "stage cheaply at the Headwaters". The strategy guide sells staged workers as "a bank with six withdrawal slips". This bank can close before the first deposit clears.
   - **Suggested fix (pick one):**
     - (a) A raft whose icons are all claimed **stays in place and drifts normally**; it only leaves when it slides off River 4. That matches its "deposit that matures downstream" identity.
     - (b) Keep the rule, but add a strategy-guide line: "never fill the raft; leave at least one icon open."
     - (c) At minimum, teach the AI (Mink *initiated* it and bid 2 into an obvious fill).
   - **Log nit:** "Flotsam Raft is about to leave the river — last call" is printed while the raft is still in the **Headwaters**.
2. **Wildcard per-item discounts only follow the card's primary material.**
   - `playerCardCost` (web l.2126) looks up `MATERIAL_DISCOUNT_CARDS[card.material]`. `sim.js` l.227 and BGA `Rules/Effects.php` l.19 do the same.
   - So **Mud Slick** (clay/mud) gets Mink's Clay Den −2 but *not* Muskrat's Mud Burrow −1, and **Driftwood Tangle** (logs/reeds) never gets Kelp Bed or Reed Bed.
   - I paid 2🐟/item instead of 1 on my Mud Slick swim at fish 55. That's small, but the asymmetry favours Mink and Beaver's primaries (Clay, Logs) over Muskrat and Otter's secondaries (Mud, Reeds).
   - The rulebook (p.10: *"Structure effects that discount a material's per-item cost…"*) doesn't say which applies. If primary-only is intended, say so on p.13 next to the wildcard text. If not, discount by the *better* of the two materials for that player. All three engines would need the change, which is a behaviour change that fits the locked schema.
3. **Greedy recalls workers off the river.** Its blurb says *"never pulls workers back off the river"*. At fish 35 Beaver recalled 1 worker from **Basking Rocks while it sat at River 1** (Be3 → Be2) to spoil-bid 1 on my Fallen Limb pull. The 2P log noted a Greedy recall from the *shoreline*. This one is from the river, so it contradicts the blurb. Either the recall logic or the blurb is wrong.

## Rules / doc ambiguities

1. **Hidden Inlet and Mud Wallow can be triggered deliberately by filling a card.** Beat 4 (Mud Wallow) worked. Beat 8 (Hidden Inlet) would have been net free: 4 reeds for 4🐟, then back 4. That's legal and fun, and it's a great "read the table" play, but neither document mentions it.
   - The strategy guide only warns that Old Growth and Basking Rocks move value around. One line would help, e.g. "Mud Wallow and Hidden Inlet fire the moment a card is claimed full at the Headwaters, so a bid that exactly fills the card can pay you back."
   - Balance note: a solo fill of Hidden Inlet at the Headwaters is **4 free reeds** whenever rivals bid 0. That only happens late, when supplies are empty, but it's a real edge.
2. **Retiring after a rival's auction bill.** Paying for a bid in *someone else's* auction can carry you across the line. I avoided it here (bid 1 at 87, not 2), but p.12 only says "one of your actions". Say whether a bid in another player's auction counts as your action for crossing.

## UI bugs / UX issues

1. **The Spillway modal and log line hard-code 🦫** (web l.7993 and l.8018): "🦫 Spillway — wash a River 1 card", "🦫 Spillway washes Vines (R1)". This showed while *Muskrat* built it. Also:
   - The log line says "Vines" rather than "Trailing Vine".
   - "📍 Trailing Vine drifts to the shoreline" is printed **before** "Spillway washes… to the shoreline", so it reads as two separate moves.
2. ~~**A stray "/" before wildcard names.**~~ **Retracted (driver false positive, again):** the slash sits between two SVG material icons and `innerText` drops the SVGs. On screen it reads icon/icon. See `playtest-notes/README.md`.
3. **Stone Pool's reorder modal lists cards as "Mud (7 icons)", "Clay (5 icons)".** It gives no card names and no effect badges. With effects live, "Reeds (4 icons)" hides the fact that it's **Hidden Inlet** (solo bonus), which matters a lot when you're choosing the order. The modal also offers **Cancel** on a mandatory "when built" effect. I didn't test what Cancel does. Check that it doesn't skip the effect silently, or else relabel it "Keep order".
4. **Mill Wheel copy log order is reversed.** "Driftwood Snag: 🦫 Beaver drops a blank on Mud (+1🐟)" is printed *before* "⚙ Mill Wheel: 🦫 Beaver copies Driftwood Snag". It reads as though Beaver owns a Snag. The blank was also placed on "Mud" at Headwaters 2; the card name (Silt Bank) and slot would help.
5. **Retired pawns vanish from the fish track** (`renderTimeTrack`, web l.3218, filters `!p.out`). At fish 89 the track showed only my pawn, and Beaver on 90 and Mink on 91 were gone. Those finish spots decide the tiebreak and where I'd land if I crossed, so they should stay drawn, maybe dimmed like exhausted pawns. The Retire button did correctly say "advance to space 92".
6. **Burrow Network's build trigger silently does nothing** when you have no workers on river cards. I built Spillway with every worker on the shoreline and got no log line. A "Burrow Network: no river worker to move" line would confirm the card is working. When it *does* fire, the modal is good: it lists the source cards with their slot and rate, and has a Skip.
7. **Stale turn-order line (seen once).** Right after my Burrow Network build (me 26, Mink 23), the panel read "🦡 Mink is taking their turn. | You're tied with Mink in turn order." The code (l.3824) computes `human.timePos − cur.timePos`, so this was probably a render before my pawn advanced. It's minor, and I didn't reproduce it.
8. **Playtest-driver note (not a game bug):** `humanSelectBuild(i)` returns a promise that awaits the build's modal (Spillway's pick, Stone Pool's reorder). A Playwright `page.evaluate` on it blocks until someone clicks, which hung my driver for a turn. Future scripted playtests should fire actions via `setTimeout(() => …, 0)`.

**Worked well:**
- The bid panel's supply/fish preview, including recall rows that are named and tagged "(no blank)" / "(drops a blank)".
- "Still on top of the lowest space — takes another turn" made chair-keeping readable. It fired 4 times for me.
- The final-build line: "no final build available (closest: Spy Mound — needs 4 more Stones + 1 more Clay)" is exactly the right explanation.
- Flush with a 1-card deck behaved as the updated p.9 says.
- The game-over breakdown and the in-hand READY / "last turn" badges on Heron Roost.

## AI observations

- **Greedy Beaver is the stronger AI again, but it's all denial and no engine.**
  - It jammed my first two big pulls, spoil-bid 1 into three of my auctions (Clay Seep, Mud Slick, Marsh Edge; each cost me an icon), recalled off the river once to bid (Rules #3), and used Mill Wheel + my Snag to blank mud I needed.
  - But it built only 4 structures. It spent 8🐟 on one vine at fish 71, and it finished holding Twig Bridge (4 vines) with 3 vines on the shoreline. One vine short of 5★.
- **Friendly Mink was weak (16★) and churned.**
  - It opened by filling the raft (beat 1).
  - At fish 34 it paid 3🐟 to pull Trailing Vine for 1 vine, then recalled that vine the next turn to swim-bid 1 on a 1-icon Reed Stand.
  - It used Hollowed-out Log to recall its own Vine Curtain worker, then re-auctioned the icon it had just freed.
  - It never contested mud and only took clay in 1-icon swims. With Clay Den (−2), clay should be its bread and butter, but I took 3 of Clay Seep's 4 clay while it had 0 supply.
- **Neither AI touched Silt Bank, Clay Bank or Rocky Shoal at the end.** 17 Headwaters icons went unauctioned when the game ended. That's partly the deck-empty clock, but it also means the last ~15🐟 were spent swimming leftovers rather than building.

## Balance / design impressions

- **Burrow Network is a lot of VP for very little.**
  - This is the second game in a row where it hit its +9 cap with three structures, one of them itself.
  - Mud is also the material rivals leave alone (Beaver bid 1 worker on pure mud all game). So for Muskrat it's a guaranteed 9★ for 3🐟 plus mud it wants anyway.
  - Compare Stone Causeway (+2, max 8) needing 4 stones structures, and Clay Vault's +12 needing 4.
  - Suggest the sim-check from the 2P log (average score and fire rate by player count), and maybe "+3 per *other* mud structure (max 9)".
- **Spillway (0🐟, 6★) is the best tempo card I've built.** It cost no fish, so it was a free extra turn, and the wash effect adds denial on a crowded River 1.
- **Jams are a 3P feature, not a bug.**
  - 10 of 35 auctions jammed, almost all involving Greedy.
  - The guide's "bid for what you can win" advice was right every time I followed it and wrong the one time I didn't (Vine Thicket).
  - At 3P the first-mover consolation mattered once (beat 2) and blocked me once (beat 7: someone clinched, so no consolation).
- **Heron Roost was 6★ for a vine card I didn't otherwise want.** Its action ability (swap a Headwaters card) never came up, because the deck was nearly empty by the time I built it.
- **The deck ran out at fish ~87 of 90.** That's much later than the 11-card 2P deck (~40), so the +1 drift was barely felt. 3P feels well paced.

## Fun report

- **Most fun / felt smart:**
  - Mud Wallow (beat 4). I saw rivals at 1 supply, sized my bid so their spoilers *completed* the card, and got paid 2🐟 back for it.
  - A close second was using Stone Pool to line up my own endgame, then Flushing a 1-card deck to fetch the reeds I'd buried there.
- **Least fun:**
  - The turn-1 raft. Everyone lost fish and nothing happened, and a new player wouldn't know why.
  - The Vine Thicket pile-on, where three players spent 14🐟 between them for one vine.
- **Tense moment:** Beaver blanking a Silt Bank mud icon with *my own* Snag via Mill Wheel. Seeing your own card turned against you is great table drama.

## Follow-up: fixes applied (same day)

**Rule changes (designer-approved wording):**
1. **The Flotsam Raft stays on the river until it's empty.** This replaces the last call.
   - After every auction on the raft it slides one space downstream, *even when every icon was claimed*: from the Headwaters into River 1, then down the river. At River 4 it moors instead of graduating.
   - It is discarded the moment its last worker leaves, whether ferried or recalled. Spillway can't wash it.
   - New card text: *"Cannot be spent. As an action, move workers to open river icons (drop a blank): slide back this card's cost, advance the destination's. Never enters shoreline."*
   - Changed in all three engines. Web and `sim.js` share the new `raftStaysOnRiver` / `discardEmptyRafts` logic. In BGA, `Rules\CardMovement::raftAfterAuction` / `raftInsteadOfShoreline` handle it. RaftLastCall is kept only so that in-progress Alpha games already in that state can finish. The schema is unchanged.
   - Card art was regenerated. Rulebook p.14, the strategy guide's raft section, the release notes and the design journal are updated.
   - The AI now parks leftover slips on any icon it can take for free (net ferry cost ≤ 0) late in the game, since there is no last call to rescue them.
2. **Wildcard discounts count either half, using the larger discount; halves don't stack.** Mud Slick now gets Mud Burrow, and Driftwood Tangle gets Kelp Bed and Reed Bed. Changed in web, sim and BGA (server and the bid-button rate). Rulebook p.10 and the release notes are updated.
3. **Crossing on a rival's auction** (p.12): paying for a bid in someone else's auction can retire you. This was already the engine behaviour; the text now says so.

**Sim, 3,000 games per cell** (old → raft only → discount only → both):

| | ferries/game | stranded slips/game | turns/game | avg VP | species win % (min–max) |
|---|---|---|---|---|---|
| 3P | 4.03 → 4.76 → 4.03 → 4.74 | 0.10 → 0.14 → 0.08 → 0.14 | 59.4 → 62.4 → 60.0 → 62.6 | 21.9 → 22.0 → 21.9 → 22.0 | 31.6–36.7 → 31.5–36.9 → 30.7–35.8 → **32.5–35.5** |
| 4P | 4.19 → 4.41 → 4.04 → 4.43 | 0.15 → 0.23 → 0.15 → 0.21 | 73.6 → 76.4 → 74.1 → 77.1 | 24.3 → 24.4 → 24.5 → 24.5 | 23.2–26.4 → 23.1–27.1 → 22.9–26.9 → **23.5–26.6** |

- Raft users' win rate is unchanged: 3P 34.6% → 34.5%, 4P 26.1% → 26.7%.
- The extra ~3 turns per game come from the additional ferry actions.
- Under the discount change, Muskrat gains about 2.5 points at 3P and Mink gives back about the same.

**UI (web):**
- Spillway: 🌊 replaces the hard-coded 🦫. The pop-up and log now use card names, and the wash is logged before the move, so there's no separate "drifts to the shoreline" line.
- Driftwood Snag and Mill Wheel: the Mill Wheel "copies X" line now comes before the copied effect. Snag's log and picker name the card and where it sits (e.g. "Silt Bank (Mud) at Headwaters 2").
- Stone Pool and Vine Curtain reorder pop-ups: they show card names plus effect text (Hidden Inlet, the raft…). "Cancel" is now "Keep current order".
- Retired pawns stay on the fish track, dimmed, with a "retired on N🐟" tooltip.
- Burrow Network logs why it did nothing when there's no legal move.
- The Greedy AI description now matches what it does: "recalls workers only when its supply is empty and it still needs the card up for auction". That recall rule is deliberate and calibrated against real BGA games.

**Retracted:** the stray "/" (see UI #2). New `playtest-notes/README.md` lists the driver false positives and hazards so future sessions stop re-reporting them.

**Verified:**
- 8 all-AI browser games (3P and 4P, Greedy and Friendly): zero console errors, and the raft never reached the shoreline. The raft path was exercised end to end: a full Headwaters raft moved to River 1, rafts moored at River 4, and empty rafts were discarded.
- Screenshots checked for the retired pawns and the reorder pop-up.
- BGA `./dev.sh`: PHPStan clean, PHPUnit 2500 tests (up from 2490), including a new `sim.js` oracle for per-item discounts.
- Rulebook still 16 pages. To absorb the new sentences I shortened two lines on p.10 and p.12 without changing their meaning.

**Not fixed / open:**
- **Stale turn-order line (UI #7):** not reproduced.
- ~~**Burrow Network and Portage can move a worker off the raft without paying the ferry fee.**~~ **Fixed (designer's call):** only ferrying and recall move workers off the raft. Burrow Network, Portage and Rolling Float can't use it as a source or destination. Changed in web, sim and BGA, with one line added to rulebook p.14 and to the release notes.
- **Pre-existing, seen during the BGA port:** Portage charges the base per-item rate with no species discount, and bga/README says the test fixtures are gitignored when they are tracked.
- **4P all-Greedy tables score very low** (11–26★, one game with a 2★ Mink). This also happens on the pre-change build, so it isn't a regression.
