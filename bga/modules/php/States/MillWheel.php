<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;

/**
 * Mill Wheel (as an action): activate one as-an-action ability of a structure
 * built by your left or right neighbour, resolved for you. Copyable abilities are
 * the repeatable as-an-action ones (Salmon Run, Trading Post, Portage, Tow Line,
 * Heron Roost, Driftwood Snag) — never Confluence or a once-per-game ability.
 * Pays the copied ability's fish cost, then routes into that ability's own state.
 */
class MillWheel extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game, id: 68, type: StateType::ACTIVE_PLAYER);
    }

    function onEnteringState()
    {
        $this->notify->all('boardUpdate', '', $this->game->boardUpdatePayload());
        if (count($this->game->millWheelOptions((int) $this->game->getActivePlayerId())) === 0) {
            return NextPlayer::class; // nothing copyable — the turn is still spent
        }
        return null;
    }

    public function getArgs(): array
    {
        return ["options" => $this->game->millWheelOptions((int) $this->game->getActivePlayerId())];
    }

    /**
     * @throws UserException
     */
    #[PossibleAction]
    public function actMillPick(string $ability, int $activePlayerId, array $args)
    {
        $found = null;
        foreach ($args['options'] as $o) {
            if ($o['key'] === $ability) {
                $found = $o;
            }
        }
        if ($found === null) {
            throw new UserException(clienttranslate('You cannot copy that ability.'));
        }
        // Pay the copied ability's fixed cost (escalating/variable ones bill in
        // their own state) and resolve it as this player.
        $this->game->advanceFish($activePlayerId, (int) $found['cost']);
        $this->globals->set('pending_ability', $ability);
        $this->globals->set('pending_ability_free', 0); // copying is an action — consumes the turn
        $this->globals->set('pending_ability_card', 0);

        return match ($ability) {
            'salmonrun'   => SalmonRun::class,
            'portage'     => Portage::class,
            'tradingpost' => TradingPost::class,
            default       => AbilityTarget::class, // driftwoodsnag / towline / heronroost
        };
    }

    function zombie(int $playerId)
    {
        return NextPlayer::class;
    }
}
