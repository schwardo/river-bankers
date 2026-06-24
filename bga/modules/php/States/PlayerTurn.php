<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * SelectAction — the active player takes exactly one action.
 *
 * Spine status: the river-card Auction action is wired end-to-end (-> Auction
 * multiactive state). The other four actions (Pull / Flush / Invent / Build)
 * are Phase 4 TODOs.
 */
class PlayerTurn extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        return [
            "auctionableRiverCards" => $this->game->getAuctionableRiverCards(),
        ];
    }

    /**
     * Auction an existing river card: pay the flat 1 fish immediately, then open
     * a sealed multi-winner auction on it.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actAuction(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['auctionableRiverCards'], true)) {
            throw new UserException('That card cannot be auctioned.');
        }

        $this->game->advanceFish($activePlayerId, 1); // flat trigger cost
        $this->game->startAuction($cardId, $activePlayerId);

        $this->notify->all('auctionStarted', clienttranslate('${player_name} opens an auction'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
        ]);

        return Auction::class;
    }

    // TODO (Phase 4): actPull (auction a Headwaters card + refill),
    // actFlush, actInvent (draw N / discard N), actBuild.

    function zombie(int $playerId)
    {
        // A quit player simply ends their turn without acting.
        return NextPlayer::class;
    }
}
