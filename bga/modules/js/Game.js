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
        this.game.setHint(_('Click a Headwaters card to Pull, a river card to Auction, or a hand card to Build.'));
        this.game.markClickable('hw', args.headwatersCards, id => this.bga.actions.performAction('actPull', { cardId: id }));
        this.game.markClickable('river', args.auctionableRiverCards, id => this.bga.actions.performAction('actAuction', { cardId: id }));
        this.game.markClickable('hand', args.handStructureIds, id => this.bga.actions.performAction('actBuild', { cardId: id }));

        for (let n = 2; n <= 5; n++) {
            this.bga.statusBar.addActionButton(_('Invent ') + n, () => this.bga.actions.performAction('actInvent', { n }), { color: 'secondary' });
        }
        if (args.canFlush) {
            this.bga.statusBar.addActionButton(_('Flush (5🐟)'), () => this.bga.actions.performAction('actFlush'), { color: 'secondary' });
        }
    }
    onLeavingState() { this.game.clearClickable(); }
}

class Auction {
    constructor(game, bga) { this.game = game; this.bga = bga; }

    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(_('Auction — submit your sealed worker bid'));
        if (!isActive) return;
        const supply = this.game.mySupply();
        const maxBid = Math.min(args.open, supply);
        const minBid = (this.game.myId() === Number(args.triggerPlayer)) ? 1 : 0;
        this.game.setHint(_('Up to ') + maxBid + _(' workers (this lot has ') + args.open + _(' open icons).'));
        for (let b = minBid; b <= maxBid; b++) {
            this.bga.statusBar.addActionButton(_('Bid ') + b, () => this.bga.actions.performAction('actBid', { workers: b }));
        }
    }
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
        this.clickHandlers = [];
        this.bga.states.register('PlayerTurn', new PlayerTurn(this, bga));
        this.bga.states.register('Auction', new Auction(this, bga));
        this.bga.states.register('InventDiscard', new InventDiscard(this, bga));
        this.bga.states.register('FlushChoose', new FlushChoose(this, bga));
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
                <div class="rb-section"><h3>Your hand</h3><div id="rb-hand" class="rb-row"></div></div>
            </div>
        `);

        Object.values(gamedatas.players).forEach(p => {
            this.bga.playerPanels.getElement(p.id).insertAdjacentHTML('beforeend', `
                <div class="rb-panel">
                    <span id="fish-${p.id}">${p.fish}</span> 🐟 (line ${gamedatas.fishLine})
                    &nbsp; <span id="supply-${p.id}">${p.supply}</span> 👷
                    &nbsp; <span id="score-${p.id}">${p.score}</span> ★
                    <div id="built-${p.id}" class="rb-built"></div>
                </div>
            `);
        });

        this.renderBoard(gamedatas.board);
        this.renderHand(gamedatas.hand);
        this.renderBuilt(gamedatas.built);
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
    }

    renderHand(hand) {
        document.getElementById('rb-hand').innerHTML = (hand || []).map(c => `
            <div id="card-${c.id}" class="rb-card rb-hand" data-id="${c.id}" title="${c.effect}">
                <div class="rb-name">${c.name}</div>
                <div>${c.time}🐟 + ${costStr(c.cost)}</div>
                <div>${c.vp}★</div>
            </div>`).join('') || '<span class="rb-empty">—</span>';
    }

    renderBuilt(built) {
        Object.entries(built || {}).forEach(([pid, list]) => {
            const el = document.getElementById(`built-${pid}`);
            if (el) el.innerHTML = list.map(b => `<span class="rb-tag">${b.name}</span>`).join(' ');
        });
    }

    // ---- helpers ----

    myId() { return Number(this.bga.player_id); }
    mySupply() { const p = this.players[this.myId()]; return p ? Number(p.supply) : 0; }
    setHint(text) { const el = document.getElementById('rb-hint'); if (el) el.textContent = text; }

    markClickable(group, ids, handler) {
        (ids || []).forEach(id => {
            const el = document.getElementById(`card-${id}`);
            if (!el) return;
            el.classList.add('rb-clickable');
            const fn = () => handler(id);
            el.addEventListener('click', fn);
            this.clickHandlers.push({ el, fn });
        });
    }
    clearClickable() {
        this.clickHandlers.forEach(({ el, fn }) => { el.classList.remove('rb-clickable', 'rb-selected'); el.removeEventListener('click', fn); });
        this.clickHandlers = [];
        this.setHint('');
    }

    // ---- notifications ----

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications();
    }

    async notif_boardUpdate(args) {
        this.renderBoard(args.board);
        this.renderBuilt(args.built);
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
    async notif_build() {}
    async notif_flush() {}
    async notif_invent() {}
}
