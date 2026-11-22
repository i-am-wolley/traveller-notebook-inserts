# -*- coding: utf-8 -*-
"""Build the printable Year Book inserts for a Traveller's Notebook.

Page types: a cover, a year-at-a-glance heat grid (turned on its side), six
blank-labelled habit grids, a films-and-shows stack chart, the world time
chart spread, sudoku with its answers, notes and the printing guide.

    python build_inserts.py && python make_pdfs.py
"""
import os

from build_core import SIZES, MONTHS, INK, doc, sheet, year_grid, padw, padh
import build_extras

OUT = "."
HABITS = 6
SUDOKUS = 8        # puzzles in the booklet, two to a page


# ---------------------------------------------------------------- pages

def p_cover(s):
    return ("<div class='cover'><div style='height:16%%'></div>"
            "<h1>The&nbsp;Year</h1><div class='rule'></div>"
            "<p class='sub'>Every day, six habits, everything watched</p>"
            "<div class='mid'></div>"
            "<div class='sub'>Year</div>"
            "<div class='wbox' style='height:%smm'></div></div>" % (s["h2"] * 1.9))


def p_glance(s):
    """Year at a glance, turned on its side so the 31 days run along the long edge."""
    w, h = padh(s), padw(s)            # turned: the width is the page height
    lab = s["glance_lab"]
    cell = (w - lab) / 31.0            # square cells, bound by the 31 columns
    grid = year_grid(s, cell, lab)
    used = 12 * cell + max(2.6, cell * 0.8)
    top = s["h2"] * 0.353 + 1.5        # heading block, roughly, in mm
    pad_top = max(0, (h - used - top - 5.5) / 2.0)
    return ("<h2>Every day of the year</h2>"
            "<div style='height:%.1fmm'></div>%s"
            "<div style='margin-top:1.8mm' class='legend'>"
            "<span class='key f'></span>Good day"
            "&nbsp;&nbsp;<span class='key'></span>Bad, or not logged"
            "&nbsp;&nbsp;<span class='key d'></span>No such date"
            "&nbsp;&nbsp;<span class='key l'></span>29 Feb &mdash; shade out in a "
            "common year</div>" % (pad_top, grid))


def p_habits(s, n, first):
    """Blank-labelled habit grids, square cells, read upright."""
    lab = s["habit_lab"]
    cell = (padw(s) - lab) / 31.0
    head = ("<h2>The year in habits</h2>"
            "<p class='sub'>Name six of your own. One square a day, the same grid "
            "as the year page.</p>" if first else "<h3>Habits, continued</h3>")
    blocks = "".join(
        "<div><div style='margin-bottom:0.8mm'>"
        "<span class='nameline' style='width:%.1fmm'>&nbsp;</span></div>%s"
        "<div class='sub' style='text-align:right;margin-top:.2mm'>"
        "total ______ / 365</div></div>"
        % (padw(s) * 0.62, year_grid(s, cell, lab))
        for _ in range(n))
    return ("<div style='display:flex;flex-direction:column;"
            "height:calc(100% - 5mm)'>"
            "<div style='flex:0 0 auto'>" + head + "</div>"
            "<div style='flex:1 1 auto;display:flex;flex-direction:column;"
            "justify-content:space-around'>" + blocks + "</div></div>")


def p_films(s, months, part, parts):
    """Months across the bottom, titles stacked up each column like a bar chart."""
    w, h = padh(s), padw(s)            # turned on its side
    n = len(months)
    colw = w / float(n)
    rows = s["film_rows"]
    head_mm = s["h2"] * 0.353 + (6 if part == 1 else 3)
    labels_mm = 4.6 if s["w"] > 100 else 3.8
    count_mm = 5.0 if s["w"] > 100 else 4.2
    boxh = (h - head_mm - labels_mm - count_mm - 6) / rows

    cell = ("<td style='height:%.2fmm;border:0.4pt solid #b4b4b4;"
            "padding:0'></td>" % boxh)
    cells = ("<tr>" + cell * n + "</tr>") * rows
    labs = "".join("<td style='text-align:center;font-size:%spt;color:#555;"
                   "padding-top:.9mm'>%s</td>" % (s["small"], m) for m in months)
    counts = "".join("<td style='border:0.4pt solid #b4b4b4;height:%.2fmm'></td>"
                     % count_mm for _ in months)

    head = ("<h2>Films and shows</h2>"
            "<p class='sub'>One title per box, stacked up from the bottom of the "
            "month you started it. Start the line with F or T for a film or a "
            "series; the count for the month goes in the box under the axis.</p>"
            if part == 1 else
            "<h3>Films and shows &mdash; %s to %s</h3>" % (months[0], months[-1]))
    total = ("Total for these six months ______" if parts > 1
             else "Total for the year ______")
    return (head +
            "<table class='g' style='width:100%%;border-bottom:0.7pt solid %s'>"
            "<colgroup>%s</colgroup>%s</table>"
            "<table class='g' style='width:100%%'><colgroup>%s</colgroup>"
            "<tr>%s</tr><tr>%s</tr></table>"
            "<div class='sub' style='margin-top:1.4mm'>%s</div>"
            % (INK, "<col style='width:%.3fmm'>" % colw * n, cells,
               "<col style='width:%.3fmm'>" % colw * n, labs, counts, total))


