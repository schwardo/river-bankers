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
use Bga\Games\RiverBankers\States\StarterDraft;
use Bga\Games\RiverBankers\Rules\Build;
use Bga\Games\RiverBankers\Rules\BuildCost;
use Bga\Games\RiverBankers\Rules\CardMovement;
use Bga\Games\RiverBankers\Rules\Effects;
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
            "SELECT `player_id` AS `id`, `player_name` AS `name`, `player_score` AS `score`,
                    `player_species` AS `species`, `player_fish_pos` AS `fish`,
                    `player_worker_supply` AS `supply`, `player_hand_limit` AS `handLimit`,
                    `player_retired` AS `retired`
             FROM `player`"
        );
        $result["fishLine"] = (int) $this->globals->get("fish_line", self::FISH_LINE);
        $result["board"] = $this->getBoardView();
        $result["built"] = $this->getBuiltViewAll();
        $result["materials"] = $this->getMaterialsAll();
        $result["hand"] = $this->getHandView($currentPlayerId); // private: only this player's hand
        $result["starterOffer"] = $this->getStarterOffer($currentPlayerId); // empty unless mid-draft
        $result["auction"] = $this->getAuctionView(); // null unless an auction is open (board highlight on reconnect)

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
        $draft = (int) ($options[100] ?? 1) === 1; // species-starter draft on?
        $playerSpecies = [];
        $query_values = [];
        $stack = count($players);
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $species = self::SPECIES_BY_COLOR[$color] ?? '';
            $playerSpecies[(int) $player_id] = $species;
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
        // Symmetric game: deal 3 to each hand now. Draft: defer dealing until
        // after the starter draft (a drafted Beaver Cache raises the hand size).
        if (!$draft) {
            foreach ($players as $player_id => $player) {
                for ($i = 0; $i < 3 && $structArgs; $i++) {
                    $cardValues[] = $this->cardRow('structure', array_pop($structArgs), 'hand', (int) $player_id);
                }
            }
        }
        $order = 0;
        foreach ($structArgs as $arg) {
            $cardValues[] = $this->cardRow('structure', $arg, 'structure_deck', $order++);
        }

        // ---- Species starter offers (draft only) -------------------------
        if ($draft) {
            $startersBySpecies = [];
            foreach (Material::$STARTER as $arg => $def) {
                $startersBySpecies[$def['species']][] = $arg;
            }
            foreach ($players as $player_id => $player) {
                foreach ($startersBySpecies[$playerSpecies[(int) $player_id]] ?? [] as $arg) {
                    $cardValues[] = $this->cardRow('starter', $arg, 'starter_offer', (int) $player_id);
                }
            }
        }

        static::DbQuery(
            "INSERT INTO `card` (`card_type`, `card_type_arg`, `card_location`, `card_location_arg`)
             VALUES " . implode(",", $cardValues)
        );

        // ---- Globals & stats ---------------------------------------------
        $this->globals->set("fish_line", self::FISH_LINE);
        $this->globals->set("deck_empty", 0);

        // TODO (Phase 5): init stats here once stats.json is defined.

        // Provisional active player; the turn-order pivot recomputes the real
        // first actor (top of the space-0 stack) via Rules\TurnOrder.
        $this->activeNextPlayer();

        // Draft first (then deal hands), or straight into the turn loop.
        return $draft ? StarterDraft::class : NextPlayer::class;
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

    /**
     * Slide/graduate the auctioned card per the universal movement rule. If it
     * reaches the shoreline, apply any material shoreline-arrival penalty and
     * return it (player_id => spaces moved back) for the caller to notify.
     *
     * @return array<int,int>
     */
    public function moveCardAfterAuction(int $cardId, int $uncoveredAfter): array
    {
        $row = $this->getCardRow($cardId);
        $dest = CardMovement::destination((string) $row['card_location'], (int) $row['card_location_arg'], $uncoveredAfter);
        $this->DbQuery(
            "UPDATE `card` SET `card_location` = '{$dest['location']}', `card_location_arg` = {$dest['slot']}
             WHERE `card_id` = $cardId"
        );
        return $dest['location'] === 'shoreline' ? $this->applyShorelineArrival($cardId) : [];
    }

    /** Total workers a player has out on river cards (recallable during an auction). */
    public function riverWorkerCount(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT COALESCE(SUM(w.`workers`), 0) FROM `worker` w JOIN `card` c ON c.`card_id` = w.`card_id`
             WHERE w.`player_id` = $playerId AND c.`card_location` = 'river'"
        );
    }

    /** A player can start an auction only with a worker available or recallable. */
    public function canTriggerAuction(int $playerId): bool
    {
        return $this->getPlayerSupply($playerId) > 0 || $this->riverWorkerCount($playerId) > 0;
    }

    /**
     * Pre-auction recall: pull one of a player's workers off a river card back to
     * supply, dropping a blank on the vacated icon (so it stays covered).
     */
    public function recallWorker(int $playerId, int $cardId, bool $dropBlank = true): void
    {
        $this->DbQuery("UPDATE `worker` SET `workers` = `workers` - 1 WHERE `player_id` = $playerId AND `card_id` = $cardId");
        $this->DbQuery("DELETE FROM `worker` WHERE `player_id` = $playerId AND `card_id` = $cardId AND `workers` <= 0");
        $this->DbQuery("UPDATE `player` SET `player_worker_supply` = `player_worker_supply` + 1 WHERE `player_id` = $playerId");
        if ($dropBlank && $this->getCardRow($cardId)['card_location'] === 'river') {
            $this->DbQuery("UPDATE `card` SET `card_blanks` = `card_blanks` + 1 WHERE `card_id` = $cardId");
        }
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

    public function hasOpenAuction(): bool
    {
        return (int) $this->getUniqueValueFromDB("SELECT COUNT(*) FROM `auction`") > 0;
    }

    /**
     * The open auction shaped for the client (board highlight + "who has acted"),
     * or null if none is running. Bid amounts are sealed — only submission status
     * is exposed, never workers_bid.
     *
     * @return array{lotCardId:int, lotCardId2:?int, triggerPlayer:int, open:int, acted:list<int>, deferred:list<int>}|null
     */
    public function getAuctionView(): ?array
    {
        if (!$this->hasOpenAuction()) {
            return null;
        }
        $a = $this->getOpenAuction();
        $auctionId = (int) $a['auction_id'];
        $acted = [];
        $deferred = [];
        foreach ($this->getObjectListFromDB(
            "SELECT `player_id`, `status` FROM `auction_bid` WHERE `auction_id` = $auctionId"
        ) as $r) {
            $pid = (int) $r['player_id'];
            if ($r['status'] === 'deferred') {
                $deferred[] = $pid;
            } else {
                $acted[] = $pid;
            }
        }
        return [
            'lotCardId' => (int) $a['lot_card_id'],
            'lotCardId2' => $a['lot_card_id2'] === null ? null : (int) $a['lot_card_id2'],
            'triggerPlayer' => (int) $a['trigger_player'],
            'open' => $this->uncoveredIcons((int) $a['lot_card_id']),
            'acted' => $acted,       // submitted a sealed bid (amount hidden)
            'deferred' => $deferred, // Spy Mound / Quick Strike: will bid after reveal
        ];
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

    // --- deferred bids (Spy Mound / Quick Strike) ---

    /** Quick Strike lets the auction TRIGGER declare their bid last (free, unlimited). */
    public function quickStrikeApplies(int $playerId, int $triggerPlayer): bool
    {
        return $playerId === $triggerPlayer
            && in_array('Quick Strike', $this->getBuiltNames($playerId), true);
    }

    /** An unused built Spy Mound's card id for the player, or null. */
    public function spyMoundCard(int $playerId): ?int
    {
        foreach ($this->getObjectListFromDB(
            "SELECT `card_id`, `card_type`, `card_type_arg` FROM `card`
             WHERE `card_location` = 'built' AND `card_location_arg` = $playerId AND `card_used` = 0"
        ) as $r) {
            $arg = (int) $r['card_type_arg'];
            $name = $r['card_type'] === 'structure'
                ? (Material::$STRUCTURE[$arg]['name'] ?? '')
                : (Material::$STARTER[$arg]['name'] ?? '');
            if ($name === 'Spy Mound') {
                return (int) $r['card_id'];
            }
        }
        return null;
    }

    /**
     * Which built card lets this player defer their bid, or null if none. Quick
     * Strike (free) takes priority over Spy Mound (once per game) when both apply,
     * matching recordDefer's flip rule.
     */
    public function deferReason(int $playerId, int $triggerPlayer): ?string
    {
        if ($this->quickStrikeApplies($playerId, $triggerPlayer)) {
            return 'Quick Strike';
        }
        if ($this->spyMoundCard($playerId) !== null) {
            return 'Spy Mound';
        }
        return null;
    }

    /** A player may defer their bid via Quick Strike (as trigger) or an unused Spy Mound. */
    public function canDeferBid(int $playerId, int $triggerPlayer): bool
    {
        return $this->deferReason($playerId, $triggerPlayer) !== null;
    }

    /**
     * Record a deferral: a placeholder 'deferred' bid row. Quick Strike grants the
     * defer for free; otherwise it consumes (flips) the Spy Mound card.
     */
    public function recordDefer(int $auctionId, int $playerId, int $triggerPlayer): void
    {
        $this->DbQuery(
            "INSERT INTO `auction_bid` (`auction_id`, `player_id`, `workers_bid`, `status`)
             VALUES ($auctionId, $playerId, 0, 'deferred')"
        );
        if (!$this->quickStrikeApplies($playerId, $triggerPlayer)) {
            $spy = $this->spyMoundCard($playerId);
            if ($spy !== null) {
                $this->flipCardUsed($spy); // Spy Mound is once per game
            }
        }
    }

    public function hasDeferredBidders(int $auctionId): bool
    {
        return (int) $this->getUniqueValueFromDB(
            "SELECT COUNT(*) FROM `auction_bid` WHERE `auction_id` = $auctionId AND `status` = 'deferred'"
        ) > 0;
    }

    /**
     * Deferred bidders still owing a real bid, in turn order (lowest fish first,
     * then top of stack) so each reveals before the next.
     *
     * @return list<int>
     */
    public function getDeferredBidders(int $auctionId): array
    {
        $ids = array_map('intval', $this->getObjectListFromDB(
            "SELECT `player_id` FROM `auction_bid` WHERE `auction_id` = $auctionId AND `status` = 'deferred'",
            true
        ));
        if (count($ids) <= 1) {
            return $ids;
        }
        $rows = array_values(array_filter($this->getTurnOrderRows(), fn(array $r): bool => in_array($r['id'], $ids, true)));
        usort($rows, function (array $a, array $b): int {
            return ($a['fish'] <=> $b['fish']) ?: ($b['stack'] <=> $a['stack']);
        });
        return array_map(fn(array $r): int => $r['id'], $rows);
    }

    /**
     * Bids already revealed (committed) to a deferring player.
     *
     * @return array<int,int> player_id => workers
     */
    public function getRevealedBids(int $auctionId): array
    {
        return array_map('intval', $this->getCollectionFromDB(
            "SELECT `player_id`, `workers_bid` FROM `auction_bid`
             WHERE `auction_id` = $auctionId AND `status` <> 'deferred'",
            true
        ));
    }

    public function submitDeferredBid(int $auctionId, int $playerId, int $workers): void
    {
        $this->DbQuery(
            "UPDATE `auction_bid` SET `workers_bid` = $workers, `status` = 'in'
             WHERE `auction_id` = $auctionId AND `player_id` = $playerId"
        );
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
     * A player's worker holdings shaped for Rules\Build::allocate(). Old Growth
     * yields 2 Logs per worker while it sits at River 3 or 4 (yield = 2).
     *
     * @return list<array{cardId:int, material:string, wildAlt:?string, workers:int, yield:int}>
     */
    public function getPlayerHoldings(int $playerId): array
    {
        $rows = $this->getObjectListFromDB(
            "SELECT w.`card_id`, w.`workers`, c.`card_type`, c.`card_type_arg`,
                    c.`card_location`, c.`card_location_arg`
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
            // Old Growth at River 3/4 (slot >= 3): each worker yields 2 Logs.
            $yield = ($def['name'] === 'Old Growth'
                && $r['card_location'] === 'river'
                && (int) $r['card_location_arg'] >= 3) ? 2 : 1;
            $out[] = [
                'cardId' => (int) $r['card_id'],
                'material' => (string) $def['material'],
                'wildAlt' => isset($def['wildAlt']) ? (string) $def['wildAlt'] : null,
                'workers' => (int) $r['workers'],
                'yield' => $yield,
            ];
        }
        return $out;
    }

    /**
     * Fixed-material worker counts (Old-Growth yield folded in), for the build-cost
     * modifier engine. Wild holdings are excluded — they're resolved at allocation.
     *
     * @param list<array{material:string, wildAlt:?string, workers:int, yield:int}> $holdings
     * @return array<string,int>
     */
    private function fixedMaterialCounts(array $holdings): array
    {
        $counts = [];
        foreach ($holdings as $h) {
            if ($h['wildAlt'] === null) {
                $counts[$h['material']] = ($counts[$h['material']] ?? 0) + $h['workers'] * $h['yield'];
            }
        }
        return $counts;
    }

    /**
     * Which build-cost modifiers a player controls + the used-state of the
     * once-per-game ones (Stone Tool / Granary), for Rules\BuildCost::effective().
     *
     * @return array{cattailMarsh:bool, charcoalPit:bool, stoneTool:bool, stoneToolUsed:bool, treatyStone:bool, granary:bool, granaryUsed:bool}
     */
    private function buildFlags(int $playerId): array
    {
        $names = $this->getBuiltNames($playerId);
        return [
            'cattailMarsh' => in_array('Cattail Marsh', $names, true),
            'charcoalPit' => in_array('Charcoal Pit', $names, true),
            'stoneTool' => in_array('Stone Tool', $names, true),
            'stoneToolUsed' => $this->onceCardUsed($playerId, 'Stone Tool'),
            'treatyStone' => in_array('Treaty Stone', $names, true),
            'granary' => in_array('Granary', $names, true),
            'granaryUsed' => $this->onceCardUsed($playerId, 'Granary'),
        ];
    }

    /** True if the player has a built card of $name already flipped (used). */
    public function onceCardUsed(int $playerId, string $name): bool
    {
        foreach ($this->getBuiltWithUsed($playerId) as $b) {
            if ($b['name'] === $name && $b['used']) {
                return true;
            }
        }
        return false;
    }

    /** Flip (spend) the first unused built card of $name the player controls. */
    public function flipBuiltByName(int $playerId, string $name): void
    {
        foreach ($this->getBuiltWithUsed($playerId) as $b) {
            if ($b['name'] === $name && !$b['used']) {
                $this->flipCardUsed($b['cardId']);
                return;
            }
        }
    }

    /** @return list<array{cardId:int, name:string, used:bool}> the player's built cards + used-state */
    private function getBuiltWithUsed(int $playerId): array
    {
        $out = [];
        foreach ($this->getObjectListFromDB(
            "SELECT `card_id`, `card_type`, `card_type_arg`, `card_used` FROM `card`
             WHERE `card_location` = 'built' AND `card_location_arg` = $playerId"
        ) as $r) {
            $arg = (int) $r['card_type_arg'];
            $name = $r['card_type'] === 'structure'
                ? (Material::$STRUCTURE[$arg]['name'] ?? '')
                : (Material::$STARTER[$arg]['name'] ?? '');
            $out[] = ['cardId' => (int) $r['card_id'], 'name' => (string) $name, 'used' => (int) $r['card_used'] === 1];
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
        $this->reshuffleMaterialDeck();
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
     * Leftover workers split into fixed-material counts and wild pools (Old
     * Growth at River 3/4 counts each worker as 2 Logs, matching build yield).
     *
     * @return array{fixed: array<string,int>, wild: list<array{materials:array{0:string,1:string}, count:int}>}
     */
    public function getLeftoverWorkers(int $playerId): array
    {
        $fixed = [];
        $wild = [];
        foreach ($this->getPlayerHoldings($playerId) as $h) {
            if ($h['wildAlt'] === null) {
                // Old Growth at River 3/4 counts each leftover worker as 2 Logs.
                $fixed[$h['material']] = ($fixed[$h['material']] ?? 0) + $h['workers'] * $h['yield'];
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

    /** Names of a player's built cards (structures + starters). */
    public function getBuiltNames(int $playerId): array
    {
        return array_map(fn(array $b) => $b['name'], $this->getBuiltStructures($playerId));
    }

    /**
     * Build a structure if affordable: pay its fish (incl. the Lodge Foundation
     * discount) + materials, place it, and apply its on-build effects. Returns
     * false (no change) if the player can't pay the materials.
     */
    public function tryBuild(int $playerId, int $structureCardId): bool
    {
        $def = Material::$STRUCTURE[(int) $this->getCardRow($structureCardId)['card_type_arg']];
        $holdings = $this->getPlayerHoldings($playerId);
        // Apply the player's build-cost modifiers (Cattail Marsh / Charcoal Pit /
        // Stone Tool / Treaty Stone / Granary) to the printed material cost.
        $bc = BuildCost::effective($def['cost'], $this->fixedMaterialCounts($holdings), $this->buildFlags($playerId));
        $alloc = Build::allocate($bc['eff'], $holdings);
        if ($alloc === null) {
            return false;
        }
        // Built-card names BEFORE this card joins them (a card never discounts
        // the build that creates it). Fish cost uses the PRINTED cost (Lodge
        // Foundation keys off Logs in the cost); material payment uses effective.
        $builtNames = $this->getBuiltNames($playerId);
        $this->advanceFish($playerId, Effects::buildFishCost((int) $def['time'], $def['cost'], $builtNames));
        $this->applyBuild($playerId, $structureCardId, $alloc);
        // Spend the once-per-game cost cards the modifier engine consumed.
        if ($bc['granaryUsed']) {
            $this->flipBuiltByName($playerId, 'Granary');
        }
        if ($bc['stoneToolUsed']) {
            $this->flipBuiltByName($playerId, 'Stone Tool');
        }
        $this->applyOnBuildEffects($playerId, $structureCardId);
        return true;
    }

    /** "When built" effects of the just-placed card + reactive "when you build". */
    private function applyOnBuildEffects(int $playerId, int $cardId): void
    {
        $row = $this->getCardRow($cardId);
        $arg = (int) $row['card_type_arg'];
        $isStruct = $row['card_type'] === 'structure';
        $def = $isStruct ? (Material::$STRUCTURE[$arg] ?? null) : (Material::$STARTER[$arg] ?? null);
        if ($def === null) {
            return;
        }
        $name = (string) $def['name'];
        /** @var array<string,int> $cost */
        $cost = $isStruct ? ($def['cost'] ?? []) : [];

        // --- self "when built" ---
        if (Effects::grantsHandSize($name)) {
            $this->DbQuery("UPDATE `player` SET `player_hand_limit` = `player_hand_limit` + 1 WHERE `player_id` = $playerId");
        }
        if (Effects::grantsExtraTurn($name)) {
            $this->globals->set('bonus_turn_player', $playerId); // Royal Lodge: act again
        }
        if ($name === 'Burrow Run') {
            $this->moveBackFish($playerId, 5);
        }
        if ($name === 'Springwater Pool') {
            $this->readySpentOnce($playerId);
        }

        // --- reactive "when you build [material]" from the player's OTHER built cards ---
        $others = [];
        foreach ($this->getObjectListFromDB(
            "SELECT `card_type`, `card_type_arg` FROM `card`
             WHERE `card_location` = 'built' AND `card_location_arg` = $playerId AND `card_id` <> $cardId"
        ) as $r) {
            $a = (int) $r['card_type_arg'];
            $others[] = (string) ($r['card_type'] === 'structure'
                ? (Material::$STRUCTURE[$a]['name'] ?? '')
                : (Material::$STARTER[$a]['name'] ?? ''));
        }
        if (in_array('Vine Trellis', $others, true) && ($cost['vines'] ?? 0) > 0) {
            $this->moveBackFish($playerId, 1);
        }
    }

    /** Springwater Pool: un-flip all of a player's spent once-per-game cards. */
    public function readySpentOnce(int $playerId): void
    {
        $this->DbQuery("UPDATE `card` SET `card_used` = 0 WHERE `card_location` = 'built' AND `card_location_arg` = $playerId");
    }

    // --- when-built river-target effects (Batch 3) ---

    /** Legal targets for a when-built river effect ('spillway'|'sapdrip'|'mudlevee'). */
    public function whenBuiltTargets(string $effect): array
    {
        if ($effect === 'spillway') {
            // Any River-1 card.
            return array_map('intval', $this->getObjectListFromDB(
                "SELECT `card_id` FROM `card` WHERE `card_location` = 'river' AND `card_location_arg` = 1", true
            ));
        }
        // sapdrip / mudlevee: any river card that still has uncovered icons.
        return $this->getAuctionableRiverCards();
    }

    /** Spillway: send a card straight to the shoreline (workers carry along). */
    public function washToShoreline(int $cardId): array
    {
        $this->DbQuery("UPDATE `card` SET `card_location` = 'shoreline', `card_location_arg` = 0 WHERE `card_id` = $cardId");
        return $this->applyShorelineArrival($cardId);
    }

    /** Sap Drip: place up to 2 of a player's workers free onto a river card. */
    public function sapDripPlace(int $playerId, int $cardId): int
    {
        $n = min(2, $this->getPlayerSupply($playerId), $this->uncoveredIcons($cardId));
        $this->placeWorkers($playerId, $cardId, $n);
        return $n;
    }

    /** Mud Levee: drop one blank on a river card with an uncovered icon. */
    public function dropBlank(int $cardId): void
    {
        if ($this->uncoveredIcons($cardId) > 0) {
            $this->DbQuery("UPDATE `card` SET `card_blanks` = `card_blanks` + 1 WHERE `card_id` = $cardId");
        }
    }

    // --- "as an action" abilities (Batch 4) ---

    /**
     * Abilities the player controls (as-an-action turn abilities + unused
     * once-per-game abilities) that have a legal target.
     *
     * @return list<array{key:string, name:string, cost:int, once:bool, cardId:int}>
     */
    public function getPlayerAbilities(int $playerId): array
    {
        $out = [];
        $rows = $this->getObjectListFromDB(
            "SELECT `card_id`, `card_type`, `card_type_arg`, `card_used` FROM `card`
             WHERE `card_location` = 'built' AND `card_location_arg` = $playerId"
        );
        foreach ($rows as $r) {
            $arg = (int) $r['card_type_arg'];
            $name = (string) ($r['card_type'] === 'structure'
                ? (Material::$STRUCTURE[$arg]['name'] ?? '')
                : (Material::$STARTER[$arg]['name'] ?? ''));

            $aa = Effects::actionAbility($name);
            if ($aa !== null && count($this->abilityTargets($aa['key'], $playerId)) > 0) {
                $out[] = ['key' => $aa['key'], 'name' => $name, 'cost' => $aa['cost'], 'once' => false, 'cardId' => 0];
            }
            $oa = Effects::onceAbility($name);
            if ($oa !== null && (int) $r['card_used'] === 0 && count($this->abilityTargets($oa['key'], $playerId)) > 0) {
                $out[] = ['key' => $oa['key'], 'name' => $name, 'cost' => $oa['cost'], 'once' => true, 'cardId' => (int) $r['card_id']];
            }
        }
        return $out;
    }

    public function flipCardUsed(int $cardId): void
    {
        $this->DbQuery("UPDATE `card` SET `card_used` = 1 WHERE `card_id` = $cardId");
    }

    // --- species starter draft ---

    /** @return list<array{id:int, name:string, vp:int, effect:string}> a player's 3 starter offers */
    public function getStarterOffer(int $playerId): array
    {
        $out = [];
        foreach ($this->getObjectListFromDB(
            "SELECT `card_id`, `card_type_arg` FROM `card` WHERE `card_location` = 'starter_offer' AND `card_location_arg` = $playerId"
        ) as $r) {
            $def = Material::$STARTER[(int) $r['card_type_arg']] ?? null;
            if ($def !== null) {
                $out[] = [
                    'id' => (int) $r['card_id'], 'name' => (string) $def['name'],
                    'vp' => (int) $def['vp'], 'effect' => (string) ($def['effect'] ?? ''),
                ];
            }
        }
        return $out;
    }

    /** Pre-build the drafted starter, box the other two, apply its on-build effects. */
    public function draftStarter(int $playerId, int $chosenCardId): void
    {
        $this->DbQuery("UPDATE `card` SET `card_location` = 'built', `card_location_arg` = $playerId WHERE `card_id` = $chosenCardId");
        $this->applyOnBuildEffects($playerId, $chosenCardId);
        $this->DbQuery(
            "UPDATE `card` SET `card_location` = 'discard', `card_location_arg` = 0
             WHERE `card_location` = 'starter_offer' AND `card_location_arg` = $playerId"
        );
    }

    /** Deal each player their opening hand up to their (post-draft) hand size. */
    public function dealOpeningHands(): void
    {
        foreach ($this->getObjectListFromDB("SELECT `player_id` FROM `player`") as $p) {
            $this->refillHand((int) $p['player_id']);
        }
    }

    public function getAllPlayerIds(): array
    {
        return array_map('intval', $this->getObjectListFromDB("SELECT `player_id` FROM `player`", true));
    }

    /** Legal targets (card ids) for an ability, for the acting player. */
    public function abilityTargets(string $key, int $playerId): array
    {
        if ($key === 'driftwoodsnag') {
            return $this->getAuctionableRiverCards(); // river cards with an uncovered icon
        }
        if ($key === 'towline') {
            return array_map('intval', $this->getObjectListFromDB(
                "SELECT `card_id` FROM `card` WHERE `card_location` = 'river' AND `card_location_arg` > 1", true
            ));
        }
        if ($key === 'heronroost') {
            return $this->getMaterialDeckCount() > 0 ? $this->getHeadwatersCards() : [];
        }
        if ($key === 'hollowedlog') {
            return array_map('intval', $this->getObjectListFromDB(
                "SELECT c.`card_id` FROM `card` c JOIN `worker` w ON w.`card_id` = c.`card_id`
                 WHERE c.`card_location` = 'river' AND w.`player_id` = $playerId AND w.`workers` > 0", true
            ));
        }
        if ($key === 'woodpile') {
            if ($this->getPlayerSupply($playerId) <= 0) {
                return [];
            }
            $ids = [];
            foreach ($this->getObjectListFromDB("SELECT `card_id`, `card_type_arg` FROM `card` WHERE `card_location` = 'river'") as $r) {
                $def = Material::$MATERIAL[(int) $r['card_type_arg']] ?? null;
                if ($def !== null && $def['material'] === 'logs' && $this->uncoveredIcons((int) $r['card_id']) > 0) {
                    $ids[] = (int) $r['card_id'];
                }
            }
            return $ids;
        }
        if ($key === 'tributestone') {
            return array_map('intval', $this->getObjectListFromDB(
                "SELECT DISTINCT c.`card_id` FROM `card` c JOIN `worker` w ON w.`card_id` = c.`card_id`
                 WHERE c.`card_location` = 'river' AND w.`player_id` <> $playerId AND w.`workers` > 0", true
            ));
        }
        return [];
    }

    public function resolveAbility(string $key, int $cardId, int $playerId): void
    {
        if ($key === 'driftwoodsnag') {
            $this->dropBlank($cardId);
            return;
        }
        if ($key === 'hollowedlog') {
            $this->recallWorker($playerId, $cardId, false); // no blank
            return;
        }
        if ($key === 'woodpile') {
            $this->placeWorkers($playerId, $cardId, 1); // claim a log icon (the 1 fish was paid upfront)
            return;
        }
        if ($key === 'tributestone') {
            $opp = $this->getObjectListFromDB(
                "SELECT `player_id` FROM `worker` WHERE `card_id` = $cardId AND `player_id` <> $playerId AND `workers` > 0
                 ORDER BY `workers` DESC LIMIT 1"
            );
            if (count($opp) > 0) {
                $oid = (int) $opp[0]['player_id'];
                $this->recallWorker($oid, $cardId, true);
                $this->moveBackFish($oid, 3);
            }
            return;
        }
        if ($key === 'towline') {
            $slot = (int) $this->getCardRow($cardId)['card_location_arg'];
            $this->DbQuery("UPDATE `card` SET `card_location_arg` = " . max(1, $slot - 1) . " WHERE `card_id` = $cardId");
            return;
        }
        if ($key === 'heronroost') {
            // Replace the chosen Headwaters card with the deck top; shuffle it back in.
            $slot = (int) $this->getCardRow($cardId)['card_location_arg'];
            $this->DbQuery("UPDATE `card` SET `card_location` = 'heron_aside' WHERE `card_id` = $cardId");
            $top = $this->getUniqueValueFromDB(
                "SELECT `card_id` FROM `card` WHERE `card_location` = 'material_deck' ORDER BY `card_location_arg` LIMIT 1"
            );
            if ($top !== null) {
                $this->DbQuery("UPDATE `card` SET `card_location` = 'headwaters', `card_location_arg` = $slot WHERE `card_id` = " . (int) $top);
            }
            $this->DbQuery("UPDATE `card` SET `card_location` = 'material_deck' WHERE `card_id` = $cardId");
            $this->reshuffleMaterialDeck();
        }
    }

    private function reshuffleMaterialDeck(): void
    {
        $ids = array_map('intval', $this->getObjectListFromDB(
            "SELECT `card_id` FROM `card` WHERE `card_location` = 'material_deck'", true
        ));
        shuffle($ids);
        $order = 0;
        foreach ($ids as $id) {
            $this->DbQuery("UPDATE `card` SET `card_location_arg` = " . ($order++) . " WHERE `card_id` = $id");
        }
    }

    /** Move a pawn back on the fish track (never below 0); does not change stack order. */
    public function moveBackFish(int $playerId, int $spaces): void
    {
        if ($spaces <= 0) {
            return;
        }
        $this->DbQuery(
            "UPDATE `player` SET `player_fish_pos` = GREATEST(0, CAST(`player_fish_pos` AS SIGNED) - $spaces)
             WHERE `player_id` = $playerId"
        );
    }

    /**
     * Material shoreline-arrival penalties (Hidden Inlet / Mud Wallow / Cattail
     * Cluster). Applies the fish-track move-back and returns what it did so the
     * caller can notify.
     *
     * @return array<int,int> player_id => spaces moved back
     */
    private function applyShorelineArrival(int $cardId): array
    {
        $row = $this->getCardRow($cardId);
        $name = (string) (Material::$MATERIAL[(int) $row['card_type_arg']]['name'] ?? '');
        $workers = [];
        foreach ($this->getObjectListFromDB("SELECT `player_id`, `workers` FROM `worker` WHERE `card_id` = $cardId") as $w) {
            $workers[(int) $w['player_id']] = (int) $w['workers'];
        }
        $penalties = Effects::shorelinePenalty($name, $workers);
        foreach ($penalties as $pid => $spaces) {
            $this->moveBackFish((int) $pid, (int) $spaces);
        }
        return $penalties;
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
