#!/usr/bin/env node
// Headless simulator for River Bankers. Sweeps icon-count configurations and
// reports auction outcomes (jam %, waste, game length). All AI; no human.
//
// Ported from web/index.html — same rules and AI heuristics, no DOM/UI.
// Run: node games/river-bankers/sim.js

'use strict';

// =============================================================================
// CONSTANTS
// =============================================================================
// Mirror the live game (web/index.html). 6 base materials with hand-tuned
// structure costs. EXTRA_MATERIALS only used by configureMaterials() for
// testing further additions (e.g., 7-material variants).
const ORIG_MATERIALS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];
const EXTRA_MATERIALS = ['silt', 'bone', 'shells'];
let MAT_KEYS = ORIG_MATERIALS.slice();

// Cards with implemented effects carry an `effect` description (mirrors web/index.html).
// Hooks are keyed off the structure name in helpers below.
// Disable a single card's effect for ablation via setStructureEffectDisabled.
const BASE_STRUCTURE_TEMPLATES = [
  { name: 'Beaver Dam',     cost: { logs: 4, mud: 2 },               time: 2, vp: 6, effect: 'When built, wash one card of your choice from River 1 to the shoreline (workers carry along), and slide back 2 fish.' },
  { name: 'Hollowed-out Log', cost: { logs: 3, reeds: 1 },           time: 2, vp: 4, effect: 'When you pass 0 on the fish track, recall one worker from a river card without dropping a blank.' },
  { name: 'Snag Pile',      cost: { reeds: 2, stones: 1 },           time: 2, vp: 3, effect: 'When built, pull a Headwaters card to River 1 for free; an auction immediately runs on it at 1 fish/item.' },
  { name: 'Heron Watch',    cost: { stones: 4, logs: 2 },            time: 4, vp: 0, effect: 'End game: +1 VP per shoreline card on the table (max +9).' },
  { name: 'Reed Bed',       cost: { reeds: 3, mud: 1 },              time: 2, vp: 4, effect: 'Reed icons cost you 1 less fish per item (min 1).' },
  { name: 'Mud Levee',      cost: { mud: 3, stones: 2 },             time: 3, vp: 6, effect: 'When built, drop 2 blanks on uncovered icons in the river.' },
  { name: 'Otter Slide',    cost: { mud: 2, logs: 1 },               time: 1, vp: 2, effect: 'When you build, advance 3 fewer fish (min 1).' },
  { name: 'Cache Burrow',   cost: { mud: 2, reeds: 2 },              time: 2, vp: 4, effect: 'Your hand size is 4 instead of 3.' },
  { name: 'Vine Lattice',   cost: { vines: 3, reeds: 2 },            time: 3, vp: 5, effect: 'When built, draw 3 structure cards, keep 1, discard 2.' },
  { name: 'Charcoal Pit',   cost: { clay: 4, logs: 2 },              time: 3, vp: 6, effect: 'When building, 1 of your Clay workers may substitute for any other material.' },
  { name: 'Lookout Tree',   cost: { logs: 5, stones: 2 },            time: 4, vp: 8, effect: 'Peek at the top card of the material deck at any time.' },
  { name: 'Pier',           cost: { logs: 3, stones: 2 },            time: 3, vp: 0, effect: 'End game: +2 VP per shoreline card with at least one of your workers.' },
  { name: 'Cattail Marsh',  cost: { reeds: 4, mud: 2 },              time: 3, vp: 6, effect: 'Each Reed worker you spend on a build counts as 2 reeds.' },
  { name: 'Wood Pile',      cost: { logs: 4 },                       time: 2, vp: 4, effect: 'When you pass 0 on the fish track, claim 1 uncovered Log icon from any river card for 1 fish.' },
  { name: 'Heron Roost',    cost: { reeds: 3, vines: 2 },            time: 3, vp: 6, effect: 'At the start of your turn you may pay 1 fish to replace a Headwaters card with the top of the material deck.' },
  { name: 'Otter Raft',     cost: { logs: 4, reeds: 1 },             time: 3, vp: 4, effect: 'When a jammed auction makes you place fewer workers than your bid, pay fish for one fewer worker.' },
  { name: 'Mill Wheel',     cost: { logs: 3, stones: 3 },            time: 4, vp: 7, effect: 'When you would pass 0 on the fish track, stop at space 1 instead.' },
  { name: 'Stone Pool',     cost: { stones: 3, clay: 2 },            time: 3, vp: 5, effect: 'When built, look at the top 5 material cards and rearrange them in any order.' },
  { name: 'Flush Channel',  cost: { mud: 4, reeds: 1 },              time: 2, vp: 6, effect: 'When built, discard 1 Headwaters card of your choice (out of game) and refill that slot from the top of the material deck. No auction.' },
  { name: 'Granary',        cost: { reeds: 4, clay: 1 },             time: 3, vp: 4, effect: 'Once per game, your build costs 1 fewer of one listed material (your choice).' },
  { name: 'Granite Spire',  cost: { stones: 6 },                     time: 4, vp: 7 },
  { name: 'Royal Lodge',    cost: { logs: 6, vines: 2 },             time: 5, vp: 10, effect: 'When built, take an immediate extra turn.' },
  { name: 'Otter Den',      cost: { mud: 3, vines: 1 },              time: 2, vp: 4, effect: 'When you recall workers before an auction, slide back 1 fish per worker recalled.' },
  { name: 'Floodgate',      cost: { mud: 4, clay: 3 },               time: 4, vp: 8, effect: 'Once per game, before an auction resolves, slide the auctioned card 1 space toward the Headwaters.' },
  { name: 'Burrow Run',     cost: { vines: 3, mud: 1 },              time: 0, vp: 4, effect: 'When built, slide your pawn back 5 on the fish track.' },
  { name: 'Sap Drip',       cost: { logs: 2, vines: 2 },             time: 2, vp: 4, effect: 'When built, place 2 free workers from your supply onto uncovered icons of one river card.' },
  { name: 'Spy Mound',      cost: { stones: 4, clay: 1 },            time: 3, vp: 5, effect: 'Once per game, decide your auction bid after the other players reveal theirs.' },
  { name: 'Vine Ladder',    cost: { vines: 4, stones: 2 },           time: 4, vp: 0, effect: 'End game: +4 VP per built structure of yours that uses Vines.' },
  { name: 'Driftwood Snag', cost: { logs: 2, reeds: 2, mud: 1 },     time: 3, vp: 6, effect: 'At the start of your turn you may pay 1 fish to add a blank to any uncovered icon.' },
  { name: 'Salt Lick',      cost: { stones: 3, logs: 2, clay: 1 },   time: 3, vp: 6, effect: 'When built, look at every opponent\'s hand of structure cards.' },
  { name: 'Hidden Cache',   cost: { vines: 2, stones: 2, clay: 2 },  time: 3, vp: 0, effect: 'End game: +3 VP per 2 distinct materials in your built structures (max +9).' },
  { name: 'Treaty Stone',   cost: { stones: 3, clay: 2 },            time: 3, vp: 4, effect: 'When building, you may spend 2 of any one material as 1 of any other material. Once per build.' },
  { name: 'Cattail Patch',  cost: { reeds: 3, mud: 2 },              time: 3, vp: 0, effect: 'End game: VP equal to 1/1/2/3/5/8 for 1/2/3/4/5/6 distinct materials across your built structures.' },
  { name: 'Pack Rat Burrow', cost: { reeds: 2, mud: 2 },             time: 2, vp: 4, effect: 'When you pass 0 on the fish track, you may discard 1 structure from your hand and take a structure of your choice from the discard pile.' },
  { name: 'Tribute Stone',  cost: { clay: 2, stones: 2 },            time: 3, vp: 5, effect: 'Once per game, at the start of your turn, force an opponent to recall one of their workers from a river card (dropping a blank). The opponent slides back 3 fish in compensation.' },
  { name: 'Beaver Tow',     cost: { mud: 4, clay: 2, vines: 1 },     time: 4, vp: 9, effect: 'On your turn, instead of a regular action, pay 2 fish to slide a river card 1 space toward the Headwaters.' },
  { name: 'Otter Trail',    cost: { vines: 3, stones: 2 },           time: 3, vp: 6, effect: 'At the start of your turn, swap one of your workers on a river card with another worker (yours or an opponent\'s) on a different river card. Pay the source card\'s per-item cost in fish.' },
  { name: 'Salmon Run',     cost: { logs: 4, vines: 2 },             time: 4, vp: 7, effect: 'As your main action, place 1-5 workers from your supply onto uncovered icons of one river card. Fish cost escalates 2/3/5/8/13 per successive worker.' },
  { name: 'Slipstream',     cost: { mud: 2, vines: 2 },              time: 3, vp: 5, effect: 'Once per game, take a turn immediately after another player takes their turn, even if you are not next on the fish track.' },

  // Species starter structures (asymmetric play, see SPECIES.md). Each player
  // drafts 1 of their 3 species cards at setup; picked card is pre-built in
  // their tableau. The `species` flag excludes these from the shared deck.
  // Beaver (Logs bias)
  { name: 'Lodge Foundation', cost: { logs: 0 },                       time: 0, vp: 0, species: 'beaver', effect: 'Logs icons cost you 1 less fish per item (min 1).' },
  { name: 'Tail Slap',        cost: { logs: 0 },                       time: 0, vp: 0, species: 'beaver', effect: 'At the start of your turn, you may pay 1 fish to drop a blank on any uncovered icon on a River 1 card.' },
  { name: 'Cache Burrow',     cost: { logs: 0 },                       time: 0, vp: 0, species: 'beaver', effect: 'Your hand size is 4 instead of 3.' },
  // Sea Otter (Reeds bias)
  { name: 'Kelp Bed',         cost: { logs: 0 },                       time: 0, vp: 0, species: 'otter',  effect: 'Reeds icons cost you 1 less fish per item (min 1).' },
  { name: 'Rolling Float',    cost: { logs: 0 },                       time: 0, vp: 0, species: 'otter',  effect: 'Once per game, swap one of your workers on a river card with another worker on a different card in the same river slot. No fish cost.' },
  { name: 'Stone Tool',       cost: { logs: 0 },                       time: 0, vp: 0, species: 'otter',  effect: 'When building, 1 of your Stones workers may substitute for any other material.' },
  // Muskrat (Mud bias)
  { name: 'Mud Burrow',       cost: { logs: 0 },                       time: 0, vp: 0, species: 'muskrat', effect: 'Mud icons cost you 1 less fish per item (min 1).' },
  { name: 'Channel Clearer',  cost: { logs: 0 },                       time: 0, vp: 0, species: 'muskrat', effect: 'At the start of your turn, you may discard 1 Reed worker from any river card; returns to that player\'s supply without a blank.' },
  { name: 'Marsh Lookout',    cost: { logs: 0 },                       time: 0, vp: 0, species: 'muskrat', effect: 'Peek at the top card of the material deck at any time.' },
  // Mink (Clay bias)
  { name: 'Clay Den',         cost: { logs: 0 },                       time: 0, vp: 0, species: 'mink',   effect: 'Clay icons cost you 1 less fish per item (min 1).' },
  { name: 'Quick Strike',     cost: { logs: 0 },                       time: 0, vp: 0, species: 'mink',   effect: 'When you trigger an auction, you may declare your bid last (after all other bids are revealed).' },
  { name: 'Snare Set',        cost: { logs: 0 },                       time: 0, vp: 0, species: 'mink',   effect: 'Once per game, force an opponent to recall one of their workers from a river card (drops a blank). The opponent slides back 3 fish in compensation.' },
];

const SPECIES_KEYS = ['beaver', 'otter', 'muskrat', 'mink'];

// AI draft preference for species starters (higher = more attractive). Plain
// per-name weights — keeps the species-draft decision local and avoids
// pulling in aiEffectValue's full machinery.
const SPECIES_DRAFT_WEIGHT = {
  // Material discounts — reliable per-auction savings, top tier.
  'Lodge Foundation': 5, 'Kelp Bed': 5, 'Mud Burrow': 5, 'Clay Den': 5,
  // Bidding/auction tools — strong once you're contested.
  'Quick Strike': 5, 'Snare Set': 4,
  // Useful tactical effects.
  'Stone Tool': 4, 'Rolling Float': 3, 'Tail Slap': 3, 'Channel Clearer': 3,
  // Mild support effects.
  'Cache Burrow': 3, 'Marsh Lookout': 2,
};

// Cattail Patch end-game schedule, indexed by distinct-material count (0..6).
const CATTAIL_PATCH_VP = [0, 1, 1, 2, 3, 5, 8];

// Ablation toggle: set STRUCTURE_EFFECT_DISABLED['Pier'] = true to ignore that
// card's effect (still in deck, still scores its printed VP — only the bonus is suppressed).
const STRUCTURE_EFFECT_DISABLED = {};
function setStructureEffectDisabled(name, disabled) {
  if (disabled) STRUCTURE_EFFECT_DISABLED[name] = true;
  else delete STRUCTURE_EFFECT_DISABLED[name];
}
function effectActive(name) { return STRUCTURE_EFFECT_DISABLED[name] !== true; }
function hasEffect(p, name) { return effectActive(name) && p.built.some(s => s.name === name); }
function maxHandSize(p) { return 3 + (hasEffect(p, 'Cache Burrow') ? 1 : 0); }
function totalVP(p, state) {
  let v = p.built.reduce((s, b) => s + b.vp, 0);
  if (hasEffect(p, 'Pier')) {
    v += Math.min(6, 2 * state.shorelineCards.filter(c => workersOnCard(c, p.idx) > 0).length);
  }
  if (hasEffect(p, 'Cattail Patch')) {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    v += CATTAIL_PATCH_VP[Math.min(mats.size, CATTAIL_PATCH_VP.length - 1)];
  }
  if (hasEffect(p, 'Vine Ladder')) {
    v += 4 * p.built.filter(b => (b.cost.vines || 0) > 0).length;
  }
  if (hasEffect(p, 'Hidden Cache')) {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    v += Math.min(9, Math.floor(mats.size / 2) * 3);
  }
  if (hasEffect(p, 'Heron Watch')) {
    v += Math.min(9, state.shorelineCards.length);
  }
  return v;
}

// Per-material cost discounters (each grants -1🐟 per item on its material,
// min 1): Reed Bed (main deck) and the 4 species-starter discount cards.
const MATERIAL_DISCOUNT_CARDS = {
  reeds: ['Reed Bed', 'Kelp Bed'],
  logs:  ['Lodge Foundation'],
  mud:   ['Mud Burrow'],
  clay:  ['Clay Den'],
};
function playerCardCost(state, card, playerIdx) {
  const base = cardCost(card);
  const p = state.players[playerIdx];
  const discounters = MATERIAL_DISCOUNT_CARDS[card.material] || [];
  if (discounters.some(n => hasEffect(p, n))) return Math.max(1, base - 1);
  return base;
}