def p_blank(s):
    """A deliberately empty page, used to pad a booklet out to a multiple
    of four and to push a spread onto facing pages."""
    return ""


def p_notes(s):
    gap = 6.2 if s["w"] > 100 else 5.0
    n = int((padh(s) - 12) / gap)
    return ("<h3>Notes</h3>" +
            "".join("<div style='border-bottom:0.4pt solid #cfcfcf;height:%smm'>"
                    "</div>" % gap for _ in range(n)))


# ------------------------------------------------- printing and folding guide

def a4_geometry(size):
    """Where the insert pages sit on the A4 sheet. The single source of truth for
    both the imposed file and the cut measurements printed in the guide."""
    s = SIZES[size]
    pw, ph = s["w"], s["h"]
    if size == "regular":
        aw, ah = 297.0, 210.0
        return dict(aw=aw, ah=ah, pw=pw, ph=ph, orient="landscape",
                    x0=(aw - pw * 2) / 2.0, y0=(ah - ph) / 2.0, gap=0.0,
                    ytop=(ah - ph) / 2.0, ybot=None)
    aw, ah, gap = 210.0, 297.0, 9.0
    ytop = (ah - ph * 2 - gap) / 2.0
    return dict(aw=aw, ah=ah, pw=pw, ph=ph, orient="portrait",
                x0=(aw - pw * 2) / 2.0, y0=ytop, gap=gap,
                ytop=ytop, ybot=ytop + ph + gap)


