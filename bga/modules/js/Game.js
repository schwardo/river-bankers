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
const MAT_KEYS = ['logs', 'stones', 'reeds', 'mud', 'vines', 'clay'];

// --- Hand affordability overlay (have vs. need per structure card) ----------
// Faithful port of the web prototype's effectiveBuildCost / effectiveCoverage
// (web/index.html) — themselves mirrors of the server's Rules\BuildCost::effective
// + Rules\Build allocation. Kept client-side (not server-computed) so the pills
// stay live on every boardUpdate as the player's placed workers change, without
// re-sending the private hand. `wbm` is the builder's worker holdings:
// { <material>: fixedCount, _wildPools: [{materials:[a,b], count}] }.
// `flags` are the build-cost modifiers the player's built cards grant.
function rbEffectiveBuildCost(cost, flags, wbm) {
    const eff = {};
    for (const m in cost) eff[m] = cost[m];
    // Cattail Marsh: each reed worker counts as 2 reeds.
    if (flags.cattailMarsh && eff.reeds) eff.reeds = Math.ceil(eff.reeds / 2);
    // Charcoal Pit: 1 clay may substitute for 1 of any deficient other material.
    if (flags.charcoalPit) {
        const claySlack = (wbm.clay || 0) - (eff.clay || 0);
        if (claySlack >= 1) {
            for (const m of Object.keys(cost)) {
                if (m === 'clay') continue;
                if ((wbm[m] || 0) < eff[m]) { eff[m] -= 1; eff.clay = (eff.clay || 0) + 1; break; }
            }
        }
    }
    // Stone Tool (otter starter): once-per-game Charcoal-Pit variant on Stones.
    if (flags.stoneTool && !flags.stoneToolUsed) {
        const stoneSlack = (wbm.stones || 0) - (eff.stones || 0);
        if (stoneSlack >= 1) {
            for (const m of Object.keys(cost)) {
                if (m === 'stones') continue;
                if ((wbm[m] || 0) < eff[m]) { eff[m] -= 1; eff.stones = (eff.stones || 0) + 1; break; }
            }
        }
    }
    // Treaty Stone: cover 1 missing of one material by paying 2 of a surplus one.
    if (flags.treatyStone) {
        for (const target of MAT_KEYS) {
            if ((wbm[target] || 0) >= (eff[target] || 0)) continue;
            let found = false;
            for (const source of MAT_KEYS) {
                if (source === target) continue;
                if ((wbm[source] || 0) - (eff[source] || 0) < 2) continue;
                eff[target] -= 1; eff[source] = (eff[source] || 0) + 2; found = true; break;
            }
            if (found) break;
        }
    }
    // Granary: once-per-game, drop 1 from a remaining deficient material.
    if (flags.granary && !flags.granaryUsed) {
        for (const m of Object.keys(eff)) {
            if ((wbm[m] || 0) < eff[m]) { eff[m] -= 1; break; }
        }
    }
    return eff;
}

// The 🐟 a build advances you, mirroring Effects::buildFishCost: printed time
// minus Lodge Foundation (Logs builds) and Log Flume (any build) discounts, but
// never below 1 (a 0-time build is never discounted up to 1). `builtNames` is the
// list of the builder's built-structure names.
function rbBuildFishCost(card, builtNames) {
    const time = Number(card.time) || 0;
    if (time < 1) return time;
    let discount = 0;
    if ((card.cost || {}).logs > 0 && builtNames.includes('Lodge Foundation')) discount += 1;
    if (builtNames.includes('Log Flume')) discount += 3;
    return Math.max(1, time - discount);
}

// Per-material "have" count after greedily assigning wild-pool workers to the
// material with the largest remaining deficit (same order the real build uses).
function rbEffectiveCoverage(targetCost, wbm) {
    const have = {};
    for (const m in targetCost) have[m] = wbm[m] || 0;
    for (const pool of (wbm._wildPools || [])) {
        let avail = pool.count;
        if (avail === 0) continue;
        const relevant = pool.materials.filter(m => m in targetCost);
        relevant.sort((a, b) => (targetCost[b] - have[b]) - (targetCost[a] - have[a]));
        for (const m of relevant) {
            if (avail === 0) break;
            const deficit = Math.max(0, targetCost[m] - have[m]);
            if (deficit === 0) continue;
            const take = Math.min(avail, deficit);
            have[m] += take; avail -= take;
        }
    }
    return have;
}

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

// Client-side walk of the *optional* build-cost modifiers (Charcoal Pit / Stone
// Tool / Treaty Stone / Granary — Cattail Marsh is always-on and choiceless).
// For each modifier the player controls that could actually help this build, it
// asks Use? and, when ambiguous, which material — instead of the server silently
// auto-firing it (and spending a once-per-game card) on the first deficit. The
// step order and deficit maths mirror Rules\BuildCost::effective exactly, so any
// combination offered here validates server-side. Nothing is sent until the
// final build, so Cancel/decline are all free — one round-trip, same as before.
class BuildChoiceFlow {
    constructor(game, bga, opts) {
        this.game = game; this.bga = bga;
        this.actionName = opts.actionName;   // 'actBuild' | 'actFinalBuild'
        this.cardId = opts.cardId;
        this.cardName = opts.cardName || '';
        this.onCancel = opts.onCancel || (() => {});
        this.cost = opts.cost || {};
        this.flags = opts.flags || {};
        this.wbm = opts.wbm || {};
        this.eff = { ...this.cost };
        if (this.flags.cattailMarsh && this.eff.reeds) this.eff.reeds = Math.ceil(this.eff.reeds / 2);
        this.choices = {};
        this.queue = ['charcoalPit', 'stoneTool', 'treatyStone', 'granary'];
    }

    // Kick off: if no modifier needs a decision, build immediately.
    start() { this.next(); }

