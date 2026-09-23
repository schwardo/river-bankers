# River Bankers — 4-player web playtest (Claude as Mink vs Greedy Beaver, Friendly Otter, Greedy Muskrat)

- **Date:** 2026-09-22 (Tue), local build `web/index.html` @ ab889fd (post-Twig-Bridge), driven through the browser UI via Playwright
- **Player:** Claude ("You") as 🦡 **Mink**. This is the first logged web game as Mink and the first at 4P since June.
- **Opponents:** 🦫 Beaver (**Greedy**), 🦦 River Otter (**Friendly**), 🐭 Muskrat (**Greedy**)
- **Optional rules:** defaults. Species starters ON, double-card auctions OFF, first-mover consolation ON, plain river OFF (so the effect cards and the raft are live).
- **Prep:** read the rulebook (16pp) and strategy guide (11pp) first, then followed the guide's Mink advice on purpose: *"Clay: least contested, pays the most — lean it when it flows."*
- **Result:** **Mink (me) 41★ (95🐟) · Muskrat 34★ (94🐟) · Beaver 27★ (88🐟) · Otter 16★ (93🐟)**, a 7★ win
- 13 of my own actions. **49 auctions** in total: 7 had no bids at all, 8 jammed (2 of them full jams), 15 filled exactly and 19 had icons left over. The jams bid 16 more workers than there were icons.

## Final scoring

