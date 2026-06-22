# River Bankers — Playtest Notes (Claude, 2026-06-21, 2P)

**Setup:** 2-player game. I play **Beaver** (You); opponent is **AI Mink**. Species starter cards: **on** (asymmetric). "Allow double-card auctions": **off** (per request). Played via the browser prototype at `games/river-bankers/web/index.html`, driven through a headless Chrome so I experience exactly what a player sees on screen.

**Why this matchup:** The strategy guide pegs Beaver as a forgiving, tempo-flavored species (logs are everywhere, so the Lodge Foundation log-discount is the easiest discount to actually use) — a sensible first-game pick. I deliberately set the AI to **Mink**, which the guide flags as one of the strongest engines (Clay Den's −2 clay discount + Clay Vault is "one of the most efficient lines in the game"). So this is "forgiving tempo engine vs. the book's strongest value engine" — a good stress test.

**How I'm playing:** I read the rules + strategy guide first (no prior knowledge), then make each decision on its own merits, narrating my read of the board and my rationale before I commit. I flag anything that confused me or diverged from the rulebook, and anything that felt clever or fun.

---

## Pre-game read (what I think I know going in)

- **Fish = tempo, not money.** Every action shoves my pawn forward; the pawn *farthest back* acts next and can chain multiple turns. So small, cheap actions that keep me lowest are the backbone; one big haul hands the opponent a run of turns.
- **Price = position.** A card is cheapest at the Headwaters (1🐟/item) and gets dearer each time it drifts downriver uncovered (River 1=2, R2=3, R3=4, R4=5 🐟/item). Buy upstream when I actually want it; let cards I don't need drift and become the *opponent's* overpriced problem.
- **I pay for every worker I bid, win or lose.** So don't overbid "to be safe."
- **Beaver plan:** Lean logs. Lodge Foundation (my likely free starter) makes log-using builds cost 1 fewer fish — a tempo discount I can fire all game. Beaver's signature builds are tempo/VP cards (Royal Lodge, Lookout Tree, Spillway, Wood Pile). No "log-count engine" — instead spend cheap logs into pricey high-VP cards and keep the chair.
- **Watch the Mink:** clay is the least-contested, highest-VP-per-unit material, and the AI gets a −2 discount on it. If clay structures flow, the Mink wins them cheap. I may sometimes contest a clay card just to make the Mink overpay (drive up its price), but only when the tempo cost to me is worth it.

---

## Turn-by-turn log

### Opening board (both pawns at fish 0; I act first)

- **Headwaters:** HW3 *Driftwood Tangle* (Logs/Reeds **wild**, 5 icons, pull 4🐟) · HW2 *Marsh Edge* (Reeds, 7 icons, pull 3🐟) · HW1 *Vine Thicket* (Vines, 7 icons, pull 2🐟). River empty.
- **My hand:** Log Flume (Mud×2 Logs×1, 2★, "on build advance 3 fewer 🐟") · Reed Walkway (Reeds×4 Mud×1, 0★, reed engine + free-worker-on-reed-build) · Reed Bed (Reeds×3 Mud×1, **4★**, reeds cost 1 less 🐟/item).
- **My built:** Lodge Foundation (logs cost 1 fewer 🐟).
- **Opponent:** the AI Mink **drafted Quick Strike (2★), not Clay Den.** Worth flagging — the AI took the bid-timing tactical card the strategy guide explicitly warns about, so it has **no clay discount**. My "contest the Mink's cheap clay" worry is lower than expected; I'll watch whether the AI actually bends its game around Quick Strike (the guide says that plan loses).

**A tension I notice immediately:** I'm Beaver with a *logs* discount, but my opening hand is two strong *reed* cards (incl. a 4★) plus one log card. The guide says specialize, don't split — but the hand is pointing at reeds while my free starter points at logs. The bridge is the wild **Driftwood Tangle** (Logs/Reeds): its workers satisfy either. For now reeds are the clear value (Reed Bed is 4★ for 3 reeds + 1 mud), so I'll lean reeds and keep logs as a side option via Log Flume + the wild card.

### Turn 1 — Pull HW2 *Marsh Edge* (Reeds), bid 3 workers

**Rationale:** I can't build (no workers placed yet), so this turn is pure acquisition. Reeds are the cheapest thing that feeds my best card (Reed Bed, 4★). Marsh Edge is pure reeds with 7 icons (lots of room if contested) and only 3🐟 to pull — cheaper than the 5-icon wild at 4🐟. I bid **3** to bank exactly the reeds Reed Bed wants (3), at the Headwaters rate of 1🐟/item. I considered the wild Driftwood Tangle for flexibility, but pure reeds is cheaper, has more icons, and I'm committing to the reed line. On turn 1 both pawns sit at 0, so *any* action cedes the chair to the Mink regardless of size — I just don't want to bloat the move and hand the Mink a long chain, so 3 (a ~6🐟 turn) is a measured grab, not a 4-worker haul.

**Outcome:** Bids revealed 🦫3 / 🦡1 — total 4 ≤ 7 icons, "plenty," everyone took their bid. I banked 3 reeds (fish→6); the Mink spoiler-grabbed 1 reed. Marsh Edge drifted to River 1 with 3 icons still open. *The auction-result panel was genuinely good UX* — it spelled out "Total bid 4 ≤ 7 open icons, so every bidder took exactly what they bid" and that the card drifts to River 1 at 2🐟/item. Nothing confusing.

### Reacting on the Mink's turns (I'm a bidder, not the active player)

The Mink then took a **run of turns** off its low position and I had to react to each auction:

- **Mink pulls Vines (Vine Thicket).** I passed (bid 0): no vine card in hand, no vine discount, and I was already even/ahead on tempo. **Quick Strike fired** — the log read *"Quick Strike: Mink bids 3 after seeing reveals."* So on the Mink's own triggered auctions it declares last; seeing my 0, it comfortably took 3 vines for 3🐟. This is exactly the bid-timing edge the guide describes, and it's clearly implemented.
- **Mink pulls the Logs/Reeds wild (Driftwood Tangle, 5 icons).** This one I *did* want (wild = my logs discount OR my reeds). I bid **1**. The clever bit: I was at fish 6 and the Mink at 8, so a 1-fish bid moved me to 7 — *still below the Mink* — meaning I banked a flexible wild worker at the cheap 1🐟/item Headwaters rate **without surrendering my "act next" position**, and no rational Mink will burn fish to jam a 1-bid. Felt like a real "free" pickup. Outcome: 🦫1 / 🦡4 — the Mink piled in 4 (→ fish **12**), claimed the rest, and the fully-claimed card went straight to the shoreline.

**Big swing:** that 4-worker haul left the **Mink at fish 12 with supply 0** (all 8 workers placed: 1 reed + 3 vines + 4 wild). It's now stranded near the front of the track with no workers to trigger anything, and I'm at 7 — so I inherit a **chain of turns**. The Mink overpaid for tempo exactly the way the guide warns against. (It's an AI, but it's a clean illustration that a big haul "buries you and gifts the table a lap of turns.")

### Turn 2 — Pull HW1 *Mud Slick* (Clay/Mud wild), bid 1 (as mud)

**Board:** HW1 Clay/Mud wild (7 icons, pull 2🐟) · HW2 pure Mud (5 icons, pull 3🐟) · HW3 Stones (7 icons). River 1 holds my reeds card (3 open) and the Mink's vines card (4 open). I have 3 reeds + 1 wild(log/reed) banked; supply 4; fish 7.

**Rationale:** **Mud is the bottleneck for my entire hand** — Reed Bed, Reed Walkway, *and* Log Flume all need mud. I only need **1 mud** to unlock **Reed Bed (4★)** since my 3 reeds are already banked. The Clay/Mud wild at HW1 is the cheapest pull (2🐟) and a wild worker serves as mud now (or clay later), so I take 1 there. I'm triggering, so Quick Strike gives the Mink no last-look; and the Mink at supply 0 would have to recall-then-bid to contest, which is unlikely. Bidding just 1 keeps the move small so my chain continues.

**Outcome:** 🦫1 / 🦡0 — Mink passed, I banked 1 wild mud worker (fish→10). Mud Slick drifted to River 1.

### Turn 3 — Build **Reed Bed (4★)**

After the mud pickup, *both* Reed Walkway (4 reeds+1 mud) and Reed Bed (3 reeds+1 mud) showed as buildable — my 3 pure reeds + the wild log/reed (as a 4th reed) + the wild clay/mud (as mud) cover either.

**A genuine strategic discovery while deciding:** I was tempted to build **Reed Walkway first** for the textbook "engine early" reason — it's a variable-VP engine (0★ now, +2 VP per built reed-structure at end) and "when you build a reed structure, place a free worker," and building it first would make my *later* Reed Bed build also drop a free worker (2 free workers instead of 1). **But** building Reed Walkway eats **4 reeds** — literally every reed I own (3 pure + 1 wild) — leaving me with *zero* reeds for Reed Bed, which then needs 3 fresh reeds I'd have to re-auction. The two reed cards cannibalize each other's materials, so I can't realistically field *both* reed structures soon, which is exactly what Reed Walkway's "+2 per reed structure" wants. With only 2 reed cards in hand and no cheap path to more reed structures, the engine caps low. **So the engine-sequencing argument collapses on the material math**, and the right call is the guaranteed value: **Reed Bed (4★)**. It consumes 3 reeds + 1 mud, banks 4 VP, leaves my flexible wild log/reed worker free, costs only 2 fish (lands me on 12 — tied with the Mink, but on top of the stack so I keep acting), and turns on a reed *acquisition* discount in case more reeds do flow.

*(Note for the designer: this "build A and you can no longer afford B" tension between two same-material cards in one hand is a nice, real decision — but it does mean Reed Walkway's payoff is quietly hard to realize from a reed-heavy hand unless reeds are flooding the river. Felt slightly like a trap card in this spot, similar to how the guide frames vines.)*

**Build outcome:** Reed Bed built (2🐟, 4★); the clay/mud wild was correctly logged as "spent as Mud." I landed on 12 **on top of the Mink**, and the log said *"still on top of the lowest space — takes another turn"* — so the stacking/tie rule works exactly as written. I drew **Cattail Patch** (Reeds×3 Mud×2, 0★, end-game diversity scorer) to refill my hand.

### Turn 4 (continued chain) — Pull HW1 *Silt Bank* (Mud), bid 2

**Key check I did first:** I read the code to confirm **Log Flume is a *standing* discount, not a one-shot** — once built it makes *every* future build advance **3 fewer fish (min 1)**. With Lodge Foundation's −1 on log builds, that's the Beaver "build almost for free" tempo engine the guide promises. So Log Flume (2★ + that discount) jumps to the top of my build queue.

**Rationale:** I can't build anything this instant (Log Flume needs 2 mud; I have 0). Since landing on 12-on-top means my *next* move will cede the chair to the Mink anyway, I spend this action setting up Log Flume by banking the 2 mud it needs. Mud is flooding the Headwaters (two pure-Mud cards), and HW1 is the cheapest pull (2🐟). I bid exactly **2** (the wild log/reed I already hold covers Log Flume's 1 log, so I don't need to buy a log). Disciplined size: fish→16, and the Mink — stuck at 12 with **supply 0** — has only a short, constrained runway even though I'm now ahead.

**Outcome:** 🦫2 / 🦡0, banked 2 mud (fish→16). The Mink then had a strong sequence: it **built Hollowed-out Log (5★)** for 2🐟 (a big VP card, presumably spending its wild log/reed haul as logs), used that card's *recall a worker* ability to refill supply, then auctioned the River-1 reeds. **Quick Strike fired again** (it bid 2 after seeing my pass). Notably, my own bid dialog on that reed auction showed **"1🐟 per item" — Reed Bed's reed discount correctly applied to me** — while the result panel showed the Mink paying the full **2🐟/item**. The discount is real and is surfaced live in the bid preview. I passed (no reeds needed), the Mink took 2 reeds for 4🐟 and buried itself at **fish 19**, handing me the chair back at 16.

### Turn 5 — Build **Log Flume** (turns on the tempo engine)

**State:** Me fish 16 / VP **6** / supply 5; Mink fish 19 / VP **9** / supply 3. The Mink is *ahead on VP* (its 5★ log card) but badly buried on the track — and VP, not board position, is what wins. I have tempo. Log Flume is buildable (2 mud on R1 + wild log on shoreline).

**Rationale:** This is the pivot of my game. Log Flume costs just **1 fish** to build here (printed 1, and Lodge Foundation's −1 applies because it uses logs), banks **2★**, and — the real prize — switches on a **standing −3-fish discount on every future build**. From here, Reed Walkway, Cattail Patch, and anything else I draw all build for the **1-fish floor**. It also lands me on 17, still below the Mink's 19, so I *keep the chair*. Cashing a held material stock into a structure the moment it's affordable is exactly the guide's "acquire toward a known structure, slap it down" advice — and this one slaps down my engine.

**Outcome:** Log Flume built for **1🐟** (2★); VP→7, supply restored to 8, landed on 17 still on top → another turn. Drew **Springwater Pool** (Vines×3 Mud×2, 5★, "ready your spent once-per-game cards" — dead text for me, I own none, but a 5★ body).

### Turn 6 (continued) — Pull HW2 *Mud* (pure), bid 2

**The fork in my hand:** Reed Walkway (reed engine, +2/reed-structure), Cattail Patch (diversity scorer), Springwater Pool (5★ flat). I worked out that **Cattail Patch and Reed Walkway pull opposite ways** (the guide's "specialize *or* diversify"). My built cards already cover reeds + mud + logs, so Cattail Patch as-is would only score **2** (3 distinct materials). Reed-specialization is my *cheap* lane — Reed Bed makes reeds 1🐟/item, and I already own Reed Bed, so building Reed Walkway gives me **2 reed structures = +4 end VP** with room to grow. So my plan crystallizes: **lean reed-wide (Reed Walkway + future reed cards), with Springwater Pool as an opportunistic 5★ if vines ever get cheap; shelve Cattail Patch unless I accidentally diversify.**

**This action:** every one of those cards needs **mud**, and mud is the universal bottleneck — so I bank cheap mud now. HW2 pure Mud is the cheapest mud pull (3🐟); I bid **2** (Reed Walkway needs 1, the 2nd is a buffer toward Springwater/Cattail). Any acquisition this turn pushes me past the Mink's 19 regardless, so I take a useful grab and let the chair pass. fish→22.

**Mink's turn:** it pulled the Logs card and Quick-Struck 2 logs (I passed — logs are dead for my hand and add no diversity), burying itself at **fish 27, supply 0**. I get a fresh chain at 22.

### Turn 7 (chain) — Pull HW2 *Reeds*, bid 4 (toward Reed Walkway)

**Note: the material deck is nearly dry (2 cards left).** Materials are now a finite, shrinking pool on the board — a real "grab it while it's at the cheap Headwaters rate" pressure, since after the deck empties nothing new enters and existing cards only drift *downstream* (dearer). No build is available (Reed Walkway needs 4 reeds, I have 0). So I assemble its reeds in one shot: HW2 Reeds, bid **4** at my discounted 1🐟/item. My auction → Quick Strike gives the Mink no last-look, and at supply 0 it would have to recall to spoiler. fish→29 (cedes the chair, fine — the Mink's runway from 27 is short).

**Outcome:** won 4 reeds (fish→29); I now hold 4 reeds + 2 mud. The Mink then ran a nice loop: built **Spring Cascade (3★)** and used it to *re-ready its spent Hollowed-out Log* (the recall engine), then Quick-Struck 3 mud (paid 6🐟) to bury itself at **fish 35** (VP 12). I passed the mud (I already hold enough). Mink's big spend hands me a long chain at 29.

### Turn 8 (chain) — Build **Reed Walkway** (engine online) + free-worker placement

Both Reed Walkway (4 reeds+1 mud) and Cattail Patch (3 reeds+2 mud) are now buildable. **Reed Walkway first** is correct: it's the engine, so building Cattail Patch *after* it will (a) trigger Reed Walkway's free-worker-on-reed-build and (b) count toward its "+2 per reed structure." Reed Walkway also re-frames Cattail Patch for me — even though Cattail Patch's *own* diversity score is low in my specialized build, *as a reed structure* it earns +2 from Reed Walkway and drops a free worker, so it's still worth building. Reed Walkway costs **1 fish** (Log Flume), lands me on 30 (< 35, chain continues), and its own build triggers a free worker.

**Free-worker placement — a nice sub-decision:** the modal let me drop the free worker on any River-1 card. I reasoned the free worker is worth the *most fish saved* on the **expensive, no-discount material**: a free vine saves 2🐟 (vines are 2🐟/item) vs. a free reed saving only 1🐟 (I discount reeds anyway). It also seeds my biggest VP target (Springwater Pool, 5★) and denies the Mink a vine. So I placed it on **Vines**. *Pivoted my plan here:* rather than feed Cattail Patch (low diversity value in my specialized build), I'll fund Springwater Pool.

### Turns 9–11 (chain) — assemble & build **Springwater Pool (5★)**

Over my chain I auctioned the River-1 Vines (bid 2 → 3 vines total with the free one) and a River-1 Mud (bid 1 → 2 mud), paying the un-discounted 2🐟/item vine rate. **A nice clarity touch:** the bid dialog always shows the per-item rate for the exact card/slot, so I could see vines cost me 2🐟/item (no discount) while reeds show 1🐟/item — the pricing is legible at the point of decision.

**Meanwhile the Mink showed real range:** it built **Burrow Run (4★)** which *moved its pawn back 5 spaces* — a pure tempo-recovery card — re-using its Hollowed-out Log recall and Spring Cascade reset to keep workers cycling (VP climbed to **15**, ahead of me). Then it over-committed again, Quick-Striking 4 clay/mud for 8🐟 up to fish 41, handing me the chair back at 38.

**Build:** Springwater Pool for **1 fish** (5★). Its printed "ready your spent once-per-game cards" does nothing for me (I own none) — I'm building it purely as a 5★ body that also adds **vines** as a distinct material. Lands me on 39 (< 41 → chain continues). **VP now: me 16, Mink 17 — a genuine neck-and-neck race.**

### Turn 12+ — material scarcity sets the agenda; grab the last reeds for Cattail Patch

I drew **Salmon Run (6★, Logs×4 Vines×2)** and **Vine Trellis (vine engine)** — but reading the board changed everything: **the material deck is down to its last card**, and **vines are essentially gone (1 left on the whole board)**. That strands both new cards (Salmon Run needs 2 vines, Vine Trellis needs 3). This is a real structural feature of the endgame I want to flag: **once the material deck dries up, the materials physically on the board are all that exist for the rest of the game** — so card-in-hand value collapses if its materials aren't present, and acquisition becomes "use it or lose it." Reeds are down to 3 on the board.

Happily, my forced diversification (my built cards already span reeds/mud/logs/vines = 4 distinct) has made **Cattail Patch** worth a real ~3 from diversity *plus* +2 from Reed Walkway (it's a reed structure) *plus* a free-worker trigger — so it's my live target. I'll grab the last reeds now before the Mink or other builds consume them, then complete and build it. (Salmon Run and Vine Trellis I'll likely have to Invent away as dead weight unless vines reappear.)

**Then the *last* material-deck card flipped into the Headwaters — and it was Vines (5 icons).** That single refill revived my whole hand. This is a genuinely *fun* swing: a moment earlier my vine cards were dead, and now a 5-vine card at the Headwaters turns Salmon Run (6★) and Vine Trellis (vine engine) back on. It also crystallized a real plan — a **two-engine build**:
- **Vine engine:** Springwater (built) + Salmon Run + Vine Trellis, with Vine Trellis scoring **+2 per vine structure** (up to +6) and Vine Trellis's *stone* cost adding a 5th distinct material.
- **Reed engine:** Reed Bed + Reed Walkway + Cattail Patch, Reed Walkway scoring **+2 per reed structure** (up to +6).
- **Cattail Patch diversity** rising to ~5 VP once stones join my built materials.

And the timing is perfect: **the Mink is stuck at supply 0** while I hold the chair, so this is the "hold-for-the-windfall" window to convert the board's finite remaining materials into *my* tableau before it can react. **Vines (need 5) are the bottleneck**, so I secure them first.

### Turn 13 — Pull HW3 *Trailing Vine* (Vines), bid 5 (secure the vine engine)

**Rationale:** Grab all 5 Headwaters vines in one auction at the cheap 1🐟/item rate — they fuel both Vine Trellis (3) and Salmon Run (2). My auction → no Quick Strike last-look; even if the Mink recalls to jam (it'd cost me at most 1 vine), R2 still has a spare vine, so I get to 5 either way. fish→53; deeply buries me, but the Mink at supply 0 can't punish it, and I have ~66 fish of track before the 119 finish — plenty of room to cash this into a big tableau.

### Turns 14–18 — building the engines, and a recurring **jam tax**

This stretch was a series of acquisitions and builds, interleaved with the Mink's turns. Highlights and pain points:

- **Vine Trellis built (net 0 fish!):** building it fired its own "slide back 1🐟 when you build a vine structure," cancelling the 1-fish build cost. Jumped me to **VP 21**. Lovely tempo-neutral build. The Mink answered with **Floodgate (8★)** → its VP **22**, then later it was at **24**.
- **The jam tax (a real, repeated friction point):** Three separate times the AI Mink bid into *my* auctions on materials it also wanted, overbidding the card's small icon count and triggering mutual losses:
  - Reeds (2 icons): I bid 2, Mink 1 → I took **1 of 2** (paid for 2).
  - Logs (5 icons): I bid 4, Mink 2 → I took **3 of 4** (1 short of Salmon Run).
  - Logs (1 icon): I bid 1, Mink 1 → **both took 0**, each paying 3🐟 for nothing.
  - *Designer note:* on 1–2 icon cards there is **no safe bid** if the opponent contests — any mutual bid jams to a wipeout. As the board mines out and cards drift down to 1–2 open icons, this happens a lot. (To be precise: bids are sealed — the AI was *not* seeing my bid; it independently wanted the same material per its hand-need. See the corrected note in the wrap-up.) It's thematically fine ("you pay for every worker, win or lose"), but chasing single-icon cards felt like a fish-burning trap. A human would learn to just stop contesting tiny cards — but then materials strand. Mild but worth watching for feel.
- **Headwaters drain after the deck empties:** once the material deck ran out, the Headwaters slots emptied and **never refilled** — late-game I had only HW1 left (one Stones card), with everything else scattered down the river at 1–2 open icons. A clear, sensible endgame texture (materials are finite), but it sharply raises the jam problem above.

### Turn 19 — pivot to **Salt Lick (6★)** over Salmon Run

I drew **Salt Lick (Stones×3 Logs×2 Clay×1, 6★)**. This is a *better* target than Salmon Run right now: Salmon Run needs that jam-cursed 4th log, whereas Salt Lick uses **plentiful Headwaters stones** + 2 of my 3 banked logs + 1 clay (clay still has 6 on the board). And critically Salt Lick adds **clay as my 6th distinct material**, which lifts Cattail Patch to its top tier (**8 VP** for 6 distinct). So I abandon Salmon Run (the 4th log isn't worth the jams) and build toward Salt Lick. First action: pull HW1 and bid 3 stones (my auction → no Mink last-look).

**Supply squeeze + recall mechanic (worked well):** because I had 6 workers tied up on the board, I hit supply 0 mid-plan. The bid dialog's **pre-auction recall UI** is excellent here — it lists each card I can recall from, flags "Shoreline (no blank)" vs "River (drops a blank)," and auto-recalls the minimum needed to meet my bid. I used it deliberately: to fund a stone bid I recalled my **spare 3rd log** (a 0★ singleton — Salt Lick only needs 2 of my 3 logs) rather than break a scoring pair; to fund a clay bid I overrode the auto-recall (which grabbed a vine) and recalled my lone **reed** instead (a 0★ singleton, since Cattail Patch was already looking dead) to preserve my 1★ vine pair. Nice that the UI made the blank/no-blank and pair consequences legible enough to optimize.

**Salt Lick built (6★)** — its bonus let me **peek at the Mink's hand** (Streambank Hollow, Sap Drip, Granite Spire — so it's sitting on a stones card, Granite Spire). VP **27**. My tableau now spans **all six materials**, so Cattail Patch *would* score its max 8 — but see below.

### Turn 20 — both hand cards stranded; Invent to stay in the VP race

**Decision point.** VP is **me 27, Mink 28** — I'm behind by 1. The breakdown is telling: Mink's 28 is pure flat VP + 3 from *held-worker pairs* — **it has no end-game engine at all**. My 27 carries two scaling engines (Vine Trellis +4 for 2 vine structures, Reed Walkway +4 for 2 reed structures) that grow with *every* further vine/reed structure I build. But my hand is dead: **Cattail Patch needs 3 reeds and Salmon Run needs 4 logs, while the mined-out board has only 1 reed and 1 log left.** Clay (5) and stones (3) are still available, though. So the right move is to **Invent** — cycle the two dead cards into something I can actually build with clay/stones. Every extra structure is raw VP plus a possible engine bump, and at −1 I can't coast. (Salmon Run as a 6★ stings to pitch, but a 6★ I can never build is worth 0.)

**This is the most exciting moment of the game.** The Invent drew **Trophy Lodge** (Clay×3 Stones×2, 0★) — *"+3 VP per ?-VP structure you control, including itself (max +12)."* Checking the code's `VARIABLE_VP_CARDS` set, it includes **both Reed Walkway and Vine Trellis — which I already have built** — plus Trophy Lodge itself. So building Trophy Lodge scores **+3 × 3 = +9 VP**, and it only needs **clay + stones, both still on the board**. That single build flips me from −1 to a commanding lead. The strategy guide explicitly names the "Trophy Lodge meta-engine" — and here it landed perfectly on a tableau that had organically accumulated two ?-VP engine cards. A genuinely thrilling draw-into-engine payoff. I kept Trophy Lodge (+ my two dead high-ceiling cards) and now race to assemble its 3 clay + 2 stones before the finish.

### Turns 21–24 — assemble & build **Trophy Lodge (+9)**

Clay had drifted to River 2 (3🐟/item, no discount for me), so this was the priciest acquisition of the game (~10🐟 for 3 clay), but +9 VP justifies almost any fish cost with ~38 of track still to the 119 line. Got all 3 clay uncontested (Mink passed). Then the **stone war** began.

### Turns 25+ — the decisive **stone deadlock** (the game's sharpest tension)

I need 2 stones for Trophy Lodge and had grabbed 1 (by bidding 2 into the Mink's auction — the overbid math meant the Mink, forced to bid ≥1 as triggerer, *couldn't win any* against my 2, so I took 1 and it took 0). But then I checked **Granite Spire's cost: 6 stones — and the Mink already has 4** (from my hand-peek + its pair count). So the Mink needs *exactly* the 2 stones left on the board, and I need 1 of them. **Same two stones, both of us blocked without them.**

Reading the AI's `aiDecideBid`, the key fact: **the AI bids on a material only to the extent its *hand* needs it.** With Granite Spire (6 stones) in hand and 4 banked, the Mink values every remaining stone and will contest every stone auction. And the last 2 stones sit on **1-icon cards** — where, as established, *any* mutual bid jams to a mutual zero. So:

> **The stones are hard-deadlocked.** I can never claim my 2nd stone (Mink always contests → jam), and the Mink can never claim its 2 (I contest → jam). Trophy Lodge's +9 is, painfully, **unreachable** — and so is the Mink's 7★ Granite Spire.

This is a genuinely interesting (and slightly brutal) emergent situation, and a **design observation worth flagging**: when two big cards in opposite hands compete for the *same* tiny pool of a depleted material, the jam rule freezes both permanently — fish get burned for nothing and neither engine fires. It's logically consistent with the rules, but in a 2P endgame it can feel like a stalemate trap rather than a decision. (A human might house-rule or the designer might consider whether very-low-icon cards should resolve ties differently.)

**My plan out of it:** I can't out-tempo the deadlock, so (a) **jam the Mink's stone auctions** to make sure it never reaches 6 stones (denying the 7★ keeps it near 28), and (b) win on VP elsewhere — **Invent for a card I can build with my already-banked 3 clay + 2 vines** (e.g. a clay/vine structure), since those workers are otherwise stranded. First: jam this stone auction.

### Turns 26–30 — the plan executes perfectly (and a happy detail about the jam tax)

I let the Mink take one stone (saving fish) and then **jammed the last stone three times as the Mink chased it down the river (R3 → R4 → shoreline)**. Once it reached the shoreline it can never be auctioned again, so **Granite Spire is permanently denied** — the Mink is hard-capped at 5 stones forever. A surprising and *pleasing* side effect: every jam ties up the Mink's bid workers and shrinks its end-game **worker-pair** score, so the jam war actually **flipped the lead to me, 28–27**, before I'd even built anything new — burning the Mink's pairs was a real, if accidental, benefit of contesting.

Then I **Invented (drew 4) and found Clay Vault** (Clay×3 Vines×2) — buildable immediately with my banked 3 clay + 2 vines. Building it for 1 fish:
- It's a **clay engine** (+3 per clay structure: Salt Lick + Clay Vault = **+6**),
- It also **uses vines, so it counts as a 3rd vine structure** → Vine Trellis bumps to +6,
- And building a vine structure fired Vine Trellis's "slide back 1🐟," so it was again nearly free on tempo.
- **VP leapt from 28 → 34.** (Clay Vault's deck-peek offered a swap for Pack Rat Burrow, but with every material spent and the board empty, no further build is possible, so I kept my hand.)

**Position now: me VP 34 / fish 111, Mink VP 27 / fish 113.** I lead by 7 *and* I'm farther back on the track (so I'd also win the tiebreak). The Mink is hard-stuck — Granite Spire denied, and its other cards (Sap Drip, Streambank Hollow) need mud/logs the mined-out board no longer has; it's reduced to Inventing dead cards. The game is effectively won; what remains is to reach the 119 finish without giving the lead back.

### Turns 31+ — close out cleanly (deny the Mink's last live build)

Checking the Mink's hand (its Stone Pool peek-equivalent), it has one *live* card left: **Stone Pool (3 stones + 2 clay, 6★)** — it has the stones banked, and the only clay source is the R2 Clay/Mud wild (2 icons). If it built that, it'd hit ~33, one pair away from my 34 — too close. So I proactively **auctioned the Clay/Mud wild and took both clay myself**, which (a) permanently denies Stone Pool (no clay left → it can never reach 2) and (b) gives me another worker pair (+1★). With that, the win is mathematically locked — the Mink has no path to 35.

### Finish

The Mink grabbed the (harmless) last clay and **crossed the finish, retiring to space 121**. On my turn, with no build left to make, I **retired to space 119** (the lowest open finish spot — so I also take the tiebreak). Both players then skip the final-build coda (the Mink can't complete Stone Pool with only 1 clay; I have no card whose materials still exist).

**Final score: Beaver (me) 34 — Mink (AI) 27. I win by 7.** Final positions: me at fish 119, Mink at 121.

**Final VP breakdown:**

| | Beaver (me) | Mink (AI) |
|---|---|---|
| Base (printed ★ on built) | 18 | 25 |
| Vine Trellis (+2 / vine structure × 3) | **+6** | — |
| Reed Walkway (+2 / reed structure × 2) | **+4** | — |
| Clay Vault (+3 / clay structure × 2) | **+6** | — |
| Worker pairs | 0 | +2 |
| **Total** | **34** | **27** |

The whole game is in that table: **the Mink out-scored me 25–18 on printed structure VP, but it built zero scaling engines** — its points were flat cards plus a couple of held-worker pairs. I built **three end-game engines** (Vine Trellis, Reed Walkway, Clay Vault) worth **+16 together**, and every later build fed two or three of them at once. That's exactly the lesson the strategy guide preaches ("aim at the big variable-VP scorers; specialize *or* diversify and feed it all game"), and it held up.

---

## Overall impressions & feedback

**It's a genuinely good game.** The core loop — fish-as-tempo, price-as-position, sealed pay-for-every-worker auctions, and convert-materials-into-scaling-engines — created a continuous stream of real decisions. I never had a "durdle" turn; every action traded tempo for position or VP, and the "farthest-back keeps the chair" rule made even small bids meaningful. The arc (cheap reed start → Log Flume tempo engine → vine engine → a clay engine drawn into existence late → a knife-fight over the last two stones) felt like a complete story.

### What I did that felt clever / fun

- **"Free" pickups that don't cost the chair.** Early on, sitting 2 fish below the Mink, bidding **1** on a card moved me up only 1 — still below the Mink — so I banked a flexible wild worker at the cheap Headwaters rate *without surrendering my "act next" position*. Recognizing when a bid is tempo-free is a satisfying lever.
- **Placing the free worker on the most expensive material.** Reed Walkway's free worker is "worth more" on a 2🐟/item vine than on a 1🐟/item (discounted) reed — the same free action saves more fish on the dearer material. A nice little optimization the game rewards.
- **Net-zero-fish builds.** Building Vine Trellis fired its own "slide back 1🐟 on a vine build," cancelling the 1-fish build cost. Chaining "free" builds via Log Flume + slide-back effects felt great.
- **Drawing into an engine.** Inventing into **Trophy Lodge** when I already had two ?-VP structures built (a +9 swing) was the highlight — the deck handed me exactly the meta-scorer my tableau was set up for. (It got deadlocked on stones, but the *feeling* of the draw was the high point.)
- **Winning the stone war by accident-on-purpose.** Jamming the Mink's stone auctions to deny Granite Spire *also* burned its worker-pair score, which is what actually flipped the lead before I'd built anything new. Contesting had a hidden second payoff.
- **One build feeding multiple engines.** Clay Vault counted for the clay engine *and* as a vine structure for Vine Trellis simultaneously — the moment the engines start overlapping, single builds pay 8+ VP and it's very satisfying.

### Things that were confusing or rough (mostly NOT in the rulebook)

- **The jam deadlock on depleted, low-icon cards is the one real "feel" problem.** Late game, almost every card is down to 1–2 open icons, where *any* contested bid jams to a mutual zero. Because Granite Spire (6 stones) and my Trophy Lodge (2 stones) needed the *same* last 2 stones, the two cards **hard-locked each other out permanently** — fish burned for nothing, neither engine fired, and the only "play" was to keep jamming until a card drifted to the shoreline and was lost. It's rules-consistent, but in a 2P endgame it reads as a stalemate trap rather than a decision. Worth considering whether very-low-icon cards (1 icon especially) should resolve ties differently, or whether the triggerer's forced min-bid-of-1 should still apply once a card has a single icon left. *This is the thing I'd most flag for design attention.*
- **The AI contests scarce materials even on tiny cards where any bid jams — but bids are sealed; the AI does *not* see mine.** (Correcting a sloppy first characterization of my own.) Checking `runAuction`: all bids are collected **sealed and simultaneous** — the non-deferred AI computes its bid in `aiDecideBid` purely from *its own hand's material deficit*, with no access to my bid, and I bid blind to its bid. The only last-look in the game is **Spy Mound** (once-per-game) and **Quick Strike**, and the code gates Quick Strike to `p.idx === triggerPlayerIdx` — it fires **only on auctions the Mink itself triggered** (logged as "Quick Strike: Mink bids X after seeing reveals" exactly when it did). So the jams on *my* auctions were **not** peeking — they were two players independently wanting the same scarce material on a card down to 1–2 icons, where any contest overbids to a mutual zero. That's legitimate sealed-bid behavior. The narrower *feel* issue: `aiDecideBid` still bids to its hand-need on a near-empty card with no model of "on a 1-icon card a contesting bid just torches both of us." A human learns to stop fighting over dregs; the AI doesn't, which makes the depleted-board endgame grindier than it needs to be. (Cheap fix: don't let the AI contest a card whose open icons are so few it can't actually *win* a worker after the overbid.)
- **Same-material hand cards cannibalize each other.** Holding Reed Bed (3 reeds) *and* Reed Walkway (4 reeds) early, building either left me unable to afford the other without re-buying a whole material — so Reed Walkway's "+2 per reed structure" was quietly hard to realize from the very reed-heavy hand that wants it. Not confusing exactly, but a subtle trap; the payoff cards for a material are hardest to fuel precisely when you've committed to that material. (This may be intended tension — but it surprised me.)
- **Materials are genuinely finite, and the game doesn't telegraph it.** Once the 12-card 2P material deck empties, the Headwaters slots empty permanently and the board slowly mines out. I only realized mid-game how much this gates which hand cards are even *buildable* — several 6★/10★ cards (Salmon Run, Royal Lodge) became dead weight because their materials (logs, vines) simply no longer existed. A first-time player could easily hoard a fat hand of unbuildable cards without realizing the materials are gone. A small UI cue ("3 material cards left in deck" is shown, which helped) is good; maybe make "no copies of material X remain on the board" more legible, since it determines buildability.
- **Minor / digital-only:** the physical "+60 lap-flip" chit mechanic doesn't surface in the web version (it just uses a raw rising fish count to 119), so the rulebook's "flip your chit past 0, then reach space 59" framing didn't map to anything on screen. Fine for the prototype, but a physical player cross-referencing the rules might pause.

### UI / UX that worked well (no changes needed)

- **Auction-result panels** clearly explained every plenty/jam/outbid outcome with the exact math ("Total bid 4 ≤ 7 open icons, so every bidder took exactly what they bid").
- **The bid dialog shows the correct per-item rate for *me*** (e.g. reeds at 1🐟/item with Reed Bed's discount while the opponent paid 2🐟/item) right at the point of decision.
- **The pre-auction recall UI** is excellent — it flags "Shoreline (no blank)" vs "River (drops a blank)," shows the running supply/fish deltas, and auto-recalls the minimum needed, so I could deliberately recall a 0★ singleton to preserve a scoring pair.
- **The stacking/tie rule** ("still on top of the lowest space — takes another turn") is logged every time and behaved exactly as the rulebook describes.
- **Salt Lick's hand-peek** and **Clay Vault's deck-peek** were pleasant information rewards that surfaced cleanly.

### Strategic takeaways (for the strategy guide / future play)

1. **Engines win; flat VP loses.** The AI built more printed VP and still lost by 7 because it had no scaling cards. The +2/+3-per-structure engines are the real score.
2. **Overlap your engines.** Building cards that satisfy *two* engines at once (Clay Vault = clay engine + vine structure) is where the game breaks open.
3. **Tempo discipline matters but isn't everything.** I over-extended on fish (was 30+ ahead of the AI on the track at times) and it didn't cost me, because the AI couldn't convert its tempo into VP. Against a human who *could*, my fish profligacy would have been punished — the guide's "spend tempo like a miser" warning is real.
4. **Watch the material clock.** Commit to materials that are *still in the deck/board*; a 10★ card you can never fuel is worth 0. Drafting/keeping cards should be filtered by "do the materials still exist?"

