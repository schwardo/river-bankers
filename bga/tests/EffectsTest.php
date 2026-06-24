<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\Effects;
use PHPUnit\Framework\TestCase;

/** Unit tests for the Batch-1 economy passives. */
final class EffectsTest extends TestCase
{
    public function testNoDiscountWithoutCards(): void
    {
        self::assertSame(0, Effects::auctionDiscount('reeds', []));
        self::assertSame(3, Effects::perItemForPlayer(3, 'reeds', []));
    }

    public function testReedDiscountsStack(): void
    {
        self::assertSame(2, Effects::auctionDiscount('reeds', ['Reed Bed', 'Kelp Bed']));
        // River 2 base 3, minus 2 -> 1.
        self::assertSame(1, Effects::perItemForPlayer(3, 'reeds', ['Reed Bed', 'Kelp Bed']));
    }

    public function testClayDenIsTwo(): void
    {
        self::assertSame(2, Effects::auctionDiscount('clay', ['Clay Den']));
    }

    public function testPerItemNeverBelowOne(): void
    {
        // River 1 base 2, Clay Den -2 -> floor at 1.
        self::assertSame(1, Effects::perItemForPlayer(2, 'clay', ['Clay Den']));
    }

    public function testDiscountOnlyAppliesToOwnMaterial(): void
    {
        self::assertSame(0, Effects::auctionDiscount('logs', ['Reed Bed']));
    }

    public function testLodgeFoundationShavesLogsBuild(): void
    {
        self::assertSame(2, Effects::buildFishCost(3, ['logs' => 4], ['Lodge Foundation']));
        // Never below 1.
        self::assertSame(1, Effects::buildFishCost(1, ['logs' => 2], ['Lodge Foundation']));
        // Non-logs structure unaffected.
        self::assertSame(3, Effects::buildFishCost(3, ['reeds' => 4], ['Lodge Foundation']));
        // No Lodge Foundation -> unaffected.
        self::assertSame(3, Effects::buildFishCost(3, ['logs' => 4], []));
    }

    public function testHandSizeGrants(): void
    {
        self::assertTrue(Effects::grantsHandSize('Cache Burrow'));
        self::assertTrue(Effects::grantsHandSize('Beaver Cache'));
        self::assertFalse(Effects::grantsHandSize('Reed Bed'));
    }
}
