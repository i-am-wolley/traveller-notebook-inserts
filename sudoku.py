# -*- coding: utf-8 -*-
"""Sudoku puzzles with a guaranteed unique solution.

Deterministic: the same seed always yields the same puzzles, so a rebuild does
not reshuffle a booklet the owner has already printed.

    python sudoku.py        # print a sample of each grade
"""
import random

GRADES = [
    # name, givens aimed for, whether guessing may be needed
    ("Easy", 38, False),
    ("Medium", 32, False),
    ("Hard", 28, True),
    ("Very hard", 24, True),
]

ROWS = [[r * 9 + c for c in range(9)] for r in range(9)]
COLS = [[r * 9 + c for r in range(9)] for c in range(9)]
BOXES = [[(br * 3 + r) * 9 + bc * 3 + c
          for r in range(3) for c in range(3)]
         for br in range(3) for bc in range(3)]

PEERS = []
for i in range(81):
    p = set()
    for unit in (ROWS[i // 9], COLS[i % 9],
                 BOXES[(i // 27) * 3 + (i % 9) // 3]):
        p.update(unit)
    p.discard(i)
    PEERS.append(sorted(p))


def _solve(grid, limit=2, rnd=None):
    """Count solutions up to `limit`, returning (count, first_solution)."""
    found = []

    def rec(g):
        if len(found) >= limit:
            return
        best, best_opts = -1, None
        for i in range(81):
            if g[i]:
                continue
            used = {g[p] for p in PEERS[i]}
            opts = [v for v in range(1, 10) if v not in used]
            if not opts:
                return
            if best_opts is None or len(opts) < len(best_opts):
                best, best_opts = i, opts
                if len(opts) == 1:
                    break
        if best_opts is None:
            found.append(g[:])
            return
        if rnd is not None:
            rnd.shuffle(best_opts)
        for v in best_opts:
            g[best] = v
            rec(g)
            g[best] = 0
            if len(found) >= limit:
                return

    rec(grid[:])
    return len(found), (found[0] if found else None)


def _full(rnd):
    n, sol = _solve([0] * 81, limit=1, rnd=rnd)
    return sol


def _logic_only(grid):
    """True if naked and hidden singles alone finish the grid."""
    g = grid[:]
    while True:
        moved = False
        cand = {}
        for i in range(81):
            if g[i]:
                continue
            used = {g[p] for p in PEERS[i]}
            opts = [v for v in range(1, 10) if v not in used]
            if not opts:
                return False
            if len(opts) == 1:
                g[i] = opts[0]
                moved = True
            else:
                cand[i] = opts
        if moved:
            continue
        for unit in ROWS + COLS + BOXES:
            for v in range(1, 10):
                spots = [i for i in unit if i in cand and v in cand[i]]
                if len(spots) == 1 and not any(g[i] == v for i in unit):
                    g[spots[0]] = v
                    moved = True
                    break
            if moved:
                break
        if not moved:
            return all(g)


def make(grade, rnd):
    """Dig a puzzle of the asked grade out of a random full grid."""
    name, want, may_guess = grade
    sol = _full(rnd)
    puz = sol[:]
    order = list(range(81))
    rnd.shuffle(order)
    givens = 81
    for i in order:
        if givens <= want:
            break
        keep = puz[i]
        puz[i] = 0
        n, _ = _solve(puz, limit=2)
        ok = n == 1 and (may_guess or _logic_only(puz))
        if ok:
            givens -= 1
        else:
            puz[i] = keep
    return dict(name=name, givens=givens, puzzle=puz, solution=sol)


def batch(n, seed=20260101):
    """`n` puzzles, cycling through the grades easiest first."""
    rnd = random.Random(seed)
    return [make(GRADES[i % len(GRADES)], rnd) for i in range(n)]


def by_grade(per, seed=20260101):
    """`per` puzzles of each grade, keyed by the grade's name.

    A separate stream per grade, so asking for more Hard ones does not change
    which Easy ones you get.
    """
    out = {}
    for i, g in enumerate(GRADES):
        rnd = random.Random(seed + i * 1009)
        out[g[0]] = [make(g, rnd) for _ in range(per)]
    return out


def show(p):
    out = []
    for r in range(9):
        row = "".join(("%d" % p[r * 9 + c] if p[r * 9 + c] else ".")
                      + (" " if c % 3 < 2 else "  ") for c in range(9))
        out.append(row.rstrip())
        if r % 3 == 2 and r < 8:
            out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    for p in batch(4):
        print("%s - %d givens" % (p["name"], p["givens"]))
        print(show(p["puzzle"]))
        print()
