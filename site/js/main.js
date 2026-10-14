// Orchestrator: smooth scroll, nav, section motion and the feature modules.
// Modules load independently, so one failure never takes the page down.
import { reduced, sha256, json } from './util.js';
import { CONFIG } from './config.js';
import { initMotion } from './motion.js';

const gsap = window.gsap;
const ST = window.ScrollTrigger;
const hasGsap = !!(gsap && ST);
if (hasGsap) gsap.registerPlugin(ST);
const root = document.documentElement;
root.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const safe = (name, fn) => Promise.resolve().then(fn).catch(err => console.warn(`[ccv] ${name} failed`, err));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- smooth scroll + focus-moving anchors ---------- */
// Smooth scroll on mouse and trackpad only; touch keeps native scroll, and phones never download Lenis
let lenis = null;
if (hasGsap && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const s = document.createElement('script');
  s.src = 'vendor/lenis.min.js';
  s.onload = () => {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  };
  document.head.append(s);
}
function focusSection(el) {
  if (!el) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = $(id);
  if (!target) return;
  e.preventDefault();
  const isTop = id === '#top';
  if (lenis) lenis.scrollTo(isTop ? 0 : target, { offset: isTop ? 0 : -64, duration: 1.3 });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  focusSection(isTop ? $('#hero-title') : target);
  history.replaceState(null, '', id);
}));

/* ---------- nav ---------- */
function initNav() {
  const nav = $('#nav');
  let lastY = scrollY;
  const onScroll = y => {
    nav.classList.toggle('is-scrolled', y > 40);
    const down = y > lastY && y > 400;
    nav.classList.toggle('is-hidden', down && !nav.matches(':focus-within'));
    lastY = y;
  };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });  // Lenis scrolls the window, so this fires either way
  // keyboard users tabbing into a hidden bar get it back at once
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  onScroll(scrollY);
}

/* ---------- active nav link ---------- */
function initActiveNav() {
  if (!hasGsap) return;
  const navLinks = $$('.nav-links a');
  navLinks.forEach(a => {
    const id = a.getAttribute('href');
    const el = $(id);
    if (!el) return;
    ST.create({
      trigger: el, start: 'top 50%', end: 'bottom 50%',
      onToggle: s => {
        a.classList.toggle('is-active', s.isActive);
        s.isActive ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
      },
    });
  });
}

/* ---------- manifesto: words light up with scroll ---------- */
function initManifesto() {
  const p = $('.manifesto-text');
  if (!p || !hasGsap || reduced) return;
  const wrap = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) frag.append(t);
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  };
  wrap(p);
  p.classList.add('is-split');
  const words = $$('.w', p);
  ST.create({
    trigger: p, start: 'top 82%', end: 'bottom 50%', scrub: true,
    onUpdate: s => { const k = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('lit', i < k)); },
  });
}

/* ---------- join steps confirm one after another (entrances are the motion pack's job) ---------- */
function initReveals() {
  if (!hasGsap || reduced) return;
  const steps = $$('.step');
  ST.create({ trigger: '.steps', start: 'top 75%', once: true, onEnter: () => steps.forEach((s, i) => setTimeout(() => s.classList.add('is-confirmed'), 300 + i * 360)) });
}

/* ---------- partners ---------- */
function initPartners() {
  const list = $('#partner-list');
  if (!list) return;
  list.innerHTML = CONFIG.partners.map(p => `<li><span class="pname">${esc(p.name)}</span><span class="prole mono">${esc(p.role)}</span></li>`).join('')
    + '<li class="is-open"><span class="pname">Your company?</span><a class="link" href="#join">Write to us about a partnership</a></li>';
}

