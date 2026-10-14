/* Interactive Vienna map (Block 05).
   SVG districts from vienna.json, HTML pin buttons from venues.json, side panel with
   kind filters, detail card and an accessible venue list.

   Kind → grey value and glyph (round 4: one accent only; U-Bahn colours stay on the U-Bahn layer):
     uni      → --paper  solid square
     hub      → --fog    hollow square with core
     industry → --fog    diamond (square on its point)
     scene    → --fog    2×2 cross
   Violet (--accent) is reserved for ccv:true (venues where the club has held events). */

import { json } from './util.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const M = 24; // viewBox margin around the 1000-wide city

const KIND_DEFS = {
  uni: { label: 'Universities', one: 'University', color: 'var(--paper)', glyph: 'solid' },
  hub: { label: 'Hubs', one: 'Hub', color: 'var(--fog)', glyph: 'hollow' },
  industry: { label: 'Industry', one: 'Industry', color: 'var(--fog)', glyph: 'diamond' },
  scene: { label: 'Scene & landmarks', one: 'Scene & landmark', color: 'var(--fog)', glyph: 'cross' },
  landmark: { label: 'Landmarks', one: 'Landmark', color: 'var(--fog)', glyph: 'cross' },
};
const SPARE = ['var(--fog)'];
const LINE_COLOR = { U1: 'var(--u1)', U2: 'var(--u2)', U3: 'var(--u3)', U4: 'var(--u4)', U5: 'var(--u5, #29a3a8)', U6: 'var(--u6)' };
const LINE_INK = { U3: true, U4: true, U5: true }; // dark text on light line colours (contrast)

/* Water: waypoints in lat/lng, traced from the district borders that run mid-stream
   (19|21, 20|21, 2|22, 11|22 for the Danube; 19|20, 9|20, 2|9, 1|2, 2|3, 2|11 for the canal). */
const DANUBE = [
  [48.3050, 16.3330], [48.2840, 16.3532], [48.2634, 16.3696], [48.2493, 16.3822], [48.2370, 16.3954],
  [48.2280, 16.4066], [48.2171, 16.4214], [48.2080, 16.4342], [48.1991, 16.4474], [48.1925, 16.4571],
  [48.1803, 16.4756], [48.1707, 16.4909], [48.1596, 16.5110], [48.1500, 16.5420], [48.1380, 16.5800],
];
const DONAUKANAL = [
  [48.2634, 16.3696], [48.2610, 16.3656], [48.2578, 16.3663], [48.2536, 16.3687], [48.2495, 16.3680],
  [48.2444, 16.3636], [48.2405, 16.3607], [48.2370, 16.3589], [48.2330, 16.3586], [48.2296, 16.3605],
  [48.2258, 16.3647], [48.2208, 16.3656], [48.2165, 16.3707], [48.2132, 16.3740], [48.2124, 16.3780],
  [48.2125, 16.3815], [48.2134, 16.3880], [48.2110, 16.3925], [48.2046, 16.3950], [48.2023, 16.4023],
  [48.1979, 16.4070], [48.1901, 16.4193], [48.1850, 16.4356], [48.1764, 16.4647], [48.1696, 16.4817],
  [48.1662, 16.4920], [48.1670, 16.4943],
];
/* Schematic U-Bahn, key stations only. */
const UBAHN = {
  U1: [[48.2775, 16.4520], [48.2430, 16.4330], [48.2330, 16.4160], [48.2185, 16.3925], [48.2117, 16.3779], [48.2085, 16.3722], [48.2005, 16.3695], [48.1870, 16.3740], [48.1745, 16.3780], [48.1430, 16.4000]],
  U2: [[48.2260, 16.5080], [48.2340, 16.5040], [48.2195, 16.4500], [48.2075, 16.4365], [48.2105, 16.4210], [48.2175, 16.4045], [48.2185, 16.3925], [48.2195, 16.3815], [48.2170, 16.3720], [48.2148, 16.3626], [48.2105, 16.3555], [48.2055, 16.3585], [48.2025, 16.3610], [48.2005, 16.3695]],
  U3: [[48.2115, 16.3115], [48.1975, 16.3200], [48.1965, 16.3380], [48.1990, 16.3520], [48.2055, 16.3585], [48.2095, 16.3660], [48.2085, 16.3722], [48.2065, 16.3845], [48.1945, 16.4020], [48.1695, 16.4205]],
  U4: [[48.1975, 16.2610], [48.1875, 16.3040], [48.1865, 16.3185], [48.1850, 16.3355], [48.1925, 16.3540], [48.2005, 16.3695], [48.2030, 16.3800], [48.2065, 16.3845], [48.2117, 16.3779], [48.2170, 16.3720], [48.2225, 16.3675], [48.2275, 16.3645], [48.2355, 16.3585], [48.2490, 16.3655]],
  U6: [[48.2565, 16.4005], [48.2420, 16.3850], [48.2380, 16.3790], [48.2355, 16.3585], [48.2315, 16.3525], [48.2265, 16.3495], [48.2165, 16.3415], [48.2110, 16.3390], [48.2025, 16.3375], [48.1965, 16.3380], [48.1905, 16.3375], [48.1850, 16.3355], [48.1745, 16.3335], [48.1300, 16.3100]],
};

