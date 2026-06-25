/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * RiverBankers implementation : © <Your name here> <Your email address here>
 * -----
 *
 * River Bankers — minimal (functional, unstyled) client. Renders the board,
 * hand, and fish track from getAllDatas, wires the five actions + auction
 * bidding, and re-renders on boardUpdate / handUpdate notifications.
 */

const MAT_GLYPH = {
    logs: '🪵', stones: '🪨', reeds: '🌾', mud: '🟫', vines: '🍃', clay: '🧱', '': '❓',
};

function costStr(cost) {
    return Object.entries(cost || {}).map(([m, n]) => `${n}${MAT_GLYPH[m] || m}`).join(' ') || '—';
}

// ---- State classes --------------------------------------------------------

class PlayerTurn {
    constructor(game, bga) { this.game = game; this.bga = bga; }

    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Your turn — take one action') : _('Waiting for the active player'));
        if (!isActive) return;
        this.game.setHint(args.canTriggerAuction
            ? _('Click a Headwaters card to Pull, a river card to Auction, or a hand card to Build.')
            : _('No workers to bid — Build or Invent this turn (recall happens during an auction).'));
        if (args.canTriggerAuction) {
            this.game.markClickable('hw', args.headwatersCards, id => this.bga.actions.performAction('actPull', { cardId: id }));
            this.game.markClickable('river', args.auctionableRiverCards, id => this.bga.actions.performAction('actAuction', { cardId: id }));
        }
        this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actBuild', { cardId: id }));

        for (let n = 2; n <= 5; n++) {
            this.bga.statusBar.addActionButton(_('Invent ') + n, () => this.bga.actions.performAction('actInvent', { n }), { color: 'secondary' });
        }
        if (args.canFlush && args.canTriggerAuction) {
            this.bga.statusBar.addActionButton(_('Flush (5🐟)'), () => this.bga.actions.performAction('actFlush'), { color: 'secondary' });
        }
        if (args.canRetire) {
            this.bga.statusBar.addActionButton(_('Retire'), () => this.bga.actions.performAction('actRetire'), { color: 'secondary' });
        }
        (args.abilities || []).forEach(ab => {
            const label = ab.name + (ab.cost ? ' (' + ab.cost + '🐟)' : '') + (ab.once ? ' ⚡' : '');
            this.bga.statusBar.addActionButton(label,
                () => this.bga.actions.performAction('actUseAbility', { ability: ab.key }), { color: 'secondary' });
        });
    }
    onLeavingState() { this.game.clearClickable(); }
}