function firePassZeroEffects(state, playerIdx, count) {
  const p = state.players[playerIdx];
  for (let i = 0; i < count; i++) {
    if (hasEffect(p, 'Wood Pile')) {
      const target = state.riverCards.find(c => c.material === 'logs' && uncoveredIcons(c) > 0);
      if (target && p.supply > 0) {
        p.supply -= 1;
        target.workers[playerIdx] = (target.workers[playerIdx] || 0) + 1;
        p.timePos += 1;
      }
    }
    if (hasEffect(p, 'Hollowed-out Log')) {
      const target = state.riverCards.find(c => workersOnCard(c, playerIdx) > 0);
      if (target) {
        target.workers[playerIdx] -= 1;
        if (target.workers[playerIdx] === 0) delete target.workers[playerIdx];
        p.supply += 1;
      }
    }
    if (hasEffect(p, 'Pack Rat Burrow') && p.hand.length > 0 && state.structDiscard.length > 0) {
      // Score discard pile against player's current built materials; pick the
      // best swap if the discard's best card scores higher than the worst hand card.
      const wbm = playerWorkersByMaterial(state, playerIdx);
      const score = (s) => {
        let deficit = 0;
        for (const m in s.cost) deficit += Math.max(0, s.cost[m] - (wbm[m] || 0));
        return s.vp + aiEffectValue(s, p, state) - deficit * 1.5;
      };
      const handScored = p.hand.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => a.sc - b.sc);
      const discardScored = state.structDiscard.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => b.sc - a.sc);
      const worstHand = handScored[0];
      const bestDiscard = discardScored[0];
      if (bestDiscard.sc > worstHand.sc) {
        const taken = state.structDiscard.splice(bestDiscard.i, 1)[0];
        const dropped = p.hand.splice(worstHand.i, 1)[0];
        state.structDiscard.push(dropped);
        p.hand.push(taken);
      }
    }
  }
}

let STRUCTURE_TEMPLATES = BASE_STRUCTURE_TEMPLATES.slice();

// Reseeded LCG so structure remapping is deterministic across games for a given numMats.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Configure global material set + structure templates. Base = 6 (live game).
// For numMats > 6: each material reference in a base structure has prob
// (numMats-6)/numMats of being remapped to a new extra material — so demand
// spreads evenly across all materials.
function configureMaterials(numMats) {
  if (numMats < ORIG_MATERIALS.length) throw new Error(`numMats must be >= ${ORIG_MATERIALS.length}`);
  MAT_KEYS = ORIG_MATERIALS.concat(EXTRA_MATERIALS.slice(0, numMats - ORIG_MATERIALS.length));
  if (numMats === ORIG_MATERIALS.length) {
    STRUCTURE_TEMPLATES = BASE_STRUCTURE_TEMPLATES.slice();
    return;
  }
  const extras = EXTRA_MATERIALS.slice(0, numMats - ORIG_MATERIALS.length);
  const rng = lcg(42);
  STRUCTURE_TEMPLATES = BASE_STRUCTURE_TEMPLATES.map(s => {
    const newCost = {};
    for (const [m, c] of Object.entries(s.cost)) {
      if (rng() < extras.length / numMats) {
        const newMat = extras[Math.floor(rng() * extras.length)];
        newCost[newMat] = (newCost[newMat] || 0) + c;
      } else {
        newCost[m] = (newCost[m] || 0) + c;
      }
    }
    return { ...s, cost: newCost };
  });
}

const PRERIV_SLOTS = 3;
let RIVER_SLOTS = 4;
function setRiverSlots(n) { RIVER_SLOTS = n; }
const LAP_LENGTH = 60;
const ENDGAME_TRACK_END = 59;
const UPSTREAM_AUCTION_COST = 1;
const MAX_TURNS = 2000; // safety net

// Probability that a non-trigger AI with need=0 will bid 1 worker speculatively
// on a useful (in-hand) material at a cheap river slot (per-item cost <= 2).
let SPECULATIVE_BID_PROB = 0;
function setSpeculativeBidProb(p) { SPECULATIVE_BID_PROB = p; }

// Live rule: ANY plenty-to-go-around with leftover icons slides the card one
// slot downstream (pre→R1, R1→R2, ..., R4→shore) instead of graduating it to
// the shoreline directly. Cards only go to the shoreline when no icons remain
// to be auctioned. (Toggle off only for historical / rule-comparison sweeps.)
let ALL_PLENTY_SLIDES = true;
function setAllPlentySlides(b) { ALL_PLENTY_SLIDES = b; }

// Legacy / sweep-only flag: when ALL_PLENTY_SLIDES is off, this still lets
// pre-river plenty (with leftovers) slide to River 1 — used by the rule-(b)
// vs rule-(c) comparison sweep.
let PRERIV_PLENTY_SLIDES_TO_RIVER = true;
function setPrerivPlentySlides(b) { PRERIV_PLENTY_SLIDES_TO_RIVER = b; }

function prerivTriggerCost(idx) { return PRERIV_SLOTS - idx + 1; }
function riverSlotCost(slot) { return typeof slot === 'number' ? slot + 2 : 0; }
function cardCost(card) {
  if (card.slot === 'pre') return UPSTREAM_AUCTION_COST;
  return riverSlotCost(card.slot);
}

// =============================================================================
// HELPERS
// =============================================================================
function popStructDeck(state) {
  if (state.structDeck.length === 0) {
    if (state.structDiscard.length === 0) return undefined;
    state.structDeck = shuffle(state.structDiscard);
    state.structDiscard = [];
  }
  return state.structDeck.pop();
}

function structAvailable(state) {
  return state.structDeck.length + state.structDiscard.length;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uncoveredIcons(card) {
  let workers = 0;
  for (const k in card.workers) workers += card.workers[k];
  return card.totalIcons - workers - card.blanks;
}
function workersOnCard(card, playerIdx) { return card.workers[playerIdx] || 0; }
// Material yield multiplier per worker on a card. Old Growth yields 2x while
// at River 3 or River 4 (slots 2 and 3); shoreline / R1 / R2 → 1x. All other
// cards always yield 1x.
function cardYieldMultiplier(card) {
  if (card.effect === 'old-growth' && typeof card.slot === 'number' && card.slot >= 2) return 2;
  return 1;
}
// wbm[m] = vanilla-card material units this player can spend on material m.
// wbm._wildPools = [{materials: [primary, alt], count}] — each pool's units
// may cover either of its two materials at build time. Tracked separately so
// canBuild doesn't double-count.
function playerWorkersByMaterial(state, playerIdx) {
  const out = {};
  for (const m of MAT_KEYS) out[m] = 0;
  out._wildPools = [];
  const addCard = (c) => {
    const w = workersOnCard(c, playerIdx);
    if (w === 0) return;
    const units = w * cardYieldMultiplier(c);
    if (c.wildAlt) {
      out._wildPools.push({ materials: [c.material, c.wildAlt], count: units });
    } else {
      out[c.material] += units;
    }
  };
  for (const c of state.riverCards) addCard(c);
  for (const c of state.shorelineCards) addCard(c);
  return out;
}

// Greedy check: can the wild pools cover the remaining material deficits?
// Each pool serves one of its two materials; we assign each pool to its
// largest-remaining-deficit option first. Sufficient for our 2-material wilds.
function canCoverWithWild(deficits, pools) {
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
  for (const m in rem) if (rem[m] > 0) return false;
  return true;
}
function canBuild(structure, workersByMat, p = null) {
  const targetCost = p
    ? effectiveBuildCost(structure, p, workersByMat).eff
    : structure.cost;
  // Compute per-material deficits after vanilla coverage, then see if wild
  // pools can fill the gaps.
  const deficits = {};
  let totalDeficit = 0;
  for (const m in targetCost) {
    const d = Math.max(0, targetCost[m] - (workersByMat[m] || 0));
    if (d > 0) { deficits[m] = d; totalDeficit += d; }
  }
  if (totalDeficit === 0) return true;
  return canCoverWithWild(deficits, workersByMat._wildPools || []);
}

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
  // Stone Tool (otter species starter): Charcoal Pit variant — 1 Stones worker
  // may substitute for any other material on a build.
  if (hasEffect(p, 'Stone Tool')) {
    const stoneSlack = (wbm.stones || 0) - (eff.stones || 0);
    if (stoneSlack >= 1) {
      for (const m of Object.keys(struct.cost)) {
        if (m === 'stones') continue;
        if ((wbm[m] || 0) < eff[m]) {
          eff[m] -= 1;
          eff.stones = (eff.stones || 0) + 1;
          break;
        }
      }
    }
  }
  // Treaty Stone: once per build, cover 1 missing of one material by paying
  // 2 of a surplus material (any-to-any). Applied after free 1:1 saves
  // (Charcoal Pit) so it only fires when a real deficit remains.
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
  return { eff, granaryUsed };
}

// Per-material tiers (shift-2 deck — tuned via sweepDeck under rule (c)):
//   "always"  → in deck for any player count   (2 cards/mat: [5,7] icons)
//   "3+"      → only included when numPlayers >= 3 (1 card/mat: [4] icons)
//   "4+"      → only included when numPlayers >= 4 (1 card/mat: [8] icons)
// Counts: 2P=12, 3P=18, 4P=24 cards.
let ALWAYS_ICONS = [5, 7];
let TIER_3PLUS_ICONS = [4];
let TIER_4PLUS_ICONS = [8];
let PREMIUM_4P = [];
function setDeckTuning({ always, tier3, tier4, premium }) {
  if (always   !== undefined) ALWAYS_ICONS     = always;
  if (tier3    !== undefined) TIER_3PLUS_ICONS = tier3;
  if (tier4    !== undefined) TIER_4PLUS_ICONS = tier4;
  if (premium  !== undefined) PREMIUM_4P       = premium;
}

function makeCardSpecs(numPlayers) {
  const specs = [];
  for (const m of MAT_KEYS) {
    for (const icons of ALWAYS_ICONS)              specs.push({ material: m, icons });
    if (numPlayers >= 3) for (const icons of TIER_3PLUS_ICONS) specs.push({ material: m, icons });
    if (numPlayers >= 4) for (const icons of TIER_4PLUS_ICONS) specs.push({ material: m, icons });
  }
  if (numPlayers >= 4) for (const p of PREMIUM_4P) specs.push({ material: p.material, icons: p.icons });
  return specs;
}

// =============================================================================
// MATERIAL CARD EFFECTS (see MATERIALS.md). 8 of the 24 deck slots are
// effect-bearing, keyed by (material, icons). Vanilla cards have effect = null.
// =============================================================================
const EFFECT_CARDS = [
  // Always tier (2P+)
  { material: 'logs',   icons: 5, effect: 'wild',         wildAlt: 'reeds', name: 'Driftwood Tangle' },
  { material: 'clay',   icons: 7, effect: 'wild',         wildAlt: 'mud',   name: 'Mud Slick' },
  // 3+ tier
  { material: 'reeds',  icons: 4, effect: 'solo-bonus',   bonusPerWorker: 1, name: 'Hidden Inlet' },
  { material: 'vines',  icons: 4, effect: 'peek-rearrange', name: 'Vine Curtain' },
  { material: 'mud',    icons: 4, effect: 'most-workers', flatBonus: 2,     name: 'Mud Wallow' },
  // 4+ tier
  { material: 'reeds',  icons: 8, effect: 'most-workers', flatBonus: 3,     name: 'Cattail Cluster' },
  { material: 'clay',   icons: 8, effect: 'slipping-sandbar', name: 'Slipping Sandbar' },
  { material: 'logs',   icons: 8, effect: 'old-growth',   name: 'Old Growth' },
];
function effectSpecFor(material, icons) {
  return EFFECT_CARDS.find(e => e.material === material && e.icons === icons) || null;
}

// Fish-track move helper. Backward = good (act sooner). Clamps at 0; does NOT
// trigger pass-0 effects (those only fire on forward laps).
function moveBackward(state, playerIdx, spaces) {
  if (spaces <= 0) return;
  const p = state.players[playerIdx];
  p.timePos = Math.max(0, p.timePos - spaces);
}

// Vine Curtain peek+rearrange: greedy AI heuristic. Looks at the top 2 of
// matDeck (the next two to be drawn — matDeck.pop() returns the last element)
// and swaps them iff the second one matches more of the player's hand needs.
function aiVineCurtainRearrange(state, playerIdx) {
  const deck = state.matDeck;
  if (deck.length < 2) return;
  const top = deck[deck.length - 1];
  const second = deck[deck.length - 2];
  if (top.material === second.material) return;
  const p = state.players[playerIdx];
  const need = (mat) => {
    let n = 0;
    for (const s of p.hand) n += s.cost[mat] || 0;
    return n;
  };
  if (need(second.material) > need(top.material)) {
    deck[deck.length - 1] = second;
    deck[deck.length - 2] = top;
  }
}

function buildMaterialDeck(numPlayers) {
  const deck = makeCardSpecs(numPlayers).map((spec, id) => {
    const eff = effectSpecFor(spec.material, spec.icons);
    return {
      id: 'm' + id,
      material: spec.material,
      totalIcons: spec.icons,
      slot: null,
      workers: {},
      blanks: 0,
      effect: eff ? eff.effect : null,
      effectSpec: eff,
      wildAlt: eff && eff.wildAlt ? eff.wildAlt : null,
    };
  });
  // shuffle inline
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return shuffle(deck);
}
function buildStructureDeck(numPlayers) {
  let id = 0;
  const templates = STRUCTURE_TEMPLATES.filter(s => {
    if (s.species) return false; // species starters never enter the shared deck
    if (s.only2P) return numPlayers === 2;
    return true;
  });
  return shuffle(templates.map(s => ({ ...s, id: 's' + (id++), cost: { ...s.cost } })));
}

// =============================================================================
// STATE / TURN ORDER
// =============================================================================
function newGame(numPlayers, workersPerPlayer = 8) {
  const players = [];
  // Assign each player a distinct species (shuffled). Used for species
  // starter drafting and any future species-keyed effects.
  const speciesPool = shuffle(SPECIES_KEYS.slice()).slice(0, numPlayers);
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      idx: i,
      species: speciesPool[i],
      supply: workersPerPlayer,
      timePos: 0,
      hand: [],
      built: [],
      exhausted: false,
      out: false,
      granaryUsed: false,
      floodgateUsed: false,
      spyMoundUsed: false,
      tributeStoneUsed: false,
      slipstreamUsed: false,
      rollingFloatUsed: false,
      snareSetUsed: false,
    });
  }
  const matDeck = buildMaterialDeck(numPlayers);
  const structDeck = buildStructureDeck(numPlayers);
  for (const p of players) {
    for (let i = 0; i < 3; i++) p.hand.push(structDeck.pop());
  }
  // Species starter draft: each player picks 1 of their 3 themed cards by
  // weight (tie-break random). Other 2 cards leave the game; the drafted
  // starter is pre-built in the player's tableau before turn 1.
  for (const p of players) {
    const speciesCards = STRUCTURE_TEMPLATES
      .filter(s => s.species === p.species)
      .map((s, i) => ({ ...s, id: 'ss' + p.idx + '_' + i, cost: { ...s.cost } }));
    const ranked = speciesCards
      .map(c => ({ c, w: (SPECIES_DRAFT_WEIGHT[c.name] || 1) + Math.random() }))
      .sort((a, b) => b.w - a.w);
    p.built.push(ranked[0].c);
  }
  const prerivCards = [null, null, null];
  for (let i = 0; i < PRERIV_SLOTS; i++) {
    if (matDeck.length === 0) break;
    const c = matDeck.pop();
    c.slot = 'pre';
    prerivCards[i] = c;
  }
  return {
    players,
    riverCards: [],
    prerivCards,
    shorelineCards: [],
    matDeck,
    structDeck,
    structDiscard: [],
    stackOrder: players.map((_, i) => i),
    currentPlayer: 0,
    gameOver: false,
    shadowedBy: {},
    endgame: false,
    metrics: {
      turns: 0,
      auctions: 0,
      jamAuctions: 0,
      plentyAuctions: 0,
      noBidAuctions: 0,
      iconsSpawned: 0, // sum of totalIcons of cards that entered the river/upstream
      iconsClaimed: 0,
      iconsWastedToShore: 0, // leftover icons when card moved to shoreline
      cardsBuilt: 0,
      endgameTriggered: false,
      // River-depth + zero-clinch tracking
      riverExitSlots: [],         // slot (0..3) of each card at the moment it left the river to shoreline
      preToShoreCards: 0,         // cards that went pre-river → shoreline (skipped river entirely)
      preToRiverCards: 0,         // cards that entered River 1 via a pre-river jam (or rule-(b) plenty slide)
      preToRiverFromPlenty: 0,    // subset of preToRiverCards: entered via rule-(b) plenty slide (leftovers)
      riverPlentySlides: 0,       // river-card plenty auctions (with leftovers) that slid downstream under rule (c)
      nonZeroBidders: 0,          // count of (auction, bidder) pairs with bid > 0
      zeroClinchBidders: 0,       // of those, bidders that clinched 0 icons (only possible in jams)
      zeroClinchAuctions: 0,      // auctions where total bids > 0 but total clinched = 0
      peakBlanks: 0,              // max total blanks across all river/preriv cards at any point
    },
  };
}

