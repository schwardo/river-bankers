#!/usr/bin/env python3
"""
Generate River Bankers Material card PNGs from template.svg + cards.json.

  Card geometry: 3.5" × 2.5" trim, 0.125" bleed → 3.75" × 2.75" full.
  Worker tokens are 0.63" discs (board-games.org, 2026-05-25); item icons
  on the card face match that physical footprint at 45.36 pt diameter.

  Output: out/<CardName>face.png  (one per card, 24 total)

Usage:
  python3 generate.py              # render every card at 300 DPI
  python3 generate.py --dpi 600    # higher-res
  python3 generate.py --only "Driftwood Tangle"
  python3 generate.py --keep-svg   # don't delete intermediate SVGs

Renderer: prefers `rsvg-convert` (fast), falls back to `inkscape`.
"""

import argparse
import html
import json
import os
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

# Card canvas (pt) — matches TGC poker-card.svg coordinate system,
# rotated to landscape.
CANVAS_W_PT = 270.0
CANVAS_H_PT = 198.0
CANVAS_CENTER_X = CANVAS_W_PT / 2

# Worker disc footprint = item-icon disc footprint (0.63" @ 72 DPI).
ICON_DIAM_PT = 0.63 * 72.0      # 45.36
ICON_RADIUS_PT = ICON_DIAM_PT / 2
ICON_GAP_PT = 6.0

# Vertical layout boundaries (pt, from top edge of full canvas).
HEADER_BOTTOM_Y = 40            # header band ends here
ICON_AREA_TOP = 44              # icons start a bit below header
ICON_AREA_BOTTOM_EFFECT = 154   # leave room for effect box below
ICON_AREA_BOTTOM_VANILLA = 178  # vanilla cards: icons fill more space

EFFECT_BLOCK_X = 18                      # centered: (270 - 234) / 2 = 18
EFFECT_BLOCK_Y = 155
EFFECT_BLOCK_W = 234
# Box is sized for 3 rows + ~3pt of trimmed padding.
EFFECT_BLOCK_H = 27
# Text padding: 10 PNG pixels (≈ 2.4 SVG pt at 300 DPI) inside both edges.
EFFECT_TEXT_LEFT = EFFECT_BLOCK_X + 2.4
EFFECT_TEXT_RIGHT = EFFECT_BLOCK_X + EFFECT_BLOCK_W - 2.4

# Wrap width budget for the italic body line. DejaVu Sans italic at 6pt
# averages ~3.65 pt/char in print; the body line is ~220 pt wide → ~60 chars
# fills the line cleanly without overrunning the right padding. The longest
# card (Slipping Sandbar, 159 chars) still wraps in 3 lines.
EFFECT_WRAP_CHARS = 56
EFFECT_LINE_H = 10.0

# Font-metric approximations for the centering formula (6pt italic DejaVu Sans).
_FONT_ASCENDER = 5.0
_FONT_DESCENDER = 1.5


# Per-material icon glyphs — pulled from graphics/icons/<material>.svg, the
# single canonical source shared with structure-deck/generate.py and the
# web prototype. Each source SVG uses viewBox="-15 -15 30 30" with the
# silhouette occupying roughly ±14 units; rendering at native scale fills
# the 45.36 pt (0.63") disc with ~7 pt of inner padding. Edit the SVG
# files (not this code) to change the glyph art.
ICONS_DIR = HERE.parent / "icons"
_SVG_TAG_RE = re.compile(r"<svg\b[^>]*>(.*?)</svg>", re.DOTALL)


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


def safe_filename(name: str) -> str:
    """Card name → filename slug. Keep ASCII letters/digits, drop the rest."""
    return re.sub(r"[^A-Za-z0-9]+", "", name)


def layout_for(n: int):
    """Row-counts for an n-icon card. 4→[4], 5→[3,2], 7→[4,3], 8→[4,4]."""
    if n == 4:
        return [4]
    if n == 5:
        return [3, 2]
    if n == 7:
        return [4, 3]
    if n == 8:
        return [4, 4]
    raise ValueError(f"unsupported icon count: {n}")


