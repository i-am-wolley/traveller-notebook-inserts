// The insert pages, painted onto a surface. One painter serves both the PDF
// and the on-screen preview.
//
// Layouts follow the Python builders in build_inserts.py / build_extras.py:
// square grid cells derived from the available width, every column numbered,
// dead dates greyed, 29 February left open, greyscale throughout.

import { INK, RULE, GREY, textWidth } from './surface.js';
import { SIZES, A4, CITIES, BASE, ZONES, MONTHS, DAYS }
  from './geometry.js';
import { POLYS } from './mapdata.js';
import * as SUD from './sudoku.js';

const PT = 25.4 / 72;                  // points to millimetres

export const padw = (s) => s.w - s.mo - s.ms;
export const padh = (s) => s.h - s.mt - s.mb;

const HAIR = { color: RULE, w: 0.141 };
const LINE = { color: INK, w: 0.212 };

// ---------------------------------------------------------------- bits

function heading(d, s, x, y, str, level, override) {
  const size = level === 1 ? s.h1 : (level === 2 ? s.h2 : s.h3);
  const font = override || (level === 3 ? 'helvB' : 'timesB');
  let text = str;
  let tracked = null;
  if (level === 3) {
    text = str.toUpperCase();
    tracked = size * 0.07 * PT;        // the .07em letter-spacing of h3
  }
  if (tracked) {
    let cx = x;
    for (const ch of text) {
      d.text(cx, y + size * PT, ch, { font, size });
      cx += textWidth(ch, font, size) + tracked;
    }
  } else {
    d.text(x, y + size * PT, text, { font, size });
  }
  return y + size * PT * 1.15;
}

function para(d, s, x, y, w, str, o = {}) {
  // a greedy wrap at the given width, returning the new y
  const size = o.size || s.small;
  const font = o.font || 'helv';
  const lh = size * PT * 1.32;
  const words = str.split(' ');
  let line = '';
  let yy = y + size * PT;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (textWidth(test, font, size) > w && line) {
      d.text(x, yy, line, { font, size, color: o.color || '#666' });
      line = word;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) d.text(x, yy, line, { font, size, color: o.color || '#666' });
  return yy + size * PT * 0.35;
}

function writeLine(d, x, y, w) {
  d.line(x, y, x + w, y, LINE);
}

// ---------------------------------------------------------------- year grid

export function yearGrid(d, s, x, y, cell, lab, daynums = true) {
  const gx = x + lab;
  const gw = cell * 31;
  let top = y;

  if (daynums) {
    const hdr = Math.max(2.4, cell * 0.62);
    const fs = Math.max(3.2, Math.min(5.6, cell * 2.0));
    for (let n = 1; n <= 31; n += 1) {
      d.text(gx + (n - 0.5) * cell, y + hdr - 0.25, String(n),
        { size: fs, color: '#808080', align: 'c' });
    }
    top = y + hdr;
  }

  for (let m = 0; m < 12; m += 1) {
    for (let n = 1; n <= 31; n += 1) {
      const dead = n > DAYS[m];
      if (dead && !(m === 1 && n === 29)) {
        d.rect(gx + (n - 1) * cell, top + m * cell, cell, cell,
          { fill: GREY, color: null });
      }
    }
  }

  for (let m = 0; m <= 12; m += 1) {
    d.line(gx, top + m * cell, gx + gw, top + m * cell, HAIR);
  }
  for (let n = 0; n <= 31; n += 1) {
    d.line(gx + n * cell, top, gx + n * cell, top + 12 * cell, HAIR);
  }
  // the week markers, a touch harder than the rest
  for (const n of [8, 15, 22, 29]) {
    d.line(gx + (n - 1) * cell, top, gx + (n - 1) * cell, top + 12 * cell,
      { color: '#8e8e8e', w: 0.176 });
  }
  // 29 February stays open, to be shaded out by hand in a common year
  d.rect(gx + 28 * cell, top + cell, cell, cell,
    { color: '#9a9a9a', w: 0.141, dash: 0.25 });
  d.line(gx, top, gx, top + 12 * cell, LINE);

  for (let m = 0; m < 12; m += 1) {
    d.text(x, top + m * cell + cell * 0.5 + s.small * PT * 0.36, MONTHS[m],
      { size: s.small });
  }
  return top + 12 * cell;
}

