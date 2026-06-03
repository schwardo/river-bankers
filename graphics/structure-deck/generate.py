#!/usr/bin/env python3
"""
Generate River Bankers Structure card PNGs from template.svg + cards.json.

  Card geometry: 2.5" × 3.5" trim, 0.125" bleed → 2.75" × 3.75" full
                 (portrait orientation — TGC poker-card.svg right-side-up).
  44 main-deck cards. Species starter cards are out of scope here.

Layout zones (pt, inside 18..180 × 18..252 safe area):
  Header band  y=18..46    title + VP medallion
  Cost row     y=52..82    fish cost disc + material cost icons
  Art panel    y=88..146   blank for now (future illustration)
  Effect box   y=152..250  italic effect prose

Output: out/print/<CardName>.png (one per card, 825×1125 @ 300 DPI portrait,
                                   full bleed — ready for TGC upload).

Usage:
  python3 generate.py
  python3 generate.py --dpi 600
  python3 generate.py --only "Beaver Dam"
  python3 generate.py --keep-svg

Renderer: prefers `rsvg-convert`, falls back to `inkscape`.
"""

import argparse
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "template.svg"
CARDS_JSON = HERE / "cards.json"
OUT_DIR = HERE / "out"
PRINT_DIR = OUT_DIR / "print"
WEB_DIR = OUT_DIR / "web"

# Card canvas (pt) — matches TGC poker-card.svg, portrait.
CANVAS_W_PT = 198.0
CANVAS_H_PT = 270.0

# --------------------- header geometry ---------------------
# VP indicator sits at the right edge of the header band, baseline aligned
# with the title (title.y=37, vp.y=37). Format: "<N> ★".
VP_X = 176.0
VP_Y = 37.0

# --------------------- cost row geometry ---------------------
# Cost row holds fish cost (first) + 1-3 material discs, all centered and
# evenly spaced across the safe-area width. Each slot is COST_ELEMENT_W
# wide; gap between slots stretches to fill the row (with a max so a 1-
# or 2-element card doesn't fling its icons to the edges).
COST_ROW_Y = 78.0                   # vertical center of the FIRST row
COST_ROW_GAP_Y = 66.0               # vertical distance between row centers
COST_ROW_X = 26.0                   # 8pt inset from the header / effect boxes
COST_ROW_W = 146.0                  # 162pt safe area − 2×8pt inset
COST_ELEMENT_W = 32.0               # slot width = material disc diameter
COST_GAP_MAX = 40.0                 # max gap between slot centers (after disc edge)
COST_MAX_PER_ROW = 3                # fish + materials wrap to a new row past this
COST_DISC_DIAM_PT = COST_ELEMENT_W
COST_DISC_RADIUS_PT = COST_DISC_DIAM_PT / 2

# --------------------- effect block geometry ---------------------
# The box is anchored at the BOTTOM of the safe area; the top edge floats
# upward depending on how many wrapped lines the prose needs. This keeps
# the box snug around the text and leaves the "art" area above it.
EFFECT_BLOCK_X = 18.0
EFFECT_BLOCK_BOTTOM = 250.0
EFFECT_BLOCK_W = 162.0
EFFECT_BLOCK_PAD = 6.0                # padding above first line / below last
EFFECT_TEXT_LEFT = EFFECT_BLOCK_X + 5
EFFECT_TEXT_RIGHT = EFFECT_BLOCK_X + EFFECT_BLOCK_W - 5

# Available text width = 152pt. 6.5pt italic averages ~4 pt/char in print
# (slightly wider than a non-italic face), so 32 chars/line is the safe
# ceiling — keeps the longest cards (Burrow Network, ~290 chars) under
# 10 lines without overrunning the right margin.
EFFECT_WRAP_CHARS = 32
EFFECT_LINE_H = 10.0

# Font-metric approximations for the centering formula (6.5pt italic).
_FONT_ASCENDER = 5.0
_FONT_DESCENDER = 1.5


