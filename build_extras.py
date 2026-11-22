# -*- coding: utf-8 -*-
"""Extra insert pages: sudoku, and the world time chart spread.

Same house style as the rest of the booklet - greyscale, square cells, type
sized from the cell rather than guessed. Imported by build_inserts.py.
"""
from build_core import INK, RULE, padw, padh
from map_data import POLYS
import sudoku

# ---------------------------------------------------------------- sudoku

SUDOKU_SEED = 20260101


def _sudoku_grid(side, cell_fs, pencil=False):
    """One 9 x 9 frame, thick on the box edges. Cells are written in by hand."""
    c = side / 9.0
    cells = []
    for r in range(9):
        row = []
        for k in range(9):
            b = ["0.3pt solid %s" % RULE] * 4          # top right bottom left
            if r % 3 == 0:
                b[0] = "0.7pt solid %s" % INK
            if k % 3 == 2:
                b[1] = "0.7pt solid %s" % INK
            if r == 8:
                b[2] = "0.7pt solid %s" % INK
            if k % 3 == 0:
                b[3] = "0.7pt solid %s" % INK
            row.append("<td style='width:%.2fmm;height:%.2fmm;border-top:%s;"
                       "border-right:%s;border-bottom:%s;border-left:%s'></td>"
                       % (c, c, b[0], b[1], b[2], b[3]))
        cells.append("<tr>%s</tr>" % "".join(row))
    return ("<table class='g' style='width:%.2fmm;table-layout:fixed;"
            "font-size:%.1fpt'>%s</table>" % (side, cell_fs, "".join(cells)))


def _solution_grid(sol, side):
    """A filled grid, small, for the answers page."""
    c = side / 9.0
    fs = max(2.8, min(7.0, c * 2.1))
    cells = []
    for r in range(9):
        row = []
        for k in range(9):
            b = ["0.25pt solid #cfcfcf"] * 4
            if r % 3 == 0:
                b[0] = "0.5pt solid %s" % INK
            if k % 3 == 2:
                b[1] = "0.5pt solid %s" % INK
            if r == 8:
                b[2] = "0.5pt solid %s" % INK
            if k % 3 == 0:
                b[3] = "0.5pt solid %s" % INK
            row.append("<td style='width:%.2fmm;height:%.2fmm;text-align:center;"
                       "vertical-align:middle;border-top:%s;border-right:%s;"
                       "border-bottom:%s;border-left:%s'>%d</td>"
                       % (c, c, b[0], b[1], b[2], b[3], sol[r * 9 + k]))
        cells.append("<tr>%s</tr>" % "".join(row))
    return ("<table class='g' style='width:%.2fmm;table-layout:fixed;"
            "font-size:%.2fpt;color:#555'>%s</table>"
            % (side, fs, "".join(cells)))


def _clue_overlay(puz, side):
    """The givens, absolutely placed over a blank frame."""
    c = side / 9.0
    fs = max(3.4, min(11.0, c * 1.5))
    out = []
    for i, v in enumerate(puz):
        if not v:
            continue
        r, k = divmod(i, 9)
        out.append("<div style='position:absolute;left:%.2fmm;top:%.2fmm;"
                   "width:%.2fmm;height:%.2fmm;line-height:%.2fmm;"
                   "text-align:center;font-size:%.2fpt;font-weight:700'>%d"
                   "</div>" % (k * c, r * c, c, c, c, fs, v))
    return "".join(out)


def p_sudoku(s, puzzles, start_no):
    """Two puzzles to a page, each with its grade and a line for the time.

    The grid is as large as the page allows and centred, with its heading
    ranged to the same width so the block reads as one piece.
    """
    n_up = len(puzzles)
    hdr = s["h3"] * 0.353 + 1.6
    side = min(padw(s), (padh(s) - n_up * hdr - 6) / float(n_up))
    gap = max(0.6, (padh(s) - n_up * (side + hdr) - 3) / float(n_up * 2))
    blocks = []
    for n, p in enumerate(puzzles, start=start_no):
        blocks.append(
            "<div style='width:%.2fmm;margin:%.2fmm auto'>"
            "<div style='display:flex;justify-content:space-between;"
            "align-items:baseline;margin-bottom:1.2mm;font-size:%spt'>"
            "<span style='font-weight:700;text-transform:uppercase;"
            "letter-spacing:.07em'>%d &middot; %s</span>"
            "<span class='sub'>time <span class='nameline' "
            "style='width:%.1fmm'>&nbsp;</span></span></div>"
            "<div style='position:relative;width:%.2fmm'>%s%s</div></div>"
            % (side, gap, s["h3"], n, p["name"], side * 0.26,
               side, _sudoku_grid(side, side / 9.0 * 2.1),
               _clue_overlay(p["puzzle"], side)))
    return "<div>%s</div>" % "".join(blocks)


