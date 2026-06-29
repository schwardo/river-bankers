<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Burrow Network reaction: after the player builds a structure that uses Mud,
 * move one of their workers from one river card to another river card where they
 * have a worker (covering an uncovered icon) or that has a blank to replace.
 * Two steps — pick source, then destination — tracked in the burrow_src global,
 * which BuildEffects resets to 0 before entry.
 */
class ReactBurrowNetwork extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 56, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (!$this->game->canReact('burrownetwork', (int) $this->game->getActivePlayerId())) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $src = (int) $this->globals->get('burrow_src', 0);
        return $src === 0
            ? ["step" => "source", "source" => 0, "targets" => $this->game->burrowSources($playerId)]
            : ["step" => "dest", "source" => $src, "targets" => $this->game->burrowDests($playerId, $src)];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actBurrowSource(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] !== 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose one of your river cards.'));
        }
        // No legal destination for this source: nothing to do.
        if (count($this->game->burrowDests($activePlayerId, $cardId)) === 0) {
            return BuildEffects::class;
        }
        $this->globals->set('burrow_src', $cardId);
        return ReactBurrowNetwork::class; // re-enter for the destination step
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actBurrowDest(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] === 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a destination river card.'));
        }
        $this->game->burrowMove($activePlayerId, (int) $args['source'], $cardId);
        $this->globals->set('burrow_src', 0);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        $this->globals->set('burrow_src', 0);
        return BuildEffects::class;
    }
}
