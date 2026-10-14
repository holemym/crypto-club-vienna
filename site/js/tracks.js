/* Tracks: a switcher with three generative canvases (only the selected one animates).
 *   initTracks(root = document) -> { setActive(i), destroy() }
 * Markup: .tracks#tracks-list > .track > (h3 > button.tr-btn) + .tr-panel canvas.track-viz[data-viz="graph|candles|terminal"]
 */

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = matchMedia('(max-width: 799.98px)');
const MONO = 11;          // mono text floor in px (ENG P3-10)
const DPR = () => Math.min(1.75, window.devicePixelRatio || 1);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - Math.pow(2, -10 * clamp(t, 0, 1)); // expo.out
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function hexA(hex, a) {
  const h = hex.trim().replace('#', '');
  const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const v = parseInt(n, 16);
  if (Number.isNaN(v)) return hex;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

/* ------------------------------------------------------------------ base */
class Viz {
  constructor(canvas, colors, caption) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.k = colors;
    this.caption = caption;
    this.w = 0; this.h = 0; this.t = 0;
  }
  resize(w, h) {
    const d = DPR();
    this.w = w; this.h = h; this.dpr = d;
    this.c.width = Math.max(1, Math.round(w * d));
    this.c.height = Math.max(1, Math.round(h * d));
  }
  mono(px, weight = 400) { return `${weight} ${px}px "Martian Mono", ui-monospace, monospace`; }
  ground() {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
  }
  // text may be an array of progressively shorter variants; the first that fits is drawn
  label(text, x, y, color, align = 'left', room = this.w - 24) {
    const { ctx } = this;
    ctx.font = this.mono(MONO);
    ctx.letterSpacing = '1px';
    if (Array.isArray(text)) text = text.find((t) => ctx.measureText(t).width <= room) || text[text.length - 1];
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
  }
}

