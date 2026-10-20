import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ELEMENTS } from './data.js';

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches;
const FONT = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/* =====================================================================
   Barvy, číselníky, formátování
   ===================================================================== */
const CATS = {
  alk: { name: 'Alkalické kovy', color: '#ff4d6d' },
  alz: { name: 'Kovy alkalických zemin', color: '#ff9e3d' },
  pre: { name: 'Přechodné kovy', color: '#ffd23f' },
  pos: { name: 'Post-přechodné kovy', color: '#8fc4ff' },
  pol: { name: 'Polokovy', color: '#2ee6c5' },
  nek: { name: 'Nekovy', color: '#6bff8f' },
  hal: { name: 'Halogeny', color: '#3d8bff' },
  vzp: { name: 'Vzácné plyny', color: '#9b7dff' },
  lan: { name: 'Lanthanoidy', color: '#ff8fd0' },
  akt: { name: 'Aktinoidy', color: '#e06bff' },
};
const BLOCKS = {
  s: { name: 'blok s', color: '#ff4d6d' },
  p: { name: 'blok p', color: '#ffd23f' },
  d: { name: 'blok d', color: '#3d9bff' },
  f: { name: 'blok f', color: '#6bff8f' },
};
const PHASES = {
  solid: { name: 'pevné', color: '#cfe0ff' },
  liquid: { name: 'kapalné', color: '#2f9bff' },
  gas: { name: 'plynné', color: '#ff7b45' },
  unknown: { name: 'neznámé', color: '#555c70' },
};
const SUB_COL = { 0: '#ff6b8b', 1: '#66f0ff', 2: '#ffd23f', 3: '#9dff6b' };
const SHELLS = 'KLMNOPQ';
const LL = 'spdf';
const PLASMA = ['#3b2bd6', '#8a2be2', '#ff3d8b', '#ff8a3d', '#ffe45c'];

const nf = (v, d = 2) => v.toLocaleString('cs-CZ', { maximumFractionDigits: d });
const SUPS = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUPS[c]).join('');
const fmtK = (k) => (k == null ? '—' : `${nf(k - 273.15, 1)} °C`);
const fmtDensity = (d) => (d == null ? '—' : d < 0.02 ? `${nf(d * 1000, 3)} g/l` : `${nf(d, 2)} g/cm³`);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =====================================================================
   Odvozená data prvků
   ===================================================================== */
const CORES = {
  He: '1s2', Ne: '[He] 2s2 2p6', Ar: '[Ne] 3s2 3p6', Kr: '[Ar] 3d10 4s2 4p6',
  Xe: '[Kr] 4d10 5s2 5p6', Rn: '[Xe] 4f14 5d10 6s2 6p6',
};
function parseConf(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const core = tok.match(/^\[(\w+)\]$/);
    if (core) { out.push(...parseConf(CORES[core[1]])); continue; }
    const m = tok.match(/^(\d)([spdf])(\d*)$/);
    if (m) out.push({ n: +m[1], l: LL.indexOf(m[2]), e: m[3] ? +m[3] : 1 });
  }
  return out;
}
const SYNTHETIC = (z) => z === 43 || z === 61 || (z >= 84 && z !== 90 && z !== 91 && z !== 92);
const bySymbol = {};
for (const el of ELEMENTS) {
  const core = el.c.match(/^\[(\w+)\]/);
  el.subs = parseConf(el.c).sort((a, b) => a.n - b.n || a.l - b.l);
  const val = parseConf(el.c.replace(/^\[\w+\]\s*/, ''));
  el.valence = new Set((core ? val : el.subs).map((s) => s.n * 10 + s.l));
  el.shells = [];
  for (const s of el.subs) el.shells[s.n - 1] = (el.shells[s.n - 1] || 0) + s.e;
  for (let i = 0; i < el.shells.length; i++) el.shells[i] = el.shells[i] || 0;
  el.N = el.a - el.z;
  el.massTxt = SYNTHETIC(el.z) ? `[${el.a}]` : nf(el.m, 3);
  el.search = strip(el.n);
  el.catSearch = strip(CATS[el.cat].name);
  bySymbol[el.s] = el;
}
const confHtml = (el) =>
  el.c.replace(/(\d)([spdf])(\d*)/g, (_, n, l, e) => `${n}${l}<sup>${e || 1}</sup>`).replace(/<sup>(\d+)<\/sup>/g, (_, d) => sup(d));

function phaseAt(el, T) {
  const { mp, bp } = el;
  if (mp == null && bp == null) return 'unknown';
  if (bp != null && T >= bp) return 'gas';
  if (mp == null) return el.z === 2 ? 'liquid' : 'unknown';
  if (T < mp) return 'solid';
  return 'liquid';
}

const PROPS = {
  m: { name: 'Atomová hmotnost', get: (e) => e.m, fmt: (v) => `${nf(v, 3)} u` },
  en: { name: 'Elektronegativita', get: (e) => e.en, fmt: (v) => nf(v, 2) },
  d: { name: 'Hustota', get: (e) => e.d, fmt: fmtDensity },
  r: { name: 'Atomový poloměr', get: (e) => e.r, fmt: (v) => `${nf(v, 0)} pm` },
  ie: { name: '1. ionizační energie', get: (e) => e.ie, fmt: (v) => `${nf(v, 2)} eV` },
  mp: { name: 'Teplota tání', get: (e) => e.mp, fmt: fmtK },
  bp: { name: 'Teplota varu', get: (e) => e.bp, fmt: fmtK },
  y: { name: 'Rok objevu', get: (e) => e.y ?? 1600, fmt: (v) => (v <= 1600 ? 'starověk' : String(v)) },
};
for (const p of Object.values(PROPS)) {
  const vals = ELEMENTS.map(p.get).filter((v) => v != null);
  p.min = Math.min(...vals);
  p.max = Math.max(...vals);
}
const propNorm = (key, el) => {
  const p = PROPS[key];
  const v = p.get(el);
  return v == null ? null : (v - p.min) / (p.max - p.min || 1);
};
function gradient(stops, t) {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), x - i);
}

/* =====================================================================
   Stav aplikace
   ===================================================================== */
const state = {
  view: 'table', layout: 'table', colorMode: 'cat', prop: 'm', T: 298,
  query: '', legendHover: null, legendPin: null,
  model: 'bohr', phaseColors: false, realScale: false, nucZoom: false,
  tour: null, showAllBoxes: false, sound: true,
};
try { state.sound = localStorage.getItem('prvky3d-sound') !== '0'; } catch (e) { /* bez úložiště */ }

/* =====================================================================
   Renderer, scéna, kamera
   ===================================================================== */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#03040a');
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.02, 3000);
camera.position.set(0, 0, 60);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.minDistance = 0.4;
controls.maxDistance = 160;
controls.autoRotateSpeed = 0.55;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x160a1c, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(10, 16, 20);
scene.add(key);
const rim = new THREE.DirectionalLight(0x66f0ff, 0.8);
rim.position.set(-14, -6, -10);
scene.add(rim);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.45, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- vesmírné pozadí: mlhovina + hvězdy ---------- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1500, 48, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float n1 = fbm(d * 2.1 + vec3(0.0, uTime * 0.004, 0.0));
        float n2 = fbm(d * 3.7 + vec3(7.3, 1.1, -uTime * 0.003));
        vec3 col = vec3(0.008, 0.010, 0.024);
        col += vec3(0.0, 0.30, 0.38) * pow(n1, 3.2) * 0.42;
        col += vec3(0.38, 0.04, 0.46) * pow(n2, 3.6) * 0.5;
        col += vec3(0.02, 0.03, 0.08) * (1.0 - abs(d.y));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }),
);
scene.add(sky);