    finish() {
        // Leave the action bar as-is: the framework disables it while the action
        // is in flight and restores the state's buttons if the build is rejected
        // (e.g. still short materials) — clearing here would strand an empty bar.
        this.bga.actions.performAction(this.actionName, {
            cardId: this.cardId,
            choices: JSON.stringify(this.choices),
        });
    }

    // Advance to the next modifier that offers a real decision, else build.
    next() {
        while (this.queue.length) {
            const key = this.queue.shift();
            const step = this.evaluate(key);
            if (step) { this.render(key, step); return; }
        }
        this.finish();
    }

    // Fixed-material deficit? (wild pools are resolved later, server-side, so the
    // modifier maths reads fixed counts only — matching effective().)
    isDeficit(m) { return (this.wbm[m] || 0) < this.eff[m]; }

    // Describe modifier $key for the current running eff, or null if it can't help.
    evaluate(key) {
        const f = this.flags;
        if (key === 'charcoalPit') {
            if (!f.charcoalPit || (this.wbm.clay || 0) - (this.eff.clay || 0) < 1) return null;
            const targets = Object.keys(this.cost).filter(m => m !== 'clay' && this.isDeficit(m));
            return targets.length ? { name: _('Charcoal Pit'), targets } : null;
        }
        if (key === 'stoneTool') {
            if (!f.stoneTool || f.stoneToolUsed || (this.wbm.stones || 0) - (this.eff.stones || 0) < 1) return null;
            const targets = Object.keys(this.cost).filter(m => m !== 'stones' && this.isDeficit(m));
            return targets.length ? { name: _('Stone Tool'), targets, once: true } : null;
        }
        if (key === 'granary') {
            if (!f.granary || f.granaryUsed) return null;
            const targets = Object.keys(this.eff).filter(m => this.isDeficit(m));
            return targets.length ? { name: _('Granary'), targets, once: true } : null;
        }
        if (key === 'treatyStone') {
            if (!f.treatyStone) return null;
            const sourcesFor = t => MAT_KEYS.filter(s => s !== t && (this.wbm[s] || 0) - (this.eff[s] || 0) >= 2);
            const targets = MAT_KEYS.filter(t => (this.wbm[t] || 0) < (this.eff[t] || 0) && sourcesFor(t).length);
            return targets.length ? { name: _('Treaty Stone'), targets, treaty: true, sourcesFor } : null;
        }
        return null;
    }

    // Ask Use <name>? — Yes leads to the target picker, No skips the modifier.
    render(key, step) {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        const verb = step.once ? _(' (once per game)') : '';
        this.bga.statusBar.setTitle(step.name + _(' — use it for this build?') + verb);
        this.game.setHint(_('Reduce this build\'s cost with ') + step.name + _('? You choose whether and where.'));
        this.bga.statusBar.addActionButton(_('Use ') + step.name, () => this.pickTarget(key, step));
        this.bga.statusBar.addActionButton(_('Don\'t use'), () => this.next(), { color: 'secondary' });
        this.bga.statusBar.addActionButton(_('Cancel build'), () => this.onCancel(), { color: 'secondary' });
    }

    // Choose which deficit material the modifier covers (auto if only one).
    pickTarget(key, step) {
        if (step.targets.length === 1) return this.apply(key, step, step.targets[0]);
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(step.name + _(' — which material to reduce?'));
        step.targets.forEach(m => this.bga.statusBar.addActionButton(
            this.matLabel(m), () => this.apply(key, step, m)));
        this.bga.statusBar.addActionButton(_('Cancel build'), () => this.onCancel(), { color: 'secondary' });
    }

    // Treaty Stone also needs a surplus source to pay 2-for-1 from.
    pickSource(step, target) {
        const sources = step.sourcesFor(target);
        if (sources.length === 1) return this.applyTreaty(target, sources[0]);
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(_('Treaty Stone — pay 2 of which material?'));
        sources.forEach(s => this.bga.statusBar.addActionButton(
            this.matLabel(s), () => this.applyTreaty(target, s)));
        this.bga.statusBar.addActionButton(_('Cancel build'), () => this.onCancel(), { color: 'secondary' });
    }

    apply(key, step, material) {
        if (step.treaty) return this.pickSource(step, material);
        if (key === 'charcoalPit') { this.eff[material] -= 1; this.eff.clay = (this.eff.clay || 0) + 1; this.choices.charcoalPit = material; }
        else if (key === 'stoneTool') { this.eff[material] -= 1; this.eff.stones = (this.eff.stones || 0) + 1; this.choices.stoneTool = material; }
        else if (key === 'granary') { this.eff[material] -= 1; this.choices.granary = material; }
        this.next();
    }

    applyTreaty(target, source) {
        this.eff[target] -= 1;
        this.eff[source] = (this.eff[source] || 0) + 2;
        this.choices.treatyStone = { target, source };
        this.next();
    }

    matLabel(m) { return (MAT_GLYPH[m] || '') + ' ' + m; }
}

// Launch the build-cost-choice flow for a hand card, then fire $actionName.
// `wbm` is fixed-material counts only (wild pools are resolved server-side after
// the modifiers, so effective() reads fixed surplus) — the same holdings the
// hand affordability pills use.
function launchBuildFlow(game, bga, cardId, actionName, onCancel) {
    const card = (game.lastHand || []).find(c => Number(c.id) === Number(cardId));
    const held = (game.materials || {})[game.myId()] || { fixed: {}, wild: [] };
    new BuildChoiceFlow(game, bga, {
        actionName, cardId,
        cardName: card ? card.name : '',
        cost: (card && card.cost) || {},
        flags: game.myBuildFlags(),
        wbm: { ...(held.fixed || {}) },
        onCancel,
    }).start();
}

// ---- State classes --------------------------------------------------------

class PlayerTurn {
    constructor(game, bga) { this.game = game; this.bga = bga; }

    onEnteringState(args, isActive) {
        this.args = args;
        if (!isActive) {
            this.bga.statusBar.setTitle(_('Waiting for the active player'));
            return;
        }
        this.showMain();
    }

