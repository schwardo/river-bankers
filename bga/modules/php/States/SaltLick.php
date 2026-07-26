<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Salt Lick (when built): look at ONE opponent's hand of structure cards.
 *
 * Info-only — nothing on the board changes, so the reveal is a private notify
 * to the builder and control returns straight to BuildEffects. Before
 * [2026-07-26] the card showed every opponent's hand and needed no choice; it
 * now peeks at a single opponent, so the builder picks the target.
 *
 * With exactly one opponent there is nothing to choose, so onEnteringState
 * resolves it immediately rather than showing a one-button prompt.
 */
class SaltLick extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 71, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $opponents = $this->opponentIds($playerId);
        if (count($opponents) === 0) {
            return BuildEffects::class;
        }
        if (count($opponents) === 1) {
            $this->reveal($playerId, $opponents[0]);
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $out = [];
        foreach ($this->opponentIds($playerId) as $pid) {
            $out[] = ['id' => $pid, 'name' => $this->game->getPlayerNameById($pid)];
        }
        return ["opponents" => $out];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPeek(int $targetPlayerId, int $activePlayerId)
    {
        if (!in_array($targetPlayerId, $this->opponentIds($activePlayerId), true)) {
            throw new UserException(clienttranslate('Choose one of your opponents.'));
        }
        $this->reveal($activePlayerId, $targetPlayerId);
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        // A quit player learns nothing; the effect is info-only so skipping it
        // changes no public state.
        return BuildEffects::class;
    }

    /** @return list<int> */
    private function opponentIds(int $playerId): array
    {
        $out = [];
        foreach ($this->game->getAllPlayerIds() as $pid) {
            if ($pid !== $playerId) {
                $out[] = (int) $pid;
            }
        }
        return $out;
    }

    private function reveal(int $playerId, int $targetPlayerId): void
    {
        $this->notify->player(
            $playerId,
            'peekHands',
            clienttranslate('Salt Lick: you peek at ${target_name}\'s hand.'),
            [
                'target_name' => $this->game->getPlayerNameById($targetPlayerId),
                'hands' => [$targetPlayerId => $this->game->getHandView($targetPlayerId)],
            ]
        );
    }
}
