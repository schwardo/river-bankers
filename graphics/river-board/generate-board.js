#!/usr/bin/env node
// River Bankers board generator — produces one SVG per variant.
//
// Variants:
//   bifold     — TGC bi-fold board 9"×18", fish track on perimeter, center fold
//   mat        — TGC small neoprene mat 10"×16", fish track on perimeter, no fold
//   mat-nofish — TGC small neoprene mat 10"×16", NO fish track (lives on a
//                companion piece) → freed area for slightly larger card region
//
// Each SVG is drawn in play orientation (landscape). For print, the bi-fold
// artwork must be rotated -90° to match the TGC portrait template; the mat
// templates are portrait too (10W × 16H) — same rotation step at print time.
//
// 100 px / inch throughout. Origin = top-left of trim.

const fs = require('fs');
const path = require('path');

const PX_PER_IN = 100;
const CARD_W = 3.5 * PX_PER_IN;        // 350
const CARD_H = 2.5 * PX_PER_IN;        // 250
const BLEED = 0.125 * PX_PER_IN;       // 12.5
const SAFE_INSET = 0.125 * PX_PER_IN;  // 12.5

const VARIANTS = [
  {
    id: 'mat-nofish',
    label: 'River Bankers — TGC Small Game Mat 10×16 (fish track off-mat)',
    widthIn: 16, heightIn: 10,
    rounded: 0.5,
    band: 0,
    hasFishTrack: false,
    hasFold: false,
    deckOnBoard: true,         // shown as a card-back image above River 4
    deckOverCol: 4,            // column index where the deck silhouette lives
    deckIsCardBack: true,      // render via the printed card-back image
    edgeMarginIn: 0.25,        // curl-safety margin
    centerRows: true,          // center the 4-column rows horizontally
    slotGapPx: 25,             // breathing room between adjacent slots
    shorelineFixedSx: 1549.5,  // shoreline box's left edge stays at this
                               // absolute x; content is positioned so the
                               // padding to safe-zone-left == padding to here
    showTitle: false,          // logo replaces the text title
    logoBetweenRows: true,
    shorelineAtRightEdgeCenter: true,  // double-chevron at right edge center
    riverCardsTall: 2,         // each river slot fits 2 cards vertically
    showIconLegend: true,      // legend explaining card/worker cost icons
    flowArrowIntoR1: true,     // funnel arrow from HW area into top of R1
    flowArrowR4ToEdge: true,   // horizontal flow arrow R4 → right edge
    hwBoxed: true,             // outer frame around each HW slot, internal
                               // header strip (label + costs); card outline
                               // below — matches river slot structure
    deckBoxed: false,          // deck stays unframed (image + overlay label)
    edgeMarginIn: 0.125,       // override: snug to safe zone (was 0.25 curl margin)
    bgImagePath: '../../artwork/starter-card-back.png',
    bgImageOpacity: 1.0,       // background art shows at full strength
    bgTintColor: null,         // no tint layer; slots themselves carry the tint
    showFlushBox: true,        // "pay 5 to flush HW + auction" info box
    hideGuides: true,          // suppress trim/safe/bleed/fold print guides
    fullBleedBg: true,         // background image extends through bleed
    reverseHwOrder: true,      // HW row reads L→R as Deck, HW3, HW2, HW1
                               // (cards progress rightward from upstream toward river)
    arrowColor: '#fff',        // flow arrows + chevrons rendered white so they
                               // stand out against the background art
    arrowOutline: '#1d3f4d',   // dark outline for legibility
    outFile: 'river-board.svg',
  },
];