def p_sudoku_solutions(s, puzzles, start_no):
    """Answers, four to a page, small and grey so they do not shout."""
    cols = 2
    rows = (len(puzzles) + cols - 1) // cols
    head = 9 if s["w"] > 100 else 7
    side = min((padw(s) - 5) / cols, (padh(s) - head - rows * 4.0) / rows)
    cells = []
    for n, p in enumerate(puzzles, start=start_no):
        cells.append("<div style='width:%.2fmm'>"
                     "<div class='sub' style='margin-bottom:.5mm'>%d &middot; "
                     "%s</div>%s</div>"
                     % (side, n, p["name"], _solution_grid(p["solution"], side)))
    return ("<h3>Sudoku &mdash; answers</h3>"
            "<div style='display:flex;flex-wrap:wrap;gap:%.1fmm 5mm;"
            "margin-top:1.5mm'>%s</div>" % (3.0, "".join(cells)))


def sudoku_set(n, seed=SUDOKU_SEED):
    return sudoku.batch(n, seed)


# ------------------------------------------------------- world time chart

CITIES = [
    # name, short, lon, lat, standard offset from UTC, anchor, label dx, dy
    ("Los Angeles", "L.A.", -118.24, 34.05, -8.0, "end", -1.4, -0.8),
    ("New York", "N.Y.", -74.01, 40.71, -5.0, "end", -1.4, 2.6),
    ("London", "Lon", -0.13, 51.51, 0.0, "end", -1.6, -1.2),
    ("Paris", "Par", 2.35, 48.86, 1.0, "start", 2.2, 4.2),
    ("Dubai", "Dub", 55.27, 25.20, 4.0, "start", 1.6, 3.0),
    ("Delhi", "Del", 77.21, 28.61, 5.5, "start", 1.6, -1.4),
    ("Singapore", "Sing", 103.82, 1.35, 8.0, "end", -1.6, 2.8),
    ("Tokyo", "Tok", 139.69, 35.69, 9.0, "start", 1.6, -1.2),
    ("Sydney", "Syd", 151.21, -33.87, 10.0, "end", -1.6, 3.0),
]

SMALL_SET = ["Los Angeles", "New York", "London", "Dubai", "Delhi",
             "Singapore", "Tokyo"]

# one line per standard zone, with places that actually keep it
ZONES = [
    (-11, "Midway, Pago Pago"),
    (-10, "Honolulu, Papeete"),
    (-9, "Anchorage"),
    (-8, "Los Angeles, Vancouver"),
    (-7, "Denver, Phoenix"),
    (-6, "Chicago, Mexico City"),
    (-5, "New York, Toronto, Bogota"),
    (-4, "Halifax, Santiago, Caracas"),
    (-3, "Sao Paulo, Buenos Aires"),
    (-2, "South Georgia"),
    (-1, "Azores, Cabo Verde"),
    (0, "London, Lisbon, Accra, Reykjavik"),
    (1, "Paris, Berlin, Rome, Lagos"),
    (2, "Cairo, Athens, Johannesburg"),
    (3, "Moscow, Nairobi, Riyadh"),
    (3.5, "Tehran"),
    (4, "Dubai, Baku, Tbilisi"),
    (4.5, "Kabul"),
    (5, "Karachi, Tashkent"),
    (5.5, "Delhi, Mumbai, Colombo"),
    (5.75, "Kathmandu"),
    (6, "Dhaka, Almaty"),
    (6.5, "Yangon"),
    (7, "Bangkok, Jakarta, Hanoi"),
    (8, "Singapore, Beijing, Perth"),
    (9, "Tokyo, Seoul"),
    (9.5, "Adelaide, Darwin"),
    (10, "Sydney, Brisbane, Port Moresby"),
    (11, "Noumea, Honiara"),
    (12, "Auckland, Suva"),
]


def cities(s):
    """The passport page has not the width for nine columns."""
    if s["w"] > 100:
        return CITIES
    keep = set(SMALL_SET)
    return [c for c in CITIES if c[0] in keep]


def _offset(v):
    if v == 0:
        return "0"
    sign = "+" if v > 0 else "−"
    h = int(abs(v))
    m = int(round((abs(v) - h) * 60))
    return "%s%d%s" % (sign, h, (":%02d" % m) if m else "")


def _clock(utc_hour, off):
    t = (utc_hour + off) % 24
    h = int(t)
    m = int(round((t - h) * 60))
    return "%02d:%02d" % (h, m)