const stars = (() => {
  const N = 2600;
  const pos = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const ph = new Float32Array(N);
  const r = rng(7);
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, d = 400 + r() * 700;
    const s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], i * 3);
    size[i] = Math.pow(r(), 6) * 7 + 1.2;
    ph[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aSize; attribute float aPh; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vA = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aPh) * 1.7) + aPh);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uPR; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float a = pow(1.0 - d * 2.0, 2.2) * vA; gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * a, 1.0); }`,
  });
  const p = new THREE.Points(g, m);
  scene.add(p);
  return p;
})();

/* sdílená textura měkké záře */
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

/* =====================================================================
   Dlaždice periodické tabulky
   ===================================================================== */
const PITCH = 1.12;
const tableGroup = new THREE.Group();
scene.add(tableGroup);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
boxGeo.translate(0, 0, 0.5);
const edgeGeo = new THREE.EdgesGeometry(boxGeo);
const planeGeo = new THREE.PlaneGeometry(1, 1);
const tiles = [];
const extras = [];
const bodies = [];

function drawLabel({ z, top, topRight, main, bottom }) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.035)';
  g.beginPath();
  g.roundRect(6, 6, 244, 244, 18);
  g.fill();
  g.textBaseline = 'alphabetic';
  if (top != null) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = `600 36px ${FONT}`;
    g.textAlign = 'left';
    g.fillText(top, 22, 52);
  }
  if (topRight) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = `500 25px ${FONT}`;
    g.textAlign = 'right';
    g.fillText(topRight, 236, 50);
  }
  g.textAlign = 'center';
  g.fillStyle = '#fff';
  let fs = main.length > 3 ? 64 : 110;
  g.font = `700 ${fs}px ${FONT}`;
  while (g.measureText(main).width > 220 && fs > 30) g.font = `700 ${(fs -= 4)}px ${FONT}`;
  g.fillText(main, 128, z ? 166 : 150);
  if (bottom) {
    let bs = 31;
    g.font = `500 ${bs}px ${FONT}`;
    while (g.measureText(bottom).width > 222 && bs > 14) g.font = `500 ${(bs -= 1)}px ${FONT}`;
    g.fillStyle = 'rgba(255,255,255,0.72)';
    g.fillText(bottom, 128, 222);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function makeTile(el, label, color) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const bodyMat = new THREE.MeshStandardMaterial({ metalness: 0.25, roughness: 0.6, transparent: true, opacity: 0.9 });
  const body = new THREE.Mesh(boxGeo, bodyMat);
  body.scale.set(0.94, 0.94, 0.25);
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
  body.add(new THREE.LineSegments(edgeGeo, edgeMat));
  const labelMat = new THREE.MeshBasicMaterial({ map: drawLabel(label), transparent: true, depthWrite: false });
  const lab = new THREE.Mesh(planeGeo, labelMat);
  lab.scale.setScalar(0.94);
  inner.add(body, lab);
  tableGroup.add(g);
  const r = rng(el ? el.z * 31 : 999 + label.main.length);
  g.position.set((r() - 0.5) * 140, (r() - 0.5) * 90, -40 - r() * 80);
  g.quaternion.setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6));
  const t = {
    el, g, inner, body, label: lab, bodyMat, edgeMat, labelMat,
    tint: new THREE.Color(color), target: new THREE.Color(color),
    depth: 0.25, hover: 0, dim: 1, dimTarget: 1, vis: 1, visTarget: 1, anim: null,
  };
  if (el) body.userData.tile = t;
  return t;
}

for (const el of ELEMENTS) {
  const t = makeTile(el, { z: true, top: el.z, topRight: el.massTxt, main: el.s, bottom: el.n }, CATS[el.cat].color);
  tiles.push(t);
  bodies.push(t.body);
}
extras.push(Object.assign(makeTile(null, { main: '57–71', bottom: 'lanthanoidy' }, CATS.lan.color), { col: 3, row: 6 }));
extras.push(Object.assign(makeTile(null, { main: '89–103', bottom: 'aktinoidy' }, CATS.akt.color), { col: 3, row: 7 }));

/* ---------- rozvržení ---------- */
const PERIOD_FIRST = [0, 1, 3, 11, 19, 37, 55, 87];
const PERIOD_COUNT = [0, 2, 8, 8, 18, 18, 32, 32];
const tablePos = (col, row) =>
  new THREE.Vector3((col - 9.5) * PITCH, (5.2 - row) * PITCH - (row >= 9 ? 0.45 : 0), 0);
const faceOut = (pos, dir) => {
  const o = new THREE.Object3D();
  o.position.copy(pos);
  o.lookAt(pos.clone().add(dir));
  return o.quaternion.clone();
};
const ID_Q = new THREE.Quaternion();

function layoutTarget(name, el, extra) {
  if (extra) {
    return { pos: tablePos(extra.col, extra.row), quat: ID_Q, depth: 0.25 };
  }
  if (name === 'table' || name === 'bars') {
    let depth = 0.25;
    if (name === 'bars') {
      const n = propNorm(state.prop, el);
      depth = n == null ? 0.06 : 0.25 + n * 5.5;
    }
    return { pos: tablePos(el.col, el.row), quat: ID_Q, depth };
  }
  if (name === 'spiral') {
    const p = el.p, s = el.z - PERIOD_FIRST[p], cnt = PERIOD_COUNT[p];
    const f = s / cnt;
    const a = f * Math.PI * 2;
    const R = 2.3 + p * 1.38;
    const pos = new THREE.Vector3(Math.sin(a) * R, 7.6 - (p - 1 + f) * 2.25, Math.cos(a) * R);
    return { pos, quat: faceOut(pos, new THREE.Vector3(Math.sin(a), 0.12, Math.cos(a))), depth: 0.25 };
  }
  if (name === 'cylinder') {
    const R = (18 * PITCH * 1.08) / (Math.PI * 2);
    const a = ((el.col - 1) / 18) * Math.PI * 2;
    const y = (5.2 - el.row) * PITCH - (el.row >= 9 ? 0.45 : 0);
    const pos = new THREE.Vector3(Math.sin(a) * R, y, Math.cos(a) * R);
    return { pos, quat: faceOut(pos, new THREE.Vector3(Math.sin(a), 0, Math.cos(a))), depth: 0.25 };
  }
  // koule – Fibonacciho rozložení
  const i = el.z - 1, N = ELEMENTS.length;
  const y = 1 - ((i + 0.5) / N) * 2;
  const rr = Math.sqrt(1 - y * y);
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  const dir = new THREE.Vector3(Math.cos(phi) * rr, y, Math.sin(phi) * rr);
  const pos = dir.clone().multiplyScalar(6.1);
  return { pos, quat: faceOut(pos, dir), depth: 0.25 };
}

const tableAnim = { tilt: 0, tiltTarget: 0, scale: 1, scaleTarget: 1, fade: 1, fadeTarget: 1, y: 0, yTarget: 0 };
let time = 0;

function setLayout(name, { intro = false, keepCamera = false } = {}) {
  const prev = state.layout;
  state.layout = name;
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.l === name));
  const all = [...tiles, ...extras];
  for (const t of all) {
    const tg = layoutTarget(name, t.el, t.el ? null : t);
    const stagger = intro ? 0.35 + (t.el ? t.el.z : 60) * 0.011 : prev === name ? (t.el ? t.el.col : 0) * 0.02 : (t.el ? t.el.z : 60) * 0.0045;
    t.anim = {
      p0: t.g.position.clone(), q0: t.g.quaternion.clone(), d0: t.depth,
      p1: tg.pos, q1: tg.quat, d1: tg.depth, t0: time + stagger, dur: intro ? 1.7 : 1.15,
    };
    if (!t.el) t.visTarget = name === 'table' || name === 'bars' ? 1 : 0;
  }
  tableAnim.tiltTarget = name === 'bars' ? -0.95 : 0;
  tableAnim.yTarget = name === 'bars' ? -1.2 : 0;
  controls.autoRotate = name === 'spiral' || name === 'sphere' || name === 'cylinder';
  updatePropVisibility();
  if (!keepCamera) flyTo(...layoutCamera(name), intro ? 2.6 : 1.4);
  if (!intro && prev !== name) sfx.whoosh(0.6);
}

// kolik místa nahoře a dole zabírají ovládací prvky – scénu vměstnáme mezi ně
function uiInsets() {
  if (state.view !== 'table') return { top: 0, bottom: 0 };
  const top = $('#topbar').getBoundingClientRect().bottom;
  let bottom = innerHeight - legend.getBoundingClientRect().top;
  const tb = $('#tempBox');
  if (!tb.classList.contains('hidden')) {
    const r = tb.getBoundingClientRect();
    if (r.top > innerHeight / 2) bottom = Math.max(bottom, innerHeight - r.top);
  }
  return { top, bottom: Math.max(0, bottom) };
}
function fitDistance(w, h) {
  const v = THREE.MathUtils.degToRad(camera.fov) / 2;
  const { top, bottom } = uiInsets();
  const f = Math.max(0.4, (innerHeight - top - bottom - 16) / innerHeight);
  return Math.max(h / 2 / (Math.tan(v) * f), w / 2 / (Math.tan(v) * camera.aspect)) * 1.04;
}
function layoutCamera(name) {
  const narrow = camera.aspect < 1;
  if (name === 'table') return [new THREE.Vector3(0, 0, fitDistance(21.5, 13.5)), new THREE.Vector3(0, 0, 0)];
  if (name === 'bars') {
    const d = fitDistance(21, 15);
    return [new THREE.Vector3(0, d * 0.66, d * 0.78), new THREE.Vector3(0, 0.2, 0)];
  }
  if (name === 'spiral') return [new THREE.Vector3(0, 6, fitDistance(25, 22) * 1.05), new THREE.Vector3(0, -0.8, 0)];
  if (name === 'cylinder') return [new THREE.Vector3(0, 3, fitDistance(13, 14) + 3.5), new THREE.Vector3(0, 0, 0)];
  return [new THREE.Vector3(0, 2, fitDistance(14.5, 14.5) + (narrow ? 2 : 4)), new THREE.Vector3(0, 0, 0)];
}

/* ---------- plynulý přelet kamery ---------- */
let camTween = null;
function flyTo(pos, target, dur = 1.4) {
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), start: time, dur };
}
controls.addEventListener('start', () => {
  camTween = null;
  if (state.tour) stopTour();
});

/* ---------- barvení ---------- */
function tileColor(el) {
  switch (state.colorMode) {
    case 'block': return BLOCKS[el.b].color;
    case 'phase': return PHASES[phaseAt(el, state.T)].color;
    case 'prop': {
      const n = propNorm(state.prop, el);
      return n == null ? '#3a4055' : gradient(PLASMA, n);
    }
    default: return CATS[el.cat].color;
  }
}
function legendKey(el) {
  switch (state.colorMode) {
    case 'block': return el.b;
    case 'phase': return phaseAt(el, state.T);
    case 'prop': return null;
    default: return el.cat;
  }
}
function applyColors() {
  for (const t of tiles) t.target.set(tileColor(t.el));
  applyDim();
}
function matchesQuery(el, q) {
  if (!q) return true;
  return strip(el.s) === q || String(el.z) === q || el.search.startsWith(q) || (q.length >= 3 && (el.search.includes(q) || el.catSearch.includes(q))) || (q.length <= 2 && strip(el.s).startsWith(q));
}
function applyDim() {
  const filt = state.legendHover ?? state.legendPin;
  const q = strip(state.query.trim());
  for (const t of tiles) {
    const ok = (filt == null || legendKey(t.el) === filt) && matchesQuery(t.el, q);
    t.dimTarget = ok ? 1 : 0.1;
  }
}

/* =====================================================================
   Legenda a ovládací prvky tabulky
   ===================================================================== */
const legend = $('#legend');
function renderLegend() {
  let items = [];
  if (state.colorMode === 'cat') items = Object.entries(CATS).map(([k, v]) => [k, v.name, v.color]);
  if (state.colorMode === 'block') items = Object.entries(BLOCKS).map(([k, v]) => [k, v.name, v.color]);
  if (state.colorMode === 'phase') {
    const cnt = { solid: 0, liquid: 0, gas: 0, unknown: 0 };
    for (const el of ELEMENTS) cnt[phaseAt(el, state.T)]++;
    items = Object.entries(PHASES).map(([k, v]) => [k, `${v.name} · ${cnt[k]}`, v.color]);
  }
  if (state.colorMode === 'prop') {
    const p = PROPS[state.prop];
    legend.innerHTML = `<div class="grad"><span>${p.fmt(p.min)}</span><div class="bar" style="background:linear-gradient(90deg,${PLASMA.join(',')})"></div><span>${p.fmt(p.max)}</span><span style="color:var(--muted)">· ${p.name}</span></div>`;
    return;
  }
  legend.innerHTML = items
    .map(([k, n, c]) => `<button class="chip${state.legendPin && state.legendPin !== k ? ' off' : ''}${state.legendPin === k ? ' pinned' : ''}" data-k="${k}" style="color:${c}"><i class="dot"></i><span>${n}</span></button>`)
    .join('');
}
legend.addEventListener('mouseover', (e) => {
  const c = e.target.closest('.chip');
  if (!c || isTouch) return;
  state.legendHover = c.dataset.k;
  applyDim();
});
legend.addEventListener('mouseleave', () => { state.legendHover = null; applyDim(); });
legend.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  state.legendPin = state.legendPin === c.dataset.k ? null : c.dataset.k;
  state.legendHover = null;
  renderLegend();
  applyDim();
  sfx.tick();
});

function updatePropVisibility() {
  $('#prop').classList.toggle('hidden', !(state.layout === 'bars' || state.colorMode === 'prop'));
  $('#tempBox').classList.toggle('hidden', state.colorMode !== 'phase' || state.view !== 'table');
}

$('#layouts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setLayout(b.dataset.l);
});
$('#colorMode').addEventListener('change', (e) => {
  const phaseToggled = (state.colorMode === 'phase') !== (e.target.value === 'phase');
  state.colorMode = e.target.value;
  state.legendPin = null;
  applyColors();
  renderLegend();
  updatePropVisibility();
  if (phaseToggled) flyTo(...layoutCamera(state.layout), 0.8);
});
$('#prop').addEventListener('change', (e) => {
  state.prop = e.target.value;
  if (state.layout === 'bars') setLayout('bars', { keepCamera: true });
  applyColors();
  renderLegend();
});
const tempInput = $('#temp');
function setTemp(T) {
  state.T = T;
  tempInput.value = T;
  $('#tempVal').textContent = `${T} K · ${nf(T - 273.15, 0)} °C`;
  applyColors();
  renderLegend();
}
tempInput.addEventListener('input', () => setTemp(+tempInput.value));
$('#roomT').addEventListener('click', () => setTemp(298));

const search = $('#search');
search.addEventListener('input', () => {
  state.query = search.value;
  applyDim();
});
search.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = strip(search.value.trim());
    const hit = ELEMENTS.find((el) => strip(el.s) === q || String(el.z) === q) || ELEMENTS.find((el) => matchesQuery(el, q));
    if (hit) { search.blur(); openElement(hit); }
  }
  if (e.key === 'Escape') { search.value = ''; state.query = ''; applyDim(); search.blur(); }
});

/* =====================================================================
   Myš, výběr, tooltip
   ===================================================================== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-9, -9);
const pointerPx = { x: 0, y: 0 };
let pointerDirty = false;
let mouseActive = false;
let hoverTile = null;
const tooltip = $('#tooltip');

canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  pointerPx.x = e.clientX;
  pointerPx.y = e.clientY;
  mouseActive = e.pointerType === 'mouse';
  pointerDirty = mouseActive;
});
canvas.addEventListener('pointerleave', () => { pointer.set(-9, -9); pointerDirty = true; });
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; sfx.unlock(); });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const dt = performance.now() - down.t;
  down = null;
  if (moved > 7 || dt > 600 || state.view !== 'table') return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const t = pick();
  if (t) openElement(t.el);
});

function pick() {
  if (state.view !== 'table' || tableAnim.fade < 0.5) return null;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(bodies, false).find((h) => h.object.userData.tile.dim > 0.4);
  return hit ? hit.object.userData.tile : null;
}

function updateHover() {
  // dlaždice se mohou hýbat i pod nehybnou myší, proto se vybírá každý snímek
  if (!pointerDirty && !(mouseActive && state.view === 'table')) return;
  pointerDirty = false;
  const t = pick();
  if (t !== hoverTile) {
    hoverTile = t;
    canvas.style.cursor = t ? 'pointer' : '';
    if (t) sfx.hover(t.el.z);
  }
  if (!t) { tooltip.classList.remove('show'); return; }
  const el = t.el;
  let extra = '';
  if (state.layout === 'bars' || state.colorMode === 'prop') {
    const p = PROPS[state.prop];
    const v = p.get(el);
    extra = `<div class="tt-v">${p.name}: ${v == null ? 'neznámá' : p.fmt(v)}</div>`;
  } else if (state.colorMode === 'phase') {
    extra = `<div class="tt-v">Při ${state.T} K: ${PHASES[phaseAt(el, state.T)].name}</div>`;
  }
  tooltip.innerHTML = `<div class="tt-h"><span class="tt-s" style="color:${CATS[el.cat].color}">${el.s}</span><span class="tt-n">${el.n}</span><span class="tt-z">${el.z}</span></div><div class="tt-r">${CATS[el.cat].name} · ${el.massTxt} u</div>${extra}`;
  const x = Math.min(pointerPx.x, innerWidth - 230);
  const y = Math.min(pointerPx.y, innerHeight - 110);
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.add('show');
}

/* =====================================================================
   Zvuk (WebAudio, žádné soubory)
   ===================================================================== */
const sfx = (() => {
  let ctx = null, master = null, lastHover = 0;
  const ok = () => state.sound && ctx && ctx.state === 'running';
  function unlock() {
    if (!state.sound) return;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.16;
        master.connect(ctx.destination);
      } catch (e) { return; }
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function tone(f, dur, { type = 'sine', vol = 0.3, delay = 0, to = null } = {}) {
    if (!ok()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function whoosh(dur = 0.8, up = true) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(up ? 250 : 2200, t);
    f.frequency.exponentialRampToValueAtTime(up ? 2400 : 220, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }
  return {
    unlock,
    whoosh: (d) => whoosh(d, true),
    whooshDown: () => whoosh(0.7, false),
    tick: () => tone(1400, 0.05, { vol: 0.08, type: 'triangle' }),
    hover: (z) => {
      const now = performance.now();
      if (now - lastHover < 45) return;
      lastHover = now;
      tone(320 * Math.pow(2, (z % 24) / 24), 0.07, { vol: 0.035, type: 'triangle' });
    },
    open: (el) => {
      const base = 196 * Math.pow(2, ((el.col - 1) % 12) / 12);
      [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.9, { vol: 0.09, delay: 0.35 + i * 0.07 }));
    },
    absorb: () => tone(300, 0.5, { vol: 0.12, to: 1200, type: 'sine' }),
    photon: (lambda) => tone(220 * Math.pow(2, (720 - Math.min(760, Math.max(100, lambda))) / 110), 0.8, { vol: 0.14 }),
    toggle(on) { state.sound = on; if (on) unlock(); },
  };
})();
const soundBtn = $('#soundBtn');
const renderSoundBtn = () => (soundBtn.textContent = state.sound ? '🔊' : '🔇');
renderSoundBtn();
soundBtn.addEventListener('click', () => {
  sfx.toggle(!state.sound);
  renderSoundBtn();
  try { localStorage.setItem('prvky3d-sound', state.sound ? '1' : '0'); } catch (e) { /* nic */ }
});
addEventListener('keydown', () => sfx.unlock(), { once: true });

/* =====================================================================
   Atom: jádro, Bohrovy dráhy, orbitaly
   ===================================================================== */
const atomGroup = new THREE.Group();
scene.add(atomGroup);
const nucleonGeo = new THREE.SphereGeometry(1, 22, 16);
const electronGeo = new THREE.SphereGeometry(1, 16, 12);
const protonMat = new THREE.MeshStandardMaterial({ color: '#ff4a5e', roughness: 0.3, metalness: 0.05, emissive: '#6a0618', emissiveIntensity: 0.55 });
const neutronMat = new THREE.MeshStandardMaterial({ color: '#7390ff', roughness: 0.35, metalness: 0.05, emissive: '#0c1a5c', emissiveIntensity: 0.55 });
const electronMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 2.2, 2.4) });
const RN = 0.24;
let atom = null;
const dying = [];

function packNucleus(A, seed) {
  const r = rng(seed);
  const R0 = RN * Math.cbrt(A) * 1.25;
  const pts = [];
  for (let i = 0; i < A; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, d = R0 * Math.cbrt(r());
    const s = Math.sqrt(1 - u * u);
    pts.push(new THREE.Vector3(Math.cos(a) * s * d, u * d, Math.sin(a) * s * d));
  }
  const minD = RN * 2 * 0.97;
  const tmp = new THREE.Vector3();
  for (let it = 0; it < 70; it++) {
    for (let i = 0; i < A; i++) {
      for (let j = i + 1; j < A; j++) {
        tmp.subVectors(pts[j], pts[i]);
        const d = tmp.length();
        if (d < minD) {
          if (d < 1e-6) tmp.set(r() - 0.5, r() - 0.5, r() - 0.5);
          tmp.setLength((minD - d) / 2);
          pts[j].add(tmp);
          pts[i].sub(tmp);
        }
      }
    }
    if (it < 62) for (const p of pts) p.multiplyScalar(0.985);
  }
  return pts;
}

function makeShell(k, count, R, color) {
  const pivot = new THREE.Object3D();
  const tilt = new THREE.Object3D();
  pivot.add(tilt);
  tilt.quaternion.setFromEuler(new THREE.Euler((k % 2 ? 1 : -1) * (0.32 + 0.17 * k), k * 1.07, ((k % 3) - 1) * 0.28));
  const ringPts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }
  const ringMat = new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.9), transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), ringMat);
  tilt.add(ring);
  const mesh = new THREE.InstancedMesh(electronGeo, electronMat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  tilt.add(mesh);
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const haloMat = new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(0.35, 1.3, 1.45), size: 1.15, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Points(haloGeo, haloMat);
  halo.frustumCulled = false;
  tilt.add(halo);
  const TR = 22;
  const tPos = new Float32Array(count * TR * 2 * 3);
  const tCol = new Float32Array(count * TR * 2 * 3);
  const ec = new THREE.Color(0.25, 1.4, 1.6);
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < TR; j++) {
      const a0 = Math.pow(1 - j / TR, 1.6), a1 = Math.pow(1 - (j + 1) / TR, 1.6);
      const o = (i * TR + j) * 6;
      tCol.set([ec.r * a0, ec.g * a0, ec.b * a0, ec.r * a1, ec.g * a1, ec.b * a1], o);
    }
  }
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const trail = new THREE.LineSegments(tGeo, trailMat);
  trail.frustumCulled = false;
  tilt.add(trail);
  const offs = new Float32Array(count);
  for (let i = 0; i < count; i++) offs[i] = (i / count) * Math.PI * 2 + k * 0.7;
  return {
    k, count, R, pivot, tilt, ring, ringMat, mesh, halo, haloMat, trail, trailMat, TR, offs,
    r: new Float32Array(count).fill(R), tw: [],
    omega: 1.15 / Math.pow(k, 0.85), prec: (k % 2 ? 1 : -1) * (0.05 + 0.012 * k),
  };
}
const shellRadius = (atomRn, k) => atomRn + 1.25 + (k - 1) * 1.45;

function buildAtom(el) {
  const root = new THREE.Group();
  const A = el.a;
  const pts = packNucleus(A, el.z * 7919 + A);
  const order = pts.map((_, i) => i);
  const r = rng(el.z * 13);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const isP = new Array(A).fill(false);
  for (let i = 0; i < el.z; i++) isP[order[i]] = true;
  const nucleus = new THREE.Group();
  const prot = new THREE.InstancedMesh(nucleonGeo, protonMat, el.z);
  const neut = new THREE.InstancedMesh(nucleonGeo, neutronMat, Math.max(1, A - el.z));
  neut.count = A - el.z;
  const pBase = [], nBase = [];
  let Rn = RN;
  pts.forEach((p, i) => {
    (isP[i] ? pBase : nBase).push({ p, ph: r() * 100 });
    Rn = Math.max(Rn, p.length() + RN);
  });
  nucleus.add(prot, neut);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.35, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  glow.scale.setScalar(Rn * 6);
  nucleus.add(glow);
  root.add(nucleus);

  const color = CATS[el.cat].color;
  const shells = el.shells.map((cnt, i) => makeShell(i + 1, cnt, shellRadius(Rn, i + 1), color)).filter((s) => s.count > 0);
  for (const s of shells) root.add(s.pivot);
  const Rmax = shells.length ? shells[shells.length - 1].R : 2;

  const rAtom = (el.r || 150) * 1000; // fm
  const rNuc = 1.2 * Math.cbrt(A); // fm
  const realFactor = ((rNuc / rAtom) * Rmax) / Rn;

  return {
    el, root, nucleus, prot, neut, pBase, nBase, glow, Rn, shells, Rmax, realFactor,
    appear: 0, leaving: false, mix: state.model === 'cloud' ? 1 : 0, ns: state.model === 'cloud' ? 0.3 : 1,
    clouds: null, cloudR: Rmax, events: [], busy: false, ghosts: [], spin: 0,
  };
}

function disposeAtom(a) {
  a.root.traverse((o) => {
    if (o.geometry && o.geometry !== nucleonGeo && o.geometry !== electronGeo) o.geometry.dispose();
    if (o.material && ![protonMat, neutronMat, electronMat].includes(o.material)) o.material.dispose();
  });
  if (a.clouds) for (const s of a.clouds.subs) s.points.geometry.dispose();
  a.root.removeFromParent();
}

/* ---------- orbitaly: vodíkupodobné vlnové funkce ---------- */
function laguerre(k, a, x) {
  if (k === 0) return 1;
  let L0 = 1, L1 = 1 + a - x;
  for (let i = 1; i < k; i++) {
    const L2 = ((2 * i + 1 + a - x) * L1 - (i + a) * L0) / (i + 1);
    L0 = L1;
    L1 = L2;
  }
  return L1;
}
const radialR = (n, l, r) => {
  const rho = (2 * r) / n;
  return Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho);
};
// reálné kulové funkce; (x, y, z) fyzikálně – z je osa „nahoru“ (v three.js osa y)
const ANG = [
  [{ n: 's', f: () => 1 }],
  [{ n: 'pz', f: (x, y, z) => z }, { n: 'px', f: (x) => x }, { n: 'py', f: (x, y) => y }],
  [
    { n: 'dz²', f: (x, y, z) => 3 * z * z - 1 }, { n: 'dxz', f: (x, y, z) => x * z }, { n: 'dyz', f: (x, y, z) => y * z },
    { n: 'dxy', f: (x, y) => x * y }, { n: 'dx²−y²', f: (x, y) => x * x - y * y },
  ],
  [
    { n: 'fz³', f: (x, y, z) => z * (5 * z * z - 3) }, { n: 'fxz²', f: (x, y, z) => x * (5 * z * z - 1) },
    { n: 'fyz²', f: (x, y, z) => y * (5 * z * z - 1) }, { n: 'fxyz', f: (x, y, z) => x * y * z },
    { n: 'fz(x²−y²)', f: (x, y, z) => z * (x * x - y * y) }, { n: 'fx(x²−3y²)', f: (x, y) => x * (x * x - 3 * y * y) },
    { n: 'fy(3x²−y²)', f: (x, y) => y * (3 * x * x - y * y) },
  ],
];
const angMax = new Map();
function getAngMax(l, m) {
  const key = l * 10 + m;
  if (!angMax.has(key)) {
    const r = rng(key + 5);
    let mx = 0;
    for (let i = 0; i < 6000; i++) {
      const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const v = ANG[l][m].f(Math.cos(a) * s, Math.sin(a) * s, u);
      mx = Math.max(mx, v * v);
    }
    angMax.set(key, mx * 1.03);
  }
  return angMax.get(key);
}
const cdfCache = new Map();
function getCdf(n, l) {
  const key = n * 10 + l;
  if (!cdfCache.has(key)) {
    const N = 1600, rmax = n * n * 2.6 + 14;
    const cdf = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) {
      const rr = (i / N) * rmax;
      const R = radialR(n, l, rr);
      cdf[i] = cdf[i - 1] + rr * rr * R * R;
    }
    for (let i = 1; i <= N; i++) cdf[i] /= cdf[N];
    cdfCache.set(key, { cdf, rmax, N });
  }
  return cdfCache.get(key);
}
function sampleR(c, u, jitter) {
  let lo = 0, hi = c.N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c.cdf[mid] < u) lo = mid;
    else hi = mid;
  }
  return ((lo + jitter) / c.N) * c.rmax;
}
const visR = (r) => 1.15 * Math.pow(r, 0.6);

const cloudVS = `
  attribute float aSign; attribute float aPh; attribute vec3 aCol;
  uniform float uTime; uniform float uSize; uniform float uView; uniform float uOpacity; uniform float uPhase;
  uniform vec3 uColA; uniform vec3 uColB;
  varying vec3 vCol; varying float vA;
  void main(){
    vec3 p = position + 0.035 * vec3(sin(uTime * 3.1 + aPh * 11.0), sin(uTime * 2.7 + aPh * 7.0), cos(uTime * 3.3 + aPh * 5.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * uView / -mv.z, 1.0, 28.0);
    float tw = 0.45 + 0.55 * sin(uTime * (1.5 + fract(aPh * 3.7) * 3.0) + aPh * 6.283);
    vA = tw * uOpacity;
    vCol = mix(aCol, aSign > 0.0 ? uColA : uColB, uPhase);
  }`;
const cloudFS = `
  varying vec3 vCol; varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = pow(1.0 - d * 2.0, 1.6) * vA; gl_FragColor = vec4(vCol * a, 1.0); }`;
const viewUniform = { value: 1 };

function buildClouds(a) {
  const el = a.el;
  const group = new THREE.Group();
  const per = Math.min(4200, Math.max(520, 82000 / el.z));
  const r = rng(el.z * 101);
  const subs = [];
  let maxR = 0;
  for (const sub of el.subs) {
    const { n, l, e } = sub;
    const orbs = 2 * l + 1;
    const occ = [];
    for (let m = 0; m < orbs; m++) occ.push(e <= orbs ? (m < e ? 1 : 0) : m < e - orbs ? 2 : 1);
    const c = getCdf(n, l);
    const total = occ.reduce((s, o) => s + Math.round(per * o), 0);
    const pos = new Float32Array(total * 3);
    const sign = new Float32Array(total);
    const ph = new Float32Array(total);
    const colA = new Float32Array(total * 3);
    const hsl = {};
    new THREE.Color(SUB_COL[l]).getHSL(hsl);
    let idx = 0;
    const ranges = [];
    for (let m = 0; m < orbs; m++) {
      const cnt = Math.round(per * occ[m]);
      ranges.push({ m, start: idx, count: cnt, name: ANG[l][m].n });
      // každý orbital podslupky má trochu jiný odstín, ať jsou laloky rozeznatelné
      const oc = new THREE.Color().setHSL((hsl.h + (orbs > 1 ? (m / (orbs - 1) - 0.5) * 0.3 : 0) + 1) % 1, hsl.s, hsl.l);
      const amax = getAngMax(l, m);
      const f = ANG[l][m].f;
      for (let i = 0; i < cnt; i++) {
        let x, y, z, Y;
        for (;;) {
          const u = r() * 2 - 1, ang = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
          x = Math.cos(ang) * s; y = Math.sin(ang) * s; z = u;
          Y = f(x, y, z);
          if (r() * amax <= Y * Y) break;
        }
        const rr = sampleR(c, r(), r());
        const R = radialR(n, l, rr);
        const vr = visR(rr);
        pos[idx * 3] = x * vr;
        pos[idx * 3 + 1] = z * vr;
        pos[idx * 3 + 2] = y * vr;
        sign[idx] = Math.sign(R * Y) || 1;
        ph[idx] = r() * 10;
        colA[idx * 3] = oc.r; colA[idx * 3 + 1] = oc.g; colA[idx * 3 + 2] = oc.b;
        idx++;
      }
    }
    // poloměr, ve kterém leží 90 % hustoty – pro nastavení kamery
    let k90 = 0;
    while (c.cdf[k90] < 0.9) k90++;
    const r90 = visR((k90 / c.N) * c.rmax);
    maxR = Math.max(maxR, r90);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSign', new THREE.BufferAttribute(sign, 1));
    g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(colA, 3));
    const valence = el.valence.has(n * 10 + l);
    const mat = new THREE.ShaderMaterial({
      vertexShader: cloudVS, fragmentShader: cloudFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSize: { value: valence ? 0.09 : 0.06 }, uView: viewUniform, uOpacity: { value: 0 }, uPhase: { value: 0 },
        uColA: { value: new THREE.Color('#ff9b54') }, uColB: { value: new THREE.Color('#47c4ff') },
      },
    });
    const points = new THREE.Points(g, mat);
    points.frustumCulled = false;
    group.add(points);
    // kulové s-podslupky by přezářily tvary p, d a f – proto jsou tlumenější
    const base = valence ? (l === 0 ? 0.32 : 0.8) : l === 0 ? 0.12 : 0.22;
    subs.push({ ...sub, points, mat, valence, ranges, r90, on: valence, vis: valence ? 1 : 0, base });
  }
  a.root.add(group);
  a.clouds = { group, subs, sel: { sub: null, m: null }, solo: null };
  a.cloudR = maxR;
}

/* ---------- fotony ---------- */
const photons = [];
function waveColor(l) {
  if (l < 380) return new THREE.Color().setRGB(0.62, 0.45, 1.0, THREE.SRGBColorSpace);
  if (l > 780) return new THREE.Color().setRGB(0.55, 0.05, 0.05, THREE.SRGBColorSpace);
  let r = 0, g = 0, b = 0;
  if (l < 440) { r = -(l - 440) / 60; b = 1; }
  else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = -(l - 510) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = -(l - 645) / 65; }
  else r = 1;
  const f = l < 420 ? 0.3 + (0.7 * (l - 380)) / 40 : l > 700 ? 0.3 + (0.7 * (780 - l)) / 80 : 1;
  return new THREE.Color().setRGB(r * f, g * f, b * f, THREE.SRGBColorSpace);
}
function spawnPhoton(from, dir, lambda, { incoming = false, dist = 16, onArrive = null } = {}) {
  const N = 72;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
  const col = waveColor(lambda).multiplyScalar(1.3);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  line.frustumCulled = false;
  // vlnu tvoří i řetízek zářících teček – samotná čára by byla jen 1 px tenká
  const beads = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: col.clone().multiplyScalar(0.55), size: 0.32, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  beads.frustumCulled = false;
  line.add(beads);
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  head.scale.setScalar(0.8);
  scene.add(line, head);
  const start = incoming ? from.clone().addScaledVector(dir, -dist) : from.clone();
  photons.push({ line, head, geo, N, pos: start, dir: dir.clone().normalize(), lambda, incoming, dist, traveled: 0, life: 0, phase: 0, onArrive, speed: incoming ? 20 : 11 });
}
const _side = new THREE.Vector3(), _up = new THREE.Vector3(), _cdir = new THREE.Vector3(), _m4 = new THREE.Matrix4();
function updatePhotons(dt) {
  for (let i = photons.length - 1; i >= 0; i--) {
    const p = photons[i];
    p.life += dt;
    p.phase += dt * 16;
    const step = p.speed * dt;
    p.pos.addScaledVector(p.dir, step);
    p.traveled += step;
    // vlna kmitá kolmo ke směru letu i k pohledu kamery, ať je vidět
    _cdir.subVectors(camera.position, p.pos).normalize();
    _side.crossVectors(p.dir, _cdir).normalize();
    _up.crossVectors(p.dir, _side);
    _m4.makeBasis(p.dir, _side, _up);
    p.line.quaternion.setFromRotationMatrix(_m4);
    p.line.position.copy(p.pos);
    p.head.position.copy(p.pos);
    const L = 3.2;
    const k = (Math.PI * 2) / (0.35 + (Math.min(800, Math.max(100, p.lambda)) / 700) * 0.55);
    const arr = p.geo.attributes.position.array;
    for (let j = 0; j < p.N; j++) {
      const f = j / (p.N - 1);
      const x = -L + L * f;
      arr[j * 3] = x;
      arr[j * 3 + 1] = Math.sin(k * x - p.phase) * 0.22 * Math.sin(Math.PI * f);
      arr[j * 3 + 2] = 0;
    }
    p.geo.attributes.position.needsUpdate = true;
    const fade = p.incoming ? 1 : clamp01(1 - (p.life - 0.6) / 1.6);
    p.line.material.opacity = fade;
    p.line.children[0].material.opacity = fade;
    p.head.material.opacity = fade;
    const done = p.incoming ? p.traveled >= p.dist : p.life > 2.3;
    if (done) {
      scene.remove(p.line, p.head);
      p.geo.dispose();
      p.line.material.dispose();
      p.line.children[0].material.dispose();
      p.head.material.dispose();
      photons.splice(i, 1);
      if (p.onArrive) p.onArrive();
    }
  }
}

/* ---------- excitace elektronu ---------- */
const LINES = {
  2: [587.6, 'čára D₃ – podle ní bylo helium objeveno ve spektru Slunce'],
  3: [670.8, 'karmínově červený plamen lithia'],
  7: [427.8, 'modrofialová záře dusíku v polární záři'],
  8: [557.7, 'zelená čára kyslíku – barva polární záře'],
  10: [640.2, 'červenooranžová záře neonových trubic'],
  11: [589.0, 'sodíkový dublet D – žluté pouliční lampy'],
  12: [518.4, 'zelený triplet hořčíku ve slunečním spektru'],
  18: [696.5, 'červená čára argonu'],
  19: [404.4, 'fialový plamen draslíku'],
  20: [422.7, 'fialová čára vápníku'],
  26: [527.0, 'čára železa ve slunečním spektru (Fraunhoferova E)'],
  29: [521.8, 'zelená čára mědi – zelený plamen'],
  30: [481.1, 'modrozelená čára zinku'],
  36: [557.0, 'zelenožlutá čára kryptonu'],
  37: [780.0, 'temně rudá čára – rubidus znamená tmavě rudý'],
  38: [460.7, 'modrá čára stroncia'],
  48: [643.8, 'červená kadmiová čára – kdysi etalon délky'],
  49: [451.1, 'indigová čára, podle níž dostalo indium jméno'],
  54: [467.1, 'modrá čára xenonových výbojek'],
  55: [455.5, 'nebesky modrá čára – caesius znamená nebesky modrý'],
  56: [553.5, 'zelená čára barya – zelené ohňostroje'],
  80: [435.8, 'modrá čára rtuťových výbojek'],
  81: [535.0, 'zelená čára, podle níž dostalo thallium jméno'],
};
const toastEl = $('#toast');
let toastTimer = 0;
function toast(html, ms = 5200) {
  toastEl.innerHTML = html;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}
function electronWorld(shell, i, out = new THREE.Vector3()) {
  const th = shell.offs[i] + shell.omega * time + atom.spin;
  out.set(Math.cos(th) * shell.r[i], 0, Math.sin(th) * shell.r[i]);
  return shell.tilt.localToWorld(out);
}
function radiusTween(shell, i, to, dur) {
  shell.tw[i] = { from: shell.r[i], to, t0: time, dur };
}
function ghostRing(shell, R) {
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineDashedMaterial({ color: new THREE.Color(1.2, 1.2, 1.4), dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0, depthWrite: false });
  const line = new THREE.Line(g, m);
  line.computeLineDistances();
  shell.tilt.add(line);
  const gh = { line, m, target: 0.7 };
  atom.ghosts.push(gh);
  return gh;
}
function excite() {
  if (!atom || state.view !== 'atom' || atom.busy || atom.appear < 0.9) return;
  if (state.model !== 'bohr') setModel('bohr');
  if (state.nucZoom) toggleNucleusZoom();
  const a = atom;
  const el = a.el;
  const shell = a.shells[a.shells.length - 1];
  const i = shell.count - 1;
  a.busy = true;
  const K = shell.k;
  const isH = el.z === 1;
  const up = isH ? 3 + Math.floor(Math.random() * 4) : K + 1;
  const Rup = shellRadius(a.Rn, up);
  const target = electronWorld(shell, i);
  const inDir = target.clone().sub(camera.position).normalize().cross(new THREE.Vector3(0, 1, 0)).normalize().add(new THREE.Vector3(0, -0.3, 0)).normalize();
  let lambda, note;
  if (isH) {
    lambda = 1 / (1.09678e-2 * (0.25 - 1 / (up * up)));
    note = `Balmerova série vodíku (${up} → 2)`;
  } else if (LINES[el.z]) [lambda, note] = LINES[el.z];
  else {
    lambda = 410 + ((el.z * 137) % 290);
    note = 'ilustrační vlnová délka – skutečné spektrum prvku tvoří mnoho čar';
  }
  const inLambda = isH ? 1 / (1.09678e-2 * (1 - 1 / (up * up))) : lambda;
  a.excitedR = Rup;
  flyTo(...atomCamera(a), 0.9);
  const done = () => {
    a.busy = false;
    a.excitedR = 0;
    if (atom === a && !state.nucZoom && !camTween) flyTo(...atomCamera(a), 1.4);
  };
  sfx.absorb();
  spawnPhoton(target, inDir, inLambda, {
    incoming: true, dist: 15,
    onArrive: () => {
      if (atom !== a) return;
      radiusTween(shell, i, Rup, 0.45);
      const gh = ghostRing(shell, Rup);
      flash(electronWorld(shell, i), waveColor(inLambda));
      toast(`⚡ Elektron pohltil foton a vyskočil z hladiny <b>${SHELLS[K - 1]}</b> (n = ${K}) na <b>n = ${up}</b>. Excitovaný stav ale dlouho nevydrží…`, 2600);
      a.events.push({
        at: time + 1.9,
        fn: () => {
          const down = isH ? 2 : K;
          radiusTween(shell, i, shellRadius(a.Rn, down), 0.32);
          a.events.push({
            at: time + 0.3,
            fn: () => {
              const p = electronWorld(shell, i);
              spawnPhoton(p, p.clone().normalize().add(new THREE.Vector3(0.2, 0.25, 0.35)).normalize(), lambda);
              sfx.photon(lambda);
              const sw = waveColor(lambda).getStyle(THREE.SRGBColorSpace);
              const uv = lambda < 380 ? ' (ultrafialové – lidské oko ho nevidí)' : lambda > 750 ? ' (na hranici infračerveného)' : '';
              toast(`🌈 Návrat na nižší hladinu: vyzářen foton <span class="sw" style="color:${sw}"></span><b>λ ≈ ${nf(lambda, 1)} nm</b>${uv}<br><span style="color:var(--muted)">${note}</span>`, 6500);
              gh.target = 0;
              if (isH) {
                a.events.push({
                  at: time + 1.1,
                  fn: () => {
                    radiusTween(shell, i, shellRadius(a.Rn, 1), 0.3);
                    a.events.push({
                      at: time + 0.28,
                      fn: () => {
                        const q = electronWorld(shell, i);
                        spawnPhoton(q, q.clone().normalize().add(new THREE.Vector3(-0.3, 0.2, 0.4)).normalize(), 121.6);
                        sfx.photon(121.6);
                        toast(`🌈 A ještě skok 2 → 1: foton <b>λ ≈ 121,6 nm</b> – Lymanova čára α v ultrafialové oblasti.<br><span style="color:var(--muted)">Předtím: ${nf(lambda, 1)} nm – ${note}</span>`, 6500);
                        a.events.push({ at: time + 1.2, fn: done });
                      },
                    });
                  },
                });
              } else a.events.push({ at: time + 1.2, fn: done });
            },
          });
        },
      });
    },
  });
}
function flash(pos, color) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: color.clone().multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.position.copy(pos);
  scene.add(s);
  const t0 = time;
  const tick = () => {
    const k = (time - t0) / 0.6;
    s.scale.setScalar(0.5 + k * 3.5);
    s.material.opacity = 1 - k;
    if (k < 1) requestAnimationFrame(tick);
    else { scene.remove(s); s.material.dispose(); }
  };
  tick();
}

/* =====================================================================
   Pohled atomu – přepínání, panel, štítky
   ===================================================================== */
const panel = $('#panel');
const chipsEl = $('#chips');
const labelsEl = $('#labels');
const viewShift = { x: 0, y: 0 };

function openElement(el) {
  sfx.unlock();
  if (location.hash.slice(1) !== el.s) location.hash = el.s;
  else showAtom(el);
}
function route() {
  const el = bySymbol[decodeURIComponent(location.hash.slice(1))];
  if (el) showAtom(el);
  else showTable();
}
addEventListener('hashchange', route);

function atomCamera(a) {
  const sel = a.clouds?.sel;
  const R = state.model === 'cloud' ? Math.max(sel?.sub != null ? a.clouds.subs[sel.sub].r90 * 1.15 : a.cloudR, 2) : Math.max(a.Rmax, a.excitedR || 0);
  const d = R * 2.35 + 3.5 + (camera.aspect < 1 ? R * 1.3 : 0);
  return [new THREE.Vector3(0, 0.38, 1).normalize().multiplyScalar(d), new THREE.Vector3(0, 0, 0)];
}

function showAtom(el) {
  if (state.view === 'atom' && atom && atom.el === el && !atom.leaving) return;
  const fromTable = state.view !== 'atom';
  state.view = 'atom';
  state.nucZoom = false;
  if (atom) { atom.leaving = true; dying.push(atom); }
  atom = buildAtom(el);
  atomGroup.add(atom.root);
  if (state.model === 'cloud') buildClouds(atom);
  tableAnim.fadeTarget = 0;
  tableAnim.scaleTarget = 2.4;
  hoverTile = null;
  tooltip.classList.remove('show');
  canvas.style.cursor = '';
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  document.body.classList.add('atom');
  $('#tableControls').style.display = 'none';
  legend.classList.add('hidden');
  $('#hint').style.opacity = 0;
  updatePropVisibility();
  $('#atomUI').classList.remove('hidden');
  renderPanel(el);
  // na telefonu začíná panel sbalený, ať je atom vidět celý
  if (fromTable && innerWidth <= 860 && !panel.classList.contains('mini')) togglePanelMini();
  panel.classList.add('open');
  renderChips();
  syncAtomButtons();
  flyTo(...atomCamera(atom), fromTable ? 1.7 : 1.0);
  if (fromTable) { sfx.whoosh(0.9); }
  sfx.open(el);
  document.title = `${el.n} (${el.s}) – Prvky 3D`;
}

function showTable() {
  if (state.view === 'table') return;
  state.view = 'table';
  stopTour();
  if (atom) { atom.leaving = true; dying.push(atom); atom = null; }
  tableAnim.fadeTarget = 1;
  tableAnim.scaleTarget = 1;
  controls.autoRotateSpeed = 0.55;
  controls.autoRotate = state.layout === 'spiral' || state.layout === 'sphere' || state.layout === 'cylinder';
  document.body.classList.remove('atom', 'mini-panel');
  $('#tableControls').style.display = 'contents';
  legend.classList.remove('hidden');
  $('#atomUI').classList.add('hidden');
  panel.classList.remove('open', 'mini');
  chipsEl.classList.add('hidden');
  toastEl.classList.remove('show');
  updatePropVisibility();
  flyTo(...layoutCamera(state.layout), 1.5);
  sfx.whooshDown();
  document.title = 'Prvky 3D – periodická soustava';
}
function goBack() {
  history.replaceState(null, '', location.pathname + location.search);
  showTable();
}
function step(d) {
  const cur = atom ? atom.el.z : 1;
  const el = ELEMENTS[(cur - 1 + d + ELEMENTS.length) % ELEMENTS.length];
  history.replaceState(null, '', `#${el.s}`);
  showAtom(el);
}

