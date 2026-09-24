# River Bankers — 3-player web playtest #5 (Claude as Beaver vs Greedy Mink + Friendly Otter)

- **Date:** 2026-09-23 (Wed). Local build `web/index.html` @ 9bd9470, the one with the spent markers, the Stone Tool prompt and the discard viewer. I drove it through Playwright, using the page's own `human*` handlers and the bid panel's slider and Submit button.
- **Player:** Claude ("You") as 🦫 **Beaver**. This is the first logged 3P game with a human Beaver.
- **Opponents:** 🦦 Otter (**Friendly**, drafted Kelp Bed) and 🦡 Mink (**Greedy**, drafted Clay Den)
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF.
- **Prep:** read the rulebook (16pp), the strategy guide (11pp) and `playtest-notes/README.md`. I ignored the "stray /" before wildcard names, which is a known driver artifact.
- **Result:** **Beaver (me) 36★ (93🐟) · Otter 28★ (91🐟) · Mink 16★ (92🐟)**, an 8★ win.
- **Game stats:**
  - 16 of my own turns.
  - **31 auctions.** 26 fit and 5 jammed. **Greedy Mink was a bidder in 4 of the 5 jams.** The first-mover consolation fired 4 times, and 2 of those went to me.
  - Zero console errors, page exceptions or native dialogs.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦫 Beaver (me) | **36★** | 93🐟 | 7 | 26 printed + Burrow Network **+9** (4 mud structures, capped) + 1 pair |
| 2 | 🦦 Otter (Friendly) | **28★** | 91🐟 | 6 | 15 printed + Vine Trellis +8 + Reed Walkway +4 + 1 pair |
| 3 | 🦡 Mink (Greedy) | **16★** | 92🐟 | 4 | 15 printed + 1 pair |

**My line:**
- Drafted **Lodge Foundation**, because the opening hand was Driftwood Snag, Spillway and Burrow Network: two log cards and one mud engine.
- Fallen Limb, 3 logs for 1🐟 each.
- **Spillway at fish 24 for 0🐟.** Its printed cost is 0 and Lodge's discount stops at 0, but a zero-cost build means I stay lowest on the track, so I got an extra turn.
- Logjam, 4 logs, then **Wood Pile** at fish 35 (1🐟), then Wood Pile's once-per-game claim of 1 log.
- **Burrow Network** at fish 45.
- A 5-worker Mud Slick grab while Mink was empty.
- **Streambank Hollow** at fish 55, then **Driftwood Snag** at fish 69, which filled Burrow Network's +9 cap.
- Clay Bank, then Reed Stand, then one more Clay Bank icon to cross the line.
- **Trading Post** as my final build.

**Why it worked:**
- **Beaver's tempo engine.** Lodge Foundation took 1🐟 off every log build: Spillway 0, Wood Pile 1, Snag 2. Two of my builds handed me an immediate extra turn. This is exactly the strategy guide's "Lodge Foundation makes builds cost almost no fish, so you build more often and keep the chair."
- **Burrow Network capped effortlessly.** Four mud structures (Spillway, Burrow itself, Streambank, Snag) is +9 for a 0★ card. Mud was the second material on three of my cards anyway.
- **Striking into empty supplies.** Mink hit 0 supply three times, and each time I made my cheapest buys:
  - Logjam: 4 logs, uncontested.
  - Mud Slick: 5 of 7 icons for 7🐟 total.
  - Clay Bank: 2 clay, uncontested.

## Game story in seven beats

1. **Mud Wallow, the cursed card.** Otter pulled it at the Headwaters, and it then **jammed three auctions in a row**:
   - Bids 2/2/3 on 4 icons.
   - Bids 3/1/3 on 3 icons. This was my swim, and I got 1 mud for 7🐟.
   - Bids 1/2/1 on 2 icons.

   Greedy Mink bid its entire supply into the first two. All three were full jams that paid out only the initiator consolation. Across the three auctions, 7 mud's worth of bids (≈30🐟 across the table) bought 3 mud. The card then sat on River 3 for the rest of the game with 1 open icon and nobody aboard. It never reached the shoreline, so its most-workers bonus never fired.
