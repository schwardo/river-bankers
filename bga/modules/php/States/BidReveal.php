<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;

/**
 * Post-sealed-bid dispatcher (GAME state). Once every bidder has acted, this runs
 * any deferred bids one at a time (Spy Mound / Quick Strike — DeferBid), each
 * reveal informing the next, then hands off to ResolveAuction when none remain.
 */
class BidReveal extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 22,
            type: StateType::GAME,
        );
    }

    function onEnteringState()
    {
        $auction = $this->game->getOpenAuction();
        $auctionId = (int) $auction['auction_id'];

        $deferred = $this->game->getDeferredBidders($auctionId);
        if (count($deferred) === 0) {
            return ResolveAuction::class;
        }

        // Activate the next deferred bidder (lowest fish first) to declare their bid.
        $this->gamestate->changeActivePlayer($deferred[0]);
        return DeferBid::class;
    }
}
