/* CCV Telegram bot: an illustrative chat pane (square, ink, mono), not a live feed.
 *
 *   initBot(root, script = BOT_SCRIPT) -> { destroy() }
 *
 * A command types into the input bar, posts as a user message, then the bot reply streams in as
 * a structured readout (key/value rows, a bar sparkline, a status chip). Loops through the script.
 * Content is descriptive states only (no prices) and the pane says so visibly.
 *
 * Zero layout shift by construction: every message is absolutely positioned at top:0 and placed
 * with transform only; heights are read once per message, never per frame.
 * Paused off screen and in hidden tabs. Reduced motion: the first exchange, static.
 * Assistive tech: the pane is role="img" with a summary label; the animated content is hidden.
 */

export const BOT_SCRIPT = [
  {
    cmd: '/sentiment',
    title: 'Market sentiment',
    state: 'Neutral',
    rows: [['Sentiment', 'neutral'], ['Social volume', 'flat'], ['Funding', 'flat'], ['Alerts', 'none']],
    spark: { label: 'Sentiment 7d', values: [0.42, 0.48, 0.55, 0.5, 0.46, 0.52, 0.49, 0.47, 0.51, 0.5, 0.48, 0.5], note: 'range-bound' },
  },
  {
    cmd: '/volatility',
    title: 'Volatility 24h',
    state: 'Elevated',
    rows: [['Volatility 24h', 'elevated'], ['Range vs 30d', 'wider'], ['Liquidations', 'moderate'], ['Alerts', 'none']],
    spark: { label: 'Realised vol 7d', values: [0.3, 0.28, 0.34, 0.31, 0.38, 0.45, 0.42, 0.55, 0.62, 0.58, 0.7, 0.74], note: 'rising' },
  },
  {
    cmd: '/brief',
    title: 'Daily brief',
    state: 'Calm',
    rows: [['Sentiment', 'neutral'], ['Volatility 24h', 'elevated'], ['Funding', 'flat'], ['Alerts', 'none']],
    spark: { label: 'Activity 7d', values: [0.5, 0.54, 0.47, 0.52, 0.58, 0.55, 0.6, 0.57, 0.53, 0.59, 0.56, 0.61], note: 'steady' },
  },
];

const DISCLAIMER = 'Example output · not financial advice';
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const h = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function summary(script) {
  const parts = script.map((s) => `${s.cmd} returns ${s.title.toLowerCase()}: ${s.rows.map(([k, v]) => `${k.toLowerCase()} ${v}`).join(', ')}`);
  return `Example of the CCV Telegram bot. ${DISCLAIMER}. ${parts.join('. ')}.`;
}

/* ------------------------------------------------------------------ message builders */
function userMsg(cmd) {
  const m = h('div', 'bot-msg bot-out');
  const b = h('div', 'bot-bubble');
  b.append(h('span', 'bot-cmd', cmd), h('span', 'bot-ticks'));
  m.append(b);
  return m;
}

function typingMsg() {
  const m = h('div', 'bot-msg bot-in bot-typing');
  const b = h('div', 'bot-bubble');
  b.append(h('i'), h('i'), h('i'));
  m.append(b);
  return m;
}

// Built at final size; parts are revealed by class / typed text so nothing reflows.
function replyMsg(s) {
  const m = h('div', 'bot-msg bot-in bot-reply');
  const card = h('div', 'bot-card');

  const head = h('div', 'bot-head');
  const title = h('span', 'bot-title', s.title);
  const chip = h('span', 'bot-chip');
  chip.dataset.state = s.state.toLowerCase();
  chip.append(h('i'), h('span', null, s.state));
  head.append(title, chip);

  const dl = h('dl', 'bot-rows');
  const vals = [];
  for (const [k, v] of s.rows) {
    const row = h('div', 'bot-row');
    const dd = h('dd');
    const typed = h('span', 'bot-typed');
    const rest = h('span', 'bot-rest', v);
    dd.append(typed, rest);
    row.append(h('dt', null, k), h('span', 'bot-lead'), dd);
    dl.append(row);
    vals.push({ row, typed, rest, v });
  }

  const spark = h('div', 'bot-spark');
  const bars = h('span', 'bot-bars');
  const max = Math.max(...s.spark.values);
  s.spark.values.forEach((v, i) => {
    const b = h('i');
    b.style.setProperty('--v', (0.12 + 0.88 * (v / max)).toFixed(3));
    b.style.setProperty('--i', i);
    bars.append(b);
  });
  spark.append(h('span', 'bot-spark-k', s.spark.label), bars, h('span', 'bot-spark-v', s.spark.note));

  const foot = h('div', 'bot-foot', 'Describes the market. Does not tell you what to buy.');
  card.append(head, dl, spark, foot);
  m.append(card);
  return { m, card, vals, spark };
}

