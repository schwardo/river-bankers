#!/usr/bin/env python3
"""Composite River Bankers "action shot" images for the TGC shop page.

Renders 3 800x600 JPGs from existing board / card / chit assets:
  shop-action-wide.jpg     — top-down overview with player tableaus
  shop-action-auction.jpg  — close-up of an auction-in-progress
  shop-action-build.jpg    — close-up of a build (paying material costs)

Usage:
  python3 _compose_shots.py            # writes the 3 jpgs into graphics/shop/
"""

import json
import os
import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent.parent  # games/river-bankers
GFX  = ROOT / 'graphics'
SHOP = GFX / 'shop'
OUT_W, OUT_H = 800, 600
JPEG_QUALITY = 88

# ---------- SVG-logical coordinates from river-board.svg ----------
RIVER_SVG_W = 1625
RIVER_SVG_H = 1025
# Top-row slots (Headwaters + material deck, y=12.50, h=300)
HW_SLOTS = {  # board-coord (sx, sy) of card sub-slot top-left + sub-slot size
    'deck': (43.50,  12.50),
    'HW3':  (418.50, 12.50),
    'HW2':  (793.50, 12.50),
    'HW1':  (1168.50, 12.50),
}
HW_SUBSLOT = (10, 48, 330, 242)  # (dx, dy, w, h) within outer 350x300 rect
# Bottom-row river slots (each 350x599, two card sub-slots stacked)
RIVER_SLOTS = {
    'R1': (43.50,   413.50),
    'R2': (418.50,  413.50),
    'R3': (793.50,  413.50),
    'R4': (1168.50, 413.50),
}
RIVER_SUBSLOT_TOP    = (10, 48,  330, 242)
RIVER_SUBSLOT_BOTTOM = (10, 298, 330, 242)

SPECIES = ['beaver', 'otter', 'muskrat', 'mink']
SPECIES_LABEL = {
    'beaver':  'Beaver',
    'otter':   'River Otter',
    'muskrat': 'Muskrat',
    'mink':    'Mink',
}

MATERIAL_DIR  = GFX / 'material-deck' / 'out' / 'web'
STRUCTURE_DIR = GFX / 'structure-deck' / 'out' / 'web'
STARTER_DIR   = GFX / 'starter-deck' / 'out' / 'web'
CHIT_DIR      = GFX / 'worker-chits'
BLANK_PATH    = GFX / 'blank-chit' / 'blank-chit.png'
RIVER_PNG     = GFX / 'river-board' / 'river-board.png'
FISH_PNG      = GFX / 'fish-board' / 'fish-board.png'
BACK_MAT      = GFX / 'material-deck-back.png'
BACK_STR      = GFX / 'structure-deck-back.png'

# ---------- Asset loading ----------
def load_landscape_river_board(target_w):
    """Load the portrait river-board PNG and rotate to landscape "play
    orientation" (Headwaters on top, River on bottom, Shoreline on right)."""
    img = Image.open(RIVER_PNG).convert('RGBA')
    # PNG is printed portrait (rotated CW from play). Rotate CCW to recover.
    img = img.rotate(90, expand=True)
    w, h = img.size
    target_h = int(target_w * h / w)
    return img.resize((target_w, target_h), Image.LANCZOS)

def load_fish_board(target_w):
    img = Image.open(FISH_PNG).convert('RGBA')
    w, h = img.size
    target_h = int(target_w * h / w)
    return img.resize((target_w, target_h), Image.LANCZOS)

def list_material_cards():
    return sorted([p.name for p in MATERIAL_DIR.glob('*.png')])

def material_index():
    """Return {material_key: [(filename, icon_count), ...]} from cards.json."""
    data = json.load((GFX / 'material-deck' / 'cards.json').open())
    out = {}
    for c in data['cards']:
        slug = ''.join(ch for ch in c['name'] if ch.isalnum()) + '.png'
        out.setdefault(c['material'], []).append((slug, c['icons']))
    return out

