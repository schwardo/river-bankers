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

const BASE_STRUCTURE_TEMPLATES = [
  { name: 'Beaver Dam',     cost: { logs: 4, mud: 2 },               time: 3, vp: 6 },
  { name: 'Lodge',          cost: { logs: 3, reeds: 1 },             time: 2, vp: 4 },
  { name: 'Reed Snare',     cost: { reeds: 2, stones: 1 },           time: 2, vp: 3 },
  { name: 'Stone Bridge',   cost: { stones: 4, logs: 2 },            time: 4, vp: 8 },
  { name: 'Reed Hut',       cost: { reeds: 3, mud: 1 },              time: 2, vp: 4 },
  { name: 'Mud Levee',      cost: { mud: 3, stones: 2 },             time: 3, vp: 5 },
  { name: 'Otter Slide',    cost: { mud: 2, logs: 1 },               time: 1, vp: 2 },
  { name: 'Mink Burrow',    cost: { mud: 2, reeds: 2 },              time: 2, vp: 4 },
  { name: 'Vine Lattice',   cost: { vines: 3, reeds: 2 },            time: 3, vp: 5 },
  { name: 'Charcoal Pit',   cost: { clay: 4, logs: 2 },              time: 3, vp: 7 },
  { name: 'Watchtower',     cost: { logs: 5, stones: 2 },            time: 4, vp: 8 },
  { name: 'Pier',           cost: { logs: 3, stones: 2 },            time: 3, vp: 5 },
  { name: 'Cattail Patch',  cost: { reeds: 4, mud: 2 },              time: 3, vp: 6 },
  { name: 'Stone Cairn',    cost: { stones: 5 },                     time: 3, vp: 5 },
  { name: 'Wood Pile',      cost: { logs: 4 },                       time: 2, vp: 3 },
  { name: 'Heron Roost',    cost: { reeds: 3, vines: 2 },            time: 3, vp: 5 },
  { name: 'Boat Dock',      cost: { logs: 4, reeds: 1 },             time: 3, vp: 5 },
  { name: 'Mill Wheel',     cost: { logs: 3, stones: 3 },            time: 4, vp: 7 },
  { name: 'Stone Pool',     cost: { stones: 3, clay: 2 },            time: 3, vp: 5 },
  { name: 'River Bend',     cost: { mud: 4, reeds: 1 },              time: 3, vp: 5 },
  { name: 'Granary',        cost: { reeds: 4, clay: 1 },             time: 3, vp: 5 },
  { name: 'Treaty Stone',   cost: { stones: 6 },                     time: 4, vp: 7 },
  { name: 'Royal Lodge',    cost: { logs: 6, vines: 2 },             time: 5, vp: 10 },
  { name: 'Otter Den',      cost: { mud: 3, vines: 1 },              time: 2, vp: 4 },
  { name: 'Floodgate',      cost: { mud: 4, clay: 3 },               time: 4, vp: 8 },
  { name: 'Burrow Run',     cost: { vines: 3, mud: 1 },              time: 2, vp: 4 },
  { name: 'Sap Drip',       cost: { logs: 2, vines: 2 },             time: 2, vp: 3 },
  { name: 'Granite Spire',  cost: { stones: 4, clay: 1 },            time: 3, vp: 5 },
  { name: 'Vine Ladder',    cost: { vines: 4, stones: 2 },           time: 4, vp: 7 },
  { name: 'Twig Bridge',    cost: { logs: 2, reeds: 2, mud: 1 },     time: 3, vp: 5 },
  { name: 'Stone Hearth',   cost: { stones: 3, logs: 2, clay: 1 },   time: 3, vp: 6 },
  { name: 'Hidden Cache',   cost: { vines: 2, stones: 2, clay: 2 },  time: 3, vp: 6 },
];

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
const RIVER_SLOTS = 4;
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
function canBuild(structure, workersByMat) {
  for (const m in structure.cost) {
    if ((workersByMat[m] || 0) < structure.cost[m]) return false;
  }
  return true;
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
    },
  };
}

function pickNextPlayer(state) {
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
  if (newSlot > 3) { moveCardToShoreline(state, card); return; }
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
  }
  cleanupShoreline(state);
}

// =============================================================================
// AUCTIONS
// =============================================================================
function runAuction(state, card, triggerPlayerIdx, minBidTrigger) {
  state.metrics.auctions++;
  const bids = {};
  for (const p of state.players) {
    if (p.exhausted || p.out) { bids[p.idx] = 0; continue; }
    const minBid = (p.idx === triggerPlayerIdx) ? minBidTrigger : 0;
    bids[p.idx] = aiDecideBid(state, p.idx, card, minBid);
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
      const timeAdvance = bid * cardCost(card);
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
      const timeAdvance = bid * cardCost(card);
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
  if (cardCost(card) >= 3 && target > 1) target = Math.max(1, target - 1);
  if (cardCost(card) >= 4 && target > 1) target = Math.max(1, target - 1);
  const r = Math.random();
  if (r < 0.15 && target > 0) target -= 1;
  else if (r > 0.85 && target < p.supply && target < open) target += 1;
  // Speculative bid: non-trigger AI with no current need but a hand structure
  // that uses this material may bid 1 worker on a cheap slot to add contention.
  if (
    target === 0 && minBid === 0 && SPECULATIVE_BID_PROB > 0 &&
    cardCost(card) <= 2 && p.supply > 0 &&
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
// AI: TURN DECISIONS
// =============================================================================
function aiChooseAction(state, playerIdx) {
  const p = state.players[playerIdx];
  const wbm = playerWorkersByMaterial(state, playerIdx);
  const buildables = p.hand
    .map((s, i) => ({ s, i, score: s.vp / Math.max(1, s.time), vp: s.vp }))
    .filter(o => canBuild(o.s, wbm))
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

  let bestCard = null, bestScore = -1, bestKind = null, bestPrerivIdx = -1;
  for (const c of state.riverCards) {
    if (uncoveredIcons(c) === 0) continue;
    const need = needs[c.material];
    if (need === 0) continue;
    const got = Math.min(uncoveredIcons(c), p.supply, need);
    const score = need * got - cardCost(c) * got * 0.4;
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
  if (upstreamHasAny && !upstreamHasNeeded) {
    if (state.matDeck.length === 0 || p.supply > 0) return { type: 'flush' };
  }
  if (state.structDeck.length > 0) return { type: 'browse', n: Math.min(1, state.structDeck.length) };
  return { type: 'pass' };
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
  for (const m in struct.cost) {
    let need = struct.cost[m];
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
  p.supply += Object.values(struct.cost).reduce((s, n) => s + n, 0);
  advancePlayer(state, playerIdx, struct.time);
  p.hand.splice(handIdx, 1);
  p.built.push(struct);
  state.metrics.cardsBuilt++;
  if (state.structDeck.length > 0) p.hand.push(state.structDeck.pop());
  cleanupShoreline(state);
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
    for (const s of p.hand) if (canBuild(s, wbm)) return false;
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
  // Final per-player VP tally
  const vps = state.players.map(p => p.built.reduce((s, x) => s + x.vp, 0));
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

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'spec') sweepSpec();
  else if (mode === 'rule') sweepRule();
  else if (mode === 'deck') sweepDeck(process.argv[3]);
  else if (mode === 'uniform') sweepUniform();
  else sweep();
}
