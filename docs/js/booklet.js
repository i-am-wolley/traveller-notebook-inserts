// Turning a chosen list of inserts into a booklet: page expansion, the blank
// pages a saddle-stitched booklet needs, and the A4 imposition.

import { SIZES, A4, MONTHS } from './geometry.js';
import { fit, plan, summary } from './layout.js';
import { Pdf, CanvasSurface, INK } from './surface.js';
import * as P from './pages.js';
import { PUZZLE_GRADES } from './pages.js';

export { SIZES, A4 };

export const CATALOGUE = [
  {
    id: 'cover',
    name: 'Cover',
    blurb: 'Title, a rule, and a box for the year.',
    fit: { start: 'recto' },
    pages: () => [{ label: 'Cover', paint: (d, s, p) => P.pCover(d, s, p) }],
  },
  {
    id: 'glance',
    name: 'Year at a glance',
    blurb: '12 × 31 squares, one for every day. Turned on its side.',
    pages: () => [{
      label: 'Year at a glance',
      turned: true,
      paint: (d, s, p) => P.pGlance(d, s, p),
    }],
  },
  {
    id: 'habits',
    name: 'Habit grids',
    blurb: 'Three blank-named year grids a page. Name them yourself.',
    repeat: true,
    pages: (s, o, st) => {
      const out = [];
      for (let i = 0; i < (o.n || 1); i += 1) {
        const first = st.habitsSeen === 0;
        st.habitsSeen += 1;
        out.push({
          label: first ? 'Habits' : 'Habits, continued',
          paint: (d, sz, p) => P.pHabits(d, sz, p, sz.habits_per_page, first),
        });
      }
      return out;
    },
  },
  {
    id: 'films',
    name: 'Films and shows',
    blurb: 'A stack chart by month. One page on regular, two on passport, '
      + 'kept facing so the whole year is in view.',
    fit: (s) => (s.w > 100 ? {} : { spread: true }),
    pages: (s) => (s.w > 100
      ? [{
        label: 'Films and shows',
        turned: true,
        paint: (d, sz, p) => P.pFilms(d, sz, p, MONTHS, 1, 1),
      }]
      : [{
        label: 'Films — Jan to Jun',
        turned: true,
        paint: (d, sz, p) => P.pFilms(d, sz, p, MONTHS.slice(0, 6), 1, 2),
      }, {
        label: 'Films — Jul to Dec',
        turned: true,
        paint: (d, sz, p) => P.pFilms(d, sz, p, MONTHS.slice(6), 2, 2),
      }]),
  },
  {
    id: 'timezone',
    name: 'World time chart',
    blurb: 'Zone map and every standard offset, then the conversion table. '
      + 'Kept on facing pages.',
    fit: { spread: true },
    pages: () => [
      { label: 'Time chart — map', paint: (d, s, p) => P.pTimeMap(d, s, p) },
      { label: 'Time chart — table',
        paint: (d, s, p) => P.pTimeTable(d, s, p) },
    ],
  },
  {
    id: 'sudoku-cover',
    name: 'Sudoku cover',
    blurb: 'A title page for a booklet that is only puzzles.',
    fit: { start: 'recto' },
    pages: (s, o, st, ctx) => [{
      label: 'Sudoku cover',
      paint: (d, sz, p) => P.pSudokuCover(d, sz, p, o.title || 'Sudoku',
        `${ctx.puzzles.length} puzzles, ${gradeLine(o)}. One solution each.`),
    }],
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    blurb: 'Graded puzzles, two a page. Every one has a single solution.',
    repeat: true,
    pages: (s, o, st, ctx) => {
      const out = [];
      const per = o.oneUp ? 1 : s.sudoku_per_page;
      for (let i = 0; i < (o.n || 1); i += 1) {
        const start = st.puzzle;
        const set = ctx.puzzles.slice(start, start + per);
        st.puzzle += set.length;
        out.push({
          label: set.length > 1
            ? `Sudoku ${start + 1}–${start + set.length}`
            : `Sudoku ${start + 1}`,
          paint: (d, sz, p) => P.pSudoku(d, sz, p, set, start + 1,
            { working: o.working, date: o.date }),
        });
      }
      return out;
    },
  },
  {
    id: 'answers',
    name: 'Sudoku answers',
    blurb: 'Solutions to every puzzle in this booklet, eight to a page.',
    pages: (s, o, st, ctx) => {
      const all = ctx.puzzles;
      if (!all.length) {
        return [{ label: 'Sudoku answers (no puzzles yet)',
          paint: (d, sz, p) => P.pSudokuAnswers(d, sz, p, [], 1) }];
      }
      const per = 8;
      const out = [];
      for (let i = 0; i < all.length; i += per) {
        const chunk = all.slice(i, i + per);
        out.push({
          label: `Sudoku answers ${i + 1}–${i + chunk.length}`,
          paint: (d, sz, p) => P.pSudokuAnswers(d, sz, p, chunk, i + 1),
        });
      }
      return out;
    },
  },
  {
    id: 'notes',
    name: 'Ruled notes',
    blurb: 'Plain ruled lines.',
    repeat: true,
    pages: (s, o) => Array.from({ length: o.n || 1 }, () => ({
      label: 'Notes', paint: (d, sz, p) => P.pNotes(d, sz, p),
    })),
  },
  {
    id: 'dots',
    name: 'Dot grid',
    blurb: '5 mm dots, for anything that is not writing.',
    repeat: true,
    pages: (s, o) => Array.from({ length: o.n || 1 }, () => ({
      label: 'Dot grid', paint: (d, sz, p) => P.pDots(d, sz, p),
    })),
  },
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'Nothing at all.',
    repeat: true,
    pages: (s, o) => Array.from({ length: o.n || 1 }, () => ({
      label: 'Blank', paint: () => {},
    })),
  },
  {
    id: 'guide',
    name: 'Printing and folding guide',
    blurb: 'How to print, cut, fold and nest this exact booklet. Always '
      + 'placed last.',
    fit: { atEnd: true },
    pages: (s) => (s.w > 100
      ? [{ label: 'Printing guide', guide: 1 }]
      : [{ label: 'Printing guide' , guide: 1 },
        { label: 'What goes where', guide: 2 }]),
  },
];