def list_structure_cards():
    return sorted([p.name for p in STRUCTURE_DIR.glob('*.png')])

def load_card_material(name, target_w):
    img = Image.open(MATERIAL_DIR / name).convert('RGBA')
    w, h = img.size
    target_h = int(target_w * h / w)
    return img.resize((target_w, target_h), Image.LANCZOS)

def load_card_structure(name, target_w):
    img = Image.open(STRUCTURE_DIR / name).convert('RGBA')
    w, h = img.size
    target_h = int(target_w * h / w)
    return img.resize((target_w, target_h), Image.LANCZOS)

_CHIT_CACHE = {}
def load_chit(species, diameter):
    """Load worker chit PNG, mask to a circle, resize to `diameter`."""
    key = (species, diameter)
    if key in _CHIT_CACHE:
        return _CHIT_CACHE[key]
    img = Image.open(CHIT_DIR / f'{species}.png').convert('RGBA')
    # Source is a 300×300 square with the chit illustration. Mask it to a
    # circle so it reads as a disc worker.
    src = img.resize((diameter, diameter), Image.LANCZOS)
    mask = Image.new('L', (diameter, diameter), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, diameter - 1, diameter - 1], fill=255)
    out = Image.new('RGBA', (diameter, diameter), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    _CHIT_CACHE[key] = out
    return out

# Card-icon layout constants from graphics/material-deck/generate.py
ICON_DIAM_PT = 0.63 * 72.0       # 45.36 pt
ICON_GAP_PT  = 6.0
CANVAS_W_PT  = 270.0
CANVAS_H_PT  = 198.0
ICON_AREA_TOP_PT             = 44.0
ICON_AREA_BOTTOM_VANILLA_PT  = 178.0
ICON_AREA_BOTTOM_EFFECT_PT   = 154.0
ICON_LAYOUTS = {4: [4], 5: [3, 2], 7: [4, 3], 8: [4, 4]}

def icon_centers_for(icon_count, has_effect):
    """Return [(x_ratio, y_ratio), ...] for icon centers within a card,
    expressed as fractions of card width/height (logical 270×198)."""
    rows = ICON_LAYOUTS[icon_count]
    top = ICON_AREA_TOP_PT
    bottom = ICON_AREA_BOTTOM_EFFECT_PT if has_effect else ICON_AREA_BOTTOM_VANILLA_PT
    avail = bottom - top
    radius = ICON_DIAM_PT / 2
    if len(rows) == 1:
        ys = [top + avail / 2]
    else:
        rows_h = 2 * ICON_DIAM_PT + ICON_GAP_PT
        cy_top = top + (avail - rows_h) / 2 + radius
        cy_bot = cy_top + ICON_DIAM_PT + ICON_GAP_PT
        ys = [cy_top, cy_bot]
    out = []
    for ri, count in enumerate(rows):
        row_w = count * ICON_DIAM_PT + (count - 1) * ICON_GAP_PT
        x_first = CANVAS_W_PT / 2 - row_w / 2 + radius
        for ci in range(count):
            cx = x_first + ci * (ICON_DIAM_PT + ICON_GAP_PT)
            out.append((cx / CANVAS_W_PT, ys[ri] / CANVAS_H_PT))
    return out

def load_blank(diameter):
    img = Image.open(BLANK_PATH).convert('RGBA')
    return img.resize((diameter, diameter), Image.LANCZOS)

# ---------- Table background ----------
def make_table(w, h):
    """Dark green felt background with a subtle vignette."""
    base = Image.new('RGB', (w, h), (38, 60, 48))
    # Add some subtle noise for a felt feel.
    noise = Image.effect_noise((w, h), 12).convert('L')
    noise = noise.point(lambda v: 240 - v)  # invert + soften
    overlay = Image.new('RGB', (w, h), (50, 78, 60))
    base = Image.composite(overlay, base, noise.point(lambda v: min(255, v // 3)))
    # Vignette: darken edges.
    vignette = Image.new('L', (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    half = min(w, h) // 2
    for i in range(half):
        alpha = int(80 * (1 - i / half))
        vd.rectangle([i, i, w - i, h - i], outline=alpha)
    vignette = vignette.filter(ImageFilter.GaussianBlur(40))
    dark = Image.new('RGB', (w, h), (0, 0, 0))
    base = Image.composite(dark, base, vignette)
    return base.convert('RGBA')

# ---------- River-board slot mapping ----------
def svg_to_board(sx, sy, board_w, board_h):
    """Map SVG-logical (sx, sy) to pixel coords inside a board image of size (board_w, board_h)."""
    return (int(sx * board_w / RIVER_SVG_W), int(sy * board_h / RIVER_SVG_H))

def slot_card_box(slot_xy_svg, subslot_offset, board_w, board_h):
    """Return (px, py, pw, ph) for the card sub-slot within the board image."""
    sx, sy = slot_xy_svg
    dx, dy, dw, dh = subslot_offset
    px, py = svg_to_board(sx + dx, sy + dy, board_w, board_h)
    pw     = int(dw * board_w / RIVER_SVG_W)
    ph     = int(dh * board_h / RIVER_SVG_H)
    return (px, py, pw, ph)

# ---------- Placement primitives ----------
def paste_card_in_slot(canvas, board_origin, slot_box, card_img):
    """Place card_img centered in slot_box. board_origin shifts to canvas coords."""
    bx, by = board_origin
    sx, sy, sw, sh = slot_box
    # Scale card to fit slot, keeping landscape orientation.
    cw, ch = card_img.size
    scale = min(sw / cw, sh / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    card_resized = card_img.resize((nw, nh), Image.LANCZOS)
    cx = bx + sx + (sw - nw) // 2
    cy = by + sy + (sh - nh) // 2
    canvas.alpha_composite(card_resized, (cx, cy))
    return (cx, cy, nw, nh)  # actual placed bounds

def paste_chit(canvas, x, y, chit_img):
    """Paste a worker chit centered at (x, y)."""
    cw, ch = chit_img.size
    canvas.alpha_composite(chit_img, (x - cw // 2, y - ch // 2))

# ---------- Wide overview ----------
# Per-phase profiles for the 3 wide shots. Each shot is the same composition;
# only the game state varies. Player tableau sizes are kept identical so the
# three images line up if shown side-by-side.
PHASE_PROFILES = {
    'early-mid': {
        'river_counts':   [1, 1, 2, 1],   # R1..R4
        'shoreline_n':    2,
        'pawn_positions': [6, 9, 12, 15],
        'fish_track_pos_range': (5, 18),
        'built_range':    (1, 3),
        'supply_range':   (4, 7),
        'worker_density': [0, 0, 1, 1, 1, 2],
    },
    'mid': {
        'river_counts':   [2, 2, 1, 3],
        'shoreline_n':    3,
        'pawn_positions': [18, 23, 27, 33],
        'fish_track_pos_range': (15, 38),
        'built_range':    (2, 4),
        'supply_range':   (3, 5),
        'worker_density': [0, 1, 1, 2, 2, 3],
    },
    'late-mid': {
        'river_counts':   [1, 2, 1, 2],
        'shoreline_n':    4,
        'pawn_positions': [38, 44, 48, 53],
        'fish_track_pos_range': (35, 55),
        'built_range':    (3, 5),
        'supply_range':   (2, 4),
        'worker_density': [0, 1, 2, 2, 3, 3],
    },
}

def render_wide_overview(seed=7, phase='mid'):
    random.seed(seed)
    profile = PHASE_PROFILES[phase]
    canvas = make_table(OUT_W, OUT_H)
    draw = ImageDraw.Draw(canvas)

    # Layout: river board top-left, fish board top-right, shoreline strip
    # spanning the width of the river board JUST BELOW it (landscape cards),
    # then the 2×2 player tableau grid along the bottom.
    rb_x, rb_y = 12, 12
    board_w = 470
    river = load_landscape_river_board(board_w)
    rb_w, rb_h = river.size
    canvas.alpha_composite(river, (rb_x, rb_y))

    fish_w = 200
    fish = load_fish_board(fish_w)
    fb_w, fb_h = fish.size
    fb_x, fb_y = OUT_W - fb_w - 12, 14
    canvas.alpha_composite(fish, (fb_x, fb_y))

    # Shoreline strip — vertical column to the right of the river board
    # (between river and fish boards). Cards stay landscape and each one
    # shows the workers that won it (no card reaches the shore without
    # workers).
    sh_strip_x = rb_x + rb_w + 6
    sh_strip_y = rb_y
    sh_strip_w = fb_x - sh_strip_x - 6
    sh_strip_h = rb_h

    # Pick material cards for the river / headwaters slots.
    mats = list_material_cards()
    random.shuffle(mats)
    mat_iter = iter(mats)

    hw_state = {
        'HW1': next(mat_iter),
        'HW2': next(mat_iter),
        'HW3': next(mat_iter),
    }
    river_state = {
        f'R{i + 1}': [next(mat_iter) for _ in range(n)]
        for i, n in enumerate(profile['river_counts'])
    }
    shoreline = [next(mat_iter) for _ in range(profile['shoreline_n'])]

    # Place HW + river cards. Card target width on board ≈ 0.86 × slot width
    # so the rendered card sits inside the dashed sub-slot with some margin.
    card_target_w = max(200, int(280 * board_w / 540))
    placed_cards = {}  # slot -> (cx, cy, cw, ch) bounding box of topmost
    for slot_name, slot_svg in HW_SLOTS.items():
        if slot_name == 'deck':
            continue
        if slot_name in hw_state:
            box = slot_card_box(slot_svg, HW_SUBSLOT, rb_w, rb_h)
            card = load_card_material(hw_state[slot_name], card_target_w)
            placed_cards[slot_name] = paste_card_in_slot(
                canvas, (rb_x, rb_y), box, card)

    # Material deck — render a card back stack
    deck_box = slot_card_box(HW_SLOTS['deck'], HW_SUBSLOT, rb_w, rb_h)
    if BACK_MAT.exists():
        back = Image.open(BACK_MAT).convert('RGBA').resize(
            (card_target_w, int(card_target_w * 750 / 1050)), Image.LANCZOS)
        paste_card_in_slot(canvas, (rb_x, rb_y), deck_box, back)

    for slot_name, slot_svg in RIVER_SLOTS.items():
        cards = river_state[slot_name]
        for i, card_name in enumerate(cards):
            # Up to 2 cards per slot in dedicated TOP/BOTTOM sub-slots; a 3rd
            # card stacks on the bottom slot with a small offset to show depth.
            if i == 0:
                box = slot_card_box(slot_svg, RIVER_SUBSLOT_TOP, rb_w, rb_h)
            elif i == 1:
                box = slot_card_box(slot_svg, RIVER_SUBSLOT_BOTTOM, rb_w, rb_h)
            else:
                box = slot_card_box(slot_svg, RIVER_SUBSLOT_BOTTOM, rb_w, rb_h)
                box = (box[0] + 4, box[1] + 4, box[2], box[3])
            card_img = load_card_material(card_name, card_target_w)
            placed_cards[f'{slot_name}.{i}'] = paste_card_in_slot(
                canvas, (rb_x, rb_y), box, card_img)

    # Shoreline column — landscape material cards stacked vertically in the
    # narrow strip to the right of the river board. Each card had workers on
    # it when it graduated (cards with zero placed workers are auctioned-
    # empty and discarded — they never reach the shoreline), so we put 1+
    # chits on every card.
    label_font = _font(9, bold=True)
    draw.text((sh_strip_x, sh_strip_y - 11), 'SHORE',
              fill=(238, 220, 178), font=label_font)
    sh_card_w = min(sh_strip_w, 92)
    sh_card_h = int(sh_card_w * 750 / 1050)
    # Vertical gap shrinks as needed to fit the stack inside the column.
    n = len(shoreline)
    gap = max(2, (sh_strip_h - n * sh_card_h) // max(1, n - 1)) if n > 1 else 0
    gap = min(gap, 8)
    mat_lookup = {''.join(ch for ch in c['name'] if ch.isalnum()) + '.png': c
                  for c in json.load((GFX / 'material-deck' / 'cards.json').open())['cards']}
    shore_chit_d = max(10, int(sh_card_w * ICON_DIAM_PT / CANVAS_W_PT))
    shore_chits = {sp: load_chit(sp, shore_chit_d) for sp in SPECIES}
    for i, name in enumerate(shoreline):
        cx = sh_strip_x + (sh_strip_w - sh_card_w) // 2
        cy = sh_strip_y + i * (sh_card_h + gap)
        # Soft shadow under each card.
        shadow = Image.new('RGBA', (sh_card_w + 8, sh_card_h + 8), (0, 0, 0, 0))
        sdr = ImageDraw.Draw(shadow)
        sdr.rectangle([4, 4, sh_card_w + 4, sh_card_h + 4], fill=(0, 0, 0, 110))
        shadow = shadow.filter(ImageFilter.GaussianBlur(3))
        canvas.alpha_composite(shadow, (cx - 4, cy - 4))
        c = load_card_material(name, sh_card_w)
        canvas.alpha_composite(c, (cx, cy))
        # Workers: at least 1, up to min(icons, 4). Mix of species.
        meta = mat_lookup.get(name)
        icon_count = meta['icons'] if meta else 5
        has_effect = bool(meta and meta.get('effect'))
        centers = icon_centers_for(icon_count, has_effect=has_effect)
        n_workers = random.randint(1, min(len(centers), 4))
        species_choices = random.sample(SPECIES, k=min(n_workers, len(SPECIES)))
        while len(species_choices) < n_workers:
            species_choices.append(random.choice(SPECIES))
        for j in range(n_workers):
            rx, ry = centers[j]
            paste_chit(canvas, cx + int(rx * sh_card_w),
                       cy + int(ry * sh_card_h),
                       shore_chits[species_choices[j]])

    # Place workers (random species) on a subset of placed river cards.
    species_chits_small = {sp: load_chit(sp, 18) for sp in SPECIES}
    worker_density = profile['worker_density']
    for key, box in placed_cards.items():
        cx, cy, cw, ch = box
        if 'HW' in key:
            n_workers = 0
        else:
            n_workers = random.choice(worker_density)
        for i in range(n_workers):
            sp = random.choice(SPECIES)
            wx = cx + 12 + i * 18
            wy = cy + ch - 22
            paste_chit(canvas, wx, wy, species_chits_small[sp])

    # Pawns on the fish-track. Match the species order to a sensible fish-track
    # distribution drawn from the phase profile, then place chits as pawns.
    pawn_xy = fish_track_pixel(fb_x, fb_y, fb_w, fb_h)
    for sp, pos in zip(SPECIES, profile['pawn_positions']):
        px, py = pawn_xy(pos)
        pawn = load_chit(sp, 18)
        paste_chit(canvas, px, py, pawn)

    # Player tableaus along the bottom (2x2 grid). Top of strip starts below
    # the shoreline row, leaving the river board untouched.
    tab_top = sh_strip_y + sh_strip_h + 8
    structures = list_structure_cards()
    random.shuffle(structures)
    str_iter = iter(structures)
    built_lo, built_hi = profile['built_range']
    supply_lo, supply_hi = profile['supply_range']
    avail_h = OUT_H - tab_top - 4
    th = (avail_h - 6) // 2  # 2 rows with 6px gap
    for i, sp in enumerate(SPECIES):
        col = i % 2
        row = i // 2
        tx = 8 + col * 396
        ty = tab_top + row * (th + 6)
        tw = 388
        draw_player_tableau(canvas, tx, ty, tw, th, sp, str_iter,
                            built_count=random.randint(built_lo, built_hi),
                            supply_count=random.randint(supply_lo, supply_hi),
                            species_chits_small=species_chits_small)
    return canvas


def _font(size, bold=False):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    try:
        return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}', size)
    except Exception:
        return ImageFont.load_default()

def fish_track_pixel(fb_x, fb_y, fb_w, fb_h):
    """Return a function mapping fish-track space (0..59) to a canvas pixel.
    The fish board's outer ring of 60 squares occupies the perimeter; this is
    an approximation that places pawns visibly along the ring.
    """
    margin = int(fb_w * 0.05)
    inner_w = fb_w - 2 * margin
    inner_h = fb_h - 2 * margin
    def f(space):
        s = space % 60
        # 15 per side
        if s <= 14:
            # top row, left-to-right
            t = s / 14
            return (fb_x + margin + int(t * inner_w), fb_y + margin // 2 + 14)
        if s <= 29:
            t = (s - 14) / 15
            return (fb_x + fb_w - margin // 2 - 14, fb_y + margin + int(t * inner_h))
        if s <= 44:
            t = (s - 29) / 15
            return (fb_x + fb_w - margin - int(t * inner_w), fb_y + fb_h - margin // 2 - 14)
        t = (s - 44) / 15
        return (fb_x + margin // 2 + 14, fb_y + fb_h - margin - int(t * inner_h))
    return f

def draw_player_tableau(canvas, tx, ty, tw, th, species, str_iter,
                        built_count, supply_count, species_chits_small):
    """Draw a single player's tableau strip.
       Layout: [chit + name] [built structure thumbnails ...] [supply chits]"""
    # Background plaque (slightly lighter than felt)
    overlay = Image.new('RGBA', (tw, th), (60, 88, 70, 200))
    canvas.alpha_composite(overlay, (tx, ty))
    # Border
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([tx, ty, tx + tw, ty + th], outline=(20, 38, 28), width=2)

    # Species chit + label
    chit = species_chits_small[species].resize((28, 28), Image.LANCZOS)
    canvas.alpha_composite(chit, (tx + 8, ty + (th - 28) // 2))
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
    except Exception:
        font = ImageFont.load_default()
    draw.text((tx + 42, ty + 6), SPECIES_LABEL[species],
              fill=(238, 220, 178), font=font)

    # Built structures (thumbnails to the right of the species label)
    card_w = 50
    card_h = int(card_w * 1050 / 750)  # portrait structure card
    bx0 = tx + 42
    by  = ty + 24
    for j in range(built_count):
        try:
            name = next(str_iter)
        except StopIteration:
            break
        c = load_card_structure(name, card_w)
        canvas.alpha_composite(c, (bx0 + j * (card_w + 4), by))

    # Supply chits (right side of strip)
    chit_d = 16
    sx_end = tx + tw - 8
    sy = ty + th - chit_d - 8
    for j in range(supply_count):
        c = species_chits_small[species].resize((chit_d, chit_d), Image.LANCZOS)
        canvas.alpha_composite(c, (sx_end - (j + 1) * (chit_d + 2), sy))
    # "Hand" count - face-down structure cards
    hand_count = random.choice([2, 3])
    hand_w = 24
    hand_h = int(hand_w * 1050 / 750)
    if BACK_STR.exists():
        back = Image.open(BACK_STR).convert('RGBA').resize((hand_w, hand_h), Image.LANCZOS)
        hx = sx_end - 30
        hy = ty + 6
        for j in range(hand_count):
            canvas.alpha_composite(back, (hx - j * 6, hy + j * 2))

# ---------- Closeups ----------
def render_auction_closeup(seed=11):
    """Zoom on a River-2 card being contested: 3 cards stacked in the slot,
    workers from two species being placed, fish-track snippet on the side."""
    random.seed(seed)
    canvas = make_table(OUT_W, OUT_H)
    draw = ImageDraw.Draw(canvas)
    # Heading
    try:
        title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
        body_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    draw.text((24, 18), 'Auction — workers placed on uncovered icons',
              fill=(238, 220, 178), font=title_font)
    # Subtitle: "River 2 · 3🐟 per item"
    draw.text((24, 50), 'River 2 — 3 fish per item',
              fill=(180, 200, 188), font=body_font)

    # Pick a 7-icon Logs card (Logjam) so we can show a contested River-2
    # auction with workers from multiple species on individual log icons.
    mat_idx = material_index()
    name = next((n for n, ic in mat_idx['logs'] if ic == 7), mat_idx['logs'][0][0])
    icon_count = 7
    card_w = 520
    card = load_card_material(name, card_w)
    cw, ch = card.size
    cx = (OUT_W - cw) // 2
    cy = 100
    # Drop shadow
    shadow = Image.new('RGBA', (cw + 24, ch + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rectangle([12, 12, cw + 12, ch + 12], fill=(0, 0, 0, 140))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(shadow, (cx - 12, cy - 12))
    canvas.alpha_composite(card, (cx, cy))

    # Workers land on actual icon positions derived from the card layout,
    # sized to match the icon disc (0.63" footprint on the card).
    chit_d = max(20, int(card_w * ICON_DIAM_PT / CANVAS_W_PT))
    chits = {sp: load_chit(sp, chit_d) for sp in SPECIES}
    centers = icon_centers_for(icon_count, has_effect=True)  # 7→[4,3]
    icon_xy = [(cx + int(rx * cw), cy + int(ry * ch)) for (rx, ry) in centers]

    # 6 workers on icons: beaver×2, mink×1, muskrat×1, otter×2 — matches the
    # Bids panel below. 1 icon stays uncovered (a one-icon "leftover" example).
    placements = [
        ('beaver',  icon_xy[0]),
        ('beaver',  icon_xy[1]),
        ('mink',    icon_xy[2]),
        ('otter',   icon_xy[3]),
        ('muskrat', icon_xy[4]),
        ('otter',   icon_xy[6]),
    ]
    for sp, (x, y) in placements:
        paste_chit(canvas, x, y, chits[sp])

    # Side caption: bid summary
    cap_x = 24
    cap_y = OUT_H - 160
    panel = Image.new('RGBA', (260, 130), (28, 50, 38, 220))
    canvas.alpha_composite(panel, (cap_x, cap_y))
    draw.rectangle([cap_x, cap_y, cap_x + 260, cap_y + 130],
                   outline=(20, 38, 28), width=2)
    draw.text((cap_x + 10, cap_y + 8), 'Bids', fill=(238, 220, 178), font=title_font)
    bid_lines = [
        ('Beaver',  2, 'beaver'),
        ('Mink',    1, 'mink'),
        ('Muskrat', 1, 'muskrat'),
        ('Otter',   2, 'otter'),
    ]
    for i, (label, n, sp) in enumerate(bid_lines):
        ly = cap_y + 40 + i * 22
        small = chits[sp].resize((18, 18), Image.LANCZOS)
        canvas.alpha_composite(small, (cap_x + 12, ly))
        draw.text((cap_x + 36, ly + 1),
                  f'{label}: {n} worker' + ('s' if n != 1 else ''),
                  fill=(238, 220, 178), font=body_font)

    return canvas

def render_build_closeup(seed=13):
    """Zoom on a structure card being built — material cards with workers
    on them feed into a structure card cost in the foreground."""
    random.seed(seed)
    canvas = make_table(OUT_W, OUT_H)
    draw = ImageDraw.Draw(canvas)
    try:
        title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
        body_font  = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    draw.text((24, 18), 'Build — spend workers from material cards',
              fill=(238, 220, 178), font=title_font)
    draw.text((24, 50), 'Beaver Dam: 4 logs + 2 mud',
              fill=(180, 200, 188), font=body_font)

    # Structure card on the left (large)
    struct_w = 260
    struct_h = int(struct_w * 1050 / 750)
    # Pick Beaver Dam if it exists, else any structure
    name = 'BeaverDam.png' if (STRUCTURE_DIR / 'BeaverDam.png').exists() else \
           next(iter(STRUCTURE_DIR.glob('*.png'))).name
    struct = load_card_structure(name, struct_w)
    sx, sy = 36, 100
    shadow = Image.new('RGBA', (struct_w + 24, struct_h + 24), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rectangle([12, 12, struct_w + 12, struct_h + 12], fill=(0, 0, 0, 140))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(shadow, (sx - 12, sy - 12))
    canvas.alpha_composite(struct, (sx, sy))

    # Material cards on the right with beaver workers on them
    mat_idx = material_index()
    # Pick the 7-icon Logs card so 4 workers fit cleanly across two rows;
    # pick a 4-icon Mud card so 2 workers sit on a single-row layout.
    logs_card = next((n for n, ic in mat_idx['logs'] if ic == 7), mat_idx['logs'][0][0])
    mud_card  = next((n for n, ic in mat_idx['mud']  if ic == 4), mat_idx['mud'][0][0])
    placements = [
        (logs_card, 7, 4, 320, 110),  # (filename, icons, n_workers, x, y)
        (mud_card,  4, 2, 320, 320),
    ]
    for name, icons, n_workers, mx, my in placements:
        card_w = 380
        card = load_card_material(name, card_w)
        cw, ch = card.size
        # Drop shadow
        shadow = Image.new('RGBA', (cw + 20, ch + 20), (0, 0, 0, 0))
        sdr = ImageDraw.Draw(shadow)
        sdr.rectangle([10, 10, cw + 10, ch + 10], fill=(0, 0, 0, 110))
        shadow = shadow.filter(ImageFilter.GaussianBlur(6))
        canvas.alpha_composite(shadow, (mx - 10, my - 10))
        canvas.alpha_composite(card, (mx, my))
        # Worker chits sized to the actual icon disc on the card (≈ card_w * 45.36/270).
        chit_d = max(20, int(card_w * ICON_DIAM_PT / CANVAS_W_PT))
        chit = load_chit('beaver', chit_d)
        centers = icon_centers_for(icons, has_effect=True)
        for i in range(min(n_workers, len(centers))):
            rx, ry = centers[i]
            paste_chit(canvas, mx + int(rx * cw), my + int(ry * ch), chit)

    # Arrow from materials to structure (visual cue)
    arrow_y = sy + struct_h // 2
    draw.line([(sx + struct_w + 14, arrow_y), (300, arrow_y)],
              fill=(238, 220, 178), width=3)
    draw.polygon([(sx + struct_w + 14, arrow_y - 8),
                  (sx + struct_w + 14, arrow_y + 8),
                  (sx + struct_w + 26, arrow_y)],
                 fill=(238, 220, 178))

    return canvas

# ---------- Main ----------
def save_jpg(img, path):
    img.convert('RGB').save(path, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
    print(f'wrote {path}')

def main():
    SHOP.mkdir(parents=True, exist_ok=True)
    shots = [
        ('shop-action-1.jpg', 7,  'early-mid'),
        ('shop-action-2.jpg', 23, 'mid'),
        ('shop-action-3.jpg', 42, 'late-mid'),
    ]
    for filename, seed, phase in shots:
        save_jpg(render_wide_overview(seed=seed, phase=phase), SHOP / filename)
    # Clean up legacy single-wide / closeup outputs if present.
    for legacy in ('shop-action-wide.jpg', 'shop-action-auction.jpg', 'shop-action-build.jpg'):
        p = SHOP / legacy
        if p.exists():
            p.unlink()
            print(f'removed {p}')

if __name__ == '__main__':
    main()
