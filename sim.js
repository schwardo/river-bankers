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
  { name: 'Spillway',     cost: { logs: 4, mud: 2 },               time: 0, vp: 6, effect: 'When built: wash one card from River 1 to the shoreline (workers carry along).' },
  { name: 'Hollowed-out Log', cost: { logs: 3, reeds: 1 },           time: 2, vp: 5, effect: 'Once per game (flip card): recall one worker from a river card (no blank).' },
  { name: 'Snag Pile',      cost: { reeds: 2, stones: 1 },           time: 2, vp: 3, effect: 'When built: pull a Headwaters card to River 1; run an auction on it at 1🐟/item.' },
  { name: 'Heron Watch',    cost: { stones: 4, logs: 2 },            time: 4, vp: 0, effect: 'End of game: +1 VP per shoreline card on the table (max +6).' },
  { name: 'Reed Bed',       cost: { reeds: 3, mud: 1 },              time: 2, vp: 4, effect: 'Reed icons cost you 1 less 🐟 per item (min 1).' },
  { name: 'Mud Levee',      cost: { mud: 3, stones: 2 },             time: 3, vp: 6, effect: 'When built: drop 2 blanks on uncovered icons in the river.' },
  { name: 'Log Flume',    cost: { mud: 2, logs: 1 },               time: 1, vp: 2, effect: 'When you build: advance 3 fewer 🐟 (min 1).' },
  { name: 'Cache Burrow',   cost: { mud: 2, reeds: 2 },              time: 2, vp: 4, effect: '+1 to your hand size. When built, draw a structure card.' },
  { name: 'Vine Lattice',   cost: { vines: 3, reeds: 2 },            time: 3, vp: 5, effect: 'When built: draw 3 structure cards, keep 1, discard 2.' },
  { name: 'Charcoal Pit',   cost: { clay: 4, logs: 2 },              time: 3, vp: 6, effect: 'When you build: 1 of your Clay workers may substitute for any other material.' },
  { name: 'Lookout Tree',   cost: { logs: 5, stones: 2 },            time: 4, vp: 8, effect: 'Peek at the top of the material deck at any time.' },
  { name: 'Pier',           cost: { logs: 3, stones: 2 },            time: 3, vp: 0, effect: 'End of game: +2 VP per shoreline card with at least one of your workers.' },
  { name: 'Cattail Marsh',  cost: { reeds: 4, mud: 2 },              time: 3, vp: 5, effect: 'When you build: each Reed worker counts as 2 reeds.' },
  { name: 'Wood Pile',      cost: { logs: 4 },                       time: 2, vp: 4, effect: 'Once per game (flip card): claim 1 uncovered Log icon from any river card for 1🐟.' },
  { name: 'Heron Roost',    cost: { reeds: 3, vines: 2 },            time: 3, vp: 6, effect: 'As an action: pay 1🐟 to replace a Headwaters card with the top of the material deck.' },
  { name: 'Pontoon',     cost: { logs: 4, reeds: 1 },             time: 3, vp: 4, effect: 'When a jammed auction makes you place fewer workers than your bid, pay 🐟 for one fewer worker.' },
  { name: 'Mill Wheel',     cost: { logs: 3, stones: 2 },            time: 4, vp: 6, effect: 'When built: activate one "when built" effect of a built structure controlled by the player to your left or right.\n\nAs an action: activate the "as an action" ability of a built structure controlled by the player to your left or right.' },
  { name: 'Stone Pool',     cost: { stones: 3, clay: 2 },            time: 3, vp: 6, effect: 'When built: look at the top 5 material cards and rearrange them in any order.' },
  { name: 'Flush Channel',  cost: { mud: 3, reeds: 1 },              time: 2, vp: 6, effect: 'When built: discard 1 Headwaters card (out of game) and refill that slot from the material deck. No auction.' },
  { name: 'Granary',        cost: { reeds: 4, clay: 1 },             time: 3, vp: 3, effect: 'Once per game (flip card): your build costs 1 fewer of one listed material.' },
  { name: 'Granite Spire',  cost: { stones: 6 },                     time: 4, vp: 7 },
  { name: 'Royal Lodge',    cost: { logs: 6, vines: 2 },             time: 5, vp: 10, effect: 'When built: take an immediate extra turn.' },
  { name: 'Streambank Hollow',      cost: { mud: 3, vines: 1 },              time: 2, vp: 4, effect: 'When you recall workers before an auction, slide back 1🐟 per worker recalled.' },
  { name: 'Floodgate',      cost: { mud: 4, clay: 3 },               time: 4, vp: 8, effect: 'Once per game (flip card): before an auction resolves, slide the auctioned card 1 space toward the Headwaters.' },
  { name: 'Burrow Run',     cost: { vines: 3, mud: 1 },              time: 0, vp: 4, effect: 'When built: slide your pawn back 5 on 🐟 track.' },
  { name: 'Sap Drip',       cost: { logs: 2, vines: 2 },             time: 2, vp: 4, effect: 'When built: place 2 free workers from your supply onto uncovered icons of one river card.' },
  { name: 'Spy Mound',      cost: { stones: 4, clay: 1 },            time: 3, vp: 6, effect: 'Once per game (flip card): decide your auction bid after the other players reveal theirs.' },
  { name: 'Vine Ladder',    cost: { vines: 4, stones: 2 },           time: 4, vp: 0, effect: 'End of game: +4 VP per built structure of yours that uses Vines (max +12).' },
  { name: 'Vine Trellis',   cost: { vines: 3, stones: 1 },           time: 2, vp: 0, effect: 'When you build a structure that uses Vines: slide back 1🐟.\n\nEnd of game: +2 VP per built structure of yours that uses Vines.' },
  { name: 'Stone Causeway', cost: { stones: 3, logs: 2 },            time: 3, vp: 0, effect: 'When you build a structure that uses Stones: draw 1 structure card and discard 1.\n\nEnd of game: +2 VP per built structure of yours that uses Stones (max +8).' },
  { name: 'Reed Walkway',   cost: { reeds: 4, mud: 1 },              time: 3, vp: 0, effect: 'When you build a structure that uses Reeds: place 1 free worker on a River 1 card.\n\nEnd of game: +2 VP per built structure of yours that uses Reeds.' },
  { name: 'Clay Vault',     cost: { clay: 3, vines: 2 },             time: 3, vp: 0, effect: 'When you build a structure that uses Clay: peek at the top of the structure deck; you may swap it with 1 card from your hand.\n\nEnd of game: +3 VP per built structure of yours that uses Clay (max +12).' },
  { name: 'Burrow Network', cost: { mud: 3, reeds: 2 },              time: 3, vp: 0, effect: 'When you build a structure that uses Mud: move one of your workers to another river card with at least one of your workers (may replace a blank).\n\nEnd of game: +3 VP per built structure of yours that uses Mud (max +9).' },
  { name: 'Driftwood Snag', cost: { logs: 2, reeds: 2, mud: 1 },     time: 3, vp: 6, effect: 'As an action: pay 1🐟 to add a blank to any uncovered icon.' },
  { name: 'Salt Lick',      cost: { stones: 3, logs: 2, clay: 1 },   time: 3, vp: 6, effect: 'When built: look at every opponent\'s hand of structure cards.' },
  { name: 'Hidden Cache',   cost: { vines: 2, stones: 3, clay: 2 },  time: 3, vp: 0, effect: 'End of game: +3 VP per 2 distinct materials in your built structures (max +9).' },
  { name: 'Treaty Stone',   cost: { stones: 3, clay: 2 },            time: 4, vp: 3, effect: 'When you build: you may spend 2 of any one material as 1 of any other. Once per build.' },
  { name: 'Cattail Patch',  cost: { reeds: 3, mud: 2 },              time: 3, vp: 0, effect: 'End of game: VP equal to 1/1/2/3/5/8 for 1/2/3/4/5/6 distinct materials across your built structures.' },
  { name: 'Pack Rat Burrow', cost: { reeds: 2, mud: 2 },             time: 2, vp: 4, effect: 'Once per game (flip card): discard 1 structure from your hand and take one of your choice from the discard pile.' },
  { name: 'Tribute Stone',  cost: { clay: 2, stones: 2 },            time: 3, vp: 5, effect: 'Once per game (flip card): force an opponent to recall one of their workers from a river card (drops a blank). They slide back 3🐟 in compensation.' },
  { name: 'Tow Line',     cost: { mud: 4, clay: 2, vines: 1 },     time: 4, vp: 8, effect: 'As an action: pay 2🐟 to slide a river card 1 space toward the Headwaters.' },
  { name: 'Portage',    cost: { vines: 3, stones: 2 },           time: 3, vp: 6, effect: 'As an action: swap one of your workers on a river card with another worker on a different river card. Pay the source card\'s per-item cost in 🐟.' },
  { name: 'Salmon Run',     cost: { logs: 4, vines: 2 },             time: 4, vp: 6, effect: 'As an action: place 1-5 workers from your supply onto uncovered icons of one river card. 🐟 cost escalates 1/2/3/5/8 per successive worker.' },
  { name: 'Slipstream',     cost: { mud: 2, vines: 2 },              time: 3, vp: 5, effect: 'Once per game (flip card): take a turn immediately after another player, even if you are not next on 🐟 track.' },
  { name: 'Trophy Lodge',   cost: { clay: 3, stones: 2 },            time: 3, vp: 0, effect: 'End of game: +3 VP per ?-VP structure you control, including this one (max +12).' },
  { name: 'Springwater Pool', cost: { vines: 3, mud: 2 },            time: 3, vp: 5, effect: 'When built: ready all of your spent once-per-game cards.' },
  { name: 'Spring Cascade', cost: { logs: 2, mud: 1 },               time: 1, vp: 3, effect: 'Once per game (flip card): ready one of your other spent once-per-game cards.' },
  { name: 'Trading Post',     cost: { clay: 2, reeds: 2 },             time: 3, vp: 5, effect: 'As an action: pay 1🐟 to recall 1 worker each from 3 different-material cards (drops 3 blanks), then place 2 free workers from supply onto uncovered icons of one card.' },
  { name: 'Confluence',       cost: { reeds: 2, stones: 2 },            time: 3, vp: 5, effect: 'As an action: pay 🐟 to trigger one auction over two same-symbol cards, pooling all their uncovered icons into a single larger pool. Both cards then float downriver.' },

  // Species starter structures (asymmetric play). Each player
  // drafts 1 of their 3 species cards at setup; picked card is pre-built in
  // their tableau. The `species` flag excludes these from the shared deck.
  // Beaver (Logs bias)
  { name: 'Lodge Foundation', cost: { logs: 0 },                       time: 0, vp: 1, species: 'beaver', effect: 'When you build a structure that uses Logs, advance 1 fewer fish (min 1).' },
  { name: 'Tail Slap',        cost: { logs: 0 },                       time: 0, vp: 2, species: 'beaver', effect: 'At the start of your turn, you may pay 1 fish to drop a blank on any uncovered icon on a River 1 card.' },
  { name: 'Beaver Cache',     cost: { logs: 0 },                       time: 0, vp: 1, species: 'beaver', effect: '+1 to your hand size. When built, draw a structure card.' },
  // River Otter (Reeds bias)
  { name: 'Kelp Bed',         cost: { logs: 0 },                       time: 0, vp: 0, species: 'otter',  effect: 'Reeds icons cost you 1 less fish per item (min 1).' },
  { name: 'Rolling Float',    cost: { logs: 0 },                       time: 0, vp: 1, species: 'otter',  effect: 'Once per game, swap one of your workers on a river card with another worker on a different card in the same river slot. No fish cost.' },
  { name: 'Stone Tool',       cost: { logs: 0 },                       time: 0, vp: 0, species: 'otter',  effect: 'Once per game, when building, 1 of your Stones workers may substitute for any other material.' },
  // Muskrat (Mud bias)
  { name: 'Mud Burrow',       cost: { logs: 0 },                       time: 0, vp: 0, species: 'muskrat', effect: 'Mud icons cost you 1 less fish per item (min 1).' },
  { name: 'Channel Clearer',  cost: { logs: 0 },                       time: 0, vp: 0, species: 'muskrat', effect: 'At the start of your turn, you may discard 1 Reed worker from any river card; returns to that player\'s supply without a blank.' },
  { name: 'Marsh Lookout',    cost: { logs: 0 },                       time: 0, vp: 2, species: 'muskrat', effect: 'Peek at the top card of the material deck at any time.' },
  // Mink (Clay bias)
  { name: 'Clay Den',         cost: { logs: 0 },                       time: 0, vp: 0, species: 'mink',   effect: 'Clay icons cost you 2 less fish per item (min 1).' },
  { name: 'Quick Strike',     cost: { logs: 0 },                       time: 0, vp: 2, species: 'mink',   effect: 'When you trigger an auction, you may declare your bid last (after all other bids are revealed). You must still bid at least 1 worker, as the trigger always does.' },
  { name: 'Snare Set',        cost: { logs: 0 },                       time: 0, vp: 1, species: 'mink',   effect: 'Once per game, force an opponent to recall one of their workers from a river card (drops a blank). The opponent slides back 3 fish in compensation.' },
];

const SPECIES_KEYS = ['beaver', 'otter', 'muskrat', 'mink'];

// Override map: { species → card name }. When set for a species, newGame's
// draft loop force-picks that card instead of consulting weights. Used by
// the species-starters sweep to measure cards the AI never drafts on its own.
let FORCED_SPECIES_STARTER = null;
function setForcedSpeciesStarter(map) { FORCED_SPECIES_STARTER = map; }

// Asymmetric play toggle (web "Use species starter cards" checkbox, default on).
// When false, newGame skips the species-starter draft entirely so every player
// begins with an empty tableau — symmetric play. The tune sweep runs both.
let USE_SPECIES_STARTERS = true;
function setUseSpeciesStarters(b) { USE_SPECIES_STARTERS = b; }

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
  'Beaver Cache': 3, 'Marsh Lookout': 2,
};

// Cattail Patch end-game schedule, indexed by distinct-material count (0..6).
const CATTAIL_PATCH_VP = [0, 1, 1, 2, 3, 5, 8];

// "?-VP" cohort: cards whose printed VP is 0 and whose scoring lives entirely
// in an End-game clause. Used by Trophy Lodge to count its synergy targets.
// Trophy Lodge counts itself when computing its own bonus.
const VARIABLE_VP_CARDS = new Set([
  'Heron Watch', 'Pier', 'Vine Ladder', 'Vine Trellis', 'Stone Causeway',
  'Reed Walkway', 'Clay Vault', 'Burrow Network', 'Hidden Cache',
  'Cattail Patch', 'Trophy Lodge',
]);

// Ablation toggle: set STRUCTURE_EFFECT_DISABLED['Pier'] = true to ignore that
// card's effect (still in deck, still scores its printed VP — only the bonus is suppressed).
const STRUCTURE_EFFECT_DISABLED = {};
function setStructureEffectDisabled(name, disabled) {
  if (disabled) STRUCTURE_EFFECT_DISABLED[name] = true;
  else delete STRUCTURE_EFFECT_DISABLED[name];
}
function effectActive(name) { return STRUCTURE_EFFECT_DISABLED[name] !== true; }
function hasEffect(p, name) { return effectActive(name) && p.built.some(s => s.name === name); }
// The combined-auction ability is granted either to a player who builds the
// Confluence structure card, or to ALL players when the Double Vision card (an
// "Optional Rules" type card — no VP, no cost) is in play.
function hasCombinedAuctionAbility(p) { return DOUBLE_VISION_ACTIVE || hasEffect(p, 'Confluence'); }

// Per-card end-game scoring overrides used by sweepVpRework. Empty by
// default → the helper falls back to each card's hard-coded multiplier/cap
// so live scoring is unchanged. Override entries take the shape
// VP_OVERRIDES['Vine Ladder'] = { mult: 2, cap: Infinity }.
const VP_OVERRIDES = {};
function matEndGameVP(p, cardName, defaultMult, defaultCap, materialKey) {
  if (!hasEffect(p, cardName)) return 0;
  const o = VP_OVERRIDES[cardName];
  const mult = (o && o.mult !== undefined) ? o.mult : defaultMult;
  const cap = (o && o.cap !== undefined) ? o.cap : defaultCap;
  const count = p.built.filter(b => (b.cost[materialKey] || 0) > 0).length;
  return Math.min(cap, mult * count);
}
// Hand-size cards stack: +1 per built copy. The main-deck "Cache Burrow" and
// the beaver starter "Beaver Cache" both carry the bonus and stack with each
// other; each is independently ablatable via effectActive(name).
function maxHandSize(p) {
  return 3 + p.built.filter(s =>
    (s.name === 'Cache Burrow' || s.name === 'Beaver Cache') && effectActive(s.name)
  ).length;
}
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
  // VP_OVERRIDES per-card hooks let sweepVpRework swap the end-game
  // multiplier/cap without editing the function body. Defaults match the
  // current live shape (printed vp:0 + the matEndGameVP terms).
  v += matEndGameVP(p, 'Vine Ladder',    4, 12, 'vines');
  v += matEndGameVP(p, 'Vine Trellis',   2, Infinity, 'vines');
  v += matEndGameVP(p, 'Stone Causeway', 2, 8,  'stones');
  v += matEndGameVP(p, 'Reed Walkway',   2, Infinity, 'reeds');
  v += matEndGameVP(p, 'Clay Vault',     3, 12, 'clay');
  v += matEndGameVP(p, 'Burrow Network', 3, 9,  'mud');
  if (hasEffect(p, 'Hidden Cache')) {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    v += Math.min(9, Math.floor(mats.size / 2) * 3);
  }
  if (hasEffect(p, 'Heron Watch')) {
    v += Math.min(6, state.shorelineCards.length);
  }
  if (hasEffect(p, 'Trophy Lodge')) {
    const count = p.built.filter(b => VARIABLE_VP_CARDS.has(b.name)).length;
    v += Math.min(12, 3 * count);
  }
  if (FINAL_PAIR_VP) {
    v += endgamePairVP(state, p.idx);
  }
  return v;
}

// Per-material per-item cost discounters. Each entry: { name: amount }. The
// player's effective per-item cost on cards of that material is reduced by
// the sum of active discounts (clamped at min 1).
// Lodge Foundation moved to a build-time discount (see performBuild).
const MATERIAL_DISCOUNT_CARDS = {
  reeds: { 'Reed Bed': 1, 'Kelp Bed': 1 },
  mud:   { 'Mud Burrow': 1 },
  clay:  { 'Clay Den': 2 },
};
function playerCardCost(state, card, playerIdx) {
  const base = cardCost(card);
  const p = state.players[playerIdx];
  const discounters = MATERIAL_DISCOUNT_CARDS[card.material] || {};
  let total = 0;
  for (const name in discounters) {
    if (hasEffect(p, name)) total += discounters[name];
  }
  return Math.max(1, base - total);
}

// Pass-0 (lap-crossing) effects. Wood Pile / Hollowed-out Log / Pack Rat Burrow
// were reworked from "at 0 on track" triggers to once-per-game on-demand
// abilities (see tryOncePerGameAbilities), so no card fires here anymore. Kept
// as a no-op stub: advancePlayer and the endgame-pass0 ablation still call it.
function firePassZeroEffects(state, playerIdx, count) { /* no pass-0 cards remain */ }

// --- Reworked once-per-game abilities (formerly pass-0 / when-built) -----------
// Each fires at most once per game, on demand, when a beneficial target exists.

// Wood Pile: claim 1 uncovered Log icon from a river card for 1🐟.
function tryWoodPile(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!hasEffect(p, 'Wood Pile') || p.woodPileUsed || p.supply <= 0) return;
  const wbm = playerWorkersByMaterial(state, playerIdx);
  let need = 0;
  for (const s of p.hand) need = Math.max(need, Math.max(0, (s.cost.logs || 0) - (wbm.logs || 0)));
  if (need <= 0) return; // only grab a log when a hand card actually wants logs
  const target = state.riverCards.find(c => c.material === 'logs' && uncoveredIcons(c) > 0);
  if (!target) return;
  p.supply -= 1;
  target.workers[playerIdx] = (target.workers[playerIdx] || 0) + 1;
  p.timePos += 1;
  p.woodPileUsed = true;
  noteEffectUse(state, 'Wood Pile');
}

// Hollowed-out Log: recall one worker from a river card (no blank).
function tryHollowedLog(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!hasEffect(p, 'Hollowed-out Log') || p.hollowedLogUsed) return;
  // Worth it only if the worker is stuck on a card whose material no hand card
  // needs (free it up to redeploy), and we're not at the very end.
  if (p.timePos >= SIM_FINISH_LINE - 2) return;
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needMat = new Set();
  for (const s of p.hand) for (const m in s.cost) if ((s.cost[m] || 0) > (wbm[m] || 0)) needMat.add(m);
  const target = state.riverCards.find(c => workersOnCard(c, playerIdx) > 0 && !needMat.has(c.material))
    || state.riverCards.find(c => workersOnCard(c, playerIdx) > 0);
  if (!target) return;
  target.workers[playerIdx] -= 1;
  if (target.workers[playerIdx] === 0) delete target.workers[playerIdx];
  p.supply += 1;
  p.hollowedLogUsed = true;
  noteEffectUse(state, 'Hollowed-out Log');
}

// Pack Rat Burrow: swap your worst hand card for the best card in the discard.
function tryPackRat(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!hasEffect(p, 'Pack Rat Burrow') || p.packRatUsed) return;
  if (p.hand.length === 0 || state.structDiscard.length === 0) return;
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
  if (bestDiscard.sc <= worstHand.sc + 1) return; // only swap for a real upgrade
  const taken = state.structDiscard.splice(bestDiscard.i, 1)[0];
  const dropped = p.hand.splice(worstHand.i, 1)[0];
  state.structDiscard.push(dropped);
  p.hand.push(taken);
  p.packRatUsed = true;
  noteEffectUse(state, 'Pack Rat Burrow');
}

// Spring Cascade: ready one of your OTHER spent once-per-game cards, so you can
// reuse that ability once more. Picks a spent card the player has built and
// could plausibly still use.
const ONCE_PER_GAME_FLAGS = [
  ['Tribute Stone', 'tributeStoneUsed'], ['Snare Set', 'snareSetUsed'],
  ['Floodgate', 'floodgateUsed'], ['Spy Mound', 'spyMoundUsed'],
  ['Granary', 'granaryUsed'], ['Slipstream', 'slipstreamUsed'],
  ['Wood Pile', 'woodPileUsed'], ['Hollowed-out Log', 'hollowedLogUsed'],
  ['Pack Rat Burrow', 'packRatUsed'],
];
function trySpringCascade(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!hasEffect(p, 'Spring Cascade') || p.springCascadeUsed) return;
  // Re-ready the highest-priority spent ability the player has built.
  for (const [name, flag] of ONCE_PER_GAME_FLAGS) {
    if (p[flag] && p.built.some(s => s.name === name)) {
      p[flag] = false;
      p.springCascadeUsed = true;
      noteEffectUse(state, 'Spring Cascade');
      return;
    }
  }
}

