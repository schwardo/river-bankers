<?php
/**
 * River Bankers — pure card-movement resolution (framework-independent).
 *
 * The universal post-auction rule (rulebook "Card movement"): only the
 * auctioned card moves. If every icon was claimed it goes straight to the
 * shoreline; otherwise it slides one space downstream (Headwaters -> River 1,
 * River N -> River N+1, River 4 -> shoreline).
 *
 * Effect-card exceptions (e.g. Slipping Sandbar's upstream drift) are layered
 * on top by the caller — see the Phase 4 material-effect TODO.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class CardMovement
{
    /**
     * Where the auctioned card ends up.
     *
     * @param string $location 'headwaters' | 'river'
     * @param int    $slot     river space 1..4 (ignored when $location is 'headwaters')
     * @param int    $uncoveredAfter icons still uncovered after placement
     * @return array{location:string, slot:int} 'shoreline' carries slot 0
     */
    public static function destination(string $location, int $slot, int $uncoveredAfter): array
    {
        // Every icon claimed -> nothing left to auction -> shoreline.
        if ($uncoveredAfter <= 0) {
            return ['location' => 'shoreline', 'slot' => 0];
        }
        // A Headwaters card with leftovers enters the river at space 1.
        if ($location === 'headwaters') {
            return ['location' => 'river', 'slot' => 1];
        }
        // A river card with leftovers slides one space downstream; from the
        // last space (4) it graduates to the shoreline.
        if ($slot >= 4) {
            return ['location' => 'shoreline', 'slot' => 0];
        }
        return ['location' => 'river', 'slot' => $slot + 1];
    }

    /**
     * Shoreline invariant: a card may sit on the shoreline only while it holds at
     * least one worker. A card that arrives (auction graduation, all-blanks cover,
     * Spillway wash) or is left (last worker recalled/spent) with none leaves the
     * game entirely. Returns the card's resting location given its worker count.
     *
     * Mirrors sim.js cleanupShoreline(): the single rule every "card reaches /
     * stays on the shoreline" path must honour. Callers persist the result.
     */
    public static function shorelineResting(int $workersOnCard): string
    {
        return $workersOnCard > 0 ? 'shoreline' : 'discard';
    }
}
