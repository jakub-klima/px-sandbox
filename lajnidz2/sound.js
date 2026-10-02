'use strict';
/* Zvuky a hudba pro Lajnidž II – vše syntetizované přes Web Audio API, žádné soubory.
   Snd.play('jméno') přehraje efekt, Snd.setZone(id) přepne náladu hudby. */
window.Snd = (() => {
  const KEY = 'lajnidz2-sound';
  const cfg = { sfx: true, music: true };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* výchozí nastavení */ }

  let ac = null, out = null, sfxG = null, musG = null, noiseBuf = null;
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    out = ac.createDynamicsCompressor();
    out.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.gain.value = cfg.sfx ? .55 : 0; sfxG.connect(out);
    musG = ac.createGain(); musG.gain.value = cfg.music ? .2 : 0; musG.connect(out);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setInterval(schedule, 100);
    if (mood) { nextT = ac.currentTime + .1; step = 0; }
  }

  // ---------- stavební kameny ----------
  function env(g, t, a, d, v) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
  }
  function tone(f, d, o = {}) {
    const t = o.t != null ? o.t : ac.currentTime + (o.at || 0);
    const a = o.a || .005;
    const osc = ac.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + a + d);
    if (o.detune) osc.detune.value = o.detune;
    const g = ac.createGain();
    env(g, t, a, d, o.v || .3);
    let node = osc;
    if (o.lp) {
      const f2 = ac.createBiquadFilter();
      f2.type = 'lowpass'; f2.frequency.value = o.lp;
      osc.connect(f2); node = f2;
    }
    node.connect(g); g.connect(o.dest || sfxG);
    osc.start(t); osc.stop(t + a + d + .05);
  }
  function noise(d, o = {}) {
    const t = o.t != null ? o.t : ac.currentTime + (o.at || 0);
    const a = o.a || .003;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + a + d);
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    env(g, t, a, d, o.v || .3);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxG);
    src.start(t, Math.random() * .5); src.stop(t + a + d + .05);
  }
  const arp = (notes, gap, o) => notes.forEach((f, i) => tone(f, o.d || .3, { ...o, at: (o.at || 0) + i * gap }));
  const sparkle = (n, at = 0, v = .05) => { for (let i = 0; i < n; i++) tone(2000 + Math.random() * 3000, .08, { at: at + i * .04, v }); };

  // ---------- efekty ----------
  const FX = {
    // soulshot: krátké jiskřivé „šššing"
    ss: () => { tone(2600, .16, { to: 4400, v: .05 }); tone(3900, .1, { at: .03, to: 5400, v: .035 }); noise(.1, { ft: 'highpass', f: 6000, v: .06 }); },
    hit: () => { noise(.08, { f: 1800, fto: 300, v: .3 }); tone(120, .08, { type: 'square', to: 60, v: .1 }); },
    crit: () => { FX.hit(); tone(900, .14, { type: 'sawtooth', to: 450, v: .1, lp: 3000 }); noise(.16, { ft: 'highpass', f: 3000, v: .12 }); },
    lethal: () => { FX.crit(); tone(70, .5, { type: 'sawtooth', to: 35, v: .25, lp: 600 }); },
    hurt: () => { noise(.1, { f: 600, fto: 150, v: .3 }); tone(95, .12, { to: 50, v: .25 }); },
    mobDie: () => { tone(320, .35, { type: 'sawtooth', to: 70, v: .1, lp: 1500 }); noise(.25, { f: 900, fto: 100, v: .12 }); },
    coin: () => { tone(1568, .05, { type: 'square', v: .04 }); tone(2093, .12, { type: 'square', at: .055, v: .04 }); },
    item: () => { tone(988, .08, { type: 'triangle', v: .14 }); tone(1319, .16, { type: 'triangle', at: .07, v: .14 }); },
    levelUp: () => { arp([523, 659, 784, 1047, 1319], .08, { type: 'triangle', v: .18, d: .45 }); sparkle(10, .35); },
    prof: () => { arp([392, 523, 659, 784], .12, { type: 'triangle', v: .18, d: .5 }); [523, 659, 784, 1047].forEach(f => tone(f, 1.4, { at: .55, a: .05, type: 'triangle', v: .09 })); sparkle(14, .6); },
    victory: () => { FX.prof(); arp([784, 988, 1175, 1568], .1, { at: 1.4, type: 'square', v: .06, d: .5, lp: 3000 }); },
    potion: () => [380, 520, 450].forEach((f, i) => tone(f, .07, { at: i * .08, to: f * 1.5, v: .14 })),
    buff: () => { [660, 880, 1100].forEach(f => tone(f, .7, { a: .06, v: .06 })); sparkle(8, .1, .04); },
    skill: () => { tone(220, .15, { type: 'sawtooth', to: 880, v: .07, lp: 2500 }); noise(.12, { ft: 'bandpass', f: 2000, q: 2, v: .1 }); },
    spoil: () => { tone(600, .1, { type: 'triangle', to: 900, v: .12 }); tone(450, .12, { at: .1, type: 'triangle', v: .1 }); },
    whirl: () => noise(.45, { ft: 'bandpass', f: 300, fto: 2600, q: 3, v: .35 }),
    ud: () => { tone(523, .7, { type: 'square', v: .04, lp: 2500 }); tone(784, .7, { type: 'square', v: .03, detune: 8, lp: 2500 }); noise(.08, { ft: 'highpass', f: 4000, v: .15 }); },
    sit: () => tone(220, .12, { to: 150, v: .07 }),
    enchOk: () => { arp([523, 784, 1047, 1319, 1568, 2093], .06, { type: 'triangle', v: .14, d: .35 }); sparkle(16, .3); },
    enchBless: () => arp([660, 554, 440], .14, { type: 'triangle', v: .14, d: .35 }),
    // krystalizace: tříštění skla
    enchFail: () => {
      noise(.7, { ft: 'highpass', f: 2500, v: .35 });
      for (let i = 0; i < 14; i++) tone(1800 + Math.random() * 4000, .06 + Math.random() * .1, { at: Math.random() * .4, v: .06 });
      tone(160, .8, { type: 'sawtooth', to: 45, v: .12, lp: 800 });
    },
    teleport: () => { noise(1, { ft: 'bandpass', f: 250, fto: 3200, q: 2, v: .22, a: .2 }); tone(220, 1, { to: 1200, v: .06, a: .2 }); },
    death: () => arp([392, 311, 262, 196], .28, { type: 'triangle', v: .16, d: .6 }),
    whisper: () => { tone(1175, .12, { v: .09 }); tone(1568, .22, { at: .1, v: .09 }); },
    gm: () => [0, .18, .36].forEach(at => tone(880, .1, { at, type: 'square', v: .06, lp: 2500 })),
    ann: () => { tone(784, 1.3, { v: .07 }); tone(1568, 1, { v: .03 }); tone(1175, 1.1, { at: .15, v: .04 }); },
    pk: () => { tone(220, .25, { type: 'sawtooth', v: .1, lp: 1200 }); tone(208, .45, { at: .25, type: 'sawtooth', v: .1, lp: 1200 }); },
    roar: () => {
      noise(1.5, { f: 500, fto: 110, v: .5, a: .12 });
      tone(72, 1.4, { type: 'sawtooth', to: 42, v: .25, a: .12, lp: 700 });
      tone(108, 1.3, { type: 'sawtooth', to: 62, v: .15, a: .12, lp: 700 });
    },
    breath: () => noise(1.6, { ft: 'bandpass', f: 200, fto: 1600, q: 1, v: .22, a: .7 }),
    boom: () => { noise(.8, { f: 900, fto: 60, v: .55 }); tone(62, .7, { to: 30, v: .35 }); },
    quake: () => { noise(1.3, { f: 220, fto: 40, v: .6, a: .05 }); tone(42, 1.2, { to: 28, v: .4 }); },
    jail: () => [0, .32].forEach(at => { noise(.15, { at, ft: 'bandpass', f: 1500, q: 4, v: .4 }); tone(180, .5, { at, type: 'square', to: 120, v: .1, lp: 1500 }); }),
    click: () => tone(1800, .02, { type: 'square', v: .03 }),
    page: () => noise(.12, { ft: 'bandpass', f: 3000, fto: 1500, q: 1, v: .06 }),
    chime: () => { tone(1047, .4, { type: 'triangle', v: .12 }); tone(1568, .6, { at: .12, type: 'triangle', v: .12 }); },
  };

  function play(name, gap = .04) {
    if (!ac || !cfg.sfx || !FX[name]) return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    try { FX[name](); } catch (e) { /* zvuk není kritický */ }
  }

  // ---------- hudba ----------
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  const MOODS = {
    // Giran: klidná loutna v dórské
    town: { bpm: 84, root: 50, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 2, 5]], dens: .75 },
    // venku: řídké tóny nad bordunem
    field: { bpm: 64, root: 45, chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], dens: .35 },
    // dungeony a temná místa
    dark: { bpm: 70, root: 40, chords: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [-1, 3, 6]], dens: .3 },
    // grand boss: bubny a tlak
    boss: { bpm: 112, root: 38, chords: [[0, 3, 7], [1, 4, 8], [0, 3, 7], [-2, 1, 5]], dens: .55, drum: 1 },
  };
  let mood = null, nextT = 0, step = 0;

  function pluck(m, t, v) {
    const f = midi(m);
    tone(f, .9, { t, type: 'triangle', v, dest: musG });
    tone(f * 2, .4, { t, v: v * .3, dest: musG });
  }
  function pad(ch, root, t, d) {
    ch.forEach(n => [-6, 6].forEach(det => tone(midi(root + 12 + n), d, { t, a: d * .35, type: 'sawtooth', v: .025, detune: det, lp: 900, dest: musG })));
  }

  function schedule() {
    if (!ac || !mood || !cfg.music) return;
    const M = MOODS[mood];
    const e = 60 / M.bpm / 2;           // osmina
    if (nextT < ac.currentTime) nextT = ac.currentTime + .05;
    while (nextT < ac.currentTime + .35) {
      const bar = Math.floor(step / 8), pos = step % 8;
      const ch = M.chords[bar % M.chords.length];
      const r = M.root;
      if (pos === 0) {
        pad(ch, r, nextT, e * 8);
        tone(midi(r - 12 + ch[0]), e * 6, { t: nextT, type: 'triangle', v: .12, dest: musG });
      }
      if (pos === 4 && mood !== 'field') tone(midi(r - 12 + ch[0] + 7), e * 3, { t: nextT, type: 'triangle', v: .08, dest: musG });
      if (Math.random() < M.dens && (mood === 'town' || pos % 2 === 0)) {
        const n = ch[Math.floor(Math.random() * 3)] + (Math.random() < .5 ? 12 : 24);
        pluck(r + n, nextT, mood === 'town' ? .07 : .05);
      }
      if (M.drum) {
        if (pos === 0 || pos === 3 || pos === 4) { tone(90, .18, { t: nextT, to: 40, v: .35, dest: musG }); }
        if (pos === 2 || pos === 6) noise(.12, { t: nextT, ft: 'bandpass', f: 1800, q: .7, v: .12, dest: musG });
      }
      nextT += e; step++;
    }
  }

  function setZone(id, z) {
    const m = id === 'login' || id === 'town' ? 'town' : z && z.boss ? 'boss' : ['agony', 'cruma', 'dv', 'ant'].includes(id) ? 'dark' : 'field';
    if (m === mood) return;
    mood = m; step = 0;
    if (ac) nextT = ac.currentTime + .4;
  }

  function apply() {
    if (sfxG) sfxG.gain.value = cfg.sfx ? .55 : 0;
    if (musG) musG.gain.value = cfg.music ? .2 : 0;
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* nic */ }
  }
  // cyklus: vše → jen efekty → ticho
  function cycle() {
    if (cfg.sfx && cfg.music) cfg.music = false;
    else if (cfg.sfx) cfg.sfx = false;
    else { cfg.sfx = true; cfg.music = true; }
    apply();
    return state();
  }
  const state = () => cfg.sfx && cfg.music ? 'all' : cfg.sfx ? 'sfx' : 'off';

  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else ac.resume();
  });
  // prohlížeč povolí zvuk až po interakci
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, init, { passive: true }));

  // _test jen pro ladění: přehraje efekt bez tichého polykání chyb
  return { init, play, setZone, cycle, state, names: Object.keys(FX), _test: n => FX[n](), get ctx() { return ac; } };
})();