const el = (tag, attrs = {}, parent) => {
  const n = tag.startsWith('svg:') ? document.createElementNS(SVGNS, tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.setAttribute('class', v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  if (parent) parent.appendChild(n);
  return n;
};
const fmt = (n) => (Math.round(n * 10) / 10).toString();

function smoothPath(pts, closed = false) {
  // Catmull-Rom → cubic Bézier
  if (pts.length < 3) return 'M' + pts.map((p) => p.map(fmt).join(' ')).join('L');
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
function offsetLine(pts, dist, taper = 2) {
  // offset to the left-hand normal (north-east bank for a NW→SE river), tapered at both ends
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const t = Math.min(1, i / taper, (pts.length - 1 - i) / taper);
    return [p[0] + (dy / len) * dist * t, p[1] - (dx / len) * dist * t];
  });
}
const ringArea = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i || r.length) - 1]; return s + q[0] * p[1] - p[0] * q[1]; }, 0)) / 2;
function inRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function calloutText(v) {
  // Prefer the curated `callout` field; otherwise derive "CCV · <Mon YYYY>" from the note.
  // Never show "Nº" (event numbering is unconfirmed, CON #21).
  if (v.callout) return v.callout;
  const note = String(v.note || '').replace(/\b(?:N[ºo°]\.?|Numero)\s*\d+\s*(?:·\s*)?/gi, '').trim();
  const date = note.match(/\b(?:\d{1,2}\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+((?:19|20)\d{2})\b/i);
  if (date) return `CCV · ${date[1].charAt(0).toUpperCase()}${date[1].slice(1, 3).toLowerCase()} ${date[2]}`;
  const yr = note.match(/\b(?:19|20)\d{2}\b/);
  return yr ? `CCV · ${yr[0]}` : 'CCV';
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function initMap(root) {
  if (!root) return;
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // The section heading may live inside the map root (<header class="vm-intro">): keep it.
  const intro = root.querySelector(':scope > .vm-intro');
  const clearRoot = () => { [...root.childNodes].forEach((n) => { if (n !== intro) n.remove(); }); };
  root.classList.add('vm');
  if (intro) root.classList.add('has-intro');

  let geo, venueData;
  try {
    [geo, venueData] = await Promise.all([json('../data/vienna.json'), json('../data/venues.json')]);
  } catch (e) {
    clearRoot();
    el('p', { class: 'vm-error mono', text: 'Map data could not be loaded.' }, root);
    return;
  }

  const W = geo.w, H = geo.h, P = geo.proj;
  const VBW = W + 2 * M, VBH = H + 2 * M;
  const proj = ([lat, lng]) => [(lng * P.k - P.minx) * P.s, (-lat - P.miny) * P.s];
  const pct = ([x, y]) => [((x + M) / VBW) * 100, ((y + M) / VBH) * 100];
  const districts = geo.districts.map((d) => ({ ...d, area: ringArea(d.rings[0]) }));
  const byN = new Map(districts.map((d) => [d.n, d]));

  /* ---------- venues + kinds (generic) ---------- */
  const venues = (venueData.venues || []).map((v) => {
    const xy = proj([v.lat, v.lng]);
    let n = v.district;
    if (!byN.has(n)) n = (districts.find((d) => d.rings.some((r) => inRing(xy, r))) || {}).n;
    return { ...v, district: n, xy };
  });
  const kindOrder = ['uni', 'hub', 'industry', 'scene', 'landmark'];
  const kinds = [...new Set(venues.map((v) => v.kind))].sort((a, b) => {
    const ia = kindOrder.indexOf(a), ib = kindOrder.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const usedColors = new Set(kinds.filter((k) => KIND_DEFS[k]).map((k) => KIND_DEFS[k].color));
  const spare = SPARE.filter((c) => !usedColors.has(c));
  const kindInfo = {};
  kinds.forEach((k) => {
    kindInfo[k] = KIND_DEFS[k] || {
      label: k.charAt(0).toUpperCase() + k.slice(1), one: k.charAt(0).toUpperCase() + k.slice(1),
      color: spare.shift() || 'var(--fog)', glyph: 'solid',
    };
  });
  const active = new Set(kinds);
  const dLabel = (n) => (byN.has(n) ? `District ${n} · ${byN.get(n).name}` : 'Vienna');
  // same, as HTML with the German district name marked lang="de" (WCAG 3.1.2)
  const dHtml = (n, sep = ' · ') => (byN.has(n) ? `District ${n}${sep}<span lang="de">${esc(byN.get(n).name)}</span>` : '<span lang="de">Wien</span>');

  /* ---------- DOM skeleton ---------- */
  clearRoot();
  const fig = el('figure', { class: 'vm-fig' }, root);
  const bar = el('div', { class: 'vm-bar mono' }, fig);
  el('span', { lang: 'de', text: 'Wien · 23 Bezirke' }, bar);
  const readout = el('span', { class: 'vm-readout', 'aria-hidden': 'true', text: 'Hover a district' }, bar);
  const stage = el('div', { class: 'vm-stage' }, fig);
  const inner = el('div', { class: 'vm-inner' }, stage);
  const svg = el('svg:svg', {
    class: 'vm-svg', viewBox: `${-M} ${-M} ${VBW} ${VBH}`, role: 'img',
    'aria-label': 'Map of Vienna’s 23 districts with universities, hubs, industry and scene venues',
  }, inner);

  const defs = el('svg:defs', {}, svg);
  const pat = el('svg:pattern', { id: 'vm-lattice', width: 14, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
  el('svg:rect', { class: 'vm-pat-bg', width: 14, height: 14 }, pat);
  el('svg:path', { class: 'vm-pat-line', d: 'M0 .5H14M.5 0V14' }, pat);
  el('svg:rect', { class: 'vm-pat-node', x: 0, y: 0, width: 2, height: 2 }, pat);

  // graticule
  const grat = el('svg:g', { class: 'vm-grat', 'aria-hidden': 'true' }, svg);
  for (let lat = 48.10; lat <= 48.35; lat += 0.05) {
    const y = proj([lat, 16.3])[1];
    if (y < -M + 8 || y > H + M - 4) continue;
    el('svg:line', { x1: -M, x2: W + M, y1: fmt(y), y2: fmt(y) }, grat);
    el('svg:text', { x: -M + 6, y: fmt(y - 4), class: 'vm-hide-compact', text: `${lat.toFixed(2)}° N` }, grat);
  }
  for (let lng = 16.15; lng <= 16.6; lng += 0.05) {
    const x = proj([48.2, lng])[0];
    if (x < -M + 30 || x > W + M - 30) continue;
    el('svg:line', { x1: fmt(x), x2: fmt(x), y1: -M, y2: H + M }, grat);
    el('svg:text', { x: fmt(x + 4), y: H + M - 6, class: 'vm-hide-compact', text: `${lng.toFixed(2)}° E` }, grat);
  }

  const gD = el('svg:g', { class: 'vm-districts' }, svg);
  const paths = districts.map((d) => {
    const dStr = d.rings.map((r) => 'M' + r.map((p) => p.join(' ')).join('L') + 'Z').join('');
    const p = el('svg:path', { class: 'vm-d', d: dStr, pathLength: 1, 'data-n': d.n }, gD);
    d.el = p;
    return p;
  });

  // water
  const gW = el('svg:g', { class: 'vm-water', 'aria-hidden': 'true' }, svg);
  const dan = DANUBE.map(proj), can = DONAUKANAL.map(proj);
  const neue = offsetLine(dan.slice(1, 12), 15, 2);
  const waterEls = [
    el('svg:path', { class: 'vm-river vm-river--danube', id: 'vm-danube', d: smoothPath(dan), pathLength: 1 }, gW),
    el('svg:path', { class: 'vm-river vm-river--neue', id: 'vm-neue', d: smoothPath(neue), pathLength: 1 }, gW),
    el('svg:path', { class: 'vm-river vm-river--canal', id: 'vm-canal', d: smoothPath(can), pathLength: 1 }, gW),
  ];
  const wl = el('svg:text', { class: 'vm-water-label', lang: 'de', dy: -11 }, gW);
  el('svg:textPath', { href: '#vm-danube', startOffset: '74%', text: 'Donau' }, wl);
  const nl = el('svg:text', { class: 'vm-water-label vm-water-label--minor vm-hide-compact', lang: 'de', dy: -12 }, gW);
  el('svg:textPath', { href: '#vm-neue', startOffset: '64%', text: 'Neue Donau' }, nl);
  const cl = el('svg:text', { class: 'vm-water-label vm-water-label--minor vm-hide-compact', lang: 'de', dy: 12 }, gW);
  el('svg:textPath', { href: '#vm-canal', startOffset: '70%', text: 'Donaukanal' }, cl);

  // U-Bahn
  const gU = el('svg:g', { class: 'vm-ubahn', 'aria-hidden': 'true' }, svg);
  const ubEls = Object.entries(UBAHN).map(([id, pts]) => {
    const xy = pts.map(proj);
    const g = el('svg:g', { class: 'vm-u', style: `--c:${LINE_COLOR[id]}` }, gU);
    el('svg:path', { d: 'M' + xy.map((p) => p.map(fmt).join(' ')).join('L') }, g);
    const [tx, ty] = xy[0];
    const tag = el('svg:g', { class: 'vm-u-tag vm-hide-compact', transform: `translate(${fmt(tx)} ${fmt(ty)})` }, g);
    const tagS = el('svg:g', { class: 'vm-u-tag-s' }, tag); // scale(var(--k)) in CSS: constant css-px size
    el('svg:rect', { x: -14, y: -9, width: 28, height: 18 }, tagS);
    el('svg:text', { x: 0, y: 4, text: id }, tagS);
    return g;
  });

  // the Ring (district 1)
  const d1 = byN.get(1);
  const gRing = el('svg:g', { class: 'vm-ringg', 'aria-hidden': 'true' }, svg);
  const ringEl = d1 && el('svg:path', { class: 'vm-ring', d: d1.el.getAttribute('d'), pathLength: 1 }, gRing);

  // leaders (pin displaced from its true point) + labels
  const gLead = el('svg:g', { class: 'vm-leads', 'aria-hidden': 'true' }, svg);
  const gL = el('svg:g', { class: 'vm-labels', 'aria-hidden': 'true' }, svg);
  districts.forEach((d) => {
    const t = el('svg:text', { x: d.c[0], y: d.c[1], class: 'vm-dl' + (d.area < 3000 ? ' is-tiny' : ''), text: `${d.n}.` }, gL);
    d.label = t;
  });

  // scale bar + north
  const gS = el('svg:g', { class: 'vm-scale', 'aria-hidden': 'true', transform: `translate(${W - 150} ${H - 40})` }, svg);
  const km2 = (2 / 111.32) * P.s;
  el('svg:path', { d: `M0 0V6H${fmt(km2)}V0M${fmt(km2 / 2)} 6V2` }, gS);
  el('svg:text', { x: 0, y: -6, class: 'vm-hide-compact', text: '0' }, gS);
  el('svg:text', { x: fmt(km2), y: -6, text: '2 km', 'text-anchor': 'end' }, gS);
  el('svg:path', { class: 'vm-north vm-hide-compact', d: 'M118 8L126 -14L134 8L126 3Z' }, gS);
  el('svg:text', { x: 126, y: 24, class: 'vm-hide-compact', text: 'N', 'text-anchor': 'middle' }, gS);

  // pins
  const pinLayer = el('div', { class: 'vm-pins', role: 'group', 'aria-label': 'Venues on the map. Use arrow keys to move between pins.' }, inner);
  const tip = el('div', { class: 'vm-tip mono', 'aria-hidden': 'true' }, inner);
  venues.forEach((v, i) => {
    const k = kindInfo[v.kind];
    const b = el('button', {
      type: 'button', class: 'vm-pin' + (v.ccv ? ' is-ccv' : ''), 'data-kind': v.kind, 'data-glyph': k.glyph,
      'aria-pressed': 'false', tabindex: -1,
      'aria-label': `${v.name}, ${k.one}, ${dLabel(v.district).replace(' · ', ' ')}${v.ccv ? ', we met here' : ''}`,
    }, pinLayer);
    b.style.setProperty('--c', k.color);
    const body = el('span', { class: 'vm-pin-body' }, b);
    if (v.ccv) el('span', { class: 'vm-pin-halo' }, body);
    el('span', { class: 'vm-pin-mark' }, body);
    if (v.ccv) el('span', { class: 'vm-callout mono', 'aria-hidden': 'true', text: calloutText(v) }, b);
    v.pin = b; v.body = body; v.i = i;
  });

  // side panel
  const panel = el('div', { class: 'vm-panel' }, root);
  const pin = el('div', { class: 'vm-panel-in' }, panel);
  const legend = el('div', { class: 'vm-legend', role: 'group', 'aria-label': 'Filter venues by kind' }, pin);
  el('p', { class: 'vm-h mono', text: 'Filter' }, legend);
  const chipWrap = el('div', { class: 'vm-chips' }, legend);
  const chips = kinds.map((k) => {
    const info = kindInfo[k];
    const c = el('button', { type: 'button', class: 'vm-chip', 'aria-pressed': 'true', 'data-kind': k }, chipWrap);
    c.style.setProperty('--c', info.color);
    el('i', { class: 'vm-glyph', 'data-glyph': info.glyph, 'aria-hidden': 'true' }, c);
    el('span', { text: info.label }, c);
    el('b', { class: 'vm-count', text: String(venues.filter((v) => v.kind === k).length) }, c);
    return c;
  });
  const layers = el('div', { class: 'vm-layers' }, legend);
  const ubChip = el('button', { type: 'button', class: 'vm-chip vm-chip--ub', 'aria-pressed': 'false' }, layers);
  root.classList.add('is-no-ubahn');
  const sw = el('i', { class: 'vm-ub-sw', 'aria-hidden': 'true' }, ubChip);
  ['U1', 'U2', 'U3', 'U4', 'U6'].forEach((id) => { const s = el('i', {}, sw); s.style.background = LINE_COLOR[id]; });
  el('span', { text: 'Show U-Bahn' }, ubChip);
  const legendNote = el('p', { class: 'vm-note mono' }, layers);
  el('i', { class: 'vm-ccv-key', 'aria-hidden': 'true' }, legendNote);
  el('span', { text: 'Our events' }, legendNote);

  const card = el('article', { class: 'vm-card', 'aria-labelledby': 'vm-card-name' }, pin);
  const live = el('p', { class: 'vm-sr', 'aria-live': 'polite' }, pin);

  // venue list: its own grid area (under the map on desktop, after the card on phone)
  const listWrap = el('div', { class: 'vm-listwrap' }, root);
  const listH = el('p', { class: 'vm-h mono', id: 'vm-list-h', text: `All venues · ${venues.length}` }, listWrap);
  const list = el('ul', { class: 'vm-list is-collapsed', id: 'vm-list', 'aria-labelledby': 'vm-list-h' }, listWrap);
  const listOrder = venues.filter((v) => v.ccv).concat(venues.filter((v) => !v.ccv));
  listOrder.forEach((v) => {
    const li = el('li', {}, list);
    const b = el('button', { type: 'button', class: 'vm-row' + (v.ccv ? ' is-ccv' : '') }, li);
    b.style.setProperty('--c', kindInfo[v.kind].color);
    el('i', { class: 'vm-glyph', 'data-glyph': kindInfo[v.kind].glyph, 'aria-hidden': 'true' }, b);
    el('span', { class: 'vm-row-name', text: v.name }, b);
    if (v.ccv) el('span', { class: 'vm-row-ccv mono', text: 'CCV' }, b);
    el('span', { class: 'vm-row-d mono', text: v.district ? `${v.district}.` : '' }, b);
    el('span', { class: 'vm-sr' }, b).innerHTML = `, ${esc(kindInfo[v.kind].one)}, ${dHtml(v.district, ' ')}${v.ccv ? ', we met here' : ''}`;
    v.row = b; v.li = li;
  });
  // First LIST_MIN visible rows (CCV first), then a "Show all" toggle, at every width
  const LIST_MIN = 6;
  let listOpen = false;
  const more = el('button', { type: 'button', class: 'vm-more mono', 'aria-expanded': 'false', 'aria-controls': 'vm-list' }, listWrap);
  const syncList = () => {
    const vis = listOrder.filter((v) => active.has(v.kind));
    listOrder.forEach((v) => v.li.classList.toggle('is-extra', vis.indexOf(v) >= LIST_MIN));
    listH.textContent = vis.length === venues.length ? `All venues · ${venues.length}` : `Venues · ${vis.length} of ${venues.length}`;
    more.hidden = vis.length <= LIST_MIN;
    more.setAttribute('aria-expanded', String(listOpen));
    more.innerHTML = listOpen ? 'Show fewer<i aria-hidden="true">↑</i>' : `Show all ${vis.length}<i aria-hidden="true">↓</i>`;
    list.classList.toggle('is-collapsed', !listOpen);
  };
  more.addEventListener('click', () => { listOpen = !listOpen; syncList(); });

  if (geo.attribution) el('p', { class: 'vm-attr', text: geo.attribution }, fig);

  /* ---------- layout: --k, compact mode, pin de-cluster ---------- */
  let stageW = 0;
  const layout = () => {
    const w = stage.clientWidth;
    if (!w) return;
    stageW = w;
    const k = VBW / w; // user units per css px
    root.style.setProperty('--k', k.toFixed(4));
    root.classList.toggle('is-compact', w < 640);
    const D = w < 640 ? 13 : 19; // min px between pin centres
    const vis = venues.filter((v) => active.has(v.kind));
    const pos = vis.map((v) => [(v.xy[0] + M) / k, (v.xy[1] + M) / k]);
    const home = pos.map((p) => p.slice());
    for (let it = 0; it < 80; it++) {
      for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
        let dx = pos[b][0] - pos[a][0], dy = pos[b][1] - pos[a][1], d = Math.hypot(dx, dy);
        if (d >= D) continue;
        if (d < 0.01) { const ang = (a * 2.4) % (Math.PI * 2); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
        const push = (D - d) / 2, wa = vis[a].ccv ? 0.25 : 1, wb = vis[b].ccv ? 0.25 : 1, s = wa + wb;
        pos[a][0] -= (dx / d) * push * (2 * wa / s); pos[a][1] -= (dy / d) * push * (2 * wa / s);
        pos[b][0] += (dx / d) * push * (2 * wb / s); pos[b][1] += (dy / d) * push * (2 * wb / s);
      }
      for (let a = 0; a < pos.length; a++) { pos[a][0] += (home[a][0] - pos[a][0]) * 0.02; pos[a][1] += (home[a][1] - pos[a][1]) * 0.02; }
    }
    gLead.textContent = '';
    vis.forEach((v, i) => {
      const ux = pos[i][0] * k - M, uy = pos[i][1] * k - M;
      const [px, py] = pct([ux, uy]);
      v.pin.style.left = px + '%';
      v.pin.style.top = py + '%';
      v.at = [ux, uy];
      if (Math.hypot(ux - v.xy[0], uy - v.xy[1]) > 2 * k) {
        el('svg:line', { x1: fmt(v.xy[0]), y1: fmt(v.xy[1]), x2: fmt(ux), y2: fmt(uy) }, gLead);
        el('svg:rect', { x: fmt(v.xy[0] - 1.5 * k), y: fmt(v.xy[1] - 1.5 * k), width: fmt(3 * k), height: fmt(3 * k) }, gLead);
      }
    });
    // ccv callouts: pick the side (e, w, n, s) that overlaps the fewest pins / earlier callouts
    const taken = [];
    vis.forEach((v, i) => {
      const co = v.pin.querySelector('.vm-callout');
      if (!co) return;
      const cw = co.offsetWidth, ch = co.offsetHeight, [x, y] = pos[i];
      const boxes = {
        e: [x + 13, y - ch / 2], w: [x - 13 - cw, y - ch / 2],
        n: [x - cw / 2, y - 16 - ch], s: [x - cw / 2, y + 16],
        ne: [x + 6, y - 14 - ch], se: [x + 6, y + 14], nw: [x - 6 - cw, y - 14 - ch], sw: [x - 6 - cw, y + 14],
      };
      let best = 'e', bestScore = Infinity;
      Object.entries(boxes).forEach(([side, [bx, by]], order) => {
        let sc = order * 0.3;
        if (bx < 4 || by < 4 || bx + cw > w - 4 || by + ch > w * (VBH / VBW) - 4) sc += 100;
        pos.forEach((p, j) => { if (j !== i && p[0] > bx - 9 && p[0] < bx + cw + 9 && p[1] > by - 9 && p[1] < by + ch + 9) sc += 10; });
        taken.forEach(([tx, ty, tw, th]) => { if (bx < tx + tw && bx + cw > tx && by < ty + th && by + ch > ty) sc += 20; });
        if (sc < bestScore) { bestScore = sc; best = side; }
      });
      taken.push([...boxes[best], cw, ch]);
      co.dataset.side = best;
    });
  };
  layout();
  if (document.fonts) document.fonts.ready.then(() => layout());
  const ro = new ResizeObserver(() => { if (stage.clientWidth !== stageW) layout(); });
  ro.observe(stage);

  /* ---------- tip + district hover ---------- */
  let hotD = null;
  const showTip = (xy, text, isVenue) => {
    const [px, py] = pct(xy);
    tip.textContent = text;
    tip.style.left = px + '%';
    tip.style.top = py + '%';
    tip.classList.toggle('is-venue', !!isVenue);
    tip.classList.add('is-on');
  };
  const hideTip = () => tip.classList.remove('is-on');
  const setHot = (n) => {
    if (hotD === n) return;
    if (hotD) byN.get(hotD).el.classList.remove('is-hot');
    hotD = n;
    if (!n) { hideTip(); readout.textContent = 'Hover a district'; return; }
    const d = byN.get(n);
    d.el.classList.add('is-hot');
    gD.appendChild(d.el); // raise above neighbours
    showTip(d.c, `${n}. ${d.name}`);
    readout.textContent = `${String(n).padStart(2, '0')} · ${d.name}`;
  };
  gD.addEventListener('pointerover', (e) => {
    const n = +e.target.getAttribute('data-n');
    if (n) setHot(n);
  });
  svg.addEventListener('pointerleave', () => setHot(null));

  /* ---------- selection ---------- */
  let sel = null;
  const linesHtml = (lines = []) => lines.map((id) =>
    `<li class="vm-line${LINE_INK[id] ? ' is-ink' : ''}" style="--c:${LINE_COLOR[id] || 'var(--fog)'}">${id}</li>`).join('');
  const coord = (v) => `${Math.abs(v.lat).toFixed(4)}° ${v.lat >= 0 ? 'N' : 'S'} ${Math.abs(v.lng).toFixed(4)}° ${v.lng >= 0 ? 'E' : 'W'}`;

  const renderCard = (v) => {
    const k = kindInfo[v.kind];
    const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address || v.name);
    card.classList.toggle('is-ccv', !!v.ccv);
    card.style.setProperty('--c', k.color);
    card.innerHTML = `
      <div class="vm-card-top mono"><span class="vm-card-kind"><i class="vm-glyph" data-glyph="${k.glyph}" aria-hidden="true"></i>${esc(k.one)}</span>${v.ccv ? '<span class="vm-badge">We met here</span>' : ''}</div>
      <h3 class="vm-card-name" id="vm-card-name">${esc(v.name)}</h3>
      ${v.note ? `<p class="vm-card-note">${esc(v.note)}</p>` : ''}
      <dl class="vm-card-meta">
        <div><dt class="mono">District</dt><dd class="mono">${dHtml(v.district)}</dd></div>
        ${v.address ? `<div><dt class="mono">Address</dt><dd lang="de">${esc(v.address)}</dd></div>` : ''}
        ${v.lines && v.lines.length ? `<div><dt class="mono">U-Bahn</dt><dd><ul class="vm-lines" aria-label="U-Bahn lines">${linesHtml(v.lines)}</ul></dd></div>` : ''}
      </dl>
      <div class="vm-card-foot"><span class="vm-coord mono">${coord(v)}</span>
      <a class="vm-dir mono" href="${url}" target="_blank" rel="noopener">Directions<span aria-hidden="true">↗</span><span class="vm-sr"> to ${esc(v.name)} (opens Google Maps)</span></a></div>`;
  };

  const select = (v, { announce = true, animate = true } = {}) => {
    if (!v) return;
    if (sel) {
      sel.pin.classList.remove('is-sel'); sel.pin.setAttribute('aria-pressed', 'false');
      sel.row.removeAttribute('aria-current');
      if (sel.district && byN.has(sel.district)) byN.get(sel.district).el.classList.remove('is-sel');
    }
    sel = v;
    v.pin.classList.add('is-sel'); v.pin.setAttribute('aria-pressed', 'true');
    v.row.setAttribute('aria-current', 'true');
    if (v.district && byN.has(v.district)) byN.get(v.district).el.classList.add('is-sel');
    setRoving(v);
    renderCard(v);
    if (announce) live.innerHTML = `Selected ${esc(v.name)}, ${dHtml(v.district, ' ')}`;
    if (animate && gsap && !reduce.matches) {
      gsap.fromTo(card.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'expo.out', overwrite: true });
    }
  };

  /* roving tabindex across visible pins */
  const visiblePins = () => venues.filter((v) => active.has(v.kind));
  function setRoving(target) {
    const vis = visiblePins();
    const t = target && active.has(target.kind) ? target : (sel && active.has(sel.kind) ? sel : vis[0]);
    venues.forEach((v) => v.pin.setAttribute('tabindex', v === t ? '0' : '-1'));
  }
  pinLayer.addEventListener('keydown', (e) => {
    const vis = visiblePins();
    const i = vis.findIndex((v) => v.pin === document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % vis.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + vis.length) % vis.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = vis.length - 1;
    if (j == null) return;
    e.preventDefault();
    venues.forEach((v) => v.pin.setAttribute('tabindex', v === vis[j] ? '0' : '-1'));
    vis[j].pin.focus();
  });

  venues.forEach((v) => {
    v.pin.addEventListener('click', () => select(v));
    v.row.addEventListener('click', () => select(v));
    const on = () => {
      showTip(v.at || v.xy, v.name, true);
      readout.textContent = `${v.district ? String(v.district).padStart(2, '0') + ' · ' : ''}${v.name}`;
    };
    const off = () => { if (hotD) { const d = byN.get(hotD); showTip(d.c, `${hotD}. ${d.name}`); } else hideTip(); };
    v.pin.addEventListener('pointerenter', on);
    v.pin.addEventListener('pointerleave', off);
    v.pin.addEventListener('focus', on);
    v.pin.addEventListener('blur', off);
    v.row.addEventListener('pointerenter', () => v.pin.classList.add('is-peek'));
    v.row.addEventListener('pointerleave', () => v.pin.classList.remove('is-peek'));
    v.row.addEventListener('focus', () => v.pin.classList.add('is-peek'));
    v.row.addEventListener('blur', () => v.pin.classList.remove('is-peek'));
  });

  /* ---------- filters ---------- */
  chips.forEach((c) => c.addEventListener('click', () => {
    const k = c.dataset.kind, on = !active.has(k);
    on ? active.add(k) : active.delete(k);
    c.setAttribute('aria-pressed', String(on));
    const anim = gsap && !reduce.matches;
    venues.filter((v) => v.kind === k).forEach((v) => {
      v.li.hidden = !on;
      if (!on) v.pin.setAttribute('tabindex', '-1');
      if (on) {
        v.pin.hidden = false;
        if (anim) gsap.fromTo(v.body, { scale: 0 }, { scale: 1, duration: 0.45, ease: 'expo.out', overwrite: true });
      } else if (anim) {
        gsap.to(v.body, { scale: 0, duration: 0.2, ease: 'power2.in', overwrite: true, onComplete: () => { if (!active.has(k)) v.pin.hidden = true; } });
      } else v.pin.hidden = true;
    });
    syncList();
    root.classList.add('is-relayout');
    layout();
    setTimeout(() => root.classList.remove('is-relayout'), 400);
    setRoving();
  }));
  ubChip.addEventListener('click', () => {
    const on = ubChip.getAttribute('aria-pressed') !== 'true';
    ubChip.setAttribute('aria-pressed', String(on));
    root.classList.toggle('is-no-ubahn', !on);
  });

  syncList();

  /* ---------- live: the CCV halo pulses only while <html data-state="live"> ---------- */
  const html = document.documentElement;
  const syncLive = () => root.classList.toggle('is-live', html.dataset.state === 'live');
  syncLive();
  new MutationObserver(syncLive).observe(html, { attributes: true, attributeFilter: ['data-state'] });

  /* ---------- default selection ---------- */
  const featured = venues.find((v) => v.ccv) || venues.find((v) => v.id === 'stephansplatz') || venues[0];
  select(featured, { announce: false, animate: false });

  /* ---------- pause loops off-screen ---------- */
  const io = new IntersectionObserver(([en]) => root.classList.toggle('is-off', !en.isIntersecting));
  io.observe(root);

  /* ---------- scroll-in draw ---------- */
  if (gsap && ST && !reduce.matches) {
    const order = districts.slice().sort((a, b) =>
      Math.hypot(a.c[0] - d1.c[0], a.c[1] - d1.c[1]) - Math.hypot(b.c[0] - d1.c[0], b.c[1] - d1.c[1]));
    const play = () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.fromTo(order.map((d) => d.el),
        { strokeDasharray: '1 1', strokeDashoffset: 1, fillOpacity: 0.15 },
        { strokeDashoffset: 0, fillOpacity: 1, duration: 1.1, stagger: 0.035, clearProps: 'strokeDasharray,strokeDashoffset,fillOpacity' })
        .fromTo(order.map((d) => d.label), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.02, clearProps: 'opacity' }, 0.25);
      if (ringEl) tl.fromTo(ringEl, { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, clearProps: 'strokeDasharray,strokeDashoffset' }, 0);
      tl.fromTo(waterEls, { strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.1, clearProps: 'strokeDasharray,strokeDashoffset' }, 0.3)
        .fromTo(ubEls, { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.06, clearProps: 'opacity' }, 0.7)
        .fromTo(venues.map((v) => v.body), { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, clearProps: 'opacity,transform' }, 0.9)
        .fromTo(root.querySelectorAll('.vm-callout'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, clearProps: 'clipPath' }, 1.4);
    };
    ST.create({ trigger: stage, start: 'top 88%', once: true, onEnter: play });
  }

  return { select: (id) => select(venues.find((v) => v.id === id)) };
}
