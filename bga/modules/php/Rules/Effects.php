<?php
/**
 * River Bankers — pure passive-effect data/logic (framework-independent).
 *
 * Batch 1 (economy passives): per-item auction-cost discounts, the Lodge
 * Foundation build discount, and hand-size bonuses. Mirrors sim.js
 * MATERIAL_DISCOUNT_CARDS / playerCardCost / performBuild. Effect *triggers*
 * are wired in the state machine; the constants and arithmetic live here so
 * they can be unit-tested.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Effects
{
    /** Per-item auction-cost discounts by material: built-card name => amount. */
    public const MATERIAL_DISCOUNTS = [
        'reeds' => ['Reed Bed' => 1, 'Kelp Bed' => 1],
        'mud'   => ['Mud Burrow' => 1],
        'clay'  => ['Clay Den' => 2],
    ];

    /** Cards that raise the owner's hand size by 1 when built. */
    public const HAND_SIZE_CARDS = ['Cache Burrow', 'Beaver Cache'];

    /**
     * Total per-item discount a player gets on cards of $material.
     *
     * @param list<string> $builtNames the player's built-card names
     */
    public static function auctionDiscount(string $material, array $builtNames): int
    {
        $total = 0;
        foreach (self::MATERIAL_DISCOUNTS[$material] ?? [] as $name => $amount) {
            if (in_array($name, $builtNames, true)) {
                $total += $amount;
            }
        }
        return $total;
    }

    /**
     * A player's effective per-item fish cost on a card of $material (min 1).
     *
     * @param list<string> $builtNames
     */
    public static function perItemForPlayer(int $base, string $material, array $builtNames): int
    {
        return max(1, $base - self::auctionDiscount($material, $builtNames));
    }

    /**
     * Effective fish (time) to build a structure: Lodge Foundation shaves 1 off
     * a Logs-using structure (never below 1; a 0-time build is unaffected).
     *
     * @param array<string,int> $cost
     * @param list<string>       $builtNames
     */
    public static function buildFishCost(int $baseTime, array $cost, array $builtNames): int
    {
        if ($baseTime < 1) {
            return $baseTime; // a 0-fish build is never discounted up to 1
        }
        $discount = 0;
        if (($cost['logs'] ?? 0) > 0 && in_array('Lodge Foundation', $builtNames, true)) {
            $discount += 1; // Lodge Foundation: Logs builds
        }
        if (in_array('Log Flume', $builtNames, true)) {
            $discount += 3; // Log Flume: every build
        }
        return max(1, $baseTime - $discount);
    }

    /** Whether building $name grants a +1 hand-size bonus. */
    public static function grantsHandSize(string $name): bool
    {
        return in_array($name, self::HAND_SIZE_CARDS, true);
    }

    /** Royal Lodge: building it grants an immediate extra turn. */
    public static function grantsExtraTurn(string $name): bool
    {
        return $name === 'Royal Lodge';
    }

    /** When-built effects that need the builder to pick a river-card target. */
    public const WHEN_BUILT_CHOICE = [
        'Spillway'  => 'spillway',  // wash one River-1 card to the shoreline
        'Sap Drip'  => 'sapdrip',   // place 2 free workers on one river card
        'Mud Levee' => 'mudlevee',  // drop 2 blanks on uncovered river icons
    ];

    /** The river-target when-built effect key for $name, or null. */
    public static function whenBuiltChoice(string $name): ?string
    {
        return self::WHEN_BUILT_CHOICE[$name] ?? null;
    }

    /**
     * Immediate self "when built" effects that aren't a simple river-target pick:
     * card name => effect key. Resolved in dedicated sub-states (or inline for the
     * info-only Salt Lick) by the BuildEffects dispatcher.
     */
    public const WHEN_BUILT_IMMEDIATE = [
        'Stone Pool'    => 'stonepool',    // rearrange the top 5 material cards
        'Vine Lattice'  => 'vinelattice',  // draw 3 structures, keep 1
        'Snag Pile'     => 'snagpile',     // pull a Headwaters card to River 1, auction at 1/item
        'Flush Channel' => 'flushchannel', // remove a Headwaters card (out of game), refill, no auction
        'Salt Lick'     => 'saltlick',     // peek every opponent's hand (info only)
    ];

    /** The immediate self when-built effect key for $name, or null. */
    public static function whenBuiltImmediate(string $name): ?string
    {
        return self::WHEN_BUILT_IMMEDIATE[$name] ?? null;
    }

    /**
     * Reactive "when you build a structure that uses <material>" abilities granted
     * by an already-built card: card name => [material gate, effect key]. Fire once
     * each per qualifying build (the card itself is excluded from its own build).
     */
    public const REACT_BUILD = [
        'Stone Causeway' => ['material' => 'stones', 'key' => 'stonecauseway'], // draw 1, discard 1
        'Reed Walkway'   => ['material' => 'reeds',  'key' => 'reedwalkway'],   // free worker on a River 1 card
        'Clay Vault'     => ['material' => 'clay',   'key' => 'clayvault'],     // peek struct deck top, may swap a hand card
        'Burrow Network' => ['material' => 'mud',    'key' => 'burrownetwork'], // move a worker to another river card
    ];

    /**
     * Reactive effect keys triggered when $cost uses the gated material, from the
     * player's other built cards $builtNames. Returned in REACT_BUILD order.
     *
     * @param array<string,int> $cost       the just-built structure's printed cost
     * @param list<string>       $builtNames the player's OTHER built-card names
     * @return list<string> effect keys
     */
    public static function reactiveBuildEffects(array $cost, array $builtNames): array
    {
        $out = [];
        foreach (self::REACT_BUILD as $name => $def) {
            if (in_array($name, $builtNames, true) && ($cost[$def['material']] ?? 0) > 0) {
                $out[] = $def['key'];
            }
        }
        return $out;
    }

    /** "As an action" abilities a built structure grants: name => [key, fish cost]. */
    public const ACTION_ABILITIES = [
        'Driftwood Snag' => ['key' => 'driftwoodsnag', 'cost' => 1],
        'Tow Line'       => ['key' => 'towline', 'cost' => 2],
        'Heron Roost'    => ['key' => 'heronroost', 'cost' => 1],
    ];

    /** @return array{key:string, cost:int}|null */
    public static function actionAbility(string $name): ?array
    {
        return self::ACTION_ABILITIES[$name] ?? null;
    }

    /** Once-per-game abilities (flip the card when used): name => [key, fish cost]. */
    public const ONCE_ABILITIES = [
        'Hollowed-out Log' => ['key' => 'hollowedlog', 'cost' => 0],
        'Wood Pile'        => ['key' => 'woodpile', 'cost' => 1],
        'Tribute Stone'    => ['key' => 'tributestone', 'cost' => 0],
    ];

    /** @return array{key:string, cost:int}|null */
    public static function onceAbility(string $name): ?array
    {
        return self::ONCE_ABILITIES[$name] ?? null;
    }

    /**
     * Fish-track penalty when a material card reaches the shoreline:
     *   - Hidden Inlet: if exactly one player has workers, back 1 per worker;
     *   - Mud Wallow / Cattail Cluster: the sole player with the most workers
     *     moves back 2 / 3 (ties → nobody).
     *
     * @param array<int,int> $workersByPlayer player_id => workers on the card
     * @return array<int,int> player_id => spaces to move back (empty = none)
     */
    public static function shorelinePenalty(string $cardName, array $workersByPlayer): array
    {
        $withWorkers = array_filter($workersByPlayer, fn(int $w): bool => $w > 0);
        if ($withWorkers === []) {
            return [];
        }
        if ($cardName === 'Hidden Inlet') {
            if (count($withWorkers) === 1) {
                $pid = array_key_first($withWorkers);
                return [$pid => $withWorkers[$pid]];
            }
            return [];
        }
        if ($cardName === 'Mud Wallow' || $cardName === 'Cattail Cluster') {
            $max = max($withWorkers);
            $leaders = array_keys($withWorkers, $max, true);
            if (count($leaders) !== 1) {
                return []; // ties → nobody
            }
            return [$leaders[0] => ($cardName === 'Mud Wallow' ? 2 : 3)];
        }
        return [];
    }
}
