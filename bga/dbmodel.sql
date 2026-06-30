
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- RiverBankers implementation : © <Your name here> <Your email address here>
--
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- River Bankers database schema.
-- Standard tables ("global", "stats", "gamelog", "player") already exist and
-- must NOT be recreated here. The schema is (re)built from this file whenever a
-- new game starts. Field names mirror the canonical sim model in ../sim.js.

-- =====================================================================
-- card: all three decks (material, structure, starter) in one Deck-managed
-- table. The specific card template (icons / cost / effect / vp) is keyed by
-- card_type + card_type_arg and resolved against constants in Material.php.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `card` (
  `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- which deck the card belongs to: 'material' | 'structure' | 'starter'
  `card_type` VARCHAR(16) NOT NULL,
  -- template index within that deck (FK to the Material.php definitions)
  `card_type_arg` INT NOT NULL DEFAULT 0,
  -- where the card currently is:
  --   material_deck | structure_deck   (face-down draw piles)
  --   headwaters | river               (face-up on the board; *_arg = slot index)
  --   hand | built                     (*_arg = owning player_id)
  --   shoreline | discard
  -- NB: there is no structure market — structures go deck -> hand -> built/discard.
  `card_location` VARCHAR(16) NOT NULL,
  -- Meaning depends on location:
  --   river slot (1-4) / headwaters slot (1-3); owning player_id for hand/built;
  --   AND for draw piles (material_deck / structure_deck) this carries the
  --   top-of-deck ORDER, so order-sensitive effects (Stone Pool, Vine Curtain,
  --   Clay Vault peek/rearrange) can read and rewrite it.
  `card_location_arg` INT NOT NULL DEFAULT 0,
  -- Blank chits sitting on this material card's vacated icons. uncovered icons =
  -- template icon count - (workers on card) - card_blanks. The shared blank pool
  -- is finite (41 chits): placed = SUM(card_blanks), pool remaining = 41 - placed.
  `card_blanks` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  -- Once-per-game spent flag for a BUILT structure: 1 = ability used (card
  -- flipped). Reset to 0 by Springwater Pool (all of yours) / Spring Cascade (one).
  `card_used` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`card_id`),
  KEY `location` (`card_location`, `card_location_arg`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

-- =====================================================================
-- worker: COUNT of a player's workers on a given card. Workers have no
-- individual identity in River Bankers — every rule operates on "how many of
-- your workers are on card X" (sim.js: card.workers[idx]), so we store one row
-- per (player, card) with a count rather than one row per chit. Workers NOT on
-- a card are in the player's supply (player.player_worker_supply); blanks are
-- tracked per-card on card.card_blanks, not here.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `worker` (
  `player_id` INT UNSIGNED NOT NULL,
  `card_id` INT UNSIGNED NOT NULL,
  `workers` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`player_id`, `card_id`),
  KEY `card_id` (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Per-player state (extends the standard "player" table).
-- NB: VP uses the framework's standard score counter, and the tie-breaker uses
-- the standard score-aux counter (= -(player_fish_pos): furthest back on the
-- track wins ties) — neither column is added here.
-- =====================================================================
-- ABSOLUTE position on the fish track (may exceed 59 — this is the running total
-- across laps, not the 0-59 space; the physical "+60 flip" is just a readability
-- aid). This is the game's money AND its turn-order key: "spending fish" =
-- advancing this value; the LOWEST value acts next. (sim.js: player.timePos)
ALTER TABLE `player` ADD `player_fish_pos` SMALLINT UNSIGNED NOT NULL DEFAULT 0;
-- Stack order for breaking turn-order ties between pawns on the SAME fish total:
-- a monotonic counter bumped each time the pawn moves onto its space; the HIGHEST
-- value is "on top of the stack" and acts first (a pawn moving onto a space
-- stacks on top). Set in player order at setup (first player on top).
ALTER TABLE `player` ADD `player_stack_order` INT UNSIGNED NOT NULL DEFAULT 0;
-- 1 once this player has retired (pawn crossed the 90 fish-line): takes no more
-- turns and bids 0 in remaining auctions. Excluded from turn-order selection.
ALTER TABLE `player` ADD `player_retired` TINYINT UNSIGNED NOT NULL DEFAULT 0;
-- beaver | otter | muskrat | mink (fixed by seat; drives starter + player colour)
ALTER TABLE `player` ADD `player_species` VARCHAR(8) NOT NULL DEFAULT '';
-- Workers in the player's supply (pool) only — NOT counting on-card workers,
-- which live in the `worker` count table. (sim.js: player.supply)
ALTER TABLE `player` ADD `player_worker_supply` TINYINT UNSIGNED NOT NULL DEFAULT 0;
-- structure-card hand-size cap (base 3; raised by Cache Burrow / Beaver Cache)
ALTER TABLE `player` ADD `player_hand_limit` TINYINT UNSIGNED NOT NULL DEFAULT 3;

-- =====================================================================
-- auction: the currently-running auction. One open lot at a time; lot_card_id2
-- is non-NULL only for combined two-card auctions (e.g. Confluence).
--
-- This is NOT a single-winner high-bid auction. Each player simultaneously
-- submits a sealed bid = a COUNT OF WORKERS. At resolution (sim.js
-- resolveAuction) the card's `open` uncovered icons are distributed:
--   * plenty (sum of bids <= open): every bidder places their full bid;
--   * jam   (sum of bids >  open): icons are rationed —
--       got = max(0, min(bid, open - others)) — so SEVERAL players each
--       clinch some icons. There is no high bidder and no single winner.
-- Each bidder then pays (workers_placed x per-item fish cost) by advancing on
-- the fish track; the per-item cost is per-player (card slot + effects like
-- Kelp Bed), so it is computed at resolution, not stored here.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `auction` (
  `auction_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lot_card_id` INT UNSIGNED NOT NULL,
  `lot_card_id2` INT UNSIGNED NULL,
  `trigger_player` INT UNSIGNED NOT NULL,
  -- forced per-item fish rate when an effect overrides the slot-derived cost
  -- (e.g. Snag Pile auctions at 1/item); NULL = derive from card slot per player
  `forced_rate` TINYINT UNSIGNED NULL,
  PRIMARY KEY (`auction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

-- One row per player participating in the open auction. `workers_bid` is the
-- sealed number of workers committed; `workers_clinched` is filled in at
-- resolution (may be < workers_bid in a jam). 'deferred' status covers the
-- Spy Mound / Quick Strike "declare your bid after others are revealed" gate;
-- 'passed' is an explicit no-bid.
CREATE TABLE IF NOT EXISTS `auction_bid` (
  `auction_id` INT UNSIGNED NOT NULL,
  `player_id` INT UNSIGNED NOT NULL,
  `workers_bid` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `workers_clinched` TINYINT UNSIGNED NULL,
  `status` VARCHAR(8) NOT NULL DEFAULT 'in',
  PRIMARY KEY (`auction_id`, `player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Global scalar state is NOT modelled here. In the modern framework it lives in
-- BGA's key/value "global" store, declared via gameStateLabels and seeded in
-- Game::setupNewGame():
--   * material-deck remaining   -> implicit (COUNT of card_location='material_deck')
--   * deck_empty flag           -> global, enables the +1 fish/turn end drift
--   * fish_line (endgame)        -> global, constant 90 (flat finish line)
-- =====================================================================