// ---------- per-variant layout ----------
function computeLayout(v) {
  const W = v.widthIn * PX_PER_IN;
  const H = v.heightIn * PX_PER_IN;
  const band = v.band;
  const edgeMargin = (v.edgeMarginIn || 0) * PX_PER_IN;

  const inset = band + edgeMargin;
  const IX0 = inset, IY0 = inset;
  const IX1 = W - inset, IY1 = H - inset;
  const IW = IX1 - IX0, IH = IY1 - IY0;

  const slotGap = v.slotGapPx || 0;

  // Row width depends on how many columns the row occupies. River always
  // has 4. HW has 3 by default, but variants that put the deck in HW row
  // use 4 columns (HW1, HW2, HW3, Deck) aligned over R1..R4.
  const hwCols = (v.deckOnBoard && v.deckOverCol) ? 4 : 3;
  const riverCols = 4;

  const rowWidth = (cols) => cols * CARD_W + (cols - 1) * slotGap;

  // Center each row in IW when v.centerRows; otherwise use rowLeftMarginPx.
  // When v.shorelineFixedSx is set, place the rows so the padding from
  // safe-zone-left to content-left equals the padding from content-right
  // to the shoreline box's left edge.
  let HW_X0, RIVER_X0, shorelineX = null;
  if (v.shorelineFixedSx != null) {
    shorelineX = v.shorelineFixedSx;
    HW_X0    = (IX0 + shorelineX - rowWidth(hwCols))    / 2;
    RIVER_X0 = (IX0 + shorelineX - rowWidth(riverCols)) / 2;
  } else if (v.centerRows) {
    HW_X0    = IX0 + (IW - rowWidth(hwCols))    / 2;
    RIVER_X0 = IX0 + (IW - rowWidth(riverCols)) / 2;
  } else {
    HW_X0    = IX0 + (v.rowLeftMarginPx || 0);
    RIVER_X0 = IX0 + (v.rowLeftMarginPx || 0);
  }

  // River slot can be taller than a single card to hold a visible pile.
  // When multi-card, reserve a title strip at the top of the slot for the
  // label + per-item cost so they're not covered by placed cards.
  const riverCardsTall = v.riverCardsTall || 1;
  const RIVER_TITLE_STRIP = (riverCardsTall > 1) ? 44 : 0;
  const riverSlotH = RIVER_TITLE_STRIP + CARD_H * riverCardsTall;

  // HW slot dimensions. When hwBoxed, the slot grows to include a header
  // strip at the top (label + 2 cost rows on ONE line) matching the river
  // slot's title strip layout. HW_FOOTER_PAD adds bottom padding so the
  // dashed card outline has the same 10px inset on left/right/bottom.
  const HW_HEADER_STRIP = v.hwBoxed ? 44 : 0;
  const HW_FOOTER_PAD   = v.hwBoxed ? 6  : 0;
  const hwSlotH = HW_HEADER_STRIP + CARD_H + HW_FOOTER_PAD;

  // Vertical layout: top margin, HW row, central gap (logo lives here),
  // River row, bottom margin.
  // For multi-card river slots, chevrons sit INSIDE the slot below the
  // cards and must remain inside the safe zone. Reserve ~34px between
  // RIVER_BOTTOM and the safe-zone bottom (= SAFE_INSET from trim).
  const SAFE_BOTTOM_Y = H - SAFE_INSET;
  const usableH = (riverCardsTall > 1)
    ? (SAFE_BOTTOM_Y - IY0 - 30)   // chevrons fit between RIVER_BOTTOM and safe-bottom
    : IH;
  const ROWS_TOTAL = hwSlotH + riverSlotH;
  const minGap = 60;
  const idealGap = (v.logoBetweenRows) ? 280 : 100;
  // hwBoxed snugs HW to the safe-zone top (no top padding past IY0).
  const TOP_PAD = v.hwBoxed ? 0 : (v.showTitle ? 70 : 25);
  // When the river slot extends to the bleed, no external bot pad is needed.
  const BOT_PAD = (riverCardsTall > 1) ? 0 : 35;
  const remaining = usableH - ROWS_TOTAL - TOP_PAD - BOT_PAD;
  const GAP = Math.max(minGap, Math.min(idealGap, remaining));
  const slack = remaining - GAP;
  const topPad = TOP_PAD + Math.max(0, slack / 2);

  const TITLE_Y = IY0 + 38;
  const HW_Y = IY0 + topPad;
  const HW_BOTTOM = HW_Y + hwSlotH;
  const RIVER_Y = HW_BOTTOM + GAP;
  const RIVER_BOTTOM = RIVER_Y + riverSlotH;

  const colX = (rowX0, col) => rowX0 + (col - 1) * (CARD_W + slotGap);
  // HW column index: when reversed, slot i lives in column (5 - i) so
  // the L→R order is Deck (col 1), HW3 (col 2), HW2 (col 3), HW1 (col 4).
  const hwCol = (i) => v.reverseHwOrder ? (5 - i) : i;
  const hwSlot    = (i) => ({
    x: colX(HW_X0, hwCol(i)), y: HW_Y, w: CARD_W, h: hwSlotH,
    cardH: CARD_H, headerStrip: HW_HEADER_STRIP,
  });
  const riverSlot = (i) => ({
    x: colX(RIVER_X0, i), y: RIVER_Y, w: CARD_W, h: riverSlotH,
    cardH: CARD_H, cardsTall: riverCardsTall,
    titleStrip: RIVER_TITLE_STRIP,
  });

  // Material deck: either in the right gutter (current bi-fold position)
  // or sitting in the HW row as a 4th column above R4. When HW is boxed,
  // the deck adopts the same outer-frame + header-strip structure for
  // visual alignment with the HW slots.
  let deck = null;
  if (v.deckOnBoard) {
    if (v.deckOverCol) {
      // When the HW row is reversed, the deck moves to the leftmost
      // column (col 1) regardless of the configured deckOverCol.
      const deckCol = v.reverseHwOrder ? 1 : v.deckOverCol;
      deck = {
        x: colX(HW_X0, deckCol), y: HW_Y,
        w: CARD_W, h: hwSlotH,
        cardH: CARD_H, headerStrip: HW_HEADER_STRIP,
        aligned: true,
      };
    } else {
      deck = {
        x: colX(HW_X0, 4), y: HW_Y,
        w: CARD_W, h: CARD_H, cardH: CARD_H, headerStrip: 0,
        aligned: false,
      };
    }
  }

  return {
    v, W, H, band, edgeMargin,
    IX0, IY0, IX1, IY1, IW, IH,
    TITLE_Y, HW_Y, HW_BOTTOM, GAP, RIVER_Y, RIVER_BOTTOM,
    HW_X0, RIVER_X0, hwCols, riverCols, slotGap,
    hwSlot, riverSlot, deck,
    shorelineX,
    foldX: v.hasFold ? W / 2 : null,
  };
}

// ---------- fish track ----------
// 60 cells around perimeter, numbered 0..59 starting at TOP-LEFT corner
// and going CLOCKWISE (right along top first).
function buildFishCells(layout) {
  const { W, H, band } = layout;
  if (band === 0) return [];
  const cells = [];
  const longCellW = (W - 2 * band) / 19;
  const shortCellH = (H - 2 * band) / 9;
  const rounded = layout.v.rounded * PX_PER_IN;  // corner radius in px

  const cornerR = (n, x, y) => ({ n, kind: 'corner', x, y, w: band, h: band, rounded });
  cells.push(cornerR(0, 0, 0));                    // top-left
  for (let k = 1; k <= 19; k++) {
    cells.push({ n: k, kind: 'edge', x: band + (k - 1) * longCellW, y: 0, w: longCellW, h: band });
  }
  cells.push(cornerR(20, W - band, 0));            // top-right
  for (let k = 1; k <= 9; k++) {
    cells.push({ n: 20 + k, kind: 'edge', x: W - band, y: band + (k - 1) * shortCellH, w: band, h: shortCellH });
  }
  cells.push(cornerR(30, W - band, H - band));     // bottom-right
  for (let k = 1; k <= 19; k++) {
    cells.push({ n: 30 + k, kind: 'edge', x: (W - band) - k * longCellW, y: H - band, w: longCellW, h: band });
  }
  cells.push(cornerR(50, 0, H - band));            // bottom-left
  for (let k = 1; k <= 9; k++) {
    cells.push({ n: 50 + k, kind: 'edge', x: 0, y: (H - band) - k * shortCellH, w: band, h: shortCellH });
  }
  return cells;
}

// ---------- SVG helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function rect({ x, y, w, h, ...attrs }) {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" ${a}/>`;
}
function text({ x, y, content, ...attrs }) {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" ${a}>${esc(content)}</text>`;
}

function costGroup(cx, cy, n, size, color) {
  const digits = String(n);
  const numW = size * 0.62 * digits.length;
  const iconW = size * 1.35;
  const gap = size * 0.18;
  const totalW = numW + gap + iconW;
  const numCx = cx - totalW / 2 + numW / 2;
  const iconX = cx - totalW / 2 + numW + gap;
  const iconY = cy - size * 0.50;
  return [
    text({
      x: numCx, y: cy + size * 0.32, content: digits,
      'text-anchor': 'middle', 'font-size': size, 'font-weight': 'bold', fill: color,
    }),
    `<use xlink:href="#fish" x="${iconX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${iconW.toFixed(2)}" height="${size.toFixed(2)}"/>`,
  ].join('');
}

