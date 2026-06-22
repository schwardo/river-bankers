================================================================================
RIVER BANKERS — SOLO PLAYTHROUGH THOUGHTS LOG
Played by Claude (Opus 4.8) against 2 AI opponents
3-player game · asymmetric (species starters ON) · double-card auctions OFF
================================================================================

I read the rulebook and the strategy guide first, then drove the browser
prototype at games/river-bankers/web/index.html. This file is a running diary:
my read of the board each turn, the rationale behind every action, plus a
running list of things that confused me (not covered by the rulebook) and
moments that felt clever, interesting, or fun.

--------------------------------------------------------------------------------
SETUP
--------------------------------------------------------------------------------
Config: I am the MINK. Opponents are AI Beaver and AI Otter. Muskrat off.
Reasoning for the table I chose: the strategy guide says clay is "the
contrarian's darling" — least contested, highest VP per unit, and the Mink's
Clay Den gives the single biggest discount in the game (-2/item). The catch is
that the line only pays off if nobody else fights me for clay. With a Beaver
(logs bias) and an Otter (reeds bias) across the table, NEITHER opponent has any
structural pull toward clay. That's the ideal table for a clay lean, so I built
it on purpose.

Turn order at start (fish track, lowest acts first; ties by stack top):
stack order [Otter, Mink(me), Beaver]. Otter acts first, then me, then Beaver.

AI drafts: Beaver took Lodge Foundation (its log-bias star), Otter took Kelp Bed
(its reed-bias star). Both committed to their signature materials immediately.

--------------------------------------------------------------------------------
DRAFT DECISION — my Mink starter
--------------------------------------------------------------------------------
My three options:
  - Clay Den (star/bias): clay icons cost 2 less fish/item (min 1). 0 VP.
  - Quick Strike: 2 VP; when I trigger an auction I may bid last (after reveals).
  - Snare Set: 1 VP; once/game force an opponent to recall a worker (they slide
    back 3 fish).

My opening hand points AWAY from clay: Heron Roost (reeds/vines), Royal Lodge
(logs/vines, 10 VP + extra turn), Cattail Patch (reeds/mud, diversity scorer).
By the book, "hand doesn't point at your material" argues for a tactical card.

This was genuinely close, and I want to record the tension because it's the most
important decision of the game:

  FOR Quick Strike: My hand wants REEDS right now (2 of 3 cards), and the Otter
  also wants reeds — so reed auctions will be the contested ones. Quick Strike's
  bid-last is worth the most precisely in contested auctions I trigger (bid
  exactly enough after seeing the Otter, never jam, never overpay). Plus 2 free
  VP and zero commitment. The guide even admits it "holds its own with Clay Den"
  on raw value.

  FOR Clay Den (what I chose): The discount is a standing edge I'll have on EVERY
  auction all game, on the cheapest + highest-paying + least-contested material —
  and at THIS table clay is uncontested by design. I can pre-stock clay workers
  at the 1-fish floor and hold them (workers are private inventory, never forced
  to spend) until a clay structure arrives; the deck is full of them (Charcoal
  Pit, Floodgate, Trophy Lodge, Hidden Cache, Clay Vault). Even my non-clay hand
  benefits: Cattail Patch scores DISTINCT materials, and a cheap clay worker is
  an easy distinct material to add; Floodgate (mud+clay) is a natural splash.
  And the guide warns that Quick Strike tempts a losing "linger at the back"
  playstyle — I'd rather not flirt with that.

DECISION: Clay Den. I'm committing to the contrarian clay lane that my table is
practically built for, while keeping Royal Lodge (logs, big VP) and Cattail Patch
(diversity) as fallbacks if clay structures somehow don't flow. If I draw into a
clay engine, this discount snowballs. Risk acknowledged: if zero clay cards come,
Clay Den is a near-dead 0-VP card and Quick Strike's 2 VP would have been better.

