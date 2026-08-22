#!/usr/bin/env python3
"""Render the shop-listing call-to-action buttons to PNG.

The Game Crafter's listing markup can't style links, so the "Play against AI"
and "Read Rulebook" buttons on the shop page are images wrapped in links.
Drawn at 4x and downsampled, so edges and text stay clean at display size.
Colors match the rulebook palette (water for play, riverbank for the rules).
"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 360, 80                # design size
OUT = 0.5                     # displayed at half the design size on the listing
S = 4                         # supersample factor while drawing
FONT = "/usr/share/fonts/opentype/urw-base35/P052-Bold.otf"   # Palatino clone
PAPER = (250, 243, 227, 255)

BUTTONS = [
    ("btn-play.png",  "Play against AI", (58, 143, 183), (29, 78, 107), (20, 58, 81),  "play"),
    ("btn-rules.png", "Read Rulebook",   (160, 130, 90), (107, 84, 54),  (74, 56, 35),  "book"),
]


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        img.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return img.resize((w, h)).convert("RGBA")


def play_icon(d, cx, cy, r, w):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=PAPER, width=w)
    d.polygon([(cx - r * 0.30, cy - r * 0.44), (cx + r * 0.46, cy),
               (cx - r * 0.30, cy + r * 0.44)], fill=PAPER)


def book_icon(d, cx, cy, r, w):
    """An open book: two page blocks bowing away from a central spine."""
    def bez(p0, p1, p2, n=24):
        return [(round((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]),
                 round((1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]))
                for t in (i / n for i in range(n + 1))]

    top, bot = cy - r * 0.74, cy + r * 0.74
    for sign in (-1, 1):
        edge = cx + sign * r
        d.line(bez((cx, top), (cx + sign * r * 0.55, top - r * 0.30), (edge, top + r * 0.22)),
               fill=PAPER, width=w, joint="curve")
        d.line([(edge, top + r * 0.22), (edge, bot - r * 0.10)], fill=PAPER, width=w)
        d.line(bez((edge, bot - r * 0.10), (cx + sign * r * 0.55, bot - r * 0.42), (cx, bot)),
               fill=PAPER, width=w, joint="curve")
    d.line([(cx, top), (cx, bot)], fill=PAPER, width=w)


def render(name, label, top, bottom, border, icon):
    w, h = W * S, H * S
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=255)
    img.paste(gradient((w, h), top, bottom), (0, 0), mask)

    d = ImageDraw.Draw(img)
    bw = 3 * S
    d.rounded_rectangle([bw // 2, bw // 2, w - 1 - bw // 2, h - 1 - bw // 2],
                        radius=h // 2, outline=border + (255,), width=bw)

    font = ImageFont.truetype(FONT, 25 * S)
    tw = d.textlength(label, font=font)
    r, gap = 15 * S, 14 * S
    left = (w - (2 * r + gap + tw)) / 2
    (play_icon if icon == "play" else book_icon)(d, left + r, h / 2, r, round(2.5 * S))
    d.text((left + 2 * r + gap, h / 2), label, font=font, fill=PAPER, anchor="lm")

    out = sys.argv[1] if len(sys.argv) > 1 else "web"
    dst = f"{out}/{name}"
    ow, oh = round(W * OUT), round(H * OUT)
    img.resize((ow, oh), Image.LANCZOS).save(dst, optimize=True)
    print(f"{dst}  {ow}x{oh}")


for b in BUTTONS:
    render(*b)
