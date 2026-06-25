<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Stone Causeway reaction: after the player builds a structure that uses Stones,
 * draw 1 structure card (done on entry) then discard 1 from hand. Guaranteed a
 * card to draw (BuildEffects gates on structuresAvailable > 0).
 */
class ReactDrawDiscard extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 54, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $playerId = (int) $this->game->getActivePlayerId();
        $this->game->drawStructures($playerId, 1);
        $this->notify->player($playerId, 'handUpdate', '', ['hand' => $this->game->getHandView($playerId)]);
        $this->notify->all('build', clienttranslate('${player_name} draws a card (Stone Causeway)'), [
            'player_id' => $playerId,
            'player_name' => $this->game->getPlayerNameById($playerId),
        ]);
        return null;
    }

    public function getArgs(): array
    {
        return ["handStructureIds" => $this->game->getPlayerHand((int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actDiscardOne(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['handStructureIds'], true)) {
            throw new UserException('Choose a card from your hand to discard.');
        }
        $this->game->discardStructures([$cardId]);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        // Discard the first hand card.
        $hand = $this->game->getPlayerHand($playerId);
        if (count($hand) > 0) {
            $this->game->discardStructures([$hand[0]]);
        }
        return BuildEffects::class;
    }
}
