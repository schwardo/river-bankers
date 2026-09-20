# River Bankers — 3-player web playtest #2 (Claude vs Friendly Otter + Greedy Muskrat)

- **Date:** 2026-09-20 (Sun), played against the local build (`web/index.html` @ 66881d1), post-Flotsam-Raft / post-Basking-Rocks
- **Player:** Claude ("You") as 🦫 Beaver, driving the browser UI via Playwright
- **Opponents:** 🦦 River Otter (Friendly AI), 🐭 Muskrat (Greedy AI) — same table as the 2026-09-07 game for comparability
- **Optional rules:** defaults — species starters ON, double-card auctions OFF, first-mover consolation ON, **plain river OFF** (effects live, raft in deck — the point was to stress the new cards)
- **Prep:** re-read the rulebook (17pp) and strategy guide (11pp); cross-checked both against `sim.js` before playing (see "Doc inconsistencies" below)
- **Result:** **Beaver (me) 30★ (91🐟) · Muskrat 23★ (93🐟) · Otter 16★ (92🐟)** — won by 7★
- 17 human turns, ~25 auctions, 5 jams (vs 11 jams in game #1 — I bid much more conservatively this time and it paid)

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦫 Beaver (me) | **30★** | 91🐟 | 6 | 17 printed + Reed Walkway +4 + Trophy Lodge +6 + 3 pairs |
| 2 | 🐭 Muskrat (Greedy) | **23★** | 93🐟 | 6 | 15 printed + Vine Trellis +6 + 2 pairs |
| 3 | 🦦 River Otter (Friendly) | **16★** | 92🐟 | 3 | 16 printed (Heron Roost 6, Royal Lodge 10), 0 pairs |

My line: Lodge Foundation draft → Salt Lick (6★) → Flush Channel (6★) → Streambank Hollow (4★) → Reed Walkway (0★, +4) → Trophy Lodge (0★, +6) → attempted Cattail Marsh (failed — see "the Cattail trap"). Never used: Swim-heavy midgame; one Flush at exactly the right moment was the game's hinge.

## Game story in six beats

1. **Opening jam tax.** First two auctions both drew a Muskrat snipe; the very first (Rocky Shoal, 7 bids on 5) cost me 3🐟 for 1 stone. Calibrated immediately this game instead of at turn 7.
2. **The raft frenzy (the big new-card story — see below).** Both AIs poured workers into Flotsam Raft: an 11-bids-on-6-icons FULL JAM on a card whose icons yield nothing. Muskrat sank ~13🐟 for 4 slips; Otter ~10🐟 for 2.
3. **The Flush pivot (my best move).** Mid-game the board was all stones/mud while my whole hand needed logs/reeds/vines — and 9 of the 12 undealt cards were exactly those. Flush (5🐟) turned over Logjam + Mud Wallow + Vine Curtain and gave me first pick at 1🐟/item. Cheapest logs of the game, and the tempo cost came back within three turns.
4. **The Muskrat freeze, weaponized again.** Greedy never recalls, so at supply 0 it just can't bid. I timed the Clay Seep swim and the Trailing Vine ride into those windows — the vine that finished Streambank cost me exactly 1🐟 because Muskrat's 4-bid + my 1 was a perfect fit it had "pre-announced" (greedy bids its need, assumes others bid ~0).
5. **Wild-fueled endgame.** Pulling Mud Slick (clay/mud wild ×7) at the cheap slot for 5 wilds was the value play of the game: 3 became Trophy Lodge's clay, 2 became scoring-pair mud. Basking Rocks' crowd bonus then paid Trophy's 2 stones with a single worker.
6. **All three pawns hit 74🐟 simultaneously** the turn the deck emptied — a dead heat at the two-thirds mark, echoing game #1's 18/18/18 tie. The scoring bands stayed close until my engine cards (Walkway + Trophy) paid out +10 at the end.

## New card: Flotsam Raft — worked as printed, but the AIs can't play it

Rules verification (all correct vs rulebook p.15):
- Staging at Headwaters cost 1🐟/slip; the raft drifted downstream after every auction on it; per-slip price rose with the slot. ✓
- When the last icon was covered the raft left the river: log showed "**Flotsam Raft breaks apart and is discarded**" and Muskrat's 4 staged workers returned to supply. ✓ (There were no river cards with open icons at that moment, so last call had no legal ferry destinations — the workers correctly came home with nothing.)
- Discarded from the game, not shoreline. ✓

**But the AI play around it was a disaster, on both profiles:**
- **The 11-on-6 full jam** (me 2, Otter 4, Muskrat 5) burned 11🐟 across the table for ONE consolation slip. Both AIs treated flotsam icons like material icons and bid like it was a 6-icon staple card. Neither can actually harvest the value: ferrying is an *action*, and neither AI seems to prioritize it.
- **Otter later RECALLED its 2 raft workers** — turning ~10🐟 of staged slips into plain supply (each icon ferries once, so recalling burns the slip forever). The friendly AI's recall logic clearly doesn't know a raft worker is sunk capital.
- **Muskrat's Sap Drip placed free workers onto the raft**, immediately triggering the break-up with zero ferries executed. Its entire ~13🐟 raft position converted to 0 materials. Muskrat lost by 7★; ~4 turns of raft waste is most of that margin.
- **Net: not one ferry happened all game.** The card functioned; the *investment* never paid for anyone.

**Suggestions:**
1. **AI: value flotsam icons at a steep discount** (they're an option, not a material), cap greedy's raft bids at ~2, and never bid into a raft jam — a jammed raft bid is strictly worse than a jammed material bid since the win still needs a second action to cash.
2. **AI: never recall from the raft** (Otter), and **never Sap-Drip/free-place onto it** unless a ferry is planned next turn (Muskrat).
3. **AI: actually ferry.** If the AI can't be taught to ferry when (slide-back ≥ destination cost), consider whether AI seats should simply avoid the raft entirely — a card only the human plays correctly will read as a human-only power in solo play.
4. Design-side: the card itself felt fine for me as a human — I stayed out after the frenzy because the price got irrational, which is arguably the card working as a bluff-magnet. No rules change suggested yet; fix the bots first, then re-measure.

## New card: Basking Rocks — clean, and quietly charming

- Crowd bonus fired exactly as printed: "**first worker basks with company — worth 2 stones (2 players aboard)**" when I spent my first Basking worker on Trophy Lodge with Muskrat's 3 workers still sunning. One worker → 2 stones. Log line is delightful.
- The incentive design showed up in real decisions: I *wanted* Muskrat parked there (its presence was my bonus), which is a genuinely novel feeling for this game — the only card where a rival's worker makes you happy.
- It only fired once all game, though (I made one stone-using build). At 3P with modest stone demand it's close to a vanilla stones-7 most of the time — which matches the sim's "count-invariant, jams +1pt" finding and seems fine for an always-tier card.
- No bugs found: icon render is 7 (4+3), effect gated correctly, would be ignored under plain-river.

## The Cattail trap got me — as a *player*

I spent ~9🐟 acquiring 2 reed workers planning "Cattail's discount doubles them = 4 reeds," and only at the final build learned (correctly!) that **a card's effect never applies to the build that creates it** — Cattail can't discount itself. The engine refused the build; the rulebook backs it (p.6, "A card's effects don't apply until after the card is built"); game #1's notes even flagged this exact confusion. If a player armed with the rulebook AND last game's notes still walks into it mid-game, real players will too, constantly.

**Suggestion:** print the reminder on the card itself — e.g. "When you build *(other structures)*: each Reed worker counts as 2 reeds" or add "(not this one)" — this is the single highest-value wording fix in the deck. Alternatively the build-picker UI could show *why* a hand card isn't green-bordered on hover ("needs 4 reeds — you hold 2; Cattail's discount doesn't apply to itself").

## Doc inconsistencies found (pre-game read-through, cross-checked against sim.js)

1. **Rulebook pp.5 & 14 — effect-category list omits Vine Curtain.** "Nine of the 24 base cards carry printed effects (wildcards, fish-track bonuses, position-gated yield, the Basking Rocks crowd bonus)" — the count of nine is right, but the parenthetical covers only eight cards; Vine Curtain's peek-rearrange fits none of the named categories. Add "a peek effect" (or similar) to the list.
2. **Strategy guide, "Two Players: The Bramble Shoal Wild" box — "leaving an 11-card deck against 18 at three."** The 3P deck is 19 cards: the 18 material-grid cards plus Flotsam Raft (which the guide itself says joins at 3+). The 11 counts the off-grid Bramble Shoal, the 18 excludes the off-grid raft — inconsistent bookkeeping. Say "19 at three" or "18 material cards".

Everything else survived verification, including computationally: the quick-ref demand table (logs 51 / reeds 40 / mud 41 / clay 28 / stones 49 / vines 35) matches `sim.js` exactly; 49 shared structures + 12 starters; 26 material cards; the engine caps (Walkway/Trellis uncapped, Causeway +8, Vault +12, Network +9, Ladder +12); the 11 Trophy-Lodge qualifiers; the once-per-game roster; Flotsam's two-step ferry = sim's 'credit' mode.

## Bugs / UX issues

1. **CONFIRMED STILL PRESENT — recall-picker default silently selects a shoreline worker you need** (game #1's bug #1). Every time I *initiated* an auction needing a recall, the dialog pre-selected **1 Stone from my shoreline pile** — the Salt Lick stones I was actively saving — three separate times. Notably, the *rider* flow gets it right: when funding a bid on someone else's auction the picker defaults to none and shows a "recall 1 more or lower your bid" warning. Suggest making the initiator flow match the rider flow (default none + warning), since the current default optimizes for "no blank dropped" over "don't eat my build materials."
2. **Still present: stray "/" in wild-card auction log lines** — "Auction begins on / Driftwood Tangle (Logs/Reeds wild)" (game #1 bug #5). Presumably an un-rendered icon placeholder in text form.
3. **Flush + Undo is safe (tested, not a bug — worth documenting):** I flushed, saw the 3 revealed cards, undid, re-flushed — and got the *same* three cards. No reroll-scumming exploit. 👍
4. **Weak phase-guarding on action handlers (programmatic only):** during the flush's "pick which fresh card to auction" phase, calling `humanSelectPrerivCard()` directly executed a full Pull — charging its 2–4🐟 trigger on top of the 5🐟 flush in one turn. Not reachable by mouse (the DOM only wires `humanSelectFlushTarget`), so zero player impact; noting it in case a future UI change reuses these handlers. Undo recovered the state perfectly, including the fish.
5. **Game-over "no final build available" is correct but curt.** All three of us were told "no final build available"; in my case for a non-obvious reason (the Cattail self-discount rule). One clause of explanation would turn a confusing moment into a teaching one.
6. In-game log again unavailable for full post-game review (capped); the request from game #1 for a "download full log" affordance stands.

Zero console errors or page exceptions across the whole session.

## AI observations

- **Muskrat (Greedy) remains a real opponent** — 23★ despite the raft catastrophe, with a coherent Trellis+vines engine and its trademark snipe pressure (both early jams were its 1-bids). But its two blind spots are now clear: (a) the raft, see above; (b) **the supply-0 freeze is highly exploitable.** Because it never recalls, every time it hit 0 supply I got uncontested-window purchases (the 1🐟 vine, the 3🐟 clay). A human can *count* it into a freeze. Suggest: allow greedy to recall when its supply is 0 and the auctioned material is one its hand needs — keeps the flavor, closes the lock-out.
- **Otter (Friendly) collapsed: 16★, 3 structures, 0 pairs** — worse than game #1's 19★. Its Royal Lodge (10★) was great; everything around it was drift: the raft-recall waste, two Heron Roost activations that mostly helped *me* (one cycled Clay Bank away, but the other spent 2🐟 for no visible gain), and huge worker piles left unconverted. Friendly under-converts in both logged games now — it needs a "build something, anything" bias ramp as the fish track passes ~60.
- Neither AI Flushed all game (second game running). The 5🐟 flush was my single best action — the AIs are leaving this tool unused.

## Balance / design impressions after two games

- **Jam rate halved when the human bids conservatively** (5 vs 11) — supporting the guide's "a calmer table is a better table" thesis. The system is working; game #1's relentlessness was partly my own overbidding.
- **Initiator consolation keeps proving its worth.** I planned two snipe-proof 1-icon triggers in the endgame around it. It's load-bearing; keep it default-on.
- **Mud Wallow's most-workers bonus whiffed on a tie AGAIN** (2-2 → nobody, second game in a row; at 3P a 4-icon card splits 2/2 naturally). That's now 2-for-2 dead letters. Recommend the game-#1 suggestion for real this time: ties go to the earlier-placed worker (or farthest-back player).
- **Engine cards keep deciding games**: game #1 Muskrat won with Reed Walkway +8; this game I won with Walkway +4 / Trophy +6 while Muskrat rode Trellis +6. The engines are the correct chase — and Trophy Lodge at just 2 qualifiers (+6 for a 5-icon cost) already felt fair rather than strong, so its max-12 ceiling seems safely theoretical at 3P.
- **Wildcards remain the best cards in the deck to *ride*.** 5 Mud Slick icons at 1🐟 each converted into ~9★ of endgame (Trophy clay + mud pair). Their flexibility (build-time choice + either-material pairing) is a big quiet edge — worth watching whether experienced tables start fighting the wilds harder than the staples, which would raise the jam rate exactly where the pool is deepest.
- **Species starters: Lodge Foundation earned ~4🐟 across three log builds** — real but modest; consistent with the sim's "within a few percent" claim.
- **Fun report:** the Flush pivot, the Muskrat freeze-counting, and the crowd-bonus moment were all *delightful*. The mid-game vine drought (3 failed attempts for 1 vine while Muskrat hoovered everything) was the frustration peak — but it resolved into the 1🐟 exact-fit ride, which felt earned. The tempo economy remains the star of the design.