export const byId = (id) => CATALOGUE.find((c) => c.id === id);

// ---------------------------------------------------------------- expansion

export function gradeLine(o) {
  const g = (o && o.grades && o.grades.length) ? o.grades : PUZZLE_GRADES;
  return g.length === PUZZLE_GRADES.length
    ? 'easy to very hard'
    : g.join(', ').toLowerCase();
}

function fitOf(def, s) {
  const f = typeof def.fit === 'function' ? def.fit(s) : (def.fit || {});
  return fit(f);
}

// Every puzzle in the booklet, worked out before anything is placed, so the
// answers page is complete wherever the user drops it.
function puzzlesFor(sizeKey, items) {
  const s = SIZES[sizeKey];
  let n = 0;
  let grades = null;
  for (const it of items) {
    if (it.type !== 'sudoku') continue;
    const o = it.opt || {};
    n += (o.n || 1) * (o.oneUp ? 1 : s.sudoku_per_page);
    if (o.grades && o.grades.length) grades = o.grades;
  }
  return P.pickPuzzles(n, grades);
}

export function expand(sizeKey, items, fill = 'blank') {
  const s = SIZES[sizeKey];
  const ctx = { puzzles: puzzlesFor(sizeKey, items) };
  const st = { puzzle: 0, habitsSeen: 0 };

  // every insert's pages, in the order the user put them
  const made = items.map((it, owner) => {
    const def = byId(it.type);
    if (!def) return null;
    const o = { ...(it.opt || {}), n: it.n || 1 };
    const got = def.pages(s, o, st, ctx).map((pg) => ({ ...pg, owner }));
    return { key: String(owner), pages: got.length, fit: fitOf(def, s), got };
  }).filter(Boolean);

  const byKey = new Map(made.map((m) => [m.key, m.got]));
  const slots = plan(made.map(({ key, pages, fit: f }) => ({ key, pages,
    fit: f })));

  const filler = FILLERS[fill] || FILLERS.blank;
  const out = slots.map((slot) => (slot.kind === 'fill'
    ? { label: filler.label, why: slot.why, auto: true, owner: null,
      paint: filler.paint }
    : { ...byKey.get(slot.key)[slot.i], i: slot.i }));

  // the guide quotes the final page count, so it is bound last of all
  for (const pg of out) {
    if (pg.guide) {
      const part = pg.guide;
      pg.paint = (d, sz, p) => P.pGuide(d, sz, p, sizeKey, out.length, part);
    }
  }
  return out;
}

export const FILLERS = {
  blank: { label: 'Spare page', paint: () => {} },
  notes: { label: 'Spare page — ruled',
    paint: (d, s, p) => P.pNotes(d, s, p) },
  dots: { label: 'Spare page — dot grid',
    paint: (d, s, p) => P.pDots(d, s, p) },
};

export { summary };

// ---------------------------------------------------------------- painting

function padRect(s, pageNo) {
  // odd pages are rectos: the wide spine margin falls on their left
  const left = pageNo % 2 ? s.ms : s.mo;
  return { x: left, y: s.mt, w: s.w - s.mo - s.ms, h: s.h - s.mt - s.mb };
}

export function paintPage(d, sizeKey, page, pageNo, ox = 0, oy = 0) {
  const s = SIZES[sizeKey];
  const pad = padRect(s, pageNo);
  d.at(ox, oy);
  if (page.turned) {
    d.turn(pad.x, pad.y, pad.h);
    page.paint(d, s, { x: 0, y: 0, w: pad.h, h: pad.w });
    d.pop();
  } else {
    page.paint(d, s, pad);
  }
  if (pageNo > 1) {
    d.text(pad.x + pad.w, pad.y + pad.h - 0.4, String(pageNo),
      { size: s.small, color: '#909090', align: 'r' });
  }
  d.pop();
}

