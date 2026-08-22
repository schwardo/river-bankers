#!/usr/bin/env bash
# Downscale the images referenced by the TGC shop listing / leftfield.games shop
# section. TGC's advanced-formatting markup has no width attribute, so images
# must be shipped at their display size. Outputs to graphics/shop/web/, which is
# vendored into left-field-games under public/games/river-bankers/shop/.
set -euo pipefail
cd "$(dirname "$0")/../.."

out=graphics/shop/web
mkdir -p "$out"

scale() {  # scale <src> <dest-name> <width>
  python3 - "$1" "$out/$2" "$3" <<'PY'
import sys
from PIL import Image
src, dst, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert("RGBA")
h = round(im.height * w / im.width)
im.resize((w, h), Image.LANCZOS).save(dst, optimize=True)
print(f"{dst}  {w}x{h}")
PY
}

scale artwork/logo.png                    logo.png              600
scale material-deck/Logjam.png            material-card.png     360
scale structure-deck/BurrowRun.png        structure-card.png    260
scale starter-deck/LodgeFoundation.png    starter-card.png      260
