#!/usr/bin/env python3
"""
Build the BoardGameArena CSS sprite sheets for River Bankers.

Reads the same serveable art the web prototype uses and packs it into a small
number of grid sprite sheets, plus a JSON manifest (sprites.json) describing
every cell so Game.js / riverbankers.css can compute background-position.

Sources (relative to the river-bankers submodule root):
  - material-deck/*.png   landscape card fronts (1050x750) + _back.png
  - starter-deck/*.png    portrait card fronts (750x1050) + _back_<species>.png
  - structure-deck/*.png  portrait card fronts (750x1050) + _back.png
  - graphics/worker-chits/{species}{,-back}.png   square w/ bleed -> circle clip
  - graphics/blank-chit/blank-chit.png            square w/ bleed -> circle clip
  - graphics/river-board/river-board.png          standalone board (downscaled)

Card fronts already ship with rounded corners + transparent bleed, so they are
packed as-is. Chits are printed on TGC's Medium Circle Chit template (72u canvas,
trim circle r=27 -> 0.75 of half-width); we mask them to that trim circle so the
square bleed becomes a clean transparent-cornered disc, matching the web impl.

Output (into this img/ dir):
  cards-material.png, cards-structure.png, cards-starter.png, chits.png,
  river-board.png, sprites.json

Run:  python3 bga/img/build_sprites.py
"""

import json
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))  # submodule root
OUT = HERE

# --- tunables -------------------------------------------------------------
PORTRAIT_CELL = (250, 350)   # 750x1050 / 3
LANDSCAPE_CELL = (350, 250)  # 1050x750 / 3
CHIT_CELL = (128, 128)
ICON_CELL = (96, 96)         # material icons (logs/stones/reeds/mud/vines/clay)
MATERIALS = ["logs", "stones", "reeds", "mud", "vines", "clay"]
BOARD_WIDTH = 1200           # downscale target for the standalone board
CHIT_TRIM_RATIO = 27.0 / 36.0  # TGC Medium Circle Chit: trim r=27 in 72u canvas
RESAMPLE = Image.LANCZOS


def load(path):
    return Image.open(path).convert("RGBA")


def fit(img, cell):
    """Resize to fill the cell exactly (sources already share the aspect)."""
    if img.size != cell:
        img = img.resize(cell, RESAMPLE)
    return img


