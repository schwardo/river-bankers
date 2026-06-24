<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Rules\TurnOrder;

/**
 * Turn-order pivot. River Bankers has no rounds: the active (non-retired) player
 * furthest back on the fish track acts next (ties -> top of stack), and may take
 * several turns in a row. This GAME state recomputes that after every action via
 * Rules\TurnOrder and hands control to PlayerTurn.
 */
class NextPlayer extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 90,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    function onEnteringState()
    {
        // Refresh every client's public board after the just-completed action.
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());

        $next = TurnOrder::nextActor(
            $this->game->getTurnOrderRows(),
            $this->game->getBonusTurnPlayer(),
        );

        if ($next === null) {
            // Everyone has retired.
            // TODO (Phase 4): run the "one final build" round before scoring.
            return EndScore::class;
        }

        $this->game->clearBonusTurnPlayer();
        $this->gamestate->changeActivePlayer($next);
        $this->game->giveExtraTime($next);

        return PlayerTurn::class;
    }
}
