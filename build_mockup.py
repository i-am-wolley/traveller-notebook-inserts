# -*- coding: utf-8 -*-
"""Render partially-filled mockups of each insert page, for showing the design.

Each mockup is the real page plus a seeded fill script that decorates the actual
rendered DOM, so every mark lands exactly on a grid cell. The watch list uses
real 2024-2026 releases; the habits, notes and figures are made up.

    python build_mockup.py          # writes mockups/*.html
    python make_mockup_pngs.py      # screenshots them to mockups/*.png
"""
import json
import os

from build_core import SIZES, css
from build_inserts import pages

OUT = "mockups"

INK = "#243a63"        # fountain-pen blue-black
INK_ALT = "#2b2b33"    # a second pen, used here and there
HAND = '"Ink Free", "Segoe Print", "Bradley Hand ITC", cursive'

HABITS = ["Walked", "Gym", "Read", "No alcohol", "Wrote"]   # 6th left blank
# Real releases, 2024-2026, shortened the way you would actually write them in
# a 16 mm box. The 2026 entries come from announced slates and some may since
# have moved; anything past mid-2026 is outside what can be verified here.
MOVIES = [
    # 2024
    "Dune Part Two", "Challengers", "Civil War", "Furiosa", "Inside Out 2",
    "Twisters", "Alien Romulus", "The Substance", "The Wild Robot", "Anora",
    "Conclave", "Heretic", "Gladiator II", "Wicked", "Nosferatu",
    "The Brutalist", "A Real Pain", "Sing Sing", "Longlegs", "The Fall Guy",
    "Emilia Perez", "Trap", "Blitz", "Kinds of Kindness",
    # 2025
    "A Minecraft Mv", "Sinners", "Thunderbolts", "Final Reckoning",
    "Lilo & Stitch", "F1", "Superman", "Fantastic Four", "Weapons",
    "28 Years Later", "Materialists", "Black Bag", "Life of Chuck",
    "Bugonia", "One Battle After", "Frankenstein", "Hamnet", "Tron Ares",
    "Predator Badlands", "The Running Man", "The Naked Gun",
    "Wicked For Good", "Zootopia 2", "Avatar Fire & Ash", "Sentimental Value",
    # 2026
    "Send Help", "Scream 7", "Project Hail Mary", "The Bride!", "Michael",
    "Mario Galaxy", "Mandalorian&Grogu", "Mortal Kombat II",
]

SERIES = [
    # 2024
    "Shogun", "Fallout", "Baby Reindeer", "The Bear S3", "Ripley",
    "3 Body Problem", "The Penguin", "Agatha All Along", "Arcane S2",
    "Slow Horses S4", "Industry S3", "Disclaimer", "Mr & Mrs Smith",
    "Say Nothing", "True Det: Night",
    # 2025
    "Severance S2", "White Lotus S3", "Andor S2", "The Last of Us S2",
    "Adolescence", "The Studio", "Dept. Q", "The Pitt", "Paradise",
    "Black Mirror S7", "Squid Game S3", "Wednesday S2", "Stranger Things 5",
    "Alien: Earth", "Task", "Peacemaker S2", "Pluribus", "Slow Horses S5",
    # 2026
    "Euphoria S3", "Bridgerton S4", "One Piece S2", "Daredevil BA S2",
]

# titles started per month, and the series allowance per 2-month block
COUNTS = [5, 3, 6, 4, 7, 5, 8, 6, 4, 2, 0, 0]
SERIES_PER_2_MONTHS = 3


def watch_entries(counts, movies, series, quota):
    """Lay the titles out month by month, capping series per 2-month block.

    Series are spread down a column rather than clumped, which is what it looks
    like when you are working through one or two alongside the films.
    """
    out, mi, si = [[] for _ in counts], 0, 0
    for b in range(0, len(counts), 2):
        pair = counts[b:b + 2]
        total = sum(pair)
        want = min(quota, total)
        first = min(pair[0], int(round(want * pair[0] / total))) if total else 0
        split = [first, want - first]
        if split[1] > pair[1]:                       # push the overflow back
            split[1] = pair[1]
            split[0] = want - split[1]
        for k, m in enumerate((b, b + 1)):
            n, s = counts[m], split[k]
            slots = set()
            for j in range(s):                       # evenly spaced positions
                slots.add(min(n - 1, int((j + 0.5) * n / s)))
            while len(slots) < s:                    # collisions on short runs
                slots.add(max(x for x in range(n) if x not in slots))
            for i in range(n):
                if i in slots:
                    out[m].append("T " + series[si % len(series)])
                    si += 1
                else:
                    out[m].append("F " + movies[mi % len(movies)])
                    mi += 1
    return out