def icon_positions(n: int, has_effect: bool):
    """Return [(cx, cy), …] in pt for all n discs."""
    rows = layout_for(n)
    top = ICON_AREA_TOP
    bottom = ICON_AREA_BOTTOM_EFFECT if has_effect else ICON_AREA_BOTTOM_VANILLA
    avail = bottom - top

    if len(rows) == 1:
        cy = top + avail / 2
        return _row_positions(rows[0], cy)

    # Two rows: center the (2·diam + gap) stack vertically in [top, bottom].
    rows_h = 2 * ICON_DIAM_PT + ICON_GAP_PT
    cy_top = top + (avail - rows_h) / 2 + ICON_RADIUS_PT
    cy_bottom = cy_top + ICON_DIAM_PT + ICON_GAP_PT
    out = []
    out.extend(_row_positions(rows[0], cy_top))
    out.extend(_row_positions(rows[1], cy_bottom))
    return out


def _row_positions(count: int, cy: float):
    row_w = count * ICON_DIAM_PT + (count - 1) * ICON_GAP_PT
    x_first_center = CANVAS_CENTER_X - row_w / 2 + ICON_RADIUS_PT
    return [
        (x_first_center + i * (ICON_DIAM_PT + ICON_GAP_PT), cy)
        for i in range(count)
    ]


# Wild-card disc layout: each disc shows two half-size silhouettes side
# by side (primary on the left, alt material on the right) so a player
# reads "logs OR reeds" at a glance without needing the effect text.
WILD_GLYPH_SCALE = 0.55
WILD_GLYPH_DX = 10.0


def render_icon_grid(card, mat, materials):
    """SVG fragment with disc + shared-source glyph per icon. Wild cards
    (cards.json `wildAlt`) draw both materials' silhouettes inside each
    disc and ring the right half of the disc in the alt material's color
    so the dual yield is unmistakable."""
    has_effect = bool(card.get("effect_text"))
    positions = icon_positions(card["icons"], has_effect)
    primary_key = card["material"]
    alt_key = card.get("wildAlt")
    color = mat["color"]
    primary_glyph = MATERIAL_GLYPHS[primary_key]
    alt_glyph = MATERIAL_GLYPHS[alt_key] if alt_key else None
    alt_color = materials[alt_key]["color"] if alt_key else None

    pieces = ['<g id="icon-grid" inkscape:label="Icons">']
    for cx, cy in positions:
        if alt_key:
            r = ICON_RADIUS_PT
            # White fill + primary-color left half; right half stroked in the
            # alt material's color so the disc rim itself signals "wild".
            pieces.append(
                f'  <circle cx="{cx:.3f}" cy="{cy:.3f}" r="{r:.3f}" '
                f'fill="#ffffff" stroke="{color}" stroke-width="1.6"/>'
            )
            pieces.append(
                f'  <path d="M {cx:.3f} {cy - r:.3f} '
                f'a {r:.3f} {r:.3f} 0 0 1 0 {2 * r:.3f}" '
                f'fill="none" stroke="{alt_color}" stroke-width="1.6"/>'
            )
            pieces.append(
                f'  <g transform="translate({cx - WILD_GLYPH_DX:.3f} {cy:.3f}) '
                f'scale({WILD_GLYPH_SCALE})">\n'
                f'    {primary_glyph}\n'
                f'  </g>'
            )
            pieces.append(
                f'  <g transform="translate({cx + WILD_GLYPH_DX:.3f} {cy:.3f}) '
                f'scale({WILD_GLYPH_SCALE})">\n'
                f'    {alt_glyph}\n'
                f'  </g>'
            )
        else:
            pieces.append(
                f'  <circle cx="{cx:.3f}" cy="{cy:.3f}" r="{ICON_RADIUS_PT:.3f}" '
                f'fill="#ffffff" stroke="{color}" stroke-width="1.2"/>'
            )
            pieces.append(
                f'  <g transform="translate({cx:.3f} {cy:.3f})">\n'
                f'    {primary_glyph}\n'
                f'  </g>'
            )
    pieces.append("</g>")
    return "\n  ".join(pieces)


def wrap_words(text: str, max_chars: int):
    """Greedy word-wrap (no hyphenation). Returns list of lines."""
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