// ---------------------------------------------------------------- pages

export function pCover(d, s, p) {
  let y = p.y + p.h * 0.16;
  y = heading(d, s, p.x, y, 'The Year', 1);
  d.line(p.x, y + 1.2, p.x + p.w, y + 1.2, LINE);
  para(d, s, p.x, y + 2.6, p.w,
    'Every day, six habits, everything watched');
  const bh = s.h2 * 1.9;
  d.text(p.x, p.y + p.h - bh - 2.2, 'Year', { size: s.small, color: '#666' });
  d.rect(p.x, p.y + p.h - bh, p.w, bh, LINE);
}

export function pGlance(d, s, p) {
  // turned: the pad already arrives rotated, so its width is the page depth
  const w = p.w;
  const h = p.h;
  const lab = s.glance_lab;
  const cell = (w - lab) / 31;
  let y = heading(d, s, 0, 0, 'Every day of the year', 2);
  const used = 12 * cell + Math.max(2.6, cell * 0.8);
  y += Math.max(0, (h - used - y - 6.5) / 2);
  const end = yearGrid(d, s, 0, y, cell, lab);
  legend(d, s, 0, end + 2.6, [
    ['f', 'Good day'], ['e', 'Bad, or not logged'], ['d', 'No such date'],
    ['l', '29 Feb — shade out in a common year'],
  ]);
}

function legend(d, s, x, y, items) {
  const k = 2.6;
  let cx = x;
  for (const [kind, text] of items) {
    const o = kind === 'f' ? { fill: INK, color: RULE, w: 0.141 }
      : kind === 'd' ? { fill: GREY, color: RULE, w: 0.141 }
        : kind === 'l' ? { color: '#9a9a9a', w: 0.141, dash: 0.25 }
          : { color: RULE, w: 0.141 };
    d.rect(cx, y - k + 0.3, k, k, o);
    d.text(cx + k + 0.8, y, text, { size: s.small });
    cx += k + 1.2 + textWidth(text, 'helv', s.small) + 3.2;
  }
}

export function pHabits(d, s, p, n, first) {
  const lab = s.habit_lab;
  const cell = (p.w - lab) / 31;
  let y = p.y;
  if (first) {
    y = heading(d, s, p.x, y, 'The year in habits', 2);
    y = para(d, s, p.x, y + 0.6, p.w,
      'Name six of your own. One square a day, the same grid as the year '
      + 'page.');
  } else {
    y = heading(d, s, p.x, y, 'Habits, continued', 3);
  }
  const blockH = 12 * cell + Math.max(2.4, cell * 0.62) + 5.4;
  const gap = Math.max(1.5, (p.y + p.h - y - n * blockH) / (n + 0.5));
  for (let i = 0; i < n; i += 1) {
    y += gap;
    writeLine(d, p.x, y + 1.2, p.w * 0.62);         // the blank name rule
    const end = yearGrid(d, s, p.x, y + 2.4, cell, lab);
    d.text(p.x + p.w, end + s.small * PT + 0.6, 'total ______ / 365',
      { size: s.small, color: '#666', align: 'r' });
    y = end + s.small * PT + 1.4;
  }
}

