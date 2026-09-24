#!/usr/bin/env node
// Oracle for Rules\BuildCost::effective (the build-time material-cost modifiers:
// Cattail Marsh / Charcoal Pit / Stone Tool / Treaty Stone / Granary).
// effectiveBuildCost() and its wild-aware helpers below are copied VERBATIM from
// sim.js (~line 1025), with hasEffect()/p.*Used rewired to a plain flag bag so
// the fixture is pure and deterministic (seeded). Since 2026-09-23 the vectors
// also carry wild pools (Driftwood Tangle / Mud Slick / Bramble Shoal), which
// the substitutions may now draw on.
//
//   node gen_buildcost_vectors.js > ../fixtures/buildcost_vectors.json

const MAT_KEYS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];

function hasEffect(p, name) { return !!p.effects[name]; }

// ---- verbatim from sim.js (wildRemainder, wildShortfall, bestSubstitution, effectiveBuildCost) ----
function wildRemainder(deficits, pools) {
  const rem = { ...deficits };
  for (const pool of pools) {
    let avail = pool.count;
    if (avail === 0) continue;
    const sorted = pool.materials.slice().sort((a, b) => (rem[b] || 0) - (rem[a] || 0));
    for (const m of sorted) {
      if (avail === 0) break;
      const need = rem[m] || 0;
      if (need === 0) continue;
      const take = Math.min(avail, need);
      rem[m] -= take;
      avail -= take;
    }
  }
  return rem;
}

function wildShortfall(eff, wbm) {
  const deficits = {};
  for (const m in eff) {
    const d = Math.max(0, eff[m] - (wbm[m] || 0));
    if (d > 0) deficits[m] = d;
  }
  const rem = wildRemainder(deficits, wbm._wildPools || []);
  let short = 0;
  for (const m in rem) short += Math.max(0, rem[m]);
  return short;
}

function bestSubstitution(eff, wbm, trials) {
  let best = null, bestShort = wildShortfall(eff, wbm);
  for (const t of trials) {
    const s = wildShortfall(t, wbm);
    if (s < bestShort) { bestShort = s; best = t; }
  }
  return best;
}

function effectiveBuildCost(struct, p, wbm) {
  const eff = {};
  for (const m in struct.cost) eff[m] = struct.cost[m];
  if (hasEffect(p, 'Cattail Marsh') && eff.reeds) {
    eff.reeds = Math.ceil(eff.reeds / 2);
  }
  if (hasEffect(p, 'Charcoal Pit')) {
    // No fixed-clay slack gate: clay held on a wildcard (Mud Slick) counts
    // too, and bestSubstitution's wild-aware shortfall already rejects a trial
    // the pools can't pay (2026-09-23 3P playtest #6: 5 Mud Slick workers +
    // Charcoal Pit couldn't build Flush Channel).
    const pick = bestSubstitution(eff, wbm, Object.keys(struct.cost)
      .filter(m => m !== 'clay' && eff[m] > 0)
      .map(m => ({ ...eff, [m]: eff[m] - 1, clay: (eff.clay || 0) + 1 })));
    if (pick) Object.assign(eff, pick);
  }
  // Stone Tool (otter species starter): once-per-game Charcoal-Pit variant —
  // 1 Stones worker may substitute for any other material on a build.
  let stoneToolUsed = false;
  if (hasEffect(p, 'Stone Tool') && !p.stoneToolUsed) {
    // Wild stones (Bramble Shoal) count too — see Charcoal Pit.
    const pick = bestSubstitution(eff, wbm, Object.keys(struct.cost)
      .filter(m => m !== 'stones' && eff[m] > 0)
      .map(m => ({ ...eff, [m]: eff[m] - 1, stones: (eff.stones || 0) + 1 })));
    if (pick) { Object.assign(eff, pick); stoneToolUsed = true; }
  }
  // Treaty Stone: once per build, cover 1 missing of one material by paying
  // 2 of a surplus material (any-to-any). Applied after free 1:1 saves
  // (Charcoal Pit) so it only fires when a real deficit remains.
  if (hasEffect(p, 'Treaty Stone')) {
    const trials = [];
    for (const target of MAT_KEYS) {
      if (!(eff[target] > 0)) continue;
      // Any source: bestSubstitution only takes a trial the fixed + wild
      // holdings can actually pay (wild surplus counts, as for Charcoal Pit).
      for (const source of MAT_KEYS) {
        if (source === target) continue;
        trials.push({ ...eff, [target]: eff[target] - 1, [source]: (eff[source] || 0) + 2 });
      }
    }
    const pick = bestSubstitution(eff, wbm, trials);
    if (pick) Object.assign(eff, pick);
  }
  let granaryUsed = false;
  if (hasEffect(p, 'Granary') && !p.granaryUsed) {
    // Aim at a real (post-wildcard) shortfall first. With none, keep the old
    // first-fixed-deficit pick: there Granary saves a wild worker the build
    // would otherwise spend (the web asks a human first — see performBuild).
    let pick = bestSubstitution(eff, wbm, Object.keys(eff)
      .filter(m => eff[m] > 0)
      .map(m => ({ ...eff, [m]: eff[m] - 1 })));
    if (!pick) {
      const m = Object.keys(eff).find(k => (wbm[k] || 0) < eff[k]);
      if (m) pick = { ...eff, [m]: eff[m] - 1 };
    }
    if (pick) { Object.assign(eff, pick); granaryUsed = true; }
  }
  return { eff, granaryUsed, stoneToolUsed };
}