// Mill Wheel: as an action (repeatable), activate one "as an action" ability
// of a built structure controlled by your left or right neighbour — resolved
// for you. Modelled like the other as-an-action cards (fires as a start-of-turn
// freebie when beneficial). Copyable set excludes Confluence (combined auction).
function neighborIdxs(state, playerIdx) {
  const n = state.players.length;
  if (n <= 1) return [];
  const left = (playerIdx - 1 + n) % n;
  const right = (playerIdx + 1) % n;
  return left === right ? [left] : [left, right];
}
function tryMillWheel(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!hasEffect(p, 'Mill Wheel')) return;
  // Which copyable abilities do my neighbours have built (and still active)?
  const avail = new Set();
  for (const nIdx of neighborIdxs(state, playerIdx)) {
    for (const s of state.players[nIdx].built) {
      if (effectActive(s.name)) avail.add(s.name);
    }
  }
  // Try the most valuable applicable ability first; fire one per turn.
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) for (const m in s.cost) needs[m] = Math.max(needs[m], Math.max(0, (s.cost[m] || 0) - (wbm[m] || 0)));
  const myMats = new Set();
  for (const s of p.hand) for (const m in s.cost) myMats.add(m);
  if (avail.has('Salmon Run') && p.supply > 0 && p.timePos + 2 < SIM_FINISH_LINE) {
    const t = findSalmonRunTarget(state, playerIdx, needs);
    if (t && p.timePos + salmonRunCumulativeCost(t.n) < SIM_FINISH_LINE) {
      doSalmonRun(state, playerIdx, t.card.id, t.n); noteEffectUse(state, 'Mill Wheel'); return;
    }
  }
  if (avail.has('Trading Post') && p.timePos < SIM_FINISH_LINE - 1 && p.supply >= 2) {
    const action = findTradingPostAction(state, playerIdx);
    if (action) { doTradingPost(state, playerIdx, action); noteEffectUse(state, 'Mill Wheel'); return; }
  }
  if (avail.has('Portage') && p.timePos < SIM_FINISH_LINE - 5) {
    const t = findOtterTrailTarget(state, playerIdx);
    if (t && p.timePos + cardCost(t.cardA) < SIM_FINISH_LINE) {
      doOtterTrail(state, playerIdx, t.cardA.id, t.cardB.id, t.otherIdx); noteEffectUse(state, 'Mill Wheel'); return;
    }
  }
  if (avail.has('Tow Line') && p.timePos + 2 < SIM_FINISH_LINE) {
    const t = findBeaverTowTarget(state, playerIdx, needs);
    if (t) { doBeaverTow(state, playerIdx, t.card.id); noteEffectUse(state, 'Mill Wheel'); return; }
  }
  if (avail.has('Heron Roost') && state.matDeck.length > 0 && p.timePos < SIM_FINISH_LINE - 1) {
    const target = state.prerivCards.findIndex(c => c && !myMats.has(c.material));
    if (target !== -1) {
      const newCard = state.matDeck.pop();
      newCard.slot = 'pre';
      state.prerivCards[target] = newCard;
      state.metrics.iconsSpawned += newCard.totalIcons;
      p.timePos += 1;
      noteEffectUse(state, 'Mill Wheel');
      return;
    }
  }
  if (avail.has('Driftwood Snag') && p.timePos < SIM_FINISH_LINE - 1) {
    const cands = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => uncoveredIcons(c) >= 4 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1;
      noteEffectUse(state, 'Mill Wheel');
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
// The position the AI treats as "the finish line" when deciding whether a
// fish-costing ability is worth it (don't waste an action you can't cash in
// before you'd retire). Defaults to ENDGAME_TRACK_END for the legacy
// deck-empty endgame; egPlayOut raises it to the per-count fish line during the
// fish-line endgame so abilities keep firing through a 90/120-fish race.
let SIM_FINISH_LINE = ENDGAME_TRACK_END;
// Uniform 119 for every count (2026-06-20 turn-clock re-tune, board-games.org):
// under the web 30s/turn timing model the old climbing 59/89/119 lines ran far
// too short at 2P/3P (~12/18 min). More players ⇒ more turns per fish-space, so
// a flat line centres all three (~40-54 min @45-60s/turn for 2P/3P; 4P longer).
// 119 = lap-2 space 59 — one "+60" chit flip, the same finish marker for all counts.
const FISH_LINE_BY_COUNT = { 2: 119, 3: 119, 4: 119 };
function simFishLine(numP) { return FISH_LINE_BY_COUNT[numP] || 30 * numP; }
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

// Combined-auction configuration. Three independent knobs:
//   pairing — 'same' requires the two cards share a material (interchangeable
//             pooled icons, fixed A→B fill); 'any' allows any two cards, winners
//             placing each clinched worker on whichever card they need more, in
//             player order (one action can serve two different material needs).
//   trigger — how the 🐟 cost to initiate is derived from the two cards' single-
//             auction trigger costs: 'sum' (pay both), 'min' (cheaper), 'max'.
//   item    — how each pooled item is billed when the cards sit at different
//             slots: 'min' (cheaper card's rate) or 'max' (pricier).
// The combined auction reaches the table two ways, each with its own config:
// the Confluence structure card (per builder, same/min/min), or the Double
// Vision card (all players, any/max/max — see below).
const COMBINED_AUCTION_PROFILES = {
  Confluence: { pairing: 'same', trigger: 'min', item: 'min' },
};
// "Optional Rules" cards are game-setup modules that change the rules for ALL
// players (no VP, no build cost, not drafted or in any deck). Double Vision is
// the one implemented: it grants the combined two-card auction to everyone,
// always using the any/max/max config. Off by default — it's optional; sweeps
// enable it to measure its impact.
const DOUBLE_VISION = {
  name: 'Double Vision', type: 'Optional Rules',
  config: { pairing: 'any', trigger: 'max', item: 'max' },
};
let DOUBLE_VISION_ACTIVE = false;
function setDoubleVisionActive(b) { DOUBLE_VISION_ACTIVE = b; }
// Sweep override: when non-null, forces one config for ALL combined auctions
// regardless of source. The setters below build it up; clear it (or never set
// it) for live per-source behavior. Defaults match the historical globals.
let COMBINED_AUCTION_OVERRIDE = null;
function combinedOverride() {
  if (!COMBINED_AUCTION_OVERRIDE) COMBINED_AUCTION_OVERRIDE = { pairing: 'same', trigger: 'sum', item: 'min' };
  return COMBINED_AUCTION_OVERRIDE;
}
function setCombinedAuctionCostMode(m)    { combinedOverride().item = m; }
function setCombinedAuctionPairing(m)     { combinedOverride().pairing = m; }
function setCombinedAuctionTriggerMode(m) { combinedOverride().trigger = m; }
function clearCombinedAuctionConfig()     { COMBINED_AUCTION_OVERRIDE = null; }
// Resolve the active config for player `p` triggering a combined auction: the
// sweep override if set, else Double Vision's config when that card is in play,
// else the Confluence structure-card profile.
function combinedConfig(p) {
  if (COMBINED_AUCTION_OVERRIDE) return COMBINED_AUCTION_OVERRIDE;
  if (DOUBLE_VISION_ACTIVE) return DOUBLE_VISION.config;
  return COMBINED_AUCTION_PROFILES.Confluence;
}

// Test harness: inject a free, pre-built, printed-VP-0 card (named by
// INJECT_STARTER_NAME) as a turn-1 starter for player INJECT_STARTER_PLAYER
// (-1 = off), to measure an ability's power as a STARTER rather than a built
// structure. DECK_EXCLUDE (a Set of names) removes cards from the shared
// structure deck so only the injected player holds the ability.
let INJECT_STARTER_NAME = null;
let INJECT_STARTER_PLAYER = -1;
let DECK_EXCLUDE = null;

// Live rule: the Flush action returns the 3 displaced Headwaters cards to the
// material draw pile (and reshuffles) instead of removing them from the game.
// Keeps the deck-empty endgame trigger from accelerating with every Flush.
// (Toggle off only for the `flush-deck` rule-comparison sweep.)
let FLUSH_RETURNS_TO_DECK = true;
function setFlushReturnsToDeck(b) { FLUSH_RETURNS_TO_DECK = b; }

// Live rule: at endgame, each player scores 1 VP per pair of same-type
// workers still on the board (river + shoreline). For each material,
// floor(workers_of_that_material / 2) VP. Wildcard cards (Driftwood Tangle:
// logs/reeds; Mud Slick: clay/mud) let each of their workers be assigned to
// either material; the player picks the split that maximizes total pairs.
// (Toggle off only for the `pair-vp` rule-comparison sweep.)
let FINAL_PAIR_VP = true;
function setFinalPairVP(b) { FINAL_PAIR_VP = b; }

// Endgame pass-0 ablation toggles (see sweepEndgamePass0). Default = both off,
// mirroring the live game: no synthetic endgame pass-0 boundary fire. The
// natural advancePlayer lap-boundary check still fires when a pawn overshoots
// 60. The 2026-06-06 ablation showed all four combinations are statistically
// indistinguishable for VP / spread / endgame length, so we keep the simpler
// rule. Toggles preserved for future re-investigation.
let PASS0_AT_ENDGAME_START = false;
let PASS0_AT_ENDGAME_END = false;
function setPass0AtEndgameStart(b) { PASS0_AT_ENDGAME_START = b; }
function setPass0AtEndgameEnd(b) { PASS0_AT_ENDGAME_END = b; }

// End-of-game pair-VP for one player. Walks the same data shape as
// playerWorkersByMaterial: solid material counts in `out[m]` plus a list of
// wild pools, each with a `count` and a 2-material option list. Returns the
// VP and (optionally) the per-material breakdown for diagnostics.
function endgamePairVP(state, playerIdx) {
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const counts = {};
  for (const m of MAT_KEYS) counts[m] = wbm[m] || 0;
  // Assign each wild pool's units to maximize total pairs. Pools are
  // independent in practice (Driftwood Tangle: logs/reeds; Mud Slick:
  // clay/mud — disjoint), so solve each pool by enumerating the split.
  for (const pool of (wbm._wildPools || [])) {
    if (pool.count === 0) continue;
    const [a, b] = pool.materials;
    let best = -1, bestX = 0;
    for (let x = 0; x <= pool.count; x++) {
      const pairs = Math.floor((counts[a] + x) / 2) +
                    Math.floor((counts[b] + (pool.count - x)) / 2);
      if (pairs > best) { best = pairs; bestX = x; }
    }
    counts[a] += bestX;
    counts[b] += pool.count - bestX;
  }
  let vp = 0;
  for (const m of MAT_KEYS) vp += Math.floor(counts[m] / 2);
  return vp;
}

function prerivTriggerCost(idx) { return PRERIV_SLOTS - idx + 1; }
// 🐟 cost to initiate a normal single-card auction on `card`: flat 1 for a river
// card, slot-dependent (prerivTriggerCost) for a Headwaters card. A Confluence
// auction pays the SUM of this across its two cards.
function singleAuctionTriggerCost(state, card) {
  if (card.slot === 'pre') {
    const idx = state.prerivCards.indexOf(card);
    return idx >= 0 ? prerivTriggerCost(idx) : UPSTREAM_AUCTION_COST;
  }
  return 1;
}
// 🐟 cost to initiate a Confluence auction over cardA + cardB, per the active
// trigger-cost rule (sum / min / max of the two single-auction triggers).
function combinedTriggerCost(state, cardA, cardB, mode) {
  const a = singleAuctionTriggerCost(state, cardA);
  const b = singleAuctionTriggerCost(state, cardB);
  if (mode === 'min') return Math.min(a, b);
  if (mode === 'max') return Math.max(a, b);
  return a + b;
}
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
  // Stone Tool (otter species starter): once-per-game Charcoal-Pit variant —
  // 1 Stones worker may substitute for any other material on a build.
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
  return { eff, granaryUsed, stoneToolUsed };
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
// MATERIAL CARD EFFECTS (design spec in hobbies board-games.org, River
// Bankers → "Material effect-card spec"). 8 of the 24 deck slots are
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
    if (s.testStarter) return false; // injection-only test starters (reserved)
    if (DECK_EXCLUDE && DECK_EXCLUDE.has(s.name)) return false; // test harness
    if (s.only2P) return numPlayers === 2;
    return true;
  });
  return shuffle(templates.map(s => ({ ...s, id: 's' + (id++), cost: { ...s.cost } })));
}

// =============================================================================
// STATE / TURN ORDER
// =============================================================================
function defaultWorkersPerPlayer(numPlayers) { return numPlayers >= 4 ? 7 : 8; }

function newGame(numPlayers, workersPerPlayer = null) {
  if (workersPerPlayer == null) workersPerPlayer = defaultWorkersPerPlayer(numPlayers);
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
      stoneToolUsed: false,
      // Reworked once-per-game cards (were pass-0 / when-built).
      woodPileUsed: false,
      hollowedLogUsed: false,
      packRatUsed: false,
      springCascadeUsed: false,
    });
  }
  const matDeck = buildMaterialDeck(numPlayers);
  const structDeck = buildStructureDeck(numPlayers);
  for (const p of players) {
    for (let i = 0; i < 3; i++) p.hand.push(structDeck.pop());
  }
  // Species starter draft: each player picks 1 of their 3 themed cards by
  // weight (tie-break random). Other 2 cards leave the game; the drafted
  // starter is pre-built in the player's tableau before turn 1. The
  // FORCED_SPECIES_STARTER override is honored when set (measurement tool).
  // Skipped entirely under symmetric play (USE_SPECIES_STARTERS = false) —
  // the web "Use species starter cards" checkbox; the tune sweep runs both.
  for (const p of players) {
    if (!USE_SPECIES_STARTERS) break;
    const speciesCards = STRUCTURE_TEMPLATES
      .filter(s => s.species === p.species)
      .map((s, i) => ({ ...s, id: 'ss' + p.idx + '_' + i, cost: { ...s.cost } }));
    let picked = null;
    if (FORCED_SPECIES_STARTER && FORCED_SPECIES_STARTER[p.species]) {
      picked = speciesCards.find(c => c.name === FORCED_SPECIES_STARTER[p.species]) || null;
    }
    if (!picked) {
      const ranked = speciesCards
        .map(c => ({ c, w: (SPECIES_DRAFT_WEIGHT[c.name] || 1) + Math.random() }))
        .sort((a, b) => b.w - a.w);
      picked = ranked[0].c;
    }
    p.built.push(picked);
  }
  // Top up opening hands to each player's hand size now that starters are
  // pre-built — the beaver's Beaver Cache starter raises their hand size to 4,
  // so they draw the extra card immediately rather than waiting for a build.
  for (const p of players) {
    while (p.hand.length < maxHandSize(p) && structDeck.length) p.hand.push(structDeck.pop());
  }
  // Test harness: give a free turn-1 starter (printed VP 0) to one player
  // (INJECT_STARTER_PLAYER >= 0) or to ALL players (=== -2), to measure the
  // ability's strength / game-length impact. See INJECT_STARTER_NAME.
  if (INJECT_STARTER_NAME && (INJECT_STARTER_PLAYER >= 0 || INJECT_STARTER_PLAYER === -2)) {
    const tmpl = BASE_STRUCTURE_TEMPLATES.find(s => s.name === INJECT_STARTER_NAME);
    const targets = INJECT_STARTER_PLAYER === -2
      ? players
      : (INJECT_STARTER_PLAYER < players.length ? [players[INJECT_STARTER_PLAYER]] : []);
    for (const tp of targets) {
      tp.built.push({
        name: INJECT_STARTER_NAME, cost: {}, time: 0, vp: 0,
        effect: tmpl ? tmpl.effect : '', id: 'free_' + INJECT_STARTER_NAME + '_' + tp.idx,
      });
    }
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
      combinedAuctions: 0, // Confluence: pooled two-card auctions triggered
      combinedCrossMat: 0, // subset of combinedAuctions where the two cards differ in material
      combinedTriggerFish: 0, // total 🐟 paid to initiate combined auctions
      effectUses: {},      // name → times that card's active ability actually fired
      jamAuctions: 0,
      plentyAuctions: 0,
      noBidAuctions: 0,
      iconsSpawned: 0, // sum of totalIcons of cards that entered the river/upstream
      iconsClaimed: 0,
      iconsWastedToShore: 0, // leftover icons when card moved to shoreline
      cardsBuilt: 0,
      invents: 0, // count of Invent (browse) actions taken across the game
      flushes: 0, // count of Flush actions taken across the game
      endgameTriggered: false,
      // Endgame action breakdown (counted only between triggerEndgame and game end)
      endgameTurns: 0,
      endgameBrowses: 0,   // Invent actions during endgame
      endgameBuilds: 0,    // Builds during endgame
      endgameAuctions: 0,  // Auctions (river+preriv+flush triggers) during endgame
      endgamePasses: 0,    // Pass actions during endgame
      maxBrowseStreak: 0,  // longest consecutive Invent run by a single player during endgame
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
// Count one successful activation of a card's active ability. Used by the
// effect-usage sweep to compare how often each "as an action" / triggered
// effect actually fires per builder (not just whether it was built).
function noteEffectUse(state, name) {
  const u = state.metrics.effectUses;
  u[name] = (u[name] || 0) + 1;
}
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
  if (PASS0_AT_ENDGAME_START) {
    for (const o of ordered) firePassZeroEffects(state, o.idx, 1);
  }
}

function advancePlayer(state, playerIdx, byTime) {
  const p = state.players[playerIdx];
  const prev = p.timePos;
  p.timePos += byTime;
  const prevLapBoundary = Math.floor(prev / LAP_LENGTH);
  const newLapBoundary  = Math.floor(p.timePos / LAP_LENGTH);
  const passZeroCount = Math.max(0, newLapBoundary - prevLapBoundary);
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
    // Slipping Sandbar enters at River 4 instead of River 1 (see design spec
    // in board-games.org, "Material effect-card spec").
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
  // Streambank Hollow: slide back 1 fish per worker recalled.
  if (total > 0 && hasEffect(p, 'Streambank Hollow')) {
    p.timePos = Math.max(0, p.timePos - total);
  }
  cleanupShoreline(state);
}

// =============================================================================
// AUCTIONS
// =============================================================================
// Engagement tracking for the dead-trailing-turn metric (tune-dead sweep).
// Active only when state._engage is present: records the latest turn index at
// which a player "engaged" — participated in an auction (placed a bid > 0, which
// includes the trigger's mandatory bid) or built a structure. Zero overhead when
// state._engage is absent (every other sweep / live play).
function markEngage(state, idx) {
  if (state._engage && !state._engage.frozen) state._engage.last[idx] = state.metrics.turns;
}

