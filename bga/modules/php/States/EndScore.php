<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;

const ST_END_GAME = 99;

class EndScore extends \Bga\GameFramework\States\GameState
{

    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 98,
            type: StateType::GAME,
        );
    }

    /**
     * Compute and store every player's final VP + tie-breaker via Rules\Scoring,
     * then end the game.
     */
    public function onEnteringState() {
        $this->game->refreshScores();
        $this->game->notifyFinalScores(); // drives the end-of-game scoring dialog

        return ST_END_GAME;
    }
}