def imposition(n):
    """Saddle-stitch order for an n-page booklet, as (left, right) per side.

    Folded sheet k carries the kth pair in from each end, so an 8-page booklet
    gives 8,1 / 2,7 on the outer sheet and 6,3 / 4,5 on the one nested inside.
    """
    if n % 4:
        raise ValueError("a saddle-stitched booklet needs a multiple of 4 "
                         "pages, got %d" % n)
    out = []
    for i in range(n // 4):
        out.append((n - 2 * i, 1 + 2 * i))        # that sheet, front
        out.append((2 + 2 * i, n - 1 - 2 * i))    # the same sheet, back
    return out


def sheets(size, n):
    """How many A4 sides the job needs, and how many folded sheets."""
    folded = n // 4
    a4 = folded * 2 if size == "regular" else ((folded + 1) // 2) * 2
    return folded, a4


def _a4_diagram(s, size, n):
    """Thumbnails of each A4 side, showing which insert page lands where."""
    sides = imposition(n)
    land = size == "regular"
    cw = padw(s)
    folded = n // 4
    if land:                             # one A4 landscape per folded sheet
        bw = (cw - 4) / 2.0
        bh = bw * 210 / 297.0
        groups = [[sd] for sd in sides]
        labels = ["Sheet %d %s" % (j // 2 + 1, "front" if j % 2 == 0 else "back")
                  for j in range(len(sides))]
    else:                                # one A4 portrait per two folded sheets
        bw = (cw - 6) / 2.0
        bh = bw * 297 / 210.0
        groups, labels = [], []
        for p in range(0, folded, 2):
            for off, word in ((0, "front"), (1, "back")):
                g = [sides[2 * p + off]]
                if p + 1 < folded:
                    g.append(sides[2 * (p + 1) + off])
                groups.append(g)
                labels.append("A4 %s%s"
                              % (("%d " % (p // 2 + 1)) if folded > 2 else "",
                                 word))

    fs = 3.6 if s["w"] > 100 else 2.9
    out = []
    for g, lab in zip(groups, labels):
        inner = []
        m = len(g)
        for k, (l, r) in enumerate(g):
            top = (k * 100.0 / m) + (3 if m > 1 else 0)
            hgt = (100.0 / m) - (6 if m > 1 else 0)
            inner.append(
                "<div style='position:absolute;left:8%%;right:8%%;top:%.1f%%;"
                "height:%.1f%%;border:0.4pt solid #9a9a9a;display:flex'>"
                "<div style='flex:1;display:flex;align-items:center;"
                "justify-content:center;border-right:0.4pt dashed #2b2b2b'>%d</div>"
                "<div style='flex:1;display:flex;align-items:center;"
                "justify-content:center'>%d</div></div>" % (top, hgt, l, r))
        out.append(
            "<div style='width:%.1fmm'>"
            "<div style='position:relative;width:100%%;height:%.1fmm;"
            "border:0.4pt solid #d6d6d6;background:#fafafa;font-size:%spt;"
            "color:#555'>%s"
            "<div style='position:absolute;left:8%%;top:0;bottom:0;"
            "border-left:0.4pt dashed #9a9a9a'></div>"
            "<div style='position:absolute;right:8%%;top:0;bottom:0;"
            "border-right:0.4pt dashed #9a9a9a'></div></div>"
            "<div class='sub' style='text-align:center;margin-top:.6mm'>%s</div>"
            "</div>" % (bw, bh, fs, "".join(inner), lab))
    return ("<div style='display:flex;gap:%smm;flex-wrap:wrap'>%s</div>"
            % (4 if land else 6, "".join(out)))


def p_print_guide(s, size, n=8):
    """The last page(s): how to print, cut, fold and nest."""
    land = size == "regular"
    f = "year-book-%s-A4.pdf" % size
    folded, a4 = sheets(size, n)
    papers = a4 // 2
    say = lambda k, one, many: (one if k == 1 else many % k)
    steps = [
        ("Print", "Open <b>%s</b> &mdash; the imposed file, not this one. A4, "
                  "%s, <b>100%% / Actual size</b> (never Fit to page), "
                  "double-sided, flipping on the <b>%s edge</b>. %s." %
         (f, "landscape" if land else "portrait",
          "short" if land else "long",
          say(papers, "One sheet of paper comes out",
              "%d sheets of paper come out"))),
        ("Check", "Hold a sheet up to the light. The back of page&nbsp;1 must be "
                  "page&nbsp;2, the same way up. If it is upside down or the wrong "
                  "page, your printer flipped on the other edge &mdash; change that "
                  "setting and print again."),
        ("Cut", "Trim along the dashed cut lines. %s" %
         ("Two of them, one down each side. Nothing to trim top or bottom "
          "&mdash; the insert is exactly A4 height."
          if land else
          "Two down the sides and four across, which also separates the two "
          "folded sheets on each piece of paper.")),
        ("Fold", "Fold each sheet along the dashed centre line. Sheet one "
                 "folds with pages <b>1 and %d outside</b>%s." %
         (n, "" if folded == 1 else
          ", sheet two with <b>3 and %d outside</b>, and so on inwards"
          % (n - 2))),
    ]
    if folded > 1:
        steps.append(
            ("Nest", "Lay each sheet inside the one before it%s. Thumb "
                     "through: the numbers should run 1 to %d." %
             ("" if land else " (the top half of each A4 comes first)", n)))
    steps.append(
        ("Bind", "Two staples through the fold, or punch three holes on the "
                 "fold for the notebook's elastic."))
    rh = 11 if s["w"] > 100 else 16
    rows = "".join("<tr><td class='n' style='text-align:center;color:#aaa;"
                   "font-weight:700;height:%smm'>%d</td>"
                   "<td style='font-weight:700;white-space:nowrap'>%s</td>"
                   "<td>%s</td></tr>" % (rh, i, t, d)
                   for i, (t, d) in enumerate(steps, 1))
    table = ("<table class='t'><colgroup><col style='width:5mm'>"
             "<col style='width:%smm'><col></colgroup>%s</table>"
             % (13 if s["w"] > 100 else 11, rows))
    diagram = ("<h3>What goes where</h3>"
               "<p class='sub'>Each A4 side before cutting. The dashed line down "
               "the middle is the fold; the dashed lines at the sides are the "
               "cuts.</p>" + _a4_diagram(s, size, n))

    g = a4_geometry(size)
    mm = lambda v: ("%g" % round(v, 1))
    meas = [("Insert page", "%s &times; %s mm" % (mm(g["pw"]), mm(g["ph"]))),
            ("Folded sheet", "%s &times; %s mm" % (mm(g["pw"] * 2), mm(g["ph"]))),
            ("Cut in from each side", "%s mm" % mm(g["x0"]))]
    if size == "regular":
        meas.append(("Cut top or bottom", "nothing &mdash; it is A4 height"))
    else:
        meas.append(("Cut across, from the top",
                     "%s, %s, %s and %s mm" % (mm(g["ytop"]), mm(g["ytop"] + g["ph"]),
                                               mm(g["ybot"]), mm(g["ybot"] + g["ph"]))))
    meas.append(("Pages", "%d, on %d folded sheet%s" % (n, folded, "" if folded == 1 else "s")))
    meas.append(("Fold", "down the centre of each sheet"))
    mtable = ("<h3>Measurements</h3><table class='t'>"
              "<colgroup><col style='width:%smm'><col></colgroup>%s</table>"
              % (34 if s["w"] > 100 else 26,
                 "".join("<tr><td>%s</td><td style='font-weight:700'>%s</td></tr>"
                         % m for m in meas)))
    wrong = ("<h3>If it comes out wrong</h3>"
             "<p class='sub'>Backs mismatched means the wrong duplex flip edge. "
             "Right order but the wrong size means something scaled the print "
             "&mdash; set it back to 100%.</p>")

    head = "<h2>Printing and folding</h2>"
    if s["w"] > 100:
        return [head + table + "<div class='hair'></div>" + diagram
                + "<div class='hair'></div>" + mtable]
    return [head + table,
            "<h3>What goes where</h3>" + _a4_diagram(s, size, n)
            + "<div class='hair'></div>" + mtable
            + "<div class='hair'></div>" + wrong]


# ---------------------------------------------------------------- assembly

def pages(size):
    """The booklet's page bodies, in reading order, as (html, turned)."""
    s = SIZES[size]
    per = s["habits_per_page"]
    out = [(p_cover(s), False), (p_glance(s), True)]

    left, first = HABITS, True
    while left > 0:
        n = min(per, left)
        out.append((p_habits(s, n, first), False))
        left -= n
        first = False

    if size == "regular":
        out.append((p_films(s, MONTHS, 1, 1), True))
    else:
        out.append((p_films(s, MONTHS[:6], 1, 2), True))
        out.append((p_films(s, MONTHS[6:], 2, 2), True))

    # the time chart is a spread: the map must fall on a left-hand (even) page
    # so the table sits opposite it with the book open. len(out) pages are
    # placed, so the map would be page len(out) + 1.
    if len(out) % 2 == 0:
        out.append((p_blank(s), False))
    out.append((build_extras.p_timezone_map(s), False))
    out.append((build_extras.p_timezone_table(s), False))

    puz = build_extras.sudoku_set(SUDOKUS)
    for i in range(0, SUDOKUS, s["sudoku_per_page"]):
        chunk = puz[i:i + s["sudoku_per_page"]]
        out.append((build_extras.p_sudoku(s, chunk, i + 1), False))
    out.append((build_extras.p_sudoku_solutions(s, puz, 1), False))

    # the guide's own length is fixed per size, so the total is known before
    # the guide is rendered - which it has to be, because it quotes the total
    gn = 1 if size == "regular" else 2
    total = len(out) + gn
    while total < 8 or total % 4:
        total += 1
    out += [(p_notes(s), False)] * (total - gn - len(out))
    return out + [(g, False) for g in p_print_guide(s, size, total)]


def build(size):
    s = SIZES[size]
    out = []
    for i, (body, turned) in enumerate(pages(size), start=1):
        out.append(sheet("R" if i % 2 else "L", body,
                         pg=None if i == 1 else i, turned=turned))
    return doc("Year Book &mdash; %s" % size, s, out)


def main():
    for size in ("regular", "passport"):
        d = os.path.join(OUT, size)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, "year-book-%s.html" % size)
        html = build(size)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print("%-40s %2d pages" % (path, html.count("class='sheet")))


if __name__ == "__main__":
    main()
