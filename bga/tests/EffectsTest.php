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

    public function testHeadwatersMoveUnchangedWithoutTwigBridge(): void
    {
        // Slots 1..3 cost 2/3/4 by distance.
        self::assertSame(2, Effects::headwatersMoveForPlayer(2, []));
        self::assertSame(3, Effects::headwatersMoveForPlayer(3, []));
        self::assertSame(4, Effects::headwatersMoveForPlayer(4, ['Reed Bed']));
    }

    public function testTwigBridgeFlattensHeadwatersMove(): void
    {
        self::assertSame(2, Effects::headwatersMoveForPlayer(4, ['Twig Bridge']));
        self::assertSame(2, Effects::headwatersMoveForPlayer(3, ['Twig Bridge']));
        // Never raises the cost — the nearest slot already sits at the flat rate.
        self::assertSame(2, Effects::headwatersMoveForPlayer(2, ['Twig Bridge']));
    }

    public function testLodgeFoundationShavesLogsBuild(): void
    {
        self::assertSame(2, Effects::buildFishCost(3, ['logs' => 4], ['Lodge Foundation']));
        // Unlike Log Flume, Lodge Foundation MAY take a build to 0.
        self::assertSame(0, Effects::buildFishCost(1, ['logs' => 2], ['Lodge Foundation']));
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
        // Friendly ties: EVERY tied leader gets the bonus (unlike Cattail Cluster,
        // where a tie means nobody).
        self::assertSame([5 => 2, 6 => 2], Effects::shorelinePenalty('Mud Wallow', [5 => 2, 6 => 2]));
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
        self::assertNull(Effects::actionAbility('Tow Line'));
        self::assertSame(['key' => 'heronroost', 'cost' => 1], Effects::actionAbility('Heron Roost'));
        self::assertNull(Effects::actionAbility('Spillway'));
    }

    public function testOnceAbilityMapping(): void
    {
        self::assertSame(['key' => 'woodpile', 'cost' => 1], Effects::onceAbility('Wood Pile'));
        self::assertSame(['key' => 'hollowedlog', 'cost' => 0], Effects::onceAbility('Hollowed-out Log'));
        self::assertSame(['key' => 'tributestone', 'cost' => 0], Effects::onceAbility('Tribute Stone'));
        // Snare Set (mink starter) reuses the Tribute Stone resolver.
        self::assertSame(['key' => 'tributestone', 'cost' => 0], Effects::onceAbility('Snare Set'));
        self::assertSame(['key' => 'packrat', 'cost' => 0], Effects::onceAbility('Pack Rat Burrow'));
        self::assertSame(['key' => 'springcascade', 'cost' => 0], Effects::onceAbility('Spring Cascade'));
        self::assertSame(['key' => 'rollingfloat', 'cost' => 0], Effects::onceAbility('Rolling Float'));
        // Slipstream is intentionally excluded from the BGA port.
        self::assertNull(Effects::onceAbility('Slipstream'));
        self::assertSame(['key' => 'towline', 'cost' => 0], Effects::onceAbility('Tow Line'));
    }

    public function testSalmonRunTotalCost(): void
    {
        // 1/2/3/5/8 are TOTALS for a 1..5-worker run, not a per-worker ladder
        // (until 2026-07-26 these were marginal, summing to 1/3/6/11/19).
        self::assertSame(0, Effects::salmonRunCost(0));
        self::assertSame(1, Effects::salmonRunCost(1));
        self::assertSame(2, Effects::salmonRunCost(2));
        self::assertSame(3, Effects::salmonRunCost(3));
        self::assertSame(5, Effects::salmonRunCost(4));
        self::assertSame(8, Effects::salmonRunCost(5));
        self::assertSame(8, Effects::salmonRunCost(7)); // capped at 5
    }

    public function testSalmonRunIsOncePerGame(): void
    {
        // Moved out of ACTION_ABILITIES into ONCE_ABILITIES on 2026-07-26, so
        // it now flips its card and can't be reused.
        self::assertSame(['key' => 'salmonrun', 'cost' => 0], Effects::onceAbility('Salmon Run'));
        self::assertArrayNotHasKey('Salmon Run', Effects::ACTION_ABILITIES);
        // and Mill Wheel copies repeatable actions only, so it dropped out.
        self::assertNotContains('salmonrun', Effects::MILL_WHEEL_COPYABLE);
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
    // --- Wildcard per-item discounts [rule 2026-09-23] ---

    public function testWildcardTakesDiscountOnSecondHalf(): void
    {
        // Driftwood Tangle (logs/reeds): Reed Bed now discounts it via the reeds half.
        self::assertSame(1, Effects::cardAuctionDiscount('logs', 'reeds', ['Reed Bed']));
        self::assertSame(2, Effects::perItemForPlayer(3, 'logs', ['Reed Bed'], 'reeds'));
        // Without the wildAlt, the primary (logs) has no discounter — unchanged.
        self::assertSame(3, Effects::perItemForPlayer(3, 'logs', ['Reed Bed']));
    }

    public function testWildcardTakesDiscountOnPrimaryHalf(): void
    {
        // Mud Slick (clay/mud): Clay Den applies via the primary half.
        self::assertSame(2, Effects::perItemForPlayer(4, 'clay', ['Clay Den'], 'mud'));
    }

    public function testWildcardHalvesNeverStackLargerWins(): void
    {
        // Mud Slick with Clay Den (2) AND Mud Burrow (1): larger (2), not 3.
        self::assertSame(2, Effects::cardAuctionDiscount('clay', 'mud', ['Clay Den', 'Mud Burrow']));
        self::assertSame(3, Effects::perItemForPlayer(5, 'clay', ['Clay Den', 'Mud Burrow'], 'mud'));
        // Driftwood Tangle: Reed Bed + Kelp Bed stack WITHIN the reeds half (2).
        self::assertSame(2, Effects::cardAuctionDiscount('logs', 'reeds', ['Reed Bed', 'Kelp Bed']));
    }

    public function testWildcardDiscountStillFloorsAtOne(): void
    {
        self::assertSame(1, Effects::perItemForPlayer(2, 'clay', ['Clay Den'], 'mud'));
        self::assertSame(1, Effects::perItemForPlayer(1, 'logs', ['Reed Bed', 'Kelp Bed'], 'reeds'));
    }

    public function testWildcardWithUndiscountedHalvesUnchanged(): void
    {
        // Bramble Shoal (stones/vines): no discounter covers either half.
        self::assertSame(4, Effects::perItemForPlayer(4, 'stones', ['Reed Bed', 'Clay Den', 'Mud Burrow'], 'vines'));
    }

    /** Cross-check against the sim.js playerCardCost oracle (tests/oracle/gen_peritem_vectors.js). */
    public function testPerItemMatchesSimOracle(): void
    {
        $data = json_decode((string) file_get_contents(__DIR__ . '/fixtures/peritem_vectors.json'), true);
        self::assertIsArray($data);
        self::assertNotEmpty($data);
        foreach ($data as $v) {
            self::assertSame(
                $v['expected'],
                Effects::perItemForPlayer($v['base'], $v['material'], $v['built'], $v['wildAlt']),
                json_encode($v) ?: ''
            );
        }
    }
}
