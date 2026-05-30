#!/usr/bin/env python3
"""
Generate River Bankers species-starter card PNGs from template.svg +
cards.json.

  Card geometry: 2.5" × 3.5" trim, 0.125" bleed → 2.75" × 3.75" full
                 (portrait — same canvas as structure-deck).
  12 species starter cards (3 each × 4 species).

Layout zones (pt, inside 18..180 × 18..252 safe area):
  Header band  y=18..46          title (auto-fit) + "N★" VP indicator
  Species tag  y=64               small caps centered ("BEAVER" / etc.)
  Effect box   top=80, auto-h    top-anchored italic prose (16pt below tag)

Output: out/print/<CardName>.png (portrait 825×1125 @ 300 DPI, full bleed)
        out/web/<CardName>.png   (portrait 180×252 @ 72 DPI, transparent corners)
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

CANVAS_W_PT = 198.0
CANVAS_H_PT = 270.0

# --------------------- header geometry ---------------------
VP_X = 176.0
VP_Y = 37.0

# --------------------- effect block geometry ---------------------
# Top-anchored: box starts right below the species tag and grows downward
# to fit the wrapped prose. (Structure deck anchors at bottom; starter
# cards anchor at top because there's no cost row eating the upper area.)
EFFECT_BLOCK_X = 18.0
EFFECT_BLOCK_TOP = 80.0          # 16pt gap below species tag
EFFECT_BLOCK_W = 162.0
EFFECT_BLOCK_PAD = 6.0
EFFECT_TEXT_LEFT = EFFECT_BLOCK_X + 5
EFFECT_TEXT_RIGHT = EFFECT_BLOCK_X + EFFECT_BLOCK_W - 5

EFFECT_WRAP_CHARS = 32
EFFECT_LINE_H = 10.0

_FONT_ASCENDER = 5.0
_FONT_DESCENDER = 1.5


# Species palette (matches RULES.md / web prototype).
SPECIES = {
    "beaver":  {"name": "Beaver",  "color": "#8b5a2b"},
    "otter":   {"name": "River Otter", "color": "#b8362a"},
    "muskrat": {"name": "Muskrat", "color": "#4a7a3a"},
    "mink":    {"name": "Mink",    "color": "#5a3870"},
}


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
    """Auto-fit title font so it clears the VP indicator on the right."""
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
    y = {12: 37, 11: 37, 10: 36, 9: 35}[size]
    return (
        f'<text x="22" y="{y}" font-size="{size}pt" class="card-name">'
        f'{html.escape(name)}</text>'
    )


def render_vp_block(card):
    """Right-aligned 'N★' in the header band, separated by a thin space."""
    vp = card.get("vp", 0)
    effect = card.get("effect") or ""
    if vp == 0:
        has_endgame = bool(re.search(r"End [Gg]ame", effect))
        label = "? ★" if has_endgame else "0 ★"
    else:
        label = f"{vp} ★"
    return (
        f'<text x="{VP_X}" y="{VP_Y}" text-anchor="end" class="vp-text">'
        f'{html.escape(label)}</text>'
    )


def render_effect_block(card):
    """Italic effect prose in a top-anchored block sized to fit the wrap."""
    text = card.get("effect") or ""
    if not text:
        return ""
    # Same "End game:" paragraph-break logic as structure deck (none of the
    # current starter prose hits it, but keeps the renderers consistent).
    text = re.sub(r" (End [Gg]ame:)", r"\n\n\1", text)
    paragraphs = text.split("\n\n")
    body_lines = []
    for i, para in enumerate(paragraphs):
        if i > 0:
            body_lines.append("")
        body_lines.extend(wrap_words(para, EFFECT_WRAP_CHARS))
    n = len(body_lines)
    content_h = (n - 1) * EFFECT_LINE_H + _FONT_ASCENDER + _FONT_DESCENDER
    box_h = content_h + 2 * EFFECT_BLOCK_PAD
    box_y = EFFECT_BLOCK_TOP
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


def render_card_svg(template: str, card):
    sp = SPECIES[card["species"]]
    out = template
    out = out.replace("{{SPECIES_COLOR}}", sp["color"])
    out = out.replace("{{SPECIES_NAME}}", sp["name"].upper())
    out = out.replace("{{TITLE_BLOCK}}", render_title_block(card))
    out = out.replace("{{VP_BLOCK}}", render_vp_block(card))
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
    """Crop the full-bleed print PNG to the trim line (180×252 pt),
    round the corners with an alpha mask, then resample to output_dpi
    (default 300 → 750×1050 px) so the popup preview stays crisp."""
    src_px = source_dpi / 72.0
    trim_w_src = round(180 * src_px)
    trim_h_src = round(252 * src_px)
    off_x = round(9 * src_px)
    off_y = round(9 * src_px)
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
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--keep-svg", action="store_true")
    ap.add_argument("--no-web", action="store_true")
    args = ap.parse_args()

    template = TEMPLATE.read_text()
    cards = json.loads(CARDS_JSON.read_text())["cards"]

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
        svg = render_card_svg(template, card)
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
            print(f"  {card['name']:24s} → print/{png_path.name}{extra}")
        finally:
            if not args.keep_svg and svg_path.exists():
                svg_path.unlink()

    print(f"done. {len(cards)} card(s) in {OUT_DIR}/{{print,web}}")


if __name__ == "__main__":
    main()