/* ------------------------------------------------------------------ graph: block propagation */
class GraphViz extends Viz {
  constructor(c, k) {
    super(c, k, 'FIG. A  BLOCK PROPAGATION');
    this.height = 18204 + ((Math.random() * 900) | 0);
    this.build();
    this.start(0.4);
  }
  build() {
    const pts = [];
    let guard = 0;
    while (pts.length < 22 && guard++ < 4000) {
      const p = { x: Math.random(), y: Math.random() };
      if (pts.every((q) => Math.hypot((p.x - q.x) * 1.75, p.y - q.y) > 0.2)) pts.push(p);
    }
    this.nodes = pts;
    const n = pts.length, d = (a, b) => Math.hypot((pts[a].x - pts[b].x) * 1.75, pts[a].y - pts[b].y);
    const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    const edges = new Map();
    for (let i = 0; i < n; i++) {
      const near = [...Array(n).keys()].filter((j) => j !== i).sort((a, b) => d(i, a) - d(i, b));
      const k = 2 + (Math.random() < 0.35 ? 1 : 0);
      for (let m = 0; m < k; m++) edges.set(key(i, near[m]), [i, near[m]]);
    }
    // ensure connected
    const adj = () => { const A = pts.map(() => []); for (const [a, b] of edges.values()) { A[a].push(b); A[b].push(a); } return A; };
    for (;;) {
      const A = adj(), seen = new Set([0]), st = [0];
      while (st.length) { const u = st.pop(); for (const v of A[u]) if (!seen.has(v)) { seen.add(v); st.push(v); } }
      if (seen.size === n) break;
      let best = null;
      for (const a of seen) for (let b = 0; b < n; b++) if (!seen.has(b) && (!best || d(a, b) < best[2])) best = [a, b, d(a, b)];
      edges.set(key(best[0], best[1]), [best[0], best[1]]);
    }
    this.edges = [...edges.values()];
    this.adj = adj();
    this.dist = d;
  }
  start(phase = 0) {
    const n = this.nodes.length;
    const origin = (Math.random() * n) | 0;
    const arr = new Array(n).fill(Infinity), par = new Array(n).fill(-1);
    arr[origin] = 0;
    const q = new Set([...Array(n).keys()]);
    while (q.size) {
      let u = -1;
      for (const v of q) if (u < 0 || arr[v] < arr[u]) u = v;
      q.delete(u);
      for (const v of this.adj[u]) {
        const t = arr[u] + this.dist(u, v) * 1.25 + 0.06;
        if (t < arr[v]) { arr[v] = t; par[v] = u; }
      }
    }
    this.arr = arr; this.par = par; this.origin = origin;
    this.span = Math.max(...arr);
    this.cycle = this.span + 2.2;
    this.t = phase * this.span;
    this.height++;
  }
  step(dt) {
    this.t += dt;
    if (this.t > this.cycle) this.start(0);
  }
  xy(i) {
    const p = this.nodes[i], px = 26, top = 40, bot = 34;
    return [px + p.x * (this.w - px * 2), top + p.y * (this.h - top - bot)];
  }
  draw() {
    const { ctx, k, t } = this;
    this.ground();
    const fade = 1 - clamp((t - this.span - 1.4) / 0.8, 0, 1); // accent fades before next block
    // edges
    ctx.lineWidth = 1;
    for (const [a, b] of this.edges) {
      const [x1, y1] = this.xy(a), [x2, y2] = this.xy(b);
      ctx.strokeStyle = hexA(k.fog, 0.22);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // propagation along tree edges
    for (let v = 0; v < this.nodes.length; v++) {
      const u = this.par[v];
      if (u < 0) continue;
      const t0 = this.arr[u], t1 = this.arr[v];
      if (t < t0) continue;
      const p = clamp((t - t0) / (t1 - t0), 0, 1);
      const [x1, y1] = this.xy(u), [x2, y2] = this.xy(v);
      const xe = x1 + (x2 - x1) * p, ye = y1 + (y2 - y1) * p;
      ctx.strokeStyle = hexA(k.accent, (p < 1 ? 0.9 : 0.45) * fade);
      ctx.lineWidth = p < 1 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xe, ye); ctx.stroke();
      if (p < 1) { ctx.fillStyle = k.accent; ctx.fillRect(xe - 2, ye - 2, 4, 4); }
    }
    // nodes + ripples
    let reached = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const [x, y] = this.xy(i);
      const dtv = t - this.arr[i];
      const on = dtv >= 0;
      if (on) reached++;
      if (on && dtv < 1.1) {
        const e = ease(dtv / 1.1), r = 4 + e * 18;
        ctx.strokeStyle = hexA(k.accent, (1 - e) * 0.8);
        ctx.lineWidth = 1;
        ctx.strokeRect(x - r, y - r, r * 2, r * 2);
      }
      const s = i === this.origin ? 7 : 5;
      ctx.fillStyle = k.ink;
      ctx.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2);
      if (on && fade > 0) { ctx.fillStyle = hexA(k.accent, 0.25 + 0.75 * fade); ctx.fillRect(x - s / 2, y - s / 2, s, s); }
      else { ctx.strokeStyle = hexA(k.paper, 0.55); ctx.strokeRect(x - s / 2 + 0.5, y - s / 2 + 0.5, s - 1, s - 1); }
    }
    const n = this.nodes.length;
  }
  still() { this.t = this.span * 0.62; }
}

