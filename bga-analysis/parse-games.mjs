// Normalize cached raw BGA downloads into comparison-ready files:
//   data/games.jsonl    — one rich record per game
//   data/games.csv      — flat per-game row, columns named to match sim `emit`
//   data/players.csv     — one row per (game, player)
//
// Sources per game:
//   * notification log (archive/logs)  — the PRIMARY source. BGA's tableinfos
//     carries NO stats block, so every aggregate metric (turns, auctions,
//     jam/plenty/no-bid/no-winner, builds, icons, invents, flushes, abilities)
//     is reconstructed from the public replay stream. See reconstructFromStream.
//   * tableinfos                        — metadata only: players (id/fullname/
//     order), final scores + placement on FINISHED tables, game start time,
//     options. Used for names, VP, and the player roster.
//
// Archive logs exist only for FINISHED games; an in-progress table yields
// metadata with hasLog:false and null metrics.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'data', 'raw');
const DATA = path.join(HERE, 'data');

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

// --- extraction ----------------------------------------------------------------

function extractPlayers(info) {
  // tableinfos players live under data.players (map pid→{id,name,score,...}) in
  // most versions; fall back to a deep search for a players-like map.
  const p = info?.data?.players ?? info?.players;
  if (p && typeof p === 'object') {
    return Object.values(p).map((x) => ({
      pid: String(x.id ?? x.player_id ?? ''),
      // BGA tableinfos uses `fullname`; `name` only appears on some endpoints.
      name: String(x.fullname ?? x.name ?? x.player_name ?? ''),
      order: x.table_order != null ? Number(x.table_order) : null,
      // Final VP + finishing place appear only on FINISHED tables. `rank` here is
      // the player's ELO, not their placement — use `gamerank` for placement.
      score: x.score != null ? Number(x.score) : null,
      rank: x.gamerank != null ? Number(x.gamerank) : null,
    })).filter((x) => x.pid);
  }
  return [];
}

// player_id → player_name, harvested from every notif that names a player. Lets
// us build a roster from the log when tableinfos.players is empty (finished
// tables return an empty players array).
function namesByPid(notifs) {
  const map = {};
  for (const n of notifs) {
    const pid = n.args?.player_id;
    const name = n.args?.player_name;
    if (pid != null && name && map[String(pid)] == null) map[String(pid)] = String(name);
  }
  return map;
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
  // p.score is null on unfinished tables → total stays null and is filtered out,
  // so an in-progress game contributes no VP to the comparison.
  return players.map((p) => ({ pid: p.pid, total: p.score != null ? Number(p.score) : null }));
}

// Reconstruct the whole per-game metric set from the notification stream. Since
// tableinfos carries NO stats block, this is the primary (not fallback) source.
// Returns { game: {...aggregate...}, perPlayer: { pid: {...} } }.
//
// Auction segmentation: each auction is one `auctionBids` packet (jam iff
// overbid>0) followed by one `auctionResolved` per bidder; we close out the
// previous auction when the next `auctionBids` (or end of stream) arrives.
function reconstructFromStream(notifs) {
  let turns = 0, auctions = 0, jam = 0, plenty = 0, noBid = 0, noWinner = 0;
  let iconsWon = 0, cardsBuilt = 0, invents = 0, flushes = 0, abilitiesUsed = 0;
  const per = {}; // pid → per-player counters
  const P = (pid) => (per[pid] ??= { auctionsTriggered: 0, auctionsWon: 0, iconsWon: 0, invents: 0, flushes: 0, abilitiesUsed: 0 });

  let curBidSum = null, curMaxClinch = 0;
  const closeAuction = () => {
    if (curBidSum == null) return;
    auctions++;
    if (curBidSum === 0) noBid++;
    else if (curMaxClinch === 0) noWinner++;
  };

  for (const n of notifs) {
    const a = n.args;
    const pid = a.player_id != null ? String(a.player_id) : null;
    switch (n.type) {
      case 'turnInfo': // NextPlayer announces the next actor once per turn
        turns++;
        break;
      case 'auctionStarted':
        if (pid) P(pid).auctionsTriggered++;
        break;
      case 'auctionBids': {
        closeAuction();
        let sum = 0; for (const m of String(a.bids ?? '').matchAll(/sends\s+(\d+)\s+worker/g)) sum += Number(m[1]);
        curBidSum = sum; curMaxClinch = 0;
        if (Number(a.overbid ?? 0) > 0) jam++; else plenty++;
        break;
      }
      case 'auctionResolved': {
        const got = Number(a.n ?? 0);
        iconsWon += got;
        if (got > curMaxClinch) curMaxClinch = got;
        if (pid) { const pp = P(pid); pp.iconsWon += got; if (got > 0) pp.auctionsWon++; }
        break;
      }
      case 'build': // real structure builds carry card_id (draws/Mill-Wheel copies don't)
        if (a.card_id != null) cardsBuilt++;
        break;
      case 'invent':
        invents++; if (pid) P(pid).invents++;
        break;
      case 'flush':
        flushes++; if (pid) P(pid).flushes++;
        break;
      case 'abilityUsed':
        abilitiesUsed++; if (pid) P(pid).abilitiesUsed++;
        break;
    }
  }
  closeAuction();
  return {
    game: { turns, auctions, jam, plenty, noBid, noWinner, iconsWon, cardsBuilt, invents, flushes, abilitiesUsed },
    perPlayer: per,
  };
}

