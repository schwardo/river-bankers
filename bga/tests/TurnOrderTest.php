<?php
declare(strict_types=1);

use Bga\Games\RiverBankers\Rules\TurnOrder;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the pure turn-order resolver, plus 400 randomized vectors
 * cross-checked against sim.js pickNextPlayer (tests/oracle/gen_turnorder_vectors.js).
 */
final class TurnOrderTest extends TestCase
{
    /** @param list<array{id:int,fish:int,stack:int,retired:bool}> $p */
    private static function p(int $id, int $fish, int $stack, bool $retired = false): array
    {
        return ['id' => $id, 'fish' => $fish, 'stack' => $stack, 'retired' => $retired];
    }

    public function testLowestFishActsNext(): void
    {
        $players = [self::p(0, 10, 1), self::p(1, 3, 1), self::p(2, 7, 1)];
        self::assertSame(1, TurnOrder::nextActor($players));
    }

    public function testTieBrokenByTopOfStack(): void
    {
        // Both at fish 5; player 2 is higher on the stack (stack 9 > 4).
        $players = [self::p(0, 5, 4), self::p(2, 5, 9)];
        self::assertSame(2, TurnOrder::nextActor($players));
    }

    public function testRetiredPlayersSkipped(): void
    {
        // Player 1 has the lowest fish but has retired -> player 0 acts.
        $players = [self::p(0, 8, 1), self::p(1, 2, 9, true)];
        self::assertSame(0, TurnOrder::nextActor($players));
    }

    public function testAllRetiredReturnsNull(): void
    {
        $players = [self::p(0, 8, 1, true), self::p(1, 2, 9, true)];
        self::assertNull(TurnOrder::nextActor($players));
    }

    public function testBonusTurnOverrides(): void
    {
        // Player 0 is furthest back, but player 2 has a pending bonus turn.
        $players = [self::p(0, 1, 1), self::p(2, 30, 1)];
        self::assertSame(2, TurnOrder::nextActor($players, 2));
    }

    public function testBonusTurnIgnoredIfRetired(): void
    {
        $players = [self::p(0, 5, 1), self::p(2, 30, 1, true)];
        self::assertSame(0, TurnOrder::nextActor($players, 2));
    }

    /** @dataProvider simVectors */
    public function testMatchesSim(array $players, ?int $bonus, ?int $expected): void
    {
        self::assertSame($expected, TurnOrder::nextActor($players, $bonus));
    }

    public static function simVectors(): array
    {
        $data = json_decode((string) file_get_contents(__DIR__ . '/fixtures/turnorder_vectors.json'), true);
        $cases = [];
        foreach ($data as $i => $v) {
            $cases["vec$i"] = [$v['players'], $v['bonus'], $v['expected']];
        }
        return $cases;
    }
}