/* ------------------------------------------------------------------ candles: volatility + stops */
class CandleViz extends Viz {
  constructor(c, k) {
    super(c, k, 'FIG. B  VOLATILITY AND RISK');
    this.pitch = 11; this.cw = 6;
    this.speed = 9;           // px per second
    this.off = 0;
    this.data = [];
    this.p = 100; this.vol = 0.8; this.sinceSpike = 0; this.nextSpike = 12;
    for (let i = 0; i < 140; i++) this.push();
    this.stop = null; this.sinceSpike = 0; this.nextSpike = 3; // first stop-loss lesson comes early
    this.lo = null; this.hi = null;
  }
  push(forceSpike = false) {
    this.vol = clamp(this.vol + gauss() * 0.08 + (0.8 - this.vol) * 0.05, 0.35, 1.6);
    const o = this.p;
    const drift = Math.sin(this.data.length / 23) * 0.08;
    let c = o + gauss() * this.vol + drift;
    let hi = Math.max(o, c) + Math.abs(gauss()) * this.vol * 0.55;
    let lo = Math.min(o, c) - Math.abs(gauss()) * this.vol * 0.55;
    const spike = forceSpike || (this.sinceSpike >= this.nextSpike && this.data.length > 100);
    if (spike) {
      lo = Math.min(o, c) - this.vol * rand(6, 8);
      c = Math.min(o, c) - this.vol * 0.3;
      this.sinceSpike = 0; this.nextSpike = 10 + ((Math.random() * 7) | 0);
    } else this.sinceSpike++;
    this.p = c;
    this.data.push({ o, h: hi, l: lo, c, spike });
    if (this.data.length > 160) this.data.shift();
    if (spike && this.data.length > 100) {
      const body = Math.min(o, c);
      this.stop = { level: body - (body - lo) * 0.55, t: 0 };
    }
  }
  step(dt) {
    this.off += this.speed * dt;
    while (this.off >= this.pitch) { this.off -= this.pitch; this.push(); }
    if (this.stop) { this.stop.t += dt; if (this.stop.t > 5) this.stop = null; }
  }
  draw(snap = false) {
    const { ctx, k, w, h, pitch, cw } = this;
    this.ground();
    const top = 40, bot = 32, plotH = h - top - bot;
    const right = w - 18;
    const nVis = Math.ceil((right - 12) / pitch) + 1;
    const start = Math.max(0, this.data.length - nVis);
    const vis = this.data.slice(start);
    // volatility band: rolling mean +- 2 sd over 20 closes
    const band = [];
    for (let i = start; i < this.data.length; i++) {
      const s = this.data.slice(Math.max(0, i - 19), i + 1).map((d) => d.c);
      const m = s.reduce((a, b) => a + b, 0) / s.length;
      const sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / s.length);
      band.push([m - 2 * sd, m, m + 2 * sd]);
    }
    let lo = Infinity, hi = -Infinity;
    vis.forEach((d, i) => { lo = Math.min(lo, d.l, band[i][0]); hi = Math.max(hi, d.h, band[i][2]); });
    const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
    if (this.lo == null || snap) { this.lo = lo; this.hi = hi; } else { this.lo += (lo - this.lo) * 0.1; this.hi += (hi - this.hi) * 0.1; }
    const Y = (v) => top + (1 - (v - this.lo) / (this.hi - this.lo)) * plotH;
    const X = (i) => right - (vis.length - 1 - i) * pitch - this.off;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, top - 6, w, plotH + 12); ctx.clip();
    // band fill + edges
    ctx.beginPath();
    band.forEach((b, i) => (i ? ctx.lineTo(X(i), Y(b[2])) : ctx.moveTo(X(i), Y(b[2]))));
    for (let i = band.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(band[i][0]));
    ctx.closePath();
    ctx.fillStyle = hexA(k.paper, 0.045);
    ctx.fill();
    ctx.lineWidth = 1;
    for (const j of [0, 2]) {
      ctx.beginPath();
      band.forEach((b, i) => (i ? ctx.lineTo(X(i), Y(b[j])) : ctx.moveTo(X(i), Y(b[j]))));
      ctx.strokeStyle = hexA(k.fog, 0.35);
      ctx.stroke();
    }
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    band.forEach((b, i) => (i ? ctx.lineTo(X(i), Y(b[1])) : ctx.moveTo(X(i), Y(b[1]))));
    ctx.strokeStyle = hexA(k.fog, 0.3);
    ctx.stroke();
    ctx.setLineDash([]);

    // candles
    vis.forEach((d, i) => {
      const x = Math.round(X(i)) + 0.5;
      if (x < 8) return;
      const up = d.c >= d.o;
      const yo = Y(d.o), yc = Y(d.c);
      ctx.strokeStyle = d.spike ? k.accent : hexA(k.paper, up ? 0.7 : 0.45);
      ctx.beginPath(); ctx.moveTo(x, Y(d.h)); ctx.lineTo(x, Y(d.l)); ctx.stroke();
      const y0 = Math.round(Math.min(yo, yc)) + 0.5, bh = Math.max(1, Math.round(Math.abs(yc - yo)));
      if (up) { ctx.fillStyle = k.ink; ctx.fillRect(x - cw / 2, y0, cw, bh); ctx.strokeRect(x - cw / 2, y0, cw, bh); }
      else { ctx.fillStyle = d.spike ? k.accent : hexA(k.fog, 0.75); ctx.fillRect(x - cw / 2, y0, cw, bh); }
    });
    // last close marker
    const last = vis[vis.length - 1];
    ctx.fillStyle = k.paper;
    ctx.fillRect(right - this.off + 6, Y(last.c) - 2, 4, 4);

    // stop-loss line: flashes (steps) after a sharp wick, then fades
    if (this.stop) {
      const st = this.stop.t;
      const flash = st < 1.6 ? (Math.floor(st / 0.2) % 2 === 0 ? 1 : 0.25) : 1 - clamp((st - 3) / 2, 0, 1);
      const y = Math.round(clamp(Y(this.stop.level), top, top + plotH)) + 0.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = hexA(k.accent, 0.95 * flash);
      ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = this.mono(MONO);
      ctx.letterSpacing = '1px';
      const tag = 'STOP';
      const tw = ctx.measureText(tag).width + 12;
      ctx.fillStyle = hexA(k.accent, flash);
      ctx.fillRect(14, y - 9, tw, 18);
      ctx.fillStyle = hexA(k.ink, flash > 0.5 ? 1 : flash);
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, 20, y + 0.5);
      ctx.letterSpacing = '0px';
      ctx.restore();
      const col = hexA(k.accent, Math.max(0.35, flash));
      ctx.font = this.mono(MONO); ctx.letterSpacing = '1px';
      if (ctx.measureText('STOP TRIGGERED · SLIPPAGE POSSIBLE').width <= w - 24) this.label('STOP TRIGGERED · SLIPPAGE POSSIBLE', 12, h - 12, col);
      else { this.label('STOP TRIGGERED', 12, h - 29, col); this.label('SLIPPAGE POSSIBLE', 12, h - 12, col); }
    } else {
      ctx.restore();
    }
  }
  still() {
    // fill so a spike sits two thirds across, with its stop line drawn
    for (let i = 0; i < 6; i++) this.push();
    this.push(true);
    for (let i = 0; i < 9; i++) this.push();
    this.stop.t = 2.5;
  }
}

