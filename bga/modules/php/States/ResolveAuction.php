<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Material;
use Bga\Games\RiverBankers\Rules\Auction as AuctionRules;
use Bga\Games\RiverBankers\Rules\Cost;

/**
 * Resolve the sealed auction (GAME state, runs once all bids are in):
 *   1. pay fish first — every bidder advances bid x per-item cost (win or lose);
 *   2. place clinched workers (multi-winner plenty/jam, Rules\Auction);
 *   3. move the card downstream / to shoreline (Rules\CardMovement).
 * Then hand back to NextPlayer.
 */
class ResolveAuction extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 21,
            type: StateType::GAME,
        );
    }

    function onEnteringState()
    {
        $auction = $this->game->getOpenAuction();
        $auctionId = (int) $auction['auction_id'];
        $cardId = (int) $auction['lot_card_id'];
        $forcedRate = $auction['forced_rate'] === null ? null : (int) $auction['forced_rate'];

        $cardRow = $this->game->getCardRow($cardId);
        $open = $this->game->uncoveredIcons($cardId);
        $bids = $this->game->getAuctionBids($auctionId);

        $clinched = AuctionRules::clinched($open, $bids);
        // TODO (Phase 4): detect each player's built Pontoon for the jam refund.
        $billable = AuctionRules::billableWorkers($open, $bids, []);
        $perItem = Cost::perItem((string) $cardRow['card_location'], (int) $cardRow['card_location_arg'], $forcedRate);

        $placed = 0;
        foreach ($bids as $pid => $bid) {
            $this->game->advanceFish($pid, $billable[$pid] * $perItem);
            if ($clinched[$pid] > 0) {
                $this->game->placeWorkers($pid, $cardId, $clinched[$pid]);
                $placed += $clinched[$pid];
            }
        }

        $wasHeadwaters = $cardRow['card_location'] === 'headwaters';
        $vacatedSlot = (int) $cardRow['card_location_arg'];
        $this->game->moveCardAfterAuction($cardId, $open - $placed);
        if ($wasHeadwaters) {
            $this->game->refillHeadwaters($vacatedSlot);
        }
        $this->game->clearAuction($auctionId);

        // Report what each bidder won (and that empty-handed bidders still paid).
        $material = Material::$MATERIAL[(int) $cardRow['card_type_arg']]['material'] ?? '';
        foreach ($bids as $pid => $bid) {
            $got = $clinched[$pid];
            $msg = $got > 0
                ? clienttranslate('${player_name} wins ${n} ${material} (paid ${paid}🐟)')
                : clienttranslate('${player_name} wins nothing (paid ${paid}🐟)');
            $this->notify->all('auctionResolved', $msg, [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'n' => $got,
                'material' => $material,
                'paid' => $billable[$pid] * $perItem,
                'i18n' => ['material'],
            ]);
        }

        return NextPlayer::class;
    }
}