function setModel(m) {
  if (state.model === m) return;
  state.model = m;
  if (m === 'cloud' && atom && !atom.clouds) buildClouds(atom);
  if (state.realScale && m === 'cloud') state.realScale = false;
  renderChips();
  syncAtomButtons();
  if (atom && !state.nucZoom) flyTo(...atomCamera(atom), 1.1);
  if (m === 'cloud') toast('☁️ <b>Kvantový pohled:</b> elektron nemá dráhu – jen pravděpodobnost, kde ho najdeš. Každá tečka je jedno možné „změření“ polohy. <span style="color:var(--muted)">(tvary vodíkupodobných orbitalů)</span>', 6500);
  sfx.tick();
}
function toggleNucleusZoom() {
  if (!atom) return;
  state.nucZoom = !state.nucZoom;
  if (state.nucZoom) {
    if (state.realScale) { state.realScale = false; }
    const d = atom.Rn * (state.model === 'cloud' ? 0.3 : 1) * 4.6 + 0.5;
    flyTo(new THREE.Vector3(0.3, 0.4, 1).normalize().multiplyScalar(d), new THREE.Vector3(), 1.3);
    toast(`🔬 Jádro: <b style="color:#ff6b7d">${atom.el.z} protonů</b> a <b style="color:#8aa4ff">${atom.el.N} neutronů</b> (izotop ${sup(atom.el.a)}${atom.el.s}). Drží je pohromadě silná jaderná síla – na krátkou vzdálenost přemůže elektrické odpuzování protonů.`, 7000);
  } else flyTo(...atomCamera(atom), 1.2);
  syncAtomButtons();
  sfx.whoosh(0.5);
}
function toggleRealScale() {
  if (!atom) return;
  state.realScale = !state.realScale;
  if (state.realScale) {
    if (state.model !== 'bohr') setModel('bohr');
    if (state.nucZoom) { state.nucZoom = false; flyTo(...atomCamera(atom), 1.2); }
    toast(`📏 Teď je jádro ve <b>skutečném poměru</b> k atomu – zmenšilo se asi ${nf(Math.round(1 / atom.realFactor), 0)}×. Kdyby byl atom velký jako fotbalový stadion, jádro by bylo zrnko hrachu uprostřed. Atom je skoro celý prázdný prostor!`, 8000);
  }
  syncAtomButtons();
  sfx.tick();
}
function syncAtomButtons() {
  document.querySelectorAll('#models button').forEach((b) => b.classList.toggle('on', b.dataset.m === state.model));
  $('#nucleusBtn').classList.toggle('on', state.nucZoom);
  $('#scaleBtn').classList.toggle('on', state.realScale);
  $('#tourBtn').classList.toggle('on', !!state.tour);
  $('#tourBtn').textContent = state.tour ? '⏸ Prohlídka' : '▶ Prohlídka';
  $('#phaseBtn').style.display = state.model === 'cloud' ? '' : 'none';
  $('#phaseBtn').classList.toggle('on', state.phaseColors);
  $('#exciteBtn').style.display = state.model === 'bohr' ? '' : 'none';
  $('#scaleBtn').style.display = state.model === 'bohr' ? '' : 'none';
}
function startTour() {
  state.tour = setInterval(() => step(1), 7000);
  syncAtomButtons();
}
function stopTour() {
  if (state.tour) clearInterval(state.tour);
  state.tour = null;
  syncAtomButtons();
}

