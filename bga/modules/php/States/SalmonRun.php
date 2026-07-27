<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Salmon Run (once per game, flip card): place 1-5 workers from supply onto
 * uncovered icons of one river card. The fish cost is the TOTAL for the run —
 * 1/2/3/5/8 for 1..5 workers — not a per-worker escalation.
 *
 * Two steps (pick the card, then the count) and it consumes the turn, like
 * Tow Line. Was a repeatable as-an-action ability with a steeper cumulative
 * cost (1/3/6/11/19) until [2026-07-26].
 */
class SalmonRun extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 64, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $playerId = (int) $this->game->getActivePlayerId();
        if (!$this->game->abilityUsable('salmonrun', $playerId)) {
            return NextPlayer::class; // nothing to do â the turn is still spent
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $card = (int) $this->globals->get('salmonrun_card', 0);
        if ($card === 0) {
            return ["step" => "card", "card" => 0, "targets" => $this->game->salmonRunTargets()];
        }
        return [
            "step" => "count",
            "card" => $card,
            "max" => $this->game->salmonRunMax($playerId, $card),
            "costs" => \Bga\Games\RiverBankers\Rules\Effects::SALMON_RUN_COSTS,
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actSalmonCard(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['card'] !== 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a river card.'));
        }
        $this->globals->set('salmonrun_card', $cardId);
        return SalmonRun::class; // re-enter for the count
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actSalmonCount(int $n, int $activePlayerId, array $args)
    {
        if ((int) $args['card'] === 0 || $n < 1 || $n > (int) $args['max']) {
            throw new UserException(clienttranslate('Choose how many workers to place.'));
        }
        $this->game->salmonRunPlace($activePlayerId, (int) $args['card'], $n);
        // Once per game: spend the card. PlayerTurn stashed its id when it
        // matched Salmon Run in ONCE_ABILITIES.
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($card > 0) {
            $this->game->flipCardUsed($card);
        }
        $this->clearPending();
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return NextPlayer::class;
    }

    /** Undo this in-progress ability before it commits — see Game::undoAbility(). */
    #[PossibleAction]
    public function actUndo(int $activePlayerId)
    {
        return $this->game->undoAbility();
    }

    function zombie(int $playerId)
    {
        // A quit player placed nothing, so the card is NOT spent.
        $this->clearPending();
        return NextPlayer::class;
    }

    private function clearPending(): void
    {
        $this->globals->set('salmonrun_card', 0);
        $this->globals->set('pending_ability', '');
        $this->globals->set('pending_ability_free', 0);
        $this->globals->set('pending_ability_card', 0);
    }
}
