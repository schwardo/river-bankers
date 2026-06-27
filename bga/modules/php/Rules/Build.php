<?php
/**
 * River Bankers — pure build-payment allocation (framework-independent).
 *
 * Decides which workers to pick up to pay a structure's material cost. Workers
 * on a normal card pay that card's material; wild cards (Driftwood Tangle =
 * Logs/Reeds, Mud Slick = Mud/Clay) pay either of their two materials, chosen
 * here to cover the remaining deficits. Mirrors the cover logic in sim.js
 * (playerWorkersByMaterial / canCoverWithWild).
 *
 * A holding may carry a `yield` > 1 (Old Growth at River 3/4 yields 2 Logs per
 * worker); one worker then covers `yield` units, so we pull ceil(need/yield)
 * workers. Lower-yield cards are spent first so a double isn't wasted.
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
     * @param list<array{cardId:int, material:string, wildAlt:?string, workers:int, yield?:int}> $holdings
     * @return array<int,int>|null cardId => workers to pick up, or null if unaffordable
     */
    public static function allocate(array $cost, array $holdings): ?array
    {
        $plan = self::plan($cost, $holdings);
        return $plan['need'] === [] ? $plan['pull'] : null;
    }

    /**
     * Materials a player is still short by for $cost (material => count); empty if
     * affordable. Same allocation as allocate(), but returns the leftover need.
     *
     * @param array<string,int> $cost
     * @param list<array{cardId:int, material:string, wildAlt:?string, workers:int, yield?:int}> $holdings
     * @return array<string,int>
     */
    public static function shortfall(array $cost, array $holdings): array
    {
        return self::plan($cost, $holdings)['need'];
    }

    /**
     * @param array<string,int> $cost
     * @param list<array{cardId:int, material:string, wildAlt:?string, workers:int, yield?:int}> $holdings
     * @return array{pull: array<int,int>, need: array<string,int>}
     */
    private static function plan(array $cost, array $holdings): array
    {
        $need = array_filter($cost, fn(int $n) => $n > 0);
        $pull = [];

        // Pass 1 — spend fixed-material workers on their own material, lower-yield
        // cards first (PHP 8 usort is stable, so equal-yield order is preserved).
        $fixed = array_values(array_filter($holdings, fn(array $h): bool => $h['wildAlt'] === null));
        usort($fixed, fn(array $a, array $b): int => ($a['yield'] ?? 1) <=> ($b['yield'] ?? 1));
        foreach ($fixed as $h) {
            $m = $h['material'];
            $remaining = $need[$m] ?? 0;
            if ($remaining <= 0) {
                continue;
            }
            $mult = $h['yield'] ?? 1;
            $wantWorkers = (int) ceil($remaining / $mult);
            $take = min($h['workers'], $wantWorkers);
            if ($take > 0) {
                $pull[$h['cardId']] = ($pull[$h['cardId']] ?? 0) + $take;
                $need[$m] = max(0, $remaining - $take * $mult);
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

        return ['pull' => $pull, 'need' => $need];
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