export function readingPdf(sizeKey, pages) {
  const s = SIZES[sizeKey];
  const pdf = new Pdf(`Year Book - ${sizeKey}`);
  pages.forEach((pg, i) => {
    const page = pdf.page(s.w, s.h);
    paintPage(page, sizeKey, pg, i + 1);
  });
  return pdf;
}

// ---------------------------------------------------------------- imposition

export function a4Plan(sizeKey, n) {
  const g = A4[sizeKey];
  const sides = P.imposition(n);
  const folded = n / 4;
  const xl = g.x0;
  const xr = g.x0 + g.pw;

  if (sizeKey === 'regular') {
    return sides.map(([l, r]) => [[l, xl, g.y0], [r, xr, g.y0]]);
  }
  const out = [];
  for (let p = 0; p < folded; p += 2) {
    for (const off of [0, 1]) {
      const slots = [[sides[2 * p + off][0], xl, g.ytop],
        [sides[2 * p + off][1], xr, g.ytop]];
      if (p + 1 < folded) {
        slots.push([sides[2 * (p + 1) + off][0], xl, g.ybot],
          [sides[2 * (p + 1) + off][1], xr, g.ybot]);
      }
      out.push(slots);
    }
  }
  return out;
}

const MARK = '#8a8a8a';

function marks(d, sizeKey, sideNo, folded) {
  const g = A4[sizeKey];
  const { aw, ah, pw, ph, x0 } = g;
  const dash = { color: MARK, w: 0.141, dash: 1.2 };
  const fold = { color: '#c4c4c4', w: 0.141, dash: 1.2 };
  d.line(x0, 0, x0, ah, dash);
  d.line(x0 + pw * 2, 0, x0 + pw * 2, ah, dash);

  const lab = (x, y, t, rot) => {
    if (!rot) {
      d.text(x, y, t, { size: 5, color: '#9a9a9a' });
      return;
    }
    d.turn(x, y - 60, 60);
    d.text(0, 0, t, { size: 5, color: '#9a9a9a' });
    d.pop();
  };

  if (sizeKey === 'regular') {
    d.line(x0 + pw, 0, x0 + pw, ah, fold);
    lab(x0 - 1.6, ah - 6, 'CUT', true);
    lab(x0 + pw * 2 + 4.6, ah - 6, 'CUT', true);
    lab(7.6, ah - 6, `SHEET ${Math.floor(sideNo / 2) + 1} · `
      + `${sideNo % 2 === 0 ? 'FRONT' : 'BACK'}`, true);
    lab(aw - 9.4, ah - 6,
      'A4 LANDSCAPE · DUPLEX ON THE SHORT EDGE · PRINT AT 100%', true);
    return;
  }

  const pair = Math.floor(sideNo / 2);
  const topSheet = pair * 2 + 1;
  const hasBottom = topSheet < folded;
  const ys = [g.ytop, g.ytop + ph];
  if (hasBottom) ys.push(g.ybot, g.ybot + ph);
  for (const y of ys) d.line(0, y, aw, y, dash);
  const folds = hasBottom ? [g.ytop, g.ybot] : [g.ytop];
  for (const y of folds) d.line(x0 + pw, y, x0 + pw, y + ph, fold);

  const side = sideNo % 2 === 0 ? 'FRONT' : 'BACK';
  lab(x0 + 1, g.ytop - 2.2, `SHEET ${topSheet} · ${side}`);
  if (hasBottom) lab(x0 + 1, g.ybot - 2.2, `SHEET ${topSheet + 1} · ${side}`);
  lab(x0 - 1.6, ah - 6, 'CUT', true);
  lab(5.6, ah - 6,
    'A4 PORTRAIT · DUPLEX ON THE LONG EDGE · PRINT AT 100%', true);
}

export function imposedPdf(sizeKey, pages) {
  const g = A4[sizeKey];
  const n = pages.length;
  const pdf = new Pdf(`Year Book A4 - ${sizeKey}`);
  const sides = a4Plan(sizeKey, n);
  sides.forEach((slots, i) => {
    const sheet = pdf.page(g.aw, g.ah);
    for (const [pno, x, y] of slots) {
      paintPage(sheet, sizeKey, pages[pno - 1], pno, x, y);
    }
    marks(sheet, sizeKey, i, n / 4);
  });
  return pdf;
}

// ---------------------------------------------------------------- preview

export function previewPage(canvas, sizeKey, pages, index, dpr) {
  const s = SIZES[sizeKey];
  const k = (canvas.clientWidth || 300) / s.w;
  canvas.width = Math.round(s.w * k * dpr);
  canvas.height = Math.round(s.h * k * dpr);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, s.w * k, s.h * k);
  ctx.textBaseline = 'alphabetic';
  const surf = new CanvasSurface(ctx, k);
  paintPage(surf, sizeKey, pages[index], index + 1);
  ctx.restore();
}

export { INK };
