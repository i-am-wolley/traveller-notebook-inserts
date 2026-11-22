// Two drawing surfaces with one API, so a page is painted once and can come
// out either as a real PDF or as a canvas preview.
//
// Coordinates are millimetres with y running down the page, which matches the
// way the Python builders think about the layout. Font sizes stay in points.

import { BASEFONT, WIDTH, WINANSI } from './metrics.js';

export const MM = 72 / 25.4;          // millimetres to PostScript points

export const INK = '#2b2b2b';
export const RULE = '#b4b4b4';
export const GREY = '#d9d9d9';

// ---------------------------------------------------------------- text

function codes(str) {
  // WinAnsi bytes for the characters the pages actually use
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c < 127) out.push(c);
    else if (WINANSI[ch] !== undefined) out.push(WINANSI[ch]);
    else out.push(63);                // '?', rather than a silent hole
  }
  return out;
}

export function textWidth(str, font, size) {
  const w = WIDTH[font] || WIDTH.helv;
  let total = 0;
  for (const c of codes(str)) total += (w[c] !== undefined ? w[c] : 0.5);
  return total * size / MM;           // in millimetres
}

function alignShift(str, font, size, align) {
  if (!align || align === 'l') return 0;
  const w = textWidth(str, font, size);
  return align === 'c' ? -w / 2 : -w;
}