    // Top-level action menu. Each choice that needs a target opens a client-side
    // sub-mode (select a card / a count) with a Cancel that just returns here —
    // no server call happens until the final selection, so Cancel is free.
    showMain() {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(_('Your turn — choose an action'));
        const a = this.args;
        // Direct-click shortcuts stay live: click a Headwaters/river/hand card to
        // Pull/Swim/Build it. The buttons below do the same via a guided select.
        if (a.canTriggerAuction) {
            // Direct clicks are easy to trigger by accident, so they route through
            // a client-side Confirm/Cancel spelling out the lot and its costs. The
            // guided Pull/Swim buttons below are deliberate and skip the prompt.
            this.game.markClickable('hw', a.headwatersCards, id => this.confirmDirectAuction(id, 'pull'));
            this.game.markClickable('river', a.auctionableRiverCards, id => this.confirmDirectAuction(id, 'swim'));
        }
        this.game.markClickable('hand', a.handStructureIds, id => this.confirmDirectBuild(id));
        this.game.setHint(_('Click a Headwaters, river, or hand card directly — or use a button below.'));
        if (a.canTriggerAuction && (a.headwatersCards || []).length) {
            this.bga.statusBar.addActionButton(_('Pull Headwaters card (pay 2-4 🐟)'), () => this.enterPull());
        }
        if (a.canTriggerAuction && (a.auctionableRiverCards || []).length) {
            this.bga.statusBar.addActionButton(_('Swim to a river card (pay 1 🐟)'), () => this.enterAuction());
        }
        if ((a.handStructureIds || []).length) {
            this.bga.statusBar.addActionButton(_('Build structure card'), () => this.enterBuild());
        }
        this.bga.statusBar.addActionButton(_('Invent structure cards (pay 2-5 🐟)'), () => this.enterInvent());
        if (a.canFlush && a.canTriggerAuction) {
            this.bga.statusBar.addActionButton(_('Flush Headwaters (5🐟)'), () => this.game.confirmFishCross(
                5, _('Flush Headwaters (5🐟)'), () => this.bga.actions.performAction('actFlush')), { color: 'secondary' });
        }
        if (a.canRetire) {
            this.bga.statusBar.addActionButton(_('Retire'), () => this.bga.actions.performAction('actRetire'), { color: 'secondary' });
        }
        (a.abilities || []).forEach(ab => {
            const label = ab.name + (ab.cost ? ' (' + ab.cost + '🐟)' : '') + (ab.once ? ' ⚡' : '');
            this.bga.statusBar.addActionButton(label, () => this.game.confirmFishCross(
                Number(ab.cost) || 0, ab.name,
                () => this.bga.actions.performAction('actUseAbility', { ability: ab.key })), { color: 'secondary' });
        });
    }

    // Reset to a clean sub-mode (no clickables, no buttons) with a Cancel back to
    // the main menu, then let the caller add the selection UI.
    enterSubMode(title, hint) {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(title);
        this.game.setHint(hint);
    }
    cancelButton() {
        this.bga.statusBar.addActionButton(_('Cancel'), () => this.showMain(), { color: 'secondary' });
    }

    // Client-side confirmation for a direct card-click Pull (headwaters) or Swim
    // (river). Spells out the lot's name, material(s), open items, trigger cost,
    // and per-item rate before committing. Costs mirror the server: Pull pays the
    // headwaters move cost (slot+1) and auctions at 1/item; Swim pays a flat 1 🐟
    // and auctions at the river rate (slot+1). Per-item is the printed positional
    // rate — before any per-player discounts, which the server applies on resolve.
    confirmDirectAuction(cardId, kind) {
        const c = this.game.cardById(cardId);
        if (!c) return;
        const slot = Number(c.slot) || 0;
        const mat = c.material + (c.wildAlt ? '/' + c.wildAlt : ''); // wilds name both
        const triggerCost = kind === 'pull' ? (slot + 1) : 1;
        const perItem = kind === 'pull' ? 1 : (slot + 1);
        const verb = kind === 'pull' ? _('Pull') : _('Swim to');
        const msg = `${verb} <b>${c.name}</b> (${mat})?<br>`
            + `${c.uncovered} ${_('open item(s)')}<br>`
            + `${_('Cost to auction:')} ${triggerCost} 🐟<br>`
            + `${_('Cost per item:')} ${perItem} 🐟`
            + this.game.fishCrossNote(triggerCost);
        this.bga.dialogs.confirmation(msg).then(ok => {
            if (ok) this.bga.actions.performAction(kind === 'pull' ? 'actPull' : 'actAuction', { cardId });
        });
    }

    enterPull() {
        this.enterSubMode(_('Pull — select a Headwaters card'),
            _('Click a Headwaters card to pull into the river (pay its 2-4 🐟 move cost), then auction it.'));
        this.game.markClickable('hw', this.args.headwatersCards, id => this.bga.actions.performAction('actPull', { cardId: id }));
        this.cancelButton();
    }
    enterAuction() {
        this.enterSubMode(_('Swim — select a river card'),
            _('Click a river card to swim to (pay 1 🐟 to trigger).'));
        this.game.markClickable('river', this.args.auctionableRiverCards, id => this.bga.actions.performAction('actAuction', { cardId: id }));
        this.cancelButton();
    }
    // Client-side confirmation for a direct hand-card click Build. First checks
    // affordability (same effective-cost + coverage maths as the hand pills): if
    // the player is short, we surface that error instead of the dialog. Otherwise
    // we confirm the card name and its effective material cost before building.
    // The guided Build button skips this — a deliberate, already-chosen action.
    confirmDirectBuild(cardId) {
        const card = (this.game.lastHand || []).find(c => Number(c.id) === Number(cardId));
        if (!card) return;
        const held = (this.game.materials || {})[this.game.myId()] || { fixed: {}, wild: [] };
        const wbm = { ...(held.fixed || {}), _wildPools: held.wild || [] };
        const flags = this.game.myBuildFlags();
        const eff = rbEffectiveBuildCost(card.cost || {}, flags, wbm);
        const have = rbEffectiveCoverage(eff, wbm);
        const short = {};
        Object.keys(eff).forEach(m => { const d = eff[m] - (have[m] || 0); if (d > 0) short[m] = d; });
        if (Object.keys(short).length) {
            this.bga.dialogs.showMessage(
                _('You are short') + ' ' + costStr(short) + ' ' + _('to build') + ' ' + card.name + '.', 'error');
            return;
        }
        const builtNames = ((this.game.built || {})[this.game.myId()] || []).map(b => b.name);
        const msg = `${_('Build')} <b>${card.name}</b> ${_('for')} ${costStr(eff)}?`
            + this.game.fishCrossNote(rbBuildFishCost(card, builtNames));
        this.bga.dialogs.confirmation(msg).then(ok => { if (ok) this.startBuild(cardId); });
    }

