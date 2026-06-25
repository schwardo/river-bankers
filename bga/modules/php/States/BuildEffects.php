<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\Games\RiverBankers\Game;

/**
 * Post-build effect dispatcher (GAME state). Pops the next queued interactive
 * effect for the just-completed build and routes to its sub-state; each sub-state
 * returns here for the next one. When the queue empties, the turn ends.
 *
 * Queue entries (built by Game::pendingBuildEffects):
 *   'self:<choice>'  — the built card's own when-built choice (WhenBuilt)
 *   'react:<key>'    — a reactive "when you build <material>" ability from one of
 *                      the player's other built cards (Stone Causeway / Reed
 *                      Walkway / Clay Vault / Burrow Network).
 */
class BuildEffects extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 52,
            type: StateType::GAME,
        );
    }

    function onEnteringState()
    {
        /** @var list<string> $queue */
        $queue = $this->globals->get('build_fx', []);
        if (count($queue) === 0) {
            return NextPlayer::class;
        }
        $next = array_shift($queue);
        $this->globals->set('build_fx', $queue);

        [$kind, $key] = explode(':', $next, 2);

        if ($kind === 'self') {
            // River-target when-built choices go through WhenBuilt.
            if (in_array($key, ['spillway', 'sapdrip', 'mudlevee'], true)) {
                $this->globals->set('pending_effect', $key);
                $this->globals->set('mudlevee_left', $key === 'mudlevee' ? 2 : 0);
                return WhenBuilt::class;
            }
            // Salt Lick is info-only: privately reveal opponents' hands, then continue.
            if ($key === 'saltlick') {
                $playerId = (int) $this->game->getActivePlayerId();
                $this->notify->player($playerId, 'peekHands', clienttranslate('Salt Lick: you peek at every opponent\'s hand'), [
                    'hands' => $this->game->getOpponentHands($playerId),
                ]);
                return BuildEffects::class;
            }
            return match ($key) {
                'stonepool'    => StonePool::class,
                'vinelattice'  => VineLattice::class,
                'snagpile'     => SnagPile::class,
                'flushchannel' => FlushChannelBuild::class,
                default        => BuildEffects::class,
            };
        }

        // react:<key> — re-check legality (an earlier effect may have changed the
        // board); auto-skip by looping back if it can no longer run.
        $playerId = (int) $this->game->getActivePlayerId();
        if (!$this->game->canReact($key, $playerId)) {
            return BuildEffects::class;
        }
        $this->globals->set('react_key', $key);
        $this->globals->set('burrow_src', 0); // fresh two-step state for Burrow Network
        return match ($key) {
            'stonecauseway' => ReactDrawDiscard::class,
            'reedwalkway'   => ReactReedWalkway::class,
            'clayvault'     => ReactClayVault::class,
            'burrownetwork' => ReactBurrowNetwork::class,
            default         => BuildEffects::class,
        };
    }
}
