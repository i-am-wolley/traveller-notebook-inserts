// The sudoku book page: a fuller set of controls over one kind of booklet.
// It reuses the same expansion, imposition and PDF writer as the booklet
// builder — only the way you drive it is different.

import {
  SIZES, expand, readingPdf, imposedPdf, previewPage, summary,
} from './booklet.js';
import { PUZZLE_GRADES, newSeed } from './pages.js';

const $ = (id) => document.getElementById(id);

const state = {
  size: 'regular',
  grades: [...PUZZLE_GRADES],
  count: 24,
  oneUp: false,
  numbering: 'plain',
  face: 'sans',
  cover: true,
  answers: true,
  guide: true,
  working: false,
  date: false,
  noTimer: false,
  title: '',
  seed: newSeed(),
  fill: 'notes',
  sel: 0,
  pages: [],
};

// ---------------------------------------------------------------- controls

function segmented(host, options, get, set) {
  host.innerHTML = '';
  for (const [value, label, note] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(get() === value));
    b.innerHTML = `<b>${label}</b>${note ? `<span>${note}</span>` : ''}`;
    b.onclick = () => { set(value); render(); };
    host.appendChild(b);
  }
}

function drawControls() {
  segmented($('c-size'), [
    ['regular', 'Regular', '110 × 210 mm'],
    ['passport', 'Passport', '89 × 124 mm'],
  ], () => state.size, (v) => { state.size = v; state.sel = 0; });

  segmented($('c-numbering'), [
    ['plain', '1', 'plain'],
    ['no', 'No. 1', 'classic'],
    ['roman', 'I', 'roman'],
  ], () => state.numbering, (v) => { state.numbering = v; });

  segmented($('c-face'), [
    ['sans', 'Sans', 'Helvetica'],
    ['serif', 'Serif', 'Times'],
    ['mono', 'Mono', 'Courier'],
  ], () => state.face, (v) => { state.face = v; });

  segmented($('c-fill'), [
    ['blank', 'Blank', ''],
    ['notes', 'Ruled', ''],
    ['dots', 'Dots', ''],
  ], () => state.fill, (v) => { state.fill = v; });
}

function drawGrades() {
  const host = $('c-grades');
  host.innerHTML = '';
  for (const g of PUZZLE_GRADES) {
    const lab = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.grades.includes(g);
    cb.onchange = () => {
      const on = PUZZLE_GRADES.filter((x) => (x === g ? cb.checked
        : state.grades.includes(x)));
      if (!on.length) { cb.checked = true; return; }   // never none
      state.grades = on;
      render();
    };
    lab.append(cb, document.createTextNode(` ${g}`));
    host.appendChild(lab);
  }
}

// ---------------------------------------------------------------- booklet

function items() {
  const per = state.oneUp ? 1 : SIZES[state.size].sudoku_per_page;
  const pages = Math.max(1, Math.ceil(state.count / per));
  const opt = {
    grades: state.grades,
    oneUp: state.oneUp,
    numbering: state.numbering,
    face: state.face,
    working: state.working,
    date: state.date && !state.noTimer,
    noTimer: state.noTimer,
    title: state.title,
    seed: state.seed,
  };
  const out = [];
  if (state.cover) out.push({ type: 'sudoku-cover', n: 1, opt });
  for (let i = 0; i < pages; i += 1) out.push({ type: 'sudoku', n: 1, opt });
  if (state.answers) out.push({ type: 'answers', n: 1, opt });
  if (state.guide) out.push({ type: 'guide', n: 1, opt: {} });
  return out;
}

function facts() {
  const n = state.pages.length;
  const folded = n / 4;
  const paper = state.size === 'regular' ? folded : Math.ceil(folded / 2);
  const per = state.oneUp ? 1 : SIZES[state.size].sudoku_per_page;
  const puzzles = Math.ceil(state.count / per) * per;
  const spare = state.pages.filter((p) => p.auto).length;
  return [
    ['Puzzles', `${puzzles}`],
    ['Pages', `${n}`],
    ['Folded sheets', `${folded}`],
    ['A4 to print', `${paper}, both sides`],
    ['Duplex flip', state.size === 'regular' ? 'short edge' : 'long edge'],
    ['Spare pages', spare ? `${spare}` : 'none'],
  ];
}

// ---------------------------------------------------------------- render

function render() {
  state.pages = expand(state.size, items(), state.fill);
  drawControls();
  $('c-count').textContent = state.count;
  $('c-less').disabled = state.count <= 1;
  $('c-more').disabled = state.count >= 200;

  $('facts').innerHTML = facts()
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

  const why = summary(state.pages.map((p) => (p.auto
    ? { kind: 'fill', why: p.why } : { kind: 'page' })));
  $('dlnote').textContent = why.size
    ? [...why].map(([t, k]) => `${k} spare ${k === 1 ? 'page' : 'pages'}: ${t}`)
      .join('. ')
    : 'No spare pages needed — it comes out a multiple of four on its own.';

  drawPreview();
}

function drawPreview() {
  const c = $('preview');
  const s = SIZES[state.size];
  state.sel = Math.min(Math.max(0, state.sel), state.pages.length - 1);
  c.style.aspectRatio = `${s.w} / ${s.h}`;
  previewPage(c, state.size, state.pages, state.sel,
    Math.min(3, window.devicePixelRatio || 1));
  $('pvlabel').textContent = `Page ${state.sel + 1} of ${state.pages.length}`
    + ` — ${state.pages[state.sel].label}`;
  $('pvnote').textContent = state.pages[state.sel].why || '';
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const stem = () => {
  const t = (state.title || 'sudoku').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sudoku';
  return `${t}-${state.size}-${state.seed}`;
};

// ---------------------------------------------------------------- wiring

drawGrades();

$('c-less').onclick = () => { state.count = Math.max(1, state.count - 2);
  render(); };
$('c-more').onclick = () => { state.count = Math.min(200, state.count + 2);
  render(); };

for (const [id, key] of [['c-oneup', 'oneUp'], ['c-cover', 'cover'],
  ['c-answers', 'answers'], ['c-guide', 'guide'], ['c-working', 'working'],
  ['c-date', 'date'], ['c-nothing', 'noTimer']]) {
  $(id).onchange = () => {
    state[key] = $(id).checked;
    if (key === 'noTimer' && $(id).checked) {
      state.date = false;
      $('c-date').checked = false;
    }
    if (key === 'date' && $(id).checked) {
      state.noTimer = false;
      $('c-nothing').checked = false;
    }
    render();
  };
}

$('c-title').oninput = () => { state.title = $('c-title').value.trim();
  render(); };
$('c-seed').value = state.seed;
$('c-seed').oninput = () => { state.seed = $('c-seed').value.trim() || 'x';
  render(); };
$('c-newseed').onclick = () => {
  state.seed = newSeed();
  $('c-seed').value = state.seed;
  render();
};

$('prev').onclick = () => { state.sel -= 1; drawPreview(); };
$('next').onclick = () => { state.sel += 1; drawPreview(); };
$('dl-print').onclick = () => save(
  imposedPdf(state.size, state.pages).blob(), `${stem()}-A4.pdf`);
$('dl-read').onclick = () => save(
  readingPdf(state.size, state.pages).blob(), `${stem()}.pdf`);

window.addEventListener('resize', () => drawPreview());

render();