# --------------------- material glyphs ---------------------
# Same canonical silhouettes as graphics/icons/<material>.svg — the source
# of truth shared with material-deck/generate.py and the web prototype.
# Each source SVG uses viewBox="-15 -15 30 30" with shapes occupying ~±14
# units; we shrink them to ~70% (COST_GLYPH_SCALE) so they fit the smaller
# 32pt cost disc with a count badge tucked into the lower-right corner.
# Edit graphics/icons/<material>.svg (not this code) to change the art.
ICONS_DIR = HERE.parent / "icons"
_SVG_TAG_RE = re.compile(r"<svg\b[^>]*>(.*?)</svg>", re.DOTALL)
# Shared silhouettes are authored at ~28pt extent (±14 in their viewBox).
# We want them at ~27pt visual extent (±13.5pt) — same as the pre-shared
# inline copy used here — so they fill the 32pt disc with a sliver of
# inner padding and the lower-right count badge clips the silhouette by
# only a hair (intentional: badge always sits on top).
COST_GLYPH_SCALE = 0.95


def _load_icon_body(material_key: str) -> str:
    path = ICONS_DIR / f"{material_key}.svg"
    text = path.read_text()
    text = re.sub(r"<\?xml[^?]*\?>", "", text)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    m = _SVG_TAG_RE.search(text)
    if not m:
        sys.exit(f"error: no <svg> body in {path}")
    return m.group(1).strip()


MATERIAL_GLYPHS = {key: _load_icon_body(key)
                   for key in ("logs", "stones", "reeds", "mud", "vines", "clay")}


# --------------------- helpers ---------------------

def safe_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "", name)


def wrap_words(text: str, max_chars: int):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_chars:
            cur = cur + " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# --------------------- per-card SVG fragments ---------------------

def render_title_block(card):
    """Auto-fit the title font so it clears the VP indicator on the right.
    VP at 13pt serif bold needs ~32pt; title baseline starts at x=22, so the
    title has ~122pt of horizontal room. DejaVu Serif Bold averages ~0.75 ×
    font-size pt per char, so we pick the biggest size that fits."""
    name = card["name"]
    L = len(name)
    if L <= 10:
        size = 12
    elif L <= 12:
        size = 11
    elif L <= 13:
        size = 10
    else:
        size = 9
    # Baseline y nudges with font size so caps stay vertically centered in
    # the header band (y=18..46, center y=32).
    y = {12: 37, 11: 37, 10: 36, 9: 35}[size]
    return (
        f'<text x="22" y="{y}" font-size="{size}pt" class="card-name">'
        f'{html.escape(name)}</text>'
    )


def render_vp_block(card):
    """Right-aligned 'N★' in the header band — separated by a thin space
    (U+2009) so the number sits visually close to the star.

    End-game scoring is reflected in the label so the printed VP isn't
    misleading on cards that grow during scoring:
      vp=0, no end-game effect   →  '0 ★'
      vp=0, end-game effect      →  '? ★'
      vp=N, no end-game effect   →  'N ★'
      vp=N, end-game effect      →  'N+? ★' (fixed base plus variable bonus)
    """
    vp = card.get("vp", 0)
    effect = card.get("effect") or ""
    has_endgame = bool(re.search(r"End [Gg]ame", effect))
    if vp == 0:
        label = "? ★" if has_endgame else "0 ★"
    elif has_endgame:
        label = f"{vp}+? ★"
    else:
        label = f"{vp} ★"
    return (
        f'<text x="{VP_X}" y="{VP_Y}" text-anchor="end" class="vp-text">'
        f'{html.escape(label)}</text>'
    )


# Inline fish silhouette (centered on (0,0), ~16pt wide horizontally) used
# next to the fish-cost number. Tail forks right, head left.
_FISH_GLYPH = (
    '<path d="M -8 0 Q -6 -4 0 -4 Q 6 -4 8 0 Q 6 4 0 4 Q -6 4 -8 0 Z '
    'M 8 0 L 11 -3 L 11 3 Z" fill="#1a4565"/>'
    '<circle cx="-4" cy="-1" r="0.9" fill="#ffffff"/>'
)


