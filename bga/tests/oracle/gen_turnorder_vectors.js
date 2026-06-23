#!/usr/bin/env node
// Oracle for the PHP TurnOrder resolver (bga/modules/php/Rules/TurnOrder.php).
//
// pick() below mirrors sim.js pickNextPlayer (~line 1124) in its NON-exhaustion
// form (we generate no lapping/exhaustion cases — that refinement isn't ported
// yet). sim represents the stack as an ARRAY (position 0 = top); the PHP uses a
// numeric stack where HIGHER = top, so we emit stack = N - stackPosition. Both
// must pick the same player. Deterministic (seeded PRNG) => stable fixture.
//
//   node gen_turnorder_vectors.js > ../fixtures/turnorder_vectors.json

// --- sim.js pickNextPlayer (verbatim core, no exhaustion) ------------------
function pick(players, stackOrder, bonus) {
  if (bonus !== null) {
    const pb = players.find((p) => p.id === bonus);
    if (pb && !pb.retired) return bonus;
  }
  let lowest = Infinity;
  for (const p of players) { if (!p.retired) lowest = Math.min(lowest, p.fish); }
  if (lowest === Infinity) return null;
  for (const id of stackOrder) {                 // stackOrder[0] = top of stack
    const p = players.find((x) => x.id === id);
    if (p.retired) continue;
    if (p.fish === lowest) return id;
  }
  return null;
}

// --- deterministic PRNG (LCG) ----------------------------------------------
let seed = 0x51ace0de;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function ri(n) { return Math.floor(rnd() * n); }
function shuffled(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const vectors = [];
for (let v = 0; v < 400; v++) {
  const n = 2 + ri(3);                            // 2..4 players, ids 0..n-1
  const players = [];
  for (let id = 0; id < n; id++) {
    players.push({ id, fish: ri(40), retired: rnd() < 0.2 });
  }
  const stackOrder = shuffled(players.map((p) => p.id)); // index 0 = top
  const bonus = rnd() < 0.2 ? ri(n) : null;
  const expected = pick(players, stackOrder, bonus);

  // PHP form: numeric stack, higher = top (position 0 -> n).
  const phpPlayers = players.map((p) => ({
    id: p.id, fish: p.fish, retired: p.retired,
    stack: n - stackOrder.indexOf(p.id),
  }));
  vectors.push({ players: phpPlayers, bonus, expected });
}
process.stdout.write(JSON.stringify(vectors));
