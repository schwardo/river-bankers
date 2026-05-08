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
const MATERIALS = {
  logs:   {}, stones: {}, reeds:  {}, mud: {}, fish: {},
};
const MAT_KEYS = Object.keys(MATERIALS);

const STRUCTURE_TEMPLATES = [
  { name: 'Beaver Dam',     cost: { logs: 4, mud: 2 },               time: 3, vp: 6 },
  { name: 'Lodge',          cost: { logs: 3, reeds: 1 },             time: 2, vp: 4 },
  { name: 'Fish Trap',      cost: { reeds: 2, stones: 1 },           time: 2, vp: 3 },
  { name: 'Stone Bridge',   cost: { stones: 4, logs: 2 },            time: 4, vp: 8 },
  { name: 'Reed Hut',       cost: { reeds: 3, mud: 1 },              time: 2, vp: 4 },
  { name: 'Mud Levee',      cost: { mud: 3, stones: 2 },             time: 3, vp: 5 },
  { name: 'Otter Slide',    cost: { mud: 2, logs: 1 },               time: 1, vp: 2 },
  { name: 'Mink Burrow',    cost: { mud: 2, reeds: 2 },              time: 2, vp: 4 },
  { name: 'Spawning Pool',  cost: { fish: 3, reeds: 2 },             time: 3, vp: 5 },
  { name: 'Smokehouse',     cost: { fish: 4, logs: 2 },              time: 3, vp: 7 },
  { name: 'Watchtower',     cost: { logs: 5, stones: 2 },            time: 4, vp: 8 },
  { name: 'Pier',           cost: { logs: 3, stones: 2 },            time: 3, vp: 5 },
  { name: 'Cattail Patch',  cost: { reeds: 4, mud: 2 },              time: 3, vp: 6 },
  { name: 'Stone Cairn',    cost: { stones: 5 },                     time: 3, vp: 5 },
  { name: 'Wood Pile',      cost: { logs: 4 },                       time: 2, vp: 3 },
  { name: 'Heron Roost',    cost: { reeds: 3, fish: 2 },             time: 3, vp: 5 },
  { name: 'Boat Dock',      cost: { logs: 4, reeds: 1 },             time: 3, vp: 5 },
  { name: 'Mill Wheel',     cost: { logs: 3, stones: 3 },            time: 4, vp: 7 },
  { name: 'Tide Pool',      cost: { stones: 3, fish: 2 },            time: 3, vp: 5 },
  { name: 'River Bend',     cost: { mud: 4, reeds: 1 },              time: 3, vp: 5 },
  { name: 'Granary',        cost: { reeds: 4, stones: 1 },           time: 3, vp: 5 },
  { name: 'Treaty Stone',   cost: { stones: 6 },                     time: 4, vp: 7 },
  { name: 'Royal Lodge',    cost: { logs: 6, reeds: 2 },             time: 5, vp: 10 },
  { name: 'Otter Den',      cost: { mud: 3, fish: 1 },               time: 2, vp: 4 },
  { name: 'Floodgate',      cost: { mud: 4, stones: 3 },             time: 4, vp: 8 },
  { name: 'Trout Run',      cost: { fish: 3, mud: 1 },               time: 2, vp: 4 },
  { name: 'Sap Drip',       cost: { logs: 2, reeds: 2 },             time: 2, vp: 3 },
  { name: 'Granite Spire',  cost: { stones: 4, mud: 1 },             time: 3, vp: 5 },
  { name: 'Salmon Ladder',  cost: { fish: 4, stones: 2 },            time: 4, vp: 7 },
  { name: 'Twig Bridge',    cost: { logs: 2, reeds: 2, mud: 1 },     time: 3, vp: 5 },
  { name: 'Stone Hearth',   cost: { stones: 3, logs: 2, fish: 1 },   time: 3, vp: 6 },
  { name: 'Pearl Cache',    cost: { fish: 2, stones: 2, mud: 2 },    time: 3, vp: 6 },
];

const PRERIV_SLOTS = 3;
const RIVER_SLOTS = 4;
const LAP_LENGTH = 60;
const ENDGAME_TRACK_END = 59;
const UPSTREAM_AUCTION_COST = 1;
const MAX_TURNS = 2000; // safety net

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

