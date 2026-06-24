<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;

/**
 * Dispatcher for the final-build round: hand the turn to the next player in
 * `final_order` (lowest fish first), or end the game once the list is empty.
 */
class FinalBuildNext extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 41,
            type: StateType::GAME,
        );
    }

    function onEnteringState()
    {
        /** @var list<int> $order */
        $order = $this->globals->get('final_order', []);
        if (count($order) === 0) {
            return EndScore::class;
        }
        $this->gamestate->changeActivePlayer((int) $order[0]);
        return FinalBuild::class;
    }
}
