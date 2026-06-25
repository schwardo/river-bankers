<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Pick the target for an "as an action" ability the player triggered (the fish
 * cost was already paid in PlayerTurn). Driftwood Snag / Tow Line / Heron Roost.
 */
class AbilityTarget extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 51,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        $key = (string) $this->globals->get('pending_ability', '');
        if ($key === '' || count($this->game->abilityTargets($key)) === 0) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        $key = (string) $this->globals->get('pending_ability', '');
        return [
            "ability" => $key,
            "targets" => $this->game->abilityTargets($key),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actAbilityTarget(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose a valid target.');
        }
        $this->game->resolveAbility((string) $this->globals->get('pending_ability', ''), $cardId);
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $this->globals->set('pending_ability', '');
        return NextPlayer::class;
    }
}
