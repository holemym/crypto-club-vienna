/*
 * hero3d.js · "23 districts, one network"
 * ---------------------------------------------------------------------------
 * Vienna's 23 districts extruded as ink blocks (district 1 = muted gold
 * "genesis block"), venues as square pins with light beams, and small cubes
 * ("transactions") travelling on arcs between venues. Transparent canvas, so
 * the CSS hero ground shows through.
 *
 *   const hero = await initHero3D(el, { reducedMotion });  // resolves after the FIRST FRAME is drawn
 *   hero.setScroll(p);  // 0..1 while the hero scrolls out: skyline -> top-down street plan
 *   hero.ready;         // the same moment as a promise; also fires `hero3d:ready` on el
 *   hero.play();        // only with { autoplay:false }: start the rise (e.g. when the loader lifts)
 *   hero.pause(); hero.resume(); hero.destroy();
 *
 * Scroll ("skyline to street plan"): the camera tilts from the oblique hero view
 * to a north-up plan view, extrusion flattens to ~0, arcs and beams settle onto
 * the plan, and the canvas fades over the last 30 %. The target is damped inside
 * the existing render loop (no extra rAF). Reduced motion: setScroll only sets
 * the canvas opacity; the scene stays one composed still frame.
 *
 * Gold means live: CCV venues (ccv:true) are always gold pins; the beams and
 * arcs touching them turn gold only while <html data-state="live"> (watched
 * with a MutationObserver).
 *
 * Placement (read on resize): #hero-3d { --hero3d-x; --hero3d-y; --hero3d-zoom }
 * x/y shift the projected city as a fraction of the element (+x right, +y up).
 *
 * SPLINE SLOT: a non-empty `data-spline` URL loads @splinetool/runtime@1.12.98
 * instead; any failure falls back to the Three.js scene.
 * FALLBACKS: no WebGL or no data -> class `is-fallback`, resolves a no-op API.
 *
 * vendor/three.hero.min.js is three r186 tree-shaken to the names used here
 * (esbuild 0.24: entry `export { WebGLRenderer, Scene, ... } from 'three/src/Three.js'`,
 * --bundle --minify --format=esm), with ShaderLib stubbed and ShaderChunk reduced
 * to colorspace_pars_fragment + tonemapping_pars_fragment, because only
 * ShaderMaterial with inline GLSL is used. Built-in materials are NOT available.
 */
import * as THREE from '../vendor/three.hero.min.js';
import { json } from './util.js';

const SPLINE_RUNTIME = 'https://unpkg.com/@splinetool/runtime@1.12.98/build/runtime.js';
const DPR_CAP = 1.75;
const SC = 0.012;               // map units (1000 wide) -> world units
const INTRO_SPAN = 1.6;         // s, whole rise sequence
const BREATH = 9;               // s, breathing cycle
const TX_EVERY = 3.2;           // s between transactions
const TX_MAX = 1;
const TRAIL_SEGS = 36;

const noop = () => {};
const NOOP_API = { setScroll: noop, play: noop, pause: noop, resume: noop, destroy: noop, ready: Promise.resolve() };

/* ---------- small helpers ---------- */
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const expoOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function cssColor(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  } catch (_) { /* ignore */ }
  return fallback;
}
// raw sRGB triplet (shaders write sRGB straight to the canvas, so CSS ink matches exactly)
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const mixHex = (a, b, t) => { const A = rgb(a), B = rgb(b); return A.lerp(B, t); };

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) { return false; }
}

/* Inset a polygon ring by d (map units) so neighbouring blocks read as separate blocks. */
function insetRing(ring, d) {
  const pts = [];
  for (const p of ring) {
    const q = pts[pts.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.35) pts.push(p);
  }
  if (pts.length > 2) {
    const a = pts[0], b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.35) pts.pop();
  }
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = Math.sign(area) || 1;
  const nrm = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1;
    nrm.push([sgn * (-ey / l), sgn * (ex / l)]); // inward normal
  }
  return pts.map((p, i) => {
    const n1 = nrm[(i - 1 + n) % n], n2 = nrm[i];
    let mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const len = d / Math.max(mx * n2[0] + my * n2[1], 0.4);
    return [p[0] + mx * len, p[1] + my * len];
  });
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------- shaders ---------- */
const FADE_GLSL = /* glsl */`
  uniform vec2 uR;          // radial fade start/end (world units from district 1)
  float edgeFade(vec3 w){ return smoothstep(uR.x, uR.y, length(w.xz)); }
`;

