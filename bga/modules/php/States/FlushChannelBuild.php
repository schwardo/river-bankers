<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Flush Channel (when built): discard one Headwaters card out of the game and
 * refill that slot from the material deck — no auction. Auto-skips with an empty
 * Headwaters.
 */
class FlushChannelBuild extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 60, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (count($this->game->getHeadwatersCards()) === 0) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["headwatersCards" => $this->game->getHeadwatersCards()];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actFlushChannelRemove(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['headwatersCards'], true)) {
            throw new UserException('Choose a Headwaters card to remove.');
        }
        $this->game->flushChannelRemove($cardId);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        return BuildEffects::class;
    }
}