NOTES = [
    "Best month was June — walked almost every day,",
    "and it shows. Three weeks without a bad day.",
    "",
    "October fell apart. Worth remembering that the",
    "gym streak broke first, about ten days before",
    "the grid went grey.",
    "",
    "Next year: fewer habits, bigger squares.",
]


def kind_of(body):
    # order matters: the sudoku page also carries a nameline, for its timer
    if not body.strip():
        return "blank"
    if "class='cover'" in body:
        return "cover"
    if "Every day of the year" in body:
        return "glance"
    if "World time chart" in body or "What time is it where" in body:
        return "timezone"
    if "Sudoku &mdash; answers" in body:
        return "answers"
    if "time <span class='nameline'" in body:
        return "sudoku"
    if "nameline" in body:
        return "habits"
    if "Films and shows" in body:
        return "films"
    if "Printing and folding" in body or "What goes where" in body:
        return "guide"
    return "notes"


FILL_JS = r"""
// ---- seeded randomness, so the mockups are stable between runs -------------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const rnd = mulberry32(SEED);
const between = (a,b)=>a+rnd()*(b-a);
const pick = a => a[Math.floor(rnd()*a.length)];
const NS = "http://www.w3.org/2000/svg";

function overlay(el){
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  const r = el.getBoundingClientRect();
  const svg = document.createElementNS(NS,"svg");
  svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none";
  el.appendChild(svg);
  return [svg, r.width, r.height];
}

// a shaded square: rough edges, slight rotation, uneven ink
function shade(td){
  const [svg,w,h] = overlay(td);
  const i = between(0.02,0.11)*w;
  const j = () => between(-0.055,0.055)*w;
  const p = document.createElementNS(NS,"path");
  const x0=i+j(), y0=i+j(), x1=w-i+j(), y1=h-i+j();
  p.setAttribute("d",
    `M${x0},${y0} Q${(x0+x1)/2+j()},${y0+j()} ${x1},${y0+j()}`+
    ` Q${x1+j()},${(y0+y1)/2} ${x1+j()},${y1}`+
    ` Q${(x0+x1)/2+j()},${y1+j()} ${x0+j()},${y1+j()}`+
    ` Q${x0+j()},${(y0+y1)/2} ${x0},${y0} Z`);
  p.setAttribute("fill", rnd()<0.12 ? INK_ALT : INK);
  p.setAttribute("opacity", between(0.80,0.95).toFixed(2));
  p.setAttribute("transform", `rotate(${between(-3,3).toFixed(1)} ${w/2} ${h/2})`);
  svg.appendChild(p);
}

// a crossed-out square: two bowed strokes that overshoot a little
function cross(td){
  const [svg,w,h] = overlay(td);
  const i = 0.14*w;                       // keep the X inside its own cell
  const o = () => between(-0.06,0.06)*w;  // just enough wobble to look drawn
  const ink = rnd()<0.12 ? INK_ALT : INK;
  for (const [a,b,c,d] of [[i,i,w-i,h-i],[w-i,i,i,h-i]]){
    const l = document.createElementNS(NS,"path");
    l.setAttribute("d", `M${a+o()},${b+o()} Q${w/2+o()},${h/2+o()} ${c+o()},${d+o()}`);
    l.setAttribute("stroke", ink);
    l.setAttribute("fill","none");
    l.setAttribute("stroke-width", (w*between(0.065,0.095)).toFixed(2));
    l.setAttribute("stroke-linecap","round");
    l.setAttribute("opacity", between(0.78,0.95).toFixed(2));
    svg.appendChild(l);
  }
}

// handwriting, with a little rotation and baseline drift per run
function write(el, text, opts){
  opts = opts || {};
  const s = document.createElement("span");
  s.textContent = text;
  s.style.cssText =
    `font-family:${HAND};color:${opts.ink||INK};white-space:nowrap;`+
    `font-size:${opts.size||"6pt"};line-height:1;`+
    `display:inline-block;transform:rotate(${between(-1.6,1.6).toFixed(2)}deg)`+
    ` translateY(${between(-0.4,0.4).toFixed(2)}mm);`+
    (opts.css||"");
  el.appendChild(s);
  return s;
}

function floatWrite(host, text, x, y, opts){
  opts = opts || {};
  const cs = getComputedStyle(host);
  if (cs.position === "static") host.style.position = "relative";
  const d = document.createElement("div");
  d.style.cssText = `position:absolute;left:${x};top:${y};pointer-events:none`;
  host.appendChild(d);
  return write(d, text, opts);
}

// ---- the grids -------------------------------------------------------------
// live cells only: never touch a dead date or the 29 Feb square
function liveRows(table){
  return [...table.rows].filter(r => r.querySelector("td.cell"));
}

// Days are sticky: yesterday pulls today toward itself, which is what makes
// real tracker grids read as runs and slumps rather than static.
const STICK = 0.42;
function fillYearGrid(table, upto, pGood, pBad){
  let prev = 1;
  const pCross = pBad > 0 ? pBad / Math.max(0.01, 1 - pGood) : 0;
  liveRows(table).forEach((row, m) => {
    [...row.cells].forEach((td, i) => {
      if (!td.classList.contains("cell")) return;
      if (m*31 + i > upto) return;         // the year is still in progress
      const p = pGood + STICK * (prev - pGood);
      const on = rnd() < p;
      prev = on ? 1 : 0;
      if (on) shade(td);
      else if (rnd() < pCross) cross(td);
    });
  });
}

function fillBlank(el, text, size){
  // write over a "total ______" style rule
  const t = el.textContent;
  el.textContent = "";
  const before = document.createTextNode(t.split("___")[0]);
  el.appendChild(before);
  write(el, text, {size: size || "6.5pt"});
  el.appendChild(document.createTextNode(t.split("/").slice(-1)[0] ? " / "+t.split("/").slice(-1)[0].trim() : ""));
}

// ---- per-page behaviour ----------------------------------------------------
function run(){
  const kind = document.body.dataset.kind;
  const pad = document.querySelector(".turn") || document.querySelector(".pad");

  if (kind === "cover"){
    const box = document.querySelector(".wbox");
    box.style.position = "relative";
    floatWrite(box, YEAR, "50%", "50%", {
      size: COVER_SIZE,
      css: "transform-origin:center;"});
    const sp = box.lastChild.firstChild;
    box.lastChild.style.transform = "translate(-50%,-55%)";
  }

  if (kind === "glance"){
    const t = pad.querySelector("table.g");
    fillYearGrid(t, UPTO, 0.72, 0.13);
  }

  if (kind === "habits"){
    const names = [...pad.querySelectorAll(".nameline")];
    const tables = [...pad.querySelectorAll("table.g")];
    const totals = [...pad.querySelectorAll(".sub")].filter(e => e.textContent.includes("365"));
    names.forEach((n, k) => {
      const idx = HABIT_OFFSET + k;
      if (idx >= HABIT_NAMES.length) return;      // the last rule stays blank
      n.style.position = "relative";
      floatWrite(n, HABIT_NAMES[idx], "1mm", "-0.4mm", {size: NAME_SIZE});
    });
    tables.forEach((t, k) => {
      const idx = HABIT_OFFSET + k;
      if (idx >= HABIT_NAMES.length) return;
      fillYearGrid(t, UPTO, HABIT_DENSITY[idx], 0);
    });
    totals.forEach((el, k) => {
      const idx = HABIT_OFFSET + k;
      if (idx >= HABIT_NAMES.length) return;
      const n = Math.round(UPTO * HABIT_DENSITY[idx] * 0.97);
      el.innerHTML = "total ";
      write(el, String(n), {size: TOTAL_SIZE});
      el.appendChild(document.createTextNode(" / 365"));
    });
  }

  if (kind === "films"){
    const tables = pad.querySelectorAll("table.g");
    const grid = tables[0], axis = tables[1];
    const rows = [...grid.rows];
    const cols = rows[0].cells.length;
    let sum = 0;
    for (let c = 0; c < cols; c++){
      const month = WATCHED[FILM_OFFSET + c] || [];
      sum += month.length;
      for (let k = 0; k < month.length && k < rows.length; k++){
        const td = rows[rows.length - 1 - k].cells[c];   // stack upward
        td.style.position = "relative";
        floatWrite(td, month[k], "0.5mm", "0.3mm",
                   {size: FILM_SIZE, ink: rnd() < 0.15 ? INK_ALT : INK});
      }
      const cell = axis.rows[1].cells[c];
      cell.style.position = "relative";
      if (month.length) floatWrite(cell, String(month.length), "50%", "4%",
                           {size: COUNT_SIZE, css:"transform:translateX(-50%)"});
    }
    const tot = [...pad.querySelectorAll(".sub")].filter(e => e.textContent.includes("Total"))[0];
    if (tot){
      tot.innerHTML = tot.textContent.split("___")[0];
      write(tot, String(sum), {size: TOTAL_SIZE});
    }
  }

  if (kind === "notes"){
    const rules = [...pad.querySelectorAll("div")].filter(
      d => (d.getAttribute("style")||"").includes("border-bottom"));
    NOTE_LINES.forEach((line, k) => {
      if (!line || k >= rules.length) return;
      rules[k].style.position = "relative";
      floatWrite(rules[k], line, "1mm", "-0.2mm", {size: NOTE_SIZE});
    });
  }
}
document.addEventListener("DOMContentLoaded", run);
"""