def render_effect_block(card):
    """SVG fragment for the bottom effect strip; empty for vanilla cards.
    The card name is the box header above the icons — no need to repeat it
    inside the effect block, so the prose starts at the top of the box."""
    text = card.get("effect_text")
    if not text:
        return ""

    body_lines = wrap_words(text, EFFECT_WRAP_CHARS)
    # Vertically center the wrapped block in the box, using ascender-to-
    # descender height (not baseline-to-baseline spacing) so the visual block
    # — not the baselines — sits centered.
    n = len(body_lines)
    visible_h = (n - 1) * EFFECT_LINE_H + _FONT_ASCENDER + _FONT_DESCENDER
    body_y0 = EFFECT_BLOCK_Y + (EFFECT_BLOCK_H - visible_h) / 2 + _FONT_ASCENDER

    line_tags = []
    for i, line in enumerate(body_lines):
        y = body_y0 + i * EFFECT_LINE_H
        line_tags.append(
            f'    <tspan x="{EFFECT_TEXT_LEFT}" y="{y:.2f}">{html.escape(line)}</tspan>'
        )

    return (
        f'<g id="effect-block" inkscape:label="Effect">\n'
        f'  <rect x="{EFFECT_BLOCK_X}" y="{EFFECT_BLOCK_Y}" '
        f'width="{EFFECT_BLOCK_W}" height="{EFFECT_BLOCK_H}" rx="3" ry="3" '
        f'fill="#2a2a5c" fill-opacity="0.08" '
        f'stroke="#2a2a5c" stroke-opacity="0.35" stroke-width="0.5"/>\n'
        f'  <text class="effect-text">\n'
        + "\n".join(line_tags) +
        '\n  </text>\n'
        f'</g>'
    )


def render_header_block(card, materials):
    """Title (left) + material label (right) inside the colored header band.
    Title auto-shrinks if the right-side label (longer for wild cards) would
    otherwise overlap. DejaVu Serif Bold averages ~0.62 × font-size per char
    for upper/lower mix, DejaVu Sans Bold ~0.55."""
    mat = materials[card["material"]]
    alt_key = card.get("wildAlt")
    if alt_key:
        mat_label_text = f'{mat["name"]} / {materials[alt_key]["name"]}'
    else:
        mat_label_text = mat["name"]
    icons_tag = f' ×{card["icons"]}'

    # Approximate widths to pick a title font that won't collide with the
    # right-side label. Header runs x=22..248 (226pt usable). DejaVu Serif
    # Bold renders ~0.95 × font-size per char as drawn by Inkscape (wider
    # than nominal); DejaVu Sans Bold ~0.65. We add 12pt of breathing
    # room between title and label so they don't kiss.
    label_w = len(mat_label_text) * 7.5 * 0.65 + len(icons_tag) * 6.5 * 0.65
    title = card["name"]
    for size in (13, 12, 11, 10, 9, 8):
        title_w = len(title) * size * 0.95
        if title_w + label_w + 12 <= 226:
            break
    # Baseline y nudges with font so caps stay vertically centered in the
    # 18..40 header band (center y ≈ 31).
    title_y = {13: 35, 12: 35, 11: 34, 10: 34, 9: 33}[size]
    # Inkscape's CSS engine treats class-based font-size as more specific
    # than the style attribute, so we inline the font properties directly
    # (matching `.card-name` minus the class-bound size).
    return (
        f'<text x="22" y="{title_y}" font-family="DejaVu Serif" '
        f'font-weight="700" font-size="{size}pt" fill="#2c1f15">'
        f'{html.escape(title)}</text>\n'
        f'  <text x="248" y="32" text-anchor="end" '
        f'class="mat-label" fill="{mat["ink"]}">'
        f'{html.escape(mat_label_text)} '
        f'<tspan class="icons-tag">{html.escape(icons_tag.strip())}</tspan>'
        f'</text>'
    )


# Player-count tier badge: cards with 4 icons join the deck only at 3P+,
# 8-icon cards only at 4P. Mirrors ALWAYS_ICONS / TIER_3PLUS_ICONS /
# TIER_4PLUS_ICONS in web/index.html — keep the two in sync if the tier
# split ever changes.
TIER_BY_ICONS = {4: ("3+", "#c1701c"),  # orange  → 3P+ only
                 8: ("4P", "#a52a2a")}  # red     → 4P only

# The two 5-icon "always" vanilla cards on the wildcard-less materials get
# swapped out for Bramble Shoal at 2P, so their true availability is 3P+.
TIER_3PLUS_5ICON = {("stones", 5), ("vines", 5)}


