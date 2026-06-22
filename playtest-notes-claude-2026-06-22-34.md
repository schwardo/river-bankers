# River Bankers — Playtest Notes (Claude)

**Date:** 2026-06-22
**Config:** 4 players · asymmetric (species starters ON) · double-card auctions OFF
**Me:** Beaver (logs staple/tempo) · **Opponents:** River Otter AI (reeds), Muskrat AI (mud), Mink AI (clay)
**Played via:** the browser prototype at `games/river-bankers/web/index.html`, driven over CDP/Playwright. I read the rulebook + strategy guide first.

This is a turn-by-turn diary: my reasoning *before* each action, what actually happened, and flags for anything confusing (vs. the rulebook) or anything that felt clever/interesting/fun.

---

## Pre-game plan

I picked **Beaver** deliberately to stress-test two things prior Claude notes haven't: (1) the most-*contested* staple (logs) at the *largest* table (4P adds the 8-icon cards and a longer 119-fish race, so demand on staples should peak), and (2) the strategy guide's **"stay nimble"** branch — every prior note committed to a species bias material, so the flexible line is unexplored.

**The draft handed me a species/hand mismatch — and that's the interesting part.** As Beaver my color identity is *logs* (Lodge Foundation discount + tempo), but my opening hand has **zero logs structures**:
- **Spy Mound** (stones ×4 + clay ×1 → 6★, once/game: decide my bid *after* opponents reveal)
- **Tow Line** (mud ×4 + clay ×2 + vines ×1 → 8★, "as an action" slide a river card upstream)
- **Streambank Hollow** (mud ×3 + vines ×1 → 4★, recall-discount tempo)

Two of three are mud-heavy; none use logs. The guide is explicit about this fork:
> *"Take the bias starter [Lodge Foundation] when you want a standing discount you'll use all game... Commit early: a discount only pays off if you actually steer your builds toward that material."*
> *"Take a tactical card instead when your opening hand doesn't point at your bias material, or when you'd rather stay flexible."*

My hand does **not** point at logs. So I'm following the guide's situational rule and drafting **Beaver Cache** (the tactical/nimble pick) over Lodge Foundation (the bias card):
- +1 hand size → I draw a 4th card immediately and keep a wider hand all game = more dig power to *find* a lane.
- "Draw a structure card when you build" → sustains card flow as I convert materials into structures.
- Built free turn 1, worth 1★.

**The trade-off I'm accepting:** I give up Beaver's signature logs discount entirely (the other two starters are removed from the game). So I'm effectively playing a *generic flexible* game with a bigger hand, not a logs engine. The plan: buy whatever material is *uncontested and cheap* (the guide's core lesson — price is position + demand, not icon count), lean on the mud-heavy hand I already hold (mud is Muskrat's bias, so I'll be contesting the Muskrat AI for it — watch that), and use the extra card flow to pivot toward a real engine (a material walkway/ladder ?-VP scorer) if one shows up. Spend tempo like a miser to keep the chair; finish lean for the tiebreaker (lower final fish wins).

**Table read:** Otter=reeds, Muskrat=mud, Mink=clay biases. My hand wants mud (contested by Muskrat) + clay (contested by Mink) + stones/vines (uncontested — no species discount). So **stones and vines are my safe bargains**; mud and clay I'll have to win or let drift. Logs (my own color, now un-discounted) is the most contested by raw demand.

---

## Turn-by-turn

### Draft — took Beaver Cache (the nimble branch)
As planned. Hand topped up to 4 — drew **Reed Bed** (reeds3/mud1), deepening the mud/reed lean. Stack order came out **Muskrat → Beaver → Otter → Mink**, so Muskrat took the very first turn and immediately spent 3🐟 to auction a 4-icon Clay.

### Turn 1 (bid only) — bid 0 on Muskrat's clay, and the tempo lesson that decided it
Muskrat (mud bias) opened by auctioning **clay** — not its own material. I was asked to bid. The decisive logic: every player except Muskrat (now at 3) sat at timePos 0. **Any positive bid would have advanced my pawn and ceded the chair** — Otter/Mink at 0 would act before me. Bidding 0 kept me lowest *and* top-of-stack → I act next. So the pay-for-bid rule makes even a "make them pay" token bid genuinely costly in *tempo*, not just fish. Bid 0.

> **Clever/interesting:** This is a real, non-obvious strategic principle the rulebook implies but doesn't spell out: on an opponent's early auction, **bidding 0 is how you keep your turn-order priority** — positive bids cede the chair to the 0-bidders. Worth a tutorial callout.

