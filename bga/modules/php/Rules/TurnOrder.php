<?php
/**
 * River Bankers — pure turn-order resolution (framework-independent).
 *
 * Ported from sim.js pickNextPlayer (~line 1124). No DB / no framework: takes
 * plain player rows, returns the id of who acts next. The NextPlayer state is a
 * thin adapter that reads the player table and calls this.
 *
 * NOTE: the sim's lapping-"exhaustion" refinement (shadowedBy) is NOT modelled
 * here yet — see the Phase 4 turn-order TODO. This implements the core rulebook
 * rule: furthest back acts next, ties broken by top-of-stack.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class TurnOrder
{
    /**
     * Who acts next: the active (non-retired) player furthest back on the fish
     * track (lowest fish), ties broken by who is on top of the stack (highest
     * stack value — a pawn moving onto a space goes on top). A pending bonus
     * turn (e.g. Royal Lodge) overrides, if that player is still active.
     *
     * @param list<array{id:int, fish:int, stack:int, retired:bool}> $players
     * @param int|null $bonusTurnPlayer player forced to act next, or null
     * @return int|null player id, or null if every player has retired
     */
    public static function nextActor(array $players, ?int $bonusTurnPlayer = null): ?int
    {
        if ($bonusTurnPlayer !== null) {
            foreach ($players as $p) {
                if ($p['id'] === $bonusTurnPlayer && !$p['retired']) {
                    return $bonusTurnPlayer;
                }
            }
        }

        $best = null;
        foreach ($players as $p) {
            if ($p['retired']) {
                continue;
            }
            if ($best === null
                || $p['fish'] < $best['fish']
                || ($p['fish'] === $best['fish'] && $p['stack'] > $best['stack'])
            ) {
                $best = $p;
            }
        }

        return $best['id'] ?? null;
    }
}
