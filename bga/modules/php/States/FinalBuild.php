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
 * Final-build round. Every (now-retired) player simultaneously gets one last
 * build from the workers they still hold: build one affordable structure or
 * skip. Players act independently (MULTIPLE_ACTIVE_PLAYER) — there is no shared
 * state left to contest — and once all have resolved, the game scores (EndScore).
 */
class FinalBuild extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 40,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        // Everyone left in final_order builds at once; an empty set scores directly.
        $order = array_map('intval', $this->globals->get('final_order', []));
        $this->gamestate->setPlayersMultiactive($order, EndScore::class, true);
        // A zombie can't take a final build, and the framework resolves at most
        // one zombie per request — so two+ zombies would leave this simultaneous
        // round hanging forever (no later live action to re-trigger them). Skip
        // every zombie up front, leaving only live players (or straight to
        // EndScore if everyone is a zombie).
        $zombies = $this->game->getZombiePlayerIds();
        foreach ($order as $pid) {
            if (in_array($pid, $zombies, true)) {
                $this->zombie($pid);
            }
        }
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actFinalBuild(int $cardId, int $currentPlayerId)
    {
        if (!in_array($cardId, $this->game->getPlayerHand($currentPlayerId), true)) {
            throw new UserException(clienttranslate('That structure is not in your hand.'));
        }
        $name = Material::$STRUCTURE[(int) $this->game->getCardRow($cardId)['card_type_arg']]['name'] ?? '';

        if (!$this->game->tryBuild($currentPlayerId, $cardId)) {
            $missing = $this->game->buildShortfallText($currentPlayerId, $cardId);
            throw new UserException($missing === ''
                ? sprintf(clienttranslate('You do not have the materials to build %s.'), $name)
                : sprintf(clienttranslate('You are short %1$s to build %2$s.'), $missing, $name));
        }

        $this->playerStats->inc('structures_built', 1, $currentPlayerId, true);
        $this->notify->player($currentPlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($currentPlayerId)]);
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $this->notify->all('build', clienttranslate('${player_name} makes a final build: ${card_name}.'), [
            'player_id' => $currentPlayerId,
            'player_name' => $this->game->getPlayerNameById($currentPlayerId),
            'card_id' => $cardId,
            'card_name' => $name,
        ]);

        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, EndScore::class);
    }

    #[PossibleAction]
    public function actSkipFinal(int $currentPlayerId)
    {
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, EndScore::class);
    }

    function zombie(int $playerId)
    {
        $this->gamestate->setPlayerNonMultiactive($playerId, EndScore::class);
    }
}
