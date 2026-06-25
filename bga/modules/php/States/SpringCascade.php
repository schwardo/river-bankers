<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Spring Cascade (once per game): ready (un-flip) one of your OTHER spent
 * once-per-game cards. Free ability — the turn resumes; the Spring Cascade card
 * itself is then flipped.
 */
class SpringCascade extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 62, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        if (!$this->game->abilityUsable('springcascade', (int) $this->game->getActivePlayerId())) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["spentCards" => $this->game->readyableSpentCards((int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actReady(int $cardId, int $activePlayerId, array $args)
    {
        $ids = array_map(fn(array $c): int => $c['id'], $args['spentCards']);
        if (!in_array($cardId, $ids, true)) {
            throw new UserException('Choose one of your spent once-per-game cards.');
        }
        $this->game->unflipCardUsed($cardId);
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($card > 0) {
            $this->game->flipCardUsed($card);
        }
        $this->globals->set('pending_ability', '');
        $this->globals->set('pending_ability_card', 0);
        $this->globals->set('pending_ability_free', 0);
        return PlayerTurn::class;
    }
}
