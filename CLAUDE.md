# Year Book — Traveller's Notebook insert

Printable analog life-tracking inserts, generated from Python into print-exact
HTML and rendered to PDF with headless Chrome. Two sizes; two booklets, the
Year Book and a sudoku book. `docs/` is a browser version on GitHub Pages
with the same two tools. `README.md` is the user-facing doc; this file is the
working context.

The design descends from a "I tracked my life every day for a year" infographic
(`lm82acr2cy1i1.png`, kept for reference). The insert captures the *data*; the
poster's charts were mostly stripped out by the owner over several rounds.

## Build

```
python build_inserts.py     # Year Book HTML -> {size}/year-book-{size}.html
python build_sudoku.py      # Sudoku book    -> {size}/sudoku-{size}.html
python build_imposed.py     # A4 imposition for both
python make_pdfs.py         # all eight PDFs via headless Chrome
```

Always run them in that order — `build_imposed` imports the other two, and
`make_pdfs` renders whatever HTML is on disk.

| File | Role |
|---|---|
| `build_core.py` | Page geometry (`SIZES`), the whole stylesheet, `year_grid`, `sheet`, `doc` |
| `build_inserts.py` | Page builders, `a4_geometry`, `imposition`, page order |
| `build_imposed.py` | Places pages on A4, draws cut/fold marks and waste labels |
| `make_pdfs.py` | Chrome `--headless --print-to-pdf`, verifies MediaBox |
| `build_extras.py` | Sudoku pages and the world time chart spread |
| `build_sudoku.py` | The sudoku-only booklet; knobs at the top of the file |
| `layout.py` | Where the spare pages go (twin of `docs/js/layout.js`) |
| `sudoku.py` | Puzzle generator: unique solution, graded, fixed seed |
| `map_data.py` | Generated coastline (`make_mapdata.py`, needs the network) |
| `build_mockup.py` | Filled-in demo pages (see `mockups/README.md`) |
| `make_mockup_pngs.py` | Chrome `--headless --screenshot` at 3× |
| `make_webdata.py` | Exports geometry, font metrics and puzzles to `docs/js/` |

## Rules that must hold

- **Exact page size.** `@page { size: Wmm Hmm; margin: 0 }`; regular 110×210,
  passport 89×124. Verified from the PDF MediaBox by `make_pdfs.py`.
- **Square grid cells.** Cell size is always derived as
  `(available_width - label_width) / 31` and used for both axes. Never hardcode
  a cell height.
- **Dead dates greyed**, 29 Feb left open with a dotted border for the owner to
  shade out in a common year. This is deliberate and applies to every grid.
- **Every column numbered 1–31.** Font is `clamp(3.2, cell_mm * 2.0, 5.6)` pt —
  two digits are ~1.11 em, so that factor keeps them inside even the 2.19 mm
  passport habit cells. Do not size type from a mm value without converting.
- **Turned pages.** The year grid and films chart are rotated a quarter turn on
  the same portrait sheet via `.turn` (`translateY(padh) rotate(-90deg)`, origin
  top-left). Read by turning the notebook **clockwise**.
- **Gutter.** Odd pages get class `R` (wide margin left), even pages `L` (wide
  margin right), so the spine margin always falls into the fold.
- **Greyscale only.** No colour anywhere; grid rules print light so pen reads on
  top. This beats the source material: the time-chart reference card
  (`world-time-chart-tn-passport (1).pdf`) uses a red accent, so here the UTC
  column is merely bolder and the prime-meridian city gets a hollow ring.
- **Spare pages are not placed by hand.** Each insert declares a `Fit`
  (`spread`, `start="recto"`, `at_end`) and `layout.plan` does the rest. Do
  not add parity fixes inside a page builder. The guide quotes the final
  total, so `pages()` plans first and renders second.

## Imposition

Saddle-stitched, any multiple of 4. `imposition(n)` gives folded sheet *k* the
*k*th pair in from each end; 8 pages still comes out as `8|1, 2|7, 6|3, 4|5`.

- Regular: A4 **landscape**, 2-up, one A4 per folded sheet, duplex **short
  edge**.
- Passport: A4 **portrait**, 4-up (two folded sheets stacked per A4), duplex
  **long edge**. With an odd number of folded sheets the last A4 carries only
  its top half.

`a4_geometry()` in `build_inserts.py` is the single source of truth — both the
imposed file and the measurements printed on the guide page read from it. Keep
it that way; the numbers drifting apart is the obvious failure mode.

Duplex flip edge varies by driver, so the guide page tells the owner to verify
physically (back of page 1 must be page 2, same way up) rather than trusting a
setting.

**Puzzles are not part of the Year Book.** They were, briefly; the owner
split them out. `build_inserts.py` has no sudoku, the booklet builder's
catalogue hides the three puzzle inserts behind `solo: true`, and `GENERAL`
is what that page offers. The sudoku page uses the full `CATALOGUE`.


## Decisions already made — don't re-add

The owner pruned this hard. Previously built and **deliberately removed**:
sudoku inside the Year Book (it is its own booklet now);
a separate Daily Log booklet; a year-totals page; the good-day cross-tab
worksheet; weekday, movement, dinner and travel pages; the year-end dashboard;
people/social tracking; crying as a tracked field; the how-to page (and with it
the habit-definition and good-day-definition tables); the F/T gutter column
inside each film box (it put a second vertical line in every month and broke
alignment with the month axis — F or T now goes at the start of the title).

Habit names are **blank rules** by design — the owner fills them in.

## Verifying layout

