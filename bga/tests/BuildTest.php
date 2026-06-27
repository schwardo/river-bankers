<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Build;
use PHPUnit\Framework\TestCase;

/** Unit tests for the pure build-payment allocation (incl. wildcards). */
final class BuildTest extends TestCase
{
    /** @return array{cardId:int, material:string, wildAlt:?string, workers:int} */
    private static function card(int $id, string $mat, int $workers, ?string $wild = null): array
    {
        return ['cardId' => $id, 'material' => $mat, 'wildAlt' => $wild, 'workers' => $workers];
    }

    public function testExactFixedPayment(): void
    {
        // Cost logs:4, mud:2 paid from a logs card (4) and a mud card (2).
        $alloc = Build::allocate(['logs' => 4, 'mud' => 2], [
            self::card(1, 'logs', 4),
            self::card(2, 'mud', 2),
        ]);
        self::assertSame([1 => 4, 2 => 2], $alloc);
    }

    public function testInsufficientWorkersIsUnaffordable(): void
    {
        self::assertNull(Build::allocate(['logs' => 5], [self::card(1, 'logs', 3)]));
        self::assertFalse(Build::canAfford(['logs' => 5], [self::card(1, 'logs', 3)]));
    }

    public function testPullsOnlyWhatIsNeeded(): void
    {
        // Need 2 logs from a card holding 5 — pull just 2.
        self::assertSame([1 => 2], Build::allocate(['logs' => 2], [self::card(1, 'logs', 5)]));
    }

    public function testWildCoversDeficit(): void
    {
        // Need 2 reeds; only a Driftwood Tangle (logs/reeds wild) with 3 workers.
        self::assertSame([7 => 2], Build::allocate(['reeds' => 2], [self::card(7, 'logs', 3, 'reeds')]));
    }

    public function testFixedSpentBeforeWild(): void
    {
        // Need 3 logs. A logs card (2) + a logs/reeds wild (3). Fixed first (2),
        // then 1 from the wild.
        $alloc = Build::allocate(['logs' => 3], [
            self::card(1, 'logs', 2),
            self::card(2, 'logs', 3, 'reeds'),
        ]);
        self::assertSame([1 => 2, 2 => 1], $alloc);
    }

    public function testWildSplitAcrossTwoDeficits(): void
    {
        // Mud Slick (mud/clay) with 4 workers covering mud:2 + clay:2.
        $alloc = Build::allocate(['mud' => 2, 'clay' => 2], [self::card(9, 'mud', 4, 'clay')]);
        self::assertSame([9 => 4], $alloc);
    }

    public function testWildCannotCoverUnrelatedMaterial(): void
    {
        // A logs/reeds wild cannot pay a stones cost.
        self::assertNull(Build::allocate(['stones' => 1], [self::card(1, 'logs', 5, 'reeds')]));
    }

    public function testShortfallReportsMissingMaterials(): void
    {
        // Need logs:4 stones:2; have logs:2 and a logs/reeds wild:1 -> short 1 logs, 2 stones.
        $short = Build::shortfall(['logs' => 4, 'stones' => 2], [
            self::card(1, 'logs', 2),
            self::card(2, 'logs', 1, 'reeds'),
        ]);
        self::assertSame(['logs' => 1, 'stones' => 2], $short);
        // Affordable -> empty shortfall.
        self::assertSame([], Build::shortfall(['logs' => 2], [self::card(1, 'logs', 2)]));
    }
}
