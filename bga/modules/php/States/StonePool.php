<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\Actions\Types\IntArrayParam;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Stone Pool (when built): look at the top 5 material cards and rearrange them in
 * any order. The submitted order is top-of-deck first and must be a permutation
 * of the shown cards. Auto-skips if fewer than 2 cards remain.
 */
class StonePool extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 57, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        if ($this->game->getMaterialDeckCount() < 2) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $n = (int) $this->globals->get('reorder_n', 5);
        return ["topCards" => $this->game->topMaterialCards($n)];
    }

    /**
     * @param list<int> $cardIds new top-to-bottom order (a permutation of the top cards)
     * @throws UserException
     */
    #[PossibleAction]
    public function actReorder(#[IntArrayParam] array $cardIds, int $activePlayerId)
    {
        if (!$this->game->reorderMaterialTop($cardIds)) {
            throw new UserException(clienttranslate('Submit a valid ordering of the shown cards.'));
        }
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        return BuildEffects::class; // leave the order untouched
    }
}