function buildMaterialDeck(iconCounts) {
  const deck = [];
  let id = 0;
  for (const m of MAT_KEYS) {
    for (const icons of iconCounts) {
      deck.push({
        id: 'm' + (id++),
        material: m,
        totalIcons: icons,
        slot: null,
        workers: {},
        blanks: 0,
      });
    }
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
function newGame(numPlayers, iconCounts) {
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      idx: i,
      supply: 8,
      timePos: 0,
      hand: [],
      built: [],
      exhausted: false,
      out: false,
    });
  }
  const matDeck = buildMaterialDeck(iconCounts);
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
    const idx = prerivIndexOf(state, card);
    if (idx !== -1) refillPreriv(state, idx);
  } else {
    state.riverCards = state.riverCards.filter(c => c !== card);
  }
  card.slot = 'shore';
  state.shorelineCards.push(card);
}
function jamCardDownriver(state, card) {
  if (card.slot === 'pre') {
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
    }
    moveCardToShoreline(state, card);
  } else {
    state.metrics.jamAuctions++;
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
    }
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
function runGame(numPlayers, iconCounts) {
  const state = newGame(numPlayers, iconCounts);
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
  // Two icon-distribution profiles, each tested at 4..8 cards per material.
  // Keeps profile averages roughly constant; only the deck size varies.
  const profiles = {
    baseline: { // avg ~5.0
      8: [3,4,4,5,5,6,6,7],
      7: [3,4,5,5,5,6,7],
      6: [4,4,5,5,6,6],
      5: [4,4,5,5,6],
      4: [4,5,5,6],
    },
    'wider-3-8': { // avg ~5.5
      8: [3,4,5,5,6,6,7,8],
      7: [4,5,5,6,6,7,8],
      6: [4,5,6,6,7,8],
      5: [4,5,6,7,8],
      4: [5,6,6,7],
    },
  };
  const numP = 3;
  const N = 400;

  console.log(`\nRiver Bankers deck-size sweep (${numP} players, ${N} games per config)\n`);
  console.log(pad('profile', 11) + pad('cards/mat', 11) + pad(' icons', 26) + padL('totIc', 6) + padL('turns', 7) + padL('aucs', 6) + padL('jam%', 7) + padL('plt%', 7) + padL('nob%', 7) + padL('wstIc', 7) + padL('wst%', 7) + padL('built', 7) + padL('endg%', 7));
  console.log('-'.repeat(11+11+26+6+7+6+7+7+7+7+7+7+7));

  for (const profileName of Object.keys(profiles)) {
    for (const cardsPerMat of [8, 7, 6, 5, 4]) {
      const icons = profiles[profileName][cardsPerMat];
      const totIcons = icons.reduce((s, x) => s + x, 0) * MAT_KEYS.length;
      const trials = [];
      for (let t = 0; t < N; t++) trials.push(runGame(numP, icons));
      const turns = avg(trials.map(m => m.turns));
      const auctions = avg(trials.map(m => m.auctions));
      const jamPct = avg(trials.map(m => pct(m.jamAuctions, m.auctions)));
      const pltPct = avg(trials.map(m => pct(m.plentyAuctions, m.auctions)));
      const nobPct = avg(trials.map(m => pct(m.noBidAuctions, m.auctions)));
      const wasted = avg(trials.map(m => m.iconsWastedToShore));
      const wstPct = avg(trials.map(m => pct(m.iconsWastedToShore, m.iconsSpawned)));
      const built = avg(trials.map(m => m.cardsBuilt));
      const endg = avg(trials.map(m => m.endgameTriggered ? 100 : 0));
      console.log(
        pad(profileName, 11) +
        pad(`${cardsPerMat} (${cardsPerMat * MAT_KEYS.length} total)`, 11) +
        pad(' [' + icons.join(',') + ']', 26) +
        padL(totIcons, 6) +
        padL(turns.toFixed(0), 7) +
        padL(auctions.toFixed(1), 6) +
        padL(jamPct.toFixed(1), 7) +
        padL(pltPct.toFixed(1), 7) +
        padL(nobPct.toFixed(1), 7) +
        padL(wasted.toFixed(1), 7) +
        padL(wstPct.toFixed(1) + '%', 7) +
        padL(built.toFixed(1), 7) +
        padL(endg.toFixed(0) + '%', 7)
      );
    }
    console.log();
  }
  console.log('Legend:');
  console.log('  totIc  = total icons in deck (icons sum × 5 materials)');
  console.log('  turns  = avg total player-turns per game');
  console.log('  aucs   = avg auctions per game');
  console.log('  jam%   = % of auctions where total bid > open icons');
  console.log('  plt%   = % of auctions resolved without jam (and any positive bid)');
  console.log('  nob%   = % of auctions with no bids');
  console.log('  wstIc  = avg icons wasted (left uncovered when card hit shoreline)');
  console.log('  wst%   = wasted icons as % of total icons spawned');
  console.log('  built  = avg structures built across all players');
  console.log('  endg%  = % of games that triggered endgame (deck emptied)\n');
}

if (require.main === module) sweep();
