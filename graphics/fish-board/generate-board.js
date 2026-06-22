#!/usr/bin/env node
// River Bankers fish board generator.
//
// 8"×8" TGC square-board template. The board carries the fish track
// (60 cells around the perimeter, numbered clockwise from the upper-left
// at 0), a Structure deck slot (showing the structure card back), a
// Discard pile outline to its right, and an "Invent" info box styled
// after the river board's Flush Headwaters box.
//
// Background uses ../../artwork/material-deck-front.png positioned and
// scaled so the wood-frame border falls outside the trim and the Gemini
// marker in the original's lower-right corner is cropped away.
//
// 100 px / inch throughout. Origin = top-left of trim.

const fs = require('fs');
const path = require('path');

const PX_PER_IN = 100;
const BLEED = 0.125 * PX_PER_IN;        // 12.5
const SAFE_INSET = 0.125 * PX_PER_IN;   // 12.5

const W = 8 * PX_PER_IN;                // 800
const H = 8 * PX_PER_IN;                // 800

// Fish-track band thickness. 60 cells = 4 corners + 14 edge cells per side.
const BAND = 56;
const EDGE_CELLS_PER_SIDE = 14;
const EDGE_CELL_LEN = (W - 2 * BAND) / EDGE_CELLS_PER_SIDE; // ~49.14 px