def mockup_css(s, pad_mm, turned):
    # a turned page exports landscape, so the posted image reads upright
    frame = ("""
.frame { position: relative; width: %(fh)smm; height: %(fw)smm; }
.frame > .sheet { position: absolute; left: 50%%; top: 50%%;
  transform: translate(-50%%, -50%%) rotate(90deg); }
""" % dict(fw=s["w"], fh=s["h"])) if turned else ""
    return frame + """
body { background: #d9d6cf; margin: 0; padding: %(p)smm; }
.sheet { box-shadow: 0 1.2mm 4mm rgba(0,0,0,.22); background: #fffdf8; }
.sheet::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, rgba(0,0,0,.030), rgba(0,0,0,0) 32%%,
              rgba(0,0,0,0) 72%%, rgba(0,0,0,.045)); }
""" % dict(p=pad_mm)


def build(size, idx, body, turned, kind):
    s = SIZES[size]
    reg = size == "regular"
    seed = 1000 + idx * 37
    upto = 291 if reg else 291          # filled through late September
    consts = {
        "SEED": seed,
        "INK": '"%s"' % INK,
        "INK_ALT": '"%s"' % INK_ALT,
        "HAND": '\'%s\'' % HAND.replace("'", ""),
        "YEAR": '"2026"',
        "UPTO": upto,
        "COVER_SIZE": '"%s"' % ("34pt" if reg else "24pt"),
        "NAME_SIZE": '"%s"' % ("9pt" if reg else "7pt"),
        "TOTAL_SIZE": '"%s"' % ("7pt" if reg else "5.5pt"),
        "NOTE_SIZE": '"%s"' % ("7.5pt" if reg else "6pt"),
        "FILM_SIZE": '"%s"' % ("4.6pt" if reg else "4.4pt"),
        "COUNT_SIZE": '"%s"' % ("6pt" if reg else "5pt"),
        "HABIT_NAMES": str(HABITS),
        "HABIT_DENSITY": str([0.78, 0.34, 0.55, 0.62, 0.41]),
        "HABIT_OFFSET": 0 if "The year in habits" in body else 3,
        "WATCHED": json.dumps(
            watch_entries(COUNTS, MOVIES, SERIES, SERIES_PER_2_MONTHS)),
        "FILM_OFFSET": 0 if ("Jul to Dec" not in body) else 6,
        "NOTE_LINES": str(NOTES),
    }
    head = "\n".join("const %s = %s;" % (k, v) for k, v in consts.items())

    page = ("<div class='sheet %s'><div class='pad'>%s</div></div>"
            % ("R" if idx % 2 else "L",
               ("<div class='turn'>%s</div>" % body) if turned else body))
    if turned:
        page = "<div class='frame'>%s</div>" % page
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<title>%s page %d</title><style>%s%s</style></head>"
            "<body data-kind='%s'>%s<script>%s\n%s</script></body></html>\n"
            % (size, idx, css(s),
               mockup_css(s, 10 if size == "regular" else 8, turned),
               kind, page, head, FILL_JS))


def main():
    os.makedirs(OUT, exist_ok=True)
    made = []
    for size in ("regular", "passport"):
        for i, (body, turned) in enumerate(pages(size), start=1):
            kind = kind_of(body)
            name = "%s-%d-%s" % (size, i, kind)
            path = os.path.join(OUT, name + ".html")
            with open(path, "w", encoding="utf-8") as f:
                f.write(build(size, i, body, turned, kind))
            made.append(dict(name=name, size=size, kind=kind, turned=turned))
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(made, f, indent=1)
    for m in made:
        print("%-28s %-7s %s" % (m["name"], m["kind"],
                                 "turned -> landscape" if m["turned"] else ""))
    print("\n%d mockup pages" % len(made))


if __name__ == "__main__":
    main()
