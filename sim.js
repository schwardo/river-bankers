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
  { name: 'Beaver Dam',     cost: { logs: 4, mud: 2 },               time: 3, vp: 6, effect: 'When built, wash every card in River 1 to the shoreline (carrying any workers along), and slide back 1 fish per card washed.' },
  { name: 'Hollowed-out Log', cost: { logs: 3, reeds: 1 },           time: 2, vp: 4, effect: 'When you pass 0 on the fish track, recall one worker from a river card without dropping a blank.' },
  { name: 'Snag Pile',      cost: { reeds: 2, stones: 1 },           time: 2, vp: 3, effect: 'When built, pull a Headwaters card to River 1 for free; an auction immediately runs on it at 1 fish/item.' },
  { name: 'Heron Watch',    cost: { stones: 4, logs: 2 },            time: 4, vp: 2, effect: 'End game: +1 VP per shoreline card on the table.' },
  { name: 'Reed Bed',       cost: { reeds: 3, mud: 1 },              time: 2, vp: 4, effect: 'Reed icons cost you 1 less fish per item (min 1).' },
  { name: 'Mud Levee',      cost: { mud: 3, stones: 2 },             time: 3, vp: 5, effect: 'When built, drop 2 blanks on uncovered icons in the river.' },
  { name: 'Otter Slide',    cost: { mud: 2, logs: 1 },               time: 1, vp: 2, effect: 'When you build, advance 1 fewer fish (min 1).' },
  { name: 'Cache Burrow',   cost: { mud: 2, reeds: 2 },              time: 2, vp: 4, effect: 'Your hand size is 4 instead of 3.' },
  { name: 'Vine Lattice',   cost: { vines: 3, reeds: 2 },            time: 3, vp: 5, effect: 'When built, draw 3 structure cards, keep 1, discard 2.' },
  { name: 'Charcoal Pit',   cost: { clay: 4, logs: 2 },              time: 3, vp: 7, effect: 'When building, 1 of your Clay workers may substitute for any other material.' },
  { name: 'Lookout Tree',   cost: { logs: 5, stones: 2 },            time: 4, vp: 8, effect: 'Peek at the top card of the material deck at any time.' },
  { name: 'Pier',           cost: { logs: 3, stones: 2 },            time: 3, vp: 2, effect: 'End game: +1 VP per shoreline card with at least one of your workers.' },
  { name: 'Cattail Marsh',  cost: { reeds: 4, mud: 2 },              time: 3, vp: 6, effect: 'Each Reed worker you spend on a build counts as 2 reeds.' },
  { name: 'Stone Cairn',    cost: { stones: 5 },                     time: 3, vp: 1, effect: 'End game: +1 VP per distinct material across your built structures (max +5).' },
  { name: 'Wood Pile',      cost: { logs: 4 },                       time: 2, vp: 3, effect: 'When you pass 0 on the fish track, claim 1 uncovered Log icon from any river card for 1 fish.' },
  { name: 'Heron Roost',    cost: { reeds: 3, vines: 2 },            time: 3, vp: 5, effect: 'At the start of your turn you may pay 1 fish to replace a Headwaters card with the top of the material deck.' },
  { name: 'Otter Raft',     cost: { logs: 4, reeds: 1 },             time: 3, vp: 5, effect: 'When a jammed auction makes you place fewer workers than your bid, pay fish for one fewer worker.' },
  { name: 'Mill Wheel',     cost: { logs: 3, stones: 3 },            time: 4, vp: 7, effect: 'When you would pass 0 on the fish track, stop at space 1 instead.' },
  { name: 'Stone Pool',     cost: { stones: 3, clay: 2 },            time: 3, vp: 5, effect: 'When built, look at the top 5 material cards and rearrange them in any order.' },
  { name: 'Flush Channel',  cost: { mud: 4, reeds: 1 },              time: 3, vp: 5, effect: 'When built, trigger a free Headwaters flush (no 5 fish cost).' },
  { name: 'Granary',        cost: { reeds: 4, clay: 1 },             time: 3, vp: 5, effect: 'Once per game, your build costs 1 fewer of one listed material (your choice).' },
  { name: 'Granite Spire',  cost: { stones: 6 },                     time: 4, vp: 7 },
  { name: 'Royal Lodge',    cost: { logs: 6, vines: 2 },             time: 5, vp: 10, effect: 'When built, take an immediate extra turn.' },
  { name: 'Otter Den',      cost: { mud: 3, vines: 1 },              time: 2, vp: 4, effect: 'When you call workers home, slide back 1 fish per worker recalled.' },
  { name: 'Floodgate',      cost: { mud: 4, clay: 3 },               time: 4, vp: 8, effect: 'Once per game, before an auction resolves, slide the auctioned card 1 space toward the Headwaters.' },
  { name: 'Burrow Run',     cost: { vines: 3, mud: 1 },              time: 0, vp: 4, effect: 'When built, slide your pawn back 5 on the fish track.' },
  { name: 'Sap Drip',       cost: { logs: 2, vines: 2 },             time: 2, vp: 3, effect: 'When built, place 2 free workers from your supply onto uncovered icons of one river card.' },
  { name: 'Spy Mound',      cost: { stones: 4, clay: 1 },            time: 3, vp: 5, effect: 'Once per game, decide your auction bid after the other players reveal theirs.' },
  { name: 'Vine Ladder',    cost: { vines: 4, stones: 2 },           time: 4, vp: 4, effect: 'End game: +2 VP per built structure of yours that uses Vines.' },
  { name: 'Driftwood Snag', cost: { logs: 2, reeds: 2, mud: 1 },     time: 3, vp: 5, effect: 'At the start of your turn you may pay 1 fish to add a blank to any uncovered icon.' },
  { name: 'Salt Lick',      cost: { stones: 3, logs: 2, clay: 1 },   time: 3, vp: 6, effect: 'When built, look at every opponent\'s hand of structure cards.' },
  { name: 'Hidden Cache',   cost: { vines: 2, stones: 2, clay: 2 },  time: 3, vp: 3, effect: 'End game: +5 VP if your built structures include at least 1 of each material; otherwise +2.' },
];

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
    v += state.shorelineCards.filter(c => workersOnCard(c, p.idx) > 0).length;
  }
  if (hasEffect(p, 'Stone Cairn')) {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    v += Math.min(5, mats.size);
  }
  if (hasEffect(p, 'Vine Ladder')) {
    v += 2 * p.built.filter(b => (b.cost.vines || 0) > 0).length;
  }
  if (hasEffect(p, 'Hidden Cache')) {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    v += MAT_KEYS.every(m => mats.has(m)) ? 5 : 2;
  }
  if (hasEffect(p, 'Heron Watch')) {
    v += state.shorelineCards.length;
  }
  return v;
}

