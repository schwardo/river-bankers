# River Bankers — 3-player web playtest #4 (Claude as Otter vs Greedy Muskrat + Friendly Mink)

- **Date:** 2026-09-23 (Wed), local build `web/index.html` @ c657591 (after the raft / wildcard-discount / Portage fixes), driven through the browser UI via Playwright
- **Player:** Claude ("You") as 🦦 **River Otter**
- **Opponents:** 🐭 Muskrat (**Greedy**), 🦡 Mink (**Friendly**)
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF (effect cards and the raft are live).
- **Prep:** read the rulebook (16pp), the strategy guide (11pp) and `playtest-notes/README.md` (driver false positives). This is the first logged game on the new "raft stays on the river" rule.
- **Result:** **Otter (me) 30★ (95🐟) · Muskrat 25★ (93🐟) · Mink 19★ (90🐟)**, a 5★ win
- 19 of my own turns. **33 auctions:** 24 fit, 9 jammed, and **Greedy Muskrat was a bidder in all 9 jams**. The first-mover consolation fired twice. Zero console errors, page exceptions or native dialogs.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦦 Otter (me) | **30★** | 95🐟 | 6 | 20 printed (Wood Pile, Pack Rat Burrow, Driftwood Snag, Spy Mound) + Hidden Cache **+9** + 1 pair |
| 2 | 🐭 Muskrat (Greedy) | **25★** | 93🐟 | 6 | 24 printed + 1 pair |
| 3 | 🦡 Mink (Friendly) | **19★** | 90🐟 | 4 | 17 printed + 2 pairs |

**My line:** Stone Tool draft → Wood Pile (fish 13) → Pack Rat Burrow (27) → Driftwood Snag (41, with Stone Tool) → Pack Rat swap Charcoal Pit ↔ **Hidden Cache** → Hidden Cache (61, maxed at +9) → Spy Mound (80) → crossed on a Spy-Mound-deferred Hidden Inlet bid.

**Why it worked:**
- **Striking when rivals were empty.** My four best auctions came when both AIs had 0–1 workers in supply: Mud Wallow, Reed Stand, Fallen Limb and Clay Bank. I took 14 materials across those four at 1🐟 per item.
- **Hidden Cache as a pivot.** I built a spread of materials: logs and reeds from the Snag, mud from Pack Rat, and stones, vines and clay from Hidden Cache itself. That gave 6 distinct materials, so the cache hit its +9 cap without any specialisation.
- **I never had an engine.** Otter's bias card (Kelp Bed) and the Walkway line never entered the game. Both 0★ "engine" cards I held (Spillway, then Pier and Burrow Network) died in hand.

## Game story in eight beats

