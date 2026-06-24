<?php
/**
 * River Bankers — pure build-payment allocation (framework-independent).
 *
 * Decides which workers to pick up to pay a structure's material cost. Workers
 * on a normal card pay that card's material; wild cards (Driftwood Tangle =
 * Logs/Reeds, Mud Slick = Mud/Clay) pay either of their two materials, chosen
 * here to cover the remaining deficits. Mirrors the cover logic in sim.js
 * (playerWorkersByMaterial / canCoverWithWild).
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Build
{
    /**
     * Pick workers to cover $cost, or null if the holdings can't pay it.
     * Fixed-material workers are spent first; wild workers then fill what's left.
     *
     * @param array<string,int> $cost material => count required
     * @param list<array{cardId:int, material:string, wildAlt:?string, workers:int}> $holdings
     * @return array<int,int>|null cardId => workers to pick up, or null if unaffordable
     */
    public static function allocate(array $cost, array $holdings): ?array
    {
        $need = array_filter($cost, fn(int $n) => $n > 0);
        $pull = [];

        // Pass 1 — spend fixed-material workers on their own material.
        foreach ($holdings as $h) {
            if ($h['wildAlt'] !== null) {
                continue;
            }
            $m = $h['material'];
            $remaining = $need[$m] ?? 0;
            if ($remaining <= 0) {
                continue;
            }
            $take = min($h['workers'], $remaining);
            if ($take > 0) {
                $pull[$h['cardId']] = ($pull[$h['cardId']] ?? 0) + $take;
                $need[$m] = $remaining - $take;
                if ($need[$m] === 0) {
                    unset($need[$m]);
                }
            }
        }

        // Pass 2 — wild workers fill remaining deficits (largest first).
        foreach ($holdings as $h) {
            if ($h['wildAlt'] === null || $need === []) {
                continue;
            }
            $avail = $h['workers'];
            $options = [$h['material'], $h['wildAlt']];
            while ($avail > 0 && $need !== []) {
                $target = null;
                $best = 0;
                foreach ($options as $m) {
                    if (($need[$m] ?? 0) > $best) {
                        $best = $need[$m];
                        $target = $m;
                    }
                }
                if ($target === null) {
                    break; // neither of this wild's materials is still needed
                }
                $pull[$h['cardId']] = ($pull[$h['cardId']] ?? 0) + 1;
                $need[$target]--;
                if ($need[$target] === 0) {
                    unset($need[$target]);
                }
                $avail--;
            }
        }

        return $need === [] ? $pull : null;
    }

    /**
     * @param array<string,int> $cost
     * @param list<array{cardId:int, material:string, wildAlt:?string, workers:int}> $holdings
     */
    public static function canAfford(array $cost, array $holdings): bool
    {
        return self::allocate($cost, $holdings) !== null;
    }
}
