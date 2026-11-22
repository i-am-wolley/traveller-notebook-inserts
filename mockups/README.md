# Mockups

Partially-filled renders of every insert page, for showing the design.

```
python build_mockup.py        # regenerates the HTML in this folder
python make_mockup_pngs.py    # screenshots them to PNG at 3x
```

16 images — 8 pages × 2 sizes, at 3× device scale:

| | |
|---|---|
| `regular-*.png` | 1473 × 2607 px portrait, 2607 × 1473 landscape |
| `passport-*.png` | 1191 × 1587 px portrait, 1587 × 1191 landscape |

The two **turned** pages — the year grid and the films chart — are exported
**landscape**, already rotated upright, so they read correctly when posted. On
the printed insert they sit sideways on a portrait sheet.

## How the filling works

Each `.html` here is the real page plus a fill script that decorates the
actual rendered DOM, so every mark lands exactly on a grid cell — no
coordinates are re-derived, and the mockups stay correct if the layout changes.

- Shaded squares and crosses are SVG paths with jittered corners, slight
  rotation and uneven opacity, drawn inside the cell.
- Handwriting is **Ink Free** (a Windows system font) with per-element rotation
  and baseline drift. Ink is a blue-black, with a second darker pen appearing
  about 12% of the time.
- Days are **sticky** — each day is pulled toward the previous one, so the grids
  read as runs and slumps rather than static. That one detail is what makes them
  look kept rather than generated.
- The year stops in early October, so the pages show both filled and empty
  states.
- Randomness is seeded per page, so re-running produces identical images.

## The watch list

Real releases from 2024–2026, shortened the way you'd actually write them into
a 16 mm box ("Final Reckoning", not "Mission: Impossible – The Final
Reckoning"). 50 titles across the year, none repeated.

Series are capped at **3 per 2-month block** and spread down each column rather
than clumped — 15 series, 35 films. `watch_entries()` works the quota out per
block and places them; it isn't random, so the balance holds if you change the
monthly counts.

The 2026 titles come from announced release slates and some may since have
moved. Anything past mid-2026 is beyond what can be verified here, so the year
tails off into the blank Nov/Dec columns.

The habits, notes and all the figures are made up.

## Changing the content

Constants at the top of `build_mockup.py`:

| | |
|---|---|
| `MOVIES`, `SERIES` | the title pools |
| `COUNTS` | titles started per month |
| `SERIES_PER_2_MONTHS` | the series quota |
| `HABITS`, `HABIT_DENSITY` | habit names and how often each one happened |
| `NOTES` | the handwritten notes page |
| `UPTO` | how far into the year the grid filling runs |
