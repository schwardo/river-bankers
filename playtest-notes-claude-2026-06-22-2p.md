# River Bankers — Playtest Notes (Claude)

**Date:** 2026-06-22
**Config:** 2 players · asymmetric (species starters ON) · double-card auctions OFF
**Me:** Mink (clay specialist) · **Opponent:** Beaver AI (logs)
**Played via:** the browser prototype at `games/river-bankers/web/index.html`, driven through CDP/Playwright. I read the rulebook + strategy guide first.

I'm logging my reasoning before each action, what actually happened, and flagging anything confusing (vs. the rulebook) or anything that felt clever/fun.

---

## Pre-game plan

I chose **Mink** deliberately to stress-test the strategy guide's central thesis: clay is "least contested, pays the most." The guide says to commit to a material early and feed its engine. So my plan:

- Draft **Clay Den** (the ★ bias starter): clay icons cost 2 less fish/item (min 1). It's 0 VP itself, but the guide is explicit — draft bias cards for the engine, not points. The −2 is the single biggest discount in the game on the cheapest-to-win, highest-paying material.
- Hunt for **Clay Vault** (the clay engine: +3 VP per built clay structure of mine at end, max +12) and other clay/mud structures (Charcoal Pit, Floodgate, Trophy Lodge, Hidden Cache).
- Spend tempo like a miser: prefer cheap single-worker grabs that keep the chair; let logs/stones (which the Beaver wants) drift dear.
- Watch the 2P-only material effects: **Driftwood Tangle** (wild logs/reeds) and **Mud Slick** (wild mud/clay) are the only effect cards in a 2P deck. Mud Slick is interesting for me — its workers can count as clay.

Tiebreaker is *lower* final fish, so I also want to finish lean.

---

## Turn-by-turn

### Draft — took Clay Den
As planned. The draft modal showed all three Mink starters as cards (Clay Den / Quick Strike / Snare Set). Clean. Committed to clay.

**UX note:** The starter cards in the draft modal render as images with no text fallback — fine visually, but a screen-reader / quick-scan would get nothing. Minor.

### Beaver opens (AI, first player)
Beaver spent **4🐟 to pull Headwaters-3 Stones** and ran the auction. Paying the *most expensive* pull slot (4) on turn 1 for a staple is aggressive/greedy — exactly the "big haul buries you" pattern. It immediately put Beaver at 4🐟 while I was at 0.

### My bid on Beaver's Stones auction → bid 2
**Reasoning:** Beaver was at 4🐟, I was at 0. Any bid ≤3 leaves me farthest-back, so I keep the chair *and* get cheap stones. Stones at the 1🐟/item Headwaters rate is the cheapest they'll ever be, and my best card Spy Mound (6vp) needs 4 stones + 1 clay. I bid a modest 2 to avoid a big jam over a staple Beaver clearly wanted.
**Result:** Beaver bid 4, I bid 2 → jam (total 6 > 5). I took **1 stone**, Beaver took 3. Card drifted to River 1. **Mud Slick (wild Clay/Mud, 7 icons)** refilled HW3 — a clay source for my engine.
**Clever/fun:** The "keep the chair regardless of bid size, so bid up to the gap" calculation is a satisfying bit of tempo math the auction creates.
**UX praise:** The jam-result panel explains the math clearly — "took max(0, 5 − others' bids), capped at your own bid" — arguably *clearer* than the rulebook's "bid minus overbid" phrasing.

