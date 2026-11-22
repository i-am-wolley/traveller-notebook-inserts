# Year Book — Traveller's Notebook insert

A year of life-tracking pages, sized for Regular (110 × 210 mm) and Passport
(89 × 124 mm) Traveller's Notebooks. 16 pages each — four folded sheets.

**Or build your own.** Two tools, both running entirely in the browser:

- [**Booklet builder**](https://i-am-wolley.github.io/traveller-notebook-inserts/)
  — pick a size, choose inserts, drag them into order, download the imposed
  PDF.
- [**Sudoku book**](https://i-am-wolley.github.io/traveller-notebook-inserts/sudoku/)
  — a booklet of nothing but puzzles, with its own controls: difficulty mix,
  how many, one or two to a page, numbering, typeface, cover, working lines,
  and a seed.

**Print the `-A4` files.** They are the same eight pages imposed onto A4 with
cut and fold marks. The plain files are reading copies at true insert size.

```
regular/   year-book-regular-A4.pdf     8 sides, A4 landscape   ← print this
           year-book-regular.pdf       16 pages, 110 × 210 mm
           sudoku-regular-A4.pdf       10 sides, A4 landscape   ← print this
           sudoku-regular.pdf          20 pages, 110 × 210 mm
passport/  year-book-passport-A4.pdf    4 sides, A4 portrait    ← print this
           year-book-passport.pdf      16 pages, 89 × 124 mm
           sudoku-passport-A4.pdf       6 sides, A4 portrait    ← print this
           sudoku-passport.pdf         20 pages, 89 × 124 mm
```

There are two ready-made booklets: the **Year Book** below, and a **Sudoku
book** — 24 graded puzzles with the answers at the back. Change what is in
the sudoku book at the top of `build_sudoku.py`.

The `.html` beside each PDF is the source. To change anything, edit
`build_inserts.py` (page content) or `build_core.py` (geometry and CSS), then:

```
python build_inserts.py     # the booklet HTML
python build_imposed.py     # the A4 imposition, with marks
python make_pdfs.py         # renders all four PDFs with headless Chrome
```

## The pages

Regular, 16 pages (passport in brackets where it differs):

| | |
|---|---|
| 1 | Cover |
| 2 | **Every day of the year** — 12 × 31 grid, turned sideways |
| 3–4 | **The year in habits** — six blank-labelled 12 × 31 grids, three per page |
| 5 | **Films and shows** — months across the bottom, titles stacked up (passport: 5–6, six months each; 7 blank) |
| 6–7 | **World time chart** — zone map and every standard offset, then the conversion table (passport: 8–9) |
| 8–11 | **Sudoku** — eight graded puzzles, two per page (passport: 10–13) |
| 12 | **Sudoku answers** (passport: 14) |
| 13–15 | Notes (passport: none) |
| 16 | **Printing and folding** — the whole procedure, on the page (passport: 15–16) |

### World time chart

A two-page spread, and the build keeps it on facing pages — the map always
lands on a left-hand page, inserting a blank before it if it would not. The
left page carries an equirectangular map with the 24 hour bands behind it,
dots for a handful of cities, and a line for every standard offset from −11 to
+12 including the half and quarter hours. The right page converts all 24 UTC
hours into nine cities (seven on passport) and leaves ruled space for your own.

Standard time only, and the page says so: half the world moves in summer and
half does not.

### Sudoku

Generated in `sudoku.py`: a filled grid dug out at random, with every removal
checked to leave exactly one solution. Easy and Medium are solvable by naked
and hidden singles alone; Hard and Very hard may need a guess. The seed is
fixed, so a rebuild never reshuffles a booklet you have already printed.

The grade is about how the puzzle solves, not just how many clues it has —
digging to a clue count without checking uniqueness is the usual shortcut,
and it produces puzzles with several valid answers.

**The browser generates its own puzzles.** `docs/js/sudoku.js` is a port of
`sudoku.py`, so the site digs each puzzle out on demand rather than shipping
a fixed pool — a new seed really is a set nobody has seen, and the same seed
always reprints the same book. Each puzzle is seeded from its own
`(seed, grade, index)`, so puzzle 7 is the same whether you asked for eight
or eighty, and adding a page never reshuffles the pages before it.

Generating 24 puzzles takes about 70 ms, which is why there is no spinner.

Options in both tools: which grades to mix, one big grid a page or two,
numbering (`1`, `No. 1`, `I`), typeface (Helvetica, Times, Courier), a cover,
ruled working lines, and a timer line, a date line or neither.
`build_sudoku.py` has the same knobs at the top of the file.

## The grids

Square cells throughout — 5.8 mm on regular, 3.3 mm on passport for the year
grid; 2.7 mm and 2.2 mm for the habit grids.

Dates that don't exist are greyed: the 31st of April, June, September and
November, and the 30th and 31st of February. **29 February is left open** with a
dotted border — shade it out yourself in a common year.

## Turned pages

The year grid and the films chart are printed sideways on the same sheet — turn
the notebook a quarter turn **clockwise** to read them. Turned this way the year
grid reads months down the left and days 1–31 across, matching the usual
heat-map layout, with the long edge of the paper carrying the 31 days.

## Films chart

Months run along the x-axis. Each column is 10 boxes tall, stacking upward, so
the columns grow into a bar chart of the year's watching. Regular gives you
16 mm of writing width per box over 7 mm of height; passport splits the year
across two pages to get 19 mm per box. Start each line with an F or a T for a
film or a TV series; a box under the axis takes the month's count.

10 boxes × 12 months = 120 slots.

## Printing

The full procedure is printed on the last page of the insert itself, so it
travels with the notebook. In short:

Print the **`-A4` file** at **100% / actual size** — never "fit to page". The
imposition and page ordering are already baked in, so don't use your print
dialog's booklet mode on top of it.

**Regular.** A4 **landscape**, double-sided, flipping on the **short edge**. One
sheet per folded signature. Each is 297 × 210 mm carrying two 110 × 210 pages side by side; cut
38.5 mm in from each side, nothing off the top or bottom, fold down the centre.

**Passport.** A4 **portrait**, double-sided, flipping on the **long edge**. Each
sheet carries four 89 × 124 pages — two folded sheets stacked. Cut 16 mm in
from each side and across at 20, 144, 153 and 277 mm from the top — which also
separates the two folded sheets — then fold each down the centre.

Then nest the sheets in order and check the page numbers run 1 to 16.

**If the backs don't match the fronts**, your printer flipped on the other edge.
Change that one setting and reprint; nothing else needs to change.

The imposition is the usual saddle stitch: folded sheet *k* carries the *k*th
pair in from each end. For 16 pages that is 16|1, 2|15 on the outer sheet, then
14|3, 4|13 / 12|5, 6|11 / 10|7, 8|9 nesting inwards.

Greyscale is fine — the design uses no colour. 80–100 gsm takes pen well. The
grid rules print light on purpose so your marks read on top of them. The cut and
fold marks sit in the waste margin and are trimmed away, along with the sheet
labels that tell you which sheet and side you're holding.

## Layout notes

Left-hand pages carry the wider margin on the right and right-hand pages on the
left, so the gutter falls into the fold.

## The booklet builder

`docs/` is a static site — GitHub Pages serves it straight from the folder.
It paints the same pages with a small JavaScript renderer and writes the PDF
itself, so nothing is uploaded and no library is fetched.

| | |
|---|---|
| `docs/index.html` | The booklet builder |
| `docs/sudoku/index.html` | The sudoku book generator |
| `docs/js/surface.js` | A minimal PDF writer, plus a canvas backend with the same API so the preview and the print come off one painter |
| `docs/js/sudoku.js` | The puzzle generator, a port of `sudoku.py` |
| `docs/js/layout.js` | Where the spare pages go, a port of `layout.py` |
| `docs/js/pages.js` | The page painters, mirroring `build_inserts.py` / `build_extras.py` |
| `docs/js/booklet.js` | The insert catalogue, blank padding and the A4 imposition |
| `docs/js/app.js` | The UI |
| `docs/js/app.js`, `studio.js` | The two interfaces |
| `docs/js/geometry.js`, `metrics.js` | Generated by `make_webdata.py` |
| `docs/js/mapdata.js` | Generated by `make_mapdata.py` |

Regenerate the data whenever the geometry, the city list or the puzzle
generator changes:

```
python make_webdata.py      # geometry, font metrics, puzzle pool
python make_mapdata.py      # the coastline (needs the network)
```

Fonts are the PDF base-14 — Helvetica and Times — so nothing is embedded and
the files stay small. Advance widths are taken from PyMuPDF at build time, so
the browser measures text exactly as the PDF will set it.

## Spare pages

A saddle-stitched booklet is a stack of folded sheets, which forces some
arithmetic on the content: the total has to be a multiple of four, odd pages
are always on the right of an open spread and even pages on the left. Rather
than placing blanks by hand, each insert says what it needs and `layout.py`
works the rest out:

| Constraint | Means |
|---|---|
| `spread` | its pages are a facing pair, so the first must be even |
| `start="recto"` | it begins on a right-hand page |
| `at_end` | it goes at the back |

So the world time chart's map always lands on a left-hand page with the table
opposite, and on passport — where the films chart is two pages instead of one
— a spare page appears earlier to keep both halves of the year in view at
once. Change the size and the padding moves on its own.

Whatever is left over goes just before the last insert, except for one case:
a two-page ending can only face if a page goes *after* it, so the booklet
gets a spare back page instead. The builder lists the reason for every spare
page it adds, and lets you fill them with nothing, ruled lines or a dot grid.
