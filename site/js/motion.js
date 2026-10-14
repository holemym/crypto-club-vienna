// Motion pack "confirm": which primitive each block uses (states and timings live in css/motion.css).
// One observer marks elements .is-in as they enter; elements entering together get a stagger index (--i)
// in DOM order. html.m is set in <head> only when motion is allowed, and dropped if this file never runs.
import { reduced } from './util.js';

// [selector, primitive] — one line per job, grouped by block in page order
export const SPEC = [
  // hero: its load sequence is pure CSS (css/motion.css, 'hero load'), so it starts on first paint
  // proof: three numbers land in a row
  ['.proof-grid li', 'rise'],
  // every block header: label, heading out of its mask, lede
  ['.sec-label', 'rise'], ['[data-rise]', 'mask'], ['.sec-head .lede', 'rise'], ['.vm-intro .lede', 'rise'],
  // events: blocks confirm left to right, then the links between them draw
  ['.next-card', 'rise'], ['.cblock', 'rise'], ['.link-bar', 'draw'],
  // manifesto: values land, their bars draw (words are scroll-linked in main.js)
  ['.values li', 'rise'],
  // tracks and formats
  ['.tr-h', 'rise'],
  // photos: the lead frame opens, the strip follows
  ['.gallery-lead', 'frame'], ['.shot', 'rise'],
  // bot band inside Learn: head, three lines, action
  ['.bb-head', 'rise'], ['.bb-list li', 'rise'], ['.bb-cta', 'rise'], ['.bot-band .bot-term', 'rise'],
  // partners: rows land and their rules draw; the offer card last
  ['.partner-list li', 'rise'], ['.offer', 'rise'],
  // join: steps (they also confirm in main.js), the form card
  ['.step', 'rise'], ['.join-right', 'rise'],
  // footer: link columns, then the lockup wipes open
  ['.footer-links', 'rise'], ['.footer-coords', 'rise'], ['.wordmark', 'frame'],
];

const MAX_STAGGER = 8;
let io = null;
const pending = new Set();
let sweeping = false;

// Call once at boot and again after async modules render: elements already assigned are skipped.
export function initMotion(root = document) {
  const html = document.documentElement;
  html.classList.add('m-ready');
  if (reduced || !('IntersectionObserver' in window) || !html.classList.contains('m')) { html.classList.remove('m'); return; }

  const els = [];
  for (const [sel, prim] of SPEC) {
    root.querySelectorAll(sel).forEach(el => {
      if (el.dataset.m) return;
      el.dataset.m = prim;
      if (prim === 'mask' && !el.querySelector(':scope > .m-in')) {
        const inner = document.createElement('span');
        inner.className = 'm-in';
        inner.append(...el.childNodes);
        el.append(inner);
      }
      els.push(el);
    });
  }

  io ??= new IntersectionObserver(entries => {
    const hits = entries.filter(e => e.isIntersecting).map(e => e.target)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    hits.forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, MAX_STAGGER));
      el.classList.add('is-in');
      io.unobserve(el);
      // masks clip only while their text travels; at rest nothing is cut (tall Syne glyph boxes)
      if (el.dataset.m === 'mask' || el.dataset.m === 'line') setTimeout(() => el.classList.add('is-done'), 1300 + Math.min(i, MAX_STAGGER) * 90);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
  els.forEach(el => io.observe(el));

  els.forEach(el => pending.add(el));
  if (!sweeping) {
    // Anything that ends up above the viewport without being seen (deep link, jump, reload mid-page)
    // is shown at once, without motion, so scrolling back up never finds an empty block
    sweeping = true;
    let ticking = false;
    const sweep = () => {
      ticking = false;
      pending.forEach(el => {
        if (el.classList.contains('is-in')) { pending.delete(el); return; }
        if (el.getBoundingClientRect().bottom < 0) { el.style.transition = 'none'; el.classList.add('is-in'); io.unobserve(el); pending.delete(el); }
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(sweep); } }, { passive: true });
    requestAnimationFrame(sweep);
  }
}
