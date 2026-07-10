// Thin authenticated HTTP client for boardgamearena.com (live site).
//
// BGA has no public API; these are the internal endpoints its own web client
// calls. We authenticate with a pasted session cookie (see config.example.json)
// and, where required, the X-Request-Token header. Everything here is GET-only
// and read-only — we never mutate anything on BGA.
//
// Endpoints (paths are relative to config.baseUrl):
//   - gamestats/gamestats/getGames.html   → list a player's finished tables for a game
//   - table/table/tableinfos.html         → one table's players, result, stats, options
//   - archive/archive/logs.html           → the full public notification log (replay stream)
//
// These exact paths / response envelopes are the documented BGA-internal ones as
// of 2026; if BGA has changed them, adjust here (one place) — fetch/parse/compare
// all go through this module. Verify against a known finished table before a bulk
// run (see fetch-games.mjs --only <tableId>).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function loadConfig() {
  const p = path.join(HERE, 'config.json');
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}. Copy config.example.json to config.json and fill it in.`);
  }
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!cfg.cookie || cfg.cookie.includes('PASTE_')) throw new Error('config.json: set `cookie` to your logged-in BGA Cookie header.');
  if (!cfg.playerId) throw new Error('config.json: set `playerId` to your numeric BGA id.');
  if (!cfg.gameId) throw new Error('config.json: set `gameId` to River Bankers\' numeric game id.');
  cfg.baseUrl = (cfg.baseUrl || 'https://boardgamearena.com').replace(/\/$/, '');
  return cfg;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Low-level GET returning parsed JSON. BGA's XHR endpoints answer with either a
// JSON body or an HTML error page (when the cookie is stale) — we detect the
// latter and give a clear message instead of a JSON.parse blowup.
export async function getJson(cfg, relPath, params = {}) {
  const url = new URL(cfg.baseUrl + relPath);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const headers = {
    'Cookie': cfg.cookie,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (river-bankers-analysis)',
  };
  if (cfg.requestToken) headers['X-Request-Token'] = cfg.requestToken;

  const res = await fetch(url, { headers });
  const body = await res.text();
  if (res.status === 403 || /login|You are not logged/i.test(body.slice(0, 400))) {
    throw new Error(`Auth failed (HTTP ${res.status}) for ${url.pathname} — refresh your cookie in config.json.`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.pathname}${url.search}: ${body.slice(0, 200)}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Non-JSON response for ${url.pathname}${url.search} (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }
}

// List the caller's finished tables for the configured game. BGA paginates; we
// walk pages until a short/empty page. Returns an array of table summaries
// ({ table_id, players, start, ... } — exact fields vary; we only rely on the id).
export async function listMyTables(cfg, { pageSize = 100, maxPages = 100 } = {}) {
  const ids = [];
  for (let page = 0; page < maxPages; page++) {
    const data = await getJson(cfg, '/gamestats/gamestats/getGames.html', {
      player: cfg.playerId,
      game_id: cfg.gameId,
      finished: 1,
      start: page * pageSize,
    });
    // BGA wraps payloads as { status, data: {...} }. The table list lives under
    // data.tables (a map or array depending on endpoint version).
    const tablesRaw = data?.data?.tables ?? data?.data?.games ?? data?.tables ?? [];
    const rows = Array.isArray(tablesRaw) ? tablesRaw : Object.values(tablesRaw);
    if (!rows.length) break;
    for (const r of rows) {
      const id = r.table_id ?? r.id ?? r.table;
      if (id != null) ids.push(String(id));
    }
    if (rows.length < pageSize) break;
    await sleep(600);
  }
  return [...new Set(ids)];
}

export async function fetchTableInfos(cfg, tableId) {
  return getJson(cfg, '/table/table/tableinfos.html', { id: tableId });
}

// The full public notification log (the replay event stream). BGA returns the
// packets under data.data (an array of { channel, table_id, packet_type,
// packet_id, move_id, time, data: [ { type, args, ... } ] } entries).
export async function fetchGameLog(cfg, tableId) {
  return getJson(cfg, '/archive/archive/logs.html', { table: tableId, translated: 'true' });
}