    enterBuild() {
        this.enterSubMode(_('Build — select a structure from your hand'),
            _('Click a hand card to build it (pays its printed 🐟 cost in materials).'));
        this.game.markClickable('hand', this.args.handStructureIds, id => this.guardedBuild(id));
        this.cancelButton();
    }
    // Build a chosen hand card, first walking any optional cost-modifier choices.
    startBuild(cardId) {
        launchBuildFlow(this.game, this.bga, cardId, 'actBuild', () => this.showMain());
    }
    // Guided build (from the "Build structure card" menu → clicking a hand card):
    // unlike the direct hand-click, this path has no cost confirmation, so guard
    // just the fish-line crossing before launching the flow.
    guardedBuild(cardId) {
        const card = (this.game.lastHand || []).find(c => Number(c.id) === Number(cardId));
        const builtNames = ((this.game.built || {})[this.game.myId()] || []).map(b => b.name);
        const est = card ? rbBuildFishCost(card, builtNames) : 0;
        this.game.confirmFishCross(est, _('Build') + (card ? ' ' + card.name : ''),
            () => this.startBuild(cardId));
    }
    enterInvent() {
        this.enterSubMode(_('Invent — how many cards?'),
            _('Draw N structure cards then discard N; pay N 🐟.'));
        for (let n = 2; n <= 5; n++) {
            this.bga.statusBar.addActionButton(n + ' (' + n + '🐟)', () => this.game.confirmFishCross(
                n, _('Invent') + ' ' + n + ' (' + n + '🐟)',
                () => this.bga.actions.performAction('actInvent', { n })), { color: 'secondary' });
        }
        this.cancelButton();
    }
    onLeavingState() { this.game.clearClickable(); }
}

