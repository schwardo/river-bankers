// Download River Bankers games from live BGA into data/raw/ (immutable cache).
//
// For each finished table we save two files:
//   data/raw/<tableId>.tableinfos.json   — players, result, per-player+table stats
//   data/raw/<tableId>.log.json          — the full public notification stream
// Finished games never change, so an existing pair is skipped (idempotent, and
// gentle on BGA). A game whose log can't be fetched (BGA sometimes gates replay
// logs) still keeps its tableinfos and is marked hasLog:false at parse time.
//
// Usage:
//   node fetch-games.mjs                 # all my finished RB tables
//   node fetch-games.mjs --only 879420758[,<id>...]   # just these tables
//   node fetch-games.mjs --refresh       # re-download even if cached

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, listMyTables, fetchTableInfos, fetchGameLog, sleep } from './bga-client.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(HERE, 'data', 'raw');

function parseArgs(argv) {
  const out = { only: null, refresh: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--refresh') out.refresh = true;
    else if (argv[i] === '--only') out.only = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const cfg = loadConfig();
  fs.mkdirSync(RAW, { recursive: true });

  let tableIds;
  if (args.only) {
    tableIds = args.only;
    console.log(`Fetching ${tableIds.length} explicitly requested table(s).`);
  } else {
    console.log(`Listing finished tables for player ${cfg.playerId}, game ${cfg.gameId}…`);
    tableIds = await listMyTables(cfg);
    console.log(`Found ${tableIds.length} finished table(s).`);
  }

  let fetched = 0, skipped = 0, logFail = 0;
  for (const id of tableIds) {
    const infoPath = path.join(RAW, `${id}.tableinfos.json`);
    const logPath = path.join(RAW, `${id}.log.json`);
    if (!args.refresh && fs.existsSync(infoPath) && fs.existsSync(logPath)) {
      skipped++;
      continue;
    }
    try {
      const info = await fetchTableInfos(cfg, id);
      fs.writeFileSync(infoPath, JSON.stringify(info, null, 2));
      await sleep(700);
      try {
        const log = await fetchGameLog(cfg, id);
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
      } catch (e) {
        logFail++;
        console.warn(`  table ${id}: log unavailable (${e.message.slice(0, 120)})`);
      }
      fetched++;
      console.log(`  table ${id}: saved.`);
      await sleep(700);
    } catch (e) {
      console.error(`  table ${id}: FAILED — ${e.message}`);
    }
  }
  console.log(`\nDone. ${fetched} fetched, ${skipped} already cached, ${logFail} without a log.`);
  console.log(`Raw files in ${path.relative(process.cwd(), RAW)}/. Next: node parse-games.mjs`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