--------------------------------------------------------------------------------
EARLY GAME — TURNS 1-5 (my actions) + reads
--------------------------------------------------------------------------------
The AIs bid on every auction, not just their own — and they bid on HAND NEED,
not species color. Early evidence:
  - The reed-bias OTTER passed on reeds twice. The log-bias BEAVER grabbed reeds
    AND stones. So "species => material" is a weak predictor here; I have to read
    each opponent's actual builds/needs, not their animal.
  - Both AIs piled into STONES immediately (Beaver 3, Otter 4) and later both
    grabbed MUD. They're diversifying. Meanwhile CLAY has not been touched by
    anyone — confirming my read that the clay lane is mine alone.

My opening sequence:
  1. Passed (bid 0) on Otter's 7-icon Stones pull — stones do nothing for me, and
     bidding would burn tempo + hand away the chair. Stayed at pos 0, kept acting.
  2. Pulled HW1 Reed Stand (cheapest trigger, 2f), bid 2 reeds. Won 2. Principle:
     secure the CONTESTED material (reeds, which my hand wants x2 cards) early,
     before a rival takes it; let uncontested stuff drift.
  3. Pulled HW1 Vine Curtain (trigger 2), bid 2 vines. Won 2 uncontested (both
     passed). Vines = "trap material" in general, but the guide blesses taking it
     to feed a card you already hold — I hold two (Heron Roost, Royal Lodge).
  4. Auctioned the R1 Reed Stand's last open reed (1 flat + 2/item), bid 1, won 1.
     That completed 3 reeds + 2 vines = exactly Heron Roost's cost.
  5. Passed on Otter's Mud Wallow pull — mud is plentiful/uncontested, no urgency,
     and I wanted my pawn low to claim the build turn.
  6. BUILT HERON ROOST (6 VP). All 5 workers returned to supply.

FUN/CLEVER MOMENT: My 2 vines happened to come from the Vine Curtain card, so
building Heron Roost with them triggered Vine Curtain's "peek at + rearrange the
top 2 deck cards" bonus — a free deck-manipulation I never planned for. It's a
nice emergent reward for sourcing your build materials from effect-bearing cards.
(The two upcoming cards were both Stones, useless to me, so I left the order.)

POSITION CHECK after the build: I have 6 VP on the board (Clay Den 0 + Heron
Roost 6). Opponents have built Lodge Foundation + Confluence (Beaver) and Kelp
Bed (Otter) — Beaver's Confluence is worth 5 VP, so Beaver leads on built VP, but
its pawn is way out front at 15 (lots of tempo spent). I'm at 14.

Replacement draw = Pontoon (logs4/reeds1, 4 VP). My hand now leans LOGS (Royal
Lodge 6 logs, Pontoon 4 logs) — a problem, since logs is the Beaver's contested
staple. Still zero clay structures drawn, so Clay Den remains a sleeping discount.
I need to decide soon: keep waiting for a clay engine, or pivot fully into the
DIVERSITY plan (Cattail Patch) that my hand actually supports — using Clay Den
merely as a cheap on-ramp to add clay as one more distinct material.

CONFUSING (not in rulebook): the very first game-log line reads "Game starts. 3
players. You are Muskrat." — but I'm the MINK (I drafted Clay Den, the Mink
starter, and every other UI element says Mink). Looks like a hardcoded/incorrect
species string in the startup log line. Purely cosmetic, but wrong.

--------------------------------------------------------------------------------
MID GAME — the hand/board MISMATCH and how I broke it
--------------------------------------------------------------------------------
A long, instructive stretch. After building Heron Roost, I hit a wall: the board
kept offering CLAY / MUD / STONES (all uncontested or stone-contested), but my
hand wanted LOGS / REEDS / VINES. Reeds and vines simply weren't on the board for
many turns. Several reads and decisions:

1. INVENT to fix the mismatch. With no clean build path, I spent a cheap Invent
   (draw 2 / discard 2) and it paid off hugely: I drew Burrow Run (vines3/mud1,
   4 VP, "+slide back 5 fish" = a tempo REFUND on build) and Trading Post
   (clay2/reeds2, 5 VP) — the latter being my first card that actually USES clay,
   activating Clay Den at last. Both use materials my table leaves cheap.

