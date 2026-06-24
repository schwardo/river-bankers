<?php
/**
 * River Bankers — pure endgame helpers (framework-independent).
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers\Rules;

final class Endgame
{
    /**
     * The space a retiring pawn lands on: the lowest fish-track space >= $start
     * not already occupied by a retired pawn (no two pawns share a finish space).
     * A crosser starts at their landed position; an early retirer starts at the
     * fish line.
     *
     * @param int       $start    lowest acceptable space
     * @param list<int> $occupied positions of already-retired pawns
     */
    public static function retireSpace(int $start, array $occupied): int
    {
        $taken = array_flip($occupied);
        $pos = $start;
        while (isset($taken[$pos])) {
            $pos++;
        }
        return $pos;
    }
}
