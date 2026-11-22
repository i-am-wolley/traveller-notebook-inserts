// Where the spare pages go. The twin of layout.py — keep the two in step.
//
// A saddle-stitched booklet is a stack of folded sheets, and that imposes
// arithmetic the content has to live with: the total must be a multiple of
// four, odd pages always sit on the right of a spread and even pages on the
// left. Rather than hand-placing blanks, every insert declares what it needs
// and this works the rest out.

export const MULTIPLE = 4;          // pages per folded sheet

export function fit({ spread = false, start = null, atEnd = false } = {}) {
  return { spread, start: spread ? 'verso' : start, atEnd };
}

function wants(f, n) {
  if (f.spread) {
    return `so the ${n} pages open as a spread, facing each other`;
  }
  if (f.start === 'recto') return 'so it starts on a right-hand page';
  if (f.start === 'verso') return 'so it starts on a left-hand page';
  return null;
}

function needsFill(f, placed) {
  if (!f.start) return false;
  const next = placed + 1;
  return f.start === 'recto' ? next % 2 === 0 : next % 2 === 1;
}

// items: [{ key, pages, fit }]  ->  [{ kind: 'page'|'fill', key, i, why }]
export function plan(items) {
  const body = [];
  const tail = [];

  for (const it of items) {
    const f = it.fit || fit();
    if (f.atEnd) {
      for (let i = 0; i < it.pages; i += 1) {
        tail.push({ kind: 'page', key: it.key, i });
      }
      continue;
    }
    if (needsFill(f, body.length)) {
      body.push({ kind: 'fill', why: wants(f, it.pages) });
    }
    for (let i = 0; i < it.pages; i += 1) {
      body.push({ kind: 'page', key: it.key, i });
    }
  }

  const total = body.length + tail.length;
  const want = Math.max(MULTIPLE, total + ((MULTIPLE - total % MULTIPLE)
    % MULTIPLE));
  const spare = want - total;
  let before = spare;
  let after = 0;

  // Everything spare would otherwise land in front of the tail, which fixes
  // the tail's first page number — and for a two-page tail that number is
  // always odd, splitting it across a turn. Moving one page behind the tail
  // flips the parity and leaves a spare back page, which is what a booklet
  // usually wants anyway.
  if (tail.length >= 2 && spare >= 1 && (body.length + before + 1) % 2) {
    before = spare - 1;
    after = 1;
  }

  const why = `to reach ${want} pages — a folded booklet needs a multiple `
    + 'of four';
  for (let i = 0; i < before; i += 1) body.push({ kind: 'fill', why });
  const back = [];
  for (let i = 0; i < after; i += 1) {
    back.push({ kind: 'fill',
      why: 'a spare back page, so the last two pages face' });
  }
  return [...body, ...tail, ...back];
}

export function summary(slots) {
  const out = new Map();
  for (const s of slots) {
    if (s.kind === 'fill') out.set(s.why, (out.get(s.why) || 0) + 1);
  }
  return out;
}
