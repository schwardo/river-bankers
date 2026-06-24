<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Scoring;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for end-of-game scoring. The variable-VP clauses are hand-checked
 * against the rulebook; pairVP is also cross-checked against sim.js
 * endgamePairVP over 400 vectors (tests/oracle/gen_pairvp_vectors.js).
 */
final class ScoringTest extends TestCase
{
    /** @return array{name:string, vp:int, cost:array<string,int>} */
    private static function card(string $name, int $vp, array $cost): array
    {
        return ['name' => $name, 'vp' => $vp, 'cost' => $cost];
    }

    public function testPrintedVpSum(): void
    {
        $built = [self::card('Spillway', 6, ['logs' => 4]), self::card('Mill Wheel', 6, ['logs' => 3])];
        self::assertSame(12, Scoring::playerVP($built, [], [], 0, 0));
    }

    public function testLeftoverPairsFixed(): void
    {
        // 4 logs + 4 mud = 2 + 2 = 4 pairs; 3 reeds = 1 (singleton drops).
        self::assertSame(4, Scoring::pairVP(['logs' => 4, 'mud' => 4], []));
        self::assertSame(1, Scoring::pairVP(['reeds' => 3], []));
        self::assertSame(0, Scoring::pairVP(['logs' => 1, 'mud' => 1, 'reeds' => 1], []));
    }

    public function testWildPoolMaximizesPairs(): void
    {
        // 3 logs + a logs/reeds wild of 1: best is logs=4 -> 2 pairs.
        self::assertSame(2, Scoring::pairVP(['logs' => 3], [['materials' => ['logs', 'reeds'], 'count' => 1]]));
        // 1 logs + 1 reeds + wild 2 -> assign to make logs=2,reeds=2 -> 2 pairs.
        self::assertSame(2, Scoring::pairVP(['logs' => 1, 'reeds' => 1], [['materials' => ['logs', 'reeds'], 'count' => 2]]));
    }

    public function testPier(): void
    {
        // 2 per shoreline card with my workers, cap 6.
        $built = [self::card('Pier', 0, ['logs' => 3, 'stones' => 2])];
        self::assertSame(4, Scoring::playerVP($built, [], [], 5, 2));
        self::assertSame(6, Scoring::playerVP($built, [], [], 9, 5)); // capped
    }

    public function testHeronWatch(): void
    {
        $built = [self::card('Heron Watch', 0, ['stones' => 4, 'logs' => 2])];
        self::assertSame(4, Scoring::playerVP($built, [], [], 4, 0));
        self::assertSame(6, Scoring::playerVP($built, [], [], 9, 0)); // capped at 6
    }

    public function testCattailPatchByDistinctMaterials(): void
    {
        // Built costs span logs, mud, reeds = 3 distinct -> table[3] = 2.
        $built = [
            self::card('Cattail Patch', 0, ['reeds' => 3, 'mud' => 2]),
            self::card('X', 0, ['logs' => 2]),
        ];
        self::assertSame(2, Scoring::playerVP($built, [], [], 0, 0));
    }

    public function testMaterialScalerWithCap(): void
    {
        // Vine Ladder: 4 VP per built card using vines, cap 12.
        $built = [
            self::card('Vine Ladder', 0, ['vines' => 4, 'stones' => 2]),
            self::card('A', 0, ['vines' => 3]),
            self::card('B', 0, ['vines' => 1]),
            self::card('C', 0, ['vines' => 2]),
        ];
        // 4 vines-using cards * 4 = 16, capped at 12.
        self::assertSame(12, Scoring::playerVP($built, [], [], 0, 0));
    }

    public function testTrophyLodgeCountsVariableVpCards(): void
    {
        // Trophy Lodge + Pier + Heron Watch = 3 variable-VP cards * 3 = 9.
        $built = [
            self::card('Trophy Lodge', 0, ['clay' => 3, 'stones' => 2]),
            self::card('Pier', 0, ['logs' => 3, 'stones' => 2]),
            self::card('Heron Watch', 0, ['stones' => 4, 'logs' => 2]),
        ];
        // Trophy Lodge: 9. Pier: shoreline 0 -> 0. Heron Watch: shoreline 0 -> 0.
        self::assertSame(9, Scoring::playerVP($built, [], [], 0, 0));
    }

    /** @dataProvider pairVpVectors */
    public function testPairVpMatchesSim(array $fixed, array $wildPools, int $expected): void
    {
        self::assertSame($expected, Scoring::pairVP($fixed, $wildPools));
    }

    public static function pairVpVectors(): array
    {
        $data = json_decode((string) file_get_contents(__DIR__ . '/fixtures/pairvp_vectors.json'), true);
        $cases = [];
        foreach ($data as $i => $v) {
            // JSON objects decode to assoc arrays; an empty {} becomes [].
            $wild = [];
            foreach ($v['wildPools'] as $p) {
                $wild[] = ['materials' => $p['materials'], 'count' => $p['count']];
            }
            $cases["vec$i"] = [$v['fixed'], $wild, $v['expected']];
        }
        return $cases;
    }
}
