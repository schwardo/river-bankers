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
 * Snag Pile (when built): pull a Headwaters card to River 1 and run an auction on
 * it at 1🐟/item (the builder is the trigger and must bid >= 1). The auction flows
 * through Auction -> ResolveAuction, which returns to BuildEffects to resume any
 * remaining queued build effects.
 */
class SnagPile extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 59, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $playerId = (int) $this->game->getActivePlayerId();
        if (count($this->game->getHeadwatersCards()) === 0 || !$this->game->canTriggerAuction($playerId)) {
            return BuildEffects::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["headwatersCards" => $this->game->getHeadwatersCards()];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actSnagChoose(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['headwatersCards'], true)) {
            throw new UserException(clienttranslate('Choose a Headwaters card to snag.'));
        }
        // Free trigger, forced 1🐟/item rate; the card floats to River 1 afterward.
        $this->game->startAuction($cardId, $activePlayerId, 1);

        $matDef = Material::$MATERIAL[(int) $this->game->getCardRow($cardId)['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = ucfirst($material) . ($wildAlt !== null ? '/' . ucfirst((string) $wildAlt) : '');
        $this->notify->all('auctionStarted', clienttranslate('${player_name} snags ${card_name} (${open}x ${material}) with the Snag Pile.'), [
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
        return BuildEffects::class;
    }
}
