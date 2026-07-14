// Ad-hoc stat: for the viewing player (whose private hand the replay exposes),
// how many MORE units of the auctioned material are they bidding for than they
// still need to complete the cards in their hand?
//
//   excess = workers_bid_on_M  -  max(0, hand_demand_for_M - already_held_M)
//
// Only computable for the logged-in player — opponents' hands and material
// stockpiles are not in the public replay stream.
//
// Usage: node overbid-stat.mjs [tableId] [playerName]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tableId = process.argv[2] || '881098241';
const ME = (process.argv[3] || 'DonSchwarz').toLowerCase();

const log = JSON.parse(fs.readFileSync(path.join(HERE, 'data', 'raw', `${tableId}.log.json`), 'utf8'));
const notifs = [];
(function walk(n) {
  if (n == null || typeof n !== 'object') return;
  if (typeof n.type === 'string' && n.args && typeof n.args === 'object') notifs.push({ type: n.type, args: n.args });
  if (Array.isArray(n)) n.forEach(walk); else Object.values(n).forEach(walk);
})(log);

const norm = (s) => String(s || '').toLowerCase();
const cardCost = {};                 // card_id -> {material: qty}
let hand = [];                       // current hand card ids (viewing player)
const rows = [];

// Demand for a material across the cards currently in hand. Auction cards can
// offer a choice of materials ("logs/reeds"); the player collects one, so we
// take the best (max) single-material demand among the choices.
const demandFor = (matField) => {
  const choices = norm(matField).split(/[\/,]/).map((s) => s.trim()).filter(Boolean);
  return Math.max(0, ...choices.map((M) => hand.reduce((s, id) => s + (cardCost[id]?.[M] || 0), 0)));
};

let cur = null;                      // auction being assembled
const flush = () => { if (cur) rows.push(cur); cur = null; };

for (const n of notifs) {
  const a = n.args;
  switch (n.type) {
    case 'handUpdate':
      for (const c of a.hand) if (c.id != null && c.cost) cardCost[c.id] = c.cost;
      hand = a.hand.map((c) => c.id);
      break;
    case 'auctionStarted': {
      flush();
      cur = { card: a.card_name, mat: norm(a.material), open: a.open, need: demandFor(a.material), myBid: 0, myWon: 0 };
      break;
    }
    case 'auctionBids': {
      if (!cur) break;
      const m = String(a.bids || '').match(new RegExp(`${ME}\\s+sends\\s+(\\d+)\\s+worker`, 'i'));
      cur.myBid = m ? Number(m[1]) : 0;
      break;
    }
    case 'auctionResolved': {
      if (!cur) break;
      if (norm(a.player_name) === ME) cur.myWon = Number(a.n || 0);
      break;
    }
    case 'build':
      if (norm(a.player_name) === ME) hand = hand.filter((id) => id !== a.card_id);
      break;
  }
}
flush();

// excess = workers bid beyond what the hand still demands of that material
for (const r of rows) r.excess = r.myBid - r.need;

const bidRows = rows.filter((r) => r.myBid > 0);
const avg = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0;

console.log(`Table ${tableId} — viewing player: ${ME}`);
console.log(`Auctions: ${rows.length} total, ${bidRows.length} where ${ME} bid >0\n`);
console.log('  #  material    card                open  need  bid  won  excess');
console.log('  ' + '-'.repeat(62));
rows.forEach((r, i) => {
  const f = (v, w) => String(v).padStart(w);
  console.log(`  ${f(i + 1, 2)}  ${r.mat.padEnd(10)} ${(r.card || '').slice(0, 18).padEnd(18)} ${f(r.open, 4)} ${f(r.need, 5)} ${f(r.myBid, 4)} ${f(r.myWon, 4)}  ${f(r.excess, 5)}`);
});
console.log('  ' + '-'.repeat(62));
console.log(`\nExcess = workers bid − units of that material the hand still demands:`);
console.log(`  over ALL ${rows.length} auctions:       avg ${avg(rows, (r) => r.excess).toFixed(2)}  (total ${rows.reduce((s, r) => s + r.excess, 0)})`);
console.log(`  over ${bidRows.length} auctions with bid>0:  avg ${avg(bidRows, (r) => r.excess).toFixed(2)}  (total ${bidRows.reduce((s, r) => s + r.excess, 0)})`);
console.log(`  auctions bid on a material the hand needs 0 of: ${bidRows.filter((r) => r.need === 0).length}`);