def _cost_slot_centers(n: int):
    """Return list of slot center x-coordinates for n cost elements
    (fish + materials). Slots are COST_ELEMENT_W wide; gap stretches to
    fill COST_ROW_W up to COST_GAP_MAX, then the group centers."""
    if n <= 0:
        return []
    if n == 1:
        return [COST_ROW_X + COST_ROW_W / 2]
    raw_gap = (COST_ROW_W - n * COST_ELEMENT_W) / (n - 1)
    gap = min(COST_GAP_MAX, max(0.0, raw_gap))
    total_w = n * COST_ELEMENT_W + (n - 1) * gap
    start_cx = COST_ROW_X + (COST_ROW_W - total_w) / 2 + COST_ELEMENT_W / 2
    return [start_cx + i * (COST_ELEMENT_W + gap) for i in range(n)]


def _render_fish_slot(card, cx: float, cy: float):
    """Fish-cost element ('N' + fish silhouette) centered on (cx, cy) within
    a COST_ELEMENT_W slot. Number sits in the left half, glyph in the right.
    "Fish ×N" label sits below with the SAME visual gap to the glyph as the
    material discs have to their labels — the fish silhouette is much
    smaller than a 32pt disc, so its label_y is closer to cy."""
    n = card.get("time", 0)
    num_x = cx - 13                  # text-anchor=start; digit renders right of here
    glyph_cx = cx + 11               # ~10pt of clear space between digit and fish
    # Same baseline as the material labels so all cost labels in a row line
    # up horizontally (fish slot has more visual whitespace above the label
    # since its glyph footprint is smaller than the 32pt disc — that's fine).
    label_y = cy + COST_DISC_RADIUS_PT + 16
    return (
        f'  <text x="{num_x:.2f}" y="{cy + 5:.2f}" class="fish-text">{n}</text>\n'
        f'  <g transform="translate({glyph_cx:.2f} {cy:.2f})">{_FISH_GLYPH}</g>\n'
        f'  <text x="{cx:.2f}" y="{label_y:.2f}" class="cost-label" fill="#1a4565">Fish ×{n}</text>'
    )


def _render_material_slot(mat_key: str, count: int, mat_spec: dict, cx: float, cy: float):
    """One material-cost disc centered on (cx, cy). Material's colored glyph
    inside a white disc, with a small count badge tucked lower-right and the
    material name labeled just below the disc."""
    r = COST_DISC_RADIUS_PT
    color = mat_spec["color"]
    ink = mat_spec["ink"]
    name = mat_spec["name"]
    glyph_svg = MATERIAL_GLYPHS[mat_key]
    # Label baseline sits ~16pt below the disc bottom; ink color so it ties
    # back to the material visually without competing with the disc rim.
    label_y = cy + r + 16
    return (
        f'  <circle cx="{cx:.2f}" cy="{cy}" r="{r}" fill="#ffffff" '
        f'stroke="{color}" stroke-width="1.6"/>\n'
        f'  <g transform="translate({cx:.2f} {cy}) scale({COST_GLYPH_SCALE})">\n'
        f'    {glyph_svg}\n'
        f'  </g>\n'
        f'  <circle cx="{cx + 9:.2f}" cy="{cy + 9:.2f}" r="6" '
        f'fill="#ffffff" stroke="{ink}" stroke-width="1.2"/>\n'
        f'  <text x="{cx + 9:.2f}" y="{cy + 12.3:.2f}" class="cost-number">{count}</text>\n'
        f'  <text x="{cx:.2f}" y="{label_y:.2f}" class="cost-label" fill="{ink}">{name} ×{count}</text>'
    )


def _chunk_rows(n: int, max_per_row: int):
    """Split n elements into balanced rows of ≤ max_per_row. With n=4,
    max=3 → [2, 2] (balanced) rather than [3, 1] (lone trailing icon)."""
    if n <= 0:
        return []
    num_rows = (n + max_per_row - 1) // max_per_row
    base = n // num_rows
    extra = n - base * num_rows         # first `extra` rows get one more
    return [base + (1 if i < extra else 0) for i in range(num_rows)]


