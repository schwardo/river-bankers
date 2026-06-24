#!/usr/bin/env node
// Oracle for Rules\Scoring::pairVP (the leftover-worker pair scoring with wild
// pools). pairVP() below mirrors sim.js endgamePairVP (~line 602) verbatim:
// each wild pool's units are split to maximize total pairs, then floor(/2) per
// material. Deterministic (seeded) => stable fixture.
//
//   node gen_pairvp_vectors.js > ../fixtures/pairvp_vectors.json

const MATS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];

function pairVP(fixed, wildPools) {
  const counts = {};
  for (const m of MATS) counts[m] = fixed[m] || 0;
  for (const pool of wildPools) {
    const [a, b] = pool.materials;
    let best = -1, bestX = 0;
    for (let x = 0; x <= pool.count; x++) {
      const pairs = Math.floor((counts[a] + x) / 2) + Math.floor((counts[b] + (pool.count - x)) / 2);
      if (pairs > best) { best = pairs; bestX = x; }
    }
    counts[a] += bestX;
    counts[b] += pool.count - bestX;
  }
  let vp = 0;
  for (const m of MATS) vp += Math.floor(counts[m] / 2);
  return vp;
}

let seed = 0x9e3779b9;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

const WILD_PAIRS = [['logs', 'reeds'], ['mud', 'clay']];
const vectors = [];
for (let v = 0; v < 400; v++) {
  const fixed = {};
  for (const m of MATS) { const c = ri(6); if (c) fixed[m] = c; }
  const wildPools = [];
  for (const pair of WILD_PAIRS) {
    if (rnd() < 0.5) wildPools.push({ materials: pair, count: 1 + ri(5) });
  }
  vectors.push({ fixed, wildPools, expected: pairVP(fixed, wildPools) });
}
process.stdout.write(JSON.stringify(vectors));
