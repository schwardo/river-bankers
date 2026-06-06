# River Bankers Playtest Notes — Claude as human player (Beaver) vs 2 AI (River Otter, Muskrat)

Date: 2026-06-05 · Players: 3 (1 human seat played by Claude + 2 AI) · Rules: published PDF (draft v0.1) · Web build: leftfield.games/games/river-bankers/play/
**Final result: Beaver (me) 36★ · River Otter 28★ · Muskrat 14★. 23 human turns.**

---

## A) Confusing things (rulebook & playable version)

### Rulebook ↔ implementation mismatches
1. **Starter cards / asymmetric species powers are entirely absent from the rulebook.** The setup screen says "Species have asymmetric powers — see their starter cards," and the game opens with a draft of 1-of-3 species starter structures (built free, worth VP, with ongoing abilities). The rulebook never mentions any of this — it describes species as purely cosmetic colors. This is the single biggest gap between the PDF and the web game.
2. **Starter VP asymmetry is unexplained.** Beaver starters are 1–2★; Otter's Kelp Bed and Muskrat's Mud Burrow are 0★. Presumably balanced by ability strength, but a new player drafting blind has no way to evaluate (e.g., I had to guess that fish-discount > +1★).
3. **Component counts disagree:** rulebook says 32 structure cards; the web deck shows 39/39 (plus starters on top of that). Also the in-game structure deck displayed "39/39" *after* dealing 9 cards to hands, which suggests the counter shows remaining/initial-remaining rather than the true total — slightly confusing either way.
4. **Muskrat built "Cache Burrow" for 4★** — the same card name as a 1★ Beaver starter I was offered. Same name, different species/VP. Either a deliberate mirror or a naming collision; confusing in the log.
5. **Hidden structure powers not in the rulebook:** Salt Lick (peek at all hands — and it prints rivals' hands into the shared log!), Slipstream (out-of-order turn), Reed Walkway (2★ × reed-structures end bonus, free worker placements), Tribute Stone (force an opponent recall + slide them back 3), Salmon Run, Heron Roost, Beaver Tow, etc. The rulebook documents the 8 *material* card effects but says nothing about *structure* effects, which are a huge part of the actual game.
6. **The rulebook's deck-composition box enabled card counting** (this is praise + a flag): "5- and 7-icon always, 4-icon at 3+" let me deduce the exact remaining deck (and I confirmed: the last 5 cards were exactly the unseen 4/5/7s). Intended? If yes, say so — it's a fun skill. If not, reword the box.

### Web/UI issues
7. **Likely bug: Salmon Run / Beaver Tow "as an action" buttons vanish before endgame.** The availability check is `timePos + 2 < ENDGAME_TRACK_END(59)` against the **cumulative** (un-wrapped) fish position, so once any player crosses ~57 *total* fish — i.e., most of the mid-game second lap — their action-granting structures go dark until endgame compression resets positions. I built Salmon Run at cumulative 60 and couldn't use it at all until the endgame. The AI has the same guard (same constant in `aiChooseAction`), so the bug is symmetric but probably unintended pre-endgame.
8. **Salmon Run picker text contradicts itself:** the modal says "Cumulative fish cost grows as 2/5/10/18/31 for 1/2/3/4/5 workers," but the actual buttons charge 1/3/6/11/19 (matching the card's "1/2/3/5/8 per successive worker"). The blurb appears to be stale.
9. **Mud Levee's blank-drop targets include Headwaters cards** even though the card text says "drop 2 blanks on uncovered icons *in the river*."
10. **Log wording nits:** (a) "💨 X jams from the Headwaters into River 1" uses "jam" for ordinary downstream drift — the rulebook reserves "jam" for overbid auctions; (b) "⬇ new Stones card enters Headwaters 3 (move: 4🐟)" — the "(move: 4🐟)" annotation on a refill is opaque (it reads like a cost someone paid); (c) raw SVG markup is embedded in log *state* (cosmetically fine in UI, but it leaks into anything that reads the log as text); (d) "Muskrat can't act — passes (advances 1🐟)" — the rulebook's pass-to-retire doesn't mention a 1🐟 advance.
11. **Two identical "River 1: Mud · 1 open" buttons** in the Mud Levee blank picker (Mud Flat vs Mud Wallow) — indistinguishable without hovering/knowing the layout.
12. **Fish display vs internal position:** the track shows mod-60 positions while turn logic uses cumulative position. Mostly invisible to a player, but the log's "advances to 6🐟" right after someone was at 59 takes a beat to parse (it wrapped). A "(lap 2)" annotation would help.
13. (Minor) The bid dialog's "minimum bid 1 (you triggered)" vs "minimum bid 0" is great — but nothing in the UI warns you of the **graduation rule** (River 4 → shoreline after any auction). I lost a 5★ plan to that; an "after this auction the card leaves the river" hint on River 4 auctions would be a kindness.

### Rulebook-only confusions (no implementation needed)
14. **"Pay first, win or lose" + secret simultaneous bids is the game's signature, but the rulebook undersells the consequences.** With 3 players the modal outcome of contested auctions in my game was a *total* jam: three separate times every bidder took zero on the same drifting reed card (collectively ~25 fish burned on 2 icons). An example like "what happens when everyone wants the last icon" (a 1v1 standoff on a 1-icon card guarantees mutual zero) would set expectations.
15. **Wildcard wording:** "chosen at retrieve" (Driftwood/Mud Slick) — "retrieve" isn't defined anywhere; the build action calls it "pick up." Same concept, two names.
16. **Endgame retire-at-59 interacts oddly with the compression:** you reset to spaces 1–3, so "reach 59 or pass" means ~56+ fish of endgame actions each — in practice everyone retires by passing (no productive action), not by hitting 59. The rule reads as if 59 is the common case.
17. **Trophy Lodge's "?-VP structure"** terminology isn't defined in the rulebook (the rulebook never mentions ?-VP cards at all; you only learn what counts by seeing the final scoring — e.g., Reed Walkway turned out to be ?-VP).

---

## B) Fun / clever / noteworthy moments

1. **The double-turn tempo trick.** Turn order is "lowest fish acts; ties → top of stack; pawns landing on a space stack on top." I realized that paying *exactly* enough fish to land on the leaders' space puts me on top of the stack → I act again immediately. I deliberately engineered this 5+ times (e.g., building Trophy Lodge for exactly 3🐟 to land on the 12-stack). The web logs it charmingly: "↩ still on top of the lowest space — takes another turn." This is the best tactical wrinkle in the game.
2. **Triggering the endgame on my own terms.** With 1 card left in the material deck, I pulled Silt Bank — simultaneously buying the mud I needed at the cheap headwaters rate *and* emptying the deck while I was lowest on the track, so the 1/2/3 compression made me first player for the entire endgame.
3. **The flush gambit.** Mid-game I deduced (from the rulebook's deck-composition box + cards seen) that the remaining 5 deck cards had to include three 7-icon cards (logs/reeds/vines). I paid 5🐟 to flush — it revealed Logjam (logs×7) AND Fallen Limb (logs×4), exactly the logs Salmon Run needed, with a free auction at 1🐟/item while both AIs were at 0 supply. Felt like a heist.
4. **Opening exact-fit auctions felt great:** Clay Bank bids 3/0/2 on 5 icons and Boulder Field 2/2/3 on 7 — everyone places everything, no waste. When the numbers fit, this system sings.
5. **The Great Reed Standoff (also filed under C/frustrating-but-memorable):** one reed card drifted River 1→2→3→4 with THREE consecutive all-player jams — nine bids, zero icons awarded, ~25 fish burned table-wide — before half its icons graduated to the shoreline unclaimed. Absurd, darkly funny, very thematic (everyone drowning swimming after the same log).
6. **Salmon Run as an auction bypass is deliciously strong.** Place workers directly on icons for 1/2/3/5/8 — no jam risk, no rivals. The whole endgame I converted fish→materials at rates the auction players couldn't touch. Building it felt like acquiring a superpower (when the UI let me use it — see bug A7).
7. **Mud Levee's blanks as targeted denial:** killing two single-icon cards (Reed Stand's last reed, Mud Wallow's last mud) with one build — and the Mud Wallow blank permanently locked Otter's "most-workers moves back 2" shoreline bonus. Two birds, one blank.
8. **Branch-complete bidding.** Twice I bid amounts chosen so that *every* possible AI response left me reaching my target count (auction win, partial jam → fewer icons + salmon-run rescue, full jam → icons survive for salmon-run). When it worked it felt like solving a puzzle. When the card hit River 4 the rescue branch silently died (graduation) and I lost the line — my one genuine blunder, and an instructive one.
9. **Otter's pay-first punishments:** the AI bid 2 into my 5 on Driftwood and took nothing (paid 2), then later otter+muskrat jammed each other 3v3 on 3 stone icons — both took zero, 12 fish gone. Watching the auction rule punish greed is the game working as designed.
10. **Tribute Stone hit me** (forced recall of a placed log + slide back 3🐟) — being targeted by an opponent structure was a genuine "oh no" moment, though the 3🐟 slide-*back* is partially a gift (tempo). Interesting double-edged design.

## C) Dead turns / no good choices

1. **Forced opening.** Turn 1: river empty, nothing buildable, flush pointless, invent weak — pulling a Headwaters card is the only sensible move for every player (all three of us did exactly that). The first decision of the game is really "which of 3 cards," not "which of 5 actions."
2. **Mandatory 0-bid participation.** I was prompted to bid in *every* AI-triggered auction — roughly 20 of them — and submitted 0 in about half because the material was irrelevant to my hand. In a web UI it's two clicks; at a physical table this is the "everyone secretly chooses a fist count for an auction only one player cares about" problem. Some auctions are genuinely tense; many are pure ritual.
3. **Single-icon standoffs are lose-lose.** When one icon is left and two players want it, any contested bid is a guaranteed mutual zero (1v1 on 1 icon always jams). Twice I entered these knowingly and lost fish both times; afterwards the correct play is to never contest a single unless you're sure you're alone — which makes those icons weirdly dead despite being wanted by everyone.
4. **Late mid-game material droughts.** After my hand's materials left the board (logs/clay gone, my targets all needing them), my real options were "bid 0 and wait" for several rotations. The deck inference told me relief was coming, which kept it bearable — but without that knowledge it would have felt like pure dead time.
5. **Heron Watch was dead on arrival:** drawn when its logs existed only on shoreline cards (which can't receive workers). 0★ + situational bonus + unreachable materials = a card I carried, unbuildable, for the entire endgame. Invent could cycle it, but with the structure deck full of materials I couldn't reach either, even that was a non-choice.
6. **Endgame pass-to-retire:** Muskrat and Otter both ended by "can't act — passes," and my own last turn was "the only open icon is a worthless singleton; retire." The endgame deflates rather than crescendos — last actions are bookkeeping, not climaxes. (My endgame *start* was great; it's the final 2-3 turns that fizzle.)

---

## Turn-by-turn thoughts (Beaver = me)

- **Pre-game:** Drafted **Lodge Foundation** (log builds −1🐟, min 1) over Tail Slap (2★, pay-1🐟 denial) and Cache Burrow (hand size 4). Reasoning: fish = tempo, and log builds looked likely. It paid off twice (Charcoal Pit 3→2, Salmon Run 4→3) — modest, honestly; Cache Burrow's extra hand slot might have been better.
- **T1 (fish 0→5):** Hand: Salmon Run (4L+2V, 6★), Trophy Lodge (3C+2S, 0★ meta), Charcoal Pit (4C+2L, 6★). Clay = my bottleneck (7 needed). Pulled Clay Bank (HW1, 2🐟), bid 3 @1🐟/item → bids 3/0/2, exact fit, 3 clay parked on shoreline.
- **Bid-0 on Otter's Reed Stand pull** (no reed needs).
- **Muskrat's Trailing Vine pull:** bid 2 (needed 2 vines for Salmon Run) → jammed by Muskrat's 4 (6 on 5) → got 1 vine for 2🐟. First lesson in overbids.
- **Otter's Boulder Field (stones×7):** bid 2 for Trophy Lodge's stones → 2/2/3 exact fit ✓.
- **T~5 (the double-turn):** Built Trophy Lodge for exactly 3🐟 → landed on the 12-stack on top → free extra action. Pulled Driftwood Tangle (logs/reeds wild ×5), bid 5 → Otter's 2 jammed me down to 3 wilds (paid 5). Otter took 0 and paid 2 — pay-first cuts both ways.
- **Driftwood drifted R1→R2→R3 with repeated scraps;** I bid 1 once (jammed, −2🐟), then let it go — my 2 remaining wilds were safe wherever the card ended (shoreline parking is a great rule).
- **Muskrat's Tribute Stone** forced me to recall a wild (−1 log) but slid me back 3🐟. Annoying and slightly compensating at once.
- **Single-icon knife fights:** Trailing Vine's last vine (me 1 vs Muskrat 1 → mutual zero, −3🐟) and Reed Stand's last reed (Otter spent its literal last worker to jam me, paying its odd 1🐟-discounted bid — Otter's bids consistently cost ~half, presumably the Kelp Bed/species power; also undocumented).
- **Pivot to capacity:** Vine Curtain (vines×4) bid 2 → clean. Hidden Inlet (reeds×4) bid 1 → Muskrat's 3 jammed it (5 on 4) — that AI punishes any thin margin.
- **The Mud Slick haul (turning point):** Mud Slick (clay/mud wild ×7) reached HW1. Supply 3 → used the bid dialog's recall feature (recalled my lone Trailing-Vine vine, dropping a blank) to fund a bid of 4 → 4/1/1 on 7 icons, all fit. Charcoal Pit fully funded in one auction. The recall-to-bid mechanic is excellent.
- **Built Charcoal Pit for 2🐟** (discount) → second engineered double-turn (landed on 42-stack) → **flushed** (5🐟) on deck inference → Logjam revealed → bid 4 @1🐟 → Salmon Run's logs done. Probably my best two-turn sequence of the game.
- **Built Salmon Run (3🐟)** — interrupted by Vine Curtain's peek-rearrange (saw the last 2 deck cards: Vines7, Clay4; order didn't matter to me; confirmed as-is). Mid-build interrupts surprised me but the modal was clear. 16★, briefly tied with Otter.
- **Salmon Run goes dark (bug A7)** — cumulative 60 > guard. Forced back into auctions: won 1 mud on Mud Wallow through a 2/1/2 jam, then **pulled Silt Bank to end the deck** → endgame, compressed to space 1-ish, first player.
- **Endgame:** won 2 mud on Silt Bank (clean 2/1). Lost the Marsh Edge reed war (three table-wide jams; my −10🐟; Trading Post eventually died when the card graduated off River 4 — my pot-commitment mistake). Salmon-ran 2 stones (Rocky Shoal) → **built Mud Levee** (6★ + 2 denial blanks). Salmon-ran 3 reeds + grabbed 2 vines (Trailing icon 1🐟 + Vine Thicket pull bid 1) → **built Heron Roost** (6★). Clay Seep bid 2 → leftover pair insurance (+1★).
- **The finale:** Heron Roost's replacement draw was **Beaver Tow (4Mud+2Clay+1Vine, 8★)** — and it was *exactly* fundable: vine won under Otter's nose (1/1 exact fit), mud via salmon-runs around Otter's snipe (it stole 1 of 4 Silt icons and Slipstreamed an extra turn at me), clay already parked. Built it at fish 57 → 36★, retired. Muskrat and Otter had already passed out of the game.
- **Final: 36 / 28 / 14.** Margin came from: never losing placed materials (shoreline parking), the salmon-run conversion rate, and ~4 engineered extra turns. Fish wasted on jams: ~19 — the AIs wasted more.

## Stats & misc observations

- In-game timer reported **119.7s average decision time over 23 turns** (that's me thinking via API calls; a human would likely be faster per decision but the count is representative).
- 3P game length: 23 human turns ≈ 70 total actions. Felt right for 30–60 min in person, but the bid-participation overhead (C2) would stretch physical play.
- AI personalities read as: Muskrat = aggressive sniper (jams thin bids, big VP early), Otter = value engine (cheap bids, structure effects, surged from 9→28 in the endgame). Genuinely competent opposition; both punished every greedy bid I made.
- The web implementation is impressively complete: undo, recall-funded bids, effect interrupts, endgame scoring breakdown, even an average-decision-time stat.
