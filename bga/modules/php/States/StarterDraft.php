<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Simultaneous species-starter draft: each player pre-builds one of their three
 * species starter cards (the other two are boxed). When all have chosen, hands
 * are dealt (DealHands) and the game begins.
 */
class StarterDraft extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 5,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        $ids = $this->game->getAllPlayerIds();
        $this->gamestate->setPlayersMultiactive($ids, DealHands::class, true);
        // Auto-draft for any zombies up front (each via zombie()): the framework
        // resolves only one zombie per request, so two+ would stall the draft.
        $zombies = $this->game->getZombiePlayerIds();
        foreach ($ids as $pid) {
            if (in_array($pid, $zombies, true)) {
                $this->zombie($pid);
            }
        }
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actPickStarter(int $cardId, int $currentPlayerId)
    {
        $offerIds = array_map(fn(array $c) => $c['id'], $this->game->getStarterOffer($currentPlayerId));
        if (!in_array($cardId, $offerIds, true)) {
            throw new UserException('Choose one of your species starters.');
        }
        $this->game->draftStarter($currentPlayerId, $cardId);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, DealHands::class);
    }

    function zombie(int $playerId)
    {
        $offer = $this->game->getStarterOffer($playerId);
        if (count($offer) > 0) {
            $this->game->draftStarter($playerId, $offer[0]['id']);
        }
        $this->gamestate->setPlayerNonMultiactive($playerId, DealHands::class);
    }
}