/* ------------------------------------------------------------------ terminal: analytics session */
const SESSION = [
  { cmd: 'load blocks --range 7d' },
  { out: [['ok', 'a'], [' · 50,400 blocks', 'f']] },
  { cmd: 'count transfers > 1000 ETH' },
  { out: [['ok', 'a'], [' · 1,204 rows', 'f']] },
  { cmd: 'plot gas by hour' },
  { plot: true },
  { cmd: 'export --csv' },
  { out: [['saved', 'a'], [' · session.csv', 'f']] },
];

class TermViz extends Viz {
  constructor(c, k) {
    super(c, k, 'FIG. C  ANALYTICS SESSION');
    this.bars = Array.from({ length: 24 }, (_, i) => 0.35 + 0.45 * (0.5 - 0.5 * Math.cos(((i - 3) / 24) * Math.PI * 2)) + rand(-0.08, 0.12));
    this.reset();
    for (let i = 0; i < 40; i++) this.step(0.1); // open mid-session, never on an empty screen
  }
  reset() {
    this.lines = [];      // {kind, text, n (typed chars), born}
    this.idx = 0; this.wait = 0.6; this.typing = null; this.scroll = 0; this.done = false;
  }
  step(dt) {
    this.t += dt;
    if (this.typing) {
      const L = this.typing;
      L.acc += dt;
      while (L.acc > L.next && L.n < L.text.length) { L.acc -= L.next; L.n++; L.next = rand(0.035, 0.085); }
      if (L.n >= L.text.length) { this.typing = null; this.wait = 0.45; }
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    if (this.done) { this.reset(); return; }
    const s = SESSION[this.idx++];
    if (!s) { this.done = true; this.wait = 3.2; return; }
    if (s.cmd) { const L = { kind: 'cmd', text: s.cmd, n: 0, acc: 0, next: 0.05, born: this.t }; this.lines.push(L); this.typing = L; }
    else if (s.out) { this.lines.push({ kind: 'out', parts: s.out, born: this.t }); this.wait = 0.75; }
    else if (s.plot) { this.lines.push({ kind: 'plot', born: this.t }); this.wait = 1.4; }
  }
  draw(snap = false) {
    const { ctx, k, w, h } = this;
    this.ground();
    const fs = clamp(Math.round(w / 34), MONO, 12.5);
    const lh = Math.round(fs * 1.85);
    const left = 14, top = 42, bottom = h - 16;
    const rows = this.lines.reduce((a, L) => a + (L.kind === 'plot' ? 4 : 1), 0) + 1;
    const need = Math.max(0, top + rows * lh - bottom);
    this.scroll = snap ? need : this.scroll + (need - this.scroll) * 0.12;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top - 6, w, bottom - top + 10); ctx.clip();
    ctx.font = this.mono(fs);
    ctx.textBaseline = 'middle';
    let y = top + lh / 2 - this.scroll;
    let caretX = left, caretY = y;
    const cmdOff = ctx.measureText('> ').width;
    for (const L of this.lines) {
      if (L.kind === 'cmd') {
        ctx.fillStyle = k.accent; ctx.fillText('>', left, y);
        ctx.fillStyle = k.paper; const s = L.text.slice(0, L.n); ctx.fillText(s, left + cmdOff, y);
        caretX = left + cmdOff + ctx.measureText(s).width + 2; caretY = y;
        y += lh;
      } else if (L.kind === 'out') {
        let x = left + cmdOff;
        for (const [txt, c] of L.parts) { ctx.fillStyle = c === 'a' ? k.accent : k.fog; ctx.fillText(txt, x, y); x += ctx.measureText(txt).width; }
        caretX = left; caretY = y + lh;
        y += lh;
      } else if (L.kind === 'plot') {
        const ph = lh * 3 - 10, x0 = left + cmdOff, pw = Math.min(w - x0 - 16, 320), bw = pw / 24;
        const base = y - lh / 2 + ph + 2;
        const g = ease((this.t - L.born) / 0.9);
        ctx.strokeStyle = hexA(k.fog, 0.4); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, Math.round(base) + 0.5); ctx.lineTo(x0 + pw, Math.round(base) + 0.5); ctx.stroke();
        this.bars.forEach((v, i) => {
          const bh = Math.max(1, v * ph * clamp(g * 1.6 - i / 40, 0, 1));
          ctx.fillStyle = hexA(k.accent, i === 18 ? 1 : 0.55);
          ctx.fillRect(x0 + i * bw + 1, base - bh, Math.max(1, bw - 2), bh);
        });
        ctx.font = this.mono(MONO);
        ctx.fillStyle = k.fog;
        ctx.fillText('00h', x0, base + 10); ctx.textAlign = 'right'; ctx.fillText('23h', x0 + pw, base + 10); ctx.textAlign = 'left';
        ctx.font = this.mono(fs);
        y += lh * 4;
        caretX = left; caretY = y - lh;
      }
    }
    if (!this.typing && this.lines.length && this.lines[this.lines.length - 1].kind !== 'cmd') { caretX = left; caretY = y; }
    if (!this.lines.length) { caretX = left; caretY = top + lh / 2; }
    // block caret: solid while typing, steps(1) blink when idle
    const on = this.typing || Math.floor(this.t / 0.53) % 2 === 0;
    if (on) {
      if (!this.typing && caretX === left) { ctx.fillStyle = k.accent; ctx.fillText('>', left, caretY); caretX = left + cmdOff; }
      ctx.fillStyle = k.accent;
      ctx.fillRect(caretX, caretY - fs * 0.6, fs * 0.62, fs * 1.2);
    } else if (!this.typing && caretX === left) { ctx.fillStyle = k.accent; ctx.fillText('>', left, caretY); }
    ctx.restore();
  }
  still() {
    this.lines = SESSION.map((s) => (s.cmd ? { kind: 'cmd', text: s.cmd, n: s.cmd.length } : s.out ? { kind: 'out', parts: s.out } : { kind: 'plot', born: -10 }));
    this.idx = SESSION.length; this.t = 10;
  }
}

