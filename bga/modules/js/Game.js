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

// Card name -> art-file slug. Mirrors the deck generators' safe_filename():
// keep ASCII letters/digits, drop everything else ("Boulder Field" -> "BoulderField").
function slugify(name) { return (name || '').replace(/[^A-Za-z0-9]/g, ''); }

// A material-icon sprite chip (logs/stones/reeds/mud/vines/clay) — see img/icons.png.
function matIcon(m) {
    return m ? `<span class="rb-art rb-art-icon rb-p-icon-${m}" title="${m}"></span>` : '';
}

// Cost rendered with real material-icon sprites instead of emoji.
function costIcons(cost) {
    return Object.entries(cost || {}).map(([m, n]) => `${n}${matIcon(m)}`).join(' ') || '—';
}

// Material-card face geometry (the sprite renders the trimmed 252×180pt card).
// WORKER_DISC_PX must match the generator's wchit render width (img/build_sprites.py).
const MAT_CARD_W = 154, MAT_CARD_H = 110, WORKER_DISC_PX = 37;
const CARD_MOVE_MS = 400; // card slide duration; also the phase-1 delay before an incoming card drops into a stacked river column

// Center of each printed icon circle, as {cx,cy} in % of the trimmed card.
// Ported from the web prototype's pngIconPositions() (which mirrors generate.py's
// layout: 4→[4], 5→[3,2], 7→[4,3], 8→[4,4]). `hasEffect` shortens the icon band.
function pngIconPositions(totalIcons, hasEffect) {
    let rows;
    if (totalIcons === 4) rows = [4];
    else if (totalIcons === 5) rows = [3, 2];
    else if (totalIcons === 7) rows = [4, 3];
    else if (totalIcons === 8) rows = [4, 4];
    else return [];
    const DIAM = 45.36, RADIUS = 22.68, GAP = 6;
    const CROP_W = 252, CROP_H = 180, CROP_OFFSET = 9;
    const cardCenterX = 135 - CROP_OFFSET;                       // 126
    const areaTop = 44 - CROP_OFFSET;                            // 35
    const areaBot = (hasEffect ? 154 : 178) - CROP_OFFSET;      // 145 / 169
    const rowsH = rows.length === 1 ? DIAM : rows.length * DIAM + (rows.length - 1) * GAP;
    const cyTop = areaTop + (areaBot - areaTop - rowsH) / 2 + RADIUS;
    const positions = [];
    for (let r = 0; r < rows.length; r++) {
        const cy = cyTop + r * (DIAM + GAP);
        const count = rows[r];
        const rowW = count * DIAM + (count - 1) * GAP;
        const xFirst = cardCenterX - rowW / 2 + RADIUS;
        for (let i = 0; i < count; i++) {
            const cx = xFirst + i * (DIAM + GAP);
            positions.push({ cx: 100 * cx / CROP_W, cy: 100 * cy / CROP_H });
        }
    }
    return positions;
}

// Board-slot geometry: each slot's top-left as a % of the river-board container.
// Derived from the river-board.svg slot rects (330x242 each) normalized over the
// 1625x1025 viewBox; the board is shown rotated back to landscape (#rb-board-img).
const HW_SLOT_LEFT = { 1: 73.29, 2: 50.22, 3: 27.14 }; // Headwaters 1 rightmost
const HW_SLOT_TOP = 7.12;
const DECK_SLOT = { left: 4.06, top: 7.12 };           // Material Deck (top-left)
const FT_STACK_OFFSET = 16;                            // px each stacked pawn rises on the fish track
const RIVER_SLOT_LEFT = { 1: 4.06, 2: 27.14, 3: 50.22, 4: 73.29 };
// Each river slot is a bounded, scrollable column (top/height in the CSS); cards
// stack inside it at natural size (~2 visible) and scroll rather than overflowing
// the board onto the content below.

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
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
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
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
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
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
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
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
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
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
    }
    onLeavingState() { this.game.clearClickable(); }
}

class TradingPost {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const src = args.step === 'source';
        this.bga.statusBar.setTitle(isActive
            ? (src ? _('Trading Post — recall a worker (source ') + (args.picked + 1) + '/3)' : _('Trading Post — place 2 workers on a river card'))
            : _('Trading Post…'));
        if (!isActive) return;
        this.game.setHint(src ? _('Click a worker on a material you have not recalled yet.') : _('Click a river card with uncovered icons.'));
        const action = src ? 'actTradeSource' : 'actTradeTarget';
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction(action, { cardId: id }));
        this.bga.statusBar.addActionButton(_('Undo'), () => this.bga.actions.performAction('actUndo'), { color: 'secondary' });
    }
    onLeavingState() { this.game.clearClickable(); }
}

