# River Bankers — 2-player web playtest (Claude as Otter vs Greedy Muskrat)

- **Date:** 2026-09-23 (Wed), local build `web/index.html` @ 5f34b7f (after the 4P fixes), driven through the browser UI via Playwright
- **Player:** Claude ("You") as 🦦 **River Otter**. This is the first logged game with Otter in the human seat; the AI Otter had come last three games running.
- **Opponent:** 🐭 Muskrat (**Greedy**), the strongest AI in earlier games
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF.
- **Prep:** read the rulebook (16pp) and strategy guide (11pp). I drafted **Stone Tool** on the guide's "strong pick" advice, because my opening hand (Salt Lick, Log Flume, Lookout Tree) was all logs and stones and had no reeds for Kelp Bed.
- **Result:** **Otter (me) 32★ (92🐟) · Muskrat 24★ (90🐟)**
- 20 auctions, 0 dead auctions, 3 jams. 18 human decisions (37 s average, per the game-over modal). Zero console errors or page exceptions.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦦 Otter (me) | **32★** | 92🐟 | 7 | 13 printed + Burrow Network **+9** + Cattail Patch +5 + Pier +4 + 1 pair |
| 2 | 🐭 Muskrat (Greedy) | **24★** | 90🐟 | 5 | 22 printed (Flush Channel, Portage, Vine Lattice, Tribute Stone) + 2 pairs |

**My line:** Stone Tool draft → Log Flume → Pier → Lookout Tree (8★) → Granary → Cattail Patch → Burrow Network (final build). Log Flume made every later build cost 1🐟, which kept me in the chair: I got a follow-up turn right after four of my six builds.

**Where the points came from:** the end-game scorers made up 18 of my 32★ (Burrow +9, Cattail +5, Pier +4), and their printed VP was 0★. Muskrat's 22★ were all printed. That matches the guide's "aim at the big end-game scorers" advice.

## Game story in seven beats