def rasterize_svg(svg_path, size):
    """Render an SVG to a transparent RGBA PIL image via inkscape."""
    w, h = size
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        out = tmp.name
    subprocess.run(
        ["inkscape", svg_path, "--export-type=png", "--export-filename=" + out,
         "-w", str(w), "-h", str(h), "--export-background-opacity=0"],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    img = Image.open(out).convert("RGBA")
    os.unlink(out)
    return img


def circle_clip(img):
    """Mask a square bleed chit down to the TGC trim circle, antialiased."""
    w, h = img.size
    ss = 4  # supersample the mask for smooth edges
    mask = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(mask)
    r = (min(w, h) / 2.0) * CHIT_TRIM_RATIO * ss
    cx, cy = (w * ss) / 2.0, (h * ss) / 2.0
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    mask = mask.resize((w, h), RESAMPLE)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def build_sheet(name, entries, cell, cols, clip=False, loader=load):
    """entries: list of (slug, src_path). Returns manifest dict; writes PNG."""
    cw, ch = cell
    rows = (len(entries) + cols - 1) // cols
    sheet = Image.new("RGBA", (cw * cols, ch * rows), (0, 0, 0, 0))
    items = []
    for i, (slug, src) in enumerate(entries):
        col, row = i % cols, i // cols
        img = loader(src)
        if clip:
            img = circle_clip(img)
        img = fit(img, cell)
        x, y = col * cw, row * ch
        sheet.paste(img, (x, y), img)
        items.append({"slug": slug, "col": col, "row": row, "x": x, "y": y})
    path = os.path.join(OUT, name + ".png")
    sheet.save(path, optimize=True)
    print(f"  {name}.png  {sheet.size[0]}x{sheet.size[1]}  "
          f"{len(entries)} cells  {os.path.getsize(path)//1024} KB")
    return {
        "file": name + ".png",
        "cell": [cw, ch],
        "cols": cols,
        "rows": rows,
        "items": items,
    }


def deck_entries(subdir, back_first=True):
    """Sorted front slugs (sans .png) + any _back* files, from a deck dir."""
    d = os.path.join(ROOT, subdir)
    fronts, backs = [], []
    for f in sorted(os.listdir(d)):
        if not f.endswith(".png"):
            continue
        slug = f[:-4]
        (backs if slug.startswith("_back") else fronts).append(
            (slug, os.path.join(d, f)))
    return (backs + fronts) if back_first else (fronts + backs)


# Per-sheet CSS render config: (sheet, short class key, on-table render width px).
# scale = render_width / cell_width; everything else derives from the manifest.
# A sheet may appear more than once to expose several render sizes (e.g. chits
# at 40px standalone and 28px = 18% of a 154px material card for on-card discs).
CSS_RENDER = [
    ("cards-material", "mat", 154),   # landscape card face
    ("cards-structure", "str", 110),  # portrait card face
    ("cards-starter", "sta", 110),
    ("chits", "chit", 40),
    # Worker disc on a material-card icon. The printed circle is 18% of the 154px
    # card = 27.7px; the chit's colored disc fills only 0.75 of its cell (the rest
    # is clipped bleed), so the cell must be 27.7/0.75 ≈ 37px for the disc to match.
    ("chits", "wchit", 37),
    ("icons", "icon", 24),
]
CSS_BEGIN = "/* === BEGIN GENERATED SPRITES (build_sprites.py) === */"
CSS_END = "/* === END GENERATED SPRITES === */"


def emit_css(manifest):
    """Build the generated CSS sprite block (base + per-item position classes)."""
    L = [CSS_BEGIN,
         "/* Do not edit by hand — regenerate with: python3 img/build_sprites.py */",
         ".rb-art{background-repeat:no-repeat;display:inline-block;"
         "background-color:transparent;vertical-align:middle;}"]
    for sheet_name, key, target_w in CSS_RENDER:
        s = manifest["sheets"][sheet_name]
        cw, ch = s["cell"]
        scale = target_w / cw
        sheet_w, sheet_h = cw * s["cols"] * scale, ch * s["rows"] * scale
        L.append(
            f".rb-art-{key}{{background-image:url('img/{s['file']}');"
            f"background-size:{sheet_w:.1f}px {sheet_h:.1f}px;"
            f"width:{cw*scale:.1f}px;height:{ch*scale:.1f}px;}}")
        for it in s["items"]:
            L.append(
                f".rb-p-{key}-{it['slug']}{{background-position:"
                f"{-it['x']*scale:.1f}px {-it['y']*scale:.1f}px;}}")
    L.append(CSS_END)
    return "\n".join(L)


def write_css(manifest):
    block = emit_css(manifest)
    css_path = os.path.join(os.path.dirname(OUT), "riverbankers.css")
    text = open(css_path).read()
    if CSS_BEGIN in text and CSS_END in text:
        pre = text[:text.index(CSS_BEGIN)]
        post = text[text.index(CSS_END) + len(CSS_END):]
        text = pre + block + post
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    open(css_path, "w").write(text)
    n = sum(len(s["items"]) for s in manifest["sheets"].values())
    print(f"  riverbankers.css updated ({n} sprite position classes)")


def main():
    print("Building River Bankers BGA sprite sheets...")
    manifest = {"cell_note": "x/y are top-left px of each cell within file",
                "sheets": {}}

    manifest["sheets"]["cards-material"] = build_sheet(
        "cards-material", deck_entries("material-deck"), LANDSCAPE_CELL, cols=5)
    manifest["sheets"]["cards-structure"] = build_sheet(
        "cards-structure", deck_entries("structure-deck"), PORTRAIT_CELL, cols=8)
    manifest["sheets"]["cards-starter"] = build_sheet(
        "cards-starter", deck_entries("starter-deck"), PORTRAIT_CELL, cols=5)

    # Chits: worker fronts, worker backs, blank — all circle-clipped.
    wc = os.path.join(ROOT, "graphics", "worker-chits")
    species = ["beaver", "mink", "muskrat", "otter"]
    chit_entries = [(s, os.path.join(wc, s + ".png")) for s in species]
    chit_entries += [(s + "-back", os.path.join(wc, s + "-back.png")) for s in species]
    chit_entries += [("blank", os.path.join(ROOT, "graphics", "blank-chit", "blank-chit.png"))]
    manifest["sheets"]["chits"] = build_sheet(
        "chits", chit_entries, CHIT_CELL, cols=4, clip=True)

    # Material icons: rasterize the cost/yield glyph SVGs (transparent bg) at 2x
    # the cell, then let fit() downscale for crisp edges. Slug == material key.
    icons_dir = os.path.join(ROOT, "graphics", "icons")
    icon_entries = [(m, os.path.join(icons_dir, m + ".svg")) for m in MATERIALS]
    raster2x = lambda src: rasterize_svg(src, (ICON_CELL[0] * 2, ICON_CELL[1] * 2))
    manifest["sheets"]["icons"] = build_sheet(
        "icons", icon_entries, ICON_CELL, cols=6, loader=raster2x)

    # Standalone board (not a sprite sheet) — downscaled for BGA.
    board = load(os.path.join(ROOT, "graphics", "river-board", "river-board.png"))
    scale = BOARD_WIDTH / board.size[0]
    board = board.resize((BOARD_WIDTH, round(board.size[1] * scale)), RESAMPLE)
    bpath = os.path.join(OUT, "river-board.png")
    board.save(bpath, optimize=True)
    print(f"  river-board.png  {board.size[0]}x{board.size[1]}  "
          f"{os.path.getsize(bpath)//1024} KB")
    manifest["board"] = {"file": "river-board.png", "size": list(board.size)}

    with open(os.path.join(OUT, "sprites.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("  sprites.json written")

    write_css(manifest)


if __name__ == "__main__":
    main()
