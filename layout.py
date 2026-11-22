# -*- coding: utf-8 -*-
"""Where the blank pages go.

A saddle-stitched booklet is not a stack of pages, it is a stack of folded
sheets, and that imposes arithmetic the content has to live with: the total
must be a multiple of four, odd pages are always on the right of a spread and
even pages on the left. Rather than hand-placing blanks for each booklet,
every insert declares what it needs and this module works the rest out.

Each insert carries a `Fit`:

    spread    its pages are a facing pair, so the first must be even
    start     "recto" to begin on a right-hand page, "verso" on a left
    at_end    it goes last, whatever else is in the booklet

Nothing here knows what a page looks like, only how many there are, so the
browser builder runs the identical rules (docs/js/layout.js).
"""

MULTIPLE = 4           # pages per folded sheet


class Fit(object):
    """The layout constraints one insert places on the booklet."""

    def __init__(self, spread=False, start=None, at_end=False):
        self.spread = spread
        self.start = "verso" if spread else start
        self.at_end = at_end

    def wants(self, n):
        """The reason this insert needs to start where it does, or None."""
        if self.spread:
            return ("so the %d pages open as a spread, facing each other"
                    % n)
        if self.start == "recto":
            return "so it starts on a right-hand page"
        if self.start == "verso":
            return "so it starts on a left-hand page"
        return None


def _needs_fill(fit, placed):
    """True if a spare page must come first, given `placed` pages down."""
    if not fit.start:
        return False
    next_page = placed + 1
    return (next_page % 2 == 0) if fit.start == "recto" else (next_page % 2)


def plan(items):
    """Lay out `items` and return the page slots, blanks included.

    `items` is a list of (key, n_pages, Fit). The result is a list of slots:
    ("page", key, index_within_insert) or ("fill", reason, None).

    A fill slot only says a page is needed here and why; what goes on it -
    nothing, ruled lines, a dot grid - is the caller's choice.
    """
    body, tail = [], []

    for key, n, fit in items:
        if fit.at_end:
            tail += [("page", key, i) for i in range(n)]
            continue
        if _needs_fill(fit, len(body)):
            body.append(("fill", fit.wants(n), None))
        body += [("page", key, i) for i in range(n)]

    # whatever it takes to fill the last folded sheet
    total = len(body) + len(tail)
    want = max(MULTIPLE, total + (-total % MULTIPLE))
    spare = want - total
    before, after = spare, 0

    # Everything spare would otherwise land in front of the tail, which fixes
    # the tail's first page number - and for a two-page tail that number is
    # always odd, splitting it across a turn. Moving one page behind the tail
    # flips the parity and leaves a spare back page, which is what a booklet
    # usually wants anyway.
    if len(tail) >= 2 and spare >= 1 and (len(body) + before + 1) % 2:
        before, after = spare - 1, 1

    fill = ("to reach %d pages — a folded booklet needs a multiple of four"
            % want)
    body += [("fill", fill, None)] * before
    back = [("fill", "a spare back page, so the last two pages face",
             None)] * after
    return body + tail + back


def summary(slots):
    """How many spare pages, and why - for the build log and the web app."""
    out = {}
    for kind, why, _ in slots:
        if kind == "fill":
            out[why] = out.get(why, 0) + 1
    return out