class AbilityTarget {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const labels = {
            driftwoodsnag: _('Driftwood Snag — drop a blank on a river card'),
            towline: _('Tow Line — slide a river card upstream'),
            heronroost: _('Heron Roost — replace a Headwaters card'),
            hollowedlog: _('Hollowed-out Log — recall a worker (no blank)'),
            woodpile: _('Wood Pile — claim a Log icon'),
            tributestone: _('Tribute Stone / Snare Set — force an opponent to recall'),
            tailslap: _('Tail Slap — drop a blank on a River-1 card'),
            channelclearer: _('Channel Clearer — discard an opponent Reed worker'),
        };
        this.bga.statusBar.setTitle(isActive ? (labels[args.ability] || _('Choose a target')) : _('Resolving ability…'));
        if (!isActive) return;
        this.game.setHint(_('Click a highlighted card.'));
        this.game.markClickable('target', args.targets, id => this.bga.actions.performAction('actAbilityTarget', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class StarterDraft {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const sec = document.getElementById('rb-draft-section');
        if (sec) sec.style.display = '';
        this.onPlayerActivationChange(args, isActive);
    }
    onPlayerActivationChange(args, isActive) {
        const offers = (this.game.gamedatas && this.game.gamedatas.starterOffer) || [];
        this.game.renderStarterOffer(offers);
        this.game.clearClickable();
        if (!isActive) { this.bga.statusBar.setTitle(_('Drafting starters…')); return; }
        this.bga.statusBar.setTitle(_('Pick your species starter to pre-build'));
        this.game.setHint(_('Click one of your species starters to build it (it starts already-built).'));
        this.game.markClickable('starter', offers.map(c => c.id),
            id => this.bga.actions.performAction('actPickStarter', { cardId: id }));
    }
    onLeavingState() {
        this.game.clearClickable();
        const sec = document.getElementById('rb-draft-section');
        if (sec) sec.style.display = 'none';
    }
}

class WhenBuilt {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const labels = {
            spillway: _('Spillway — wash a River-1 card to the shoreline'),
            sapdrip: _('Sap Drip — place 2 free workers on a river card'),
            mudlevee: _('Mud Levee — drop a blank on a river card'),
        };
        let title = labels[args.effect] || _('Resolve effect');
        if (args.effect === 'mudlevee') title += ' (' + args.remaining + _(' left)');
        this.bga.statusBar.setTitle(isActive ? title : _('Resolving effect…'));
        if (!isActive) return;
        this.game.setHint(_('Click a highlighted river card.'));
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction('actEffectTarget', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class ReactReedWalkway {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Reed Walkway — place a free worker on a River-1 card') : _('Resolving Reed Walkway…'));
        if (!isActive) return;
        this.game.setHint(_('Click a River-1 card with an uncovered icon.'));
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction('actReedTarget', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class ReactDrawDiscard {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Stone Causeway — discard 1 card from your hand') : _('Stone Causeway…'));
        if (!isActive) return;
        this.game.setHint(_('You drew a card. Click a hand card to discard.'));
        this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actDiscardOne', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class ReactClayVault {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive
            ? _('Clay Vault — deck top is ') + args.topName + _('; swap a hand card or skip')
            : _('Clay Vault…'));
        if (!isActive) return;
        this.game.setHint(_('Click a hand card to swap it for ') + args.topName + _(', or skip.'));
        this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actClaySwap', { cardId: id }));
        this.bga.statusBar.addActionButton(_('Skip'), () => this.bga.actions.performAction('actClaySkip'), { color: 'secondary' });
    }
    onLeavingState() { this.game.clearClickable(); }
}

class ReactBurrowNetwork {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const src = args.step === 'source';
        this.bga.statusBar.setTitle(isActive
            ? (src ? _('Burrow Network — pick a worker to move') : _('Burrow Network — pick a destination'))
            : _('Burrow Network…'));
        if (!isActive) return;
        this.game.setHint(src ? _('Click a river card with your worker.') : _('Click the destination river card.'));
        const action = src ? 'actBurrowSource' : 'actBurrowDest';
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction(action, { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class StonePool {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Stone Pool — set the new order of the top material cards') : _('Stone Pool…'));
        if (!isActive) return;
        this.cards = args.topCards.slice();
        this.order = [];
        this.render();
    }
    render() {
        this.bga.statusBar.removeActionButtons();
        const remaining = this.cards.filter(c => !this.order.includes(c.id));
        this.game.setHint(_('Click cards top-first. Picked: ') +
            (this.order.map(id => MAT_GLYPH[(this.cards.find(c => c.id === id) || {}).material] || '?').join(' ') || '—'));
        remaining.forEach(c => this.bga.statusBar.addActionButton(
            (MAT_GLYPH[c.material] || '?') + ' ' + c.icons, () => { this.order.push(c.id); this.maybeSubmit(); }, { color: 'secondary' }));
        this.bga.statusBar.addActionButton(_('Keep current order'),
            () => this.bga.actions.performAction('actReorder', { cardIds: this.cards.map(c => c.id) }));
    }
    maybeSubmit() {
        if (this.order.length === this.cards.length) {
            this.bga.actions.performAction('actReorder', { cardIds: this.order });
        } else {
            this.render();
        }
    }
    onLeavingState() { this.game.clearClickable(); }
}

class VineLattice {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Vine Lattice — keep 1 of the drawn cards') : _('Vine Lattice…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        this.game.setHint(_('Pick one card to keep; the others are discarded.'));
        (args.offer || []).forEach(c => this.bga.statusBar.addActionButton(
            _('Keep ') + c.name, () => this.bga.actions.performAction('actLatticeKeep', { cardId: c.id }), { color: 'secondary' }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class SnagPile {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Snag Pile — pull a Headwaters card to auction (1🐟/item)') : _('Snag Pile…'));
        if (!isActive) return;
        this.game.setHint(_('Click a Headwaters card to snag and auction.'));
        this.game.markClickable('hw', args.headwatersCards, id => this.bga.actions.performAction('actSnagChoose', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class FlushChannelBuild {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Flush Channel — remove a Headwaters card (no auction)') : _('Flush Channel…'));
        if (!isActive) return;
        this.game.setHint(_('Click a Headwaters card to discard out of game; the slot refills.'));
        this.game.markClickable('hw', args.headwatersCards, id => this.bga.actions.performAction('actFlushChannelRemove', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class PackRat {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const discard = args.step === 'discard';
        this.bga.statusBar.setTitle(isActive
            ? (discard ? _('Pack Rat — discard a card from your hand') : _('Pack Rat — take a card from the discard pile'))
            : _('Pack Rat Burrow…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        if (discard) {
            this.game.setHint(_('Click a hand card to discard.'));
            this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actPackRatDiscard', { cardId: id }));
        } else {
            this.game.setHint(_('Choose a card to take from the discard pile.'));
            (args.discardCards || []).forEach(c => this.bga.statusBar.addActionButton(
                _('Take ') + c.name, () => this.bga.actions.performAction('actPackRatTake', { cardId: c.id }), { color: 'secondary' }));
        }
    }
    onLeavingState() { this.game.clearClickable(); }
}

class SpringCascade {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Spring Cascade — ready one spent once-per-game card') : _('Spring Cascade…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        this.game.setHint(_('Pick a flipped card to ready.'));
        (args.spentCards || []).forEach(c => this.bga.statusBar.addActionButton(
            _('Ready ') + c.name, () => this.bga.actions.performAction('actReady', { cardId: c.id }), { color: 'secondary' }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class RollingFloat {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const src = args.step === 'source';
        this.bga.statusBar.setTitle(isActive
            ? (src ? _('Rolling Float — pick your worker to swap') : _('Rolling Float — pick the opponent worker to swap with'))
            : _('Rolling Float…'));
        if (!isActive) return;
        this.game.setHint(src ? _('Click a river card with your worker.') : _('Click an opponent worker in the same slot.'));
        const action = src ? 'actRollSource' : 'actRollDest';
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction(action, { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class SalmonRun {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const card = args.step === 'card';
        this.bga.statusBar.setTitle(isActive
            ? (card ? _('Salmon Run — pick a river card') : _('Salmon Run — how many workers?'))
            : _('Salmon Run…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        if (card) {
            this.game.setHint(_('Click a river card with uncovered icons.'));
            this.game.markClickable('river', args.targets, id => this.bga.actions.performAction('actSalmonCard', { cardId: id }));
        } else {
            let cum = 0;
            for (let n = 1; n <= args.max; n++) {
                cum += args.costs[n - 1];
                this.bga.statusBar.addActionButton(n + ' (' + cum + '🐟)',
                    () => this.bga.actions.performAction('actSalmonCount', { n }), { color: 'secondary' });
            }
        }
    }
    onLeavingState() { this.game.clearClickable(); }
}

class Portage {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const src = args.step === 'source';
        this.bga.statusBar.setTitle(isActive
            ? (src ? _('Portage — pick your worker') : _('Portage — pick another worker to swap (pay source cost)'))
            : _('Portage…'));
        if (!isActive) return;
        this.game.setHint(src ? _('Click a river card with your worker.') : _('Click another river card with a worker.'));
        const action = src ? 'actPortageSource' : 'actPortageDest';
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction(action, { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class FinalBuild {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Final build — build one structure or skip') : _('Final builds…'));
        if (!isActive) return;
        this.game.setHint(_('One last build: click a hand card, or skip.'));
        this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actFinalBuild', { cardId: id }));
        this.bga.statusBar.addActionButton(_('Skip'), () => this.bga.actions.performAction('actSkipFinal'), { color: 'secondary' });
    }
    onLeavingState() { this.game.clearClickable(); }
}

class Auction {
    constructor(game, bga) { this.game = game; this.bga = bga; }

    // MULTIPLE_ACTIVE_PLAYER: players are not yet active in onEnteringState, so
    // the bid buttons must be (re)built in onPlayerActivationChange.
    onEnteringState(args, isActive) {
        this.args = args;
        this.onPlayerActivationChange(args, isActive);
    }

    onPlayerActivationChange(args, isActive) {
        this.args = args || this.args;
        this.showBid(isActive);
    }

    showBid(isActive) {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        if (!isActive) {
            this.bga.statusBar.setTitle(_('Waiting for the other bidders…'));
            return;
        }
        const a = this.args;
        const maxBid = Math.min(a.open, this.game.mySupply());
        const minBid = (this.game.myId() === Number(a.triggerPlayer)) ? 1 : 0;
        this.bga.statusBar.setTitle(_('Auction — submit your sealed worker bid'));
        this.game.setHint(_('Bid up to ') + maxBid + _(' workers (this lot has ') + a.open + _(' open icons).'));
        for (let b = minBid; b <= maxBid; b++) {
            this.bga.statusBar.addActionButton(_('Bid ') + b, () => this.bga.actions.performAction('actBid', { workers: b }));
        }
        if (this.game.myRecallTargets(a.lotCardId).length) {
            this.bga.statusBar.addActionButton(_('Recall Workers'), () => this.enterRecall(), { color: 'secondary' });
        }
        const deferCard = a.canDefer && a.canDefer[this.game.myId()];
        if (deferCard) {
            this.bga.statusBar.addActionButton(_('Bid last') + ' (' + _(deferCard) + ')',
                () => this.bga.actions.performAction('actDefer'), { color: 'secondary' });
        }
        if (a.canFloodgate && a.canFloodgate[this.game.myId()]) {
            this.bga.statusBar.addActionButton(_('Floodgate — slide lot upstream'),
                () => this.bga.actions.performAction('actFloodgate').then(() => this.showBid(true)), { color: 'secondary' });
        }
    }

    enterRecall() {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(_('Recall — pick a worker to pull back'));
        this.game.setHint(_('Click a river card with your worker; it returns to supply (drops a blank).'));
        this.game.markClickable('recall', this.game.myRecallTargets(this.args.lotCardId), id =>
            this.bga.actions.performAction('actRecall', { cardId: id }).then(() => this.showBid(true)));
        this.bga.statusBar.addActionButton(_('Cancel'), () => this.showBid(true), { color: 'secondary' });
    }

    onLeavingState() { this.game.clearClickable(); }
}

class DeferBid {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const revealed = Object.entries(args.revealedBids || {})
            .map(([pid, n]) => `${this.game.playerName(pid)}: ${n}`).join(', ') || _('no bids');
        this.bga.statusBar.setTitle(isActive
            ? _('Declare your bid — revealed: ') + revealed
            : _('Waiting for the deferred bid…'));
        if (!isActive) return;
        const minBid = (this.game.myId() === Number(args.triggerPlayer)) ? 1 : 0;
        this.game.setHint(_('You bid last. Revealed bids — ') + revealed);
        for (let b = minBid; b <= args.maxBid; b++) {
            this.bga.statusBar.addActionButton(_('Bid ') + b,
                () => this.bga.actions.performAction('actDeferredBid', { workers: b }));
        }
    }
    onLeavingState() { this.game.clearClickable(); }
}

class InventDiscard {
    constructor(game, bga) { this.game = game; this.bga = bga; this.selected = new Set(); }

    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(_('Invent — discard ') + args.nbToDiscard + _(' card(s)'));
        if (!isActive) return;
        this.selected = new Set();
        this.nb = args.nbToDiscard;
        this.game.setHint(_('Click hand cards to select, then confirm.'));
        this.game.markClickable('hand', args.handStructureIds, id => this.toggle(id));
        this.refreshButton();
    }
    toggle(id) {
        if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
        document.getElementById(`card-${id}`)?.classList.toggle('rb-selected', this.selected.has(id));
        this.refreshButton();
    }
    refreshButton() {
        this.bga.statusBar.removeActionButtons();
        const btn = this.bga.statusBar.addActionButton(
            _('Discard selected (') + this.selected.size + '/' + this.nb + ')',
            () => this.bga.actions.performAction('actDiscard', { cardIds: [...this.selected] }));
        if (this.selected.size !== this.nb && btn) btn.classList.add('disabled');
    }
    onLeavingState() { this.game.clearClickable(); }
}

class FlushChoose {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(_('Flush — choose a Headwaters card to auction'));
        if (!isActive) return;
        this.game.setHint(_('Click one of the revealed Headwaters cards.'));
        this.game.markClickable('hw', args.headwatersCards, id => this.bga.actions.performAction('actChoose', { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

// ---- Game -----------------------------------------------------------------

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.clickable = new Map(); // card id -> handler (survives board re-renders)
        this.bga.states.register('StarterDraft', new StarterDraft(this, bga));
        this.bga.states.register('PlayerTurn', new PlayerTurn(this, bga));
        this.bga.states.register('Auction', new Auction(this, bga));
        this.bga.states.register('DeferBid', new DeferBid(this, bga));
        this.bga.states.register('InventDiscard', new InventDiscard(this, bga));
        this.bga.states.register('FlushChoose', new FlushChoose(this, bga));
        this.bga.states.register('WhenBuilt', new WhenBuilt(this, bga));
        this.bga.states.register('ReactReedWalkway', new ReactReedWalkway(this, bga));
        this.bga.states.register('ReactDrawDiscard', new ReactDrawDiscard(this, bga));
        this.bga.states.register('ReactClayVault', new ReactClayVault(this, bga));
        this.bga.states.register('ReactBurrowNetwork', new ReactBurrowNetwork(this, bga));
        this.bga.states.register('StonePool', new StonePool(this, bga));
        this.bga.states.register('VineLattice', new VineLattice(this, bga));
        this.bga.states.register('SnagPile', new SnagPile(this, bga));
        this.bga.states.register('FlushChannelBuild', new FlushChannelBuild(this, bga));
        this.bga.states.register('PackRat', new PackRat(this, bga));
        this.bga.states.register('SpringCascade', new SpringCascade(this, bga));
        this.bga.states.register('RollingFloat', new RollingFloat(this, bga));
        this.bga.states.register('SalmonRun', new SalmonRun(this, bga));
        this.bga.states.register('Portage', new Portage(this, bga));
        this.bga.states.register('AbilityTarget', new AbilityTarget(this, bga));
        this.bga.states.register('FinalBuild', new FinalBuild(this, bga));
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.players = gamedatas.players;

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="rb-hint" class="rb-hint"></div>
            <div id="rb-board">
                <div class="rb-section"><h3>Headwaters</h3><div id="rb-hw" class="rb-row"></div></div>
                <div class="rb-section"><h3>River</h3><div id="rb-river" class="rb-row"></div></div>
                <div class="rb-section"><h3>Shoreline</h3><div id="rb-shoreline" class="rb-row"></div></div>
                <div class="rb-section" id="rb-draft-section" style="display:none"><h3>Your species starters — pick one</h3><div id="rb-draft" class="rb-row"></div></div>
                <div class="rb-section"><h3>Your hand</h3><div id="rb-hand" class="rb-row"></div></div>
            </div>
        `);

        Object.values(gamedatas.players).forEach(p => {
            this.bga.playerPanels.getElement(p.id).insertAdjacentHTML('beforeend', `
                <div class="rb-panel">
                    <span id="fish-${p.id}">${p.fish}</span> 🐟 (line ${gamedatas.fishLine})
                    &nbsp; <span id="supply-${p.id}">${p.supply}</span> 👷
                    &nbsp; <span id="score-${p.id}">${p.score}</span> ★
                    <div id="materials-${p.id}" class="rb-mats"></div>
                    <div id="built-${p.id}" class="rb-built"></div>
                </div>
            `);
        });

        // Delegated click handling so clickability survives board re-renders.
        this.bga.gameArea.getElement().addEventListener('click', e => {
            const card = e.target.closest('.rb-card');
            if (!card) return;
            const id = Number(card.dataset.id);
            if (this.clickable.has(id)) this.clickable.get(id)(id);
        });

        if (gamedatas.peekTop) {
            this.bga.gameArea.getElement().insertAdjacentHTML('beforeend',
                `<div id="rb-peek" class="rb-hint">${_('Deck top (peek):')} ${MAT_GLYPH[gamedatas.peekTop.material] || ''} ${gamedatas.peekTop.icons}</div>`);
        }

        this.renderBoard(gamedatas.board);
        this.renderHand(gamedatas.hand);
        this.renderBuilt(gamedatas.built);
        this.renderMaterials(gamedatas.materials);
        this.setupNotifications();
    }

    // ---- rendering ----

    cardHtml(c, group) {
        const w = Object.entries(c.workers || {}).map(([pid, n]) => `${n}@p${pid}`).join(' ');
        return `<div id="card-${c.id}" class="rb-card rb-${group}" data-id="${c.id}">
            <div class="rb-mat">${MAT_GLYPH[c.material] || ''}${c.wildAlt ? '/' + MAT_GLYPH[c.wildAlt] : ''}</div>
            <div class="rb-icons">${c.uncovered}/${c.icons} open</div>
            ${c.blanks ? `<div>▪${c.blanks} blank</div>` : ''}
            ${w ? `<div class="rb-workers">${w}</div>` : ''}
        </div>`;
    }

    renderBoard(board) {
        if (!board || !document.getElementById('rb-hw')) return;
        this.board = board;
        document.getElementById('rb-hw').innerHTML =
            [1, 2, 3].map(slot => {
                const c = board.headwaters.find(x => x.slot === slot);
                return c ? this.cardHtml(c, 'hw') : `<div class="rb-card rb-empty">HW${slot}</div>`;
            }).join('');
        document.getElementById('rb-river').innerHTML =
            [1, 2, 3, 4].map(slot => {
                const cards = board.river.filter(x => x.slot === slot);
                return `<div class="rb-space"><div class="rb-space-label">R${slot} (${slot + 1}🐟)</div>${cards.map(c => this.cardHtml(c, 'river')).join('') || '<span class="rb-empty">—</span>'}</div>`;
            }).join('');
        document.getElementById('rb-shoreline').innerHTML =
            board.shoreline.map(c => this.cardHtml(c, 'shore')).join('') || '<span class="rb-empty">—</span>';
        this.applyClickableClasses();
    }

    renderHand(hand) {
        document.getElementById('rb-hand').innerHTML = (hand || []).map(c => `
            <div id="card-${c.id}" class="rb-card rb-hand" data-id="${c.id}" title="${c.effect}">
                <div class="rb-name">${c.name}</div>
                <div>${c.time}🐟 + ${costStr(c.cost)}</div>
                <div>${c.vp}★</div>
            </div>`).join('') || '<span class="rb-empty">—</span>';
        this.applyClickableClasses();
    }

    renderBuilt(built) {
        Object.entries(built || {}).forEach(([pid, list]) => {
            const el = document.getElementById(`built-${pid}`);
            if (el) el.innerHTML = list.map(b => `<span class="rb-tag">${b.name}</span>`).join(' ');
        });
    }

    renderStarterOffer(offers) {
        const el = document.getElementById('rb-draft');
        if (!el) return;
        el.innerHTML = (offers || []).map(c => `
            <div id="card-${c.id}" class="rb-card rb-hand" data-id="${c.id}" title="${c.effect}">
                <div class="rb-name">${c.name}</div>
                <div>${c.vp}★</div>
                <div style="font-size:9px">${c.effect}</div>
            </div>`).join('');
        this.applyClickableClasses();
    }

    renderMaterials(materials) {
        Object.entries(materials || {}).forEach(([pid, held]) => {
            const el = document.getElementById(`materials-${pid}`);
            if (!el) return;
            const fixed = Object.entries(held.fixed || {}).map(([m, n]) => `${n}${MAT_GLYPH[m] || m}`);
            const wild = (held.wild || []).map(w => `${w.count}${MAT_GLYPH[w.materials[0]] || ''}/${MAT_GLYPH[w.materials[1]] || ''}`);
            const all = [...fixed, ...wild];
            el.innerHTML = all.length ? all.join(' ') : '<span class="rb-empty">no workers placed</span>';
        });
    }

    // ---- helpers ----

    myId() { return Number(this.bga.players.getCurrentPlayerId()); }
    playerName(pid) { const p = this.players[pid]; return p ? p.name : ('#' + pid); }
    mySupply() { const p = this.players[this.myId()]; return p ? Number(p.supply) : 0; }
    // River cards (excluding the auction lot) where I have a worker to recall.
    myRecallTargets(lotCardId) {
        const me = this.myId();
        return ((this.board && this.board.river) || [])
            .filter(c => Number((c.workers || {})[me] || 0) > 0 && c.id !== lotCardId)
            .map(c => c.id);
    }
    setHint(text) { const el = document.getElementById('rb-hint'); if (el) el.textContent = text; }

    markClickable(group, ids, handler) {
        (ids || []).forEach(id => this.clickable.set(Number(id), handler));
        this.applyClickableClasses();
    }
    // Re-apply the visual highlight (called after every board render, since
    // re-rendering replaces the card DOM). Clicks work via delegation regardless.
    applyClickableClasses() {
        document.querySelectorAll('.rb-card.rb-clickable').forEach(el => el.classList.remove('rb-clickable'));
        this.clickable.forEach((_h, id) => {
            const el = document.getElementById(`card-${id}`);
            if (el) el.classList.add('rb-clickable');
        });
    }
    clearClickable() {
        this.clickable.clear();
        document.querySelectorAll('.rb-card.rb-clickable, .rb-card.rb-selected')
            .forEach(el => el.classList.remove('rb-clickable', 'rb-selected'));
        this.setHint('');
    }

    // ---- notifications ----

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }

    async notif_boardUpdate(args) {
        this.renderBoard(args.board);
        this.renderBuilt(args.built);
        this.renderMaterials(args.materials);
        Object.values(args.players).forEach(p => {
            this.players[p.id] = { ...this.players[p.id], ...p };
            const set = (pfx, v) => { const e = document.getElementById(`${pfx}-${p.id}`); if (e) e.textContent = v; };
            set('fish', p.fish); set('supply', p.supply); set('score', p.score);
        });
    }
    async notif_handUpdate(args) { this.renderHand(args.hand); }

    // Log-only notifications (messages show in the game log; no UI work needed).
    async notif_auctionStarted() {}
    async notif_auctionResolved() {}
    async notif_defer() {}
    async notif_peekHands(args) { /* Salt Lick: opponents' hands available in args.hands */ }
    async notif_build() {}
    async notif_flush() {}
    async notif_invent() {}
    async notif_retire() {}
    async notif_shorelinePenalty() {}
}
