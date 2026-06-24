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
use Bga\Games\RiverBankers\Rules\Build;
use Bga\Games\RiverBankers\Rules\CardMovement;
use Bga\Games\RiverBankers\Rules\Endgame;
use Bga\Games\RiverBankers\Rules\Scoring;

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
        $result["fishLine"] = (int) $this->globals->get("fish_line", self::FISH_LINE);
        $result["board"] = $this->getBoardView();
        $result["built"] = $this->getBuiltViewAll();
        $result["materials"] = $this->getMaterialsAll();
        $result["hand"] = $this->getHandView($currentPlayerId); // private: only this player's hand

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

    // --- Headwaters ---

    /** Card ids currently in the Headwaters (any slot). */
    public function getHeadwatersCards(): array
    {
        return array_map('intval', $this->getObjectListFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'headwaters'",
            true
        ));
    }

    public function getMaterialDeckCount(): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT COUNT(*) FROM `card` WHERE `card_location` = 'material_deck'"
        );
    }

    /**
     * Refill the Headwaters after a card vacated $vacatedSlot: cards in higher
     * slots advance one toward the river, then the top of the material deck
     * enters the now-empty Headwaters 3 (if any cards remain).
     */
    public function refillHeadwaters(int $vacatedSlot): void
    {
        for ($s = $vacatedSlot + 1; $s <= 3; $s++) {
            $this->DbQuery(
                "UPDATE `card` SET `card_location_arg` = " . ($s - 1) . "
                 WHERE `card_location` = 'headwaters' AND `card_location_arg` = $s"
            );
        }
        $top = $this->getUniqueValueFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'material_deck' ORDER BY `card_location_arg` LIMIT 1"
        );
        if ($top !== null) {
            $this->DbQuery(
                "UPDATE `card` SET `card_location` = 'headwaters', `card_location_arg` = 3 WHERE `card_id` = " . (int) $top
            );
        }
    }

    // --- structure hand / deck ---

    /** Structure card ids in a player's hand. */
    public function getPlayerHand(int $playerId): array
    {
        return array_map('intval', $this->getObjectListFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'hand' AND `card_location_arg` = $playerId",
            true
        ));
    }

    public function getHandLimit(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT `player_hand_limit` FROM `player` WHERE `player_id` = $playerId"
        );
    }

    /** Draw up to $n structure cards from the deck into a player's hand (reshuffles the discard if needed). */
    public function drawStructures(int $playerId, int $n): int
    {
        $drawn = 0;
        for ($i = 0; $i < $n; $i++) {
            $top = $this->topOfStructureDeck();
            if ($top === null) {
                $this->reshuffleStructureDiscard();
                $top = $this->topOfStructureDeck();
                if ($top === null) {
                    break; // no structures anywhere
                }
            }
            $this->DbQuery(
                "UPDATE `card` SET `card_location` = 'hand', `card_location_arg` = $playerId WHERE `card_id` = $top"
            );
            $drawn++;
        }
        return $drawn;
    }

    private function topOfStructureDeck(): ?int
    {
        $top = $this->getUniqueValueFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'structure_deck' ORDER BY `card_location_arg` LIMIT 1"
        );
        return $top === null ? null : (int) $top;
    }

    private function reshuffleStructureDiscard(): void
    {
        $ids = array_map('intval', $this->getObjectListFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'discard' AND `card_type` = 'structure'",
            true
        ));
        shuffle($ids);
        $order = 0;
        foreach ($ids as $id) {
            $this->DbQuery(
                "UPDATE `card` SET `card_location` = 'structure_deck', `card_location_arg` = " . ($order++) . " WHERE `card_id` = $id"
            );
        }
    }

    /** @param list<int> $ids */
    public function discardStructures(array $ids): void
    {
        foreach ($ids as $id) {
            $this->DbQuery(
                "UPDATE `card` SET `card_location` = 'discard', `card_location_arg` = 0 WHERE `card_id` = " . (int) $id
            );
        }
    }

    /** Top a player's hand back up to their hand size. */
    public function refillHand(int $playerId): void
    {
        $deficit = $this->getHandLimit($playerId) - count($this->getPlayerHand($playerId));
        if ($deficit > 0) {
            $this->drawStructures($playerId, $deficit);
        }
    }

    // --- build ---

    /**
     * A player's worker holdings shaped for Rules\Build::allocate().
     *
     * @return list<array{cardId:int, material:string, wildAlt:?string, workers:int}>
     */
    public function getPlayerHoldings(int $playerId): array
    {
        $rows = $this->getObjectListFromDB(
            "SELECT w.`card_id`, w.`workers`, c.`card_type`, c.`card_type_arg`
             FROM `worker` w JOIN `card` c ON c.`card_id` = w.`card_id`
             WHERE w.`player_id` = $playerId AND w.`workers` > 0"
        );
        $out = [];
        foreach ($rows as $r) {
            if ($r['card_type'] !== 'material') {
                continue;
            }
            $def = Material::$MATERIAL[(int) $r['card_type_arg']] ?? null;
            if ($def === null) {
                continue;
            }
            $out[] = [
                'cardId' => (int) $r['card_id'],
                'material' => (string) $def['material'],
                'wildAlt' => isset($def['wildAlt']) ? (string) $def['wildAlt'] : null,
                'workers' => (int) $r['workers'],
            ];
        }
        return $out;
    }

    /**
     * Apply a build: pick up the allocated workers (returning them to supply,
     * dropping blanks on vacated river icons, discarding emptied shoreline
     * cards), then place the structure in the player's tableau.
     *
     * @param array<int,int> $alloc cardId => workers to pick up
     */
    public function applyBuild(int $playerId, int $structureCardId, array $alloc): void
    {
        foreach ($alloc as $cardId => $count) {
            $cardId = (int) $cardId;
            $count = (int) $count;
            $this->DbQuery(
                "UPDATE `worker` SET `workers` = `workers` - $count WHERE `player_id` = $playerId AND `card_id` = $cardId"
            );
            $this->DbQuery(
                "DELETE FROM `worker` WHERE `player_id` = $playerId AND `card_id` = $cardId AND `workers` <= 0"
            );
            $this->DbQuery(
                "UPDATE `player` SET `player_worker_supply` = `player_worker_supply` + $count WHERE `player_id` = $playerId"
            );
            $row = $this->getCardRow($cardId);
            if ($row['card_location'] === 'river') {
                $this->DbQuery("UPDATE `card` SET `card_blanks` = `card_blanks` + $count WHERE `card_id` = $cardId");
            } elseif ($row['card_location'] === 'shoreline') {
                $left = (int) $this->getUniqueValueFromDB(
                    "SELECT COALESCE(SUM(`workers`), 0) FROM `worker` WHERE `card_id` = $cardId"
                );
                if ($left === 0) {
                    $this->DbQuery("UPDATE `card` SET `card_location` = 'discard', `card_location_arg` = 0 WHERE `card_id` = $cardId");
                }
            }
        }
        $this->DbQuery(
            "UPDATE `card` SET `card_location` = 'built', `card_location_arg` = $playerId WHERE `card_id` = $structureCardId"
        );
    }

    // --- flush ---

    /**
     * Flush the Headwaters: set the current cards aside, reveal up to 3 fresh
     * from the deck top, then shuffle the set-aside cards back into the deck.
     */
    public function flushHeadwaters(): void
    {
        $aside = $this->getHeadwatersCards();
        foreach ($aside as $id) {
            $this->DbQuery("UPDATE `card` SET `card_location` = 'flush_aside' WHERE `card_id` = $id");
        }
        for ($slot = 1; $slot <= 3; $slot++) {
            $top = $this->getUniqueValueFromDB(
                "SELECT `card_id` FROM `card` WHERE `card_location` = 'material_deck' ORDER BY `card_location_arg` LIMIT 1"
            );
            if ($top === null) {
                break;
            }
            $this->DbQuery(
                "UPDATE `card` SET `card_location` = 'headwaters', `card_location_arg` = $slot WHERE `card_id` = " . (int) $top
            );
        }
        foreach ($aside as $id) {
            $this->DbQuery("UPDATE `card` SET `card_location` = 'material_deck' WHERE `card_id` = $id");
        }
        $ids = array_map('intval', $this->getObjectListFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'material_deck'",
            true
        ));
        shuffle($ids);
        $order = 0;
        foreach ($ids as $id) {
            $this->DbQuery("UPDATE `card` SET `card_location_arg` = " . ($order++) . " WHERE `card_id` = $id");
        }
    }

    // =====================================================================
    // End-of-game scoring (Phase 4) — assembles each player's end-state and
    // feeds Rules\Scoring. DB-read paths get first validation in Studio.
    // =====================================================================

    /**
     * A player's built structures shaped for Rules\Scoring.
     *
     * @return list<array{name:string, vp:int, cost:array<string,int>}>
     */
    public function getBuiltStructures(int $playerId): array
    {
        $rows = $this->getObjectListFromDB(
            "SELECT `card_type`, `card_type_arg` FROM `card`
             WHERE `card_location` = 'built' AND `card_location_arg` = $playerId"
        );
        $out = [];
        foreach ($rows as $r) {
            $arg = (int) $r['card_type_arg'];
            if ($r['card_type'] === 'structure' && isset(Material::$STRUCTURE[$arg])) {
                $def = Material::$STRUCTURE[$arg];
                $out[] = ['name' => (string) $def['name'], 'vp' => (int) $def['vp'], 'cost' => $def['cost']];
            } elseif ($r['card_type'] === 'starter' && isset(Material::$STARTER[$arg])) {
                $def = Material::$STARTER[$arg];
                $out[] = ['name' => (string) $def['name'], 'vp' => (int) $def['vp'], 'cost' => []];
            }
        }
        return $out;
    }

    /**
     * Leftover workers split into fixed-material counts and wild pools.
     * TODO: Old Growth's x2 logs yield isn't applied here yet.
     *
     * @return array{fixed: array<string,int>, wild: list<array{materials:array{0:string,1:string}, count:int}>}
     */
    public function getLeftoverWorkers(int $playerId): array
    {
        $fixed = [];
        $wild = [];
        foreach ($this->getPlayerHoldings($playerId) as $h) {
            if ($h['wildAlt'] === null) {
                $fixed[$h['material']] = ($fixed[$h['material']] ?? 0) + $h['workers'];
            } else {
                $wild[] = ['materials' => [$h['material'], $h['wildAlt']], 'count' => $h['workers']];
            }
        }
        return ['fixed' => $fixed, 'wild' => $wild];
    }

    public function getShorelineTotal(): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT COUNT(*) FROM `card` WHERE `card_location` = 'shoreline'"
        );
    }

    public function getShorelineCountWithWorkers(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT COUNT(*) FROM `card` c WHERE c.`card_location` = 'shoreline'
             AND EXISTS (SELECT 1 FROM `worker` w WHERE w.`card_id` = c.`card_id`
                         AND w.`player_id` = $playerId AND w.`workers` > 0)"
        );
    }

    // =====================================================================
    // View helpers (Phase 6 client) — assemble display data for getAllDatas
    // and the boardUpdate / handUpdate notifications.
    // =====================================================================

    /** @return array{headwaters:list<array>, river:list<array>, shoreline:list<array>} */
    public function getBoardView(): array
    {
        $cards = $this->getObjectListFromDB(
            "SELECT `card_id`, `card_type_arg`, `card_location`, `card_location_arg`, `card_blanks`
             FROM `card` WHERE `card_location` IN ('headwaters', 'river', 'shoreline')"
        );
        $out = ['headwaters' => [], 'river' => [], 'shoreline' => []];
        foreach ($cards as $c) {
            $out[(string) $c['card_location']][] = $this->cardView($c);
        }
        return $out;
    }

    /** @param array<string,?string> $c a card row */
    private function cardView(array $c): array
    {
        $id = (int) $c['card_id'];
        $def = Material::$MATERIAL[(int) $c['card_type_arg']] ?? null;
        $icons = $def !== null ? (int) $def['icons'] : 0;
        $workers = [];
        foreach ($this->getObjectListFromDB("SELECT `player_id`, `workers` FROM `worker` WHERE `card_id` = $id") as $w) {
            $workers[(int) $w['player_id']] = (int) $w['workers'];
        }
        $blanks = (int) $c['card_blanks'];
        return [
            'id' => $id,
            'material' => $def !== null ? (string) $def['material'] : '',
            'wildAlt' => $def['wildAlt'] ?? null,
            'icons' => $icons,
            'slot' => (int) $c['card_location_arg'],
            'workers' => $workers,
            'blanks' => $blanks,
            'uncovered' => max(0, $icons - array_sum($workers) - $blanks),
        ];
    }

    /** @return list<array{id:int, name:string, cost:array<string,int>, time:int, vp:int, effect:string}> */
    public function getHandView(int $playerId): array
    {
        $out = [];
        foreach ($this->getObjectListFromDB(
            "SELECT `card_id`, `card_type_arg` FROM `card` WHERE `card_location` = 'hand' AND `card_location_arg` = $playerId"
        ) as $r) {
            $def = Material::$STRUCTURE[(int) $r['card_type_arg']] ?? null;
            if ($def !== null) {
                $out[] = [
                    'id' => (int) $r['card_id'], 'name' => (string) $def['name'], 'cost' => $def['cost'],
                    'time' => (int) $def['time'], 'vp' => (int) $def['vp'], 'effect' => (string) ($def['effect'] ?? ''),
                ];
            }
        }
        return $out;
    }

    /** @return array<int,list<array{id:int,name:string}>> player_id => built structures */
    public function getBuiltViewAll(): array
    {
        $out = [];
        foreach ($this->getObjectListFromDB("SELECT `player_id` FROM `player`") as $p) {
            $pid = (int) $p['player_id'];
            $out[$pid] = [];
        }
        foreach ($this->getObjectListFromDB(
            "SELECT `card_id`, `card_type`, `card_type_arg`, `card_location_arg` FROM `card` WHERE `card_location` = 'built'"
        ) as $r) {
            $arg = (int) $r['card_type_arg'];
            $name = $r['card_type'] === 'structure'
                ? (Material::$STRUCTURE[$arg]['name'] ?? null)
                : (Material::$STARTER[$arg]['name'] ?? null);
            if ($name !== null) {
                $out[(int) $r['card_location_arg']][] = ['id' => (int) $r['card_id'], 'name' => (string) $name];
            }
        }
        return $out;
    }

    /** Public per-player display data (fish, supply, score, retired). */
    public function getPlayersPublic(): array
    {
        return $this->getCollectionFromDB(
            "SELECT `player_id` AS `id`, `player_fish_pos` AS `fish`, `player_worker_supply` AS `supply`,
                    `player_score` AS `score`, `player_retired` AS `retired` FROM `player`"
        );
    }

    /**
     * Per-player worker holdings by material (for the player panels).
     *
     * @return array<int, array{fixed: array<string,int>, wild: list<array{materials:array{0:string,1:string}, count:int}>}>
     */
    public function getMaterialsAll(): array
    {
        $out = [];
        foreach ($this->getObjectListFromDB("SELECT `player_id` FROM `player`") as $p) {
            $out[(int) $p['player_id']] = $this->getLeftoverWorkers((int) $p['player_id']);
        }
        return $out;
    }

    /** Payload for the `boardUpdate` notification (public board + player panels). */
    public function boardUpdatePayload(): array
    {
        return [
            'board' => $this->getBoardView(),
            'players' => $this->getPlayersPublic(),
            'built' => $this->getBuiltViewAll(),
            'materials' => $this->getMaterialsAll(),
        ];
    }

    // =====================================================================
    // Endgame (Phase 4)
    // =====================================================================

    public function getFishLine(): int
    {
        return (int) $this->globals->get("fish_line", self::FISH_LINE);
    }

    /** True once at least one pawn has retired (the endgame is underway). */
    public function endgameTriggered(): bool
    {
        return (int) $this->getUniqueValueFromDB("SELECT COUNT(*) FROM `player` WHERE `player_retired` = 1") > 0;
    }

    /**
     * Retire a pawn at the lowest open space >= $startPos (crossers pass their
     * landed position; early retirers pass the fish line). No two share a space.
     */
    public function retirePlayer(int $pid, int $startPos): void
    {
        $occupied = array_map('intval', $this->getObjectListFromDB(
            "SELECT `player_fish_pos` FROM `player` WHERE `player_retired` = 1", true
        ));
        $pos = Endgame::retireSpace($startPos, $occupied);
        $this->DbQuery("UPDATE `player` SET `player_retired` = 1, `player_fish_pos` = $pos WHERE `player_id` = $pid");
    }

    /**
     * Build a structure if affordable: pay its fish + materials, place it.
     * Returns false (no change) if the player can't pay the materials.
     */
    public function tryBuild(int $playerId, int $structureCardId): bool
    {
        $def = Material::$STRUCTURE[(int) $this->getCardRow($structureCardId)['card_type_arg']];
        $alloc = Build::allocate($def['cost'], $this->getPlayerHoldings($playerId));
        if ($alloc === null) {
            return false;
        }
        $this->advanceFish($playerId, (int) $def['time']);
        $this->applyBuild($playerId, $structureCardId, $alloc);
        return true;
    }

    /** Compute and store every player's final score + tie-breaker (aux = -fish). */
    public function setFinalScores(): void
    {
        $shorelineTotal = $this->getShorelineTotal();
        foreach ($this->getTurnOrderRows() as $row) {
            $pid = $row['id'];
            $leftover = $this->getLeftoverWorkers($pid);
            $vp = Scoring::playerVP(
                $this->getBuiltStructures($pid),
                $leftover['fixed'],
                $leftover['wild'],
                $shorelineTotal,
                $this->getShorelineCountWithWorkers($pid),
            );
            $this->playerScore->set($pid, $vp);
            $this->playerScoreAux->set($pid, -$row['fish']);
        }
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
