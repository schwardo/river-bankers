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
```

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
