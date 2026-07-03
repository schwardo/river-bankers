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
    /* Back cover: full-bleed page mirroring the front, pads the booklet to a
       multiple of 4 (16) and gives the leaf a proper outside-back face. */
    .back-cover {
      height: 10.25in; width: 8.25in; margin: -0.3in; padding: 0.3in;
      box-sizing: border-box; page-break-before: always;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
      background: linear-gradient(180deg, var(--paper) 0%, var(--paper-warm) 100%);
    }
    .back-cover img { width: 3.4in; height: auto; opacity: 0.92;
      filter: drop-shadow(0 3pt 6pt rgba(0,0,0,0.2)); margin-bottom: 0.35in; }
    .back-cover .bc-line { font-size: 11pt; color: var(--ink-soft); font-style: italic; }
    .back-cover .bc-web { margin-top: 0.5in; font-size: 10pt; letter-spacing: 1pt;
      color: var(--water-deep); text-transform: uppercase; }
  </style>
"""
html = html.replace('</head>', override + '</head>', 1)

# Rebalance forced page breaks for the shorter 8x10 page. The Letter rulebook
# forces a break before "Auctions", which on jumbo orphans the tail of "Your
# turn" onto a near-blank page. Move that break to before "Endgame" instead:
# "Your turn" flows straight into "Auctions" (filling the page), and the break
# now lands where a page is already near-full. Keeps the 16-page total.
html = re.sub(r'<div class="page-break"></div>\s*(?=<h2>Auctions</h2>)', '', html, count=1)
html = html.replace('<h2>Endgame &amp; game end</h2>',
                    '<div class="page-break"></div>\n<h2>Endgame &amp; game end</h2>', 1)

# Inject a back-cover page (jumbo edition only) right before </body>.
back = """
<div class="back-cover">
  <img src="../artwork/logo.png" alt="River Bankers"
       onerror="this.style.display='none'">
  <div class="bc-line">A game of rivals on the riverbank.</div>
  <div class="bc-line">2&ndash;4 players &middot; ages 10+ &middot; 30&ndash;55 min</div>
  <div class="bc-web">leftfield.games</div>
</div>
"""
html = html.replace('</body>', back + '</body>', 1)

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