let seed = 0x12345678;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

const WILD_PAIRS = [['logs', 'reeds'], ['clay', 'mud'], ['stones', 'vines']];
const EFFECT_NAMES = ['Cattail Marsh', 'Charcoal Pit', 'Stone Tool', 'Treaty Stone', 'Granary'];
const FLAG_KEY = {
  'Cattail Marsh': 'cattailMarsh', 'Charcoal Pit': 'charcoalPit',
  'Stone Tool': 'stoneTool', 'Treaty Stone': 'treatyStone', 'Granary': 'granary',
};

const vectors = [];
for (let v = 0; v < 600; v++) {
  // 1..3 distinct materials in the cost, each 1..6.
  const cost = {};
  const nMats = 1 + ri(3);
  const shuffled = MAT_KEYS.slice().sort(() => rnd() - 0.5);
  for (let i = 0; i < nMats; i++) cost[shuffled[i]] = 1 + ri(6);

  const wbm = {};
  for (const m of MAT_KEYS) { const c = ri(9); if (c) wbm[m] = c; }
  // Wild pools on about half the vectors; sparser fixed holdings there so the
  // pools actually decide something.
  const pools = [];
  if (rnd() < 0.5) {
    for (const m of MAT_KEYS) if (wbm[m] && rnd() < 0.5) delete wbm[m];
    const nPools = 1 + ri(2);
    for (let k = 0; k < nPools; k++) {
      pools.push({ materials: WILD_PAIRS[ri(WILD_PAIRS.length)].slice(), count: 1 + ri(6) });
    }
  }
  wbm._wildPools = pools;

  const effects = {};
  for (const name of EFFECT_NAMES) if (rnd() < 0.5) effects[name] = true;
  const stoneToolUsed = rnd() < 0.4;
  const granaryUsed = rnd() < 0.4;

  const p = { effects, stoneToolUsed, granaryUsed };
  const out = effectiveBuildCost({ cost }, p, wbm);

  const flags = { stoneToolUsed, granaryUsed };
  for (const name of EFFECT_NAMES) flags[FLAG_KEY[name]] = !!effects[name];

  delete wbm._wildPools;
  vectors.push({ cost, wbm, pools, flags, eff: out.eff, granaryUsed: out.granaryUsed, stoneToolUsed: out.stoneToolUsed });
}
process.stdout.write(JSON.stringify(vectors));
