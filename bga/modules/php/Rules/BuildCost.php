<?php
/**
 * River Bankers — pure build-cost transformation (framework-independent).
 *
 * Faithful port of sim.js `effectiveBuildCost` (~line 749). Given a structure's
 * printed material cost and the builder's fixed-material worker holdings ($wbm,
 * Old-Growth yield already folded in), it applies the build-time cost modifiers
 * the player controls and returns the EFFECTIVE cost to pay, plus whether the
 * once-per-game Stone Tool / Granary fired (so the caller can flip those cards).
 *
 * Modifier order (matches sim.js exactly — order is load-bearing):
 *   1. Cattail Marsh   — halve the reeds requirement (ceil).
 *   2. Charcoal Pit    — 1 surplus Clay worker covers 1 non-clay deficit.
 *   3. Stone Tool      — once/game: 1 surplus Stones worker covers 1 non-stones deficit.
 *   4. Treaty Stone    — once/build: pay 2 of a surplus material for 1 of a deficit one.
 *   5. Granary         — once/game: drop 1 from the first still-deficit material.
 *
 * Substitution decisions read fixed-material surplus only ($wbm); wild pools are
 * resolved later by Rules\Build::allocate, exactly as sim.js splits the work.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class BuildCost
{
    /** Base material order (sim.js ORIG_MATERIALS / MAT_KEYS). */
    public const MAT_KEYS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];

    /**
     * @param array<string,int> $cost  printed structure cost (material => count)
     * @param array<string,int> $wbm   fixed-material worker counts (yield applied)
     * @param array{
     *     cattailMarsh?:bool, charcoalPit?:bool, stoneTool?:bool, stoneToolUsed?:bool,
     *     treatyStone?:bool, granary?:bool, granaryUsed?:bool
     * } $flags  which build modifiers the player controls + their used-state
     * @return array{eff:array<string,int>, granaryUsed:bool, stoneToolUsed:bool}
     */
    public static function effective(array $cost, array $wbm, array $flags): array
    {
        $eff = [];
        foreach ($cost as $m => $n) {
            $eff[$m] = $n;
        }

        if (!empty($flags['cattailMarsh']) && !empty($eff['reeds'])) {
            $eff['reeds'] = (int) ceil($eff['reeds'] / 2);
        }

        if (!empty($flags['charcoalPit'])) {
            $claySlack = ($wbm['clay'] ?? 0) - ($eff['clay'] ?? 0);
            if ($claySlack >= 1) {
                foreach (array_keys($cost) as $m) {
                    if ($m === 'clay') {
                        continue;
                    }
                    if (($wbm[$m] ?? 0) < $eff[$m]) {
                        $eff[$m] -= 1;
                        $eff['clay'] = ($eff['clay'] ?? 0) + 1;
                        break;
                    }
                }
            }
        }

        // Stone Tool (otter starter): once-per-game Charcoal-Pit variant on Stones.
        $stoneToolUsed = false;
        if (!empty($flags['stoneTool']) && empty($flags['stoneToolUsed'])) {
            $stoneSlack = ($wbm['stones'] ?? 0) - ($eff['stones'] ?? 0);
            if ($stoneSlack >= 1) {
                foreach (array_keys($cost) as $m) {
                    if ($m === 'stones') {
                        continue;
                    }
                    if (($wbm[$m] ?? 0) < $eff[$m]) {
                        $eff[$m] -= 1;
                        $eff['stones'] = ($eff['stones'] ?? 0) + 1;
                        $stoneToolUsed = true;
                        break;
                    }
                }
            }
        }

        // Treaty Stone: once per build, cover 1 missing of one material by paying
        // 2 of a surplus material (any-to-any), only when a real deficit remains.
        if (!empty($flags['treatyStone'])) {
            foreach (self::MAT_KEYS as $target) {
                if (($wbm[$target] ?? 0) >= ($eff[$target] ?? 0)) {
                    continue;
                }
                $found = false;
                foreach (self::MAT_KEYS as $source) {
                    if ($source === $target) {
                        continue;
                    }
                    if (($wbm[$source] ?? 0) - ($eff[$source] ?? 0) < 2) {
                        continue;
                    }
                    $eff[$target] -= 1;
                    $eff[$source] = ($eff[$source] ?? 0) + 2;
                    $found = true;
                    break;
                }
                if ($found) {
                    break;
                }
            }
        }

        $granaryUsed = false;
        if (!empty($flags['granary']) && empty($flags['granaryUsed'])) {
            foreach (array_keys($eff) as $m) {
                if (($wbm[$m] ?? 0) < $eff[$m]) {
                    $eff[$m] -= 1;
                    $granaryUsed = true;
                    break;
                }
            }
        }

        return ['eff' => $eff, 'granaryUsed' => $granaryUsed, 'stoneToolUsed' => $stoneToolUsed];
    }
}
