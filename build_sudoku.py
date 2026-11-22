# -*- coding: utf-8 -*-
"""Build a sudoku-only booklet for a Traveller's Notebook.

The same machinery as the Year Book, pointed at one thing: a cover, graded
puzzles two to a page, the answers at the back, and the printing guide. Every
puzzle has exactly one solution, which is checked as it is dug out.

    python build_sudoku.py      # booklet HTML  -> {size}/sudoku-{size}.html
    python build_imposed.py     # the A4 imposition
    python make_pdfs.py

Knobs are at the top: how many puzzles, which grades, and whether to print
ruled working lines under each grid.
"""
import os

from build_core import SIZES, doc, sheet
from build_inserts import p_notes, p_print_guide
from layout import Fit, plan, summary
import build_extras
import sudoku

OUT = "."

PUZZLES = 24                 # how many puzzles in the book
GRADES = ["Easy", "Medium", "Hard", "Very hard"]   # cycled in this order
WORKING_LINES = False        # ruled lines under each grid, for pencil work
TITLE = "Sudoku"
SEED = build_extras.SUDOKU_SEED


def pick(n, grades, seed=SEED):
    """`n` puzzles, cycling the chosen grades, drawn from per-grade streams."""
    per = (n + len(grades) - 1) // len(grades)
    pool = sudoku.by_grade(per, seed)
    out = []
    for i in range(n):
        g = grades[i % len(grades)]
        out.append(pool[g][i // len(grades)])
    return out


def inserts(size, puzzles):
    """(key, renderer, pages, Fit) for the sudoku booklet."""
    s = SIZES[size]
    big = size == "regular"
    npz = s["sudoku_per_page"]
    npages = (len(puzzles) + npz - 1) // npz
    per_answer = 8
    nans = (len(puzzles) + per_answer - 1) // per_answer
    grades = ", ".join(GRADES).lower()

    return [
        ("cover",
         lambda i, n: (build_extras.p_sudoku_cover(
             s, TITLE, "%d puzzles, %s. One solution each."
             % (len(puzzles), grades)), False),
         1, Fit(start="recto")),
        ("puzzles",
         lambda i, n: (build_extras.p_sudoku(
             s, puzzles[i * npz:(i + 1) * npz], i * npz + 1,
             notes=WORKING_LINES), False),
         npages, Fit(start="recto")),
        ("answers",
         lambda i, n: (build_extras.p_sudoku_solutions(
             s, puzzles[i * per_answer:(i + 1) * per_answer],
             i * per_answer + 1), False),
         nans, Fit(start="recto")),
        ("printing guide",
         lambda i, n: (p_print_guide(s, size, n, "sudoku")[i], False),
         1 if big else 2, Fit(at_end=True)),
    ]


def pages(size, puzzles=None):
    s = SIZES[size]
    puzzles = puzzles if puzzles is not None else pick(PUZZLES, GRADES)
    items = inserts(size, puzzles)
    render = {k: fn for k, fn, _, _ in items}
    slots = plan([(k, n, fit) for k, _, n, fit in items])
    total = len(slots)
    return [(p_notes(s), False) if kind == "fill" else render[key](i, total)
            for kind, key, i in slots]


def build(size, puzzles=None):
    s = SIZES[size]
    out = []
    for i, (body, turned) in enumerate(pages(size, puzzles), start=1):
        out.append(sheet("R" if i % 2 else "L", body,
                         pg=None if i == 1 else i, turned=turned))
    return doc("%s &mdash; %s" % (TITLE, size), s, out)


def main():
    puzzles = pick(PUZZLES, GRADES)
    for size in ("regular", "passport"):
        d = os.path.join(OUT, size)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, "sudoku-%s.html" % size)
        html = build(size, puzzles)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        n = html.count("class='sheet")
        print("%-40s %2d pages" % (path, n))
        items = inserts(size, puzzles)
        for why, k in summary(plan([(a, b, c)
                                    for a, _, b, c in items])).items():
            print("%-40s   %d spare: %s" % ("", k, why))


if __name__ == "__main__":
    main()
