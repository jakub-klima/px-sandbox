/* PxQuiz — kvízová party hra.
   TV drží celý stav hry, telefony jsou jen ovladače.
   Spojení: WebRTC DataChannel přes PeerJS. Žádný backend, žádné úložiště. */
(() => {
  'use strict';

  const PREFIX = 'pxquiz-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ROUNDS = 10;
  const Q_TIME = 20000;
  const REVEAL_MS = 6000;
  const INTRO_MS = 2400;
  const MAX_PLAYERS = 8;
  const SHAPES = ['▲', '◆', '●', '■'];
  const PEER_OPTS = { debug: 1 };

  /* ikonka ke každé kategorii, ať má předěl mezi koly tvář */
  const CAT_ICONS = {
    'Zeměpis': '🌍', 'Česko': '🇨🇿', 'Věda': '🔬', 'Tělo': '🫀', 'Příroda': '🦁',
    'Kultura': '🎭', 'Historie': '🏛️', 'Sport': '⚽', 'Čísla': '🔢',
    'Technika': '💻', 'Jídlo': '🍕'
  };

  /* každý hráč dostane svého zvířátka a barvu, ať je v tabulce k poznání */
  const AVATARS = ['🦊', '🐸', '🐼', '🦉', '🐙', '🦄', '🐝', '🦖'];
  const COLORS = ['#ff7ba8', '#5cc8ff', '#ffd166', '#6ee7a0', '#c39bff', '#ffa45c', '#5eead4', '#ff8f8f'];

  /* ---------------------------------------------------------- pomocné */

  const $ = (id) => document.getElementById(id);
  const screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));

  function show(id) {
    screens.forEach((s) => { s.hidden = s.id !== id; });
  }

  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2600);
  }

  function fail(msg) {
    $('err-text').textContent = msg;
    show('scr-error');
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function randomCode() {
    let s = '';
    for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem('pxquiz.' + key);
      sessionStorage.setItem('pxquiz.' + key, val);
    } catch (e) { /* privátní režim */ }
    return null;
  }

  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  /* zvuk — jen pípnutí, žádné soubory */
  let actx = null;
  function beep(freq, dur, vol, type) {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(actx.destination);
      const t = actx.currentTime;
      const v = vol == null ? 0.05 : vol;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      o.start(t);
      o.stop(t + (dur || 0.08) + 0.03);
    } catch (e) {}
  }

  /* obrazovka TV nesmí zhasnout */
  let wakeLock = null;
  async function keepAwake() {
    try {
      if (!('wakeLock' in navigator)) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !document.body.classList.contains('mode-tv')) return;
    if (!wakeLock) keepAwake();
    hostSigRetry(true);
  });

  /* ============================================================ TV / HOST */

  const H = {
    peer: null,
    opened: false,
    sigTimer: 0,
    sigTries: 0,
    code: '',
    players: new Map(),
    deck: [],
    qi: -1,
    state: 'idle',
    deadline: 0,
    raf: 0,
    timer: 0,
    readTimer: 0,
    speakCancel: null,
    readDone: null,
    endTimers: [],
    confettiRaf: 0,
    reader: '',
    readPid: '',
    readSeq: 0,
    lastSec: -1
  };

  /* ---------------------------------------- předčítání otázky na televizi */

  const SPEECH = { on: store('voice') !== '0', voice: null, count: 0, spoke: false, broken: false, probed: false };

  function speechAvailable() {
    return typeof window.speechSynthesis !== 'undefined'
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  /* Česky, jinak slovensky (výslovnost je blízká), jinak výchozí hlas
     prohlížeče — radši trochu divná výslovnost než ticho. */
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices() || [];
      SPEECH.count = vs.length;
      SPEECH.voice = vs.filter((v) => /^cs/i.test(v.lang))[0]
        || vs.filter((v) => /^sk/i.test(v.lang))[0]
        || null;
    } catch (e) {}
    renderVoiceBtn();
  }

  if (speechAvailable()) {
    pickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {}
    /* voiceschanged některé prohlížeče nepošlou, tak se ještě párkrát podívám */
    [400, 1200, 3000].forEach((d) => setTimeout(pickVoice, d));
    setTimeout(() => { SPEECH.probed = true; renderVoiceBtn(); }, 3200);
  }

  function voiceStatus() {
    if (!SPEECH.on) return 'Čtení otázek je vypnuté.';
    const r = readerPlayer();
    if (r) return 'Otázky předčítá telefon hráče ' + r.name + '.';
    if (!speechAvailable()) return 'Tenhle prohlížeč neumí číst nahlas.';
    if (SPEECH.broken) return 'Hlas se nerozjel — otázky se číst nebudou.';
    if (SPEECH.voice) return 'Čte hlasem ' + SPEECH.voice.name + ' (' + SPEECH.voice.lang + ').';
    if (SPEECH.count > 0) return 'Česká hlasová sada chybí — zkusí to výchozím hlasem.';
    if (SPEECH.probed) return 'Prohlížeč téhle televize nenabízí žádný hlas — číst neumí.';
    return 'Hlasy se zatím načítají…';
  }

  function stopSpeech() {
    clearTimeout(H.readTimer);
    H.readTimer = 0;
    if (H.speakCancel) { H.speakCancel(); H.speakCancel = null; }
    try { if (speechAvailable()) speechSynthesis.cancel(); } catch (e) {}
  }

  /* Přečte text a zavolá done(). Když hlas chybí nebo se zasekne, pokračuje
     se podle odhadu délky, ať hra nikdy nezůstane viset. */
  function speak(text, done) {
    let finished = false;
    let guard = 0;
    let startGuard = 0;
    let waited = 0;
    const estimate = Math.min(14000, Math.max(2000, 600 + text.length * 80));

    const finish = (cancel, silent) => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      clearTimeout(startGuard);
      if (cancel) { try { speechSynthesis.cancel(); } catch (e) {} }
      if (!silent) done();
    };
    /* stopSpeech umlčí i hlídače, jinak by doběhly až do dalšího kola */
    H.speakCancel = () => finish(false, true);

    /* jednou zjištěné ticho se už nezkouší, jinak by se čekalo před každou otázkou */
    if (!SPEECH.on || !speechAvailable() || SPEECH.broken) {
      H.readTimer = setTimeout(finish, 250);
      return;
    }

    const busy = () => {
      try { return !!(speechSynthesis.speaking || speechSynthesis.pending); } catch (e) { return false; }
    };

    /* Hlídač čeká, jestli se řeč vůbec rozjela. Nesmí ji utnout jen proto,
       že se engine rozehřívá pomalu — proto se ptá i na speaking/pending. */
    const checkStart = () => {
      if (finished) return;
      if (busy()) return;
      waited += 700;
      if (waited >= 4200) {
        if (!SPEECH.spoke) { SPEECH.broken = true; renderVoiceBtn(); }
        finish(true);
        return;
      }
      startGuard = setTimeout(checkStart, 700);
    };

    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH.voice ? SPEECH.voice.lang : 'cs-CZ';
      if (SPEECH.voice) u.voice = SPEECH.voice;
      u.onstart = () => {
        SPEECH.spoke = true;
        SPEECH.broken = false;
        clearTimeout(startGuard);
      };
      u.onend = () => finish(false);
      u.onerror = () => finish(false);

      /* cancel() a speak() těsně za sebou umí Chrome utterance zahodit */
      H.readTimer = setTimeout(() => {
        if (finished) return;
        try { speechSynthesis.speak(u); } catch (e) { finish(false); return; }
        startGuard = setTimeout(checkStart, 700);
        guard = setTimeout(() => finish(true), estimate + 6000);
      }, 80);
    } catch (e) {
      H.readTimer = setTimeout(finish, 250);
    }
  }

  /* ------------------------------------------- kdo otázky předčítá nahlas

     Prohlížeč LG a spol. žádný hlas nemá, zatímco telefony mají v systému
     pořádné české hlasy. Čtení proto deleguju na jeden z připojených
     telefonů; televize si nechává jen roli náhradníka. */

  function readerPlayer() {
    const p = H.players.get(H.reader);
    return p && p.online && p.tts ? p : null;
  }

  function pickReader() {
    /* i když se předčítač nemění, nově připojený musí zjistit, kdo čte */
    if (readerPlayer()) { announceReader(); return; }
    H.reader = '';
    H.players.forEach((p) => {
      if (!H.reader && p.online && p.tts) H.reader = p.pid;
    });
    announceReader();
  }

  /* kdokoli s českým hlasem si může čtení přetáhnout k sobě */
  function hostClaim(p) {
    if (!p.online || !p.tts || p.pid === H.reader) return;
    H.reader = p.pid;
    announceReader();
    beep(700, 0.07, 0.04);
  }

  function announceReader() {
    const r = readerPlayer();
    H.players.forEach((p) => send(p, {
      t: 'reader', me: p.pid === H.reader, name: r ? r.name : ''
    }));
    renderReader();
    renderVoiceBtn();
  }

  function renderReader() {
    const box = $('lobby-reader');
    if (!box) return;
    const r = readerPlayer();
    if (!SPEECH.on) { box.hidden = true; return; }

    box.hidden = false;
    box.textContent = r
      ? '📢 Otázky čte telefon hráče ' + r.name + ' — polož ho na stůl a přidej hlasitost.'
      : 'Otázky zatím nemá kdo číst nahlas.';
  }

  /* Přečti text — telefonem, když je čím, jinak televizí. */
  function readAloud(text, done) {
    const r = readerPlayer();
    if (!SPEECH.on || !r) { speak(text, done); return; }

    H.readSeq++;
    const id = H.readSeq;
    let finished = false;
    const finish = (silent) => {
      if (finished) return;
      finished = true;
      clearTimeout(H.readTimer);
      H.speakCancel = null;
      if (!silent) done();
    };
    H.speakCancel = () => finish(true);
    H.readDone = (gotId) => { if (gotId === id) finish(false); };

    H.readPid = r.pid;
    send(r, { t: 'speak', text: text, id: id });
    /* kdyby telefon usnul nebo se odmlčel, kolo se rozjede podle odhadu */
    H.readTimer = setTimeout(() => finish(false),
      Math.min(16000, Math.max(2500, 900 + text.length * 85)));
  }

  function hostSpoke(p, id) {
    if (p.pid !== H.readPid) return;
    if (H.readDone) H.readDone(id);
  }

  /* Chyby, které znamenají jen „server PeerJS teď nejde“ — stojí za nový pokus. */
  const NET_ERRS = ['network', 'socket-error', 'socket-closed', 'server-error', 'unavailable-id'];

  /* Server PeerJS je potřeba jen k navázání NOVÝCH spojení. Už připojené
     telefony jedou přímo přes WebRTC, takže když server vypadne, hra běží
     dál a televize se k němu potichu (s rostoucí pauzou) připojí znovu. */
  function hostStart(attempt) {
    document.body.classList.add('mode-tv');
    clearTimeout(H.sigTimer);
    H.sigTimer = 0;
    const code = randomCode();
    const peer = new Peer(PREFIX + code, PEER_OPTS);
    H.peer = peer;
    let opened = false;

    /* Veřejný server PeerJS umí odpovídat i desítky vteřin — pomalý pokus
       se NEruší (rušením by se nikdy nepřipojil), jen se ukáže, že čekáme.
       Nový pokus až po skutečné chybě, a bez omezení počtu. */
    const openTimer = setTimeout(() => {
      if (H.peer === peer && !opened) toast('Server pro připojování odpovídá pomalu, čekám…', 600000);
    }, 6000);
    function retryStart() {
      if (H.peer !== peer || opened) return;
      clearTimeout(openTimer);
      try { peer.destroy(); } catch (e) {}
      toast(attempt >= 3
        ? 'Server pro připojování nejde (pokus ' + (attempt + 2) + '), zkouším znovu…'
        : 'Připojuji se k serveru…', 600000);
      H.sigTimer = setTimeout(() => { H.sigTimer = 0; hostStart(attempt + 1); },
        Math.min(8000, 700 * Math.pow(1.6, attempt)));
    }

    peer.on('open', () => {
      if (H.peer !== peer) return;
      H.sigTries = 0;
      clearTimeout(H.sigTimer);
      H.sigTimer = 0;
      /* 'open' přijde znovu i po každém obnovení spojení se serverem —
         to už hru nesmí vracet do lobby */
      if (opened) return;
      opened = true;
      H.opened = true;
      clearTimeout(openTimer);
      $('toast').hidden = true;
      H.code = code;
      H.state = 'lobby';
      renderLobby();
      renderPlayers();
      show('scr-lobby');
      keepAwake();
    });

    peer.on('connection', (conn) => { if (H.peer === peer) hostOnConn(conn); });

    peer.on('disconnected', () => {
      if (H.peer !== peer || !opened) return;
      hostSigRetry();
    });

    peer.on('error', (err) => {
      if (H.peer !== peer) return;
      if (err.type === 'peer-unavailable') return;
      if (!opened) {
        if (NET_ERRS.indexOf(err.type) >= 0) { retryStart(); return; }
        clearTimeout(openTimer);
        fail('Hru se nepodařilo spustit (' + err.type + '). Zkontroluj připojení k internetu a zkus to znovu.');
        return;
      }
      /* po startu řeší výpadek serveru 'disconnected' + hostSigRetry;
         kód hry se nesmí změnit, jinak by se hráči neměli kam vrátit */
    });
  }

  /* obnovení spojení se serverem se stejným kódem hry */
  function hostSigRetry(now) {
    const peer = H.peer;
    if (!peer || !H.opened || peer.destroyed || !peer.disconnected) return;
    if (H.sigTimer && !now) return;
    clearTimeout(H.sigTimer);
    H.sigTries = (H.sigTries || 0) + 1;
    /* hlásit až déle trvající výpadek — krátký výkyv nikoho nezajímá */
    if (H.sigTries === 5) toast('Server pro připojování neodpovídá. Připojení hráči hrají dál.', 4000);
    const delay = now ? 0 : Math.min(10000, 500 * Math.pow(1.7, H.sigTries - 1));
    H.sigTimer = setTimeout(() => {
      H.sigTimer = 0;
      if (H.peer !== peer || peer.destroyed || !peer.disconnected) return;
      try { peer.reconnect(); } catch (e) {}
    }, delay);
  }

  /* pojistka: kdyby se obnovení zaseklo, každých 5 s zkontrolovat */
  setInterval(() => { if (H.opened && !H.sigTimer) hostSigRetry(); }, 5000);
  window.addEventListener('online', () => { if (H.opened) hostSigRetry(true); });

  /* Tep: televize každé 2 s pošle telefonům ping. Drží to Wi-Fi v telefonu
     vzhůru (úsporný režim jinak spojení uspává) a obě strany díky tomu
     poznají mrtvé spojení dřív, než si toho všimne samotné WebRTC. */
  const HB_MS = 2000;
  const HB_DEAD = 15000;
  setInterval(() => {
    if (!H.opened) return;
    const now = Date.now();
    H.players.forEach((p) => {
      if (!p.online || !p.conn) return;
      if (p.hb && now - (p.seen || 0) > HB_DEAD) {
        const c = p.conn;
        hostConnGone(c);
        try { c.close(); } catch (e) {}
        return;
      }
      send(p, { t: 'ping' });
    });
  }, HB_MS);

  function playerByConn(conn) {
    let found = null;
    H.players.forEach((p) => { if (p.conn === conn) found = p; });
    return found;
  }

  function send(p, msg) {
    try { if (p.conn && p.conn.open) p.conn.send(msg); } catch (e) {}
  }

  function broadcast(msg) {
    H.players.forEach((p) => send(p, msg));
  }

  function hostOnConn(conn) {
    conn.on('data', (m) => hostMsg(conn, m));
    conn.on('close', () => hostConnGone(conn));
    conn.on('error', () => {});
  }

  function hostConnGone(conn) {
    const p = playerByConn(conn);
    if (!p || !p.online) return;
    p.online = false;
    if (p.pid === H.reader) { H.reader = ''; pickReader(); }
    renderPlayers();
    renderAnswered();
  }

  function uniqueName(name, pid) {
    let base = name;
    let n = 1;
    const taken = () => {
      let hit = false;
      H.players.forEach((p) => { if (p.pid !== pid && p.name === name) hit = true; });
      return hit;
    };
    while (taken()) { n++; name = base + ' ' + n; }
    return name;
  }

  function hostMsg(conn, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'join') return hostJoin(conn, m);

    const p = playerByConn(conn);
    if (!p) return;
    p.seen = Date.now();
    if (m.t === 'pong') return;
    if (m.t === 'answer') hostAnswer(p, m.i);
    else if (m.t === 'spoke') hostSpoke(p, m.id);
    else if (m.t === 'caps') { p.tts = !!m.tts; pickReader(); renderVoiceBtn(); }
    else if (m.t === 'claim') hostClaim(p);
    else if (m.t === 'start' && H.state === 'lobby') beginGame();
    else if (m.t === 'again' && H.state === 'end') backToLobby();
  }

  /* nejnižší volné číslo zvířátka, ať se avataři neopakují */
  function freeSlot() {
    const used = [];
    H.players.forEach((p) => used.push(p.idx));
    for (let i = 0; i < AVATARS.length; i++) if (used.indexOf(i) < 0) return i;
    return 0;
  }

  function hostJoin(conn, m) {
    const pid = String(m.pid || '').slice(0, 64);
    if (!pid) return;
    let name = String(m.name || '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'Hráč';

    let p = H.players.get(pid);
    if (!p) {
      if (H.players.size >= MAX_PLAYERS) {
        try { conn.send({ t: 'denied', why: 'Hra je plná (max ' + MAX_PLAYERS + ' hráčů).' }); } catch (e) {}
        return;
      }
      p = {
        pid: pid, name: uniqueName(name, pid), conn: conn, idx: freeSlot(), tts: !!m.tts,
        score: 0, online: true, ans: null, at: 0, gain: 0, streak: 0, best: 0
      };
      H.players.set(pid, p);
      beep(760, 0.09, 0.05);
      setTimeout(() => beep(1010, 0.09, 0.05), 90);
    } else {
      /* nové spojení přiřadit dřív, než zavřu staré — jeho 'close'
         by jinak hráče na chvíli shodil jako odpojeného */
      const old = p.conn;
      p.conn = conn;
      if (old && old !== conn) { try { old.close(); } catch (e) {} }
      p.online = true;
      p.tts = !!m.tts;
      p.name = uniqueName(name, pid);
    }
    p.seen = Date.now();
    p.hb = !!m.hb;   /* starší telefon (z cache) na ping neodpovídá — neodpojovat ho */
    pickReader();

    send(p, { t: 'welcome', name: p.name, score: p.score, avatar: AVATARS[p.idx], color: COLORS[p.idx], hb: HB_MS });
    renderPlayers();
    renderAnswered();
    syncPlayer(p);
  }

  /* pošle nově připojenému (nebo vrátivšímu se) hráči aktuální stav */
  function syncPlayer(p) {
    if (H.state === 'lobby') {
      sendLobby();
    } else if (H.state === 'intro') {
      const q = H.deck[H.qi];
      send(p, { t: 'intro', n: H.qi + 1, total: H.deck.length, cat: q.c, last: isLastRound() });
    } else if (H.state === 'reading') {
      send(p, { t: 'reading', n: H.qi + 1, total: H.deck.length, cat: H.deck[H.qi].c, last: isLastRound() });
    } else if (H.state === 'question') {
      const q = H.deck[H.qi];
      send(p, {
        t: 'question', n: H.qi + 1, total: H.deck.length, cat: q.c, q: q.q, a: q.a,
        ms: Math.max(0, H.deadline - performance.now()), last: isLastRound()
      });
      if (p.ans !== null) send(p, { t: 'locked', i: p.ans });
    } else if (H.state === 'reveal') {
      const q = H.deck[H.qi];
      const board = ranking();
      send(p, {
        t: 'reveal', k: q.k, mine: p.ans, gain: p.gain, bonus: p.bonus, streak: p.streak,
        score: p.score, mult: isLastRound() ? 2 : 1,
        rank: rankOf(board, p.pid), of: board.length, moved: 0, fastest: false
      });
    } else if (H.state === 'end') {
      const board = ranking();
      send(p, { t: 'gameover', rank: rankOf(board, p.pid), of: board.length, score: p.score, board: boardLite(board) });
    }
  }

  function sendLobby() {
    const names = [];
    H.players.forEach((p) => { if (p.online) names.push(p.name); });
    broadcast({ t: 'lobby', names: names });
  }

  function clearTimers() {
    cancelAnimationFrame(H.raf);
    cancelAnimationFrame(H.confettiRaf);
    clearTimeout(H.timer);
    H.endTimers.forEach(clearTimeout);
    H.endTimers = [];
    stopSpeech();
    $('confetti').hidden = true;
    H.raf = 0;
    H.timer = 0;
    H.confettiRaf = 0;
  }

  function beginGame() {
    H.deck = shuffle(QUESTIONS.slice()).slice(0, ROUNDS);
    H.qi = -1;
    H.players.forEach((p) => { p.score = 0; p.gain = 0; p.ans = null; p.streak = 0; p.best = 0; });
    nextQuestion();
  }

  function backToLobby() {
    clearTimers();
    H.state = 'lobby';
    H.qi = -1;
    H.players.forEach((p) => { p.score = 0; p.gain = 0; p.ans = null; p.streak = 0; p.best = 0; });
    renderPlayers();
    show('scr-lobby');
    sendLobby();
  }

  /* Kolo má dvě fáze: televize otázku nejdřív přečte ('reading'),
     teprve pak se odkryjí odpovědi a spustí čas ('question'). */
  function nextQuestion() {
    clearTimers();
    H.qi++;
    if (H.qi >= H.deck.length) return endGame();

    const q = H.deck[H.qi];
    H.state = 'intro';
    H.lastSec = -1;
    H.players.forEach((p) => { p.ans = null; p.at = 0; p.gain = 0; });

    broadcast({ t: 'intro', n: H.qi + 1, total: H.deck.length, cat: q.c, last: isLastRound() });
    renderIntro(q);
    show('scr-intro');
    beep(500, 0.09, 0.045);
    setTimeout(() => beep(750, 0.13, 0.045), 130);

    H.timer = setTimeout(beginReading, INTRO_MS);
  }

  function beginReading() {
    if (H.state !== 'intro') return;
    clearTimers();
    H.state = 'reading';

    const q = H.deck[H.qi];
    broadcast({ t: 'reading', n: H.qi + 1, total: H.deck.length, cat: q.c, last: isLastRound() });
    renderQuestion(q);
    show('scr-q');

    readAloud((isLastRound() ? 'Poslední otázka, za dvojnásobek bodů. ' : '') + q.c + '. ' + q.q, startAnswering);
  }

  function startAnswering() {
    if (H.state !== 'reading') return;
    stopSpeech();
    H.state = 'question';
    H.deadline = performance.now() + Q_TIME;

    const q = H.deck[H.qi];
    $('q-reading').hidden = true;
    $('q-answers').hidden = false;
    $('q-barwrap').hidden = false;
    $('q-clock').hidden = false;

    broadcast({
      t: 'question', n: H.qi + 1, total: H.deck.length, cat: q.c, q: q.q, a: q.a,
      ms: Q_TIME, last: isLastRound()
    });
    beep(520, 0.07, 0.04);
    setTimeout(() => beep(780, 0.09, 0.04), 70);

    H.timer = setTimeout(finishQuestion, Q_TIME + 60);
    tick();
  }

  function tick() {
    if (H.state !== 'question') return;
    const left = Math.max(0, H.deadline - performance.now());
    $('q-bar').style.transform = 'scaleX(' + (left / Q_TIME) + ')';

    const secs = Math.ceil(left / 1000);
    if (secs !== H.lastSec) {
      H.lastSec = secs;
      const c = $('q-clock');
      c.textContent = secs;
      c.classList.toggle('warn', secs <= 10 && secs > 5);
      c.classList.toggle('hot', secs <= 5);
      if (secs <= 5 && secs > 0) beep(secs === 1 ? 520 : 420, 0.06, 0.035, 'square');
    }
    if (left <= 0) return finishQuestion();
    H.raf = requestAnimationFrame(tick);
  }

  function hostAnswer(p, i) {
    if (H.state !== 'question' || p.ans !== null) return;
    if (typeof i !== 'number' || i < 0 || i > 3) return;
    p.ans = i;
    p.at = Math.min(Q_TIME, Math.max(0, Q_TIME - (H.deadline - performance.now())));
    send(p, { t: 'locked', i: i });
    renderAnswered();
    beep(880, 0.05, 0.04);

    const active = [];
    H.players.forEach((x) => { if (x.online) active.push(x); });
    if (active.length && active.every((x) => x.ans !== null)) finishQuestion();
  }

  function isLastRound() {
    return H.qi === H.deck.length - 1;
  }

  function finishQuestion() {
    if (H.state !== 'question') return;
    clearTimers();
    H.state = 'reveal';

    const q = H.deck[H.qi];
    const mult = isLastRound() ? 2 : 1;
    const before = ranking();

    H.players.forEach((p) => {
      p.gain = 0;
      p.bonus = 0;
      p.broke = 0;
      if (p.ans === q.k) {
        p.streak++;
        p.best = Math.max(p.best, p.streak);
        /* série se vyplácí až od druhé správné v řadě, strop je +400 */
        p.bonus = p.streak > 1 ? Math.min(4, p.streak - 1) * 100 : 0;
        p.gain = (500 + Math.round(500 * Math.max(0, 1 - p.at / Q_TIME)) + p.bonus) * mult;
        p.score += p.gain;
      } else {
        /* ať telefon ví, jestli je co litovat */
        p.broke = p.streak > 1 ? p.streak : 0;
        p.streak = 0;
      }
    });

    const board = ranking();

    /* kdo z těch správných byl nejrychlejší */
    let fastest = null;
    board.forEach((p) => {
      if (p.ans === q.k && (!fastest || p.at < fastest.at)) fastest = p;
    });

    H.players.forEach((p) => send(p, {
      t: 'reveal', k: q.k, mine: p.ans, gain: p.gain, bonus: p.bonus, streak: p.streak,
      broke: p.broke, score: p.score, mult: mult, rank: rankOf(board, p.pid), of: board.length,
      moved: rankOf(before, p.pid) - rankOf(board, p.pid),
      fastest: !!(fastest && fastest.pid === p.pid)
    }));

    renderReveal(q, board, before, fastest, mult);
    show('scr-reveal');
    beep(660, 0.12, 0.05);
    setTimeout(() => beep(990, 0.18, 0.05), 120);

    H.timer = setTimeout(nextQuestion, REVEAL_MS);
  }

  function endGame() {
    clearTimers();
    H.state = 'end';
    const board = ranking();
    H.players.forEach((p) => send(p, {
      t: 'gameover', rank: rankOf(board, p.pid), of: board.length, score: p.score, board: boardLite(board)
    }));
    renderEnd(board);
    show('scr-end');
    [0, 140, 280, 460].forEach((d, i) => setTimeout(() => beep([523, 659, 784, 1047][i], 0.22, 0.06), d));
  }

  function ranking() {
    const list = [];
    H.players.forEach((p) => list.push(p));
    list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'cs'));
    return list;
  }

  function rankOf(board, pid) {
    for (let i = 0; i < board.length; i++) if (board[i].pid === pid) return i + 1;
    return 0;
  }

  function boardLite(board) {
    return board.map((p) => ({
      name: p.name, score: p.score, avatar: AVATARS[p.idx], color: COLORS[p.idx], best: p.best
    }));
  }

  /* ------------------------------------------------- vykreslení na TV */

  function joinUrl() {
    return location.href.split('#')[0] + '#' + H.code;
  }

  function renderLobby() {
    $('lobby-code').textContent = H.code;
    const url = joinUrl();
    $('lobby-url').textContent = url.replace(/^https?:\/\//, '');
    const box = $('qr');
    box.innerHTML = '';
    box.hidden = true;
    try {
      if (typeof qrcode === 'function') {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        box.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
        box.hidden = false;
      }
    } catch (e) { box.hidden = true; }
  }

  const seenChips = new Set();

  function chipFor(p, extra) {
    const c = el('div', 'chip' + (p.online ? '' : ' off') + (extra || ''));
    c.style.borderColor = COLORS[p.idx];
    c.appendChild(el('span', 'av', AVATARS[p.idx]));
    c.appendChild(el('span', null, p.name));
    return c;
  }

  function renderPlayers() {
    const wrap = $('lobby-players');
    wrap.innerHTML = '';
    const list = ranking();
    list.forEach((p) => {
      const fresh = !seenChips.has(p.pid);
      seenChips.add(p.pid);
      wrap.appendChild(chipFor(p, fresh ? ' fresh' : ''));
    });

    const n = list.filter((p) => p.online).length;
    $('btn-start').disabled = n < 1;
    $('lobby-hint').textContent = n === 0
      ? 'Naskenuj QR kód mobilem, nebo zadej kód na stejné adrese.'
      : n + (n === 1 ? ' hráč připojen' : (n < 5 ? ' hráči připojeni' : ' hráčů připojeno')) + ' — start může spustit i kdokoli z telefonu.';

    if (H.state === 'lobby') sendLobby();
  }

  function answerNodes(q, container) {
    container.innerHTML = '';
    q.a.forEach((text, i) => {
      const n = el('div', 'ans a' + i);
      n.appendChild(el('span', 'sh', SHAPES[i]));
      n.appendChild(el('span', null, text));
      container.appendChild(n);
    });
    return container.children;
  }

  /* cur = kolikáté kolo je právě rozehrané (0 = první) */
  function renderPips(wrap, cur) {
    wrap.innerHTML = '';
    for (let i = 0; i < H.deck.length; i++) {
      wrap.appendChild(el('i', 'pip' + (i < cur ? ' done' : (i === cur ? ' now' : ''))));
    }
  }

  function renderIntro(q) {
    renderPips($('i-pips'), H.qi);
    const num = $('i-num');
    num.innerHTML = '';
    num.appendChild(document.createTextNode('Otázka '));
    num.appendChild(el('b', null, String(H.qi + 1)));
    num.appendChild(document.createTextNode(' z ' + H.deck.length));

    const cat = $('i-cat');
    cat.innerHTML = '';
    cat.appendChild(el('span', null, CAT_ICONS[q.c] || '❓'));
    cat.appendChild(el('span', null, q.c));

    $('i-double').hidden = !isLastRound();
  }

  function renderQuestion(q) {
    $('q-cat').textContent = q.c;
    $('q-num').textContent = 'Otázka ' + (H.qi + 1) + '/' + H.deck.length;
    $('q-text').textContent = q.q;
    $('q-bar').style.transform = 'scaleX(1)';
    $('q-clock').textContent = Math.round(Q_TIME / 1000);
    $('q-clock').className = 'clock';
    renderPips($('q-pips'), H.qi);
    answerNodes(q, $('q-answers'));
    renderAnswered();

    $('q-double').hidden = !isLastRound();

    /* dokud televize otázku nedočte, odpovědi ani čas nejsou vidět */
    const reading = H.state === 'reading';
    $('q-reading').hidden = !reading;
    $('q-answers').hidden = reading;
    $('q-barwrap').hidden = reading;
    $('q-clock').hidden = reading;
  }

  function renderAnswered() {
    const wrap = $('q-players');
    wrap.innerHTML = '';
    H.players.forEach((p) => {
      if (!p.online) return;
      wrap.appendChild(chipFor(p, p.ans !== null ? ' done' : ''));
    });
  }

  /* číslo se dopočítá nahoru, ať skóre naskakuje a ne přeskakuje */
  function countUp(node, from, to) {
    if (from === to) { node.textContent = String(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 800);
      const eased = 1 - Math.pow(1 - k, 3);
      node.textContent = String(Math.round(from + (to - from) * eased));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    /* rAF se ve skryté záložce zastaví — konečné číslo musí sednout tak jako tak */
    setTimeout(() => { node.textContent = String(to); }, 900);
  }

  function movedNode(moved) {
    if (moved > 0) return el('span', 'moved up', '▲' + moved);
    if (moved < 0) return el('span', 'moved down', '▼' + (-moved));
    return el('span', 'moved flat', '·');
  }

  function renderReveal(q, board, before, fastest, mult) {
    $('r-cat').textContent = q.c;
    $('r-num').textContent = 'Otázka ' + (H.qi + 1) + '/' + H.deck.length;
    $('r-text').textContent = q.q;
    renderPips($('r-pips'), H.qi + 1);

    /* kdo si co vybral — avataři sedí na kartičce své odpovědi */
    const picks = [[], [], [], []];
    H.players.forEach((p) => { if (p.ans !== null) picks[p.ans].push(p); });

    const nodes = answerNodes(q, $('r-answers'));
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.add(i === q.k ? 'win' : 'faded');
      const who = el('span', 'picks');
      picks[i].forEach((p) => who.appendChild(el('span', 'av', AVATARS[p.idx])));
      if (picks[i].length) who.appendChild(el('span', 'cnt', String(picks[i].length) + '×'));
      nodes[i].appendChild(who);
    }

    const note = $('r-note');
    if (fastest) {
      note.textContent = '⚡ Nejrychleji ' + fastest.name + ' za ' + (fastest.at / 1000).toFixed(1) + ' s'
        + (mult > 1 ? ' · dvojnásobné body!' : '');
      note.hidden = false;
    } else {
      note.textContent = 'Správně nikdo. 🙈';
      note.hidden = board.length === 0;
    }

    const wrap = $('r-board');
    wrap.innerHTML = '';
    board.forEach((p, i) => {
      const row = el('div', 'brow' + (i === 0 && p.score > 0 ? ' top' : ''));
      row.appendChild(el('span', 'pos', (i + 1) + '.'));

      const who = el('span', 'who');
      who.appendChild(el('span', 'av', AVATARS[p.idx]));
      who.appendChild(el('span', 'nm', p.name + (p.online ? '' : ' (odpojen)')));
      if (p.streak > 1) who.appendChild(el('span', 'flame', '🔥' + p.streak));
      row.appendChild(who);

      row.appendChild(movedNode(rankOf(before, p.pid) - (i + 1)));
      row.appendChild(el('span', 'gain' + (p.gain ? '' : ' zero'),
        p.gain ? '+' + p.gain : (p.ans === null ? '—' : '+0')));

      const sc = el('span', 'sc');
      row.appendChild(sc);
      countUp(sc, p.score - p.gain, p.score);

      wrap.appendChild(row);
    });
  }

  /* Finále se odkrývá od posledního místa nahoru, ať to má šťávu. */
  function renderEnd(board) {
    const medals = ['🥇', '🥈', '🥉'];
    const wrap = $('e-board');
    wrap.innerHTML = '';
    $('e-title').textContent = 'Konečné pořadí';
    $('btn-again').hidden = true;

    const rows = board.map((p, i) => {
      const row = el('div', 'brow reveal-row' + (i === 0 ? ' top' : ''));
      row.appendChild(el('span', 'pos', medals[i] || (i + 1) + '.'));

      const who = el('span', 'who');
      who.appendChild(el('span', 'av', AVATARS[p.idx]));
      who.appendChild(el('span', 'nm', p.name));
      if (p.best > 1) who.appendChild(el('span', 'flame', '🔥' + p.best));
      row.appendChild(who);

      row.appendChild(el('span', 'gain zero', ''));
      row.appendChild(el('span', 'sc', String(p.score)));
      row.hidden = true;
      wrap.appendChild(row);
      return row;
    });

    /* od posledního k prvnímu */
    let delay = 400;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const winner = i === 0;
      H.endTimers.push(setTimeout(() => {
        row.hidden = false;
        beep(winner ? 880 : 420 + (rows.length - i) * 60, winner ? 0.3 : 0.09, 0.05);
        if (winner) {
          $('e-title').textContent = '🏆 Vyhrává ' + board[0].name + '!';
          confetti();
          [0, 150, 300, 520].forEach((d, j) => setTimeout(() => beep([523, 659, 784, 1047][j], 0.25, 0.06), d));
        }
      }, delay));
      delay += winner ? 1100 : 750;
    }
    H.endTimers.push(setTimeout(() => { $('btn-again').hidden = false; }, delay));
  }

  /* Konfety — malé plátno přes celou obrazovku, žádná knihovna. */
  function confetti() {
    const cv = $('confetti');
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    /* rozměr se dá změřit až po odkrytí, jinak je plátno 0×0 */
    cv.hidden = false;
    cv.width = cv.clientWidth || window.innerWidth;
    cv.height = cv.clientHeight || window.innerHeight;

    const bits = [];
    for (let i = 0; i < 140; i++) {
      bits.push({
        x: Math.random() * cv.width,
        y: -20 - Math.random() * cv.height * 0.6,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2 + Math.random() * 3.5,
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        c: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }

    const t0 = performance.now();
    const draw = (now) => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let live = 0;
      bits.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y < cv.height + 40) live++;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
      if (live && now - t0 < 7000) {
        H.confettiRaf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, cv.width, cv.height);
        cv.hidden = true;
      }
    };
    cancelAnimationFrame(H.confettiRaf);
    H.confettiRaf = requestAnimationFrame(draw);
  }

  /* ======================================================= TELEFON / HRÁČ */

  const P = {
    peer: null, conn: null, code: '', name: '', pid: '',
    score: 0, joined: false, tries: 0, retryTimer: 0, openTimer: 0, locked: false,
    hb: 0, heard: 0,
    avatar: '🙂', color: '#7c5cff', reader: false, readerName: '', voice: null
  };

  /* ------------------------------------------- předčítání otázek telefonem */

  function phoneVoices() {
    try { return speechSynthesis.getVoices() || []; } catch (e) { return []; }
  }

  function phonePickVoice() {
    const had = !!P.voice;
    const vs = phoneVoices();
    P.voice = vs.filter((v) => /^cs/i.test(v.lang))[0]
      || vs.filter((v) => /^sk/i.test(v.lang))[0]
      || null;
    /* hlasy se často načtou až po připojení — televizi to musím doohlásit */
    if (!had && P.voice && P.joined) {
      try { if (P.conn && P.conn.open) P.conn.send({ t: 'caps', tts: true }); } catch (e) {}
      renderReaderNote();
    }
  }

  /* Telefon se hlásí jako předčítač jen s opravdovým českým hlasem —
     anglický hlas na české otázce je horší než ticho. */
  function phoneCanSpeak() {
    return speechAvailable() && !!P.voice;
  }

  if (speechAvailable()) {
    phonePickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', phonePickVoice); } catch (e) {}
    [400, 1200, 3000].forEach((d) => setTimeout(phonePickVoice, d));
  }

  /* Pruh nahoře: buď čtu já, nebo si čtení můžu vzít. */
  function renderReaderNote() {
    const note = $('reader-note');
    if (!note) return;
    if (!P.joined || !phoneCanSpeak()) { note.hidden = true; return; }
    note.hidden = false;
    $('reader-text').textContent = P.reader
      ? '📢 Tvůj telefon předčítá otázky'
      : (P.readerName ? '📢 Čte telefon hráče ' + P.readerName : '📢 Otázky nikdo nečte');
    $('btn-readtest').hidden = !P.reader;
    $('btn-readclaim').hidden = P.reader;
  }

  function phoneSpeak(text, id) {
    const reply = () => {
      try { if (P.conn && P.conn.open) P.conn.send({ t: 'spoke', id: id }); } catch (e) {}
    };
    if (!speechAvailable()) { reply(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; reply(); };
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = P.voice ? P.voice.lang : 'cs-CZ';
      if (P.voice) u.voice = P.voice;
      u.onend = finish;
      u.onerror = finish;
      setTimeout(() => { try { speechSynthesis.speak(u); } catch (e) { finish(); } }, 60);
      /* televize má vlastní pojistku, tahle jen uklidí, kdyby engine mlčel */
      setTimeout(finish, Math.min(16000, Math.max(2500, 900 + text.length * 85)));
    } catch (e) { finish(); }
  }

  function myPid() {
    let v = store('pid');
    if (!v) {
      v = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      store('pid', v);
    }
    return v;
  }

  function playerBoot(code) {
    document.body.classList.add('mode-phone');
    P.code = code;
    P.pid = myPid();
    $('name-code').textContent = code;
    const saved = store('name');
    if (saved) $('in-name').value = saved;
    show('scr-name');
    setTimeout(() => { try { $('in-name').focus(); } catch (e) {} }, 100);
  }

  function showWait(title, sub, spinning) {
    $('wait-title').textContent = title;
    $('wait-sub').textContent = sub || '';
    $('wait-spin').hidden = spinning === false;
    show('scr-wait');
  }

  /* Nejdřív odpojit odkazy, pak zavírat: 'close' starého spojení
     by jinak naplánoval další obnovu a ta by zabila to nové. */
  function cleanupPeer() {
    const c = P.conn;
    const p = P.peer;
    P.conn = null;
    P.peer = null;
    clearTimeout(P.openTimer);
    try { if (c) c.close(); } catch (e) {}
    try { if (p) p.destroy(); } catch (e) {}
  }

  /* Ve kterém kroku připojování telefon je — ať je vidět, KDE se to zasekne:
     1 = server PeerJS, 2 = hledání televize přes server, 3 = přímé spojení po Wi-Fi. */
  function pstage(stage, text) {
    P.stage = stage;
    if (P.joined && P.tries < 3) return;   /* ve hře krátký výpadek řeší toast */
    const title = P.joined ? 'Obnovuji spojení…' : 'Připojuji…';
    const extra = P.tries ? ' · pokus ' + (P.tries + 1) : '';
    showWait(title, 'Hra ' + P.code + ' · ' + text + extra);
  }

  function pconnect() {
    clearTimeout(P.retryTimer);
    P.retryTimer = 0;
    pstage(1, 'krok 1/3: spojuji se se serverem…');

    cleanupPeer();
    const peer = new Peer(PEER_OPTS);
    P.peer = peer;
    const mine = () => P.peer === peer;
    const live = () => !!(P.conn && P.conn.open);

    /* Na server PeerJS se čeká, jak dlouho bude potřeba (umí být pomalý,
       rušení by nepomohlo) — jen dát vědět, že se něco děje. */
    P.openTimer = setTimeout(() => {
      if (mine() && !P.conn) pstage(1, 'krok 1/3: server odpovídá pomalu, čekám…');
    }, 6000);

    peer.on('open', () => {
      /* 'open' chodí i po obnovení spojení se serverem — běžící hru nechat být */
      if (!mine() || P.conn) return;
      pstage(2, 'krok 2/3: server OK, hledám televizi…');
      const conn = peer.connect(PREFIX + P.code, { reliable: true, serialization: 'json' });
      P.conn = conn;
      /* server odpověděl; když se ale přímé spojení s TV do 15 s nenaváže
         (zaseknutá Wi-Fi), zkusit to celé znovu */
      clearTimeout(P.openTimer);
      P.openTimer = setTimeout(() => { if (mine() && !live()) reconnectLater(); }, 15000);
      conn.on('iceStateChanged', (st) => {
        if (P.conn !== conn || live()) return;
        if (st === 'checking') pstage(3, 'krok 3/3: televize nalezena, spojuji se po Wi-Fi…');
        else if (st === 'connected' || st === 'completed') pstage(3, 'spojeno, přihlašuji…');
        else if (st === 'failed') pstage(3, 'krok 3/3: přímé spojení s televizí selhalo');
      });
      conn.on('open', () => {
        if (P.conn !== conn) return;
        clearTimeout(P.openTimer);
        P.tries = 0;
        P.heard = Date.now();
        conn.send({ t: 'join', pid: P.pid, name: P.name, tts: phoneCanSpeak(), hb: 1 });
      });
      conn.on('data', (m) => {
        if (P.conn !== conn) return;
        P.heard = Date.now();
        playerMsg(m);
      });
      conn.on('close', () => { if (P.conn === conn) reconnectLater(); });
      conn.on('error', () => { if (P.conn === conn) reconnectLater(); });
    });

    /* Server PeerJS je potřeba jen k navázání spojení. Když vypadne během
       hry, spojení s televizí jede dál přímo — nic nerušit. */
    peer.on('disconnected', () => {
      if (mine() && !live()) reconnectLater();
    });

    peer.on('error', (err) => {
      if (!mine()) return;
      if (err.type === 'peer-unavailable' && !P.joined && P.tries >= 2) {
        cleanupPeer();
        fail('Hra s kódem ' + P.code + ' neběží. Zkontroluj kód na televizi.');
        return;
      }
      if (live()) return;
      reconnectLater();
    });
  }

  function reconnectLater() {
    if (P.retryTimer) return;
    clearTimeout(P.openTimer);
    P.tries++;
    /* před prvním připojením to po pár pokusech vzdát; ve hře zkoušet pořád */
    if (!P.joined && P.tries > 6) {
      cleanupPeer();
      fail(P.stage === 3
        ? 'Telefon televizi našel, ale přímo po Wi-Fi se spolu nespojí. Bývá to hostovská Wi-Fi nebo router, který zařízením nedovolí spolu mluvit (izolace klientů). Zkus jinou Wi-Fi nebo mobilní data.'
        : P.stage === 2
          ? 'Server pro připojování televizi nenašel. Zkontroluj kód na televizi, případně tam hru spusť znovu.'
          : 'Server pro připojování neodpovídá. Zkus to za chvíli znovu.');
      return;
    }
    if (P.joined) {
      if (P.tries >= 3) showWait('Obnovuji spojení…', 'Hra ' + P.code + ' · tvoje body zůstávají');
      else toast('Spojení přerušeno, obnovuji…', 1800);
    }
    const delay = Math.min(5000, 500 * Math.pow(1.6, P.tries - 1));
    P.retryTimer = setTimeout(() => { P.retryTimer = 0; pconnect(); }, delay);
  }

  /* Hlídač: televize posílá ping každé 2 s. Když telefon nic neslyší
     přes 7 s, spojení je mrtvé, i když se tváří jako otevřené. */
  setInterval(() => {
    if (!P.joined || !P.hb || P.retryTimer || document.visibilityState !== 'visible') return;
    if (P.conn && P.conn.open && Date.now() - P.heard > P.hb * 3.5) reconnectLater();
  }, 1000);

  window.addEventListener('online', () => {
    if (!P.joined || (P.conn && P.conn.open)) return;
    P.tries = 0;
    pconnect();
  });

  function playerMsg(m) {
    if (!m || typeof m !== 'object') return;

    switch (m.t) {
      case 'ping':
        try { if (P.conn && P.conn.open) P.conn.send({ t: 'pong' }); } catch (e) {}
        break;

      case 'welcome':
        P.joined = true;
        P.hb = m.hb || 0;
        P.heard = Date.now();
        P.name = m.name;
        P.score = m.score;
        renderReaderNote();
        P.avatar = m.avatar || P.avatar;
        P.color = m.color || P.color;
        $('p-name').textContent = P.avatar + ' ' + m.name;
        $('p-score').textContent = m.score;
        document.documentElement.style.setProperty('--me', P.color);
        break;

      case 'denied':
        fail(m.why || 'Připojení bylo odmítnuto.');
        cleanupPeer();
        break;

      case 'lobby': {
        const n = (m.names || []).length;
        showWait('Jsi ve hře!', n + (n === 1 ? ' hráč připojen' : (n < 5 ? ' hráči připojeni' : ' hráčů připojeno')), false);
        $('btn-pstart').hidden = false;
        break;
      }

      case 'reader':
        P.reader = !!m.me;
        P.readerName = m.name || '';
        renderReaderNote();
        break;

      case 'speak':
        phoneSpeak(m.text, m.id);
        break;

      case 'intro':
        $('btn-pstart').hidden = true;
        showWait(
          m.last ? '🔥 Poslední otázka!' : 'Otázka ' + m.n + ' z ' + m.total,
          m.last ? 'Za dvojnásobné body' : (m.cat || ''),
          false);
        vibrate(20);
        break;

      case 'reading':
        $('btn-pstart').hidden = true;
        showWait(
          (m.last ? '🔥 Poslední otázka!' : '🔊 Otázka ' + m.n + ' z ' + m.total),
          m.last ? 'Dvojnásobné body — poslouchej otázku' : (m.cat || '') + ' · poslouchej otázku…',
          false);
        break;

      case 'question':
        $('btn-pstart').hidden = true;
        renderPad(m);
        break;

      case 'locked':
        lockPad(m.i);
        break;

      case 'reveal':
        P.score = m.score;
        $('p-score').textContent = m.score;
        renderResult(m);
        break;

      case 'gameover':
        renderPlayerEnd(m);
        break;
    }
  }

  function renderPad(m) {
    P.locked = false;
    $('p-num').textContent = m.n + '/' + m.total;
    $('p-status').textContent = 'Vyber odpověď';
    const pad = $('p-pad');
    pad.innerHTML = '';
    (m.a || []).forEach((text, i) => {
      const b = el('button', 'pbtn a' + i);
      b.appendChild(el('span', 'sh', SHAPES[i]));
      b.appendChild(el('span', null, text));
      b.addEventListener('click', () => {
        if (P.locked) return;
        P.locked = true;
        lockPad(i);
        vibrate(30);
        try { if (P.conn && P.conn.open) P.conn.send({ t: 'answer', i: i }); } catch (e) {}
      });
      pad.appendChild(b);
    });
    show('scr-play');
    vibrate(15);
  }

  function lockPad(pick) {
    P.locked = true;
    const kids = $('p-pad').children;
    for (let i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('pick', i === pick);
      kids[i].classList.toggle('dim', i !== pick);
    }
    $('p-status').textContent = 'Odesláno ✓ — čekáme na ostatní';
  }

  function renderResult(m) {
    const none = m.mine === null || m.mine === undefined;
    const ok = m.mine === m.k;
    $('res-icon').textContent = none ? '⏳' : (ok ? '✅' : '❌');
    $('res-gain').textContent = none ? 'Nestihl jsi odpovědět' : (ok ? '+' + m.gain : 'Špatně');

    /* co se povedlo navíc — série, nejrychlejší odpověď, dvojnásobek */
    const extras = [];
    if (ok && m.fastest) extras.push('⚡ Nejrychlejší!');
    if (ok && m.streak > 1) extras.push('🔥 ' + m.streak + ' v řadě' + (m.bonus ? ' (+' + m.bonus + ')' : ''));
    if (ok && m.mult > 1) extras.push('✌️ Dvojnásobek');
    if (m.broke > 1) extras.push('💔 Série ' + m.broke + ' přetržená');
    const badges = $('res-badges');
    badges.innerHTML = '';
    extras.forEach((txt) => badges.appendChild(el('span', 'badge', txt)));

    const moved = $('res-moved');
    if (m.moved > 0) { moved.className = 'moved up'; moved.textContent = '▲ o ' + m.moved + ' nahoru'; }
    else if (m.moved < 0) { moved.className = 'moved down'; moved.textContent = '▼ o ' + (-m.moved) + ' dolů'; }
    else { moved.className = 'moved flat'; moved.textContent = 'Beze změny pořadí'; }

    $('res-rank').textContent = m.rank + '. místo z ' + m.of + ' · ' + m.score + ' bodů';
    $('scr-result').classList.toggle('good', ok);
    vibrate(ok ? [30, 60, 30] : 120);
    show('scr-result');
  }

  function renderPlayerEnd(m) {
    const won = m.rank === 1;
    $('pe-icon').textContent = ['🥇', '🥈', '🥉'][m.rank - 1] || '🏁';
    $('pe-place').textContent = won ? 'Vyhrál jsi!' : m.rank + '. místo z ' + m.of;
    const best = (m.board || []).filter((x) => x.name === P.name)[0];
    $('pe-score').textContent = m.score + ' bodů'
      + (best && best.best > 1 ? ' · nejdelší série 🔥' + best.best : '');
    show('scr-pend');
    vibrate(won ? [60, 60, 60, 60, 200] : [40, 80, 40]);
  }

  /* ============================================================== ovládání */

  $('btn-host').addEventListener('click', () => {
    if (H.peer) return;   /* dvojklik na dálkovém ovladači = dvě hry naráz */
    beep(600, 0.05, 0.03);
    hostStart(0);
  });

  function goJoin() {
    const code = $('in-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) { toast('Zadej čtyřznakový kód z televize.'); return; }
    location.hash = code;
    playerBoot(code);
  }
  $('btn-gojoin').addEventListener('click', goJoin);
  $('in-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') goJoin(); });

  /* kód se sám převádí na velká písmena a po čtvrtém znaku rovnou pokračuje */
  $('in-code').addEventListener('input', () => {
    const f = $('in-code');
    const v = f.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    if (v !== f.value) f.value = v;
    if (v.length === 4) goJoin();
  });

  function renderVoiceBtn() {
    const b = $('btn-voice');
    const info = $('voice-info');
    if (!b || !info) return;
    b.textContent = SPEECH.on ? '🔊 Čte otázky' : '🔇 Nečte otázky';
    b.classList.toggle('warn', SPEECH.on && (!speechAvailable() || SPEECH.broken || (SPEECH.probed && !SPEECH.voice)));
    info.textContent = voiceStatus();
  }
  renderVoiceBtn();

  $('btn-voice').addEventListener('click', () => {
    SPEECH.on = !SPEECH.on;
    store('voice', SPEECH.on ? '1' : '0');
    stopSpeech();
    renderVoiceBtn();
    renderReader();
    if (SPEECH.on) {
      SPEECH.broken = false;
      /* čte-li telefon, zkouška patří jemu, jinak si ji vezme televize */
      const r = readerPlayer();
      if (r) send(r, { t: 'speak', text: 'Zkouška hlasu. Otázky budu číst já.', id: -1 });
      else speak('Zkouška hlasu. Můžeme hrát.', renderVoiceBtn);
    }
  });

  $('btn-readtest').addEventListener('click', () => {
    phoneSpeak('Zkouška hlasu. Otázky budu číst já.', -1);
  });

  $('btn-readclaim').addEventListener('click', () => {
    try { if (P.conn && P.conn.open) P.conn.send({ t: 'claim' }); } catch (e) {}
    /* klepnutí zároveň odemkne zvuk, takže rovnou i zkouška */
    phoneSpeak('Otázky teď čtu já.', -1);
  });

  $('btn-fs').addEventListener('click', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) {}
  });

  $('btn-start').addEventListener('click', () => { if (H.state === 'lobby') beginGame(); });
  $('btn-again').addEventListener('click', () => { if (H.state === 'end') backToLobby(); });

  $('btn-join').addEventListener('click', () => {
    const name = $('in-name').value.replace(/\s+/g, ' ').trim().slice(0, 12);
    if (!name) { toast('Napiš si jméno.'); return; }
    P.name = name;
    store('name', name);
    beep(700, 0.05, 0.03);
    pconnect();
  });
  $('in-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-join').click(); });

  $('btn-pstart').addEventListener('click', () => {
    try { if (P.conn && P.conn.open) P.conn.send({ t: 'start' }); } catch (e) {}
    $('btn-pstart').hidden = true;
  });

  $('btn-pagain').addEventListener('click', () => {
    try { if (P.conn && P.conn.open) P.conn.send({ t: 'again' }); } catch (e) {}
    showWait('Čekáme na další hru…', '', false);
  });

  /* klávesnice na TV (funguje i s dálkovým ovladačem, který posílá Enter) */
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    if (H.state === 'lobby' && !$('btn-start').disabled) { e.preventDefault(); beginGame(); }
    else if (H.state === 'intro') { e.preventDefault(); beginReading(); }
    else if (H.state === 'reading') { e.preventDefault(); startAnswering(); }
    else if (H.state === 'reveal') { e.preventDefault(); nextQuestion(); }
    else if (H.state === 'end') { e.preventDefault(); backToLobby(); }
  });

  /* telefon se probudí po uspání → hned zkusit spojení */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!document.body.classList.contains('mode-phone') || !P.name) return;
    /* po uspání se spojení často tváří jako otevřené, ale je mrtvé */
    const stale = P.hb && Date.now() - P.heard > P.hb * 2;
    if (!P.conn || !P.conn.open || stale) { P.tries = 0; pconnect(); }
  });

  /* ================================================================= start */

  if (typeof Peer !== 'function') {
    fail('Nepodařilo se načíst knihovnu pro spojení. Zkontroluj připojení k internetu.');
  } else {
    const hash = location.hash.replace(/^#/, '').replace(/^room=/i, '').trim().toUpperCase();
    if (/^[A-Z0-9]{4}$/.test(hash)) playerBoot(hash);
    else show('scr-start');
  }
})();
