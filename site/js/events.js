// Events rendered as a chain of blocks. Each block's hash = sha256(prev hash + event data),
// so the hashes on the page are real and change if an event is edited.
import { json, sha256, shortHash, reduced, whileVisible } from './util.js';

const INSTAGRAM = 'https://www.instagram.com/cryptoclubvienna/';
const fmtDay = d => String(d.getDate()).padStart(2, '0');
const fmtMon = d => d.toLocaleString('en-GB', { month: 'short', timeZone: 'Europe/Vienna' });

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function blockHTML(ev, i, hash) {
  const d = ev.start ? new Date(ev.start) : null;
  const time = d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }) : '';
  const where = [ev.venue, time].filter(Boolean).join(' · ');
  return `
  <article class="cblock${ev.attendees >= 150 ? ' is-big' : ''}" data-ev="${esc(ev.id)}" data-hash="${hash}">
    <div class="cb-date"><span class="d">${d ? fmtDay(d) : esc(ev.attendees ?? '')}</span><span class="my mono"><span>${d ? fmtMon(d) : esc(ev.dateLabel || '')}</span><span>${d ? d.getFullYear() : ''}</span></span></div>
    <div class="cb-body"><h3>${esc(ev.title)}</h3><p>${esc(ev.summary)}</p></div>
    <footer class="cb-foot"><span class="cb-where">${esc(where)}</span>${ev.link ? `<a href="${esc(ev.link)}" target="_blank" rel="noopener">Event page<span aria-hidden="true"> ↗</span></a>` : ''}</footer>
  </article>`;
}

function nextHTML(ev) {
  const d = new Date(ev.start);
  const when = `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })}`;
  return `
  <article class="next-card" data-ev="${esc(ev.id)}" aria-labelledby="next-h">
    ${ev.cover ? `<div class="nc-media"><img src="${esc(ev.cover)}" alt="${esc(ev.coverAlt || '')}" loading="lazy" decoding="async"></div>` : ''}
    <div class="nc-body">
      <p class="nc-top"><span class="cb-tag">Next event</span><span class="nc-when">${esc(when)}</span></p>
      <h3 class="nc-title" id="next-h">${esc(ev.title)}</h3>
      <p class="nc-sum">${esc(ev.summary)}</p>
      <div class="countdown" data-countdown="${esc(ev.start)}"></div>
      <div class="nc-foot"><span class="cb-where">${esc([ev.venue, ev.address].filter(Boolean).join(", "))}</span>${ev.link ? `<a class="btn btn-light" href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(ev.linkLabel || 'Event page')}<span aria-hidden="true"> ↗</span></a>` : ''}</div>
    </div>
  </article>`;
}

function pendingHTML() {
  return `
  <article class="cblock is-pending" aria-label="Next event: not announced yet">
    <div class="mine-grid" aria-hidden="true">${'<i></i>'.repeat(32)}</div>
    <div class="cb-body"><h3>Next event: date coming soon</h3><p>We announce new dates on Instagram. Follow @cryptoclubvienna so you don't miss one.</p></div>
    <footer class="cb-foot"><span class="nonce data" aria-hidden="true">mining · nonce 0</span><a href="${INSTAGRAM}" target="_blank" rel="noopener">Follow ↗</a></footer>
  </article>`;
}

export async function initEvents(root) {
  const { events } = await json('../data/events.json');
  const past = events.filter(e => e.status !== 'upcoming');
  const upcoming = events.find(e => e.status === 'upcoming' && new Date(e.start) > new Date());
  let prev = '0'.repeat(64);
  const parts = [];
  for (const [i, ev] of past.entries()) {
    const hash = await sha256(prev + JSON.stringify(ev));
    parts.push(blockHTML(ev, i, hash));
    prev = hash;
  }
  if (!upcoming) parts.push(pendingHTML());
  root.innerHTML = parts.join('<span class="link-bar" aria-hidden="true"></span>');
  const nextBox = document.getElementById('next-event');
  if (nextBox && upcoming) { nextBox.innerHTML = nextHTML(upcoming); nextBox.hidden = false; }

  // One site-wide state: the light "live" signal appears only while an event is announced
  document.documentElement.dataset.state = upcoming ? 'live' : 'idle';
  if (upcoming) {
    const d = new Date(upcoming.start);
    const label = `${d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/Vienna' })} ${fmtDay(d)} ${fmtMon(d)}`;
    const navText = document.getElementById('nav-live-text');
    if (navText) navText.textContent = `Next event: ${label}`;
    const cta = document.getElementById('hero-cta');
    if (cta && upcoming.link) { cta.href = upcoming.link; cta.textContent = `${upcoming.linkLabel || 'Next event'} · ${label}`; cta.classList.replace('btn-accent', 'btn-light'); }
  }

  // Phone: "1 / 4" position counter under the swipeable chain
  const count = document.createElement('p');
  count.className = 'chain-count data';
  count.setAttribute('aria-hidden', 'true');
  const blocks = [...root.querySelectorAll('.cblock')];
  count.innerHTML = `<span>1 / ${blocks.length}</span>`;
  root.after(count);
  root.addEventListener('scroll', () => {
    const start = root.getBoundingClientRect().left + parseFloat(getComputedStyle(root).paddingLeft);
    const atEnd = root.scrollLeft + root.clientWidth >= root.scrollWidth - 4;
    const i = atEnd ? blocks.length - 1 : blocks.findIndex(b => b.getBoundingClientRect().right > start + 8);
    count.firstChild.textContent = `${Math.min(blocks.length, i + 1)} / ${blocks.length}`;
  }, { passive: true });

  // Countdown (only when an upcoming event exists)
  const cd = document.querySelector('#next-event [data-countdown]');
  if (cd) {
    const target = new Date(cd.dataset.countdown).getTime();
    const tick = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60);
      cd.innerHTML = [[d, 'days'], [h, 'hrs'], [m, 'min']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
    };
    tick(); setInterval(tick, 30000);
  }

  if (reduced || !window.gsap) return;
  const gsap = window.gsap;

  // block entrances: motion pack (js/motion.js)
  // Mining animation on the pending block
  const cells = [...root.querySelectorAll('.mine-grid i')];
  const nonce = root.querySelector('.nonce');
  let n = 0, timer = null;
  const mine = () => {
    cells.forEach(c => c.classList.toggle('on', Math.random() < 0.12));
    n += Math.floor(Math.random() * 9000 + 1000);
    if (nonce) nonce.textContent = `mining · nonce ${n.toLocaleString('en-US')}`;
  };
  whileVisible(root, () => { if (cells.length && !timer) timer = setInterval(mine, 900); },
    () => { clearInterval(timer); timer = null; });
}
