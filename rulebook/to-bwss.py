"""Convert rulebook/rulebook.html into BoardWeaver rules pages (BWSS JSON)
for the River Bankers BoardWeaver port (game #160).

Usage:  python3 rulebook/to-bwss.py rulebook/rulebook.html <outdir>

Writes:
  <outdir>/pages/<slug>.bwss  one file per rules page; upload each to
                              /src/rules/<slug>.bwss (index.bwss is the first page)
  <outdir>/img/<Key>.png      each image the pages use, resized; upload each as
                              BoardWeaver art with that key (Image.src = key)
  <outdir>/images.json        art key -> source path and display width

Upload with the BoardWeaver MCP create_upload tool (target "file" for pages,
"art" for images), then run validate_code. Pages split at the rulebook's <h2>s
per PAGES below; worker chits become species-coloured discs, material SVG
icons become emoji, and positioned figures (.su-rel, .anatomy, .wt-cardwrap,
.su-hand) keep their overlays. BWSS notes: lengths are px when unitless (so
lineHeight is written in em), transform rotate takes a number, and
backgroundPosition takes one value, so sprite sheets can't be cropped here.

Needs: beautifulsoup4, Pillow."""
import json, os, re, sys
from bs4 import BeautifulSoup, NavigableString, Comment, Tag

SRC, OUT = sys.argv[1], sys.argv[2]
BASE = os.path.dirname(os.path.abspath(SRC))

INK = "#2c1f15"
SOFT = "#5a4a36"
FOREST = "#2f5d3a"
RIVER = "#2f6f86"
GOLD = "#b07d00"
SPECIES = {"beaver": "#7b4a1e", "otter": "#c0392b", "muskrat": "#2e7d4f", "mink": "#7d3c98"}
GLYPH = {"logs": "🪵", "stones": "🪨", "reeds": "🌾", "mud": "🟫", "vines": "🍃", "clay": "🧱"}

# Page plan: slug, title, the h2 headings it holds.
PAGES = [
    ("setup", "Components, goal & setup", ["Components", "Goal", "Setup"]),
    ("how-to-play", "How the game plays", ["How the game plays", "Game elements"]),
    ("turns", "Turn order & your turn", ["Turn order", "Your turn"]),
    ("auctions", "Auctions & card movement", ["Auctions", "Card movement"]),
    ("endgame", "Endgame & scoring", ["Endgame"]),
    ("material-effects", "Material card effects", ["Material card effects reference"]),
    ("glossary", "Glossary", ["Glossary", "Acknowledgements"]),
    ("quick-reference", "Quick reference", ["Quick reference"]),
]

images = {}  # key -> {"src": path, "width": px}


def art_key(src, width):
    path = os.path.normpath(os.path.join(BASE, src))
    stem = re.sub(r"[^A-Za-z0-9]", "", os.path.splitext(os.path.basename(path))[0].title())
    folder = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(path)))) if "/out/web/" in path else ""
    prefix = {"material-deck": "Mat", "structure-deck": "Struct", "starter-deck": "Starter"}.get(folder, "Img")
    key = "Rule" + prefix + stem
    prev = images.get(key)
    images[key] = {"src": path, "width": max(width, prev["width"] if prev else 0)}
    return key


def norm(s):
    return re.sub(r"\s+", " ", s)


def box(children=None, style=None, id=None):
    n = {"type": "Box"}
    if id:
        n["id"] = id
    if style:
        n["style"] = style
    if children:
        n["children"] = children
    return n


def chit(color, size=13):
    return box(style={"display": "inline-flex", "width": size, "height": size, "borderRadius": "50%",
                      "backgroundColor": color, "borderWidth": 1, "borderStyle": "solid", "borderColor": "white",
                      "marginRight": 2})


def pct(v):
    m = re.match(r"\s*(-?[\d.]+)%", v or "")
    return float(m.group(1)) if m else None


def styles(tag):
    out = {}
    for part in (tag.get("style") or "").split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            out[k.strip()] = v.strip()
    return out


def classes(tag):
    return tag.get("class") or []


SKIP_CLASSES = {"amark", "page-break", "dots", "play-qr", "toc", "su-ov", "wt-chit"}

CARD_W = {"card": 190, "mcard": 210, "wtcard": 170, "su-starter": 70}


