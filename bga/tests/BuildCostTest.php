<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\BuildCost;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the pure build-cost modifier engine, plus 600 randomized
 * vectors (about half with wild pools) cross-checked against sim.js effectiveBuildCost
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

    // --- Explicit player choices (4th arg) -----------------------------------

    public function testExplicitEmptyChoicesMatchesHeuristic(): void
    {
        // A non-null but empty choices array is still "heuristic mode".
        $r = BuildCost::effective(['logs' => 3, 'mud' => 2], ['mud' => 5], ['granary' => true], []);
        self::assertSame(['logs' => 2, 'mud' => 2], $r['eff']);
        self::assertTrue($r['granaryUsed']);
    }

    public function testExplicitGranaryHonorsChosenMaterial(): void
    {
        // Two deficits (logs, stones): heuristic drops logs; the player picks stones.
        $flags = ['granary' => true];
        $cost = ['logs' => 3, 'stones' => 3];
        $wbm = [];
        self::assertSame(['logs' => 2, 'stones' => 3], BuildCost::effective($cost, $wbm, $flags)['eff']);
        $r = BuildCost::effective($cost, $wbm, $flags, ['granary' => 'stones']);
        self::assertSame(['logs' => 3, 'stones' => 2], $r['eff']);
        self::assertTrue($r['granaryUsed']);
    }

    public function testExplicitDeclineLeavesCostUnchanged(): void
    {
        // Player owns Granary but declines (absent key in a non-empty choices set).
        $r = BuildCost::effective(['logs' => 3, 'mud' => 2], ['mud' => 5], ['granary' => true], ['charcoalPit' => null]);
        self::assertSame(['logs' => 3, 'mud' => 2], $r['eff']);
        self::assertFalse($r['granaryUsed']);
    }

    public function testExplicitMarkerAloneDeclinesEverything(): void
    {
        // The client flow sends {explicit:true} when the player declined every
        // modifier. That must fire nothing, not fall back to heuristic mode
        // (which would spend Stone Tool here).
        $r = BuildCost::effective(['logs' => 3], ['logs' => 1, 'stones' => 4], ['stoneTool' => true], ['explicit' => true]);
        self::assertSame(['logs' => 3], $r['eff']);
        self::assertFalse($r['stoneToolUsed']);
    }

    public function testEmptyChoicesStillAutoFire(): void
    {
        // Contrast with the marker case above: a truly empty payload (no client
        // flow, e.g. an old client) keeps the heuristic auto-fire.
        $heuristic = BuildCost::effective(['logs' => 3], ['logs' => 1, 'stones' => 4], ['stoneTool' => true], []);
        self::assertTrue($heuristic['stoneToolUsed']);
    }

    public function testExplicitTreatyStoneHonorsPair(): void
    {
        // Cover reeds by paying 2 mud (both are legal surplus sources; player picks mud).
        $r = BuildCost::effective(['reeds' => 2], ['logs' => 6, 'mud' => 6],
            ['treatyStone' => true], ['treatyStone' => ['target' => 'reeds', 'source' => 'mud']]);
        self::assertSame(['reeds' => 1, 'mud' => 2], $r['eff']);
    }

    public function testExplicitUnavailableModifierThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        BuildCost::effective(['logs' => 3], [], ['granary' => false], ['granary' => 'logs']);
    }

    public function testExplicitAlreadyUsedOnceCardThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        BuildCost::effective(['logs' => 3], ['stones' => 4],
            ['stoneTool' => true, 'stoneToolUsed' => true], ['stoneTool' => 'logs']);
    }

    public function testExplicitNonDeficitTargetThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        // logs is fully covered — discounting it is illegal.
        BuildCost::effective(['logs' => 3], ['logs' => 5], ['granary' => true], ['granary' => 'logs']);
    }

    public function testExplicitTreatyStoneInsufficientSurplusThrows(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        // mud surplus is only 1 (<2), so paying 2 mud is illegal.
        BuildCost::effective(['reeds' => 2], ['mud' => 1], ['treatyStone' => true],
            ['treatyStone' => ['target' => 'reeds', 'source' => 'mud']]);
    }

    // --- Wild pools (2026-09-23 3P web playtest #6) ---------------------------

    public function testCharcoalPitUsesMudSlickClay(): void
    {
        // Flush Channel (3 mud + 1 reed) with 5 Mud Slick workers and nothing
        // else: a Mud Slick worker spent as clay stands in for the reed.
        $pools = [['materials' => ['clay', 'mud'], 'count' => 5]];
        $r = BuildCost::effective(['mud' => 3, 'reeds' => 1], [], ['charcoalPit' => true], [], $pools);
        self::assertSame(['mud' => 3, 'reeds' => 0, 'clay' => 1], $r['eff']);
        // Explicit pick is legal too (no fixed clay surplus needed).
        $e = BuildCost::effective(['mud' => 3, 'reeds' => 1], [], ['charcoalPit' => true],
            ['charcoalPit' => 'reeds'], $pools);
        self::assertSame(['mud' => 3, 'reeds' => 0, 'clay' => 1], $e['eff']);
    }

    public function testCharcoalPitStaysOffWhenPoolsCannotPay(): void
    {
        // Only 3 Mud Slick workers: all go to mud, none left to be the clay.
        $pools = [['materials' => ['clay', 'mud'], 'count' => 3]];
        $r = BuildCost::effective(['mud' => 3, 'reeds' => 1], [], ['charcoalPit' => true], [], $pools);
        self::assertSame(['mud' => 3, 'reeds' => 1], $r['eff']);
        $this->expectException(\InvalidArgumentException::class);
        BuildCost::effective(['mud' => 3, 'reeds' => 1], [], ['charcoalPit' => true], ['charcoalPit' => 'reeds'], $pools);
    }

    public function testStoneToolUsesBrambleShoalStones(): void
    {
        $pools = [['materials' => ['stones', 'vines'], 'count' => 1]];
        $r = BuildCost::effective(['logs' => 3], ['logs' => 2], ['stoneTool' => true], [], $pools);
        self::assertSame(['logs' => 2, 'stones' => 1], $r['eff']);
        self::assertTrue($r['stoneToolUsed']);
    }

    public function testTreatyStonePaysFromWildSurplus(): void
    {
        // Clay short by 1, two Driftwood Tangle workers pay 2 logs for it.
        $pools = [['materials' => ['logs', 'reeds'], 'count' => 2]];
        $r = BuildCost::effective(['clay' => 1], [], ['treatyStone' => true], [], $pools);
        self::assertSame(['clay' => 0, 'logs' => 2], $r['eff']);
    }

    /** @dataProvider simVectors */
    public function testMatchesSim(array $cost, array $wbm, array $pools, array $flags, array $eff, bool $granaryUsed, bool $stoneToolUsed): void
    {
        $r = BuildCost::effective($cost, $wbm, $flags, [], $pools);
        self::assertSame($eff, $r['eff']);
        self::assertSame($granaryUsed, $r['granaryUsed']);
        self::assertSame($stoneToolUsed, $r['stoneToolUsed']);
    }

    public static function simVectors(): array
    {
        $data = json_decode((string) file_get_contents(__DIR__ . '/fixtures/buildcost_vectors.json'), true);
        $cases = [];
        foreach ($data as $i => $v) {
            $cases["vec$i"] = [$v['cost'], $v['wbm'], $v['pools'] ?? [], $v['flags'], $v['eff'], $v['granaryUsed'], $v['stoneToolUsed']];
        }
        return $cases;
    }
}
