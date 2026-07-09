<?php

declare(strict_types=1);

namespace Bga\Games\RiverBankers\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\RiverBankers\Game;
use Bga\Games\RiverBankers\Material;
use Bga\Games\RiverBankers\Rules\Cost;

/**
 * SelectAction — the active player takes exactly one action.
 *
 * Spine status: the river-card Auction action is wired end-to-end (-> Auction
 * multiactive state). The other four actions (Pull / Flush / Invent / Build)
 * are Phase 4 TODOs.
 */
class PlayerTurn extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        $playerId = (int) $this->game->getActivePlayerId();
        return [
            "auctionableRiverCards" => $this->game->getAuctionableRiverCards(),
            "headwatersCards" => $this->game->getHeadwatersCards(),
            "handStructureIds" => $this->game->getPlayerHand($playerId),
            "canFlush" => $this->game->getMaterialDeckCount() > 0,
            "canRetire" => $this->game->endgameTriggered(),
            "abilities" => $this->game->getPlayerAbilities($playerId),
            // You can only trigger an auction with a worker available or recallable.
            "canTriggerAuction" => $this->game->canTriggerAuction($playerId),
        ];
    }

    /**
     * Use an "as an action" ability of a built structure: pay its fish cost, then
     * pick a target in AbilityTarget.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actUseAbility(string $ability, int $activePlayerId, array $args)
    {
        $found = null;
        foreach ($args['abilities'] as $ab) {
            if ($ab['key'] === $ability) {
                $found = $ab;
            }
        }
        if ($found === null) {
            throw new UserException(clienttranslate('You cannot use that ability.'));
        }
        // Restore point so the player can Undo the ability before it commits — it
        // refunds the fish cost and the stack order advanceFish() is about to
        // overwrite. Consumed by Game::undoAbility() from the selection states.
        $this->game->undoSavepoint();
        $this->game->advanceFish($activePlayerId, (int) $found['cost']);
        $this->playerStats->inc('abilities_used', 1, $activePlayerId);
        // Log the ability use — every ability routes through here, and the
        // per-target sub-states only send a (log-less) boardUpdate, so without
        // this nothing about an ability appears in the game log. The card name is
        // a data-driven proper noun, so it is a plain substitution (not i18n).
        $this->notify->all('abilityUsed', clienttranslate('${player_name} uses ${ability_name}'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'ability_name' => (string) $found['name'],
        ]);

        $this->globals->set('pending_ability', $ability);
        // Once-per-game and free repeatable (turn-start) abilities don't consume
        // the turn; only once-abilities flip their source card. As-an-action
        // abilities consume the turn.
        $repeat = (bool) ($found['repeat'] ?? false);
        $this->globals->set('pending_ability_free', ($found['once'] || $repeat) ? 1 : 0);
        $this->globals->set('pending_ability_card', $found['once'] ? (int) $found['cardId'] : 0);

        // Multi-step abilities have their own states; the rest pick a single
        // river-card target in AbilityTarget.
        return match ($ability) {
            'packrat'       => PackRat::class,
            'springcascade' => SpringCascade::class,
            'rollingfloat'  => RollingFloat::class,
            'salmonrun'     => SalmonRun::class,
            'portage'       => Portage::class,
            'tradingpost'   => TradingPost::class,
            'confluence'    => Confluence::class,
            'millwheel'     => MillWheel::class,
            'towline'       => TowLine::class,
            default         => AbilityTarget::class,
        };
    }

    /**
     * Retire early (only once the endgame is underway): jump to the lowest open
     * space at or past the fish line and drop out, instead of taking an action.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actRetire(int $activePlayerId, array $args)
    {
        if (!$args['canRetire']) {
            throw new UserException(clienttranslate('You can only retire once another player has crossed the line.'));
        }
        $this->game->retirePlayer($activePlayerId, $this->game->getFishLine());
        $this->notify->all('retire', clienttranslate('${player_name} retires.'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
        ]);
        return NextPlayer::class;
    }

    /**
     * Pull a Headwaters card: pay its slot move cost (2/3/4), then auction it in
     * place at the Headwaters rate (1/item). The card floats to River 1 (or the
     * shoreline) afterward and the Headwaters refills — handled in ResolveAuction.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actPull(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['headwatersCards'], true)) {
            throw new UserException(clienttranslate('That card is not in the Headwaters.'));
        }
        if (!$args['canTriggerAuction']) {
            throw new UserException(clienttranslate('You have no worker available or recallable to bid.'));
        }

        $row = $this->game->getCardRow($cardId);
        $slot = (int) $row['card_location_arg'];
        $this->game->advanceFish($activePlayerId, Cost::headwatersMove($slot));
        $this->game->startAuction($cardId, $activePlayerId); // rate derives from 'headwaters' (1/item)

        $matDef = Material::$MATERIAL[(int) $row['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = ucfirst($material) . ($wildAlt !== null ? '/' . ucfirst((string) $wildAlt) : '');
        $this->notify->all('auctionStarted', clienttranslate('${player_name} pulls ${card_name} (${open}x ${material}) from the headwaters.'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
            'card_name' => (string) ($matDef['name'] ?? ''),
            'material' => $matLabel,
            'open' => $this->game->uncoveredIcons($cardId),
        ]);

        return Auction::class;
    }

    /**
     * Auction an existing river card: pay the flat 1 fish immediately, then open
     * a sealed multi-winner auction on it.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actAuction(int $cardId, int $activePlayerId, array $args)
    {
        if (!in_array($cardId, $args['auctionableRiverCards'], true)) {
            throw new UserException(clienttranslate('That card cannot be auctioned.'));
        }
        if (!$args['canTriggerAuction']) {
            throw new UserException(clienttranslate('You have no worker available or recallable to bid.'));
        }

        $this->game->advanceFish($activePlayerId, 1); // flat trigger cost
        $this->game->startAuction($cardId, $activePlayerId);

        $matDef = Material::$MATERIAL[(int) $this->game->getCardRow($cardId)['card_type_arg']] ?? [];
        $material = (string) ($matDef['material'] ?? '');
        $wildAlt = $matDef['wildAlt'] ?? null;
        $matLabel = ucfirst($material) . ($wildAlt !== null ? '/' . ucfirst((string) $wildAlt) : '');
        $this->notify->all('auctionStarted', clienttranslate('${player_name} swims towards ${card_name} (${open}x ${material}).'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
            'card_name' => (string) ($matDef['name'] ?? ''),
            'material' => $matLabel,
            'open' => $this->game->uncoveredIcons($cardId),
        ]);

        return Auction::class;
    }

    /**
     * Flush the Headwaters: pay 5 fish, reshuffle/redraw, then choose one of the
     * fresh cards to auction (free trigger) in FlushChoose.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actFlush(int $activePlayerId, array $args)
    {
        if (!$args['canFlush']) {
            throw new UserException(clienttranslate('You cannot flush once the material deck is empty.'));
        }
        if (!$args['canTriggerAuction']) {
            throw new UserException(clienttranslate('You have no worker available or recallable to bid.'));
        }
        $this->game->advanceFish($activePlayerId, 5);
        $this->game->flushHeadwaters();
        $this->playerStats->inc('flushes', 1, $activePlayerId);

        $this->notify->all('flush', clienttranslate('${player_name} flushes the Headwaters.'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
        ]);

        return FlushChoose::class;
    }

    /**
     * Invent: pay N fish (2..5), draw N structures, then discard N in InventDiscard.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actInvent(int $n, int $activePlayerId)
    {
        if ($n < 2 || $n > 5) {
            throw new UserException(clienttranslate('Invent draws between 2 and 5 cards.'));
        }
        $this->game->advanceFish($activePlayerId, $n);
        $this->playerStats->inc('inventions', 1, $activePlayerId);
        $drawn = $this->game->drawStructures($activePlayerId, $n);
        // You discard as many as you drew (fewer only if the deck+discard ran dry).
        $this->globals->set('invent_discard_count', $drawn);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);

        $this->notify->all('invent', clienttranslate('${player_name} invents (${n} cards).'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'n' => $n,
        ]);

        return InventDiscard::class;
    }

    /**
     * Build a structure from hand: pay its printed fish cost, pick up workers to
     * pay its materials, place it, and refill the hand.
     *
     * @throws UserException
     */
    #[PossibleAction]
    public function actBuild(int $cardId, int $activePlayerId, array $args, string $choices = '{}')
    {
        if (!in_array($cardId, $args['handStructureIds'], true)) {
            throw new UserException(clienttranslate('That structure is not in your hand.'));
        }
        $name = Material::$STRUCTURE[(int) $this->game->getCardRow($cardId)['card_type_arg']]['name'];
        $picks = $this->game->decodeBuildChoices($choices);

        try {
            $built = $this->game->tryBuild($activePlayerId, $cardId, $picks);
        } catch (\InvalidArgumentException $e) {
            throw new UserException(clienttranslate('That combination of build-cost effects is not legal.'));
        }
        if (!$built) {
            $missing = $this->game->buildShortfallText($activePlayerId, $cardId, $picks);
            throw new UserException($missing === ''
                ? sprintf(clienttranslate('You do not have the materials to build %s.'), $name)
                : sprintf(clienttranslate('You are short %1$s to build %2$s.'), $missing, $name));
        }
        $this->game->refillHand($activePlayerId);
        $this->playerStats->inc('structures_built', 1, $activePlayerId, true);
        $this->notify->player($activePlayerId, 'handUpdate', '', ['hand' => $this->game->getHandView($activePlayerId)]);

        $this->notify->all('build', clienttranslate('${player_name} builds ${card_name}.'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id' => $cardId,
            'card_name' => $name,
        ]);

        // A build changes VP (the structure's printed points, plus any leftover
        // material pairs it consumed) — push the new score to the panel now rather
        // than waiting for the end-of-turn NextPlayer refresh.
        $this->game->refreshScores();

        // Queue any interactive when-built / reactive-when-you-build effects and
        // resolve them one at a time via the BuildEffects dispatcher.
        $queue = $this->game->pendingBuildEffects($activePlayerId, $cardId);
        if (count($queue) > 0) {
            $this->globals->set('build_fx', $queue);
            return BuildEffects::class;
        }

        return NextPlayer::class;
    }

    function zombie(int $playerId)
    {
        // A quit player can't keep taking turns — and a bare "pass" doesn't move
        // them on the fish track, so NextPlayer would re-select the same
        // furthest-back zombie forever (infinite zombie recursion: observed on
        // Studio when players abandon mid-game). Retire them out of the rotation
        // (as NextPlayer does for anyone who crosses the fish line) so turn order
        // advances and the game can reach its end / FinalBuild.
        $fish = 0;
        foreach ($this->game->getTurnOrderRows() as $r) {
            if ($r['id'] === $playerId) {
                $fish = (int) $r['fish'];
            }
        }
        $this->game->retirePlayer($playerId, $fish);
        return NextPlayer::class;
    }
}