def img_node(tag, width=None):
    src = tag.get("src", "")
    if src.endswith(".svg"):
        name = os.path.basename(src)[:-4]
        if name in SPECIES:
            return chit(SPECIES[name], 16)
        if name in GLYPH:
            return GLYPH[name]
        return None
    if "qr" in src:
        return None
    cls = classes(tag)
    w = width
    if w is None:
        for c in cls:
            if c in CARD_W:
                w = CARD_W[c]
    s = styles(tag)
    if w is None and "width" in s and s["width"].endswith("in"):
        w = int(float(s["width"][:-2]) * 110)
    if w is None:
        w = 640 if "board" in src else 200
    key = art_key(src, w)
    st = {"width": w, "maxWidth": "100%", "borderRadius": 6}
    if "transform" in s and "rotate" in s["transform"]:
        deg = re.search(r"(-?[\d.]+)deg", s["transform"])
        if deg:
            st["transform"] = [{"rotate": float(deg.group(1))}]
    return {"type": "Image", "src": key, "alt": tag.get("alt", ""), "style": st}


def inline(tag):
    """Children of an inline-level run: strings and inline boxes."""
    out = []
    for ch in tag.children:
        if isinstance(ch, Comment):
            continue
        if isinstance(ch, NavigableString):
            t = norm(str(ch))
            if t:
                out.append(t)
            continue
        if not isinstance(ch, Tag):
            continue
        cls = classes(ch)
        if set(cls) & SKIP_CLASSES:
            continue
        name = ch.name
        if name == "br":
            out.append("\n")
        elif name == "img":
            n = img_node(ch, 14 if ch.get("src", "").endswith(".svg") else None)
            if n is not None:
                out.append(n)
        elif name == "span" and "worker" in cls:
            sp = [c for c in cls if c in SPECIES]
            out.append(chit(SPECIES[sp[0]] if sp else "#333"))
        elif name in ("strong", "b", "em", "i", "span", "a", "code", "sup", "sub"):
            st = {"display": "inline-flex"}
            if name in ("strong", "b"):
                st["fontWeight"] = "700"
            if name in ("em", "i"):
                st["fontStyle"] = "italic"
                st["color"] = SOFT
            if "fish" in cls:
                st.update({"color": RIVER, "fontWeight": "700"})
            if "vp" in cls:
                st.update({"color": GOLD, "fontWeight": "700"})
            if "n" in cls:
                st.update({"width": 18, "height": 18, "borderRadius": "50%", "backgroundColor": FOREST,
                           "color": "white", "fontSize": 11, "fontWeight": "700", "justifyContent": "center",
                           "alignItems": "center", "marginRight": 4})
            kids = inline(ch)
            text = "".join(k for k in kids if isinstance(k, str))
            # Long runs would not wrap inside an inline-flex box: keep them plain.
            if len(text) > 48 and all(isinstance(k, str) for k in kids):
                out.append(text)
            elif kids:
                out.append(box(kids, st))
        else:
            out.extend(block(ch))
    # Trim edge spaces.
    if out and isinstance(out[0], str):
        out[0] = out[0].lstrip()
    if out and isinstance(out[-1], str):
        out[-1] = out[-1].rstrip()
    return [o for o in out if o != ""]


HEAD = {
    "h1": {"fontSize": 30, "fontWeight": "700", "color": FOREST},
    "h2": {"fontSize": 24, "fontWeight": "700", "color": FOREST, "marginTop": 18},
    "h3": {"fontSize": 18, "fontWeight": "700", "color": FOREST, "marginTop": 12},
    "h4": {"fontSize": 15, "fontWeight": "700", "color": INK, "marginTop": 6},
}

ids_used = set()


