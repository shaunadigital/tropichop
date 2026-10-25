/* TropiChop */
(() => {
'use strict';

// ---------- Config ----------
const UNLOCK_SCORE = 250;
const START_LIVES = 3;

const FRUITS = {
  lilikoi:     { scale: .85, hr: .43, oy: 0,   pts: 1, hits: 1, w: 16, juice: '#f6a21a', bits: ['#1a1208', '#f5b833', '#1a1208'] },
  guava:       { scale: .90, hr: .45, oy: 0,   pts: 1, hits: 1, w: 15, juice: '#ff6f6a', bits: ['#f6d9b6', '#ff8f86'] },
  lychee:      { scale: .80, hr: .45, oy: 0,   pts: 1, hits: 1, w: 15, juice: '#f7f1e6', bits: ['#5a1a0a', '#fff8ee'] },
  mango:       { scale: 1.0, hr: .40, oy: 0,   pts: 1, hits: 1, w: 14, juice: '#ff9a1a', bits: ['#ffb43a', '#ff8a10'] },
  dragonfruit: { scale: 1.05,hr: .37, oy: .02, pts: 1, hits: 1, w: 12, juice: '#e0157a', bits: ['#111', '#111', '#ff3d9a'] },
  pineapple:   { scale: 1.35,hr: .27, oy: .17, pts: 2, hits: 2, w: 10, juice: '#ffd23a', bits: ['#ffe680', '#ffc61a'] },
  coconut:     { scale: 1.08,hr: .46, oy: 0,   pts: 3, hits: 3, w: 6,  juice: '#e8f2ee', bits: ['#fbfaf4', '#6b3a17', '#d8ece6'] },
  starfruit:   { scale: 1.10,hr: .32, oy: 0,   pts: 5, hits: 1, w: 3,  juice: '#ffe066', bits: ['#fff1a8', '#ffd84a'], lucky: true },
};
const HAZARDS = {
  wana:    { scale: .95, hr: .40, oy: 0, minScore: 3,  p: .18, text: 'Ouch!', bits: ['#2a0f3a', '#7a2fb0', '#1a0a22'] },
  slippah: { scale: 1.15,hr: .26, oy: 0, minScore: 15, p: .12, text: 'Smack!',      bits: ['#1e7fd8', '#e9f2ff'] },
};

// ---------- Storage (safe) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('tropichop.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tropichop.' + k, JSON.stringify(v)); } catch {} },
};
let best = store.get('best', 0);
let unlocked = store.get('unlocked', ['koa']);
let bgChoice = store.get('bg', 'koa');
let soundOn = store.get('sound', true);
if (!unlocked.includes(bgChoice)) bgChoice = 'koa';

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const ui = {
  hud: $('hud'), score: $('score'), bestHud: $('bestHud'), lives: $('lives'), pauseBtn: $('pauseBtn'),
  load: $('loadScreen'), menu: $('menu'), paused: $('paused'), over: $('over'), toast: $('toast'),
  bgpick: $('bgpick'), bestMenu: $('bestMenu'), soundBtn: $('soundBtn'),
  finalScore: $('finalScore'), newBest: $('newBest'), bestOver: $('bestOver'),
};

// ---------- Images ----------
const IMG = {};
function loadImg(name) {
  return new Promise(res => { const i = new Image(); i.onload = () => { IMG[name] = i; res(); }; i.onerror = () => res(); i.src = `img/${name}.webp`; });
}
const imgNames = [];
for (const k in FRUITS) imgNames.push(k, k + '-in');
imgNames.push('wana', 'slippah', 'hibiscus', 'starslice', 'bg-koa', 'bg-beach', 'logo');

// ---------- Audio ----------
let AC = null, master = null;
const sfxBuf = {};
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = soundOn ? .8 : 0; master.connect(AC.destination);
    loadSoundFiles();
  } catch { AC = null; }
}
async function loadSoundFiles() {
  // Real recordings listed in sounds/manifest.json replace the synth placeholders.
  // A manifest (instead of probing for each file) avoids a 404 per missing sound on every load.
  try {
    const r = await fetch('sounds/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const list = await r.json();
    await Promise.all(Object.entries(list).map(async ([name, file]) => {
      try { const b = await (await fetch('sounds/' + file)).arrayBuffer(); sfxBuf[name] = await AC.decodeAudioData(b); } catch {}
    }));
  } catch {}
}
function playBuf(name, vol = 1, rate = 1) {
  const b = sfxBuf[name]; if (!b) return false;
  const s = AC.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = AC.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
  return true;
}
let noiseBuf = null;
function noise() {
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; return s;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noiseHit(t, type, freq, q, peak, dec, sweepTo) {
  const n = noise(), f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dec); f.Q.value = q;
  env(g, t, .004, peak, dec); n.connect(f); f.connect(g); g.connect(master); n.start(t, Math.random() * .5); n.stop(t + dec + .05);
}
function tone(t, type, f0, f1, peak, dec) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dec); env(g, t, .005, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + dec + .05);
}
const SFX = {
  slice() { if (playBuf('slice-' + (1 + (Math.random() * 3 | 0)), .9, .95 + Math.random() * .1)) { noiseHit(AC.currentTime, 'bandpass', 3000, 1.5, .18, .05, 1200); return; }
    const t = AC.currentTime; noiseHit(t, 'bandpass', 2400, 1.2, .5, .09, 900); noiseHit(t + .02, 'lowpass', 700, .7, .35, .14); tone(t, 'sine', 220, 90, .25, .1); },
  thunk() { if (playBuf('coconut-thunk', 1, .95 + Math.random() * .1)) return; const t = AC.currentTime; tone(t, 'sine', 210, 110, .6, .14); tone(t, 'triangle', 420, 300, .15, .06); noiseHit(t, 'bandpass', 1800, 3, .2, .03); },
  crack() { playBuf('coconut-splash', .8); if (playBuf('coconut-crack', 1)) return; const t = AC.currentTime; noiseHit(t, 'highpass', 1500, .7, .6, .07); tone(t, 'sine', 160, 60, .5, .2); },
  slap() { if (playBuf('slippah-slap', 1)) return; const t = AC.currentTime; noiseHit(t, 'lowpass', 2600, .8, .9, .07); tone(t, 'sine', 140, 70, .5, .09); },
  wana() { if (playBuf('wana-hit', 1)) return; const t = AC.currentTime; for (let i = 0; i < 7; i++) noiseHit(t + i * .022 + Math.random() * .01, 'bandpass', 2500 + Math.random() * 2500, 4, .4, .03); tone(t, 'square', 220, 110, .08, .2); },
  swoosh() { if (playBuf('swoosh', .5, .9 + Math.random() * .2)) return; const t = AC.currentTime; noiseHit(t, 'bandpass', 600, 2, .12, .16, 2600); },
  combo(n) { const t = AC.currentTime; [0, 4, 7, 12].slice(0, Math.min(4, n - 1)).forEach((s, i) => tone(t + i * .06, 'triangle', 660 * 2 ** (s / 12), 0, .22, .18)); },
  lucky() { const t = AC.currentTime; [0, 7, 12, 16, 19].forEach((s, i) => tone(t + i * .05, 'sine', 880 * 2 ** (s / 12), 0, .2, .25)); },
  lose() { const t = AC.currentTime; tone(t, 'triangle', 440, 220, .3, .35); },
  miss() { const t = AC.currentTime; tone(t, 'sine', 300, 150, .25, .2); },
  over() { const t = AC.currentTime; [523, 392, 262].forEach((f, i) => tone(t + i * .18, 'triangle', f, f * .97, .3, .35)); },
  unlock() { const t = AC.currentTime; [0, 4, 7, 12, 16].forEach((s, i) => tone(t + i * .08, 'triangle', 523 * 2 ** (s / 12), 0, .25, .3)); },
  tap() { const t = AC.currentTime; tone(t, 'sine', 880, 660, .2, .08); },
};
function sfx(name, ...a) { if (!AC || !soundOn) return; try { SFX[name](...a); } catch {} }

