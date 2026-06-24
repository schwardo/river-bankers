<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * RiverBankers implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * Game.php — main game logic for River Bankers.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers;

use Bga\Games\RiverBankers\States\NextPlayer;
use Bga\Games\RiverBankers\Rules\CardMovement;

class Game extends \Bga\GameFramework\Table
{
    /** 8 worker discs per player, the same at every player count. */
    private const WORKERS_PER_PLAYER = 8;
    /** Fixed finish line on the fish track (flat for all player counts). */
    private const FISH_LINE = 90;

    /** Seat colour (from gameinfos.jsonc player_colors) -> species. */
    private const SPECIES_BY_COLOR = [
        '8b4513' => 'beaver',
        'b8362a' => 'otter',
        '4a7a3a' => 'muskrat',
        '4b2a5b' => 'mink',
    ];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Current game progression 0..100, driven by the furthest-along pawn's
     * progress toward the fish line.
     */
    public function getGameProgression()
    {
        $max = (int) $this->getUniqueValueFromDB(
            "SELECT MAX(`player_fish_pos`) FROM `player`"
        );
        return min(100, (int) floor($max * 100 / self::FISH_LINE));
    }

    public function upgradeTableDb($from_version)
    {
    }

    protected function getAllDatas(int $currentPlayerId): array
    {
        $result = [];
        // WARNING: only return info visible by $currentPlayerId (hide opponents' hands).
        $result["players"] = $this->getCollectionFromDb(
            "SELECT `player_id` AS `id`, `player_score` AS `score`, `player_species` AS `species`,
                    `player_fish_pos` AS `fish`, `player_worker_supply` AS `supply`,
                    `player_hand_limit` AS `handLimit`, `player_retired` AS `retired`
             FROM `player`"
        );

        // TODO (Phase 4): board cards, workers, blanks, this player's hand, current auction.

        return $result;
    }

    /**
     * Called once when a new game starts. Builds the initial situation:
     * players + species, the player-count-sized material deck (3 into the
     * Headwaters), the shared structure deck (3 dealt to each hand), and the
     * endgame globals.
     */
    protected function setupNewGame($players, $options = [])
    {
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        // ---- Players ------------------------------------------------------
        // Stack order: pawns start stacked on space 0 in player order with the
        // first player on top. Higher stack_order = on top = acts first.
        $query_values = [];
        $stack = count($players);
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $species = self::SPECIES_BY_COLOR[$color] ?? '';
            $query_values[] = vsprintf("('%s', '%s', '%s', '%s', %d, %d)", [
                $player_id,
                $color,
                addslashes($player["player_name"]),
                $species,
                $stack--,                       // player_stack_order
                self::WORKERS_PER_PLAYER,       // player_worker_supply
            ]);
            // player_fish_pos, player_retired, player_hand_limit take their
            // dbmodel.sql defaults (0, 0, 3).
        }
        static::DbQuery(sprintf(
            "INSERT INTO `player`
                (`player_id`, `player_color`, `player_name`, `player_species`,
                 `player_stack_order`, `player_worker_supply`)
             VALUES %s",
            implode(",", $query_values)
        ));

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        $numPlayers = count($players);

        // ---- Material deck (sized by player count) ------------------------
        // Tiers: 5- and 7-icon cards always in; 4-icon at 3+ players; 8-icon at 4.
        $matArgs = [];
        foreach (Material::$MATERIAL as $arg => $c) {
            $icons = $c['icons'];
            $include = ($icons === 5 || $icons === 7)
                || ($icons === 4 && $numPlayers >= 3)
                || ($icons === 8 && $numPlayers >= 4);
            if ($include) {
                $matArgs[] = $arg;
            }
        }
        shuffle($matArgs);

        $cardValues = [];
        // First three revealed into the Headwaters (slots 1..3); river starts empty.
        for ($slot = 1; $slot <= 3 && $matArgs; $slot++) {
            $cardValues[] = $this->cardRow('material', array_pop($matArgs), 'headwaters', $slot);
        }
        // Rest form the face-down draw pile; card_location_arg = draw order (0 = top).
        $order = 0;
        foreach ($matArgs as $arg) {
            $cardValues[] = $this->cardRow('material', $arg, 'material_deck', $order++);
        }