// Sum of all blank tokens currently on the board (river + pre-river only —
// shoreline cards have their blanks returned to the pool when they graduate).
// Called after every operation that mints a blank to update the peak metric.
function noteBlanks(state) {
  let total = 0;
  for (const c of state.riverCards) total += c.blanks;
  for (const c of state.prerivCards) if (c) total += c.blanks;
  if (total > state.metrics.peakBlanks) state.metrics.peakBlanks = total;
}

// Slipstream: after any player's turn, an opponent who built Slipstream and
// hasn't used it may take an out-of-order bonus turn (overriding fish-track
// position once per game). AI heuristic: pick the eligible owner with the
// lowest fish-track position who would otherwise wait longest. Returns true if
// fired (caller should respect state.bonusTurnPlayer on next pickNextPlayer).
function maybeFireSlipstream(state, lastTurnPlayerIdx) {
  if (state.bonusTurnPlayer != null) return false; // another bonus already pending
  const eligible = state.players.filter(p =>
    p.idx !== lastTurnPlayerIdx && !p.out && !p.exhausted &&
    !p.slipstreamUsed && p.built.some(b => b.name === 'Slipstream') && effectActive('Slipstream')
  );
  if (eligible.length === 0) return false;
  // AI heuristic: only fire if firing actually changes who goes next.
  const naturalNext = pickNextPlayer(state);
  const ownersByWait = eligible.slice().sort((a, b) => a.timePos - b.timePos);
  const owner = ownersByWait.find(o => o.idx !== naturalNext) || null;
  if (!owner) return false;
  owner.slipstreamUsed = true;
  state.bonusTurnPlayer = owner.idx;
  return true;
}

function pickNextPlayer(state) {
  if (state.bonusTurnPlayer != null) {
    const idx = state.bonusTurnPlayer;
    state.bonusTurnPlayer = null;
    if (!state.players[idx].out && !state.players[idx].exhausted) return idx;
  }
  let lowest = Infinity;
  for (const p of state.players) {
    if (p.exhausted || p.out) continue;
    lowest = Math.min(lowest, p.timePos);
  }
  if (lowest === Infinity) return -1;
  for (const idx of state.stackOrder) {
    const p = state.players[idx];
    if (p.exhausted || p.out) continue;
    if (p.timePos === lowest) return idx;
  }
  return state.stackOrder.find(i => !state.players[i].exhausted && !state.players[i].out) ?? state.stackOrder[0];
}

function triggerEndgame(state) {
  if (state.endgame) return;
  state.endgame = true;
  state.metrics.endgameTriggered = true;
  const ordered = state.players
    .map(p => ({ idx: p.idx, t: p.timePos, stackPos: state.stackOrder.indexOf(p.idx) }))
    .filter(o => !state.players[o.idx].out)
    .sort((a, b) => a.t - b.t || a.stackPos - b.stackPos);
  ordered.forEach((o, i) => { state.players[o.idx].timePos = i + 1; });
  state.shadowedBy = {};
  for (const p of state.players) p.exhausted = false;
  state.stackOrder = ordered.map(o => o.idx);
}

function advancePlayer(state, playerIdx, byTime) {
  const p = state.players[playerIdx];
  const prev = p.timePos;
  p.timePos += byTime;
  // Mill Wheel: clamp to (boundary + 1) on lap-loop crossing.
  const prevLapBoundary = Math.floor(prev / LAP_LENGTH);
  const newLapBoundary  = Math.floor(p.timePos / LAP_LENGTH);
  const passZeroCount = Math.max(0, newLapBoundary - prevLapBoundary);
  if (passZeroCount > 0 && hasEffect(p, 'Mill Wheel')) {
    p.timePos = (prevLapBoundary + 1) * LAP_LENGTH + 1;
  }
  if (passZeroCount > 0) firePassZeroEffects(state, playerIdx, passZeroCount);
  state.stackOrder = state.stackOrder.filter(i => i !== playerIdx);
  state.stackOrder.unshift(playerIdx);
  // Lap / catch-up bookkeeping.
  // shadowedBy[a -> b] = true means "a lapped b and is still waiting for b
  // to catch up". Under the lapping rule, the LAPPER (a) is exhausted, not
  // the lapped (b), and a wakes when each b they lapped catches up to a's
  // non-modular position.
  for (const other of state.players) {
    if (other === p) continue;
    // Catch-up event: p crossed other's non-modular position going up. If
    // `other` had lapped p (and is exhausted because of it), p catching up
    // to their stopping point wakes them with respect to p.
    if (prev < other.timePos && p.timePos >= other.timePos) {
      const key = other.idx + '->' + playerIdx;
      if (state.shadowedBy[key]) state.shadowedBy[key] = false;
    }
    // Lap event: p gained a full LAP_LENGTH on other in non-modular terms.
    // Mark p as the lapper (outgoing shadow); p will be exhausted.
    const prevLaps = Math.max(0, Math.floor((prev - other.timePos) / LAP_LENGTH));
    const newLaps  = Math.max(0, Math.floor((p.timePos - other.timePos) / LAP_LENGTH));
    if (newLaps > prevLaps) {
      state.shadowedBy[playerIdx + '->' + other.idx] = true;
    }
  }
  // Recompute exhausted: a player is exhausted iff they have any outstanding
  // outgoing shadow (i.e., they lapped someone who hasn't caught back up).
  for (const a of state.players) {
    let now = false;
    for (const b of state.players) {
      if (a === b) continue;
      if (state.shadowedBy[a.idx + '->' + b.idx]) { now = true; break; }
    }
    a.exhausted = now;
  }
}

// =============================================================================
// CARD MOVEMENT
// =============================================================================
function moveCardToShoreline(state, card) {
  // Fire card-exit effects before counting wasted icons / changing slot.
  fireOnShoreline(state, card);
  // count leftover (uncovered) icons as wasted
  state.metrics.iconsWastedToShore += uncoveredIcons(card);
  card.blanks = 0;
  if (card.slot === 'pre') {
    state.metrics.preToShoreCards++;
    const idx = prerivIndexOf(state, card);
    if (idx !== -1) refillPreriv(state, idx);
  } else {
    // Card exited the river — record the slot it was on (0..3).
    state.metrics.riverExitSlots.push(card.slot);
    state.riverCards = state.riverCards.filter(c => c !== card);
  }
  card.slot = 'shore';
  state.shorelineCards.push(card);
}

// End-of-life effect dispatcher: fires when a card moves from river → shoreline.
//   solo-bonus    → if exactly one player has workers here, move them backward
//                   on the fish track by N spaces per their worker (Hidden Inlet).
//   most-workers  → player with strictly most workers moves backward N spaces;
//                   ties grant no bonus (Mud Wallow, Cattail Cluster).
function fireOnShoreline(state, card) {
  if (!card.effect) return;
  const entries = Object.entries(card.workers).filter(([, n]) => n > 0);
  if (entries.length === 0) return;
  if (card.effect === 'solo-bonus') {
    if (entries.length !== 1) return;
    const [idxStr, count] = entries[0];
    const spec = card.effectSpec;
    moveBackward(state, parseInt(idxStr), count * (spec.bonusPerWorker || 1));
    return;
  }
  if (card.effect === 'most-workers') {
    entries.sort((a, b) => b[1] - a[1]);
    if (entries.length > 1 && entries[0][1] === entries[1][1]) return; // tie → no bonus
    const idx = parseInt(entries[0][0]);
    moveBackward(state, idx, card.effectSpec.flatBonus || 0);
    return;
  }
}
function jamCardDownriver(state, card) {
  if (card.slot === 'pre') {
    state.metrics.preToRiverCards++;
    const idx = prerivIndexOf(state, card);
    // Slipping Sandbar enters at River 4 instead of River 1 (see MATERIALS.md).
    card.slot = (card.effect === 'slipping-sandbar') ? (RIVER_SLOTS - 1) : 0;
    state.riverCards.push(card);
    if (idx !== -1) refillPreriv(state, idx);
    return;
  }
  const newSlot = card.slot + 1;
  if (newSlot > RIVER_SLOTS - 1) { moveCardToShoreline(state, card); return; }
  card.slot = newSlot;
}

// Slipping Sandbar: after an auction with placement, slide upstream (toward R1)
// instead of downstream. At R1 with uncovered icons remaining, retire to shoreline.
function slidesSandbarUpstream(state, card) {
  if (card.slot === 0) {
    moveCardToShoreline(state, card);
    return;
  }
  card.slot -= 1;
}
function refillPreriv(state, emptiedIdx) {
  for (let i = emptiedIdx; i > 0; i--) state.prerivCards[i] = state.prerivCards[i - 1];
  state.prerivCards[0] = null;
  if (state.matDeck.length > 0) {
    const c = state.matDeck.pop();
    c.slot = 'pre';
    state.prerivCards[0] = c;
    state.metrics.iconsSpawned += c.totalIcons;
  }
}
function prerivIndexOf(state, card) { return state.prerivCards.indexOf(card); }
function cleanupShoreline(state) {
  state.shorelineCards = state.shorelineCards.filter(c => {
    const totalWorkers = Object.values(c.workers).reduce((s, n) => s + n, 0);
    return totalWorkers !== 0;
  });
}
function callWorkersHome(state, playerIdx, recallSpec) {
  const p = state.players[playerIdx];
  let total = 0;
  for (const r of recallSpec) {
    const card = state.riverCards.find(c => c.id === r.cardId) || state.shorelineCards.find(c => c.id === r.cardId);
    if (!card) continue;
    const have = workersOnCard(card, playerIdx);
    const take = Math.min(have, r.count);
    if (take === 0) continue;
    card.workers[playerIdx] = have - take;
    if (card.workers[playerIdx] === 0) delete card.workers[playerIdx];
    if (typeof card.slot === 'number') card.blanks += take;
    p.supply += take;
    total += take;
  }
  noteBlanks(state);
  // Otter Den: slide back 1 fish per worker recalled.
  if (total > 0 && hasEffect(p, 'Otter Den')) {
    p.timePos = Math.max(0, p.timePos - total);
  }
  cleanupShoreline(state);
}

// =============================================================================
// AUCTIONS
// =============================================================================
function runAuction(state, card, triggerPlayerIdx, minBidTrigger) {
  state.metrics.auctions++;
  // Floodgate: triggerer (only) auto-uses if available and card.slot >= 1.
  const trig = state.players[triggerPlayerIdx];
  if (hasEffect(trig, 'Floodgate') && !trig.floodgateUsed && typeof card.slot === 'number' && card.slot > 0) {
    card.slot -= 1;
    trig.floodgateUsed = true;
  }
  const bids = {};
  // Spy Mound (once per game) / Quick Strike (mink species starter, unlimited):
  // a player auto-defers to bid LAST on a high-value auction. Spy Mound used
  // first when both are available (one-shot resource).
  let deferred = -1;
  let deferredViaQuickStrike = false;
  for (const p of state.players) {
    if (hasEffect(p, 'Spy Mound') && !p.spyMoundUsed && !p.exhausted && !p.out) {
      if (uncoveredIcons(card) >= 4) {
        deferred = p.idx;
        break;
      }
    }
  }
  if (deferred === -1) {
    for (const p of state.players) {
      if (hasEffect(p, 'Quick Strike') && !p.exhausted && !p.out) {
        if (uncoveredIcons(card) >= 4) {
          deferred = p.idx;
          deferredViaQuickStrike = true;
          break;
        }
      }
    }
  }
  for (const p of state.players) {
    if (p.exhausted || p.out) { bids[p.idx] = 0; continue; }
    if (p.idx === deferred) continue;
    const minBid = (p.idx === triggerPlayerIdx) ? minBidTrigger : 0;
    bids[p.idx] = aiDecideBid(state, p.idx, card, minBid);
  }
  if (deferred !== -1) {
    const p = state.players[deferred];
    // Spy Mound is once-per-game; Quick Strike has no use limit.
    if (!deferredViaQuickStrike) p.spyMoundUsed = true;
    const open = uncoveredIcons(card);
    const others = Object.values(bids).reduce((s, b) => s + b, 0);
    let bid;
    if (others < open) {
      bid = Math.min(p.supply, open - others);
    } else {
      bid = (deferred === triggerPlayerIdx) ? Math.max(minBidTrigger, 1) : 0;
    }
    if (deferred === triggerPlayerIdx) bid = Math.max(bid, minBidTrigger);
    bids[p.idx] = bid;
  }
  resolveAuction(state, card, bids);
}
function resolveAuction(state, card, bids) {
  const open = uncoveredIcons(card);
  const totalBid = Object.values(bids).reduce((s, n) => s + n, 0);
  if (totalBid === 0) {
    state.metrics.noBidAuctions++;
    return;
  }
  const playerBidPairs = Object.entries(bids)
    .filter(([_, b]) => b > 0)
    .map(([idx, b]) => ({ idx: parseInt(idx), bid: b }));

  if (totalBid <= open) {
    state.metrics.plentyAuctions++;
    for (const { idx, bid } of playerBidPairs) {
      const p = state.players[idx];
      p.supply -= bid;
      card.workers[idx] = (card.workers[idx] || 0) + bid;
      const timeAdvance = bid * playerCardCost(state, card, idx);
      advancePlayer(state, idx, timeAdvance);
      state.metrics.iconsClaimed += bid;
      state.metrics.nonZeroBidders++;
      // got === bid > 0 in plenty case, so no zero-clinch increment.
    }
    const leftover = open - totalBid;
    const slidesNow =
      leftover > 0 && (
        ALL_PLENTY_SLIDES ||
        (PRERIV_PLENTY_SLIDES_TO_RIVER && card.slot === 'pre')
      );
    if (slidesNow) {
      if (card.slot === 'pre') state.metrics.preToRiverFromPlenty++;
      else state.metrics.riverPlentySlides++;
      // Slipping Sandbar: with workers placed (totalBid > 0) and leftover icons,
      // drift upstream instead of downstream.
      if (card.effect === 'slipping-sandbar' && totalBid > 0 && typeof card.slot === 'number') {
        slidesSandbarUpstream(state, card);
      } else {
        jamCardDownriver(state, card);
      }
    } else {
      moveCardToShoreline(state, card);
    }
  } else {
    state.metrics.jamAuctions++;
    let totalClinched = 0;
    for (const { idx, bid } of playerBidPairs) {
      const p = state.players[idx];
      const others = totalBid - bid;
      const got = Math.max(0, Math.min(bid, open - others));
      if (got > 0) {
        p.supply -= got;
        card.workers[idx] = (card.workers[idx] || 0) + got;
      }
      let billable = bid;
      if (got < bid && hasEffect(p, 'Otter Raft')) billable = Math.max(0, bid - 1);
      const timeAdvance = billable * playerCardCost(state, card, idx);
      advancePlayer(state, idx, timeAdvance);
      state.metrics.iconsClaimed += got;
      state.metrics.nonZeroBidders++;
      if (got === 0) state.metrics.zeroClinchBidders++;
      totalClinched += got;
    }
    if (totalClinched === 0) state.metrics.zeroClinchAuctions++;
    // Slipping Sandbar: if any workers actually landed on the card this auction,
    // drift upstream instead of the normal downstream jam.
    if (card.effect === 'slipping-sandbar' && totalClinched > 0 && typeof card.slot === 'number') {
      slidesSandbarUpstream(state, card);
    } else {
      jamCardDownriver(state, card);
    }
  }
}

