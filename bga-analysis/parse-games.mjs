// Normalize cached raw BGA downloads into comparison-ready files:
//   data/games.jsonl    — one rich record per game
//   data/games.csv      — flat per-game row, columns named to match sim `emit`
//   data/players.csv     — one row per (game, player)
//
// Two sources per game, each used for what it's authoritative about:
//   * tableinfos stats  — the server's own end-of-game counters (turns,
//     auctions_triggered, jammed/plenty/fully_jammed, structures_built,
//     icons_won, fish_spent). These match the sim metric definitions directly.
//   * notification log  — the public replay stream. We use it for the two things
//     the stats don't give cleanly: no-bid auctions (a jam/plenty stat can't tell
//     "everyone sent 0 workers") and the final VP array (for spread/margin). We
//     also recompute the auction breakdown from the stream as a cross-check.
//
// The BGA stat block shape varies across framework versions, so extractStats()
// searches defensively by the stat NAMES defined in bga/stats.jsonc. Verify the
// numbers against one known table (see README) and tighten if needed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'data', 'raw');
const DATA = path.join(HERE, 'data');

// stat name (as in bga/stats.jsonc) → our normalized field.
const STAT_NAMES = {
  'Turns played': 'turns',
  'Fish spent': 'fishSpent',
  'Structures built': 'cardsBuilt',
  'Auctions held': 'auctions',
  'Auctions triggered': 'auctionsTriggered', // per-player variant
  'Auctions won (>=1 icon)': 'auctionsWon',
  'Material icons won': 'iconsWon',
  'Auctions with plenty (no overbid)': 'plentyAuctions',
  'Jammed auctions (overbid)': 'jamAuctions',
  'Auctions won by nobody': 'noWinnerAuctions',
  'Invent actions': 'invents',
  'Headwaters flushes': 'flushes',
  'Abilities used': 'abilitiesUsed',
};

const KNOWN_NOTIFS = new Set([
  'auctionStarted', 'auctionBids', 'auctionResolved', 'build', 'turnInfo',
  'retire', 'invent', 'flush', 'defer', 'abilityUsed', 'finalScores', 'shorelinePenalty',
]);

// --- generic helpers on unknown-shaped BGA JSON --------------------------------

// Depth-first collect every object that looks like a notification packet: has a
// string `type` in our known set and a `.args` object. BGA nests these under
// data.data[].data[] (varies), so we just walk everything.
function collectNotifs(node, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (typeof node.type === 'string' && KNOWN_NOTIFS.has(node.type) && node.args && typeof node.args === 'object') {
    out.push({ type: node.type, args: node.args });
  }
  if (Array.isArray(node)) { for (const v of node) collectNotifs(v, out); }
  else { for (const v of Object.values(node)) collectNotifs(v, out); }
  return out;
}

// Depth-first: find every node that carries a stat `name` we recognise together
// with a numeric `value`. Returns [{name, value, pid?}] — pid captured when the
// stat node (or an ancestor key) identifies a player.
function collectStats(node, out = [], pidHint = null) {
  if (node == null || typeof node !== 'object') return out;
  if (typeof node.name === 'string' && STAT_NAMES[node.name] != null && node.value != null && !Number.isNaN(Number(node.value))) {
    out.push({ field: STAT_NAMES[node.name], value: Number(node.value), pid: pidHint });
  }
  const entries = Array.isArray(node) ? node.map((v, i) => [i, v]) : Object.entries(node);
  for (const [k, v] of entries) {
    // If a key looks like a player id (all digits, > 6 chars is a BGA id), pass it down.
    const nextPid = /^\d{5,}$/.test(String(k)) ? String(k) : pidHint;
    collectStats(v, out, nextPid);
  }
  return out;
}

// --- extraction ----------------------------------------------------------------

function extractPlayers(info) {
  // tableinfos players live under data.players (map pid→{id,name,score,...}) in
  // most versions; fall back to a deep search for a players-like map.
  const p = info?.data?.players ?? info?.players;
  if (p && typeof p === 'object') {
    return Object.values(p).map((x) => ({
      pid: String(x.id ?? x.player_id ?? ''),
      name: String(x.name ?? x.player_name ?? ''),
      score: x.score != null ? Number(x.score) : null,
      rank: x.gamerank != null ? Number(x.gamerank) : (x.rank != null ? Number(x.rank) : null),
    })).filter((x) => x.pid);
  }
  return [];
}

// Final VP per player, preferring the finalScores packet (authoritative VP,
// pre-tiebreak) and falling back to the tableinfos player score.
function extractScores(notifs, players) {
  const fs2 = [...notifs].reverse().find((n) => n.type === 'finalScores');
  if (fs2?.args?.scores && Array.isArray(fs2.args.scores)) {
    return fs2.args.scores.map((s) => ({
      pid: String(s.playerId ?? s.player_id ?? ''),
      total: Number(s.total ?? 0),
    }));
  }
  return players.map((p) => ({ pid: p.pid, total: p.score ?? 0 }));
}

// Reconstruct auction outcomes from the stream. Each auction is one auctionBids
// packet (jam iff overbid>0) followed by one auctionResolved per bidder. We
// segment resolves by the preceding bids packet.
function reconstructAuctions(notifs) {
  let auctions = 0, jam = 0, plenty = 0, noBid = 0, noWinner = 0, iconsWon = 0;
  let curBidSum = null, curMaxClinch = 0, curOpen = 0;
  const flush = () => {
    if (curBidSum == null) return;
    auctions++;
    if (curBidSum === 0) noBid++;
    else if (curMaxClinch === 0) noWinner++;
  };
  for (const n of notifs) {
    if (n.type === 'auctionBids') {
      flush();
      const bidsStr = String(n.args.bids ?? '');
      let sum = 0; for (const m of bidsStr.matchAll(/sends\s+(\d+)\s+worker/g)) sum += Number(m[1]);
      curBidSum = sum;
      curMaxClinch = 0;
      curOpen = Number(n.args.open ?? 0);
      if (Number(n.args.overbid ?? 0) > 0) jam++; else plenty++;
    } else if (n.type === 'auctionResolved') {
      const got = Number(n.args.n ?? 0);
      iconsWon += got;
      if (got > curMaxClinch) curMaxClinch = got;
    }
  }
  flush();
  return { auctions, jam, plenty, noBid, noWinner, iconsWon };
}