class AbilityTarget {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        const labels = {
            driftwoodsnag: _('Driftwood Snag — drop a blank on a river card'),
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
        if (!isActive) { this.bga.statusBar.setTitle(_('Choosing starter cards…')); return; }
        this.bga.statusBar.setTitle(_('Choose a species starter card to pre-build'));
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

// Read the active player's private state args. The framework may deliver them
// under args._private.active, under args._private[<playerId>] (it can resolve the
// "active" key to the concrete player id), or — if alwaysMergePrivate() is on —
// merged directly into args. Fall back across every shape so the acting player
// always sees their private peek, including after a page reload.
function privateArgs(bga, args) {
    const p = args && args._private;
    if (!p) return args || {};
    if (p.active) return p.active;
    try {
        const myId = Number(bga.players.getCurrentPlayerId());
        if (p[myId]) return p[myId];
    } catch (e) { /* players not ready */ }
    const vals = Object.values(p);
    return vals.length ? vals[0] : args;
}

class ReactClayVault {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        // topName is a private arg (active player only) — read from _private.
        const topName = (privateArgs(this.bga, args)).topName || '';
        this.bga.statusBar.setTitle(isActive
            ? _('Clay Vault — deck top is ') + topName + _('; swap a hand card or skip')
            : _('Clay Vault…'));
        if (!isActive) return;
        this.game.setHint(_('Click a hand card to swap it for ') + topName + _(', or skip.'));
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

// Stone Pool (top 5) / Vine Curtain (top 2): rearrange the peeked material cards.
// The peek is private and arrives via the materialPeek notification (reliable) or
// the _private state args (best-effort). Because the notification and this state's
// entry can land in either order, we register the live instance on the game so
// notif_materialPeek can push cards in after entry, and we also read any peek that
// already arrived. Title/label name the actual triggering card (n === 2 → Vine
// Curtain), fixing the old always-"Stone Pool" label.
class StonePool {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.isActive = isActive;
        this.order = [];
        // Prefer a peek the notification already delivered; else the _private args.
        const priv = privateArgs(this.bga, args);
        const peek = this.game.materialPeek;
        this.cards = ((peek && peek.cards) || priv.topCards || []).slice();
        this.n = (peek && peek.n) || priv.n || this.cards.length;
        this.game.activeStonePool = isActive ? this : null;
        this.renderTitle();
        if (!isActive) return;
        this.render();
    }
    // Called by notif_materialPeek if the peek arrives after we've entered.
    applyPeek(peek) {
        this.cards = (peek.cards || []).slice();
        this.n = peek.n || this.cards.length;
        this.order = [];
        this.renderTitle();
        if (this.isActive) this.render();
    }
    label() { return this.n === 2 ? _('Vine Curtain') : _('Stone Pool'); }
    renderTitle() {
        const n = this.cards.length || this.n || 0;
        this.bga.statusBar.setTitle(this.isActive
            ? this.label() + ' — ' + _('set the new order of the top') + ' ' + n + ' ' + _('material cards')
            : this.label() + '…');
    }
    render() {
        this.bga.statusBar.removeActionButtons();
        const remaining = this.cards.filter(c => !this.order.includes(c.id));
        this.game.setHint(_('Click cards top-first. Picked: ') +
            (this.order.map(id => MAT_GLYPH[(this.cards.find(c => c.id === id) || {}).material] || '?').join(' ') || '—'));
        remaining.forEach(c => this.bga.statusBar.addActionButton(
            (MAT_GLYPH[c.material] || '?') + ' ' + c.icons, () => { this.order.push(c.id); this.maybeSubmit(); }, { color: 'secondary' }));
        this.bga.statusBar.addActionButton(_('Keep current order'),
            () => this.bga.actions.performAction('actKeepOrder'));
    }
    maybeSubmit() {
        if (this.order.length === this.cards.length) {
            this.bga.actions.performAction('actReorder', { cardIds: this.order });
        } else {
            this.render();
        }
    }
    onLeavingState() { this.game.clearClickable(); this.game.activeStonePool = null; this.game.materialPeek = null; }
}

class VineLattice {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Vine Lattice — keep 1 of the drawn cards') : _('Vine Lattice…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        this.game.setHint(_('Pick one card to keep; the others are discarded.'));
        // offer is a private arg (active player only) — read from _private.
        const offer = privateArgs(this.bga, args).offer || [];
        offer.forEach(c => this.bga.statusBar.addActionButton(
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

class TowLine {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Tow Line — tow a river card to River 1 and auction it (2🐟/item)') : _('Tow Line…'));
        if (!isActive) return;
        this.game.setHint(_('Click a river card to tow to River 1 and auction.'));
        this.game.markClickable('target', args.targets, id => this.bga.actions.performAction('actTowLine', { cardId: id }));
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

class MillWheelBuild {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    onEnteringState(args, isActive) {
        this.bga.statusBar.setTitle(isActive ? _('Mill Wheel — copy a neighbour\'s "when built" effect') : _('Mill Wheel…'));
        if (!isActive) return;
        this.bga.statusBar.removeActionButtons();
        this.game.setHint(_('Pick a neighbour structure to copy its "when built" effect.'));
        (args.options || []).forEach(o => this.bga.statusBar.addActionButton(
            _('Copy ') + o.name,
            () => this.bga.actions.performAction('actMillBuildPick', { card: o.name }), { color: 'secondary' }));
    }
    onLeavingState() { this.game.clearClickable(); }
}

class FinalBuild {
    constructor(game, bga) { this.game = game; this.bga = bga; }
    // MULTIPLE_ACTIVE_PLAYER: players are not yet active in onEnteringState, so
    // the Skip button + clickable hand must be (re)built in onPlayerActivationChange
    // (mirrors Auction). Without this the active player gets a blank action bar with
    // no Skip button and the final-build round soft-locks before scoring.
    onEnteringState(args, isActive) { this.onPlayerActivationChange(args, isActive); }
    onPlayerActivationChange(args, isActive) {
        this.game.clearClickable();
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.setTitle(isActive ? _('Final build — build one structure or skip') : _('Final builds…'));
        if (!isActive) return;
        this.game.setHint(_('One last build: click a hand card, or skip.'));
        // Simultaneous round: each player builds from their own hand, so derive
        // the clickable ids from the rendered hand rather than a shared arg.
        const myHandIds = [...document.querySelectorAll('#rb-hand [data-id]')].map(el => Number(el.dataset.id));
        this.game.markClickable('hand', myHandIds, id => this.startBuild(id, args));
        this.bga.statusBar.addActionButton(_('Skip'), () => this.bga.actions.performAction('actSkipFinal'), { color: 'secondary' });
    }
    // Final build routes through the same cost-modifier choice flow; Cancel just
    // re-renders this round's Skip/hand UI.
    startBuild(cardId, args) {
        launchBuildFlow(this.game, this.bga, cardId, 'actFinalBuild',
            () => this.onPlayerActivationChange(args, true));
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
        const lotDesc = id => {
            const c = this.game.cardById(id);
            if (!c) return _('this lot');
            const mat = c.material + (c.wildAlt ? '/' + c.wildAlt : ''); // wilds name both types
            return `${c.name} (${c.icons}x ${mat})`;
        };
        let lot = lotDesc(a.lotCardId);
        if (a.lotCardId2) lot += ' + ' + lotDesc(a.lotCardId2);
        this.bga.statusBar.setTitle(_('How many workers would you like to send for ') + lot + ' ?');
        this.game.setHint(_('Bid up to ') + maxBid + _(' workers (this lot has ') + a.open + _(' open icons).'));
        // Fish cost of an N-worker bid = N × my discounted per-item rate (you pay
        // for every worker you send, win or lose). Combined lots use the cheaper of
        // the two cards' rates. Exact for a normal swim; Pontoon and forced-rate
        // pulls only lower it, so it's a safe upper bound ("up to").
        let rate = this.game.myAuctionRate(a.lotCardId);
        if (a.lotCardId2) rate = Math.min(rate, this.game.myAuctionRate(a.lotCardId2));
        for (let b = minBid; b <= maxBid; b++) {
            const est = b * rate;
            // Show the fish cost on the button itself so bidders see what each
            // bid costs without opening the confirm dialog. est is the per-worker
            // rate × workers (a safe upper bound; Pontoon / forced rates only lower it).
            this.bga.statusBar.addActionButton(_('Bid ') + b + ' (' + _('pay') + ' ' + est + '🐟)',
                () => this.game.confirmFishCross(
                    est, _('Bid ') + b + _(' worker(s)'),
                    () => this.bga.actions.performAction('actBid', { workers: b }), true));
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
        let rate = this.game.myAuctionRate(args.lotCardId);
        if (args.lotCardId2) rate = Math.min(rate, this.game.myAuctionRate(args.lotCardId2));
        for (let b = minBid; b <= args.maxBid; b++) {
            const est = b * rate;
            this.bga.statusBar.addActionButton(_('Bid ') + b, () => this.game.confirmFishCross(
                est, _('Bid ') + b + _(' worker(s)'),
                () => this.bga.actions.performAction('actDeferredBid', { workers: b }), true));
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
        this.bga.states.register('TowLine', new TowLine(this, bga));
        this.bga.states.register('FlushChannelBuild', new FlushChannelBuild(this, bga));
        this.bga.states.register('PackRat', new PackRat(this, bga));
        this.bga.states.register('SpringCascade', new SpringCascade(this, bga));
        this.bga.states.register('RollingFloat', new RollingFloat(this, bga));
        this.bga.states.register('SalmonRun', new SalmonRun(this, bga));
        this.bga.states.register('Portage', new Portage(this, bga));
        this.bga.states.register('TradingPost', new TradingPost(this, bga));
        this.bga.states.register('Confluence', new Confluence(this, bga));
        this.bga.states.register('MillWheel', new MillWheel(this, bga));
        this.bga.states.register('MillWheelBuild', new MillWheelBuild(this, bga));
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
            `<div class="rb-built-row"><div class="rb-sl-label">${p === me ? _('Your built') : p.name + _(' — built')}</div>` +
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
                <div class="rb-side-col" id="rb-shoreline-col"><div class="rb-sl-label">${_('Shoreline')}</div><div id="rb-shoreline" class="rb-stack"></div></div>
                <div id="rb-right">
                    <div class="rb-built-row"><div class="rb-sl-label">${_('Your hand')}</div><div id="rb-hand" class="rb-hrow"></div></div>
                    ${builtRows}
                </div>
            </div>
            <div class="rb-section" id="rb-draft-section" style="display:none"><h3>${_('Your species starters — choose one')}</h3><div id="rb-draft" class="rb-row"></div></div>
            </div>
        `);

        Object.values(gamedatas.players).forEach(p => {
            this.bga.playerPanels.getElement(p.id).insertAdjacentHTML('beforeend', `
                <div class="rb-panel">
                    <div id="supply-${p.id}" class="rb-supply" title="${_('Workers in supply')}"></div>
                    <div id="materials-${p.id}" class="rb-mats"></div>
                </div>
            `);
            // Fish-track position shown right next to the official BGA VP score,
            // so a player's money reads on the same line as their points.
            const scoreEl = document.getElementById(`player_score_${p.id}`);
            const scoreRow = scoreEl && scoreEl.closest('.player_score');
            if (scoreRow) {
                scoreRow.insertAdjacentHTML('beforeend',
                    `<span id="rb-fishcount-${p.id}" class="rb-fishcount" title="${_('Fish track')}"></span>`);
            }
        });
        this.updateFishCounts();

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
                `<span class="rb-deck-count">${md.remaining}/${md.total} ${_('left')}</span>`);
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
            if (!(c.id in oldRects)) {
                // A new card reaches the board only by the material deck refilling
                // the Headwaters. Slide it from the deck space into its slot AFTER
                // the existing Headwaters cards have shifted right to fill the gap
                // (delay by one slide); fall back to a fade if the deck isn't found.
                const deck = z === 'headwaters' ? this.deckCenter() : null;
                if (deck) {
                    const nc0 = this.animCenter(el);
                    this.flipCard(wrap, deck.x - nc0.x, deck.y - nc0.y, CARD_MOVE_MS);
                } else {
                    wrap.classList.add('rb-card-enter');
                }
                return;
            }
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
    // Screen center of the material-deck slot (source for cards refilling the Headwaters).
    deckCenter() {
        const dc = document.querySelector('#rb-slots .rb-deck-count');
        const slot = dc && dc.closest('.rb-slot');
        return slot ? this.animCenter(slot) : (dc ? this.animCenter(dc) : null);
    }
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
        this.lastHand = hand || [];
        document.getElementById('rb-hand').innerHTML = this.lastHand.map(c => `
            <div class="rb-scard"><div id="card-${c.id}" class="rb-card rb-has-art rb-art rb-art-str rb-p-str-${slugify(c.name)}"
                 data-id="${c.id}" title="${c.effect || ''}">
            </div><div class="rb-reqs" data-reqs="${c.id}"></div></div>`).join('') || '<span class="rb-empty">—</span>';
        this.refreshHandReqs();
        this.applyClickableClasses();
    }

    // My build-cost modifier flags, derived from my built cards (name + used state).
    myBuildFlags() {
        const mine = (this.built || {})[this.myId()] || [];
        const has = name => mine.some(b => b.name === name);
        const used = name => mine.some(b => b.name === name && b.used);
        return {
            cattailMarsh: has('Cattail Marsh'), charcoalPit: has('Charcoal Pit'),
            stoneTool: has('Stone Tool'), stoneToolUsed: used('Stone Tool'),
            treatyStone: has('Treaty Stone'),
            granary: has('Granary'), granaryUsed: used('Granary'),
        };
    }

    // The have/need pills for one hand structure card, floated over its art.
    handReqsHtml(card) {
        const held = (this.materials || {})[this.myId()] || { fixed: {}, wild: [] };
        const wbm = { ...(held.fixed || {}), _wildPools: held.wild || [] };
        const flags = this.myBuildFlags();
        const eff = rbEffectiveBuildCost(card.cost || {}, flags, wbm);
        const have = rbEffectiveCoverage(eff, wbm);
        // Pills show the printed materials only (any material the modifiers add to
        // `eff`, e.g. Treaty Stone's surplus source, is one you provably have).
        // All-green = buildable; no separate READY badge needed.
        return Object.keys(card.cost || {}).map(m => {
            const n = eff[m] != null ? eff[m] : card.cost[m];
            const pure = (held.fixed || {})[m] || 0;
            const got = have[m] || 0;
            const wildAdd = got - pure;
            const ok = got >= n;
            const reduced = n < card.cost[m];
            const count = wildAdd > 0 ? `${pure}+${wildAdd}/${n}` : `${got}/${n}`;
            const ic = `<span class="rb-req-ic"><span class="rb-art rb-art-icon rb-p-icon-${m}"></span></span>`;
            return `<span class="rb-req-pill${ok ? ' rb-req-sat' : ''}"${reduced ? ' title="' + _('reduced by your built effects') + '"' : ''}>${ic}${count}${reduced ? '*' : ''}</span>`;
        }).join('');
    }

    // Repaint just the overlay pills on each hand card (leaves the card art and any
    // selection/clickable state intact) — called on load and on every boardUpdate,
    // since my placed workers (hence coverage) change without the hand contents.
    refreshHandReqs() {
        (this.lastHand || []).forEach(c => {
            const el = document.querySelector(`.rb-reqs[data-reqs="${c.id}"]`);
            if (el) el.innerHTML = this.handReqsHtml(c);
        });
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
        this.built = built || {};
        Object.entries(built || {}).forEach(([pid, list]) => {
            const el = document.getElementById(`built-${pid}`);
            if (el) el.innerHTML = list.map(b => `<div class="rb-scard">${this.builtCardHtml(b)}</div>`).join('') || '<span class="rb-empty">—</span>';
        });
        this.applyClickableClasses();
    }

    // "Peek at the top of the material deck at any time" (Lookout Tree / Marsh
    // Lookout). The top card is private info delivered via getAllDatas / the
    // `peekUpdate` notification, but rather than displaying it permanently we show
    // a button the player triggers on demand. A null peekTop (no lookout, or
    // empty deck) removes the button.
    renderPeek(peekTop) {
        this.peekTop = peekTop || null;
        let btn = document.getElementById('rb-peek-btn');
        if (!this.peekTop) {
            const wrap = document.getElementById('rb-peek-wrap');
            if (wrap) wrap.remove();
            return;
        }
        if (!btn) {
            (document.getElementById('rb-root') || this.bga.gameArea.getElement()).insertAdjacentHTML('beforeend',
                `<span id="rb-peek-wrap"><button id="rb-peek-btn" class="rb-peek-btn"` +
                ` title="${_('Lookout: reveal the top card of the material deck')}">🔭 ${_('Peek deck top')}</button>` +
                `<span id="rb-peek-reveal" class="rb-peek-reveal" hidden></span></span>`);
            document.getElementById('rb-peek-btn').addEventListener('click', () => {
                const r = document.getElementById('rb-peek-reveal');
                r.hidden = !r.hidden;
                this.paintPeekReveal();
            });
        }
        this.paintPeekReveal(); // keep an already-open reveal current as the deck top changes
    }
    paintPeekReveal() {
        const r = document.getElementById('rb-peek-reveal');
        if (!r || r.hidden) return;
        r.innerHTML = this.peekTop ? ` ${MAT_GLYPH[this.peekTop.material] || ''} ${this.peekTop.icons}` : ` ${_('(deck empty)')}`;
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
        this.materials = materials || {};
        Object.entries(materials || {}).forEach(([pid, held]) => {
            const el = document.getElementById(`materials-${pid}`);
            if (!el) return;
            const fixed = Object.entries(held.fixed || {}).map(([m, n]) => `${n}${matIcon(m)}`);
            const wild = (held.wild || []).map(w => `${w.count}${matIcon(w.materials[0])}/${matIcon(w.materials[1])}`);
            const all = [...fixed, ...wild];
            el.innerHTML = all.length ? all.join(' ') : `<span class="rb-empty">${_('no materials yet')}</span>`;
        });
        this.refreshHandReqs(); // my holdings changed → repaint hand have/need pills
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
    myFish() { const p = this.players[this.myId()]; return p ? Number(p.fish) || 0 : 0; }
    amRetired() { const p = this.players[this.myId()]; return p ? !!Number(p.retired) : false; }
    // Per-item auction discount my built cards grant on a given material, mirroring
    // Effects::auctionDiscount / MATERIAL_DISCOUNTS.
    auctionDiscount(material) {
        const D = { reeds: { 'Reed Bed': 1, 'Kelp Bed': 1 }, mud: { 'Mud Burrow': 1 }, clay: { 'Clay Den': 2 } };
        const names = ((this.built || {})[this.myId()] || []).map(b => b.name);
        return Object.entries(D[material] || {}).reduce((t, [n, a]) => t + (names.includes(n) ? a : 0), 0);
    }
    // My effective per-item fish rate on a lot card: printed positional rate
    // (slot+1) minus my material discounts, min 1 (Effects::perItemForPlayer). This
    // is exact for a normal river swim; it can only *over*-estimate for forced-rate
    // pulls (e.g. Snag Pile auctions at 1/item — not known client-side), so a bid
    // built from it is a safe upper bound.
    myAuctionRate(cardId) {
        const c = this.cardById(cardId);
        if (!c) return 1;
        const base = (Number(c.slot) || 0) + 1;
        return Math.max(1, base - this.auctionDiscount(c.material));
    }
    // Fish-line guard. If an action's fish cost would move me to or past the
    // finish line (retiring my beaver — no more turns), confirm before committing.
    // For bids, billable workers == the bid exactly (you pay for every worker you
    // send, win or lose — Auction::billableWorkers), and the rate is my discounted
    // per-item rate, so the estimate is exact save for two effects that only *lower*
    // it — Pontoon (shaves 1 when jammed) and forced-rate pulls. Hence approx=true
    // makes the dialog say "up to" (a safe upper bound), not a guess about rivals.
    // Below the line, or already retired, we just proceed(). Mirrors the server's
    // inclusive `fish >= FISH_LINE` retirement check (NextPlayer.php).
    confirmFishCross(estCost, label, proceed, approx = false) {
        const line = Number(this.fishLine) || 90;
        const projected = this.myFish() + Math.max(0, Number(estCost) || 0);
        if (this.amRetired() || projected < line) { proceed(); return; }
        const amt = approx ? (_('up to') + ' ') : '';
        const msg = `<b>${label}</b><br>`
            + _('This moves you to') + ` ${amt}<b>${projected}🐟</b> `
            + _('of the') + ` ${line}🐟 ` + _('finish line, retiring your beaver (no more turns).')
            + `<br>${_('Continue?')}`;
        this.bga.dialogs.confirmation(msg).then(ok => { if (ok) proceed(); });
    }
    // A one-line warning to append to an existing confirmation dialog when a
    // fish cost of `estCost` would move me to/past the finish line. Empty string
    // otherwise (or if already retired), so it drops cleanly into any message.
    fishCrossNote(estCost) {
        const line = Number(this.fishLine) || 90;
        const projected = this.myFish() + Math.max(0, Number(estCost) || 0);
        if (this.amRetired() || projected < line) return '';
        return `<br>⚠️ ${_('This retires your beaver')} (${projected}🐟 ≥ ${line}🐟) — ${_('no more turns.')}`;
    }
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

    // Private peek at the top material cards for Stone Pool / Vine Curtain. Stored
    // on the game so the StonePool state picks it up whether the notification lands
    // before or after the state is entered (see StonePool.onEnteringState/applyPeek).
    async notif_materialPeek(args) {
        this.materialPeek = { cards: args.cards || [], n: Number(args.n) || (args.cards || []).length };
        if (this.activeStonePool) this.activeStonePool.applyPeek(this.materialPeek);
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
        this.updateFishCounts();
        this.refreshHandReqs(); // my placed workers changed → repaint hand have/need pills
    }

    // Fish-track total next to each player's VP score. Kept in sync with the
    // track pawns; sits on the same line as the official BGA score counter.
    updateFishCounts() {
        Object.values(this.players).forEach(p => {
            const el = document.getElementById(`rb-fishcount-${p.id}`);
            if (el) el.textContent = `${Number(p.fish) || 0}🐟`;
        });
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
    async notif_finalScores(args) { this.showFinalScores(args.scores || []); }

    // End-of-game scoring dialog: a grid of VP components (rows) per player
    // (columns) revealed row-by-row, with a Total. Dismissible.
    showFinalScores(scores) {
        if (!scores.length || document.querySelector('.rb-score-backdrop')) return;
        const labels = [];
        scores.forEach(s => (s.rows || []).forEach(r => { if (!labels.includes(r.label)) labels.push(r.label); }));
        const valOf = (s, label) => { const r = (s.rows || []).find(x => x.label === label); return r ? r.vp : null; };
        let html = `<div class="rb-score-panel"><h2>${_('Final scores')}</h2><table class="rb-score-table"><thead><tr><th></th>`;
        scores.forEach(s => { html += `<th>${s.name}</th>`; });
        html += '</tr></thead><tbody>';
        labels.forEach((label, i) => {
            html += `<tr style="animation-delay:${(i * 0.12).toFixed(2)}s"><td class="rb-score-cat">${_(label)}</td>`;
            scores.forEach(s => { const v = valOf(s, label); html += `<td>${v === null ? '·' : v}</td>`; });
            html += '</tr>';
        });
        html += `<tr class="rb-score-total" style="animation-delay:${(labels.length * 0.12).toFixed(2)}s"><td>${_('Total')}</td>`;
        scores.forEach(s => { html += `<td>${s.total}</td>`; });
        html += `</tr></tbody></table><button class="rb-score-close">${_('Close')}</button></div>`;
        const back = document.createElement('div');
        back.className = 'rb-score-backdrop';
        back.innerHTML = html;
        back.addEventListener('click', e => { if (e.target === back || e.target.closest('.rb-score-close')) back.remove(); });
        document.body.appendChild(back);
    }

    // Log-only notifications (messages show in the game log; no UI work needed).
    async notif_turnInfo() {}
    async notif_auctionStarted() {}
    async notif_auctionBids() {}
    async notif_auctionResolved() {}
    async notif_defer() {}
    // Salt Lick (when built): a one-time look at every opponent's hand. Rather
    // than auto-popping, stash the snapshot and offer a button to view it.
    async notif_peekHands(args) {
        this.peekHands = args.hands || {};
        if (!Object.keys(this.peekHands).length || document.getElementById('rb-spy-btn')) return;
        (document.getElementById('rb-root') || this.bga.gameArea.getElement()).insertAdjacentHTML('beforeend',
            `<button id="rb-spy-btn" class="rb-peek-btn"` +
            ` title="${_('Salt Lick: the opponent hands you saw when it was built')}">👁 ${_("Opponents' hands")}</button>`);
        document.getElementById('rb-spy-btn').addEventListener('click', () => this.showHandsDialog());
    }
    showHandsDialog() {
        if (!this.peekHands || document.querySelector('.rb-score-backdrop')) return;
        let html = `<div class="rb-score-panel"><h2>${_("Opponents' hands")}</h2>` +
            `<div class="rb-spy-note">${_('Snapshot from when Salt Lick was built.')}</div>`;
        Object.entries(this.peekHands).forEach(([pid, cards]) => {
            const list = (cards && cards.length)
                ? cards.map(c => `${c.name} (${costStr(c.cost)}${c.vpLabel && c.vpLabel !== '0' ? ', ' + c.vpLabel + ' VP' : ''})`).join('; ')
                : _('no cards');
            html += `<div class="rb-spy-player"><b>${this.playerName(pid)}</b>: ${list}</div>`;
        });
        html += `<button class="rb-score-close">${_('Close')}</button></div>`;
        const back = document.createElement('div');
        back.className = 'rb-score-backdrop';
        back.innerHTML = html;
        back.addEventListener('click', e => { if (e.target === back || e.target.closest('.rb-score-close')) back.remove(); });
        document.body.appendChild(back);
    }
    async notif_build() {}
    async notif_flush() {}
    async notif_invent() {}
    async notif_abilityUsed() {}
    async notif_retire() {}
    async notif_shorelinePenalty() {}
    async notif_workerRecalled() {} // stats-only marker; the board repaints via boardUpdate
}
