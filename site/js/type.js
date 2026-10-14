/* "Questions people ask us": the hero FAQ card for Crypto Club Vienna.
 *
 *   askSkeleton(root, qa, opts)  Builds the card in its resting state, synchronously, with no
 *                                motion. Safe to call at boot; askLoop() reuses what it built.
 *   askLoop(root, qa, opts)      Replays the club FAQ: a question types in slowly, a short
 *                                "typing" beat, then the answer streams in. Returns { destroy }.
 *
 * opts (all optional): { title, subtitle, placeholder, scanning, thinking, footer, chips, label }
 *
 * It replays real FAQ entries; it is not an assistant and never pretends to be one.
 * Layout never moves: css/ask.css gives .ask a fixed height per breakpoint (desktop: answer card
 * above a fixed dock; <=1100px: one compact box where the answer replaces the question in place).
 * The full Q&A list is always in the DOM as a visually hidden <dl> for assistive tech.
 */

const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

const ASK_DEFAULTS = {
  title: 'Crypto Club Vienna',
  subtitle: 'Student Web3 community',
  chips: ['Learn', 'Markets', 'Build', 'Meet'],
  footer: 'Student-driven · Wien · since 2025',
  scanning: 'From the club FAQ',
  thinking: 'Typing',
  placeholder: 'Questions people ask us',
  label: 'Questions people ask Crypto Club Vienna',
};

const h = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const pad2 = (n) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ skeleton */
export function askSkeleton(root, qa = [], opts = {}) {
  if (!root) return null;
  if (root.__ask) return root.__ask;
  const o = { ...ASK_DEFAULTS, ...opts };
  root.classList.add('ask');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', o.label);
  root.dataset.phase = 'idle';
  root.textContent = '';

  // Source of truth for assistive tech: every question and answer, complete.
  const sr = h('div', 'ask-sr');
  const dl = h('dl');
  qa.forEach(({ q, a }) => dl.append(h('dt', null, q), h('dd', null, a)));
  sr.append(dl);

  // Animated UI duplicates the <dl>, so it is hidden from assistive tech.
  const ui = h('div', 'ask-ui');
  ui.setAttribute('aria-hidden', 'true');

  // answer card (desktop: floats above the dock; phone: shares the text slot with the question)
  const card = h('div', 'ask-card');
  const head = h('div', 'ask-card-head');
  const tile = h('span', 'ask-tile');
  tile.append(h('i'), h('i'), h('i'), h('i'));
  const who = h('span', 'ask-who');
  who.append(h('b', null, o.title), h('span', null, o.subtitle));
  head.append(tile, who);
  const ans = h('p', 'ask-answer');
  const typed = h('span', 'ask-typed');
  const rest = h('span', 'ask-rest');
  ans.append(typed, rest);
  const foot = h('p', 'ask-foot', o.footer);
  card.append(head, ans, foot);

  // phone head row: FAQ index + status
  const top = h('div', 'ask-top');
  const idx = h('span', 'ask-idx');
  const ctx = h('span', 'ask-ctx');
  top.append(idx, ctx);

  const status = h('div', 'ask-status');
  const thinking = h('span', 'ask-thinking');
  thinking.append(h('span', null, o.thinking), h('i'), h('i'), h('i'));
  const scanning = h('span', 'ask-scanning');
  scanning.append(h('i'), h('span', null, o.scanning));
  status.append(thinking, scanning);

  const prompt = h('div', 'ask-prompt');
  const num = h('span', 'ask-num');
  const field = h('span', 'ask-field');
  const qText = h('span', 'ask-q');
  const caret = h('span', 'ask-caret');
  const ph = h('span', 'ask-ph', o.placeholder);
  field.append(ph, qText, caret);
  const send = h('span', 'ask-send');
  prompt.append(num, field, send);

  const chips = h('div', 'ask-chips');
  o.chips.forEach((c) => chips.append(h('span', 'ask-chip', c)));

  const dock = h('div', 'ask-dock');
  dock.append(card, status, prompt, chips);
  ui.append(top, dock);
  root.append(sr, ui);

  const n = qa.length;
  const st = {
    o, qa, ui, card, typed, rest, qText, prompt, send, thinking, scanning, idx, num, ctx, chips, dock,
    // set(i, {q, a}): q = question visible, a = answer fully typed (else reserved, invisible)
    set(i, { q = true, a = true } = {}) {
      const item = qa[i];
      if (!item) return;
      qText.textContent = q ? item.q : '';
      prompt.classList.toggle('has-text', q);
      typed.textContent = a ? item.a : '';
      rest.textContent = a ? '' : item.a;
      ctx.textContent = item.q;
      idx.textContent = `FAQ ${pad2(i + 1)}/${pad2(n)}`;
      num.textContent = pad2(i + 1);
    },
    phase(p) { root.dataset.phase = p; },
  };
  if (n) st.set(0, { q: false, a: false });
  root.__ask = st;
  return st;
}

