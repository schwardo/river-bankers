// Shared helper for running the sim's `emit` mode from the analysis scripts.
//
// Why this exists: the sim ablation convention is to throttle sim CPU with
// `cpulimit -l N -f -m`. But cpulimit 3.0's fork-monitor (`-m`) segfaults ~40%
// of the time when it wraps a PARENT that spawns children — e.g. wrapping
// `compare.mjs`, which itself spawns one `node sim.js emit` per player-count.
// The crash is in cpulimit, not our code, and only fires on child churn.
//
// The fix: never wrap the fork-churning parent. Instead each analysis script
// runs its sim children through this helper, which throttles each LEAF sim
// process individually (a single node process, no forks) when SIM_CPULIMIT is
// set. So the ablation-safe invocation is:
//
//   SIM_CPULIMIT=50 NAIVE_BID=1 node compare.mjs      # NOT: cpulimit -- node compare.mjs
//
// Each `sim.js emit` then runs as `cpulimit -l 50 -f -m -- node sim.js emit …`
// — one monitored process, no fork monitor race, no segfault. With
// SIM_CPULIMIT unset the sim runs unthrottled (plain node).

import { execFileSync } from 'node:child_process';

// Run `node sim.js emit <numP> <workers|''> <games>` and return parsed JSONL.
// Throttled per-child via cpulimit iff SIM_CPULIMIT (a percent) is set.
export function runSimEmit(SIM, numP, workers, games, { maxBuffer = 256 * 1024 * 1024, env = null } = {}) {
  const emitArgs = [SIM, 'emit', String(numP), workers == null ? '' : String(workers), String(games)];
  const limit = process.env.SIM_CPULIMIT;
  let bin, args;
  if (limit && Number(limit) > 0) {
    // cpulimit around a single leaf node process: -m is safe here (no fork churn).
    bin = 'cpulimit';
    args = ['-l', String(Number(limit)), '-f', '-m', '--', 'node', ...emitArgs];
  } else {
    bin = 'node';
    args = emitArgs;
  }
  const out = execFileSync(bin, args, { encoding: 'utf8', maxBuffer, env: env ? { ...process.env, ...env } : process.env });
  // cpulimit prints diagnostics like "Process <pid> detected" onto stdout, which
  // mixes with the sim's JSONL — keep only the JSON object lines.
  return out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
}
