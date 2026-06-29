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
                $bidders[] = (int) $row['id'];
            }
        }
        // Once everyone has bid (or deferred), BidReveal runs deferred bids then resolves.
        $this->gamestate->setPlayersMultiactive($bidders, BidReveal::class, true);
        // Resolve any zombie bidders now (each bids the minimum via zombie()): the
        // framework only auto-resolves one zombie per request, so two+ zombies
        // would stall the sealed round with no live action left to nudge them.
        $zombies = $this->game->getZombiePlayerIds();
        foreach ($bidders as $pid) {
            if (in_array($pid, $zombies, true)) {
                $this->zombie($pid);
            }
        }
    }

    public function getArgs(): array
    {
        $auction = $this->game->getOpenAuction();
        $trigger = (int) $auction['trigger_player'];
        // Public maps of who may defer (player_id => 'Quick Strike'|'Spy Mound'|null)
        // and who may Floodgate (built cards are public). One loop over the active
        // players. NB: this is intentionally NOT pulled into actBid — keeping the
        // bid action free of getArgs shortens that hot transaction and reduces
        // multiactive deadlocks with concurrent page wakeups.
        // Key these by the bidder set (every non-retired player — matches
        // onEnteringState's setPlayersMultiactive) rather than
        // getActivePlayerList(): the latter can be empty/partial depending on
        // when the framework evaluates getArgs() relative to the multiactive
        // set, which would silently drop the trigger's Quick Strike / Floodgate
        // buttons even though they qualify.
        $canDefer = [];
        $floodgate = [];
        foreach ($this->game->getTurnOrderRows() as $row) {
            if ($row['retired']) {
                continue;
            }
            $pid = (int) $row['id'];
            $canDefer[$pid] = $this->game->deferReason($pid, $trigger);
            $floodgate[$pid] = $this->game->canFloodgate($pid, $trigger);
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
    public function actBid(int $workers, int $currentPlayerId)
    {
        // Deliberately does NOT take $args: that would make the framework compute
        // the (relatively heavy) getArgs() on every bid, lengthening this hot
        // transaction and inviting multiactive deadlocks. Recompute the little we
        // need straight from the open auction instead.
        $auction = $this->game->getOpenAuction();
        $maxBid = min($this->game->auctionOpenIcons(), $this->game->getPlayerSupply($currentPlayerId));
        $minBid = $currentPlayerId === (int) $auction['trigger_player'] ? 1 : 0;
        if ($workers < $minBid || $workers > $maxBid) {
            throw new UserException(clienttranslate('Invalid bid.'));
        }

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
            throw new UserException(clienttranslate('You cannot defer your bid.'));
        }
        $this->game->recordDefer((int) $auction['auction_id'], $currentPlayerId, (int) $auction['trigger_player']);
        $this->notify->all('defer', clienttranslate('${player_name} defers and bids last.'), [
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
            throw new UserException(clienttranslate('You cannot recall from the card being auctioned.'));
        }
        $here = (int) $this->game->getUniqueValueFromDB(
            "SELECT COALESCE(SUM(`workers`), 0) FROM `worker` WHERE `player_id` = $currentPlayerId AND `card_id` = $cardId"
        );
        if ($here <= 0) {
            throw new UserException(clienttranslate('You have no worker to recall there.'));
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
            throw new UserException(clienttranslate('You cannot use Floodgate now.'));
        }
        $this->game->applyFloodgate($currentPlayerId);
        $this->notify->all('boardUpdate', clienttranslate('${player_name} uses Floodgate (slides the lot upstream).'), array_merge(
            $this->game->boardUpdatePayload(),
            ['player_id' => $currentPlayerId, 'player_name' => $this->game->getPlayerNameById($currentPlayerId)]
        ));
        // Player stays multiactive and re-chooses their bid at the cheaper rate.
    }

    function zombie(int $playerId)
    {
        // A quit player drops out with the minimum legal bid: 0 for a regular
        // bidder, but the trigger still owes >= 1 (capped by available workers),
        // matching actBid's invariant and DeferBid::zombie.
        $auction = $this->game->getOpenAuction();
        $min = $playerId === (int) $auction['trigger_player'] ? 1 : 0;
        $cap = min($this->game->auctionOpenIcons(), $this->game->getPlayerSupply($playerId));
        $this->game->recordBid((int) $auction['auction_id'], $playerId, min($min, $cap));
        $this->gamestate->setPlayerNonMultiactive($playerId, BidReveal::class);
    }
}