        // ---- Structure deck ----------------------------------------------
        $structArgs = array_keys(Material::$STRUCTURE);
        shuffle($structArgs);
        // Deal 3 face-down to each player's hand.
        foreach ($players as $player_id => $player) {
            for ($i = 0; $i < 3 && $structArgs; $i++) {
                $cardValues[] = $this->cardRow('structure', array_pop($structArgs), 'hand', (int) $player_id);
            }
        }
        // Rest form the draw pile.
        $order = 0;
        foreach ($structArgs as $arg) {
            $cardValues[] = $this->cardRow('structure', $arg, 'structure_deck', $order++);
        }

        static::DbQuery(
            "INSERT INTO `card` (`card_type`, `card_type_arg`, `card_location`, `card_location_arg`)
             VALUES " . implode(",", $cardValues)
        );

        // TODO (Phase 4): optional species-starter draft — a multiactive
        // StarterDraft state before the first turn that offers each player their
        // 3 Material::$STARTER cards for their species, builds the chosen one,
        // and boxes the other two. Symmetric base game (no starter built) for now.

        // ---- Globals & stats ---------------------------------------------
        $this->globals->set("fish_line", self::FISH_LINE);
        $this->globals->set("deck_empty", 0);

        // TODO (Phase 5): init stats here once stats.json is defined.

        // Provisional active player; NextPlayer immediately recomputes the real
        // first actor (top of the space-0 stack) via Rules\TurnOrder.
        $this->activeNextPlayer();

