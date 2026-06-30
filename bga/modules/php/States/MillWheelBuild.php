<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Rules\Effects;

/**
 * Mill Wheel (when built): copy one "when built" effect of a built structure
 * controlled by your left or right neighbour, resolved for you. The builder picks
 * which one; immediate self-effects (Royal Lodge extra turn, Burrow Run slide,
 * Springwater Pool refresh) apply inline, while river-target / multi-step effects
 * route through the same when-built sub-states the original card uses. Auto-skips
 * if there is nothing copyable (the build still completes).
 */
class MillWheelBuild extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 69,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (count($this->game->millWheelWhenBuiltOptions((int) $this->game->getActivePlayerId())) === 0) {
            return BuildEffects::class; // nothing to copy — resolve any remaining queued effects
        }
        return null; // wait for the player's choice
    }

    public function getArgs(): array
    {
        return ["options" => $this->game->millWheelWhenBuiltOptions((int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actMillBuildPick(string $card, int $activePlayerId, array $args)
    {
        $valid = false;
        foreach ($args['options'] as $o) {
            if ($o['name'] === $card) {
                $valid = true;
            }
        }
        if (!$valid) {
            throw new UserException(clienttranslate('You cannot copy that effect.'));
        }
        return $this->resolve($activePlayerId, $card);
    }

    function zombie(int $playerId)
    {
        // Drop-out: copy the first available effect so the build still resolves.
        $opts = $this->game->millWheelWhenBuiltOptions($playerId);
        if (count($opts) === 0) {
            return BuildEffects::class;
        }
        return $this->resolve($playerId, (string) $opts[0]['name']);
    }

    /** Resolve copying $card's when-built effect for $playerId. */
    private function resolve(int $playerId, string $card)
    {
        $this->notify->all('build', clienttranslate('⚙ Mill Wheel: ${player_name} copies ${card_name} (when built).'), [
            'player_id' => $playerId,
            'player_name' => $this->game->getPlayerNameById($playerId),
            'card_name' => $card,
        ]);

        // Immediate self-effects apply inline, then continue the build queue.
        if ($card === 'Royal Lodge') {
            $this->globals->set('bonus_turn_player', $playerId);
            return BuildEffects::class;
        }
        if ($card === 'Burrow Run') {
            $this->game->moveBackFish($playerId, 5);
            $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
            return BuildEffects::class;
        }
        if ($card === 'Springwater Pool') {
            $this->game->readySpentOnce($playerId);
            $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
            return BuildEffects::class;
        }

        // Interactive effects route through the same sub-states the original card
        // uses (resolved for the active player via the shared globals).
        $key = Effects::whenBuiltChoice($card) ?? Effects::whenBuiltImmediate($card);
        if (in_array($key, ['spillway', 'sapdrip', 'mudlevee'], true)) {
            $this->globals->set('pending_effect', $key);
            $this->globals->set('mudlevee_left', $key === 'mudlevee' ? 2 : 0);
            return WhenBuilt::class;
        }
        if ($key === 'stonepool') {
            $this->globals->set('reorder_n', 5);
            return StonePool::class;
        }
        return match ($key) {
            'vinelattice'  => VineLattice::class,
            'snagpile'     => SnagPile::class,
            'flushchannel' => FlushChannelBuild::class,
            default        => BuildEffects::class,
        };
    }
}