// ---------- Canvas sizing ----------
let W = 0, H = 0, DPR = 1, base = 100;
const bgCache = { key: '', play: null, menu: null };
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  base = Math.max(72, Math.min(150, Math.min(W, H) * .17));
  bgCache.key = '';
}
window.addEventListener('resize', resize);
function coverDraw(c, img, w, h) {
  const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
  c.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}
function buildBg() {
  const key = bgChoice + W + 'x' + H + DPR;
  if (bgCache.key === key) return;
  bgCache.key = key;
  const img = IMG['bg-' + bgChoice]; if (!img) return;
  const pw = cv.width, ph = cv.height;
  // menu: full brightness
  const m = document.createElement('canvas'); m.width = pw; m.height = ph; coverDraw(m.getContext('2d'), img, pw, ph);
  // play: soft blur (downscale/upscale) + darkening so the fruit pops.
  // Downscaling instead of ctx.filter = 'blur()' because older Safari ignores ctx.filter.
  const k = bgChoice === 'beach' ? 7 : 4;
  const sm = document.createElement('canvas'); sm.width = Math.max(1, pw / k | 0); sm.height = Math.max(1, ph / k | 0);
  const sc = sm.getContext('2d'); sc.imageSmoothingQuality = 'high'; coverDraw(sc, img, sm.width, sm.height);
  const p = document.createElement('canvas'); p.width = pw; p.height = ph; const pc = p.getContext('2d');
  pc.imageSmoothingQuality = 'high'; pc.drawImage(sm, 0, 0, pw, ph);
  pc.fillStyle = bgChoice === 'beach' ? 'rgba(18,10,30,.42)' : 'rgba(25,10,0,.30)'; pc.fillRect(0, 0, pw, ph);
  const vg = pc.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * .3, pw / 2, ph / 2, Math.max(pw, ph) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); pc.fillStyle = vg; pc.fillRect(0, 0, pw, ph);
  bgCache.menu = m; bgCache.play = p;
}

