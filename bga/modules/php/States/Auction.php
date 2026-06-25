<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Sealed simultaneous bidding. Every non-retired player is multiactive and
 * secretly commits a number of workers; once all have bid, control passes to
 * ResolveAuction (multi-winner plenty/jam). The triggering player must bid >= 1;
 * others may bid 0. A bid is capped at min(supply, uncovered icons).
 *
 * TODO (Phase 4): pre-auction recall, and the Spy Mound / Quick Strike
 * "declare your bid last" defer gate.
 */
class Auction extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        // Reflect the trigger's flat-cost fish payment + the open lot.
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());

        $bidders = [];
        foreach ($this->game->getTurnOrderRows() as $row) {
            if (!$row['retired']) {
                $bidders[] = $row['id'];
            }
        }
        $this->gamestate->setPlayersMultiactive($bidders, ResolveAuction::class, true);
    }

    public function getArgs(): array
    {
        $auction = $this->game->getOpenAuction();
        return [
            "lotCardId" => (int) $auction['lot_card_id'],
            "open" => $this->game->uncoveredIcons((int) $auction['lot_card_id']),
            "triggerPlayer" => (int) $auction['trigger_player'],
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actBid(int $workers, int $currentPlayerId, array $args)
    {
        $maxBid = min((int) $args['open'], $this->game->getPlayerSupply($currentPlayerId));
        $minBid = $currentPlayerId === (int) $args['triggerPlayer'] ? 1 : 0;
        if ($workers < $minBid || $workers > $maxBid) {
            throw new UserException('Invalid bid.');
        }

        $auction = $this->game->getOpenAuction();
        $this->game->recordBid((int) $auction['auction_id'], $currentPlayerId, $workers);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, ResolveAuction::class);
    }

    /**
     * Pre-auction recall: pull one worker off a river card back to supply (drops a
     * blank). The player stays active and returns to choosing a bid with the
     * freed worker.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actRecall(int $cardId, int $currentPlayerId)
    {
        $auction = $this->game->getOpenAuction();
        if ($cardId === (int) $auction['lot_card_id']) {
            throw new UserException('You cannot recall from the card being auctioned.');
        }
        $here = (int) $this->game->getUniqueValueFromDB(
            "SELECT COALESCE(SUM(`workers`), 0) FROM `worker` WHERE `player_id` = $currentPlayerId AND `card_id` = $cardId"
        );
        if ($here <= 0) {
            throw new UserException('You have no worker to recall there.');
        }
        $this->game->recallWorker($currentPlayerId, $cardId);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        // Player stays active (multiactive) and re-chooses their bid.
    }

    function zombie(int $playerId)
    {
        // A quit player bids 0 and drops out of the auction.
        $auction = $this->game->getOpenAuction();
        $this->game->recordBid((int) $auction['auction_id'], $playerId, 0);
        $this->gamestate->setPlayerNonMultiactive($playerId, ResolveAuction::class);
    }
}
