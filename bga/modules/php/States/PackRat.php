<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Pack Rat Burrow (once per game): discard one structure from hand, then take one
 * of your choice from the discard pile. Two steps tracked in packrat_drop; the
 * source card is flipped on completion (free ability — turn continues).
 */
class PackRat extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 61, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $playerId = (int) $this->game->getActivePlayerId();
        if (!$this->game->onceAbilityUsable('packrat', $playerId)) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $drop = (int) $this->globals->get('packrat_drop', 0);
        return $drop === 0
            ? ["step" => "discard", "drop" => 0, "handStructureIds" => $this->game->getPlayerHand($playerId)]
            : ["step" => "take", "drop" => $drop, "discardCards" => $this->game->getStructureDiscardView()];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPackRatDiscard(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['drop'] !== 0 || !in_array($cardId, $args['handStructureIds'], true)) {
            throw new UserException('Choose a hand card to discard.');
        }
        $this->globals->set('packrat_drop', $cardId);
        return PackRat::class; // re-enter for the take step
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPackRatTake(int $cardId, int $activePlayerId, array $args)
    {
        $ids = array_map(fn(array $c): int => $c['id'], $args['discardCards']);
        // The just-dropped card is now in the discard pile too — exclude it.
        $drop = (int) $args['drop'];
        if ($cardId === $drop || !in_array($cardId, $ids, true)) {
            throw new UserException('Choose a card from the discard pile to take.');
        }
        $this->game->packRatSwap($activePlayerId, $drop, $cardId);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $this->globals->set('packrat_drop', 0);
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($card > 0) {
            $this->game->flipCardUsed($card);
        }
        $this->globals->set('pending_ability', '');
        $this->globals->set('pending_ability_card', 0);
        $this->globals->set('pending_ability_free', 0);
        return PlayerTurn::class; // free ability — resume the turn
    }
}
