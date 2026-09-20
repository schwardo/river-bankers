<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Flotsam Raft last call: when the raft would move to the shoreline, players
 * in fish-track order (furthest back first) may move their workers off it one
 * final time, paying exactly as the ferry action (the raft's cost is the slot
 * it is leaving from). Any workers still aboard afterwards return to their
 * owners' supplies and the card is discarded — it never reaches the shoreline.
 *
 * Entered from NextPlayer whenever `pending_raft_call` is set (see
 * Game::raftDivertToLastCall). The queue of players is built on first entry
 * and re-checked every re-entry; a player leaves the queue by ferrying their
 * last worker, clicking Done, or zombie-ing out.
 */
class RaftLastCall extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 73, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $cardId = (int) $this->globals->get('pending_raft_call', 0);
        if ($cardId === 0) {
            return NextPlayer::class; // nothing pending (safety)
        }
        $queue = $this->globals->get('raft_call_queue', null);
        if ($queue === null) {
            $queue = $this->game->raftCallOrder($cardId);
            $this->globals->set('raft_call_queue', $queue);
        }
        // Advance past players with nothing left to do.
        $targets = $this->game->raftFerryTargets();
        while (count($queue) > 0) {
            $head = (int) $queue[0];
            if ($this->game->raftWorkersAboard($cardId, $head) > 0 && count($targets) > 0) {
                $this->globals->set('raft_call_queue', $queue);
                $this->gamestate->changeActivePlayer($head);
                $this->game->giveExtraTime($head);
                $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
                return null;
            }
            array_shift($queue);
        }
        // Everyone has had their call: workers return, the raft is discarded.
        $this->game->finalizeRaftDeparture($cardId);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return NextPlayer::class;
    }

    public function getArgs(): array
    {
        $cardId = (int) $this->globals->get('pending_raft_call', 0);
        $playerId = (int) $this->game->getActivePlayerId();
        return [
            'targets'  => $this->game->raftFerryTargets(),
            'raftId'   => $cardId,
            'raftCost' => (int) $this->globals->get('raft_call_cost', 0),
            'aboard'   => $cardId > 0 ? $this->game->raftWorkersAboard($cardId, $playerId) : 0,
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actCallFerry(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a river card with an open icon.'));
        }
        if ((int) $args['raftId'] === 0 || (int) $args['aboard'] <= 0) {
            throw new UserException(clienttranslate('You have no workers on the Flotsam Raft.'));
        }
        $this->game->raftFerryMove($activePlayerId, (int) $args['raftId'], (int) $args['raftCost'], $cardId);
        return RaftLastCall::class; // re-enter: same player until out of workers or Done
    }

    #[PossibleAction]
    public function actCallDone(int $activePlayerId)
    {
        $this->shiftQueue();
        return RaftLastCall::class;
    }

    function zombie(int $playerId)
    {
        $this->shiftQueue();
        return RaftLastCall::class;
    }

    private function shiftQueue(): void
    {
        $queue = $this->globals->get('raft_call_queue', []);
        if (is_array($queue) && count($queue) > 0) {
            array_shift($queue);
        }
        $this->globals->set('raft_call_queue', $queue ?: []);
    }
}