export function pFilms(d, s, p, months, part, parts) {
  const w = p.w;                       // turned: width is the page depth
  const h = p.h;
  const n = months.length;
  const colw = w / n;
  const rows = s.film_rows;
  let y = 0;
  if (part === 1) {
    y = heading(d, s, 0, y, 'Films and shows', 2);
    y = para(d, s, 0, y + 0.4, w,
      'One title per box, stacked up from the bottom of the month you '
      + 'started it. Start the line with F or T for a film or a series; the '
      + 'count for the month goes in the box under the axis.');
  } else {
    y = heading(d, s, 0, y, `Films and shows — ${months[0]} to `
      + `${months[n - 1]}`, 3);
  }
  y += 1.5;
  const labels = s.w > 100 ? 4.6 : 3.8;
  const count = s.w > 100 ? 5.0 : 4.2;
  const boxh = (h - y - labels - count - 7) / rows;
  const top = y;
  const bottom = top + boxh * rows;

  for (let r = 0; r <= rows; r += 1) {
    d.line(0, top + r * boxh, w, top + r * boxh, HAIR);
  }
  for (let c = 0; c <= n; c += 1) {
    d.line(c * colw, top, c * colw, bottom, HAIR);
  }
  d.line(0, bottom, w, bottom, { color: INK, w: 0.247 });

  for (let c = 0; c < n; c += 1) {
    d.text((c + 0.5) * colw, bottom + labels - 0.8, months[c],
      { size: s.small, color: '#555', align: 'c' });
    d.rect(c * colw, bottom + labels, colw, count, HAIR);
  }
  d.text(0, bottom + labels + count + s.small * PT + 1.4,
    parts > 1 ? 'Total for these six months ______'
      : 'Total for the year ______', { size: s.small, color: '#666' });
}

export function pNotes(d, s, p) {
  const gap = s.w > 100 ? 6.2 : 5.0;
  const y0 = heading(d, s, p.x, p.y, 'Notes', 3) + 1.5;
  const n = Math.floor((p.y + p.h - y0) / gap);
  for (let i = 1; i <= n; i += 1) {
    d.line(p.x, y0 + i * gap, p.x + p.w, y0 + i * gap,
      { color: '#cfcfcf', w: 0.141 });
  }
}

export function pDots(d, s, p) {
  const gap = 5.0;
  const nx = Math.floor(p.w / gap);
  const ny = Math.floor(p.h / gap);
  const ox = p.x + (p.w - (nx - 1) * gap) / 2;
  const oy = p.y + (p.h - (ny - 1) * gap) / 2;
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < ny; j += 1) {
      d.dot(ox + i * gap, oy + j * gap, 0.16,
        { fill: '#b0b0b0', color: null });
    }
  }
}

export function pBlank() { /* deliberately nothing */ }

// ---------------------------------------------------------------- sudoku

export const PUZZLE_GRADES = SUD.GRADE_NAMES;
export { newSeed } from './sudoku.js';

/** `n` puzzles for a seed, cycling the chosen grades. Generated here and
    now — a different seed is a genuinely different set. */