/* ---------- join form: validation + "mint" confirmation ---------- */
function initForm() {
  const form = $('#join-form');
  if (!form) return;
  const status = $('#jf-status');
  const msgs = { name: 'Add your name so we know who is writing.', email: 'Add an email address we can reply to, like name@example.com.' };
  const check = f => {
    const bad = !f.checkValidity();
    f.setAttribute('aria-invalid', bad ? 'true' : 'false');
    const err = document.getElementById(`${f.id}-err`);
    if (err) err.textContent = bad ? msgs[f.name] : '';
    return !bad;
  };
  form.querySelectorAll('input[required]').forEach(f => f.addEventListener('blur', () => f.value && check(f)));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const required = [...form.querySelectorAll('input[required]')];
    const firstBad = required.find(f => !check(f));
    if (firstBad) { firstBad.focus(); status.textContent = 'Check the highlighted fields.'; return; }
    const data = Object.fromEntries(new FormData(form));
    let sent = false;
    if (CONFIG.formEndpoint) {
      status.textContent = 'Sending…';
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
        sent = true;
      } catch {
        status.textContent = 'That didn\'t go through. Check your connection and send it again, or message us on Instagram.';
        return;
      }
    }
    await mint(data, sent);
    form.reset();
    status.textContent = '';
  });

  async function mint(data, sent) {
    const box = $('#minted');
    const first = String(data.name).trim().split(/\s+/)[0];
    const ts = new Date().toISOString();
    const hash = await sha256(`${data.name}|${ts}|${[...document.querySelectorAll('#chain [data-hash]')].at(-1)?.dataset.hash || ''}`);
    const ident = [...hash.slice(0, 16)].map((c, i) => `<i class="${i === 0 ? 'accent' : parseInt(c, 16) > 7 ? 'on' : ''}"></i>`).join('');
    box.innerHTML = `
      <div class="ident" aria-hidden="true">${ident}</div>
      <div><p class="mono">Block confirmed</p><h3>Welcome, ${esc(first)}.</h3></div>
      <dl class="data">
        <div><dt>Hash</dt><dd>0x${hash.slice(0, 16)}…</dd></div>
        <div><dt>Time</dt><dd>${new Date(ts).toLocaleString('en-GB', { timeZone: 'Europe/Vienna' })}</dd></div>
        <div><dt>Status</dt><dd>${sent ? `Sent. We'll write back to ${esc(data.email)}.` : 'Preview only. The form isn\'t connected yet, so nothing was sent. Message us on Instagram.'}</dd></div>
      </dl>`;
    box.hidden = false;
    box.setAttribute('tabindex', '-1');
    if (hasGsap && !reduced) gsap.from(box, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.out' });
    box.focus({ preventScroll: true });
  }
}

/* ---------- phone menu (≤900px): a sheet under the bar; Esc, link or button closes it ---------- */
function initMenu() {
  const btn = $('.nav-menu');
  const menu = $('#menu');
  if (!btn || !menu) return;
  const outside = [$('#main'), $('#footer')];
  const set = open => {
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.nav-menu-txt').textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
    outside.forEach(el => el && (el.inert = open));
    if (open) {
      menu.hidden = false;
      lenis?.stop();
      requestAnimationFrame(() => menu.classList.add('is-open'));
      menu.querySelector('a')?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      lenis?.start();
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduced ? 0 : 320);
    }
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  // capture phase: close before the anchor handler scrolls
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) set(false); });
}

/* ---------- gallery lead: the frame settles as it scrolls through (scroll-linked, lerped) ---------- */
function initLeadScrub() {
  const img = $('.gallery-lead img');
  if (!img || !hasGsap || reduced) return;
  gsap.fromTo(img, { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.gallery-lead', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
}

/* ---------- hero 3D + Ask + bot ---------- */
// Live 3D only where it is cheap: wide screens, 4+ cores, no data saver, motion allowed.
// Everywhere else (phones, reduced motion) the hero shows a still frame of the same scene.
const canRun3D = () => new URLSearchParams(location.search).has('force3d') || matchMedia('(min-width: 800px)').matches && !reduced
  && (navigator.hardwareConcurrency || 4) >= 4 && !navigator.connection?.saveData;
function showHeroPoster(el) {
  const src = el.dataset.poster;
  if (!src || el.querySelector('.hero-poster')) return;
  const img = new Image();
  img.className = 'hero-poster'; img.alt = ''; img.decoding = 'async';
  img.src = src; img.srcset = el.dataset.posterSet || '';
  img.sizes = '100vw';
  el.prepend(img);
}
async function initHeroScene() {
  const el = $('#hero-3d');
  if (!canRun3D()) { showHeroPoster(el); return; }
  // start after first paint and idle time, so the 3D never delays the headline
  await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 1500 }));
  const { initHero3D } = await import('./hero3d.js');
  const ctl = await initHero3D(el, { reducedMotion: reduced });
  if (ctl && hasGsap && !reduced) {
    ST.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: s => ctl.setScroll?.(s.progress) });
  }
}
async function initAsk() {
  const el = $('#ask');
  if (!el) return;
  const { askLoop } = await import('./type.js');
  // The "next meetup" answer comes from events.json, so it never goes stale
  let items = CONFIG.ask;
  try {
    const { events } = await json('../data/events.json');
    const next = events.find(e => e.status === 'upcoming' && new Date(e.start) > new Date());
    const last = events.filter(e => e.status !== 'upcoming').at(-1);
    const day = d => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Vienna' });
    const a = next
      ? `${next.title}, ${day(next.start)}, at ${next.venue}. Doors open at ${new Date(next.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })}. Registration is on Luma.`
      : `No date is public yet. New dates go up on Instagram at @cryptoclubvienna.${last ? ` The last one was ${last.title} at ${last.venue}.` : ''}`;
    items = CONFIG.ask.map(x => (x.id === 'next' ? { ...x, a } : x));
  } catch { /* keep the static answers */ }
  askLoop(el, items, CONFIG.askLabels);
}

/* ---------- boot ---------- */
$('#year') && ($('#year').textContent = new Date().getFullYear());
$('.skip')?.addEventListener('click', () => focusSection($('#main')));

initNav();
initMenu();
initPartners();
initMotion();
initForm();
initManifesto();
initReveals();

// Heavy blocks build only when the reader gets within a screen and a half of them
const near = (el, fn) => new Promise(resolve => {
  if (!el) return resolve();
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    resolve(fn());
  }, { rootMargin: '150% 0px 150% 0px' });
  io.observe(el);
});
// after a block renders: give its new parts their motion and re-measure scroll triggers
const settle = () => { initMotion(); if (hasGsap) ST.refresh(); };
const lazy = (name, el, load) => safe(name, () => near(el, load)).then(settle);

const modules = [
  safe('events', async () => (await import('./events.js')).initEvents($('#chain'))),
  safe('gallery', async () => (await import('./gallery.js')).initGallery($('#strip'))),
];
safe('hero3d', initHeroScene);
safe('ask', initAsk);
lazy('tracks', $('#tracks'), async () => (await import('./tracks.js')).initTracks($('#tracks-list')));
lazy('map', $('#map'), async () => (await import('./map.js')).initMap($('#vienna-map')));
lazy('bot', $('#bot'), async () => (await import('./bot.js')).initBot($('#bot-term')));
if (hasGsap) {
  // Triggers below the first blocks are measured once they have rendered
  Promise.allSettled([...modules, document.fonts?.ready]).then(() => {
    initMotion();
    initLeadScrub();
    initActiveNav();
    ST.refresh();
  });
  addEventListener('load', () => setTimeout(() => ST.refresh(), 200));
}
