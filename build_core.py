# -*- coding: utf-8 -*-
"""Core geometry, CSS and grid builders for the Traveller's Notebook Year Book."""

DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]  # Feb kept at 29, left open
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

SIZES = {
    "regular": dict(
        w=110, h=210, mt=8, mb=8, mo=7, ms=9,
        base=7.0, h1=15, h2=10.5, h3=7.6, small=5.6,
        glance_lab=14, habit_lab=11, habits_per_page=3,
        film_rows=10, sudoku_per_page=2, sudoku_cols=2,
    ),
    "passport": dict(
        w=89, h=124, mt=6, mb=6, mo=5.5, ms=7,
        base=5.6, h1=11, h2=8, h3=6.2, small=4.4,
        glance_lab=9, habit_lab=8.5, habits_per_page=3,
        film_rows=10, sudoku_per_page=2, sudoku_cols=2,
    ),
}

INK = "#2b2b2b"      # structural lines + text
RULE = "#b4b4b4"     # light grid rules
GREY = "#d9d9d9"     # dead-date fill


def padw(s):
    return s["w"] - s["mo"] - s["ms"]


def padh(s):
    return s["h"] - s["mt"] - s["mb"]


def css(s):
    dnum = max(3.4, s["small"] - 1.8)
    return """
@page { size: %(w)smm %(h)smm; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; color: %(ink)s; }
body { font-family: "Helvetica Neue", Arial, sans-serif; font-size: %(base)spt; }

.sheet { width: %(w)smm; height: %(h)smm; position: relative; overflow: hidden;
         page-break-after: always; break-after: page; background: #fff; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.pad { position: absolute; top: %(mt)smm; bottom: %(mb)smm;
       width: %(cw)smm; height: %(ch)smm; }
.L .pad { left: %(mo)smm; }
.R .pad { left: %(ms)smm; }

/* a page turned on its side: same sheet, content rotated a quarter turn */
.turn { position: absolute; top: 0; left: 0; width: %(ch)smm; height: %(cw)smm;
        transform: translateY(%(ch)smm) rotate(-90deg); transform-origin: top left; }

h1 { font-family: Georgia, "Times New Roman", serif; font-size: %(h1)spt; line-height: 1.04;
     margin: 0 0 1.5mm; font-weight: 700; letter-spacing: -0.01em; }
h2 { font-family: Georgia, "Times New Roman", serif; font-size: %(h2)spt; line-height: 1.08;
     margin: 0 0 1.2mm; font-weight: 700; }
h3 { font-size: %(h3)spt; margin: 0 0 1mm; font-weight: 700;
     text-transform: uppercase; letter-spacing: .07em; }
p { margin: 0 0 1.6mm; line-height: 1.35; }
.sub { font-size: %(small)spt; color: #666; line-height: 1.32; font-weight: 400;
       text-transform: none; letter-spacing: 0; }
.rule { border-top: 0.6pt solid %(ink)s; margin: 1.8mm 0; }
.hair { border-top: 0.4pt solid %(rule)s; margin: 1.4mm 0; }
.foot { position: absolute; left: 0; right: 0; bottom: 0;
        font-size: %(small)spt; color: #909090; }
.foot .pg { float: right; }

table.g { border-collapse: collapse; table-layout: fixed; }
table.g td { padding: 0; font-weight: 400; }
td.cell { border: 0.4pt solid %(rule)s; }
td.dead { border: 0.4pt solid %(rule)s; background: %(grey)s; }
td.leap { border: 0.4pt dotted #9a9a9a; }
td.mlab { font-size: %(small)spt; text-align: left; padding-right: 1.2mm;
          border-right: 0.6pt solid %(ink)s; white-space: nowrap; }
td.dnum { font-size: %(dnum)spt; color: #808080; text-align: center;
          vertical-align: bottom; }
td.q { border-left: 0.5pt solid #8e8e8e; }

table.t { border-collapse: collapse; width: 100%%; table-layout: fixed; }
table.t td, table.t th { border: 0.4pt solid %(rule)s; padding: .8mm .9mm;
                         font-size: %(small)spt; text-align: left; line-height: 1.25; }
table.t th { border-bottom: 0.7pt solid %(ink)s; font-weight: 700;
             font-size: %(tiny)spt; text-transform: uppercase; letter-spacing: .05em; }

.legend { font-size: %(small)spt; line-height: 1.5; }
.key { display: inline-block; width: 2.6mm; height: 2.6mm; border: 0.4pt solid %(rule)s;
       vertical-align: -0.3mm; margin-right: .8mm; }
.key.f { background: %(ink)s; }
.key.d { background: %(grey)s; }
.key.l { border-style: dotted; border-color: #9a9a9a; }
.nameline { display: inline-block; border-bottom: 0.6pt solid %(ink)s; }
.cover { display: flex; flex-direction: column; height: 100%%; }
.mid { flex: 1 1 auto; }
.wbox { border: 0.6pt solid %(ink)s; width: 100%%; }
""" % dict(w=s["w"], h=s["h"], mt=s["mt"], mb=s["mb"], mo=s["mo"], ms=s["ms"],
           cw=padw(s), ch=padh(s), base=s["base"], h1=s["h1"], h2=s["h2"],
           h3=s["h3"], small=s["small"], dnum=dnum,
           tiny=max(3.8, s["small"] - 1.3), ink=INK, rule=RULE, grey=GREY)


def doc(title, s, pages):
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<title>%s</title><style>%s</style></head><body>\n%s\n</body></html>\n"
            % (title, css(s), "".join(pages)))


def foot(pg):
    return "" if pg is None else "<div class='foot'><span class='pg'>%s</span></div>" % pg


def sheet(side, body, pg=None, turned=False):
    """One printed page. `turned` rotates the content a quarter turn on the sheet."""
    inner = body + foot(pg)
    if turned:
        inner = "<div class='turn'>%s</div>" % inner
    return "<div class='sheet %s'><div class='pad'>%s</div></div>\n" % (side, inner)


def year_grid(s, cell, lab, daynums=True):
    """12 rows (months) x 31 columns of square cells.

    Dates that do not exist are greyed; 29 February is left open with a dotted
    border so it can be shaded out by hand in a common year.
    """
    out = ["<table class='g' style='width:%.2fmm'>" % (lab + cell * 31)]
    out.append("<colgroup><col style='width:%.2fmm'>" % lab +
               "<col style='width:%.2fmm'>" % cell * 31 + "</colgroup>")
    if daynums:
        # every column is numbered; the type scales down with the cell so two
        # digits still fit the narrow habit grids
        # two digits are ~1.11 em wide, so cell_mm * 2.0 pt leaves a safe margin
        fs = max(3.2, min(5.6, cell * 2.0))
        out.append("<tr><td></td>")
        for d in range(1, 32):
            out.append("<td class='dnum' style='height:%.2fmm;font-size:%.2fpt'>"
                       "%d</td>" % (max(2.4, cell * 0.62), fs, d))
        out.append("</tr>")
    for m in range(12):
        out.append("<tr><td class='mlab'>%s</td>" % MONTHS[m])
        for d in range(1, 32):
            if m == 1 and d == 29:
                k = "leap"
            elif d > DAYS[m]:
                k = "dead"
            else:
                k = "cell"
            q = " q" if d in (8, 15, 22, 29) and k == "cell" else ""
            out.append("<td class='%s%s' style='height:%.2fmm'></td>" % (k, q, cell))
        out.append("</tr>")
    out.append("</table>")
    return "".join(out)
