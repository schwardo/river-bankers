<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Vine Lattice (when built): draw 3 structure cards (into a private offer), keep
 * 1, discard the other 2. The draw happens once on entry.
 */
class VineLattice extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 58, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $playerId = (int) $this->game->getActivePlayerId();
        if (count($this->game->getLatticeOffer($playerId)) === 0) {
            $this->game->drawLatticeOffer($playerId, 3);
        }
        // Nothing to choose if the structure pool was empty.
        $offer = $this->game->getLatticeOffer($playerId);
        if (count($offer) === 0) {
            return BuildEffects::class;
        }
        // The 3-card draw is PRIVATE to the drawer (the kept card stays hidden in
        // hand; only the two discards become public later). The framework's
        // `_private` STATE ARGS (see getArgs) don't reliably reach the client on
        // state entry — when they don't, no "Keep" buttons render and the player is
        // stuck. So push the offer over the reliable private-NOTIFICATION channel
        // (same mechanism as Salt Lick's peekHands / Stone Pool's materialPeek),
        // which the client prefers. Opponents and spectators never receive it.
        $this->notify->player($playerId, 'latticeOffer', '', ['offer' => $offer]);
        return null;
    }

    public function getArgs(): array
    {
        // Kept as a best-effort fallback alongside the latticeOffer notification
        // (onEnteringState) — opponents, spectators, and replays never receive it.
        return ["_private" => ["active" => ["offer" => $this->game->getLatticeOffer((int) $this->game->getActivePlayerId())]]];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actLatticeKeep(int $cardId, int $activePlayerId)
    {
        // Re-derive the offer server-side (it's no longer in public args).
        $ids = array_map(fn(array $c): int => $c['id'], $this->game->getLatticeOffer($activePlayerId));
        if (!in_array($cardId, $ids, true)) {
            throw new UserException(clienttranslate('Choose one of the drawn cards to keep.'));
        }
        $this->game->latticeKeep($activePlayerId, $cardId);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        return BuildEffects::class;
    }

    /**
     * "Keep a random card" fallback — a dedicated no-arg action so the player can
     * always leave this state even if the private offer never reached the client
     * (mirrors Stone Pool's actKeepOrder). Keeps the first drawn card.
     */
    #[PossibleAction]
    public function actLatticeKeepAny(int $activePlayerId)
    {
        $offer = $this->game->getLatticeOffer($activePlayerId);
        if (count($offer) > 0) {
            $this->game->latticeKeep($activePlayerId, $offer[0]['id']);
            $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);
        }
        return BuildEffects::class;
    }

    function zombie(int $playerId)
    {
        $offer = $this->game->getLatticeOffer($playerId);
        if (count($offer) > 0) {
            $this->game->latticeKeep($playerId, $offer[0]['id']);
        }
        return BuildEffects::class;
    }
}
