#!/usr/bin/env node
// Oracle for Rules\Effects::perItemForPlayer (per-player per-item auction cost,
// incl. the 2026-09-23 wildcard rule: either half's discount applies, the larger
// one if both do). playerCardCost() below is copied VERBATIM from sim.js
// (~line 227), with cardCost()/hasEffect() rewired to plain inputs so the
// fixture is pure. Exhaustive (no RNG): every card shape x every subset of the
// discounter cards x base rate 1..5.
//
//   node gen_peritem_vectors.js > ../fixtures/peritem_vectors.json

const MATERIAL_DISCOUNT_CARDS = {
  reeds: { 'Reed Bed': 1, 'Kelp Bed': 1 },
  mud:   { 'Mud Burrow': 1 },
  clay:  { 'Clay Den': 2 },
};
function cardCost(card) { return card.base; }
function hasEffect(p, name) { return p.built.includes(name); }

// ---- verbatim from sim.js playerCardCost ----
function playerCardCost(state, card, playerIdx) {
  const base = cardCost(card);
  const p = state.players[playerIdx];
  const mats = card.wildAlt ? [card.material, card.wildAlt] : [card.material];
  let best = 0;
  for (const m of mats) {
    const discounters = MATERIAL_DISCOUNT_CARDS[m] || {};
    let total = 0;
    for (const name in discounters) {
      if (hasEffect(p, name)) total += discounters[name];
    }
    best = Math.max(best, total);
  }
  return Math.max(1, base - best);
}
// ---- end verbatim ----

const SHAPES = [
  ['logs', null], ['stones', null], ['reeds', null], ['mud', null], ['vines', null], ['clay', null],
  ['logs', 'reeds'],   // Driftwood Tangle
  ['clay', 'mud'],     // Mud Slick
  ['stones', 'vines'], // Bramble Shoal
];
const DISCOUNTERS = ['Reed Bed', 'Kelp Bed', 'Mud Burrow', 'Clay Den'];
const out = [];
for (const [material, wildAlt] of SHAPES) {
  for (let mask = 0; mask < (1 << DISCOUNTERS.length); mask++) {
    const built = DISCOUNTERS.filter((_, i) => mask & (1 << i));
    for (let base = 1; base <= 5; base++) {
      const state = { players: [{ built }] };
      const card = { material, wildAlt, base };
      out.push({ base, material, wildAlt, built, expected: playerCardCost(state, card, 0) });
    }
  }
}
process.stdout.write(JSON.stringify(out) + '\n');
