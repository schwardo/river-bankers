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
# prose never has to be maintained twice. Content is inset 0.6" from the bleed
# edge — well clear of the 0.25" safe zone, with a 7% content scale-down so the
# roomier margins still land the booklet on exactly 16 pages.
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

# The jumbo shares the Letter's page BREAKS verbatim, so both editions paginate
# identically and ONE Table of Contents is correct for both. We change only the
# page SIZE (via a cascading @page rule, so the Letter's @bottom-center
# page-number counter survives) and give the cover its full-bleed treatment.
override = """
  <style id="jumbo-overrides">
    /* Page size only — a later @page rule cascades over the Letter's, keeping
       its @bottom-center page-number counter intact. */
    @page { size: 8.25in 10.25in; margin: 0.6in; }
    /* The roomier 0.6in margin costs ~3 pages of text area; scale content down
       7% to claw them back and land on exactly 16 pages (TGC needs a multiple
       of 4). The cliff is just above: 0.94 still fits, 0.95+ spills to 19, so
       there is only ~1pt of slack. Re-check the page count after ANY prose edit
       or if either number changes. */
    body { zoom: 0.93; }
    /* Cover full-bleed: the Letter already sets .cover{page:cover-page}; zero
       that page's margin so the gradient reaches the physical edge, and fill the
       page with 0.6in padding to hold art well inside the 0.25in safe zone. */
    @page cover-page { size: 8.25in 10.25in; margin: 0; }
    /* Counter-zoom the cover back to 1.0 (nested zoom multiplies: 0.93 x 1.0753
       = 1). Without this the body zoom shrinks the full-bleed page to 7.59x9.43in
       and leaves white strips along the right and bottom edges. */
    .cover { width: 8.25in; height: 10.25in; margin: 0; padding: 0.6in; box-sizing: border-box; zoom: 1.0752688; }
    .cover img.logo { width: 6.0in; max-height: 5.0in; }
  </style>
"""
html = html.replace('</head>', override + '</head>', 1)

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
pdftoppm -png -r "$DPI" "$PDF" "$PNGDIR/tmp"
# Rename to literal Page-N[N].png (page number appears twice, brackets included).
for f in "$PNGDIR"/tmp-*.png; do
  raw=$(echo "$f" | sed -E 's/.*tmp-0*([0-9]+)\.png/\1/')
  n=$((10#$raw))
  mv "$f" "$PNGDIR/Page-$n[$n].png"
done
echo "Wrote $(ls "$PNGDIR"/*.png | wc -l) PNGs to $PNGDIR/ (Page-N[N].png, ${DPI} DPI, $(identify -format '%wx%h' "$PNGDIR/Page-1[1].png") px)"
