# River Bankers — BoardGameArena port

This directory holds the BoardGameArena (BGA) Studio implementation of
River Bankers. The BGA Studio project is named **`RiverBankers`**
(studio.boardgamearena.com).

## Framework

Built on BGA's **modern (2024+) framework**: PHP state *classes* (no
`states.inc.php`), JSON config (no `*.inc.php`), a TypeScript client that
generates HTML in JS (no `.tpl` / `.view.php`), and `#[PossibleAction]`
attributes (no Dojo).

## Client: hand-edited, no build step on BGA

The client is `modules/js/Game.js` (one self-contained ES module — all 27 classes
inline) + `riverbankers.css`, **edited by hand**. BGA **serves these directly** in
dev and **terser-minifies them directly** for production ("Use minified JS/CSS") —
it does **not** build them from `src/`. The skeleton's rollup/sass/TS toolchain
(`src/`, `package.json`, `rollup.config.mjs`, `tsconfig.json`, `node_modules/`) is
**vestigial and unused**; it stays local and is **not** deployed.

The real production gotcha is **version control, not a build**: BGA's project is
under **SVN**, and "test minified" runs on the **committed** snapshot — not the
SFTP working copy. So the order is **deploy (SFTP) → "Commit my modifications now"
on the Manage-game page → test minified**. Skipping the commit minifies the
previously-committed code (e.g. the skeleton → the dummy template), which cost us a
long debugging session [2026-06-30].

## Workflow

- BGA Studio is the source of record for the running game; this `bga/`
  dir is the version-controlled mirror, synced to/from Studio over SFTP.
- **SFTP:** `sftp://1.studio.boardgamearena.com:2022`, remote project path
  **`/riverbankers`** (lowercase). Pull: `lftp ... mirror /riverbankers <bga/>`;
  push: **use `games/river-bankers-bga-deploy.sh`** (parent repo) — it regenerates
  `src/`, then `lftp ... mirror -R <bga/> /riverbankers` with the dev-tooling +
  node excludes (so `vendor/`, tests, composer, `node_modules/`, `package-lock.json`
  don't go to Studio). The build config (`package.json`, `rollup.config.mjs`,
  `tsconfig.json`) and a fresh `src/` **are** shipped — BGA needs them to build.
  - ⚠️ **Never add `--only-newer`** to the push. BGA stamps freshly-(re)created
    template files with the *current* time, so `--only-newer` decides your local
    files are "older" and silently **skips** them — the table then loads BGA's
    dummy client (`"Player zone content goes here"`). Always push a full mirror.
    The wrapper `games/river-bankers-bga-deploy.sh` (in the parent repo) does this.
- The implementation checklist lives in the repo's
  `games/board-games.org` under
  *River Bankers → BoardGameArena multiplayer implementation →
  Implementation checklist (BGA Studio)*.
- Game rules logic is ported from `../sim.js` and `../web/index.html`;
  card metadata is generated from `../graphics/*/cards.json`.
- Sprite assets come from the card-image / playmat-image art pipeline —
  do not draft fresh art for BGA.

## Dev tooling (lint + tests) — local only, not deployed

One-time: `sudo apt install php-cli composer unzip`, then `composer install`
(in `bga/`). After that, **`./dev.sh`** runs the whole loop: regenerate the
auction fixture from the `sim.js` oracle, `php -l` syntax check, **PHPStan**
static analysis (level 5, using `_ide_helper.php` for framework symbols — this
catches undefined-method/property bugs), and **PHPUnit**.

- **PHPStan** (`phpstan.neon`) analyses `modules/php` against the bundled
  `_ide_helper.php` stub of the BGA framework.
- **PHPUnit** (`phpunit.xml`, `tests/`) tests the *pure, framework-independent*
  rules in `modules/php/Rules/` (e.g. `Auction.php`). Phase-4 rule logic should
  live there as plain-data-in/out helpers so it can be unit-tested and
  **cross-checked against `sim.js`**: `tests/oracle/gen_auction_vectors.js`
  copies sim.js's formula verbatim and emits 500 vectors into
  `tests/fixtures/`, which `AuctionTest` asserts the PHP reproduces.
- `vendor/`, the fixture cache, and `composer.lock` are gitignored.
