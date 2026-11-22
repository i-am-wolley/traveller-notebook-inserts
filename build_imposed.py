# -*- coding: utf-8 -*-
"""Impose the Year Book onto A4 sheets, with cut and fold marks.

Regular: two pages side by side on A4 landscape, two sheets, duplex short edge.
Passport: four pages on A4 portrait (two folded sheets stacked), duplex long edge.

    python build_imposed.py && python make_pdfs.py
"""
import os

from build_core import SIZES, css, foot
from build_inserts import pages, imposition, a4_geometry

OUT = "."

MARK = "#8a8a8a"     # cut and fold rules
LABEL = "#9a9a9a"


def plan(size, n):
    """Slot positions for each printed side, from the shared A4 geometry.

    Returns (a4_w, a4_h, orientation, [ [(page_no, x_mm, y_mm), ...], ... ]).
    """
    g = a4_geometry(size)
    pw = g["pw"]
    xl, xr = g["x0"], g["x0"] + pw
    sides = imposition(n)
    folded = n // 4

    if size == "regular":
        # one A4 landscape per folded sheet, two pages side by side
        y = g["y0"]
        return g["aw"], g["ah"], g["orient"], [
            [(l, xl, y), (r, xr, y)] for l, r in sides]

    # two folded sheets stacked on one A4 portrait. The front carries both
    # sheets' outsides and the back both insides, so a long-edge flip keeps
    # each folded sheet on the same half of the paper.
    yt, yb = g["ytop"], g["ybot"]
    out = []
    for p in range(0, folded, 2):
        for off in (0, 1):
            slots = [(sides[2 * p + off][0], xl, yt),
                     (sides[2 * p + off][1], xr, yt)]
            if p + 1 < folded:
                slots += [(sides[2 * (p + 1) + off][0], xl, yb),
                          (sides[2 * (p + 1) + off][1], xr, yb)]
            out.append(slots)
    return g["aw"], g["ah"], g["orient"], out


def vline(x, y, h, style, color=MARK):
    return ("<div style='position:absolute;left:%.2fmm;top:%.2fmm;height:%.2fmm;"
            "border-left:0.4pt %s %s'></div>" % (x, y, h, style, color))


def hline(y, x, w, style, color=MARK):
    return ("<div style='position:absolute;top:%.2fmm;left:%.2fmm;width:%.2fmm;"
            "border-top:0.4pt %s %s'></div>" % (y, x, w, style, color))


def label(x, y, text, rotate=False):
    rot = ("transform:rotate(-90deg);transform-origin:left top;" if rotate else "")
    return ("<div style='position:absolute;left:%.2fmm;top:%.2fmm;%s"
            "font-size:5pt;letter-spacing:.14em;color:%s;white-space:nowrap'>%s"
            "</div>" % (x, y, rot, LABEL, text))


def marks(size, side_no, folded):
    """Cut lines, fold lines and waste-margin labels for one printed side."""
    g = a4_geometry(size)
    aw, ah, pw, ph, x0 = g["aw"], g["ah"], g["pw"], g["ph"], g["x0"]
    out = [vline(x0, 0, ah, "dashed"), vline(x0 + pw * 2, 0, ah, "dashed")]

    if size == "regular":
        out.append(vline(x0 + pw, 0, ah, "dashed", "#c4c4c4"))   # fold
        out.append(label(x0 - 5, ah - 6, "CUT", rotate=True))
        out.append(label(x0 + pw * 2 + 3, ah - 6, "CUT", rotate=True))
        out.append(label(6, ah - 6, "SHEET %d &middot; %s"
                         % (side_no // 2 + 1,
                            "FRONT" if side_no % 2 == 0 else "BACK"), rotate=True))
        out.append(label(aw - 11, ah - 6, "A4 LANDSCAPE &middot; DUPLEX ON THE "
                         "SHORT EDGE &middot; PRINT AT 100%", rotate=True))
        return "".join(out)

    yt, yb = g["ytop"], g["ybot"]
    pair = side_no // 2                     # which piece of paper
    top_sheet = pair * 2 + 1
    has_bottom = top_sheet < folded
    ys = [yt, yt + ph] + ([yb, yb + ph] if has_bottom else [])
    for y in ys:
        out.append(hline(y, 0, aw, "dashed"))
    for y in ([yt] + ([yb] if has_bottom else [])):
        out.append(vline(x0 + pw, y, ph, "dashed", "#c4c4c4"))   # fold
    side = "FRONT" if side_no % 2 == 0 else "BACK"
    out.append(label(x0 + 1, yt - 4.2, "SHEET %d &middot; %s" % (top_sheet, side)))
    if has_bottom:
        out.append(label(x0 + 1, yb - 4.2,
                         "SHEET %d &middot; %s" % (top_sheet + 1, side)))
    out.append(label(x0 - 5, ah - 6, "CUT", rotate=True))
    out.append(label(4, ah - 6, "A4 PORTRAIT &middot; DUPLEX ON THE LONG EDGE "
                     "&middot; PRINT AT 100%", rotate=True))
    return "".join(out)


def build(size):
    s = SIZES[size]
    bodies = pages(size)
    aw, ah, orient, sides = plan(size, len(bodies))
    folded = len(bodies) // 4

    extra = """
@page { size: %s %s; margin: 0; }
body { background: #fff; }
.a4 { position: relative; width: %smm; height: %smm; overflow: hidden;
      page-break-after: always; break-after: page; background: #fff; }
.a4:last-child { page-break-after: auto; break-after: auto; }
.slot { position: absolute; }
.sheet { page-break-after: auto !important; break-after: auto !important; }
""" % ("%smm" % aw, "%smm" % ah, aw, ah)

    out = []
    for i, side in enumerate(sides):
        slots = []
        for pno, x, y in side:
            body, turned = bodies[pno - 1]
            inner = body + foot(None if pno == 1 else pno)
            if turned:
                inner = "<div class='turn'>%s</div>" % inner
            slots.append(
                "<div class='slot' style='left:%.2fmm;top:%.2fmm'>"
                "<div class='sheet %s'><div class='pad'>%s</div></div></div>"
                % (x, y, "R" if pno % 2 else "L", inner))
        out.append("<div class='a4'>%s%s</div>\n"
                   % ("".join(slots), marks(size, i, folded)))

    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<title>Year Book A4 &mdash; %s</title><style>%s%s</style></head>"
            "<body>\n%s\n</body></html>\n"
            % (size, css(s), extra, "".join(out)))


def main():
    for size in ("regular", "passport"):
        d = os.path.join(OUT, size)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, "year-book-%s-A4.html" % size)
        html = build(size)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print("%-44s %d A4 sides" % (path, html.count("class='a4'")))


if __name__ == "__main__":
    main()
