#!/usr/bin/env python3
"""
Generate River Bankers starter-deck card BACKS from the worker-chit icons.

Each species' starter cards get their own back: that species' worker icon
(graphics/worker-chits/<species>.svg) on the species background colour,
laid out on the TGC poker card template (2.5"x3.5" trim, 0.125" bleed ->
2.75"x3.75" full = 198x270pt portrait, same canvas as the fronts).

The card is, in effect, the worker chit scaled up to fill the card: the
species colour fills the bleed, a soft white radial highlight sits in the
centre, and the species glyph is centred on top. The glyph is centred by its
true rendered bounding box (measured per species), not by the chit's
hand-tuned offset — so e.g. the long horizontal mink/badger lands dead centre.

Output:
  out/print/_back_<species>.png      825x1125 @300dpi full bleed   (TGC upload)
  ../../starter-deck/_back_<species>.png   copy of the 825x1125 print PNG
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

# Reuse the front pipeline's renderer discovery + SVG->PNG helper.
from generate import find_renderer, svg_to_png

HERE = Path(__file__).resolve().parent          # graphics/starter-deck
CHITS_DIR = HERE.parent / "worker-chits"        # graphics/worker-chits
DECK_DIR = HERE.parents[1] / "starter-deck"     # river-bankers/starter-deck
OUT_DIR = HERE / "out"
PRINT_DIR = OUT_DIR / "print"

# TGC poker card, full bleed (matches the fronts in generate.py).
CANVAS_W_PT = 198.0
CANVAS_H_PT = 270.0
CARD_CX = CANVAS_W_PT / 2.0     # 99
CARD_CY = CANVAS_H_PT / 2.0     # 135

# The worker chit is a 72x72 design whose highlight circle has r=27. We scale
# the whole chit up so that circle becomes a medallion spanning the 2.5" trim
# width (half-width 90pt), leaving a species-colour border in the bleed.
MEDALLION_R_PT = 90.0
CHIT_HIGHLIGHT_R = 27.0
CHIT_GLYPH_SCALE = 0.7222                        # emoji->chit scale in the chits
SCALE = MEDALLION_R_PT / CHIT_HIGHLIGHT_R        # 3.3333...
EMOJI_SCALE = CHIT_GLYPH_SCALE * SCALE           # emoji units -> card pt (~2.407)
BASE_GLYPH_TRANSFORM = f"translate({CARD_CX} {CARD_CY}) scale({EMOJI_SCALE:.5f})"

SPECIES = ["beaver", "otter", "muskrat", "mink"]

# The glyph group ends where the Inkscape "Template guide" layer begins.
GUIDE_MARKER = '<g inkscape:groupmode="layer"'


def extract_chit(svg_text: str):
    """Return (bg_colour, raw_glyph_paths) from a worker-chit SVG.

    raw_glyph_paths are the emoji path elements in their native (~0..36) emoji
    coordinate space, with the chit's own translate/scale wrapper stripped off
    so we can place and scale them ourselves.
    """
    bg = re.search(r'<rect[^>]*fill="(#[0-9a-fA-F]{6})"', svg_text)
    glyph_open = re.search(
        r'<g transform="translate\(36 36\) scale\(0\.7222\)[^>]*>', svg_text
    )
    if not (bg and glyph_open):
        sys.exit("error: chit SVG missing expected rect/glyph structure")
    guide_at = svg_text.index(GUIDE_MARKER, glyph_open.start())
    group = svg_text[glyph_open.end():guide_at].rstrip()
    if not group.endswith("</g>"):
        sys.exit("error: could not isolate glyph group in chit SVG")
    paths = group[: -len("</g>")].strip()
    return bg.group(1), paths


def measure_glyph(kind, exe, paths, dpi, tmp_dir):
    """Render the glyph alone and trim it, returning the (dx, dy) in pt needed
    to shift its bounding-box centre onto the card centre."""
    # Match the final render's physical size (2.75in x 3.75in) so 1 user unit
    # == 1pt and the trim bbox maps back to card points via dpi/72.
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="2.75in" height="3.75in" '
        f'viewBox="0 0 {CANVAS_W_PT} {CANVAS_H_PT}">'
        f'<g transform="{BASE_GLYPH_TRANSFORM}">{paths}</g></svg>'
    )
    svg_path = tmp_dir / "._measure.svg"
    png_path = tmp_dir / "._measure.png"
    svg_path.write_text(svg)
    try:
        svg_to_png(kind, exe, svg_path, png_path, dpi)
        # %@ is the bounding box of the non-background content as WxH+X+Y.
        # (Don't -trim first: that resets the page offset to +0+0.)
        out = subprocess.run(
            ["convert", str(png_path), "-format", "%@", "info:"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    finally:
        for p in (svg_path, png_path):
            if p.exists():
                p.unlink()
    m = re.match(r"(\d+)x(\d+)\+(-?\d+)\+(-?\d+)", out)
    if not m:
        sys.exit(f"error: could not parse trim bbox {out!r}")
    w, h, x, y = map(int, m.groups())
    ppp = dpi / 72.0
    content_cx = (x + w / 2.0) / ppp
    content_cy = (y + h / 2.0) / ppp
    return CARD_CX - content_cx, CARD_CY - content_cy


def render_back_svg(bg, paths, dx, dy) -> str:
    """Compose the full-bleed back SVG with the glyph centred via (dx, dy)."""
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="2.75in" height="3.75in"
     viewBox="0 0 {CANVAS_W_PT} {CANVAS_H_PT}" version="1.1">
  <defs>
    <radialGradient id="highlight" cx="{CARD_CX}" cy="{CARD_CY}"
                    r="{MEDALLION_R_PT}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.40"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="{CANVAS_W_PT}" height="{CANVAS_H_PT}" fill="{bg}"/>
  <circle cx="{CARD_CX}" cy="{CARD_CY}" r="{MEDALLION_R_PT}" fill="url(#highlight)"/>
  <g transform="translate({dx:.3f} {dy:.3f})">
    <g transform="{BASE_GLYPH_TRANSFORM}">{paths}</g>
  </g>
</svg>
"""


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--only", action="append", default=[],
                    help="limit to one or more species")
    ap.add_argument("--keep-svg", action="store_true")
    ap.add_argument("--no-deck-copy", action="store_true",
                    help="don't copy backs into ../../starter-deck/")
    args = ap.parse_args()

    species = args.only or SPECIES
    PRINT_DIR.mkdir(parents=True, exist_ok=True)
    svg_dir = OUT_DIR / "svg"
    if args.keep_svg:
        svg_dir.mkdir(parents=True, exist_ok=True)

    kind, exe = find_renderer()
    print(f"renderer: {kind} ({exe})  dpi: {args.dpi}  scale: {SCALE:.4f}")

    for sp in species:
        chit_path = CHITS_DIR / f"{sp}.svg"
        if not chit_path.exists():
            sys.exit(f"error: missing worker chit {chit_path}")
        bg, paths = extract_chit(chit_path.read_text())
        dx, dy = measure_glyph(kind, exe, paths, args.dpi, PRINT_DIR)
        svg = render_back_svg(bg, paths, dx, dy)

        png_path = PRINT_DIR / f"_back_{sp}.png"
        if args.keep_svg:
            svg_path = svg_dir / f"_back_{sp}.svg"
            svg_path.write_text(svg)
        else:
            svg_path = PRINT_DIR / f"._back_{sp}.tmp.svg"
            svg_path.write_text(svg)

        try:
            svg_to_png(kind, exe, svg_path, png_path, args.dpi)
            extra = ""
            if not args.no_deck_copy:
                deck_path = DECK_DIR / f"_back_{sp}.png"
                shutil.copyfile(png_path, deck_path)
                extra = f" -> starter-deck/{deck_path.name}"
            print(f"  {sp} ({bg})  dx={dx:+.1f} dy={dy:+.1f}  "
                  f"-> print/{png_path.name}{extra}")
        finally:
            if not args.keep_svg and svg_path.exists():
                svg_path.unlink()

    print(f"done. {len(species)} back(s) in {PRINT_DIR}")


if __name__ == "__main__":
    main()