def render_cost_row(card, materials):
    """Centered cost row: fish cost (first) + one disc per cost material,
    wrapped to a new row past COST_MAX_PER_ROW. Each row centers its own
    slot group; subsequent rows stack COST_ROW_GAP_Y pt below the first."""
    cost = card.get("cost", {})
    elements = ["__fish__"] + list(cost.keys())
    row_sizes = _chunk_rows(len(elements), COST_MAX_PER_ROW)
    pieces = ['<g id="cost-row" inkscape:label="Cost row">']
    elem_iter = iter(elements)
    for row_idx, size in enumerate(row_sizes):
        cy = COST_ROW_Y + row_idx * COST_ROW_GAP_Y
        row_elems = [next(elem_iter) for _ in range(size)]
        centers = _cost_slot_centers(size)
        for elem, cx in zip(row_elems, centers):
            if elem == "__fish__":
                pieces.append(_render_fish_slot(card, cx, cy))
            else:
                pieces.append(_render_material_slot(elem, cost[elem], materials[elem], cx, cy))
    pieces.append("</g>")
    return "\n".join(pieces)


def render_effect_block(card):
    """Italic effect prose in a bottom-anchored block sized to fit the wrap.
    Empty for cards without effect text (e.g. Granite Spire)."""
    text = card.get("effect") or ""
    if not text:
        return ""
    # When the prose has a mid-text "End game:" scoring clause (preceded by
    # an on-build / passive effect), break it out onto its own paragraph so
    # the two halves read as distinct. Cards whose effect STARTS with "End
    # game:" already render as a single block — no break needed.
    text = re.sub(r" (End [Gg]ame:)", r"\n\n\1", text)
    paragraphs = text.split("\n\n")
    body_lines = []
    for i, para in enumerate(paragraphs):
        if i > 0:
            body_lines.append("")  # blank line between paragraphs
        body_lines.extend(wrap_words(para, EFFECT_WRAP_CHARS))
    n = len(body_lines)
    content_h = (n - 1) * EFFECT_LINE_H + _FONT_ASCENDER + _FONT_DESCENDER
    box_h = content_h + 2 * EFFECT_BLOCK_PAD
    box_y = EFFECT_BLOCK_BOTTOM - box_h
    body_y0 = box_y + EFFECT_BLOCK_PAD + _FONT_ASCENDER

    line_tags = []
    for i, line in enumerate(body_lines):
        y = body_y0 + i * EFFECT_LINE_H
        line_tags.append(
            f'    <tspan x="{EFFECT_TEXT_LEFT}" y="{y:.2f}">{html.escape(line)}</tspan>'
        )

    return (
        f'<g id="effect-block" inkscape:label="Effect">\n'
        f'  <rect x="{EFFECT_BLOCK_X}" y="{box_y:.2f}" '
        f'width="{EFFECT_BLOCK_W}" height="{box_h:.2f}" rx="3" ry="3" '
        f'fill="#2a2a5c" fill-opacity="0.08" '
        f'stroke="#2a2a5c" stroke-opacity="0.35" stroke-width="0.5"/>\n'
        f'  <text class="effect-text">\n'
        + "\n".join(line_tags) +
        '\n  </text>\n'
        f'</g>'
    )


def render_card_svg(template: str, card, materials):
    out = template
    out = out.replace("{{TITLE_BLOCK}}", render_title_block(card))
    out = out.replace("{{VP_BLOCK}}", render_vp_block(card))
    out = out.replace("{{COST_ROW}}", render_cost_row(card, materials))
    out = out.replace("{{EFFECT_BLOCK}}", render_effect_block(card))
    return out


# --------------------- render pipeline ---------------------

def find_renderer():
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        return ("rsvg", rsvg)
    ink = shutil.which("inkscape")
    if ink:
        return ("inkscape", ink)
    sys.exit("error: need rsvg-convert or inkscape on PATH to render PNGs")


def svg_to_png(kind, exe, svg_path: Path, png_path: Path, dpi: int):
    if kind == "rsvg":
        subprocess.run(
            [exe, "--format=png", "--dpi-x", str(dpi), "--dpi-y", str(dpi),
             "--output", str(png_path), str(svg_path)],
            check=True,
        )
    else:
        subprocess.run(
            [exe, "--export-type=png", f"--export-dpi={dpi}",
             f"--export-filename={png_path}", str(svg_path)],
            check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )


WEB_DPI = 300