/* ------------------------------------------------------------------ loop */
export function askLoop(root, qa = [], opts = {}) {
  if (!root || !qa.length) return { destroy() {} };
  const st = askSkeleton(root, qa, opts);
  const { card, typed, rest, qText, prompt, send, thinking, scanning, set, phase } = st;

  /* --- reduced motion: first Q&A complete, with previous / next --- */
  if (RM) {
    let i = 0;
    root.classList.add('is-static');
    card.classList.add('is-open', 'is-done');
    phase('done');
    set(0);
    const nav = h('div', 'ask-nav');
    const count = h('span', 'ask-count', `${pad2(1)}/${pad2(qa.length)}`);
    count.setAttribute('aria-hidden', 'true');
    const go = (d) => { i = (i + d + qa.length) % qa.length; set(i); count.textContent = `${pad2(i + 1)}/${pad2(qa.length)}`; };
    const mk = (label, d, glyph) => {
      const b = h('button', 'ask-btn');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
      b.addEventListener('click', () => go(d));
      return b;
    };
    nav.append(mk('Previous question', -1, '&larr;'), count, mk('Next question', 1, '&rarr;'));
    root.append(nav);
    return { destroy() { nav.remove(); } };
  }

  /* --- pausable clock: time only passes while the card is on screen and the tab is visible --- */
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
  // frame-rate independent typewriter: emits as many characters as the elapsed time allows
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

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); });
  io.observe(root);
  const onVis = () => wake();
  document.addEventListener('visibilitychange', onVis);

  const show = (node, on) => node.classList.toggle('is-on', on);

  async function run() {
    let i = 0;
    while (alive) {
      const { q, a } = qa[i];
      card.classList.remove('is-open', 'is-done');
      set(i, { q: false, a: false });
      phase('idle');
      await sleep(1400);
      // question: slow, human, jittered
      phase('q');
      prompt.classList.add('has-text');
      await type(q.length, 60, 95, (k) => { qText.textContent = q.slice(0, k); });
      if (!alive) return;
      send.classList.add('is-sent');
      phase('sent');
      await sleep(600);
      phase('wait');
      show(thinking, true);
      await sleep(1100);
      show(thinking, false);
      send.classList.remove('is-sent');
      // answer: layout is final from the first frame (untyped rest is reserved, invisible)
      typed.textContent = '';
      rest.textContent = a;
      card.classList.add('is-open');
      phase('a');
      await sleep(380);
      await type(a.length, 18, 30, (k) => { typed.textContent = a.slice(0, k); rest.textContent = a.slice(k); });
      if (!alive) return;
      card.classList.add('is-done');
      phase('done');
      await sleep(9000);
      card.classList.remove('is-open', 'is-done');
      phase('out');
      await sleep(600);
      i = (i + 1) % qa.length;
    }
  }
  run();

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      timers.clear();
    },
  };
}