2. **Reading the Greedy AI (felt smart).** After two of those jams I bid for what I could win, not what I needed.
   - On Mud Flat (5 icons), Mink had 3 supply and always bids all of it on mud, so I bid 2. Result: 2 + 3 = 5 exactly, no jam.
   - On Reed Stand (5 icons), I bid 2 against Otter's 3. It fit exactly again.
3. **Spillway's free turn.** At fish 24 I built Spillway for 0🐟. I washed Basking Rocks, where Mink had 4 workers, off River 1 so nobody could join the pile and warm it. I was still the lowest pawn, so I went again and took Logjam's 4 logs at River 2 with both rivals low on supply.
4. **The Mud Slick strike.** Mink was at 0 supply and Otter had 2. I pulled Mud Slick from Headwaters 1 and bid 5: 2🐟 to pull plus 5🐟 for the bid, 7🐟 for 5 wild mud/clay. Otter took 1. That single auction fed both Streambank Hollow and Snag.
5. **...and the Driftwood Tangle counter-lesson (un-fun).**
   - Mink had 0 supply and Otter had 2, so I pulled Tangle and bid 4 on 5 icons, "safe" by the guide's "count their workers" rule.
   - **Mink recalled all 3 of its vines and bid 3. Otter recalled 1 and bid 3.** That made 10 bids on 5 icons, and I took 1 as the consolation after paying 7🐟.
   - Mink threw away its whole vine stock to take nothing. Supply is a ceiling only for rivals who won't recall, and Greedy recalls hardest exactly when it's empty. Its blurb says so ("recalls only when its supply is empty"). I'd read that as a limit when it's really a trigger.
