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

  google-chrome \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --no-pdf-header-footer \
    --hide-scrollbars \
    --virtual-time-budget=10000 \
    --print-to-pdf="$out" \
    --print-to-pdf-no-header \
    "file://$src" \
    2>/dev/null

  echo "Wrote $out ($(du -h "$out" | cut -f1))"
}

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  targets=("rulebook")
fi

for base in "${targets[@]}"; do
  render "$base"
done
