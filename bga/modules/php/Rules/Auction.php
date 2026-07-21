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
     * Initiator consolation: when a jam is a TOTAL WIPE (nobody clinched a
     * single item), the player who triggered the auction is guaranteed to win 1.
     * A wipe leaves every icon uncovered (sum of clinched == 0 < open), so the
     * initiator simply claims one — no other bidder loses a worker. The wipe test
     * is pure overbid math: got_j = max(0, bid_j - overbid), so nobody wins iff
     * max(bid) <= overbid, i.e. sum(clinched) == 0. Mirrors sim.js resolveAuction's
     * consolation branch (RB_INIT_CONSOLATION). Applies only to the single-card
     * path (as in the sim); Confluence combined lots are excluded.
     *
     * @param int            $open      uncovered icons on the card (>= 0)
     * @param array<int,int> $bids      playerId => workers bid
     * @param array<int,int> $clinched  playerId => workers placed (from clinched())
     * @param int            $initiator trigger player's id
     * @return array<int,int> $clinched with the initiator bumped to 1 on a total wipe
     */
    public static function withInitiatorConsolation(int $open, array $bids, array $clinched, int $initiator): array
    {
        if ($open <= 0) {
            return $clinched;               // no spot to award
        }
        if (array_sum($clinched) !== 0) {
            return $clinched;               // someone won → not a total wipe
        }
        if (($bids[$initiator] ?? 0) < 1) {
            return $clinched;               // initiator didn't bid (trigger always bids >= 1)
        }
        $clinched[$initiator] = 1;
        return $clinched;
    }

    /**
     * Workers each bidder pays fish for. Normally the full bid (you pay for
     * every worker you bid, win or lose). A bidder who controls a built Pontoon
     * and failed to place their whole bid in a jam pays for one fewer worker.
     * (sim.js: billable = (got < bid && Pontoon) ? max(0, bid - 1) : bid.)
     *
     * @param int             $open
     * @param array<int,int>  $bids     playerId => workers bid
     * @param array<int,bool> $pontoon  playerId => controls a built Pontoon
     * @param ?array<int,int> $clinched precomputed placed workers (e.g. after the
     *                                  initiator-consolation bump); recomputed when null
     * @return array<int,int>  playerId => workers billed
     */
    public static function billableWorkers(int $open, array $bids, array $pontoon = [], ?array $clinched = null): array
    {
        $clinched = $clinched ?? self::clinched($open, $bids);
        $out = [];
        foreach ($bids as $pid => $bid) {
            $hasPontoon = $pontoon[$pid] ?? false;
            $out[$pid] = ($hasPontoon && $clinched[$pid] < $bid) ? max(0, $bid - 1) : $bid;
        }
        return $out;
    }
}