6. **Slipstream fizzled twice (bug, see Engine #1).**
   - After I built Streambank Hollow, the log says "⚡ River Otter uses Slipstream — takes an out-of-order turn". The next line is "— Mink's turn". Otter never acted.
   - Otter later re-armed it with Springwater Pool and used it again after my Reed Stand bid. Same result: Mink took two turns in a row, and Otter got nothing.
7. **Crossing on a pair.** At 86🐟 with 1 supply, I swam Clay Bank and took 1 clay for 3🐟. The deck-empty drift carried me to exactly 90, and I retired there. Holding Trading Post back for the free final build left clay + Mud Slick as a leftover pair (+1★). I didn't spend a turn building it, because the final build would take it anyway. That's the guide's "the last crossing is a shopping trip" advice working.

## Engine bugs (highest value first)

1. **Bonus turns from Slipstream and Royal Lodge are consumed before they happen** (web l.8817–8822). I saw this happen twice.
   - At the end of `runOneTurn`, `maybeFireSlipstream()` sets `state.bonusTurnPlayer`. The next line, `const next = pickNextPlayer();`, is only there to print "↩ … still on top — takes another turn". But `pickNextPlayer()` **reads and clears** `bonusTurnPlayer` (l.3038–3041).
   - The next `runOneTurn` therefore calls `pickNextPlayer()` with the bonus already gone, so play falls back to plain fish-track order.
   - Slipstream still gets flagged as spent, and the tableau shows its ✕.
   - **Royal Lodge is broken the same way.** `fireWhenBuilt` sets `bonusTurnPlayer` (l.7925) during the build, and the same peek consumes it. The only exception is when the builder was going to be lowest anyway, in which case the "↩ still on top" line prints and hides the problem.
   - Suggested fix: make the peek side-effect-free. For example, `const next = state.bonusTurnPlayer ?? pickNextPlayer()`, or split out a pure `peekNextPlayer()`.
   - **This is web-only.** `sim.js` calls `pickNextPlayer(state)` once per turn in its game loops (l.7456/7523/8419), with no extra peek. BGA's `TurnOrder::nextActor` takes the bonus player as a parameter rather than clearing shared state. So the sim's Slipstream and Royal Lodge stats should be sound.
2. **The crossing warning ignores the deck-empty drift** (`humanCrossWarnHTML`, l.3076). It compares `timePos + addedCost` against the line and leaves out the +1 end-of-turn drift once the material deck is empty.
   - At 86🐟 my Clay Bank swim (1 + 2 = 3) showed no 🏁 warning, but it retired me at 90.
   - This matters most in the last few fish, which is exactly where the warning exists to help.
   - Fix: add 1 when `state.matDeck.length === 0` and the pawn isn't already past the line. The same applies to the build-panel and invent-panel warnings, if they share this helper.

## UI bugs / UX issues

1. **The raft-full result text says "moored there at the deepest" at River 2** (l.4226). The raft filled on River 1 and slid to River 2, but it moors only at River 4. The real reason it stops is that a full raft can't be auctioned again. Suggested text: "…slides to River N and **freezes there**. It's full, so nobody can auction it again, and it stays until its last worker leaves."
2. **The Wood Pile picker and log use the material name, not the card name.**
   - The picker says "River 2: Logs (2 open)" (l.6622).
   - The log says "Wood Pile: Beaver claims 1 Log icon" and doesn't name the card (l.6629).
   - This is the same class of problem the 3P #4 follow-up fixed for the raft ferry, the shoreline cleanup, Spillway, Snag and Stone Pool. Wood Pile was missed.
3. **"Mud Levee drops 2 blanks."** doesn't say where. Marsh Edge silently dropped from 6 open icons to 4. The log should name the target card(s), the way Spillway's wash does.
4. **The AI starter draft isn't logged.** The log shows "🦫 Beaver (you) drafts Lodge Foundation" but nothing for the AIs. I only learned Otter had Kelp Bed and Mink had Clay Den from their tableaus. One line per seat would help, since the draft is public information at the table.
5. **Low severity:** a build never tells you which cards paid for it (apart from the "✦ wildcard spent as X" line). It didn't cost me anything this game, but my Burrow Network build silently spent my only Mud Wallow worker. That was my stake in its most-workers race. A player who cared about that would want to choose, or at least to see which workers were used.

**Worked well:**
- The bid panel's supply and fish preview ("SUPPLY 4 → 3 · FISH 10 → 12") made every bid decision immediate.
- The auction result shows what losing bidders paid ("bid 3 → won 0 (+6🐟)"), which is the 3P #4 fix working.
- The first-mover consolation explanation in the result panel was clear every time it fired.
- The Burrow Network no-op line ("needs workers on two river cards to move one — nothing to move") explained a silent perk.
- The Game Over breakdown lists every ?★ scorer with its count and cap. My +9 was easy to audit.

## AI observations

- **Greedy Mink bid its entire supply on every mud card:**
  - Mud Wallow ×2: 3 of 3 supply each time.
  - Mud Flat: 3 of 3.
  - Basking Rocks: 4.
  - Driftwood Tangle: 3, after recalling 3 vines to do it.

  It won the uncontested ones and burned **~12🐟 on bids that clinched nothing**. It also destroyed its vine stock to jam a card it then won nothing from.
- **Mink's endgame invent churn: 11 × "invent from 2" (≥22🐟), versus 0 invents from Otter.**
  - Between fish 46 and 88, Mink's only build was Spy Mound. Four times it invented two or three turns in a row.
  - This matches the 3P #4 "endgame invent churn" note. Here it started well before the deck emptied.
  - It looks like a Greedy hand-quality loop: Mink never builds what it holds, so it keeps redrawing.
- **Mink wasted Spy Mound.** It deferred its bid on my Tangle swim, saw the reveals, and then bid 0 (log: "🕵 Spy Mound: Mink bids 0 after seeing reveals"). A once-per-game card spent on a pass.
- **Clay Den Mink passed on clay again.** With 4 supply and clay at 1🐟/item for it, Mink let me take Clay Bank's 2 clay uncontested. This is the same behaviour the 3P #4 log noted.
- **Friendly Otter flushed the Headwaters (5🐟) and then bid 1 on a 7-reed card.** That's 6🐟 for one reed.
- **Otter played the raft well.** It ferried twice onto Vine Thicket (back 3, forward 2 each) to fill the card, and once onto Vine Curtain. Mink's three ferries included one onto Logjam's last log, which took the log I'd been saving Wood Pile's claim for.
- **Friendly Otter bid full capacity as a trigger.** On Silt Bank at River 1 it bid 2 on 2 open icons, which jammed my ride-along 1. "Friendly" doesn't always leave room.

## Balance / design impressions

- **A 0🐟 build is a free extra turn, and Beaver gets them.** Spillway prints 0🐟, and Lodge Foundation takes Wood Pile down to 1🐟. So Beaver can chain "build, then act again" twice in a game. The guide already says this ("keep the chair"), and it was the strongest-feeling move of the game. It's worth a sim check that Lodge Foundation plus a 0🐟 log card isn't lopsided at 3P. The guide's "species within a few percent" figure is an average across all hands.
- **4-icon cards plus a Greedy bidder make a jam trap at 3P.** Mud Wallow jammed three times running, and its effect never fired. Greedy's full-supply bids against a 4-icon card mean any second bidder jams. Nobody fixed the problem by staying out, because each full jam still paid its initiator 1. The consolation may be what keeps people triggering these.
- **Burrow Network reached its cap at the fourth mud structure.** That repeats the "variable-VP card caps with ~3–4 structures" pattern from the last two logs (Burrow Network, Hidden Cache). For a 0★ card it was my second-best scorer, behind nothing but the printed 6s.
- **Floodgate (8★, 4 mud + 3 clay) was never reachable.** Seven mud/clay icons late in the game with a Clay-Den Mink at the table was out of reach. Cattail Patch also died in hand. That's fine: they were the right discards.
- **The deck ran out around fish 70**, and the drift carried everyone from about 70 to 90 in roughly 8 turns each. That felt right: tense, with no dead board.

## Fun report

- **Most fun / felt smart:**
  - The **Spillway free build** that kept me the lowest pawn, straight into the 4-log Logjam swim (beat 3).
  - **Sizing bids to Greedy's supply** so the totals fit exactly, on Mud Flat and on Reed Stand (beat 2).
  - **The Mud Slick strike** while Mink was empty (beat 4).
- **Least fun:**
  - **The Mud Wallow triple jam** (beat 1). Three auctions, everyone paid, one mud each, and the card then rotted on River 3.
  - **The Tangle jam** (beat 5). I did the "count their workers" homework and got blindsided by free recalls. The lesson is fair, but it didn't feel like it at the time.
- **Tense moment:** the finish. I was at 86 against Otter at 86, and Otter was 4★ behind with 8 supply. If Slipstream had worked (Engine #1), Otter would have had one more action to close the gap.

## Follow-up: fixes applied (same day, web only)

**Fixed:**
- **Slipstream and Royal Lodge bonus turns (Engine #1).** The end-of-turn "↩ still on top" check now calls `pickNextPlayer()` only when no bonus turn is pending, so it can no longer use up `bonusTurnPlayer`.
  - Verified in an all-AI 3P game with Slipstream injected for two seats. Both "⚡ … uses Slipstream" lines were followed straight away by that player's own turn.
- **The crossing warning now counts the deck-empty drift (Engine #2).** `humanCrossWarnHTML` adds 1 when the material deck is empty. Verified: at 86🐟 with a 3🐟 action, the warning is silent with cards left in the deck and shows once the deck is empty.
- **Raft-full text:** "…slides to River N (…) and **freezes there**. With every icon taken nobody can auction it again, so it stays put until its last worker leaves."
- **Wood Pile names the card:**
  - Picker: "River 2: Logjam (Logs, 2 open)"
  - Log: "Wood Pile: Beaver claims 1 Log icon on Logjam at River 2 (+1🐟)"
- **Mud Levee names its targets:** "Mud Levee drops 2 blanks on Marsh Edge (Reeds, River 1) ×2". The human and AI paths both record where the blanks went.
- **AI starter drafts are logged** straight after "Game starts", e.g. "🦦 River Otter drafts Kelp Bed."

**Not changed:**
- **Choosing which workers pay for a build (UI #5).** It needs a new picker and it's low severity.
- **Every AI behaviour note** (Mink's invent churn, the wasted Spy Mound, the vine recall, passing on clay), plus the balance questions (Beaver free turns, 4-icon jam trap). These are designer and sim calls.