def _world_map(s, w):
    """Equirectangular outline with the 24 hour bands behind it.

    Full 360 x 180 degrees, so the aspect is exactly 2:1; Antarctica is simply
    not in the data, which is what leaves the familiar empty strip at the foot.
    """
    h = w / 2.0
    sx = w / 360.0
    sy = h / 180.0
    bands = []
    for k in range(24):
        if k % 2:
            continue
        x = k * 15 * sx
        bands.append("<rect x='%.3f' y='0' width='%.3f' height='%.3f' "
                     "fill='#eeeeee'/>" % (x, 15 * sx, h))
    # the hour rules, with the prime meridian drawn harder
    rules = []
    for k in range(25):
        x = k * 15 * sx
        hard = k == 12
        rules.append("<line x1='%.3f' y1='0' x2='%.3f' y2='%.3f' "
                     "stroke='%s' stroke-width='%.2f'/>"
                     % (x, x, h, INK if hard else "#c6c6c6",
                        0.25 if hard else 0.12))
    land = []
    for ring in POLYS:
        d = "M" + "L".join("%.2f %.2f" % ((lon + 180) * sx, (90 - lat) * sy)
                           for lon, lat in ring) + "Z"
        land.append(d)
    coast = ("<path d='%s' fill='#ffffff' fill-opacity='0.55' stroke='%s' "
             "stroke-width='0.22' stroke-linejoin='round'/>"
             % (" ".join(land), INK))

    fs = 2.3 if s["w"] > 100 else 1.9
    dots = []
    for name, short, lon, lat, off, anchor, dx, dy in cities(s):
        x = (lon + 180) * sx
        y = (90 - lat) * sy
        ring = abs(off) < 0.01
        dots.append("<circle cx='%.2f' cy='%.2f' r='%.2f' fill='%s' "
                    "stroke='%s' stroke-width='0.2'/>"
                    % (x, y, 0.55 if s["w"] > 100 else 0.45,
                       "#ffffff" if ring else INK, INK))
        dots.append("<text x='%.2f' y='%.2f' font-size='%.2f' fill='%s' "
                    "text-anchor='%s' font-family=\"Helvetica Neue, Arial, "
                    "sans-serif\">%s</text>"
                    % (x + dx, y + dy, fs, INK, anchor, name))
    return ("<svg viewBox='0 0 %.3f %.3f' width='%.3fmm' height='%.3fmm' "
            "xmlns='http://www.w3.org/2000/svg' style='display:block'>"
            "<rect x='0' y='0' width='%.3f' height='%.3f' fill='#fafafa'/>"
            "%s%s%s%s"
            "<rect x='0' y='0' width='%.3f' height='%.3f' fill='none' "
            "stroke='%s' stroke-width='0.3'/></svg>"
            % (w, h, w, h, w, h, "".join(bands), "".join(rules), coast,
               "".join(dots), w, h, INK))


def _scale(s, w):
    """The UTC offsets written above the map, one label every two bands."""
    fs = max(3.0, min(5.0, w / 360.0 * 15 * 2.0))
    cells = []
    for k in range(24):
        off = k - 11                      # band k spans UTC offset k-12 .. k-11
        lab = _offset(off) if off % 2 == 0 else ""
        cells.append("<td style='width:%.4f%%;text-align:center;font-size:%.2fpt;"
                     "color:%s;padding-bottom:.4mm'>%s</td>"
                     % (100.0 / 24, fs, "#333" if off == 0 else "#777", lab))
    return ("<table class='g' style='width:%.3fmm'><tr>%s</tr></table>"
            % (w, "".join(cells)))


def _zone_list(s, w, free_mm):
    """Every standard zone with places that keep it, filling the page under
    the map. One column where there is depth for it, two where there is not."""
    cols = 1 if free_mm / len(ZONES) >= 4.0 else 2
    per = (len(ZONES) + cols - 1) // cols
    rh = min(5.4, free_mm / per)
    fs = max(3.0, min(s["small"], rh * 1.5))
    colw = (w - (4.0 if cols > 1 else 0)) / cols
    lab = 7.0 if cols == 1 else 5.6

    out = []
    for c in range(cols):
        rows = []
        for off, where in ZONES[c * per:(c + 1) * per]:
            rows.append(
                "<tr><td style='width:%.1fmm;text-align:right;padding-right:"
                "1.2mm;font-weight:700;font-size:%.2fpt;height:%.2fmm;"
                "border-bottom:0.3pt solid #e4e4e4'>%s</td>"
                "<td style='font-size:%.2fpt;color:#444;white-space:nowrap;"
                "overflow:hidden;border-bottom:0.3pt solid #e4e4e4'>%s</td></tr>"
                % (lab, fs, rh, _offset(off), fs, where))
        out.append("<table class='g' style='width:%.2fmm;table-layout:fixed'>"
                   "%s</table>" % (colw, "".join(rows)))
    return ("<div style='display:flex;gap:4mm'>%s</div>" % "".join(out))