// =============================================================================
// AI: BIDDING
// =============================================================================
function aiDecideBid(state, playerIdx, card, minBid) {
  const p = state.players[playerIdx];
  const open = uncoveredIcons(card);
  const { safe, fallback } = aiRecallBudget(state, playerIdx);
  const safeCount = totalCount(safe);
  const fallbackCount = totalCount(fallback);
  // For non-trigger bids: only consider supply + safe-recallable workers (don't
  // disrupt build plans for marginal contention). For trigger bids: also allow
  // dipping into fallback to satisfy the min-bid requirement.
  const safePool = p.supply + safeCount;
  const totalPool = safePool + fallbackCount;
  if (totalPool === 0) return Math.min(0, minBid);
  if (open === 0) return Math.min(totalPool, minBid);

  const wbm = playerWorkersByMaterial(state, playerIdx);
  // Wildcards (Driftwood Tangle, Mud Slick): include the alt material's
  // deficit when computing need, since a wild worker can fulfill either.
  const matsForNeed = card.wildAlt ? [card.material, card.wildAlt] : [card.material];
  let need = 0;
  let maxNeed = 0;
  for (const s of p.hand) {
    let cardNeed = 0;
    for (const m of matsForNeed) {
      const want = s.cost[m] || 0;
      const have = wbm[m] || 0;
      if (want > have) cardNeed += (want - have);
    }
    need += cardNeed;
    if (cardNeed > maxNeed) maxNeed = cardNeed;
  }
  let target = Math.round((need + maxNeed) / 2);
  target = Math.min(target, safePool, open, 4);
  // Use the player-specific per-item cost so Reed Bed makes reed auctions more attractive.
  let myCost = playerCardCost(state, card, playerIdx);
  // Old Growth at River 3/4: each worker yields 2x material, halving the
  // effective per-item cost in fish-per-material terms.
  if (card.effect === 'old-growth' && typeof card.slot === 'number' && card.slot >= 2) {
    myCost = Math.max(1, Math.ceil(myCost / 2));
  }
  // Hidden Inlet solo bonus: if no opponent has workers on this card, expect
  // +1 fish-track refund per worker placed (effective cost -1).
  if (card.effect === 'solo-bonus') {
    const opponentPresent = Object.entries(card.workers).some(
      ([idx, n]) => parseInt(idx) !== playerIdx && n > 0
    );
    if (!opponentPresent) myCost = Math.max(1, myCost - 1);
  }
  if (myCost >= 3 && target > 1) target = Math.max(1, target - 1);
  if (myCost >= 4 && target > 1) target = Math.max(1, target - 1);
  // Most-workers race (Mud Wallow, Cattail Cluster): if winning by 1 worker
  // is reachable within budget and the bonus pays for the extra fish, push
  // the target to (opponent's max + 1).
  if (card.effect === 'most-workers') {
    const myHere = workersOnCard(card, playerIdx);
    const oppMax = Math.max(0, ...Object.entries(card.workers)
      .filter(([idx]) => parseInt(idx) !== playerIdx)
      .map(([, n]) => n));
    const toWin = Math.max(0, oppMax + 1 - myHere);
    const bonusFish = (card.effectSpec && card.effectSpec.flatBonus) || 0;
    // Extra workers above our base target each cost ~myCost fish; only chase
    // the race when the bonus roughly covers it.
    const extra = Math.max(0, toWin - target);
    if (extra > 0 && extra * myCost <= bonusFish + 1
        && toWin <= safePool && toWin <= open) {
      target = toWin;
    }
  }
  const r = Math.random();
  if (r < 0.15 && target > 0) target -= 1;
  else if (r > 0.85 && target < safePool && target < open) target += 1;
  // Speculative bid: non-trigger AI with no current need but a hand structure
  // that uses this material may bid 1 worker on a cheap slot to add contention.
  // Speculative bids should only spend supply, never trigger a recall.
  if (
    target === 0 && minBid === 0 && SPECULATIVE_BID_PROB > 0 &&
    myCost <= 2 && p.supply > 0 &&
    p.hand.some(s => (s.cost[card.material] || 0) > 0) &&
    Math.random() < SPECULATIVE_BID_PROB
  ) {
    target = 1;
  }
  target = Math.max(target, minBid);
  // Cap at safe pool unless we need fallback to satisfy the trigger min-bid.
  target = Math.min(target, target > safePool && minBid > 0 ? totalPool : safePool);
  if (target < 0) target = 0;
  // Pre-auction recall: pull workers off the river/shoreline to fund the bid.
  // Use safe budget first, then fallback only as needed.
  let needRecall = target - p.supply;
  if (needRecall > 0) {
    const tookSafe = aiRecallFromList(state, playerIdx, safe, needRecall);
    needRecall -= tookSafe;
    if (needRecall > 0) aiRecallFromList(state, playerIdx, fallback, needRecall);
  }
  return Math.min(target, p.supply);
}

// =============================================================================
// AI: EFFECT VALUATION
// =============================================================================
// Approximate VP value of a card's effect from the builder's perspective.
// Used by AI scoring so high-effect cards rank above plain VP cards. Endgame
// VP cards are state-aware; constants/one-times are coarse fixed estimates.
// Values are the AI's beliefs — not necessarily what the effect actually
// realizes (which is what the ablation measures). Calibrate from ablation Δs
// by hand; don't auto-feed to avoid circular tuning.
const EFFECT_VP_FIXED = {
  // Constants
  'Granary': 3,
  'Charcoal Pit': 2,
  'Treaty Stone': 2,
  'Cattail Marsh': 1,
  'Otter Raft': 1,
  'Cache Burrow': 1,
  // Mid-low constants
  'Reed Bed': 0.5,
  'Otter Slide': 2,
  'Mill Wheel': 0.5,
  'Pack Rat Burrow': 1.5,
  // One-time
  'Royal Lodge': 1,
  'Burrow Run': 1,
  'Sap Drip': 1,
  'Snag Pile': 1,
  'Vine Lattice': 0.5,
  'Beaver Dam': 0.5,
  'Mud Levee': 0.5,
  // ~0
  'Wood Pile': 0,
  'Hollowed-out Log': 0,
  'Otter Den': 0,
  'Heron Roost': 0,
  'Driftwood Snag': 0,
  'Floodgate': 0,
  'Spy Mound': 0,
  'Tribute Stone': 0.5,
  'Beaver Tow': 1,
  'Otter Trail': 1.5,
  'Salmon Run': 2,
  'Stone Pool': 0,
  'Flush Channel': 0,
  // Sim no-ops (would be > 0 with smarter AI)
  'Salt Lick': 0,
  'Lookout Tree': 0,
};
function aiEffectValue(struct, p, state) {
  if (!effectActive(struct.name)) return 0;
  // Once-per-game effects yield 0 if the slot is already burned.
  if (struct.name === 'Granary' && p.granaryUsed) return 0;
  if (struct.name === 'Floodgate' && p.floodgateUsed) return 0;
  if (struct.name === 'Spy Mound' && p.spyMoundUsed) return 0;
  if (struct.name === 'Tribute Stone' && p.tributeStoneUsed) return 0;
  // Endgame VP — state-dependent projections.
  if (struct.name === 'Pier') {
    const placed = state.shorelineCards.filter(c => workersOnCard(c, p.idx) > 0).length;
    const remaining = state.matDeck.length + state.riverCards.length;
    return Math.min(6, 2 * (placed + Math.min(3, Math.floor(remaining * 0.25))));
  }
  if (struct.name === 'Cattail Patch') {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    for (const m in struct.cost) mats.add(m);
    // Project: assume up to 2 hand structures will get built and contribute their materials.
    const handMats = new Set();
    for (const s of p.hand) for (const m in s.cost) handMats.add(m);
    let projected = mats.size;
    for (const m of handMats) {
      if (!mats.has(m) && projected < 6) projected += 1;
      if (projected - mats.size >= 2) break;
    }
    return CATTAIL_PATCH_VP[Math.min(projected, CATTAIL_PATCH_VP.length - 1)];
  }
  if (struct.name === 'Vine Ladder') {
    const builtVine = p.built.filter(b => (b.cost.vines || 0) > 0).length;
    const handVine = p.hand.filter(s => (s.cost.vines || 0) > 0).length;
    return 4 * (builtVine + Math.min(handVine, 2));
  }
  if (struct.name === 'Hidden Cache') {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    // Project a couple more materials from hand builds, then apply the 3-per-2 curve.
    const handMats = new Set();
    for (const s of p.hand) for (const m in s.cost) handMats.add(m);
    let projected = mats.size;
    for (const m of handMats) {
      if (!mats.has(m) && projected < 6) projected += 1;
      if (projected - mats.size >= 2) break;
    }
    return Math.min(9, Math.floor(projected / 2) * 3);
  }
  if (struct.name === 'Heron Watch') {
    const remaining = state.matDeck.length + state.riverCards.length;
    return Math.min(9, state.shorelineCards.length + Math.floor(remaining * 0.5));
  }
  return EFFECT_VP_FIXED[struct.name] || 0;
}

// =============================================================================
// AI: TURN DECISIONS
// =============================================================================
function aiChooseAction(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const buildables = p.hand
    .map((s, i) => {
      const effVp = aiEffectValue(s, p, state);
      const totalVp = s.vp + effVp;
      return { s, i, score: totalVp / Math.max(1, s.time), vp: totalVp };
    })
    .filter(o => canBuild(o.s, wbm, p))
    .sort((a, b) => b.vp - a.vp);
  if (buildables.length > 0) return { type: 'build', handIdx: buildables[0].i };

  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) {
    for (const m in s.cost) {
      const deficit = Math.max(0, s.cost[m] - (wbm[m] || 0));
      needs[m] = Math.max(needs[m], deficit);
    }
  }
  const totalNeed = MAT_KEYS.reduce((sum, m) => sum + needs[m], 0);

  // Effective worker pool for triggering an auction = supply + workers we could
  // recall before bidding. Pre-auction recall makes a worker on a card just as
  // good for triggering as one already in supply.
  const triggerPool = aiTriggerPool(state, playerIdx);
  let bestCard = null, bestScore = -Infinity, bestKind = null, bestPrerivIdx = -1;
  for (const c of state.riverCards) {
    if (uncoveredIcons(c) === 0) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), triggerPool, need);
    // playerCardCost picks up Reed Bed's per-item discount when scoring auction targets.
    const score = need * got - playerCardCost(state, c, playerIdx) * got * 0.4;
    if (score > bestScore) { bestScore = score; bestCard = c; bestKind = 'river'; }
  }
  for (let i = 0; i < state.prerivCards.length; i++) {
    const c = state.prerivCards[i];
    if (!c) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), triggerPool, need);
    if (got === 0) continue;
    const trigger = prerivTriggerCost(i);
    const score = need * got - 1 * got * 0.4 - trigger * 0.6;
    if (score > bestScore) { bestScore = score; bestCard = c; bestKind = 'preriv'; bestPrerivIdx = i; }
  }
  if (bestCard && triggerPool > 0) {
    if (bestKind === 'river') return { type: 'auction', cardId: bestCard.id };
    return { type: 'preriv', slotIdx: bestPrerivIdx };
  }
  // Beaver Tow: if no good auction was found, slide a useful card upstream
  // (cheaper for a future auction).
  if (hasEffect(p, 'Beaver Tow') && p.timePos + 2 < ENDGAME_TRACK_END) {
    const towTarget = findBeaverTowTarget(state, playerIdx, needs);
    if (towTarget) return { type: 'beaverTow', cardId: towTarget.id };
  }
  // Salmon Run: place workers from supply on a single card with escalating cost.
  if (hasEffect(p, 'Salmon Run') && p.supply > 0 && p.timePos + 2 < ENDGAME_TRACK_END) {
    const target = findSalmonRunTarget(state, playerIdx, needs);
    if (target && p.timePos + salmonRunCumulativeCost(target.n) < ENDGAME_TRACK_END) {
      return { type: 'salmonRun', cardId: target.card.id, workerCount: target.n };
    }
  }
  if (totalNeed === 0 || p.hand.length === 0) {
    if (structAvailable(state) > 0) return { type: 'browse', n: Math.min(2, structAvailable(state)) };
  }
  const upstreamHasNeeded = state.prerivCards.some(c => c && needs[c.material] > 0);
  const upstreamHasAny = state.prerivCards.some(c => c !== null);
  // Flush includes triggering an auction, which requires at least one worker
  // (supply or recallable, since pre-auction recall covers triggers too).
  if (upstreamHasAny && !upstreamHasNeeded && triggerPool > 0) {
    return { type: 'flush' };
  }
  if (structAvailable(state) > 0) return { type: 'browse', n: Math.min(1, structAvailable(state)) };
  return { type: 'pass' };
}

// Tribute Stone: once-per-game force-recall of an opponent's worker.
// Drops a blank like a normal recall; the victim slides back 3 fish.
function doTributeStone(state, playerIdx, victimIdx, card) {
  const p = state.players[playerIdx];
  const victim = state.players[victimIdx];
  if (p.tributeStoneUsed) return false;
  if (workersOnCard(card, victimIdx) <= 0) return false;
  card.workers[victimIdx] -= 1;
  if (card.workers[victimIdx] === 0) delete card.workers[victimIdx];
  if (typeof card.slot === 'number') { card.blanks += 1; noteBlanks(state); }
  victim.supply += 1;
  victim.timePos = Math.max(0, victim.timePos - 3);
  p.tributeStoneUsed = true;
  return true;
}

function findTributeStoneTarget(state, playerIdx) {
  let best = null;
  for (const c of state.riverCards) {
    for (const k in c.workers) {
      const opIdx = parseInt(k);
      if (opIdx === playerIdx) continue;
      if (c.workers[k] <= 0) continue;
      const value = cardCost(c);
      if (!best || value > best.value) best = { victimIdx: opIdx, card: c, value };
    }
  }
  return best;
}

