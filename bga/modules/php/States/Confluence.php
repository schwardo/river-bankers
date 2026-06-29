<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Rules\Cost;

/**
 * Confluence (as an action): pick two same-material river cards and run a single
 * combined auction over both. The trigger pays the lesser of the two trigger
 * costs (both river = 1🐟); bidders pay the lesser per-item rate; clinched workers
 * fill the first card then the second; both cards float downriver afterward
 * (ResolveAuction's combined branch). Two steps tracked in conf_a.
 */
class Confluence extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 67, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        // Fresh entry only (conf_a is cleared once the auction starts); guard a
        // board that lost its pairs between selection and now.
        if ((int) $this->globals->get('conf_a', 0) === 0
            && !$this->game->abilityUsable('confluence', (int) $this->game->getActivePlayerId())) {
            return NextPlayer::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $a = (int) $this->globals->get('conf_a', 0);
        return $a === 0
            ? ["step" => "cardA", "cardA" => 0, "targets" => $this->game->confluenceFirstCards()]
            : ["step" => "cardB", "cardA" => $a, "targets" => $this->game->confluenceSecondCards($a)];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actConfA(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['cardA'] !== 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose the first river card.'));
        }
        $this->globals->set('conf_a', $cardId);
        return Confluence::class; // re-enter for the second card
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actConfB(int $cardId, int $activePlayerId, array $args)
    {
        $a = (int) $args['cardA'];
        if ($a === 0 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose the second river card (same material).'));
        }
        $slotA = (int) $this->game->getCardRow($a)['card_location_arg'];
        $slotB = (int) $this->game->getCardRow($cardId)['card_location_arg'];
        $rate = min(Cost::perItem('river', $slotA), Cost::perItem('river', $slotB));

        $this->game->advanceFish($activePlayerId, 1); // lesser trigger cost (both river)
        $this->game->startCombinedAuction($a, $cardId, $activePlayerId, $rate);
        $this->globals->set('conf_a', 0);

        $this->notify->all('auctionStarted', clienttranslate('${player_name} opens a Confluence (two-card auction).'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $a,
        ]);
        return Auction::class;
    }

    function zombie(int $playerId)
    {
        $this->globals->set('conf_a', 0);
        return NextPlayer::class;
    }
}