const BLOCK_VS = /* glsl */`
  attribute float aD;
  uniform float uH[23];
  uniform float uF[23];
  varying vec3 vN; varying vec3 vW; varying float vT; varying float vGold; varying float vFlash; varying float vTint;
  void main(){
    int i = int(aD + 0.5);
    vec3 p = position;
    vT = p.y;
    p.y *= uH[i];
    vTint = fract(sin(aD * 91.7 + 3.1) * 4375.85);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vGold = i == 0 ? 1.0 : 0.0;
    vFlash = uF[i];
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const BLOCK_FS = /* glsl */`
  precision highp float;
  ${FADE_GLSL}
  uniform vec3 uInk, uSide, uTop, uGoldSide, uGoldTop, uLight;
  uniform float uFade;
  varying vec3 vN; varying vec3 vW; varying float vT; varying float vGold; varying float vFlash; varying float vTint;
  void main(){
    vec3 n = normalize(vN);
    float top = step(0.6, n.y);
    float lam = max(dot(n, uLight), 0.0);
    vec3 side = mix(uSide * 0.55, uSide, smoothstep(0.0, 1.0, vT)) * (0.72 + 0.5 * lam);
    vec3 gside = mix(uGoldSide * 0.45, uGoldSide, smoothstep(0.0, 1.0, vT)) * (0.7 + 0.5 * lam);
    // tops: faint sheen toward the light so the slab reads as a surface
    float sheen = 0.5 + 0.5 * dot(normalize(vW.xz + 0.001), normalize(uLight.xz));
    vec3 tp = uTop * (0.84 + 0.14 * sheen + 0.22 * vTint);
    vec3 gtp = uGoldTop * (0.9 + 0.18 * sheen);
    vec3 col = mix(mix(side, tp, top), mix(gside, gtp, top), vGold);
    // light pool around the genesis block: focus in the middle, calm at the rim
    float pool = 1.0 - smoothstep(0.0, 5.5, length(vW.xz));
    col *= 0.9 + 0.32 * pool;
    col += vFlash * top * vec3(0.055, 0.055, 0.05);
    float f = edgeFade(vW);
    col = mix(col, uInk, clamp(f * 0.92 + uFade, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const EDGE_VS = /* glsl */`
  attribute float aD;
  uniform float uH[23];
  uniform float uF[23];
  varying vec3 vW; varying float vT; varying float vGold; varying float vFlash;
  void main(){
    int i = int(aD + 0.5);
    vec3 p = position;
    vT = p.y;
    p.y *= uH[i];
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vGold = i == 0 ? 1.0 : 0.0;
    vFlash = uF[i];
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const EDGE_FS = /* glsl */`
  precision highp float;
  ${FADE_GLSL}
  uniform vec3 uPaper, uGold;
  uniform float uAlpha;
  varying vec3 vW; varying float vT; varying float vGold; varying float vFlash;
  void main(){
    float f = edgeFade(vW);
    float a = mix(0.2, 0.75, vGold) * (0.25 + 0.75 * vT) + vFlash * 0.35 * vT;
    a *= (1.0 - f * 0.95) * uAlpha;
    gl_FragColor = vec4(mix(uPaper, uGold, vGold), a);
  }
`;

const GROUND_VS = /* glsl */`
  varying vec3 vW;
  void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const GROUND_FS = /* glsl */`
  precision highp float;
  uniform vec3 uCol; uniform float uCell; uniform float uAlpha; uniform vec2 uGR;
  varying vec3 vW;
  // outline of a square of half-size h centred in each cell, AA via fwidth
  float sq(vec2 p, float cell, float h, float w){
    vec2 q = abs(fract(p / cell) - 0.5) * cell;
    float d = abs(max(q.x, q.y) - h);
    float fw = fwidth(max(q.x, q.y));
    return 1.0 - smoothstep(w * 0.5, w * 0.5 + fw, d);
  }
  void main(){
    vec2 p = vW.xz;
    float small = sq(p, uCell, uCell * 0.32, uCell * 0.035);
    float big = sq(p + uCell * 2.0, uCell * 4.0, uCell * 1.9, uCell * 0.03);
    float r = length(p);
    float fade = 1.0 - smoothstep(uGR.x, uGR.y, r);
    float a = (small * 0.55 + big * 0.9) * fade * uAlpha;
    gl_FragColor = vec4(uCol, a);
  }
`;

const PIN_VS = /* glsl */`
  attribute vec3 aCol; attribute float aPulse;
  uniform float uSize; uniform float uPx;
  varying vec3 vCol; varying float vPulse;
  void main(){
    vCol = aCol; vPulse = aPulse;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPx * (1.0 + aPulse * 0.9) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const PIN_FS = /* glsl */`
  precision highp float;
  uniform float uAlpha;
  varying vec3 vCol; varying float vPulse;
  void main(){
    vec2 q = abs(gl_PointCoord - 0.5) * 2.0;     // 0 centre .. 1 edge
    float d = max(q.x, q.y);                      // square metric
    float core = 1.0 - smoothstep(0.22, 0.27, d);
    float ring = (1.0 - smoothstep(0.02, 0.05, abs(d - 0.42))) * 0.35;
    float glow = exp(-d * 5.0) * 0.45;
    float a = (core + ring * (0.5 + vPulse) + glow * (0.8 + vPulse)) * uAlpha;
    gl_FragColor = vec4(vCol, min(a, 1.0));
  }
`;

const LINE_VS = /* glsl */`
  attribute float aA; attribute vec3 aCol;
  varying float vA; varying vec3 vCol;
  void main(){ vA = aA; vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const LINE_FS = /* glsl */`
  precision highp float;
  uniform float uAlpha;
  varying float vA; varying vec3 vCol;
  void main(){ gl_FragColor = vec4(vCol, vA * uAlpha); }   // additive: src * alpha
`;

const CUBE_VS = /* glsl */`
  varying vec3 vN; varying vec3 vCol;
  void main(){
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #else
      vCol = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const CUBE_FS = /* glsl */`
  precision highp float;
  uniform float uAlpha;
  varying vec3 vN; varying vec3 vCol;
  void main(){
    float l = 0.65 + 0.35 * max(normalize(vN).y, 0.0);
    gl_FragColor = vec4(vCol * l * uAlpha, uAlpha);
  }
`;

/* ---------- Spline slot ---------- */
async function trySpline(el, url) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-3d__canvas hero-3d__canvas--spline';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  el.appendChild(canvas);
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('spline timeout')), 10000));
    const mod = await Promise.race([import(/* @vite-ignore */ SPLINE_RUNTIME), timeout]);
    const app = new mod.Application(canvas);
    await Promise.race([app.load(url), timeout]);
    let paused = false;
    const io = new IntersectionObserver(([e]) => { if (e) (e.isIntersecting ? api.resume : api.pause)(); });
    io.observe(el);
    const api = {
      setScroll(p) { canvas.style.opacity = String(1 - clamp01(p) * 0.9); },
      pause() { if (!paused) { paused = true; app.stop?.(); } },
      resume() { if (paused) { paused = false; app.play?.(); } },
      destroy() { io.disconnect(); app.dispose?.(); canvas.remove(); },
    };
    el.dispatchEvent(new CustomEvent('hero3d:ready', { detail: { engine: 'spline' } }));
    return api;
  } catch (err) {
    console.warn('[hero3d] Spline scene failed, using Three.js scene:', err && err.message);
    canvas.remove();
    return null;
  }
}

/* ---------- main ---------- */
export async function initHero3D(el, opts = {}) {
  if (!el) return NOOP_API;

  const splineUrl = (el.dataset.spline || '').trim();
  if (splineUrl && hasWebGL()) {
    const api = await trySpline(el, splineUrl);
    if (api) return api;
  }

  if (!hasWebGL()) { el.classList.add('is-fallback'); return NOOP_API; }

  const reduced = opts.reducedMotion ?? (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // data
  let vienna, venuesData;
  try {
    // memoized in util.js, so map.js shares the same requests (paths resolve from js/)
    const [a, b] = await Promise.all([json(opts.viennaUrl || '../data/vienna.json'), json(opts.venuesUrl || '../data/venues.json')]);
    vienna = a; venuesData = b;
  } catch (err) {
    console.warn('[hero3d] data failed to load:', err && err.message);
    el.classList.add('is-fallback');
    return NOOP_API;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    el.classList.add('is-fallback');
    return NOOP_API;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  const canvas = renderer.domElement;
  canvas.className = 'hero-3d__canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);

  /* colours from tokens */
  const C = {
    ink: cssColor('--ink', '#000001'),
    ink2: cssColor('--ink-2', '#0a131f'),
    ink3: cssColor('--ink-3', '#121e2e'),
    line: cssColor('--line', '#434366'),
    fog: cssColor('--fog', '#b6b9c2'),
    paper: cssColor('--paper', '#f8fbff'),
    gold: cssColor('--accent', '#af00ff'),        // round 4: the club's violet in the old gold slots
    goldDim: cssColor('--accent-deep', '#7704db'),
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const city = new THREE.Group();
  scene.add(city);

  /* ----- districts ----- */
  const D = vienna.districts.slice().sort((a, b) => a.n - b.n);
  const c0 = D[0].c;                                  // district 1 = origin
  const toW = (x, y) => [(x - c0[0]) * SC, (y - c0[1]) * SC];
  const N = D.length;                                 // 23
  const baseH = new Float32Array(N), delay = new Float32Array(N), phase = new Float32Array(N);
  const heights = new Float32Array(N), flash = new Float32Array(N);
  let maxR = 0;
  const dist = D.map((d) => { const [x, z] = toW(d.c[0], d.c[1]); const r = Math.hypot(x, z); maxR = Math.max(maxR, r); return r; });
  D.forEach((d, i) => {
    baseH[i] = d.n === 1 ? 1.15 : 0.16 + hash(d.n) * 0.62 + Math.max(0, 1 - dist[i] / 6) * 0.22;
    delay[i] = (dist[i] / maxR) * 0.75;               // stagger outward from district 1
    phase[i] = dist[i] * 0.9 + hash(d.n + 40) * 1.5;
  });

  const pos = [], nor = [], did = [], epos = [], edid = [];
  D.forEach((d, i) => {
    const ring = insetRing(d.rings[0], 2.2);
    const shape = new THREE.Shape(ring.map(([x, y]) => { const [X, Z] = toW(x, y); return new THREE.Vector2(X, -Z); }));
    let g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
    g.rotateX(-Math.PI / 2);
    if (g.index) g = g.toNonIndexed();
    g.computeVertexNormals();
    const p = g.attributes.position.array, nn = g.attributes.normal.array;
    for (let k = 0; k < p.length; k++) { pos.push(p[k]); nor.push(nn[k]); }
    for (let k = 0; k < p.length / 3; k++) did.push(i);
    const eg = new THREE.EdgesGeometry(g, 28);
    const ep = eg.attributes.position.array;
    for (let k = 0; k < ep.length; k++) epos.push(ep[k]);
    for (let k = 0; k < ep.length / 3; k++) edid.push(i);
    g.dispose(); eg.dispose();
  });

  const shared = {
    uH: { value: heights }, uF: { value: flash },
    uR: { value: new THREE.Vector2(3.2, 7.8) },
  };
  const blockGeo = new THREE.BufferGeometry();
  blockGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  blockGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  blockGeo.setAttribute('aD', new THREE.Float32BufferAttribute(did, 1));
  const blockMat = new THREE.ShaderMaterial({
    vertexShader: BLOCK_VS, fragmentShader: BLOCK_FS,
    uniforms: {
      ...shared,
      uInk: { value: rgb(C.ink) },
      uSide: { value: mixHex(C.ink, C.ink3, 0.6) },
      uTop: { value: mixHex(C.ink2, C.ink3, 0.75) },
      uGoldSide: { value: mixHex(C.goldDim, C.ink2, 0.45) },
      uGoldTop: { value: mixHex(C.gold, C.goldDim, 0.42) },   // muted: gold proper is for live states
      uLight: { value: new THREE.Vector3(-0.45, 0.8, 0.4).normalize() },
      uFade: { value: 0 },
    },
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const blocks = new THREE.Mesh(blockGeo, blockMat);
  blocks.frustumCulled = false;
  city.add(blocks);

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(epos, 3));
  edgeGeo.setAttribute('aD', new THREE.Float32BufferAttribute(edid, 1));
  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: EDGE_VS, fragmentShader: EDGE_FS, transparent: true, depthWrite: false,
    uniforms: { ...shared, uPaper: { value: rgb(C.paper) }, uGold: { value: rgb(C.gold) }, uAlpha: { value: 1 } },
  });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  edges.frustumCulled = false;
  edges.renderOrder = 1;
  city.add(edges);

  /* ----- ground lattice ----- */
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VS, fragmentShader: GROUND_FS, transparent: true, depthWrite: false,
    uniforms: { uCol: { value: mixHex(C.line, C.fog, 0.35) }, uCell: { value: 0.24 }, uAlpha: { value: 0.38 }, uGR: { value: new THREE.Vector2(3.0, 9.5) } },
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.002;
  ground.renderOrder = -1;
  city.add(ground);

  /* ----- venues ----- */
  const proj = vienna.proj;
  const venues = (venuesData.venues || []).filter((v) => isFinite(v.lat) && isFinite(v.lng)).map((v) => {
    const mx = (v.lng * proj.k - proj.minx) * proj.s, my = (-v.lat - proj.miny) * proj.s;
    const di = D.findIndex((d) => pointInRing(mx, my, d.rings[0]));
    const [x, z] = toW(mx, my);
    return { ...v, x, z, di, pulse: 0 };
  }).sort((a, b) => (a.ccv ? 1 : 0) - (b.ccv ? 1 : 0));   // CCV last: drawn on top of co-located venues
  const NV = venues.length;
  const ccvIdx = venues.map((v, i) => (v.ccv ? i : -1)).filter((i) => i >= 0);
  const root = document.documentElement;
  const isLive = () => root.getAttribute('data-state') === 'live';
  let live = isLive();
  const GOLD = rgb(C.gold), PAPER = rgb(C.paper), FOG = rgb(C.fog);
  // pins: CCV venues are always gold (they are the club's rooms); beams and arcs only while live
  const pinColOf = (v) => (v.ccv ? GOLD : (v.kind === 'uni' || v.kind === 'hub' ? PAPER : FOG));
  const beamColOf = (v) => (v.ccv ? (live ? GOLD : PAPER) : pinColOf(v));
  const BEAM = 1.6;

  const pinGeo = new THREE.BufferGeometry();
  const pinPos = new Float32Array(NV * 3), pinPulse = new Float32Array(NV), pinCol = new Float32Array(NV * 3);
  const beamPos = new Float32Array(NV * 6), beamA = new Float32Array(NV * 2), beamCol = new Float32Array(NV * 6);
  venues.forEach((v, i) => { const c = pinColOf(v); pinCol.set([c.x, c.y, c.z], i * 3); });
  pinGeo.setAttribute('position', new THREE.BufferAttribute(pinPos, 3));
  pinGeo.setAttribute('aPulse', new THREE.BufferAttribute(pinPulse, 1));
  pinGeo.setAttribute('aCol', new THREE.BufferAttribute(pinCol, 3));
  const pinMat = new THREE.ShaderMaterial({
    // normal blending: a gold CCV pin must stay gold where it shares a building with another venue
    vertexShader: PIN_VS, fragmentShader: PIN_FS, transparent: true, depthWrite: false,
    uniforms: { uSize: { value: 0.3 }, uPx: { value: 800 }, uAlpha: { value: 0 } },
  });
  const pins = new THREE.Points(pinGeo, pinMat);
  pins.frustumCulled = false; pins.renderOrder = 3;
  city.add(pins);

  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
  beamGeo.setAttribute('aA', new THREE.BufferAttribute(beamA, 1));
  beamGeo.setAttribute('aCol', new THREE.BufferAttribute(beamCol, 3));
  const lineMatOpts = { vertexShader: LINE_VS, fragmentShader: LINE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const beamMat = new THREE.ShaderMaterial({ ...lineMatOpts, uniforms: { uAlpha: { value: 0 } } });
  const beams = new THREE.LineSegments(beamGeo, beamMat);
  beams.frustumCulled = false; beams.renderOrder = 2;
  city.add(beams);
  function paintBeams() {
    venues.forEach((v, i) => {
      const c = beamColOf(v);
      beamCol.set([c.x, c.y, c.z, c.x, c.y, c.z], i * 6);
      beamA[i * 2] = v.ccv && live ? 1.0 : 0.7; beamA[i * 2 + 1] = 0;
    });
    beamGeo.attributes.aCol.needsUpdate = true;
    beamGeo.attributes.aA.needsUpdate = true;
  }
  paintBeams();

  /* ----- transactions ----- */
  const txs = Array.from({ length: TX_MAX }, () => ({ on: false, a: 0, b: 0, t0: 0, dur: 2, lift: 1, gold: false }));
  const trailPos = new Float32Array(TX_MAX * TRAIL_SEGS * 6);
  const trailA = new Float32Array(TX_MAX * TRAIL_SEGS * 2);
  const trailCol = new Float32Array(TX_MAX * TRAIL_SEGS * 6);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('aA', new THREE.BufferAttribute(trailA, 1));
  trailGeo.setAttribute('aCol', new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.ShaderMaterial({ ...lineMatOpts, uniforms: { uAlpha: { value: 1 } } });
  const trails = new THREE.LineSegments(trailGeo, trailMat);
  trails.frustumCulled = false; trails.renderOrder = 4;
  city.add(trails);

  const cubeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const cubeMat = new THREE.ShaderMaterial({ vertexShader: CUBE_VS, fragmentShader: CUBE_FS, uniforms: { uAlpha: { value: 1 } } });
  const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, TX_MAX);
  cubes.frustumCulled = false; cubes.renderOrder = 5;
  city.add(cubes);
  // round 4, calmer hero: no ground grid and no static beams; the one travelling transaction stays
  ground.visible = false; beams.visible = false;
  const tmpCol = new THREE.Color();
  // an arc glows gold only while live and only if it touches a CCV venue
  function paintTx(k) {
    const tx = txs[k];
    tx.gold = live && tx.on && (venues[tx.a].ccv || venues[tx.b].ccv);
    const c = tx.gold ? GOLD : PAPER;
    for (let o = k * TRAIL_SEGS * 6, e = o + TRAIL_SEGS * 6; o < e; o += 3) { trailCol[o] = c.x; trailCol[o + 1] = c.y; trailCol[o + 2] = c.z; }
    cubes.setColorAt(k, tmpCol.setRGB(c.x, c.y, c.z));
    trailGeo.attributes.aCol.needsUpdate = true;
    if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
  }
  for (let k = 0; k < TX_MAX; k++) paintTx(k);   // creates instanceColor before the first compile
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), p4 = new THREE.Vector3(), e4 = new THREE.Euler();

  // scroll-driven shape (set per frame from the damped scroll value)
  const S = { tilt: 0, flat: 0 };
  const venueTop = (v) => (v.di >= 0 ? heights[v.di] : 0) + 0.035 * (1 - S.flat * 0.7);
  const bez = (A, Cc, B, t, out) => {
    const u = 1 - t;
    out.set(u * u * A.x + 2 * u * t * Cc.x + t * t * B.x, u * u * A.y + 2 * u * t * Cc.y + t * t * B.y, u * u * A.z + 2 * u * t * Cc.z + t * t * B.z);
    return out;
  };
  const VA = new THREE.Vector3(), VB = new THREE.Vector3(), VC = new THREE.Vector3(), VP = new THREE.Vector3(), VQ = new THREE.Vector3();
  let lastPair = '';
  function spawnTx(now, fixedT = null) {
    if (NV < 2) return;
    const k = txs.findIndex((t) => !t.on);
    if (k < 0) return;
    const tx = txs[k];
    let a, b, guard = 0;
    const pick = () => (live && ccvIdx.length && Math.random() < 0.55 ? ccvIdx[(Math.random() * ccvIdx.length) | 0] : (Math.random() * NV) | 0);
    do { a = pick(); b = (Math.random() * NV) | 0; if (Math.random() < 0.5) [a, b] = [b, a]; guard++; } while ((a === b || `${a}-${b}` === lastPair) && guard < 20);
    if (a === b) return;
    lastPair = `${a}-${b}`;
    const d = Math.hypot(venues[a].x - venues[b].x, venues[a].z - venues[b].z);
    const dur = 1.6 + d * 0.35;
    Object.assign(tx, { on: true, arrived: false, a, b, t0: fixedT == null ? now : now - fixedT * dur, dur, lift: 0.45 + d * 0.38 });
    paintTx(k);
  }
  const trailAlpha = (u, head) => { const k = clamp01(1 - (head - u) / 0.38); return 0.06 + 0.84 * k * k; };
  function updateTx(now) {
    trailA.fill(0);
    const arc = 1 - S.flat * 0.8;                       // arcs settle onto the plan as it flattens
    txs.forEach((tx, k) => {
      let scale = 0;
      if (tx.on) {
        const raw = (now - tx.t0) / tx.dur;
        if (raw >= 1.18) { tx.on = false; }
        else {
          const A = venues[tx.a], B = venues[tx.b];
          VA.set(A.x, venueTop(A), A.z); VB.set(B.x, venueTop(B), B.z);
          VC.set((A.x + B.x) / 2, Math.max(VA.y, VB.y) + tx.lift * arc, (A.z + B.z) / 2);
          const head = Math.min(raw, 1);
          const e = head < 0.5 ? 2 * head * head : 1 - Math.pow(-2 * head + 2, 2) / 2; // power2.inOut
          const fadeOut = raw > 1 ? 1 - (raw - 1) / 0.18 : 1;
          const fadeIn = clamp01(raw / 0.08);
          const boost = tx.gold ? 1.15 : 1;
          for (let s = 0; s < TRAIL_SEGS; s++) {
            const t1 = e * (s / TRAIL_SEGS), t2 = e * ((s + 1) / TRAIL_SEGS);
            bez(VA, VC, VB, t1, VP); bez(VA, VC, VB, t2, VQ);
            const o = (k * TRAIL_SEGS + s) * 6;
            trailPos[o] = VP.x; trailPos[o + 1] = VP.y; trailPos[o + 2] = VP.z;
            trailPos[o + 3] = VQ.x; trailPos[o + 4] = VQ.y; trailPos[o + 5] = VQ.z;
            const ai = (k * TRAIL_SEGS + s) * 2;
            trailA[ai] = Math.min(1, trailAlpha(t1, e) * fadeOut * fadeIn * boost);
            trailA[ai + 1] = Math.min(1, trailAlpha(t2, e) * fadeOut * fadeIn * boost);
          }
          if (raw < 1) {
            bez(VA, VC, VB, e, p4);
            e4.set(raw * 3.2, raw * 4.1, 0); q4.setFromEuler(e4);
            scale = Math.min(1, raw * 10) * (1 - S.flat * 0.35);
          } else if (!tx.arrived) {
            tx.arrived = true;
            B.pulse = 1; if (B.di >= 0) flash[B.di] = 1;
          }
        }
      }
      s4.setScalar(scale);
      m4.compose(p4, q4, s4);
      cubes.setMatrixAt(k, m4);
    });
    cubes.instanceMatrix.needsUpdate = true;
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.aA.needsUpdate = true;
  }

  /* ----- layout / camera ----- */
  const PLAN_EL = Math.PI / 2 - 0.0008;   // straight down (a hair off so lookAt stays stable)
  // parallax = share of the hero scroll the city lags behind, so the plan stays in view while it forms
  const L = { w: 1, h: 1, narrow: false, dist: 20, ox: 0, oy: 0, parallax: 0.7, edge: 1, target: new THREE.Vector3(), plan: new THREE.Vector3(0.3, 0, -0.45), az: 0.42, el: 0.9 };
  const cam = { az: 0, el: 0 };   // damped pointer offsets
  const ptr = { x: 0, y: 0 };
  let scrollP = 0, scrollS = 0, viewS = -1;
  let vw = window.innerWidth || 1, vh = window.innerHeight || 1;

  function applyView(s) {
    viewS = s;
    camera.setViewOffset(L.w, L.h, -L.w * L.ox, L.h * (L.oy - L.parallax * s), L.w, L.h);  // also updates the projection
  }
  function layout(w, h) {
    L.w = Math.max(1, w); L.h = Math.max(1, h);
    L.narrow = L.w < 700;
    renderer.setSize(L.w, L.h, false);
    camera.aspect = L.w / L.h;
    const R = 6.4;                                    // city bounding radius (world)
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const fit = R / Math.sin(Math.min(vf * 1.25, hf) / 2);
    // Placement can be tuned from CSS without touching JS (read on resize only).
    const cs = getComputedStyle(el);
    const num = (n, d) => { const v = parseFloat(cs.getPropertyValue(n)); return isFinite(v) ? v : d; };
    // desktop: Innere Stadt + arcs centred near (62 %, 40 %), above the Ask card; phone: above the headline
    const def = L.narrow ? { x: 0.08, y: 0.25, z: 1.08 } : { x: 0.12, y: 0.06, z: 0.9 };
    L.ox = num('--hero3d-x', def.x); L.oy = num('--hero3d-y', def.y);
    const zoom = num('--hero3d-zoom', def.z);
    L.dist = fit / Math.max(0.2, zoom);
    L.target.set(L.narrow ? -0.4 : 0.2, L.narrow ? 0 : 0.4, L.narrow ? 0.6 : 0.1);
    L.parallax = L.narrow ? 0.4 : 0.7;
    applyView(scrollS);
    pinMat.uniforms.uPx.value = L.h * renderer.getPixelRatio() * 0.9 / Math.tan(vf / 2) / 2;
    L.edge = L.narrow ? 0.8 : 1;
  }

  const UP = new THREE.Vector3(), TG = new THREE.Vector3();
  function placeCamera(t) {
    const k = S.tilt, free = 1 - k;
    const drift = reduced ? 0 : Math.sin(t * 0.07) * 0.05 + Math.sin(t * 0.031) * 0.03;
    const az = (L.az + drift + cam.az) * free;        // rotates to north-up
    const el0 = L.el + cam.el;
    const el = el0 + (PLAN_EL - el0) * k;
    const d = L.dist * (1 + 0.06 * k);
    const T = TG.copy(L.target).lerp(L.plan, k * 0.6);
    camera.up.copy(UP.set(0, free, -k).normalize());   // north (-z) is screen-up in the plan
    camera.position.set(T.x + d * Math.cos(el) * Math.sin(az), T.y + d * Math.sin(el), T.z + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(T);
  }

  /* ----- per-frame state ----- */
  const autoplay = opts.autoplay !== false;
  let playing = autoplay;
  let introStart = -1;
  let lastSpawn = 0;
  function updateWorld(t, dt) {
    const it = introStart < 0 ? 0 : t - introStart;
    const keep = 1 - S.flat * 0.985;                   // extrusion -> ~0 in the plan
    for (let i = 0; i < N; i++) {
      const rise = reduced ? 1 : expoOut(clamp01((it - delay[i]) / (INTRO_SPAN - 0.75)));
      const breathe = reduced ? 0 : Math.sin((t / BREATH) * Math.PI * 2 + phase[i]) * 0.04 * (1 - S.flat);
      heights[i] = Math.max(0.0001, baseH[i] * rise * (1 + breathe) * keep);
      flash[i] = Math.max(0, flash[i] - dt * 1.8);
    }
    const reveal = reduced ? 1 : smooth(0.8, 1.7, it);
    pinMat.uniforms.uAlpha.value = reveal;
    beamMat.uniforms.uAlpha.value = reveal * 0.8 * (1 - S.flat * 0.5);
    const beamLen = BEAM * (1 - S.flat * 0.85);
    const glow = live ? (reduced ? 0.35 : 0.3 + 0.3 * Math.sin(t * 2.4)) : 0;   // CCV pins breathe while live
    venues.forEach((v, i) => {
      const y = venueTop(v);
      pinPos[i * 3] = v.x; pinPos[i * 3 + 1] = y; pinPos[i * 3 + 2] = v.z;
      beamPos.set([v.x, y, v.z, v.x, y + beamLen * (v.ccv && live ? 1.3 : 1), v.z], i * 6);
      v.pulse = Math.max(0, v.pulse - dt * 1.2);
      pinPulse[i] = v.ccv ? Math.max(v.pulse, glow) : v.pulse;
    });
    pinGeo.attributes.position.needsUpdate = true;
    pinGeo.attributes.aPulse.needsUpdate = true;
    beamGeo.attributes.position.needsUpdate = true;
    if (!reduced && it > INTRO_SPAN && t - lastSpawn > TX_EVERY) {
      if (txs.filter((x) => x.on).length < 3) spawnTx(t);
      lastSpawn = t;
    }
    updateTx(t);
  }

  function render(t, dt) {
    if (!reduced) {
      cam.az += (ptr.x * 0.12 - cam.az) * 0.06;
      cam.el += (-ptr.y * 0.06 - cam.el) * 0.06;
      scrollS += (scrollP - scrollS) * (1 - Math.exp(-dt * 6));   // damped, frame-rate independent
      if (Math.abs(scrollP - scrollS) < 1e-4) scrollS = scrollP;
    } else scrollS = 0;                                          // reduced: the hero still never tilts
    S.tilt = smooth(0, 0.6, scrollS);      // plan is complete while most of the hero is still on screen
    S.flat = smooth(0.04, 0.62, scrollS);
    if (scrollS !== viewS) applyView(scrollS);
    shared.uR.value.set(3.2 + 2.8 * S.tilt, 7.8 + 3.4 * S.tilt);        // the whole city opens up in the plan
    groundMat.uniforms.uAlpha.value = 0.38 * (1 - 0.6 * S.tilt);
    edgeMat.uniforms.uAlpha.value = L.edge * (1 + 0.7 * S.tilt);        // outlines read as a drawn plan
    updateWorld(t, dt);
    placeCamera(t);
    renderer.render(scene, camera);
  }

  /* ----- loop control ----- */
  let raf = 0, running = false, paused = false, visible = true, pageVisible = !document.hidden, destroyed = false;
  let lastT = performance.now() / 1000;
  let readyFired = false, readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  const fireReady = () => {
    if (readyFired) return; readyFired = true;
    el.dispatchEvent(new CustomEvent('hero3d:ready', { detail: { engine: 'three' } }));
    readyResolve();
  };
  function frame(ms) {
    raf = 0;
    if (!running) return;
    const t = ms / 1000;
    const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    if (introStart < 0 && playing) introStart = t;
    render(t, dt);
    fireReady();
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    const should = !reduced && !paused && visible && pageVisible && !destroyed;
    if (should && !running) { running = true; lastT = performance.now() / 1000; raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  }
  function still() {
    // composed single frame for reduced motion (and resize / state change while reduced)
    introStart = 0;
    const t = 10;
    if (!txs.some((x) => x.on)) { spawnTx(t, 0.45); spawnTx(t, 0.7); }
    render(t, 0);
    fireReady();
  }
  const redraw = () => { if (destroyed) return; if (reduced) still(); else if (!running) render(lastT, 0); };

  /* ----- observers & listeners ----- */
  const rect = el.getBoundingClientRect();
  layout(rect.width || el.clientWidth || vw, rect.height || el.clientHeight || vh);

  const ro = new ResizeObserver((entries) => {
    const r = entries[0] && entries[0].contentRect;
    if (!r || !r.width || !r.height) return;
    vw = window.innerWidth || vw; vh = window.innerHeight || vh;
    layout(r.width, r.height);
    redraw();
  });
  ro.observe(el);

  const io = new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    visible = !!(e && e.isIntersecting);
    sync();
  }, { threshold: 0 });
  io.observe(el);

  const onVis = () => { pageVisible = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);

  // gold means live: <html data-state="idle|live">
  const mo = new MutationObserver(() => {
    const l = isLive();
    if (l === live) return;
    live = l;
    paintBeams();
    if (reduced) txs.forEach((x) => { x.on = false; });   // re-compose the still with live arcs
    for (let k = 0; k < TX_MAX; k++) paintTx(k);
    redraw();
  });
  mo.observe(root, { attributes: true, attributeFilter: ['data-state'] });

  const onPtr = (e) => {
    if (e.pointerType === 'touch') return;
    ptr.x = (e.clientX / vw) * 2 - 1;
    ptr.y = (e.clientY / vh) * 2 - 1;
  };
  const onLeave = () => { ptr.x = 0; ptr.y = 0; };
  const onWinResize = () => { vw = window.innerWidth || vw; vh = window.innerHeight || vh; };
  if (!reduced) {
    window.addEventListener('pointermove', onPtr, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onWinResize, { passive: true });
  }

  const onLost = (e) => { e.preventDefault(); paused = true; sync(); };
  canvas.addEventListener('webglcontextlost', onLost);

  // compile the programs before the first frame (parallel where KHR_parallel_shader_compile exists)
  try {
    placeCamera(0);
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
  } catch (_) { /* compiles on first render */ }

  if (reduced) still();
  else sync();
  // resolve after the first frame; rAF does not run in a hidden tab, so draw one directly then
  await Promise.race([ready, new Promise((r) => setTimeout(r, 800))]);
  if (!readyFired && !destroyed) { render(lastT, 0); fireReady(); }

  let lastOpacity = '';
  const api = {
    ready,
    setScroll(p) {
      const v = clamp01(+p || 0);
      const o = String(Math.round((1 - smooth(0.7, 1, v)) * 1000) / 1000);   // fade over the last 30 %
      if (o !== lastOpacity) { canvas.style.opacity = o; canvas.style.visibility = o === '0' ? 'hidden' : ''; lastOpacity = o; }
      if (reduced) return;                       // one composed frame: no re-render on scroll
      scrollP = v;                               // damped toward in the running loop
    },
    play() { if (!playing) { playing = true; if (reduced || !running) redraw(); } },
    pause() { paused = true; sync(); },
    resume() { paused = false; sync(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; sync();
      ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPtr);
      window.removeEventListener('resize', onWinResize);
      root.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose();
      renderer.forceContextLoss?.();
      canvas.remove();
    },
  };
  return api;
}

export default initHero3D;