class Confluence {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const a = args.step === 'cardA';
        this.bga.statusBar.setTitle(isActive
            ? (a ? _('Confluence — pick the first river card') : _('Confluence — pick a second card of the same material'))
            : _('Confluence…'));
        if (!isActive) return;
        this.game.setHint(a ? _('Click a river card that has a same-material partner.') : _('Click another river card of the same material.'));
        const action = a ? 'actConfA' : 'actConfB';
        this.game.markClickable('river', args.targets, id => this.bga.actions.performAction(action, { cardId: id }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class MillWheel {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Mill Wheel — copy a neighbour\'s ability') : _('Mill Wheel…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        this.game.setHint(_('Pick a neighbour ability to use as your own.'));
        (args.options || []).forEach(o => this.bga.statusBar.addActionButton(
            _('Copy ') + o.name + (o.cost ? ' (' + o.cost + '🐟)' : ''),
            () => this.bga.actions.performAction('actMillPick', { ability: o.key }), { color: 'secondary' }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class FinalBuild {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Final build — build one structure or skip') : _('Final builds…'));
        if (!isActive) return;
        this.game.setHint(_('One last build: click a hand card, or skip.'));
        // Simultaneous round: each player builds from their own hand, so derive
        // the clickable ids from the rendered hand rather than a shared arg.
        const myHandIds = [...document.querySelectorAll('#rb-hand [data-id]')].map(el => Number(el.dataset.id));
        this.game.markClickable('hand', myHandIds, id => this.bga.actions.performAction('actFinalBuild', { cardId: id }));
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
        const lotDesc = id => { const c = this.game.cardById(id); return c ? `${c.name} (${c.icons}x ${c.material})` : _('this lot'); };
        let lot = lotDesc(a.lotCardId);
        if (a.lotCardId2) lot += ' + ' + lotDesc(a.lotCardId2);
        this.bga.statusBar.setTitle(_('How many workers would you like to send for ') + lot + ' ?');
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
        this.game.setHint(_('Click a river or shoreline card with your worker; it returns to supply (river recalls drop a blank).'));
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
        this.bga.states.register('TradingPost', new TradingPost(this, bga));
        this.bga.states.register('Confluence', new Confluence(this, bga));
        this.bga.states.register('MillWheel', new MillWheel(this, bga));
        this.bga.states.register('AbilityTarget', new AbilityTarget(this, bga));
        this.bga.states.register('FinalBuild', new FinalBuild(this, bga));
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;
        this.players = gamedatas.players;
        this.materialDeck = gamedatas.materialDeck;
        this.fishLine = gamedatas.fishLine;

        // Right side: my hand, then my built structures, then each opponent's
        // built structures — one row each (me first).
        const myId = Number(this.bga.players.getCurrentPlayerId());
        const players = Object.values(gamedatas.players);
        const me = players.find(p => Number(p.id) === myId);
        const ordered = me ? [me, ...players.filter(p => p !== me)] : players;
        const builtRows = ordered.map(p =>
            `<div class="rb-built-row"><div class="rb-sl-label">${p === me ? _('Your built') : p.name + ' — built'}</div>` +
            `<div id="built-${p.id}" class="rb-hrow"></div></div>`).join('');

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="rb-fishtrack"><span class="rb-ft-fish" title="${_('Fish track')}">🐟</span><div id="rb-ft-inner" class="rb-ft-inner"></div></div>
            <div id="rb-zoomctl">${_('Board zoom')}: <input id="rb-zoom" type="range" min="0.5" max="1.5" step="0.05"><span id="rb-zoomval"></span>
                <label id="rb-prevlabel"><input type="checkbox" id="rb-cardprev-cb"> ${_('Card previews')}</label></div>
            <div id="rb-root">
            <div id="rb-hint" class="rb-hint"></div>
            <div id="rb-board-wrap">
                <div id="rb-board">
                    <div id="rb-board-img"></div>
                    <div id="rb-slots"></div>
                </div>
                <div class="rb-side-col" id="rb-shoreline-col"><div class="rb-sl-label">Shoreline</div><div id="rb-shoreline" class="rb-stack"></div></div>
                <div id="rb-right">
                    <div class="rb-built-row"><div class="rb-sl-label">Your hand</div><div id="rb-hand" class="rb-hrow"></div></div>
                    ${builtRows}
                </div>
            </div>
            <div class="rb-section" id="rb-draft-section" style="display:none"><h3>Your species starters — pick one</h3><div id="rb-draft" class="rb-row"></div></div>
            </div>
        `);

        Object.values(gamedatas.players).forEach(p => {
            this.bga.playerPanels.getElement(p.id).insertAdjacentHTML('beforeend', `
                <div class="rb-panel">
                    <div id="supply-${p.id}" class="rb-supply" title="${_('Workers in supply')}"></div>
                    <div id="materials-${p.id}" class="rb-mats"></div>
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

        this.renderPeek(gamedatas.peekTop);

        this.renderBoard(gamedatas.board);
        this.renderHand(gamedatas.hand);
        this.renderBuilt(gamedatas.built);
        this.renderMaterials(gamedatas.materials);
        this.renderSupplies();
        this.renderFishTrack();
        this.setupZoom();
        this.setupCardPreview();
        this.setupNotifications();
    }

    // Zoom slider for the whole board area (#rb-root), persisted per browser.
    setupZoom() {
        const root = document.getElementById('rb-root');
        const slider = document.getElementById('rb-zoom');
        const val = document.getElementById('rb-zoomval');
        if (!root || !slider) return;
        const apply = z => { root.style.zoom = z; if (val) val.textContent = Math.round(z * 100) + '%'; };
        let z;
        try { z = parseFloat(localStorage.getItem('rb-zoom')); } catch (e) { z = NaN; }
        if (!(z >= 0.5 && z <= 1.5)) z = 1.0;
        slider.value = z;
        apply(z);
        slider.addEventListener('input', () => {
            const v = parseFloat(slider.value);
            apply(v);
            try { localStorage.setItem('rb-zoom', v); } catch (e) { /* private mode */ }
        });
    }

    // "Card previews" toggle (persisted): when on, hovering any card pops a
    // large copy of its printed face. The overlay is pointer-events:none and
    // lives on <body> (outside the zoomed board), so clicks pass through to the
    // card underneath and clickable cards stay clickable. When off, cards fall
    // back to a native tooltip showing only the effect text (set at render).
    setupCardPreview() {
        const prev = document.createElement('div');
        prev.id = 'rb-cardprev';
        document.body.appendChild(prev);
        this._cardPrev = prev;
        this._prevCard = null;

        const cb = document.getElementById('rb-cardprev-cb');
        if (cb) {
            let on = false;
            try { on = localStorage.getItem('rb-cardprev') === '1'; } catch (e) { /* private mode */ }
            cb.checked = on;
            cb.addEventListener('change', () => {
                try { localStorage.setItem('rb-cardprev', cb.checked ? '1' : '0'); } catch (e) { /* private mode */ }
                if (!cb.checked) this.hideCardPreview();
            });
        }

        const area = this.bga.gameArea.getElement();
        area.addEventListener('mouseover', e => {
            if (!cb || !cb.checked) return;
            const card = e.target.closest('.rb-card.rb-has-art');
            if (!card || card === this._prevCard) return;
            this.showCardPreview(card, e);
        });
        area.addEventListener('mousemove', e => { if (this._prevCard) this.positionCardPreview(e); });
        area.addEventListener('mouseout', e => {
            if (!this._prevCard) return;
            // Ignore moves between children of the same card (discs/overlays).
            if (e.relatedTarget && this._prevCard.contains(e.relatedTarget)) return;
            this.hideCardPreview();
        });
    }

    showCardPreview(card, e) {
        // Copy just the card's printed-face classes (rb-art* / rb-p-*); the inner
        // worker/blank discs carry their own wchit classes and aren't on the card.
        const artCls = [...card.classList].filter(c => c.startsWith('rb-art') || c.startsWith('rb-p-'));
        if (!artCls.length) return;
        const isMat = artCls.includes('rb-art-mat');
        const baseW = isMat ? 154 : 110, baseH = isMat ? 110 : 154, scale = 2.5;
        this._cardPrev.style.width = (baseW * scale) + 'px';
        this._cardPrev.style.height = (baseH * scale) + 'px';
        this._cardPrev.innerHTML =
            `<div class="${artCls.join(' ')}" style="transform:scale(${scale});transform-origin:top left;"></div>`;
        this._cardPrev.style.display = 'block';
        // Suppress the native (effect) tooltip while the image preview is showing.
        this._prevCard = card;
        this._savedTitle = card.getAttribute('title');
        card.setAttribute('title', '');
        this.positionCardPreview(e);
    }

    positionCardPreview(e) {
        const el = this._cardPrev;
        const pad = 16;
        const w = parseFloat(el.style.width) || 0, h = parseFloat(el.style.height) || 0;
        let x = e.clientX + pad, y = e.clientY + pad;
        if (x + w > window.innerWidth) x = e.clientX - pad - w;
        if (y + h > window.innerHeight) y = window.innerHeight - h - pad;
        el.style.left = Math.max(pad, x) + 'px';
        el.style.top = Math.max(pad, y) + 'px';
    }

    hideCardPreview() {
        if (this._cardPrev) { this._cardPrev.style.display = 'none'; this._cardPrev.innerHTML = ''; }
        if (this._prevCard) {
            if (this._savedTitle != null) this._prevCard.setAttribute('title', this._savedTitle);
            this._prevCard = null;
            this._savedTitle = null;
        }
    }

    // ---- rendering ----

    // A worker/blank disc centered on a printed icon circle (pos = {cx,cy} in %).
    disc(cls, pos, title) {
        const left = (pos.cx * MAT_CARD_W / 100 - WORKER_DISC_PX / 2).toFixed(1);
        const top = (pos.cy * MAT_CARD_H / 100 - WORKER_DISC_PX / 2).toFixed(1);
        return `<span class="rb-art rb-art-wchit ${cls}" title="${title}"` +
            ` style="position:absolute;left:${left}px;top:${top}px;"></span>`;
    }

    // Material/river/shoreline cards render as the printed material-deck face;
    // each placed worker (player's species disc) and dropped blank sits on its
    // matching printed icon circle, filling circles in order: workers, then
    // blanks; remaining circles stay open (already drawn on the art).
    cardHtml(c, group) {
        // Shoreline cards have graduated — no remaining items to auction, so don't
        // show blanks or the open-icon count there (only the placed workers).
        const shore = group === 'shore';
        const positions = pngIconPositions(c.icons, c.hasEffect);
        const occ = [];
        Object.entries(c.workers || {}).forEach(([pid, n]) => {
            const sp = (this.players[pid] || {}).species || 'beaver';
            for (let i = 0; i < n; i++) occ.push([`rb-p-wchit-${sp}`, this.playerName(pid) + "'s worker"]);
        });
        if (!shore) for (let i = 0; i < (c.blanks || 0); i++) occ.push(['rb-p-wchit-blank', _('sold')]);
        const discs = occ.map(([cls, title], i) =>
            positions[i] ? this.disc(cls, positions[i], title) : '').join('');
        const tip = c.effect || ''; // tooltip: effect text only (no card metadata)
        const openOv = shore ? '' : `<span class="rb-ov rb-ov-open">${c.uncovered}/${c.icons}</span>`;
        return `<div id="card-${c.id}" class="rb-card rb-has-art rb-art rb-art-mat rb-p-mat-${slugify(c.name)} rb-${group}"
                     data-id="${c.id}" title="${tip}">
            ${openOv}${discs}
        </div>`;
    }

    // Lay the cards out over the river-board art: Headwaters across the top,
    // each River slot holding up to two cards (extra cards fan off the second
    // position), and the shoreline in a row beneath the board.
    renderBoard(board) {
        const slots = document.getElementById('rb-slots');
        if (!board || !slots) return;
        // Snapshot the previous board + where each card currently sits on screen,
        // so after the re-render we can fly worker chits between cards and supply
        // (animateWorkerMoves). Captured before innerHTML is replaced.
        const prev = this.board;
        const animate = prev && !this.reducedMotion();
        const oldRects = {};
        if (animate) {
            [...(prev.headwaters || []), ...(prev.river || []), ...(prev.shoreline || [])]
                .forEach(c => { const el = document.getElementById(`card-${c.id}`); if (el) oldRects[c.id] = this.animCenter(el); });
        }
        this.board = board;
        let html = '';

        const md = this.materialDeck;
        if (md) {
            html += this.slotHtml(DECK_SLOT.left, DECK_SLOT.top,
                `<span class="rb-deck-count">${md.remaining}/${md.total} left</span>`);
        }

        [1, 2, 3].forEach(slot => {
            const c = board.headwaters.find(x => x.slot === slot);
            html += this.slotHtml(HW_SLOT_LEFT[slot], HW_SLOT_TOP,
                c ? this.cardHtml(c, 'hw') : `<span class="rb-slot-empty">HW${slot}</span>`);
        });

        [1, 2, 3, 4].forEach(slot => {
            const cards = this.orderRiverSlot(slot, board.river.filter(x => x.slot === slot));
            const inner = cards.length
                ? cards.map(c => `<div class="rb-mcard">${this.cardHtml(c, 'river')}</div>`).join('')
                : `<span class="rb-slot-empty">R${slot} · ${slot + 1}🐟</span>`;
            html += `<div class="rb-river-col" style="left:${RIVER_SLOT_LEFT[slot]}%">${inner}</div>`;
        });

        slots.innerHTML = html;
        const sh = document.getElementById('rb-shoreline');
        if (sh) sh.innerHTML = board.shoreline.map(c => `<div class="rb-mcard">${this.cardHtml(c, 'shore')}</div>`).join('') || '<span class="rb-empty">—</span>';
        this.applyClickableClasses();
        if (animate) {
            // Worker flies first (they read final card centers, before card FLIP
            // transforms shift the wrappers), then card slides.
            this.animateWorkerMoves(prev, board, oldRects);
            this.animateCardMoves(prev, board, oldRects);
        }
    }

    // Stable top-to-bottom order for a river column. Cards keep their remembered
    // order across renders (so unrelated boardUpdates don't reshuffle the stack),
    // and a newly-arrived card is placed on top — which opens room beneath it for
    // the shift-down-then-drop-in card animation (animateCardMoves).
    orderRiverSlot(slot, cards) {
        this.riverOrder = this.riverOrder || {};
        const byId = {};
        cards.forEach(c => { byId[c.id] = c; });
        const remembered = (this.riverOrder[slot] || []).filter(id => byId[id]);
        const arrivals = cards.map(c => c.id).filter(id => !remembered.includes(id));
        const order = [...arrivals, ...remembered];
        this.riverOrder[slot] = order;
        return order.map(id => byId[id]);
    }

    // ---- card move (FLIP) animations ----
    // Slide cards from their previous on-screen spot to the new one. A card moving
    // into a river column that already holds cards is DELAYED by one slide: the
    // cards already there shift down first (to open the top), then the newcomer
    // drops in. New cards (no prior position) just fade in.
    animateCardMoves(prev, next, oldRects) {
        const key = (zone, slot) => `${zone}:${slot}`;
        const prevSlotOf = {};
        const prevRiverCount = {};
        ['headwaters', 'river', 'shoreline'].forEach(z => (prev[z] || []).forEach(c => {
            prevSlotOf[c.id] = key(z, c.slot);
            if (z === 'river') prevRiverCount[c.slot] = (prevRiverCount[c.slot] || 0) + 1;
        }));
        const cols = new Set();
        ['headwaters', 'river', 'shoreline'].forEach(z => (next[z] || []).forEach(c => {
            const el = document.getElementById(`card-${c.id}`);
            const wrap = el && el.closest('.rb-mcard, .rb-slot');
            if (!wrap) return;
            if (!(c.id in oldRects)) { wrap.classList.add('rb-card-enter'); return; } // freshly revealed
            const nc = this.animCenter(el);
            const oc = oldRects[c.id];
            const dx = oc.x - nc.x, dy = oc.y - nc.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return; // didn't move
            // Hold the newcomer at its source while a previously-occupied river
            // column makes room, then let it drop in.
            const wasHere = prevSlotOf[c.id] === key('river', c.slot);
            const delay = (z === 'river' && !wasHere && (prevRiverCount[c.slot] || 0) > 0) ? CARD_MOVE_MS : 0;
            this.flipCard(wrap, dx, dy, delay);
            const col = wrap.closest('.rb-river-col');
            if (col) cols.add(col);
        }));
        // River columns clip (overflow) — let a card slide in from outside the
        // column for the duration of the move, then restore.
        cols.forEach(col => {
            col.style.overflow = 'visible';
            setTimeout(() => { col.style.overflow = ''; }, CARD_MOVE_MS * 2 + 150);
        });
    }
    // FLIP: jump the wrapper back to the old spot (no transition), then transition
    // its transform back to 0 — so it appears to slide from old to new. Applied to
    // the wrapper, never the .rb-card (which owns the scale() transform).
    flipCard(wrap, dx, dy, delay) {
        wrap.style.transition = 'none';
        wrap.style.transform = `translate(${dx}px, ${dy}px)`;
        wrap.getBoundingClientRect(); // flush so the reset below transitions
        requestAnimationFrame(() => {
            wrap.style.transition = `transform ${CARD_MOVE_MS}ms ease ${delay}ms`;
            wrap.style.transform = 'translate(0, 0)';
        });
        const clear = () => { wrap.style.transition = ''; wrap.style.transform = ''; };
        wrap.addEventListener('transitionend', clear, { once: true });
        setTimeout(clear, CARD_MOVE_MS + delay + 100);
    }

    // ---- worker-chit fly animations (place / spend) ----
    reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    animCenter(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    animLayer() {
        let l = document.getElementById('rb-anim-layer');
        // Append to <body>, NOT #rb-root: the board uses CSS `zoom`, which would
        // distort a fixed-position overlay's coordinates inside it. getBoundingClientRect
        // already returns post-zoom viewport coords, so body-level positioning matches.
        if (!l) { l = document.createElement('div'); l.id = 'rb-anim-layer'; document.body.appendChild(l); }
        return l;
    }
    // A single species chit that slides from `from` to `to` (viewport coords) then
    // removes itself — used to show a worker arriving on / leaving a card.
    flyChit(sp, from, to, delay = 0) {
        const el = document.createElement('span');
        el.className = `rb-art rb-art-wchit rb-p-wchit-${sp} rb-fly`;
        el.style.left = (from.x - WORKER_DISC_PX / 2) + 'px';
        el.style.top = (from.y - WORKER_DISC_PX / 2) + 'px';
        el.style.transitionDelay = delay + 'ms';
        this.animLayer().appendChild(el);
        el.getBoundingClientRect(); // force initial layout so the move transitions
        requestAnimationFrame(() => {
            el.style.left = (to.x - WORKER_DISC_PX / 2) + 'px';
            el.style.top = (to.y - WORKER_DISC_PX / 2) + 'px';
        });
        const done = () => el.remove();
        el.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 900 + delay); // safety net if transitionend doesn't fire
    }
    // Diff the previous vs new board; for each card+player whose worker count rose,
    // fly chits in from that player's supply; where it fell, fly chits out to it.
    animateWorkerMoves(prev, next, oldRects) {
        const zone = b => [...(b.headwaters || []), ...(b.river || []), ...(b.shoreline || [])];
        const oldC = {}, newC = {};
        zone(prev).forEach(c => oldC[c.id] = c);
        zone(next).forEach(c => newC[c.id] = c);
        const ids = new Set([...Object.keys(oldC), ...Object.keys(newC)].map(Number));
        ids.forEach(id => {
            const o = oldC[id], n = newC[id];
            const pids = new Set([...Object.keys((o && o.workers) || {}), ...Object.keys((n && n.workers) || {})]);
            pids.forEach(pid => {
                const delta = Number((n && n.workers && n.workers[pid]) || 0) - Number((o && o.workers && o.workers[pid]) || 0);
                if (!delta) return;
                const sp = (this.players[pid] || {}).species || 'beaver';
                const supEl = document.getElementById(`supply-${pid}`);
                if (!supEl) return;
                const supply = this.animCenter(supEl);
                if (delta > 0) { // placed: supply -> card (new position)
                    const cardEl = document.getElementById(`card-${id}`);
                    if (!cardEl) return;
                    const dest = this.animCenter(cardEl);
                    for (let k = 0; k < delta; k++) this.flyChit(sp, supply, dest, k * 80);
                } else { // spent / recalled: card (old position) -> supply
                    const src = oldRects[id];
                    if (!src) return;
                    for (let k = 0; k < -delta; k++) this.flyChit(sp, src, supply, k * 80);
                }
            });
        });
    }

    slotHtml(left, top, inner) {
        return `<div class="rb-slot" style="left:${left}%;top:${top}%;">${inner}</div>`;
    }

    renderHand(hand) {
        document.getElementById('rb-hand').innerHTML = (hand || []).map(c => `
            <div class="rb-scard"><div id="card-${c.id}" class="rb-card rb-has-art rb-art rb-art-str rb-p-str-${slugify(c.name)}"
                 data-id="${c.id}" title="${c.effect || ''}">
            </div></div>`).join('') || '<span class="rb-empty">—</span>';
        this.applyClickableClasses();
    }

    // A built card's face (structure or species-starter art) with an effect tooltip.
    builtCardHtml(b) {
        const cls = b.kind === 'sta' ? `rb-art-sta rb-p-sta-${slugify(b.name)}` : `rb-art-str rb-p-str-${slugify(b.name)}`;
        // A spent once-per-game card is dimmed and stamped "USED" (the physical
        // card would be flipped); the tooltip notes it as well.
        const spent = b.used ? ' rb-spent' : '';
        const tip = (b.effect || '') + (b.used ? ' (' + _('once-per-game ability used') + ')' : '');
        const stamp = b.used ? `<span class="rb-used-stamp">${_('USED')}</span>` : '';
        return `<div id="card-${b.id}" class="rb-card rb-has-art rb-art ${cls}${spent}" data-id="${b.id}" title="${tip}">${stamp}</div>`;
    }

    renderBuilt(built) {
        Object.entries(built || {}).forEach(([pid, list]) => {
            const el = document.getElementById(`built-${pid}`);
            if (el) el.innerHTML = list.map(b => `<div class="rb-scard">${this.builtCardHtml(b)}</div>`).join('') || '<span class="rb-empty">—</span>';
        });
        this.applyClickableClasses();
    }

    // The "peek at the top of the material deck" hint (Lookout Tree / Marsh
    // Lookout). Private per-player info, so it arrives via getAllDatas on load
    // and the `peekUpdate` notification thereafter; passing a null peekTop (no
    // lookout, or empty deck) removes the hint.
    renderPeek(peekTop) {
        const existing = document.getElementById('rb-peek');
        if (!peekTop) { if (existing) existing.remove(); return; }
        const html = `${_('Deck top (peek):')} ${MAT_GLYPH[peekTop.material] || ''} ${peekTop.icons}`;
        if (existing) { existing.innerHTML = html; return; }
        (document.getElementById('rb-root') || this.bga.gameArea.getElement())
            .insertAdjacentHTML('beforeend', `<div id="rb-peek" class="rb-hint">${html}</div>`);
    }

    renderStarterOffer(offers) {
        const el = document.getElementById('rb-draft');
        if (!el) return;
        el.innerHTML = (offers || []).map(c => `
            <div id="card-${c.id}" class="rb-card rb-has-art rb-art rb-art-sta rb-p-sta-${slugify(c.name)}"
                 data-id="${c.id}" title="${c.effect || ''}"></div>`).join('');
        this.applyClickableClasses();
    }

    renderMaterials(materials) {
        Object.entries(materials || {}).forEach(([pid, held]) => {
            const el = document.getElementById(`materials-${pid}`);
            if (!el) return;
            const fixed = Object.entries(held.fixed || {}).map(([m, n]) => `${n}${matIcon(m)}`);
            const wild = (held.wild || []).map(w => `${w.count}${matIcon(w.materials[0])}/${matIcon(w.materials[1])}`);
            const all = [...fixed, ...wild];
            el.innerHTML = all.length ? all.join(' ') : `<span class="rb-empty">${_('no materials yet')}</span>`;
        });
    }

    // Draw one worker chit per worker in a player's supply (instead of "N 👷").
    renderSupply(pid) {
        const el = document.getElementById(`supply-${pid}`);
        if (!el) return;
        const p = this.players[pid] || {};
        const n = Number(p.supply) || 0;
        const sp = p.species || 'beaver';
        let html = '';
        for (let i = 0; i < n; i++) {
            html += `<span class="rb-pchit"><span class="rb-art rb-art-wchit rb-p-wchit-${sp}"></span></span>`;
        }
        el.innerHTML = html || `<span class="rb-empty">${_('no workers remaining')}</span>`;
    }
    renderSupplies() { Object.keys(this.players).forEach(pid => this.renderSupply(pid)); }

    // ---- helpers ----

    myId() { return Number(this.bga.players.getCurrentPlayerId()); }
    playerName(pid) { const p = this.players[pid]; return p ? p.name : ('#' + pid); }
    // Look up a material card anywhere on the board (headwaters, river, shoreline).
    cardById(id) {
        const b = this.board || {};
        return [...(b.headwaters || []), ...(b.river || []), ...(b.shoreline || [])]
            .find(c => c.id === Number(id)) || null;
    }
    mySupply() { const p = this.players[this.myId()]; return p ? Number(p.supply) : 0; }
    // River OR shoreline cards (excluding the auction lot) where I have a worker
    // to recall. Shoreline recalls drop no blank (handled server-side).
    myRecallTargets(lotCardId) {
        const me = this.myId();
        const b = this.board || {};
        return [...(b.river || []), ...(b.shoreline || [])]
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
        this.materialDeck = args.materialDeck;
        this.renderBoard(args.board);
        this.renderBuilt(args.built);
        this.renderMaterials(args.materials);
        Object.values(args.players).forEach(p => {
            this.players[p.id] = { ...this.players[p.id], ...p };
        });
        this.renderSupplies(); // supply chits; fish position shows on the track, VP on the BGA panel
        this.renderFishTrack();
    }

    // A single line across the top: each player's species chit at their position
    // on the fish track (0 → fish line). Players on the same space stack vertically
    // by stack order (top of the stack = acts first); ties read at a glance.
    renderFishTrack() {
        const inner = document.getElementById('rb-ft-inner');
        if (!inner) return;
        const line = Number(this.fishLine) || 90;

        // Static scenery (the track line + finish flag) is drawn once. Pawns are
        // NOT rebuilt each render — one element per player persists, so updating
        // its left/bottom animates as a slide (see .rb-ft-pawn transition in CSS)
        // instead of teleporting on every boardUpdate.
        if (!inner.querySelector('.rb-ft-line')) {
            inner.insertAdjacentHTML('afterbegin',
                '<div class="rb-ft-line"></div><span class="rb-ft-finish" title="' +
                _('Finish line') + ' (' + line + ')">🏁</span>');
        }

        const byPos = {};
        Object.values(this.players).forEach(p => {
            const f = Number(p.fish) || 0;
            (byPos[f] = byPos[f] || []).push(p);
        });
        // Keep the bar to a single row; grow only when tokens stack on a space.
        const maxStack = Math.max(1, ...Object.values(byPos).map(g => g.length));
        inner.parentElement.style.height = (34 + (maxStack - 1) * FT_STACK_OFFSET) + 'px';

        Object.keys(byPos).forEach(fish => {
            const group = byPos[fish].slice().sort((a, b) => (Number(a.stack) || 0) - (Number(b.stack) || 0));
            const x = Math.max(0, Math.min(100, (Number(fish) / line) * 100));
            group.forEach((p, i) => {
                const sp = p.species || 'beaver';
                let pawn = document.getElementById(`rb-ft-pawn-${p.id}`);
                if (!pawn) {
                    pawn = document.createElement('span');
                    pawn.id = `rb-ft-pawn-${p.id}`;
                    pawn.className = 'rb-ft-pawn';
                    pawn.innerHTML = `<span class="rb-art rb-art-wchit rb-p-wchit-${sp}"></span>`;
                    pawn.style.left = x + '%'; // set before insert: first paint doesn't animate
                    inner.appendChild(pawn);
                }
                pawn.style.left = x + '%';
                pawn.style.bottom = (2 + i * FT_STACK_OFFSET) + 'px';
                pawn.style.zIndex = Number(p.stack) || 0;
                pawn.classList.toggle('rb-ft-retired', !!Number(p.retired));
                pawn.title = `${this.playerName(p.id)} — ${p.fish}🐟${Number(p.retired) ? ' (' + _('retired') + ')' : ''}`;
            });
        });
    }
    async notif_handUpdate(args) { this.renderHand(args.hand); }
    async notif_peekUpdate(args) { this.renderPeek(args.peekTop); }

    // Log-only notifications (messages show in the game log; no UI work needed).
    async notif_turnInfo() {}
    async notif_auctionStarted() {}
    async notif_auctionBids() {}
    async notif_auctionResolved() {}
    async notif_defer() {}
    async notif_peekHands(args) { /* Salt Lick: opponents' hands available in args.hands */ }
    async notif_build() {}
    async notif_flush() {}
    async notif_invent() {}
    async notif_retire() {}
    async notif_shorelinePenalty() {}
}
