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

        // Confluence: a combined two-card lot resolves on its own path.
        if ($auction['lot_card_id2'] !== null) {
            return $this->resolveCombined($auction);
        }

        $cardId = (int) $auction['lot_card_id'];
        $forcedRate = $auction['forced_rate'] === null ? null : (int) $auction['forced_rate'];

        $cardRow = $this->game->getCardRow($cardId);
        $open = $this->game->uncoveredIcons($cardId);
        $bids = $this->game->getAuctionBids($auctionId);
        $this->notifyBids($open, $bids);

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
                $this->playerStats->inc('auctions_won', 1, $pid);
                $this->playerStats->inc('icons_won', $clinched[$pid], $pid, true);
            }
        }

        // Auction-type table stats: plenty (no overbid) vs jammed (overbid), and
        // separately how many ended with nobody winning an icon.
        if (array_sum($bids) > $open) {
            $this->tableStats->inc('jammed_auctions', 1);
        } else {
            $this->tableStats->inc('plenty_auction', 1);
        }
        if ($placed === 0) {
            $this->tableStats->inc('fully_jammed_auctions', 1);
        }

        $wasHeadwaters = $cardRow['card_location'] === 'headwaters';
        $vacatedSlot = (int) $cardRow['card_location_arg'];
        $penalties = $this->game->moveCardAfterAuction($cardId, $open - $placed, $placed);
        if ($wasHeadwaters) {
            $this->game->refillHeadwaters($vacatedSlot);
        }
        $this->game->clearAuction($auctionId);

        // Material shoreline-arrival penalties (Hidden Inlet / Mud Wallow / Cattail Cluster).
        $cardName = Material::$MATERIAL[(int) $cardRow['card_type_arg']]['name'] ?? '';
        foreach ($penalties as $pid => $spaces) {
            $this->notify->all('shorelinePenalty', clienttranslate('${player_name} drifts back ${spaces} 🐟 (${card}).'), [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'spaces' => $spaces,
                'card' => $cardName,
                'i18n' => ['card'],
            ]);
        }

        // Report what each bidder won (and that empty-handed bidders still paid).
        $overbid = max(0, array_sum($bids) - $open);
        foreach ($bids as $pid => $bid) {
            $got = $clinched[$pid];
            $msg = $got > 0
                ? clienttranslate('${player_name} wins ${n}x ${material} (bid ${bid} - overbid ${overbid}), pays ${paid} 🐟.')
                : clienttranslate('${player_name} wins nothing (bid ${bid} - overbid ${overbid}), but pays ${paid} 🐟.');
            $this->notify->all('auctionResolved', $msg, [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'n' => $got,
                'material' => $matLabel,
                'paid' => $paid[$pid],
                'bid' => $bid,
                'overbid' => $overbid,
                'i18n' => ['material'],
            ]);
        }

        // Winners' clinched workers changed their leftover-material pairs (pair
        // VP), so refresh the panel scores now instead of at end of turn.
        $this->game->refreshScores();

        // Resume any queued build effects (e.g. Snag Pile auctions mid-queue);
        // an empty queue falls straight through to NextPlayer.
        return BuildEffects::class;
    }

    /**
     * Confluence resolution: distribute clinched workers across both lot cards
     * (fill A then B), charge every bidder at the lesser per-item rate, then float
     * both cards downriver. Bidders are processed trigger-first so jam overflow
     * fills the first card before the second.
     *
     * @param array<string,?string> $auction
     */
    private function resolveCombined(array $auction)
    {
        $auctionId = (int) $auction['auction_id'];
        $cardA = (int) $auction['lot_card_id'];
        $cardB = (int) $auction['lot_card_id2'];
        $trigger = (int) $auction['trigger_player'];
        $rate = (int) $auction['forced_rate']; // lesser per-item, set by Confluence

        $rowA = $this->game->getCardRow($cardA);
        $openA = $this->game->uncoveredIcons($cardA);
        $openB = $this->game->uncoveredIcons($cardB);
        $open = $openA + $openB;
        $bids = $this->game->getAuctionBids($auctionId);
        $this->notifyBids($open, $bids);

        $clinched = AuctionRules::clinched($open, $bids);
        $pontoon = [];
        foreach ($bids as $pid => $bid) {
            $pontoon[$pid] = in_array('Pontoon', $this->game->getBuiltNames($pid), true);
        }
        $billable = AuctionRules::billableWorkers($open, $bids, $pontoon);

        $matDef = Material::$MATERIAL[(int) $rowA['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');

        // Trigger first, then the remaining bidders by id (jam-overflow fill order).
        $order = array_keys($bids);
        usort($order, fn(int $a, int $b): int => [$a !== $trigger, $a] <=> [$b !== $trigger, $b]);

        $paid = [];
        $placedA = 0;
        $placedB = 0;
        foreach ($order as $pid) {
            $rateP = Effects::perItemForPlayer($rate, $material, $this->game->getBuiltNames($pid));
            $paid[$pid] = $billable[$pid] * $rateP;
            $this->game->advanceFish($pid, $paid[$pid]);
            $toPlace = $clinched[$pid];
            if ($toPlace > 0) {
                $fa = min($toPlace, $openA - $placedA);
                if ($fa > 0) {
                    $this->game->placeWorkers($pid, $cardA, $fa);
                    $placedA += $fa;
                    $toPlace -= $fa;
                }
                $fb = min($toPlace, $openB - $placedB);
                if ($fb > 0) {
                    $this->game->placeWorkers($pid, $cardB, $fb);
                    $placedB += $fb;
                }
            }
        }

        // Both moves apply their fish penalties immediately; merge (sum) only for
        // the notifications below.
        $penalties = [];
        foreach ([
            $this->game->moveCardAfterAuction($cardA, $openA - $placedA, $placedA),
            $this->game->moveCardAfterAuction($cardB, $openB - $placedB, $placedB),
        ] as $set) {
            foreach ($set as $pid => $spaces) {
                $penalties[$pid] = ($penalties[$pid] ?? 0) + $spaces;
            }
        }
        $this->game->clearAuction($auctionId);

        foreach ($penalties as $pid => $spaces) {
            $this->notify->all('shorelinePenalty', clienttranslate('${player_name} drifts back ${spaces} 🐟.'), [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'spaces' => $spaces,
                'card' => '',
                'i18n' => ['card'],
            ]);
        }
        $overbid = max(0, array_sum($bids) - $open);
        foreach ($order as $pid) {
            $got = $clinched[$pid];
            $msg = $got > 0
                ? clienttranslate('${player_name} wins ${n}x ${material} (bid ${bid} - overbid ${overbid}), pays ${paid} 🐟.')
                : clienttranslate('${player_name} wins nothing (bid ${bid} - overbid ${overbid}), but pays ${paid} 🐟.');
            $this->notify->all('auctionResolved', $msg, [
                'player_id' => $pid,
                'player_name' => $this->game->getPlayerNameById($pid),
                'n' => $got,
                'material' => $material,
                'paid' => $paid[$pid],
                'bid' => $bids[$pid],
                'overbid' => $overbid,
                'i18n' => ['material'],
            ]);
        }

        // Clinched workers changed winners' leftover-material pairs (pair VP).
        $this->game->refreshScores();

        return BuildEffects::class;
    }

    /**
     * Reveal every player's sealed bid and whether there was plenty to go around
     * (sum of bids <= open icons) or a jam (and by how much it was overbid).
     *
     * @param array<int,int> $bids player_id => workers bid
     */
    private function notifyBids(int $open, array $bids): void
    {
        $parts = [];
        foreach ($bids as $pid => $bid) {
            $bid = (int) $bid;
            $parts[] = $this->game->getPlayerNameById((int) $pid)
                . ' sends ' . $bid . ' worker' . ($bid === 1 ? '' : 's');
        }
        $list = implode(', ', $parts);
        $overbid = max(0, array_sum($bids) - $open);
        if ($overbid > 0) {
            $this->notify->all('auctionBids', clienttranslate('${open} item(s) available: ${bids}. River jams, overbid by ${overbid}.'), [
                'bids' => $list,
                'open' => $open,
                'overbid' => $overbid,
            ]);
        } else {
            $this->notify->all('auctionBids', clienttranslate('${open} item(s) available: ${bids}. Plenty to go around.'), [
                'bids' => $list,
                'open' => $open,
            ]);
        }
    }
}
