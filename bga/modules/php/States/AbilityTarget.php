<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Pick the target for an ability the player triggered (cost already paid in
 * PlayerTurn). As-an-action abilities (Driftwood Snag / Tow Line / Heron Roost)
 * consume the turn; once-per-game abilities (Hollowed-out Log / Wood Pile /
 * Tribute Stone) are free, flip the source card, and return to the turn.
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
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $key = (string) $this->globals->get('pending_ability', '');
        if ($key === '' || count($this->game->abilityTargets($key, (int) $this->game->getActivePlayerId())) === 0) {
            return $this->finish();
        }
        return null;
    }

    public function getArgs(): array
    {
        $key = (string) $this->globals->get('pending_ability', '');
        return [
            "ability" => $key,
            "targets" => $this->game->abilityTargets($key, (int) $this->game->getActivePlayerId()),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actAbilityTarget(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a valid target.'));
        }
        $this->game->resolveAbility((string) $this->globals->get('pending_ability', ''), $cardId, $activePlayerId);
        return $this->finish();
    }

    /** Undo this in-progress ability before it commits — see Game::undoAbility(). */
    #[PossibleAction]
    public function actUndo(int $activePlayerId)
    {
        return $this->game->undoAbility();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $free = (int) $this->globals->get('pending_ability_free', 0) === 1;
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($free && $card > 0) {
            $this->game->flipCardUsed($card); // once-per-game: spend the card
        }
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $this->globals->set('pending_ability', '');
        $this->globals->set('pending_ability_free', 0);
        $this->globals->set('pending_ability_card', 0);

        // Free abilities don't end the turn; the player resumes PlayerTurn.
        return $free ? PlayerTurn::class : NextPlayer::class;
    }
}
