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
        if ($baseTime >= 1 && ($cost['logs'] ?? 0) > 0 && in_array('Lodge Foundation', $builtNames, true)) {
            return max(1, $baseTime - 1);
        }
        return $baseTime;
    }

    /** Whether building $name grants a +1 hand-size bonus. */
    public static function grantsHandSize(string $name): bool
    {
        return in_array($name, self::HAND_SIZE_CARDS, true);
    }
}
