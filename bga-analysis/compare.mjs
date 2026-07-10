// Compare real BGA games (data/games.csv) against the simulator's predictions.
//
// For each player-count present in the real data we run the sim's `emit` mode to
// get a matching distribution of simulated games, then report — per metric — the
// real mean (over real games) next to the sim mean±sd, plus the gap in sd units
// (z). |z| under ~2 means the real games look like the sim predicts; a large |z|
// flags a metric where real play diverges from the model.
//
// Sim games use the sim's default starting-worker count for that player-count
// (real RB tables don't expose a per-table worker option). Adjust SIM_GAMES for
// a tighter/looser sim baseline.
//
// Usage: node compare.mjs [simGamesPerConfig]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const SIM = path.join(HERE, '..', 'sim.js');
const SIM_GAMES = parseInt(process.argv[2]) || 3000;

// Metrics compared, in report order. All exist in both the sim `emit` output and
// the parsed real games.csv.
const METRICS = ['turns', 'auctions', 'jamAuctions', 'plentyAuctions', 'noBidAuctions',
  'noWinnerAuctions', 'cardsBuilt', 'iconsWon', 'winnerVP', 'runnerUpVP', 'loserVP',
  'vpSpread', 'winMargin', 'totalVP'];

function readCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const cols = lines[0].split(',');
  return lines.slice(1).map((ln) => {
    // Our CSV only quotes cells with commas; games.csv metric cells never do.
    const cells = ln.split(',');
    const o = {};
    cols.forEach((c, i) => { o[c] = cells[i]; });
    return o;
  });
}

const num = (v) => (v === '' || v == null ? null : Number(v));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
function std(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

function simDistribution(numP) {
  const out = execFileSync('node', [SIM, 'emit', String(numP), '', String(SIM_GAMES)],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return out.trim().split('\n').map((l) => JSON.parse(l));
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

function main() {
  const gamesFile = path.join(DATA, 'games.csv');
  if (!fs.existsSync(gamesFile)) { console.error('No data/games.csv. Run: node parse-games.mjs'); process.exit(1); }
  const games = readCsv(gamesFile);
  const byP = {};
  for (const g of games) { const p = num(g.numP); if (p) (byP[p] ??= []).push(g); }

  const md = ['# River Bankers — real BGA games vs. simulator', '',
    `Sim baseline: ${SIM_GAMES} games per player-count (default starting workers).`,
    `Real games: ${games.length} total.`, ''];
  let report = md.slice();

  for (const numP of Object.keys(byP).map(Number).sort()) {
    const real = byP[numP];
    process.stderr.write(`Simulating ${SIM_GAMES} ${numP}P games…\r`);
    const sim = simDistribution(numP);
    process.stderr.write(' '.repeat(40) + '\r');

    const header = `\n## ${numP}-player  (real n=${real.length}, sim n=${sim.length})`;
    console.log(header);
    const colHdr = pad('metric', 18) + padL('real', 10) + padL('sim', 10) + padL('sim sd', 9) + padL('z', 8);
    console.log(colHdr);
    console.log('-'.repeat(18 + 10 + 10 + 9 + 8));
    report.push(header, '', '| metric | real mean | sim mean | sim sd | z |', '|---|---:|---:|---:|---:|');

    for (const metric of METRICS) {
      const rvals = real.map((g) => num(g[metric])).filter((v) => v != null);
      const svals = sim.map((g) => Number(g[metric])).filter((v) => !Number.isNaN(v));
      if (!rvals.length || !svals.length) continue;
      const rm = mean(rvals), sm = mean(svals), ss = std(svals);
      const z = ss > 0 ? (rm - sm) / ss : 0;
      const flag = Math.abs(z) >= 2 ? '  <<' : '';
      console.log(pad(metric, 18) + padL(rm.toFixed(1), 10) + padL(sm.toFixed(1), 10) +
        padL(ss.toFixed(1), 9) + padL(z.toFixed(2), 8) + flag);
      report.push(`| ${metric} | ${rm.toFixed(1)} | ${sm.toFixed(1)} | ${ss.toFixed(1)} | ${z.toFixed(2)}${flag ? ' ⚠️' : ''} |`);
    }
  }
  console.log('\nz = (real mean − sim mean) / sim sd.  |z| ≥ 2 flagged (<<) = real play diverges from the model.');
  report.push('', '_z = (real mean − sim mean) / sim sd. |z| ≥ 2 (⚠️) = real play diverges from the model._');
  fs.writeFileSync(path.join(DATA, 'comparison.md'), report.join('\n') + '\n');
  console.log(`\nWrote data/comparison.md`);
}

main();