/* ------------------------------------------------------------------ init */
export function initBot(root, script = BOT_SCRIPT) {
  if (!root || !script?.length) return { destroy() {} };
  root.textContent = '';
  root.classList.add('bot-term');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', summary(script));

  const pane = h('div', 'bot-pane');
  pane.setAttribute('aria-hidden', 'true');

  const bar = h('div', 'bot-bar');
  const ava = h('span', 'bot-ava');
  const mark = document.createElement('img');
  mark.src = 'assets/brand/ccv-mark-160.png'; mark.alt = ''; mark.width = 20; mark.height = 21;
  ava.append(mark);
  const name = h('span', 'bot-name');
  const nm = h('b', null, 'CCV bot');
  nm.append(h('span', null, ' · sample output'));
  name.append(nm, h('span', 'bot-cmds', script.map((s) => s.cmd).join(' ')));
  const tag = h('span', 'bot-tag', 'Bot');
  bar.append(ava, name, tag);

  const pin = h('div', 'bot-pin');
  pin.append(h('span', 'bot-pin-i', 'i'), h('span', null, DISCLAIMER));

  const log = h('div', 'bot-log');
  const input = h('div', 'bot-input');
  const menu = h('span', 'bot-menu', '/');
  const field = h('span', 'bot-field');
  const ph = h('span', 'bot-ph', 'Message');
  const typed = h('span', 'bot-typed-cmd');
  const caret = h('span', 'bot-caret');
  field.append(ph, typed, caret);
  const send = h('span', 'bot-send');
  input.append(menu, field, send);

  pane.append(bar, pin, log, input);
  root.append(pane);

  /* --- transform-only stacking --- */
  const GAP = 14;
  let items = [], cursor = 0, scroll = 0;
  const viewH = () => log.clientHeight;
  const place = (it) => { it.el.style.transform = `translate3d(0, ${Math.round(it.y - scroll)}px, 0)`; };
  // new messages are placed at their slot with no transition, then the stack scrolls (transform)
  const add = (el, { animate = true } = {}) => {
    el.style.transition = 'none';
    log.append(el);
    const it = { el, y: cursor, h: el.offsetHeight };
    cursor += it.h + GAP;
    items.push(it);
    if (!animate) el.classList.add('is-in');
    place(it);
    void el.offsetWidth;
    el.style.transition = '';
    return it;
  };
  const PAD = 16; // .bot-msg top offset (14px) + bottom breathing room
  const scrollTo = () => {
    scroll = Math.max(0, cursor - GAP + PAD + 14 - viewH());
    items.forEach(place);
    // drop messages that are well above the viewport (absolute, so nothing else moves)
    items = items.filter((it) => {
      if (it.y + it.h - scroll < -200) { it.el.remove(); return false; }
      return true;
    });
  };
  // re-measure everything (fonts loaded, width changed); transform only, so nothing shifts
  const relayout = () => {
    cursor = 0;
    for (const it of items) { it.y = cursor; it.h = it.el.offsetHeight; cursor += it.h + GAP; }
    scrollTo();
  };
  let lw = 0;
  const ro = new ResizeObserver(([e]) => {
    const w = Math.round(e.contentRect.width);
    if (w !== lw) { const first = !lw; lw = w; if (!first) relayout(); }
  });
  ro.observe(log);
  const fontsReady = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))])
    .then(() => relayout());
  const remove = (it) => {
    it.el.remove();
    items = items.filter((x) => x !== it);
    cursor = it.y;
  };

  const reveal = (r, full = true) => {
    r.card.classList.add('is-head');
    r.vals.forEach((x) => { x.row.classList.add('is-on'); if (full) { x.typed.textContent = x.v; x.rest.textContent = ''; } });
    r.spark.classList.add('is-on');
    r.card.classList.add('is-done');
  };

  /* --- reduced motion: first exchange, static --- */
  if (RM) {
    root.classList.add('is-static');
    const first = script[0];
    add(userMsg(first.cmd), { animate: false });
    const r = replyMsg(first);
    add(r.m, { animate: false });
    reveal(r);
    scrollTo();
    return { destroy() { ro.disconnect(); root.textContent = ''; } };
  }

  /* --- pausable clock --- */
  let visible = false, alive = true, raf = 0, last = 0;
  const timers = new Set();
  const running = () => visible && !document.hidden && alive;
  const loop = (now) => {
    const dt = Math.min(200, now - last);
    last = now;
    for (const t of timers) {
      if (t.fn) { if (t.fn(dt)) { timers.delete(t); t.resolve(); } continue; }
      t.left -= dt;
      if (t.left <= 0) { timers.delete(t); t.resolve(); }
    }
    raf = running() ? requestAnimationFrame(loop) : 0;
  };
  const wake = () => {
    root.classList.toggle('is-paused', !running());
    if (running() && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  const sleep = (ms) => new Promise((resolve) => timers.add({ left: ms, resolve }));
  const type = (len, min, max, render) => new Promise((resolve) => {
    let k = 0, acc = 0, next = rand(min, max);
    timers.add({
      resolve,
      fn(dt) {
        acc += dt;
        let moved = false;
        while (acc >= next && k < len) { acc -= next; k++; next = rand(min, max); moved = true; }
        if (moved) render(k);
        return k >= len;
      },
    });
  });

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }, { rootMargin: '40px 0px' });
  io.observe(root);
  const onVis = () => wake();
  document.addEventListener('visibilitychange', onVis);

  // Open on a finished first exchange so the pane is never empty, then continue from command 2.
  const seed = () => {
    const s = script[0];
    add(userMsg(s.cmd), { animate: false });
    const r = replyMsg(s);
    add(r.m, { animate: false });
    reveal(r);
    scrollTo();
  };

  async function exchange(s) {
    // type the command
    field.classList.add('has-text');
    await type(s.cmd.length, 70, 110, (k) => { typed.textContent = s.cmd.slice(0, k); });
    if (!alive) return;
    await sleep(320);
    send.classList.add('is-sent');
    await sleep(160);
    typed.textContent = '';
    field.classList.remove('has-text');
    send.classList.remove('is-sent');
    const u = add(userMsg(s.cmd));
    scrollTo();
    requestAnimationFrame(() => u.el.classList.add('is-in'));
    await sleep(500);
    // bot typing
    const t = add(typingMsg());
    scrollTo();
    requestAnimationFrame(() => t.el.classList.add('is-in'));
    await sleep(900);
    remove(t);
    // reply: inserted at final size, then streamed
    const r = replyMsg(s);
    r.vals.forEach((x) => { x.typed.textContent = ''; x.rest.textContent = x.v; });
    const it = add(r.m);
    scrollTo();
    it.el.classList.add('is-in');
    await sleep(120);
    r.card.classList.add('is-head');
    await sleep(220);
    for (const x of r.vals) {
      x.row.classList.add('is-on');
      await type(x.v.length, 12, 22, (k) => { x.typed.textContent = x.v.slice(0, k); x.rest.textContent = x.v.slice(k); });
      if (!alive) return;
      await sleep(60);
    }
    r.spark.classList.add('is-on');
    await sleep(520);
    r.card.classList.add('is-done');
  }

  seed();
  async function run() {
    await sleep(2600);
    let i = 1;
    while (alive) {
      await exchange(script[i % script.length]);
      if (!alive) return;
      await sleep(6000);
      i++;
    }
  }
  fontsReady.then(() => { if (alive) run(); });

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      timers.clear();
    },
  };
}
