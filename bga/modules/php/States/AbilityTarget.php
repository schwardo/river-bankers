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
 * PlayerTurn). As-an-action abilities (Driftwood Snag / Heron Roost)
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
        if ((int) $this->globals->get('ability_victim_card', 0) > 0) {
            return null; // waiting on the opponent pick
        }
        if ($key === '' || count($this->game->abilityTargets($key, (int) $this->game->getActivePlayerId())) === 0) {
            return $this->finish();
        }
        return null;
    }

    /** Abilities that hit one opponent's worker; the user picks the opponent when several are on the card. */
    private const VICTIM_ABILITIES = ['tributestone', 'channelclearer'];

    public function getArgs(): array
    {
        $key = (string) $this->globals->get('pending_ability', '');
        $victimCard = (int) $this->globals->get('ability_victim_card', 0);
        if ($victimCard > 0) {
            $pid = (int) $this->game->getActivePlayerId();
            return [
                "ability"    => $key,
                "targets"    => [],
                "victimCard" => $victimCard,
                "victims"    => array_map(fn(int $id) => ['id' => $id, 'name' => $this->game->getPlayerNameById($id)],
                    $this->game->abilityVictims($victimCard, $pid)),
            ];
        }
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
        $key = (string) $this->globals->get('pending_ability', '');
        if (in_array($key, self::VICTIM_ABILITIES, true) && count($this->game->abilityVictims($cardId, $activePlayerId)) > 1) {
            // Several opponents on this card: ask whose worker to hit.
            $this->globals->set('ability_victim_card', $cardId);
            return AbilityTarget::class;
        }
        $this->game->resolveAbility($key, $cardId, $activePlayerId);
        return $this->finish();
    }

    /**
     * Second step for Tribute Stone / Snare Set / Channel Clearer when several
     * opponents share the chosen card: pick whose worker is hit.
     * @throws UserException
     */
    #[PossibleAction]
    public function actAbilityVictim(int $victimId, int $activePlayerId, array $args)
    {
        $cardId = (int) $this->globals->get('ability_victim_card', 0);
        if ($cardId <= 0 || !in_array($victimId, array_column($args['victims'] ?? [], 'id'), true)) {
            throw new UserException(clienttranslate('Choose a valid opponent.'));
        }
        $this->game->resolveAbility((string) $this->globals->get('pending_ability', ''), $cardId, $activePlayerId, $victimId);
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
        $this->globals->set('ability_victim_card', 0);

        // Free abilities don't end the turn; the player resumes PlayerTurn.
        return $free ? PlayerTurn::class : NextPlayer::class;
    }
}