// costRow: [type-icon] [N] [fish-icon] centered at (cx, cy).
//   type = 'action' (card glyph)  → cost to trigger an auction
//   type = 'item'   (worker glyph) → cost per worker placed
function costRow(cx, cy, type, value, size, color) {
  const iconName = (type === 'action') ? 'card-cost' : 'worker-cost';
  const typeIconW = (type === 'action') ? size * 1.42 : size * 1.0;
  const digits = String(value);
  const numW = size * 0.62 * digits.length;
  const fishW = size * 1.35;
  const gap = size * 0.16;
  const totalW = typeIconW + gap + numW + gap + fishW;
  const startX = cx - totalW / 2;
  const iconY = cy - size / 2;
  const numCx = startX + typeIconW + gap + numW / 2;
  const fishX = startX + typeIconW + gap + numW + gap;
  return [
    `<use xlink:href="#${iconName}" x="${startX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${typeIconW.toFixed(2)}" height="${size.toFixed(2)}"/>`,
    text({
      x: numCx, y: cy + size * 0.32, content: digits,
      'text-anchor': 'middle', 'font-size': size, 'font-weight': 'bold', fill: color,
    }),
    `<use xlink:href="#fish" x="${fishX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${fishW.toFixed(2)}" height="${size.toFixed(2)}"/>`,
  ].join('');
}

// Path for a rounded-corner cell whose OUTER corner follows the mat's
// rounded trim (used at the 4 corner cells of mats with rounded corners).
// Direction: which corner of the cell is rounded — 'tl' | 'tr' | 'br' | 'bl'.
function roundedCornerCellPath(c, direction) {
  const { x, y, w, h, rounded: r } = c;
  if (!r) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  switch (direction) {
    case 'tl': // top-left corner of the mat
      return `M ${x + r} ${y} H ${x + w} V ${y + h} H ${x} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    case 'tr': // top-right
      return `M ${x} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h} H ${x} Z`;
    case 'br': // bottom-right
      return `M ${x} ${y} H ${x + w} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x} Z`;
    case 'bl': // bottom-left
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} Z`;
    default:
      return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
}