**Result — a 3-way jam, and a surprise:** Beaver 0, Otter 1, Muskrat 4, Mink 2 (total 7 vs 4 icons, overbid 3). **Muskrat — the *mud* player — won the clay** (took 1 for 4🐟). The **Mink (clay specialist, −2 discount) bid only 2 and got jammed to zero.** The clay specialist losing the clay fight to the mud player on turn 1 was a striking AI outcome.

### Turn 2 — Invent N=2 (the drought begins)
Back in the chair. The board offered only **clay** (I need just 3 total) and the big **8-icon logs card** (my hand uses *zero* logs). Crucially, *every* card in my hand needed mud/stones/reeds/vines — **none on the board** — so nothing was buildable, and buying clay would strand workers I couldn't convert for many turns. Rather than a wasteful clay grab I Invented N=2 to hunt a near-pure **logs** structure (to weaponize that uncontested 8-icon logs card and give my Beaver color a purpose). Whiffed — drew Cache Burrow (mud2/reeds2) and Granary (reeds4/clay1), both reinforcing a mud/reed identity. Kept the two big scorers (Spy Mound, Tow Line) + the cheap engine cards (Reed Bed, Cache Burrow); discarded the redundant Streambank Hollow + Granary.

> **Confusing-vs-rulebook (resolved):** the Invent N input correctly clamps to a **floor of 2** (rulebook: "N from 2–5"), so the cheapest non-river action is 2🐟, not 1.

### Turn 3 (bid) — bid 0 on Otter's 8-icon logs
Otter pulled the **8-icon Old Growth (logs)** — the very card I'd hoped to pivot onto, now gone before I had a logs structure. My hand needs zero logs, so winning would strand workers. Tied-lowest and top-of-stack → bid 0 kept the chair. Otter 3 + Mink 2 split it cleanly (no jam — *logs only drew 2 bidders*).

### Turn 4 — the probe pull that detonated a 4-way jam (most interesting moment so far)
Board still only clay/logs/vines vs my mud/reeds/stones hand. Instead of a 5🐟 Flush, I did a **cheap single Headwaters pull** (HW1, 2🐟) and bid just **1** — a probe meant to net one needed clay, strand only one worker, and *cycle a fresh card into HW3* to hunt my missing materials.

