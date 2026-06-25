<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Rolling Float (once per game): swap one of your workers on a river card with an
 * opponent's worker on another card in the SAME river slot — no fish, no blanks.
 * Two steps (source, then destination); free ability (turn resumes).
 */
class RollingFloat extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 63, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (!$this->game->abilityUsable('rollingfloat', (int) $this->game->getActivePlayerId())) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $src = (int) $this->globals->get('rollingfloat_src', 0);
        return $src === 0
            ? ["step" => "source", "source" => 0, "targets" => $this->game->rollingFloatSources($playerId)]
            : ["step" => "dest", "source" => $src, "targets" => $this->game->rollingFloatTargets($playerId, $src)];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actRollSource(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] !== 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose one of your river cards.');
        }
        $this->globals->set('rollingfloat_src', $cardId);
        return RollingFloat::class;
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actRollDest(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['source'] === 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose an opponent worker in the same slot.');
        }
        $this->game->rollingFloatSwap($activePlayerId, (int) $args['source'], $cardId);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $this->globals->set('rollingfloat_src', 0);
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
