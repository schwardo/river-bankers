# River Bankers — BGA game analysis

Download every River Bankers game we've played on **live BoardGameArena** (stats +
full turn-by-turn logs) and compare them against the `sim.js` simulator's
predictions. Answers: are auctions jamming as often as the model says? Are games
as long, scores as spread, as predicted?

Everything is plain Node (no deps) writing JSON/CSV. Downloaded data and the
secret config are gitignored.

## One-time setup

1. `cp config.example.json config.json`
2. Fill in `config.json` (it's gitignored):
   - **`cookie`** — from a logged-in boardgamearena.com session: DevTools →
     Network → click any request → Request Headers → copy the entire `Cookie:`
     header value. Sessions expire; re-paste when you get an auth error.
   - **`playerId`** — your numeric BGA id (your profile URL is `/player/<id>`).
   - **`gameId`** — River Bankers' numeric game id on the live site (visible in a
     table's `tableinfos` response, or the game panel URL).
   - **`requestToken`** — usually leave empty; only set it (from any XHR's
     `X-Request-Token` header) if `fetch-games.mjs` reports a token error.

## Run order

```bash
# 1. Download (idempotent — cached games are skipped). Verify auth on one table first:
node fetch-games.mjs --only 879420758
node fetch-games.mjs                 # then all of my finished RB games

# 2. Normalize raw → comparison-ready files
node parse-games.mjs                 # writes data/games.jsonl, games.csv, players.csv

# 3. Compare real games to the sim
node compare.mjs                     # prints a table, writes data/comparison.md
node histogram.mjs                   # writes data/histograms.html — sim distribution + actual games overlaid
```

**CPU throttling:** to run the (CPU-heavy) sim under a cap, set `SIM_CPULIMIT=<pct>`
— `compare.mjs`/`histogram.mjs` then throttle each `sim.js emit` child through
`cpulimit` individually. Do **not** wrap these scripts in an outer
`cpulimit -m` yourself: cpulimit 3.0's fork-monitor segfaults ~40% of the time
when it wraps a parent that spawns children (these scripts spawn one sim per
player-count). Per-child throttling avoids the fork churn that crashes it.

```bash
SIM_CPULIMIT=50 NAIVE_BID=1 RECALL_RELUCTANCE=0.7 node compare.mjs   # ablation-safe
```

`histogram.mjs` builds a self-contained page: one section per player-count, teal
bars = the simulated distribution, amber line = each actual BGA game, `z` = how
many sim standard deviations the real value sits from the sim mean. Open
`data/histograms.html` in any browser (or the console's file preview).

## Baseline models

The sim has **two** calibrated models of real play, defined in sim.js under
"BASELINE PROFILES". Both are fitted to the same six BGA games and match them
about equally well; they differ in which human behaviour they credit for the
match, so a rules change that looks safe under only one has not really been
tested.

| | `--friendly` | `--greedy` |
|---|---|---|
| Opponent read | rivals take ~1 icon each | rivals probably stay out (10th pct) |
| Workers | liquid — recall freely | committed — only building returns them |
| Ingredients | `COST_AVERSION=0`, `OVERBID {2:0.3, 3:0, 4:0}` | `NO_RECALL`, `RANDOM_OPP`, `OPP_Q=0.1` |
| Known gap | jams under-matched (2P, 3P); 4P runs long | 2P jams under-matched |

They are **alternatives, not layers** — stacking `--greedy` onto `--friendly`
over-fires at 4P. `--human` is the pre-2026-07-30 name for `--friendly` and
still works.

`histogram.mjs` generates every **model × first-mover-advantage** combination
(4 variants, 12 sim runs) and puts two combo boxes on the page to switch between
them; `RB_PROFILE` / `RB_NO_CONSOLATION` only choose which variant it opens on.
`compare.mjs` runs one at a time and prints which:

```bash
node compare.mjs                      # friendly (default)
RB_PROFILE=greedy node compare.mjs    # greedy
RB_PROFILE=default node compare.mjs   # untuned AI
```

**Sample caveat:** n=2 real games per player-count, so treat every fit as
provisional.

**First-mover advantage matters more than it looks.** All six real games predate
the initiator-consolation rule, while live BGA play uses it — so with the rule
ON, part of any divergence is the rule change rather than model error, and with
it OFF the sim reproduces a ruleset that no longer exists. Neither view is the
"true" one, which is why the page carries both. Measured effect on the number of
diverging metrics (|z| ≥ 2), 4000 sim games per variant:

| | consolation ON (live) | consolation OFF (legacy) |
|---|---|---|
| `friendly` | 16 | 5 |
| `greedy` | 4 | 2 |

`friendly` degrades badly under the live rule (3P and 4P go from clean to every
metric diverging); `greedy` barely moves. That robustness is the main practical
argument for `greedy` as the model to trust going forward — but note the honest
confound: these six games were played under the legacy rule, so the OFF column is
the like-for-like comparison and the ON column mixes model error with rule
change. This resolves once post-rule games are logged.

The sim side is driven by a mode added to `../sim.js`:

```bash
node ../sim.js emit 3 8 1000         # 1000 3P/8-worker games as JSONL (one metrics obj per line)
```

`compare.mjs` calls this automatically (with the sim's default worker count per
player-count) — you only run it directly to inspect the raw sim distribution.

## Files

| File | Role |
|---|---|
| `bga-client.mjs` | Authenticated GET wrapper + the three BGA endpoints |
| `fetch-games.mjs` | List my tables → download tableinfos + log → `data/raw/` |
| `parse-games.mjs` | Raw → `games.jsonl` / `games.csv` / `players.csv` |
| `compare.mjs` | Real vs. sim table + `data/comparison.md` |
| `config.json` | Secret (gitignored): cookie + ids |
| `data/` | All downloads and outputs (gitignored) |

## Metric mapping (BGA ↔ sim)

`parse-games.mjs` emits columns named to match the sim's `emit` output, so
`compare.mjs` lines them up directly:

| Field | Real source (BGA) | Sim (`metrics`) | Notes |
|---|---|---|---|
| `turns` | stat *Turns played* | `turns` | |
| `auctions` | stat *Auctions held* | `auctions` | |
| `jamAuctions` | stat *Jammed auctions* | `jamAuctions` | overbid > 0 |
| `plentyAuctions` | stat *Auctions with plenty* | `plentyAuctions` | |
| `noBidAuctions` | **stream** (bids all 0) | `noBidAuctions` | no BGA stat exists |
| `noWinnerAuctions` | stat *Auctions won by nobody* | `zeroClinchAuctions` | bids>0, nobody clinched |
| `cardsBuilt` | stat *Structures built* | `cardsBuilt` | |
| `iconsWon` | stat *Material icons won* | `iconsClaimed` | |
| `fishSpent` | stat *Fish spent* | (fish advanced) | |
| `winnerVP`/`vpSpread`/… | `finalScores` packet | same | winner/last from the score array |

**Why `noBidAuctions` comes from the stream:** BGA's *Auctions won by nobody*
counts jams where nobody clinched an icon — that is **not** the same as an auction
where everyone sent 0 workers. The sim tracks those separately
(`noBidAuctions` vs `zeroClinchAuctions`), so we recompute the no-bid case by
parsing the `auctionBids` event's worker counts.

## Notes / caveats

- BGA has no public API; `bga-client.mjs` calls the site's internal endpoints. If
  BGA changes a path or response envelope, fix it there (one place). The stat
  block shape in `tableinfos` in particular varies by framework version —
  `parse-games.mjs` searches for stats by their `stats.jsonc` names and falls back
  to stream reconstruction, and each game's `_stream` field in `games.jsonl` lets
  you sanity-check the server stats against the recomputed auction counts.
- Real RB tables don't expose a per-table starting-worker option, so `workers` is
  recorded null and the sim baseline uses its default worker count per
  player-count. Comparison is grouped by player-count only.
- If a game's replay log can't be fetched, its `tableinfos` still parses and the
  record is marked `hasLog: false` (no-bid/VP-from-stream may be absent for it).
