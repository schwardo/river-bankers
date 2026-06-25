<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Material;
use Bga\Games\RiverBankers\Rules\Auction as AuctionRules;
use Bga\Games\RiverBankers\Rules\Cost;
use Bga\Games\RiverBankers\Rules\Effects;

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
        // Pontoon: a jammed bidder who controls a built Pontoon pays for one fewer worker.
        $pontoon = [];
        foreach ($bids as $pid => $bid) {
            $pontoon[$pid] = in_array('Pontoon', $this->game->getBuiltNames($pid), true);
        }
        $billable = AuctionRules::billableWorkers($open, $bids, $pontoon);
        $base = Cost::perItem((string) $cardRow['card_location'], (int) $cardRow['card_location_arg'], $forcedRate);
        $matDef = Material::$MATERIAL[(int) $cardRow['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');               // primary, for the discount lookup
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = $wildAlt !== null ? "$material/$wildAlt" : $material; // display (wilds show both)

        // Per-item cost is per-player (material discounts: Reed Bed, Clay Den…).
        $paid = [];
        $placed = 0;
        foreach ($bids as $pid => $bid) {
            $rate = Effects::perItemForPlayer($base, (string) $material, $this->game->getBuiltNames($pid));
            $paid[$pid] = $billable[$pid] * $rate;
            $this->game->advanceFish($pid, $paid[$pid]);
            if ($clinched[$pid] > 0) {
                $this->game->placeWorkers($pid, $cardId, $clinched[$pid]);
                $placed += $clinched[$pid];
            }
        }

        $wasHeadwaters = $cardRow['card_location'] === 'headwaters';
        $vacatedSlot = (int) $cardRow['card_location_arg'];
        $penalties = $this->game->moveCardAfterAuction($cardId, $open - $placed);
        if ($wasHeadwaters) {
            $this->game->refillHeadwaters($vacatedSlot);
        }
        $this->game->clearAuction($auctionId);

        // Material shoreline-arrival penalties (Hidden Inlet / Mud Wallow / Cattail Cluster).
        $cardName = Material::$MATERIAL[(int) $cardRow['card_type_arg']]['name'] ?? '';
        foreach ($penalties as $pid => $spaces) {
            $this->notify->all('shorelinePenalty', clienttranslate('${player_name} drifts back ${spaces}🐟 (${card})'), [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'spaces' => $spaces,
                'card' => $cardName,
                'i18n' => ['card'],
            ]);
        }

        // Report what each bidder won (and that empty-handed bidders still paid).
        foreach ($bids as $pid => $bid) {
            $got = $clinched[$pid];
            $msg = $got > 0
                ? clienttranslate('${player_name} wins ${n} ${material} (paid ${paid}🐟)')
                : clienttranslate('${player_name} wins nothing (paid ${paid}🐟)');
            $this->notify->all('auctionResolved', $msg, [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'n' => $got,
                'material' => $matLabel,
                'paid' => $paid[$pid],
                'i18n' => ['material'],
            ]);
        }

        return NextPlayer::class;
    }
}
