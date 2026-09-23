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
     * Flotsam Raft after ANY auction on it [rule 2026-09-23, replacing the
     * 2026-09-19 last call]. The raft never reaches the shoreline: it slides one
     * space downstream as usual EVEN IF every icon was claimed (Headwaters ->
     * River 1, River N -> River N+1) and moors at River 4 instead of graduating.
     * With no worker aboard it is discarded. Mirrors sim.js/web resolveAuction
     * (full raft -> jamCardDownriver) + raftStaysOnRiver.
     *
     * @param string $location 'headwaters' | 'river'
     * @param int    $slot     river space 1..4 (ignored for 'headwaters')
     * @param int    $workersAboard workers on the raft after placement
     * @return array{location:string, slot:int} 'discard' carries slot 0
     */
    public static function raftAfterAuction(string $location, int $slot, int $workersAboard): array
    {
        if ($workersAboard <= 0) {
            return ['location' => 'discard', 'slot' => 0];
        }
        if ($location === 'headwaters') {
            return ['location' => 'river', 'slot' => 1];
        }
        return ['location' => 'river', 'slot' => min(4, $slot + 1)];
    }

    /**
     * Where the Flotsam Raft goes when any effect would send a card to the
     * shoreline (fully covered, Spillway wash, sliding off River 4, ...): with a
     * worker aboard it stays on the river (a Headwaters raft enters River 1; a
     * river raft keeps its slot); with none it is discarded. Mirrors sim.js/web
     * raftStaysOnRiver.
     *
     * @return array{location:string, slot:int}
     */
    public static function raftInsteadOfShoreline(string $location, int $slot, int $workersAboard): array
    {
        if ($workersAboard <= 0) {
            return ['location' => 'discard', 'slot' => 0];
        }
        if ($location === 'headwaters') {
            return ['location' => 'river', 'slot' => 1];
        }
        return ['location' => 'river', 'slot' => $slot];
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