function parseGame(tableId) {
  const infoPath = path.join(RAW, `${tableId}.tableinfos.json`);
  const logPath = path.join(RAW, `${tableId}.log.json`);
  const info = fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, 'utf8')) : null;
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : null;
  const hasLog = !!log;

  const players = info ? extractPlayers(info) : [];
  const notifs = log ? collectNotifs(log) : [];
  const stream = reconstructAuctions(notifs);
  const scores = extractScores(notifs, players);
  const numP = players.length || null;

  // Authoritative server stats (best-effort by name), split table vs per-player.
  const statNodes = info ? collectStats(info) : [];
  const tableStat = {};
  const playerStat = {}; // pid → {field: value}
  for (const s of statNodes) {
    if (s.pid) { (playerStat[s.pid] ??= {})[s.field] = s.value; }
    else if (tableStat[s.field] == null) tableStat[s.field] = s.value;
  }

  // Prefer server stats; fall back to stream reconstruction where a stat is absent.
  const g = (statField, streamVal) => (tableStat[statField] != null ? tableStat[statField] : streamVal);

  const vps = scores.map((s) => s.total).sort((a, b) => b - a);
  const rec = {
    tableId: String(tableId),
    hasLog,
    numP,
    workers: null, // RB uses a fixed starting worker count; not exposed per-table. Left null.
    date: info?.data?.result?.time_end ?? info?.data?.gamestart ?? null,
    // Aggregate metrics (aligned to sim `emit` field names)
    turns: g('turns', null),
    auctions: g('auctions', stream.auctions),
    jamAuctions: g('jamAuctions', stream.jam),
    plentyAuctions: g('plentyAuctions', stream.plenty),
    noBidAuctions: stream.noBid,               // stream-only (no server stat)
    noWinnerAuctions: g('noWinnerAuctions', stream.noWinner),
    cardsBuilt: g('cardsBuilt', null),
    iconsWon: g('iconsWon', stream.iconsWon),
    fishSpent: g('fishSpent', null),
    // Scoring
    winnerVP: vps[0] ?? null,
    runnerUpVP: vps.length > 1 ? vps[1] : null,
    loserVP: vps.length ? vps[vps.length - 1] : null,
    vpSpread: vps.length ? vps[0] - vps[vps.length - 1] : null,
    winMargin: vps.length > 1 ? vps[0] - vps[1] : (vps[0] ?? null),
    totalVP: vps.reduce((s, x) => s + x, 0) || null,
    players: players.map((p) => {
      const sc = scores.find((s) => s.pid === p.pid);
      return { ...p, finalVP: sc ? sc.total : p.score, stats: playerStat[p.pid] || {} };
    }),
    // Stream cross-check (helps spot stat-shape problems during verification).
    _stream: stream,
  };
  return rec;
}

// --- CSV ------------------------------------------------------------------------

const GAME_COLS = ['tableId', 'date', 'numP', 'workers', 'turns', 'auctions', 'jamAuctions',
  'plentyAuctions', 'noBidAuctions', 'noWinnerAuctions', 'cardsBuilt', 'iconsWon', 'fishSpent',
  'winnerVP', 'runnerUpVP', 'loserVP', 'vpSpread', 'winMargin', 'totalVP', 'hasLog'];
const PLAYER_COLS = ['tableId', 'pid', 'name', 'rank', 'finalVP', 'auctionsTriggered',
  'auctionsWon', 'iconsWon', 'invents', 'flushes', 'abilitiesUsed', 'fishSpent'];

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cols, obj) => cols.map((c) => csvCell(obj[c])).join(',');

function main() {
  if (!fs.existsSync(RAW)) { console.error(`No ${RAW}. Run: node fetch-games.mjs`); process.exit(1); }
  const ids = [...new Set(fs.readdirSync(RAW)
    .map((f) => (f.match(/^(\d+)\.tableinfos\.json$/) || [])[1])
    .filter(Boolean))];
  if (!ids.length) { console.error('No cached tableinfos in data/raw/. Run fetch-games.mjs first.'); process.exit(1); }

  const games = ids.map(parseGame);
  fs.mkdirSync(DATA, { recursive: true });

  fs.writeFileSync(path.join(DATA, 'games.jsonl'), games.map((g) => JSON.stringify(g)).join('\n') + '\n');
  fs.writeFileSync(path.join(DATA, 'games.csv'),
    [GAME_COLS.join(','), ...games.map((g) => csvRow(GAME_COLS, g))].join('\n') + '\n');
  const prows = games.flatMap((g) => g.players.map((p) => csvRow(PLAYER_COLS,
    { tableId: g.tableId, ...p, ...p.stats })));
  fs.writeFileSync(path.join(DATA, 'players.csv'), [PLAYER_COLS.join(','), ...prows].join('\n') + '\n');

  const withLog = games.filter((g) => g.hasLog).length;
  console.log(`Parsed ${games.length} game(s) (${withLog} with a full log).`);
  console.log(`Wrote data/games.jsonl, data/games.csv, data/players.csv`);
  console.log(`Next: node compare.mjs`);
}

main();
