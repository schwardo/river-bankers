<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * One last build for a retired player (using workers they already hold). They
 * may build one affordable structure or skip; either way control returns to
 * FinalBuildNext for the next player.
 */
class FinalBuild extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 40,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        return [
            "handStructureIds" => $this->game->getPlayerHand((int) $this->game->getActivePlayerId()),
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actFinalBuild(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['handStructureIds'], true)) {
            throw new UserException('That structure is not in your hand.');
        }
        if (!$this->game->tryBuild($activePlayerId, $cardId)) {
            $missing = $this->game->buildShortfallText($activePlayerId, $cardId);
            throw new UserException($missing === ''
                ? 'You do not have the materials to build that.'
                : 'You are short ' . $missing . ' to build that.');
        }
        $this->notify->all('build', clienttranslate('${player_name} makes a final build'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
        ]);
        return $this->advance();
    }

    #[PossibleAction]
    public function actSkipFinal(int $activePlayerId)
    {
        return $this->advance();
    }

    function zombie(int $playerId)
    {
        return $this->advance();
    }

    /** Pop the current player off final_order and hand back to the dispatcher. */
    private function advance()
    {
        /** @var list<int> $order */
        $order = $this->globals->get('final_order', []);
        array_shift($order);
        $this->globals->set('final_order', $order);
        return FinalBuildNext::class;
    }
}
