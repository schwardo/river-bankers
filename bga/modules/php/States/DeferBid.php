<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * A deferred bidder (Spy Mound / Quick Strike) declares their real bid after the
 * other bids are revealed. Like a normal bid it is capped at min(supply, open
 * icons); the auction trigger must still bid >= 1 (Quick Strike's clause), others
 * may bid 0. Returns to BidReveal, which runs the next deferred bidder or resolves.
 */
class DeferBid extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 23,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        // Show the revealed bids so the deferring player can choose informedly.
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return null;
    }

    public function getArgs(): array
    {
        $auction = $this->game->getOpenAuction();
        $auctionId = (int) $auction['auction_id'];
        $lot = (int) $auction['lot_card_id'];
        $playerId = (int) $this->game->getActivePlayerId();
        $open = $this->game->auctionOpenIcons(); // combined-aware (Confluence)
        return [
            "lotCardId" => $lot,
            "open" => $open,
            "triggerPlayer" => (int) $auction['trigger_player'],
            "maxBid" => min($open, $this->game->getPlayerSupply($playerId)),
            "revealedBids" => $this->game->getRevealedBids($auctionId), // player_id => workers (now public to the chooser)
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actDeferredBid(int $workers, int $activePlayerId, array $args)
    {
        $minBid = $activePlayerId === (int) $args['triggerPlayer'] ? 1 : 0;
        if ($workers < $minBid || $workers > (int) $args['maxBid']) {
            throw new UserException('Invalid bid.');
        }
        $auction = $this->game->getOpenAuction();
        $this->game->submitDeferredBid((int) $auction['auction_id'], $activePlayerId, $workers);
        return BidReveal::class;
    }

    function zombie(int $playerId)
    {
        // A quit deferred trigger still owes the minimum 1; others bid 0.
        $auction = $this->game->getOpenAuction();
        $min = $playerId === (int) $auction['trigger_player'] ? 1 : 0;
        $cap = min($this->game->auctionOpenIcons(), $this->game->getPlayerSupply($playerId));
        $this->game->submitDeferredBid((int) $auction['auction_id'], $playerId, min($min, $cap));
        return BidReveal::class;
    }
}