// ---------- assemble SVG ----------
function buildSvg(layout) {
  const { v, W, H, band, IX0, IY0, IX1, IY1, IW, IH,
          TITLE_Y, HW_Y, HW_BOTTOM, RIVER_Y, RIVER_BOTTOM,
          HW_X0, RIVER_X0, hwSlot, riverSlot, deck, foldX } = layout;
  const cells = buildFishCells(layout);
  const cornerR = v.rounded * PX_PER_IN;

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  // SVG dimensions include the 1/8" bleed so width/height match the viewBox.
  const bleedIn = BLEED / PX_PER_IN;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  width="${v.widthIn + 2 * bleedIn}in" height="${v.heightIn + 2 * bleedIn}in"
  viewBox="${-BLEED} ${-BLEED} ${W + 2 * BLEED} ${H + 2 * BLEED}"
  font-family="'Georgia', 'Iowan Old Style', 'Times New Roman', serif">`);
  parts.push(`<title>River Bankers — ${esc(v.label)} (play orientation)</title>`);

  // ---- defs ----
  parts.push(`<defs>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cfeaf4"/>
      <stop offset="100%" stop-color="#7cb6d2"/>
    </linearGradient>
    <linearGradient id="hwwater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e6f3f8"/>
      <stop offset="100%" stop-color="#a8d1e3"/>
    </linearGradient>
    <!-- Slot fade gradients: 90% alpha at top, 60% at bottom, so the
         background art is more visible toward the bottom of each slot. -->
    <linearGradient id="hw-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#eaf4fa" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#eaf4fa" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="river-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#d8ecf3" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#d8ecf3" stop-opacity="0.6"/>
    </linearGradient>
    <pattern id="bank" x="0" y="0" width="46" height="46" patternUnits="userSpaceOnUse">
      <rect width="46" height="46" fill="#a8895a"/>
      <circle cx="9"  cy="11" r="1.6" fill="#7a5e36" opacity="0.55"/>
      <circle cx="31" cy="20" r="1.6" fill="#7a5e36" opacity="0.55"/>
      <circle cx="18" cy="34" r="1.2" fill="#7a5e36" opacity="0.45"/>
      <circle cx="38" cy="38" r="1.2" fill="#7a5e36" opacity="0.45"/>
      <circle cx="4"  cy="29" r="1.0" fill="#7a5e36" opacity="0.4"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#244c5a"/>
    </marker>
    <marker id="arrow-white" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#fff" stroke="#1d3f4d" stroke-width="0.6"/>
    </marker>
    <marker id="arrow-bold" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#244c5a"/>
    </marker>
    <symbol id="fish" viewBox="0 0 100 50">
      <path d="M 25 25 L 3 8 L 12 25 L 3 42 Z" fill="#2d527a"/>
      <path d="M 25 25 Q 25 5 55 5 Q 88 5 95 25 Q 88 45 55 45 Q 25 45 25 25 Z"
            fill="#4a82b0" stroke="#1d3f4d" stroke-width="2"/>
      <ellipse cx="62" cy="35" rx="22" ry="6" fill="#c5dbeb" opacity="0.55"/>
      <path d="M 50 14 Q 45 25 50 36" fill="none" stroke="#1d3f4d" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="80" cy="20" r="3.8" fill="#fff"/>
      <circle cx="81" cy="20" r="2" fill="#1a1a1a"/>
    </symbol>
    <!-- Auction-action cost icon: a stylized material card. Means "this is
         the cost to TRIGGER an auction on a card in this slot." -->
    <symbol id="card-cost" viewBox="0 0 80 56">
      <rect x="4" y="4" width="72" height="48" rx="5" ry="5"
            fill="#f0e5cf" stroke="#5a3a00" stroke-width="3"/>
      <rect x="4" y="4" width="72" height="14" rx="5" ry="5"
            fill="#7a5230" stroke="#5a3a00" stroke-width="3"/>
      <circle cx="18" cy="36" r="4" fill="#5a3a00"/>
      <circle cx="32" cy="36" r="4" fill="#5a3a00"/>
      <circle cx="46" cy="36" r="4" fill="#5a3a00"/>
      <circle cx="60" cy="36" r="4" fill="#5a3a00"/>
    </symbol>
    <!-- Per-item cost icon: a worker disc. Means "this is the cost EACH
         worker you place pays in fish." -->
    <symbol id="worker-cost" viewBox="0 0 50 50">
      <circle cx="25" cy="27" r="18" fill="#3a2510" opacity="0.3"/>
      <circle cx="25" cy="25" r="18" fill="#8b6f44" stroke="#3a2510" stroke-width="3"/>
      <ellipse cx="20" cy="17" rx="7" ry="4" fill="#c5a87a" opacity="0.6"/>
    </symbol>
    <!-- A trim-shaped clip so the bank pattern + water don't bleed past the
         rounded corners of the mat. -->
    <clipPath id="trim-clip">
      ${cornerR
        ? `<rect x="0" y="0" width="${W}" height="${H}" rx="${cornerR}" ry="${cornerR}"/>`
        : `<rect x="0" y="0" width="${W}" height="${H}"/>`}
    </clipPath>
  </defs>`);

  // Shared arrow appearance for all flow markers + chevrons.
  const FLOW_STROKE = 3;
  const ARROW_COLOR = v.arrowColor || '#244c5a';
  const ARROW_MARKER = (v.arrowColor === '#fff') ? 'arrow-white' : 'arrow';

  // ---- background ----
  // Full-bleed image: rendered OUTSIDE the trim clip so the printer can
  // cut anywhere within the bleed without revealing a white edge.
  if (v.bgImagePath && v.fullBleedBg) {
    parts.push(`<image xlink:href="${v.bgImagePath}"
      x="${-BLEED}" y="${-BLEED}"
      width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"
      preserveAspectRatio="xMidYMid slice"
      opacity="${v.bgImageOpacity ?? 0.5}"/>`);
    if (v.bgTintColor) {
      parts.push(rect({
        x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED,
        fill: v.bgTintColor, opacity: v.bgTintOpacity ?? 0.35,
      }));
    }
  }
  // Everything else still respects the trim shape (mostly cosmetic for
  // rounded-corner mats so non-image backgrounds don't bleed past).
  parts.push(`<g clip-path="url(#trim-clip)">`);
  if (v.bgImagePath && !v.fullBleedBg) {
    parts.push(`<image xlink:href="${v.bgImagePath}"
      x="${-BLEED}" y="${-BLEED}"
      width="${W + 2 * BLEED}" height="${H + 2 * BLEED}"
      preserveAspectRatio="xMidYMid slice"
      opacity="${v.bgImageOpacity ?? 0.5}"/>`);
    if (v.bgTintColor) {
      parts.push(rect({
        x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED,
        fill: v.bgTintColor, opacity: v.bgTintOpacity ?? 0.35,
      }));
    }
  } else if (!v.bgImagePath && band > 0) {
    parts.push(rect({ x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED, fill: 'url(#bank)' }));
    parts.push(rect({ x: IX0, y: IY0, w: IW, h: IH, fill: 'url(#water)' }));
  } else if (!v.bgImagePath) {
    parts.push(rect({ x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED, fill: 'url(#water)' }));
  }
  if (!v.bgImagePath) {
    parts.push(rect({
      x: IX0, y: IY0, w: IW, h: HW_BOTTOM + 20 - IY0,
      fill: 'url(#hwwater)', opacity: 0.55,
    }));
  }

  // ---- fold guide (only when applicable) ----
  if (foldX != null) {
    parts.push(`<line x1="${foldX}" y1="${IY0}" x2="${foldX}" y2="${IY1}"
      stroke="#fff" stroke-width="1.5" stroke-dasharray="8,8" opacity="0.35"/>`);
  }

  // ---- fish-track cells ----
  if (cells.length) {
    parts.push(`<g id="fish-track" stroke="#5a4422" stroke-width="2" fill="none">`);
    for (const c of cells) {
      if (c.kind === 'corner' && cornerR) {
        const dir = (c.n === 0) ? 'tl' : (c.n === 20) ? 'tr' : (c.n === 30) ? 'br' : 'bl';
        parts.push(`<path d="${roundedCornerCellPath(c, dir)}" fill="none" stroke="#5a4422" stroke-width="2"/>`);
      } else {
        parts.push(rect({ x: c.x, y: c.y, w: c.w, h: c.h, fill: 'none' }));
      }
    }
    parts.push(`</g>`);

    // Cell numbers
    parts.push(`<g id="fish-track-labels" font-weight="bold" text-anchor="middle" dominant-baseline="middle">`);
    for (const c of cells) {
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const big = (c.n % 10 === 0);
      parts.push(text({
        x: cx, y: cy, content: c.n,
        'font-size': big ? 28 : 20,
        fill: big ? '#7c2410' : '#3a2a14',
      }));
    }
    parts.push(`</g>`);

    // START marker on cell 0
    const c0 = cells.find(c => c.n === 0);
    parts.push(rect({
      x: c0.x + 3, y: c0.y + 3, w: c0.w - 6, h: c0.h - 6,
      fill: 'none', stroke: '#7c2410', 'stroke-width': 4,
    }));
    parts.push(text({
      x: c0.x + c0.w + 14, y: c0.y + c0.h - 8,
      content: 'START', 'text-anchor': 'start',
      'font-size': 14, fill: '#7c2410', 'font-weight': 'bold',
    }));
  }
  parts.push(`</g>`);  // end background clip

  // ---- title strip (text-only variants) ----
  if (v.showTitle !== false) {
    parts.push(text({
      x: W / 2, y: TITLE_Y,
      content: 'RIVER  BANKERS',
      'text-anchor': 'middle', 'font-size': 30, 'font-weight': 'bold',
      fill: '#244c5a', 'letter-spacing': '6',
    }));
  }

  // ---- River Bankers logo (between HW and River rows when configured) ----
  if (v.logoBetweenRows) {
    // Logo image is 2653×994 (aspect ~2.668). Center it horizontally in the
    // mat and fit within the central gap, leaving a little vertical padding.
    const LOGO_W_NATIVE = 2653;
    const LOGO_H_NATIVE = 994;
    const padY = 20;
    const maxH = layout.GAP - 2 * padY;
    const maxW = layout.IW - 60;
    // Fit the available gap. (User previously asked to halve the logo when
    // the gap was much taller; the multi-card river slot now compresses the
    // gap, so fitting it naturally already gives a small, balanced logo.)
    const scale = Math.min(maxH / LOGO_H_NATIVE, maxW / LOGO_W_NATIVE);
    const logoW = LOGO_W_NATIVE * scale;
    const logoH = LOGO_H_NATIVE * scale;
    const logoX = (W - logoW) / 2;
    const logoY = layout.HW_BOTTOM + (layout.GAP - logoH) / 2;
    parts.push(`<image xlink:href="../../artwork/logo.png"
      x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}"
      width="${logoW.toFixed(2)}" height="${logoH.toFixed(2)}"
      preserveAspectRatio="xMidYMid meet"/>`);
  }

  // ---- Headwaters row ----
  // hwBoxed: outer solid frame + internal header strip (label + costs)
  //          + card-sized dashed outline below. Mirrors the river slot
  //          structure so HW spaces read visually similar to River spaces.
  // Otherwise: plain dashed slot with internal label + centered costs.
  parts.push(`<g id="headwaters">`);
  for (let i = 1; i <= 3; i++) {
    const s = hwSlot(i);
    if (v.hwBoxed) {
      // Outer solid frame — fade gradient from 90% at top to 60% at
      // bottom so the background art is more visible toward the bottom.
      parts.push(rect({
        x: s.x, y: s.y, w: s.w, h: s.h,
        rx: 0, ry: 0,
        fill: 'url(#hw-fade)',
        stroke: '#244c5a', 'stroke-width': 4,
      }));
      // Header strip: "Headwaters N" left, action cost middle, per-item
      // cost right — all on ONE line, matching the river title strip.
      const titleY = s.y + 28;
      parts.push(text({
        x: s.x + 12, y: titleY,
        content: `Headwaters ${i}`,
        'text-anchor': 'start', 'font-size': 20, 'font-weight': 'bold',
        fill: '#244c5a',
      }));
      parts.push(costRow(s.x + s.w * 0.62, s.y + 22, 'action', i + 1, 20, '#5a3a00'));
      parts.push(costRow(s.x + s.w * 0.87, s.y + 22, 'item',   1,     20, '#5a3a00'));
      // Card-sized dashed outline below the header — border only; the
      // slot frame's translucent fill provides the area tint.
      parts.push(rect({
        x: s.x + 10, y: s.y + s.headerStrip + 4,
        w: s.w - 20, h: s.cardH - 8,
        rx: 8, ry: 8,
        fill: 'none', stroke: '#244c5a', 'stroke-width': 2,
        'stroke-dasharray': '8,4',
      }));
    } else {
      // Legacy single-card slot (bifold / mat-with-fish-track)
      parts.push(rect({
        x: s.x + 8, y: s.y + 8, w: s.w - 16, h: s.h - 16,
        rx: 10, ry: 10,
        fill: '#eaf4fa', stroke: '#244c5a', 'stroke-width': 3,
        'stroke-dasharray': '10,5', opacity: 0.92,
      }));
      parts.push(text({
        x: s.x + s.w / 2, y: s.y + 44,
        content: `Headwaters ${i}`,
        'text-anchor': 'middle', 'font-size': 24, 'font-weight': 'bold',
        fill: '#244c5a',
      }));
      parts.push(costRow(s.x + s.w / 2, s.y + 116, 'action', i + 1, 36, '#5a3a00'));
      parts.push(costRow(s.x + s.w / 2, s.y + 178, 'item',   1,     36, '#5a3a00'));
    }
  }
  parts.push(`</g>`);

  // ---- Card-flow arrows in HW row (HW3 → HW2 → HW1) ----
  // All flow/funnel arrows share the same stroke weight for visual unity.
  // When the HW row is reversed, arrows point RIGHT (deck→HW3→HW2→HW1
  // reads L→R); otherwise they point LEFT (HW3 on the right).
  parts.push(`<g id="hw-flow" stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" fill="none" opacity="0.9">`);
  for (let i = 3; i > 1; i--) {
    const from = hwSlot(i);
    const to = hwSlot(i - 1);
    const y = from.y + (from.headerStrip || 0) + from.cardH / 2;
    let x1, x2;
    if (v.reverseHwOrder) {
      // from is to the LEFT of to (HW3 left, HW2 middle, HW1 right)
      x1 = from.x + from.w - 20; x2 = to.x + 20;
    } else {
      x1 = from.x + 20;          x2 = to.x + to.w - 20;
    }
    parts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-end="url(#${ARROW_MARKER})"/>`);
  }
  parts.push(`</g>`);

  // HW1 → R1 drop arrow (skipped when the logo occupies the central gap;
  // mat-nofish uses the shorter v.flowArrowIntoR1 funnel arrow instead).
  if (!v.logoBetweenRows) {
    const hw1 = hwSlot(1);
    const r1 = riverSlot(1);
    const x = hw1.x + hw1.w / 2;
    parts.push(`<line x1="${x}" y1="${hw1.y + hw1.h + 4}" x2="${x}" y2="${r1.y - 6}"
      stroke="#244c5a" stroke-width="${FLOW_STROKE}" marker-end="url(#arrow)" opacity="0.7"/>`);
    parts.push(text({
      x: x + 30, y: (hw1.y + hw1.h + r1.y) / 2 + 5,
      content: 'enters river',
      'font-size': 13, fill: '#244c5a', 'font-style': 'italic',
    }));
  }

  // ---- River row ----
  // Each slot = outer solid frame around the whole pile area + a title
  // strip at the top (label + per-item cost) + one card-sized dashed
  // outline per visible card position (riverCardsTall). When cardsTall=1
  // we revert to the simpler single-card layout (label inside the card).
  parts.push(`<g id="river">`);
  for (let i = 1; i <= 4; i++) {
    const s = riverSlot(i);
    // Outer slot frame: square corners; extends down through the trim
    // into the bleed so the column visibly continues off-mat. Fade
    // gradient from 90% at top to 60% at bottom.
    const slotExtendBottom = (s.cardsTall > 1) ? (H + BLEED) : (s.y + s.h);
    parts.push(rect({
      x: s.x, y: s.y, w: s.w, h: slotExtendBottom - s.y,
      rx: 0, ry: 0,
      fill: 'url(#river-fade)',
      stroke: '#1d3f4d', 'stroke-width': 4,
    }));

    if (s.cardsTall > 1) {
      // Multi-card slot title strip: "River N" on the left, both costs
      // (action + per-item) packed in the center/right of the strip.
      const titleY = s.y + 28;
      parts.push(text({
        x: s.x + 18, y: titleY,
        content: `River ${i}`,
        'text-anchor': 'start', 'font-size': 22, 'font-weight': 'bold',
        fill: '#1d3f4d',
      }));
      parts.push(costRow(s.x + s.w * 0.56, s.y + 22, 'action', 1,     22, '#5a3a00'));
      parts.push(costRow(s.x + s.w * 0.84, s.y + 22, 'item',   i + 1, 22, '#5a3a00'));
      // Inner card outlines, flush below the title strip — border only;
      // slot frame's translucent fill provides the area tint.
      for (let k = 0; k < s.cardsTall; k++) {
        const cy = s.y + s.titleStrip + k * s.cardH;
        parts.push(rect({
          x: s.x + 10, y: cy + 4, w: s.w - 20, h: s.cardH - 8,
          rx: 8, ry: 8,
          fill: 'none', stroke: '#1d3f4d', 'stroke-width': 2,
          'stroke-dasharray': '8,4',
        }));
      }
      // Down-chevrons inside the slot, below the cards — signal "pile
      // continues downward off the mat." Sized to fit within the safe
      // zone (the slot frame extends past trim into bleed; chevrons do
      // not — they must stay readable).
      const cardsBottom = s.y + s.titleStrip + s.cardsTall * s.cardH;
      const cx = s.x + s.w / 2;
      const armW = 18;
      const armH = 8;
      const chevY1 = cardsBottom + 4;
      const chevY2 = chevY1 + 12;
      // Chevron color matches the card-outline color (river-dark) so the
      // chevrons read as part of the slot framework, not as flow arrows.
      parts.push(`<path d="M ${cx - armW} ${chevY1} L ${cx} ${chevY1 + armH} L ${cx + armW} ${chevY1}"
        fill="none" stroke="#1d3f4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`);
      parts.push(`<path d="M ${cx - armW} ${chevY2} L ${cx} ${chevY2 + armH} L ${cx + armW} ${chevY2}"
        fill="none" stroke="#1d3f4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`);
    } else {
      // Single-card slot (bifold / mat-with-fish-track): label inside.
      parts.push(text({
        x: s.x + s.w / 2, y: s.y + 44,
        content: `River ${i}`,
        'text-anchor': 'middle', 'font-size': 24, 'font-weight': 'bold',
        fill: '#1d3f4d',
      }));
      parts.push(costGroup(s.x + s.w / 2, s.y + s.h / 2 + 6, i + 1, 56, '#5a3a00'));
      parts.push(text({
        x: s.x + s.w / 2, y: s.y + s.h / 2 + 58,
        content: 'per item',
        'text-anchor': 'middle', 'font-size': 14,
        fill: '#1d3f4d', 'font-style': 'italic',
      }));
    }
  }
  parts.push(`</g>`);

  // River-flow arrows: target the top-card mid-height (consistent y across
  // single- and multi-card slots).
  parts.push(`<g id="river-flow" stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" fill="none" opacity="0.9">`);
  for (let i = 1; i < 4; i++) {
    const from = riverSlot(i);
    const to = riverSlot(i + 1);
    const y = from.y + (from.titleStrip || 0) + from.cardH / 2;
    parts.push(`<line x1="${from.x + from.w - 12}" y1="${y}" x2="${to.x + 12}" y2="${y}" marker-end="url(#${ARROW_MARKER})"/>`);
  }
  parts.push(`</g>`);

  // ---- HW → R1 funnel arrow ----
  // Short downward arrow just above R1 (not from HW1 — kept short so it
  // doesn't look like the arrow originates only from HW1).
  if (v.flowArrowIntoR1) {
    const r1 = riverSlot(1);
    const cx = r1.x + r1.w / 2;
    const yBot = r1.y - 4;
    const yTop = yBot - 40;        // short arrow, only ~40px long
    parts.push(`<line x1="${cx}" y1="${yTop}" x2="${cx}" y2="${yBot}"
      stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" stroke-linecap="round"
      marker-end="url(#${ARROW_MARKER})" opacity="0.9"/>`);
  }

  // ---- Icon legend ----
  // Explains the card-cost and worker-cost icons used throughout the board.
  // Sits in the gap area straddling the R1/R2 boundary horizontally —
  // wider, with room for the longer label text.
  if (v.showIconLegend) {
    const r1 = riverSlot(1);
    const r2 = riverSlot(2);
    const cy = (HW_BOTTOM + r1.y) / 2;
    const cx = (r1.x + r1.w + r2.x) / 2;   // midpoint of the R1/R2 gap
    const lw = 220;
    const lh = 58;
    const lx = cx - lw / 2;
    const ly = cy - lh / 2;
    parts.push(`<g id="legend">`);
    parts.push(rect({
      x: lx, y: ly, w: lw, h: lh, rx: 8, ry: 8,
      fill: '#fff',
      stroke: '#244c5a', 'stroke-width': 1.5,
    }));
    // Row 1: [card] = pay to start auction
    parts.push(`<use xlink:href="#card-cost" x="${lx + 12}" y="${ly + 6}" width="32" height="20"/>`);
    parts.push(text({
      x: lx + 52, y: ly + 21,
      content: '= pay to start auction',
      'text-anchor': 'start', 'font-size': 14, 'font-style': 'italic',
      fill: '#244c5a',
    }));
    // Row 2: [worker] = pay per item bid
    parts.push(`<use xlink:href="#worker-cost" x="${lx + 16}" y="${ly + 30}" width="22" height="22"/>`);
    parts.push(text({
      x: lx + 52, y: ly + 46,
      content: '= pay per item bid',
      'text-anchor': 'start', 'font-size': 14, 'font-style': 'italic',
      fill: '#244c5a',
    }));
    parts.push(`</g>`);
  }

  // ---- Flush-action info box ----
  // Symmetric to the legend, in the gap straddling the R3/R4 boundary.
  // Reads "FLUSH HEADWATERS" with the [card]5🐟 / [worker]1🐟 cost rows,
  // matching the HW header iconography.
  if (v.showFlushBox) {
    const r3 = riverSlot(3);
    const r4 = riverSlot(4);
    const cy = (HW_BOTTOM + r3.y) / 2;
    const cx = (r3.x + r3.w + r4.x) / 2;
    const fw = 220;
    const fh = 58;
    const fx = cx - fw / 2;
    const fy = cy - fh / 2;
    parts.push(`<g id="flush-action">`);
    parts.push(rect({
      x: fx, y: fy, w: fw, h: fh, rx: 8, ry: 8,
      fill: '#fff',
      stroke: '#244c5a', 'stroke-width': 1.5,
    }));
    parts.push(text({
      x: fx + fw / 2, y: fy + 18,
      content: 'FLUSH HEADWATERS',
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 'bold',
      fill: '#244c5a', 'letter-spacing': '1',
    }));
    parts.push(costRow(fx + fw * 0.30, fy + 42, 'action', 5, 18, '#5a3a00'));
    parts.push(costRow(fx + fw * 0.72, fy + 42, 'item',   1, 18, '#5a3a00'));
    parts.push(`</g>`);
  }

  // Shoreline indicator — variants differ:
  //   default: horizontal arrow from R4's right edge → off-board
  //   mat-nofish: double-chevron rail centered on the right edge,
  //               matching the pile-column style
  if (v.shorelineAtRightEdgeCenter) {
    // Shoreline box: styled like a river slot — same outer frame, same
    // river-fade gradient, square corners. Extends along the full right
    // edge of the mat (top through bottom), past the trim into the bleed
    // on all three exposed sides. Left edge is either a fixed absolute
    // x (when symmetric padding is configured) or just-right of R4.
    const r4 = riverSlot(4);
    const sx = (layout.shorelineX != null) ? layout.shorelineX : (r4.x + r4.w + 12);
    const sy = -BLEED;
    const sw = (W + BLEED) - sx;
    const sh = (H + BLEED) - sy;
    parts.push(`<g id="shoreline">`);
    parts.push(rect({
      x: sx, y: sy, w: sw, h: sh,
      rx: 0, ry: 0,
      fill: 'url(#river-fade)',
      stroke: '#1d3f4d', 'stroke-width': 4,
    }));
    // "Shoreline" label rotated 90° (reads top-to-bottom), same font/
    // size/color as the "River N" titles. Centered on the mat trim.
    const visCx = (sx + W) / 2;
    const matCy = H / 2;
    parts.push(`<text x="${visCx.toFixed(2)}" y="${matCy.toFixed(2)}"
      transform="rotate(90 ${visCx.toFixed(2)} ${matCy.toFixed(2)})"
      text-anchor="middle" font-size="22" font-weight="bold"
      fill="#1d3f4d">Shoreline</text>`);
    // Side chevrons at 25% and 75% of the mat height. Rendered exactly
    // like the down-chevrons in the river slots (armW=18, armH=8, 12px
    // offset between the two chevrons in the pair) but rotated 90° CCW
    // so they point RIGHT (toward the mat edge).
    const sArmW = 18;
    const sArmH = 8;
    const sChevX1 = visCx - 10;     // pair span = 20px, centered on visCx
    const sChevX2 = sChevX1 + 12;
    for (const y of [H * 0.25, H * 0.75]) {
      for (const x of [sChevX1, sChevX2]) {
        parts.push(`<path d="M ${x} ${y - sArmW} L ${x + sArmH} ${y} L ${x} ${y + sArmW}"
          fill="none" stroke="#1d3f4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`);
      }
    }
    parts.push(`</g>`);
  } else {
    const r4 = riverSlot(4);
    const y = r4.y + r4.h / 2;
    parts.push(`<line x1="${r4.x + r4.w + 4}" y1="${y}" x2="${IX1 - 12}" y2="${y}"
      stroke="#1d3f4d" stroke-width="3" marker-end="url(#arrow)" opacity="0.7"/>`);
    parts.push(text({
      x: (r4.x + r4.w + IX1) / 2 + 4, y: y - 12,
      content: 'to shoreline',
      'text-anchor': 'middle', 'font-size': 14, fill: '#1d3f4d',
      'font-style': 'italic', 'font-weight': 'bold',
    }));
    parts.push(text({
      x: (r4.x + r4.w + IX1) / 2 + 4, y: y + 22,
      content: '(off-board)',
      'text-anchor': 'middle', 'font-size': 11, fill: '#1d3f4d',
      'font-style': 'italic',
    }));
  }

  // ---- R4 → shoreline / right-edge flow arrow ----
  // Drawn AFTER the shoreline box so the arrowhead reads as flowing
  // INTO the box (like the HW row arrows extend into their destinations).
  if (v.flowArrowR4ToEdge) {
    const r4 = riverSlot(4);
    const y = r4.y + (r4.titleStrip || 0) + r4.cardH / 2;
    const x1 = r4.x + r4.w - 20;
    let x2;
    if (v.shorelineAtRightEdgeCenter) {
      const sx = (layout.shorelineX != null) ? layout.shorelineX : (r4.x + r4.w + 12);
      x2 = sx + 20;
    } else {
      x2 = W - 10;
    }
    parts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
      stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" stroke-linecap="round"
      marker-end="url(#${ARROW_MARKER})" opacity="0.9"/>`);
  }

  // Pile-column indicators below each river slot.
  //   - Single-card slots (bifold / mat-with-fish): draw dashed side rails
  //     into the bleed + double chevrons, since the slot itself stops at
  //     CARD_H and the pile mostly grows off-board.
  //   - Multi-card slots (mat-nofish): the slot frame itself extends into
  //     the bleed, so no separate rails/chevrons are needed.
  const multiCardSlot = (riverSlot(1).cardsTall > 1);
  if (!multiCardSlot) {
    parts.push(`<g id="pile-columns" opacity="0.7">`);
    const COL_TOP = RIVER_BOTTOM + 2;
    const COL_BOTTOM = H + BLEED;
    for (let i = 1; i <= 4; i++) {
      const s = riverSlot(i);
      const leftX = s.x + 8;
      const rightX = s.x + s.w - 8;
      const cx = s.x + s.w / 2;
      parts.push(`<line x1="${leftX}"  y1="${COL_TOP}" x2="${leftX}"  y2="${COL_BOTTOM}"
        stroke="#1d3f4d" stroke-width="3" stroke-dasharray="10,5"/>`);
      parts.push(`<line x1="${rightX}" y1="${COL_TOP}" x2="${rightX}" y2="${COL_BOTTOM}"
        stroke="#1d3f4d" stroke-width="3" stroke-dasharray="10,5"/>`);
      const armW = 22;
      const chevY1 = COL_TOP + 16;
      const chevY2 = chevY1 + 20;
      parts.push(`<path d="M ${cx - armW} ${chevY1} L ${cx} ${chevY1 + 14} L ${cx + armW} ${chevY1}"
        fill="none" stroke="#1d3f4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
      parts.push(`<path d="M ${cx - armW} ${chevY2} L ${cx} ${chevY2 + 14} L ${cx + armW} ${chevY2}"
        fill="none" stroke="#1d3f4d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    parts.push(`</g>`);
  }

  // ---- Material deck slot ----
  if (deck) {
    parts.push(`<g id="deck">`);
    if (v.deckIsCardBack) {
      // Outer frame matching the HW slot style (same fade gradient + border).
      parts.push(rect({
        x: deck.x, y: deck.y, w: deck.w, h: deck.h,
        rx: 0, ry: 0,
        fill: 'url(#hw-fade)',
        stroke: '#244c5a', 'stroke-width': 4,
      }));
      // Header strip label, "MATERIAL DECK"
      parts.push(text({
        x: deck.x + deck.w / 2, y: deck.y + 28,
        content: 'MATERIAL DECK', 'text-anchor': 'middle',
        'font-size': 18, 'font-weight': 'bold',
        fill: '#244c5a', 'letter-spacing': '2',
      }));
      // Card-back art clipped to the same rounded-rect shape used for the
      // HW card outlines (10px inset on sides, 4px inset top/bottom, rx=8).
      const cardX = deck.x + 10;
      const cardY = deck.y + deck.headerStrip + 4;
      const cardW = deck.w - 20;
      const cardH = deck.cardH - 8;
      const cx = cardX + cardW / 2;
      const cy = cardY + cardH / 2;
      // Image is sized to fully cover the clipped area (pre-rotation
      // width/height are swapped, then rotated 90° around the center).
      const imgW = cardH;
      const imgH = cardW;
      const imgX = cx - imgW / 2;
      const imgY = cy - imgH / 2;
      parts.push(`<defs><clipPath id="deck-card-clip">
        <rect x="${cardX.toFixed(2)}" y="${cardY.toFixed(2)}"
              width="${cardW.toFixed(2)}" height="${cardH.toFixed(2)}" rx="8" ry="8"/>
      </clipPath></defs>`);
      parts.push(`<g clip-path="url(#deck-card-clip)">`);
      parts.push(`<image xlink:href="../material-deck-back.png"
        x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}"
        width="${imgW.toFixed(2)}" height="${imgH.toFixed(2)}"
        preserveAspectRatio="xMidYMid slice"
        transform="rotate(90 ${cx.toFixed(2)} ${cy.toFixed(2)})"/>`);
      parts.push(`</g>`);
    } else {
      // Stylized stacked-rectangle silhouette
      for (let i = 0; i < 3; i++) {
        parts.push(rect({
          x: deck.x + 16 + i * 3, y: deck.y + 16 + i * 3,
          w: deck.w - 32, h: deck.h - 32,
          rx: 8, ry: 8,
          fill: '#7a5230', stroke: '#3a2510', 'stroke-width': 2, opacity: 0.85,
        }));
      }
      parts.push(text({
        x: deck.x + deck.w / 2, y: deck.y + deck.h / 2 - 8,
        content: 'MATERIAL', 'text-anchor': 'middle',
        'font-size': 26, 'font-weight': 'bold', fill: '#eee2c8', 'letter-spacing': '3',
      }));
      parts.push(text({
        x: deck.x + deck.w / 2, y: deck.y + deck.h / 2 + 22,
        content: 'DECK', 'text-anchor': 'middle',
        'font-size': 26, 'font-weight': 'bold', fill: '#eee2c8', 'letter-spacing': '3',
      }));
    }
    // Feed arrow from the deck → HW3. Matches the in-row HW arrows:
    // starts ~20px inside the source's interior edge and ends ~20px
    // inside the destination's interior edge, so it visually extends
    // into both slots instead of floating in the gap between them.
    const hw3 = hwSlot(3);
    const fy = hw3.y + (hw3.headerStrip || 0) + hw3.cardH / 2;
    const fyDeck = deck.y + (deck.headerStrip || 0) + deck.cardH / 2;
    if (deck.aligned) {
      let x1, x2;
      if (v.reverseHwOrder) {
        x1 = deck.x + deck.w - 20; x2 = hw3.x + 20;
      } else {
        x1 = deck.x + 20;          x2 = hw3.x + hw3.w - 20;
      }
      parts.push(`<line x1="${x1}" y1="${fyDeck}" x2="${x2}" y2="${fy}"
        stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" marker-end="url(#${ARROW_MARKER})" opacity="0.9"/>`);
    } else {
      parts.push(`<line x1="${deck.x + 20}" y1="${fyDeck}" x2="${hw3.x + hw3.w - 20}" y2="${fyDeck}"
        stroke="${ARROW_COLOR}" stroke-width="${FLOW_STROKE}" marker-end="url(#${ARROW_MARKER})" opacity="0.9"/>`);
    }
    parts.push(`</g>`);
  } else {
    parts.push(text({
      x: IX1 - 16, y: HW_Y + 26,
      content: 'material deck →  off-mat (on the table)',
      'text-anchor': 'end', 'font-size': 13, fill: '#5a3a00', 'font-style': 'italic',
    }));
  }

  // ---- Production guides (trim / safe / bleed / fold) ----
  if (!v.hideGuides) {
    parts.push(`<g id="guides" fill="none" pointer-events="none">`);
  // Trim (rounded if needed)
  if (cornerR) {
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="${cornerR}" ry="${cornerR}"
      stroke="#ec1e28" stroke-width="1" opacity="0.8"/>`);
  } else {
    parts.push(rect({ x: 0, y: 0, w: W, h: H, stroke: '#ec1e28', 'stroke-width': 1, opacity: 0.8 }));
  }
  // Safe zone (inset 1/8")
  if (cornerR) {
    parts.push(`<rect x="${SAFE_INSET}" y="${SAFE_INSET}" width="${W - 2 * SAFE_INSET}" height="${H - 2 * SAFE_INSET}"
      rx="${Math.max(0, cornerR - SAFE_INSET)}" ry="${Math.max(0, cornerR - SAFE_INSET)}"
      stroke="#00adee" stroke-width="1" stroke-dasharray="6,4" opacity="0.8"/>`);
  } else {
    parts.push(rect({
      x: SAFE_INSET, y: SAFE_INSET, w: W - 2 * SAFE_INSET, h: H - 2 * SAFE_INSET,
      stroke: '#00adee', 'stroke-width': 1, 'stroke-dasharray': '6,4', opacity: 0.8,
    }));
  }
  // Bleed
  parts.push(rect({
    x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED,
    stroke: '#999', 'stroke-width': 1, 'stroke-dasharray': '3,3', opacity: 0.6,
  }));
  if (v.hasFold) {
    parts.push(text({
      x: W / 2 + 6, y: IY0 + 14,
      content: 'fold',
      'font-size': 12, fill: '#fff', 'font-style': 'italic', opacity: 0.6,
    }));
  }
  parts.push(`</g>`);
  }   // end !hideGuides

  parts.push(`</svg>`);
  return parts.join('\n');
}

// ---------- main ----------
for (const v of VARIANTS) {
  const layout = computeLayout(v);
  const out = path.resolve(__dirname, v.outFile);
  fs.writeFileSync(out, buildSvg(layout), 'utf8');
  console.log(`wrote ${out}  (${v.label})`);
}
