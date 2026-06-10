#!/usr/bin/env bash
# Render the box faces to 300 DPI print PNGs (3975×4725 for the 13.25×15.75"
# Large Retail Box artwork), with the "Template guides" layer hidden.
#
#   ./export.sh            # render both faces
#   ./export.sh bottom     # render only box-bottom
#   ./export.sh top        # render only box-top
#
# Linked card/board art (../{material,structure}-deck/out/web, ../{river,fish}-board)
# is resolved relative to this directory at render time.
set -euo pipefail
cd "$(dirname "$0")"

render() {
  local face="$1"            # "top" | "bottom"
  local src="box-${face}.svg"
  local out="box-${face}.png"
  # Temp copy MUST sit beside the source so linked art's relative ../ hrefs
  # (board + card PNGs) still resolve at render time.
  local tmp=".export-${face}.tmp.svg"
  # Hide the guides layer for export (style="display:inline" -> "display:none").
  sed 's/\(id="layer-guides"[^>]*style="display:\)inline/\1none/' "$src" > "$tmp"
  inkscape "$tmp" --export-type=png --export-filename="$out" --export-dpi=300
  rm -f "$tmp"
  echo "wrote $out"
}

case "${1:-all}" in
  top)    render top ;;
  bottom) render bottom ;;
  all)    render top; render bottom ;;
  *) echo "usage: $0 [top|bottom|all]" >&2; exit 1 ;;
esac