2. THE PAINFUL DISCARD. Keeping 3 of 5, I cut Cattail Patch (my diversity engine)
   AND Pontoon to keep Royal Lodge (10) + Burrow Run + Trading Post. Reasoning:
   Cattail Patch's realistic payoff (~3-5 VP) is low AND it competes for my scarce
   reeds — poor ROI; Royal Lodge's 10 VP keeps a high ceiling I can abandon later
   if logs don't flow, whereas discarding it forecloses 10 forever. This pivoted
   me from "diversity engine" to "build high-value cards out of cheap uncontested
   materials (clay/vines/mud), with Royal Lodge as a log-dependent stretch."

3. CLEVER/SATISFYING MOMENT — the log jam I sidestepped. The drifting Logjam sat
   at River 1/2 with only 2 open icons. Otter (building Log Flume) and Beaver both
   wanted logs. On my turn I simply PASSED, and on the next auction Beaver bid 2
   and Otter bid 2 into the 2-icon card: total 4 vs 2, so BOTH won zero and BOTH
   still paid 4 fish. They torched 8 fish jamming each other over logs while I
   spent nothing and kept my tempo lead. "Don't join a log shoving match" +
   "make rivals pay" happened for free, just by staying out. Very satisfying.

4. USING CLAY DEN + the wild card. A fat 7-icon Mud Slick (clay/mud wildcard) sat
   uncontested. I pulled it and took 3 wild workers (1 fish/item) — earmarking 2
   as clay for Trading Post and 1 as mud for Burrow Run. One pull, two cards'
   worth of materials, trigger-efficient. This is the "hold workers as private
   inventory until the structure is ready" idea from the guide.

5. DIGGING with Heron Roost's ability. Stuck on the vines/reeds drought, I used
   Heron Roost's "pay 1 fish, replace a Headwaters card with the deck top" to
   churn the deck CHEAPLY while keeping the chair (each dig kept me below the
   opponents at 29). First two digs hit Stones — which, in hindsight, I should
   have PREDICTED: way back, building Heron Roost with Vine-Curtain vines let me
   peek the top 2 deck cards, and they were both Stones. I dug blind instead of
   remembering that. (Lesson: track the peek info.) But the churn cleared those
   two stones, and the next dig revealed a 7-icon REEDS card. I pulled it, bid 2
   reeds, and that completed Trading Post (2 clay + 2 reeds).

6. BUILT TRADING POST (5 VP) — the build returns 4 workers to supply, which is
   exactly what then lets me bid for vines next turn. Sequencing matters: build
   the ready card first BOTH to bank VP and to free the workers you need for the
   next acquisition.

SCORE CHECK: Me 11 VP built (Heron Roost 6 + Trading Post 5), tied with Beaver's
11 (Confluence 5 + Slipstream 5 + Lodge Foundation 1). Otter is the laggard —
lots of hoarded stones/logs but only Kelp Bed + Log Flume built. Pawns are all
bunched ~34-36 of 119, so it's a long game still. Vines (Trailing Vine) are now
on the board for Burrow Run, and a fresh draw gave me Stone Causeway (stones
engine — off-lane, probably a later discard).

CONFUSING/NOTABLE (not in rulebook): nothing rules-breaking here, but worth
noting the AIs clearly bid by hand-need and contest staples (logs/stones/reeds)
hard while leaving clay/vines almost untouched — which made my Clay-Den/clay +
uncontested-vines plan exactly the right contrarian read for this table.

--------------------------------------------------------------------------------
LATE GAME — the engine-train, the mud denial war, and a behind-the-scenes pivot
--------------------------------------------------------------------------------
A flurry of strong turns and then a brutal swing:

THE ENGINE TRAIN (3 turns in a row): I built Burrow Run, whose "slide back 5"
refund moved me from 43 to 38 and handed me the chair for ANOTHER turn. I used
that to Invent (cheap, stayed below the opponents), kept the chair AGAIN, and the
following build (Spillway) cost 0 fish — so I chained Burrow Run -> Invent ->
Spillway across three consecutive turns while the opponents sat stuck at 44-50.
This is exactly the guide's "cheap actions keep the chair; chain them" idea, and
the tempo-refund + 0-cost cards made it sing. Got me to 21 VP (5 structures).

