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
 * secretly commits a number of workers; once all have acted, control passes to
 * BidReveal (which runs any deferred bids, then ResolveAuction). The triggering
 * player must bid >= 1; others may bid 0. A bid is capped at min(supply, icons).
 *
 * A player with Quick Strike (as trigger) or an unused Spy Mound may DEFER —
 * declaring their bid after the others reveal theirs (handled in DeferBid).
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
        // Once everyone has bid (or deferred), BidReveal runs deferred bids then resolves.
        $this->gamestate->setPlayersMultiactive($bidders, BidReveal::class, true);
    }

    public function getArgs(): array
    {
        $auction = $this->game->getOpenAuction();
        $trigger = (int) $auction['trigger_player'];
        // Public map of who may defer + via which card (built cards are public):
        // player_id => 'Quick Strike' | 'Spy Mound' | null.
        $canDefer = [];
        foreach ($this->gamestate->getActivePlayerList() as $pid) {
            $canDefer[(int) $pid] = $this->game->deferReason((int) $pid, $trigger);
        }
        $floodgate = [];
        foreach ($this->gamestate->getActivePlayerList() as $pid) {
            $floodgate[(int) $pid] = $this->game->canFloodgate((int) $pid, $trigger);
        }
        return [
            "lotCardId" => (int) $auction['lot_card_id'],
            "lotCardId2" => $auction['lot_card_id2'] === null ? null : (int) $auction['lot_card_id2'],
            "open" => $this->game->auctionOpenIcons(), // sum of both cards when combined (Confluence)
            "triggerPlayer" => $trigger,
            "canDefer" => $canDefer,
            "canFloodgate" => $floodgate, // trigger may slide the lot toward Headwaters
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actBid(int $workers, int $currentPlayerId, array $args)
    {
        $maxBid = min($this->game->auctionOpenIcons(), $this->game->getPlayerSupply($currentPlayerId));
        $minBid = $currentPlayerId === (int) $args['triggerPlayer'] ? 1 : 0;
        if ($workers < $minBid || $workers > $maxBid) {
            throw new UserException('Invalid bid.');
        }

        $auction = $this->game->getOpenAuction();
        $this->game->recordBid((int) $auction['auction_id'], $currentPlayerId, $workers);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, BidReveal::class);
    }

    /**
     * Defer your bid (Quick Strike as trigger, or an unused Spy Mound): drop out
     * of the sealed round now and declare your real bid in DeferBid, after the
     * others reveal theirs.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actDefer(int $currentPlayerId)
    {
        $auction = $this->game->getOpenAuction();
        if (!$this->game->canDeferBid($currentPlayerId, (int) $auction['trigger_player'])) {
            throw new UserException('You cannot defer your bid.');
        }
        $this->game->recordDefer((int) $auction['auction_id'], $currentPlayerId, (int) $auction['trigger_player']);
        $this->notify->all('defer', clienttranslate('${player_name} will bid last'), [
            'player_id' => $currentPlayerId,
            'player_name' => $this->game->getPlayerNameById($currentPlayerId),
        ]);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, BidReveal::class);
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
        // Streambank Hollow: slide back 1🐟 per worker recalled before an auction.
        if (in_array('Streambank Hollow', $this->game->getBuiltNames($currentPlayerId), true)) {
            $this->game->moveBackFish($currentPlayerId, 1);
        }
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        // Player stays active (multiactive) and re-chooses their bid.
    }

    /**
     * Floodgate (once per game, trigger only): slide the auctioned lot one space
     * toward the Headwaters before bidding (cheaper per item). Stay active to bid.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actFloodgate(int $currentPlayerId)
    {
        $auction = $this->game->getOpenAuction();
        if (!$this->game->canFloodgate($currentPlayerId, (int) $auction['trigger_player'])) {
            throw new UserException('You cannot use Floodgate now.');
        }
        $this->game->applyFloodgate($currentPlayerId);
        $this->notify->all('boardUpdate', clienttranslate('${player_name} uses Floodgate (slides the lot upstream)'), array_merge(
            $this->game->boardUpdatePayload(),
            ['player_id' => $currentPlayerId, 'player_name' => $this->game->getPlayerNameById($currentPlayerId)]
        ));
        // Player stays multiactive and re-chooses their bid at the cheaper rate.
    }

    function zombie(int $playerId)
    {
        // A quit player bids 0 and drops out of the auction.
        $auction = $this->game->getOpenAuction();
        $this->game->recordBid((int) $auction['auction_id'], $playerId, 0);
        $this->gamestate->setPlayerNonMultiactive($playerId, BidReveal::class);
    }
}
