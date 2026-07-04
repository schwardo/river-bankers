#!/usr/bin/env bash
# Render an HTML doc → PDF via headless Chrome.
# Lets us embed PNG/SVG, lay cards out with flex/grid, and iterate fast.
#
# Usage: build.sh [basename ...]   (default: rulebook)
#   build.sh                 # builds rulebook.html → rulebook.pdf
#   build.sh strategy-guide  # builds strategy-guide.html → strategy-guide.pdf
#   build.sh rulebook strategy-guide release-notes
set -euo pipefail

cd "$(dirname "$0")"

render() {
  local base="$1"
  local src="$(pwd)/${base}.html"
  local out="$(pwd)/${base}.pdf"
  local raw="$(pwd)/.${base}.raw.pdf"

  google-chrome \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --no-pdf-header-footer \
    --hide-scrollbars \
    --virtual-time-budget=10000 \
    --print-to-pdf="$raw" \
    --print-to-pdf-no-header \
    "file://$src" \
    2>/dev/null

  # Downsample embedded images to 300 DPI (print quality). Chrome embeds art at
  # full native resolution (e.g. a 4875px board shown at ~5in ≈ 950 DPI), which
  # bloats the PDF ~10x. This recompresses images only — text stays vector, and
  # no content is removed. Falls back to the raw PDF if Ghostscript is absent.
  if command -v gs >/dev/null 2>&1; then
    gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 \
       -dDownsampleColorImages=true -dColorImageResolution=300 -dColorImageDownsampleType=/Bicubic \
       -dDownsampleGrayImages=true  -dGrayImageResolution=300  -dGrayImageDownsampleType=/Bicubic \
       -dAutoRotatePages=/None -dNOPAUSE -dBATCH \
       -sOutputFile="$out" "$raw" >/dev/null 2>&1
    rm -f "$raw"
  else
    mv "$raw" "$out"
  fi

  echo "Wrote $out ($(du -h "$out" | cut -f1))"
}

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  targets=("rulebook")
fi

for base in "${targets[@]}"; do
  render "$base"
done
