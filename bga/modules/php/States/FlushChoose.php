<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * After a Flush, the active player picks one of the freshly-revealed Headwaters
 * cards to auction. Triggering this auction is free (the 5 fish already covered
 * it), but the player still bids (>= 1) and pays per-item normally.
 */
class FlushChoose extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 31,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        return [
            "headwatersCards" => $this->game->getHeadwatersCards(),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actChoose(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['headwatersCards'], true)) {
            throw new UserException('Choose one of the revealed Headwaters cards.');
        }

        // Free trigger (the Flush's 5 fish covered it); auction runs at the
        // Headwaters rate, and the Headwaters refills afterward (ResolveAuction).
        $this->game->startAuction($cardId, $activePlayerId);

        return Auction::class;
    }
}