There is no visual regression test. The reliable check is to serve the folder
and measure in Chrome: for each `.pad`, sum the children's heights (for turned
pages read `getBoundingClientRect().width`, since the rotation swaps the axes)
and compare against the pad. Anything negative overflows; anything above ~40 mm
is a page wasting space. Page 1 reads −0.1 mm because the cover flexes to
exactly 100% — that one is fine.

```
python -m http.server 8731 --bind 127.0.0.1
```

`file://` URLs are blocked by the browser tooling, so a local server is needed
for inspection. Chrome renders `file://` fine for PDF export, though.

## Mockups

`mockups/` holds filled-in renders of every page for showing the design, built
by decorating the real rendered DOM rather than re-deriving cell coordinates —
so they stay correct when the layout changes. Details and the knobs for the
sample data are in `mockups/README.md`. The watch list uses real 2024-2026
releases, capped at 3 series per 2-month block; the habits, notes and figures
are made up.

Chrome rejects `--default-background-color=0`; it wants a hex RGB(A) value, or
just omit the flag.

## Gotchas

- Most page builders use `%`-formatting on strings full of CSS. Every literal
  `%` must be doubled (`width:100%%`, `height:16%%`). This has bitten twice.
- `calc(100% - 5mm)` inside a `%`-formatted string must be concatenated, not
  interpolated — `%` followed by a space is not a valid conversion.
- Writing these files via bash heredoc truncates; use the Write tool.

## Spare pages

`layout.py` and `docs/js/layout.js` are the same algorithm twice; change both.
Slots come back as `("page", key, i)` or `("fill", reason, None)` — a fill slot
only says *a page is needed here, and why*. What goes on it is the caller's
choice: the printed booklets use ruled notes, the web app lets the user pick
blank, ruled or dots.

The one non-obvious rule: all spare pages would otherwise sit in front of the
trailing insert, which pins its first page number, and for a two-page tail
that number is always odd — so the pair never faces. Moving one page *behind*
the tail flips the parity and leaves a spare back page. That is why the
passport guide ends on 14–15 with 16 blank rather than running 15–16.


## The booklet builder (`docs/`)

A static ES-module site. No CDN, no build step, no upload — it writes the PDF
itself so GitHub Pages can serve it as-is.

| File | Role |
|---|---|
| `index.html`, `js/app.js` | The booklet builder |
| `sudoku/index.html`, `js/studio.js` | The sudoku book generator |
| `js/surface.js` | Minimal PDF writer (base-14 fonts, no embedding) and a canvas backend with the identical API |
| `js/pages.js` | Page painters, mirroring the Python builders |
| `js/booklet.js` | Insert catalogue, page expansion, spare pages, A4 imposition |
| `js/sudoku.js` | Puzzle generator, a port of `sudoku.py` |
| `js/layout.js` | Spare-page rules, a port of `layout.py` |
| `js/geometry.js`, `js/metrics.js` | Generated by `make_webdata.py` |
| `js/mapdata.js` | Generated by `make_mapdata.py` |

Both pages share everything below the UI. A new tool is a new HTML page and a
new driver file, not a new renderer.

**Puzzles are generated in the browser, not shipped.** There used to be a
`docs/js/puzzles.js` pool baked by `make_webdata.py`; it meant every visitor
got the same 96 puzzles. `js/sudoku.js` now digs them on demand — about 70 ms
for 24, fast enough to run inline with no worker and no spinner. Each puzzle
is seeded from its own `(seed, grade, index)` and memoised, so counts can
change without reshuffling what came before. The printed Python booklets
still use `sudoku.py` with its own fixed seed; the two generators agree on
the algorithm, not on the output, and they do not need to.

**The painters are duplicated.** Python builds the ready-made booklets; the JS
builds anything the user composes. Geometry, cities, zones, font metrics and
the puzzle pool are *generated* from Python so they cannot drift — but if you
change a page's layout in `build_extras.py`, change `docs/js/pages.js` too, and
rerun `python make_webdata.py`.

Puzzle settings (grades, one grid a page, working lines, date) are **one set
for the whole booklet**, held in `state.sudoku` and copied onto every sudoku
item before `expand`. They were per-insert first; with a dozen sudoku pages
that meant setting them a dozen times.

`booklet.js` has both a `plan` imported from `layout.js` and its own A4
`a4Plan` — they are different things and the names collided once.

### Coordinates

Everything is millimetres with y running down, in both backends. The PDF page
opens with a `K 0 0 -K 0 H cm` so painters never think in points or in PDF's
bottom-left origin. Two consequences that have both bitten:

- **Font sizes must be divided by `MM`** before `Tf`, because the CTM already
  scales by it. Forgetting this makes every glyph 2.83× too big.
- Text needs `1 0 0 -1 x y Tm` to cancel the flip, which also works unchanged
  inside a turned block.

A turned page gets `q 0 -1 1 0 ox (oy+depth) cm`, matching the CSS
`translateY(padh) rotate(-90deg)`. The pad handed to a turned painter is
already rotated: **its `w` is the page depth and its `h` is the page width.**
Reading those the other way round silently squashes the page into a strip.

### Checking it

Serve the repo and drive the page from the console; `expand()`, `readingPdf()`
and `imposedPdf()` are all exported from `booklet.js`:

```
python -m http.server 8731 --bind 127.0.0.1
```

To eyeball real output, POST the blob to a throwaway local sink and open it
with PyMuPDF — rendering contact sheets at ~60 dpi catches overflow and
imposition mistakes much faster than reading the page list. Verify the
imposition by extracting the folio numerals and their x/y, not by squinting at
a thumbnail: on passport the two bands of one A4 look confusingly like two
separate sheets.