function hexToRgb(h) {
  if (typeof h !== 'string') return [0, 0, 0];
  const s = h.replace('#', '');
  const n = s.length === 3
    ? s.split('').map((c) => parseInt(c + c, 16))
    : [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return n.map((v) => v / 255);
}

// ---------------------------------------------------------------- PDF

class PdfPage {
  constructor(wmm, hmm) {
    this.w = wmm;
    this.h = hmm;
    this.ops = [];
    // flip to millimetres with y down, so every painter shares one idea of up
    this.ops.push(`${MM} 0 0 ${-MM} 0 ${(hmm * MM).toFixed(3)} cm`);
    this.fonts = new Set();
    this._stroke = null;
    this._fill = null;
    this._lw = null;
    this._dash = null;
  }

  _col(hex, stroking) {
    const [r, g, b] = hexToRgb(hex);
    const key = `${r},${g},${b}`;
    if (stroking) {
      if (this._stroke === key) return;
      this._stroke = key;
      this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    } else {
      if (this._fill === key) return;
      this._fill = key;
      this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    }
  }

  _pen(o) {
    const w = (o.w === undefined ? 0.12 : o.w);     // mm
    if (this._lw !== w) {
      this._lw = w;
      this.ops.push(`${(w * MM).toFixed(3)} w`);
    }
    const d = o.dash ? `[${o.dash * MM} ${o.dash * MM}] 0 d` : '[] 0 d';
    if (this._dash !== d) {
      this._dash = d;
      this.ops.push(d);
    }
    this._col(o.color || INK, true);
  }

  line(x1, y1, x2, y2, o = {}) {
    this._pen(o);
    this.ops.push(`${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);
  }

  rect(x, y, w, h, o = {}) {
    if (o.fill) {
      this._col(o.fill, false);
      this.ops.push(`${f(x)} ${f(y)} ${f(w)} ${f(h)} re f`);
    }
    if (o.color !== null) {
      this._pen(o);
      this.ops.push(`${f(x)} ${f(y)} ${f(w)} ${f(h)} re S`);
    }
  }

  poly(pts, o = {}) {
    if (pts.length < 2) return;
    const d = pts.map((p, i) => `${f(p[0])} ${f(p[1])} ${i ? 'l' : 'm'}`)
      .join(' ');
    if (o.fill) this._col(o.fill, false);
    this._pen(o);
    const close = o.close === false ? '' : ' h';
    let paint = 'S';
    if (o.fill && o.color === null) paint = 'f';
    else if (o.fill) paint = 'B';
    this.ops.push(`${d}${close} ${paint}`);
  }

  dot(x, y, r, o = {}) {
    // a circle from four Beziers; k is the usual circle-to-cubic constant
    const k = r * 0.5523;
    this._pen(o);
    if (o.fill) this._col(o.fill, false);
    this.ops.push(
      `${f(x - r)} ${f(y)} m ` +
      `${f(x - r)} ${f(y - k)} ${f(x - k)} ${f(y - r)} ${f(x)} ${f(y - r)} c ` +
      `${f(x + k)} ${f(y - r)} ${f(x + r)} ${f(y - k)} ${f(x + r)} ${f(y)} c ` +
      `${f(x + r)} ${f(y + k)} ${f(x + k)} ${f(y + r)} ${f(x)} ${f(y + r)} c ` +
      `${f(x - k)} ${f(y + r)} ${f(x - r)} ${f(y + k)} ${f(x - r)} ${f(y)} c ` +
      `h ${o.fill ? (o.color === null ? 'f' : 'B') : 'S'}`);
  }

  text(x, y, str, o = {}) {
    if (!str) return;
    const font = o.font || 'helv';
    const size = o.size || 7;
    this.fonts.add(font);
    this._col(o.color || INK, false);
    const dx = alignShift(str, font, size, o.align);
    const bytes = codes(str).map(esc).join('');
    // the page CTM is in millimetres, so the point size converts across; the
    // -1 in the text matrix cancels that CTM's y flip
    this.ops.push(
      `BT /${font} ${f(size / MM)} Tf 1 0 0 -1 ${f(x + dx)} ${f(y)} Tm ` +
      `(${bytes}) Tj ET`);
  }

  save() { this.ops.push('q'); this._reset(); }

  restore() { this.ops.push('Q'); this._reset(); }

  _reset() { this._stroke = this._fill = this._lw = this._dash = null; }

  clip(x, y, w, h) {
    this.ops.push(`${f(x)} ${f(y)} ${f(w)} ${f(h)} re W n`);
  }

  // a quarter turn anticlockwise, read by turning the notebook clockwise.
  // Local (u, v) lands at (ox + v, oy + depth - u).
  turn(ox, oy, depth) {
    this.ops.push(`q 0 -1 1 0 ${f(ox)} ${f(oy + depth)} cm`);
    this._reset();
  }

  // place a whole sub-drawing at an offset, used by the imposition
  at(ox, oy) {
    this.ops.push(`q 1 0 0 1 ${f(ox)} ${f(oy)} cm`);
    this._reset();
  }

  pop() { this.ops.push('Q'); this._reset(); }

  stream() { return this.ops.join('\n'); }
}

function f(v) {
  return (Math.round(v * 1000) / 1000).toString();
}

function esc(code) {
  if (code === 40 || code === 41 || code === 92) {
    return '\\' + String.fromCharCode(code);
  }
  if (code < 32 || code > 126) return '\\' + code.toString(8).padStart(3, '0');
  return String.fromCharCode(code);
}

export class Pdf {
  constructor(title) {
    this.pages = [];
    this.title = title || 'Traveller\'s Notebook insert';
  }

  page(wmm, hmm) {
    const p = new PdfPage(wmm, hmm);
    this.pages.push(p);
    return p;
  }

  blob() {
    const used = new Set();
    for (const p of this.pages) for (const fo of p.fonts) used.add(fo);
    if (!used.size) used.add('helv');
    const fontList = [...used];

    const objs = [];                     // 1-based; objs[i] is object i+1
    const add = (s) => { objs.push(s); return objs.length; };

    const catalog = add('');             // 1, filled in later
    const pagesObj = add('');            // 2
    const fontIds = {};
    for (const key of fontList) {
      fontIds[key] = add(
        `<< /Type /Font /Subtype /Type1 /BaseFont /${BASEFONT[key]}` +
        ' /Encoding /WinAnsiEncoding >>');
    }
    const info = add(
      `<< /Title (${codes(this.title).map(esc).join('')})` +
      ' /Producer (Year Book booklet builder) >>');

    const kids = [];
    for (const p of this.pages) {
      const data = p.stream();
      const sid = add(`<< /Length ${byteLen(data)} >>\nstream\n${data}\nendstream`);
      const res = fontList
        .map((k) => `/${k} ${fontIds[k]} 0 R`).join(' ');
      const pid = add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ` +
        `${f(p.w * MM)} ${f(p.h * MM)}] /Resources << /Font << ${res} >> >>` +
        ` /Contents ${sid} 0 R >>`);
      kids.push(pid);
    }

    objs[pagesObj - 1] =
      `<< /Type /Pages /Count ${kids.length} /Kids [` +
      `${kids.map((k) => `${k} 0 R`).join(' ')}] >>`;
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;

    let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const offsets = [0];
    for (let i = 0; i < objs.length; i += 1) {
      offsets.push(byteLen(out));
      out += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const start = byteLen(out);
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i += 1) {
      out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R ` +
      `/Info ${info} 0 R >>\nstartxref\n${start}\n%%EOF\n`;

    return new Blob([latin1(out)], { type: 'application/pdf' });
  }
}

function byteLen(s) {
  return s.length;              // every byte written is latin-1, one per char
}

function latin1(s) {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

// ---------------------------------------------------------------- canvas

export class CanvasSurface {
  // Same API as a PdfPage, drawn onto a 2d context for the live preview.
  constructor(ctx, scale) {
    this.ctx = ctx;
    this.k = scale;                 // pixels per millimetre
  }

  _pen(o) {
    const c = this.ctx;
    c.strokeStyle = o.color || INK;
    c.lineWidth = Math.max(0.35, (o.w === undefined ? 0.12 : o.w) * this.k);
    c.setLineDash(o.dash ? [o.dash * this.k, o.dash * this.k] : []);
  }

  line(x1, y1, x2, y2, o = {}) {
    const c = this.ctx;
    this._pen(o);
    c.beginPath();
    c.moveTo(x1 * this.k, y1 * this.k);
    c.lineTo(x2 * this.k, y2 * this.k);
    c.stroke();
  }

  rect(x, y, w, h, o = {}) {
    const c = this.ctx;
    if (o.fill) {
      c.fillStyle = o.fill;
      c.fillRect(x * this.k, y * this.k, w * this.k, h * this.k);
    }
    if (o.color !== null) {
      this._pen(o);
      c.strokeRect(x * this.k, y * this.k, w * this.k, h * this.k);
    }
  }

  poly(pts, o = {}) {
    const c = this.ctx;
    c.beginPath();
    pts.forEach((p, i) => {
      if (i) c.lineTo(p[0] * this.k, p[1] * this.k);
      else c.moveTo(p[0] * this.k, p[1] * this.k);
    });
    if (o.close !== false) c.closePath();
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.color !== null) { this._pen(o); c.stroke(); }
  }

  dot(x, y, r, o = {}) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x * this.k, y * this.k, r * this.k, 0, Math.PI * 2);
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.color !== null) { this._pen(o); c.stroke(); }
  }

  text(x, y, str, o = {}) {
    if (!str) return;
    const c = this.ctx;
    const font = o.font || 'helv';
    const size = (o.size || 7) / MM * this.k;         // pt -> mm -> px
    const serif = font.startsWith('times');
    c.font = `${font.endsWith('B') ? '700 ' : ''}${size}px ` +
      (serif ? 'Georgia, "Times New Roman", serif'
        : '"Helvetica Neue", Arial, sans-serif');
    c.fillStyle = o.color || INK;
    // measure with the PDF metrics, so preview and print break the same way
    c.fillText(str, (x + alignShift(str, font, o.size || 7, o.align)) * this.k,
      y * this.k);
  }

  save() { this.ctx.save(); }

  restore() { this.ctx.restore(); }

  clip(x, y, w, h) {
    const c = this.ctx;
    c.beginPath();
    c.rect(x * this.k, y * this.k, w * this.k, h * this.k);
    c.clip();
  }

  turn(ox, oy, depth) {
    const c = this.ctx;
    c.save();
    c.transform(0, -1, 1, 0, ox * this.k, (oy + depth) * this.k);
  }

  at(ox, oy) {
    const c = this.ctx;
    c.save();
    c.translate(ox * this.k, oy * this.k);
  }

  pop() { this.ctx.restore(); }
}
