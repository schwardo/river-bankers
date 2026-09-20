<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Rules\Cost;

/**
 * Flotsam Raft ferry (as an action): move any number of your workers from the
 * raft onto open item icons on river cards. Per worker: slide back the raft's
 * current per-item cost, then advance the destination's; the departing worker
 * leaves a blank on the raft. Repeat picks until Done. Done with at least one
 * move consumes the turn; Done with none cancels back to PlayerTurn.
 */
class RaftFerry extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 72, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $playerId = (int) $this->game->getActivePlayerId();
        $moved = (int) $this->globals->get('raft_ferry_moved', 0);
        if ($this->game->playerRaftId($playerId) === 0 || count($this->game->raftFerryTargets()) === 0) {
            $this->globals->set('raft_ferry_moved', 0);
            return $moved > 0 ? NextPlayer::class : PlayerTurn::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $raftId = $this->game->playerRaftId($playerId);
        $raftCost = 0;
        $aboard = 0;
        if ($raftId > 0) {
            $row = $this->game->getCardRow($raftId);
            $raftCost = Cost::perItem((string) $row['card_location'], (int) $row['card_location_arg']);
            $aboard = $this->game->raftWorkersAboard($raftId, $playerId);
        }
        return [
            'targets'  => $this->game->raftFerryTargets(),
            'raftId'   => $raftId,
            'raftCost' => $raftCost,
            'aboard'   => $aboard,
            'moved'    => (int) $this->globals->get('raft_ferry_moved', 0),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actFerryTo(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a river card with an open icon.'));
        }
        if ((int) $args['raftId'] === 0) {
            throw new UserException(clienttranslate('You have no workers on the Flotsam Raft.'));
        }
        $this->game->raftFerryMove($activePlayerId, (int) $args['raftId'], (int) $args['raftCost'], $cardId);
        $this->globals->set('raft_ferry_moved', (int) $this->globals->get('raft_ferry_moved', 0) + 1);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return RaftFerry::class; // re-enter: ferry another or Done
    }

    #[PossibleAction]
    public function actFerryDone(int $activePlayerId)
    {
        $moved = (int) $this->globals->get('raft_ferry_moved', 0);
        $this->globals->set('raft_ferry_moved', 0);
        // No moves made = the player backed out; the turn is not spent.
        return $moved > 0 ? NextPlayer::class : PlayerTurn::class;
    }

    function zombie(int $playerId)
    {
        $moved = (int) $this->globals->get('raft_ferry_moved', 0);
        $this->globals->set('raft_ferry_moved', 0);
        return $moved > 0 ? NextPlayer::class : PlayerTurn::class;
    }
}