| | Player | ★ | Fish | Structures | Breakdown |
|---|---|---|---|---|---|
| 1 | 🦡 Mink (me) | **41★** | 95🐟 | 7 | 22 printed + Clay Vault **+12** (capped) + Trophy Lodge +6 + 1 pair |
| 2 | 🐭 Muskrat (Greedy) | **34★** | 94🐟 | 8 | 34 printed, no engines, no pairs |
| 3 | 🦫 Beaver (Greedy) | **27★** | **88🐟** | 6 | 25 printed + 2 pairs (and 88🐟 is *below the finish line*, see Rules bug #3) |
| 4 | 🦦 River Otter (Friendly) | **16★** | 93🐟 | 3 | 14 printed + 2 pairs |

**My line:** Clay Den draft → Clay Vault → Stone Pool (6★) → Salt Lick (6★) → Charcoal Pit (6★) → Sap Drip (4★) → Trophy Lodge (final build). Five of those use clay, which capped Clay Vault at +12. Clay Den + Clay Vault + Trophy Lodge came to **18★ of engine on 0★ of printed cost**.

## Game story in seven beats

1. **Clay at the Headwaters rate.** Turn 1, Slipping Sandbar (clay ×8, a 4P card) showed up in Headwaters 3. I pulled it for 4🐟 and bid 6 at 1🐟 each. Beaver bid 2 and it was an exact 8/8 fit. That stocked the whole engine in one move. Clay Den's −2 does nothing at the Headwaters (floor of 1), but that didn't matter: at 1🐟/item, clay really is "the card nobody else bids on."
2. **Supply collapse, everyone at once.** By fish ~12–30 all four players were at 0–1 supply at the same moment. For about eight turns auctions were effectively uncontested, and the guide's "strike while supplies are drained" line was plainly right. It cut both ways, though: I was empty too, and spent those turns Inventing and building instead of buying.
3. **The raft wipe (the un-fun moment).** I staked 3 Flotsam Raft slips at 1🐟. The very next auction (Otter's) filled the remaining icons, which triggered last call. Otter, earlier in fish-track order, ferried onto the only two open river icons. My 3 slips came home with nothing, and nothing in the log said why. At 4P a 6-icon raft can fill within two auctions, so the "bank that matures" framing in the strategy guide never gets a chance.
4. **Flush → Basking Rocks for 1🐟.** Every card in hand was exactly one worker short, and the Headwaters held three vine cards. I flushed for 5🐟, which revealed Basking Rocks *and* Clay Seep. Nobody could bid, so I recalled a spare log, took the stone uncontested, and built Stone Pool the next turn.
5. **The move that made me feel smart: Stone Pool deck-stacking, paid for by Beaver.** Stone Pool let me reorder the top 5 material cards, so I put Stones ×8 first and Logs ×8 second. Beaver then **flushed**, revealing exactly those cards, and opened the stones auction itself. I rode its trigger for **5 stones at 1🐟 each** (7 bids on 8 icons). Beaver paid 5🐟 to set up my purchase. This was the best moment of the game.
6. **Old Growth drift.** I took 4 Old Growth icons at the Headwaters rate, then *stayed out* while the AIs kept auctioning it downstream. Their auctions carried it to River 2, and my 1-worker bid sent it to the shoreline, where each worker yields 2 logs. "Let the rivals move your card for you" is a subtle and satisfying line.
7. **The last clay.** The endgame came down to one wild card. Mud Slick (clay/mud ×7) was the only clay left, and both my remaining builds needed it. I pulled it at 81🐟 and got 2 on an exact 7/7 fit (Beaver 3, Otter 2, me 2). Then I rode Otter's mud auction for a scoring pair, which carried me past 90. The "this crosses the finish line" warning on the bid slider is excellent. Trophy Lodge went down as my final build.

As in both 3P games, **all four pawns sat at 75–76🐟 at the same time** late in the game. Pack finishes seem to be a structural feature.

## Rules / engine bugs (highest value first)

1. **AI initiator bids 0, creating dead "no bids" auctions (7 this game, all Otter).** The rulebook requires the initiator to bid ≥1. Otter repeatedly swam to a card (1🐟) with an empty supply, bid 0, got "💤 No bids — card stays put," and then did it again: **3 times in a row on Logjam, 4 times on Driftwood Tangle, and once more on Old Growth.** That is 7🐟 burned for nothing and seven extra "submit 0" dialogs for the human.
   - **Root cause:** the trigger check (`aiChooseAction`, `triggerPool = p.supply + aiTotalRecallable(playerIdx)`, ~l.5512) counts recallable workers *including the ones on the target card*. `aiDecideBid` (l.5136) calls `aiRecallBudget(playerIdx, card.id)`, which *excludes* the auctioned card, so the pool comes out 0. Then `if (totalPool === 0) return Math.min(0, minBid)` (l.5143) returns 0 and quietly ignores the minimum. In every instance, Otter's only recallable workers were on the card it was auctioning.
   - **Fix:** exclude the target card's workers when computing the per-card trigger pool, and have `runAuction` clamp an AI trigger bid to ≥1 (or refuse the trigger).
   - A pure 0-bid "auction" also acts as an illegal 1🐟 "push this card downstream" action. It happened to help me once (Old Growth), which is how I noticed.
2. **"As an action" cards are used as free extra actions.** The rulebook (p.7) says: *"As an action — replaces your one turn-action (instead of Pull / Swim / Flush / Invent / Build)."* The code disagrees:
   - The AI runs Heron Roost and Driftwood Snag in `aiStartOfTurnAbilities` (web l.5878ff), then takes its normal action anyway. Beaver did this 4 times: Snag (+1🐟) followed by a Pull/Build in the same turn.
   - **`sim.js` does the same (l.3403–3425)**, so any balance numbers for these cards assume the free-action reading.
   - The human buttons (`humanUseDriftwoodSnag`, `humanUseHeronRoost`) don't end the turn either. The two sides are at least consistent with each other.
   - Otter used **Portage** (paid 4🐟 to swap workers) and then also swam in the same turn.
   - The TODO at l.5881 ("a human owner … has NO way to trigger these") is stale, since the buttons now exist.
   - **Decide which reading is intended**, then fix either the rulebook or the engine plus the sim. The rulebook reading would make these cards much weaker, and Driftwood Snag was one of Beaver's six builds.
3. **An effect moved a retired pawn back below the finish line.** Beaver crossed and retired at 90. Later Otter's Portage swapped workers with Beaver, and the compensation *"🦫 Beaver slides back 2🐟"* put a **retired** pawn at 88. Beaver finished below the line, which gives it the tiebreak over everyone. The rulebook says retirees "stay on the space you landed on" and doesn't address effects that move pawns afterwards. Suggest: effects never move retired pawns (or compensation to a retiree is void), and state this in the Endgame section.
4. **Raft last call gives the human no feedback.** "🛟 Mink (you)'s 3 worker(s) return to supply as Flotsam Raft breaks up" appeared with no prompt and no explanation. The behaviour was correct (Otter's ferries had filled the only open icons before my turn in last-call order), but add a line like "no open river icons left to ferry to".

## UI bugs / UX issues

1. ~~**Still present: stray "/" before wildcard names.**~~ **Retracted (false positive):** the "/" sits between the two material SVG icons ("logs-icon / reeds-icon"), and the log's text form already strips it. I only saw a bare "/" because I scraped the panel's `innerText`, which drops SVGs.
2. **The recall dialog lies about blanks.** Recalling only from shoreline cards shows "✅ Recalling 4 workers to fund this bid (**drops 4 blanks on river cards**)", while every row it lists says "Shoreline (no blank)". The count should only include river-card recalls.
3. **Recall rows don't name their cards.** Two rows read "Logs · Shoreline (no blank) /1" and "Logs · Shoreline (no blank) /5". One is Driftwood Tangle (a logs/reeds *wild*), the other is Old Growth (2 logs per worker). They are very different to recall from, and the only way to tell them apart is the count. Wildcards should also show their true label ("Logs/Reeds").
4. **Negative supply preview.** Before you pick recalls, a bid above your supply shows "SUPPLY 0 → -1". Show "0 (+1 needed from recall)" instead.
5. **"You are 1🐟 ahead in turn order"** was shown when I was 1🐟 *further along the track*, which means I acted *later*. "Ahead" reads as "earlier". Suggest "1🐟 past Otter (Otter acts first)".
6. **Game-over modal leaves out Muskrat's breakdown.** A player whose score is all printed VP gets no "Printed structure VP 34★" line, while every other player has one.
7. **Hand cards render huge after game over.** The hand area blows its cards up to roughly 3× size behind the modal.
8. **Hand-card progress badges** (the "0/4" / "0/2" chips) sit over the cost row and hide the material labels ("Logs ×2", "Clay ×2" on Treaty Stone). Visible in the opening screenshot.
9. **Fish-track pawns stacked at 0** overflow above the track and cover the "Fish Track" title.
10. **Log nits:**
    - "🦡 🦡 Mink (you) drafts Clay Den" has a doubled emoji.
    - "— 🐭 Muskrat advances to 0🐟 on the fish track" appears at game start, advancing by zero.
    - Refill lines call Mud Slick "(Clay)", dropping the mud half.
11. **The starter-draft modal passes `horizontal: true`** but lays out 2 + 1 at 1600px wide. Cosmetic.
12. **Salt Lick prints the peeked hand in the public log** ("peeks at Beaver: Tow Line, Slipstream, Heron Roost"). That's harmless against AI. **Check BGA**: in a real multiplayer game this leaks hidden information to everyone. *(Not a concern for the web version, which always has 0 or 1 humans. BGA reveals the hand privately.)*

**Verified fixed or working well since earlier games:**
- The initiator recall picker now defaults to *none* (game #1/#2 bug #1 is fixed).
- The crossing warning on the bid slider is excellent.
- Clay Den shows up in the per-item price and the log ("[Clay Den]").
- Charcoal Pit's substitution is marked with `*` in the build picker.
- The Stone Pool reorder UI is clear.
- The Clay Vault swap flow is smooth.
- The AIs now **Flush**: Muskrat and Beaver once each, and neither had flushed in games #1/#2.
- **Greedy now recalls** when it's frozen (the supply-0 freeze fix works, including a Streambank Hollow slide-back on the recall).
- Zero console errors or page exceptions all game.

## Doc inconsistencies

1. **Rulebook p.6: "the shared main deck… of 49 cards".** p.2 says 50, the strategy guide says "a 50-card deck", and the code has **50 shared + 12 starters**. p.6 wasn't updated when Twig Bridge was added.
2. **Rulebook p.16 quick-ref demand table: Vines = 35.** The code now sums vines demand to **39**: Twig Bridge added another 4-vine card, so the row should read "2(1x) 7(2x) 5(3x) 2(4x) = 39". The other five materials still match (logs 51, reeds 40, mud 41, clay 28, stones 49).
3. **"As an action"** (p.7) contradicts the engine and sim. See Rules bug #2.
4. **Retired pawns moved by effects** aren't covered in the rulebook. See Rules bug #3.
5. **The auction-result panel teaches different math than the rulebook.** The panel says "Each bidder took max(0, 4 − others' bids)"; the rulebook says "bid minus the overbid". They're algebraically the same, but a new player sees two formulas. Pick one; the rulebook's "overbid" framing is the one that has a name.
6. **Strategy guide, Flotsam section: "Workers staged cheaply… appreciate as the raft deepens."** At 4P the raft went Headwaters → R1 → filled → last call in **two auctions**. Consider a line saying the maturity play is a 3P play, and that at 4P the raft is mostly a last-call scramble.

## AI observations

- **Otter (Friendly) came last for the third game running: 16★, 3 structures.** It triggered **18 swims**, 7 of them dead (bug #1), and spent its turns shuffling workers instead of building. It did two clever things: recalling a stone to stake the raft and then ferrying it straight back onto Rocky Shoal, and a Portage swap. Neither turned into points. The "build something" late-game bias from commit 823d969 didn't visibly help this seat.
- **Beaver (Greedy) invented ~7 times** and emptied the 38-card structure deck, forcing a discard reshuffle. It drafted Lodge Foundation (the logs bias), but its hand drifted into mud/vines/reeds (Tow Line, Slipstream, Heron Roost), so it cycled cards instead of committing. It is also the jam engine: bids of 3–4 on 4–5-icon cards.
- **Muskrat (Greedy) is still the strongest AI.** 34★ from eight honest printed-VP builds, with Spy Mound's bid-last used well. It also built Burrow Run (slide back 5) right before the line to take extra turns.
- **All three AIs drafted their bias starter** (Lodge Foundation / Kelp Bed / Mud Burrow). That's fine, but it means the tactical starters only ever get tested by the human seat.

## Balance / design impressions

- **Mink + clay may be too clean at 4P.** I took 14 clay across the game, almost all uncontested at 1🐟. Beaver was the only rival that ever wanted clay (2, for Tow Line). **Clay Vault hit its +12 cap with 5 clay structures, all built naturally from my hand.** The Vault's peek-and-swap also *found* me Trophy Lodge, which is an engine card dealing its own complement. The guide says "Mink is also best placed for Trophy Lodge", and that proved true: 18★ of engine from three cards costing 0★. One game is anecdote, but it's worth a sim cell: Mink with Clay Den + Clay Vault held vs. not, at 4P.
- **Jams are the dominant cost at 4P.** 8 jams in 42 live auctions. Two full jams: Reed Stand took **10 bids on 5 icons** (Beaver took the consolation reed, and 10🐟 burned across the table), and Vine Curtain took 4 on 2. Once supplies refilled after the mid-game builds, every Headwaters card jammed. The guide's "calmer table" advice is right, but the Greedy AIs don't follow it, so a 2-Greedy 4P table plays very jammy.
- **Supply cycles synchronise.** Everyone emptied together early and refilled together late. That creates distinct "buyer's market" and "jam market" phases, which is interesting and readable. A human who counts supplies does very well.
- **The Headwaters rate (1🐟/item) is doing a lot of work.** Almost all of my materials came from Headwaters auctions (Sandbar, Quarry Bank via Beaver's flush, Old Growth, Clay Bank, Mud Slick). River swims were for single top-ups. Pull + ride-the-trigger beat swimming all game.
- **Flotsam Raft at 4P** (see beat 3): with six icons and four bidders it fills almost immediately, so the ferry/maturity game never happens. Otter's ferries worked correctly; the card behaved as a lottery for whoever acts first at last call. Consider sim-testing a 4P-only tweak (e.g. the raft stays until an auction *on it* leaves ≥1 icon open), or just document it as a 3P card.
- **Cards that shone:** Stone Pool (the reorder is real power when the deck is small), Old Growth (drift-to-double is a great "let rivals do the work" puzzle), Charcoal Pit (its substitution rescued Sap Drip), and Clay Vault's peek/swap (useful twice in four peeks).
- **Fun report:**
  - **Best:** the Stone Pool → Beaver-flush → 5 stones at 1🐟 chain, and the Old Growth drift.
  - **Worst:** the raft wipe (3🐟 gone with no decision point) and clicking through Otter's seven "submit 0" dead auctions. A human player would find the latter baffling: *why does Otter keep paying to auction a card nobody bids on?*
  - The pack finish at 75/76/76/76 made the last three turns genuinely tense.

## Follow-up: fixes applied (same day)

Everything above was fixed except where noted. Status by item:

**Rules / engine**
1. **AI initiator bids 0 → fixed** in `web/index.html`.
   - New `aiTriggerPoolFor(lot)` counts supply plus workers recallable from every card *except* the lot. It is now used for river swims, Tow Line and Confluence.
   - `aiDecideBid` passes both cards of a Confluence lot to the recall exclusion.
   - Human Swim, Confluence and Tow Line refuse (or filter) a lot the player can't bid on.
   - `sim.js` already excluded the lot for swims; I aligned its Tow Line to match.
   - 4 all-AI 4P games afterwards: **0** dead "no bids" auctions and no console errors.
   - **BGA had the same bug as a softlock** (a 0-supply player could Swim to the only card holding their workers, then had no legal bid and no Undo). Fixed with a per-lot `canTriggerOn` rule plus a per-player `getSwimTargets`, and Tow Line and Confluence targets are filtered the same way. 5 new PHPUnit cases, 2488 tests pass. **Not yet tested live on Studio.**
2. **"As an action" now consumes the turn** everywhere, matching the rulebook and BGA (the designer chose this reading).
   - Heron Roost, Driftwood Snag, Portage, Trading Post and Mill Wheel's copy were moved out of the AI's free start-of-turn step into `aiChooseAction`. They're offered when there's no build or worthwhile auction. Same change in web and `sim.js`.
   - The human buttons now end the turn, and are labelled "— your action".
   - The web AI's Mill Wheel no longer copies Salmon Run, which has been once-per-game and non-copyable since 2026-07-26 (BGA already excluded it).
   - Sim `effect-use`, 4P × 600 games, fires per builder old → new: Driftwood Snag 3.37 → 1.57, Heron Roost 2.56 → 0.66, Portage 2.30 → 0.24, Trading Post 0.56 → 0.10. **These cards' balance numbers need re-measuring.**
3. **Retired pawns moved by effects: left as-is by design** (the tiebreak effect is accepted).
4. **Raft last call:**
   - Web and BGA now log "*X* has no open river icon to ferry to" for a player who is skipped with workers aboard.
   - The web last-call order also now breaks fish ties by stack (top first), matching BGA's `raftCallOrder`. It previously sorted by fish only, so in this game's raft wipe I may have been entitled to go before Otter.

**UI (web):**
- The recall dialog's blank count now includes only river recalls.
- Recall rows name their card and show the true wildcard label.
- Supply shows "0 (N short)" instead of a negative number.
- The turn-order line now reads "You're N🐟 further along the track — X acts first".
- Every player gets a game-over breakdown.
- Hand cards are capped at 220px, so they no longer balloon at game over.
- The affordability pills hang *below* the cost labels.
- Pawns stacked on one space overlap so four fit in the track row.
- The doubled draft emoji is gone.
- The turn marker now reads "— X's turn (at N🐟)".
- Refill lines use the wildcard label ("Clay/Mud wild").
- The starter draft fits in one row.
- The jam explanation now uses the rulebook's "bid minus the overbid" math.

**Docs:**
- Rulebook p.6: structure deck 49 → **50**.
- Rulebook p.16: Vines demand → `2(1x) 7(2x) 5(3x) 2(4x) = 39`.
- Strategy guide: added a 4P note to the Flotsam section.
- PDFs rebuilt with page counts unchanged (16 / 11).
- Strategy guide, Vines: "Vines look like Clay's twin — another low-demand specialty" became "Vines draw about as much demand as reeds or mud — far more than clay". The material table's "How contested" for vines went Low → Middle, since demand is now 39, next to reeds 40 and mud 41, where clay is 28.

**Checked while fixing, no inconsistency:** Salmon Run and Tow Line (once-per-game) consume the turn in all three implementations. In BGA, `SalmonRun.php` and `TowLine.php` both end in `NextPlayer`. The `pending_ability_free` flag is only read by the generic `AbilityTarget` state. The card text ("Once per game (flip card): …") doesn't say it's your action, so consider "Once per game, as your action (flip card): …".