// Otter Trail: swap your worker on river card A with another worker on card B.
// Pay A's per-item cost.
function doOtterTrail(state, playerIdx, cardAId, cardBId, otherPlayerIdx) {
  const cardA = state.riverCards.find(c => c.id === cardAId);
  const cardB = state.riverCards.find(c => c.id === cardBId);
  if (!cardA || !cardB || cardA.id === cardB.id) return false;
  if (typeof cardA.slot !== 'number' || typeof cardB.slot !== 'number') return false;
  if (workersOnCard(cardA, playerIdx) <= 0) return false;
  if (workersOnCard(cardB, otherPlayerIdx) <= 0) return false;
  cardA.workers[playerIdx] -= 1;
  if (cardA.workers[playerIdx] === 0) delete cardA.workers[playerIdx];
  cardB.workers[otherPlayerIdx] -= 1;
  if (cardB.workers[otherPlayerIdx] === 0) delete cardB.workers[otherPlayerIdx];
  cardA.workers[otherPlayerIdx] = (cardA.workers[otherPlayerIdx] || 0) + 1;
  cardB.workers[playerIdx] = (cardB.workers[playerIdx] || 0) + 1;
  advancePlayer(state, playerIdx, cardCost(cardA));
  return true;
}

// Snare Set (mink species starter): same effect as Tribute Stone but tracked
// via snareSetUsed so a mink with both can use each independently.
function doSnareSet(state, playerIdx, victimIdx, card) {
  const p = state.players[playerIdx];
  const victim = state.players[victimIdx];
  if (p.snareSetUsed) return false;
  if (workersOnCard(card, victimIdx) <= 0) return false;
  card.workers[victimIdx] -= 1;
  if (card.workers[victimIdx] === 0) delete card.workers[victimIdx];
  if (typeof card.slot === 'number') { card.blanks += 1; noteBlanks(state); }
  victim.supply += 1;
  victim.timePos = Math.max(0, victim.timePos - 3);
  p.snareSetUsed = true;
  return true;
}

// Rolling Float (otter species starter): once-per-game free worker swap
// between two cards in the SAME river slot. Variant of Otter Trail with no
// fish cost and a slot-equality constraint.
function doRollingFloat(state, playerIdx, cardA, cardB, otherIdx) {
  const p = state.players[playerIdx];
  if (p.rollingFloatUsed) return false;
  if (cardA.slot !== cardB.slot || typeof cardA.slot !== 'number') return false;
  if (workersOnCard(cardA, playerIdx) <= 0) return false;
  if (workersOnCard(cardB, otherIdx) <= 0) return false;
  cardA.workers[playerIdx] -= 1;
  if (cardA.workers[playerIdx] === 0) delete cardA.workers[playerIdx];
  cardB.workers[otherIdx] -= 1;
  if (cardB.workers[otherIdx] === 0) delete cardB.workers[otherIdx];
  cardA.workers[otherIdx] = (cardA.workers[otherIdx] || 0) + 1;
  cardB.workers[playerIdx] = (cardB.workers[playerIdx] || 0) + 1;
  p.rollingFloatUsed = true;
  return true;
}

function findRollingFloatTarget(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) {
    for (const m in s.cost) {
      needs[m] = Math.max(needs[m], Math.max(0, s.cost[m] - (wbm[m] || 0)));
    }
  }
  let best = null, bestScore = 0;
  for (const cardA of state.riverCards) {
    if (typeof cardA.slot !== 'number') continue;
    if (workersOnCard(cardA, playerIdx) <= 0) continue;
    for (const cardB of state.riverCards) {
      if (cardB.id === cardA.id) continue;
      if (cardB.slot !== cardA.slot) continue;
      for (const k in cardB.workers) {
        const opIdx = parseInt(k);
        if (opIdx === playerIdx) continue;
        if (cardB.workers[k] <= 0) continue;
        // Net benefit: gain need for B's material, lose need for A's material.
        const score = (needs[cardB.material] || 0) - (needs[cardA.material] || 0);
        if (score > bestScore) {
          best = { cardA, cardB, otherIdx: opIdx };
          bestScore = score;
        }
      }
    }
  }
  return best;
}

function findOtterTrailTarget(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) {
    for (const m in s.cost) {
      needs[m] = Math.max(needs[m], Math.max(0, s.cost[m] - (wbm[m] || 0)));
    }
  }
  let bestB = null, bestBOther = -1, bestBNeed = 0;
  for (const c of state.riverCards) {
    if (typeof c.slot !== 'number') continue;
    if ((needs[c.material] || 0) === 0) continue;
    for (const k in c.workers) {
      const opIdx = parseInt(k);
      if (opIdx === playerIdx) continue;
      if (c.workers[k] <= 0) continue;
      if (needs[c.material] > bestBNeed) {
        bestBNeed = needs[c.material];
        bestB = c;
        bestBOther = opIdx;
      }
    }
  }
  if (!bestB) return null;
  let bestA = null, bestACost = Infinity;
  for (const c of state.riverCards) {
    if (c.id === bestB.id) continue;
    if (typeof c.slot !== 'number') continue;
    if (workersOnCard(c, playerIdx) <= 0) continue;
    const cost = cardCost(c);
    const uselessBonus = (needs[c.material] || 0) === 0 ? -1 : 0;
    if (cost + uselessBonus < bestACost) { bestACost = cost + uselessBonus; bestA = c; }
  }
  if (!bestA) return null;
  if (cardCost(bestA) > bestBNeed * 2) return null;
  return { cardA: bestA, cardB: bestB, otherIdx: bestBOther };
}

// Salmon Run: marginal fish cost for the 1st/2nd/3rd/4th/5th worker placed.
const SALMON_RUN_COSTS = [2, 3, 5, 8, 13];
function salmonRunCumulativeCost(n) {
  let total = 0;
  for (let i = 0; i < n && i < SALMON_RUN_COSTS.length; i++) total += SALMON_RUN_COSTS[i];
  return total;
}

function doSalmonRun(state, playerIdx, cardId, workerCount) {
  const p = state.players[playerIdx];
  const card = state.riverCards.find(c => c.id === cardId);
  if (!card || typeof card.slot !== 'number') return false;
  const maxPlaceable = Math.min(workerCount, p.supply, uncoveredIcons(card), SALMON_RUN_COSTS.length);
  if (maxPlaceable <= 0) return false;
  const cost = salmonRunCumulativeCost(maxPlaceable);
  card.workers[playerIdx] = (card.workers[playerIdx] || 0) + maxPlaceable;
  p.supply -= maxPlaceable;
  advancePlayer(state, playerIdx, cost);
  return true;
}

function findSalmonRunTarget(state, playerIdx, needs) {
  const p = state.players[playerIdx];
  let best = null;
  for (const c of state.riverCards) {
    if (typeof c.slot !== 'number') continue;
    const need = needs[c.material] || 0;
    if (need === 0) continue;
    const yieldPerWorker = playerCardCost(state, c, playerIdx);
    let bestN = 0, bestGain = 0;
    const maxN = Math.min(p.supply, uncoveredIcons(c), need, SALMON_RUN_COSTS.length);
    for (let n = 1; n <= maxN; n++) {
      const gain = n * yieldPerWorker - salmonRunCumulativeCost(n);
      if (gain > bestGain) { bestGain = gain; bestN = n; }
    }
    if (bestN > 0 && (best === null || bestGain > best.gain)) {
      best = { card: c, n: bestN, gain: bestGain };
    }
  }
  return best;
}

// Beaver Tow: pay 2 fish, slide a river card 1 slot upstream (toward Headwaters).
function doBeaverTow(state, playerIdx, cardId) {
  const card = state.riverCards.find(c => c.id === cardId);
  if (!card || typeof card.slot !== 'number' || card.slot === 0) return false;
  card.slot -= 1;
  advancePlayer(state, playerIdx, 2);
  return true;
}

function findBeaverTowTarget(state, playerIdx, needs) {
  let best = null;
  for (const c of state.riverCards) {
    if (typeof c.slot !== 'number' || c.slot === 0) continue;
    if ((needs[c.material] || 0) === 0) continue;
    if (uncoveredIcons(c) < 4) continue;
    if (!best || c.slot > best.slot || (c.slot === best.slot && uncoveredIcons(c) > uncoveredIcons(best))) best = c;
  }
  return best;
}

// Heron Roost / Driftwood Snag / Tribute Stone: optional start-of-turn abilities.
// Auto-fire for AI when conditions are met. Heron Roost / Driftwood Snag each
// cost 1 fish; Tribute Stone is free (once per game).
function aiStartOfTurnAbilities(state, playerIdx) {
  const p = state.players[playerIdx];
  // Heron Roost: replace a pre-river card whose material isn't in this AI's hand.
  if (hasEffect(p, 'Heron Roost') && state.matDeck.length > 0 && p.timePos < ENDGAME_TRACK_END - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const target = state.prerivCards.findIndex(c => c && !myMats.has(c.material));
    if (target !== -1) {
      const newCard = state.matDeck.pop();
      newCard.slot = 'pre';
      state.prerivCards[target] = newCard;
      state.metrics.iconsSpawned += newCard.totalIcons;
      p.timePos += 1; // 1 fish cost
    }
  }
  // Driftwood Snag: drop a blank on a card with the most uncovered icons (disruption).
  if (hasEffect(p, 'Driftwood Snag') && p.timePos < ENDGAME_TRACK_END - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const cands = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => uncoveredIcons(c) >= 4 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1; // 1 fish cost
    }
  }
  // Tribute Stone: fire when there's a high-value opponent worker (per-item cost ≥ 3)
  // and we're not too deep into endgame (compensation is useless if the victim is already retired).
  if (hasEffect(p, 'Tribute Stone') && !p.tributeStoneUsed && p.timePos < ENDGAME_TRACK_END - 10) {
    const target = findTributeStoneTarget(state, playerIdx);
    if (target && target.value >= 3) doTributeStone(state, playerIdx, target.victimIdx, target.card);
  }
  // Otter Trail: swap to pry an opponent off a useful material card.
  if (hasEffect(p, 'Otter Trail') && p.timePos < ENDGAME_TRACK_END - 5) {
    const target = findOtterTrailTarget(state, playerIdx);
    if (target && p.timePos + cardCost(target.cardA) < ENDGAME_TRACK_END) {
      doOtterTrail(state, playerIdx, target.cardA.id, target.cardB.id, target.otherIdx);
    }
  }
  // Snare Set (mink species starter): mirrors Tribute Stone but with its own
  // once-per-game flag, so a mink with both can use each independently.
  if (hasEffect(p, 'Snare Set') && !p.snareSetUsed && p.timePos < ENDGAME_TRACK_END - 10) {
    const target = findTributeStoneTarget(state, playerIdx);
    if (target && target.value >= 3) doSnareSet(state, playerIdx, target.victimIdx, target.card);
  }
  // Rolling Float (otter species starter): once-per-game free same-slot swap.
  if (hasEffect(p, 'Rolling Float') && !p.rollingFloatUsed) {
    const target = findRollingFloatTarget(state, playerIdx);
    if (target) doRollingFloat(state, playerIdx, target.cardA, target.cardB, target.otherIdx);
  }
  // Tail Slap (beaver species starter): drop a blank on a R1 card whose
  // material we don't need (deny opponents who do). Costs 1 fish.
  if (hasEffect(p, 'Tail Slap') && p.timePos < ENDGAME_TRACK_END - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const cands = state.riverCards
      .filter(c => c.slot === 0 && uncoveredIcons(c) >= 3 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1;
    }
  }
  // Channel Clearer (muskrat species starter): discard 1 opponent Reed worker
  // from any river card. No fish cost, no blank.
  if (hasEffect(p, 'Channel Clearer')) {
    let pick = null;
    for (const c of state.riverCards) {
      if (c.material !== 'reeds') continue;
      for (const k in c.workers) {
        const opIdx = parseInt(k);
        if (opIdx === playerIdx || c.workers[k] <= 0) continue;
        pick = { card: c, victimIdx: opIdx };
        break;
      }
      if (pick) break;
    }
    if (pick) {
      pick.card.workers[pick.victimIdx] -= 1;
      if (pick.card.workers[pick.victimIdx] === 0) delete pick.card.workers[pick.victimIdx];
      state.players[pick.victimIdx].supply += 1;
    }
  }
}

// Returns {safe, fallback}: ordered lists of {cardId, count}.
//   safe     — no-regret recalls: shoreline (no blank), then irrelevant-material
//              river workers, then surplus useful workers (placed > hand cap).
//   fallback — at-cap useful workers, river-side, highest per-item cost first.
//              These risk delaying a planned build, so callers should only dip
//              into them when supply is genuinely 0 or to satisfy a min-bid.
function aiRecallBudget(state, playerIdx) {
  const p = state.players[playerIdx];
  const useful = new Set();
  for (const s of p.hand) for (const m in s.cost) useful.add(m);
  const cap = {};
  for (const m of MAT_KEYS) cap[m] = 0;
  for (const s of p.hand) for (const m in s.cost) cap[m] = Math.max(cap[m], s.cost[m]);
  const placed = playerWorkersByMaterial(state, playerIdx);
  const safe = [], fallback = [];
  const cards = [
    ...state.shorelineCards.map(c => ({ c, river: false })),
    ...state.riverCards.slice().sort((a, b) => cardCost(b) - cardCost(a)).map(c => ({ c, river: true })),
  ];
  for (const { c, river } of cards) {
    const w = workersOnCard(c, playerIdx);
    if (w === 0) continue;
    let safeRecall;
    if (!useful.has(c.material)) safeRecall = w;
    else safeRecall = Math.min(w, Math.max(0, placed[c.material] - cap[c.material]));
    if (safeRecall > 0) {
      safe.push({ cardId: c.id, count: safeRecall });
      placed[c.material] -= safeRecall;
    }
    const remaining = w - safeRecall;
    if (remaining > 0 && river) fallback.push({ cardId: c.id, count: remaining });
  }
  return { safe, fallback };
}

function totalCount(list) { return list.reduce((s, x) => s + x.count, 0); }

// Total worker pool a player could marshal for an auction = supply + all recallable.
function aiTriggerPool(state, playerIdx) {
  const { safe, fallback } = aiRecallBudget(state, playerIdx);
  return state.players[playerIdx].supply + totalCount(safe) + totalCount(fallback);
}

// Recall up to `count` workers from the given ordered list of recall items.
function aiRecallFromList(state, playerIdx, list, count) {
  if (count <= 0) return 0;
  const spec = [];
  let need = count;
  for (const item of list) {
    if (need <= 0) break;
    const take = Math.min(item.count, need);
    spec.push({ cardId: item.cardId, count: take });
    need -= take;
  }
  if (spec.length === 0) return 0;
  callWorkersHome(state, playerIdx, spec);
  return count - need;
}

function aiBrowseDiscardChoice(state, playerIdx, drawn) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const all = [
    ...p.hand.map((s, i) => ({ s, key: 'h' + i })),
    ...drawn.map((s, i) => ({ s, key: 'd' + i })),
  ];
  function score(s) {
    let deficit = 0;
    for (const m in s.cost) deficit += Math.max(0, s.cost[m] - (wbm[m] || 0));
    return s.vp - deficit * 1.5;
  }
  all.sort((a, b) => score(a.s) - score(b.s));
  const N = drawn.length;
  return new Set(all.slice(0, N).map(o => o.key));
}

