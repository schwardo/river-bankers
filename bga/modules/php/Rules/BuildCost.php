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
 *
 * Player choice vs. heuristic: the optional 4th arg $choices lets the caller
 * pass explicit player decisions for the four *optional* modifiers (Charcoal
 * Pit / Stone Tool / Treaty Stone / Granary — Cattail Marsh is always-on and
 * choiceless). When $choices is empty (preview pills, AI, zombie, unit tests)
 * every modifier auto-fires on the first still-deficit material exactly as
 * before — so the sim.js oracle vectors still match. When $choices is NON-empty
 * the player is driving: each optional modifier fires ONLY if its key is present
 * with a target, and the target is validated (must be owned, unused, a genuine
 * deficit, with the required surplus). Illegal picks throw \InvalidArgumentException
 * for the framework layer to surface as a UserException.
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
     *     charcoalPit?:string|null, stoneTool?:string|null, granary?:string|null,
     *     treatyStone?:array{target:string,source:string}|null
     * } $choices  explicit player decisions; empty array = auto-fire heuristic
     * @return array{eff:array<string,int>, granaryUsed:bool, stoneToolUsed:bool}
     */
    public static function effective(array $cost, array $wbm, array $flags, array $choices = []): array
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

        // Charcoal Pit — 1 surplus Clay worker covers 1 non-clay deficit.
        if (self::wants($explicit, $choices, 'charcoalPit', !empty($flags['charcoalPit']))) {
            $claySlack = ($wbm['clay'] ?? 0) - ($eff['clay'] ?? 0);
            $target = self::coverTarget($explicit, $choices, 'charcoalPit', 'clay', $cost, $eff, $wbm, $claySlack);
            if ($target !== null) {
                $eff[$target] -= 1;
                $eff['clay'] = ($eff['clay'] ?? 0) + 1;
            }
        }

        // Stone Tool (otter starter): once-per-game Charcoal-Pit variant on Stones.
        $stoneToolUsed = false;
        $stoneAvail = !empty($flags['stoneTool']) && empty($flags['stoneToolUsed']);
        if (self::wants($explicit, $choices, 'stoneTool', $stoneAvail)) {
            $stoneSlack = ($wbm['stones'] ?? 0) - ($eff['stones'] ?? 0);
            $target = self::coverTarget($explicit, $choices, 'stoneTool', 'stones', $cost, $eff, $wbm, $stoneSlack);
            if ($target !== null) {
                $eff[$target] -= 1;
                $eff['stones'] = ($eff['stones'] ?? 0) + 1;
                $stoneToolUsed = true;
            }
        }

        // Treaty Stone: once per build, cover 1 missing of one material by paying
        // 2 of a surplus material (any-to-any), only when a real deficit remains.
        if (self::wants($explicit, $choices, 'treatyStone', !empty($flags['treatyStone']))) {
            [$target, $source] = self::treatyPair($explicit, $choices, $eff, $wbm);
            if ($target !== null) {
                $eff[$target] -= 1;
                $eff[$source] = ($eff[$source] ?? 0) + 2;
            }
        }

        // Granary — once-per-game: drop 1 from a deficit material.
        $granaryUsed = false;
        $granaryAvail = !empty($flags['granary']) && empty($flags['granaryUsed']);
        if (self::wants($explicit, $choices, 'granary', $granaryAvail)) {
            $target = self::granaryTarget($explicit, $choices, $eff, $wbm);
            if ($target !== null) {
                $eff[$target] -= 1;
                $granaryUsed = true;
            }
        }

        return ['eff' => $eff, 'granaryUsed' => $granaryUsed, 'stoneToolUsed' => $stoneToolUsed];
    }

    /**
     * Should modifier $key run? In heuristic mode: whenever the player controls
     * it. In explicit mode: only if the player selected it — and selecting a
     * modifier you don't actually control (or have already spent) is illegal.
     *
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

    /**
     * Target deficit material for a "1 surplus $src covers 1 non-$src deficit"
     * modifier (Charcoal Pit / Stone Tool). Heuristic: first still-deficit
     * material in printed-cost order. Explicit: the chosen material, validated as
     * a genuine deficit distinct from $src. Returns null when nothing applies
     * (no surplus, or no deficit) — in explicit mode an unusable pick throws.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $cost
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     */
    private static function coverTarget(bool $explicit, array $choices, string $key, string $src, array $cost, array $eff, array $wbm, int $srcSlack): ?string
    {
        if (!$explicit) {
            if ($srcSlack < 1) {
                return null;
            }
            foreach (array_keys($cost) as $m) {
                if ($m === $src) {
                    continue;
                }
                if (($wbm[$m] ?? 0) < $eff[$m]) {
                    return $m;
                }
            }
            return null;
        }
        $t = $choices[$key];
        if ($srcSlack < 1) {
            throw new \InvalidArgumentException("$key: no surplus $src to substitute");
        }
        if (!is_string($t) || $t === $src || !array_key_exists($t, $eff)) {
            throw new \InvalidArgumentException("$key: invalid target material");
        }
        if (($wbm[$t] ?? 0) >= $eff[$t]) {
            throw new \InvalidArgumentException("$key: $t is not a deficit");
        }
        return $t;
    }

    /**
     * Treaty Stone (target, source) pair. Heuristic: first deficit target, first
     * surplus (>=2) source. Explicit: the chosen pair, validated.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     * @return array{0:?string,1:?string}
     */
    private static function treatyPair(bool $explicit, array $choices, array $eff, array $wbm): array
    {
        if (!$explicit) {
            foreach (self::MAT_KEYS as $target) {
                if (($wbm[$target] ?? 0) >= ($eff[$target] ?? 0)) {
                    continue;
                }
                foreach (self::MAT_KEYS as $source) {
                    if ($source === $target) {
                        continue;
                    }
                    if (($wbm[$source] ?? 0) - ($eff[$source] ?? 0) < 2) {
                        continue;
                    }
                    return [$target, $source];
                }
            }
            return [null, null];
        }
        $pair = $choices['treatyStone'];
        $target = is_array($pair) ? ($pair['target'] ?? null) : null;
        $source = is_array($pair) ? ($pair['source'] ?? null) : null;
        if (!is_string($target) || !is_string($source) || $source === $target
            || !in_array($target, self::MAT_KEYS, true) || !in_array($source, self::MAT_KEYS, true)) {
            throw new \InvalidArgumentException('treatyStone: invalid target/source');
        }
        if (($wbm[$target] ?? 0) >= ($eff[$target] ?? 0)) {
            throw new \InvalidArgumentException('treatyStone: target is not a deficit');
        }
        if (($wbm[$source] ?? 0) - ($eff[$source] ?? 0) < 2) {
            throw new \InvalidArgumentException('treatyStone: source lacks 2 surplus');
        }
        return [$target, $source];
    }

    /**
     * Granary target. Heuristic: first deficit material (in $eff order). Explicit:
     * the chosen material, validated as a genuine deficit.
     *
     * @param array<string,mixed> $choices
     * @param array<string,int> $eff
     * @param array<string,int> $wbm
     */
    private static function granaryTarget(bool $explicit, array $choices, array $eff, array $wbm): ?string
    {
        if (!$explicit) {
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
