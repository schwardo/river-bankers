<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Trading Post (as an action): the 1ð was paid on use. Recall one worker each
 * from three DIFFERENT-material cards (each drops a blank on river cards), then
 * place 2 free workers from supply on one river card's uncovered icons. Four
 * steps â three sources then a target â tracked in trade_sources / trade_mats.
 * Consumes the turn.
 */
class TradingPost extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 66, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        /** @var list<string> $mats */
        $mats = $this->globals->get('trade_mats', []);
        // After three recalls, the blanks dropped may leave no place target â the
        // recalls still happened; just end the action.
        if (count($mats) >= 3 && count($this->game->getAuctionableRiverCards()) === 0) {
            $this->globals->set('trade_mats', []);
            return NextPlayer::class;
        }
        return null;
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        /** @var list<string> $mats */
        $mats = $this->globals->get('trade_mats', []);
        if (count($mats) < 3) {
            return [
                "step" => "source",
                "picked" => count($mats),
                "targets" => $this->game->tradingPostSourceOptions($playerId, $mats),
            ];
        }
        return ["step" => "target", "picked" => 3, "targets" => $this->game->getAuctionableRiverCards()];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actTradeSource(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['picked'] >= 3 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose a worker on a new material.');
        }
        // Recall one worker from this card (drops a blank only on river cards).
        $this->game->recallWorker($activePlayerId, $cardId, true);
        /** @var list<string> $mats */
        $mats = $this->globals->get('trade_mats', []);
        $mats[] = $this->materialOf($cardId);
        $this->globals->set('trade_mats', $mats);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return TradingPost::class;
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actTradeTarget(int $cardId, int $activePlayerId, array $args)
    {
        if ((int) $args['picked'] < 3 || !in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose a river card to place workers on.');
        }
        $this->game->tradingPostPlace($activePlayerId, $cardId);
        $this->globals->set('trade_mats', []);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        return NextPlayer::class;
    }

    /** Undo this in-progress ability before it commits — see Game::undoAbility(). */
    #[PossibleAction]
    public function actUndo(int $activePlayerId)
    {
        return $this->game->undoAbility();
    }

    function zombie(int $playerId)
    {
        $this->globals->set('trade_mats', []);
        return NextPlayer::class;
    }

    private function materialOf(int $cardId): string
    {
        $arg = (int) $this->game->getCardRow($cardId)['card_type_arg'];
        return (string) (\Bga\Games\RiverBankers\Material::$MATERIAL[$arg]['material'] ?? '');
    }
}