THE PAINFUL HAND PIVOT: mid-late, my hand (Royal Lodge 10, Stone Causeway,
Tribute Stone) was all dead — Royal Lodge needs 6 logs (Otter turned into a log
hawk and the deck emptied), and Stone Causeway / Tribute Stone need stones, which
had completely vanished from the board. I Invented all three away for Spillway,
Driftwood Snag, and Vine Trellis. Discarding a 10-VP card stings, but a card you
can't build is worth 0 — and reading WHICH materials are permanently gone (logs,
stones, reeds) vs still flowing (clay, vines, mud) is the whole game.

DENIAL JAMS — the AI plays defense on the leader. As I assembled Floodgate
(mud4/clay3, 8 VP) — my swing card built from the cheap uncontested clay+mud —
Beaver started DENIAL-JAMMING the mud: bidding into cards it couldn't win, just
to cost me mud (it took 0, paid full freight). Then, when the material deck and
Headwaters ran completely DRY, Beaver triggered an auction on the literal last
mud icon in the game: as the trigger it's forced to bid >=1, so on a 1-icon card
ANY bid I make jams us both to 0. Then Otter piled on too. With two deniers on a
single-icon card I can never win it, and repeated jams just drift the card to the
shoreline where the mud is lost forever. Floodgate is dead one mud short.

THE REVEAL: I finally computed everyone's projected final score and got a nasty
surprise — I'm SECOND, not first. Beaver 27 (19 base + a +6 Reed Walkway engine),
ME 23, Otter 20. Beaver's reed ENGINE is what put it ahead; I'd been tracking raw
printed VP and under-weighting opponents' end-game scorers. Lesson: in a game with
hidden multiplier engines, compute the real end-state early, don't eyeball printed
numbers.

THE PIVOT: I need ~+5 to overtake Beaver, and Floodgate is dead. But CLAY is still
freely available (Clay Bank R1, 4 open, and nobody contests clay) and I hold 3
clay + Clay Den. So the plan: Invent to find a CLAY-cost structure I can actually
build from the abundant clay — ideally Clay Vault (its "+3 per clay structure"
engine would stack with my Trading Post for ~+6, vaulting me to ~29 and past
Beaver). The contrarian clay lane I drafted at turn 0 may yet decide the game.

================================================================================
FINAL RESULT
================================================================================
1. BEAVER  — 31 VP (88... 86 fish, 7 structures)  [WINNER]
   23 printed + Reed Walkway engine +6 (3 reed structures) + 2 worker pairs.
2. MINK (me) — 24 VP (88 fish, 5 structures)  [2nd]
   21 printed + 3 worker pairs (1 mud pair, 2 clay pairs).
3. OTTER — 23 VP (87 fish, 6 structures)  [3rd]

I lost to Beaver but secured a clean 2nd. The game ended at ~88 fish, NOT at the
119 finish line, because the material economy was fully exhausted (deck + Headwaters
empty, every river icon claimed, and no player held a buildable structure). My
final clay grab claimed the last open icon on the whole board, which tripped that
exhaustion end-condition — so that one little +1-VP pair play ALSO ended the game,
locking in my 24 over Otter's 23.

