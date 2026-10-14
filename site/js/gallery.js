// Photos: one full-bleed lead frame, then a strip (drag or arrow keys). The section stays hidden
// until data/gallery.json lists real photos (entries without src are skipped, never faked).
// Round 4: no parallax or drift; nothing here moves on its own.
import { json, reduced } from './util.js';

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const img = (p, sizes) => `<img src="${esc(p.src800 || p.src)}" srcset="${p.src800 ? `${esc(p.src800)} 800w, ` : ''}${esc(p.src)} 1600w" sizes="${sizes}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async">`;

export async function initGallery(strip) {
  const photos = (await json('../data/gallery.json')).photos.filter(p => p.src);
  if (!photos.length) return;
  const section = strip.closest('section');
  section.hidden = false;

  const lead = photos.find(p => p.lead);
  const leadEl = document.getElementById('gallery-lead');
  if (lead && leadEl) {
    leadEl.innerHTML = img(lead, '100vw');
    leadEl.hidden = false;
  }
  strip.innerHTML = photos.filter(p => p !== lead).map(p => `
    <figure class="shot" style="--ar:${esc(p.ar || '4/5')}">
      ${img(p, '(max-width: 800px) 86vw, 34vw')}
      ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}
    </figure>`).join('');
  window.ScrollTrigger?.refresh();

  // drag to scroll (mouse only; touch scrolls natively)
  let down = false, startX = 0, startLeft = 0, moved = false;
  strip.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startLeft = strip.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { moved = true; strip.classList.add('is-drag'); }
    strip.scrollLeft = startLeft - dx;
  });
  addEventListener('pointerup', () => { down = false; strip.classList.remove('is-drag'); });
  strip.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  strip.addEventListener('dragstart', e => e.preventDefault());
  // keyboard: arrow keys scroll by most of a screen
  strip.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    strip.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * strip.clientWidth * .6, behavior: reduced ? 'auto' : 'smooth' });
  });
}