$('#backBtn').addEventListener('click', goBack);
$('#models').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setModel(b.dataset.m); });
$('#exciteBtn').addEventListener('click', excite);
$('#nucleusBtn').addEventListener('click', toggleNucleusZoom);
$('#scaleBtn').addEventListener('click', toggleRealScale);
$('#phaseBtn').addEventListener('click', () => { state.phaseColors = !state.phaseColors; syncAtomButtons(); renderChips(); });
$('#prevBtn').addEventListener('click', () => { stopTour(); step(-1); });
$('#nextBtn').addEventListener('click', () => { stopTour(); step(1); });
$('#tourBtn').addEventListener('click', () => (state.tour ? stopTour() : startTour()));

/* ---------- informační panel ---------- */
function boxesHtml(el) {
  const subs = state.showAllBoxes ? el.subs : el.subs.filter((s) => el.valence.has(s.n * 10 + s.l));
  return subs
    .map(({ n, l, e }) => {
      const orbs = 2 * l + 1;
      const cells = [];
      for (let m = 0; m < orbs; m++) {
        const o = e <= orbs ? (m < e ? 1 : 0) : m < e - orbs ? 2 : 1;
        cells.push(`<div class="cell" style="border-color:${o ? SUB_COL[l] + '88' : ''}">${o === 2 ? '↑↓' : o === 1 ? '↑' : ''}</div>`);
      }
      return `<div class="bx-row"><span style="color:${SUB_COL[l]}">${n}${LL[l]}</span><div class="cells">${cells.join('')}</div></div>`;
    })
    .join('');
}
function renderPanel(el) {
  const c = CATS[el.cat].color;
  const group = el.row >= 9 ? 'f-blok' : `${el.col}. skupina`;
  const room = PHASES[phaseAt(el, 298)].name;
  const predicted = el.z >= 104 ? '<div class="p-note">⚠️ Supertěžký prvek – připravilo se jen pár atomů, takže řada vlastností je jen teoretická předpověď.</div>' : '';
  const cell = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  panel.innerHTML = `
    <button id="panelClose" class="glass" aria-label="Sbalit panel">${panel.classList.contains('mini') ? '▴' : '▾'}</button>
    <div class="p-head">
      <div class="p-tile" style="color:${c}"><span class="pz">${el.z}</span><span class="ps">${el.s}</span></div>
      <div>
        <div class="p-name">${el.n}</div>
        <div class="p-cat" style="color:${c}">${CATS[el.cat].name}</div>
        <div class="p-sub">${el.p}. perioda · ${group} · blok ${el.b}</div>
      </div>
    </div>
    <div class="p-conf"><small>Elektronová konfigurace</small>${confHtml(el)}</div>
    <div class="p-shells">${el.shells.map((n, i) => `<span><b>${SHELLS[i]}</b>${n}</span>`).join('')}</div>
    <div class="p-pne">
      <div><b style="color:#ff6b7d">${el.z}</b><span>protonů</span></div>
      <div><b style="color:#8aa4ff">${el.N}</b><span>neutronů</span></div>
      <div><b style="color:#7ffbff">${el.z}</b><span>elektronů</span></div>
    </div>
    <div class="p-grid">
      ${cell('Atomová hmotnost', `${el.massTxt} u`)}
      ${cell('Elektronegativita', el.en == null ? '—' : nf(el.en, 2))}
      ${cell('Hustota', fmtDensity(el.d))}
      ${cell('Skupenství (25 °C)', room)}
      ${cell('Teplota tání', fmtK(el.mp))}
      ${cell('Teplota varu', fmtK(el.bp))}
      ${cell('1. ionizační energie', el.ie == null ? '—' : `${nf(el.ie, 2)} eV`)}
      ${cell('Atomový poloměr', el.r == null ? '—' : `${nf(el.r, 0)} pm`)}
      ${cell('Objeven', el.y ? String(el.y) : 'od starověku')}
      ${cell('Izotop v modelu', `${sup(el.a)}${el.s}`)}
    </div>
    <div class="p-fact">${el.f}</div>
    ${predicted}
    <div class="p-sec">Orbitalové rámečky <button id="boxToggle">${state.showAllBoxes ? 'jen valenční' : 'zobrazit vše'}</button></div>
    <div class="boxes">${boxesHtml(el)}</div>
    <div class="p-note">Model není v měřítku: skutečné jádro je asi 100 000× menší než celý atom (vyzkoušej 📏). Šipky ↑↓ jsou elektrony s opačným spinem.</div>`;
  $('#boxToggle').addEventListener('click', () => {
    state.showAllBoxes = !state.showAllBoxes;
    renderPanel(el);
  });
  $('#panelClose').addEventListener('click', togglePanelMini);
  panel.querySelector('.p-head').addEventListener('click', () => { if (panel.classList.contains('mini')) togglePanelMini(); });
}
function togglePanelMini() {
  panel.classList.toggle('mini');
  document.body.classList.toggle('mini-panel', panel.classList.contains('mini'));
  $('#panelClose').textContent = panel.classList.contains('mini') ? '▴' : '▾';
  panel.scrollTop = 0;
}