function runAuction(state, card, triggerPlayerIdx, minBidTrigger) {
  state.metrics.auctions++;
  // Floodgate: triggerer (only) auto-uses if available and card.slot >= 1.
  const trig = state.players[triggerPlayerIdx];
  if (hasEffect(trig, 'Floodgate') && !trig.floodgateUsed && typeof card.slot === 'number' && card.slot > 0) {
    card.slot -= 1;
    trig.floodgateUsed = true;
  }
  const bids = collectAuctionBids(state, card, triggerPlayerIdx, minBidTrigger);
  resolveAuction(state, card, bids);
}
// Collect every player's sealed bid for an auction over `card`, honouring
// Spy Mound / Quick Strike deferral. Factored out of runAuction so the
// combined same-symbol auction (Confluence) can reuse the exact same bidding
// AI against a virtual pooled card. Returns { playerIdx: bidCount }.
function collectAuctionBids(state, card, triggerPlayerIdx, minBidTrigger) {
  const bids = {};
  // Spy Mound (once per game) / Quick Strike (mink species starter, unlimited):
  // a player auto-defers to bid LAST on a high-value auction whose material
  // they actually want. Spy Mound used first when both are available
  // (one-shot resource). The "want" check prevents wasted activations on
  // materials nothing in the player's hand needs.
  let deferred = -1;
  let deferredViaQuickStrike = false;
  const wantsMaterial = (p) => {
    const mats = card.wildAlt ? [card.material, card.wildAlt] : [card.material];
    return p.hand.some(s => mats.some(m => (s.cost[m] || 0) > 0));
  };
  // Spy Mound is once-per-game; save it for auctions where perfect info
  // actually matters. Gate: card has ≥4 uncovered icons AND the player has
  // ≥2 unmet deficit in this material across some hand card. (Quick Strike
  // has no use limit, so it keeps the loose `wantsMaterial` gate below.)
  const spyMoundWorthIt = (p) => {
    if (uncoveredIcons(card) < 4) return false;
    const mats = card.wildAlt ? [card.material, card.wildAlt] : [card.material];
    const wbm = playerWorkersByMaterial(state, p.idx);
    let maxDeficit = 0;
    for (const s of p.hand) {
      for (const m of mats) {
        const need = s.cost[m] || 0;
        if (need === 0) continue;
        const deficit = Math.max(0, need - (wbm[m] || 0));
        if (deficit > maxDeficit) maxDeficit = deficit;
      }
    }
    return maxDeficit >= 2;
  };
  for (const p of state.players) {
    if (hasEffect(p, 'Spy Mound') && !p.spyMoundUsed && !p.exhausted && !p.out) {
      if (spyMoundWorthIt(p)) { deferred = p.idx; break; }
    }
  }
  if (deferred === -1) {
    // Quick Strike only fires when its owner is the one who triggered the
    // auction (per the card text), unlike Spy Mound which works on any auction.
    for (const p of state.players) {
      if (p.idx !== triggerPlayerIdx) continue;
      if (hasEffect(p, 'Quick Strike') && !p.exhausted && !p.out) {
        if (wantsMaterial(p)) { deferred = p.idx; deferredViaQuickStrike = true; break; }
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
    const room = open - others;
    const minBid = (deferred === triggerPlayerIdx) ? minBidTrigger : 0;
    // Use the normal bid calculator (which considers material need) for the
    // base recommendation, then cap at remaining room so we never jam.
    let bid = aiDecideBid(state, p.idx, card, minBid);
    if (room <= 0) {
      bid = deferred === triggerPlayerIdx ? Math.max(minBidTrigger, 1) : 0;
    } else {
      bid = Math.min(bid, room);
      if (deferred === triggerPlayerIdx) bid = Math.max(bid, minBidTrigger);
    }
    bids[p.idx] = bid;
  }
  return bids;
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
  for (const { idx } of playerBidPairs) markEngage(state, idx);

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
      if (got < bid && hasEffect(p, 'Pontoon')) billable = Math.max(0, bid - 1);
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

// -----------------------------------------------------------------------------
// Confluence: combined two-card auction
// -----------------------------------------------------------------------------
// One auction is run over TWO cards, pooling all of their uncovered icons into a
// single larger pool. Bidding reuses the standard AI via a virtual card whose
// uncovered-icon count is the combined pool and whose per-item 🐟 cost reflects
// the chosen cost mode (min/max of the two cards). Two pairing rules:
//   'same' — the two cards share a material; pooled icons are interchangeable,
//            and clinched workers fill cardA first, then cardB.
//   'any'  — the two cards may be different materials; in player order each
//            winner places their clinched workers on whichever of the two cards
//            they need more (subject to remaining capacity). The virtual card
//            carries wildAlt = cardB's material so the bid AI counts deficits in
//            BOTH materials (a worker can satisfy either), making one action
//            able to serve two different material needs.
// Each engaged card is then finalized (slides downstream with leftovers,
// graduates to shoreline when filled) like a normal single-card auction.
function makeVirtualCombinedCard(cardA, cardB, costMode) {
  // Per-item cost is governed by river slot (cardCost). For a same-material
  // pair any per-material discount is identical across the two cards, so
  // picking the cheaper/pricier card's slot reproduces min/max of
  // playerCardCost exactly. For a mixed pair, wildAlt lets the bid AI value
  // deficits in either material.
  const aIsCheaper = cardCost(cardA) <= cardCost(cardB);
  const ref = (costMode === 'min') ? (aIsCheaper ? cardA : cardB)
                                   : (aIsCheaper ? cardB : cardA);
  return {
    id: 'combined',
    material: cardA.material,
    wildAlt: cardA.material !== cardB.material ? cardB.material : null,
    totalIcons: uncoveredIcons(cardA) + uncoveredIcons(cardB),
    slot: ref.slot,
    workers: {},
    blanks: 0,
    effect: null,
    effectSpec: null,
  };
}
// 'any'-pairing placement: pick the card (with capacity) whose material this
// player needs more right now; tie-break to the cheaper per-item cost. Need is
// recomputed live, so a player fills their scarcer deficit first then spills to
// the other material.
function choosePlacementCard(state, playerIdx, cardA, cardB, remA, remB) {
  if (remA > 0 && remB <= 0) return cardA;
  if (remB > 0 && remA <= 0) return cardB;
  if (remA <= 0 && remB <= 0) return null;
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const needMat = (mat) => {
    let n = 0;
    for (const s of p.hand) n = Math.max(n, Math.max(0, (s.cost[mat] || 0) - (wbm[mat] || 0)));
    return n;
  };
  const nA = needMat(cardA.material), nB = needMat(cardB.material);
  if (nA !== nB) return nA > nB ? cardA : cardB;
  return playerCardCost(state, cardA, playerIdx) <= playerCardCost(state, cardB, playerIdx) ? cardA : cardB;
}
function runCombinedAuction(state, cardA, cardB, triggerPlayerIdx, minBidTrigger, costMode, pairing) {
  state.metrics.auctions++;
  state.metrics.combinedAuctions++;
  if (cardA.material !== cardB.material) state.metrics.combinedCrossMat++;
  noteEffectUse(state, 'Confluence');
  const virtual = makeVirtualCombinedCard(cardA, cardB, costMode);
  const bids = collectAuctionBids(state, virtual, triggerPlayerIdx, minBidTrigger);
  resolveCombinedAuction(state, cardA, cardB, virtual, bids, pairing, triggerPlayerIdx);
}
function resolveCombinedAuction(state, cardA, cardB, virtual, bids, pairing, triggerPlayerIdx) {
  let remA = uncoveredIcons(cardA);
  let remB = uncoveredIcons(cardB);
  const open = remA + remB;
  const totalBid = Object.values(bids).reduce((s, n) => s + n, 0);
  const place = (idx, n) => {
    let placed = 0;
    for (let k = 0; k < n; k++) {
      let card;
      if (pairing === 'any') {
        card = choosePlacementCard(state, idx, cardA, cardB, remA, remB);
      } else {
        card = remA > 0 ? cardA : (remB > 0 ? cardB : null);
      }
      if (!card) break;
      card.workers[idx] = (card.workers[idx] || 0) + 1;
      if (card === cardA) remA--; else remB--;
      placed++;
    }
    return placed;
  };
  if (totalBid === 0) {
    state.metrics.noBidAuctions++;
    // No bids, but the auction was triggered — both cards still float downriver.
    finalizeCombinedCard(state, cardA, false);
    finalizeCombinedCard(state, cardB, false);
    return;
  }
  // Clinch counts are order-independent, but placement (which physical card
  // fills) goes CLOCKWISE from the player who initiated the auction.
  const nP = state.players.length;
  const cwDist = (idx) => ((idx - triggerPlayerIdx) % nP + nP) % nP;
  const playerBidPairs = Object.entries(bids)
    .filter(([_, b]) => b > 0)
    .map(([idx, b]) => ({ idx: parseInt(idx), bid: b }))
    .sort((a, b) => cwDist(a.idx) - cwDist(b.idx));
  for (const { idx } of playerBidPairs) markEngage(state, idx);
  const isJam = totalBid > open;
  if (!isJam) {
    state.metrics.plentyAuctions++;
    for (const { idx, bid } of playerBidPairs) {
      const p = state.players[idx];
      const placed = place(idx, bid); // == bid in the plenty case
      p.supply -= placed;
      advancePlayer(state, idx, placed * playerCardCost(state, virtual, idx));
      state.metrics.iconsClaimed += placed;
      state.metrics.nonZeroBidders++;
    }
  } else {
    state.metrics.jamAuctions++;
    let totalClinched = 0;
    for (const { idx, bid } of playerBidPairs) {
      const p = state.players[idx];
      const others = totalBid - bid;
      const got = Math.max(0, Math.min(bid, open - others));
      const placed = place(idx, got);
      if (placed > 0) p.supply -= placed;
      let billable = bid;
      if (placed < bid && hasEffect(p, 'Pontoon')) billable = Math.max(0, bid - 1);
      advancePlayer(state, idx, billable * playerCardCost(state, virtual, idx));
      state.metrics.iconsClaimed += placed;
      state.metrics.nonZeroBidders++;
      if (placed === 0) state.metrics.zeroClinchBidders++;
      totalClinched += placed;
    }
    if (totalClinched === 0) state.metrics.zeroClinchAuctions++;
  }
  finalizeCombinedCard(state, cardA, isJam);
  finalizeCombinedCard(state, cardB, isJam);
}
// Post-auction slide/graduate for one card in a combined auction. Triggering a
// Confluence engages BOTH cards, so each one floats downriver afterward whether
// or not workers landed on it: a fully-covered card graduates to the shoreline;
// any card with leftover icons slides one slot downstream.
function finalizeCombinedCard(state, card, wasJam) {
  if (uncoveredIcons(card) === 0) { moveCardToShoreline(state, card); return; }
  const slidesNow =
    wasJam || ALL_PLENTY_SLIDES ||
    (PRERIV_PLENTY_SLIDES_TO_RIVER && card.slot === 'pre');
  if (slidesNow) {
    if (card.slot === 'pre') state.metrics.preToRiverFromPlenty++;
    else state.metrics.riverPlentySlides++;
    jamCardDownriver(state, card);
  } else {
    moveCardToShoreline(state, card);
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
  'Pontoon': 1,
  'Cache Burrow': 1,
  'Beaver Cache': 1,
  // Mid-low constants
  'Reed Bed': 0.5,
  'Log Flume': 2,
  'Mill Wheel': 0.5,
  'Pack Rat Burrow': 1,
  'Spring Cascade': 0.5,
  // One-time
  'Royal Lodge': 1,
  'Burrow Run': 1,
  'Sap Drip': 1,
  'Snag Pile': 1,
  'Vine Lattice': 0.5,
  'Spillway': 0.5,
  'Mud Levee': 0.5,
  // ~0
  'Wood Pile': 0,
  'Hollowed-out Log': 0,
  'Streambank Hollow': 0,
  'Heron Roost': 0,
  'Driftwood Snag': 0,
  'Floodgate': 0,
  'Spy Mound': 0,
  'Tribute Stone': 0.5,
  'Tow Line': 1,
  'Portage': 1.5,
  'Salmon Run': 2,
  'Confluence': 1.5,
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
  if (struct.name === 'Wood Pile' && p.woodPileUsed) return 0;
  if (struct.name === 'Hollowed-out Log' && p.hollowedLogUsed) return 0;
  if (struct.name === 'Pack Rat Burrow' && p.packRatUsed) return 0;
  if (struct.name === 'Spring Cascade' && p.springCascadeUsed) return 0;
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
  // The 6 fixed-base + end-game-bonus cards. Multiplier and cap are sourced
  // from VP_OVERRIDES when present (used by sweepVpRework) so the AI's
  // draw/Invent valuation tracks the swapped scoring shape; defaults match
  // the live game. Tempo bonuses on Vine Trellis / Stone Causeway / Reed
  // Walkway / Clay Vault / Burrow Network represent the *non-VP* perk
  // (slide-back, draw-and-filter, free worker, hand-sculpt, worker-move).
  if (struct.name === 'Vine Ladder') {
    const o = VP_OVERRIDES['Vine Ladder'];
    const mult = (o && o.mult !== undefined) ? o.mult : 4;
    const cap = (o && o.cap !== undefined) ? o.cap : 12;
    const builtVine = p.built.filter(b => (b.cost.vines || 0) > 0).length;
    const handVine = p.hand.filter(s => (s.cost.vines || 0) > 0).length;
    return Math.min(cap, mult * (builtVine + Math.min(handVine, 2)));
  }
  if (struct.name === 'Vine Trellis') {
    const o = VP_OVERRIDES['Vine Trellis'];
    const mult = (o && o.mult !== undefined) ? o.mult : 2;
    const cap = (o && o.cap !== undefined) ? o.cap : Infinity;
    const builtVine = p.built.filter(b => (b.cost.vines || 0) > 0).length;
    const handVine = p.hand.filter(s => (s.cost.vines || 0) > 0).length;
    return Math.min(cap, mult * (builtVine + 1 + Math.min(handVine, 2))) + 1;
  }
  if (struct.name === 'Stone Causeway') {
    const o = VP_OVERRIDES['Stone Causeway'];
    const mult = (o && o.mult !== undefined) ? o.mult : 2;
    const cap = (o && o.cap !== undefined) ? o.cap : 8;
    const builtStone = p.built.filter(b => (b.cost.stones || 0) > 0).length;
    const handStone = p.hand.filter(s => (s.cost.stones || 0) > 0).length;
    return Math.min(cap, mult * (builtStone + 1 + Math.min(handStone, 2))) + 1.5;
  }
  if (struct.name === 'Reed Walkway') {
    const o = VP_OVERRIDES['Reed Walkway'];
    const mult = (o && o.mult !== undefined) ? o.mult : 2;
    const cap = (o && o.cap !== undefined) ? o.cap : Infinity;
    const builtReed = p.built.filter(b => (b.cost.reeds || 0) > 0).length;
    const handReed = p.hand.filter(s => (s.cost.reeds || 0) > 0).length;
    return Math.min(cap, mult * (builtReed + 1 + Math.min(handReed, 2))) + 2;
  }
  if (struct.name === 'Clay Vault') {
    const o = VP_OVERRIDES['Clay Vault'];
    const mult = (o && o.mult !== undefined) ? o.mult : 3;
    const cap = (o && o.cap !== undefined) ? o.cap : 12;
    const builtClay = p.built.filter(b => (b.cost.clay || 0) > 0).length;
    const handClay = p.hand.filter(s => (s.cost.clay || 0) > 0).length;
    return Math.min(cap, mult * (builtClay + 1 + Math.min(handClay, 2))) + 1;
  }
  if (struct.name === 'Burrow Network') {
    const o = VP_OVERRIDES['Burrow Network'];
    const mult = (o && o.mult !== undefined) ? o.mult : 3;
    const cap = (o && o.cap !== undefined) ? o.cap : 9;
    const builtMud = p.built.filter(b => (b.cost.mud || 0) > 0).length;
    const handMud = p.hand.filter(s => (s.cost.mud || 0) > 0).length;
    return Math.min(cap, mult * (builtMud + 1 + Math.min(handMud, 2))) + 1;
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
    return Math.min(6, state.shorelineCards.length + Math.floor(remaining * 0.5));
  }
  return EFFECT_VP_FIXED[struct.name] || 0;
}

// =============================================================================
// AI: TURN DECISIONS
// =============================================================================
// Confluence finder: pick the same-material pair of available cards (river +
// pre-river, ≥1 uncovered icon each) that best serves the player's hand needs.
// Returns { A, B, material, score, got } or null. Scored on the same basis as
// single-card auction targets so the two can be compared directly.
function findCombinedAuctionTarget(state, playerIdx, needs, triggerPool) {
  if (triggerPool <= 0) return null;
  let best = null;
  for (const m of MAT_KEYS) {
    const need = needs[m];
    if (need === 0) continue;
    // Confluence requires an exact symbol match — wild cards (Driftwood Tangle /
    // Mud Slick) carry two materials, so they can't be a same-symbol pair member.
    const cards = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => c.material === m && !c.wildAlt && uncoveredIcons(c) > 0);
    if (cards.length < 2) continue;
    // Two biggest pools → largest combined pool.
    cards.sort((a, b) => uncoveredIcons(b) - uncoveredIcons(a));
    const A = cards[0], B = cards[1];
    const pool = uncoveredIcons(A) + uncoveredIcons(B);
    const got = Math.min(pool, triggerPool, need);
    const cfg = combinedConfig(state.players[playerIdx]);
    const perItem = (cfg.item === 'min')
      ? Math.min(playerCardCost(state, A, playerIdx), playerCardCost(state, B, playerIdx))
      : Math.max(playerCardCost(state, A, playerIdx), playerCardCost(state, B, playerIdx));
    const trig = combinedTriggerCost(state, A, B, cfg.trigger);
    const score = need * got - perItem * got * 0.4 - trig * 0.6;
    if (!best || score > best.score) best = { A, B, material: m, score, got };
  }
  return best;
}
// 'any'-pairing finder: pick the two highest-scoring distinct cards the player
// needs, regardless of material. Scored like single-card auction targets, with
// a per-material need cap so a same-material pair isn't double-counted. The two
// cards may be different materials → one action covers two needs.
function findCombinedAuctionTargetAny(state, playerIdx, needs, triggerPool) {
  if (triggerPool <= 0) return null;
  const avail = [...state.riverCards, ...state.prerivCards.filter(c => c)]
    .filter(c => uncoveredIcons(c) > 0 && needs[c.material] > 0);
  if (avail.length < 2) return null;
  const scored = avail.map(c => {
    const g = Math.min(uncoveredIcons(c), needs[c.material]);
    return { c, score: needs[c.material] * g - playerCardCost(state, c, playerIdx) * g * 0.4 };
  }).sort((a, b) => b.score - a.score);
  const A = scored[0].c, B = scored[1].c;
  // Combined score: greedy claim against own needs + trigger pool, capping each
  // material's quantity so a reeds+reeds pair doesn't claim 2× the reeds need.
  const remNeed = { ...needs };
  let pool = triggerPool, combined = 0;
  for (const c of [A, B]) {
    const g = Math.max(0, Math.min(uncoveredIcons(c), remNeed[c.material], pool));
    combined += needs[c.material] * g - playerCardCost(state, c, playerIdx) * g * 0.4;
    remNeed[c.material] -= g; pool -= g;
  }
  const trig = combinedTriggerCost(state, A, B, combinedConfig(state.players[playerIdx]).trigger);
  return { A, B, score: combined - trig * 0.6 };
}
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
  // Pick the best material-gaining action across single auctions, the combined
  // (Confluence / Double Vision) auction, Salmon Run, and Tow Line — all
  // scored on the same need-weighted scale (need × workers − fish×0.4). Folding
  // them into one comparison keeps Salmon Run / Tow Line reachable: a single
  // auction used to `return` first, so they fired ~never even when cheaper.
  const candidates = [];
  if (bestCard) {
    candidates.push({
      score: bestScore, needsTrigger: true,
      make: () => bestKind === 'river' ? { type: 'auction', cardId: bestCard.id } : { type: 'preriv', slotIdx: bestPrerivIdx },
    });
  }
  if (hasCombinedAuctionAbility(p)) {
    const cfg = combinedConfig(p);
    const ct = (cfg.pairing === 'any')
      ? findCombinedAuctionTargetAny(state, playerIdx, needs, triggerPool)
      : findCombinedAuctionTarget(state, playerIdx, needs, triggerPool);
    if (ct && p.timePos + combinedTriggerCost(state, ct.A, ct.B, cfg.trigger) < SIM_FINISH_LINE) {
      candidates.push({ score: ct.score, needsTrigger: true, make: () => ({ type: 'combinedAuction', aId: ct.A.id, bId: ct.B.id }) });
    }
  }
  if (hasEffect(p, 'Salmon Run') && p.supply > 0 && p.timePos + 2 < SIM_FINISH_LINE) {
    const t = findSalmonRunTarget(state, playerIdx, needs);
    if (t && p.timePos + salmonRunCumulativeCost(t.n) < SIM_FINISH_LINE) {
      candidates.push({ score: t.score, needsTrigger: false, make: () => ({ type: 'salmonRun', cardId: t.card.id, workerCount: t.n }) });
    }
  }
  if (hasEffect(p, 'Tow Line') && p.timePos + 2 < SIM_FINISH_LINE) {
    const t = findBeaverTowTarget(state, playerIdx, needs);
    if (t) candidates.push({ score: t.score, needsTrigger: false, make: () => ({ type: 'beaverTow', cardId: t.card.id }) });
  }
  candidates.sort((a, b) => b.score - a.score);
  for (const cand of candidates) {
    if (cand.needsTrigger && triggerPool <= 0) continue;
    return cand.make();
  }
  // Endgame pair-VP cash-out check: if the rule is live, we're in endgame,
  // and our leftover workers already pair up to ≥1 VP, prefer passing over
  // any Invent / flush / no-op continuation — the cash-out beats the gamble.
  // (The build / auction branches above run first; if either of those was
  // useful we never reach this code.)
  const cashOut = FINAL_PAIR_VP && state.endgame &&
                  endgamePairVP(state, playerIdx) >= 1;

  if (totalNeed === 0 || p.hand.length === 0) {
    if (cashOut) return { type: 'pass' };
    if (structAvailable(state) > 0) return { type: 'browse', n: Math.min(2, structAvailable(state)) };
  }
  const upstreamHasNeeded = state.prerivCards.some(c => c && needs[c.material] > 0);
  const upstreamHasAny = state.prerivCards.some(c => c !== null);
  // Flush includes triggering an auction, which requires at least one worker
  // (supply or recallable, since pre-auction recall covers triggers too).
  // Illegal once the material deck is empty — no fresh cards to draw.
  if (upstreamHasAny && !upstreamHasNeeded && triggerPool > 0 && state.matDeck.length > 0) {
    return { type: 'flush' };
  }
  if (cashOut) return { type: 'pass' };
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

// Trading Post: pay 1 fish to recall 1 worker each from 3 different-material
// river cards (TRADE_POST_DROPS_BLANKS controls whether blanks drop), then
// place 2 free workers from supply onto uncovered icons of one river card.
// AI heuristic: choose target = river card whose material is most-needed by
// hand builds AND has ≥2 uncovered icons. Choose 3 sources = cards holding
// our workers across 3 distinct materials, preferring (a) lowest hand need
// for that material, then (b) lowest worker count parked there.
const TRADE_POST_DROPS_BLANKS = true;

function findTradingPostAction(state, playerIdx) {
  const p = state.players[playerIdx];
  // Tally how much each material is needed across our current hand.
  const need = {};
  for (const s of p.hand) for (const m in s.cost) need[m] = (need[m] || 0) + s.cost[m];
  // Candidate targets: river cards with ≥2 uncovered icons. Score by hand
  // need for that material (higher is better) with a small bonus per
  // uncovered icon (so we don't pick a near-full card we can't fully use).
  const targets = state.riverCards
    .filter(c => uncoveredIcons(c) >= 2)
    .map(c => ({ card: c, score: (need[c.material] || 0) * 10 + uncoveredIcons(c) }))
    .sort((a, b) => b.score - a.score);
  if (targets.length === 0 || (need[targets[0].card.material] || 0) === 0) return null;
  const target = targets[0].card;
  // Source candidates: cards with our worker, of materials != target.material.
  // Score each card by (-need[mat]) so we drain materials we need LEAST.
  const sources = [];
  const seenMats = new Set();
  const candPool = []
    .concat(state.shorelineCards.filter(c => workersOnCard(c, playerIdx) > 0))
    .concat(state.riverCards.filter(c => workersOnCard(c, playerIdx) > 0))
    .filter(c => c.material !== target.material)
    .sort((a, b) => (need[a.material] || 0) - (need[b.material] || 0)
                  || workersOnCard(a, playerIdx) - workersOnCard(b, playerIdx));
  for (const c of candPool) {
    if (seenMats.has(c.material)) continue;
    sources.push(c);
    seenMats.add(c.material);
    if (sources.length === 3) break;
  }
  if (sources.length < 3) return null;
  return { sources, target };
}

function doTradingPost(state, playerIdx, action) {
  const p = state.players[playerIdx];
  // Recall 1 worker from each of the 3 source cards.
  for (const c of action.sources) {
    c.workers[playerIdx] -= 1;
    if (c.workers[playerIdx] === 0) delete c.workers[playerIdx];
    if (TRADE_POST_DROPS_BLANKS && typeof c.slot === 'number') c.blanks += 1;
    p.supply += 1;
  }
  // Pay 1 fish and place 2 workers on the target card's uncovered icons.
  p.timePos += 1;
  const place = Math.min(2, p.supply, uncoveredIcons(action.target));
  action.target.workers[playerIdx] = (action.target.workers[playerIdx] || 0) + place;
  p.supply -= place;
  if (TRADE_POST_DROPS_BLANKS) noteBlanks(state);
  noteEffectUse(state, 'Trading Post');
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

// Portage: swap your worker on river card A with another worker on card B.
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
  noteEffectUse(state, 'Portage');
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
// between two cards in the SAME river slot. Variant of Portage with no
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
const SALMON_RUN_COSTS = [1, 2, 3, 5, 8];
// Turn-delay penalty for Tow Line: towing spends a whole action now to set up
// a cheaper auction later, so the future grab must be sizable to beat just
// auctioning the card outright this turn. Tuned so tow only wins on big grabs.
const BEAVER_TOW_DELAY = 1.5;
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
  noteEffectUse(state, 'Salmon Run');
  return true;
}

function findSalmonRunTarget(state, playerIdx, needs) {
  const p = state.players[playerIdx];
  let best = null;
  for (const c of state.riverCards) {
    if (typeof c.slot !== 'number') continue;
    const need = needs[c.material] || 0;
    if (need === 0) continue;
    let bestN = 0, bestScore = 0;
    const maxN = Math.min(p.supply, uncoveredIcons(c), need, SALMON_RUN_COSTS.length);
    for (let n = 1; n <= maxN; n++) {
      // Scored on the SAME need-weighted scale as a single-card auction
      // (need × workers − fish×0.4), but Salmon Run's escalating cost is
      // slot-independent — so it beats an auction on deep/expensive cards.
      const score = need * n - salmonRunCumulativeCost(n) * 0.4;
      if (score > bestScore) { bestScore = score; bestN = n; }
    }
    if (bestN > 0 && (best === null || bestScore > best.score)) {
      best = { card: c, n: bestN, score: bestScore };
    }
  }
  return best;
}

// Tow Line: pay 2 fish, slide a river card 1 slot upstream (toward Headwaters).
function doBeaverTow(state, playerIdx, cardId) {
  const card = state.riverCards.find(c => c.id === cardId);
  if (!card || typeof card.slot !== 'number' || card.slot === 0) return false;
  card.slot -= 1;
  advancePlayer(state, playerIdx, 2);
  noteEffectUse(state, 'Tow Line');
  return true;
}

function findBeaverTowTarget(state, playerIdx, needs) {
  const p = state.players[playerIdx];
  // Tow Line's slide makes the card cheaper for *everyone* who auctions
  // it next, so we should only tow when the builder is the dominant
  // beneficiary. Two gates:
  //   (1) No opponent has any hand structure that needs this material —
  //       so the slid card's discount won't subsidize their auction.
  //   (2) Builder has trigger pool to auction the slid card themselves.
  // Without these, towing is a public-good action that costs the builder
  // 2🐟 + a main action and disproportionately helps opponents.
  const triggerPool = aiTriggerPool(state, playerIdx);
  if (triggerPool === 0) return null;
  const opponentNeedsMaterial = (mat) => {
    for (const op of state.players) {
      if (op.idx === playerIdx || op.exhausted || op.out) continue;
      for (const s of op.hand) {
        if ((s.cost[mat] || 0) > 0) return true;
      }
    }
    return false;
  };
  let best = null;
  for (const c of state.riverCards) {
    if (typeof c.slot !== 'number' || c.slot === 0) continue;
    const need = needs[c.material] || 0;
    if (need < 2) continue; // builder needs ≥2 of this material for the tow to pay off
    if (uncoveredIcons(c) < 4) continue;
    if (opponentNeedsMaterial(c.material)) continue;
    // Tow sets up a cheaper future auction: sliding one slot upstream cuts the
    // per-item cost by 1🐟. Score it on the auction scale as the value of that
    // discounted future grab, minus the 2🐟 tow cost and a turn-delay penalty
    // (an extra action spent now without gaining material) — so it only wins
    // over auctioning the card outright when the future grab is large.
    const futureGot = Math.min(need, uncoveredIcons(c), triggerPool);
    const reducedCost = Math.max(1, playerCardCost(state, c, playerIdx) - 1);
    const score = need * futureGot - reducedCost * futureGot * 0.4 - 2 * 0.4 - BEAVER_TOW_DELAY;
    if (!best || score > best.score) best = { card: c, score };
  }
  return best;
}

// Heron Roost / Driftwood Snag / Tribute Stone: optional start-of-turn abilities.
// Auto-fire for AI when conditions are met. Heron Roost / Driftwood Snag each
// cost 1 fish; Tribute Stone is free (once per game).
function aiStartOfTurnAbilities(state, playerIdx) {
  const p = state.players[playerIdx];
  // Reworked once-per-game abilities + Mill Wheel's neighbour-copy (as an action).
  tryWoodPile(state, playerIdx);
  tryHollowedLog(state, playerIdx);
  tryPackRat(state, playerIdx);
  trySpringCascade(state, playerIdx);
  tryMillWheel(state, playerIdx);
  // Heron Roost: replace a pre-river card whose material isn't in this AI's hand.
  if (hasEffect(p, 'Heron Roost') && state.matDeck.length > 0 && p.timePos < SIM_FINISH_LINE - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const target = state.prerivCards.findIndex(c => c && !myMats.has(c.material));
    if (target !== -1) {
      const newCard = state.matDeck.pop();
      newCard.slot = 'pre';
      state.prerivCards[target] = newCard;
      state.metrics.iconsSpawned += newCard.totalIcons;
      p.timePos += 1; // 1 fish cost
      noteEffectUse(state, 'Heron Roost');
    }
  }
  // Driftwood Snag: drop a blank on a card with the most uncovered icons (disruption).
  if (hasEffect(p, 'Driftwood Snag') && p.timePos < SIM_FINISH_LINE - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const cands = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => uncoveredIcons(c) >= 4 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1; // 1 fish cost
      noteEffectUse(state, 'Driftwood Snag');
    }
  }
  // Tribute Stone: fire when there's a high-value opponent worker (per-item cost ≥ 3)
  // and we're not too deep into endgame (compensation is useless if the victim is already retired).
  if (hasEffect(p, 'Tribute Stone') && !p.tributeStoneUsed && p.timePos < SIM_FINISH_LINE - 10) {
    const target = findTributeStoneTarget(state, playerIdx);
    if (target && target.value >= 3) doTributeStone(state, playerIdx, target.victimIdx, target.card);
  }
  // Portage: swap to pry an opponent off a useful material card.
  if (hasEffect(p, 'Portage') && p.timePos < SIM_FINISH_LINE - 5) {
    const target = findOtterTrailTarget(state, playerIdx);
    if (target && p.timePos + cardCost(target.cardA) < SIM_FINISH_LINE) {
      doOtterTrail(state, playerIdx, target.cardA.id, target.cardB.id, target.otherIdx);
    }
  }
  // Snare Set (mink species starter): mirrors Tribute Stone but with its own
  // once-per-game flag, so a mink with both can use each independently.
  if (hasEffect(p, 'Snare Set') && !p.snareSetUsed && p.timePos < SIM_FINISH_LINE - 10) {
    const target = findTributeStoneTarget(state, playerIdx);
    if (target && target.value >= 3) doSnareSet(state, playerIdx, target.victimIdx, target.card);
  }
  // Rolling Float (otter species starter): once-per-game free same-slot swap.
  if (hasEffect(p, 'Rolling Float') && !p.rollingFloatUsed) {
    const target = findRollingFloatTarget(state, playerIdx);
    if (target) doRollingFloat(state, playerIdx, target.cardA, target.cardB, target.otherIdx);
  }
  // Trading Post: pay 1 fish to recall 1 worker each from 3 different-material
  // cards (drops 3 blanks by default; toggle TRADE_POST_DROPS_BLANKS = false
  // for the variant that doesn't drop blanks), then place 2 free workers
  // from supply onto uncovered icons of one card. AI fires when the swap
  // is net-useful: target card material is in our hand-need and we have
  // 3+ disposable distinct-material workers parked on lower-priority cards.
  if (hasEffect(p, 'Trading Post') && p.timePos < SIM_FINISH_LINE - 1 && p.supply >= 2) {
    const action = findTradingPostAction(state, playerIdx);
    if (action) doTradingPost(state, playerIdx, action);
  }
  // Tail Slap (beaver species starter): drop a blank on a R1 card whose
  // material we don't need (deny opponents who do). Costs 1 fish.
  if (hasEffect(p, 'Tail Slap') && p.timePos < SIM_FINISH_LINE - 1) {
    const myMats = new Set();
    for (const s of p.hand) for (const m in s.cost) myMats.add(m);
    const cands = state.riverCards
      .filter(c => c.slot === 0 && uncoveredIcons(c) >= 3 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1;
      noteEffectUse(state, 'Tail Slap');
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
      noteEffectUse(state, 'Channel Clearer');
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
  const { eff: effCost, granaryUsed, stoneToolUsed } = effectiveBuildCost(struct, p, wbm);
  if (granaryUsed) p.granaryUsed = true;
  if (stoneToolUsed) p.stoneToolUsed = true;
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
  // Log Flume: build advances 3 fewer fish (min 1). Cards with printed time 0 stay 0.
  // Lodge Foundation (beaver species starter): build advances 1 fewer fish on
  // Logs-using structures (stacks with Log Flume).
  const slideDiscount = hasEffect(p, 'Log Flume') ? 3 : 0;
  const lodgeDiscount = (hasEffect(p, 'Lodge Foundation') && (struct.cost.logs || 0) > 0) ? 1 : 0;
  const timeCost = struct.time === 0 ? 0 : Math.max(1, struct.time - slideDiscount - lodgeDiscount);
  advancePlayer(state, playerIdx, timeCost);
  p.hand.splice(handIdx, 1);
  p.built.push(struct);
  state.metrics.cardsBuilt++;
  markEngage(state, playerIdx);
  fireOnBuildEffect(state, playerIdx, struct);
  // Replace from deck up to maxHandSize (Cache Burrow → 4).
  while (p.hand.length < maxHandSize(p) && structAvailable(state) > 0) {
    p.hand.push(popStructDeck(state));
  }
  // Passive build-triggered effects keyed off the builder's tableau (fire when
  // ANY structure with the matching material is built). Runs after the refill so
  // Stone Causeway's extra draw goes over the hand limit before re-filtering.
  firePassiveBuildEffects(state, playerIdx, struct);
  cleanupShoreline(state);
}

// Passive on-build triggers: structures already in the player's tableau react
// to the just-completed build based on the built struct's material set.
function firePassiveBuildEffects(state, playerIdx, struct) {
  const p = state.players[playerIdx];
  // Vine Trellis: slide back 1 fish on each Vines-cost build.
  if (hasEffect(p, 'Vine Trellis') && (struct.cost.vines || 0) > 0) {
    p.timePos = Math.max(0, p.timePos - 1);
  }
  // Stone Causeway: draw 1 extra structure card, then discard worst in hand.
  if (hasEffect(p, 'Stone Causeway') && (struct.cost.stones || 0) > 0) {
    aiStoneCausewayDraw(state, playerIdx);
  }
  // Reed Walkway: place 1 free worker on a River 1 uncovered icon.
  if (hasEffect(p, 'Reed Walkway') && (struct.cost.reeds || 0) > 0) {
    aiReedWalkwayPlace(state, playerIdx);
  }
  // Clay Vault: peek top of structure deck; swap with worst hand card if better.
  if (hasEffect(p, 'Clay Vault') && (struct.cost.clay || 0) > 0) {
    aiClayVaultSwap(state, playerIdx);
  }
  // Burrow Network: move one of your workers to another card you already occupy.
  if (hasEffect(p, 'Burrow Network') && (struct.cost.mud || 0) > 0) {
    aiBurrowNetworkMove(state, playerIdx);
  }
}

// AI: Stone Causeway draw-and-filter. Pops 1 structure card; then scores the
// (oversized) hand and discards the worst by VP + effect value − deficit.
function aiStoneCausewayDraw(state, playerIdx) {
  const p = state.players[playerIdx];
  if (structAvailable(state) === 0) return;
  p.hand.push(popStructDeck(state));
  if (p.hand.length <= maxHandSize(p)) return;
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const score = (s) => {
    let deficit = 0;
    for (const m in s.cost) deficit += Math.max(0, s.cost[m] - (wbm[m] || 0));
    return s.vp + aiEffectValue(s, p, state) - deficit * 1.5;
  };
  const scored = p.hand.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => a.sc - b.sc);
  const dropped = p.hand.splice(scored[0].i, 1)[0];
  state.structDiscard.push(dropped);
}

// AI: Reed Walkway free worker on R1. Picks the highest-need material at slot 0.
function aiReedWalkwayPlace(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.supply === 0) return;
  const cands = state.riverCards.filter(c => c.slot === 0 && uncoveredIcons(c) > 0);
  if (cands.length === 0) return;
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const need = m => Math.max(0, ...p.hand.map(s => (s.cost[m] || 0) - (wbm[m] || 0)));
  cands.sort((a, b) => {
    const na = need(a.material), nb = need(b.material);
    if (na !== nb) return nb - na;
    return uncoveredIcons(b) - uncoveredIcons(a);
  });
  const target = cands[0];
  p.supply -= 1;
  target.workers[playerIdx] = (target.workers[playerIdx] || 0) + 1;
}

// AI: Clay Vault peek-and-swap. Peeks top of structure deck; swaps with worst
// hand card if the deck top scores higher than the worst.
function aiClayVaultSwap(state, playerIdx) {
  const p = state.players[playerIdx];
  if (structAvailable(state) === 0) return;
  if (state.structDeck.length === 0) {
    state.structDeck = shuffle(state.structDiscard);
    state.structDiscard = [];
  }
  if (state.structDeck.length === 0) return;
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const score = (s) => {
    let deficit = 0;
    for (const m in s.cost) deficit += Math.max(0, s.cost[m] - (wbm[m] || 0));
    return s.vp + aiEffectValue(s, p, state) - deficit * 1.5;
  };
  const top = state.structDeck[state.structDeck.length - 1];
  const topScore = score(top);
  const scored = p.hand.map((s, i) => ({ s, i, sc: score(s) })).sort((a, b) => a.sc - b.sc);
  const worst = scored[0];
  if (topScore > worst.sc) {
    state.structDeck.pop();
    const dropped = p.hand.splice(worst.i, 1)[0];
    state.structDiscard.push(dropped);
    p.hand.push(top);
  }
}

// AI: Burrow Network worker move. Source and destination must both have ≥1 of
// your workers and be different river cards. Destination needs an uncovered icon
// OR a blank (worker replaces the blank, clearing it). Picks the move that
// maximizes (need at dst − need at src), with a small bonus for blank-replace.
function aiBurrowNetworkMove(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const need = m => Math.max(0, ...p.hand.map(s => (s.cost[m] || 0) - (wbm[m] || 0)));
  const mine = state.riverCards.filter(c => workersOnCard(c, playerIdx) > 0);
  if (mine.length < 2) return;
  let best = null, bestScore = 0;
  for (const src of mine) {
    for (const dst of mine) {
      if (dst.id === src.id) continue;
      const open = uncoveredIcons(dst) > 0;
      const blanked = dst.blanks > 0;
      if (!open && !blanked) continue;
      // Prefer blank-replace when a blank is available (clears a dead icon).
      const useBlank = blanked;
      const blankBonus = useBlank ? 0.5 : 0;
      const score = need(dst.material) - need(src.material) + blankBonus;
      if (score > bestScore) {
        bestScore = score;
        best = { src, dst, useBlank };
      }
    }
  }
  if (!best) return;
  best.src.workers[playerIdx] -= 1;
  if (best.src.workers[playerIdx] === 0) delete best.src.workers[playerIdx];
  if (best.useBlank) {
    best.dst.blanks -= 1;
    noteBlanks(state);
  }
  best.dst.workers[playerIdx] = (best.dst.workers[playerIdx] || 0) + 1;
}

// "When built" effects a neighbour's structure might have, that Mill Wheel can
// copy, in rough value-to-the-copier order. Excludes Mill Wheel (no recursion)
// and Salt Lick (info-only, no sim effect).
const MILL_WHEEL_WHENBUILT = ['Royal Lodge', 'Sap Drip', 'Springwater Pool', 'Vine Lattice',
  'Snag Pile', 'Spillway', 'Mud Levee', 'Flush Channel', 'Stone Pool', 'Burrow Run'];

function fireOnBuildEffect(state, playerIdx, struct) {
  const p = state.players[playerIdx];
  if (!effectActive(struct.name)) return;
  if (struct.name === 'Mill Wheel') {
    // When built: copy one "when built" effect from a left/right neighbour's
    // built structure, resolved for us. (The repeatable as-an-action copy lives
    // in tryMillWheel.)
    const neighborHas = new Set();
    for (const nIdx of neighborIdxs(state, playerIdx))
      for (const s of state.players[nIdx].built)
        if (effectActive(s.name)) neighborHas.add(s.name);
    for (const name of MILL_WHEEL_WHENBUILT) {
      if (neighborHas.has(name)) {
        fireOnBuildEffect(state, playerIdx, { name }); // resolve that effect for us
        noteEffectUse(state, 'Mill Wheel');
        break;
      }
    }
    return;
  }
  if (struct.name === 'Burrow Run') {
    p.timePos = Math.max(0, p.timePos - 5);
    return;
  }
  if (struct.name === 'Royal Lodge') {
    state.bonusTurnPlayer = playerIdx;
    return;
  }
  // Spring Cascade is now a once-per-game on-demand ability (see
  // trySpringCascade), not a when-built trigger — nothing fires here on build.
  if (struct.name === 'Springwater Pool') {
    // Ready all of the builder's spent once-per-game cards. Tracked flags
    // mirror the player init in newGame(): main-deck cards (granaryUsed,
    // floodgateUsed, spyMoundUsed, tributeStoneUsed, slipstreamUsed), species
    // starters (rollingFloatUsed, snareSetUsed, stoneToolUsed), and the
    // reworked once-per-game cards (woodPile/hollowedLog/packRat/springCascade).
    p.granaryUsed = false;
    p.floodgateUsed = false;
    p.spyMoundUsed = false;
    p.tributeStoneUsed = false;
    p.slipstreamUsed = false;
    p.rollingFloatUsed = false;
    p.snareSetUsed = false;
    p.stoneToolUsed = false;
    p.woodPileUsed = false;
    p.hollowedLogUsed = false;
    p.packRatUsed = false;
    p.springCascadeUsed = false;
    return;
  }
  if (struct.name === 'Spillway') {
    const r1 = state.riverCards.filter(c => c.slot === 0);
    if (r1.length === 0) return;
    // Pick the R1 card that's best to wash for the BUILDER:
    //   + own workers: they carry to shoreline (no-blank recall later, count
    //     toward Pier/Heron Watch if we built either, still count for endgame
    //     pair-VP).
    //   − opponent workers: graduating their workers to shoreline pads their
    //     Pier/Heron Watch and saves them downstream per-item costs they
    //     would otherwise pay to drift the card.
    //   − uncovered icons: these get wasted (no auction opportunity for us
    //     either, since R1 auctions are cheap at 2🐟/item).
    r1.sort((a, b) => {
      const ownA = workersOnCard(a, playerIdx);
      const ownB = workersOnCard(b, playerIdx);
      const totA = Object.values(a.workers).reduce((s, n) => s + n, 0);
      const totB = Object.values(b.workers).reduce((s, n) => s + n, 0);
      const oppA = totA - ownA;
      const oppB = totB - ownB;
      const scoreA = ownA * 3 - oppA * 2 - uncoveredIcons(a);
      const scoreB = ownB * 3 - oppB * 2 - uncoveredIcons(b);
      return scoreB - scoreA;
    });
    moveCardToShoreline(state, r1[0]);
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
  if (action.type === 'combinedAuction') {
    const find = id => state.riverCards.find(c => c.id === id) ||
                       state.prerivCards.find(c => c && c.id === id);
    const A = find(action.aId), B = find(action.bId);
    if (A && B && A !== B) {
      const cfg = combinedConfig(state.players[playerIdx]);
      const trigger = combinedTriggerCost(state, A, B, cfg.trigger);
      state.metrics.combinedTriggerFish += trigger;
      advancePlayer(state, playerIdx, trigger);
      runCombinedAuction(state, A, B, playerIdx, 1, cfg.item, cfg.pairing);
    }
    return;
  }
  if (action.type === 'flush') {
    advancePlayer(state, playerIdx, 5);
    state.metrics.flushes++;
    const flushed = [];
    for (let i = 0; i < state.prerivCards.length; i++) {
      if (state.prerivCards[i]) flushed.push(state.prerivCards[i]);
      state.prerivCards[i] = null;
    }
    for (let i = 0; i < state.prerivCards.length; i++) {
      if (state.matDeck.length === 0) break;
      const c = state.matDeck.pop();
      c.slot = 'pre';
      state.prerivCards[i] = c;
      state.metrics.iconsSpawned += c.totalIcons;
    }
    if (FLUSH_RETURNS_TO_DECK && flushed.length > 0) {
      for (const c of flushed) {
        c.slot = null;
        c.workers = {};
        c.blanks = 0;
        state.matDeck.push(c);
      }
      // Reshuffle the whole pile so the returned cards don't sit on top.
      const d = state.matDeck;
      for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
      }
    }
    const targetIdx = aiChooseFlushTarget(state, playerIdx);
    if (targetIdx === -1) return;
    const card = state.prerivCards[targetIdx];
    if (card) runAuction(state, card, playerIdx, 1);
    return;
  }
  if (action.type === 'browse') {
    state.metrics.invents++;
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
function runGame(numPlayers, numMats = ORIG_MATERIALS.length, workersPerPlayer = null) {
  if (workersPerPlayer == null) workersPerPlayer = defaultWorkersPerPlayer(numPlayers);
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
    const wasEndgame = state.endgame;
    executeAction(state, p.idx, action);
    cleanupShoreline(state);

    if (wasEndgame) {
      const m = state.metrics;
      m.endgameTurns++;
      if (action.type === 'browse') {
        m.endgameBrowses++;
        p.browseStreak = (p.browseStreak || 0) + 1;
        if (p.browseStreak > m.maxBrowseStreak) m.maxBrowseStreak = p.browseStreak;
      } else {
        p.browseStreak = 0;
        if (action.type === 'build') m.endgameBuilds++;
        else if (action.type === 'pass') m.endgamePasses++;
        else if (action.type === 'auction' || action.type === 'preriv' || action.type === 'flush') m.endgameAuctions++;
      }
    }

    if (state.endgame && !p.out) {
      const reachedEnd = p.timePos >= ENDGAME_TRACK_END;
      const passed = action.type === 'pass';
      if (reachedEnd || passed) {
        if (PASS0_AT_ENDGAME_END) firePassZeroEffects(state, p.idx, 1);
        p.out = true;
      }
    }
    maybeFireSlipstream(state, p.idx);
    if (state.endgame && state.players.every(pp => pp.out)) break;
    if (checkGameEnd(state)) break;
  }
  // Final per-player VP tally (includes effect bonuses; ablation toggles via STRUCTURE_EFFECT_DISABLED).
  const vpEntries = state.players.map(p => ({
    idx: p.idx,
    vp: totalVP(p, state),
    pairVP: endgamePairVP(state, p.idx),
    leftover: (() => {
      const wbm = playerWorkersByMaterial(state, p.idx);
      let t = 0;
      for (const m of MAT_KEYS) t += wbm[m] || 0;
      for (const pool of (wbm._wildPools || [])) t += pool.count;
      return t;
    })(),
  }));
  vpEntries.sort((a, b) => b.vp - a.vp);
  const vps = vpEntries.map(e => e.vp);
  state.metrics.winnerVP = vps[0];
  state.metrics.runnerUpVP = vps.length > 1 ? vps[1] : 0;
  state.metrics.loserVP = vps[vps.length - 1];
  state.metrics.vpSpread = vps[0] - vps[vps.length - 1];
  state.metrics.winMargin = vps.length > 1 ? vps[0] - vps[1] : vps[0];
  state.metrics.totalVP = vps.reduce((s, x) => s + x, 0);
  state.metrics.avgPairVP = vpEntries.reduce((s, e) => s + e.pairVP, 0) / vpEntries.length;
  state.metrics.winnerPairVP = vpEntries[0].pairVP;
  state.metrics.avgLeftoverPerPlayer = vpEntries.reduce((s, e) => s + e.leftover, 0) / vpEntries.length;
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

  // Ablation runs under the live fish-line endgame (b:fish-line + d:one-build),
  // so fish-costing abilities are valued against the real per-count finish line.
  function runOneGame(state) {
    egPlayOut(state, 'fish', 0, simFishLine(numP), 'd');
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

// Confluence sweep: compare the combined same-symbol auction card across three
// variants — effect OFF (printed VP only), effect ON billing at the cheaper
// card's rate (cost mode 'min'), and effect ON billing at the pricier rate
// (cost mode 'max'). Reports the card's build rate, its average VP for builders
// vs. the effect-off baseline (Δ = effect contribution), and combined-auction
// usage. Use to pick the cost mode and to gauge whether the card lands in the
// ±1 net-VP balance band. Run with `cpulimit -l 50 -f -m --` per the sim rule.
function sweepConfluence(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 4000;
  configureMaterials(6);
  const CARD = 'Confluence';

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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  // variant: { mode: 'off'|'min'|'max' }. Returns aggregate stats.
  function collect(mode) {
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    if (mode === 'off') STRUCTURE_EFFECT_DISABLED[CARD] = true;
    else setCombinedAuctionCostMode(mode);
    let builders = 0, builderVPsum = 0, players = 0;
    let combinedAuctions = 0, totalAuctions = 0, jam = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      combinedAuctions += state.metrics.combinedAuctions;
      totalAuctions += state.metrics.auctions;
      jam += state.metrics.jamAuctions;
      for (const p of state.players) {
        players++;
        if (p.built.some(s => s.name === CARD)) {
          builders++;
          builderVPsum += totalVP(p, state);
        }
      }
    }
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    setCombinedAuctionCostMode('min');
    return {
      mode,
      buildRate: builders / players,
      builderN: builders,
      avgBuilderVP: builders ? builderVPsum / builders : NaN,
      combinedPerGame: combinedAuctions / numGames,
      combinedPctOfAuctions: totalAuctions ? combinedAuctions / totalAuctions : 0,
      jamPct: totalAuctions ? jam / totalAuctions : 0,
    };
  }

  console.log(`\nRiver Bankers — Confluence (combined same-symbol auction) sweep`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.\n`);
  const t0 = Date.now();
  const off = collect('off');
  process.stderr.write('\r  ran off ...   ');
  const min = collect('min');
  process.stderr.write('\r  ran min ...   ');
  const max = collect('max');
  process.stderr.write('\r' + ' '.repeat(30) + '\r');

  console.log(
    pad('Variant', 10) + padL('builds', 9) + padL('buildRate', 11) +
    padL('avgVP', 9) + padL('ΔVP', 8) + padL('cmb/game', 10) + padL('cmb%auc', 9) + padL('jam%', 8)
  );
  console.log('-'.repeat(10 + 9 + 11 + 9 + 8 + 10 + 9 + 8));
  for (const r of [off, min, max]) {
    const dvp = r.mode === 'off' ? NaN : r.avgBuilderVP - off.avgBuilderVP;
    const dvpStr = isNaN(dvp) ? '-' : (dvp >= 0 ? '+' : '') + dvp.toFixed(2);
    console.log(
      pad(r.mode, 10) + padL(r.builderN, 9) + padL((r.buildRate * 100).toFixed(1) + '%', 11) +
      padL(isNaN(r.avgBuilderVP) ? '-' : r.avgBuilderVP.toFixed(2), 9) + padL(dvpStr, 8) +
      padL(r.combinedPerGame.toFixed(2), 10) +
      padL((r.combinedPctOfAuctions * 100).toFixed(1) + '%', 9) +
      padL((r.jamPct * 100).toFixed(1) + '%', 8)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  ΔVP      = builder avgVP for this mode − builder avgVP with the effect off');
  console.log('             (the combined-auction effect\'s average VP contribution).');
  console.log('  cmb/game = average combined (Confluence) auctions triggered per game.');
  console.log('  cmb%auc  = combined auctions as a share of all auctions.');
  console.log('  jam%     = jam share of all auctions (combined + normal) — watch for warping.\n');
}

// Confluence pairing sweep: compare the same-symbol rule ('same') against the
// any-two-cards rule ('any', where winners place each clinched worker on
// whichever of the two cards they need more, in player order). Reports the
// card's build rate, builder ΔVP vs. effect-off, usage, and how often the 'any'
// rule actually pairs two DIFFERENT materials. Cost mode held at 'min'. Run
// with `cpulimit -l 50 -f -m --` per the sim-ablations rule.
function sweepConfluencePairing(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 4000;
  configureMaterials(6);
  const CARD = 'Confluence';

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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  // variant: 'off' | 'same' | 'any'
  function collect(variant) {
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    setCombinedAuctionCostMode('min');
    if (variant === 'off') STRUCTURE_EFFECT_DISABLED[CARD] = true;
    else setCombinedAuctionPairing(variant);
    let builders = 0, builderVPsum = 0, players = 0;
    let combined = 0, crossMat = 0, totalAuctions = 0, jam = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      combined += state.metrics.combinedAuctions;
      crossMat += state.metrics.combinedCrossMat;
      totalAuctions += state.metrics.auctions;
      jam += state.metrics.jamAuctions;
      for (const p of state.players) {
        players++;
        if (p.built.some(s => s.name === CARD)) { builders++; builderVPsum += totalVP(p, state); }
      }
    }
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    setCombinedAuctionPairing('same');
    return {
      variant, builderN: builders,
      buildRate: builders / players,
      avgBuilderVP: builders ? builderVPsum / builders : NaN,
      firesPerBuilder: builders ? combined / builders : NaN,
      combinedPerGame: combined / numGames,
      crossMatPct: combined ? crossMat / combined : 0,
      jamPct: totalAuctions ? jam / totalAuctions : 0,
    };
  }

  console.log(`\nRiver Bankers — Confluence pairing rule sweep (cost mode 'min')`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.\n`);
  const t0 = Date.now();
  const off = collect('off');
  const same = collect('same');
  const any = collect('any');

  console.log(
    pad('Variant', 9) + padL('builds', 8) + padL('buildRate', 11) +
    padL('avgVP', 9) + padL('ΔVP', 8) + padL('fires/bld', 11) +
    padL('cmb/game', 10) + padL('xMat%', 8) + padL('jam%', 8)
  );
  console.log('-'.repeat(9 + 8 + 11 + 9 + 8 + 11 + 10 + 8 + 8));
  for (const r of [off, same, any]) {
    const dvp = r.variant === 'off' ? NaN : r.avgBuilderVP - off.avgBuilderVP;
    const dvpStr = isNaN(dvp) ? '-' : (dvp >= 0 ? '+' : '') + dvp.toFixed(2);
    console.log(
      pad(r.variant, 9) + padL(r.builderN, 8) + padL((r.buildRate * 100).toFixed(1) + '%', 11) +
      padL(isNaN(r.avgBuilderVP) ? '-' : r.avgBuilderVP.toFixed(2), 9) + padL(dvpStr, 8) +
      padL(isNaN(r.firesPerBuilder) ? '-' : r.firesPerBuilder.toFixed(2), 11) +
      padL(r.combinedPerGame.toFixed(2), 10) +
      padL((r.crossMatPct * 100).toFixed(0) + '%', 8) +
      padL((r.jamPct * 100).toFixed(1) + '%', 8)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  ΔVP       = builder avgVP − effect-off builder avgVP (effect contribution).');
  console.log('  fires/bld = combined auctions ÷ builders — avg uses per builder per game.');
  console.log('  cmb/game  = combined auctions per game.');
  console.log('  xMat%     = share of combined auctions pairing two DIFFERENT materials');
  console.log('              (always 0% for \'same\'; the new flexibility for \'any\').');
  console.log('  jam%      = jam share of all auctions — watch for economy warping.\n');
}

// Confluence-as-a-starter sweep: give ONE player (idx 0) a free, pre-built,
// printed-VP-0 Confluence from turn 1 (deck copy excluded so opponents can't
// also get it) and measure that player's win rate vs. the uniform fair share.
// If even at VP 0 the win rate sits well above fair share, the ability is too
// strong to hand out free; at/below fair share it's a safe (if weak) starter.
// Runs a no-bonus control (isolates any turn-order/seat advantage) plus both
// pairing rules. Run with `cpulimit -l 50 -f -m --` per the sim-ablations rule.
function sweepConfluenceStarter(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 5000;
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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  // variant: 'control' (no bonus) | 'same' | 'any'
  function collect(variant) {
    DECK_EXCLUDE = new Set(['Confluence']);
    if (variant === 'control') {
      INJECT_STARTER_NAME = null; INJECT_STARTER_PLAYER = -1;
    } else {
      INJECT_STARTER_NAME = 'Confluence'; INJECT_STARTER_PLAYER = 0;
      setCombinedAuctionPairing(variant);
    }
    let wins = 0, vp0sum = 0, fires = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      fires += state.metrics.combinedAuctions; // only player 0 can trigger these
      const scored = state.players.map(p => ({ idx: p.idx, vp: totalVP(p, state), timePos: p.timePos }));
      scored.sort((a, b) => b.vp - a.vp || a.timePos - b.timePos);
      if (scored[0].idx === 0) wins++;
      vp0sum += scored.find(s => s.idx === 0).vp;
    }
    INJECT_STARTER_NAME = null; INJECT_STARTER_PLAYER = -1;
    DECK_EXCLUDE = null;
    setCombinedAuctionPairing('same');
    return { variant, winPct: 100 * wins / numGames, avgVP0: vp0sum / numGames, firesPerGame: fires / numGames };
  }

  const fair = 100 / numP;
  console.log(`\nRiver Bankers — Confluence as a free turn-1 starter (printed VP 0)`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games. Bonus player = idx 0.`);
  console.log(`Fair share = 1/${numP} = ${fair.toFixed(1)}%.\n`);
  const t0 = Date.now();
  const control = collect('control');
  const same = collect('same');
  const any = collect('any');

  console.log(
    pad('Variant', 10) + padL('P0 win%', 9) + padL('Δ fair', 8) +
    padL('Δ ctrl', 8) + padL('P0 avgVP', 10) + padL('fires/game', 12)
  );
  console.log('-'.repeat(10 + 9 + 8 + 8 + 10 + 12));
  for (const r of [control, same, any]) {
    const dFair = r.winPct - fair;
    const dCtrl = r.winPct - control.winPct;
    console.log(
      pad(r.variant, 10) + padL(r.winPct.toFixed(1) + '%', 9) +
      padL((dFair >= 0 ? '+' : '') + dFair.toFixed(1), 8) +
      padL(r.variant === 'control' ? '-' : (dCtrl >= 0 ? '+' : '') + dCtrl.toFixed(1), 8) +
      padL(r.avgVP0.toFixed(2), 10) + padL(r.firesPerGame.toFixed(2), 12)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  P0 win%   = win rate of the bonus player (idx 0).');
  console.log('  Δ fair    = P0 win% − uniform fair share (any seat advantage shows in control).');
  console.log('  Δ ctrl    = P0 win% − the no-bonus control win% (isolates the ability).');
  console.log('  A free starter is "too strong" if Δ ctrl is large and positive.\n');
}

// Confluence trigger-cost sweep: for a fixed pairing rule (default 'any'),
// compare the three trigger-cost rules — 'sum' (both cards' triggers), 'min'
// (cheaper), 'max' (pricier) — against an effect-off baseline. Shows how the
// initiation cost trades off usage vs. the card's VP contribution. Cost mode
// (per-item billing) held at 'min'. Run with `cpulimit -l 50 -f -m --`.
function sweepConfluenceTrigger(numGamesArg, numPArg, workersArg, pairingArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 4000;
  const pairing = (pairingArg === 'same') ? 'same' : 'any';
  configureMaterials(6);
  const CARD = 'Confluence';

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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  // variant: 'off' | 'sum' | 'min' | 'max'
  function collect(variant) {
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    setCombinedAuctionCostMode('min');
    setCombinedAuctionPairing(pairing);
    if (variant === 'off') STRUCTURE_EFFECT_DISABLED[CARD] = true;
    else setCombinedAuctionTriggerMode(variant);
    let builders = 0, builderVPsum = 0, players = 0;
    let combined = 0, trigFish = 0, totalAuctions = 0, jam = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      combined += state.metrics.combinedAuctions;
      trigFish += state.metrics.combinedTriggerFish;
      totalAuctions += state.metrics.auctions;
      jam += state.metrics.jamAuctions;
      for (const p of state.players) {
        players++;
        if (p.built.some(s => s.name === CARD)) { builders++; builderVPsum += totalVP(p, state); }
      }
    }
    delete STRUCTURE_EFFECT_DISABLED[CARD];
    setCombinedAuctionTriggerMode('sum');
    setCombinedAuctionPairing('same');
    return {
      variant, builderN: builders,
      avgBuilderVP: builders ? builderVPsum / builders : NaN,
      firesPerBuilder: builders ? combined / builders : NaN,
      avgTrig: combined ? trigFish / combined : NaN,
      jamPct: totalAuctions ? jam / totalAuctions : 0,
    };
  }

  console.log(`\nRiver Bankers — Confluence trigger-cost sweep (pairing='${pairing}', cost mode 'min')`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.\n`);
  const t0 = Date.now();
  const off = collect('off');
  const variants = [off, collect('sum'), collect('min'), collect('max')];

  console.log(
    pad('Trigger', 9) + padL('builds', 8) + padL('avgVP', 9) + padL('ΔVP', 8) +
    padL('fires/bld', 11) + padL('avgTrig🐟', 11) + padL('jam%', 8)
  );
  console.log('-'.repeat(9 + 8 + 9 + 8 + 11 + 11 + 8));
  for (const r of variants) {
    const dvp = r.variant === 'off' ? NaN : r.avgBuilderVP - off.avgBuilderVP;
    const dvpStr = isNaN(dvp) ? '-' : (dvp >= 0 ? '+' : '') + dvp.toFixed(2);
    console.log(
      pad(r.variant, 9) + padL(r.builderN, 8) +
      padL(isNaN(r.avgBuilderVP) ? '-' : r.avgBuilderVP.toFixed(2), 9) + padL(dvpStr, 8) +
      padL(isNaN(r.firesPerBuilder) ? '-' : r.firesPerBuilder.toFixed(2), 11) +
      padL(isNaN(r.avgTrig) ? '-' : r.avgTrig.toFixed(2), 11) +
      padL((r.jamPct * 100).toFixed(1) + '%', 8)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  ΔVP       = builder avgVP − effect-off builder avgVP (effect contribution).');
  console.log('  fires/bld = combined auctions ÷ builders — avg uses per builder per game.');
  console.log('  avgTrig🐟 = average 🐟 actually paid to initiate a combined auction.');
  console.log('  jam%      = jam share of all auctions.\n');
}

// Game-length sweep: how the combined-auction ability changes game length.
// Each combined auction floats BOTH its cards downriver (vs. one for a normal
// auction), churning the river faster. Variants: baseline (Confluence effect
// off, no ability in play), Confluence live in the deck, and the Double Vision
// card (combined auction granted to ALL players). Reports avg player-turns and
// board-churn proxies. Run with `cpulimit -l 50 -f -m --`.
function sweepGameLength(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 5000;
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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  // variant: 'baseline' | 'confluence' | 'double-vision'
  function collect(variant) {
    clearCombinedAuctionConfig();
    Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);
    setDoubleVisionActive(false);
    if (variant === 'baseline') {
      STRUCTURE_EFFECT_DISABLED['Confluence'] = true;
    } else if (variant === 'double-vision') {
      STRUCTURE_EFFECT_DISABLED['Confluence'] = true; // isolate the card
      setDoubleVisionActive(true);
    }
    let turns = 0, combined = 0, auctions = 0, shore = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      turns += state.metrics.turns;
      combined += state.metrics.combinedAuctions;
      auctions += state.metrics.auctions;
      shore += state.metrics.riverExitSlots.length + state.metrics.preToShoreCards;
    }
    Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);
    setDoubleVisionActive(false);
    return {
      variant, turns: turns / numGames, combined: combined / numGames,
      auctions: auctions / numGames, shore: shore / numGames,
    };
  }

  console.log(`\nRiver Bankers — game-length impact  (${numP}P × ${workers} workers × ${numGames} games)`);
  const t0 = Date.now();
  const base = collect('baseline');
  const rows = [base, collect('confluence'), collect('double-vision')];

  console.log(
    pad('Variant', 16) + padL('avgTurns', 10) + padL('Δturns', 9) + padL('Δ%', 8) +
    padL('cmb/game', 10) + padL('auc/game', 10) + padL('shore/game', 12)
  );
  console.log('-'.repeat(16 + 10 + 9 + 8 + 10 + 10 + 12));
  for (const r of rows) {
    const dt = r.turns - base.turns;
    const dp = base.turns ? 100 * dt / base.turns : 0;
    console.log(
      pad(r.variant, 16) + padL(r.turns.toFixed(1), 10) +
      padL(r.variant === 'baseline' ? '-' : (dt >= 0 ? '+' : '') + dt.toFixed(1), 9) +
      padL(r.variant === 'baseline' ? '-' : (dp >= 0 ? '+' : '') + dp.toFixed(1) + '%', 8) +
      padL(r.combined.toFixed(2), 10) + padL(r.auctions.toFixed(2), 10) + padL(r.shore.toFixed(2), 12)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  avgTurns   = average total player-turns per game (the game-length proxy).');
  console.log('  Δturns/Δ%  = change vs. the no-ability baseline.');
  console.log('  cmb/game   = combined auctions per game; auc/game = all auctions; shore/game = cards retired to shoreline.\n');
}

// Balance sweep: places Confluence in the full structure-card net-VP
// distribution, and ranks the 12 species starters by effect VP, using the LIVE
// config (no override). Heuristic per the rebalance task: 1 material = 1.0 VP,
// 1 time(🐟) = 0.3 VP; net = printed + effectΔVP − costEquiv. Starters are
// compared by injecting each as a free printed-VP-0 ability for player 0
// (isolating the effect) and measuring win% / avgVP vs a no-bonus control.
// Run with `cpulimit -l 50 -f -m --`.
function sweepBalance(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 3000;
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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }
  function costEquivVP(tmpl) {
    let mats = 0;
    for (const m in tmpl.cost) mats += tmpl.cost[m];
    return mats * 1.0 + (tmpl.time || 0) * 0.3;
  }

  // ===== PART A: structure cards (net VP) =====
  // baseline (all effects on): per-player VP, plus per-card builder counts and
  // effect-use tallies for fires/builder.
  function collectStruct(disabledName) {
    clearCombinedAuctionConfig();
    DECK_EXCLUDE = null; INJECT_STARTER_NAME = null; INJECT_STARTER_PLAYER = -1;
    Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);
    if (disabledName) STRUCTURE_EFFECT_DISABLED[disabledName] = true;
    const results = [];
    const uses = {};
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      for (const k in state.metrics.effectUses) uses[k] = (uses[k] || 0) + state.metrics.effectUses[k];
      for (const p of state.players) results.push({ names: new Set(p.built.map(s => s.name)), vp: totalVP(p, state) });
    }
    return { results, uses };
  }

  const templates = STRUCTURE_TEMPLATES.filter(s => s.effect && !s.species && !s.testStarter);
  const byName = {};
  for (const s of BASE_STRUCTURE_TEMPLATES) byName[s.name] = s;
  const t0 = Date.now();
  process.stderr.write('\rbalance: structure baseline ...');
  const base = collectStruct(null);
  const structRows = [];
  const names = Array.from(new Set(templates.map(s => s.name)));
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    process.stderr.write(`\rbalance: structure [${i + 1}/${names.length}] ${name.padEnd(20)}`);
    const abl = collectStruct(name);
    const bB = base.results.filter(r => r.names.has(name));
    const aB = abl.results.filter(r => r.names.has(name));
    if (bB.length === 0) continue;
    const avgB = bB.reduce((s, r) => s + r.vp, 0) / bB.length;
    const avgA = aB.length ? aB.reduce((s, r) => s + r.vp, 0) / aB.length : avgB;
    const effect = avgB - avgA;
    const tmpl = byName[name];
    const costEq = costEquivVP(tmpl);
    const net = tmpl.vp + effect - costEq;
    const fires = base.uses[name] !== undefined ? base.uses[name] / bB.length : null;
    structRows.push({ name, printed: tmpl.vp, effect, costEq, net, builds: bB.length, fires });
  }
  Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);

  // ===== PART B: starters (effect VP via free printed-VP-0 injection) =====
  const STARTERS = ['Lodge Foundation', 'Tail Slap', 'Beaver Cache', 'Kelp Bed',
    'Rolling Float', 'Stone Tool', 'Mud Burrow', 'Channel Clearer', 'Marsh Lookout',
    'Clay Den', 'Quick Strike', 'Snare Set'];
  function collectStarter(name) {
    clearCombinedAuctionConfig();
    Object.keys(STRUCTURE_EFFECT_DISABLED).forEach(k => delete STRUCTURE_EFFECT_DISABLED[k]);
    DECK_EXCLUDE = null;
    INJECT_STARTER_NAME = name; INJECT_STARTER_PLAYER = name ? 0 : -1;
    if (!name) INJECT_STARTER_PLAYER = -1;
    let wins = 0, vp0 = 0, fires = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      fires += state.metrics.combinedAuctions;
      const scored = state.players.map(p => ({ idx: p.idx, vp: totalVP(p, state), timePos: p.timePos }));
      scored.sort((a, b) => b.vp - a.vp || a.timePos - b.timePos);
      if (scored[0].idx === 0) wins++;
      vp0 += scored.find(s => s.idx === 0).vp;
    }
    INJECT_STARTER_NAME = null; INJECT_STARTER_PLAYER = -1; DECK_EXCLUDE = null;
    return { winPct: 100 * wins / numGames, avgVP0: vp0 / numGames, fires: fires / numGames };
  }
  process.stderr.write('\rbalance: starter control ...      ');
  const sctrl = collectStarter(null);
  const starterRows = [];
  for (let i = 0; i < STARTERS.length; i++) {
    process.stderr.write(`\rbalance: starter [${i + 1}/${STARTERS.length}] ${STARTERS[i].padEnd(18)}`);
    const r = collectStarter(STARTERS[i]);
    starterRows.push({ name: STARTERS[i], printed: byName[STARTERS[i]] ? byName[STARTERS[i]].vp : 0,
      effect: r.avgVP0 - sctrl.avgVP0, dwin: r.winPct - sctrl.winPct, fires: r.fires });
  }
  process.stderr.write('\r' + ' '.repeat(60) + '\r');
  clearCombinedAuctionConfig();

  // ---- print structure table ----
  console.log(`\nRiver Bankers — balance stats  (${numP}P × ${workers} workers × ${numGames} games, live per-card config)`);
  console.log(`Heuristic: 1 material = 1.0 VP, 1 time(🐟) = 0.3 VP.  net = printed + effectΔVP − costEquiv.\n`);
  console.log(`== Confluence vs. structure cards — sorted by net VP ==`);
  console.log(pad('Card', 20) + padL('printed', 9) + padL('effect', 9) + padL('costEq', 9) + padL('net', 8) + padL('builds', 8) + padL('fires/bld', 11));
  console.log('-'.repeat(20 + 9 + 9 + 9 + 8 + 8 + 11));
  structRows.sort((a, b) => b.net - a.net);
  for (const r of structRows) {
    const mark = r.name === 'Confluence' ? '▶ ' : '  ';
    console.log(mark + pad(r.name, 18) + padL(r.printed.toFixed(0), 9) +
      padL((r.effect >= 0 ? '+' : '') + r.effect.toFixed(2), 9) + padL(r.costEq.toFixed(1), 9) +
      padL((r.net >= 0 ? '+' : '') + r.net.toFixed(2), 8) + padL(r.builds, 8) +
      padL(r.fires === null ? '-' : r.fires.toFixed(2), 11));
  }
  const inBand = structRows.filter(r => Math.abs(r.net) <= 1).length;
  console.log(`\n${inBand}/${structRows.length} cards within the ±1 net-VP band.`);

  // ---- print starter table ----
  const fair = 100 / numP;
  console.log(`\n== Starter cards — effect isolated (each injected free at printed VP 0) ==`);
  console.log(`Control: P0 win% ${sctrl.winPct.toFixed(1)}% (fair ${fair.toFixed(1)}%), P0 avgVP ${sctrl.avgVP0.toFixed(2)}.\n`);
  console.log(pad('Starter', 20) + padL('printed', 9) + padL('effectVP', 10) + padL('Δwin%', 9) + padL('fires/game', 12));
  console.log('-'.repeat(20 + 9 + 10 + 9 + 12));
  starterRows.sort((a, b) => b.effect - a.effect);
  for (const r of starterRows) {
    const mark = '  ';
    console.log(mark + pad(r.name, 18) + padL(r.printed.toFixed(0), 9) +
      padL((r.effect >= 0 ? '+' : '') + r.effect.toFixed(2), 10) +
      padL((r.dwin >= 0 ? '+' : '') + r.dwin.toFixed(1), 9) +
      padL(r.fires.toFixed(2), 12));
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  effect/effectVP = effect\'s avgVP contribution (builder ΔVP / injected-starter ΔavgVP vs control).');
  console.log('  costEq = VP-equivalent of build cost (materials + time). net = printed + effect − costEq.');
  console.log('  printed VP shown for reference; starters are injected at VP 0 so effectVP is the ability alone.');
  console.log('  fires = combined auctions per builder (structure) / per game (starter); "-" = not instrumented.\n');
}