        return NextPlayer::class;
    }

    /** Build one VALUES tuple for the `card` insert. */
    private function cardRow(string $type, int $typeArg, string $location, int $locationArg): string
    {
        return sprintf("('%s', %d, '%s', %d)", $type, $typeArg, $location, $locationArg);
    }

    /**
     * Player rows shaped for Rules\TurnOrder::nextActor().
     *
     * @return list<array{id:int, fish:int, stack:int, retired:bool}>
     */
    public function getTurnOrderRows(): array
    {
        $rows = $this->getObjectListFromDB(
            "SELECT `player_id`, `player_fish_pos`, `player_stack_order`, `player_retired` FROM `player`"
        );
        return array_map(fn(array $r) => [
            'id' => (int) $r['player_id'],
            'fish' => (int) $r['player_fish_pos'],
            'stack' => (int) $r['player_stack_order'],
            'retired' => (bool) (int) $r['player_retired'],
        ], $rows);
    }

    /**
     * Player with a pending bonus turn (e.g. Royal Lodge's extra turn), or null.
     * Stored in the global key/value store; consumed once by NextPlayer.
     */
    public function getBonusTurnPlayer(): ?int
    {
        $v = (int) $this->globals->get("bonus_turn_player", 0);
        return $v > 0 ? $v : null;
    }

    public function clearBonusTurnPlayer(): void
    {
        $this->globals->set("bonus_turn_player", 0);
    }

    // =====================================================================
    // Board-model helpers (Phase 4) used by the Auction / ResolveAuction states.
    // These touch the DB; their first real validation is in Studio.
    // =====================================================================

    /** @return array<string,?string> the card row */
    public function getCardRow(int $cardId): array
    {
        return $this->getNonEmptyObjectFromDB("SELECT * FROM `card` WHERE `card_id` = $cardId");
    }

    /** Printed icon count of a material card (0 for non-material cards). */
    public function iconCount(int $cardId): int
    {
        $row = $this->getCardRow($cardId);
        if ($row['card_type'] !== 'material') {
            return 0;
        }
        return (int) (Material::$MATERIAL[(int) $row['card_type_arg']]['icons'] ?? 0);
    }

    /** Uncovered icons on a card = printed icons - workers on it - blanks. */
    public function uncoveredIcons(int $cardId): int
    {
        $workers = (int) $this->getUniqueValueFromDB(
            "SELECT COALESCE(SUM(`workers`), 0) FROM `worker` WHERE `card_id` = $cardId"
        );
        $blanks = (int) $this->getUniqueValueFromDB(
            "SELECT `card_blanks` FROM `card` WHERE `card_id` = $cardId"
        );
        return max(0, $this->iconCount($cardId) - $workers - $blanks);
    }

    public function getPlayerSupply(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT `player_worker_supply` FROM `player` WHERE `player_id` = $playerId"
        );
    }

    /**
     * Advance a pawn on the fish track by $by (the game's "spend"). Moving onto a
     * space also puts the pawn on top of the stack (highest stack order), so the
     * turn-order tiebreak stays correct.
     */
    public function advanceFish(int $playerId, int $by): void
    {
        if ($by <= 0) {
            return;
        }
        $top = (int) $this->getUniqueValueFromDB("SELECT MAX(`player_stack_order`) FROM `player`") + 1;
        $this->DbQuery(
            "UPDATE `player`
             SET `player_fish_pos` = `player_fish_pos` + $by, `player_stack_order` = $top
             WHERE `player_id` = $playerId"
        );
    }

    /** Place $n of a player's workers from supply onto a card. */
    public function placeWorkers(int $playerId, int $cardId, int $n): void
    {
        if ($n <= 0) {
            return;
        }
        $this->DbQuery(
            "INSERT INTO `worker` (`player_id`, `card_id`, `workers`) VALUES ($playerId, $cardId, $n)
             ON DUPLICATE KEY UPDATE `workers` = `workers` + $n"
        );
        $this->DbQuery(
            "UPDATE `player` SET `player_worker_supply` = `player_worker_supply` - $n WHERE `player_id` = $playerId"
        );
    }

    /** Slide/graduate the auctioned card per the universal movement rule. */
    public function moveCardAfterAuction(int $cardId, int $uncoveredAfter): void
    {
        $row = $this->getCardRow($cardId);
        $dest = CardMovement::destination((string) $row['card_location'], (int) $row['card_location_arg'], $uncoveredAfter);
        $this->DbQuery(
            "UPDATE `card` SET `card_location` = '{$dest['location']}', `card_location_arg` = {$dest['slot']}
             WHERE `card_id` = $cardId"
        );
    }

    /** River cards with at least one uncovered icon (legal Auction-action targets). */
    public function getAuctionableRiverCards(): array
    {
        $ids = $this->getObjectListFromDB("SELECT `card_id` FROM `card` WHERE `card_location` = 'river'", true);
        $out = [];
        foreach ($ids as $id) {
            if ($this->uncoveredIcons((int) $id) > 0) {
                $out[] = (int) $id;
            }
        }
        return $out;
    }

    // --- auction lifecycle ---

    public function startAuction(int $lotCardId, int $triggerPlayer, ?int $forcedRate = null): void
    {
        $rate = $forcedRate === null ? 'NULL' : (string) $forcedRate;
        $this->DbQuery(
            "INSERT INTO `auction` (`lot_card_id`, `trigger_player`, `forced_rate`)
             VALUES ($lotCardId, $triggerPlayer, $rate)"
        );
    }

    /** @return array<string,?string> the single open auction row */
    public function getOpenAuction(): array
    {
        return $this->getNonEmptyObjectFromDB("SELECT * FROM `auction` ORDER BY `auction_id` DESC LIMIT 1");
    }

    public function recordBid(int $auctionId, int $playerId, int $workers): void
    {
        $this->DbQuery(
            "INSERT INTO `auction_bid` (`auction_id`, `player_id`, `workers_bid`) VALUES ($auctionId, $playerId, $workers)"
        );
    }

    /** @return array<int,int> player_id => workers bid */
    public function getAuctionBids(int $auctionId): array
    {
        return array_map('intval', $this->getCollectionFromDB(
            "SELECT `player_id`, `workers_bid` FROM `auction_bid` WHERE `auction_id` = $auctionId",
            true
        ));
    }

    public function clearAuction(int $auctionId): void
    {
        $this->DbQuery("DELETE FROM `auction_bid` WHERE `auction_id` = $auctionId");
        $this->DbQuery("DELETE FROM `auction` WHERE `auction_id` = $auctionId");
    }

    public function debug_goToState(int $state = 3)
    {
        $this->gamestate->jumpToState($state);
    }

    public function debug_playOneMove()
    {
        $this->bga->debug->playUntil(fn(int $count) => $count == 1);
    }
}
