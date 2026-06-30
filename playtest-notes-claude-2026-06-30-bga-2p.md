# River Bankers — BGA Studio Smoke Test (Claude)

**Date:** 2026-06-30 Tue
**Where:** BoardGameArena **Studio** table #915426 (game 15061, `riverbankers`), the live PHP/JS port — *not* the web prototype.
**Config:** 2 players · **Asymmetric** (species starters ON) · Training mode.
**Players:** `schwardo0` (River Otter, built Kelp Bed) vs `schwardo1` (Beaver, built Tail Slap). Both seats driven by me via Studio's two test accounts (separate browser tabs, `&as=<id>`). **No BGA AI bot exists for a custom game**, so the "opponent" is a hand-driven second account.

Purpose: exercise the key flows of the BGA implementation to address the Phase-7 TODO
*"Full end-to-end self-playtest at 2p / 3p / 4p; verify against sim.js outcomes"*
(`games/board-games.org`, BGA Studio checklist → Phase 7). **2P arm only.**

---

## Result headline

A full 2P game was played to completion (Move #83, ~54 min of game time, 37 turns). The
**end-of-game scoring dialog and ranking work**, and almost every flow behaves correctly.
**One blocking client bug was found in the final-build round** (details below) — it soft-locks
the game on fresh entry; a page reload works around it. A code fix is staged (see Finding A).

Final scores (scoring dialog rendered the per-component VP breakdown):

| | Structures | Leftover materials | **Total** |
|---|---|---|---|
| schwardo0 | 6 | 0 | **6** (1st) |
| schwardo1 | 2 | 1 | **3** (2nd) |

Statistics panel also rendered (game duration, turns played 37, fish spent 181, structures built, auctions held 3, …).

---

## Flows verified working

1. **Table creation + Express start.** 2P asymmetric / training table created from the Studio lobby; Express start seated the second test account and launched.
2. **Species starter draft** (`StarterDraft`, multiactive). Each player picked 1 of their 3 species starters and it pre-built; on-build state advanced to dealing hands and the turn loop. Card art/preview rendered.
3. **Board rendering.** Headwaters (3 slots) / River 1–4 / Shoreline / per-player panels / fish track / hand all render from `getAllDatas`; card faces, worker chits, material icons from the sprite sheets all show.
4. **Pull → sealed-bid Auction → jam.** schwardo1 pulled HW1 Driftwood Tangle (5x wild Logs/Reeds); both bid 3 → log read *"River jams, overbid by 1,"* each won `max(0, 5−3)=2`, the 5th icon drifted with the card to River 1. Fish charged **per worker bid** (paid 3 each). Matches sim.js jam math.
5. **Build.** schwardo0 won 4 clay (a clean, no-jam auction: *"Plenty to go around"*), then built **Charcoal Pit** (4 clay + 2 logs). Wildcard allocation auto-resolved (2 wild Logs/Reeds → logs); **worker supply recovered 2 → 7** on build; **hand refilled** to 3 (drew Reed Walkway); score updated; the when-built/`BuildEffects` dispatcher ran without error (Charcoal Pit's clay-substitution auto-resolved since cost was met exactly).
6. **Invent.** Draw N / discard N / pay N🐟 — exercised at N=2 and repeatedly at N=5; discard selection UI ("Discard selected x/5") correct.
7. **Flush.** `Flush` (5🐟) reshuffled the Headwaters → `FlushChoose` ("choose a Headwaters card to auction") → auction on the chosen card (Marsh Edge, 7x reeds). Works.
8. **Ability card (Tail Slap).** Start-of-turn ability: dropped a blank on a River-1 card (Clay Bank open icons 1/5 → 0/5), charged 1🐟, and **returned to the turn** (the main action remained available) — consistent with the card text *"At the start of your turn, you may pay 1🐟 …"*. (See Finding C for the logging gap.)
9. **Live score includes projected leftover-pair VP.** Mid-game panels showed Kelp Bed(0) + 2 wild materials = 1★ and Tail Slap(2) + 2 wild = 3★, i.e. the running total folds in the leftover-pair bonus (1 VP / 2 leftover materials).
10. **Endgame.** Both retirement paths exercised: schwardo1 **crossed the fish line** (→92) and auto-retired; the **"Retire" button then appeared** for schwardo0 (correctly gated on `endgameTriggered()`), and schwardo0 used the **retire-early** action. All-retired → final-build round → `EndScore` → **scoring dialog + ranking + statistics**. Winner/order correct (6 > 3).

---

## Findings

### A. [BLOCKING] Final-build round soft-locks — `FinalBuild` client never builds its UI for the active player

`FinalBuild` is a **MULTIPLE_ACTIVE_PLAYER** state. The client class (`modules/js/Game.js`) built its
title, clickable hand, and **Skip** button *only* inside `onEnteringState`, gated on `isActive`. But in
this framework multiactive players are **not** active during `onEnteringState` — activation arrives later
via `onPlayerActivationChange`. (The `Auction` class in the same file documents exactly this and works
around it; `FinalBuild` had no `onPlayerActivationChange`.)

**Symptom observed:** after both players retired, both tabs showed *"It's your turn!"* with a **blank
action bar — no Skip button, no clickable hand** — so neither player could build or skip, and the game
was stuck before scoring. **A page reload recovers it** (on restore the player is already active, so
`onEnteringState` gets `isActive=true` and renders the Skip button) — that's how this playtest reached
scoring. Console showed only benign `AbortError: play() … pause()` audio noise, no fatal error.

**Fix (staged, not yet deployed):** gave `FinalBuild` an `onPlayerActivationChange` that rebuilds the
title / clickable hand / Skip button when the player becomes active, mirroring `Auction`
(`modules/js/Game.js` `class FinalBuild`). **Needs SFTP deploy + SVN "Commit my modifications now"**
to take effect on Studio (per `bga/README.md`), then re-test a 2P endgame without reloading.

### B. [deploy-state, not a code bug] Undo returns "available for your next game only"
Clicking **Undo** during an in-progress ability returned BGA's *"this undo function has just been
introduced and will be available for your next game only."* I then created a **second, fresh table
(#919626)** and reproduced the exact same message — so it is **not** a stale-table artifact. Our undo
wiring is the standard BGA API (`undoSavepoint()` at `PlayerTurn::actUseAbility`,
`undoRestorePoint()` in `Game::undoAbility()`), and there is no gameinfos undo flag to set, so this is
**not a code-logic bug**. BGA shows this message when the running (SVN-**committed**) snapshot a table
was created from doesn't have undo active yet — and it reserves undo for games started *after* the
feature is live. This is the same deploy/commit class of issue `bga/README.md` warns about (SFTP working
copy ≠ committed snapshot). **Resolution: deploy + "Commit my modifications now", then create a brand-new
table** — that next game should have working undo. (Couldn't be verified this session without deploying.
Training mode disabling undo is a remote alternative also worth ruling out by testing a Normal-mode game.)

### C. [minor] Tail Slap produces no game-log line
Tail Slap dropped the blank and charged 1🐟 (confirmed by fish accounting: schwardo1 5 → 12 across
Tail Slap + Flush + trigger-bid) and correctly returned to the turn, but **no entry appeared in the
game log**, so opponents/spectators see no record of the action. Other actions log normally.

### Observation — Kelp Bed reed discount not visibly exercised
Auctioning a reeds card (Marsh Edge) from the Headwaters/Flush rate (1🐟/item) showed no discounted
per-item rate for the Kelp-Bed holder, because the −1 reed discount is already at its min-1 floor at
that base rate. The discount only becomes visible at River slots with base rate ≥2 (not reached here).

---

## Methodology notes / caveats
- Opponent was a second Studio test account driven by me (no AI bot exists for a custom game).
- The endgame was reached by **grinding fish to the 90 line via repeated Invent-5** (the only fast,
  self-contained fish sink), because the phpMyAdmin DB console required a login I don't have. Both
  pawns climbed in lockstep (turn order always activates the lowest-fish player) until one crossed.
- Not yet done: **3P and 4P** arms of the Phase-7 TODO; a re-test of the `FinalBuild` fix once deployed;
  Undo on a fresh table.