// ---------- Game state ----------
let state = 'loading'; // loading | menu | play | paused | over
let objs = [], pieces = [], parts = [], splats = [], texts = [], marks = [];
let score = 0, lives = START_LIVES, elapsed = 0, spawnT = 0, shake = 0, flash = 0, flashColor = '255,255,255';
let bgFade = 0; // 0 = menu bg, 1 = play bg
let unlockedThisRun = false;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.random() * arr.length | 0];

function weightedFruit() {
  let tot = 0; for (const k in FRUITS) tot += FRUITS[k].w;
  let r = Math.random() * tot; for (const k in FRUITS) { r -= FRUITS[k].w; if (r <= 0) return k; } return 'mango';
}
function gravity() { return H * 1.45 * (1 + Math.min(.35, elapsed / 160)); }

function spawnObj(kind, delay = 0) {
  const isHaz = kind in HAZARDS, cfg = isHaz ? HAZARDS[kind] : FRUITS[kind];
  const size = base * cfg.scale;
  const x = rand(W * .14, W * .86), y = H + size * .7;
  const g = gravity(), peakY = rand(H * .1, H * .42);
  const vy = -Math.sqrt(2 * g * (y - peakY));
  const tFlight = 2 * -vy / g;
  const tx = rand(W * .2, W * .8);
  objs.push({ kind, isHaz, cfg, size, x, y, vx: (tx - x) / tFlight, vy, rot: rand(-.5, .5), vr: rand(-2.2, 2.2),
    hits: 0, delay, entered: false, cool: 0, wasInside: false, wob: 0 });
}
function spawnWave() {
  const t = elapsed;
  const maxN = Math.min(7, 2 + Math.floor(t / 15));
  let n = 1 + Math.floor(Math.sqrt(Math.random()) * maxN); // leans toward bigger waves
  const burst = t > 15 && Math.random() < .25;
  if (burst) n = Math.min(7, n + 2);
  let hazards = 0;
  const maxHaz = t > 40 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const delay = burst ? i * .12 : i * rand(.05, .3);
    let kind = null;
    if (hazards < maxHaz && (n > 1 || t > 8)) {
      for (const h in HAZARDS) if (!kind && score >= HAZARDS[h].minScore && Math.random() < HAZARDS[h].p) kind = h;
    }
    if (kind) hazards++; else kind = weightedFruit();
    spawnObj(kind, delay);
  }
  spawnT = Math.max(.7, 1.7 - t * .011) + (burst ? .5 : 0);
}

