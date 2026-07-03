#!/usr/bin/env bash
# Build a TGC Jumbo Booklet (8" x 10") edition of the rulebook and export
# one full-bleed PNG per page.
#
# TGC Jumbo Booklet spec (template jumbo-booklet 20pg.svg):
#   - Full bleed page: 8.25" x 10.25"  (8x10 trim + 0.125" bleed all sides)
#   - Trim:            8.00" x 10.00"
#   - Safe zone:       7.75" x  9.75"  (0.25" in from every bleed edge)
#   - Page count must be a MULTIPLE OF 4 (max 40).
#
# The jumbo HTML is DERIVED from rulebook.html (single source of truth) by
# swapping the @page rule and appending an 8x10 override stylesheet, so the
# prose never has to be maintained twice. Content is inset 0.3" from the bleed
# edge, which keeps every text box inside the 0.25" safe zone.
#
# Layout tuned for a tight 12-PAGE booklet:
#   - both boards (river + fish-track) share page 3 (shrunk to fit)
#   - QUICK REFERENCE is the final page (12)
#   - forced section breaks re-derived to land exactly on 12 (no back cover)
#
# Usage: build-jumbo.sh
# Output:
#   rulebook-jumbo.html            (generated; git-ignored)
#   rulebook-jumbo.pdf             (generated; git-ignored)
#   jumbo-pages/page-01.png ...    (300 DPI, 2475x3075; the TGC upload set)
set -euo pipefail
cd "$(dirname "$0")"

SRC="rulebook.html"
GEN="rulebook-jumbo.html"
PDF="rulebook-jumbo.pdf"
PNGDIR="jumbo-pages"
DPI=300

# --- 1. Derive the jumbo HTML from the Letter rulebook -----------------------
python3 - "$SRC" "$GEN" <<'PY'
import re, sys
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()

# Replace the @page rule (letter -> 8.25x10.25 full-bleed, 0.3" safe margins).
html = re.sub(
    r'@page\s*\{[^}]*\}',
    '@page {\n'
    '    size: 8.25in 10.25in;   /* 8x10 trim + 0.125in bleed all sides */\n'
    '    margin: 0.3in;          /* content sits inside the 0.25in safe zone */\n'
    '  }',
    html, count=1)

# Jumbo-specific overrides appended last so they win the cascade.
override = """
  <style id="jumbo-overrides">
    /* Cover: full-bleed the gradient to the page edge, then re-pad to safe. */
    .cover {
      height: 10.25in;
      width: 8.25in;
      margin: -0.3in;          /* expand out through the @page margin to bleed */
      padding: 0.3in;
      box-sizing: border-box;
    }
    .cover img.logo { width: 6.0in; max-height: 5.0in; }
    /* Keep BOTH boards together on one page: shrink to fit the 8x10 page and
       forbid the pair from splitting across a page boundary. */
    .boards-pair { page-break-inside: avoid; break-inside: avoid; }
    .boards-pair figure.river-figure img.board-art { width: 62%; }
    .boards-pair figure.fish-figure img.board-art  { width: 40%; }
  </style>
"""
html = html.replace('</head>', override + '</head>', 1)

# --- Pagination for a tight 12-page booklet (multiple of 4) ------------------
# Natural flow (no forced breaks) is 11 pages. We drop ALL the Letter rulebook's
# forced section breaks, then re-add a small, deliberate set so the booklet
# lands on exactly 12 pages with the QUICK REFERENCE as the final page (12).
html = html.replace('.page-break { page-break-before: always; }',
                    '.page-break { page-break-before: auto; }')  # neutralize source breaks

def force_break_before(marker):
    global html
    html = html.replace(marker, '<div class="jbreak"></div>\n' + marker, 1)

# Section starts chosen to spread 11 -> 12 pages and seat Quick reference last.
for m in ('<h2>Game elements</h2>',
          '<h2>Turn order</h2>',
          '<h2>Quick reference</h2>'):
    force_break_before(m)

# Real forced-break class for the ones we re-added.
html = html.replace('</head>',
    '<style>.jbreak{page-break-before:always;}</style></head>', 1)

open(out, 'w', encoding='utf-8').write(html)
print(f"generated {out}")
PY

# --- 2. Render to PDF via headless Chrome ------------------------------------
google-chrome \
  --headless=new --disable-gpu --no-sandbox \
  --no-pdf-header-footer --hide-scrollbars \
  --virtual-time-budget=10000 \
  --print-to-pdf="$(pwd)/$PDF" --print-to-pdf-no-header \
  "file://$(pwd)/$GEN" 2>/dev/null

PAGES=$(pdfinfo "$PDF" | awk '/^Pages:/{print $2}')
echo "Rendered $PDF ($PAGES pages)"
if [ $(( PAGES % 4 )) -ne 0 ]; then
  echo "  ⚠  $PAGES is NOT a multiple of 4 — TGC requires 4/8/12/16/20/... (pad to $(( (PAGES/4 + 1) * 4 )))."
else
  echo "  ✓  $PAGES is a valid multiple of 4."
fi

# --- 3. Export one full-bleed PNG per page -----------------------------------
rm -rf "$PNGDIR"; mkdir -p "$PNGDIR"
pdftoppm -png -r "$DPI" "$PDF" "$PNGDIR/page"
# pdftoppm names page-1.png ... zero-pad to page-01.png for a clean upload set.
for f in "$PNGDIR"/page-*.png; do
  raw=$(echo "$f" | sed -E 's/.*page-([0-9]+)\.png/\1/')
  n=$(printf '%02d' "$((10#$raw))")
  dst="$PNGDIR/page-$n.png"
  [ "$f" != "$dst" ] && mv "$f" "$dst"
done
echo "Wrote $(ls "$PNGDIR"/*.png | wc -l) PNGs to $PNGDIR/ ($(identify -format '%wx%h' "$PNGDIR/page-01.png") px @ ${DPI} DPI)"
