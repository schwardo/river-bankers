<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Resolve a when-built river-target effect for the builder (still the active
 * player): Spillway (wash a River-1 card to shoreline), Sap Drip (place 2 free
 * workers on a river card), Mud Levee (drop 2 blanks). Auto-skips if there is no
 * legal target.
 */
class WhenBuilt extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 50,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $effect = (string) $this->globals->get('pending_effect', '');
        if ($effect === '' || count($this->game->whenBuiltTargets($effect)) === 0) {
            return $this->finish();
        }
        return null; // wait for the player's choice
    }

    public function getArgs(): array
    {
        $effect = (string) $this->globals->get('pending_effect', '');
        return [
            "effect" => $effect,
            "targets" => $this->game->whenBuiltTargets($effect),
            "remaining" => $effect === 'mudlevee' ? (int) $this->globals->get('mudlevee_left', 0) : 1,
        ];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actEffectTarget(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['targets'], true)) {
            throw new UserException('Choose a valid target.');
        }
        $effect = (string) $this->globals->get('pending_effect', '');

        if ($effect === 'spillway') {
            $penalties = $this->game->washToShoreline($cardId);
            $cardName = ''; // shoreline-penalty card name is resolved server-side; keep the log simple
            foreach ($penalties as $pid => $spaces) {
                $this->notify->all('shorelinePenalty', clienttranslate('${player_name} drifts back ${spaces} 🐟.'), [
                    'player_id' => $pid, 'player_name' => $this->game->getPlayerNameById($pid),
                    'spaces' => $spaces,
                ]);
            }
            return $this->finish();
        }

        if ($effect === 'sapdrip') {
            $this->game->sapDripPlace($activePlayerId, $cardId);
            return $this->finish();
        }

        // mudlevee: drop one blank; repeat until 2 dropped or no targets remain.
        $this->game->dropBlank($cardId);
        $left = (int) $this->globals->get('mudlevee_left', 0) - 1;
        $this->globals->set('mudlevee_left', $left);
        if ($left > 0 && count($this->game->whenBuiltTargets('mudlevee')) > 0) {
            return WhenBuilt::class; // re-enter for the second blank
        }
        return $this->finish();
    }

    function zombie(int $playerId)
    {
        return $this->finish();
    }

    private function finish()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        $this->globals->set('pending_effect', '');
        $this->globals->set('mudlevee_left', 0);
        return BuildEffects::class; // resolve any remaining queued build effects
    }
}