def make_web_png(print_png: Path, web_png: Path, source_dpi: int, output_dpi: int = WEB_DPI):
    """Crop the full-bleed print PNG (portrait, 198×270 pt) to the trim line
    (180×252 pt), apply a rounded-corner alpha mask so the area outside the
    card shape is transparent, then resample to `output_dpi` (default
    300 → 750×1050 px) so HiDPI/zoomed-in displays render the popup
    preview without blur."""
    src_px = source_dpi / 72.0
    trim_w_src = round(180 * src_px)
    trim_h_src = round(252 * src_px)
    off_x = round(9 * src_px)
    off_y = round(9 * src_px)
    # TGC poker cards are die-cut at roughly 9pt outer corner radius.
    corner_r_src = round(9 * src_px)

    out_w = round(180 * output_dpi / 72.0)
    out_h = round(252 * output_dpi / 72.0)

    subprocess.run(
        [
            "convert", str(print_png),
            "-crop", f"{trim_w_src}x{trim_h_src}+{off_x}+{off_y}", "+repage",
            "(", "-size", f"{trim_w_src}x{trim_h_src}", "xc:none",
                "-fill", "white",
                "-draw",
                f"roundrectangle 0,0 {trim_w_src - 1},{trim_h_src - 1} "
                f"{corner_r_src},{corner_r_src}",
            ")",
            "-compose", "CopyOpacity", "-composite",
            "-resize", f"{out_w}x{out_h}",
            "-units", "PixelsPerInch", "-density", str(output_dpi),
            str(web_png),
        ],
        check=True,
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dpi", type=int, default=300,
                    help="output PNG DPI (TGC recommends 300).")
    ap.add_argument("--only", action="append", default=[],
                    help="only render cards whose name matches (repeatable).")
    ap.add_argument("--keep-svg", action="store_true",
                    help="keep intermediate SVG files in out/svg/.")
    ap.add_argument("--no-web", action="store_true",
                    help="skip the web-cropped variant.")
    args = ap.parse_args()

    if not TEMPLATE.exists():
        sys.exit(f"error: template not found: {TEMPLATE}")
    if not CARDS_JSON.exists():
        sys.exit(f"error: cards.json not found: {CARDS_JSON}")

    template = TEMPLATE.read_text()
    data = json.loads(CARDS_JSON.read_text())
    materials = data["materials"]
    cards = data["cards"]

    if args.only:
        wanted = set(args.only)
        cards = [c for c in cards if c["name"] in wanted]
        if not cards:
            sys.exit(f"error: no cards match --only filter {args.only}")

    PRINT_DIR.mkdir(parents=True, exist_ok=True)
    if not args.no_web:
        WEB_DIR.mkdir(parents=True, exist_ok=True)
    svg_dir = OUT_DIR / "svg"
    if args.keep_svg:
        svg_dir.mkdir(parents=True, exist_ok=True)

    kind, exe = find_renderer()
    print(f"renderer: {kind} ({exe})  dpi: {args.dpi}")

    for card in cards:
        svg = render_card_svg(template, card, materials)
        slug = safe_filename(card["name"])
        png_path = PRINT_DIR / f"{slug}.png"

        if args.keep_svg:
            svg_path = svg_dir / f"{slug}.svg"
            svg_path.write_text(svg)
        else:
            svg_path = PRINT_DIR / f".{slug}.tmp.svg"
            svg_path.write_text(svg)

        try:
            svg_to_png(kind, exe, svg_path, png_path, args.dpi)
            extra = ""
            if not args.no_web:
                web_path = WEB_DIR / f"{slug}.png"
                make_web_png(png_path, web_path, args.dpi)
                extra = f" + web/{web_path.name}"
            # No rotation here — structure SVG is already portrait, which
            # is also what TGC's poker-card upload expects. (The material
            # deck rotates because its SVG is landscape.)
            print(f"  {card['name']:24s} → print/{png_path.name}{extra}")
        finally:
            if not args.keep_svg and svg_path.exists():
                svg_path.unlink()

    print(f"done. {len(cards)} card(s) in {OUT_DIR}/{{print,web}}")


if __name__ == "__main__":
    main()