/* ---------- čipy podslupek (orbitalový režim) ---------- */
const SHAPES = ['koule', 'činka – dva laloky', 'čtyřlístek (nebo činka s prstencem)', 'složitý tvar se šesti až osmi laloky'];
function renderChips() {
  const show = state.view === 'atom' && state.model === 'cloud' && atom?.clouds;
  chipsEl.classList.toggle('hidden', !show);
  if (!show) return;
  const { subs, sel } = atom.clouds;
  const allOn = subs.every((s) => s.on);
  const valOn = subs.every((s) => s.on === s.valence);
  let html = `<div class="wrap glass"><span class="lead">Podslupky:</span>${subs
    .map((s, i) => `<button data-i="${i}" class="${(sel.sub == null ? s.on : sel.sub === i) ? '' : 'off'}${sel.sub === i ? ' pick' : ''}" style="color:${SUB_COL[s.l]}">${s.n}${LL[s.l]}${sup(s.e)}</button>`)
    .join('')}<button class="opt${sel.sub == null && valOn ? ' pick' : ''}" data-a="val">valenční</button><button class="opt${sel.sub == null && allOn ? ' pick' : ''}" data-a="all">vše</button></div>`;
  if (sel.sub != null) {
    const s = subs[sel.sub];
    const orbs = s.ranges.filter((r) => r.count > 0);
    if (s.l > 0) {
      html += `<div class="wrap glass"><span class="lead">Orbital:</span><button class="opt${sel.m == null ? ' pick' : ''}" data-m="all">celá ${s.n}${LL[s.l]}</button>${orbs
        .map((r) => `<button data-m="${r.m}" class="${sel.m === r.m ? 'pick' : ''}" style="color:${SUB_COL[s.l]}">${s.n}${r.name}</button>`)
        .join('')}</div>`;
    }
    const nm = sel.m == null ? `${s.n}${LL[s.l]}` : `${s.n}${s.ranges[sel.m].name}`;
    const radial = s.n - s.l - 1;
    html += `<div class="wrap glass cap"><b style="color:${SUB_COL[s.l]}">${nm}</b>&nbsp;· tvar: ${SHAPES[s.l]} · uzly – radiální: ${radial}, úhlové: ${s.l}${sel.m != null ? ' · <span style="color:#ff9b54">●</span> ψ &gt; 0 <span style="color:#47c4ff">●</span> ψ &lt; 0' : ''}</div>`;
  }
  chipsEl.innerHTML = html;
}
chipsEl.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !atom?.clouds) return;
  const c = atom.clouds;
  if (b.dataset.a === 'val') { c.subs.forEach((s) => (s.on = s.valence)); c.sel = { sub: null, m: null }; }
  else if (b.dataset.a === 'all') { c.subs.forEach((s) => (s.on = true)); c.sel = { sub: null, m: null }; }
  else if (b.dataset.m) c.sel.m = b.dataset.m === 'all' ? null : +b.dataset.m;
  else {
    const i = +b.dataset.i;
    c.sel = c.sel.sub === i ? { sub: null, m: null } : { sub: i, m: null };
    if (!state.nucZoom) flyTo(...atomCamera(atom), 1.0);
  }
  if (b.dataset.a && !state.nucZoom) flyTo(...atomCamera(atom), 1.0);
  c.solo = null;
  renderChips();
  sfx.tick();
});
chipsEl.addEventListener('mouseover', (e) => {
  const b = e.target.closest('button[data-i]');
  if (!atom?.clouds || isTouch || atom.clouds.sel.sub != null) return;
  atom.clouds.solo = b ? +b.dataset.i : null;
});
chipsEl.addEventListener('mouseleave', () => { if (atom?.clouds) atom.clouds.solo = null; });

