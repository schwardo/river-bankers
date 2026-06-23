<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\CardMovement;
use PHPUnit\Framework\TestCase;

/** Unit tests for the pure post-auction card-movement rule. */
final class CardMovementTest extends TestCase
{
    public function testAllClaimedGoesToShoreline(): void
    {
        self::assertSame(['location' => 'shoreline', 'slot' => 0], CardMovement::destination('river', 2, 0));
    }

    public function testHeadwatersWithLeftoversEntersRiverOne(): void
    {
        self::assertSame(['location' => 'river', 'slot' => 1], CardMovement::destination('headwaters', 0, 3));
    }

    public function testHeadwatersAllClaimedSkipsToShoreline(): void
    {
        self::assertSame(['location' => 'shoreline', 'slot' => 0], CardMovement::destination('headwaters', 0, 0));
    }

    public function testRiverCardSlidesDownstream(): void
    {
        self::assertSame(['location' => 'river', 'slot' => 2], CardMovement::destination('river', 1, 4));
        self::assertSame(['location' => 'river', 'slot' => 4], CardMovement::destination('river', 3, 1));
    }

    public function testRiverFourGraduatesToShoreline(): void
    {
        self::assertSame(['location' => 'shoreline', 'slot' => 0], CardMovement::destination('river', 4, 2));
    }
}