// Combined-auction matrix sweep: tests the ability as a built STRUCTURE card
// (Confluence) and as the Double Vision card (combined auction for all players)
// across the full 8-config matrix — pairing {same, any} × trigger-cost {min,
// max} × per-item cost {min, max}. Structure measured by builder ΔVP vs.
// effect-off baseline; Double Vision — symmetric across players, so win% is
// meaningless — measured by avg game length (turns) vs. a no-ability baseline.
// (Double Vision's live config is fixed at any/max/max; the matrix sweeps all 8
// to show how the knobs would behave.) Run with `cpulimit -l 50 -f -m --`.
function sweepConfluenceMatrix(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 3000;
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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  function resetGlobals() {
    delete STRUCTURE_EFFECT_DISABLED['Confluence'];
    DECK_EXCLUDE = null; INJECT_STARTER_NAME = null; INJECT_STARTER_PLAYER = -1;
    setDoubleVisionActive(false);
    clearCombinedAuctionConfig();
  }
  function setCfg(cfg) {
    setCombinedAuctionPairing(cfg.pairing);
    setCombinedAuctionTriggerMode(cfg.trig);
    setCombinedAuctionCostMode(cfg.item);
  }

  // STRUCTURE: Confluence in the deck, effect on. Builder avgVP + fires/builder.
  function structRun(cfg) {
    resetGlobals(); setCfg(cfg);
    let builders = 0, vpSum = 0, combined = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      combined += state.metrics.combinedAuctions;
      for (const p of state.players) {
        if (p.built.some(s => s.name === 'Confluence')) { builders++; vpSum += totalVP(p, state); }
      }
    }
    return { builders, avgVP: builders ? vpSum / builders : NaN, fires: builders ? combined / builders : NaN };
  }
  function structBaseline() {
    resetGlobals();
    STRUCTURE_EFFECT_DISABLED['Confluence'] = true;
    let builders = 0, vpSum = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      for (const p of state.players) {
        if (p.built.some(s => s.name === 'Confluence')) { builders++; vpSum += totalVP(p, state); }
      }
    }
    resetGlobals();
    return { builders, avgVP: builders ? vpSum / builders : NaN };
  }

  // DOUBLE VISION: combined auction granted to ALL players (Confluence disabled
  // to isolate the card). Symmetric across players, so game length (avg turns)
  // is the meaningful metric, not win%.
  function doubleVisionRun(cfg, on) {
    resetGlobals();
    STRUCTURE_EFFECT_DISABLED['Confluence'] = true;
    if (on) { setDoubleVisionActive(true); setCfg(cfg); }
    let turns = 0, combined = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      turns += state.metrics.turns;
      combined += state.metrics.combinedAuctions;
    }
    resetGlobals();
    return { turns: turns / numGames, fires: combined / numGames };
  }

  const CONFIGS = [];
  for (const pairing of ['same', 'any'])
    for (const trig of ['min', 'max'])
      for (const item of ['min', 'max'])
        CONFIGS.push({ pairing, trig, item });

  console.log(`\nRiver Bankers — Confluence (structure) + Double Vision (Optional Rules) config matrix`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per cell.`);
  const t0 = Date.now();

  // ---- Structure table ----
  const base = structBaseline();
  const structRows = CONFIGS.map((cfg, i) => {
    process.stderr.write(`\rstructure [${i + 1}/${CONFIGS.length}] `);
    const r = structRun(cfg);
    return { cfg, ...r, dvp: r.avgVP - base.avgVP };
  });
  // ---- Double Vision table ----
  const orBase = doubleVisionRun({ pairing: 'same', trig: 'min', item: 'min' }, false);
  const orRows = CONFIGS.map((cfg, i) => {
    process.stderr.write(`\rdouble-vision [${i + 1}/${CONFIGS.length}] `);
    const r = doubleVisionRun(cfg, true);
    return { cfg, ...r, dturns: r.turns - orBase.turns };
  });
  process.stderr.write('\r' + ' '.repeat(40) + '\r');

  const cfgLabel = c => `${c.pairing.padEnd(4)} ${c.trig.padEnd(3)} ${c.item.padEnd(3)}`;
  console.log(`\n== Confluence as a STRUCTURE card (builder ΔVP) ==`);
  console.log(`Effect-off baseline: ${base.avgVP.toFixed(2)} avgVP over ${base.builders} builders.\n`);
  console.log(pad('pair trig item', 16) + padL('builds', 8) + padL('avgVP', 9) + padL('ΔVP', 8) + padL('fires/bld', 11));
  console.log('-'.repeat(16 + 8 + 9 + 8 + 11));
  for (const r of structRows) {
    console.log(pad(cfgLabel(r.cfg), 16) + padL(r.builders, 8) +
      padL(r.avgVP.toFixed(2), 9) + padL((r.dvp >= 0 ? '+' : '') + r.dvp.toFixed(2), 8) +
      padL(r.fires.toFixed(2), 11));
  }

  console.log(`\n== Double Vision (Optional Rules) — combined auction for ALL players (game length) ==`);
  console.log(`No-ability baseline: ${orBase.turns.toFixed(1)} avg turns.\n`);
  console.log(pad('pair trig item', 16) + padL('avgTurns', 10) + padL('Δturns', 9) + padL('Δ%', 8) + padL('cmb/game', 11));
  console.log('-'.repeat(16 + 10 + 9 + 8 + 11));
  for (const r of orRows) {
    const dp = orBase.turns ? 100 * r.dturns / orBase.turns : 0;
    console.log(pad(cfgLabel(r.cfg), 16) + padL(r.turns.toFixed(1), 10) +
      padL((r.dturns >= 0 ? '+' : '') + r.dturns.toFixed(1), 9) +
      padL((dp >= 0 ? '+' : '') + dp.toFixed(1) + '%', 8) + padL(r.fires.toFixed(2), 11));
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  pair/trig/item = pairing rule / trigger-cost rule / per-item-cost rule.');
  console.log('  ΔVP     = builder avgVP − effect-off baseline (structure effect contribution).');
  console.log('  Δturns/Δ% = avg game-turns change vs. the no-ability baseline (Double Vision is all-players).');
  console.log('  cmb/game = combined auctions per game under Double Vision.\n');
}

// Effect-usage sweep: for every card with an active/triggered ability, measure
// how often it actually FIRES per player who built it (not just whether it was
// built). Puts Confluence's trigger rate in context against the rest of the
// "as an action" / "at 0 🐟" / starter-active cohort. All effects on, live
// defaults. Run with `cpulimit -l 50 -f -m --` per the sim-ablations rule.
function sweepEffectUse(numGamesArg, numPArg, workersArg, pairingArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || (numP >= 4 ? 7 : 8);
  const numGames = parseInt(numGamesArg) || 4000;
  // Optional 4th arg sets Confluence's pairing rule for this run ('same'|'any'),
  // so its usage can be read against the rest of the cohort under either rule.
  const pairing = (pairingArg === 'any') ? 'any' : 'same';
  setCombinedAuctionPairing(pairing);
  configureMaterials(6);
  // Cards with an instrumented active ability, grouped for the printout.
  const COHORT = {
    'as-an-action': ['Confluence', 'Heron Roost', 'Driftwood Snag', 'Portage',
                     'Trading Post', 'Tow Line', 'Salmon Run'],
    'at-0-fish':    ['Wood Pile', 'Hollowed-out Log', 'Pack Rat Burrow'],
    'starter':      ['Tail Slap', 'Channel Clearer'],
  };
  const ALL = [].concat(...Object.values(COHORT));

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
        if (p.timePos >= ENDGAME_TRACK_END || action.type === 'pass') p.out = true;
      }
      maybeFireSlipstream(state, p.idx);
      if (state.endgame && state.players.every(pp => pp.out)) break;
      if (checkGameEnd(state)) break;
    }
  }

  const uses = {}, builders = {};
  for (const n of ALL) { uses[n] = 0; builders[n] = 0; }
  const t0 = Date.now();
  for (let g = 0; g < numGames; g++) {
    const state = newGame(numP, workers);
    runOneGame(state);
    for (const n of ALL) uses[n] += (state.metrics.effectUses[n] || 0);
    for (const p of state.players) {
      const names = new Set(p.built.map(s => s.name));
      for (const n of ALL) if (names.has(n)) builders[n]++;
    }
  }

  setCombinedAuctionPairing('same'); // restore live default
  console.log(`\nRiver Bankers — active-effect usage rates`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games. All effects on. Confluence pairing='${pairing}'.\n`);
  console.log(
    pad('Card', 20) + pad('cohort', 14) + padL('builders', 10) +
    padL('fires', 9) + padL('fires/bld', 11) + padL('fires/game', 12)
  );
  console.log('-'.repeat(20 + 14 + 10 + 9 + 11 + 12));
  const rows = [];
  for (const [cohort, names] of Object.entries(COHORT)) {
    for (const n of names) {
      rows.push({ n, cohort, builders: builders[n], fires: uses[n],
        perBld: builders[n] ? uses[n] / builders[n] : NaN,
        perGame: uses[n] / numGames });
    }
  }
  rows.sort((a, b) => (b.perBld || 0) - (a.perBld || 0));
  for (const r of rows) {
    console.log(
      pad(r.n, 20) + pad(r.cohort, 14) + padL(r.builders, 10) +
      padL(r.fires, 9) + padL(isNaN(r.perBld) ? '-' : r.perBld.toFixed(2), 11) +
      padL(r.perGame.toFixed(3), 12)
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  builders   = total builder-instances across all games (a starter');
  console.log('               counts whenever its species drafted it).');
  console.log('  fires      = total successful activations across all games.');
  console.log('  fires/bld  = fires ÷ builders — avg times a builder uses it per game.');
  console.log('  fires/game = fires ÷ games — raw board frequency.\n');
}

// Compare 4-river-slot baseline vs 3-river-slot variant. Cards graduating off
// the deepest river slot still go to the shoreline as usual; the only change
// is that the deepest slot is now River 3 (4🐟/item) instead of River 4 (5🐟/item).
// Win-rate ablation across species. Each game shuffles species assignments,
// runs to completion, then attributes the win to the species the winning
// player drafted. Reports games-played and wins per species, plus the gap
// from a uniform 1/numP baseline (target: ±5%).
function sweepSpeciesWinRate(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || 8;
  const numGames = parseInt(numGamesArg) || 5000;
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

  const tally = {};
  for (const sp of SPECIES_KEYS) tally[sp] = { games: 0, wins: 0, totalVP: 0, starterCounts: {} };

  console.log(`\nRiver Bankers per-species win rate`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games.`);
  console.log(`Baseline: 1/${numP} = ${(100 / numP).toFixed(1)}% per species; target ±5%.\n`);

  const t0 = Date.now();
  for (let g = 0; g < numGames; g++) {
    if ((g + 1) % 250 === 0) process.stderr.write(`\rGames ${g + 1}/${numGames}`);
    const state = newGame(numP, workers);
    runOneGame(state);
    // Find winner: highest totalVP; tie → lowest timePos (cheaper).
    const scored = state.players.map(p => ({
      idx: p.idx,
      species: p.species,
      vp: totalVP(p, state),
      timePos: p.timePos,
      starter: p.built.find(b => b.species) ? p.built.find(b => b.species).name : '(none)',
    }));
    scored.sort((a, b) => b.vp - a.vp || a.timePos - b.timePos);
    const winner = scored[0];
    // Tally every species that played this game; flag the winner.
    for (const s of scored) {
      tally[s.species].games += 1;
      tally[s.species].totalVP += s.vp;
      tally[s.species].starterCounts[s.starter] = (tally[s.species].starterCounts[s.starter] || 0) + 1;
    }
    tally[winner.species].wins += 1;
  }
  process.stderr.write('\r' + ' '.repeat(60) + '\r');

  const baseline = 100 / numP;
  console.log(
    pad('Species', 10) + padL('games', 8) + padL('wins', 8) +
    padL('win%', 8) + padL('Δ base', 9) + padL('avgVP', 8) + '  starter mix (top 2)'
  );
  console.log('-'.repeat(75));
  for (const sp of SPECIES_KEYS) {
    const t = tally[sp];
    const winPct = t.games > 0 ? (100 * t.wins / t.games) : 0;
    const delta = winPct - baseline;
    const avgVP = t.games > 0 ? (t.totalVP / t.games) : 0;
    const starterMix = Object.entries(t.starterCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([n, c]) => `${n} (${(100 * c / t.games).toFixed(0)}%)`)
      .join(', ');
    console.log(
      pad(sp, 10) + padL(t.games, 8) + padL(t.wins, 8) +
      padL(winPct.toFixed(1) + '%', 8) +
      padL((delta >= 0 ? '+' : '') + delta.toFixed(1), 9) +
      padL(avgVP.toFixed(1), 8) + '  ' + starterMix
    );
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);
  console.log('Legend:');
  console.log('  win%   = wins / games-played for that species');
  console.log('  Δ base = win% minus uniform baseline (100/numP). Aim for |Δ| ≤ 5.');
  console.log('  starter mix = top-2 starter cards drafted by AI for that species + %\n');
}

// totalVP_ alias (the local `totalVP` accumulator inside the next function
// shadows the global totalVP function, so we grab a fresh reference here).
const totalVP_ = totalVP;

// Per-starter forced-pick measurement. For each of the 12 species starters,
// force any player of that species to draft that card (other species still
// weight-pick), run N games, and report win rate + avg VP for the species
// holding the forced card. Lets us see how the 6 currently-unpicked starters
// (Tail Slap, Rolling Float, Stone Tool, Channel Clearer, Marsh Lookout,
// Snare Set) actually perform when given the slot.
function sweepSpeciesStarters(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || 8;
  const numGames = parseInt(numGamesArg) || 2000;
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

  const starters = STRUCTURE_TEMPLATES.filter(s => s.species);
  const baseline = 100 / numP;

  console.log(`\nRiver Bankers per-starter forced-pick measurement`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per starter (${starters.length} starters).`);
  console.log(`Baseline: 1/${numP} = ${baseline.toFixed(1)}% per species; target ±5%.\n`);

  const results = [];
  const t0 = Date.now();
  for (let i = 0; i < starters.length; i++) {
    const card = starters[i];
    process.stderr.write(`\rCard [${i + 1}/${starters.length}] ${card.name.padEnd(22)} `);
    setForcedSpeciesStarter({ [card.species]: card.name });
    let games = 0, wins = 0, totalVP = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      const player = state.players.find(p => p.species === card.species);
      if (!player) continue; // 3P skips one species; force only takes effect when that species plays
      runOneGame(state);
      const scored = state.players.map(p => ({
        idx: p.idx,
        vp: totalVP_(p, state),
        timePos: p.timePos,
      }));
      scored.sort((a, b) => b.vp - a.vp || a.timePos - b.timePos);
      games += 1;
      totalVP += scored.find(s => s.idx === player.idx).vp;
      if (scored[0].idx === player.idx) wins += 1;
    }
    results.push({
      species: card.species,
      name: card.name,
      games,
      wins,
      winPct: 100 * wins / games,
      avgVP: totalVP / games,
    });
  }
  setForcedSpeciesStarter(null);
  process.stderr.write('\r' + ' '.repeat(60) + '\r');

  // Group by species, ordered to match draft pools.
  const speciesOrder = SPECIES_KEYS;
  const emoji = { beaver: '🦫', otter: '🦦', muskrat: '🐭', mink: '🦡' };
  console.log(
    pad('Starter', 22) + padL('games', 7) + padL('wins', 7) +
    padL('win%', 8) + padL('Δ base', 9) + padL('avgVP', 8)
  );
  console.log('-'.repeat(22 + 7 + 7 + 8 + 9 + 8));
  for (const sp of speciesOrder) {
    const rows = results.filter(r => r.species === sp);
    if (rows.length === 0) continue;
    rows.sort((a, b) => b.winPct - a.winPct);
    console.log(`${emoji[sp] || ''} ${sp}`);
    for (const r of rows) {
      const delta = r.winPct - baseline;
      console.log(
        pad('  ' + r.name, 22) + padL(r.games, 7) + padL(r.wins, 7) +
        padL(r.winPct.toFixed(1) + '%', 8) +
        padL((delta >= 0 ? '+' : '') + delta.toFixed(1), 9) +
        padL(r.avgVP.toFixed(1), 8)
      );
    }
  }
  console.log(`\nElapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);
  console.log('Legend:');
  console.log('  Each starter is force-picked for its species; other species use weighted draft.');
  console.log('  win% = wins for the species when this card is its starter / games it played.');
  console.log('  Δ base = win% minus uniform baseline (100/numP). |Δ| ≤ 5 = healthy.\n');
}

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

function sweepFlushDeck(numGamesArg) {
  // Compare current rule (Flush removes 3 Headwaters cards out of game) vs.
  // proposed rule (Flush returns them to the matDeck and reshuffles).
  const numMats = 6;
  const N = parseInt(numGamesArg) || 1000;

  console.log(`\nFlush rule comparison (${N} games per config, 8 workers)`);
  console.log(`Baseline: Flush removes 3 Headwaters cards out of game.`);
  console.log(`Proposed: Flush returns the 3 Headwaters cards to matDeck and reshuffles.\n`);

  console.log(
    pad('numP', 5) + pad('rule', 9) +
    padL('turns', 7) + padL('t/p', 6) +
    padL('aucs', 6) + padL('flush', 7) + padL('flush%', 8) +
    padL('built/p', 8) + padL('endg%', 7) +
    padL('winVP', 7) + padL('lastVP', 8) + padL('spread', 8)
  );
  console.log('-'.repeat(5+9+7+6+6+7+8+8+7+7+8+8));

  for (const numP of [2, 3, 4]) {
    const ruleTurns = {};
    for (const ruleOn of [false, true]) {
      setFlushReturnsToDeck(ruleOn);
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, 8));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const flushes = avg(trials.map(m => m.flushes));
      const flushPct = avg(trials.map(m => pct(m.flushes, m.auctions)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const endg = avg(trials.map(m => m.endgameTriggered ? 100 : 0));
      const winVP = avg(trials.map(m => m.winnerVP));
      const lastVP = avg(trials.map(m => m.loserVP));
      const spread = avg(trials.map(m => m.vpSpread));
      ruleTurns[ruleOn ? 'on' : 'off'] = turns;
      console.log(
        pad(numP, 5) + pad(ruleOn ? 'shuffle' : 'baseline', 9) +
        padL(turns.toFixed(0), 7) + padL((turns / numP).toFixed(1), 6) +
        padL(auctions.toFixed(1), 6) +
        padL(flushes.toFixed(2), 7) + padL(flushPct.toFixed(1) + '%', 8) +
        padL((built / numP).toFixed(1), 8) +
        padL(endg.toFixed(0) + '%', 7) +
        padL(winVP.toFixed(1), 7) +
        padL(lastVP.toFixed(1), 8) +
        padL(spread.toFixed(1), 8)
      );
    }
    setFlushReturnsToDeck(false);
    const delta = ruleTurns.on - ruleTurns.off;
    const deltaPct = ruleTurns.off > 0 ? (delta / ruleTurns.off * 100) : 0;
    console.log(
      pad(numP, 5) + pad('Δ', 9) +
      padL((delta >= 0 ? '+' : '') + delta.toFixed(0), 7) +
      padL((deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1) + '%', 8)
    );
    console.log();
  }
  console.log('Legend:');
  console.log('  flush   = avg Flush actions per game');
  console.log('  flush%  = Flush actions as % of total auctions');
  console.log('  Δ       = (shuffle − baseline) in turns and % of baseline turns\n');
}

function sweepPairVP(numGamesArg) {
  // Compare end-of-game scoring with vs. without FINAL_PAIR_VP. Same AI on
  // both sides — this measures the scoring rule in isolation, not any
  // behavior change (the AI doesn't consult totalVP mid-game). Behavior
  // shifts ("retire earlier") would need AI work; this sweep tells us
  // whether the rule even pushes winner totals into the target band first.
  const numMats = 6;
  const N = parseInt(numGamesArg) || 1000;

  console.log(`\nFinal pair-VP rule comparison (${N} games per config, 8 workers)`);
  console.log(`Baseline: only printed VP + structure effects.`);
  console.log(`Proposed: + floor(workers_in_material / 2) summed across materials at endgame.\n`);

  console.log(
    pad('numP', 5) + pad('rule', 9) +
    padL('turns', 7) +
    padL('winVP', 7) + padL('lastVP', 8) +
    padL('egTurn', 7) + padL('egBuild', 8) + padL('egInv', 7) + padL('egAuc', 7) + padL('inv/eg', 8) +
    padL('maxRun', 7) + padL('avgPair', 9) + padL('winPair', 9)
  );
  console.log('-'.repeat(5+9+7+7+8+7+8+7+7+8+7+9+9));

  for (const numP of [2, 3, 4]) {
    for (const ruleOn of [false, true]) {
      setFinalPairVP(ruleOn);
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, numMats, 8));
      const turns = avg(trials.map(m => m.turns));
      const winVP = avg(trials.map(m => m.winnerVP));
      const lastVP = avg(trials.map(m => m.loserVP));
      const egTurns = avg(trials.map(m => m.endgameTurns));
      const egBuilds = avg(trials.map(m => m.endgameBuilds));
      const egBrowses = avg(trials.map(m => m.endgameBrowses));
      const egAucs = avg(trials.map(m => m.endgameAuctions));
      const invPct = egTurns > 0 ? (egBrowses / egTurns * 100) : 0;
      const maxRun = avg(trials.map(m => m.maxBrowseStreak));
      const avgPair = avg(trials.map(m => m.avgPairVP || 0));
      const winPair = avg(trials.map(m => m.winnerPairVP || 0));
      console.log(
        pad(numP, 5) + pad(ruleOn ? 'pair-vp' : 'baseline', 9) +
        padL(turns.toFixed(0), 7) +
        padL(winVP.toFixed(1), 7) +
        padL(lastVP.toFixed(1), 8) +
        padL(egTurns.toFixed(1), 7) +
        padL(egBuilds.toFixed(2), 8) +
        padL(egBrowses.toFixed(2), 7) +
        padL(egAucs.toFixed(2), 7) +
        padL(invPct.toFixed(0) + '%', 8) +
        padL(maxRun.toFixed(2), 7) +
        padL(avgPair.toFixed(2), 9) +
        padL(winPair.toFixed(2), 9)
      );
    }
    setFinalPairVP(false);
    console.log();
  }
  console.log('Legend:');
  console.log('  egTurn  = avg # of player-turns in endgame phase (after deck empties)');
  console.log('  egBuild = avg builds during endgame');
  console.log('  egInv   = avg Invent (browse) actions during endgame');
  console.log('  egAuc   = avg auctions (river/preriv/flush) during endgame');
  console.log('  inv/eg  = Invents as % of endgame turns');
  console.log('  maxRun  = avg longest consecutive-Invent streak by a single player in endgame');
  console.log('  avgPair = avg pair-VP per player at endgame (always computed; 0 score impact under baseline)');
  console.log('  winPair = avg pair-VP earned by the winner\n');
}

// =============================================================================
// VP REWORK SWEEP
// =============================================================================
// For the 6 "fixed-base + end-game-bonus" structure cards (Vine Ladder,
// Vine Trellis, Stone Causeway, Reed Walkway, Clay Vault, Burrow Network),
// test variants that drop the printed base VP to 0 and bump the per-matching-
// structure multiplier / cap. Goal: find a shape that keeps the card's
// average builder VP (and AI build-rate) in line with the current version
// while letting the printed face show a clean "?★" instead of "N+?★".
function sweepVpRework(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || 8;
  const numGames = parseInt(numGamesArg) || 5000;
  configureMaterials(6);

  const CARDS = [
    { name: 'Vine Ladder',    mat: 'vines',  baseVp: 2, baseMult: 3, baseCap: Infinity },
    { name: 'Vine Trellis',   mat: 'vines',  baseVp: 2, baseMult: 1, baseCap: 6 },
    { name: 'Stone Causeway', mat: 'stones', baseVp: 3, baseMult: 1, baseCap: 6 },
    { name: 'Reed Walkway',   mat: 'reeds',  baseVp: 3, baseMult: 1, baseCap: 6 },
    { name: 'Clay Vault',     mat: 'clay',   baseVp: 4, baseMult: 1, baseCap: 6 },
    { name: 'Burrow Network', mat: 'mud',    baseVp: 4, baseMult: 1, baseCap: 6 },
  ];

  function variantsFor(card) {
    return [
      { label: `BASE vp=${card.baseVp} ×${card.baseMult}${isFinite(card.baseCap) ? ` cap${card.baseCap}` : ' nocap'}`,
        vp: card.baseVp, mult: card.baseMult, cap: card.baseCap },
      { label: `vp=0 ×${card.baseMult}${isFinite(card.baseCap) ? ` cap${card.baseCap}` : ' nocap'}`,
        vp: 0,           mult: card.baseMult, cap: card.baseCap },
      { label: 'vp=0 ×2 nocap',  vp: 0, mult: 2, cap: Infinity },
      { label: 'vp=0 ×2 cap8',   vp: 0, mult: 2, cap: 8 },
      { label: 'vp=0 ×3 cap9',   vp: 0, mult: 3, cap: 9 },
      { label: 'vp=0 ×3 cap12',  vp: 0, mult: 3, cap: 12 },
    ];
  }

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

  function runVariant(card, variant) {
    const tpl = BASE_STRUCTURE_TEMPLATES.find(s => s.name === card.name);
    const origVp = tpl.vp;
    tpl.vp = variant.vp;
    configureMaterials(6);
    VP_OVERRIDES[card.name] = { mult: variant.mult, cap: variant.cap };

    let builders = 0, builderVPsum = 0, builderWinsAcc = 0;
    let avgFieldVPsum = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      const finalVPs = state.players.map(p => totalVP(p, state));
      const maxVp = Math.max(...finalVPs);
      avgFieldVPsum += finalVPs.reduce((s, v) => s + v, 0) / finalVPs.length;
      for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.built.some(b => b.name === card.name)) {
          builders++;
          builderVPsum += finalVPs[i];
          if (finalVPs[i] === maxVp) builderWinsAcc++;
        }
      }
    }

    tpl.vp = origVp;
    delete VP_OVERRIDES[card.name];
    configureMaterials(6);

    return {
      builds: builders,
      buildRate: builders / (numGames * numP),
      avgVP: builders ? builderVPsum / builders : NaN,
      winRate: builders ? builderWinsAcc / builders : NaN,
      avgFieldVP: avgFieldVPsum / numGames,
    };
  }

  console.log(`\nRiver Bankers — fixed-base + end-game-bonus rework sweep`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.`);
  console.log(`Looking for variants where vp=0 keeps avgVP & buildRate close to BASELINE.\n`);

  const tStart = Date.now();
  for (let ci = 0; ci < CARDS.length; ci++) {
    const card = CARDS[ci];
    console.log(`\n=== ${card.name} (matches ${card.mat}) ===`);
    console.log(
      pad('Variant', 28) + padL('builds', 9) + padL('build%', 9) +
      padL('avgVP', 9) + padL('vsField', 10) + padL('winRate', 10)
    );
    console.log('-'.repeat(28 + 9 + 9 + 9 + 10 + 10));
    const variants = variantsFor(card);
    for (let vi = 0; vi < variants.length; vi++) {
      const v = variants[vi];
      process.stderr.write(`\r[${ci + 1}/${CARDS.length}] ${card.name.padEnd(18)} ${v.label.padEnd(22)}`);
      const r = runVariant(card, v);
      const vsField = isNaN(r.avgVP) ? '-' : (r.avgVP - r.avgFieldVP >= 0 ? '+' : '') + (r.avgVP - r.avgFieldVP).toFixed(2);
      const avgVP   = isNaN(r.avgVP)   ? '-' : r.avgVP.toFixed(2);
      const winRate = isNaN(r.winRate) ? '-' : (r.winRate * 100).toFixed(1) + '%';
      const buildPct = (r.buildRate * 100).toFixed(1) + '%';
      console.log(
        pad(v.label, 28) + padL(r.builds, 9) + padL(buildPct, 9) +
        padL(avgVP, 9) + padL(vsField, 10) + padL(winRate, 10)
      );
    }
  }
  process.stderr.write('\r' + ' '.repeat(70) + '\r');
  console.log(`\nElapsed: ${((Date.now() - tStart) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  builds      = total player-instances that built this card across all games');
  console.log('  build%      = of all player-slots, the share that built this card');
  console.log('  avgVP       = average final totalVP for those builders');
  console.log('  vsField     = avgVP minus the average totalVP across all players (baseline = winnable lift)');
  console.log('  winRate     = share of builders who tied/won the game (4P baseline ≈ 25%)');
  console.log('  BASELINE row is the current configuration; subsequent rows test vp=0 alternatives.');
}

// Vine Ladder follow-up: zoom in on the one card whose baseline (vp=2 +
// 3/vines uncapped, vsField +7.20) the original vp-rework sweep couldn't
// match. Tests bigger multipliers and several caps to find a vp=0
// equivalent.
function sweepVineLadder(numGamesArg, numPArg, workersArg) {
  const numP = parseInt(numPArg) || 4;
  const workers = parseInt(workersArg) || 8;
  const numGames = parseInt(numGamesArg) || 5000;
  configureMaterials(6);

  const VARIANTS = [
    { label: 'BASE vp=2 ×3 nocap', vp: 2, mult: 3, cap: Infinity },
    { label: 'vp=0 ×3 nocap',      vp: 0, mult: 3, cap: Infinity },
    { label: 'vp=0 ×4 nocap',      vp: 0, mult: 4, cap: Infinity },
    { label: 'vp=0 ×4 cap12',      vp: 0, mult: 4, cap: 12 },
    { label: 'vp=0 ×4 cap16',      vp: 0, mult: 4, cap: 16 },
    { label: 'vp=0 ×5 nocap',      vp: 0, mult: 5, cap: Infinity },
    { label: 'vp=0 ×5 cap15',      vp: 0, mult: 5, cap: 15 },
    { label: 'vp=0 ×5 cap20',      vp: 0, mult: 5, cap: 20 },
  ];

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

  function runVariant(v) {
    const tpl = BASE_STRUCTURE_TEMPLATES.find(s => s.name === 'Vine Ladder');
    const origVp = tpl.vp;
    tpl.vp = v.vp;
    configureMaterials(6);
    VP_OVERRIDES['Vine Ladder'] = { mult: v.mult, cap: v.cap };

    let builders = 0, builderVPsum = 0, builderWinsAcc = 0, avgFieldVPsum = 0;
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      runOneGame(state);
      const finalVPs = state.players.map(p => totalVP(p, state));
      const maxVp = Math.max(...finalVPs);
      avgFieldVPsum += finalVPs.reduce((s, v) => s + v, 0) / finalVPs.length;
      for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.built.some(b => b.name === 'Vine Ladder')) {
          builders++;
          builderVPsum += finalVPs[i];
          if (finalVPs[i] === maxVp) builderWinsAcc++;
        }
      }
    }

    tpl.vp = origVp;
    delete VP_OVERRIDES['Vine Ladder'];
    configureMaterials(6);

    return {
      builds: builders,
      buildRate: builders / (numGames * numP),
      avgVP: builders ? builderVPsum / builders : NaN,
      winRate: builders ? builderWinsAcc / builders : NaN,
      avgFieldVP: avgFieldVPsum / numGames,
    };
  }

  console.log(`\nVine Ladder rework — zoom-in sweep`);
  console.log(`Setting: ${numP}P × ${workers} workers × ${numGames} games per variant.\n`);
  console.log(
    pad('Variant', 22) + padL('builds', 9) + padL('build%', 9) +
    padL('avgVP', 9) + padL('vsField', 10) + padL('winRate', 10)
  );
  console.log('-'.repeat(22 + 9 + 9 + 9 + 10 + 10));
  const tStart = Date.now();
  for (let i = 0; i < VARIANTS.length; i++) {
    const v = VARIANTS[i];
    process.stderr.write(`\r[${i + 1}/${VARIANTS.length}] ${v.label.padEnd(22)}`);
    const r = runVariant(v);
    const vsField = isNaN(r.avgVP) ? '-' : (r.avgVP - r.avgFieldVP >= 0 ? '+' : '') + (r.avgVP - r.avgFieldVP).toFixed(2);
    console.log(
      pad(v.label, 22) + padL(r.builds, 9) +
      padL((r.buildRate * 100).toFixed(1) + '%', 9) +
      padL(r.avgVP.toFixed(2), 9) + padL(vsField, 10) +
      padL((r.winRate * 100).toFixed(1) + '%', 10)
    );
  }
  process.stderr.write('\r' + ' '.repeat(60) + '\r');
  console.log(`\nElapsed: ${((Date.now() - tStart) / 1000).toFixed(1)}s.`);
}

// =============================================================================
// ENDGAME PASS-0 ABLATION
// =============================================================================
// Compares 4 ways to handle the "At 0 on 🐟 track" effects in endgame:
//   neither — no synthetic endgame pass-0 trigger. advancePlayer's natural
//             lap-boundary check still fires if a pawn overshoots 60.
//   start   — fire pass-0 once for each non-out player when the endgame begins
//             (deck-empty pawn compression counts as a final pass-0 event).
//   end     — fire pass-0 once for each player at the moment they retire
//             from endgame (whether by reaching 59 or by passing).
//   both    — start + end.
//
// Affected cards: Wood Pile (claim 1 Log icon for 1🐟), Hollowed-out Log
// (recall 1 worker, no blank), Pack Rat Burrow (swap hand↔discard).
// Pack Rat Burrow's swap is moot at retire (hand cards don't score); Wood
// Pile is mildly positive (new worker → potential pair-VP); Hollowed-out Log
// is mildly negative for the retiring player (recalls a worker off the board
// → loses pair-VP material).
function sweepEndgamePass0(numGamesArg, numPArg, workersArg) {
  const numGames = parseInt(numGamesArg) || 1000;
  const numPArgInt = parseInt(numPArg);
  const playerCounts = numPArgInt ? [numPArgInt] : [2, 3, 4];
  const workers = parseInt(workersArg) || 8;
  const numMats = 6;
  configureMaterials(numMats);

  console.log(`\nEndgame pass-0 ablation (${numGames} games per config, ${workers} workers)`);
  console.log(`Cards: Wood Pile, Hollowed-out Log, Pack Rat Burrow.\n`);

  const variants = [
    { label: 'neither', start: false, end: false },
    { label: 'start',   start: true,  end: false },
    { label: 'end',     start: false, end: true  },
    { label: 'both',    start: true,  end: true  },
  ];

  for (const numP of playerCounts) {
    console.log(`=== ${numP}P ===`);
    console.log(
      pad('config', 9) +
      padL('turns', 7) +
      padL('winVP', 7) + padL('lastVP', 8) + padL('spread', 8) +
      padL('egTurn', 7) + padL('egBuild', 8) + padL('egInv', 7) + padL('egAuc', 7) +
      padL('avgPair', 9) + padL('winPair', 9)
    );
    console.log('-'.repeat(9 + 7 + 7 + 8 + 8 + 7 + 8 + 7 + 7 + 9 + 9));

    for (const v of variants) {
      setPass0AtEndgameStart(v.start);
      setPass0AtEndgameEnd(v.end);
      const trials = [];
      for (let t = 0; t < numGames; t++) trials.push(runGame(numP, numMats, workers));
      const turns = avg(trials.map(m => m.turns));
      const winVP = avg(trials.map(m => m.winnerVP));
      const lastVP = avg(trials.map(m => m.loserVP));
      const spread = avg(trials.map(m => m.vpSpread));
      const egTurns = avg(trials.map(m => m.endgameTurns));
      const egBuilds = avg(trials.map(m => m.endgameBuilds));
      const egBrowses = avg(trials.map(m => m.endgameBrowses));
      const egAucs = avg(trials.map(m => m.endgameAuctions));
      const avgPair = avg(trials.map(m => m.avgPairVP || 0));
      const winPair = avg(trials.map(m => m.winnerPairVP || 0));
      console.log(
        pad(v.label, 9) +
        padL(turns.toFixed(0), 7) +
        padL(winVP.toFixed(1), 7) +
        padL(lastVP.toFixed(1), 8) +
        padL(spread.toFixed(1), 8) +
        padL(egTurns.toFixed(1), 7) +
        padL(egBuilds.toFixed(2), 8) +
        padL(egBrowses.toFixed(2), 7) +
        padL(egAucs.toFixed(2), 7) +
        padL(avgPair.toFixed(2), 9) +
        padL(winPair.toFixed(2), 9)
      );
    }
    console.log();
  }
  // Restore live defaults (both off).
  setPass0AtEndgameStart(false);
  setPass0AtEndgameEnd(false);

  console.log('\nLegend:');
  console.log('  spread  = winnerVP − loserVP (mean across games)');
  console.log('  egTurn  = avg # of player-turns in endgame phase');
  console.log('  egBuild = avg builds during endgame');
  console.log('  egInv   = avg Invent (browse) actions during endgame');
  console.log('  egAuc   = avg auctions (river/preriv/flush) during endgame');
  console.log('  avgPair = avg pair-VP per player at endgame');
  console.log('  winPair = avg pair-VP earned by the winner\n');
}

// =============================================================================
// ENDGAME REWORK SWEEP
// =============================================================================
// Explores replacement endgames for the abrupt deck-empty/snap-retire ending
// flagged in the 2026-06-16 4P playtest. Crosses 3 TRIGGERS × 4 CODAS at
// 2P/3P/4P and reports final VP, VP spread, cards built, auctions, and game
// length (turns).
//
// Triggers (when the main phase ends):
//   a / 'vp'   — the instant any player's score crosses a VP limit.
//   b / 'fish' — each player retires (no more turns) the moment their pawn
//                passes a cumulative-fish line; main phase ends once all have
//                passed. (Faithful to "each player is out as they pass it".)
//   c / 'deck' — the material deck empties (the current live trigger).
//   For a/b, deck-empty is a backstop trigger so degenerate games still end.
//
// Codas (the final phase, run once the trigger fires; all players un-retired
// so everyone participates):
//   d — every player gets ONE build using resources (workers) they already hold.
//   e — every player initiates ONE auction, then every player gets ONE build.
//   f — each Headwaters card is auctioned, then every player builds any number.
//   g — game ends immediately (no coda).
//
// Thresholds for a/b are auto-calibrated per player count: a short baseline
// pass measures the leader's VP and the leader's cumulative fish at the moment
// the deck empties, so triggers a/b fire at roughly the same game-time as c.
// Scoring keeps the live ruleset (incl. end-of-game bonus + pair VP); the
// "drop hidden-VP cards for a first-to-N race" idea from the TODO is a
// separate downstream decision and is NOT applied here.

// Highest-VP structure the player can build right now with workers on hand.
function egBestBuild(state, idx) {
  const p = state.players[idx];
  const wbm = playerWorkersByMaterial(state, idx);
  const buildables = p.hand
    .map((s, i) => ({ s, i, vp: s.vp + aiEffectValue(s, p, state) }))
    .filter(o => canBuild(o.s, wbm, p))
    .sort((a, b) => b.vp - a.vp);
  return buildables.length ? { type: 'build', handIdx: buildables[0].i } : null;
}

// Best single auction (river or Headwaters) for the player's material needs,
// mirroring aiChooseAction's auction-target scoring. Returns null if no useful
// auction (no needs, no trigger workers, or nothing scores positive).
function egBestAuction(state, idx) {
  const p = state.players[idx];
  const wbm = playerWorkersByMaterial(state, idx);
  const needs = {};
  for (const m of MAT_KEYS) needs[m] = 0;
  for (const s of p.hand) {
    for (const m in s.cost) needs[m] = Math.max(needs[m], Math.max(0, s.cost[m] - (wbm[m] || 0)));
  }
  const triggerPool = aiTriggerPool(state, idx);
  if (triggerPool <= 0) return null;
  let best = null, bestScore = 0;
  for (const c of state.riverCards) {
    if (uncoveredIcons(c) === 0) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), triggerPool, need);
    const score = need * got - playerCardCost(state, c, idx) * got * 0.4;
    if (score > bestScore) { bestScore = score; best = { type: 'auction', cardId: c.id }; }
  }
  for (let i = 0; i < state.prerivCards.length; i++) {
    const c = state.prerivCards[i];
    if (!c) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), triggerPool, need);
    if (got === 0) continue;
    const score = need * got - 1 * got * 0.4 - prerivTriggerCost(i) * 0.6;
    if (score > bestScore) { bestScore = score; best = { type: 'preriv', slotIdx: i }; }
  }
  return best;
}

// Run the chosen coda. Counts each coda action as a turn (so game-length
// reflects how much the coda adds). All players un-retired first.
function egRunCoda(state, proc) {
  if (proc === 'g') return;
  for (const p of state.players) { p.out = false; p.exhausted = false; }
  const order = state.players.slice()
    .sort((a, b) => a.timePos - b.timePos ||
      state.stackOrder.indexOf(a.idx) - state.stackOrder.indexOf(b.idx))
    .map(p => p.idx);
  const doBuild = (idx) => {
    const a = egBestBuild(state, idx);
    if (!a) return false;
    state.metrics.turns++;
    executeAction(state, idx, a);
    cleanupShoreline(state);
    return true;
  };
  if (proc === 'd') {
    for (const idx of order) doBuild(idx);
  } else if (proc === 'e') {
    for (const idx of order) {
      const a = egBestAuction(state, idx);
      if (a) { state.metrics.turns++; executeAction(state, idx, a); cleanupShoreline(state); }
    }
    for (const idx of order) doBuild(idx);
  } else if (proc === 'f') {
    let k = 0;
    for (let slot = 0; slot < state.prerivCards.length; slot++) {
      const card = state.prerivCards[slot];
      if (!card) continue;
      const trig = order[k % order.length];
      k++;
      state.metrics.turns++;
      runAuction(state, card, trig, 0); // open auction, no forced trigger bid
      cleanupShoreline(state);
    }
    let progress = true, guard = 0;
    while (progress && guard < order.length * 20) {
      progress = false;
      for (const idx of order) if (doBuild(idx)) progress = true;
      guard++;
    }
  }
}

// Play an existing `state` to the chosen trigger, then run the coda — mutating
// state in place (used by egRunGame, the fishline sweep, and the ablation). For
// the fish-line endgame it raises SIM_FINISH_LINE so the AI's ability gates
// track the real finish line, restoring it afterward.
function egPlayOut(state, trigger, vpLimit, fishLimit, proc) {
  const prevFinish = SIM_FINISH_LINE;
  if (trigger === 'fish') SIM_FINISH_LINE = fishLimit;
  try {
    for (const c of state.prerivCards) if (c) state.metrics.iconsSpawned += c.totalIcons;
    while (!state.gameOver && state.metrics.turns < MAX_TURNS) {
      const deckEmpty = state.matDeck.length === 0;
      let triggered = false;
      if (trigger === 'deck') {
        triggered = deckEmpty;
      } else if (trigger === 'vp') {
        triggered = deckEmpty || state.players.some(p => !p.out && totalVP(p, state) >= vpLimit);
      } else if (trigger === 'fish') {
        // Deck-empty is NOT an end condition here: with the material deck dry,
        // players keep auctioning the river/Headwaters cards already on the board
        // until their pawns pass the line. checkGameEnd (below) still ends the
        // game once the board is genuinely exhausted (nothing to auction/build).
        for (const p of state.players) if (!p.out && p.timePos >= fishLimit) p.out = true;
        triggered = state.players.every(p => p.out);
      }
      if (triggered) break;
      const cur = pickNextPlayer(state);
      if (cur === -1) break;
      state.currentPlayer = cur;
      state.metrics.turns++;
      if (state._engage) state._engage.ownTurns[cur].push(state.metrics.turns);
      const p = state.players[cur];
      aiStartOfTurnAbilities(state, p.idx);
      const action = aiChooseAction(state, p.idx);
      executeAction(state, p.idx, action);
      cleanupShoreline(state);
      maybeFireSlipstream(state, p.idx);
      if (checkGameEnd(state)) break;
    }
    // Freeze engagement tracking before the coda: the coda is a structured
    // one-build-each finale, not the boring trailing grind we're measuring, so
    // a coda build must not reset a player's main-loop last-engagement turn.
    if (state._engage) state._engage.frozen = true;
    egRunCoda(state, proc);
  } finally {
    SIM_FINISH_LINE = prevFinish;
  }
}

// Play one game to the chosen trigger, run the coda, return summary metrics.
function egRunGame(numP, numMats, workers, trigger, vpLimit, fishLimit, proc) {
  configureMaterials(numMats);
  const state = newGame(numP, workers);
  egPlayOut(state, trigger, vpLimit, fishLimit, proc);
  const vps = state.players.map(p => totalVP(p, state)).sort((a, b) => b - a);
  let openRiver = 0;
  for (const c of state.riverCards) openRiver += uncoveredIcons(c);
  return {
    winVP: vps[0],
    loserVP: vps[vps.length - 1],
    avgVP: vps.reduce((s, v) => s + v, 0) / vps.length,
    spread: vps[0] - vps[vps.length - 1],
    built: state.metrics.cardsBuilt,
    invents: state.metrics.invents,
    auc: state.metrics.auctions,
    turns: state.metrics.turns,
    // End-of-game board state.
    matDeck: state.matDeck.length,
    headwaters: state.prerivCards.filter(c => c !== null).length,
    river: state.riverCards.length,
    openRiver,
  };
}

// Baseline pass: play normally until the deck empties, capture the leader's VP
// and the leader's cumulative fish at that instant. Anchors triggers a/b.
function egCalibrate(numP, numMats, workers, numGames) {
  configureMaterials(numMats);
  let sumVP = 0, sumFish = 0;
  for (let g = 0; g < numGames; g++) {
    const state = newGame(numP, workers);
    for (const c of state.prerivCards) if (c) state.metrics.iconsSpawned += c.totalIcons;
    while (!state.gameOver && state.metrics.turns < MAX_TURNS) {
      if (state.matDeck.length === 0) break;
      state.metrics.turns++;
      const cur = pickNextPlayer(state);
      if (cur === -1) break;
      const p = state.players[cur];
      aiStartOfTurnAbilities(state, p.idx);
      executeAction(state, p.idx, aiChooseAction(state, p.idx));
      cleanupShoreline(state);
      maybeFireSlipstream(state, p.idx);
    }
    sumVP += Math.max(...state.players.map(p => totalVP(p, state)));
    sumFish += Math.max(...state.players.map(p => p.timePos));
  }
  return { vpLimit: Math.round(sumVP / numGames), fishLimit: Math.round(sumFish / numGames) };
}

function sweepEndgameRework(numGamesArg, numPArg) {
  const numGames = parseInt(numGamesArg) || 2000;
  const numPArgInt = parseInt(numPArg);
  const playerCounts = numPArgInt ? [numPArgInt] : [2, 3, 4];
  const numMats = 6;

  const triggers = [
    { code: 'a', key: 'vp',   label: 'a:VP-limit' },
    { code: 'b', key: 'fish', label: 'b:fish-line' },
    { code: 'c', key: 'deck', label: 'c:deck-out' },
  ];
  const procs = [
    { code: 'd', label: 'd:1-build' },
    { code: 'e', label: 'e:auc+build' },
    { code: 'f', label: 'f:HW-auc+blds' },
    { code: 'g', label: 'g:instant' },
  ];

  console.log(`\nRiver Bankers — endgame rework sweep  (${numGames} games/config, 6 materials)`);
  console.log('3 triggers (a:VP-limit / b:fish-line / c:deck-out) × 4 codas');
  console.log('(d:one build / e:one auction+one build / f:Headwaters auctions+free builds / g:instant)\n');

  const tStart = Date.now();
  for (const numP of playerCounts) {
    const workers = defaultWorkersPerPlayer(numP);
    const { vpLimit, fishLimit } = egCalibrate(numP, numMats, workers, Math.max(500, Math.floor(numGames / 4)));
    console.log(`=== ${numP}P (${workers} workers) — calibrated VP limit ${vpLimit}, fish line ${fishLimit} ===`);
    console.log(
      pad('combo', 14) +
      padL('winVP', 8) + padL('lastVP', 8) + padL('spread', 8) +
      padL('built', 8) + padL('auc', 8) + padL('turns', 8)
    );
    console.log('-'.repeat(14 + 8 * 6));
    for (const tr of triggers) {
      for (const pr of procs) {
        const rows = [];
        for (let g = 0; g < numGames; g++) {
          rows.push(egRunGame(numP, numMats, workers, tr.key, vpLimit, fishLimit, pr.code));
        }
        const combo = `${tr.code}+${pr.code}`;
        console.log(
          pad(combo, 14) +
          padL(avg(rows.map(r => r.winVP)).toFixed(1), 8) +
          padL(avg(rows.map(r => r.loserVP)).toFixed(1), 8) +
          padL(avg(rows.map(r => r.spread)).toFixed(1), 8) +
          padL(avg(rows.map(r => r.built)).toFixed(2), 8) +
          padL(avg(rows.map(r => r.auc)).toFixed(2), 8) +
          padL(avg(rows.map(r => r.turns)).toFixed(1), 8)
        );
      }
      console.log();
    }
  }
  console.log(`Elapsed: ${((Date.now() - tStart) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log('  combo   = trigger(a/b/c) + coda(d/e/f/g)');
  console.log('  winVP   = mean winner final VP; lastVP = mean last-place final VP');
  console.log('  spread  = mean (winnerVP − loserVP)');
  console.log('  built   = mean structures built per game (all players)');
  console.log('  auc     = mean auctions per game (all players)');
  console.log('  turns   = mean total player-turns per game (game-length proxy, incl. coda)\n');
}

// =============================================================================
// FISH-LINE SWEEP (b+d only)
// =============================================================================
// Fixes the endgame to b:fish-line trigger + d:one-build coda and sweeps the
// fish-line value across 2P/3P/4P. For each line reports simulated wall-clock
// (45s per auction), builds, avg + spread VP, and end-of-game board state
// (structure deck remaining, Headwaters cards, river cards, open river icons).
// deck-out remains a backstop, so very high lines converge to deck-out+d.
function fmtTime(seconds) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// =============================================================================
// TUNE SWEEP — fish-line + material-card player-limit calibration
// =============================================================================
// Calibrates the game to the 30–60 minute target across 2P/3P/4P, with and
// without asymmetric (species-starter) play. The simulation produces a TURN
// count per game; wall-clock minutes are turns × secPerTurn / 60. The web
// prototype's AI_TURN_FAKE_MS = 30s is a self-described placeholder pending
// real human timing, and it disagrees ~2.3× with the auction-based heuristic,
// so this sweep evaluates a plausible human range — TUNE_SPTS = [45, 60] s/turn
// — from the SAME runs (the turn distribution is heuristic-independent; only
// the minute axis rescales). Best lines are chosen for robustness across the
// whole range (maximize the worst-case in-band % over both endpoints).
//
// Two design levers are swept:
//   1. fish line — FISH_LINE_BY_COUNT[numP]; the pawn-track space a player must
//      pass to retire. The primary length knob. Candidates are restricted to
//      "+60-chit-friendly" spaces (≡29 or ≡59 mod 60) so the printed finish
//      marker always lands within a single chit flip, per the existing rule.
//   2. material-card player limits — which icon-count cards enter the deck at
//      which player count (the "2P/3P/4P" badge on each material card). Encoded
//      by setDeckTuning({always, tier3, tier4}); the deck-config pass holds the
//      recommended fish line and compares tier variants for length + variance.
const TUNE_SPTS = [45, 60];           // seconds-per-turn endpoints to bracket
const TUNE_SPT_PRIMARY = 60;          // histograms + median display use this end
function pctl(sorted, q) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// Run N fish-line-endgame games at one (numP, fishLine, asym, deckTuning) and
// return the per-game TURN counts (sorted ascending). Minutes are derived later
// per seconds-per-turn so one run serves every timing heuristic.
function tuneRun(numP, fishLine, asym, numGames, deckTuning) {
  const workers = defaultWorkersPerPlayer(numP);
  setUseSpeciesStarters(asym);
  if (deckTuning) setDeckTuning(deckTuning);
  const turns = [];
  for (let g = 0; g < numGames; g++) {
    const r = egRunGame(numP, 6, workers, 'fish', 0, fishLine, 'd');
    turns.push(r.turns);
  }
  turns.sort((a, b) => a - b);
  return turns;
}

// Minute-domain stats for a sorted turns array at a given seconds-per-turn.
function tuneStats(turnsSorted, spt) {
  const mins = turnsSorted.map(t => t * spt / 60);
  const inBand = mins.filter(m => m >= 30 && m <= 60).length;
  return {
    mean: avg(mins), median: pctl(mins, 0.5),
    p10: pctl(mins, 0.10), p90: pctl(mins, 0.90),
    iqr: pctl(mins, 0.75) - pctl(mins, 0.25),
    inBandPct: 100 * inBand / mins.length,
    tailPct: 100 * mins.filter(m => m > 60).length / mins.length,
  };
}
// Robustness score for line selection: worst-case in-band % across the SPT
// range, lightly tie-broken toward a 45-min center at the primary heuristic.
function tuneScore(turnsSorted) {
  const inBands = TUNE_SPTS.map(spt => tuneStats(turnsSorted, spt).inBandPct);
  const worst = Math.min(...inBands);
  const med = pctl(turnsSorted, 0.5) * TUNE_SPT_PRIMARY / 60;
  return worst - Math.abs(med - 45) * 0.3;
}

// ASCII histogram of minutes (at TUNE_SPT_PRIMARY) in 10-min bins, target
// band bracketed.
const TUNE_BINS = [
  { lo: 0,   hi: 20,  label: '<20' },
  { lo: 20,  hi: 30,  label: '20-30' },
  { lo: 30,  hi: 40,  label: '30-40' },
  { lo: 40,  hi: 50,  label: '40-50' },
  { lo: 50,  hi: 60,  label: '50-60' },
  { lo: 60,  hi: 75,  label: '60-75' },
  { lo: 75,  hi: 1e9, label: '75+' },
];
function tuneHistogram(turnsSorted, spt) {
  const mins = turnsSorted.map(t => t * spt / 60);
  const counts = TUNE_BINS.map(b => mins.filter(m => m >= b.lo && m < b.hi).length);
  const max = Math.max(1, ...counts);
  const lines = [];
  for (let i = 0; i < TUNE_BINS.length; i++) {
    const b = TUNE_BINS[i];
    const n = counts[i];
    const bar = '█'.repeat(Math.round((n / max) * 40));
    const inBand = b.lo >= 30 && b.hi <= 60;
    lines.push('  ' + padL(b.label, 6) + ' ' + padL((100 * n / mins.length).toFixed(1) + '%', 7) + ' ' + bar + (inBand ? ' ◀band' : ''));
  }
  return lines.join('\n');
}

// Chit-friendly fish lines: spaces ≡29 or ≡59 mod 60 (finish marker lands
// within a single +60 chit flip). Spans ~30min (line 59) to long games.
const TUNE_FISH_LINES = [59, 89, 119, 149, 179, 209, 239];

function sweepTune(numGamesArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const playerCounts = [2, 3, 4];
  const tStart = Date.now();
  configureMaterials(6);

  console.log(`\nRiver Bankers — TUNE sweep  (${numGames} games/config, 6 materials)`);
  console.log(`Endgame: b:fish-line trigger + d:one-build coda (the live web model).`);
  console.log(`Timing heuristic range: ${TUNE_SPTS.join('–')} s/turn  ⇒  minutes = turns × s/turn / 60.`);
  console.log(`Tables show minutes at BOTH endpoints; best line = best worst-case in-band fit.`);
  console.log(`Target window: 30–60 minutes at every player count.\n`);

  // ---- PASS 1: fish-line sweep, asym ON and OFF, current deck tiers ----
  const recommend = {}; // recommend[asymKey][numP] = best fish line
  for (const asym of [true, false]) {
    const asymKey = asym ? 'on' : 'off';
    console.log('='.repeat(78));
    console.log(`PASS 1 — fish-line sweep, asymmetric play ${asym ? 'ON ' : 'OFF'} (species starters ${asymKey})`);
    console.log('='.repeat(78));
    recommend[asymKey] = {};
    for (const numP of playerCounts) {
      console.log(`\n--- ${numP}P (${defaultWorkersPerPlayer(numP)} workers) ---  (med/in-band at 45s | 60s per turn)`);
      console.log(
        pad('fishLine', 9) + padL('med45', 7) + padL('in45', 7) +
        padL('med60', 7) + padL('in60', 7) + padL('IQR60', 7) + '   verdict'
      );
      console.log('-'.repeat(9 + 7 * 5 + 11));
      let best = null;
      const rows = [];
      for (const line of TUNE_FISH_LINES) {
        const turns = tuneRun(numP, line, asym, numGames, null);
        const s45 = tuneStats(turns, 45), s60 = tuneStats(turns, 60);
        const score = tuneScore(turns);
        rows.push({ line, s45, s60 });
        if (!best || score > best.score) best = { line, turns, score, s45, s60 };
      }
      for (const r of rows) {
        console.log(
          pad(String(r.line), 9) +
          padL(r.s45.median.toFixed(1), 7) + padL(r.s45.inBandPct.toFixed(0) + '%', 7) +
          padL(r.s60.median.toFixed(1), 7) + padL(r.s60.inBandPct.toFixed(0) + '%', 7) +
          padL(r.s60.iqr.toFixed(1), 7) +
          (r.line === best.line ? '   ◀ best fit' : '')
        );
      }
      recommend[asymKey][numP] = best.line;
      console.log(`\n  Histogram @ fishLine ${best.line} (best fit, asym ${asymKey}, ${numP}P, @${TUNE_SPT_PRIMARY}s/turn):`);
      console.log(tuneHistogram(best.turns, TUNE_SPT_PRIMARY));
    }
    console.log();
  }

  // ---- Recommendation summary ----
  console.log('='.repeat(78));
  console.log('RECOMMENDED fish lines (best worst-case 30-60min fit over 45–60 s/turn):');
  console.log('='.repeat(78));
  console.log(pad('', 14) + padL('2P', 8) + padL('3P', 8) + padL('4P', 8));
  console.log(pad('asym ON', 14) + padL(recommend.on[2], 8) + padL(recommend.on[3], 8) + padL(recommend.on[4], 8));
  console.log(pad('asym OFF', 14) + padL(recommend.off[2], 8) + padL(recommend.off[3], 8) + padL(recommend.off[4], 8));
  console.log(`  (current live FISH_LINE_BY_COUNT = { 2:59, 3:89, 4:119 })`);

  // ---- PASS 2: JOINT (fish-line × material-card player-limit) optimum ----
  // The two levers interact: a fish line set so high that the material deck
  // empties long before pawns retire produces a dragging "dry-river churn" tail
  // (the 75+ histogram bin). Adding material cards (richer player limits) lets a
  // LOWER fish line fill the same minutes with real auctioning instead of churn.
  // So we don't hold the line fixed — for each deck variant we re-find the best
  // fish line, then recommend the (variant, line) pair that best centers 30-60.
  // Variant naming: which icon-counts sit in always(2P+)/tier3(3P+)/tier4(4P+).
  const deckVariants = [
    { name: 'baseline',  t: { always: [5, 7], tier3: [4], tier4: [8] } },
    { name: '2P-rich',   t: { always: [5, 7, 4], tier3: [8], tier4: [] } },   // 2P+ gets a 3rd card/mat; 8s drop to 3P+
    { name: '4P-lean',   t: { always: [5, 7], tier3: [4, 8], tier4: [] } },   // collapse 4P-only premium into 3P+ tier
    { name: 'flat',      t: { always: [4, 5, 7], tier3: [], tier4: [8] } },   // 3 cards/mat at every count
  ];
  console.log('\n' + '='.repeat(78));
  console.log('PASS 2 — JOINT fish-line × material-card player-limit optimum, asym ON');
  console.log('='.repeat(78));
  console.log('Deck tiers: always=2P+, tier3=3P+, tier4=4P+. For each deck variant the best');
  console.log('fish line is re-found. in-band/IQR/tail shown at the 60 s/turn endpoint.');
  const jointBest = {}; // jointBest[numP] = {variant, line, st}
  for (const numP of playerCounts) {
    console.log(`\n--- ${numP}P (asym ON, @60s/turn) ---`);
    console.log(pad('variant', 11) + pad('cards/mat', 11) + padL('bestLine', 9) +
      padL('med', 7) + padL('IQR', 7) + padL('in30-60', 9) + padL('tail>60', 9));
    console.log('-'.repeat(11 + 11 + 9 + 7 * 2 + 9 + 9));
    for (const v of deckVariants) {
      const cpm = v.t.always.length + (numP >= 3 ? v.t.tier3.length : 0) + (numP >= 4 ? v.t.tier4.length : 0);
      let best = null;
      for (const line of TUNE_FISH_LINES) {
        const turns = tuneRun(numP, line, true, numGames, v.t);
        const score = tuneScore(turns);
        if (!best || score > best.score) best = { line, turns, score };
      }
      const st = tuneStats(best.turns, 60);
      const isWinner = !jointBest[numP] || best.score > jointBest[numP].score;
      if (isWinner) jointBest[numP] = { variant: v.name, line: best.line, st, score: best.score, t: v.t };
      console.log(
        pad(v.name, 11) + pad(cpm + ' cards', 11) + padL(String(best.line), 9) +
        padL(st.median.toFixed(1), 7) + padL(st.iqr.toFixed(1), 7) +
        padL(st.inBandPct.toFixed(0) + '%', 9) + padL(st.tailPct.toFixed(0) + '%', 9)
      );
    }
  }
  console.log('\n' + '='.repeat(78));
  console.log('JOINT RECOMMENDATION (asym ON, @60s/turn) — best (deck variant, fish line) per count:');
  console.log('='.repeat(78));
  for (const numP of playerCounts) {
    const b = jointBest[numP];
    console.log(`  ${numP}P:  deck "${b.variant}"  fishLine ${b.line}  →  median ${b.st.median.toFixed(0)}min, ` +
      `${b.st.inBandPct.toFixed(0)}% in band, IQR ${b.st.iqr.toFixed(0)}, tail>60 ${b.st.tailPct.toFixed(0)}%`);
  }
  // Restore live deck tiers.
  setDeckTuning({ always: [5, 7], tier3: [4], tier4: [8] });
  setUseSpeciesStarters(true);

  console.log(`\nElapsed: ${((Date.now() - tStart) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log(`  Minutes = turns × s/turn / 60, evaluated at ${TUNE_SPTS.join(' and ')} s/turn (human range).`);
  console.log('  medXX/inXX = median minutes / % in 30-60 band at XX s/turn; IQR = p75−p25.');
  console.log('  best line maximizes the worse of the two in-band %s (robust across the range).');
  console.log('  PASS 2 IQR is the key 4P-variance readout — lower = more consistent length.\n');
}

// Focused head-to-head of explicit (numP, fishLine) configs — same fish-line
// endgame, current deck tiers, asym ON. Prints percentiles + a histogram for
// each so specific candidates can be compared side by side. Configs default to
// the "2P @ 89 vs 119, in context with 3P/4P @ 89" question; override with an
// arg like "2:89,2:119,3:89,4:89".
function sweepTuneCmp(numGamesArg, configArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const spec = (configArg || '2:89,2:119,3:89,4:89')
    .split(',').map(s => { const [p, l] = s.split(':').map(Number); return { numP: p, line: l }; });
  configureMaterials(6);
  console.log(`\nRiver Bankers — config comparison  (${numGames} games each, baseline deck, asym ON)`);
  console.log(`Minutes = turns × s/turn / 60, shown at ${TUNE_SPTS.join(' and ')} s/turn.\n`);
  console.log(
    pad('config', 12) + padL('p10', 7) + padL('med', 7) + padL('p90', 7) + padL('IQR', 7) +
    padL('in30-60', 9) + padL('tail>60', 9) + '   @ s/turn'
  );
  console.log('-'.repeat(12 + 7 * 4 + 9 + 9 + 12));
  const hists = [];
  for (const { numP, line } of spec) {
    const turns = tuneRun(numP, line, true, numGames, null);
    for (const spt of TUNE_SPTS) {
      const st = tuneStats(turns, spt);
      console.log(
        pad(`${numP}P @ ${line}`, 12) +
        padL(st.p10.toFixed(1), 7) + padL(st.median.toFixed(1), 7) + padL(st.p90.toFixed(1), 7) +
        padL(st.iqr.toFixed(1), 7) + padL(st.inBandPct.toFixed(0) + '%', 9) +
        padL(st.tailPct.toFixed(0) + '%', 9) + padL(spt + 's', 11)
      );
    }
    hists.push({ numP, line, turns });
  }
  for (const spt of TUNE_SPTS) {
    console.log(`\n=== Histograms @ ${spt}s/turn ===`);
    for (const h of hists) {
      console.log(`\n  ${h.numP}P @ fishLine ${h.line}:`);
      console.log(tuneHistogram(h.turns, spt));
    }
  }
  console.log();
}

// End-of-game board-state + build stats for the fish-line endgame, across
// 2P/3P/4P at the candidate lines (default 89 and 119), baseline deck, asym ON.
// These are timing-heuristic-independent. Reports cards left in the material
// deck, Headwaters cards, river cards, open river icons, and structures built
// per player (cardsBuilt / numP) — plus median length for context.
function sweepTuneBoard(numGamesArg, linesArg, deckArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const lines = (linesArg || '89,119').split(',').map(Number);
  // Seat configs: numP with an explicit worker supply. 4P is shown at both 7
  // (live default) and 8 workers to isolate the worker count's effect on the
  // 4P build gradient.
  const seats = [
    { numP: 2, workers: 8 },
    { numP: 3, workers: 8 },
    { numP: 3, workers: 7 },
    { numP: 4, workers: 8 },
    { numP: 4, workers: 7 },
    { numP: 4, workers: 6 },
  ];
  // Deck variants: 'baseline' = live tiers; 'shifted' = pull each tier's player
  // limit down one step (3P→2P, 4P→3P): the 4-icon cards become 2P+, the 8-icon
  // cards become 3P+, no 4P-exclusive cards. (2P=18, 3P=24, 4P=24 cards.)
  const DECKS = {
    baseline: { always: [5, 7], tier3: [4], tier4: [8] },
    shifted:  { always: [4, 5, 7], tier3: [8], tier4: [] },
    lean4p:   { always: [5, 7], tier3: [4], tier4: [] },   // drop the 8-icon cards; 4P=18 (2P/3P unchanged)
  };
  const deckName = (deckArg && DECKS[deckArg]) ? deckArg : 'baseline';
  const deckTuning = DECKS[deckName];
  configureMaterials(6);
  console.log(`\nRiver Bankers — board-state & builds  (${numGames} games each, ${deckName} deck, asym ON)`);
  const cpmAt = (np) => deckTuning.always.length + (np >= 3 ? deckTuning.tier3.length : 0) + (np >= 4 ? deckTuning.tier4.length : 0);
  console.log(`Fish-line endgame (b+d). Deck starts at ${6 * cpmAt(2)}/${6 * cpmAt(3)}/${6 * cpmAt(4)} cards for 2P/3P/4P.`);
  console.log(`Deck tiers: always(2P+)=[${deckTuning.always}] tier3(3P+)=[${deckTuning.tier3}] tier4(4P+)=[${deckTuning.tier4}] icons.`);
  console.log(`matDeck/HW/river/openIcn = mean cards (or icons) on the board at game end.`);
  console.log(`built/P = mean structures built per player; med60 = median minutes @60s/turn.\n`);
  console.log(
    pad('config', 14) + padL('deckStart', 8) + padL('matLeft', 9) + padL('deckOut%', 9) +
    padL('HW', 6) + padL('river', 7) + padL('openIcn', 9) + padL('built/P', 9) + padL('med60', 8)
  );
  console.log('-'.repeat(14 + 8 + 9 + 9 + 6 + 7 + 9 + 9 + 8));
  for (const line of lines) {
    for (const { numP, workers } of seats) {
      const deckStart = 6 * cpmAt(numP);
      setUseSpeciesStarters(true);
      setDeckTuning(deckTuning);
      const rows = [];
      for (let g = 0; g < numGames; g++) rows.push(egRunGame(numP, 6, workers, 'fish', 0, line, 'd'));
      const matLeft = avg(rows.map(r => r.matDeck));
      const deckOutPct = 100 * rows.filter(r => r.matDeck === 0).length / rows.length;
      const med60 = pctl(rows.map(r => r.turns).sort((a, b) => a - b), 0.5);
      console.log(
        pad(`${numP}P/${workers}w @ ${line}`, 14) + padL(String(deckStart), 8) +
        padL(matLeft.toFixed(2), 9) + padL(deckOutPct.toFixed(0) + '%', 9) +
        padL(avg(rows.map(r => r.headwaters)).toFixed(2), 6) +
        padL(avg(rows.map(r => r.river)).toFixed(2), 7) +
        padL(avg(rows.map(r => r.openRiver)).toFixed(1), 9) +
        padL(avg(rows.map(r => r.built / numP)).toFixed(2), 9) +
        padL(med60.toFixed(0), 8)   // minutes @60s/turn == median turns
      );
    }
    console.log();
  }
  console.log('Legend:');
  console.log('  matLeft  = mean material cards still in the draw deck at game end.');
  console.log('  deckOut% = share of games where the material deck fully emptied.');
  console.log('  HW       = mean Headwaters (pre-river) cards on the board at end.');
  console.log('  river    = mean river cards present; openIcn = mean uncovered river icons.');
  console.log('  built/P  = mean structures built per player over the game.\n');
}

// Fish-line target finder: for the live seat configs (2P/8w, 3P/8w, 4P/7w),
// baseline deck, asym ON, scan fish lines and flag the value(s) that satisfy
// ALL THREE targets at once: deck-out ≥ 50%, builds/player > 2, and median
// length in 30–60 min. Length shown at both 45 and 60 s/turn; the ✓ flag uses
// the 60 s endpoint (looser/longer — the binding one for the upper bound).
function sweepTuneTarget(numGamesArg, linesArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const lines = linesArg
    ? linesArg.split(',').map(Number)
    : [89, 99, 109, 119, 129, 139, 149, 159, 169, 179, 189, 199, 209, 219, 229, 239];
  const seats = [{ numP: 2, workers: 8 }, { numP: 3, workers: 8 }, { numP: 4, workers: 7 }];
  configureMaterials(6);
  const DECK = { always: [5, 7], tier3: [4], tier4: [8] };
  console.log(`\nRiver Bankers — fish-line target finder  (${numGames} games each, baseline deck, asym ON)`);
  console.log(`Targets:  deck-out ≥ 50%   AND   builds/player > 2   AND   median length 30–60 min.`);
  console.log(`Length at both 45 and 60 s/turn; ✓ uses med60 (the binding upper bound).\n`);
  for (const { numP, workers } of seats) {
    const deckStart = 6 * (DECK.always.length + (numP >= 3 ? DECK.tier3.length : 0) + (numP >= 4 ? DECK.tier4.length : 0));
    console.log(`--- ${numP}P / ${workers}w  (deck ${deckStart} cards) ---`);
    console.log(pad('fishLine', 9) + padL('deckOut%', 9) + padL('built/P', 9) + padL('med45', 7) + padL('med60', 7) + '   targets met');
    console.log('-'.repeat(9 + 9 + 9 + 7 + 7 + 16));
    for (const line of lines) {
      setUseSpeciesStarters(true);
      setDeckTuning(DECK);
      const rows = [];
      for (let g = 0; g < numGames; g++) rows.push(egRunGame(numP, 6, workers, 'fish', 0, line, 'd'));
      const deckOut = 100 * rows.filter(r => r.matDeck === 0).length / rows.length;
      const builtP = avg(rows.map(r => r.built / numP));
      const turns = rows.map(r => r.turns).sort((a, b) => a - b);
      const med45 = pctl(turns, 0.5) * 45 / 60, med60 = pctl(turns, 0.5) * 60 / 60;
      const okDeck = deckOut >= 50, okBuilt = builtP > 2, okLen = med60 >= 30 && med60 <= 60;
      const flags = `${okDeck ? '✓' : '✗'}deck ${okBuilt ? '✓' : '✗'}build ${okLen ? '✓' : '✗'}len`;
      const allOk = okDeck && okBuilt && okLen;
      console.log(
        pad(String(line), 9) + padL(deckOut.toFixed(0) + '%', 9) + padL(builtP.toFixed(2), 9) +
        padL(med45.toFixed(0), 7) + padL(med60.toFixed(0), 7) + '   ' + flags + (allOk ? '   ◀ ALL' : '')
      );
    }
    console.log();
  }
}

// Auction-quality comparison for explicit seat configs: jam rate and, crucially,
// zero-clinch auctions (total bids > 0 but nobody clinched a single icon — the
// "everyone bid, nobody got anything" outcome that motivated 4P=7w). Runs the
// fish-line endgame and reads state.metrics directly (egRunGame doesn't expose
// these). Default: 4P @ 119, 7w vs 8w, baseline deck, asym ON.
function sweepTuneJam(numGamesArg, lineArg, seatsArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const line = parseInt(lineArg) || 119;
  const seats = (seatsArg || '4:7,4:8').split(',')
    .map(s => { const [p, w] = s.split(':').map(Number); return { numP: p, workers: w }; });
  const DECK = { always: [5, 7], tier3: [4], tier4: [8] };
  configureMaterials(6);
  console.log(`\nRiver Bankers — auction quality  (${numGames} games each, fishLine ${line}, baseline deck, asym ON)`);
  console.log(`jam = total bid > open icons; zeroClinch = bids placed but 0 icons clinched (dead auction).\n`);
  console.log(
    pad('config', 11) + padL('med45', 7) + padL('med60', 7) + padL('aucs/g', 8) + padL('jam%', 7) + padL('jams/g', 8) +
    padL('zcAuc%', 8) + padL('zc/g', 7) + padL('zcBid%', 8) + padL('waste%', 8)
  );
  console.log('-'.repeat(11 + 7 + 7 + 8 + 7 + 8 + 8 + 7 + 8 + 8));
  for (const { numP, workers } of seats) {
    setUseSpeciesStarters(true);
    setDeckTuning(DECK);
    const acc = { auc: 0, jam: 0, zcAuc: 0, zcBid: 0, nob: 0, wasted: 0, spawned: 0 };
    const jamPcts = [], zcAucPcts = [], turnsArr = [];
    for (let g = 0; g < numGames; g++) {
      const state = newGame(numP, workers);
      egPlayOut(state, 'fish', 0, line, 'd');
      const m = state.metrics;
      acc.auc += m.auctions; acc.jam += m.jamAuctions; acc.zcAuc += m.zeroClinchAuctions;
      acc.zcBid += m.zeroClinchBidders; acc.nob += m.nonZeroBidders;
      acc.wasted += m.iconsWastedToShore; acc.spawned += m.iconsSpawned;
      jamPcts.push(pct(m.jamAuctions, m.auctions));
      zcAucPcts.push(pct(m.zeroClinchAuctions, m.auctions));
      turnsArr.push(m.turns);
    }
    turnsArr.sort((a, b) => a - b);
    const medTurns = pctl(turnsArr, 0.5);
    console.log(
      pad(`${numP}P / ${workers}w`, 11) +
      padL((medTurns * 45 / 60).toFixed(0), 7) + padL(medTurns.toFixed(0), 7) +
      padL((acc.auc / numGames).toFixed(1), 8) +
      padL(avg(jamPcts).toFixed(1) + '%', 7) +
      padL((acc.jam / numGames).toFixed(2), 8) +
      padL(avg(zcAucPcts).toFixed(1) + '%', 8) +
      padL((acc.zcAuc / numGames).toFixed(2), 7) +
      padL(pct(acc.zcBid, acc.nob).toFixed(1) + '%', 8) +
      padL(pct(acc.wasted, acc.spawned).toFixed(1) + '%', 8)
    );
  }
  console.log('\nLegend:');
  console.log('  aucs/g  = mean auctions per game;  jams/g = mean jammed auctions per game.');
  console.log('  zcAuc%  = % of auctions that were zero-clinch (nobody got anything).');
  console.log('  zc/g    = mean zero-clinch (dead) auctions per game — the key 7w-vs-8w stat.');
  console.log('  zcBid%  = of all (bidder with bid>0), the % who clinched 0 icons.');
  console.log('  waste%  = open icons carried unclaimed to the shoreline / icons spawned.\n');
}

// "Dead trailing turns" sweep: per player, the number of their own turns at the
// END of the main game (before retiring / game end) that came AFTER their last
// engagement — i.e. turns spent neither participating in an auction (bid > 0)
// nor building. These are the "boring" turns that game-length and jam stats miss
// (a player Inventing toward the finish line with nothing left to contest). The
// coda (one-build-each finale) is excluded. Default: the chosen configs @119.
function sweepTuneDead(numGamesArg, lineArg, seatsArg) {
  const numGames = parseInt(numGamesArg) || 5000;
  const line = parseInt(lineArg) || 119;
  const seats = (seatsArg || '2:8,3:8,4:6,4:7,4:8').split(',')
    .map(s => { const [p, w] = s.split(':').map(Number); return { numP: p, workers: w }; });
  const DECK = { always: [5, 7], tier3: [4], tier4: [8] };
  configureMaterials(6);
  console.log(`\nRiver Bankers — dead trailing turns  (${numGames} games each, fishLine ${line}, baseline deck, asym ON)`);
  console.log(`A player's "dead trail" = their own end-of-game turns after their LAST auction-bid/build`);
  console.log(`(coda excluded). Counts turns spent idling/Inventing toward retirement with nothing to do.\n`);
  console.log(
    pad('config', 11) + padL('med60', 7) + padL('mean/P', 8) + padL('worstP', 8) +
    padL('p90 worst', 11) + padL('max worst', 11) + padL('≥3 trail%', 11)
  );
  console.log('-'.repeat(11 + 7 + 8 + 8 + 11 + 11 + 11));
  for (const { numP, workers } of seats) {
    setUseSpeciesStarters(true);
    setDeckTuning(DECK);
    const perPlayerAll = [];        // every player's dead-trail count
    const worstPerGame = [];        // per game, the max dead-trail across players
    const turnsArr = [];
    let gamesWithLongTrail = 0;      // games where some player had ≥3 dead trailing turns
    for (let g = 0; g < numGames; g++) {
      configureMaterials(6);
      const state = newGame(numP, workers);
      state._engage = { last: new Array(numP).fill(-1), ownTurns: Array.from({ length: numP }, () => []), frozen: false };
      egPlayOut(state, 'fish', 0, line, 'd');
      const e = state._engage;
      let worst = 0;
      for (let i = 0; i < numP; i++) {
        const dead = e.ownTurns[i].filter(t => t > e.last[i]).length;
        perPlayerAll.push(dead);
        if (dead > worst) worst = dead;
      }
      worstPerGame.push(worst);
      if (worst >= 3) gamesWithLongTrail++;
      turnsArr.push(state.metrics.turns);
    }
    worstPerGame.sort((a, b) => a - b);
    turnsArr.sort((a, b) => a - b);
    console.log(
      pad(`${numP}P / ${workers}w`, 11) +
      padL(pctl(turnsArr, 0.5).toFixed(0), 7) +
      padL(avg(perPlayerAll).toFixed(2), 8) +
      padL(avg(worstPerGame).toFixed(2), 8) +
      padL(pctl(worstPerGame, 0.90).toFixed(0), 11) +
      padL(String(worstPerGame[worstPerGame.length - 1]), 11) +
      padL((100 * gamesWithLongTrail / numGames).toFixed(1) + '%', 11)
    );
  }
  console.log('\nLegend:');
  console.log('  med60     = median game length in minutes @60s/turn (context).');
  console.log('  mean/P    = mean dead trailing turns per player (averaged over all players, all games).');
  console.log('  worstP    = mean across games of the single most-stranded player\'s dead-trail count.');
  console.log('  p90/max worst = 90th-percentile and worst-ever value of that per-game worst player.');
  console.log('  ≥3 trail% = share of games where some player sat through ≥3 dead trailing turns.\n');
}

function sweepFishline(numGamesArg, numPArg) {
  const numGames = parseInt(numGamesArg) || 2000;
  const numPArgInt = parseInt(numPArg);
  const playerCounts = numPArgInt ? [numPArgInt] : [2, 3, 4];
  const numMats = 6;
  const SEC_PER_AUCTION = 90;
  const SEC_PER_BUILD_INVENT = 15;
  const fishLines = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];

  console.log(`\nRiver Bankers — fish-line sweep, b+d only  (${numGames} games/config, 6 materials)`);
  console.log(`Trigger b:fish-line (retire as pawn passes the line) + coda d:one build each.`);
  console.log(`Game time = ${SEC_PER_AUCTION}s/auction + ${SEC_PER_BUILD_INVENT}s/(build or Invent).`);
  console.log(`After the material deck empties, players keep auctioning river/Headwaters cards`);
  console.log(`until all pawns pass the line (or the board is fully mined out).\n`);

  const tStart = Date.now();
  for (const numP of playerCounts) {
    const workers = defaultWorkersPerPlayer(numP);
    console.log(`=== ${numP}P (${workers} workers) ===`);
    console.log(
      pad('fishLine', 9) + padL('time', 8) + padL('builds', 8) +
      padL('avgVP', 8) + padL('spread', 8) +
      padL('matDeck', 8) + padL('HW', 5) + padL('river', 7) + padL('openIcn', 9)
    );
    console.log('-'.repeat(9 + 8 + 8 + 8 + 8 + 7 + 5 + 7 + 9));
    for (const line of fishLines) {
      const rows = [];
      for (let g = 0; g < numGames; g++) {
        rows.push(egRunGame(numP, numMats, workers, 'fish', 0, line, 'd'));
      }
      const meanAuc = avg(rows.map(r => r.auc));
      const meanBuildInvent = avg(rows.map(r => r.built + r.invents));
      const gameSecs = meanAuc * SEC_PER_AUCTION + meanBuildInvent * SEC_PER_BUILD_INVENT;
      console.log(
        pad(String(line), 9) +
        padL(fmtTime(gameSecs), 8) +
        padL(avg(rows.map(r => r.built)).toFixed(2), 8) +
        padL(avg(rows.map(r => r.avgVP)).toFixed(1), 8) +
        padL(avg(rows.map(r => r.spread)).toFixed(1), 8) +
        padL(avg(rows.map(r => r.matDeck)).toFixed(1), 8) +
        padL(avg(rows.map(r => r.headwaters)).toFixed(2), 5) +
        padL(avg(rows.map(r => r.river)).toFixed(2), 7) +
        padL(avg(rows.map(r => r.openRiver)).toFixed(2), 9)
      );
    }
    console.log();
  }
  console.log(`Elapsed: ${((Date.now() - tStart) / 1000).toFixed(1)}s.`);
  console.log('\nLegend:');
  console.log(`  fishLine = cumulative-fish line; a player retires the turn they pass it.`);
  console.log(`  time     = ${SEC_PER_AUCTION}s × auctions + ${SEC_PER_BUILD_INVENT}s × (builds + Invents), as M:SS.`);
  console.log('  builds   = mean structures built/game; avgVP = mean final VP across all players.');
  console.log('  spread   = mean (winnerVP − loserVP).');
  console.log('  matDeck  = mean material (resource) cards left in the deck at game end.');
  console.log('  HW       = mean Headwaters cards present; river = mean river cards present.');
  console.log('  openIcn  = mean uncovered (open) icon spots across river cards at game end.\n');
}

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'spec') sweepSpec();
  else if (mode === 'rule') sweepRule();
  else if (mode === 'deck') sweepDeck(process.argv[3]);
  else if (mode === 'uniform') sweepUniform();
  else if (mode === 'ablation') sweepAblation(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'confluence') sweepConfluence(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'effect-use') sweepEffectUse(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
  else if (mode === 'confluence-pairing') sweepConfluencePairing(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'confluence-starter') sweepConfluenceStarter(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'confluence-trigger') sweepConfluenceTrigger(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
  else if (mode === 'confluence-matrix') sweepConfluenceMatrix(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'balance') sweepBalance(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'game-length') sweepGameLength(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'species-winrate') sweepSpeciesWinRate(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'species-starters') sweepSpeciesStarters(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'river-slots') sweepRiverSlots();
  else if (mode === 'blanks') sweepBlanks();
  else if (mode === 'flush-deck') sweepFlushDeck(process.argv[3]);
  else if (mode === 'pair-vp') sweepPairVP(process.argv[3]);
  else if (mode === 'vp-rework') sweepVpRework(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'vine-ladder') sweepVineLadder(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'endgame-pass0') sweepEndgamePass0(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'endgame-rework') sweepEndgameRework(process.argv[3], process.argv[4]);
  else if (mode === 'fishline') sweepFishline(process.argv[3], process.argv[4]);
  else if (mode === 'tune') sweepTune(process.argv[3]);
  else if (mode === 'tune-cmp') sweepTuneCmp(process.argv[3], process.argv[4]);
  else if (mode === 'tune-board') sweepTuneBoard(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'tune-target') sweepTuneTarget(process.argv[3], process.argv[4]);
  else if (mode === 'tune-jam') sweepTuneJam(process.argv[3], process.argv[4], process.argv[5]);
  else if (mode === 'tune-dead') sweepTuneDead(process.argv[3], process.argv[4], process.argv[5]);
  else sweep();
}