// ---------- Effects ----------
function burst(x, y, color, n, speed, sizeR, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = (opts.dir ?? 0) + (opts.spread ? rand(-opts.spread, opts.spread) : rand(0, Math.PI * 2));
    const s = rand(.3, 1) * speed;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), r: rand(sizeR * .4, sizeR), color,
      life: rand(.5, 1) * (opts.life || .9), age: 0, g: opts.g ?? 1, shape: opts.shape || 'dot', rot: rand(0, 6), vr: rand(-8, 8) });
  }
}
function splat(x, y, color, size) {
  const blobs = []; const n = 6 + (Math.random() * 5 | 0);
  for (let i = 0; i < n; i++) { const a = rand(0, 6.28), d = rand(0, size * .55); blobs.push([Math.cos(a) * d, Math.sin(a) * d, rand(size * .12, size * .32)]); }
  splats.push({ x, y, color, blobs, age: 0, life: 2.6 });
}
function popText(x, y, str, color = '#ffd84a', sz = 30) { texts.push({ x, y, str, color, sz, age: 0, life: 1.1 }); }

function sliceFruit(o, ang, sx, sy) {
  const cfg = o.cfg;
  o.hits++;
  if (o.hits < cfg.hits) {
    // tough fruit: knock it, crack flecks, keep it whole
    sfx('thunk');
    o.vx += Math.cos(ang) * base * 1.6; o.vy = Math.min(o.vy, 0) - base * 1.2; o.vr += rand(-4, 4); o.wob = 1;
    burst(o.x, o.y, o.kind === 'coconut' ? '#7a4520' : '#c98a1a', 8, base * 4, base * .05, { g: 1.2, life: .6 });
    popText(o.x, o.y - o.size * .5, o.kind === 'coconut' ? (o.hits === 1 ? 'Thunk!' : 'Almost!') : 'Again!', '#fff', 24);
    shake = Math.max(shake, 4);
    return 0;
  }
  o.dead = true;
  if (o.kind === 'coconut') sfx('crack'); else sfx('slice');
  const img = IMG[o.kind + '-in'] || IMG[o.kind];
  const nx = -Math.sin(ang), ny = Math.cos(ang), push = base * 1.5;
  for (const side of [1, -1]) {
    pieces.push({ img, x: o.x + nx * side * 3, y: o.y + ny * side * 3, vx: o.vx * .6 + nx * side * push + Math.cos(ang) * base * .6,
      vy: o.vy * .4 + ny * side * push - base * .8, rot: o.rot, vr: o.vr + side * rand(1.5, 3.5),
      cut: ang - o.rot, side, size: o.size, age: 0, haz: false });
  }
  const bits = cfg.bits;
  burst(o.x, o.y, cfg.juice, 18, base * 6, base * .07, { g: 1 });
  for (const c of bits) burst(o.x, o.y, c, 6, base * 5.5, base * .055, { g: 1.1, shape: 'seed' });
  if (o.kind === 'coconut') burst(o.x, o.y, 'rgba(220,240,235,.85)', 22, base * 7, base * .08, { up: base * 2, g: 1.1 });
  if (cfg.lucky) {
    for (let i = 0; i < 5; i++) parts.push({ x: o.x, y: o.y, vx: rand(-1, 1) * base * 4, vy: rand(-1.2, -.3) * base * 5, r: base * rand(.22, .3),
      color: '', life: 1.4, age: 0, g: 1, shape: 'star', rot: rand(0, 6), vr: rand(-6, 6) });
    burst(o.x, o.y, '#fff7c2', 24, base * 8, base * .05, { g: .3, life: .7 });
    sfx('lucky');
    popText(o.x, o.y - o.size * .4, `Lucky! +${cfg.pts}`, '#ffe066', 34);
  } else if (cfg.pts > 1) popText(o.x, o.y - o.size * .4, `+${cfg.pts}`, '#fff', 28);
  splat(o.x, o.y, cfg.juice, o.size * 1.2);
  return cfg.pts;
}
function hitHazard(o, ang) {
  o.dead = true;
  const cfg = o.cfg;
  sfx(o.kind === 'wana' ? 'wana' : 'slap'); sfx('lose');
  shake = 18; flash = 1; flashColor = o.kind === 'wana' ? '150,60,220' : '40,140,255';
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of [1, -1]) pieces.push({ img: IMG[o.kind], x: o.x, y: o.y, vx: o.vx * .5 + nx * side * base * 1.2, vy: o.vy * .3 + ny * side * base * 1.2 - base,
    rot: o.rot, vr: o.vr + side * 3, cut: ang - o.rot, side, size: o.size, age: 0, haz: true });
  for (const c of cfg.bits) burst(o.x, o.y, c, o.kind === 'wana' ? 22 : 10, base * 7, base * .05, { shape: o.kind === 'wana' ? 'spine' : 'dot', g: .9 });
  popText(o.x, Math.max(80, o.y - o.size * .5), cfg.text, '#ff6a5a', 36);
  loseLife();
}
function loseLife() {
  // Guard: a hazard hit and a dropped fruit can land in the same frame, and fruit keep falling
  // during the short delay before game over. Without this, lives went to -1 (seen in play-test).
  if (lives <= 0 || state !== 'play') return;
  lives--; renderLives();
  if (lives <= 0) setTimeout(gameOver, 650);
}