// Reed Bed: per-item cost is 1 less for the player on Reed material cards (min 1).
function playerCardCost(state, card, playerIdx) {
  const base = cardCost(card);
  const p = state.players[playerIdx];
  if (card.material === 'reeds' && hasEffect(p, 'Reed Bed')) return Math.max(1, base - 1);
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
function playerWorkersByMaterial(state, playerIdx) {
  const out = {};
  for (const m of MAT_KEYS) out[m] = 0;
  for (const c of state.riverCards) out[c.material] += workersOnCard(c, playerIdx);
  for (const c of state.shorelineCards) out[c.material] += workersOnCard(c, playerIdx);
  return out;
}
function canBuild(structure, workersByMat, p = null) {
  if (!p) {
    for (const m in structure.cost) {
      if ((workersByMat[m] || 0) < structure.cost[m]) return false;
    }
    return true;
  }
  const { eff } = effectiveBuildCost(structure, p, workersByMat);
  for (const m in eff) {
    if ((workersByMat[m] || 0) < eff[m]) return false;
  }
  return true;
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

function buildMaterialDeck(numPlayers) {
  const deck = makeCardSpecs(numPlayers).map((spec, id) => ({
    id: 'm' + id,
    material: spec.material,
    totalIcons: spec.icons,
    slot: null,
    workers: {},
    blanks: 0,
  }));
  // shuffle inline
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return shuffle(deck);
}
function buildStructureDeck() {
  let id = 0;
  return shuffle(STRUCTURE_TEMPLATES.map(s => ({ ...s, id: 's' + (id++), cost: { ...s.cost } })));
}

// =============================================================================
// STATE / TURN ORDER
// =============================================================================
function newGame(numPlayers, workersPerPlayer = 8) {
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      idx: i,
      supply: workersPerPlayer,
      timePos: 0,
      hand: [],
      built: [],
      exhausted: false,
      out: false,
      granaryUsed: false,
      floodgateUsed: false,
      spyMoundUsed: false,
    });
  }
  const matDeck = buildMaterialDeck(numPlayers);
  const structDeck = buildStructureDeck();
  for (const p of players) {
    for (let i = 0; i < 3; i++) p.hand.push(structDeck.pop());
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
  for (const other of state.players) {
    if (other === p) continue;
    const prevLaps = Math.max(0, Math.floor((prev - other.timePos) / LAP_LENGTH));
    const newLaps  = Math.max(0, Math.floor((p.timePos - other.timePos) / LAP_LENGTH));
    let crossings = newLaps - prevLaps;
    if (crossings > 0) {
      const key = playerIdx + '->' + other.idx;
      while (crossings-- > 0) state.shadowedBy[key] = !state.shadowedBy[key];
    }
  }
  for (const b of state.players) {
    let now = false;
    for (const a of state.players) {
      if (a === b) continue;
      if (state.shadowedBy[a.idx + '->' + b.idx]) { now = true; break; }
    }
    b.exhausted = now;
  }
}

