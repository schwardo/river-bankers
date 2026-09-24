# River Bankers — 3-player web playtest #6 (Claude as Mink vs Miser Beaver + Greedy Muskrat)

- **Date:** 2026-09-23 (Wed). Local build `web/index.html` @ 68efef1, which includes the Slipstream/Royal Lodge fix, the crossing-warning drift fix and the Wood Pile/Mud Levee labels. I drove it through Playwright, using the page's own `human*` handlers and the bid panel's slider, recall buttons and Submit button.
- **Player:** Claude ("You") as 🦡 **Mink**, drafting **Quick Strike**. This is the first logged game with the strategy guide's "trap" starter in the human seat.
- **Opponents:**
  - 🦫 Beaver (**Miser**, drafted Lodge Foundation). This is the first logged game against the Miser AI.
  - 🐭 Muskrat (**Greedy**, drafted Mud Burrow).
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF.
- **Prep:** I read the rulebook (16pp), the strategy guide (11pp) and `playtest-notes/README.md`.
- **Result:** **Mink (me) 41★ (96🐟) · Beaver 19★ (91🐟) · Muskrat 10★ (90🐟)**. I won by 22★, the biggest margin in any logged game. Most of that margin comes from the AI pairing, not from Mink (see Balance).
- **Game stats:**
  - 16 of my own turns, against 26 for Beaver and 30 for Muskrat.
  - **34 auctions, and zero jams.** Every auction fit, and the first-mover consolation never fired.
  - I triggered 10 auctions and used Quick Strike on all 10. **In 8 of them, the reveal showed both rivals bidding 0.**
  - No console errors, page exceptions or native dialogs.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦡 Mink (me) | **41★** | 96🐟 | 8 | 28 printed + Vine Ladder **+8** + Vine Trellis **+4** + 1 pair |
| 2 | 🦫 Beaver (Miser) | **19★** | 91🐟 | 5 | 17 printed + 2 pairs |
| 3 | 🐭 Muskrat (Greedy) | **10★** | 90🐟 | 3 | 8 printed + 2 pairs |

**My line:**
- **Drafted Quick Strike.** My opening hand was Pier, Hollowed-out Log and Vine Trellis, with no clay anywhere, so Clay Den had nothing to discount.
- Took Trailing Vine (1) and Vine Curtain (3) at 1🐟 each, and Cairn (3 stones) by riding Muskrat's 4🐟 pull.
- **Built Vine Trellis at fish 11.** Its Vine Curtain workers triggered the peek, and I moved Logjam to the top of the deck.
- **Flushed straight into that Logjam** and took 4 logs at 1🐟 each.
- Built **Hollowed-out Log**, then took Driftwood Tangle (4 wild logs).
- Built **Wood Pile** at fish 32. The build kept me the lowest pawn, so I went again immediately and pulled Clay Bank for 5 clay while both rivals had empty supply.
- Built **Charcoal Pit**, took Mud Slick (5 wild), and built **Flush Channel** at fish 60.
- Took Marsh Edge (2 reeds) and built **Confluence**.
- **Crossed on a 4-vine Vine Thicket swim** (17🐟), then made **Vine Ladder** my final build.

**Why it worked:**
- **Both opponents were out of the market almost all game.**
  - Muskrat sat at **0 supply from about fish 17 to the end**, holding materials it never spent. It recalled once all game.
  - Beaver (Miser) bid exactly 1 or 0 in every auction.
  - So almost every material I wanted came at the Headwaters' 1🐟/item rate.
- **Cheap builds kept me near the back of the track.** Every structure I built cost 2–3🐟. Wood Pile at 32 left me the lowest pawn outright, so I got back-to-back actions.
- **Vine Trellis + Vine Ladder added +12★ from two 0★ cards,** with only two vine structures in total. The Ladder cost 4 vines + 2 stones, bought on the crossing turn.

## Game story in six beats

1. **Quick Strike versus Greedy (felt smart).**
   - On Trailing Vine, the reveal showed Muskrat bidding 4 of 5. Any bid of mine above 1 would only jam, so I bid 1, the card fit exactly, and I got my vine for 1🐟.
   - On Logjam, Muskrat recalled 3 workers and bid 3 of 7. I bid exactly 4, and it fit again.
   - Without the reveal, both of those would have been guesses. This is the card doing what it says, and I didn't bend my game around it. The guide's warning ("the trap is the playstyle") held up: I never stayed back just to keep firing it.
