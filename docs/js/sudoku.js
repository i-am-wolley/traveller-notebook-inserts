// Sudoku with a guaranteed unique solution, dug out in the browser.
// The port of sudoku.py — same algorithm, same grades. Keep the two in step.
//
// Puzzles are made on demand rather than shipped as a fixed pool, so a new
// seed really is a new set. Each puzzle is seeded from (seed, grade, index)
// on its own, which means puzzle 7 is the same whether you asked for eight
// puzzles or eighty, and adding a page never reshuffles the pages before it.

export const GRADES = [
  // name, givens aimed for, whether guessing may be needed
  ['Easy', 38, false],
  ['Medium', 32, false],
  ['Hard', 28, true],
  ['Very hard', 24, true],
];

export const GRADE_NAMES = GRADES.map((g) => g[0]);

// ---------------------------------------------------------------- units

const ROWS = [];
const COLS = [];
const BOXES = [];
for (let r = 0; r < 9; r += 1) {
  ROWS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  COLS.push(Array.from({ length: 9 }, (_, k) => k * 9 + r));
}
for (let br = 0; br < 3; br += 1) {
  for (let bc = 0; bc < 3; bc += 1) {
    const box = [];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        box.push((br * 3 + r) * 9 + bc * 3 + c);
      }
    }
    BOXES.push(box);
  }
}
const UNITS = [...ROWS, ...COLS, ...BOXES];

const PEERS = [];
for (let i = 0; i < 81; i += 1) {
  const p = new Set([...ROWS[Math.floor(i / 9)], ...COLS[i % 9],
    ...BOXES[Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3)]]);
  p.delete(i);
  PEERS.push([...p]);
}

// ---------------------------------------------------------------- rng

function hashSeed(str) {
  // xmur3: a string to a 32-bit seed
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function rng(seedStr) {
  let a = hashSeed(String(seedStr))();
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  return next;
}

// ---------------------------------------------------------------- solving

// Count solutions up to `limit`. Returns [count, firstSolution].
function solve(grid, limit = 2, rnd = null) {
  const found = [];
  const g = grid.slice();

  const rec = () => {
    if (found.length >= limit) return;
    let best = -1;
    let bestOpts = null;
    for (let i = 0; i < 81; i += 1) {
      if (g[i]) continue;
      const used = new Uint8Array(10);
      for (const p of PEERS[i]) used[g[p]] = 1;
      const opts = [];
      for (let v = 1; v <= 9; v += 1) if (!used[v]) opts.push(v);
      if (!opts.length) return;
      if (bestOpts === null || opts.length < bestOpts.length) {
        best = i;
        bestOpts = opts;
        if (opts.length === 1) break;
      }
    }
    if (bestOpts === null) {
      found.push(g.slice());
      return;
    }
    if (rnd) rnd.shuffle(bestOpts);
    for (const v of bestOpts) {
      g[best] = v;
      rec();
      g[best] = 0;
      if (found.length >= limit) return;
    }
  };

  rec();
  return [found.length, found.length ? found[0] : null];
}

// True if naked and hidden singles alone finish the grid.
function logicOnly(grid) {
  const g = grid.slice();
  for (;;) {
    let moved = false;
    const cand = new Map();
    for (let i = 0; i < 81; i += 1) {
      if (g[i]) continue;
      const used = new Uint8Array(10);
      for (const p of PEERS[i]) used[g[p]] = 1;
      const opts = [];
      for (let v = 1; v <= 9; v += 1) if (!used[v]) opts.push(v);
      if (!opts.length) return false;
      if (opts.length === 1) {
        g[i] = opts[0];
        moved = true;
      } else {
        cand.set(i, opts);
      }
    }
    if (moved) continue;
    for (const unit of UNITS) {
      for (let v = 1; v <= 9; v += 1) {
        const spots = unit.filter((i) => cand.has(i) && cand.get(i).includes(v));
        if (spots.length === 1 && !unit.some((i) => g[i] === v)) {
          g[spots[0]] = v;
          moved = true;
          break;
        }
      }
      if (moved) break;
    }
    if (!moved) return g.every((v) => v);
  }
}

// ---------------------------------------------------------------- making

export function make(grade, rnd) {
  const [name, want, mayGuess] = grade;
  const [, sol] = solve(new Array(81).fill(0), 1, rnd);
  const puz = sol.slice();
  const order = rnd.shuffle(Array.from({ length: 81 }, (_, i) => i));
  let givens = 81;
  for (const i of order) {
    if (givens <= want) break;
    const keep = puz[i];
    puz[i] = 0;
    const [n] = solve(puz, 2);
    if (n === 1 && (mayGuess || logicOnly(puz))) givens -= 1;
    else puz[i] = keep;
  }
  return {
    grade: name,
    givens,
    puzzle: puz.join(''),
    solution: sol.join(''),
  };
}

// ---------------------------------------------------------------- cache

const cache = new Map();

/** Puzzle `index` of `gradeName` for `seed`, generated once and kept. */
export function puzzleAt(seed, gradeName, index) {
  const key = `${seed}|${gradeName}|${index}`;
  if (cache.has(key)) return cache.get(key);
  const grade = GRADES.find((g) => g[0] === gradeName) || GRADES[0];
  const p = make(grade, rng(key));
  cache.set(key, p);
  return p;
}

/** `n` puzzles for `seed`, cycling the chosen grades. */
export function series(seed, n, grades) {
  const use = (grades && grades.length) ? grades : GRADE_NAMES;
  const out = [];
  const seen = {};
  for (let i = 0; i < n; i += 1) {
    const g = use[i % use.length];
    seen[g] = (seen[g] || 0);
    out.push(puzzleAt(seed, g, seen[g]));
    seen[g] += 1;
  }
  return out;
}

export function newSeed() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