// =============================================================================
// CARD MOVEMENT
// =============================================================================
function moveCardToShoreline(state, card) {
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
function jamCardDownriver(state, card) {
  if (card.slot === 'pre') {
    state.metrics.preToRiverCards++;
    const idx = prerivIndexOf(state, card);
    card.slot = 0;
    state.riverCards.push(card);
    if (idx !== -1) refillPreriv(state, idx);
    return;
  }
  const newSlot = card.slot + 1;
  if (newSlot > RIVER_SLOTS - 1) { moveCardToShoreline(state, card); return; }
  card.slot = newSlot;
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
  // Spy Mound: a player auto-defers to bid LAST. Only one Spy Mound user per auction.
  let deferred = -1;
  for (const p of state.players) {
    if (hasEffect(p, 'Spy Mound') && !p.spyMoundUsed && !p.exhausted && !p.out) {
      // Defer if uncovered icons >= 4 (high-value auction).
      if (uncoveredIcons(card) >= 4) {
        deferred = p.idx;
        break;
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
    p.spyMoundUsed = true;
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
      jamCardDownriver(state, card);
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
    jamCardDownriver(state, card);
  }
}

// =============================================================================
// AI: BIDDING
// =============================================================================
function aiDecideBid(state, playerIdx, card, minBid) {
  const p = state.players[playerIdx];
  if (p.supply === 0) return Math.min(0, minBid);
  const open = uncoveredIcons(card);
  if (open === 0) return Math.min(p.supply, minBid);

  const wbm = playerWorkersByMaterial(state, playerIdx);
  let need = 0;
  for (const s of p.hand) {
    const want = s.cost[card.material] || 0;
    const have = wbm[card.material] || 0;
    if (want > have) need += (want - have);
  }
  const maxNeed = Math.max(0, ...p.hand.map(s => Math.max(0, (s.cost[card.material] || 0) - (wbm[card.material] || 0))));
  let target = Math.round((need + maxNeed) / 2);
  target = Math.min(target, p.supply, open, 4);
  // Use the player-specific per-item cost so Reed Bed makes reed auctions more attractive.
  const myCost = playerCardCost(state, card, playerIdx);
  if (myCost >= 3 && target > 1) target = Math.max(1, target - 1);
  if (myCost >= 4 && target > 1) target = Math.max(1, target - 1);
  const r = Math.random();
  if (r < 0.15 && target > 0) target -= 1;
  else if (r > 0.85 && target < p.supply && target < open) target += 1;
  // Speculative bid: non-trigger AI with no current need but a hand structure
  // that uses this material may bid 1 worker on a cheap slot to add contention.
  if (
    target === 0 && minBid === 0 && SPECULATIVE_BID_PROB > 0 &&
    myCost <= 2 && p.supply > 0 &&
    p.hand.some(s => (s.cost[card.material] || 0) > 0) &&
    Math.random() < SPECULATIVE_BID_PROB
  ) {
    target = 1;
  }
  target = Math.max(target, minBid);
  target = Math.min(target, p.supply);
  if (target < 0) target = 0;
  return target;
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
  'Cattail Marsh': 1,
  'Otter Raft': 1,
  'Cache Burrow': 1,
  // Mid-low constants
  'Reed Bed': 0.5,
  'Otter Slide': 0.5,
  'Mill Wheel': 0.5,
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
  // Endgame VP — state-dependent projections.
  if (struct.name === 'Pier') {
    const placed = state.shorelineCards.filter(c => workersOnCard(c, p.idx) > 0).length;
    const remaining = state.matDeck.length + state.riverCards.length;
    return placed + Math.min(5, Math.floor(remaining * 0.25));
  }
  if (struct.name === 'Stone Cairn') {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    return Math.min(5, mats.size + 2);
  }
  if (struct.name === 'Vine Ladder') {
    const builtVine = p.built.filter(b => (b.cost.vines || 0) > 0).length;
    const handVine = p.hand.filter(s => (s.cost.vines || 0) > 0).length;
    return 2 * (builtVine + Math.min(handVine, 2));
  }
  if (struct.name === 'Hidden Cache') {
    const mats = new Set();
    for (const b of p.built) for (const m in b.cost) mats.add(m);
    // Optimistic: expect to fill out remaining materials over the game.
    return mats.size >= MAT_KEYS.length - 1 ? 5 : 3;
  }
  if (struct.name === 'Heron Watch') {
    const remaining = state.matDeck.length + state.riverCards.length;
    return state.shorelineCards.length + Math.floor(remaining * 0.5);
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

  let bestCard = null, bestScore = -Infinity, bestKind = null, bestPrerivIdx = -1;
  for (const c of state.riverCards) {
    if (uncoveredIcons(c) === 0) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), p.supply, need);
    // playerCardCost picks up Reed Bed's per-item discount when scoring auction targets.
    const score = need * got - playerCardCost(state, c, playerIdx) * got * 0.4;
    if (score > bestScore) { bestScore = score; bestCard = c; bestKind = 'river'; }
  }
  for (let i = 0; i < state.prerivCards.length; i++) {
    const c = state.prerivCards[i];
    if (!c) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), p.supply, need);
    if (got === 0) continue;
    const trigger = prerivTriggerCost(i);
    const score = need * got - 1 * got * 0.4 - trigger * 0.6;
    if (score > bestScore) { bestScore = score; bestCard = c; bestKind = 'preriv'; bestPrerivIdx = i; }
  }
  if (bestCard && p.supply > 0) {
    if (bestKind === 'river') return { type: 'auction', cardId: bestCard.id };
    return { type: 'preriv', slotIdx: bestPrerivIdx };
  }
  if (totalNeed === 0 || p.hand.length === 0) {
    if (state.structDeck.length > 0) return { type: 'browse', n: Math.min(2, state.structDeck.length) };
  }
  const upstreamHasNeeded = state.prerivCards.some(c => c && needs[c.material] > 0);
  const upstreamHasAny = state.prerivCards.some(c => c !== null);
  // Flush includes triggering an auction, which requires at least one worker.
  if (upstreamHasAny && !upstreamHasNeeded && p.supply > 0) {
    return { type: 'flush' };
  }
  if (state.structDeck.length > 0) return { type: 'browse', n: Math.min(1, state.structDeck.length) };
  return { type: 'pass' };
}

