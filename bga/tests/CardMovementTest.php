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

    /**
     * Shoreline invariant: a card only rests on the shoreline while it holds a
     * worker. Zero workers -> discarded (out of the game), never left stranded.
     * Guards the family of bugs where a fully-jammed River-4 graduation, an
     * all-blanks cover, a workerless Spillway wash, or a last-worker recall left
     * a workerless card sitting on the shoreline.
     */
    public function testShorelineRestingKeepsCardsWithWorkers(): void
    {
        self::assertSame('shoreline', CardMovement::shorelineResting(1));
        self::assertSame('shoreline', CardMovement::shorelineResting(5));
    }

    public function testShorelineRestingDiscardsWorkerlessCards(): void
    {
        self::assertSame('discard', CardMovement::shorelineResting(0));
    }
    // --- Flotsam Raft: stays on the river until empty [rule 2026-09-23] ---

    public function testRaftSlidesAfterAuctionEvenWhenFull(): void
    {
        // A normal card fully claimed goes ashore; the raft slides instead.
        self::assertSame(['location' => 'river', 'slot' => 1], CardMovement::raftAfterAuction('headwaters', 2, 6));
        self::assertSame(['location' => 'river', 'slot' => 2], CardMovement::raftAfterAuction('river', 1, 3));
        self::assertSame(['location' => 'river', 'slot' => 4], CardMovement::raftAfterAuction('river', 3, 1));
    }

    public function testRaftMoorsAtRiverFour(): void
    {
        // Where a normal card graduates off River 4, the raft stays put.
        self::assertSame(['location' => 'shoreline', 'slot' => 0], CardMovement::destination('river', 4, 2));
        self::assertSame(['location' => 'river', 'slot' => 4], CardMovement::raftAfterAuction('river', 4, 2));
    }

    public function testRaftWithNoWorkersIsDiscardedAfterAuction(): void
    {
        self::assertSame(['location' => 'discard', 'slot' => 0], CardMovement::raftAfterAuction('river', 2, 0));
        self::assertSame(['location' => 'discard', 'slot' => 0], CardMovement::raftAfterAuction('headwaters', 1, 0));
    }

    public function testRaftInsteadOfShorelineStaysWhileManned(): void
    {
        // Fully covered / washed / swept: keeps its river slot with workers aboard...
        self::assertSame(['location' => 'river', 'slot' => 3], CardMovement::raftInsteadOfShoreline('river', 3, 2));
        self::assertSame(['location' => 'river', 'slot' => 4], CardMovement::raftInsteadOfShoreline('river', 4, 1));
        // ...a Headwaters raft enters River 1...
        self::assertSame(['location' => 'river', 'slot' => 1], CardMovement::raftInsteadOfShoreline('headwaters', 3, 1));
        // ...and an empty one leaves the game — never the shoreline.
        self::assertSame(['location' => 'discard', 'slot' => 0], CardMovement::raftInsteadOfShoreline('river', 4, 0));
    }
}
