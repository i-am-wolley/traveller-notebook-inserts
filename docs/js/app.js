// The booklet builder UI: choose a size, pick inserts, drag them into order,
// preview any page, and download either PDF.

import {
  CATALOGUE, SIZES, byId, expand, readingPdf, imposedPdf, previewPage,
  summary,
} from './booklet.js';
import { PUZZLE_GRADES, newSeed } from './pages.js';

const PRESETS = {
  year: {
    name: 'year-book',
    items: ['cover', 'glance', 'habits', 'habits', 'films', 'timezone',
      'sudoku', 'sudoku', 'answers', 'guide'].map((t) => ({ type: t })),
    fill: 'notes',
  },
  sudoku: {
    name: 'sudoku',
    items: [
      { type: 'sudoku-cover' },
      ...Array.from({ length: 12 }, () => ({ type: 'sudoku' })),
      { type: 'answers' },
      { type: 'guide' },
    ],
    fill: 'notes',
  },
  pocket: {
    name: 'pocket-kit',
    items: [{ type: 'cover' }, { type: 'timezone' },
      { type: 'sudoku' }, { type: 'sudoku' }, { type: 'answers' },
      { type: 'notes' }, { type: 'dots' }, { type: 'guide' }],
    fill: 'blank',
  },
};

const state = {
  size: 'regular',
  items: [],
  sel: 0,
  pages: [],
  fill: 'notes',
  name: 'year-book',
  // one set of puzzle settings for the whole booklet, not per page
  sudoku: { grades: [...PUZZLE_GRADES], oneUp: false, working: false,
    date: false, title: '', seed: newSeed() },
};

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- size

function drawSizes() {
  $('sizes').innerHTML = '';
  for (const key of ['regular', 'passport']) {
    const s = SIZES[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.size === key));
    const scale = 46 / 210;
    b.innerHTML = `<span class="chip" style="width:${s.w * scale}px;`
      + `height:${s.h * scale}px"></span><span><b>`
      + `${key[0].toUpperCase()}${key.slice(1)}</b>`
      + `<small>${s.w} × ${s.h} mm</small></span>`;
    b.onclick = () => {
      if (state.size === key) return;
      state.size = key;
      state.sel = 0;
      render();
    };
    $('sizes').appendChild(b);
  }
}

// ---------------------------------------------------------------- catalogue

function drawCatalogue() {
  const box = $('catalogue');
  box.innerHTML = '';
  for (const def of CATALOGUE) {
    const b = document.createElement('button');
    b.type = 'button';
    const tag = def.last ? 'always last'
      : def.spread ? 'spread' : def.repeat ? 'repeatable' : '';
    b.innerHTML = `${tag ? `<span class="tag">${tag}</span>` : ''}`
      + `<b>${def.name}</b><span>${def.blurb}</span>`;
    b.onclick = () => add(def.id);
    box.appendChild(b);
  }
}

function add(id) {
  const def = byId(id);
  if (def.last || !def.repeat) {
    const at = state.items.findIndex((i) => i.type === id);
    if (at >= 0 && !def.repeat) return;        // only one of these makes sense
  }
  state.items.push({ type: id, n: 1 });
  render();
}

// ---------------------------------------------------------------- list

let dragFrom = null;

function drawList() {
  const ol = $('booklet');
  ol.innerHTML = '';
  if (!state.pages.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Nothing picked yet — add some inserts above.';
    ol.appendChild(d);
    return;
  }

  state.pages.forEach((pg, i) => {
    const li = document.createElement('li');
    li.className = (pg.auto ? 'auto ' : '') + (i === state.sel ? 'sel' : '');
    const owner = pg.owner === undefined ? null : pg.owner;
    if (!pg.auto && owner !== null) {
      li.draggable = true;
      li.ondragstart = () => { dragFrom = owner; li.classList.add('drag'); };
      li.ondragend = () => li.classList.remove('drag');
      li.ondragover = (e) => { e.preventDefault(); li.classList.add('over'); };
      li.ondragleave = () => li.classList.remove('over');
      li.ondrop = (e) => {
        e.preventDefault();
        li.classList.remove('over');
        move(dragFrom, owner);
      };
    }
    li.innerHTML = `<span class="pg">${i + 1}</span>`
      + `<span class="nm">${pg.label}${pg.turned ? ' ·<i> turned</i>' : ''}`
      + '</span>';
    if (!pg.auto && owner !== null) {
      li.appendChild(btn('↑', 'Move up', () => move(owner, owner - 1)));
      li.appendChild(btn('↓', 'Move down', () => move(owner, owner + 1)));
      li.appendChild(btn('✕', 'Remove', () => {
        state.items.splice(owner, 1);
        render();
      }));
    }
    li.addEventListener('click', (e) => {
      if (e.target.closest('.act')) return;
      state.sel = i;
      render();
    });
    ol.appendChild(li);
  });
}

function btn(label, title, fn) {
  const b = document.createElement('button');
  b.className = 'act';
  b.type = 'button';
  b.title = title;
  b.textContent = label;
  b.onclick = (e) => { e.stopPropagation(); fn(); };
  return b;
}

function move(from, to) {
  if (from === null || to === null) return;
  if (to < 0 || to >= state.items.length || from === to) return;
  const [it] = state.items.splice(from, 1);
  state.items.splice(to, 0, it);
  render();
}

