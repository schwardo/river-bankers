<?php
/**
 * River Bankers — pure per-item fish cost (framework-independent).
 *
 * How many fish each worker you win on a card costs you, set by where the card
 * sits: Headwaters = 1, River 1..4 = 2/3/4/5 (slot + 1). An effect may force a
 * flat rate (e.g. Snag Pile auctions at 1/item). Per-PLAYER reductions (Kelp
 * Bed, species bias) are layered on by the caller — Phase 4 material-effect TODO.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Cost
{
    /**
     * @param string   $location   'headwaters' | 'river'
     * @param int      $slot       river space 1..4 (ignored for headwaters)
     * @param int|null $forcedRate effect override; null = derive from position
     */
    public static function perItem(string $location, int $slot, ?int $forcedRate = null): int
    {
        if ($forcedRate !== null) {
            return $forcedRate;
        }
        if ($location === 'headwaters') {
            return 1;
        }
        return $slot + 1; // River 1->2, 2->3, 3->4, 4->5
    }

    /**
     * Fish to pay to Pull a Headwaters card from slot 1..3: 2 / 3 / 4 (slot + 1).
     */
    public static function headwatersMove(int $slot): int
    {
        return $slot + 1;
    }
}
