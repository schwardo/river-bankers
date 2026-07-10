<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\Actions\Types\IntArrayParam;
use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Stone Pool (when built): look at the top 5 material cards and rearrange them in
 * any order. The submitted order is top-of-deck first and must be a permutation
 * of the shown cards. Auto-skips if fewer than 2 cards remain.
 */
class StonePool extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 57, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        if ($this->game->getMaterialDeckCount() < 2) {
            return BuildEffects::class;
        }
        // The top-N material cards are a PRIVATE peek at the face-down deck — only
        // the arranging player may see them. The framework's `_private` STATE ARGS
        // (see getArgs) don't reliably reach the client on state entry — that's why
        // actKeepOrder exists as a "peek never arrived" fallback. So ALSO push the
        // peek over the reliable private-NOTIFICATION channel (same mechanism as
        // Salt Lick's peekHands), which the client prefers. `n` picks the label
        // (2 = Vine Curtain's top-2 peek, else Stone Pool's top-5).
        $n = (int) $this->globals->get('reorder_n', 5);
        $playerId = (int) $this->game->getActivePlayerId();
        $this->notify->player($playerId, 'materialPeek', '', [
            'cards' => $this->game->topMaterialCards($n),
            'n' => $n,
        ]);
        return null;
    }

    public function getArgs(): array
    {
        $n = (int) $this->globals->get('reorder_n', 5);
        // Kept as a best-effort fallback alongside the materialPeek notification
        // (onEnteringState) — opponents, spectators, and replays never receive it.
        return ["_private" => ["active" => ["topCards" => $this->game->topMaterialCards($n), "n" => $n]]];
    }

    /**
     * @param list<int> $cardIds new top-to-bottom order (a permutation of the top cards)
     * @throws UserException
     */
    #[PossibleAction]
    public function actReorder(#[IntArrayParam] array $cardIds, int $activePlayerId)
    {
        // An empty submission means "keep the current order" (a legal no-op) — e.g.
        // if the private peek never reached the client. Don't error the player out.
        if (count($cardIds) > 0 && !$this->game->reorderMaterialTop($cardIds)) {
            throw new UserException(clienttranslate('Submit a valid ordering of the shown cards.'));
        }
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return BuildEffects::class;
    }

    /**
     * Keep the current order (no rearrangement). A dedicated no-arg action so the
     * "Keep current order" button always works — even when the private peek failed
     * to load — without sending an empty array param that could fail to bind.
     */
    #[PossibleAction]
    public function actKeepOrder(int $activePlayerId)
    {
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        return BuildEffects::class; // leave the order untouched
    }
}
