<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Auction;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the pure auction resolver. Anchored on the two rulebook worked
 * examples, plus 500 randomized vectors cross-checked against sim.js's formula
 * (see tests/oracle/gen_auction_vectors.js).
 */
final class AuctionTest extends TestCase
{
    public function testRulebookJamExample(): void
    {
        // Rulebook "Example — jam": 5 icons, both bid 4 (overbid 3) -> 1 each.
        self::assertSame([1, 1], array_values(Auction::clinched(5, [4, 4])));
    }

    public function testRulebookOutbidExample(): void
    {
        // Rulebook "Example — outbid": 5 icons, bids 1 and 5 (overbid 1) -> 0 and 4.
        self::assertSame([0, 4], array_values(Auction::clinched(5, [1, 5])));
    }

    public function testPlentyEveryonePlacesFullBid(): void
    {
        self::assertSame([2, 1, 0], array_values(Auction::clinched(5, [2, 1, 0])));
    }

    public function testNoBidsPlacesNothing(): void
    {
        self::assertSame([0, 0], array_values(Auction::clinched(5, [0, 0])));
    }

    public function testPontoonRefundsOneOnJam(): void
    {
        // Jam: bids 4,4 on 5 icons -> clinched 1,1. Player 0 has a Pontoon and
        // under-placed (1 < 4) so is billed 3; player 1 is billed the full 4.
        self::assertSame([3, 4], array_values(Auction::billableWorkers(5, [4, 4], [true, false])));
    }

    public function testKeysArePreserved(): void
    {
        // Real bids are keyed by player_id, not 0-based — keys must survive.
        self::assertSame([7 => 1, 4 => 1], Auction::clinched(5, [7 => 4, 4 => 4]));
    }

    public function testInitiatorConsolationOnWipe(): void
    {
        // 5 icons, three bids of 3 (overbid 4): got = max(0, 3 - 4) = 0 for all,
        // so nobody wins. The initiator (player 20) is guaranteed 1 item.
        $bids = [10 => 3, 20 => 3, 30 => 3];
        $clinched = Auction::clinched(5, $bids);
        self::assertSame([10 => 0, 20 => 0, 30 => 0], $clinched);
        self::assertSame(
            [10 => 0, 20 => 1, 30 => 0],
            Auction::withInitiatorConsolation(5, $bids, $clinched, 20)
        );
    }

    public function testNoConsolationWhenSomeoneWins(): void
    {
        // 5 icons, bids 1 and 5 (overbid 1): clinched 0 and 4 — someone won, so
        // the consolation must not fire even though the initiator (10) got zero.
        $bids = [10 => 1, 20 => 5];
        $clinched = Auction::clinched(5, $bids);
        self::assertSame($clinched, Auction::withInitiatorConsolation(5, $bids, $clinched, 10));
    }

    public function testNoConsolationWhenNoOpenIcons(): void
    {
        // Degenerate 0-icon card: nothing to award, initiator stays at 0.
        $bids = [10 => 2, 20 => 2];
        $clinched = Auction::clinched(0, $bids);
        self::assertSame($clinched, Auction::withInitiatorConsolation(0, $bids, $clinched, 10));
    }

    public function testBillableUsesConsolationClinch(): void
    {
        // Wipe (5 icons, 3/3/3). Initiator 10 is bumped to 1 clinched; with a
        // Pontoon and 1 < bid 3 it pays for one fewer (2); others pay full 3.
        $bids = [10 => 3, 20 => 3, 30 => 3];
        $clinched = Auction::withInitiatorConsolation(5, $bids, Auction::clinched(5, $bids), 10);
        self::assertSame(
            [10 => 2, 20 => 3, 30 => 3],
            Auction::billableWorkers(5, $bids, [10 => true], $clinched)
        );
    }

    /** @dataProvider simVectors */
    public function testClinchedMatchesSim(int $open, array $bids, array $clinched, array $pontoon, array $billable): void
    {
        self::assertSame($clinched, array_values(Auction::clinched($open, $bids)));
    }

    /** @dataProvider simVectors */
    public function testBillableMatchesSim(int $open, array $bids, array $clinched, array $pontoon, array $billable): void
    {
        self::assertSame($billable, array_values(Auction::billableWorkers($open, $bids, $pontoon)));
    }

    public static function simVectors(): array
    {
        $path = __DIR__ . '/fixtures/auction_vectors.json';
        $data = json_decode((string) file_get_contents($path), true);
        $cases = [];
        foreach ($data as $i => $v) {
            $cases["vec$i"] = [$v['open'], $v['bids'], $v['clinched'], $v['pontoon'], $v['billable']];
        }
        return $cases;
    }
}
