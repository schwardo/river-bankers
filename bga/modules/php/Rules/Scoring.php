<?php
/**
 * River Bankers — pure end-of-game scoring (framework-independent).
 *
 * Ports sim.js totalVP (~line 177) + endgamePairVP (~line 602): printed VP of
 * built structures, plus the variable-VP ("?-VP") end-game clauses, plus
 * leftover-worker pairs. No DB / no framework — the EndScore state assembles a
 * player's end-state and calls this.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Scoring
{
    /** Cattail Patch: VP by number of distinct materials in built-card costs. */
    private const CATTAIL_PATCH_VP = [0, 1, 1, 2, 3, 5, 8];

    /** The ?-VP cohort (printed VP 0, scored by an end-game clause); Trophy Lodge counts these. */
    private const VARIABLE_VP_CARDS = [
        'Heron Watch', 'Pier', 'Vine Ladder', 'Vine Trellis', 'Stone Causeway',
        'Reed Walkway', 'Clay Vault', 'Burrow Network', 'Hidden Cache',
        'Cattail Patch', 'Trophy Lodge',
    ];

    /** Per-material end-game scalers: name => [perStructure, cap, material]. */
    private const MAT_ENDGAME = [
        'Vine Ladder'    => [4, 12, 'vines'],
        'Vine Trellis'   => [2, PHP_INT_MAX, 'vines'],
        'Stone Causeway' => [2, 8, 'stones'],
        'Reed Walkway'   => [2, PHP_INT_MAX, 'reeds'],
        'Clay Vault'     => [3, 12, 'clay'],
        'Burrow Network' => [3, 9, 'mud'],
    ];

    /**
     * Total VP for one player at game end.
     *
     * @param list<array{name:string, vp:int, cost:array<string,int>}> $built
     * @param array<string,int> $fixedWorkers leftover worker units that yield exactly that material
     * @param list<array{materials:array{0:string,1:string}, count:int}> $wildPools leftover wild-card worker pools
     * @param int $shorelineTotal total cards on the shoreline
     * @param int $shorelineWithMyWorkers shoreline cards where this player has >= 1 worker
     */
    public static function playerVP(
        array $built,
        array $fixedWorkers,
        array $wildPools,
        int $shorelineTotal,
        int $shorelineWithMyWorkers
    ): int {
        $names = array_map(fn(array $b) => $b['name'], $built);
        $has = fn(string $n): bool => in_array($n, $names, true);

        $v = 0;
        foreach ($built as $b) {
            $v += $b['vp'];
        }

        $distinct = [];
        foreach ($built as $b) {
            foreach ($b['cost'] as $m => $c) {
                if ($c > 0) {
                    $distinct[$m] = true;
                }
            }
        }
        $distinctCount = count($distinct);

        if ($has('Pier')) {
            $v += min(6, 2 * $shorelineWithMyWorkers);
        }
        if ($has('Cattail Patch')) {
            $v += self::CATTAIL_PATCH_VP[min($distinctCount, count(self::CATTAIL_PATCH_VP) - 1)];
        }
        foreach (self::MAT_ENDGAME as $name => [$mult, $cap, $mat]) {
            if ($has($name)) {
                $count = 0;
                foreach ($built as $b) {
                    if (($b['cost'][$mat] ?? 0) > 0) {
                        $count++;
                    }
                }
                $v += min($cap, $mult * $count);
            }
        }
        if ($has('Hidden Cache')) {
            $v += min(9, intdiv($distinctCount, 2) * 3);
        }
        if ($has('Heron Watch')) {
            $v += min(6, $shorelineTotal);
        }
        if ($has('Trophy Lodge')) {
            $count = 0;
            foreach ($built as $b) {
                if (in_array($b['name'], self::VARIABLE_VP_CARDS, true)) {
                    $count++;
                }
            }
            $v += min(12, 3 * $count);
        }

        return $v + self::pairVP($fixedWorkers, $wildPools);
    }

    /**
     * Leftover-worker scoring: floor(units / 2) per material, with each wild
     * pool's units split between its two materials to maximize total pairs.
     *
     * @param array<string,int> $fixedWorkers
     * @param list<array{materials:array{0:string,1:string}, count:int}> $wildPools
     */
    public static function pairVP(array $fixedWorkers, array $wildPools): int
    {
        $counts = $fixedWorkers;
        foreach ($wildPools as $pool) {
            [$a, $b] = $pool['materials'];
            $best = -1;
            $bestX = 0;
            for ($x = 0; $x <= $pool['count']; $x++) {
                $pairs = intdiv(($counts[$a] ?? 0) + $x, 2)
                       + intdiv(($counts[$b] ?? 0) + ($pool['count'] - $x), 2);
                if ($pairs > $best) {
                    $best = $pairs;
                    $bestX = $x;
                }
            }
            $counts[$a] = ($counts[$a] ?? 0) + $bestX;
            $counts[$b] = ($counts[$b] ?? 0) + ($pool['count'] - $bestX);
        }

        $vp = 0;
        foreach ($counts as $units) {
            $vp += intdiv($units, 2);
        }
        return $vp;
    }
}
