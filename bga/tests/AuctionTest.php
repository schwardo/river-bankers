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
