<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\BuildCost;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the pure build-cost modifier engine, plus 600 randomized
 * vectors cross-checked against sim.js effectiveBuildCost
 * (tests/oracle/gen_buildcost_vectors.js).
 */
final class BuildCostTest extends TestCase
{
    public function testNoModifiersReturnsPrintedCost(): void
    {
        $r = BuildCost::effective(['logs' => 4, 'mud' => 2], [], []);
        self::assertSame(['logs' => 4, 'mud' => 2], $r['eff']);
        self::assertFalse($r['granaryUsed']);
        self::assertFalse($r['stoneToolUsed']);
    }

    public function testCattailMarshHalvesReedsCeil(): void
    {
        self::assertSame(['reeds' => 2], BuildCost::effective(['reeds' => 4], [], ['cattailMarsh' => true])['eff']);
        // ceil: 3 -> 2, 1 -> 1 (no saving).
        self::assertSame(['reeds' => 2], BuildCost::effective(['reeds' => 3], [], ['cattailMarsh' => true])['eff']);
        self::assertSame(['reeds' => 1], BuildCost::effective(['reeds' => 1], [], ['cattailMarsh' => true])['eff']);
    }

    public function testCharcoalPitSpendsSurplusClayOnADeficit(): void
    {
        // Need logs:3 reeds:1, hold only logs:1 but clay:5 surplus -> 1 logs becomes clay.
        $r = BuildCost::effective(['logs' => 3, 'reeds' => 1], ['logs' => 1, 'clay' => 5], ['charcoalPit' => true]);
        self::assertSame(['logs' => 2, 'reeds' => 1, 'clay' => 1], $r['eff']);
    }

    public function testStoneToolOnceFlagAndReports(): void
    {
        $r = BuildCost::effective(['logs' => 3], ['logs' => 1, 'stones' => 4], ['stoneTool' => true]);
        self::assertSame(['logs' => 2, 'stones' => 1], $r['eff']);
        self::assertTrue($r['stoneToolUsed']);
        // Already used -> no substitution.
        $r2 = BuildCost::effective(['logs' => 3], ['logs' => 1, 'stones' => 4], ['stoneTool' => true, 'stoneToolUsed' => true]);
        self::assertSame(['logs' => 3], $r2['eff']);
        self::assertFalse($r2['stoneToolUsed']);
    }

    public function testTreatyStonePaysTwoForOne(): void
    {
        // Need reeds:2 (hold 0) + logs:1 with logs surplus 5 -> cover 1 reeds by 2 logs.
        $r = BuildCost::effective(['reeds' => 2, 'logs' => 1], ['logs' => 6], ['treatyStone' => true]);
        self::assertSame(['reeds' => 1, 'logs' => 3], $r['eff']);
    }

    public function testGranaryDropsOneDeficitMaterialOnce(): void
    {
        $r = BuildCost::effective(['logs' => 3, 'mud' => 2], ['mud' => 5], ['granary' => true]);
        self::assertSame(['logs' => 2, 'mud' => 2], $r['eff']);
        self::assertTrue($r['granaryUsed']);
        // Already used -> unchanged.
        self::assertSame(['logs' => 3, 'mud' => 2],
            BuildCost::effective(['logs' => 3, 'mud' => 2], ['mud' => 5], ['granary' => true, 'granaryUsed' => true])['eff']);
    }

    /** @dataProvider simVectors */
    public function testMatchesSim(array $cost, array $wbm, array $flags, array $eff, bool $granaryUsed, bool $stoneToolUsed): void
    {
        $r = BuildCost::effective($cost, $wbm, $flags);
        self::assertSame($eff, $r['eff']);
        self::assertSame($granaryUsed, $r['granaryUsed']);
        self::assertSame($stoneToolUsed, $r['stoneToolUsed']);
    }

    public static function simVectors(): array
    {
        $data = json_decode((string) file_get_contents(__DIR__ . '/fixtures/buildcost_vectors.json'), true);
        $cases = [];
        foreach ($data as $i => $v) {
            $cases["vec$i"] = [$v['cost'], $v['wbm'], $v['flags'], $v['eff'], $v['granaryUsed'], $v['stoneToolUsed']];
        }
        return $cases;
    }
}