def render_tier_badge(card):
    # Bramble Shoal is the one card that's the reverse of a tier card: it's in
    # the deck ONLY at 2 players (replacing Rocky Shoal + Trailing Vine), so it
    # gets a distinct green "2P" badge rather than the icon-count tier badge.
    if card.get("twoPlayerOnly"):
        spec = ("2P", "#2e7d32")  # green → 2P only
    elif (card["material"], card["icons"]) in TIER_3PLUS_5ICON:
        # Rocky Shoal (stones-5) and Trailing Vine (vines-5) are nominally
        # "always" tier, but at 2P they're pulled from the deck and replaced by
        # the shared Bramble Shoal wild-5. So their real availability is 3P+ —
        # identical to the 4-icon 3+ cards — and they carry the same "3+" badge
        # to cue players to remove them at 2 players.
        spec = ("3+", "#c1701c")  # orange → 3P+ only
    else:
        spec = TIER_BY_ICONS.get(card["icons"])
    if not spec:
        return ""
    label, color = spec
    # Badge hangs off the right edge of the safe area into the brown frame,
    # just below the header. The 8-icon "4P" cards (Cattail Cluster, Old
    # Growth etc.) have their top-row disc ending at x≈234.7, so the badge
    # has to start past that or it collides. Sitting it at x=240..264
    # straddles the safe-area/frame boundary at x=252, reading as a tab
    # clipped to the brown ridge.
    x, y, w, h = 240, 44, 24, 14
    text_x = x + w / 2
    text_y = y + h - 4
    return (
        f'<g id="tier-badge" inkscape:label="Tier badge">\n'
        f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" ry="3" '
        f'fill="{color}" stroke="#faf3e3" stroke-width="0.8"/>\n'
        f'  <text x="{text_x}" y="{text_y}" text-anchor="middle" '
        f'font-family="DejaVu Sans" font-weight="700" font-size="7pt" '
        f'fill="#ffffff">{label}</text>\n'
        f'</g>'
    )


def render_card_svg(template: str, card, materials):
    mat = materials[card["material"]]
    out = template
    out = out.replace("{{MAT_COLOR}}", mat["color"])
    out = out.replace("{{MAT_COLOR_INK}}", mat["ink"])
    out = out.replace("{{HEADER_BLOCK}}", render_header_block(card, materials))
    out = out.replace("{{TIER_BADGE}}", render_tier_badge(card))
    out = out.replace("{{ICON_GRID}}", render_icon_grid(card, mat, materials))
    out = out.replace("{{EFFECT_BLOCK}}", render_effect_block(card))
    return out


def find_renderer():
    """Return (kind, exe) where kind is 'rsvg' or 'inkscape'."""
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
    """Crop the full-bleed print PNG to the trim line (252×180 pt), apply a
    rounded-corner alpha mask so the area outside the card shape is
    transparent, then resample to `output_dpi` (default 300 → 1050×750 px)
    so HiDPI/zoomed-in displays render the popup preview without blur."""
    src_px = source_dpi / 72.0
    trim_w_src = round(252 * src_px)
    trim_h_src = round(180 * src_px)
    off_x = round(9 * src_px)
    off_y = round(9 * src_px)
    # TGC poker cards are die-cut at roughly 9pt outer corner radius.
    corner_r_src = round(9 * src_px)

    out_w = round(252 * output_dpi / 72.0)
    out_h = round(180 * output_dpi / 72.0)

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
                    help="output PNG DPI (TGC recommends 300; print 600 for archive).")
    ap.add_argument("--only", action="append", default=[],
                    help="only render cards whose name matches (repeatable).")
    ap.add_argument("--keep-svg", action="store_true",
                    help="keep intermediate SVG files in out/svg/.")
    ap.add_argument("--no-web", action="store_true",
                    help="skip the web-cropped <name>face-web.png variant.")
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
            tag = "★" if card.get("effect_text") else " "
            extra = ""
            if not args.no_web:
                # Web crop reads the landscape PNG, so do it BEFORE the
                # print PNG is rotated to portrait.
                web_path = WEB_DIR / f"{slug}.png"
                make_web_png(png_path, web_path, args.dpi)
                extra = f" + web/{web_path.name}"
            # TGC's poker-card uploader expects portrait orientation
            # (825×1125 @ 300 DPI). Rotate the print PNG 90° in place.
            subprocess.run(
                ["convert", str(png_path), "-rotate", "90", str(png_path)],
                check=True,
            )
            print(f"  {tag} {card['name']:24s} → print/{png_path.name}{extra}")
        finally:
            if not args.keep_svg and svg_path.exists():
                svg_path.unlink()

    print(f"done. {len(cards)} card(s) in {OUT_DIR}/{{print,web}}")


if __name__ == "__main__":
    main()
