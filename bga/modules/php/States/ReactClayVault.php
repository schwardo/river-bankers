<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Clay Vault reaction: after the player builds a structure that uses Clay, peek
 * at the top of the structure deck and optionally swap it for one card from hand
 * (the chosen hand card is discarded; the deck top is drawn). Auto-skips with no
 * deck top to peek.
 */
class ReactClayVault extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 55, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if ($this->game->peekStructureTop() === null) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $top = $this->game->peekStructureTop();
        return [
            "topName" => $top['name'] ?? '',
            "handStructureIds" => $this->game->getPlayerHand((int) $this->game->getActivePlayerId()),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actClaySwap(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['handStructureIds'], true)) {
            throw new UserException('Choose a hand card to swap out.');
        }
        $this->game->clayVaultSwap($activePlayerId, $cardId);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        return BuildEffects::class;
    }

    #[PossibleAction]
    public function actClaySkip(int $activePlayerId)
    {
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        return BuildEffects::class;
    }
}