function parseGame(tableId) {
  const infoPath = path.join(RAW, `${tableId}.tableinfos.json`);
  const logPath = path.join(RAW, `${tableId}.log.json`);
  const info = fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, 'utf8')) : null;
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : null;
  const hasLog = !!log;

  const notifs = log ? collectNotifs(log) : [];
  let players = info ? extractPlayers(info) : [];
  const scores = extractScores(notifs, players);
  // Finished tables return an empty tableinfos.players array, so fall back to a
  // roster built from the log: one entry per scored player, named from the notif
  // stream. Placement (rank) comes from VP order.
  if (!players.length && scores.length) {
    const names = namesByPid(notifs);
    const ranked = [...scores].sort((a, b) => b.total - a.total);
    players = ranked.map((sc, i) => ({
      pid: sc.pid, name: names[sc.pid] ?? ('#' + sc.pid), order: null,
      score: sc.total, rank: i + 1,
    }));
  }
  const { game: s, perPlayer } = reconstructFromStream(notifs);
  const numP = players.length || null;

  // Metrics come from the notification stream (tableinfos has no stats block).
  // Without a log we can still record metadata + final scores, but the aggregate
  // metrics are null (hasLog:false).
  const m = (v) => (hasLog ? v : null);

  const vps = scores.map((sc) => sc.total).filter((v) => v != null).sort((a, b) => b - a);
  const rec = {
    tableId: String(tableId),
    hasLog,
    numP,
    workers: null, // RB uses a fixed starting worker count; not exposed per-table.
    date: info?.data?.gamestart ?? null,
    // Aggregate metrics (aligned to sim `emit` field names)
    turns: m(s.turns),
    auctions: m(s.auctions),
    jamAuctions: m(s.jam),
    plentyAuctions: m(s.plenty),
    noBidAuctions: m(s.noBid),
    noWinnerAuctions: m(s.noWinner),
    cardsBuilt: m(s.cardsBuilt),
    iconsWon: m(s.iconsWon),
    fishSpent: null, // not reliably reconstructable from the public stream
    // Scoring (from finalScores packet, else tableinfos player scores)
    winnerVP: vps[0] ?? null,
    runnerUpVP: vps.length > 1 ? vps[1] : null,
    loserVP: vps.length ? vps[vps.length - 1] : null,
    vpSpread: vps.length ? vps[0] - vps[vps.length - 1] : null,
    winMargin: vps.length > 1 ? vps[0] - vps[1] : (vps[0] ?? null),
    totalVP: vps.reduce((sum, x) => sum + x, 0) || null,
    players: players.map((p) => {
      const sc = scores.find((x) => x.pid === p.pid);
      return { ...p, finalVP: sc ? sc.total : p.score, stats: perPlayer[p.pid] || {} };
    }),
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
