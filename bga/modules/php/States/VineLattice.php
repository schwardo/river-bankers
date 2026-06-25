<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Vine Lattice (when built): draw 3 structure cards (into a private offer), keep
 * 1, discard the other 2. The draw happens once on entry.
 */
class VineLattice extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 58, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $playerId = (int) $this->game->getActivePlayerId();
        if (count($this->game->getLatticeOffer($playerId)) === 0) {
            $this->game->drawLatticeOffer($playerId, 3);
        }
        // Nothing to choose if the structure pool was empty.
        if (count($this->game->getLatticeOffer($playerId)) === 0) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["offer" => $this->game->getLatticeOffer((int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actLatticeKeep(int $cardId, int $activePlayerId, array $args)
    {
        $ids = array_map(fn(array $c): int => $c['id'], $args['offer']);
        if (!in_array($cardId, $ids, true)) {
            throw new UserException('Choose one of the drawn cards to keep.');
        }
        $this->game->latticeKeep($activePlayerId, $cardId);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        $offer = $this->game->getLatticeOffer($playerId);
        if (count($offer) > 0) {
            $this->game->latticeKeep($playerId, $offer[0]['id']);
        }
        return BuildEffects::class;
    }
}