// ---------- Blade input ----------
const trail = []; // {x,y,t}
let pointerDown = false, pointerType = 'mouse', lastPt = null, lastSwoosh = 0, stroke = { id: 0, count: 0, t: 0, x: 0, y: 0 };
function now() { return performance.now(); }
function addPoint(x, y) {
  const t = now();
  if (lastPt) {
    const dx = x - lastPt.x, dy = y - lastPt.y, dist = Math.hypot(dx, dy), dt = Math.max(1, t - lastPt.t);
    const speed = dist / dt * 1000; // px/s
    if (state === 'play' && speed > 420 && dist > 2) {
      checkSlice(lastPt.x, lastPt.y, x, y);
      if (speed > 1200 && t - lastSwoosh > 220) { lastSwoosh = t; sfx('swoosh'); }
    }
  }
  lastPt = { x, y, t };
  trail.push({ x, y, t });
}
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  let u = l2 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0; u = Math.max(0, Math.min(1, u));
  const px = x1 + u * dx - cx, py = y1 + u * dy - cy; return px * px + py * py <= r * r;
}
function checkSlice(x1, y1, x2, y2) {
  const ang = Math.atan2(y2 - y1, x2 - x1), t = now();
  let gained = 0, sliced = 0;
  for (const o of objs) {
    if (o.dead || o.delay > 0) continue;
    const c = Math.cos(o.rot), s = Math.sin(o.rot), off = o.cfg.oy * o.size;
    const cx = o.x - s * off, cy = o.y + c * off;
    const r = o.size * o.cfg.hr * (o.isHaz ? .95 : 1.0);
    const startInside = (x1 - cx) ** 2 + (y1 - cy) ** 2 < r * r;
    if (!segCircle(x1, y1, x2, y2, cx, cy, r)) { o.wasInside = false; continue; }
    // A hit counts only when the blade enters the object. One swipe across a tough fruit (coconut,
    // pineapple) must count once, so the blade has to leave and come back for the next hit.
    if (startInside && o.wasInside) continue;
    o.wasInside = true;
    if (t < o.cool) continue;
    o.cool = t + 140;
    if (o.isHaz) { hitHazard(o, ang); continue; }
    const p = sliceFruit(o, ang, x2, y2);
    if (o.dead) { gained += p; sliced++; }
  }
  if (sliced) {
    if (t - stroke.t > 280) { stroke.count = 0; }
    stroke.count += sliced; stroke.t = t; stroke.x = x2; stroke.y = y2;
    addScore(gained);
    if (stroke.count >= 3) comboPending = { n: stroke.count, x: x2, y: y2, t };
  }
}
let comboPending = null;
function settleCombo() {
  if (!comboPending || now() - comboPending.t < 260) return;
  const { n, x, y } = comboPending; comboPending = null; stroke.count = 0;
  addScore(n);
  popText(x, Math.max(90, y - 40), `${n} Fruit Combo! +${n}`, '#7dff9a', 30);
  sfx('combo', n);
}
function addScore(n) {
  if (!n) return;
  score += n; ui.score.textContent = score;
  if (score >= UNLOCK_SCORE && !unlocked.includes('beach')) {
    unlocked.push('beach'); store.set('unlocked', unlocked); unlockedThisRun = true;
    showToast(); sfx('unlock');
  }
}
function canvasPt(e) { return [e.clientX, e.clientY]; }
cv.addEventListener('pointerdown', e => {
  pointerDown = true; pointerType = e.pointerType; lastPt = null; trail.length = 0;
  try { cv.setPointerCapture(e.pointerId); } catch {}
  const [x, y] = canvasPt(e); addPoint(x, y);
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' && !pointerDown) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) { const [x, y] = canvasPt(ev); addPoint(x, y); }
});
const endPtr = () => { pointerDown = false; if (pointerType !== 'mouse') lastPt = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { if (pointerType === 'mouse') lastPt = null; });