def slug_id(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "s"
    if not s[0].isalpha():
        s = "s-" + s
    base, i = s, 2
    while s in ids_used:
        s = f"{base}-{i}"
        i += 1
    ids_used.add(s)
    return s


def has_block(tag):
    return any(isinstance(c, Tag) and c.name in ("div", "p", "ul", "ol", "table", "h1", "h2", "h3", "h4", "figure", "section")
               for c in tag.children)


def block(tag):
    """Block-level nodes for one element."""
    if isinstance(tag, Comment):
        return []
    if isinstance(tag, NavigableString):
        t = norm(str(tag)).strip()
        return [box([t], {"lineHeight": 1.5})] if t else []
    if not isinstance(tag, Tag):
        return []
    cls = classes(tag)
    if set(cls) & SKIP_CLASSES:
        return []
    name = tag.name
    if name in ("script", "style", "title", "head", "meta"):
        return []
    if name in HEAD:
        kids = inline(tag)
        return [box(kids, dict(HEAD[name]), id=slug_id("".join(k for k in kids if isinstance(k, str))))]
    if name == "p":
        kids = inline(tag)
        st = {"lineHeight": 1.55, "whiteSpace": "pre-line"}
        if "lead" in cls:
            st["fontSize"] = 16
        return [box(kids, st)] if kids else []
    if name in ("ul", "ol"):
        items = []
        for i, li in enumerate(tag.find_all("li", recursive=False)):
            mark = f"{i + 1}." if name == "ol" else "•"
            body = block_children(li) if has_block(li) else [box(inline(li), {"lineHeight": 1.55, "whiteSpace": "pre-line"})]
            items.append(box([box([mark], {"width": 22, "flexShrink": 0, "fontWeight": "700", "color": FOREST}),
                              box(body, {"flex": 1, "minWidth": 0})], {"display": "flex", "gap": 4}))
        return [box(items, {"display": "flex", "flexDirection": "column", "gap": 6, "paddingLeft": 6})]
    if name == "table":
        rows = []
        for tr in tag.find_all("tr"):
            cells = []
            for cell in tr.find_all(["td", "th"], recursive=False):
                st = {"flex": 1, "minWidth": 0, "paddingX": 6, "paddingY": 4, "lineHeight": 1.4, "whiteSpace": "pre-line"}
                if cell.name == "th":
                    st.update({"fontWeight": "700", "color": "white"})
                cells.append(box(inline(cell), st))
            rst = {"display": "flex", "borderBottomWidth": 1, "borderBottomStyle": "solid", "borderBottomColor": "#e2d6b8"}
            if tr.find("th"):
                rst["backgroundColor"] = FOREST
            rows.append(box(cells, rst))
        return [box(rows, {"display": "flex", "flexDirection": "column", "fontSize": 14, "borderRadius": 6,
                           "overflow": "hidden", "borderWidth": 1, "borderStyle": "solid", "borderColor": "#e2d6b8"})]
    if name == "img":
        n = img_node(tag)
        return [n] if isinstance(n, dict) else []
    if name in ("figure",):
        return [box(block_children(tag), {"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 4})]
    if name == "figcaption":
        return [box(inline(tag), {"fontSize": 13, "fontStyle": "italic", "color": SOFT, "textAlign": "center"})]
    if name == "br":
        return []
    if name == "section" and "cover" in cls:
        return cover(tag)
    if "su-hand" in cls:
        kids = []
        for im in tag.find_all("img"):
            s = styles(im)
            ptx = lambda v: float(re.match(r"(-?[\d.]+)", v).group(1)) * 1.33 if v else 0
            node = img_node(im, 66)
            kids.append(box([node], {"position": "absolute", "left": ptx(s.get("left")), "top": ptx(s.get("top"))}))
        return [box(kids, {"position": "relative", "width": 165, "height": 100, "flexShrink": 0})]
    # Positioned overlays (worked example, anatomy, setup figure).
    if {"wt-cardwrap", "anatomy", "su-rel"} & set(cls):
        return [overlay(tag)]
    if name in ("div", "section", "span", "strong", "em"):
        if "callout" in cls:
            label = tag.find(class_="label")
            kids = []
            if label:
                kids.append(box([norm(label.get_text()).strip()], {"fontWeight": "700", "color": FOREST, "marginBottom": 4}))
                label.extract()
            kids.append(box(inline(tag), {"lineHeight": 1.55, "whiteSpace": "pre-line"}))
            return [box(kids, {"backgroundColor": "#f4f1e3", "borderLeftWidth": 4, "borderLeftStyle": "solid",
                               "borderLeftColor": FOREST, "padding": 10, "borderRadius": 6})]
        if "action" in cls:
            tg = tag.find(class_="tag")
            head = []
            if tg:
                nm = tg.find(class_="name")
                cost = tg.find(class_="cost")
                head = [box([box([nm.get_text().strip() if nm else ""], {"fontWeight": "700", "fontSize": 18, "color": "white"}),
                             box([cost.get_text().strip() if cost else ""], {"color": "white", "fontWeight": "700"})],
                            {"display": "flex", "justifyContent": "space-between", "alignItems": "center",
                             "backgroundColor": FOREST, "paddingX": 10, "paddingY": 6, "borderRadius": 6})]
                tg.extract()
            return [box(head + block_children(tag), {"display": "flex", "flexDirection": "column", "gap": 6,
                                                      "borderWidth": 1, "borderStyle": "solid", "borderColor": "#d8cfae",
                                                      "borderRadius": 8, "padding": 8})]
        if not has_block(tag) and name == "div":
            kids = inline(tag)
            if not kids:
                return []
            st = {"lineHeight": 1.5, "whiteSpace": "pre-line"}
            if "tier-label" in cls:
                st.update({"fontSize": 12, "textTransform": "uppercase", "letterSpacing": 1, "color": SOFT})
            s = styles(tag)
            if "font-style" in s and "italic" in s["font-style"]:
                st.update({"fontStyle": "italic", "color": SOFT, "fontSize": 13})
            if "su-workers" in cls or "grp" in cls or "su-hand" in cls:
                st = {"display": "flex", "flexWrap": "wrap", "gap": 2, "alignItems": "center"}
            return [box(kids, st)]
        kids = block_children(tag)
        if not kids:
            return []
        row = {"col2", "card-row", "effect-card", "anatomy-fig", "wt", "su-lower", "wt-bids", "su-item"} & set(cls)
        st = {"display": "flex", "flexDirection": "row" if row else "column", "gap": 10}
        if row:
            st.update({"flexWrap": "wrap", "alignItems": "flex-start"})
        if "effect-cards" in cls:
            st["gap"] = 14
        if "wt-panel" in cls:
            st.update({"width": 190})
        if "effect-card" in cls:
            st["flexWrap"] = "nowrap"
        return [box(kids, st)]
    if name in ("li", "td", "th", "thead", "tbody", "tr"):
        return block_children(tag)
    return [box(inline(tag))] if tag.get_text(strip=True) else []


def block_children(tag):
    out, run = [], []

    def flush():
        nonlocal run
        kids = [k for k in run if not (isinstance(k, str) and not k.strip())]
        if kids:
            out.append(box(kids, {"lineHeight": 1.55, "whiteSpace": "pre-line"}))
        run = []

    for ch in tag.children:
        if isinstance(ch, Comment):
            continue
        if isinstance(ch, NavigableString):
            t = norm(str(ch))
            if t.strip():
                run.append(t)
            continue
        if not isinstance(ch, Tag):
            continue
        if ch.name in ("strong", "em", "b", "i", "a", "br") or (ch.name == "span" and not has_block(ch)):
            run.extend(inline(BeautifulSoup(f"<x>{ch}</x>", "html.parser").x))
            continue
        flush()
        out.extend(block(ch))
    flush()
    return out


def overlay(tag):
    """A relative container whose base image has absolutely placed pieces."""
    base = None
    for im in tag.find_all("img", recursive=False):
        cls = classes(im)
        s = styles(im)
        if "left" not in s:
            base = im
            break
    if base is None:
        return box(block_children(tag))
    cls = classes(base)
    width = 640 if "su-board" in cls and "fish" not in base.get("src", "") else None
    if "su-fishboard" in classes(tag):
        width = 320
    if width is None:
        width = CARD_W.get(next((c for c in cls if c in CARD_W), ""), 200)
    kids = [img_node(base, width)]
    for ch in tag.children:
        if not isinstance(ch, Tag) or ch is base:
            continue
        s = styles(ch)
        left, top = pct(s.get("left")), pct(s.get("top"))
        if left is None or top is None:
            continue
        w = pct(s.get("width"))
        cls2 = classes(ch)
        if ch.name == "img":
            src = ch.get("src", "")
            sz = int(width * (w or 8) / 100)
            name = os.path.basename(src)[:-4] if src.endswith(".svg") else ""
            if name in SPECIES:
                piece = box(style={"width": sz, "height": sz, "borderRadius": "50%", "backgroundColor": SPECIES[name],
                                   "borderWidth": 2, "borderStyle": "solid", "borderColor": "white"})
            else:
                piece = img_node(ch, sz)
                if not isinstance(piece, dict):
                    continue
                piece["style"] = {"width": sz}
            # The rulebook centres every overlay on its left/top point.
            kids.append(box([piece], {"position": "absolute", "left": f"{left}%", "top": f"{top}%", "display": "flex",
                                      "transform": [{"translateX": "-50%"}, {"translateY": "-50%"}]}))
        elif "amark" in cls2:
            kids.append(box([ch.get_text().strip()], {"position": "absolute", "left": f"{left}%", "top": f"{top}%",
                                                        "width": 20, "height": 20, "borderRadius": "50%",
                                                        "backgroundColor": "#c0392b", "color": "white", "fontSize": 12,
                                                        "fontWeight": "700", "display": "flex", "alignItems": "center",
                                                        "justifyContent": "center",
                                                        "transform": [{"translateX": "-50%"}, {"translateY": "-50%"}]}))
    for k in kids:
        if isinstance(k, dict) and "style" in k:
            k["style"] = {a: b for a, b in k["style"].items() if b is not None}
    return box(kids, {"position": "relative", "width": width, "maxWidth": "100%"})


def cover(tag):
    out = []
    logo = tag.find("img", class_="logo")
    if logo:
        out.append(img_node(logo, 420))
    tl = tag.find(class_="tagline")
    if tl:
        out.append(box(inline(tl), {"fontSize": 16, "fontStyle": "italic", "textAlign": "center", "lineHeight": 1.5,
                                    "whiteSpace": "pre-line", "color": SOFT}))
    meta = tag.find(class_="meta")
    if meta:
        out.append(box([norm(s.get_text()).strip() for s in meta.find_all("span", recursive=False)][0:1] and
                       [" · ".join(norm(s.get_text()).strip() for s in meta.find_all("span", recursive=False))],
                       {"fontWeight": "700", "textAlign": "center"}))
    cr = tag.find(class_="credits")
    if cr:
        out.append(box([" · ".join(norm(d.get_text()).strip() for d in cr.find_all("div"))],
                       {"textAlign": "center", "color": SOFT}))
    return [box(out, {"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": 8})]


def nav(slug):
    links = []
    order = ["index"] + [p[0] for p in PAGES]
    i = order.index(slug)
    if i > 0:
        prev = order[i - 1]
        title = "Contents" if prev == "index" else dict((p[0], p[1]) for p in PAGES)[prev]
        links.append({"type": "Anchor", "href": prev, "style": {"textDecorationLine": "underline", "color": RIVER},
                      "children": ["← " + title]})
    else:
        links.append(box([""]))
    if i + 1 < len(order):
        nxt = order[i + 1]
        links.append({"type": "Anchor", "href": nxt, "style": {"textDecorationLine": "underline", "color": RIVER},
                      "children": [dict((p[0], p[1]) for p in PAGES)[nxt] + " →"]})
    return box(links, {"display": "flex", "justifyContent": "space-between", "gap": 12, "fontWeight": "700",
                       "paddingY": 8})


def page(children, slug):
    return box([nav(slug)] + children + [nav(slug)],
               {"display": "flex", "flexDirection": "column", "gap": 12, "color": INK, "fontSize": 15, "maxWidth": 860})


def em_line_heights(n):
    """A unitless BWSS length is px, so a line-height multiplier needs em."""
    if isinstance(n, dict):
        st = n.get("style")
        if isinstance(st, dict) and isinstance(st.get("lineHeight"), (int, float)):
            st["lineHeight"] = f"{st['lineHeight']}em"
        for c in n.get("children", []):
            em_line_heights(c)


def write_images():
    """Resize each used image to 2x its display width (max 1400 px) as PNG."""
    from PIL import Image as PILImage
    os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
    for key, v in images.items():
        im = PILImage.open(v["src"])
        w = min(max(v["width"] * 2, 240), 1400)
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), PILImage.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        im.save(os.path.join(OUT, "img", key + ".png"), optimize=True)


def main():
    html = open(SRC, encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    body = soup.body
    # Split the body at h2s.
    sections, current, intro = {}, None, []
    for ch in list(body.children):
        if isinstance(ch, Tag) and ch.name == "h2":
            current = norm(ch.get_text()).strip()
            sections[current] = [ch]
        elif current is None:
            intro.append(ch)
        else:
            sections[current].append(ch)
    os.makedirs(os.path.join(OUT, "pages"), exist_ok=True)
    # Index: cover, lead, contents.
    idx = []
    for ch in intro:
        if isinstance(ch, Tag) and "toc" in classes(ch):
            continue
        idx.extend(block(ch))
    toc = [box(["Contents"], dict(HEAD["h2"]))]
    for slug, title, _ in PAGES:
        toc.append({"type": "Anchor", "href": slug, "style": {"textDecorationLine": "underline", "color": RIVER,
                                                               "fontSize": 17, "fontWeight": "700"},
                    "children": [title]})
    idx.append(box(toc, {"display": "flex", "flexDirection": "column", "gap": 8}))
    pages = {"index": page(idx, "index")}
    missing = set(sections)
    for slug, title, heads in PAGES:
        kids = []
        for h in heads:
            if h not in sections:
                print("missing section", h, file=sys.stderr)
                continue
            missing.discard(h)
            for ch in sections[h]:
                kids.extend(block(ch))
        pages[slug] = page(kids, slug)
    if missing:
        print("unplaced sections:", missing, file=sys.stderr)
    for p in pages.values():
        em_line_heights(p)
    for slug, p in pages.items():
        with open(os.path.join(OUT, "pages", slug + ".bwss"), "w") as f:
            json.dump(p, f, ensure_ascii=False, separators=(",", ":"))
    json.dump(images, open(os.path.join(OUT, "images.json"), "w"), indent=1)
    write_images()
    for slug in pages:
        print(slug, os.path.getsize(os.path.join(OUT, "pages", slug + ".bwss")))
    print(len(images), "images")


main()
