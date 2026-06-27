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
        // Deck-empty drift: the player whose turn just ended drifts +1 fish once
        // the material deck is exhausted, so the endgame can't grind on forever.
        $turnPlayer = (int) $this->globals->get('turn_player', 0);
        if ($turnPlayer > 0 && $this->game->getMaterialDeckCount() === 0) {
            $this->game->advanceFish($turnPlayer, 1);
        }

        // Retire anyone whose pawn reached or crossed the fish line.
        $line = $this->game->getFishLine();
        foreach ($this->game->getTurnOrderRows() as $r) {
            if (!$r['retired'] && $r['fish'] >= $line) {
                $this->game->retirePlayer($r['id'], $r['fish']);
            }
        }

        // Keep the official BGA score (VP) current from built structures + leftover
        // material — pushed automatically by the score counter when it changes.
        $this->game->refreshScores();

        // Refresh every client's public board after the just-completed action.
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());

        $next = TurnOrder::nextActor(
            $this->game->getTurnOrderRows(),
            $this->game->getBonusTurnPlayer(),
        );

        if ($next === null) {
            // Everyone has retired — go round once more for a final build (lowest
            // fish first), then score.
            $rows = $this->game->getTurnOrderRows();
            usort($rows, fn($a, $b) => $a['fish'] <=> $b['fish']);
            $this->globals->set('final_order', array_map(fn($r) => $r['id'], $rows));
            return FinalBuildNext::class;
        }

        $this->game->clearBonusTurnPlayer();
        $this->globals->set('turn_player', $next);
        $this->gamestate->changeActivePlayer($next);
        $this->game->giveExtraTime($next);

        // Announce whose turn it is and where they sit on the fish track. The
        // furthest-back active player acts next; lower fish = further back =
        // closer to the front of the queue.
        $activeFish = 0;
        foreach ($this->game->getTurnOrderRows() as $r) {
            if (!$r['retired'] && $r['id'] === $next) {
                $activeFish = $r['fish'];
            }
        }
        $this->notify->all('turnInfo',
            clienttranslate('${player_name} is next to act with ${fish} 🐟.'),
            [
                'player_id' => $next,
                'player_name' => $this->game->getPlayerNameById($next),
                'fish' => $activeFish,
            ]);

        return PlayerTurn::class;
    }
}
