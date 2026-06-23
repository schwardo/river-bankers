# River Bankers — BoardGameArena port

This directory holds the BoardGameArena (BGA) Studio implementation of
River Bankers. The BGA Studio project is named **`RiverBankers`**
(studio.boardgamearena.com).

## Framework

Built on BGA's **modern (2024+) framework**: PHP state *classes* (no
`states.inc.php`), JSON config (no `*.inc.php`), a TypeScript client that
generates HTML in JS (no `.tpl` / `.view.php`), and `#[PossibleAction]`
attributes (no Dojo).

## Workflow

- BGA Studio is the source of record for the running game; this `bga/`
  dir is the version-controlled mirror, synced to/from Studio over SFTP.
- **SFTP:** `sftp://1.studio.boardgamearena.com:2022`, remote project path
  **`/riverbankers`** (lowercase). Pull: `lftp ... mirror /riverbankers <bga/>`;
  push: `lftp ... mirror -R --only-newer <bga/> /riverbankers` with the
  dev-tooling excludes below (so `vendor/`, tests, composer, etc. don't go to
  Studio):
  `--exclude README.md --exclude dev.sh --exclude composer.json --exclude composer.lock --exclude phpstan.neon --exclude phpunit.xml --exclude-glob vendor/* --exclude-glob tests/* --exclude-glob .phpunit*`
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