export function pickPuzzles(n, grades, seed) {
  return SUD.series(seed || 'year-book', n, grades);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
  'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

function roman(n) {
  if (n < ROMAN.length) return ROMAN[n];
  let v = n;
  let out = '';
  for (const [sym, val] of [['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]]) {
    while (v >= val) { out += sym; v -= val; }
  }
  return out;
}

/** How a puzzle is labelled: 1, No. 1, or I. */
export function puzzleLabel(n, style) {
  if (style === 'no') return `No. ${n}`;
  if (style === 'roman') return roman(n);
  return String(n);
}

const FACES = {
  sans: { body: 'helv', bold: 'helvB' },
  serif: { body: 'times', bold: 'timesB' },
  mono: { body: 'cour', bold: 'courB' },
};

const faceOf = (k) => FACES[k] || FACES.sans;

function sudokuFrame(d, x, y, side, clues, face = 'sans') {
  const c = side / 9;
  for (let i = 0; i <= 9; i += 1) {
    const heavy = i % 3 === 0;
    const o = heavy ? { color: INK, w: 0.247 } : { color: RULE, w: 0.106 };
    d.line(x, y + i * c, x + side, y + i * c, o);
    d.line(x + i * c, y, x + i * c, y + side, o);
  }
  if (!clues) return;
  const fs = Math.max(3.4, Math.min(11, c / PT * 0.55));
  for (let i = 0; i < 81; i += 1) {
    const v = clues[i];
    if (v === '0') continue;
    const r = Math.floor(i / 9);
    const k = i % 9;
    d.text(x + (k + 0.5) * c, y + (r + 0.5) * c + fs * PT * 0.36, v,
      { font: faceOf(face).bold, size: fs, align: 'c' });
  }
}

export function pSudoku(d, s, p, puzzles, startNo, opt = {}) {
  const nUp = puzzles.length;
  const big = s.w > 100;
  const hdr = s.h3 * PT + 1.6;
  const lineGap = big ? 4.6 : 3.8;
  const lines = opt.working ? (big ? 3 : 2) : 0;
  const foot = lines ? lines * lineGap + 2 : 0;
  const side = Math.min(p.w, (p.h - nUp * (hdr + foot) - 6) / nUp);
  const gap = Math.max(0.6, (p.h - nUp * (side + hdr + foot) - 3) / (nUp * 2));
  const x = p.x + (p.w - side) / 2;
  let y = p.y;
  puzzles.forEach((pz, i) => {
    y += gap;
    heading(d, s, x, y,
      `${puzzleLabel(startNo + i, opt.numbering)} · ${pz.grade}`, 3,
      faceOf(opt.face).bold);
    const base = y + s.h3 * PT;
    if (!opt.noTimer) {
      const rule = side * 0.26;
      d.text(x + side - rule - 0.8, base, opt.date ? 'date' : 'time',
        { size: s.small, color: '#666', align: 'r' });
      writeLine(d, x + side - rule, base + 0.5, rule);
    }
    y = base + 1.6;
    sudokuFrame(d, x, y, side, pz.puzzle, opt.face);
    y += side;
    for (let k = 1; k <= lines; k += 1) {
      d.line(x, y + 1.6 + k * lineGap, x + side, y + 1.6 + k * lineGap,
        { color: '#d8d8d8', w: 0.106 });
    }
    y += foot + gap;
  });
}

export function pSudokuCover(d, s, p, title, subtitle, o = {}) {
  let y = p.y + p.h * 0.11;
  y = heading(d, s, p.x, y, title, 1);
  d.line(p.x, y + 1.2, p.x + p.w, y + 1.2, LINE);
  y = para(d, s, p.x, y + 2.6, p.w, subtitle);
  // an empty grid as the device, sized off the page like everything else
  const side = p.w * 9 / 11;
  const bh = s.h2 * 1.5;
  const gy = y + (p.y + p.h - bh - 4 - y - side) / 2;
  sudokuFrame(d, p.x + (p.w - side) / 2, gy, side, null, o.face);
  d.text(p.x, p.y + p.h - bh - 2.2, 'Started',
    { size: s.small, color: '#666' });
  d.rect(p.x, p.y + p.h - bh, p.w, bh, LINE);
}

export function pSudokuAnswers(d, s, p, puzzles, startNo, opt = {}) {
  const cols = 2;
  const rows = Math.ceil(puzzles.length / cols);
  let y = heading(d, s, p.x, p.y, 'Sudoku — answers', 3) + 1.5;
  const side = Math.min((p.w - 5) / cols,
    (p.y + p.h - y - rows * 4.0) / rows);
  const fs = Math.max(2.8, Math.min(7, side / 9 / PT * 0.55));
  puzzles.forEach((pz, i) => {
    const cx = p.x + (i % cols) * (side + 5);
    const cy = y + Math.floor(i / cols) * (side + 4);
    d.text(cx, cy + s.small * PT,
      `${puzzleLabel(startNo + i, opt.numbering)} · ${pz.grade}`,
      { size: s.small, color: '#666' });
    const gy = cy + s.small * PT + 1.0;
    const c = side / 9;
    for (let k = 0; k <= 9; k += 1) {
      const heavy = k % 3 === 0;
      const o = heavy ? { color: INK, w: 0.176 } : { color: '#cfcfcf', w: 0.09 };
      d.line(cx, gy + k * c, cx + side, gy + k * c, o);
      d.line(cx + k * c, gy, cx + k * c, gy + side, o);
    }
    for (let k = 0; k < 81; k += 1) {
      d.text(cx + ((k % 9) + 0.5) * c,
        gy + (Math.floor(k / 9) + 0.5) * c + fs * PT * 0.36, pz.solution[k],
        { size: fs, color: '#555', align: 'c', font: faceOf(opt.face).body });
    }
  });
}

// ---------------------------------------------------------- world time chart

const offsetLabel = (v) => {
  if (v === 0) return '0';
  const sign = v > 0 ? '+' : '−';
  const h = Math.floor(Math.abs(v));
  const m = Math.round((Math.abs(v) - h) * 60);
  return `${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
};

const clock = (utc, off) => {
  const t = ((utc + off) % 24 + 24) % 24;
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// the base city reads from the left-hand column; the rest run across
const baseCity = () => CITIES.find((c) => c[0] === BASE) || CITIES[0];
const cityList = () => CITIES.filter((c) => c[0] !== BASE);

function worldMap(d, s, x, y, w) {
  const h = w / 2;
  const sx = w / 360;
  const sy = h / 180;
  d.rect(x, y, w, h, { fill: '#fafafa', color: null });
  for (let k = 0; k < 24; k += 2) {
    d.rect(x + k * 15 * sx, y, 15 * sx, h, { fill: '#eeeeee', color: null });
  }
  for (let k = 0; k <= 24; k += 1) {
    const gx = x + k * 15 * sx;
    d.line(gx, y, gx, y + h,
      k === 12 ? { color: INK, w: 0.09 } : { color: '#c6c6c6', w: 0.05 });
  }
  d.save();
  d.clip(x, y, w, h);
  for (const ring of POLYS) {
    const pts = [];
    for (let i = 0; i < ring.length; i += 2) {
      pts.push([x + (ring[i] + 180) * sx, y + (90 - ring[i + 1]) * sy]);
    }
    d.poly(pts, { color: INK, w: 0.08 });
  }
  d.restore();

  // the dot radius and the label nudges in CITIES are millimetres, matching
  // the Python SVG whose user unit is a millimetre
  const mm = s.w > 100 ? 2.6 : 2.1;        // label height in millimetres
  const fs = mm / PT;
  for (const [name, , lon, lat, , anchor, dx, dy] of CITIES) {
    const cx = x + (lon + 180) * sx;
    const cy = y + (90 - lat) * sy;
    const home = name === BASE;
    d.dot(cx, cy, home ? (s.w > 100 ? 0.75 : 0.62)
      : (s.w > 100 ? 0.55 : 0.45),
    { fill: home ? '#ffffff' : INK, color: INK, w: home ? 0.1 : 0.07 });
    d.text(cx + dx, cy + dy, name, {
      size: fs,
      align: anchor === 'end' ? 'r' : 'l',
      halo: mm * 0.11,
    });
  }
  d.rect(x, y, w, h, { color: INK, w: 0.106 });
  return y + h;
}

function zoneList(d, s, x, y, w, free) {
  const cols = free / ZONES.length >= 4.0 ? 1 : 2;
  const per = Math.ceil(ZONES.length / cols);
  const rh = Math.min(5.4, free / per);
  const fs = Math.max(3.0, Math.min(s.small, rh / PT * 0.55));
  const colw = (w - (cols > 1 ? 4 : 0)) / cols;
  const lab = cols === 1 ? 7.0 : 5.6;
  for (let c = 0; c < cols; c += 1) {
    const cx = x + c * (colw + 4);
    ZONES.slice(c * per, (c + 1) * per).forEach(([off, where], i) => {
      const yy = y + i * rh;
      d.text(cx + lab, yy + rh - rh * 0.28, offsetLabel(off),
        { font: 'helvB', size: fs, align: 'r' });
      d.text(cx + lab + 1.2, yy + rh - rh * 0.28, where,
        { size: fs, color: '#444' });
      d.line(cx, yy + rh, cx + colw, yy + rh, { color: '#e4e4e4', w: 0.09 });
    });
  }
}

export function pTimeMap(d, s, p) {
  let y = heading(d, s, p.x, p.y, 'World time chart', 2);
  y = para(d, s, p.x, y + 0.4, p.w,
    `Hours from UTC, read across. The ring marks ${BASE}, which the table `
    + 'reads from.') + 1.6;

  const fs = Math.max(3.2, Math.min(5.4, p.w / 24 / PT * 0.6));
  for (let k = 0; k < 24; k += 1) {
    const off = k - 11;
    if (off % 2) continue;
    d.text(p.x + (k + 0.5) * (p.w / 24), y, offsetLabel(off),
      { size: fs, color: off === 0 ? '#333' : '#777', align: 'c' });
  }
  y += 0.8;
  const end = worldMap(d, s, p.x, y, p.w);
  const after = para(d, s, p.x, end + 1.6, p.w,
    'Standard time. Much of Europe and North America goes an hour forward '
    + 'in summer; India, the Gulf and most of Asia never do.') + 1.4;
  zoneList(d, s, p.x, after, p.w, p.y + p.h - after - 1.5);
}

export function pTimeTable(d, s, p) {
  const cs = cityList();
  const [bname, bshort, , , boff] = baseCity();
  const big = s.w > 100;
  let y = heading(d, s, p.x, p.y, 'What time is it where', 3);
  y = para(d, s, p.x, y + 0.4, p.w,
    `Find the hour in the ${bname} column and read across.`) + 1.6;

  const lab = big ? 15 : 12;
  const colw = (p.w - lab) / cs.length;
  const tblHead = big ? 7.0 : 5.5;
  const rh = Math.max(2.8, (p.y + p.h - y - tblHead - 3) / 24);
  // as large as both the column and the row allow, capped at body size
  const fs = Math.max(3.2,
    Math.min(s.base, (colw - 1.0) / 0.883, rh / PT * 0.55));
  const head = Math.min(s.small, fs);

  const col = (cx, name, off) => {
    const words = name.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (textWidth(t, 'helvB', head) > colw - 0.6 && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    const lh = head * PT * 1.1;
    lines.forEach((ln, k) => {
      d.text(cx, y + tblHead - 1.6 - (lines.length - k) * lh, ln,
        { font: 'helvB', size: head, align: cx === p.x ? 'l' : 'c' });
    });
    d.text(cx, y + tblHead - 1.6, offsetLabel(off),
      { size: head, color: '#777', align: cx === p.x ? 'l' : 'c' });
  };

  col(p.x, big ? bname : bshort, boff);
  cs.forEach(([name, short, , , off], i) => {
    col(p.x + lab + (i + 0.5) * colw, big ? name : short, off);
  });

  const top = y + tblHead;
  d.line(p.x, top, p.x + p.w, top, { color: INK, w: 0.212 });

  for (let k = 0; k < 24; k += 1) {
    const ry = top + k * rh;
    if (k % 2) d.rect(p.x, ry, p.w, rh, { fill: '#f6f6f6', color: null });
    d.line(p.x, ry, p.x + p.w, ry, { color: '#dcdcdc', w: 0.106 });
    const base = ry + rh / 2 + fs * PT * 0.36;
    d.text(p.x, base, clock(k - boff, boff), { font: 'helvB', size: fs });
    cs.forEach(([, , , , off], i) => {
      const t = clock(k - boff, off);
      const mark = t.startsWith('00') || t.startsWith('12');
      d.text(p.x + lab + (i + 0.5) * colw, base, t,
        { size: fs, align: 'c', font: mark ? 'helvB' : 'helv',
          color: mark ? INK : '#444' });
    });
  }
  d.line(p.x, top + 24 * rh, p.x + p.w, top + 24 * rh,
    { color: '#dcdcdc', w: 0.106 });
}

// ---------------------------------------------------------------- the guide

export function pGuide(d, s, p, size, n, part) {
  const land = size === 'regular';
  const folded = n / 4;
  const papers = land ? folded : Math.ceil(folded / 2);
  const g = A4[size];

  if (part === 1) {
    let y = heading(d, s, p.x, p.y, 'Printing and folding', 2) + 1.4;
    const steps = [
      ['Print', `A4, ${land ? 'landscape' : 'portrait'}, 100% / Actual size `
        + `(never Fit to page), double-sided, flipping on the `
        + `${land ? 'short' : 'long'} edge. ${papers} sheet`
        + `${papers === 1 ? '' : 's'} of paper come`
        + `${papers === 1 ? 's' : ''} out.`],
      ['Check', 'Hold a sheet up to the light. The back of page 1 must be '
        + 'page 2, the same way up. If not, your printer flipped on the '
        + 'other edge — change that setting and print again.'],
      ['Cut', land
        ? 'Trim the two dashed lines, one down each side. Nothing to trim '
          + 'top or bottom — the insert is exactly A4 height.'
        : 'Trim two down the sides and four across, which also separates '
          + 'the two folded sheets on each piece of paper.'],
      ['Fold', `Fold each sheet down the dashed centre line. Sheet one folds `
        + `with pages 1 and ${n} outside`
        + (folded > 1 ? `, sheet two with 3 and ${n - 2}, and so on inwards.`
          : '.')],
    ];
    if (folded > 1) {
      steps.push(['Nest', 'Lay each sheet inside the one before it. Thumb '
        + `through: the numbers should run 1 to ${n}.`]);
    }
    steps.push(['Bind', 'Two staples through the fold, or punch three holes '
      + 'on the fold for the notebook\'s elastic.']);

    const numw = 5;
    const tw = s.w > 100 ? 13 : 11;
    for (let i = 0; i < steps.length; i += 1) {
      d.line(p.x, y, p.x + p.w, y, HAIR);
      const ty = y + 1.6 + s.small * PT;
      d.text(p.x + numw / 2, ty, String(i + 1),
        { font: 'helvB', size: s.small, color: '#aaa', align: 'c' });
      d.text(p.x + numw, ty, steps[i][0], { font: 'helvB', size: s.small });
      const end = para(d, s, p.x + numw + tw, y + 1.6,
        p.w - numw - tw, steps[i][1], { color: '#333' });
      y = Math.max(end, ty) + 1.6;
    }
    d.line(p.x, y, p.x + p.w, y, HAIR);
    if (s.w > 100) {
      y = heading(d, s, p.x, y + 3, 'What goes where', 3) + 1.2;
      y = a4Diagram(d, s, p.x, y, p.w, size, n) + 2.5;
      measurements(d, s, p.x, y, p.w, size, n, g);
    }
    return;
  }

  let y = heading(d, s, p.x, p.y, 'What goes where', 3) + 1.2;
  y = a4Diagram(d, s, p.x, y, p.w, size, n) + 3;
  y = measurements(d, s, p.x, y, p.w, size, n, g) + 3;
  y = heading(d, s, p.x, y, 'If it comes out wrong', 3) + 1;
  para(d, s, p.x, y, p.w,
    'Backs mismatched means the wrong duplex flip edge. Right order but the '
    + 'wrong size means something scaled the print — set it back to 100%.');
}

function measurements(d, s, x, y, w, size, n, g) {
  const mm = (v) => `${Math.round(v * 10) / 10}`;
  const rows = [
    ['Insert page', `${mm(g.pw)} × ${mm(g.ph)} mm`],
    ['Folded sheet', `${mm(g.pw * 2)} × ${mm(g.ph)} mm`],
    ['Cut in from each side', `${mm(g.x0)} mm`],
  ];
  if (size === 'regular') {
    rows.push(['Cut top or bottom', 'nothing — it is A4 height']);
  } else {
    rows.push(['Cut across, from the top',
      `${mm(g.ytop)}, ${mm(g.ytop + g.ph)}, ${mm(g.ybot)} and `
      + `${mm(g.ybot + g.ph)} mm`]);
  }
  rows.push(['Pages', `${n}, on ${n / 4} folded sheet${n === 4 ? '' : 's'}`]);

  let yy = heading(d, s, x, y, 'Measurements', 3) + 1.2;
  const lw = s.w > 100 ? 34 : 26;
  for (const [k, v] of rows) {
    d.line(x, yy, x + w, yy, HAIR);
    const ty = yy + 1.4 + s.small * PT;
    d.text(x, ty, k, { size: s.small, color: '#444' });
    const end = para(d, s, x + lw, yy + 1.4, w - lw, v,
      { color: INK, font: 'helvB' });
    yy = Math.max(end, ty) + 1.4;
  }
  d.line(x, yy, x + w, yy, HAIR);
  return yy;
}

export function imposition(n) {
  const out = [];
  for (let i = 0; i < n / 4; i += 1) {
    out.push([n - 2 * i, 1 + 2 * i]);
    out.push([2 + 2 * i, n - 1 - 2 * i]);
  }
  return out;
}

function a4Diagram(d, s, x, y, w, size, n) {
  const sides = imposition(n);
  const land = size === 'regular';
  const folded = n / 4;
  const groups = [];
  const labels = [];
  if (land) {
    sides.forEach((sd, j) => {
      groups.push([sd]);
      labels.push(`Sheet ${Math.floor(j / 2) + 1} `
        + `${j % 2 === 0 ? 'front' : 'back'}`);
    });
  } else {
    for (let p = 0; p < folded; p += 2) {
      for (const off of [0, 1]) {
        const g = [sides[2 * p + off]];
        if (p + 1 < folded) g.push(sides[2 * (p + 1) + off]);
        groups.push(g);
        labels.push(`A4 ${folded > 2 ? `${p / 2 + 1} ` : ''}`
          + `${off === 0 ? 'front' : 'back'}`);
      }
    }
  }

  const perRow = 2;
  const bw = (w - 4) / perRow;
  const bh = land ? bw * 210 / 297 : bw * 297 / 210;
  const fs = s.w > 100 ? 3.6 : 2.9;
  let yy = y;
  groups.forEach((g, i) => {
    const cx = x + (i % perRow) * (bw + 4);
    const cy = y + Math.floor(i / perRow) * (bh + 4.5 + s.small * PT);
    d.rect(cx, cy, bw, bh, { fill: '#fafafa', color: '#d6d6d6', w: 0.106 });
    d.line(cx + bw * 0.08, cy, cx + bw * 0.08, cy + bh,
      { color: '#9a9a9a', w: 0.09, dash: 0.5 });
    d.line(cx + bw * 0.92, cy, cx + bw * 0.92, cy + bh,
      { color: '#9a9a9a', w: 0.09, dash: 0.5 });
    const m = g.length;
    g.forEach(([l, r], k) => {
      const ph = bh / m - (m > 1 ? 3 : 0);
      const py = cy + (k * bh) / m + (m > 1 ? 1.5 : 0);
      const px = cx + bw * 0.08;
      const pw = bw * 0.84;
      d.rect(px, py, pw, ph, { color: '#9a9a9a', w: 0.106 });
      d.line(px + pw / 2, py, px + pw / 2, py + ph,
        { color: INK, w: 0.09, dash: 0.5 });
      d.text(px + pw * 0.25, py + ph / 2 + fs * PT * 0.36, String(l),
        { size: fs, color: '#555', align: 'c' });
      d.text(px + pw * 0.75, py + ph / 2 + fs * PT * 0.36, String(r),
        { size: fs, color: '#555', align: 'c' });
    });
    d.text(cx + bw / 2, cy + bh + s.small * PT + 0.8, labels[i],
      { size: s.small, color: '#666', align: 'c' });
    yy = Math.max(yy, cy + bh + s.small * PT + 1.4);
  });
  return yy;
}

export { SIZES };
