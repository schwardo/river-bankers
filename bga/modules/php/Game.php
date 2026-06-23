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

    public function debug_goToState(int $state = 3)
    {
        $this->gamestate->jumpToState($state);
    }

    public function debug_playOneMove()
    {
        $this->bga->debug->playUntil(fn(int $count) => $count == 1);
    }
}