function aiChooseFlushTarget(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) {
    for (const m in s.cost) {
      const deficit = Math.max(0, s.cost[m] - (wbm[m] || 0));
      needs[m] = Math.max(needs[m], deficit);
    }
  }
  let best = -1, bestScore = -Infinity;
  for (let i = 0; i < state.prerivCards.length; i++) {
    const c = state.prerivCards[i];
    if (!c) continue;
    const need = needs[c.material];
    const got = Math.min(uncoveredIcons(c), p.supply, need);
    const score = need * got;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  if (best === -1) {
    for (let i = 0; i < state.prerivCards.length; i++) if (state.prerivCards[i] !== null) return i;
  }
  return best;
}

// =============================================================================
// EXECUTE TURN
// =============================================================================
function performBuild(state, playerIdx, handIdx) {
  const p = state.players[playerIdx];
  const struct = p.hand[handIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const { eff: effCost, granaryUsed } = effectiveBuildCost(struct, p, wbm);
  if (granaryUsed) p.granaryUsed = true;
  // Track how many workers we actually pull off cards (for supply refund) —
  // this can differ from effCost when Old Growth doubles a card's yield.
  let workersReturned = 0;
  let vineCurtainHit = false; // fires Vine Curtain peek-rearrange once per build
  const remainingNeed = { ...effCost };

  // Helper: consume up to `need` material from `card` for the building player.
  // Returns { take, yielded } where take is workers pulled (returned to supply)
  // and yielded is material units produced (≥ take when Old Growth doubles).
  const consume = (c, need) => {
    const have = workersOnCard(c, playerIdx);
    if (have === 0 || need === 0) return { take: 0, yielded: 0 };
    const mult = cardYieldMultiplier(c);
    const wantWorkers = Math.ceil(need / mult);
    const take = Math.min(have, wantWorkers);
    c.workers[playerIdx] = have - take;
    if (c.workers[playerIdx] === 0) delete c.workers[playerIdx];
    if (typeof c.slot === 'number') c.blanks += take;
    if (take > 0 && c.effect === 'peek-rearrange') vineCurtainHit = true;
    return { take, yielded: take * mult };
  };

  // Pass A: vanilla (non-wild) cards first — preserves wild capacity for
  // materials that have no vanilla source.
  for (const m of Object.keys(remainingNeed)) {
    if (remainingNeed[m] === 0) continue;
    for (const c of state.shorelineCards) {
      if (remainingNeed[m] === 0) break;
      if (c.material !== m || c.wildAlt) continue;
      const { take, yielded } = consume(c, remainingNeed[m]);
      remainingNeed[m] = Math.max(0, remainingNeed[m] - yielded);
      workersReturned += take;
    }
    const riverVanilla = state.riverCards
      .filter(c => c.material === m && !c.wildAlt && workersOnCard(c, playerIdx) > 0)
      .sort((a, b) => cardCost(a) - cardCost(b));
    for (const c of riverVanilla) {
      if (remainingNeed[m] === 0) break;
      const { take, yielded } = consume(c, remainingNeed[m]);
      remainingNeed[m] = Math.max(0, remainingNeed[m] - yielded);
      workersReturned += take;
    }
  }

  // Pass B: wild cards cover any leftover deficits (greedy — same shape as
  // canCoverWithWild).  Visit pools in deck order; each pool fulfills its
  // largest-remaining-deficit material first.
  const wildCards = []
    .concat(state.shorelineCards.filter(c => c.wildAlt && workersOnCard(c, playerIdx) > 0))
    .concat(state.riverCards.filter(c => c.wildAlt && workersOnCard(c, playerIdx) > 0)
      .sort((a, b) => cardCost(a) - cardCost(b)));
  for (const c of wildCards) {
    const options = [c.material, c.wildAlt].sort((a, b) => (remainingNeed[b] || 0) - (remainingNeed[a] || 0));
    for (const m of options) {
      if ((remainingNeed[m] || 0) === 0) continue;
      if (workersOnCard(c, playerIdx) === 0) break;
      const { take, yielded } = consume(c, remainingNeed[m]);
      remainingNeed[m] = Math.max(0, (remainingNeed[m] || 0) - yielded);
      workersReturned += take;
    }
  }

  noteBlanks(state);
  p.supply += workersReturned;
  if (vineCurtainHit) aiVineCurtainRearrange(state, playerIdx);
  // Otter Slide: build advances 3 fewer fish (min 1). Cards with printed time 0 stay 0.
  const slideDiscount = hasEffect(p, 'Otter Slide') ? 3 : 0;
  const timeCost = struct.time === 0 ? 0 : Math.max(1, struct.time - slideDiscount);
  advancePlayer(state, playerIdx, timeCost);
  p.hand.splice(handIdx, 1);
  p.built.push(struct);
  state.metrics.cardsBuilt++;
  fireOnBuildEffect(state, playerIdx, struct);
  // Replace from deck up to maxHandSize (Cache Burrow → 4).
  while (p.hand.length < maxHandSize(p) && structAvailable(state) > 0) {
    p.hand.push(popStructDeck(state));
  }
  cleanupShoreline(state);
}

function fireOnBuildEffect(state, playerIdx, struct) {
  const p = state.players[playerIdx];
  if (!effectActive(struct.name)) return;
  if (struct.name === 'Burrow Run') {
    p.timePos = Math.max(0, p.timePos - 5);
    return;
  }
  if (struct.name === 'Royal Lodge') {
    state.bonusTurnPlayer = playerIdx;
    return;
  }
  if (struct.name === 'Beaver Dam') {
    const r1 = state.riverCards.filter(c => c.slot === 0);
    if (r1.length === 0) return;
    // Pick the R1 card whose removal best frees the river — most uncovered
    // icons (it's been sitting there blocking new arrivals). Tie-break: fewest
    // of our own workers (smaller ergonomic cost to us).
    r1.sort((a, b) => {
      const ua = uncoveredIcons(a), ub = uncoveredIcons(b);
      if (ua !== ub) return ub - ua;
      return workersOnCard(a, playerIdx) - workersOnCard(b, playerIdx);
    });
    moveCardToShoreline(state, r1[0]);
    p.timePos = Math.max(0, p.timePos - 2);
    return;
  }
  if (struct.name === 'Mud Levee') {
    let dropped = 0;
    const cands = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => uncoveredIcons(c) > 0)
      .sort((a, b) => uncoveredIcons(b) - uncoveredIcons(a));
    for (const c of cands) {
      while (dropped < 2 && uncoveredIcons(c) > 0) { c.blanks++; dropped++; }
      if (dropped >= 2) break;
    }
    noteBlanks(state);
    return;
  }
  if (struct.name === 'Flush Channel') {
    // Pick one Headwaters card to discard (out of game) and refill its slot.
    // AI heuristic: discard the card that's least likely to be useful for our
    // own hand — i.e. the material we need least, with most icons (so removing
    // it stops opponents from cheaply grabbing it).
    const slots = [];
    for (let i = 0; i < state.prerivCards.length; i++) {
      if (state.prerivCards[i]) slots.push(i);
    }
    if (slots.length === 0) return;
    const need = (mat) => {
      let n = 0;
      for (const s of p.hand) n += s.cost[mat] || 0;
      return n;
    };
    slots.sort((a, b) => {
      const ca = state.prerivCards[a], cb = state.prerivCards[b];
      const na = need(ca.material), nb = need(cb.material);
      if (na !== nb) return na - nb; // lowest need first
      return cb.totalIcons - ca.totalIcons; // tie: most icons (denial value)
    });
    const targetIdx = slots[0];
    state.prerivCards[targetIdx] = null;
    refillPreriv(state, targetIdx);
    return;
  }
  if (struct.name === 'Sap Drip') {
    // Place 2 free workers on a river card whose material we actually need. Fall
    // back to max-uncovered-icons if nothing is needed.
    const wbm = playerWorkersByMaterial(state, playerIdx);
    const need = m => Math.max(0, ...p.hand.map(s => (s.cost[m] || 0) - (wbm[m] || 0)));
    const candsAll = state.riverCards.filter(c => uncoveredIcons(c) > 0);
    if (candsAll.length === 0 || p.supply === 0) return;
    candsAll.sort((a, b) => {
      const aScore = Math.min(2, need(a.material), uncoveredIcons(a));
      const bScore = Math.min(2, need(b.material), uncoveredIcons(b));
      if (aScore !== bScore) return bScore - aScore;
      return uncoveredIcons(b) - uncoveredIcons(a);
    });
    const target = candsAll[0];
    const place = Math.min(2, p.supply, uncoveredIcons(target));
    if (place > 0) {
      p.supply -= place;
      target.workers[playerIdx] = (target.workers[playerIdx] || 0) + place;
    }
    return;
  }
  if (struct.name === 'Snag Pile') {
    const targetIdx = aiChooseFlushTarget(state, playerIdx);
    if (targetIdx === -1) return;
    const card = state.prerivCards[targetIdx];
    if (!card) return;
    runAuction(state, card, playerIdx, 1);
    return;
  }
  if (struct.name === 'Vine Lattice') {
    const drawCount = Math.min(3, structAvailable(state));
    if (drawCount === 0) return;
    const drawn = [];
    for (let i = 0; i < drawCount; i++) drawn.push(popStructDeck(state));
    const wbm = playerWorkersByMaterial(state, playerIdx);
    function score(s) {
      let deficit = 0;
      for (const m in s.cost) deficit += Math.max(0, s.cost[m] - (wbm[m] || 0));
      return s.vp - deficit * 1.5;
    }
    drawn.sort((a, b) => score(b) - score(a));
    p.hand.push(drawn[0]);
    for (let i = 1; i < drawn.length; i++) state.structDiscard.push(drawn[i]);
    return;
  }
  if (struct.name === 'Stone Pool') {
    // Reorder top 5 so the AI's needed materials are closest to the river. Tie-break
    // by icon count (more icons = more value in upcoming auctions).
    const top = state.matDeck.slice(-5);
    if (top.length === 0) return;
    const wbm = playerWorkersByMaterial(state, playerIdx);
    const matNeed = {};
    for (const m of MAT_KEYS) matNeed[m] = 0;
    for (const s of p.hand) for (const m in s.cost) {
      matNeed[m] = Math.max(matNeed[m], (s.cost[m] || 0) - (wbm[m] || 0));
    }
    // Sort ascending; back of array is top of deck (popped first), so end with high-need.
    top.sort((a, b) => {
      const an = matNeed[a.material] || 0;
      const bn = matNeed[b.material] || 0;
      if (an !== bn) return an - bn;
      return a.totalIcons - b.totalIcons;
    });
    state.matDeck.splice(state.matDeck.length - top.length, top.length, ...top);
    return;
  }
  if (struct.name === 'Salt Lick') {
    // No-op for sim — AI doesn't model opponent hand-knowledge.
    return;
  }
}

function executeAction(state, playerIdx, action) {
  const p = state.players[playerIdx];
  if (action.type === 'pass') {
    advancePlayer(state, playerIdx, 1);
    return;
  }
  if (action.type === 'beaverTow') {
    doBeaverTow(state, playerIdx, action.cardId);
    return;
  }
  if (action.type === 'salmonRun') {
    doSalmonRun(state, playerIdx, action.cardId, action.workerCount);
    return;
  }
  if (action.type === 'build') {
    performBuild(state, playerIdx, action.handIdx);
    return;
  }
  if (action.type === 'auction') {
    const card = state.riverCards.find(c => c.id === action.cardId);
    advancePlayer(state, playerIdx, 1);
    if (card) runAuction(state, card, playerIdx, 1);
    return;
  }
  if (action.type === 'preriv') {
    const card = state.prerivCards[action.slotIdx];
    if (!card) return;
    advancePlayer(state, playerIdx, prerivTriggerCost(action.slotIdx));
    runAuction(state, card, playerIdx, 1);
    return;
  }
  if (action.type === 'flush') {
    advancePlayer(state, playerIdx, 5);
    for (let i = 0; i < state.prerivCards.length; i++) state.prerivCards[i] = null;
    for (let i = 0; i < state.prerivCards.length; i++) {
      if (state.matDeck.length === 0) break;
      const c = state.matDeck.pop();
      c.slot = 'pre';
      state.prerivCards[i] = c;
      state.metrics.iconsSpawned += c.totalIcons;
    }
    const targetIdx = aiChooseFlushTarget(state, playerIdx);
    if (targetIdx === -1) return;
    const card = state.prerivCards[targetIdx];
    if (card) runAuction(state, card, playerIdx, 1);
    return;
  }
  if (action.type === 'browse') {
    const N = action.n;
    const drawCount = Math.min(N, structAvailable(state));
    const drawn = [];
    for (let i = 0; i < drawCount; i++) drawn.push(popStructDeck(state));
    advancePlayer(state, playerIdx, drawCount);
    const sel = aiBrowseDiscardChoice(state, playerIdx, drawn);
    const newHand = [];
    p.hand.forEach((s, i) => { if (!sel.has('h' + i)) newHand.push(s); });
    drawn.forEach((s, i) => { if (!sel.has('d' + i)) newHand.push(s); });
    const discarded = [];
    p.hand.forEach((s, i) => { if (sel.has('h' + i)) discarded.push(s); });
    drawn.forEach((s, i) => { if (sel.has('d' + i)) discarded.push(s); });
    for (const d of discarded) state.structDiscard.push(d);
    p.hand = newHand;
    return;
  }
}

function checkGameEnd(state) {
  if (state.matDeck.length > 0) return false;
  if (state.prerivCards.some(c => c !== null)) return false;
  if (state.riverCards.some(c => uncoveredIcons(c) > 0)) return false;
  for (const p of state.players) {
    const wbm = playerWorkersByMaterial(state, p.idx);
    for (const s of p.hand) if (canBuild(s, wbm, p)) return false;
  }
  return true;
}

// =============================================================================
// RUN ONE GAME
// =============================================================================
function runGame(numPlayers, numMats = ORIG_MATERIALS.length, workersPerPlayer = 8) {
  configureMaterials(numMats);
  const state = newGame(numPlayers, workersPerPlayer);
  // initial spawned icons (3 upstream)
  for (const c of state.prerivCards) if (c) state.metrics.iconsSpawned += c.totalIcons;
  while (!state.gameOver && state.metrics.turns < MAX_TURNS) {
    if (!state.endgame && state.matDeck.length === 0) triggerEndgame(state);
    if (state.endgame && state.players.every(p => p.out)) break;

    const cur = pickNextPlayer(state);
    if (cur === -1) break;
    state.currentPlayer = cur;
    state.metrics.turns++;

    const p = state.players[cur];
    aiStartOfTurnAbilities(state, p.idx);
    const action = aiChooseAction(state, p.idx);
    executeAction(state, p.idx, action);
    cleanupShoreline(state);

    if (state.endgame && !p.out) {
      const reachedEnd = p.timePos >= ENDGAME_TRACK_END;
      const passed = action.type === 'pass';
      if (reachedEnd || passed) p.out = true;
    }
    maybeFireSlipstream(state, p.idx);
    if (state.endgame && state.players.every(pp => pp.out)) break;
    if (checkGameEnd(state)) break;
  }
  // Final per-player VP tally (includes effect bonuses; ablation toggles via STRUCTURE_EFFECT_DISABLED).
  const vps = state.players.map(p => totalVP(p, state));
  vps.sort((a, b) => b - a);
  state.metrics.winnerVP = vps[0];
  state.metrics.runnerUpVP = vps.length > 1 ? vps[1] : 0;
  state.metrics.loserVP = vps[vps.length - 1];
  state.metrics.vpSpread = vps[0] - vps[vps.length - 1];
  state.metrics.winMargin = vps.length > 1 ? vps[0] - vps[1] : vps[0];
  state.metrics.totalVP = vps.reduce((s, x) => s + x, 0);
  return state.metrics;
}

