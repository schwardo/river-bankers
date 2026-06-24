<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Second half of Invent: the active player discards as many structure cards as
 * they just drew (any mix of new draws and old hand).
 */
class InventDiscard extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 30,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        return [
            "nbToDiscard" => (int) $this->globals->get('invent_discard_count', 0),
            "handStructureIds" => $this->game->getPlayerHand($playerId),
        ];
    }

    /**
     * @param list<int> $cardIds
     * @throws UserException
     */
    #[PossibleAction]
    public function actDiscard(array $cardIds, int $activePlayerId, array $args)
    {
        if (count($cardIds) !== (int) $args['nbToDiscard']) {
            throw new UserException('You must discard exactly the number of cards you drew.');
        }
        foreach ($cardIds as $id) {
            if (!in_array($id, $args['handStructureIds'], true)) {
                throw new UserException('You can only discard cards from your hand.');
            }
        }

        $this->game->discardStructures($cardIds);
        $this->globals->set('invent_discard_count', 0);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);

        return NextPlayer::class;
    }

    function zombie(int $playerId)
    {
        // Auto-discard the required number from the front of the hand.
        $n = (int) $this->globals->get('invent_discard_count', 0);
        $this->game->discardStructures(array_slice($this->game->getPlayerHand($playerId), 0, $n));
        $this->globals->set('invent_discard_count', 0);

        return NextPlayer::class;
    }
}