/* ---------- štítky v prostoru ---------- */
const labelPool = [];
const _v = new THREE.Vector3();
function updateLabels() {
  let used = 0;
  const put = (pos, html, cls, op = 1) => {
    _v.copy(pos).project(camera);
    if (_v.z > 1) return;
    let d = labelPool[used];
    if (!d) { d = document.createElement('div'); labelsEl.appendChild(d); labelPool.push(d); }
    used++;
    d.className = cls || '';
    if (d._h !== html) { d.innerHTML = html; d._h = html; }
    d.style.left = `${Math.min(innerWidth - 44, Math.max(44, (_v.x * 0.5 + 0.5) * innerWidth))}px`;
    d.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight}px`;
    d.style.opacity = op;
    d.style.display = '';
  };
  const a = atom;
  if (a && state.view === 'atom' && a.appear > 0.95) {
    const bohr = 1 - a.mix;
    if (bohr > 0.5 && !state.nucZoom) {
      for (const s of a.shells) {
        // štítek na pravém horním okraji dráhy
        let best = null, bestScore = -Infinity;
        for (let i = 0; i < 24; i++) {
          const ang = (i / 24) * Math.PI * 2;
          const p = s.tilt.localToWorld(new THREE.Vector3(Math.cos(ang) * s.R, 0, Math.sin(ang) * s.R));
          _v.copy(p).project(camera);
          const score = _v.x - 0.35 * _v.y;
          if (score > bestScore) { bestScore = score; best = p; }
        }
        put(best, `${SHELLS[s.k - 1]} · ${s.count}e⁻`, '', 0.9);
      }
    }
    const nucTop = new THREE.Vector3(0, a.Rn * a.ns + 0.35, 0);
    a.root.localToWorld(nucTop);
    if (state.realScale) put(new THREE.Vector3(0, 0.45, 0), '◎ jádro (skutečná velikost)', 'nuc');
    else if (bohr > 0.5 && !state.nucZoom) put(nucTop, `${a.el.z} p⁺ · ${a.el.N} n⁰`, 'nuc');
  }
  for (let i = used; i < labelPool.length; i++) labelPool[i].style.display = 'none';
}

/* =====================================================================
   Klávesnice
   ===================================================================== */
addEventListener('keydown', (e) => {
  if (e.target === search) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (state.view === 'table') {
    const L = { 1: 'table', 2: 'bars', 3: 'spiral', 4: 'cylinder', 5: 'sphere' }[k];
    if (L) setLayout(L);
    if (k === '/') { e.preventDefault(); search.focus(); }
    return;
  }
  if (k === 'escape') goBack();
  else if (k === 'arrowright') { stopTour(); step(1); }
  else if (k === 'arrowleft') { stopTour(); step(-1); }
  else if (k === 'b') setModel('bohr');
  else if (k === 'o') setModel('cloud');
  else if (k === ' ') { e.preventDefault(); excite(); }
  else if (k === 'j') toggleNucleusZoom();
  else if (k === 'm') toggleRealScale();
  else if (k === 'p') (state.tour ? stopTour() : startTour());
});

/* =====================================================================
   Snímek po snímku
   ===================================================================== */
const _white = new THREE.Color(1, 1, 1);
const _c = new THREE.Color();
const _mat = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function updateTiles(dt) {
  const ta = tableAnim;
  const kk = 1 - Math.exp(-dt * 3.5);
  ta.tilt += (ta.tiltTarget - ta.tilt) * kk;
  ta.y += (ta.yTarget - ta.y) * kk;
  ta.scale += (ta.scaleTarget - ta.scale) * (1 - Math.exp(-dt * (ta.scaleTarget > 1 ? 2.2 : 4)));
  ta.fade += (ta.fadeTarget - ta.fade) * (1 - Math.exp(-dt * (ta.fadeTarget ? 3 : 5)));
  tableGroup.rotation.x = ta.tilt;
  tableGroup.position.y = ta.y;
  tableGroup.scale.setScalar(ta.scale);
  tableGroup.visible = ta.fade > 0.01;
  if (!tableGroup.visible) return;
  const phaseMode = state.colorMode === 'phase';
  const all = tiles.length + extras.length;
  for (let i = 0; i < all; i++) {
    const t = i < tiles.length ? tiles[i] : extras[i - tiles.length];
    if (t.anim) {
      const k = clamp01((time - t.anim.t0) / t.anim.dur);
      if (k > 0) {
        const e = easeInOut(k);
        t.g.position.lerpVectors(t.anim.p0, t.anim.p1, e);
        t.g.quaternion.slerpQuaternions(t.anim.q0, t.anim.q1, e);
        t.depth = lerp(t.anim.d0, t.anim.d1, e);
      }
      if (k >= 1) t.anim = null;
    }
    t.body.scale.z = t.depth;
    t.label.position.z = t.depth + 0.004;
    t.hover += ((hoverTile === t ? 1 : 0) - t.hover) * (1 - Math.exp(-dt * 14));
    t.dim += (t.dimTarget - t.dim) * (1 - Math.exp(-dt * 8));
    t.vis += (t.visTarget - t.vis) * (1 - Math.exp(-dt * 6));
    t.tint.lerp(t.target, 1 - Math.exp(-dt * 6));
    let lift = t.hover * 0.45, sway = 0;
    if (phaseMode && t.el) {
      const ph = phaseAt(t.el, state.T);
      if (ph === 'gas') lift += 0.2 + Math.sin(time * 2.2 + t.el.z * 1.7) * 0.18;
      if (ph === 'liquid') sway = Math.sin(time * 1.8 + t.el.z) * 0.07;
    }
    t.inner.position.z = lift;
    t.inner.rotation.z = sway;
    const o = ta.fade * t.dim * t.vis;
    t.g.visible = o > 0.01;
    t.bodyMat.color.copy(t.tint).multiplyScalar(0.16);
    t.bodyMat.emissive.copy(t.tint).multiplyScalar(0.07 + t.hover * 0.25);
    t.bodyMat.opacity = 0.88 * o;
    // hrany svítí stejně jasně bez ohledu na odstín, aby je bloom rozzářil rovnoměrně
    const lum = 0.2126 * t.tint.r + 0.7152 * t.tint.g + 0.0722 * t.tint.b;
    t.edgeMat.color.copy(t.tint).multiplyScalar((0.95 + t.hover * 2.4) / Math.max(0.22, lum));
    t.edgeMat.opacity = 0.9 * o;
    _c.copy(t.tint).lerp(_white, 0.3).multiplyScalar(0.9 + t.hover * 0.35);
    t.labelMat.color.copy(_c);
    t.labelMat.opacity = o;
  }
}

function updateAtomObj(a, dt) {
  a.appear = clamp01(a.appear + (a.leaving ? -dt / 0.55 : dt / 1.1));
  const e = easeOut(a.appear);
  a.root.scale.setScalar(Math.max(0.001, e));
  a.spin = (1 - e) * -3;
  a.root.rotation.y = (1 - e) * -1.5;
  const mixT = state.model === 'cloud' ? 1 : 0;
  a.mix = a.mix < mixT ? Math.min(mixT, a.mix + dt / 0.7) : Math.max(mixT, a.mix - dt / 0.7);
  const nsT = state.realScale ? a.realFactor : lerp(1, 0.3, a.mix);
  a.ns = Math.exp(lerp(Math.log(a.ns), Math.log(nsT), 1 - Math.exp(-dt * (state.realScale ? 1.6 : 4))));
  a.nucleus.scale.setScalar(a.ns);
  a.nucleus.rotation.y += dt * 0.15;
  a.nucleus.rotation.x += dt * 0.05;
  a.glow.material.opacity = 0.55 * (1 - a.mix * 0.6);

  // chvění nukleonů
  const jig = (list, mesh) => {
    for (let i = 0; i < list.length; i++) {
      const { p, ph } = list[i];
      _p.set(p.x + Math.sin(time * 6.1 + ph) * 0.022, p.y + Math.sin(time * 5.3 + ph * 1.3) * 0.022, p.z + Math.cos(time * 6.7 + ph * 0.7) * 0.022);
      _s.setScalar(RN);
      _mat.compose(_p, _q.identity(), _s);
      mesh.setMatrixAt(i, _mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  jig(a.pBase, a.prot);
  jig(a.nBase, a.neut);

  // elektrony na drahách
  const bohr = 1 - a.mix;
  for (const s of a.shells) {
    s.pivot.rotation.y += dt * s.prec;
    const vis = bohr > 0.01;
    s.mesh.visible = s.trail.visible = s.ring.visible = s.halo.visible = vis;
    if (!vis) continue;
    s.ringMat.opacity = 0.38 * bohr * (state.nucZoom ? 0.35 : 1);
    s.trailMat.opacity = bohr;
    s.haloMat.opacity = 0.75 * bohr;
    const arr = s.trail.geometry.attributes.position.array;
    const harr = s.halo.geometry.attributes.position.array;
    for (let i = 0; i < s.count; i++) {
      const tw = s.tw[i];
      if (tw) {
        const k = clamp01((time - tw.t0) / tw.dur);
        s.r[i] = lerp(tw.from, tw.to, easeInOut(k));
        if (k >= 1) s.tw[i] = null;
      }
      const r = s.r[i];
      const th = s.offs[i] + s.omega * time + a.spin;
      _p.set(Math.cos(th) * r, 0, Math.sin(th) * r);
      _s.setScalar(0.12 * bohr);
      _mat.compose(_p, _q.identity(), _s);
      s.mesh.setMatrixAt(i, _mat);
      harr[i * 3] = _p.x; harr[i * 3 + 1] = 0; harr[i * 3 + 2] = _p.z;
      const span = Math.min(1.1, 1.9 / r);
      for (let j = 0; j < s.TR; j++) {
        const a0 = th - (j / s.TR) * span, a1 = th - ((j + 1) / s.TR) * span;
        const o = (i * s.TR + j) * 6;
        arr[o] = Math.cos(a0) * r; arr[o + 1] = 0; arr[o + 2] = Math.sin(a0) * r;
        arr[o + 3] = Math.cos(a1) * r; arr[o + 4] = 0; arr[o + 5] = Math.sin(a1) * r;
      }
    }
    s.mesh.instanceMatrix.needsUpdate = true;
    s.halo.geometry.attributes.position.needsUpdate = true;
    s.trail.geometry.attributes.position.needsUpdate = true;
  }
  for (let i = a.ghosts.length - 1; i >= 0; i--) {
    const g = a.ghosts[i];
    g.m.opacity += (g.target - g.m.opacity) * (1 - Math.exp(-dt * 5));
    if (g.target === 0 && g.m.opacity < 0.01) {
      g.line.removeFromParent();
      g.line.geometry.dispose();
      g.m.dispose();
      a.ghosts.splice(i, 1);
    }
  }

  // oblaka orbitalů
  if (a.clouds) {
    a.clouds.group.rotation.y += dt * 0.07;
    a.clouds.group.visible = a.mix > 0.01;
    const { solo, sel } = a.clouds;
    a.clouds.subs.forEach((s, i) => {
      let tgt;
      if (sel.sub != null) tgt = sel.sub === i ? Math.max(1, 0.8 / s.base) : 0;
      else tgt = s.on ? (solo == null ? 1 : solo === i ? 1.6 : 0.12) : 0;
      s.vis += (tgt - s.vis) * (1 - Math.exp(-dt * 7));
      const single = sel.sub === i && sel.m != null;
      const r = single ? s.ranges[sel.m] : null;
      s.points.geometry.setDrawRange(r ? r.start : 0, r ? r.count : Infinity);
      s.mat.uniforms.uPhase.value = single || state.phaseColors ? 1 : 0;
      s.mat.uniforms.uSize.value = single ? 0.12 : s.valence ? 0.09 : 0.06;
      s.mat.uniforms.uOpacity.value = Math.min(1, s.base * s.vis) * a.mix;
      s.mat.uniforms.uTime.value = time;
      s.points.visible = s.mat.uniforms.uOpacity.value > 0.003;
    });
  }

  for (let i = a.events.length - 1; i >= 0; i--) {
    if (time >= a.events[i].at) {
      const ev = a.events.splice(i, 1)[0];
      ev.fn();
    }
  }
}

function updateViewShift(dt) {
  let tx = 0, ty = 0;
  if (state.view === 'atom' && panel.classList.contains('open')) {
    const r = panel.getBoundingClientRect();
    if (innerWidth > 860) tx = (r.width + 14) / 2;
    else ty = Math.max(0, innerHeight - r.top) / 2;
  } else if (state.view === 'table') {
    const { top, bottom } = uiInsets();
    ty = (bottom - top) / 2;
  }
  const k = 1 - Math.exp(-dt * 4);
  viewShift.x += (tx - viewShift.x) * k;
  viewShift.y += (ty - viewShift.y) * k;
  if (Math.abs(viewShift.x) < 0.5 && Math.abs(viewShift.y) < 0.5) {
    if (camera.view?.enabled) camera.clearViewOffset();
  } else camera.setViewOffset(innerWidth, innerHeight, viewShift.x, viewShift.y, innerWidth, innerHeight);
}

let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  if (camTween) {
    const k = clamp01((time - camTween.start) / camTween.dur);
    const e = easeInOut(k);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (k >= 1) camTween = null;
  }
  controls.update();
  updateViewShift(dt);

  updateTiles(dt);
  if (atom) updateAtomObj(atom, dt);
  for (let i = dying.length - 1; i >= 0; i--) {
    updateAtomObj(dying[i], dt);
    if (dying[i].appear <= 0) { disposeAtom(dying[i]); dying.splice(i, 1); }
  }
  updatePhotons(dt);
  updateHover();
  updateLabels();

  sky.material.uniforms.uTime.value = time;
  stars.material.uniforms.uTime.value = time;
  stars.rotation.y = time * 0.004;
  composer.render();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  viewUniform.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  if (state.view === 'table' && !camTween) flyTo(...layoutCamera(state.layout), 0.6);
}
addEventListener('resize', resize);

/* =====================================================================
   Start
   ===================================================================== */
async function start() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`700 100px ${FONT}`), document.fonts.load(`500 30px ${FONT}`), document.fonts.load(`600 36px ${FONT}`)]),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
  } catch (e) { /* písmo není nutné */ }
  // dlaždice se kreslily už při načtení modulu; s načteným písmem je překreslíme
  for (const t of [...tiles, ...extras]) {
    const el = t.el;
    const lbl = el ? { z: true, top: el.z, topRight: el.massTxt, main: el.s, bottom: el.n } : t === extras[0] ? { main: '57–71', bottom: 'lanthanoidy' } : { main: '89–103', bottom: 'aktinoidy' };
    t.labelMat.map.dispose();
    t.labelMat.map = drawLabel(lbl);
  }
  resize();
  applyColors();
  renderLegend();
  setTemp(298);
  const initial = bySymbol[decodeURIComponent(location.hash.slice(1))];
  setLayout('table', { intro: !initial });
  renderer.setAnimationLoop(frame);
  if (initial) {
    for (const t of [...tiles, ...extras]) {
      if (t.anim) { t.g.position.copy(t.anim.p1); t.g.quaternion.copy(t.anim.q1); t.depth = t.anim.d1; t.anim = null; }
    }
    showAtom(initial);
  }
  const loader = $('#loader');
  loader.style.opacity = 0;
  setTimeout(() => loader.remove(), 1000);
  setTimeout(() => { $('#hint').style.opacity = 0; }, 9000);
}
start();
