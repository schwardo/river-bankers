#!/usr/bin/env node
// Oracle for the PHP Auction resolver (bga/modules/php/Rules/Auction.php).
//
// The allocation + billable logic below is copied VERBATIM (in its two-variable
// form) from games/river-bankers/sim.js resolveAuction — jam branch ~line 1490,
// Pontoon ~line 1496 — so the PHP port is cross-checked against sim.js's actual
// formula, not a paraphrase. Emits a DETERMINISTIC set of vectors as JSON to
// stdout (seeded PRNG => stable committed fixture).
//
//   node gen_auction_vectors.js > ../fixtures/auction_vectors.json

// --- sim.js formula (verbatim core) ---------------------------------------
function clinch(open, bids) {
  const total = bids.reduce((s, b) => s + b, 0);
  if (total === 0) return bids.map(() => 0);
  if (total <= open) return bids.slice();              // plenty
  return bids.map((bid) => {                            // jam (sim.js:1490)
    const others = total - bid;
    return Math.max(0, Math.min(bid, open - others));
  });
}
function billable(open, bids, pontoon) {
  const got = clinch(open, bids);
  return bids.map((bid, i) =>
    pontoon[i] && got[i] < bid ? Math.max(0, bid - 1) : bid); // sim.js:1496
}

// --- deterministic PRNG (LCG) so the fixture is stable across runs ---------
let seed = 0x1234abcd;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

const vectors = [];
for (let i = 0; i < 500; i++) {
  const open = ri(9);                                   // 0..8 icons
  const np = 2 + ri(3);                                 // 2..4 bidders
  const bids = Array.from({ length: np }, () => ri(7)); // 0..6 workers each
  const pontoon = Array.from({ length: np }, () => rnd() < 0.25);
  vectors.push({
    open, bids, pontoon,
    clinched: clinch(open, bids),
    billable: billable(open, bids, pontoon),
  });
}
process.stdout.write(JSON.stringify(vectors));