**Result: a total 4-way wipe.** Beaver 1, Otter 3, Muskrat 3, Mink 4 (total 11 vs 7 icons, overbid 4). Since even the top bid (Mink's 4) equalled the overbid, **everyone took zero.** I paid 1🐟; the AIs paid 3+3+4 = 10🐟. In tempo terms my probe cost rivals **10× what it cost me** — and it did its real job: it **surfaced stones (Cairn) into Headwaters** and revealed that the "clay" card was actually **Mud Slick**, the mud/clay *wildcard*, now in the river.

> **Confusing-vs-rulebook flag (UX):** my board readout showed Mud Slick's material as plain `clay`; only the log revealed it's a dual mud/clay *wildcard* (`wildAlt: mud`). A player scanning the river sees a "clay" card with no glance-level cue that it yields mud-or-clay. Wildcards read as a single material until you hover/inspect.

### Turn 5 — the staple shoving-match lesson lands hard (2nd 4-way jam)
The board finally had stones (Cairn, 4 icons = exactly Spy Mound's need). I committed to **Spy Mound** (6★ + a once/game "decide my bid after others reveal" ability that's gold in a jam-heavy game) and, *assuming stones was uncontested* (no species has a stone discount), pulled Cairn (HW3, 4🐟) and bid 4 for a clean haul.

**Wrong read — another total wipe.** All three AIs piled in (Otter 4, Muskrat 2, Mink 3) → total 13 vs 4 icons, overbid 9, **everyone took zero.** I burned 4🐟 for nothing and lost my chair lead. **Key finding:** these AIs bid aggressively on *every* staple regardless of having any discount/use — stones, with no species bias at all, still drew a 3-way pile-on. The strategy guide's "don't get into a four-worker shoving match over staples" is exactly right, but here the *AIs* create that shoving match unprompted on essentially every card.

### Turns 6–8 (bids) — watching the AIs hemorrhage fish
Three more AI-triggered auctions (clay, stones, stones); I bid 0 on each to rebuild my chair. Two more **total 4-way jams** (e.g. Otter paid 8🐟 for zero stones). The AIs rocketed up the track — Muskrat to 24, Otter to 22, Mink to 18 — while I sat at **13**, a 5–11 fish chair lead, purely from *not spending* while they jammed themselves silly. **The Beaver tempo dream, achieved by patience rather than cheap builds.**

> **The central finding, crystallized:** In a jam, **your take = `icons − (sum of others' bids)`.** With three AIs each bidding ~3–4, the combined opposing bid (~9–11) *exceeds every card's icon count* (max 8). So **no material can be claimed through a normal auction** — the material economy seizes up. After 25–44 fish spent each, *every* player still had only their free starter built. Nobody could assemble a single real structure.

### Turns 9–11 — Invent ×2, mapping the contention & the dead-card problem
With the cushion I Invented twice (N=2, N=3) to escape my hand's mismatch. Findings:
- **Reed Bed and Cache Burrow are dead cards** — *reeds never appeared once* all game (and it's Otter-contested anyway).
- Contention ranking from the data: **stones ≈ clay (3-way jams) > logs (2 bidders, no jam) > vines (0 AI bidders).**
- Drew Spillway (logs4/mud2), Trophy Lodge (0★), Trading Post, Springwater Pool (vines3/mud2 — a vine card!), Hidden Cache. **The pattern is ironclad: nearly every structure needs ≥2 of a contested material**, so it's jam-locked. I kept the cards bottlenecked on the *smallest* contested amount: **Spillway** and **Springwater Pool** both need only **mud2** on top of a claimable material, plus Spy Mound (jam-breaker ability) and Tow Line (8★ ceiling).

### Turn 12 — claimed vines3 (first real material; hypothesis confirmed)
Auctioned the long-untouched **7-icon vine card** and bid 3. **Beaver 3, Otter 2, Muskrat 0, Mink 0 → total 5 ≤ 7, no jam.** I won **vines3** (Otter took 2 — Otter alone among the AIs values vines, but two bidders don't jam). Confirmed: **vines is the one claimable material**, and I now have Springwater Pool's vine cost staged. The remaining bottleneck is **mud2** — and mud (Muskrat's bias, available only on the jam-magnet Mud Slick wildcard) is the hard part.

### Turns 13–18 — the jam-lock breaks: the *tapped-out window* (the game's self-correction)
Fast-forwarding through AI churn, I hit the discovery that flips the whole game: **the AIs had crashed their worker supplies to 0–2.** Every fish they'd spent jamming had *also* placed workers on cards they clinched a sliver of — and a worker on a card is out of supply until you build. So after ~15 turns of universal jamming, the three AIs were **tapped out and could no longer contest auctions.**

That is the antidote to the jam-lock. With opponents at supply 0, `take = icons − others ≈ icons − 0`, so I could finally claim materials. I rode the window hard:
- **Mud Slick (wildcard)** at R2 — bid 2, claimed **mud2** (Mink even recalled a worker to bid; no jam). → completed **Springwater Pool** (vines3 + mud2). **My first real structure — built. +5★.**
- **Old Growth (logs)** — bid 3, *completely uncontested* (everyone 0). Claimed logs3.
- **HW3 mud (7-icon, cheap)** — bid 4, claimed **mud4** → toward Tow Line.
- Recalled my dead logs workers to fund **clay2** (HW1, uncontested) and **vines1** (had to use the *8-icon* HW vine card — a 1-icon vine card had jammed when Mink recalled to contest it; **big cards are jam-proof on small bids**). → completed **Tow Line. +8★.**

> **The central design insight of the game:** the jam-lock is **self-correcting**. Aggressive bidding drains the bidders' worker supply (winners' workers sit on cards), and once supply runs dry the auctions open up. A patient player who hoards workers (bids 0, stays cheap) is perfectly positioned to sweep the board exactly when everyone else is tapped. This rewards the strategy guide's "spend tempo like a miser" to an almost decisive degree — I won **every** material I went for during the window, cheaply and mostly uncontested.

### Turns 19–24 — converting the lead: Granite Spire & the Spy Mound clutch
With the AIs cycling between tapped-out and partial rebuilds, I kept building:
- **Spy Mound** (stones4 + clay1, **+6★**) — claimed stones4 (Mink contested with a 1-bid, costing me 1 of 5) + clay1 from Mud Slick.
- **Granite Spire** (pure stones6, **+7★**) — and here my **built Spy Mound's once/game "decide your bid after others reveal" ability fired automatically** when I triggered the auction. I deferred, saw the revealed bids (Otter 0, Muskrat 0, Mink **1**), and bid **exactly 6** → total 7 = icons, *no jam*, clinched all 6 stones with zero waste.

> **Clever/fun — and a UX note:** Spy Mound's ability is the *perfect* counter to this jam-happy table — perfect information turns a coin-flip auction into a precise claim. **Confusing-vs-rulebook (minor):** the ability prompts via a modal *automatically* the first time you trigger/enter an auction after building it. Driving via script I briefly thought the auction had hung (phase stuck at `auction-bidding`, no bid context) — it was actually waiting on the "🕵 Spy Mound — defer your bid?" modal. A human would see the modal, but the "auction silently waits on a second prompt" flow is easy to miss.

### Turns 25–final — Cattail Patch, the empty deck, and the finish
- **Cattail Patch** (reeds3 + mud2, ?-VP) — reeds finally flowed late; claimed both cheaply (AIs still tapped). Built it as my **6th** structure.
- Drew **Wood Pile** (logs4) at the very end — the pure-logs card I'd hunted for 20 turns — but **logs had completely dried off the board** by then. Cruel irony; it sat dead in my hand. (Spillway and Stone Causeway also died on the vanished logs supply.)
- With the material deck empty, the **+1 end-of-turn drift** rushed everyone to the 119 line together (all bunched at 117–118). I crossed first via a throwaway Invent, retired at 119 (the lowest finish — I'd win ties too), and the endgame resolved: nobody had materials staged for a final build.

## Final result — **Beaver (me) wins, 35★ to 30★**

| Player | Final ★ | Base | End-game bonuses | Structures | Finish fish |
|---|---|---|---|---|---|
| **🦫 Beaver (me)** | **35** | 27 | Cattail Patch **+8** | 6 | 119 (back-most) |
| 🦡 Mink | 30 | 24 | Vine Trellis +4, pairs +2 | **7** | 122 |
| 🦦 River Otter | 7 | 5 | pairs +2 | 2 | 121 |
| 🐭 Muskrat | 3 | 0 | pairs +3 | **1** | 120 |

Closer than the midgame suggested — Mink's late flurry (Snag Pile, Salmon Run) nearly caught me. **My nimble Beaver-Cache draft was quietly correct:** the +1 hand size and the card-flow let me keep cycling toward whatever the hostile board would let me build, instead of being stranded committed to a logs engine I could never feed.

---

## Findings & design feedback

**1. The jam-lock and its self-correction — the headline.** With three aggressive AIs, *every* contested-staple auction (clay/stones/logs/mud) became a 4-way total jam where `take = icons − others' bids` went ≤ 0 for everyone. For ~15 turns **the entire material economy seized — nobody could build anything beyond their free starter.** This *resolves itself* because jamming drains worker supply (winners' slivers sit on cards), and once the AIs tap out, auctions open up. The lock is real and self-correcting — but the **dead midgame is a genuine pacing risk**: a stretch where no one can act on their plan. A new player who doesn't understand *why* nothing is claimable (and that patience is the answer) could find it baffling and un-fun. Worth a tutorial/strategy line: *"If everything is jamming, stop bidding and wait — your rivals are spending the workers they need to compete."*

**2. The AI bids far too aggressively / indiscriminately.** It piled 3–4 workers onto staples it had no discount or apparent use for (e.g. all three AIs jamming plain stones), and contested 1-icon cards by *recalling* workers to do so. This both *causes* the jam-lock and burns the AIs' fish — they rocketed up the track having built nothing. The flip side: **Muskrat literally never built a single structure** (0 base VP — it Invented on loop the entire game). And **only vines reliably escaped the pile-on** (often 0–1 AI bidders). The AI needs (a) a willingness to *not* bid when it can't profitably clinch, and (b) a path to actually convert materials into builds — otherwise it's free VP for a patient human.

**3. Tempo / chair dynamics are excellent and deep.** Bidding 0 to *keep the chair* (vs. ceding it to 0-bidders) is a real, non-obvious lever. Pay-for-bid makes "make rivals pay" genuinely costly to the instigator too. The patient miser who hoards workers and pounces during the tapped-out window is strongly rewarded — arguably *too* strongly here, but the core loop is great.

**4. Spy Mound's perfect-info bid is a standout card** — it cleanly defuses the jam math (bid exactly `icons − others`). In a table this jam-prone it felt close to mandatory-good. Fine, but worth watching for over-centralization.

**5. Possible scoring bug — 0-cost material keys count toward diversity.** Cattail Patch (and, per the code, Hidden Cache) count distinct materials via `for (const m in b.cost)`. My **Beaver Cache** has cost `{logs:0}`, so **"logs" counted as one of my distinct materials even though I never built anything with logs** — giving Cattail Patch **6 distinct → +8** instead of the +5 a true 5-material count would yield. It didn't change the winner (I'd have had 32), but it's almost certainly unintended. Fix: count only materials with `cost[m] > 0`.

**6. Wildcard cards read as a single material at a glance** (Mud Slick shows as "clay" until inspected) — flagged earlier; a small dual-material cue on the board face would help.

**7. Late-material starvation can strand a hand.** Reeds didn't appear for ~20 turns (killing my two reed cards early), then logs vanished entirely at the end (killing Wood Pile/Spillway/Stone Causeway the moment I finally wanted them). Material availability swung hard and late; combined with the jam-lock, a player's hand can be repeatedly out of sync with the board through no misplay. Some of this is good tension, but the swings felt extreme at 4P.