1. **The jam that taught me Greedy.** On turn 2 I pulled Driftwood Tangle (5 icons) and bid 4. Muskrat also bid 4 and the auction jammed: we each paid 4🐟 for 1 log. The lesson was that at 2P, Greedy bids about its supply minus 2 on anything it wants. After that, my HW bids were sized so that my bid plus Muskrat's supply fit the icons.
2. **The flush that felt smart.** The 2P material deck is only **11 cards**, so by fish 9 I could list the remaining 5 exactly. I flushed for 5🐟 and got Basking Rocks at the Headwaters rate: 5 stones for 5🐟. Muskrat bid 2, which put a rival on Basking Rocks and made my first stone spend each turn worth 2.
3. **Striking when supply was empty, and getting spoiled.** Muskrat hit 0 supply, so I swam Driftwood Tangle for the last 3 logs, as the guide suggests. Greedy **recalled a worker from the shoreline just to bid 1**. The jam cost me 6🐟 for 2 logs, and cost Muskrat 2🐟 for nothing. This is the guide's "make rivals pay" play, and the AI played it well.
4. **Second flush with a 2-card deck.** The deck held exactly Clay Bank and Logjam. Flushing guaranteed Logjam would appear, and I bought 5 logs at 1🐟 each into Muskrat's 1-worker supply. That set up Lookout Tree (8★). This was my best move.
5. **Log famine.** The 2P deck has **12 log icons in total** (Logjam 7 plus Driftwood's 5 wild). My first six structure cards wanted **21 logs** between them. By fish 68 every log in the game had been claimed, and my whole hand (Salt Lick, Spillway, Spring Cascade) was dead. See the balance notes below.
6. **Invent twice and find an engine.** The first Invent (4 cards) missed completely. The second (5 cards) found **Burrow Network**, which needs 3 mud + 2 reeds and pays +3 per mud structure. Log Flume and Cattail Patch already used mud, so it was an immediate +9 on materials still floating in the river.
7. **The finish.** I swam Marsh Edge for the 2 reeds, and the bid slider showed "84 → 90, 🏁 crosses the finish line". The empty-deck drift then pushed me to **91**. Muskrat retired early straight onto **90**, the tiebreak spot. The final build was Burrow Network, for a 32–24 win.

## Rules / engine bugs (highest value first)

1. **Stone Tool / Charcoal Pit / Treaty Stone / Granary ignore wildcards when choosing what to substitute, so a legal build is refused.**
   - **What happened:** I held 6 stones (5 on Basking Rocks, crowd bonus), 2 Driftwood Tangle workers (logs/reeds wild) and an unused Stone Tool. **Salt Lick** (3 stones, 2 logs, 1 clay) is legal: the wilds cover the logs and Stone Tool covers the clay. The UI still wouldn't let me build it.
   - **Cause:** `effectiveBuildCost` (web ~l.2586, `sim.js` ~l.1072) walks `struct.cost` in key order and applies the substitution to the first material where `wbm[m] < eff[m]`. `wbm` counts only fixed-material workers, so the logs "deficit" the wild already covers takes the Stone Tool. Clay stays uncovered and `canBuild` returns false. I confirmed this in the page: `eff = {stones:4, logs:1, clay:1}`, `canBuild = false`.
   - **Scope:** Charcoal Pit, Treaty Stone and Granary use the same loop and have the same flaw. `sim.js` is identical, so the sim undervalues these cards whenever wilds are in play. BGA's `Rules\BuildCost::effective` also uses a heuristic, but the explicit-choice path lets a player pick the target. Worth checking whether the BGA heuristic (no-choice) mode has the same ordering bug.
   - **Fix:** apply the substitution to a material that is still short *after* `canCoverWithWild`, or try each candidate target and keep the first where `canBuild` succeeds.
   - **Impact this game:** I built Pier with the Stone Tool (legal; the tool covered a log) instead of Salt Lick (6★ plus a hand peek). That probably cost 3–6★.
2. **Empty-deck drift is applied after an action has already crossed the line.**
   - **What happened:** the swim moved me to exactly 90, and the bid preview said so. `endTurn` (web ~l.8688) then adds the +1 drift before the finish check, so I retired on **91**. Muskrat, 6🐟 behind, then retired early onto the vacated **90**.
   - **What the rulebook says:** p.12, *"finish that action normally, then retire: stay on the space you landed on."* The strategy guide says to cross lean for the tiebreak. Neither mentions drift after crossing.
   - **Fix:** only drift if `p.timePos < fishFinishLine()` before the drift. A pawn that crossed by its own action shouldn't be pushed further. Otherwise the bid slider's "→ 90" preview is wrong.
   - **Check:** `sim.js` and BGA probably have the same drift order.
3. **AI Portage oscillates.** Muskrat fired Portage **3 times** in the last 20🐟: clay→mud, then mud→clay, then clay→mud, swapping the same two cards with me. Each swap cost it 2–3🐟 and paid me 2🐟 of slide-back.
   - **Cause:** `findOtterTrailTarget` computes `needs` from the current hand and gives up card A even when A's material is also needed. The "prefer useless" bonus is only a −1 tiebreak. After a swap, the material it gave away becomes the new deficit, so next turn it swaps back.
   - **Fix:** require that A's material has surplus, i.e. that losing one worker from A doesn't create a new deficit. Or require that total deficit strictly drops.
   - Muskrat also built nothing after fish 50 despite holding 3 cards. Its last ~30🐟 went to Tribute Stone, 3 Portages and 2 Invents.
4. **No way to choose which workers pay for a build, and that conflicts with Pier.** Builds auto-recall "shoreline first" (web l.7306). Pier scores +2 per shoreline card that still holds one of your workers. Building Cattail Patch spent my only Reed Stand worker, which was on the shoreline, when a river reed was available. Muskrat didn't need that reed, so I lost Pier +2 for nothing. BGA has explicit worker selection, so this is a web-only gap. At minimum, when the player has Pier, prefer river workers (or ask).

## Rules / doc ambiguities

1. **Flush with fewer than 3 cards in the deck** (p.9: *"the Headwaters refills with whatever's available before the set-aside cards are shuffled in"*). With 2 cards left, the engine filled the third slot with **Silt Bank, one of the cards I had just flushed**. The rule reads as though that slot should stay empty, or at least the set-aside card shouldn't count as "newly revealed" for the free auction. Say explicitly whether the empty slot refills from the reshuffled set-aside cards, and whether that card is eligible for the flush auction.
2. **Ties from simultaneous auction payments.** After the turn-2 jam we both paid 4🐟 and landed on 8 together, and Muskrat was on top. The rulebook says "a pawn moving onto a space stacks on top" but doesn't cover two pawns moving at once. Suggest: bidders are paid in fish-track order (or initiator last), so the stack order is defined.
3. **First-mover consolation makes every 1-icon swim uncontestable.** A rival bid on a 1-icon card can only jam it, and then the initiator claims it anyway, so contesting just burns fish. That's fine, but it's a real rule consequence ("the last icon on a card belongs to whoever pays the swim"). Worth one line in the strategy guide's first-mover box.
4. **The Greedy blurb** says "never pulls workers back off the river", but Greedy recalled from the *shoreline* to spoil-bid (beat 3). That is technically consistent, since the shoreline isn't the river, but a player reading the blurb would be surprised.

## UI bugs / UX issues

1. ~~**Native `alert()` for an under-supplied bid.**~~ **Retracted (driver artifact):** the Submit button *is* disabled while recalls are short. I only hit the `alert()` fallback because my driver called `submit()` directly. Submitting 6 with 5 in supply popped a browser dialog ("You need to recall 1 more worker(s)…"). The panel already shows "(1 short)" and a warning line, so the Submit button should just be disabled.
2. **The starter-draft modal shows "🐭 Muskrat is taking their turn"** behind it, before anyone has taken a turn.
3. **Setup-screen radios are visually hidden inputs** (styled labels), so clicking `#role-otter-you` directly fails. That's fine for humans; this is only a note for anyone scripting playtests: set `.checked` and dispatch `change`.
4. **Log nits:**
   - Wild cards are named by their primary material in action lines: "auction Headwaters 1 **Logs**" for Driftwood Tangle, "Flush Channel: discards Headwaters 1 **Clay**" for Mud Slick, "auction **Stones** at River 1" for Bramble Shoal. The refill lines were fixed to say "Logs/Reeds wild"; the action lines weren't.
   - Portage's log line starts with **🦦** even when Muskrat plays it (its legacy internal name is "Otter Trail").
5. ~~**The page background image stops at about 1200–1350px.**~~ **Retracted (screenshot artifact):** the background is `background-attachment: fixed`, so it covers the viewport in a real browser. Playwright's full-page capture only paints it over the first viewport. Below that, the board and log sit on a flat pale band (visible in both the opening and final screenshots at 1600px wide).
6. **Lookout Tree's live effect.** `web/index.html:1914` still has a TODO saying it "currently has NO live effect", but l.3624 renders a peek indicator. I built it with 1 card left in the deck and never saw the peek in use. Either the TODO is stale or the indicator is too subtle. Also see the balance notes.

**Worked well:**
- The bid panel's supply/fish preview.
- "🏁 This crosses the finish line" (though see Rules bug #2).
- Flush is correctly disabled once the deck is empty, and so is Pull with an empty Headwaters.
- The jam explanation now uses the rulebook's overbid wording.
- The recall rows in the bid dialog name their card.
- The game-over breakdown lists every end-game scorer for both players.
- The "still on top of the lowest space — takes another turn" log lines made chair-keeping readable.

## AI observations

- **Greedy Muskrat's bidding is sharp early.** It jammed my first real pull, recalled to spoil my strike, and opened its own auctions efficiently (Flush Channel removed Mud Slick from the game on turn 3, which is strong denial at 2P).
- **Its late game collapses.** It had 22★ by fish 50 and scored nothing after that: three oscillating Portages (bug #3), a Tribute Stone (which did cost me a reed at a key moment) and two Invents. It then retired at 84 with 3 cards in hand. It retired to take the 90 spot, which only won the tiebreak because of bug #2.
- **It never contested reeds or mud late** (it bid 0 on Silt Bank, Marsh Edge and Reed Stand while holding 2–5 supply), even though mud is its bias material and Burrow Network was visibly an engine for me. That was a big part of why my last two acquisitions were cheap.

## Balance / design impressions

- **Logs are dangerously scarce at 2P.** The 2P deck has **12 log icons** (Logjam 7 + Driftwood Tangle 5 wild, shared with reeds). Logs have the highest structure demand (51, per the quick-ref), and 2P can't dilute that. My first 6 drawn structures wanted 21 logs, and 4 of them could never be built. The guide calls logs "a staple, never a wrong buy". **At 2P that is wrong.** Logs were the scarcest and most contested material in this game. Consider a 2P note in the guide, or sim-checking 2P structure completion by material. A second 2P logs card, or making Old Growth 2P+, would ease it.
- **The 11-card 2P deck ran out at fish ~40 of 90.** The second half of the game was entirely leftovers drifting through R1–R3 plus Invent. That's actually a fun puzzle, because every remaining icon is known and the "+1 drift" clock is felt. But cards whose effects depend on the deck (Lookout Tree's peek, Heron Roost, Vine Curtain) are near-blank at 2P once built. Lookout Tree was 8★ of printed VP with a 0-value ability.
- **Log Flume is excellent at 2P.** A −3🐟 build discount turned every build into a 1🐟 action. That's an extra turn roughly every time you build, which is exactly the chair-keeping the guide describes. It may be one of the strongest 2★ cards in the deck.
- **End-game scorers carried the game.** Cattail Patch at 5 distinct materials, and Burrow Network maxed with just 3 mud structures, gave 14★ for two cards costing 2🐟 total. Burrow Network hitting +9 with only 3 structures, one of them itself, seems generous next to Clay Vault's +12 cap on 4 structures. It's worth a sim look at Burrow Network's fire rate and average score.
- **Stone Tool is as good as the guide says**, but even with the substitution bug it only fired once. In a stones-rich hand it was the right pick over Kelp Bed.

## Fun report

- **Most fun / felt smart:** the second flush. Counting a 2-card deck and knowing the flush *had* to show Logjam, then buying 5 logs at 1🐟 each into an opponent with 1 worker, was the kind of read the strategy guide promises. Finding Burrow Network on the last Invent and seeing it would be +9 from materials already floating by was a close second.
- **Least fun:**
  - Having a legal Salt Lick refused by the engine (bug #1). A human wouldn't know why it wasn't buildable.
  - Holding a completely dead 3-card hand at fish 68 because every log in the game was claimed.
  - Watching the Portage ping-pong.
- **Tense moment:** the finish. I planned to cross exactly on 90 and was out-positioned by an engine quirk rather than by a better play.

## Follow-up: fixes applied (same day)

**Rules / engine**
1. **Substitutions now aim at the real, post-wildcard shortfall.** Web, `sim.js` and the BGA client pills are fixed.
   - `effectiveBuildCost` (web and `sim.js`) now tries each candidate target for Charcoal Pit, Stone Tool, Treaty Stone and Granary. It keeps the one that most reduces the shortfall left after wild pools are applied (new `wildShortfall` / `bestSubstitution`). A substitution that doesn't help no longer fires, so Stone Tool isn't burned on a gap a wildcard already covers.
   - Granary keeps its old "save a wild worker" pick when there is no real shortfall.
   - The playtest case now works: `eff = {stones:4, logs:2, clay:0}`, `canBuild = true`.
   - With no wildcards, behaviour is unchanged: all 600 BGA oracle vectors match the new sim code.
   - The BGA server was already right for humans, because the player picks the target explicitly. `rbEffectiveBuildCost` (the BGA hand pills) got the same fix.
   - **New BGA bug found and fixed while checking this:** declining *every* modifier in the build flow sent `{}`, which the server treats as heuristic mode, so it auto-fired them all anyway. A player who said "Don't use" to Stone Tool could still have it spent. The client now sends `explicit: true`, and `decodeBuildChoices` keeps it. Added 2 PHPUnit cases; 2490 tests pass and PHPStan is clean.
2. **Drift no longer applies to a pawn that is already done.** A pawn whose action reached the line, or that retired voluntarily, isn't drifted.
   - Web and `sim.js` (both drift sites) gate on `timePos < line`.
   - BGA's `NextPlayer` drifted unconditionally, which was worse than the web version: a player who voluntarily Retired onto their assigned finish space was then drifted +1 off it. It now skips retired pawns and pawns at or past the line.
3. **Portage no longer oscillates.** A swap must now strictly reduce the hand's *total* shortfall (web and `sim.js`), and a strictly falling total can't cycle.
   - A diagnostic on the old code showed that 17 of 26 sampled 2P swaps made no progress on any hand card.
   - A stricter "surplus only" rule cut fires to 0.04 per builder, so it was rejected.
   - Sim `effect-use` fires per builder, old → new: 2P 0.72 → 0.58, 4P 0.21 → 0.06.
4. **Pier-aware spending (web and `sim.js`).** A Pier owner now spends each shoreline card down to its last worker, then river cards, and only then a shoreline card's last worker. Checked in the page: Pier owner keeps the shoreline worker; non-Pier player keeps the old shoreline-first order.

**UI (web):**
- Log action lines use `cardMatLabel`, so wildcards read "Logs/Reeds wild" (32 lines).
- Portage uses 🛶 instead of 🦦.
- The starter-draft status reads "Pick your starter — X moves first."
- The stale Lookout Tree TODO is removed; the peek widget shows both icons for a wildcard.

**Verification:**
- 8 all-AI browser games (2P/3P/4P, Friendly and Greedy): zero console errors, zero dead auctions, and retirements land on the crossing space.
- Sim species win rates, 4000 games, old → new, all within ±2.2 of baseline: 2P Beaver 52.2 → 51.7, Otter 48.1 → 48.6, Muskrat 48.3 → 50.4, Mink 51.4 → 49.3. 4P is within 0.7 of old for every species.
- The sim AI always drafts Kelp Bed for Otter, so the Stone Tool fix mostly matters for human seats.

**Filed:** TODO "Measure (and maybe fix) 2P logs/stones scarcity" in `games/river-bankers.org`. Stones turned out to be as scarce as logs at 2P (demand/icon ratio 5.2 vs logs 5.4, against 2.6–2.8 for reeds and mud).

**Rules decisions (designer, same day):**
- **Drift after crossing:** the rulebook now says a pawn at or past the line doesn't drift (p.12 and the p.16 quick-ref).
- **Flush with fewer than 3 cards:** the rulebook now matches what both engines already did. Deal what's left, shuffle the set-aside cards in, fill the remaining slots, and any Headwaters card may be auctioned (p.9).
- **Simultaneous payment ties:** the triggering player pays last, so the trigger's pawn is on top (p.10). This needed an engine change everywhere:
  - web and `sim.js`: the trigger is sorted last in the pay loop, and billed last in combined auctions, where placement stays clockwise from the trigger;
  - BGA `ResolveAuction`: `$bids` is reordered with the trigger last, and combined auctions defer the trigger's `advanceFish`.
  - Checked in the page: both at 4🐟, bid 2 each → the trigger is on top whichever seat triggers.
- All three are logged in the v0.4 release notes under "Rule clarifications".
- **p.13 "Every material is equally available":** deferred into the 2P logs/stones TODO.
- **Strategy guide 1-icon note:** skipped.
