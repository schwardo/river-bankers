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
- The implementation checklist lives in the repo's
  `games/board-games.org` under
  *River Bankers → BoardGameArena multiplayer implementation →
  Implementation checklist (BGA Studio)*.
- Game rules logic is ported from `../sim.js` and `../web/index.html`;
  card metadata is generated from `../graphics/*/cards.json`.
- Sprite assets come from the card-image / playmat-image art pipeline —
  do not draft fresh art for BGA.