// ---------- fish track ----------
function buildFishCells() {
  const cells = [];
  const corner = (n, x, y) => ({ n, kind: 'corner', x, y, w: BAND, h: BAND });

  // Top-left corner (0), then 14 cells across the top, then top-right corner (15).
  cells.push(corner(0, 0, 0));
  for (let k = 1; k <= EDGE_CELLS_PER_SIDE; k++) {
    cells.push({
      n: k, kind: 'edge',
      x: BAND + (k - 1) * EDGE_CELL_LEN, y: 0,
      w: EDGE_CELL_LEN, h: BAND,
    });
  }
  cells.push(corner(15, W - BAND, 0));

  // Right side: 14 cells going down, then bottom-right corner (30).
  for (let k = 1; k <= EDGE_CELLS_PER_SIDE; k++) {
    cells.push({
      n: 15 + k, kind: 'edge',
      x: W - BAND, y: BAND + (k - 1) * EDGE_CELL_LEN,
      w: BAND, h: EDGE_CELL_LEN,
    });
  }
  cells.push(corner(30, W - BAND, H - BAND));

  // Bottom side: 14 cells going right→left, then bottom-left corner (45).
  for (let k = 1; k <= EDGE_CELLS_PER_SIDE; k++) {
    cells.push({
      n: 30 + k, kind: 'edge',
      x: (W - BAND) - k * EDGE_CELL_LEN, y: H - BAND,
      w: EDGE_CELL_LEN, h: BAND,
    });
  }
  cells.push(corner(45, 0, H - BAND));

  // Left side: 14 cells going bottom→top.
  for (let k = 1; k <= EDGE_CELLS_PER_SIDE; k++) {
    cells.push({
      n: 45 + k, kind: 'edge',
      x: 0, y: (H - BAND) - k * EDGE_CELL_LEN,
      w: BAND, h: EDGE_CELL_LEN,
    });
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

// costRow: [type-icon] [N] [fish-icon] centered at (cx, cy).
// type = 'action' (card glyph) or 'item' (worker glyph). Same renderer as
// the river board so iconography stays consistent across the two boards.
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

// fishGroup: [N] [fish-icon] centered at (cx, cy). Used in the Invent box
// where the cost is just "N fish" with no preceding type glyph.
function fishGroup(cx, cy, value, size, color) {
  const digits = String(value);
  const numW = size * 0.62 * digits.length;
  const fishW = size * 1.35;
  const gap = size * 0.18;
  const totalW = numW + gap + fishW;
  const startX = cx - totalW / 2;
  const numCx = startX + numW / 2;
  const fishX = startX + numW + gap;
  const iconY = cy - size / 2;
  return [
    text({
      x: numCx, y: cy + size * 0.32, content: digits,
      'text-anchor': 'middle', 'font-size': size, 'font-weight': 'bold', fill: color,
    }),
    `<use xlink:href="#fish" x="${fishX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${fishW.toFixed(2)}" height="${size.toFixed(2)}"/>`,
  ].join('');
}

// cardGroup: [N] [portrait-card outline] centered at (cx, cy). The card
// glyph is a plain portrait rectangle (structure cards), NOT the
// auction-style material-card icon used on the river board.
function cardGroup(cx, cy, value, size, color) {
  const digits = String(value);
  const numW = size * 0.62 * digits.length;
  const cardH = size * 1.15;             // taller than wide → portrait
  const cardW = cardH * (40 / 56);       // matches structure-card viewBox
  const gap = size * 0.22;
  const totalW = numW + gap + cardW;
  const startX = cx - totalW / 2;
  const numCx = startX + numW / 2;
  const cardX = startX + numW + gap;
  const iconY = cy - cardH / 2;
  return [
    text({
      x: numCx, y: cy + size * 0.32, content: digits,
      'text-anchor': 'middle', 'font-size': size, 'font-weight': 'bold', fill: color,
    }),
    `<use xlink:href="#structure-card" x="${cardX.toFixed(2)}" y="${iconY.toFixed(2)}" width="${cardW.toFixed(2)}" height="${cardH.toFixed(2)}"/>`,
  ].join('');
}

// plus60Badge: a mini "+60" lap badge — a white disc with a black outline and
// black, centered "+60". cx,cy = center, r = radius.
function plus60Badge(cx, cy, r) {
  const fs = (r * 0.72).toFixed(1);
  return [
    `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r}" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>`,
    `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="central" ` +
      `font-family="'DejaVu Sans','Arial',sans-serif" font-weight="bold" font-size="${fs}" letter-spacing="-0.5" ` +
      `fill="#1a1a1a">+60</text>`,
  ].join('');
}

// ---------- assemble SVG ----------
function buildSvg() {
  const cells = buildFishCells();
  const parts = [];

  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  const bleedIn = BLEED / PX_PER_IN;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  width="${8 + 2 * bleedIn}in" height="${8 + 2 * bleedIn}in"
  viewBox="${-BLEED} ${-BLEED} ${W + 2 * BLEED} ${H + 2 * BLEED}"
  font-family="'Georgia', 'Iowan Old Style', 'Times New Roman', serif">`);
  parts.push(`<title>River Bankers — Fish Board (8×8 square)</title>`);

  // ---- defs ----
  // Reuse the river-board palette / symbols so iconography matches.
  parts.push(`<defs>
    <linearGradient id="hw-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#eaf4fa" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#eaf4fa" stop-opacity="0.65"/>
    </linearGradient>
    <linearGradient id="river-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#d8ecf3" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#d8ecf3" stop-opacity="0.65"/>
    </linearGradient>
    <linearGradient id="track-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#f4ead0" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#e6d6ab" stop-opacity="0.88"/>
    </linearGradient>
    <symbol id="fish" viewBox="0 0 100 50">
      <path d="M 25 25 L 3 8 L 12 25 L 3 42 Z" fill="#2d527a"/>
      <path d="M 25 25 Q 25 5 55 5 Q 88 5 95 25 Q 88 45 55 45 Q 25 45 25 25 Z"
            fill="#4a82b0" stroke="#1d3f4d" stroke-width="2"/>
      <ellipse cx="62" cy="35" rx="22" ry="6" fill="#c5dbeb" opacity="0.55"/>
      <path d="M 50 14 Q 45 25 50 36" fill="none" stroke="#1d3f4d" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="80" cy="20" r="3.8" fill="#fff"/>
      <circle cx="81" cy="20" r="2" fill="#1a1a1a"/>
    </symbol>
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
    <symbol id="worker-cost" viewBox="0 0 50 50">
      <circle cx="25" cy="27" r="18" fill="#3a2510" opacity="0.3"/>
      <circle cx="25" cy="25" r="18" fill="#8b6f44" stroke="#3a2510" stroke-width="3"/>
      <ellipse cx="20" cy="17" rx="7" ry="4" fill="#c5a87a" opacity="0.6"/>
    </symbol>
    <!-- Plain portrait-layout card outline. Used in the Invent box to
         indicate a structure card (no auction-style header stripe). -->
    <symbol id="structure-card" viewBox="0 0 40 56">
      <rect x="3" y="3" width="34" height="50" rx="4" ry="4"
            fill="#f0e5cf" stroke="#244c5a" stroke-width="3"/>
    </symbol>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#244c5a"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#7c2410"/>
    </marker>
    <clipPath id="trim-clip">
      <rect x="0" y="0" width="${W}" height="${H}"/>
    </clipPath>
  </defs>`);

  // ---- background ----
  // material-deck-front.png is 2816×1536 (landscape, ~1.833 aspect) with a
  // ~80 px wood-frame border and a small Gemini sparkle marker just inside
  // the lower-right corner (~x=2680, y=1390). We scale and offset the
  // image so:
  //   • the border falls outside the 800×800 trim (clipped by trim-clip)
  //   • the Gemini marker sits in the source area cropped off the right
  //   • the visible region is the central river/creature scene
  //
  // Source bounds we WANT visible: x ∈ [80, 2616], y ∈ [80, 1456]
  //   (right edge excludes ~200 px containing the Gemini marker)
  // Inner scene size = 2536 × 1376  (ratio ≈ 1.843)
  //
  // To cover the square trim while keeping aspect ratio, scale the inner
  // scene so its short side (1376 → "vertical") just covers 800 px:
  //   scale = 800 / 1376 ≈ 0.5814
  // Then the inner scene's width becomes 2536 × 0.5814 ≈ 1474 px and we
  // center horizontally so 337 px slop is cropped on each side.
  // Full image displayed dimensions:
  //   display_w = 2816 × 0.5814 ≈ 1637 px
  //   display_h = 1536 × 0.5814 ≈ 893 px
  // Position so source (80, 80) maps to display (0, 0) of the visible
  // inner scene, then shift horizontally to center the inner scene on the
  // board's center.
  const IMG_SCALE = 800 / 1376;                     // ≈ 0.5814
  const DISP_W = 2816 * IMG_SCALE;                  // ≈ 1637
  const DISP_H = 1536 * IMG_SCALE;                  // ≈ 893
  // Inner scene displayed = 2536*scale × 1376*scale = 1474 × 800
  const INNER_DISP_W = 2536 * IMG_SCALE;            // ≈ 1474
  const INNER_DISP_H = 1376 * IMG_SCALE;            // = 800
  // The source rectangle [80, 80] is the inner top-left. In display
  // coords this is at (80*scale, 80*scale) ≈ (46.5, 46.5) relative to
  // the image's top-left corner.
  const INNER_OFFSET = 80 * IMG_SCALE;              // ≈ 46.5
  // Place image so inner-top-left appears at the board's left edge after
  // horizontal centering: inner is INNER_DISP_W wide vs the 800 board, so
  // we shift left by (INNER_DISP_W - 800)/2 to center.
  const INNER_LEFT_SHIFT = (INNER_DISP_W - 800) / 2;
  const IMG_X = -INNER_OFFSET - INNER_LEFT_SHIFT;
  const IMG_Y = -INNER_OFFSET;

  // Bleed fill — covers the full SVG canvas in the same dark brown used
  // for the fish-track cell border lines (#5a4422). The trim-clipped
  // content below overdraws inside the trim, so this color is only
  // visible outside the trim where the printer will cut.
  parts.push(rect({
    x: -BLEED, y: -BLEED, w: W + 2 * BLEED, h: H + 2 * BLEED,
    fill: '#5a4422',
  }));
  parts.push(`<g clip-path="url(#trim-clip)">`);
  // Cream wash behind the artwork so the 40% image reads on light paper
  // tones rather than against transparent (or whatever the printer fills).
  parts.push(rect({ x: 0, y: 0, w: W, h: H, fill: '#f3ead0' }));
  parts.push(`<image xlink:href="../../artwork/material-deck-front.png"
    x="${IMG_X.toFixed(2)}" y="${IMG_Y.toFixed(2)}"
    width="${DISP_W.toFixed(2)}" height="${DISP_H.toFixed(2)}"
    preserveAspectRatio="none" opacity="0.4"/>`);
  // Soft inner band tint so the fish-track cells read cleanly over the
  // varied artwork. Sits behind everything else inside the trim clip.
  // (Drawn as one rect along the perimeter band, with an inner cutout via
  // an even-odd fill rule.)
  parts.push(`<path d="
    M 0 0 H ${W} V ${H} H 0 Z
    M ${BAND} ${BAND} V ${H - BAND} H ${W - BAND} V ${BAND} Z"
    fill="url(#track-fade)" fill-rule="evenodd"/>`);
  parts.push(`</g>`);

  // ---- fish-track cells ----
  parts.push(`<g id="fish-track" stroke="#5a4422" stroke-width="2" fill="none">`);
  for (const c of cells) {
    parts.push(rect({ x: c.x, y: c.y, w: c.w, h: c.h, fill: 'none' }));
  }
  parts.push(`</g>`);

  // Cell numbers (multiples of 5 emphasized; corners largest).
  parts.push(`<g id="fish-track-labels" font-weight="bold" text-anchor="middle" dominant-baseline="middle">`);
  for (const c of cells) {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const isCorner = (c.kind === 'corner');
    const isFive = (c.n % 5 === 0);
    const size = isCorner ? 26 : (isFive ? 22 : 18);
    const fill = isCorner ? '#7c2410' : (isFive ? '#5a3a14' : '#3a2a14');
    parts.push(text({
      x: cx, y: cy, content: c.n,
      'font-size': size,
      fill,
    }));
  }
  parts.push(`</g>`);

  // START marker on cell 0 — same red-square ring as river board.
  const c0 = cells.find(c => c.n === 0);
  parts.push(rect({
    x: c0.x + 3, y: c0.y + 3, w: c0.w - 6, h: c0.h - 6,
    fill: 'none', stroke: '#7c2410', 'stroke-width': 4,
  }));

  // (The old "pay 🐟 → clockwise" direction cue was removed: the top strip now
  // holds the WHEN-YOU-PASS-0 and ENDGAME-TRIGGER boxes; direction reads from
  // the 0→59 numbering.)

  // ---- center area (inside the band) ----
  // Interior is from (BAND, BAND) to (W-BAND, H-BAND) = (56,56) to (744,744)
  // → 688 × 688 px. Holds the Structure deck slot, Discard pile outline,
  // and the Invent action box.
  const IX0 = BAND, IY0 = BAND;
  const IX1 = W - BAND, IY1 = H - BAND;
  const IW = IX1 - IX0, IH = IY1 - IY0;

  // Card slot dimensions. Cards are 2.5"×3.5" poker portrait → 250×350 px;
  // bump to 270×378 for visual weight and to fill the center.
  const CARD_W = 270;
  const CARD_H = 378;
  const SLOT_HEADER = 38;
  const SLOT_FOOTER = 8;
  const slotH = SLOT_HEADER + CARD_H + SLOT_FOOTER;

  // Two slots side-by-side, centered horizontally with a 32 px gap.
  const SLOT_GAP = 32;
  const slotsRowW = 2 * CARD_W + SLOT_GAP;
  const SLOTS_X = IX0 + (IW - slotsRowW) / 2;
  // Vertical layout: balance slots + invent box within the interior, with
  // the invent box ~24 px below the slots and equal padding above/below.
  const INVENT_H_RES = 96;
  // Vertical stack: Endgame legend (top, right-aligned) · slots · Invent
  // (centred below the slots).
  const ENDGAME_H_RES = 124;
  const VGAP = 16;
  const TOTAL_H = ENDGAME_H_RES + VGAP + slotH + VGAP + INVENT_H_RES;
  const TOP_PAD = Math.max(8, (IH - TOTAL_H) / 2);
  const ENDGAME_Y = IY0 + TOP_PAD;
  const SLOTS_Y = ENDGAME_Y + ENDGAME_H_RES + VGAP;

  // Slot frames (matched to the river board's slot framing: square
  // corners, dark river-stroke, river-fade gradient fill).
  const STRUCT_X = SLOTS_X;
  const DISCARD_X = SLOTS_X + CARD_W + SLOT_GAP;

  // --- Structure deck slot ---
  parts.push(`<g id="structure-deck">`);
  parts.push(rect({
    x: STRUCT_X, y: SLOTS_Y, w: CARD_W, h: slotH,
    rx: 0, ry: 0,
    fill: 'url(#hw-fade)',
    stroke: '#244c5a', 'stroke-width': 4,
  }));
  parts.push(text({
    x: STRUCT_X + CARD_W / 2, y: SLOTS_Y + 26,
    content: 'STRUCTURE DECK', 'text-anchor': 'middle',
    'font-size': 18, 'font-weight': 'bold',
    fill: '#244c5a', 'letter-spacing': '2',
  }));
  // Card-back art clipped to a rounded-rect that matches the card outline
  // used in the discard slot. Structure card back is portrait, so no
  // rotation is required.
  const sbCardX = STRUCT_X + 10;
  const sbCardY = SLOTS_Y + SLOT_HEADER;
  const sbCardW = CARD_W - 20;
  const sbCardH = CARD_H - 8;
  parts.push(`<defs><clipPath id="struct-card-clip">
    <rect x="${sbCardX.toFixed(2)}" y="${sbCardY.toFixed(2)}"
          width="${sbCardW.toFixed(2)}" height="${sbCardH.toFixed(2)}" rx="8" ry="8"/>
  </clipPath></defs>`);
  parts.push(`<g clip-path="url(#struct-card-clip)">`);
  parts.push(`<image xlink:href="../../structure-deck/_back.png"
    x="${sbCardX.toFixed(2)}" y="${sbCardY.toFixed(2)}"
    width="${sbCardW.toFixed(2)}" height="${sbCardH.toFixed(2)}"
    preserveAspectRatio="xMidYMid slice"/>`);
  parts.push(`</g>`);
  parts.push(`</g>`);

  // --- Discard pile outline ---
  parts.push(`<g id="discard-pile">`);
  parts.push(rect({
    x: DISCARD_X, y: SLOTS_Y, w: CARD_W, h: slotH,
    rx: 0, ry: 0,
    fill: 'url(#river-fade)',
    stroke: '#1d3f4d', 'stroke-width': 4,
  }));
  parts.push(text({
    x: DISCARD_X + CARD_W / 2, y: SLOTS_Y + 26,
    content: 'DISCARD', 'text-anchor': 'middle',
    'font-size': 18, 'font-weight': 'bold',
    fill: '#1d3f4d', 'letter-spacing': '3',
  }));
  // Dashed card-shaped outline mirroring the river slot's dashed card guide.
  const dpCardX = DISCARD_X + 10;
  const dpCardY = SLOTS_Y + SLOT_HEADER;
  const dpCardW = CARD_W - 20;
  const dpCardH = CARD_H - 8;
  parts.push(rect({
    x: dpCardX, y: dpCardY, w: dpCardW, h: dpCardH,
    rx: 8, ry: 8,
    fill: 'none', stroke: '#1d3f4d', 'stroke-width': 2,
    'stroke-dasharray': '8,4',
  }));
  // Faint "place discards face-up here" hint.
  parts.push(text({
    x: dpCardX + dpCardW / 2, y: dpCardY + dpCardH / 2,
    content: 'face up',
    'text-anchor': 'middle', 'font-size': 16, 'font-style': 'italic',
    fill: '#1d3f4d', opacity: 0.55,
  }));
  parts.push(`</g>`);

  // ---- Invent action box (centred below the deck slots) ----
  // Styled like the river board's "FLUSH HEADWATERS" info box.
  const INVENT_W = 520;
  const INVENT_H = INVENT_H_RES;
  const INVENT_X = (W - INVENT_W) / 2;
  // Centre vertically between the bottom of the deck slots and the top of the
  // bottom fish-track row (IY1).
  const INVENT_Y = (SLOTS_Y + slotH + IY1 - INVENT_H) / 2;
  parts.push(`<g id="invent">`);
  parts.push(rect({
    x: INVENT_X, y: INVENT_Y, w: INVENT_W, h: INVENT_H, rx: 10, ry: 10,
    fill: '#fff',
    stroke: '#244c5a', 'stroke-width': 1.8,
  }));
  // Title row: "INVENT" with the "(choose N from 2–5)" range inline; the label
  // row + chip row are centered below (box height 96).
  const titleBaseY = INVENT_Y + 31;
  const labelBaseY = INVENT_Y + 50;
  const rowY = INVENT_Y + 68;          // chip vertical center
  parts.push(
    `<text x="${INVENT_X + INVENT_W / 2}" y="${titleBaseY}" text-anchor="middle" font-weight="bold" fill="#244c5a">` +
    `<tspan font-size="20" letter-spacing="3">INVENT</tspan>` +
    `<tspan font-size="13" font-style="italic" fill="#5a4a36"> (choose N from 2 – 5)</tspan>` +
    `</text>`
  );
  // Description row: PAY N🐟 → DRAW N(card) → DISCARD N(card)
  const chipFont = 22;
  // Chip widths are eyeballed to fit the box; centers placed evenly.
  const cx1 = INVENT_X + INVENT_W * 0.18;   // Pay N 🐟
  const cx2 = INVENT_X + INVENT_W * 0.50;   // Draw N (card)
  const cx3 = INVENT_X + INVENT_W * 0.82;   // Discard N (card)
  // Labels above each chip.
  parts.push(text({
    x: cx1, y: labelBaseY, content: 'pay',
    'text-anchor': 'middle', 'font-size': 13, 'font-style': 'italic',
    fill: '#244c5a',
  }));
  parts.push(text({
    x: cx2, y: labelBaseY, content: 'draw',
    'text-anchor': 'middle', 'font-size': 13, 'font-style': 'italic',
    fill: '#244c5a',
  }));
  parts.push(text({
    x: cx3, y: labelBaseY, content: 'then discard',
    'text-anchor': 'middle', 'font-size': 13, 'font-style': 'italic',
    fill: '#244c5a',
  }));
  parts.push(fishGroup(cx1, rowY, 'N', chipFont, '#5a3a00'));
  parts.push(cardGroup(cx2, rowY, 'N', chipFont, '#5a3a00'));
  parts.push(cardGroup(cx3, rowY, 'N', chipFont, '#5a3a00'));
  // Arrows between chips.
  const arrY = rowY;
  const arrowAxL1 = cx1 + 38, arrowAxL2 = cx2 - 38;
  const arrowBxL1 = cx2 + 38, arrowBxL2 = cx3 - 38;
  parts.push(`<line x1="${arrowAxL1}" y1="${arrY}" x2="${arrowAxL2}" y2="${arrY}"
    stroke="#244c5a" stroke-width="2.5" marker-end="url(#arrow)" opacity="0.85"/>`);
  parts.push(`<line x1="${arrowBxL1}" y1="${arrY}" x2="${arrowBxL2}" y2="${arrY}"
    stroke="#244c5a" stroke-width="2.5" marker-end="url(#arrow)" opacity="0.85"/>`);
  parts.push(`</g>`);

  // ---- Top-strip box row: PAY (left) + WHEN-YOU-PASS-0 (mid) +
  //      ENDGAME-TRIGGER (right), same height, centred over the slots. ----
  const TOPBOX_GAP = 18;
  const PAY_W = 110;
  const FLIP_W = 196;
  const LEGEND_W = 318;
  const ROW_TOTAL = PAY_W + TOPBOX_GAP + FLIP_W + TOPBOX_GAP + LEGEND_W;
  const ROW_X0 = IX0 + (IW - ROW_TOTAL) / 2;
  const TOPBOX_H = ENDGAME_H_RES;
  const TOPBOX_Y = ENDGAME_Y;
  const PAY_X = ROW_X0;
  const PAIR_X = PAY_X + PAY_W + TOPBOX_GAP;   // flip box (mid)
  // Endgame trigger box (right of the row).
  const LEGEND_H = TOPBOX_H;
  const LEGEND_X = PAIR_X + FLIP_W + TOPBOX_GAP;
  const LEGEND_Y = TOPBOX_Y;
  parts.push(`<g id="endgame-trigger">`);
  parts.push(rect({
    x: LEGEND_X, y: LEGEND_Y, w: LEGEND_W, h: LEGEND_H, rx: 10, ry: 10,
    fill: '#fff', stroke: '#244c5a', 'stroke-width': 1.8,
  }));
  parts.push(text({
    x: LEGEND_X + LEGEND_W / 2, y: LEGEND_Y + 24,
    content: 'Game ends when', 'text-anchor': 'middle',
    'font-size': 16, 'font-weight': 'bold', fill: '#244c5a', 'letter-spacing': '0.3',
  }));
  parts.push(`<line x1="${LEGEND_X + 14}" y1="${LEGEND_Y + 32}" x2="${LEGEND_X + LEGEND_W - 14}" y2="${LEGEND_Y + 32}" stroke="#244c5a" stroke-width="1" opacity="0.4"/>`);
  // Climbing finish line per player count (2026-06-22 organic-ending re-tune):
  // 2P=89, 3P=109, 4P=119 fish (all on the "+60" lap-2 side). Line "deck empty"
  // states the auto-advance drift; last line is the no-shared-space retire rule.
  const egCx = LEGEND_X + LEGEND_W / 2;
  parts.push(text({
    x: egCx, y: LEGEND_Y + 48, content: 'all players cross the finish line',
    'text-anchor': 'middle', 'font-size': 12.5, 'font-style': 'italic', fill: '#5a4a36',
  }));
  // Per-count finish lines as one centered bold line with a trailing fish icon.
  const egLineY = LEGEND_Y + 70;
  const egLabel = '2P 89 · 3P 109 · 4P 119';
  const lblSize = 16;
  const lblW = egLabel.length * lblSize * 0.44;
  const fishSz = 17;
  const grpW = lblW + 7 + fishSz * 1.1;
  const grpX0 = egCx - grpW / 2;
  parts.push(text({
    x: grpX0, y: egLineY + lblSize * 0.32, content: egLabel,
    'text-anchor': 'start', 'font-size': lblSize, 'font-weight': 'bold', fill: '#5a3a00',
  }));
  parts.push(`<use xlink:href="#fish" x="${(grpX0 + lblW + 7).toFixed(2)}" y="${(egLineY - fishSz / 2).toFixed(2)}" width="${(fishSz * 1.1).toFixed(2)}" height="${fishSz.toFixed(2)}"/>`);
  // Deck-empty auto-advance drift.
  parts.push(text({
    x: egCx, y: LEGEND_Y + 91, content: 'material deck empty → drift +1 fish / turn',
    'text-anchor': 'middle', 'font-size': 11.5, fill: '#5a4a36',
  }));
  // Retire / no-shared-space rule.
  parts.push(text({
    x: egCx, y: LEGEND_Y + 111, content: 'RETIRE: jump to next open spot at the line',
    'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 'bold', fill: '#244c5a',
  }));
  parts.push(`</g>`);

  // ---- "WHEN YOU PASS 0" flip box (left of the pair, same height) ----
  // Lap boundary 59 · 0 · 1, with a blank worker chit under 59 and a "+60"
  // worker chit under 1, and an arrow — flip your pawn as you pass 0.
  const FB_W = FLIP_W, FB_H = LEGEND_H;
  const FB_X = PAIR_X;
  const FB_Y = LEGEND_Y;
  const FD_CX = FB_X + FB_W / 2;
  const FD_CELL_W = 50, FD_CELL_H = 28;
  parts.push(`<g id="flip-legend">`);
  parts.push(rect({
    x: FB_X, y: FB_Y, w: FB_W, h: FB_H, rx: 10, ry: 10,
    fill: '#fff', stroke: '#244c5a', 'stroke-width': 1.8,
  }));
  parts.push(text({
    x: FD_CX, y: FB_Y + 24, content: 'When you pass 0',
    'text-anchor': 'middle', 'font-size': 16, 'font-weight': 'bold', fill: '#244c5a', 'letter-spacing': '0.3',
  }));
  parts.push(`<line x1="${FB_X + 14}" y1="${FB_Y + 32}" x2="${FB_X + FB_W - 14}" y2="${FB_Y + 32}" stroke="#244c5a" stroke-width="1" opacity="0.4"/>`);
  const FD_CELL_Y = FB_Y + 44;
  [{ n: '59', dx: -FD_CELL_W }, { n: '0', dx: 0 }, { n: '1', dx: FD_CELL_W }].forEach(c => {
    parts.push(rect({
      x: FD_CX + c.dx - FD_CELL_W / 2, y: FD_CELL_Y, w: FD_CELL_W, h: FD_CELL_H,
      fill: 'url(#track-fade)', stroke: '#5a4422', 'stroke-width': 1.6,
    }));
    parts.push(text({
      x: FD_CX + c.dx, y: FD_CELL_Y + FD_CELL_H / 2 + 5, content: c.n,
      'text-anchor': 'middle', 'font-size': 15, 'font-weight': 'bold', fill: '#5a4422',
    }));
  });
  const fdChitY = FD_CELL_Y + FD_CELL_H + 26;
  const fdR = 14;
  const blankCx = FD_CX - FD_CELL_W;   // under "59"
  const plusCx = FD_CX + FD_CELL_W;    // under "1"
  parts.push(`<circle cx="${blankCx}" cy="${fdChitY}" r="${fdR}" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>`);
  parts.push(plus60Badge(plusCx, fdChitY, fdR));
  parts.push(`<line x1="${(blankCx + fdR + 3).toFixed(1)}" y1="${fdChitY}" x2="${(plusCx - fdR - 5).toFixed(1)}" y2="${fdChitY}" stroke="#244c5a" stroke-width="2.5" stroke-linecap="round" marker-end="url(#arrow)"/>`);
  parts.push(`</g>`);

  // ---- "Pay 🐟" box (left of the row): title + a left-to-right arrow showing
  //      the direction your pawn advances along the fish track. ----
  const PAY_CX = PAY_X + PAY_W / 2;
  parts.push(`<g id="pay-fish">`);
  parts.push(rect({
    x: PAY_X, y: TOPBOX_Y, w: PAY_W, h: TOPBOX_H, rx: 10, ry: 10,
    fill: '#fff', stroke: '#244c5a', 'stroke-width': 1.8,
  }));
  const payTitleY = TOPBOX_Y + 56;
  const payFishW = 22, payFishH = 16;
  parts.push(text({
    x: PAY_CX - 4, y: payTitleY, content: 'Pay', 'text-anchor': 'end',
    'font-size': 16, 'font-weight': 'bold', fill: '#244c5a',
  }));
  parts.push(`<use xlink:href="#fish" x="${(PAY_CX + 2).toFixed(2)}" y="${(payTitleY - payFishH * 0.82).toFixed(2)}" width="${payFishW}" height="${payFishH}"/>`);
  const payArrY = TOPBOX_Y + 88;
  parts.push(`<line x1="${(PAY_CX - 32).toFixed(1)}" y1="${payArrY}" x2="${(PAY_CX + 28).toFixed(1)}" y2="${payArrY}" stroke="#244c5a" stroke-width="2.5" stroke-linecap="round" marker-end="url(#arrow)"/>`);
  parts.push(`</g>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

const out = path.resolve(__dirname, 'fish-board.svg');
fs.writeFileSync(out, buildSvg(), 'utf8');
console.log(`wrote ${out}`);
