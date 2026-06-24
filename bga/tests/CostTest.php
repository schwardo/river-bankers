<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Cost;
use PHPUnit\Framework\TestCase;

/** Unit tests for the pure per-item fish cost. */
final class CostTest extends TestCase
{
    public function testHeadwatersIsOne(): void
    {
        self::assertSame(1, Cost::perItem('headwaters', 0));
    }

    public function testRiverRatesAreSlotPlusOne(): void
    {
        self::assertSame(2, Cost::perItem('river', 1));
        self::assertSame(3, Cost::perItem('river', 2));
        self::assertSame(4, Cost::perItem('river', 3));
        self::assertSame(5, Cost::perItem('river', 4));
    }

    public function testForcedRateOverridesPosition(): void
    {
        // Snag Pile auctions a River-1 card at a flat 1/item.
        self::assertSame(1, Cost::perItem('river', 1, 1));
    }
}