2. **The Vine Curtain → Flush combo (the best moment of the game).**
   - Building Vine Trellis with Vine Curtain workers let me peek at the top 2 material cards: Flotsam Raft, then Logjam.
   - I swapped them so Logjam was on top. My next action was a 5🐟 Flush, which revealed Logjam into the Headwaters, and I auctioned it at 1🐟/log.
   - A 0★ card's small effect turned into a three-step plan that I set up and cashed in myself. That's exactly the feeling the game should produce.
3. **Wood Pile's free turn into the clay strike.**
   - I built Wood Pile at fish 32 (2🐟), stayed lowest at 34, and pulled Clay Bank at once.
   - Both rivals bid 0. I recalled my one stray vine, a singleton worth nothing, and bid all 5 clay. The card cleared to the shoreline.
   - This is the guide's "strike while they're spent" advice, and it paid off.
4. **Charcoal Pit refused a legal build (bug, see Engine #1).**
   - I had 5 Mud Slick workers (wild mud/clay) and Charcoal Pit built, so Flush Channel (3 mud + 1 reed) should have been buildable: 3 Mud Slick workers as mud, plus 1 as clay standing in for the reed.
   - Clicking the card did nothing. I had to swim to Clay Seep for one *pure* clay (3🐟 and a turn) before the engine accepted the same build.
5. **Muskrat's Snag spam (un-fun).** With 0 supply, Muskrat spent 10 turns on Driftwood Snag's 1🐟 "drop a blank" action and 13 turns inventing:
   - Four blanks in a row on Basking Rocks.
   - Two on Rocky Shoal.
   - **Three on Marsh Edge,** the one reed card I needed, which dropped from 7 open icons to 4.

   None of it scored Muskrat anything. It ended the game **one mud short of both Slipstream and Springwater Pool**, with Mud Burrow making mud its cheapest material (see AI #1).
6. **The last crossing as a shopping trip.**
   - At 75🐟 I held Vine Ladder, with 2 stones left over after Confluence.
   - Vine Thicket sat on River 3 with 4 open vines at 4🐟 each. I swam it for 1 + 16🐟, and the 🏁 warning correctly showed 76 → 92.
   - I retired at 92, and Vine Ladder as the final build was worth +10★: +8 of its own, plus Vine Trellis's +2 for another vine structure.
   - Both AIs retired straight away to 90 and 91. That's legal, and it's the rulebook's "retire to a low spot" advice in action: my overshoot handed them the better tiebreak spots.

## Engine bugs

1. **Charcoal Pit (and Stone Tool / Treaty Stone) can't substitute from a wildcard pool.**
   - **Where:** `effectiveBuildCost`, `web/index.html:2628`. The same logic is in `sim.js:1100` and in BGA `modules/php/Rules/BuildCost.php:69`, so all three implementations agree, and all three are wrong by the rulebook.
   - **Cause:** the substitution only runs when `claySlack = wbm.clay − eff.clay ≥ 1`. `wbm.clay` counts only pure-clay cards. Mud Slick's workers sit in `wbm._wildPools`, so a player whose clay is all on Mud Slick has 0 slack and the substitution never fires.
   - **Rule:** the rulebook says Mud Slick's icons yield "Mud **or** Clay (chosen at build time)", so a Mud Slick worker spent as clay is a clay worker.
   - **Repro:** Charcoal Pit built, 5 workers on Mud Slick and nothing else, Flush Channel (3 mud + 1 reed) in hand. The card isn't READY, and clicking it silently does nothing. Add one pure clay (Clay Seep) and the identical build goes through.
   - **Same pattern elsewhere:**
     - `stoneSlack` for Stone Tool fails when the stones are on Bramble Shoal (wild stones/vines, 2P only).
     - Treaty Stone's `wbm[source] − eff[source] ≥ 2` surplus test ignores wild pools too.
   - **Suggested fix:** compute slack after assigning wild units. For example, try the substitution anyway and let `wildShortfall()` / `bestSubstitution()` decide, since they already account for wild pools. That test already guards against a trial that makes things worse.
   - This is a logic change only. It doesn't touch the schema.
   - **Sim impact:** Mink with Charcoal Pit, and anyone holding Mud Slick, is slightly under-served in the sim stats.

## UI bugs / UX issues

1. **Recall log lines don't name the cards.**
   - "🏠 🐭 Muskrat calls 3 workers home." It turned out to be one worker each from Silt Bank (River 3, which drops a blank), Trailing Vine and Cairn. I only worked that out by diffing the board.
   - My own recalls read the same way. Recalls are public information and they change the board, so the log should say where they came from, like Wood Pile and Mud Levee now do.
2. **The Flush Channel discard modal and log don't name the cards.**
   - The options read "Headwaters 3: Stones · 3 icons", "Headwaters 2: Mud · 4 icons", "Headwaters 1: Stones · 3 icons".
   - Two of those were Rocky Shoal and **Basking Rocks**, which play very differently (crowd bonus), and the modal can't tell them apart.
   - The log line "Flush Channel: Mink discards Headwaters 2 Mud" also doesn't say it was Mud Wallow. This is the same class of problem as the Wood Pile and Spillway naming fixes.
3. **Charcoal Pit's substitution isn't logged.** My Flush Channel build logged "✦ Clay/Mud wildcard spent as Mud" but nothing for the Clay Seep clay standing in for the reed. A line such as "🔥 Charcoal Pit: 1 Clay stands in for Reeds" would make the build auditable.
4. **Clicking a structure you can't build silently does nothing** (`humanSelectBuild` returns early on `!canBuild`). Normally the missing READY border explains it, but with Engine #1 in play the pills look nearly complete and the click gives no feedback. A one-line toast ("Short: 1 Reeds") would help in either case.
5. **Low severity, log order:** "✦ Vine Curtain: Logjam (Logs) now next from the deck" is logged *before* "🏗 Mink builds Vine Trellis". That reads as if the peek happened first, when it was a trigger of the build.

**Worked well:**
- **The Quick Strike flow.** "⚡ Quick Strike — defer & see bids first" shows each rival's bid, then returns you to the normal slider. It's clean and fast.
- **The bid-panel recall.** When I set the slider above my supply, a warning appeared ("Bid is 1 above your supply — recall 1 more worker…") along with per-card rows marked "(no blank)" or "(drops a blank)". Submit stayed disabled until the recall covered the bid. I used it twice without any confusion.
- **The 🏁 crossing warning** on my final swim showed "76 → 92 … would trigger the endgame". The deck-empty drift fix is working, and the preview correctly didn't add the drift on the crossing turn itself.
- **The Vine Curtain peek modal** (▲/▼, then confirm) was clear. So was the Game Over breakdown, which listed Vine Ladder and Vine Trellis with their counts.
- **AI starter drafts are now logged** ("🦫 Beaver drafts Lodge Foundation.").

## Rules questions

1. **Can a Quick Strike player recall after seeing the reveal?**
   - The rulebook says recalls "are public and resolve before bidding begins". The web lets the Quick Strike deferrer adjust recalls *after* seeing everyone's bids. On Clay Bank I recalled my vine only once I knew both rivals had bid 0.
   - The log then prints "🏠 Mink calls 1 worker home" *before* "⚡ Quick Strike: Mink bids 5", which hides the ordering.
   - It's harmless here, but it gives Quick Strike more than "declare your bid last". Either rule it in (the card text could say "declare your bid, and any recalls, last") or lock recalls when you defer.
2. **Charcoal Pit plus wildcards** (Engine #1). The rulebook's "chosen at build time" wording supports allowing it. Consider adding one sentence to the Charcoal Pit or wildcard text to make it explicit.

## AI observations

1. **Greedy Muskrat stalls at 0 supply.**
   - After about fish 17 it never had a spare worker, and its recall rule ("only when supply is empty **and** it still needs the card up for auction") fired once all game.
   - With 0 supply and nothing to build, it looped through its cheapest actions: **13 × "invent from 2" (26🐟) and 10 × Driftwood Snag (10🐟)**.
   - It ended holding 3 vines, 3 clay, 1 mud and 1 reed, next to a hand of Slipstream (2 mud + 2 vines), Springwater Pool (3 vines + 2 mud) and Tow Line. **It was one mud short of two builds** for the last ~40🐟 of the track.
   - Mud Flat sat on River 3 with an open mud icon (3🐟 for it after Mud Burrow) for most of that time.
   - The recall trigger should include "an open icon of a material that completes a build in hand". This is the same "invent churn" pattern as 3P #4 and #5, but here it's clearly a supply deadlock, not just a bad hand.
2. **Greedy's Snag targeting is aimless.**
   - All 10 blanks went on *Headwaters* cards, mostly Basking Rocks (×4). Nobody was bidding on those cards, so the blanks denied nothing that mattered.
   - Three blanks did land on Marsh Edge, the reed card I needed, but that looked like chance rather than intent.
   - Worth checking whether Snag should require a target that some rival plausibly wants, or whether Greedy should prefer an auction when one is affordable.
3. **Miser Beaver overpays to trigger.**
   - "Never contests, bids the legal minimum" is fine as a bidder. As a *trigger*, though, it paid 3🐟 to pull Vine Thicket from H2 and took 1 vine, and paid 4🐟 to pull Mud Flat from H3 and took 1 mud. That's 4–5🐟 per item at the Headwaters, where the rate is 1.
   - Its 14 river swims were all single-item buys at 2–4🐟 each.
   - It still built 5 structures (Burrow Run's 0🐟 build with a 5-space slide-back was its best move), but it spent the track like a Friendly player while winning like a Miser.
   - A Miser that only triggers when it will clinch ≥2 items, or that prefers the H1 slot, would be more on-brand.
4. **Neither AI contested a single one of my 10 triggers** apart from Muskrat on Trailing Vine and Logjam. With Miser plus a supply-locked Greedy, the table has no bidding pressure at all. Zero jams in 34 auctions is the first time I've seen that in a 3P log.

## Balance / design impressions

- **The result says more about this AI pairing than about Mink.** Miser plus Greedy is by far the easiest table in any log so far. For balance data it should be treated as an outlier: neither AI bids, and one is supply-locked.
- **Vine Trellis + Vine Ladder is a strong 0★ pair.** With just two vine structures (the pair themselves) it paid +12★, and Vine Ladder was a 4-vine final build.
  - The strategy guide calls vines "the trap specialist", and that's true without the pair.
  - With both cards in hand it's the game's highest-ceiling line, and it cost me 7 vines (3 bought at 1🐟 each, 4 at 4🐟).
  - Worth a sim check that Ladder + Trellis together isn't an auto-win when the table leaves vines cheap. The +12 cap on Ladder bounds it.
- **Quick Strike was worth its 2★ and more, against Greedy.** The reveal turned two potential jams into exact fits. Against Miser it told me nothing I couldn't guess. It looks like a card whose value depends on the table: fine.
- **Overshooting the line cost me the tiebreak spots** (AIs at 90 and 91, me at 92). It didn't matter here, but the rule works as designed: the lean crosser is rewarded.
- **Pier died in hand again.** It needs workers left on shoreline cards at the end of the game, but building anything spends shoreline workers first. Every build I made cleared a shoreline card (Logjam, Clay Bank, Cairn), so Pier fights your own builds. That may be intended tension, but it made the card feel like a dead draw.

## Fun report

- **Most fun / felt smart:**
  - The **Vine Curtain peek → Flush → Logjam** combo (beat 2). It was planned three moves ahead and paid off exactly.
  - **Quick Strike sizing against Greedy's bids** (beat 1).
  - **Wood Pile's free turn into the 5-clay strike** (beat 3).
  - **The +10★ Vine Ladder shopping-trip crossing** (beat 6).
- **Least fun:**
  - **Lack of opposition.** After the first 20 fish I was mostly clicking "bid 0" on Beaver's single-item swims while Muskrat snagged and invented. A 41–19–10 game has no tension. Next time, avoid Miser + Greedy as a pair.
  - **The Charcoal Pit refusal** (beat 4). A legal-looking build silently did nothing, and I lost a turn and 3🐟 working around it.
- **Tense moment:** none, honestly. This was the first logged game without one.

## Driver notes (for the README)

- **Calling `humanFlushUpstream()` directly stalls the game.** The Flush button runs `humanFlushUpstream().then(() => humanResolver())` (l.6993). Calling the inner function from the driver skips the resolver, so after the flush auction the game sits at `phase=idle` with nobody acting. Recover with `setTimeout(() => humanResolver(), 0)`. Better, call the same dispatcher the button uses. This isn't a game bug.

## Follow-up: UI fixes applied (same day, web only)

**Fixed:**
- **Recall log lines name the cards (UI #1):** "🏠 Beaver calls 1 worker home from Old Growth (Logs, River 2)." Multiple sources are listed with counts.
- **Headwaters pickers name the cards (UI #2):** a shared `prerivPickLabel()` gives "Headwaters 3: Rocky Shoal (Stones) · 5 open".
  - It's used by Flush Channel, **Snag Pile** and **Heron Roost**, which had the same nameless labels.
  - Their log lines name the card too: "discards Mud Wallow (Mud) from Headwaters 2", "pulls … from Headwaters N", and "replaces X in Headwaters N with Y". The last one covers the AI path as well.
- **Charcoal Pit logs its substitution (UI #3):** "🔥 Beaver — Charcoal Pit: 1 Clay worker stands in for 1 Reeds." `effectiveBuildCost` now also returns `charcoalFor`.
- **Unbuildable hand cards explain themselves on hover (UI #4):** "Can't build yet — short 3 Stones, 2 Reeds." In the real UI these cards were never clickable. The silent no-op I hit came from the driver calling `humanSelectBuild` directly, so this tooltip is the only change needed.
- **Vine Curtain peek logs after the build line (UI #5).** The peek now runs right after "🏗 … builds …". It still runs before on-build effects, so a Flush Channel refill draws the reordered card.

**Verified:**
- An all-AI 4P game ran to completion with no page errors, and its recall lines named their sources.
- Scenario checks passed for the Charcoal Pit log line, the Headwaters labels, the tooltip, and the human Vine Curtain log order.

**Not changed:**
- **Quick Strike recall after the reveal (Rules Q #1).** The designer decided it doesn't matter in the 1-player web version. BGA already caps a deferred bid at supply, with no recall after the reveal.


## Follow-up 2: Engine #1 fixed (web, sim and BGA)

**Charcoal Pit, Stone Tool and Treaty Stone now draw on wildcard pools.**

**Web + sim `effectiveBuildCost`:**
- Dropped the fixed-surplus pre-checks: `claySlack`, `stoneSlack`, and Treaty Stone's "2 fixed surplus" source filter.
- Every substitution trial now goes through `bestSubstitution`, whose wild-aware `wildShortfall` only accepts a trial that the fixed and wild holdings can actually pay.

**BGA server (`Rules/BuildCost.php`):**
- It was a version behind the sim: first-deficit picks, fixed counts only. It's now a port of the sim's wild-aware logic (`wildShortfall` / `best`).
- `effective()` takes a 5th `$pools` argument. `Game::tryBuild` and `buildShortfall` pass the wild pools from `leftoverFromHoldings`. The unused `fixedMaterialCounts` helper is removed.
- **Explicit (player-chosen) picks** are legal if they meet the old fixed rule, **or** if they reduce the wild-aware shortfall.

**BGA client (`modules/js/Game.js`):**
- The affordability preview dropped the same pre-checks.
- `BuildChoiceFlow` now receives the wild pools and offers exactly the targets the server accepts. For example, Charcoal Pit → Reeds is offered with only Mud Slick clay.

**Oracle and tests:**
- `gen_buildcost_vectors.js` now copies the current sim functions verbatim. The fixture was regenerated as 600 vectors, 294 of them with wild pools.
- 4 new PHPUnit cases:
  - Charcoal Pit with Mud Slick, in heuristic and explicit mode.
  - Charcoal Pit refused when the pools can't pay.
  - Stone Tool with Bramble Shoal.
  - Treaty Stone paying from Driftwood Tangle.

**Verified:**
- BGA suite: 2504 tests OK. phpstan: clean.
- In the web, the playtest's exact case (Charcoal Pit plus 5 Mud Slick workers, building a 3 mud + 1 reed structure) now builds. It spends 4 Mud Slick workers and logs the substitution.
- A sim `build-rate 200 3` smoke run completes.
- **Schema unchanged** (logic only).
- **Not deployed to BGA Studio.**
