<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Reed Walkway reaction: after the player builds a structure that uses Reeds,
 * place 1 free worker from supply onto an uncovered icon of a River-1 card.
 * Auto-skips if there is no supply or no eligible River-1 card.
 */
class ReactReedWalkway extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 53, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (!$this->game->canReact('reedwalkway', (int) $this->game->getActivePlayerId())) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["targets" => $this->game->riverOneUncovered()];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actReedTarget(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose a River-1 card with an uncovered icon.');
        }
        $this->game->placeWorkers($activePlayerId, $cardId, 1);
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return BuildEffects::class;
    }
}