// Heron Roost / Driftwood Snag: optional start-of-turn abilities. Auto-fire for AI
// when conditions are met. Each costs 1 fish.
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
    // Only block cards we don't need ourselves.
    const cands = [...state.riverCards, ...state.prerivCards.filter(c => c)]
      .filter(c => uncoveredIcons(c) >= 4 && !myMats.has(c.material));
    if (cands.length > 0) {
      const target = cands.reduce((a, b) => uncoveredIcons(a) >= uncoveredIcons(b) ? a : b);
      target.blanks += 1;
      noteBlanks(state);
      p.timePos += 1; // 1 fish cost
    }
  }
}

function aiCallHomeIfNeeded(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.supply >= 3) return;
  const useful = new Set();
  for (const s of p.hand) for (const m in s.cost) useful.add(m);
  const cap = {};
  for (const m of MAT_KEYS) cap[m] = 0;
  for (const s of p.hand) for (const m in s.cost) cap[m] = Math.max(cap[m], s.cost[m]);
  const placed = playerWorkersByMaterial(state, playerIdx);
  const recallSpec = [];
  const cards = [
    ...state.shorelineCards.map(c => ({ c })),
    ...state.riverCards.slice().sort((a, b) => cardCost(b) - cardCost(a)).map(c => ({ c })),
  ];
  for (const { c } of cards) {
    const w = workersOnCard(c, playerIdx);
    if (w === 0) continue;
    let canRecall;
    if (!useful.has(c.material)) canRecall = w;
    else canRecall = Math.min(w, Math.max(0, placed[c.material] - cap[c.material]));
    if (canRecall > 0) {
      recallSpec.push({ cardId: c.id, count: canRecall });
      placed[c.material] -= canRecall;
    }
  }
  if (recallSpec.length > 0) callWorkersHome(state, playerIdx, recallSpec);
}

