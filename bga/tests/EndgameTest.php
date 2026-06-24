<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Endgame;
use PHPUnit\Framework\TestCase;

final class EndgameTest extends TestCase
{
    public function testEmptyTrackKeepsStart(): void
    {
        self::assertSame(90, Endgame::retireSpace(90, []));
        self::assertSame(94, Endgame::retireSpace(94, []));
    }

    public function testBumpsPastOccupied(): void
    {
        self::assertSame(91, Endgame::retireSpace(90, [90]));
        self::assertSame(93, Endgame::retireSpace(90, [90, 91, 92]));
    }

    public function testCrosserKeepsOvershootSpot(): void
    {
        // A crosser who landed on 94 keeps 94 even if 90/91 are taken.
        self::assertSame(94, Endgame::retireSpace(94, [90, 91]));
    }

    public function testFillsGaps(): void
    {
        // Early retirer starts at the line; 90 and 92 taken -> takes 91.
        self::assertSame(91, Endgame::retireSpace(90, [90, 92]));
    }
}