// =============================================================================
// SWEEP
// =============================================================================
function avg(xs) { return xs.reduce((s, x) => s + x, 0) / xs.length; }
function pct(num, den) { return den === 0 ? 0 : (num / den) * 100; }
function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

function sweep() {
  // Sweep player count × workers/player with player-tiered deck:
  //   "always" cards in every game, "3+" added in 3P/4P, "4+" added in 4P,
  //   plus 4P-only premium cards.
  const numMats = 6;
  const N = 800;

  console.log(`\nRiver Bankers player × workers sweep (${N} games per config)`);
  console.log(`Setting: ${numMats} materials, tiered deck (always [${ALWAYS_ICONS.join(',')}]/mat, 3+ adds [${TIER_3PLUS_ICONS.join(',')}]/mat, 4+ adds [${TIER_4PLUS_ICONS.join(',')}]/mat + ${PREMIUM_4P.length} premium 4P-only cards).\n`);
  // Show deck composition per player count
  for (const numP of [2, 3, 4]) {
    configureMaterials(numMats);
    const specs = makeCardSpecs(numP);
    const totIcons = specs.reduce((s, x) => s + x.icons, 0);
    console.log(`  ${numP}P deck: ${specs.length} cards, ${totIcons} icons total (${(totIcons / specs.length).toFixed(1)} avg)`);
  }
  console.log();
  console.log(
    pad('numP', 5) + pad('wkrs', 5) +
    padL('turns', 7) + padL('t/p', 6) +
    padL('aucs', 6) + padL('jam%', 7) + padL('nob%', 7) + padL('wst%', 7) +
    padL('built/p', 8) + padL('endg%', 7) +
    padL('winVP', 7) + padL('lastVP', 8) + padL('spread', 8) + padL('margin', 8)
  );
  console.log('-'.repeat(5+5+7+6+6+7+7+7+8+7+7+8+8+8));

  for (const numP of [2, 3, 4]) {
    for (const workers of [6, 8, 10]) {
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const nobPct = avg(trials.map(m => pct(m.noBidAuctions, m.auctions)));
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const endg = avg(trials.map(m => m.endgameTriggered ? 100 : 0));
      const winVP = avg(trials.map(m => m.winnerVP));
      const lastVP = avg(trials.map(m => m.loserVP));
      const spread = avg(trials.map(m => m.vpSpread));
      const margin = avg(trials.map(m => m.winMargin));
      console.log(
        pad(numP, 5) + pad(workers, 5) +
        padL(turns.toFixed(0), 7) + padL((turns / numP).toFixed(0), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 7) + padL(nobPct.toFixed(1), 7) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL((built / numP).toFixed(1), 8) +
        padL(endg.toFixed(0) + '%', 7) +
        padL(winVP.toFixed(1), 7) +
        padL(lastVP.toFixed(1), 8) +
        padL(spread.toFixed(1), 8) +
        padL(margin.toFixed(1), 8)
      );
    }
    console.log();
  }
  console.log('Legend:');
  console.log('  numP    = number of players');
  console.log('  wkrs    = starting workers per player');
  console.log('  turns   = avg total player-turns per game');
  console.log('  t/p     = avg turns per player (turns / numP)');
  console.log('  aucs    = avg auctions per game');
  console.log('  jam%    = auctions where total bid > open icons');
  console.log('  nob%    = auctions with no bids');
  console.log('  wst%    = wasted icons as % of total icons spawned');
  console.log('  built/p = avg structures built per player');
  console.log('  endg%   = % of games that triggered endgame (deck emptied)');
  console.log('  winVP   = avg VP of the winner');
  console.log('  lastVP  = avg VP of the last-place player');
  console.log('  spread  = avg (winner − last) VP within a game');
  console.log('  margin  = avg (winner − runner-up) VP within a game\n');
}

function sweepSpec() {
  // Sweep speculative-bid probability at fixed numP=3, workers=8, 6 materials.
  // Reports jam rate, river-depth distribution, and zero-clinch failure rates.
  const numMats = 6;
  const numP = 3;
  const workers = 8;
  const N = 1500;
  const probs = [0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50];

  console.log(`\nSpeculative-bid probability sweep`);
  console.log(`Setting: ${numP}P, ${workers} workers/player, ${numMats} materials, ${N} games per row.\n`);
  console.log(
    pad('specP', 7) +
    padL('aucs', 6) + padL('jam%', 6) +
    padL('skip%', 7) + padL('exitR', 7) + padL('past1%', 8) +
    padL('zcAuc%', 8) + padL('zcBid%', 8) +
    padL('wst%', 7) + padL('endg%', 7) +
    padL('built/p', 8) + padL('winVP', 7)
  );
  console.log('-'.repeat(7+6+6+7+7+8+8+8+7+7+8+7));

  for (const prob of probs) {
    setSpeculativeBidProb(prob);
    const trials = [];
    for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
    const auctions = avg(trials.map(m => m.auctions));
    const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
    // Cards that exited via shore: pre→shore (skipped river) vs entered river
    const skipPct = avg(trials.map(m => pct(m.preToShoreCards, m.preToShoreCards + m.preToRiverCards)));
    // Among cards that entered the river: avg exit slot, 1-indexed (River 1..4)
    const allExits = [].concat(...trials.map(m => m.riverExitSlots));
    const exitMean = allExits.length ? (allExits.reduce((s, x) => s + x, 0) / allExits.length) + 1 : 0;
    const past1Pct = allExits.length ? (allExits.filter(s => s >= 1).length / allExits.length) * 100 : 0;
    // Zero-clinch rates
    const zcAucPct = avg(trials.map(m => pct(m.zeroClinchAuctions, m.auctions)));
    const zcBidPct = avg(trials.map(m => pct(m.zeroClinchBidders, m.nonZeroBidders)));
    const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
    const endg = avg(trials.map(m => m.endgameTriggered ? 100 : 0));
    const built = avg(trials.map(m => m.cardsBuilt));
    const winVP = avg(trials.map(m => m.winnerVP));
    console.log(
      pad(prob.toFixed(2), 7) +
      padL(auctions.toFixed(1), 6) +
      padL(jamPct.toFixed(1), 6) +
      padL(skipPct.toFixed(1) + '%', 7) +
      padL(exitMean.toFixed(2), 7) +
      padL(past1Pct.toFixed(1) + '%', 8) +
      padL(zcAucPct.toFixed(2) + '%', 8) +
      padL(zcBidPct.toFixed(2) + '%', 8) +
      padL(wstPct.toFixed(1) + '%', 7) +
      padL(endg.toFixed(0) + '%', 7) +
      padL((built / numP).toFixed(1), 8) +
      padL(winVP.toFixed(1), 7)
    );
  }
  setSpeculativeBidProb(0);
  console.log('\nLegend:');
  console.log('  specP    = speculative-bid probability (non-trigger AI bids 1 on a useful, cheap material)');
  console.log('  aucs     = avg auctions per game');
  console.log('  jam%     = % auctions where total bid > open icons (card slides downriver)');
  console.log('  skip%    = % of pre-river cards that went straight to shoreline without entering River 1');
  console.log('  exitR    = avg river slot a card left the river FROM, ONLY counting cards that entered (1.00 = River 1)');
  console.log('  past1%   = % of cards that entered the river and reached River 2 or deeper before exiting');
  console.log('  zcAuc%   = % of auctions where total bid > 0 but ZERO icons clinched (extreme jam)');
  console.log('  zcBid%   = % of nonzero-bid (player, auction) pairs that clinched 0 icons');
  console.log('  wst%     = wasted icons (washed to shoreline) as % of total icons spawned');
  console.log('  endg%    = % of games that triggered endgame (deck emptied)');
  console.log('  built/p  = avg structures built per player');
  console.log('  winVP    = avg VP of the winner\n');
}

function sweepDeck(ruleArg) {
  // Sweep deck-size shrinkage to find a play-time sweet spot.
  // Drops successively-larger cards from the always tier (and the 3+ / premium
  // tiers when relevant) so each row reduces total icons monotonically.
  // ruleArg: 'b' (default) or 'c' (uniform-slide rule).
  const ruleC = ruleArg === 'c';
  const numMats = 6;
  const workers = 8;
  const N = 1500;
  const baselinePremium = [
    { material: 'logs',   icons: 10 },
    { material: 'stones', icons: 10 },
    { material: 'mud',    icons: 10 },
    { material: 'reeds',  icons: 9 },
  ];
  // (label, always, tier3, tier4, premium)
  // "shift" is the live default; included here for back-to-back comparison.
  const decks = [
    { label: 'old',    always: [4,5,6,7], tier3: [8], tier4: [], premium: baselinePremium },
    { label: 'no-pre', always: [4,5,6,7], tier3: [8], tier4: [], premium: [] },
    { label: 'no-3+',  always: [4,5,6,7], tier3: [],  tier4: [], premium: [] },
    { label: 'tight',  always: [5,6,7],   tier3: [],  tier4: [], premium: [] },
    { label: 'tighter',always: [5,6],     tier3: [],  tier4: [], premium: [] },
    { label: 'shift',  always: [5,6,7],   tier3: [4], tier4: [8], premium: [] },
    // Smaller variants worth testing under rule (c) where games run longer
    // because the river hangs onto leftover-bearing cards.
    { label: 'shift-1',always: [5,6],     tier3: [4], tier4: [8], premium: [] }, // 12/18/24
    { label: 'shift-2',always: [5,7],     tier3: [4], tier4: [8], premium: [] }, // 12/18/24, larger avg icons
    { label: 'shift-x',always: [6],       tier3: [5], tier4: [4,7], premium: [] }, // 6/12/24
  ];

  console.log(`\nDeck-size sweep under rule (${ruleC ? 'c — uniform slide' : 'b — pre-river only'})`);
  console.log(`Setting: ${workers} workers/player, ${numMats} materials, ${N} games per row.\n`);
  console.log(
    pad('numP', 5) + pad('deck', 9) + padL('cards', 6) +
    padL('turns', 6) + padL('t/p', 5) + padL('~min', 6) +
    padL('aucs', 6) + padL('jam%', 6) +
    padL('skip%', 7) + padL('exitR', 7) + padL('past1%', 8) +
    padL('zcAuc%', 8) + padL('zcBid%', 8) +
    padL('wst%', 7) + padL('built/p', 8) + padL('winVP', 7)
  );
  console.log('-'.repeat(5+9+6+6+5+6+6+6+7+7+8+8+8+7+8+7));

  setSpeculativeBidProb(0);
  setPrerivPlentySlides(true);
  setAllPlentySlides(ruleC);
  for (const numP of [2, 3, 4]) {
    for (const d of decks) {
      setDeckTuning({ always: d.always, tier3: d.tier3, tier4: d.tier4, premium: d.premium });
      configureMaterials(numMats);
      const cardCount = makeCardSpecs(numP).length;
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const skipPct = avg(trials.map(m => pct(m.preToShoreCards, m.preToShoreCards + m.preToRiverCards)));
      const allExits = [].concat(...trials.map(m => m.riverExitSlots));
      const exitMean = allExits.length ? (allExits.reduce((s, x) => s + x, 0) / allExits.length) + 1 : 0;
      const past1Pct = allExits.length ? (allExits.filter(s => s >= 1).length / allExits.length) * 100 : 0;
      const zcAucPct = avg(trials.map(m => pct(m.zeroClinchAuctions, m.auctions)));
      const zcBidPct = avg(trials.map(m => pct(m.zeroClinchBidders, m.nonZeroBidders)));
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const winVP = avg(trials.map(m => m.winnerVP));
      const estMin = (turns * 30) / 60;
      console.log(
        pad(numP, 5) + pad(d.label, 9) + padL(cardCount, 6) +
        padL(turns.toFixed(0), 6) +
        padL((turns / numP).toFixed(0), 5) +
        padL(estMin.toFixed(1), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 6) +
        padL(skipPct.toFixed(1) + '%', 7) +
        padL(exitMean.toFixed(2), 7) +
        padL(past1Pct.toFixed(1) + '%', 8) +
        padL(zcAucPct.toFixed(2) + '%', 8) +
        padL(zcBidPct.toFixed(2) + '%', 8) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL((built / numP).toFixed(1), 8) +
        padL(winVP.toFixed(1), 7)
      );
    }
    console.log();
  }
  // Restore live defaults.
  setDeckTuning({ always: [5,7], tier3: [4], tier4: [8], premium: [] });
  setAllPlentySlides(true);
  console.log('Legend (deck variants):');
  console.log('  old      = pre-shift tiered deck: 4 cards/mat [4-7], +1 [8] at 3+, + 4 premium 4P-only');
  console.log('  no-pre   = drop the 4P premium cards');
  console.log('  no-3+    = also drop the [8]-icon cards added at 3+');
  console.log('  tight    = also drop the [4]-icon card → 3 cards/mat [5,6,7]');
  console.log('  tighter  = also drop the [7]-icon card → 2 cards/mat [5,6]');
  console.log('  shift    = always [5,6,7], +1 [4] at 3+, +1 [8] at 4+ → 18/24/30 cards by numP');
  console.log('  shift-1  = always [5,6], +1 [4] at 3+, +1 [8] at 4+ → 12/18/24 cards by numP');
  console.log('  shift-2  = LIVE DEFAULT: always [5,7], +1 [4] at 3+, +1 [8] at 4+ → 12/18/24 cards by numP');
  console.log('  shift-x  = always [6], +1 [5] at 3+, +2 [4,7] at 4+ → 6/12/24 cards by numP (4P-rich, 2P-thin)');
  console.log('  cards    = total material cards in the deck for that player count\n');
}

