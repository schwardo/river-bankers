<?php
/**
 * River Bankers — pure build-cost transformation (framework-independent).
 *
 * Faithful port of sim.js `effectiveBuildCost` (~line 1093). Given a structure's
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
 * Substitution decisions are judged on the wild-aware shortfall (fixed $wbm plus
 * the optional $pools), exactly as sim.js bestSubstitution does; which workers
 * actually pay is still decided later by Rules\Build::allocate.
 *
 * Player choice vs. heuristic: the optional 4th arg $choices lets the caller
 * pass explicit player decisions for the four *optional* modifiers (Charcoal
 * Pit / Stone Tool / Treaty Stone / Granary — Cattail Marsh is always-on and
 * choiceless). When $choices is empty (preview pills, AI, zombie, unit tests)
 * every modifier auto-fires where it most reduces the shortfall, exactly as
 * sim.js does — so the sim.js oracle vectors match. When $choices is NON-empty
 * the player is driving: each optional modifier fires ONLY if its key is present
 * with a target, and the target is validated (must be owned, unused, and either
 * a fixed deficit with the required fixed surplus, or a pick that reduces the
 * wild-aware shortfall — e.g. Charcoal Pit paid with Mud Slick clay). Illegal
 * picks throw \InvalidArgumentException for the framework layer to surface as a
 * UserException.
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
     * @param array{
     *     explicit?:true, charcoalPit?:string|null, stoneTool?:string|null, granary?:string|null,
     *     treatyStone?:array{target:string,source:string}|null
     * } $choices  explicit player decisions; empty array = auto-fire heuristic
     * @param list<array{materials:array{0:string,1:string}, count:int}> $pools
     *     the builder's wild holdings (Driftwood Tangle / Mud Slick / Bramble
     *     Shoal), each worker payable as either material
     * @return array{eff:array<string,int>, granaryUsed:bool, stoneToolUsed:bool}
     */
    public static function effective(array $cost, array $wbm, array $flags, array $choices = [], array $pools = []): array
    {
        $explicit = $choices !== [];
        $eff = [];
        foreach ($cost as $m => $n) {
            $eff[$m] = $n;
        }

        // Cattail Marsh — always-on, no player choice.
        if (!empty($flags['cattailMarsh']) && !empty($eff['reeds'])) {
            $eff['reeds'] = (int) ceil($eff['reeds'] / 2);
        }

        // Charcoal Pit — 1 Clay worker covers 1 non-clay shortfall. The clay may
        // sit on a wildcard (Mud Slick): trials are judged on the wild-aware
        // shortfall, not on fixed clay surplus (2026-09-23 3P web playtest #6).
        if (self::wants($explicit, $choices, 'charcoalPit', !empty($flags['charcoalPit']))) {
            $t = self::coverPick($explicit, $choices, 'charcoalPit', 'clay', $cost, $eff, $wbm, $pools);
            if ($t !== null) {
                $eff = $t;
            }
        }

        // Stone Tool (otter starter): once-per-game Charcoal-Pit variant on Stones.
        $stoneToolUsed = false;
        $stoneAvail = !empty($flags['stoneTool']) && empty($flags['stoneToolUsed']);
        if (self::wants($explicit, $choices, 'stoneTool', $stoneAvail)) {
            $t = self::coverPick($explicit, $choices, 'stoneTool', 'stones', $cost, $eff, $wbm, $pools);
            if ($t !== null) {
                $eff = $t;
                $stoneToolUsed = true;
            }
        }

        // Treaty Stone: once per build, cover 1 missing of one material by paying
        // 2 of another (fixed or wild), only when a real shortfall remains.
        if (self::wants($explicit, $choices, 'treatyStone', !empty($flags['treatyStone']))) {
            $t = self::treatyPick($explicit, $choices, $eff, $wbm, $pools);
            if ($t !== null) {
                $eff = $t;
            }
        }

        // Granary — once-per-game: drop 1 from a deficit material.
        $granaryUsed = false;
        $granaryAvail = !empty($flags['granary']) && empty($flags['granaryUsed']);
        if (self::wants($explicit, $choices, 'granary', $granaryAvail)) {
            $target = self::granaryTarget($explicit, $choices, $eff, $wbm, $pools);
            if ($target !== null) {
                $eff[$target] -= 1;
                $granaryUsed = true;
            }
        }

        return ['eff' => $eff, 'granaryUsed' => $granaryUsed, 'stoneToolUsed' => $stoneToolUsed];
    }

    /**
     * Units of $eff still unpaid after fixed workers AND the wild pools. Port of
     * sim.js wildShortfall/wildRemainder: each pool, in order, fills its larger
     * remaining deficit first (stable on ties, so [material, wildAlt] order).
     *
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     * @param list<array{materials:array{0:string,1:string}, count:int}> $pools
     */
    public static function wildShortfall(array $eff, array $wbm, array $pools): int
    {
        $rem = [];
        foreach ($eff as $m => $n) {
            $d = max(0, $n - ($wbm[$m] ?? 0));
            if ($d > 0) {
                $rem[$m] = $d;
            }
        }
        foreach ($pools as $pool) {
            $avail = (int) $pool['count'];
            if ($avail === 0) {
                continue;
            }
            $mats = $pool['materials'];
            usort($mats, fn(string $a, string $b): int => ($rem[$b] ?? 0) <=> ($rem[$a] ?? 0));
            foreach ($mats as $m) {
                if ($avail === 0) {
                    break;
                }
                $need = $rem[$m] ?? 0;
                if ($need === 0) {
                    continue;
                }
                $take = min($avail, $need);
                $rem[$m] = $need - $take;
                $avail -= $take;
            }
        }
        $short = 0;
        foreach ($rem as $n) {
            $short += max(0, $n);
        }
        return $short;
    }

    /**
     * Of the candidate adjusted costs, the one that most reduces the wild-aware
     * shortfall (first on ties), or null if none helps. Port of sim.js
     * bestSubstitution.
     *
     * @param array<string,int> $eff
     * @param list<array<string,int>> $trials
     * @return array<string,int>|null
     */
    private static function best(array $eff, array $wbm, array $pools, array $trials): ?array
    {
        $best = null;
        $bestShort = self::wildShortfall($eff, $wbm, $pools);
        foreach ($trials as $t) {
            $s = self::wildShortfall($t, $wbm, $pools);
            if ($s < $bestShort) {
                $bestShort = $s;
                $best = $t;
            }
        }
        return $best;
    }

    /**
     * @param array<string,mixed> $choices
     */
    private static function wants(bool $explicit, array $choices, string $key, bool $available): bool
    {
        if (!$explicit) {
            return $available;
        }
        $picked = ($choices[$key] ?? null) !== null;
        if ($picked && !$available) {
            throw new \InvalidArgumentException("$key is not available to use");
        }
        return $picked;
    }

    /** $eff with 1 of $target paid by 1 of $src instead. */
    private static function swapOne(array $eff, string $target, string $src): array
    {
        $t = $eff;
        $t[$target] -= 1;
        $t[$src] = ($t[$src] ?? 0) + 1;
        return $t;
    }

    /**
     * "1 $src worker covers 1 other material" (Charcoal Pit / Stone Tool).
     * Heuristic: sim.js bestSubstitution over the printed materials. Explicit:
     * the chosen target, legal if it is a fixed deficit with fixed $src surplus
     * (the pre-wildcard rule) or if it reduces the wild-aware shortfall.
     * Returns the adjusted cost, or null when nothing applies.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $cost
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     * @return array<string,int>|null
     */
    private static function coverPick(bool $explicit, array $choices, string $key, string $src, array $cost, array $eff, array $wbm, array $pools): ?array
    {
        if (!$explicit) {
            $trials = [];
            foreach (array_keys($cost) as $m) {
                if ($m !== $src && ($eff[$m] ?? 0) > 0) {
                    $trials[] = self::swapOne($eff, $m, $src);
                }
            }
            return self::best($eff, $wbm, $pools, $trials);
        }
        $t = $choices[$key];
        if (!is_string($t) || $t === $src || !array_key_exists($t, $eff) || $eff[$t] <= 0) {
            throw new \InvalidArgumentException("$key: invalid target material");
        }
        $trial = self::swapOne($eff, $t, $src);
        $legacy = ($wbm[$src] ?? 0) - ($eff[$src] ?? 0) >= 1 && ($wbm[$t] ?? 0) < $eff[$t];
        if (!$legacy && self::wildShortfall($trial, $wbm, $pools) >= self::wildShortfall($eff, $wbm, $pools)) {
            throw new \InvalidArgumentException("$key: no $src to cover a $t shortfall");
        }
        return $trial;
    }

    /**
     * Treaty Stone: pay 2 $source for 1 $target. Heuristic: sim.js
     * bestSubstitution over every (target, source) pair. Explicit: the chosen
     * pair, legal if target is a fixed deficit with 2 fixed source surplus, or if
     * it reduces the wild-aware shortfall.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     * @return array<string,int>|null
     */
    private static function treatyPick(bool $explicit, array $choices, array $eff, array $wbm, array $pools): ?array
    {
        $apply = function (string $target, string $source) use ($eff): array {
            $t = $eff;
            $t[$target] -= 1;
            $t[$source] = ($t[$source] ?? 0) + 2;
            return $t;
        };
        if (!$explicit) {
            $trials = [];
            foreach (self::MAT_KEYS as $target) {
                if (($eff[$target] ?? 0) <= 0) {
                    continue;
                }
                foreach (self::MAT_KEYS as $source) {
                    if ($source !== $target) {
                        $trials[] = $apply($target, $source);
                    }
                }
            }
            return self::best($eff, $wbm, $pools, $trials);
        }
        $pair = $choices['treatyStone'];
        $target = is_array($pair) ? ($pair['target'] ?? null) : null;
        $source = is_array($pair) ? ($pair['source'] ?? null) : null;
        if (!is_string($target) || !is_string($source) || $source === $target
            || !in_array($target, self::MAT_KEYS, true) || !in_array($source, self::MAT_KEYS, true)
            || ($eff[$target] ?? 0) <= 0) {
            throw new \InvalidArgumentException('treatyStone: invalid target/source');
        }
        $trial = $apply($target, $source);
        $legacy = ($wbm[$target] ?? 0) < $eff[$target]
            && ($wbm[$source] ?? 0) - ($eff[$source] ?? 0) >= 2;
        if (!$legacy && self::wildShortfall($trial, $wbm, $pools) >= self::wildShortfall($eff, $wbm, $pools)) {
            throw new \InvalidArgumentException('treatyStone: that pair does not cover a shortfall');
        }
        return $trial;
    }

    /**
     * Granary target. Heuristic: sim.js — the first material whose -1 reduces the
     * wild-aware shortfall, else the first fixed deficit (saving a wild worker).
     * Explicit: the chosen material, validated as a fixed deficit.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     */
    private static function granaryTarget(bool $explicit, array $choices, array $eff, array $wbm, array $pools): ?string
    {
        if (!$explicit) {
            $trials = [];
            $keys = [];
            foreach (array_keys($eff) as $m) {
                if ($eff[$m] > 0) {
                    $t = $eff;
                    $t[$m] -= 1;
                    $trials[] = $t;
                    $keys[] = $m;
                }
            }
            $pick = self::best($eff, $wbm, $pools, $trials);
            if ($pick !== null) {
                foreach ($keys as $m) {
                    if ($pick[$m] < $eff[$m]) {
                        return $m;
                    }
                }
            }
            foreach (array_keys($eff) as $m) {
                if (($wbm[$m] ?? 0) < $eff[$m]) {
                    return $m;
                }
            }
            return null;
        }
        $t = $choices['granary'];
        if (!is_string($t) || !array_key_exists($t, $eff)) {
            throw new \InvalidArgumentException('granary: invalid target material');
        }
        if (($wbm[$t] ?? 0) >= $eff[$t]) {
            throw new \InvalidArgumentException('granary: target is not a deficit');
        }
        return $t;
    }
}
