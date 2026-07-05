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
 * Tow Line (once per game): move any river card to River 1, then run an auction on
 * it in place at the natural River-1 rate (2🐟/item) with NO flat trigger 🐟 — the
 * Swim flat is waived. Self-serving: the initiator is the one who auctions the
 * yanked card, so the per-item discount accrues to them. The card floats one space
 * downriver after the auction (ResolveAuction) if it still has uncovered icons.
 *
 * Reached from PlayerTurn::actUseAbility (routed here instead of AbilityTarget so
 * we can both flip the source card AND launch an auction, which the shared
 * AbilityTarget finish() can't do). The source card is flipped USED here; the
 * turn is then consumed by the auction (Auction -> ResolveAuction -> NextPlayer).
 */
class TowLine extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 70, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $playerId = (int) $this->game->getActivePlayerId();
        // Guard a board that lost its targets (or the ability to bid) between the
        // ability trigger and now: flip the card (the one-shot is spent) and end.
        if (count($this->game->abilityTargets('towline', $playerId)) === 0
            || !$this->game->canTriggerAuction($playerId)) {
            $card = (int) $this->globals->get('pending_ability_card', 0);
            if ($card > 0) {
                $this->game->flipCardUsed($card);
            }
            $this->clearPending();
            return NextPlayer::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["targets" => $this->game->abilityTargets('towline', (int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actTowLine(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException(clienttranslate('Choose a river card to tow.'));
        }
        // Yank the card to River 1, then flip the source card (one-shot spent).
        $this->game->moveRiverCardToSlot($cardId, 1);
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($card > 0) {
            $this->game->flipCardUsed($card);
        }
        $this->clearPending();

        // Free trigger (flat waived); forced_rate NULL -> natural River-1 rate.
        $this->game->startAuction($cardId, $activePlayerId);

        $matDef = Material::$MATERIAL[(int) $this->game->getCardRow($cardId)['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = ucfirst($material) . ($wildAlt !== null ? '/' . ucfirst((string) $wildAlt) : '');
        $this->notify->all('auctionStarted', clienttranslate('${player_name} tows ${card_name} (${open}x ${material}) to River 1 with the Tow Line.'), [
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
        $card = (int) $this->globals->get('pending_ability_card', 0);
        if ($card > 0) {
            $this->game->flipCardUsed($card);
        }
        $this->clearPending();
        return NextPlayer::class;
    }

    private function clearPending(): void
    {
        $this->globals->set('pending_ability', '');
        $this->globals->set('pending_ability_free', 0);
        $this->globals->set('pending_ability_card', 0);
    }
}
