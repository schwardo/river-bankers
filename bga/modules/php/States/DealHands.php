<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;

/**
 * Deal opening hands after the starter draft (each player up to their possibly-
 * raised hand size), then hand off to the turn loop.
 */
class DealHands extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 6,
            type: StateType::GAME,
        );
    }

    function onEnteringState()
    {
        $this->game->dealOpeningHands();
        foreach ($this->game->getAllPlayerIds() as $pid) {
            $this->notify->player($pid, 'handUpdate', '', ['hand' => $this->game->getHandView($pid)]);
        }
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return NextPlayer::class;
    }
}
