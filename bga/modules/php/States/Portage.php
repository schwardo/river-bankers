<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Portage (as an action): swap one of your workers on a river card with another
 * worker on a different river card, paying the source card's per-item fish cost.
 * Two steps (source, then destination); consumes the turn.
 */
class Portage extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 65, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (!$this->game->abilityUsable('portage', (int) $this->game->getActivePlayerId())) {
            return NextPlayer::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $src = (int) $this->globals->get('portage_src', 0);
        return $src === 0
            ? ["step" => "source", "source" => 0, "targets" => $this->game->portageSources($playerId)]
            : ["step" => "dest", "source" => $src, "targets" => $this->game->portageTargets($playerId, $src)];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPortageSource(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] !== 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose one of your river cards.');
        }
        $this->globals->set('portage_src', $cardId);
        return Portage::class;
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPortageDest(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] === 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose another river card with a worker to swap.');
        }
        $this->game->portageSwap($activePlayerId, (int) $args['source'], $cardId);
        $this->globals->set('portage_src', 0);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return NextPlayer::class;
    }

    function zombie(int $playerId)
    {
        $this->globals->set('portage_src', 0);
        return NextPlayer::class;
    }
}
