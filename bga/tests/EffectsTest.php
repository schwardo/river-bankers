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

    public function testLogFlumeDiscountsEveryBuild(): void
    {
        self::assertSame(2, Effects::buildFishCost(5, ['reeds' => 4], ['Log Flume']));
        // Stacks with Lodge Foundation on a Logs build, floored at 1.
        self::assertSame(1, Effects::buildFishCost(5, ['logs' => 4], ['Log Flume', 'Lodge Foundation']));
        // 0-fish build stays 0.
        self::assertSame(0, Effects::buildFishCost(0, ['vines' => 2], ['Log Flume']));
    }

    public function testHandSizeGrants(): void
    {
        self::assertTrue(Effects::grantsHandSize('Cache Burrow'));
        self::assertTrue(Effects::grantsHandSize('Beaver Cache'));
        self::assertFalse(Effects::grantsHandSize('Reed Bed'));
    }

    public function testRoyalLodgeExtraTurn(): void
    {
        self::assertTrue(Effects::grantsExtraTurn('Royal Lodge'));
        self::assertFalse(Effects::grantsExtraTurn('Spillway'));
    }

    public function testHiddenInletSoloPlayerBackPerWorker(): void
    {
        self::assertSame([5 => 3], Effects::shorelinePenalty('Hidden Inlet', [5 => 3]));
        // More than one player with workers -> nobody.
        self::assertSame([], Effects::shorelinePenalty('Hidden Inlet', [5 => 3, 6 => 1]));
    }

    public function testMudWallowMostWorkers(): void
    {
        self::assertSame([6 => 2], Effects::shorelinePenalty('Mud Wallow', [5 => 1, 6 => 3]));
        // Tie -> nobody.
        self::assertSame([], Effects::shorelinePenalty('Mud Wallow', [5 => 2, 6 => 2]));
    }

    public function testCattailClusterBackThree(): void
    {
        self::assertSame([5 => 3], Effects::shorelinePenalty('Cattail Cluster', [5 => 4, 6 => 1]));
    }

    public function testNoPenaltyForPlainOrEmpty(): void
    {
        self::assertSame([], Effects::shorelinePenalty('Logjam', [5 => 3]));
        self::assertSame([], Effects::shorelinePenalty('Mud Wallow', []));
    }

    public function testWhenBuiltChoiceMapping(): void
    {
        self::assertSame('spillway', Effects::whenBuiltChoice('Spillway'));
        self::assertSame('sapdrip', Effects::whenBuiltChoice('Sap Drip'));
        self::assertSame('mudlevee', Effects::whenBuiltChoice('Mud Levee'));
        self::assertNull(Effects::whenBuiltChoice('Reed Bed'));
    }

    public function testActionAbilityMapping(): void
    {
        self::assertSame(['key' => 'towline', 'cost' => 2], Effects::actionAbility('Tow Line'));
        self::assertSame(['key' => 'heronroost', 'cost' => 1], Effects::actionAbility('Heron Roost'));
        self::assertNull(Effects::actionAbility('Spillway'));
    }

    public function testOnceAbilityMapping(): void
    {
        self::assertSame(['key' => 'woodpile', 'cost' => 1], Effects::onceAbility('Wood Pile'));
        self::assertSame(['key' => 'hollowedlog', 'cost' => 0], Effects::onceAbility('Hollowed-out Log'));
        self::assertSame(['key' => 'tributestone', 'cost' => 0], Effects::onceAbility('Tribute Stone'));
        self::assertNull(Effects::onceAbility('Tow Line'));
    }

    public function testReactiveBuildEffectsGateOnMaterialAndOwnership(): void
    {
        // Stone Causeway fires only when the built cost uses Stones and it's built.
        self::assertSame(['stonecauseway'],
            Effects::reactiveBuildEffects(['stones' => 3, 'logs' => 2], ['Stone Causeway']));
        // No Stones in the cost -> no trigger.
        self::assertSame([], Effects::reactiveBuildEffects(['logs' => 2], ['Stone Causeway']));
        // Not built -> no trigger.
        self::assertSame([], Effects::reactiveBuildEffects(['stones' => 3], ['Reed Bed']));
    }

    public function testReactiveBuildEffectsReturnedInCatalogOrder(): void
    {
        // A structure using Stones, Reeds, Clay, and Mud with all four reactors
        // built -> all four, in REACT_BUILD order.
        $cost = ['stones' => 1, 'reeds' => 1, 'clay' => 1, 'mud' => 1];
        $built = ['Burrow Network', 'Clay Vault', 'Reed Walkway', 'Stone Causeway']; // unsorted
        self::assertSame(
            ['stonecauseway', 'reedwalkway', 'clayvault', 'burrownetwork'],
            Effects::reactiveBuildEffects($cost, $built)
        );
    }
}
