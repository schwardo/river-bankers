#!/usr/bin/env bash
# Render rulebook.html → rulebook.pdf via headless Chrome.
# Lets us embed PNG/SVG, lay cards out with flex/grid, and iterate fast.
set -euo pipefail

cd "$(dirname "$0")"

SRC="$(pwd)/rulebook.html"
OUT="$(pwd)/rulebook.pdf"

google-chrome \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --no-pdf-header-footer \
  --hide-scrollbars \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" \
  --print-to-pdf-no-header \
  "file://$SRC" \
  2>/dev/null

echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