### My turn 1 → Pull Reeds (HW1), bid 4
**Reasoning:** Big tempo lead (8 vs me 2 after the auction). My fastest available build is **Cattail Marsh** (reeds4+mud2, 5vp) — reeds were cheap & uncontested at HW1 (Beaver wants logs), and pulling HW1 also walks Mud Slick down to a cheaper pull slot. Bid 4 to grab all the reeds in one auction (one pull's overhead). Pull(2)+bid(4)=6 fish → from 2 to 8 (tie with Beaver, acceptable).
**Result:** Beaver *contested reeds* (bid 3!) → jam, I got **2 reeds** (not 4), Beaver got 1 and is now buried at **11🐟**. I'm at 8 → I keep the chair. Mud Slick shifted HW3→HW2 (pull 3 now); a fresh Mud card (Silt Bank) entered HW3.

**Observation (genuine strategy tension worth flagging):** My opening *structure hand* (Cattail Marsh = reed/mud, Spy Mound = stone/clay, Pontoon = log/reed) barely supports the clay commitment the species draft pushes you toward. Only 1 clay icon (Spy Mound) across my whole hand, and zero clay-*engine* cards. The strategy guide says "commit to your material early," but the random structure hand can actively fight your species pick. This is a real, interesting decision-pressure — but a new player who dutifully drafts Clay Den and then can't find clay structures may feel stranded. Noting as design tension, not necessarily a bug.

**Observation:** The Beaver AI is contesting *staples it shouldn't necessarily want* (stones AND reeds), spending itself to 11🐟 for a few workers. Either it has matching structures in hand, or the AI over-values contesting. Its aggression is handing me the chair.

### My turn 2 → Invent (N=2)
**Reasoning:** Still had the chair (10 vs 11). My *hand* was the bottleneck — no clay engine — so I spent a cheap 2🐟 to dig. Drew **Cattail Patch** (0vp diversity scorer) and **Tribute Stone** (clay2+stones2, 5vp, once/game force-opponent-recall). Kept Cattail Marsh / Spy Mound / Tribute Stone; discarded **Pontoon** (off-lane logs) and **Cattail Patch** (diversity conflicts with my specialize-on-clay plan — the guide's "specialize *or* diversify, not both").
**Emerging synergy (fun):** Spy Mound (stones4+clay1) and Tribute Stone (clay2+stones2) both draw on a shared **stone+clay** pool, and Clay Den discounts all the clay. A coherent stone/clay direction fell out of the draw.
**UX note:** The Invent keep/discard screen (click cards to *keep*, must select exactly your hand size) was clear. Good that it shows "selected: X/3".

### My turn 3 → Pull Mud Slick (HW2), bid 3 (wild clay/mud)
**Reasoning:** Lead down to 1🐟 (10 vs 11) — last chair-turn for a while, so make it efficient. Mud Slick's workers are wild (clay OR mud at build), so 3 of them cover my entire clay requirement (Tribute Stone 2 + Spy Mound 1) *or* flex to Cattail Marsh's mud. Amortize the 3🐟 pull into one decent grab.
**Result:** Beaver again matched at 3 (total 6 ≤ 7 icons, no jam). I banked **3 wild clay/mud**. Beaver is now down to **supply 1**. Mud Slick drifted to River 1.

### Beaver's turn → auctions the last Mud Slick icon (River 1)
Beaver spent 1🐟 to re-auction Mud Slick (now 1 icon at River 1). **My bid: 0** — I already hold 3 wild; contesting a single icon just risks a mutual jam where we both pay and both whiff. Beaver took it (→ supply **0**, all workers committed), card graduated to shoreline with my 3 wild workers safely on it.
**UX praise (subtle, good):** the bid panel showed that River-1 clay card as "**1🐟 per item**" *to me* — it bakes in my Clay Den −2 discount (River1 base 2 → 0 → min 1). Showing each player their *own* effective rate is correct and helpful, though worth being aware it means the same card displays different rates to different species.

**Position check:** Me 16🐟, 2 built-eq (Clay Den 0vp) — wait, only Clay Den (0vp) built so far. Beaver 17🐟, Lodge Foundation (1vp). Nobody has converted materials to a real structure yet ~8 actions in. I hold 1 stone + 2 reeds + 3 wild(clay/mud); Beaver holds 3 stones + 1 reed + 4 wild. **The staples (stones, reeds) are jamming constantly because Beaver contests every one** — this is slowing both of us down and is the dominant friction of the game so far.

### My turn 4 → Auction River-1 Stones (the last stone) → then BUILD Tribute Stone
**Reasoning:** Tribute Stone was 1 stone short. The lone River-1 stone went **uncontested** (Beaver bid 0 — it was at supply 0). Won it for 3🐟. Next turn I built **Tribute Stone (5★)**.
**Result / UX:** The build auto-assigned my **wild Mud Slick workers as clay** (2 of 3) + 2 stones, with no extra prompt — it correctly picked the only assignment that satisfies clay2. Smooth. Building recovered 4 workers (supply 1→5), which also fixed my supply crunch — nice that a build doubles as a supply reset.
**Score now: Me 5★ (Tribute Stone) + Clay Den(0) vs Beaver 1★ (Lodge Foundation).** I'm ahead on points and roughly even on the track (22 vs 21).
**Replacement draw:** Salmon Run (logs4+vines2, 6vp) — off-lane (logs are Beaver's, vines a trap). Flagged to Invent away.

### Strategy insight — Clay Den's discount is hard to realize in 2P (possible design note)
A material-bias discount (−2 clay) pays off most when your signature material is *expensive*, i.e. has drifted to River 2–4 (3–5🐟/item). But clay is the *least contested* material — so **I keep claiming it cheaply at the Headwaters (1🐟/item), where the −2 floors to min-1 and saves me nothing.** The very thing that makes clay good (no competition) prevents the Clay Den discount from ever biting. In this game my clay all came at Headwaters rate, so Clay Den has effectively been a 0-VP card doing nothing. This is a genuine tension between the "clay is uncontested/cheap" strategy-guide advice and the "take Clay Den for the discount" advice — in 2P they may undercut each other. Worth checking whether Clay Den feels worthwhile to playtesters, or whether clay drifts downstream often enough at higher player counts to matter.

### ⚠️ FINDING — Cattail Marsh's effect does NOT apply to its own build (rulebook vs. implementation mismatch)
While planning a Cattail Marsh build I expected my 2 reed workers to satisfy its reeds-4 cost, because:
- Cattail Marsh effect: *"When you build: each Reed worker counts as 2 reeds."*
- The **rulebook's "Effect timing" page** lists Cattail Marsh under **"When you build [X] — … the triggering build itself qualifies."**

But in code, `effectiveBuildCost()` halves the reed cost only when `hasEffect(p, 'Cattail Marsh')` is true, and `hasEffect` checks `p.built` (already-built structures). When you build Cattail Marsh *itself*, it isn't in `p.built` yet, so the doubling does **not** apply to its own build — you need the full 4 reeds. (Confirmed earlier: the UI did not green-light Cattail Marsh when I held 2 reeds + 3 wild, even though 2 reeds ×2 + 2 wild-as-mud would cover reeds4+mud2.)

This is a clear discrepancy: either the rulebook shouldn't list Cattail Marsh as self-qualifying, or the build-cost code should treat the just-built card's own "when you build" effect as active for its own build. Likely **systemic** — worth checking the whole "triggering build itself qualifies" set (Charcoal Pit, Log Flume, the material walkways/ladders, Treaty Stone) for the same self-application gap. (For pure scoring/bonus effects it may be moot, but for cost-modifying ones like Cattail Marsh / Charcoal Pit / Log Flume it changes what's buildable.)

### My turns 5–6 → Pull Mud (HW2) then Pull Reeds (HW2), both bid 2, both uncontested
**Reasoning:** River was empty; I needed mud×1-more and reeds×2 for Cattail Marsh. Pulled mud first (also walks the Reeds card to a cheaper pull slot), then reeds. Both went **uncontested** (Beaver stuck at supply 0, bidding 0). 7-icon cards have so much capacity that jams basically can't happen — a calmer, more efficient phase than the early staple knife-fights.
**Now hold reeds4 + mud2 + 1 wild → Cattail Marsh is buildable.** A fresh **7-icon Stones card** also surfaced in Headwaters, opening the path to Spy Mound (stones4).

### Beaver catches up → builds Flush Channel (6★)
Beaver recovered to supply 4 and built **Flush Channel (6★)** (spending a wild as mud), taking the VP lead **7 vs my 5**. Its Flush Channel effect also discarded a Headwaters Vines card (board manipulation). The AI's pattern: over-contest staples early → strand itself at supply 0 → Invent repeatedly → finally build a big card and snap back. Streaky but it works.
**My response to its Mud auction: bid 0** — my mud workers stay mine wherever the card drifts (Build picks them up from any slot), and my supply was 1. No reason to defend.

**Tempo/feel note:** With the river able to hold many cards on one space and 7-icon cards common, mid-game auctions stop jamming and become cheap uncontested grabs. The *tension* of the game lives almost entirely in (a) the early staple fights and (b) tempo/turn-order, not in mid-game material scarcity. Once both players have a material niche, you mostly just take what you want at Headwaters rate.

### My turns 7–9 → build Cattail Marsh (5★), grab 4 stones, build Spy Mound (6★)
Cattail Marsh and Spy Mound both went down cleanly. Stones for Spy Mound came uncontested from a fresh 7-icon card (Beaver was stuck at supply 0). 
**Score: Me 16★ (Tribute Stone 5 + Cattail Marsh 5 + Spy Mound 6) vs Beaver 7★ (Lodge Foundation 1 + Flush Channel 6).** Commanding 9-point lead by the midgame.
**Fun:** Building is a satisfying "windfall" — you sit on scattered workers for several turns, then one Build action snaps them all into a structure *and* refills your supply (8 workers back). The held-inventory-then-cash-in rhythm the strategy guide describes really does feel good in play.
**Two once/game tools now armed:** Spy Mound (decide my bid after Beaver reveals) and Tribute Stone (force Beaver to recall + slide back 3🐟). Saving both for a decisive endgame auction or to deny Beaver.

### Midgame read & plan
Deck is nearly dry (1 material card left), so the +1🐟/turn drift endgame is imminent. I'm at 45🐟, Beaver 46, both ~halfway to the 89 finish. Remaining hand: Salmon Run (logs4+vines2), Driftwood Snag (logs2+reeds2+mud1), **Treaty Stone (stones3+clay2, on-lane)**. Plan: build Treaty Stone next — it's reliable and its conversion effect (2-of-one → 1-of-other on future builds) would let me convert my plentiful stone/clay/mud into the **logs** I otherwise can't get, unlocking the two 6vp log cards. Then race the finish while ahead.

### Endgame opens (deck empty, +1🐟/turn drift)
Beaver woke up and built **Salt Lick (6★)** → 13 VP, peeking my hand via its effect. I answered by completing **Treaty Stone (3★)** → **19 VP vs 13**. Then Beaver dumped 9🐟 chasing logs (→69/70 on the track), handing me a big ~6-fish chair window at 64.

**Tiebreak comfort:** I'm both ahead on VP *and* behind on the track (64 vs 70), so even a VP tie I win on the lower-fish tiebreaker. Nice that the "spend tempo like a miser" discipline doubles as tiebreak insurance.

**UX friction (recurring):** Once Spy Mound is built, *every* auction I'm involved in pops a "Spy Mound — defer your bid? (once-per-game)" modal that I must dismiss (Use it / Skip). Over a game that's a lot of clicks for an ability I want to save for one key moment. Consider: only prompt when the auction is actually contested (≥1 opponent bid > 0 expected), or add a per-turn "not this time" default / a way to pre-arm it only when I choose. Same pattern would apply to any "react after reveal" ability.

### Plan: build Driftwood Snag (6★) with my tempo lead
Targeting logs2+reeds2+mud1. Pulling Mud first (covers my mud need *and* shifts the Headwaters Logs card to a cheaper pull slot). Treaty Stone's conversion (2-of-one→1-of-other per build) is now active as a backstop if I'm 1 log short. And the endgame free "final build" means staged materials convert to VP even if I cross the line first — so gathering is never wasted.

### Beaver's big swing → I answer with Driftwood Snag
While I gathered materials, Beaver took a long farthest-back streak and **chained Trading Post (5★) + Spring Cascade (3★)**, leaping to **21 VP and briefly passing me**. I completed **Driftwood Snag (6★)** to retake the lead **25–21**. 
**Design note (good tension):** the "farthest-back keeps acting" chair mechanic means a player who falls behind on the track gets a *burst* of consecutive turns — a natural catch-up valve. Beaver used it to chain two builds. It makes leads feel non-safe and kept this game competitive right to the end despite my long mid-game VP lead. That's a strength.

### ⚠️ POSSIBLE BUG — Driftwood Snag under-consumed workers
Driftwood Snag costs logs2 + reeds2 + mud1 (5 workers). I held exactly logs2 + reeds2 + mud1. After the build I was left holding **1 reed** — i.e. it consumed only logs2 + reeds1 + mud1 (4 workers), with **no conversion message in the log**. I have **Treaty Stone** built (effect: "once per build, cover 1 missing material by paying 2 of a surplus"). Its code only fires when a real deficit remains (`if (wbm[target] >= eff[target]) continue;`) — and I had no deficit, so it shouldn't have fired, yet a worker was saved. Either (a) Treaty Stone's deficit check has an edge case and it fired spuriously, or (b) the consume pass shaved a worker. Net effect here was harmless (left a singleton reed = 0 endgame VP), but it means a build can cost 1 fewer worker than it should — worth a dev check on the Treaty-Stone-active build path.

### Endgame crossing
Tied at 87🐟, 2 from the 89 finish — any action crosses me, and I have no materials for a fresh build. So I made the crossing productive: pulled Vines and bid 4 to bank **2 leftover pairs (+2 VP)** as a cushion (effective 27), accepting a higher finish since a VP tie was unlikely and the +2 protects against Beaver's strong-looking hand. Then I retire and Beaver finishes.

---

## RESULT — Mink (me) WINS 27–27 on the tiebreak

| | Mink (me) | Beaver (AI) |
|---|---|---|
| **Total** | **27★** | 27★ |
| Printed structure VP | 25★ | 27★ |
| Leftover-worker pairs | +2★ (4 vines → 2 pairs) | 0 |
| Final fish | **94🐟** | 95🐟 |
| Structures built | 6 | 6 |

**It came down to the tiebreaker.** Beaver tied my printed VP at 27 by building **Spillway (6★)** in its free coda build (after overshooting to 95🐟 to grab the mud for it). My **2 vine pairs** pulled me even on total VP (without them I lose 25–27), and my **lower fish total (94 < 95)** won the tie. The strategy guide's two endgame commandments — *"convert held materials, pairs score 1★"* and *"cross the line lean; the farther-back pawn wins ties"* — were **literally** the margin of victory. Very satisfying that the guide's advice paid off exactly.

My final builds: Clay Den(0) + Tribute Stone(5) + Cattail Marsh(5) + Spy Mound(6) + Treaty Stone(3) + Driftwood Snag(6) = 25 printed. Unused hand at the end: Salmon Run, Granary, **Trophy Lodge** (drew the clay meta-scorer too late to use — would have loved it earlier).

---

## Overall impressions

**The game works and is genuinely tense.** Even with a commanding mid-game VP lead (16–7), the catch-up-via-tempo (the farthest-back chair) let the AI chain builds and tie it at the wire. The win hinged on a 1-fish tiebreak. For a 2P auction/engine game in ~18 turns, that's a great competitive arc.

### What felt clever / fun
- **Tempo-as-currency is the star.** "Any bid ≤ the gap keeps the chair" creates constant, satisfying little optimization puzzles. Bidding cheap to keep chaining turns vs. one big haul is a real, ever-present decision.
- **Wild cards (Mud Slick) are a joy** — banking 3 wild clay/mud and assigning them at build time to whatever structure needs them felt flexible and smart.
- **Hold-then-cash builds** feel like a windfall, and a Build doubling as a supply-reset is elegant.
- **The chair as a catch-up valve** kept the game close and made my lead never feel safe — excellent tension design.
- **Pairs + lean-finish tiebreak** turned the last two turns into a real puzzle, and decided the game.

### Friction / confusion (not in the rulebook)
1. **Clay Den (and bias discounts generally) barely functions in 2P** — your signature material being *least contested* means you always claim it at Headwaters rate where the −2 floors to no savings. The discount needs the material to drift downstream, which it never does precisely because nobody contests it. Clay Den was effectively a 0-VP dead card all game. (Detailed above.) Worth verifying it earns its slot, at least at 2P.
2. **Spy Mound's "defer your bid?" modal fires on EVERY auction** until used — lots of dismissals for a once-per-game ability I wanted to save. Suggest only prompting on contested auctions, or a "don't ask unless I arm it" toggle.
3. **Beaver-AI over-contests staples early**, stranding itself at supply 0 repeatedly, then snaps back with Invent-then-big-build streaks. Beatable, but the streaky pattern (and paying the top Headwaters-3 slot on turn 1) suggests the AI under-values tempo early and over-values contesting.

### Suspected bugs (for dev follow-up)
- **Cattail Marsh's reed-doubling doesn't apply to its own build**, contradicting the rulebook's "the triggering build itself qualifies." Likely systemic across the whole self-qualifying class (Charcoal Pit, Log Flume, walkways/ladders, Treaty Stone). (Detailed above.)
- **Driftwood Snag under-consumed a worker** (left a singleton reed with no deficit and no logged conversion) on a Treaty-Stone-active build — a build cost 1 fewer worker than its printed cost. (Detailed above.)
- **`canBuild(...)` looseness:** Granary (reeds4+clay1) showed as buildable when I held only reeds1 + logs2 + mud1. The *real* green-border gating was correct elsewhere, so this may just be a stale/loose code path, but the Granary case slipped through to the build menu. Worth a look.

### Minor UX
- Starter-draft and Invent card buttons render as images with no text fallback (fine visually; bad for accessibility/quick scan).
- The per-item rate is correctly **personalized to the viewer's species discount** (clay showed "1🐟/item" to me at River 1) — good, but be aware the same card shows different rates to different players.
- The jam-result panel's explanation ("took max(0, icons − others' bids), capped at your bid") is clearer than the rulebook's "bid minus overbid" wording — consider aligning the rulebook to it.
- Sim clock reported ~161s/turn avg over 18 turns (that's my deliberation, not a game property).
