<?php
/**
 * River Bankers — pure auction resolution (framework-independent).
 *
 * Ported from sim.js resolveAuction (the plenty/jam branches, ~lines 1453-1506).
 * Deliberately has NO DB and NO BGA-framework dependency: plain ints in, plain
 * arrays out, so it can be unit-tested directly and cross-checked against
 * sim.js. The Phase 4 state classes are thin adapters — read DB, call these
 * helpers, write DB + notify.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Auction
{
    /**
     * Workers each bidder actually places ("clinched") when distributing `open`
     * uncovered icons across sealed worker bids. Multi-winner:
     *   - plenty (sum of bids <= open): everyone places their full bid;
     *   - jam    (sum of bids >  open): got = max(0, bid - overbid),
     *            where overbid = sum(bids) - open.
     * Equivalent to sim.js's max(0, min(bid, open - others)); the unified
     * overbid form also covers the plenty case (overbid = 0 => got = bid).
     *
     * @param int            $open uncovered icons on the card (>= 0)
     * @param array<int,int> $bids playerId => workers bid (>= 0)
     * @return array<int,int> playerId => workers placed (same keys/order as $bids)
     */
    public static function clinched(int $open, array $bids): array
    {
        $overbid = max(0, array_sum($bids) - $open);
        $out = [];
        foreach ($bids as $pid => $bid) {
            $out[$pid] = max(0, $bid - $overbid);
        }
        return $out;
    }

    /**
     * Workers each bidder pays fish for. Normally the full bid (you pay for
     * every worker you bid, win or lose). A bidder who controls a built Pontoon
     * and failed to place their whole bid in a jam pays for one fewer worker.
     * (sim.js: billable = (got < bid && Pontoon) ? max(0, bid - 1) : bid.)
     *
     * @param int             $open
     * @param array<int,int>  $bids    playerId => workers bid
     * @param array<int,bool> $pontoon playerId => controls a built Pontoon
     * @return array<int,int>  playerId => workers billed
     */
    public static function billableWorkers(int $open, array $bids, array $pontoon = []): array
    {
        $clinched = self::clinched($open, $bids);
        $out = [];
        foreach ($bids as $pid => $bid) {
            $hasPontoon = $pontoon[$pid] ?? false;
            $out[$pid] = ($hasPontoon && $clinched[$pid] < $bid) ? max(0, $bid - 1) : $bid;
        }
        return $out;
    }
}