function aiForceRecallIfStuck(state, playerIdx) {
  const p = state.players[playerIdx];
  if (p.supply > 0) return;
  const candidates = [];
  for (const c of state.shorelineCards) {
    const w = workersOnCard(c, playerIdx);
    if (w > 0) candidates.push({ card: c, w, score: 0 });
  }
  for (const c of state.riverCards) {
    const w = workersOnCard(c, playerIdx);
    if (w > 0) candidates.push({ card: c, w, score: 1 + cardCost(c) });
  }
  candidates.sort((a, b) => a.score - b.score);
  let toRecall = 2;
  const spec = [];
  for (const cand of candidates) {
    if (toRecall <= 0) break;
    const take = Math.min(cand.w, toRecall);
    spec.push({ cardId: cand.card.id, count: take });
    toRecall -= take;
  }
  if (spec.length > 0) callWorkersHome(state, playerIdx, spec);
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
  for (const m in effCost) {
    let need = effCost[m];
    for (const c of state.shorelineCards) {
      if (need === 0) break;
      if (c.material !== m) continue;
      const have = workersOnCard(c, playerIdx);
      if (have === 0) continue;
      const take = Math.min(have, need);
      c.workers[playerIdx] = have - take;
      if (c.workers[playerIdx] === 0) delete c.workers[playerIdx];
      need -= take;
    }
    const riverByCost = state.riverCards.filter(c => c.material === m && workersOnCard(c, playerIdx) > 0)
      .sort((a, b) => cardCost(a) - cardCost(b));
    for (const c of riverByCost) {
      if (need === 0) break;
      const have = workersOnCard(c, playerIdx);
      const take = Math.min(have, need);
      c.workers[playerIdx] = have - take;
      if (c.workers[playerIdx] === 0) delete c.workers[playerIdx];
      c.blanks += take;
      need -= take;
    }
  }
  noteBlanks(state);
  p.supply += Object.values(effCost).reduce((s, n) => s + n, 0);
  // Otter Slide: build advances 1 fewer fish (min 1). Cards with printed time 0 stay 0.
  const slideDiscount = hasEffect(p, 'Otter Slide') ? 1 : 0;
  const timeCost = struct.time === 0 ? 0 : Math.max(1, struct.time - slideDiscount);
  advancePlayer(state, playerIdx, timeCost);
  p.hand.splice(handIdx, 1);
  p.built.push(struct);
  state.metrics.cardsBuilt++;
  fireOnBuildEffect(state, playerIdx, struct);
  // Replace from deck up to maxHandSize (Cache Burrow → 4).
  while (p.hand.length < maxHandSize(p) && state.structDeck.length > 0) {
    p.hand.push(state.structDeck.pop());
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
    for (const c of r1) moveCardToShoreline(state, c);
    if (r1.length > 0) p.timePos = Math.max(0, p.timePos - r1.length);
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
    for (let i = 0; i < state.prerivCards.length; i++) state.prerivCards[i] = null;
    for (let i = 0; i < state.prerivCards.length; i++) {
      if (state.matDeck.length === 0) break;
      const c = state.matDeck.pop();
      c.slot = 'pre';
      state.prerivCards[i] = c;
      state.metrics.iconsSpawned += c.totalIcons;
    }
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
    const drawCount = Math.min(3, state.structDeck.length);
    if (drawCount === 0) return;
    const drawn = [];
    for (let i = 0; i < drawCount; i++) drawn.push(state.structDeck.pop());
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
    const drawCount = Math.min(N, state.structDeck.length);
    const drawn = [];
    for (let i = 0; i < drawCount; i++) drawn.push(state.structDeck.pop());
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
    let action = aiChooseAction(state, p.idx);
    if (action.type !== 'build') {
      aiCallHomeIfNeeded(state, p.idx);
      aiForceRecallIfStuck(state, p.idx);
      action = aiChooseAction(state, p.idx);
    }
    executeAction(state, p.idx, action);
    cleanupShoreline(state);

    if (state.endgame && !p.out) {
      const reachedEnd = p.timePos >= ENDGAME_TRACK_END;
      const passed = action.type === 'pass';
      if (reachedEnd || passed) p.out = true;
    }
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
      let action = aiChooseAction(state, p.idx);
      if (action.type !== 'build') {
        aiCallHomeIfNeeded(state, p.idx);
        aiForceRecallIfStuck(state, p.idx);
        action = aiChooseAction(state, p.idx);
      }
      executeAction(state, p.idx, action);
      cleanupShoreline(state);
      if (state.endgame && !p.out) {
        const reachedEnd = p.timePos >= ENDGAME_TRACK_END;
        const passed = action.type === 'pass';
        if (reachedEnd || passed) p.out = true;
      }
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

  const effectCards = STRUCTURE_TEMPLATES.filter(s => s.effect).map(s => s.name);

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