const KINDS = { graph: GraphViz, candles: CandleViz, terminal: TermViz };

/* ------------------------------------------------------------------ switcher behaviour */
// Desktop: list left, the selected area's panel right; a violet bar slides to the selected row.
// Hover previews after a short pause (no flicker while the pointer crosses rows); click, Enter or
// Space select at once; Up/Down/Home/End move between rows. Phone: an accordion, one area open.
// Only the selected area's visual animates.
export function initTracks(root = document) {
  const list = root?.matches?.('.tracks, #tracks-list') ? root : (root?.querySelector('#tracks-list') || root?.querySelector('.tracks'));
  if (!list) return { setActive() {}, destroy() {} };
  const items = [...list.querySelectorAll('.track')];
  const btns = items.map((t) => t.querySelector('.tr-btn'));
  const bar = list.querySelector('.tr-bar');
  const cs = getComputedStyle(document.documentElement);
  const tok = (n, f) => (cs.getPropertyValue(n).trim() || f);
  const base = { paper: tok('--paper', '#f8fbff'), fog: tok('--fog', '#b6b9c2'), line: tok('--line', '#434366'), ink: tok('--ink-2', '#0a131f') };
  const accent = tok('--accent', '#af00ff');

  const vizzes = items.map((t, i) => {
    const canvas = t.querySelector('canvas.track-viz');
    const Kind = canvas && KINDS[canvas.dataset.viz];
    if (!Kind) return null;
    const v = new Kind(canvas, { ...base, accent });
    v.i = i; v.visible = false; v.ready = false;
    if (RM) v.still();
    return v;
  }).filter(Boolean);

  let active = 0;
  const placeBar = () => {
    const b = btns[active];
    if (!bar || !b || PHONE.matches) return;
    bar.style.setProperty('--y', `${b.offsetTop}px`);
    bar.style.setProperty('--h', `${b.offsetHeight}px`);
  };
  const setActive = (i) => {
    if (i === active && !PHONE.matches) return;
    active = PHONE.matches && i === active ? -1 : i;   // phone: tapping the open area closes it
    items.forEach((t, j) => {
      const on = j === active;
      t.classList.toggle('is-active', on);
      btns[j].setAttribute('aria-expanded', String(on));
    });
    placeBar();
    const v = vizzes.find((z) => z.i === active);
    if (v && v.ready) v.draw(true);
    kick();
  };

  // interaction
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  let hoverT = 0;
  btns.forEach((b, i) => {
    b.addEventListener('click', () => { clearTimeout(hoverT); setActive(i); }, sig);
    b.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || PHONE.matches) return;
      clearTimeout(hoverT);
      hoverT = setTimeout(() => setActive(i), 140);
    }, sig);
    b.addEventListener('pointerleave', () => clearTimeout(hoverT), sig);
    b.addEventListener('keydown', (e) => {
      const n = btns.length;
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      const j = (to + n) % n;
      btns[j].focus();
      if (!PHONE.matches) setActive(j);
    }, sig);
  });
  placeBar();
  requestAnimationFrame(() => list.classList.add('is-ready'));   // bar transitions only after first placement

  // sizing
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      if (e.target === list) { placeBar(); continue; }
      const v = vizzes.find((z) => z.c === e.target);
      if (!v) continue;
      const box = e.contentBoxSize?.[0];
      const w = box ? box.inlineSize : e.contentRect.width, h = box ? box.blockSize : e.contentRect.height;
      if (w < 2 || h < 2) continue;
      v.resize(w, h);
      v.ready = true;
      v.draw(true);
    }
  });
  ro.observe(list);
  vizzes.forEach((v) => ro.observe(v.c));
  document.fonts?.ready.then(() => { placeBar(); vizzes.forEach((v) => v.ready && v.draw(true)); });
  PHONE.addEventListener('change', () => { if (active < 0) setActive(0); placeBar(); }, sig);

  let raf = 0, last = 0;
  function kick() { if (!RM && !raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const v = vizzes.find((z) => z.i === active);
    const run = v && v.visible && v.ready;
    if (run) { v.step(dt); v.draw(); }
    raf = run && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  if (RM) return { setActive, destroy() { ac.abort(); ro.disconnect(); } };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const v = vizzes.find((z) => z.c === e.target); if (v) v.visible = e.isIntersecting; }
    kick();
  }, { rootMargin: '80px 0px' });
  vizzes.forEach((v) => io.observe(v.c));
  document.addEventListener('visibilitychange', () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : kick()), sig);

  return { setActive, destroy() { ac.abort(); ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); } };
}