1. **Turn 1: Greedy mirrors my opener.** I pulled Logjam (7 logs) and bid 4. Muskrat also bid 4, the auction jammed 8-on-7, and we took 3 each. Mink stayed out. That set the tone: Greedy bid the card's full remaining capacity (or close to it) on almost everything it wanted.
2. **The raft is now a real bank (felt smart).** Muskrat opened the raft at the Headwaters and I took 1 slip for 2🐟 (the auction jammed). Muskrat then swam the raft twice more, at River 1 and River 2, which pushed it to River 3 full. My slip was now worth **back 4 / forward 2**. I ferried it onto Silt Bank's last mud icon: −2🐟, a free mud, and **an extra turn** because I dropped back to the bottom of the stack. Muskrat later did a two-worker ferry for back 8 / forward 3. The rule change is working: the turn-1 "sunk raft" from the last log can't happen now, and staging early paid off for both of us.
3. **Mud Wallow, solo.** Both AIs were at 0 supply. I pulled Mud Wallow at Headwaters 2 and bid all 4, so the card filled and went straight to the shoreline, and I slid back 2. Net cost: 5🐟 for 4 mud. It's the same trick as the Muskrat game, and it's still satisfying.
4. **Reed Stand: sizing the bid to the rival's supply.** Muskrat had exactly 2 workers. I recalled my spare vine and a spare mud and bid 3 on a 5-reed card. Muskrat bid 2, the total was exactly 5, and nothing jammed. That's the guide's "bid for what you can win" section working exactly as written.
5. **Stone Tool quietly spent a Basking Rocks triple.** Basking Rocks filled 2/2/3, so all three of us were aboard, and my first spend was worth 3 stones. I then built Driftwood Snag, which was 1 log short. The engine **auto-fired Stone Tool** and used my Basking worker as the substitute. It counted as one log, so 2 of the 3 stones evaporated (see UI #1 and Rules #2). I only understood what had happened from the log.
6. **Pack Rat pivot.** My hand had turned into Spillway (4 logs), Spy Mound and Charcoal Pit. Charcoal Pit needs 4 clay against a Clay-Den Mink. Pack Rat swapped it for **Hidden Cache** from the discard. Its 3 stones matched my Basking worker exactly…
7. **…until Muskrat stepped off the rocks.** Muskrat recalled its Basking worker to bid elsewhere, which cut my first spend from 3 to 2 stones. That left Hidden Cache one stone short. It's the guide's "a rival cashing out cools them instantly", and it bit me for real. I rode Muskrat's Cairn swim for the missing stone (recalling a spare clay to bid 1) and built the cache the next turn for +9.
8. **The finale: Spy Mound versus Greedy.** At 89🐟 I pulled Hidden Inlet (4 reeds), hoping to fill it solo, and used Spy Mound to **defer my bid**. The reveal showed Muskrat bidding 4, i.e. the whole card. Any bid of 1–3 would have handed it 1–3 reeds. So I bid 4 as well. The overbid of 4 meant **nobody clinched**. Muskrat paid 4🐟 for nothing and was pushed over the line too, and I kept 1 reed as first mover. This was the most interesting decision of the game, and it only existed because of Spy Mound.

## Rules / engine issues (highest value first)

1. **`oncePerGameUsed()` is missing four of the fourteen once-per-game cards** (web l.2021).
   - It lists Granary, Floodgate, Tow Line, Salmon Run, Spy Mound, Tribute Stone, Wood Pile, Hollowed-out Log, Pack Rat Burrow and Spring Cascade.
   - **Stone Tool, Rolling Float, Slipstream and Snare Set are missing.** Their flags are set correctly (`stoneToolUsed` was `true` after my Snag build), and `ONCE_PER_GAME_FLAGS` (l.6131) lists all fourteen. But the tableau's "spent ✕" overlay (l.3674) reads this function.
   - Result: after I used Stone Tool, my tableau still showed it as available, while Pack Rat Burrow and Spy Mound correctly showed ✕ (screenshot at game end).
   - Suggested fix: derive `oncePerGameUsed` from `ONCE_PER_GAME_FLAGS`, so the two lists can't drift apart again.
2. **Stone Tool + Basking Rocks wastes the crowd bonus.**
   - The auto-substitution picked my only stone worker, a Basking Rocks worker worth 3 as its first spend. It spent that worker as the single substitute, so 2 stones of value were lost.
   - Rules-wise this is defensible: the card says "1 of your Stones **workers** may substitute".
   - But it's the kind of interaction a player would want to be asked about. Granary already gets a "Use now / Save for later" prompt when the build would work without it (l.7350). Stone Tool has no prompt at all. It fires silently whenever it's needed.
   - At minimum, the READY badge on a build that *needs* a once-per-game effect should say so ("READY · uses Stone Tool"). The badge only showed a small `*`.
3. **Crossing the line is judged at the end of the action, not "the moment" the pawn crosses.**
   - p.12 says "The moment your pawn reaches or passes the finish line… finish that action normally, then retire."
   - The engine checks `p.timePos >= fishFinishLine()` after the turn (l.8762, backstop `retirePastFinishLine` l.8686). So a slide-back that fires *during* the crossing action un-crosses you.
   - Example: at 86🐟 pull Hidden Inlet at Headwaters 1 (2🐟) and bid 4 solo. You pass through 92, the card fills, Hidden Inlet sends you back 4 to 88, and you keep playing. By the rulebook you'd retire on 88.
   - The same applies to Mud Wallow, a raft ferry, Burrow Run's "back 5" and Vine Trellis.
   - I tried to test it on my last turn, but Muskrat's 4-bid jammed the Inlet, so this is from reading the code, not something I saw happen.
   - Either behaviour is fine as a design choice. The rulebook just needs a sentence saying which one applies, and sim/BGA should be checked to confirm they agree.
4. **Code-read, not observed, low severity:**
   - `moveBackward` (l.2334) doesn't touch `state.stackOrder`, so a pawn slid back onto an occupied space doesn't land "on top" as p.8 says.
   - `aiTryWoodPile` (l.6152) does `p.timePos += 1` directly instead of calling `advancePlayer`. That skips the stack update and the lap bookkeeping.
   - Either one could flip a tie-order turn.

## Rules / doc ambiguities

1. **Spy Mound versus a full-capacity bid is a hidden gem.** When a rival bids the whole card, deferring lets you choose between conceding and forcing a no-winner jam, where you keep the first-mover item and the rival eats its whole bid. Neither document mentions this interaction, and it's the best argument for building Spy Mound. One line in the guide's "Bluffed zero" section would cover it.
2. **Basking Rocks' value can move after you commit to it.** The guide's Basking paragraph says "a rival cashing out cools them instantly". It should also say that a *recall* cools the rocks too. That's what happened in beat 7, and recalls are free, so a Greedy AI does it on a whim.
3. **The discard pile is public, but the web shows only its count** (`#struct-discard-count`). p.6 says "Discarded structures form a face-up pile". Pack Rat Burrow was the first time I could see what was in it.

## UI bugs / UX issues

1. **The spent ✕ is missing on Stone Tool** (and would be on Rolling Float, Slipstream and Snare Set). See Rules #1.
2. **The auction-result panel hides what losing bidders paid.**
   - `took === 0` renders "bid 2 → won 0" with no fish (l.4198). Every other row shows "(+N🐟)".
   - The rule the game most needs to teach is "you pay for every worker you bid, win or lose". The panel's prose paragraph says so, but the per-player rows contradict it.
   - Seen on 9 bidder rows this game, e.g. "Muskrat bid 1 → won 0" on Driftwood Tangle, where it had paid 1🐟.
3. **The Hidden Inlet solo-bonus log says "P1"** instead of the species: `🐟 ${spec.name}: P${idx + 1} solo bonus` (l.4312). The Mud Wallow line right below it uses `speciesLabel`. Found by reading the code; it didn't fire this game.
4. **Several places use material names where card names belong.** Each card has a name, and three cards can share a material:
   - The raft ferry picker says "River 1: Vines (3 open)" / "Mud (2 open)", and the log says "ferries a worker to Mud" (l.6529).
   - The shoreline cleanup log says "🌊 empty Mud card removed from shoreline" (l.4435). It printed 8 of these, one of them for the Logjam I'd just cashed out.
   - The fix is the same one the 3P #3 follow-up applied to Spillway, Snag and Stone Pool.
5. **The Pack Rat Burrow picker shows only name, fish and ★.** I had to choose between "Hidden Cache (3🐟, ?★)", "Heron Watch (4🐟, ?★)" and "Clay Vault (3🐟, ?★)" with no costs and no effect text. Those are three variable-VP cards whose whole value is in the text. The picker needs the same card art or text the hand uses. The discard pile also can't be browsed at any other time (Doc #3).
6. **Log ordering:** "🐟 Mud Wallow: … most-workers bonus — back 2" is logged *before* "📍 Mud Wallow drifts to the shoreline", so the bonus looks like it fires on the Headwaters. This is the same class of problem as the Spillway ordering fix.
7. **Pluralisation:** "Auction begins on … (2🐟/item, **1 icons open**)" (l.4500). This came up 7 times.
8. **The turn-order line from 3P #3 UI #7 is probably not a bug.** I saw "Muskrat is taking their turn. You're tied with Muskrat in turn order." with both of us on 65. Muskrat really was acting, because it had arrived on top of the stack. Suggest wording it "tied at 65🐟 — Muskrat is on top of the stack" so it doesn't read as a contradiction.

**Worked well:**
- The Spy Mound flow. "🕵 Spy Mound — defer & see bids first" appears as a bid-panel button only when it's usable. After the reveal, the panel lists each rival's bid, and the log records "bids 4 after seeing reveals". It's clean and easy to follow.
- The raft ferry picker shows the net for each destination ("back 4🐟, forward 2🐟 (gain 2🐟)"), which makes the decision immediate.
- The crossing warning in the bid panel ("🏁 This crosses the finish line — it would be your last turn").
- Recall rows in the bid panel are named and tagged "(no blank)" / "(drops a blank)", and they only appear when the slider exceeds supply.
- The final-build explanation: "no final build available (closest: Burrow Network — needs 1 more Mud + 1 more Reeds)".
- The deck-empty drift was clearly logged every turn.

## AI observations

- **Greedy Muskrat was in every jam.** Its bids against open icons were 4/7, 4/4, 2/2, 3/3 and 4/4. It won the jams on narrow cards and burned 1–4🐟 on each of the others. Across the game it paid **≈20🐟 for workers that clinched nothing**.
  - That's still roughly break-even for it, because the jams hurt whoever it jammed (me, three times).
  - But it makes Greedy trivially exploitable with Spy Mound (beat 8) and by striking while it's empty (beats 3, 4, 7).
- **Muskrat treated the raft well.** It swam the raft three times (Headwaters, River 1, River 2), then cashed out with a back-8 double ferry and a back-4 single. That's the best raft play I've seen from an AI, and it probably says the new rule works for the AI too.
- **Mill Wheel copied my Driftwood Snag four times** in the endgame and blanked 4 of Mud Slick's 7 icons. It was legal and maybe a denial play (I needed clay), but it cost 4🐟 plus 4 actions for 4 blanks.
- **Friendly Mink played off-bias.**
  - With Clay Den (−2, so clay always costs it 1🐟/item), it **passed on Clay Bank at 1🐟/item** while holding 2 supply. That let me take 3 clay uncontested.
  - Earlier it flushed the Headwaters and then chose to auction **Silt Bank (mud) over Clay Seep (clay)**. It also pulled Mud Flat.
  - It never used **Tow Line** (once per game, built at fish ~22). The card is still unflipped in the final screenshot.
- **Endgame invent churn.** Once the material deck emptied (around fish 58), the AIs spent **11 turns on "invent from 2"**, compared with 3 before. They built only 2 more structures in that stretch.
  - The structure deck went 41 → 0, and the 27-card discard was reshuffled.
  - It's a legal way to spend a turn, but it looks like the AIs have nothing better to do on a dead board. It also means the deck-empty drift and invent fees, not builds, carried both of them to the line.

## Balance / design impressions

- **The new raft rule is a clear improvement.**
  - Staged slips matured (River 3 = back 4) and all three of us cashed them: 6 ferries, 24🐟 slid back gross, 12🐟 net after the forward costs. The raft was discarded when its last worker left, as the new text says.
  - I didn't see it reach River 4 and moor, because it froze full at River 3.
  - One question for the sim: a full raft at River 3 is a permanent back-4 bank that nobody can auction or move. Is 4🐟 per slip for 1–3🐟 of staging too generous? Here it was about even: 3 players each held slips.
- **Hidden Cache's +9 cap came easily.** Six distinct materials across 4 structures (one of them itself) is not hard, especially since the cache's own cost supplies 3 of them. It's the same pattern as Burrow Network in the last two logs: a variable-VP card that reaches its cap with ~3 structures. Worth a sim fire-rate check alongside Burrow Network.
- **Spillway is great when it works and dead when it doesn't.** It needs 4 logs, which are the most contested material, and Greedy took every log card. I held it from fish 13 to the end and never got the fourth log. Wood Pile's claim couldn't help, because it only targets non-wild cards on the river, and none were left.
- **Logs dried up early at 3P.** After turn ~15 the only logs were Driftwood Tangle (wild) and Fallen Limb. Both Pier (3 logs) and Spillway (4 logs) died in hand. That's consistent with the guide's "Logs & stones: staples that jam", but a hand of three log-heavy cards has no recovery except Pack Rat.
- **Otter felt like a species without a plan** once I skipped Kelp Bed. Stone Tool is a nice "one icon short" fix, but here it fired automatically on the first build that needed it and wasted a Basking triple. The strategy guide's "save it for a build you'd otherwise miss by one icon" advice can't be followed if the engine spends it for you.

## Fun report

- **Most fun / felt smart:**
  - **The Spy Mound finale** (beat 8). I saw Greedy's full-card bid, realised a matching bid zeroes it out and still pays me the first-mover reed, and did it.
  - **The raft ferry** (beat 2): −2🐟, a free mud, and a second turn from a slip I'd bought for 2🐟 at the Headwaters.
  - **Reed Stand sized to Muskrat's exact supply** (beat 4).
- **Least fun:**
  - **Watching Basking Rocks cool under me** (beat 7), made worse by Stone Tool having already spent a triple as a single (beat 5). Two value-losing events on the same card, and neither was a decision I made.
  - **Holding Spillway and Pier to the end** with no logs in the deck.
- **Tense moment:** fish 89 with Muskrat also on 89 and 25★ to my 30★. Muskrat could have closed that 5★ gap with 4 cheap reeds and a final build.

## Follow-up: fixes applied (same day, web only)

**Fixed:**
- **The spent ✕ for once-per-game cards.** `oncePerGameUsed()` now reads `ONCE_PER_GAME_FLAGS` instead of keeping its own list. Stone Tool, Rolling Float, Slipstream and Snare Set now show as spent. Verified: Beaver's Slipstream got its ✕ in an all-AI game, and my Stone Tool got one after use.
- **Stone Tool asks before it fires.** A human build that can only be paid with Stone Tool now opens a "🦪 Use Stone Tool?" prompt ("Use it and build" / "Not now"). "Not now" leaves you on your turn with the tool unspent.
  - If you hold a worker on a crowded Basking Rocks, the prompt warns that the worker counts as just 1 when spent this way.
  - The READY stamp now reads "READY ✓ · USES STONE TOOL", or "· USES GRANARY", when the build needs one of those.
- **The auction result shows what losing bidders paid:** "bid 2 → won 0 (+4🐟)".
- **Hidden Inlet's solo-bonus log names the species** instead of "P1".
- **Shoreline bonuses are logged after the card lands.** `fireOnShoreline` now runs after "📍 X drifts to the shoreline", so Mud Wallow and Hidden Inlet bonuses read in order.
- **Card names replace material names:**
  - Raft ferry picker: "River 1: Marsh Edge (Reeds, 2 open) — back 4🐟…"
  - Ferry log: "ferries a worker to Marsh Edge (Reeds) at River 1"
  - Shoreline cleanup: "🌊 Fallen Limb (Logs) has no workers left — removed from the shoreline."
- **"1 icon open"** is now singular.
- **The Pack Rat Burrow pickers show card art** (cost, ★ and effect text), laid out as a scrollable grid.
- **The structure discard can be browsed.** Click the Discard count to see the face-up pile as card art.
- **Turn-order line on a tie:** now reads "You're both on 65🐟 — Muskrat is on top of the stack, so acts first."

**Verified:** one all-AI 3P game (Greedy Otter vs Friendly Beaver and Muskrat) played to game over with zero console errors. In a human game I tested: the Stone Tool prompt (both Not now and Use it), the READY label, the spent overlay, both Pack Rat pickers and the discard viewer.

**Not changed (designer calls):**
- **Crossing timing (Rules #3).** Retirement is still judged on the position after the action. The rulebook needs a sentence one way or the other.
- **Stack order after a backward move (Rules #4).** Web, `sim.js` and BGA all leave stack order untouched on a slide-back; BGA's `moveBackFish` documents it as deliberate. Rulebook p.8 says a pawn moving onto a space goes on top. Changing it would touch all three engines.
- **Direct `timePos += N` writes.** The same stack-order question covers these, including the as-an-action abilities, Wood Pile and the raft ferry's forward leg.
- **AI behaviour:** Greedy's full-capacity bids, Friendly Mink passing on clay, never firing Tow Line, and the endgame invent churn.