--------------------------------------------------------------------------------
WHAT DECIDED THE GAME — and what I'd do differently
--------------------------------------------------------------------------------
THE DECISIVE MOMENT was Floodgate (8 VP). Building it would have put me at 32 and
WON outright (32 > Beaver's 31). It died one mud short to Beaver's denial-jamming,
once the material deck ran dry and the last mud icon became a single contested
target. So the whole game turned on that one material.

MY KEY TACTICAL ERROR: when I started assembling Floodgate (mud 4 + clay 3), I
grabbed the CLAY first (cheap, uncontested, 1/item) and went for the mud second.
That was backwards. Clay was never going to be contested (nobody else wants it) —
it would wait for me forever. MUD was the material that would dry up and draw
denial. I should have grabbed the 4 mud FIRST, while it was abundant and the
deck still had mud cards, then mopped up the always-available clay later. I even
articulated this exact principle in the EARLY game ("secure the contested/scarce
material first; let the uncontested stuff drift") and applied it correctly to
reeds — then failed to apply it to Floodgate's mud when it mattered most. Lesson
burned in: sequence acquisitions by SCARCITY/CONTENTION, not by per-item price.

STRATEGIC MISREADS:
- I tracked printed VP and under-weighted Beaver's Reed Walkway ENGINE (+6). I
  only computed the true end-state (with engines) very late and got the nasty
  surprise that I was 2nd, not 1st. In a game with hidden multiplier engines,
  compute real projected totals EARLY — it changes how hard you fight for swing
  cards like Floodgate.
- The draft: Clay Den was a defensible, on-theme pick for my table, but clay
  structures barely flowed to me until Trading Post (mid-late), so the discount
  sat idle for most of the game. Given my opening hand pointed hard at
  reeds/logs/vines, Quick Strike (2 guaranteed VP + bid-last in the contested
  auctions my hand actually wanted) might have been the stronger, more flexible
  pick — the exact "your hand doesn't point at your material -> take a tactical
  card" case the guide describes. The 2 printed VP alone would have tied Beaver.
- I spent too long fighting the hand/board MISMATCH (wanting logs/reeds/vines
  while the board poured out clay/mud/stones). I should have pivoted my CARDS to
  the abundant materials sooner and harder (Invent toward clay/mud structures the
  moment the board's bias was clear), instead of clinging to Royal Lodge (a
  10-VP card I never came close to building — 6 contested logs).

WHAT WENT RIGHT (and felt good):
- Reading the table at draft and committing to the uncontested lane.
- The Burrow Run -> Invent -> Spillway three-turn chain (a tempo-refund card plus
  a 0-fish build kept handing me the chair).
- Dodging the log shoving match while two rivals burned 8 fish jamming each other.
- Patiently holding workers as inventory and completing builds in single clean
  moves (Heron Roost, Trading Post, Spillway).
- The final clay grab that simultaneously secured 2nd and ended the game.

--------------------------------------------------------------------------------
CONFUSING / NOT-IN-THE-RULEBOOK THINGS (playtest feedback for the designer)
--------------------------------------------------------------------------------
1. GAME ENDED AT 88 FISH, NOT 119. The rulebook (p.8, "THE DECK RUNNING DRY
   DOESN'T END THE GAME") explicitly says: "Even after the material deck empties,
   you keep auctioning the cards still on the river and Headwaters until pawns
   reach the line." But the implementation has checkGameEnd(): when the deck +
   Headwaters are empty AND every river icon is claimed AND no player can build,
   the game ends immediately (jumps to the final-build coda), regardless of the
   fish track. This is sensible anti-stalemate design, but it directly
   contradicts the rulebook text. Either the rulebook should document the
   "full material exhaustion ends the game" shortcut, or the code should keep
   going to 119. (Note: the check only looks at CURRENT hands for buildability,
   not whether a player could Invent into a card buildable from HELD workers —
   e.g., I was holding 4 clay + 3 mud and could have built a Clay Vault from hand
   had I drawn it, but the game ended before I could keep digging.)

2. OPENING LOG LINE SAYS THE WRONG SPECIES. The first game-log entry reads "Game
   starts. 3 players. You are Muskrat." — but I was the MINK the entire game
   (drafted Clay Den, the Mink starter; all other UI says Mink). Looks like a
   hardcoded/incorrect species string. Cosmetic, but wrong.

3. THE AI DENIAL-JAMS. Not a bug, but worth knowing for tuning: the AI will bid
   into auctions it cannot win purely to cost the leader materials (Beaver bid 2,
   then 1, then triggered the very last mud icon — taking 0 each time — to keep me
   from completing Floodgate). On a 1-icon card the trigger is FORCED to bid >=1,
   so a rival triggering the last copy of a scarce material is an unbreakable
   denial. That interaction (forced-min-bid trigger as a denial tool on
   single-icon cards) is powerful and maybe worth a design look.

OVERALL: a tense, satisfying game. Value really is set by position + demand, not
by any printed price, exactly as the guide promises — and the whole match came
down to reading which materials were scarce and sequencing my buys around that.
I read it right early (reeds, vines), drifted in the middle (chasing logs), and
lost the game on one mis-sequenced material (clay-before-mud on Floodgate) plus
under-rating an opponent's engine. 2nd of 3. I'd take Quick Strike next time.
