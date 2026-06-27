<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Material;

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

    function onEnteringState()
    {
        // Push the freshly-redrawn Headwaters to all clients.
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return null;
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

        // Separator message naming the chosen lot (card, material, open icons).
        $matDef = Material::$MATERIAL[(int) $this->game->getCardRow($cardId)['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = ucfirst($material) . ($wildAlt !== null ? '/' . ucfirst((string) $wildAlt) : '');
        $this->notify->all('auctionStarted', clienttranslate('${player_name} auctions ${card_name} (${open}x ${material}).'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
            'card_name' => (string) ($matDef['name'] ?? ''),
            'material' => $matLabel,
            'open' => $this->game->uncoveredIcons($cardId),
        ]);

        return Auction::class;
    }

    function zombie(int $playerId)
    {
        // A quit player forfeits the post-flush auction.
        return NextPlayer::class;
    }
}
