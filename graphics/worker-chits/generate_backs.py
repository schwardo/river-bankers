#!/usr/bin/env python3
"""
Generate the "+60" BACK of each worker chit (used as fish-track pawns).

The fronts (graphics/worker-chits/<species>.svg) are the species worker icons.
A pawn flips to its back to show it has completed one full 60-space lap of the
fish track — needed once a player passes space 59 (the 3P line is 90 and the 4P
line is 120, i.e. one and two laps in). The back is the same front art, dimmed,
with a big "+60" imposed over it.

Output (per species: beaver, mink, muskrat, otter):
  <species>-back.svg   the front SVG + the +60 overlay
  <species>-back.png   300x300 @300dpi (matches the fronts), rendered via Inkscape
"""

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPECIES = ["beaver", "mink", "muskrat", "otter"]

# The +60 overlay, injected just before the hidden "Template guide" layer so it
# sits on top of the species art. The dim is a full-canvas rect (0,0,72,72) so
# it covers the bleed to the very edge — a proper bleed, with no bright ring if
# the circle cut drifts; it also makes the back read as clearly different from
# the bright front at a glance. The bold white "+60" with a dark halo stays
# legible over any species colour; font-size 16 keeps it inside the r=18
# safe-zone guide drawn in the chit SVGs (well within the TGC r=24 print-safe
# area) — verified by bbox/half-diagonal.
OVERLAY = """  <!-- Lap overlay (BACK of chit): darken the whole image (front art +
       species-colour bleed, full canvas) and impose a big +60 — i.e. "add one
       full 60-space lap to my track position". "+60" sized to fit the r=18
       safe zone. -->
  <rect x="0" y="0" width="72" height="72" fill="#000000" fill-opacity="0.42"/>
  <text x="36" y="37" text-anchor="middle" dominant-baseline="central"
        font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="bold"
        font-size="16" letter-spacing="-1"
        fill="#ffffff" stroke="#1a1a1a" stroke-width="1.0"
        stroke-linejoin="round" style="paint-order:stroke">+60</text>
"""

GUIDE_MARKER = '<g inkscape:groupmode="layer" inkscape:label="Template guide"'


def find_inkscape():
    for cand in ("inkscape",):
        try:
            subprocess.run([cand, "--version"], capture_output=True, check=True)
            return cand
        except Exception:
            pass
    sys.exit("Inkscape not found (needed to render the back PNGs).")


def main():
    ink = find_inkscape()
    for sp in SPECIES:
        front = HERE / f"{sp}.svg"
        if not front.exists():
            print(f"skip {sp}: {front} missing")
            continue
        svg = front.read_text()
        idx = svg.find(GUIDE_MARKER)
        if idx == -1:
            sys.exit(f"{front}: could not find the Template-guide layer marker")
        # Back up to the start of that line (its leading indentation).
        line_start = svg.rfind("\n", 0, idx) + 1
        back_svg = svg[:line_start] + OVERLAY + svg[line_start:]
        # Retitle the id so front/back don't collide if ever inlined together.
        back_svg = back_svg.replace(f'id="svg-chit-{sp}"', f'id="svg-chit-{sp}-back"')

        back_path = HERE / f"{sp}-back.svg"
        back_path.write_text(back_svg)

        png_path = HERE / f"{sp}-back.png"
        subprocess.run(
            [ink, str(back_path), "--export-type=png",
             f"--export-filename={png_path}", "--export-width=300", "--export-height=300"],
            check=True, capture_output=True,
        )
        print(f"wrote {back_path.name} + {png_path.name}")


if __name__ == "__main__":
    main()