// ---------- Update ----------
function update(dt) {
  if (state === 'play') {
    elapsed += dt;
    spawnT -= dt; if (spawnT <= 0 && objs.length < 9) spawnWave();
  }
  const g = gravity();
  for (const o of objs) {
    if (o.delay > 0) { o.delay -= dt; continue; }
    o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; o.wob = Math.max(0, o.wob - dt * 4);
    if (o.y < H) o.entered = true;
    if (o.x < o.size * .4 && o.vx < 0) o.vx *= -.6;
    if (o.x > W - o.size * .4 && o.vx > 0) o.vx *= -.6;
    if (o.entered && o.vy > 0 && o.y - o.size * .6 > H) {
      o.dead = true;
      if (!o.isHaz && state === 'play') { marks.push({ x: Math.max(30, Math.min(W - 30, o.x)), age: 0 }); sfx('miss'); loseLife(); }
    }
  }
  objs = objs.filter(o => !o.dead);
  for (const p of pieces) { p.age += dt; p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
  pieces = pieces.filter(p => p.y - p.size < H + 40 && p.age < 6);
  for (const p of parts) { p.age += dt; p.vy += g * p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .99; p.rot += p.vr * dt; }
  parts = parts.filter(p => p.age < p.life && p.y < H + 50);
  if (parts.length > 500) parts.splice(0, parts.length - 500);
  for (const s of splats) s.age += dt; splats = splats.filter(s => s.age < s.life);
  for (const t of texts) { t.age += dt; t.y -= 40 * dt; } texts = texts.filter(t => t.age < t.life);
  for (const m of marks) m.age += dt; marks = marks.filter(m => m.age < 1.2);
  shake = Math.max(0, shake - dt * 40); flash = Math.max(0, flash - dt * 2.5);
  const tn = now(); while (trail.length && tn - trail[0].t > 130) trail.shift();
  bgFade += ((state === 'play' || state === 'paused' || state === 'over') ? 1 : -1) * dt * 2.5; bgFade = Math.max(0, Math.min(1, bgFade));
  settleCombo();
}

// ---------- Draw ----------
function drawObj(o) {
  const img = IMG[o.kind]; if (!img) return;
  const k = o.size / 420, w = img.width * k, h = img.height * k;
  const sq = 1 + Math.sin(o.wob * 20) * o.wob * .08;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.scale(sq, 2 - sq);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  if (o.cfg.hits > 1 && o.hits > 0) { // crack lines on tough fruit
    ctx.strokeStyle = 'rgba(40,15,0,.75)'; ctx.lineWidth = Math.max(1.5, o.size * .018); ctx.lineCap = 'round';
    ctx.beginPath(); const r = o.size * .3;
    ctx.moveTo(-r * .2, -r); ctx.lineTo(r * .1, -r * .4); ctx.lineTo(-r * .15, 0); ctx.lineTo(r * .2, r * .45);
    if (o.hits > 1) { ctx.moveTo(r * .1, -r * .4); ctx.lineTo(r * .6, -r * .2); ctx.moveTo(-r * .15, 0); ctx.lineTo(-r * .6, r * .2); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawPiece(p) {
  const img = p.img; if (!img) return;
  const k = p.size / 420, w = img.width * k, h = img.height * k, B = Math.max(w, h);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
  ctx.save(); ctx.rotate(p.cut); ctx.beginPath(); ctx.rect(-B, p.side > 0 ? 0 : -B, 2 * B, B); ctx.rotate(-p.cut); ctx.clip();
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  ctx.restore();
}
function drawStar(x, y, r, rot) {
  const img = IMG.starslice; if (!img) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -r, -r * img.height / img.width, 2 * r, 2 * r * img.height / img.width); ctx.restore();
}
function drawTrail() {
  if (trail.length < 2) return;
  const tn = now();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], life = 1 - (tn - b.t) / 130; if (life <= 0) continue;
      const f = i / trail.length;
      ctx.strokeStyle = pass ? `rgba(255,255,255,${.95 * life})` : `rgba(255,200,70,${.45 * life})`;
      ctx.lineWidth = (pass ? 4 : 13) * f * life + 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
}
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildBg();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bgCache.menu) {
    ctx.globalAlpha = 1; ctx.drawImage(bgCache.menu, 0, 0);
    if (bgFade > 0) { ctx.globalAlpha = bgFade; ctx.drawImage(bgCache.play, 0, 0); }
  } else { ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
  // juice stains
  for (const s of splats) {
    const a = Math.min(1, (s.life - s.age) / 1.2) * .42; ctx.globalAlpha = a; ctx.fillStyle = s.color;
    for (const [bx, by, br] of s.blobs) { ctx.beginPath(); ctx.arc(s.x + bx, s.y + by, br, 0, 6.283); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const p of pieces) drawPiece(p);
  for (const o of objs) if (o.delay <= 0) drawObj(o);
  for (const p of parts) {
    const a = Math.min(1, (p.life - p.age) / (p.life * .5)); ctx.globalAlpha = a;
    if (p.shape === 'star') { drawStar(p.x, p.y, p.r, p.rot); continue; }
    ctx.fillStyle = p.color;
    if (p.shape === 'seed') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .6, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
    else if (p.shape === 'spine') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-p.r * 2.5, -p.r * .35, p.r * 5, p.r * .7); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // missed-fruit markers
  for (const m of marks) {
    const a = 1 - m.age / 1.2, y = H - 40 - m.age * 20, r = 14;
    ctx.globalAlpha = a; ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(m.x - r, y - r); ctx.lineTo(m.x + r, y + r); ctx.moveTo(m.x + r, y - r); ctx.lineTo(m.x - r, y + r); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // floating text
  for (const t of texts) {
    const a = Math.min(1, (t.life - t.age) / .4), sc = 1 + Math.max(0, .25 - t.age) * 2;
    ctx.globalAlpha = a; ctx.font = `${t.sz * sc}px 'Lilita One', sans-serif`;
    let tw = ctx.measureText(t.str).width;
    if (tw > W - 24) { ctx.font = `${t.sz * sc * (W - 24) / tw}px 'Lilita One', sans-serif`; tw = W - 24; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(50,20,0,.9)'; ctx.lineJoin = 'round';
    const x = Math.min(W - tw / 2 - 12, Math.max(tw / 2 + 12, t.x));
    ctx.strokeText(t.str, x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.str, x, t.y);
  }
  ctx.globalAlpha = 1;
  drawTrail();
  if (flash > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(${flashColor},${flash * .35})`; ctx.fillRect(0, 0, cv.width, cv.height); }
}

let lastT = 0;
function frame(t) {
  const dt = Math.min(.033, (t - lastT) / 1000 || 0); lastT = t;
  if (state !== 'paused') update(dt);
  draw();
  requestAnimationFrame(frame);
}

// ---------- Screens ----------
function show(id) { for (const k of ['load', 'menu', 'paused', 'over']) ui[k].classList.toggle('on', k === id); }
function renderLives() {
  ui.lives.innerHTML = '';
  for (let i = 0; i < START_LIVES; i++) { const im = document.createElement('img'); im.src = 'img/hibiscus.webp'; im.alt = ''; if (i >= lives) im.className = 'lost'; ui.lives.appendChild(im); }
  ui.lives.setAttribute('aria-label', `${Math.max(0, lives)} lives left`);
}
function renderMenu() {
  ui.bestMenu.textContent = best ? `Best: ${best}` : '';
  ui.soundBtn.textContent = `Sound: ${soundOn ? 'On' : 'Off'}`;
  ui.bgpick.innerHTML = '';
  for (const [id, label] of [['koa', 'Koa Board'], ['beach', 'Beach Sunset']]) {
    const locked = !unlocked.includes(id);
    const b = document.createElement('button');
    b.className = 'bgopt' + (bgChoice === id ? ' sel' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<img src="img/bg-${id}.webp" alt=""><span>${label}</span>` + (locked ? `<div class="lock">Score ${UNLOCK_SCORE}<br>to unlock</div>` : '');
    b.setAttribute('aria-label', label + (locked ? `, locked. Score ${UNLOCK_SCORE} in one round to unlock.` : ''));
    b.onclick = () => { if (locked) return; audioInit(); sfx('tap'); bgChoice = id; store.set('bg', id); bgCache.key = ''; renderMenu(); };
    ui.bgpick.appendChild(b);
  }
}
function toMenu() {
  state = 'menu'; objs = []; ui.hud.classList.remove('on'); ui.pauseBtn.classList.remove('on'); renderMenu(); show('menu');
}
function startGame() {
  audioInit(); sfx('tap');
  objs = []; pieces = []; parts = []; splats = []; texts = []; marks = [];
  score = 0; lives = START_LIVES; elapsed = 0; spawnT = .6; stroke.count = 0; comboPending = null; unlockedThisRun = false;
  ui.score.textContent = '0'; ui.bestHud.textContent = best ? `Best ${best}` : ''; renderLives();
  ui.hud.classList.add('on'); ui.pauseBtn.classList.add('on');
  state = 'play'; show(null);
}
function gameOver() {
  if (state !== 'play') return;
  state = 'over'; sfx('over');
  const isBest = score > best; if (isBest) { best = score; store.set('best', best); }
  ui.finalScore.textContent = score;
  ui.newBest.textContent = isBest && score > 0 ? 'New best!' : (unlockedThisRun ? 'Beach Sunset unlocked!' : '');
  ui.bestOver.textContent = `Best: ${best}`;
  ui.pauseBtn.classList.remove('on');
  setTimeout(() => show('over'), 250);
}
function pause() { if (state !== 'play') return; state = 'paused'; show('paused'); }
function resume() { if (state !== 'paused') return; state = 'play'; lastPt = null; show(null); }
let toastTimer;
function showToast() { ui.toast.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('on'), 3200); }

$('playBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('menuBtn').onclick = () => { sfx('tap'); toMenu(); };
$('resumeBtn').onclick = () => { sfx('tap'); resume(); };
$('quitBtn').onclick = () => { sfx('tap'); toMenu(); };
ui.pauseBtn.onclick = pause;
ui.soundBtn.onclick = () => { soundOn = !soundOn; store.set('sound', soundOn); audioInit(); if (master) master.gain.value = soundOn ? .8 : 0; sfx('tap'); renderMenu(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);
window.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'p') state === 'play' ? pause() : resume(); });

// ---------- Boot ----------
resize();
requestAnimationFrame(frame);
Promise.all(imgNames.map(loadImg)).then(() => { bgCache.key = ''; toMenu(); });

// test hook (used by automated play-tests only)
window.__tropichop = { get state() { return state; }, get objs() { return objs; }, get score() { return score; }, get lives() { return lives; },
  start: startGame, spawn: spawnObj };
})();