def p_timezone_map(s):
    """Spread, left page: where the hours fall, and who keeps which hour."""
    w = padw(s)
    head = s["h2"] * 0.353 + s["small"] * 0.353 * 2 + 4.5
    free = padh(s) - head - w / 2.0 - 12.0
    return ("<h2>World time chart</h2>"
            "<p class='sub' style='margin-bottom:2mm'>Hours from UTC, read "
            "across. The ring marks the prime meridian.</p>"
            + _scale(s, w) + _world_map(s, w) +
            "<p class='sub' style='margin:1.6mm 0 1.4mm'>Standard time. Much "
            "of Europe and North America goes an hour forward in summer; "
            "India, the Gulf and most of Asia never do.</p>"
            + _zone_list(s, w, free))


def p_timezone_table(s):
    """Spread, right page: the conversion table and room for your own cities.

    Every row heights itself from what is left on the page, so the table and
    the worksheet together reach the foot without a gap.
    """
    cs = cities(s)
    big = s["w"] > 100
    lab = 13 if big else 10
    colw = (padw(s) - lab) / float(len(cs))
    tiny = max(3.2, s["small"] - (0.8 if big else 0.6))
    head = max(3.0, s["small"] - 1.4)

    ws_rows = 6 if big else 4
    ws_rh = 6.4 if big else 4.8
    fixed = (s["h3"] * 0.353 + s["small"] * 0.353 * 1.4 + 3      # page heading
             + (5.0 if big else 4.0)                            # table header
             + s["h3"] * 0.353 + 2.5                            # worksheet head
             + ws_rows * ws_rh + 4)
    rh = max(2.6, (padh(s) - fixed) / 24.0)

    hdr = ["<td style='border-bottom:0.6pt solid %s;font-size:%.2fpt;"
           "font-weight:700;padding-bottom:.6mm'>UTC</td>" % (INK, head)]
    for name, short, lon, lat, off, a, dx, dy in cs:
        hdr.append("<td style='border-bottom:0.6pt solid %s;text-align:center;"
                   "font-size:%.2fpt;font-weight:700;padding:0 .3mm .6mm;"
                   "line-height:1.1'>%s<div style='font-weight:400;color:#777'>"
                   "%s</div></td>"
                   % (INK, head, name if big else short, _offset(off)))

    rows = []
    for u in range(24):
        tds = ["<td style='font-size:%.2fpt;font-weight:700;height:%.2fmm'>"
               "%02d:00</td>" % (tiny, rh, u)]
        for name, short, lon, lat, off, a, dx, dy in cs:
            t = _clock(u, off)
            mark = t.startswith("00") or t.startswith("12")
            tds.append("<td style='text-align:center;font-size:%.2fpt;%s'>%s"
                       "</td>"
                       % (tiny, "font-weight:700" if mark else "color:#444", t))
        shade = " background:#f6f6f6;" if u % 2 else ""
        rows.append("<tr style='border-top:0.3pt solid #dcdcdc;%s'>%s</tr>"
                    % (shade, "".join(tds)))

    table = ("<table class='g' style='width:100%%;table-layout:fixed'>"
             "<colgroup><col style='width:%.2fmm'>%s</colgroup>"
             "<tr>%s</tr>%s</table>"
             % (lab, "<col style='width:%.2fmm'>" % colw * len(cs),
                "".join(hdr), "".join(rows)))

    own = "".join(
        "<tr><td style='border-bottom:0.4pt solid #cfcfcf;height:%.2fmm'></td>"
        "<td style='border-bottom:0.4pt solid #cfcfcf'></td>"
        "<td style='border-bottom:0.4pt solid #cfcfcf'></td></tr>" % ws_rh
        for _ in range(ws_rows))
    worksheet = ("<h3 style='margin-top:2.5mm'>Your cities</h3>"
                 "<table class='g' style='width:100%%;table-layout:fixed'>"
                 "<colgroup><col><col style='width:%smm'>"
                 "<col style='width:%smm'></colgroup>"
                 "<tr><td class='sub' style='border-bottom:0.6pt solid %s'>"
                 "City</td><td class='sub' style='border-bottom:0.6pt solid %s;"
                 "text-align:center'>UTC</td><td class='sub' style='"
                 "border-bottom:0.6pt solid %s;text-align:center'>Summer</td>"
                 "</tr>%s</table>"
                 % (16 if big else 12, 18 if big else 14,
                    INK, INK, INK, own))

    return ("<h3>What time is it where</h3>"
            "<p class='sub' style='margin-bottom:1.6mm'>Find the UTC hour on "
            "the left and read across.</p>" + table + worksheet)