function sweepUniform() {
  // Compare current rule (b: pre-river plenty with leftovers slides to River 1)
  // vs rule (c: ANY plenty with leftovers slides one slot downstream).
  // Run on the live (shift) deck so the comparison reflects the actual game.
  const numMats = 6;
  const workers = 8;
  const N = 1500;

  console.log(`\nUniform-slide rule comparison (rule b vs rule c)`);
  console.log(`Setting: ${workers} workers/player, ${numMats} materials, shift deck (18/24/30 cards), ${N} games per row.\n`);
  console.log(
    pad('numP', 5) + pad('rule', 6) +
    padL('turns', 6) + padL('t/p', 5) + padL('~min', 6) +
    padL('aucs', 6) + padL('jam%', 6) +
    padL('skip%', 7) + padL('exitR', 7) + padL('past1%', 8) + padL('past2%', 8) +
    padL('zcAuc%', 8) + padL('zcBid%', 8) +
    padL('wst%', 7) + padL('built/p', 8) + padL('winVP', 7)
  );
  console.log('-'.repeat(5+6+6+5+6+6+6+7+7+8+8+8+8+7+8+7));

  setSpeculativeBidProb(0);
  for (const numP of [2, 3, 4]) {
    for (const variant of ['b', 'c']) {
      setPrerivPlentySlides(true);
      setAllPlentySlides(variant === 'c');
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const skipPct = avg(trials.map(m => pct(m.preToShoreCards, m.preToShoreCards + m.preToRiverCards)));
      const allExits = [].concat(...trials.map(m => m.riverExitSlots));
      const exitMean = allExits.length ? (allExits.reduce((s, x) => s + x, 0) / allExits.length) + 1 : 0;
      const past1Pct = allExits.length ? (allExits.filter(s => s >= 1).length / allExits.length) * 100 : 0;
      const past2Pct = allExits.length ? (allExits.filter(s => s >= 2).length / allExits.length) * 100 : 0;
      const zcAucPct = avg(trials.map(m => pct(m.zeroClinchAuctions, m.auctions)));
      const zcBidPct = avg(trials.map(m => pct(m.zeroClinchBidders, m.nonZeroBidders)));
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const winVP = avg(trials.map(m => m.winnerVP));
      const estMin = (turns * 30) / 60;
      console.log(
        pad(numP, 5) + pad(variant, 6) +
        padL(turns.toFixed(0), 6) +
        padL((turns / numP).toFixed(0), 5) +
        padL(estMin.toFixed(1), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 6) +
        padL(skipPct.toFixed(1) + '%', 7) +
        padL(exitMean.toFixed(2), 7) +
        padL(past1Pct.toFixed(1) + '%', 8) +
        padL(past2Pct.toFixed(1) + '%', 8) +
        padL(zcAucPct.toFixed(2) + '%', 8) +
        padL(zcBidPct.toFixed(2) + '%', 8) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL((built / numP).toFixed(1), 8) +
        padL(winVP.toFixed(1), 7)
      );
    }
    console.log();
  }
  // Restore live defaults.
  setPrerivPlentySlides(true);
  setAllPlentySlides(true);
  console.log('Legend:');
  console.log('  rule b   = pre-river plenty with leftovers → River 1 (no slide on river-card plenty)');
  console.log('  rule c   = LIVE: ANY plenty with leftovers slides one slot downstream (uniform rule)\n');
}

function sweepRule() {
  // Compare baseline vs rule-(b): pre-river plenty with leftovers slides to River 1.
  // Sweeps player count to verify the rule's effect across game sizes.
  const numMats = 6;
  const workers = 8;
  const N = 1500;

  console.log(`\nRule (b) comparison: pre-river plenty with leftovers → River 1 (vs → shoreline)`);
  console.log(`Setting: ${workers} workers/player, ${numMats} materials, ${N} games per row.\n`);
  console.log(
    pad('numP', 5) + pad('rule', 8) +
    padL('turns', 6) + padL('t/p', 5) + padL('~min', 6) +
    padL('aucs', 6) + padL('jam%', 6) +
    padL('skip%', 7) + padL('exitR', 7) + padL('past1%', 8) + padL('past2%', 8) +
    padL('zcAuc%', 8) + padL('zcBid%', 8) +
    padL('wst%', 7) + padL('built/p', 8) + padL('winVP', 7)
  );
  console.log('-'.repeat(5+8+6+5+6+6+6+7+7+8+8+8+8+7+8+7));

  setSpeculativeBidProb(0);
  setAllPlentySlides(false); // disable rule (c) for this comparison
  for (const numP of [2, 3, 4]) {
    for (const useB of [false, true]) {
      setPrerivPlentySlides(useB);
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const skipPct = avg(trials.map(m => pct(m.preToShoreCards, m.preToShoreCards + m.preToRiverCards)));
      const allExits = [].concat(...trials.map(m => m.riverExitSlots));
      const exitMean = allExits.length ? (allExits.reduce((s, x) => s + x, 0) / allExits.length) + 1 : 0;
      const past1Pct = allExits.length ? (allExits.filter(s => s >= 1).length / allExits.length) * 100 : 0;
      const past2Pct = allExits.length ? (allExits.filter(s => s >= 2).length / allExits.length) * 100 : 0;
      const zcAucPct = avg(trials.map(m => pct(m.zeroClinchAuctions, m.auctions)));
      const zcBidPct = avg(trials.map(m => pct(m.zeroClinchBidders, m.nonZeroBidders)));
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const winVP = avg(trials.map(m => m.winnerVP));
      // Play-time estimate: 30s per AI turn matches the web prototype's AI_TURN_FAKE_MS.
      // Treats every turn (real or AI) as 30s — proxy for live play with humans-as-AIs.
      const estMin = (turns * 30) / 60;
      console.log(
        pad(numP, 5) + pad(useB ? '(b)' : 'base', 8) +
        padL(turns.toFixed(0), 6) +
        padL((turns / numP).toFixed(0), 5) +
        padL(estMin.toFixed(1), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 6) +
        padL(skipPct.toFixed(1) + '%', 7) +
        padL(exitMean.toFixed(2), 7) +
        padL(past1Pct.toFixed(1) + '%', 8) +
        padL(past2Pct.toFixed(1) + '%', 8) +
        padL(zcAucPct.toFixed(2) + '%', 8) +
        padL(zcBidPct.toFixed(2) + '%', 8) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL((built / numP).toFixed(1), 8) +
        padL(winVP.toFixed(1), 7)
      );
    }
    console.log();
  }
  // Restore live defaults.
  setPrerivPlentySlides(true);
  setAllPlentySlides(true);
  console.log('Legend:');
  console.log('  rule     = base (no slide) vs (b) (pre-river plenty with leftovers → River 1)');
  console.log('  past2%   = % of cards that entered the river and reached River 3 or deeper before exiting');
  console.log('  (other columns same as `node sim.js spec`)\n');
}

// =============================================================================
// PER-CARD EFFECT ABLATION
// =============================================================================
// For each card with an effect, compute the average VP a player gains when they
// BUILD that card with the effect on vs. off. The diff is the effect's average
// VP contribution to the builder's score — useful for tuning printed VP values.
//
// Methodology:
//   baseline: all effects on
//   ablation_X: all effects on EXCEPT card X
//   diff = avg(totalVP | built X, all on) − avg(totalVP | built X, X off)
function sweepAblation(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || 8;
  const numGames = parseInt(numGamesArg) || 4000;
  configureMaterials(6);

  function runOneGame(state) {
    for (const c of state.prerivCards) if (c) state.metrics.iconsSpawned += c.totalIcons;
    while (!state.gameOver && state.metrics.turns < MAX_TURNS) {
      if (!state.endgame && state.matDeck.length === 0) triggerEndgame(state);
      state.metrics.turns++;
      const cur = pickNextPlayer(state);
      if (cur === -1) break;
      state.currentPlayer = cur;
      const p = state.players[cur];
      aiStartOfTurnAbilities(state, p.idx);
      const action = aiChooseAction(state, p.idx);
      executeAction(state, p.idx, action);
      cleanupShoreline(state);
      if (state.endgame && !p.out) {
        const reachedEnd = p.timePos >= ENDGAME_TRACK_END;
        const passed = action.type === 'pass';
        if (reachedEnd || passed) p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  function collectResults(disabledNames) {
    Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);
    for (const n of disabledNames) STRUCTURE_EFFECT_DISABLED[n] = true;
    const results = []; // [{builtNames: Set, totalVP: number}, ...]
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      for (const p of state.players) {
        const builtNames = new Set(p.built.map(s => s.name));
        results.push({ builtNames, totalVP: totalVP(p, state) });
      }
    }
    return results;
  }

  // Unique effect-card names — species starters reuse a few main-deck names
  // (e.g. Cache Burrow); STRUCTURE_EFFECT_DISABLED keys by name so we only
  // need to ablate each name once.
  const effectCards = Array.from(new Set(STRUCTURE_TEMPLATES.filter(s => s.effect).map(s => s.name)));

  console.log(`\nRiver Bankers per-card ablation`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.`);
  console.log(`Comparing avg totalVP for players who BUILT each card, with the card's effect on vs. off.\n`);

  const t0 = Date.now();
  console.log('Running baseline (all effects on)...');
  const baseline = collectResults([]);

  const rows = [];
  for (let i = 0; i < effectCards.length; i++) {
    const cardName = effectCards[i];
    process.stderr.write(`\rAblating [${i + 1}/${effectCards.length}] ${cardName.padEnd(22)} `);
    const ablated = collectResults([cardName]);
    const baseB = baseline.filter(r => r.builtNames.has(cardName));
    const ablB = ablated.filter(r => r.builtNames.has(cardName));
    const avgBase = baseB.length ? baseB.reduce((s, r) => s + r.totalVP, 0) / baseB.length : NaN;
    const avgAbl = ablB.length ? ablB.reduce((s, r) => s + r.totalVP, 0) / ablB.length : NaN;
    rows.push({
      name: cardName,
      baseN: baseB.length,
      ablN: ablB.length,
      avgBase, avgAbl,
      diff: avgBase - avgAbl,
    });
  }
  process.stderr.write('\r' + ' '.repeat(60) + '\r');
  Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);

  rows.sort((a, b) => (b.diff || 0) - (a.diff || 0));
  console.log(
    pad('Card', 22) + padL('builds(B)', 11) + padL('builds(A)', 11) +
    padL('avgVP(B)', 10) + padL('avgVP(A)', 10) + padL('Δ VP', 8)
  );
  console.log('-'.repeat(22 + 11 + 11 + 10 + 10 + 8));
  for (const r of rows) {
    const baseStr = isNaN(r.avgBase) ? '-' : r.avgBase.toFixed(2);
    const ablStr = isNaN(r.avgAbl) ? '-' : r.avgAbl.toFixed(2);
    const diffStr = isNaN(r.diff) ? '-' : (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2);
    console.log(
      pad(r.name, 22) + padL(r.baseN, 11) + padL(r.ablN, 11) +
      padL(baseStr, 10) + padL(ablStr, 10) + padL(diffStr, 8)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  builds(B/A) = number of builder-instances in baseline / ablation runs');
  console.log('  avgVP(B/A)  = average final totalVP for those builders');
  console.log('  Δ VP        = avgVP(B) − avgVP(A) — the effect\'s average VP contribution');
  console.log('  Lookout Tree, Salt Lick are intentional sim no-ops → expect Δ ≈ 0.\n');
}

// Compare 4-river-slot baseline vs 3-river-slot variant. Cards graduating off
// the deepest river slot still go to the shoreline as usual; the only change
// is that the deepest slot is now River 3 (4🐟/item) instead of River 4 (5🐟/item).
function sweepRiverSlots() {
  const numMats = 6;
  const workers = 8;
  const N = 2000;
  console.log(`\nRiver-slot count comparison: 4 slots (live) vs 3 slots (drop River 4)`);
  console.log(`Setting: ${workers} workers/player, ${numMats} materials, ${N} games per row.\n`);
  console.log(
    pad('numP', 5) + pad('slots', 6) +
    padL('turns', 6) + padL('t/p', 5) + padL('~min', 6) +
    padL('aucs', 6) + padL('jam%', 6) +
    padL('exitR', 7) + padL('@R1%', 7) + padL('@R2%', 7) + padL('@R3%', 7) + padL('@R4%', 7) +
    padL('past1%', 8) + padL('wst%', 7) +
    padL('built/p', 8) + padL('winVP', 7) + padL('endg%', 7)
  );
  console.log('-'.repeat(5+6+6+5+6+6+6+7+7+7+7+7+8+7+8+7+7));
  setSpeculativeBidProb(0);
  setPrerivPlentySlides(true);
  setAllPlentySlides(true);
  for (const numP of [2, 3, 4]) {
    for (const slots of [4, 3]) {
      setRiverSlots(slots);
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const allExits = [].concat(...trials.map(m => m.riverExitSlots));
      const exitMean = allExits.length ? (allExits.reduce((s, x) => s + x, 0) / allExits.length) + 1 : 0;
      const at = i => allExits.length ? (allExits.filter(s => s === i).length / allExits.length) * 100 : 0;
      const past1Pct = allExits.length ? (allExits.filter(s => s >= 1).length / allExits.length) * 100 : 0;
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const winVP = avg(trials.map(m => m.winnerVP));
      const endg = avg(trials.map(m => m.endgameTriggered ? 100 : 0));
      const estMin = (turns * 30) / 60;
      console.log(
        pad(numP, 5) + pad(slots, 6) +
        padL(turns.toFixed(0), 6) +
        padL((turns / numP).toFixed(0), 5) +
        padL(estMin.toFixed(1), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 6) +
        padL(exitMean.toFixed(2), 7) +
        padL(at(0).toFixed(1) + '%', 7) +
        padL(at(1).toFixed(1) + '%', 7) +
        padL(at(2).toFixed(1) + '%', 7) +
        padL(at(3).toFixed(1) + '%', 7) +
        padL(past1Pct.toFixed(1) + '%', 8) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL((built / numP).toFixed(1), 8) +
        padL(winVP.toFixed(1), 7) +
        padL(endg.toFixed(0) + '%', 7)
      );
    }
    console.log();
  }
  setRiverSlots(4);
  console.log('Legend:');
  console.log('  exitR     = avg river slot a card LEFT FROM (1-indexed; only cards that entered the river)');
  console.log('  @Ri%      = % of river-exits whose final slot was River i (i=1..4)');
  console.log('  past1%    = % of river-exits where the card reached River 2+');
  console.log('  wst%      = wasted icons (shore-bound w/ no claim) as % of total icons spawned');
  console.log('  built/p   = avg structures built per player');
  console.log('  endg%     = % of games that hit the endgame trigger (deck emptied)\n');
}

// Distribution of peak simultaneous blank tokens per game across player counts.
// Used to decide how many blank chits to physically include in the box.
function sweepBlanks() {
  const numMats = 6;
  const workers = 8;
  const N = 5000;
  console.log(`\nPeak simultaneous blank tokens per game (${N} games per row, ${workers} workers/player, ${numMats} materials).`);
  console.log(`Blanks return to the pool when a card graduates to the shoreline, so the relevant number is the max in flight at any moment.\n`);
  console.log(
    pad('numP', 5) +
    padL('mean', 7) + padL('p50', 6) + padL('p90', 6) + padL('p95', 6) + padL('p99', 6) +
    padL('max', 6) + padL('@max', 6)
  );
  console.log('-'.repeat(5 + 7 + 6 * 6));
  for (const numP of [2, 3, 4]) {
    const peaks = [];
    let maxCount = 0;
    for (let t = 0; t < N; t++) {
      const m = runGame(numP, numMats, workers);
      peaks.push(m.peakBlanks);
      if (m.peakBlanks > maxCount) maxCount = m.peakBlanks;
    }
    peaks.sort((a, b) => a - b);
    const q = pctile => peaks[Math.min(peaks.length - 1, Math.floor(pctile * peaks.length))];
    const mean = peaks.reduce((s, x) => s + x, 0) / peaks.length;
    const atMax = peaks.filter(x => x === maxCount).length;
    console.log(
      pad(numP, 5) +
      padL(mean.toFixed(1), 7) +
      padL(q(0.50), 6) +
      padL(q(0.90), 6) +
      padL(q(0.95), 6) +
      padL(q(0.99), 6) +
      padL(maxCount, 6) +
      padL(atMax, 6)
    );
  }
  console.log('\nLegend:');
  console.log('  mean/p50/p90/p95/p99 = peak-blanks distribution across the N simulated games');
  console.log('  max  = highest peak observed in any single game');
  console.log('  @max = how many of the N games hit that max (0 = singular outlier)\n');
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'spec') sweepSpec();
  else if (mode === 'rule') sweepRule();
  else if (mode === 'deck') sweepDeck(process.argv[3]);
  else if (mode === 'uniform') sweepUniform();
  else if (mode === 'ablation') sweepAblation(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'river-slots') sweepRiverSlots();
  else if (mode === 'blanks') sweepBlanks();
  else sweep();
}