// ---------------------------------------------------------------- preview

function drawPreview() {
  const c = $('preview');
  if (!state.pages.length) {
    const ctx = c.getContext('2d');
    c.width = 10; c.height = 14;
    ctx.clearRect(0, 0, 10, 14);
    $('pvlabel').textContent = '—';
    $('pvnote').textContent = '';
    return;
  }
  state.sel = Math.min(state.sel, state.pages.length - 1);
  const s = SIZES[state.size];
  c.style.aspectRatio = `${s.w} / ${s.h}`;
  previewPage(c, state.size, state.pages, state.sel,
    Math.min(3, window.devicePixelRatio || 1));
  $('pvlabel').textContent =
    `Page ${state.sel + 1} of ${state.pages.length} — `
    + `${state.pages[state.sel].label}`;
  $('pvnote').textContent = state.pages[state.sel].turned
    ? 'Turned a quarter turn: read it by turning the notebook clockwise.'
    : '';
}

// ---------------------------------------------------------------- download

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

function stamp() {
  const n = state.pages.length;
  return `${state.name}-${state.size}-${n}pp`;
}

// ---------------------------------------------------------------- render

function render() {
  const opt = state.sudoku;
  for (const it of state.items) {
    if (it.type === 'sudoku' || it.type === 'sudoku-cover') it.opt = opt;
  }
  state.pages = expand(state.size, state.items, state.fill);
  $('sudopts').hidden = !state.items.some(
    (i) => i.type === 'sudoku' || i.type === 'sudoku-cover');


  drawSizes();
  drawList();
  drawPreview();

  const n = state.pages.length;
  const autos = state.pages.filter((p) => p.auto).length;
  $('count').textContent = state.items.length
    ? `${n} pages, ${n / 4} folded sheet${n === 4 ? '' : 's'}`
      + (autos ? ` — ${autos} spare page${autos === 1 ? '' : 's'}` : '')
    : '';

  const why = summary(state.pages.map((p) => (p.auto
    ? { kind: 'fill', why: p.why } : { kind: 'page' })));
  $('why').innerHTML = why.size
    ? `<b>Spare pages</b><ul>${[...why].map(([t, k]) =>
      `<li>${k} × ${t}</li>`).join('')}</ul>`
    : '';
  $('dl-print').disabled = !state.items.length;
  $('dl-read').disabled = !state.items.length;

  const sheets = state.size === 'regular' ? n / 4 : Math.ceil(n / 8);
  $('dlnote').textContent = state.items.length
    ? `${sheets} sheet${sheets === 1 ? '' : 's'} of A4, printed both sides, `
      + `${state.size === 'regular' ? 'landscape, flipping on the short edge'
        : 'portrait, flipping on the long edge'}.`
    : 'Add an insert to enable the downloads.';
}

// ---------------------------------------------------------------- wiring

drawCatalogue();

for (const b of document.querySelectorAll('[data-preset]')) {
  b.onclick = () => {
    const p = PRESETS[b.dataset.preset];
    state.items = p.items.map((i) => ({ ...i, n: 1, opt: {} }));
    state.fill = p.fill;
    state.name = p.name;
    state.sel = 0;

    for (const r of document.querySelectorAll('input[name=fill]')) {
      r.checked = r.value === p.fill;
    }
    render();
  };
}
$('clear').onclick = () => {
  state.items = [];
  state.sel = 0;

  render();
};
for (const r of document.querySelectorAll('input[name=fill]')) {
  r.onchange = () => { state.fill = r.value; render(); };
}

// puzzle settings
const gbox = $('sud-grades');
PUZZLE_GRADES.forEach((g) => {
  const lab = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = true;
  cb.onchange = () => {
    const on = PUZZLE_GRADES.filter((_, k) =>
      gbox.querySelectorAll('input')[k].checked);
    if (!on.length) { cb.checked = true; return; }   // at least one grade
    state.sudoku.grades = on;
    render();
  };
  lab.append(cb, document.createTextNode(` ${g}`));
  gbox.appendChild(lab);
});
for (const [id, key] of [['sud-oneup', 'oneUp'], ['sud-working', 'working'],
  ['sud-date', 'date']]) {
  $(id).onchange = () => { state.sudoku[key] = $(id).checked; render(); };
}
$('sud-title').oninput = () => {
  state.sudoku.title = $('sud-title').value.trim();
  render();
};
$('sud-seed').value = state.sudoku.seed;
$('sud-seed').oninput = () => {
  state.sudoku.seed = $('sud-seed').value.trim() || 'year-book';
  render();
};
$('sud-new').onclick = () => {
  state.sudoku.seed = newSeed();
  $('sud-seed').value = state.sudoku.seed;
  render();
};
$('prev').onclick = () => {
  state.sel = Math.max(0, state.sel - 1);
  render();
};
$('next').onclick = () => {
  state.sel = Math.min(state.pages.length - 1, state.sel + 1);
  render();
};
$('dl-print').onclick = () => {
  save(imposedPdf(state.size, state.pages).blob(), `${stamp()}-A4.pdf`);
};
$('dl-read').onclick = () => {
  save(readingPdf(state.size, state.pages).blob(), `${stamp()}.pdf`);
};

window.addEventListener('resize', () => drawPreview());

document.querySelector('[data-preset="year"]').click();
