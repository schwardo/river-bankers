#!/usr/bin/env node
// Oracle for Rules\BuildCost::effective (the build-time material-cost modifiers:
// Cattail Marsh / Charcoal Pit / Stone Tool / Treaty Stone / Granary).
// effectiveBuildCost() below is copied VERBATIM from sim.js (~line 749), with
// hasEffect()/p.*Used rewired to a plain flag bag so the fixture is pure and
// deterministic (seeded).
//
//   node gen_buildcost_vectors.js > ../fixtures/buildcost_vectors.json

const MAT_KEYS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];

function hasEffect(p, name) { return !!p.effects[name]; }

// ---- verbatim from sim.js effectiveBuildCost ----
function effectiveBuildCost(struct, p, wbm) {
  const eff = {};
  for (const m in struct.cost) eff[m] = struct.cost[m];
  if (hasEffect(p, 'Cattail Marsh') && eff.reeds) {
    eff.reeds = Math.ceil(eff.reeds / 2);
  }
  if (hasEffect(p, 'Charcoal Pit')) {
    const claySlack = (wbm.clay || 0) - (eff.clay || 0);
    if (claySlack >= 1) {
      for (const m of Object.keys(struct.cost)) {
        if (m === 'clay') continue;
        if ((wbm[m] || 0) < eff[m]) {
          eff[m] -= 1;
          eff.clay = (eff.clay || 0) + 1;
          break;
        }
      }
    }
  }
  let stoneToolUsed = false;
  if (hasEffect(p, 'Stone Tool') && !p.stoneToolUsed) {
    const stoneSlack = (wbm.stones || 0) - (eff.stones || 0);
    if (stoneSlack >= 1) {
      for (const m of Object.keys(struct.cost)) {
        if (m === 'stones') continue;
        if ((wbm[m] || 0) < eff[m]) {
          eff[m] -= 1;
          eff.stones = (eff.stones || 0) + 1;
          stoneToolUsed = true;
          break;
        }
      }
    }
  }
  if (hasEffect(p, 'Treaty Stone')) {
    for (const target of MAT_KEYS) {
      if ((wbm[target] || 0) >= (eff[target] || 0)) continue;
      let found = false;
      for (const source of MAT_KEYS) {
        if (source === target) continue;
        if ((wbm[source] || 0) - (eff[source] || 0) < 2) continue;
        eff[target] -= 1;
        eff[source] = (eff[source] || 0) + 2;
        found = true;
        break;
      }
      if (found) break;
    }
  }
  let granaryUsed = false;
  if (hasEffect(p, 'Granary') && !p.granaryUsed) {
    for (const m of Object.keys(eff)) {
      if ((wbm[m] || 0) < eff[m]) {
        eff[m] -= 1;
        granaryUsed = true;
        break;
      }
    }
  }
  return { eff, granaryUsed, stoneToolUsed };
}

let seed = 0x12345678;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }

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

  const effects = {};
  for (const name of EFFECT_NAMES) if (rnd() < 0.5) effects[name] = true;
  const stoneToolUsed = rnd() < 0.4;
  const granaryUsed = rnd() < 0.4;

  const p = { effects, stoneToolUsed, granaryUsed };
  const out = effectiveBuildCost({ cost }, p, wbm);

  const flags = { stoneToolUsed, granaryUsed };
  for (const name of EFFECT_NAMES) flags[FLAG_KEY[name]] = !!effects[name];

  vectors.push({ cost, wbm, flags, eff: out.eff, granaryUsed: out.granaryUsed, stoneToolUsed: out.stoneToolUsed });
}
process.stdout.write(JSON.stringify(vectors));
