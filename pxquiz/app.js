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
  const MAX_PLAYERS = 8;
  const SHAPES = ['▲', '◆', '●', '■'];
  const PEER_OPTS = { debug: 1 };

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
    if (document.visibilityState === 'visible' && document.body.classList.contains('mode-tv') && !wakeLock) keepAwake();
  });

  /* ============================================================ TV / HOST */

  const H = {
    peer: null,
    code: '',
    players: new Map(),
    deck: [],
    qi: -1,
    state: 'idle',
    deadline: 0,
    raf: 0,
    timer: 0,
    readTimer: 0,
    lastSec: -1
  };

  /* ---------------------------------------- předčítání otázky na televizi */

  const SPEECH = { on: store('voice') !== '0', voice: null };

  function speechAvailable() {
    return typeof window.speechSynthesis !== 'undefined'
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices() || [];
      SPEECH.voice = vs.filter((v) => /^cs/i.test(v.lang))[0] || null;
    } catch (e) {}
  }

  if (speechAvailable()) {
    pickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {}
  }

  function stopSpeech() {
    clearTimeout(H.readTimer);
    H.readTimer = 0;
    try { if (speechAvailable()) speechSynthesis.cancel(); } catch (e) {}
  }

  /* Přečte text a zavolá done(). Když hlas chybí nebo se zasekne, pokračuje
     se podle odhadu délky, ať hra nikdy nezůstane viset. */
  function speak(text, done) {
    let finished = false;
    let guard = 0;
    let startGuard = 0;
    const estimate = Math.min(14000, Math.max(2000, 600 + text.length * 80));

    const finish = (cancel) => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      clearTimeout(startGuard);
      if (cancel) { try { speechSynthesis.cancel(); } catch (e) {} }
      done();
    };

    if (!SPEECH.on || !speechAvailable()) {
      H.readTimer = setTimeout(finish, 250);
      return;
    }

    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'cs-CZ';
      if (SPEECH.voice) u.voice = SPEECH.voice;
      u.rate = 0.97;
      u.onend = () => finish(false);
      u.onerror = () => finish(false);
      u.onstart = () => { clearTimeout(startGuard); };
      speechSynthesis.speak(u);
      /* hlas se vůbec nerozjel (chybí česká hlasová sada) */
      startGuard = setTimeout(() => finish(true), 1500);
      /* hlas se rozjel, ale zasekl se */
      guard = setTimeout(() => finish(true), estimate + 5000);
      H.readTimer = guard;
    } catch (e) {
      H.readTimer = setTimeout(finish, 250);
    }
  }

  function hostStart(attempt) {
    document.body.classList.add('mode-tv');
    const code = randomCode();
    const peer = new Peer(PREFIX + code, PEER_OPTS);
    H.peer = peer;

    peer.on('open', () => {
      H.code = code;
      H.state = 'lobby';
      renderLobby();
      renderPlayers();
      show('scr-lobby');
      keepAwake();
    });

    peer.on('connection', hostOnConn);
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && attempt < 6) {
        try { peer.destroy(); } catch (e) {}
        hostStart(attempt + 1);
        return;
      }
      if (err.type === 'peer-unavailable') return;
      if (err.type === 'network' || err.type === 'socket-error') {
        toast('Výpadek spojení, obnovuji…');
        return;
      }
      fail('Hru se nepodařilo spustit (' + err.type + '). Zkontroluj připojení k internetu a zkus to znovu.');
    });
  }

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
    conn.on('close', () => {
      const p = playerByConn(conn);
      if (p) { p.online = false; renderPlayers(); renderAnswered(); }
    });
    conn.on('error', () => {});
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
    if (m.t === 'answer') hostAnswer(p, m.i);
    else if (m.t === 'start' && H.state === 'lobby') beginGame();
    else if (m.t === 'again' && H.state === 'end') backToLobby();
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
      p = { pid: pid, name: uniqueName(name, pid), conn: conn, score: 0, online: true, ans: null, at: 0, gain: 0 };
      H.players.set(pid, p);
      beep(760, 0.09, 0.05);
      setTimeout(() => beep(1010, 0.09, 0.05), 90);
    } else {
      if (p.conn && p.conn !== conn) { try { p.conn.close(); } catch (e) {} }
      p.conn = conn;
      p.online = true;
      p.name = uniqueName(name, pid);
    }

    send(p, { t: 'welcome', name: p.name, score: p.score });
    renderPlayers();
    renderAnswered();
    syncPlayer(p);
  }

  /* pošle nově připojenému (nebo vrátivšímu se) hráči aktuální stav */
  function syncPlayer(p) {
    if (H.state === 'lobby') {
      sendLobby();
    } else if (H.state === 'reading') {
      send(p, { t: 'reading', n: H.qi + 1, total: H.deck.length });
    } else if (H.state === 'question') {
      const q = H.deck[H.qi];
      send(p, {
        t: 'question', n: H.qi + 1, total: H.deck.length, cat: q.c, q: q.q, a: q.a,
        ms: Math.max(0, H.deadline - performance.now())
      });
      if (p.ans !== null) send(p, { t: 'locked', i: p.ans });
    } else if (H.state === 'reveal') {
      const q = H.deck[H.qi];
      const board = ranking();
      send(p, {
        t: 'reveal', k: q.k, mine: p.ans, gain: p.gain, score: p.score,
        rank: rankOf(board, p.pid), of: board.length
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
    clearTimeout(H.timer);
    stopSpeech();
    H.raf = 0;
    H.timer = 0;
  }

  function beginGame() {
    H.deck = shuffle(QUESTIONS.slice()).slice(0, ROUNDS);
    H.qi = -1;
    H.players.forEach((p) => { p.score = 0; p.gain = 0; p.ans = null; });
    nextQuestion();
  }

  function backToLobby() {
    clearTimers();
    H.state = 'lobby';
    H.qi = -1;
    H.players.forEach((p) => { p.score = 0; p.gain = 0; p.ans = null; });
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
    H.state = 'reading';
    H.lastSec = -1;
    H.players.forEach((p) => { p.ans = null; p.at = 0; p.gain = 0; });

    broadcast({ t: 'reading', n: H.qi + 1, total: H.deck.length });
    renderQuestion(q);
    show('scr-q');

    speak(q.q, startAnswering);
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

    broadcast({ t: 'question', n: H.qi + 1, total: H.deck.length, cat: q.c, q: q.q, a: q.a, ms: Q_TIME });

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

  function finishQuestion() {
    if (H.state !== 'question') return;
    clearTimers();
    H.state = 'reveal';

    const q = H.deck[H.qi];
    H.players.forEach((p) => {
      p.gain = 0;
      if (p.ans === q.k) {
        p.gain = 500 + Math.round(500 * Math.max(0, 1 - p.at / Q_TIME));
        p.score += p.gain;
      }
    });

    const board = ranking();
    H.players.forEach((p) => send(p, {
      t: 'reveal', k: q.k, mine: p.ans, gain: p.gain, score: p.score,
      rank: rankOf(board, p.pid), of: board.length
    }));

    renderReveal(q, board);
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
    return board.map((p) => ({ name: p.name, score: p.score }));
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

  function renderPlayers() {
    const wrap = $('lobby-players');
    wrap.innerHTML = '';
    const list = ranking();
    list.forEach((p) => {
      const fresh = !seenChips.has(p.pid);
      seenChips.add(p.pid);
      wrap.appendChild(el('div', 'chip' + (p.online ? '' : ' off') + (fresh ? ' fresh' : ''), p.name));
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
      wrap.appendChild(el('div', 'chip' + (p.ans !== null ? ' done' : ''), p.name));
    });
  }

  function renderReveal(q, board) {
    $('r-cat').textContent = q.c;
    $('r-num').textContent = 'Otázka ' + (H.qi + 1) + '/' + H.deck.length;
    $('r-text').textContent = q.q;
    renderPips($('r-pips'), H.qi + 1);
    const nodes = answerNodes(q, $('r-answers'));
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].classList.add(i === q.k ? 'win' : 'faded');
    }

    const wrap = $('r-board');
    wrap.innerHTML = '';
    board.forEach((p, i) => {
      const row = el('div', 'brow' + (i === 0 && p.score > 0 ? ' top' : ''));
      row.appendChild(el('span', 'pos', (i + 1) + '.'));
      row.appendChild(el('span', null, p.name + (p.online ? '' : ' (odpojen)')));
      row.appendChild(el('span', 'gain' + (p.gain ? '' : ' zero'), p.gain ? '+' + p.gain : (p.ans === null ? '—' : '+0')));
      row.appendChild(el('span', 'sc', String(p.score)));
      wrap.appendChild(row);
    });
  }

  function renderEnd(board) {
    const medals = ['🥇', '🥈', '🥉'];
    const wrap = $('e-board');
    wrap.innerHTML = '';
    board.forEach((p, i) => {
      const row = el('div', 'brow' + (i === 0 ? ' top' : ''));
      row.appendChild(el('span', 'pos', medals[i] || (i + 1) + '.'));
      row.appendChild(el('span', null, p.name));
      row.appendChild(el('span', 'gain zero', ''));
      row.appendChild(el('span', 'sc', String(p.score)));
      wrap.appendChild(row);
    });
  }

  /* ======================================================= TELEFON / HRÁČ */

  const P = {
    peer: null, conn: null, code: '', name: '', pid: '',
    score: 0, joined: false, tries: 0, retryTimer: 0, locked: false
  };

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

  function cleanupPeer() {
    try { if (P.conn) P.conn.close(); } catch (e) {}
    try { if (P.peer) P.peer.destroy(); } catch (e) {}
    P.conn = null;
    P.peer = null;
  }

  function pconnect() {
    clearTimeout(P.retryTimer);
    P.retryTimer = 0;
    if (!P.joined) showWait('Připojuji…', 'Hra ' + P.code);

    cleanupPeer();
    const peer = new Peer(PEER_OPTS);
    P.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(PREFIX + P.code, { reliable: true });
      P.conn = conn;
      conn.on('open', () => {
        P.tries = 0;
        conn.send({ t: 'join', pid: P.pid, name: P.name });
      });
      conn.on('data', playerMsg);
      conn.on('close', () => reconnectLater());
      conn.on('error', () => reconnectLater());
    });

    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });

    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable' && !P.joined) {
        fail('Hra s kódem ' + P.code + ' neběží. Zkontroluj kód na televizi.');
        return;
      }
      reconnectLater();
    });
  }

  function reconnectLater() {
    if (P.retryTimer) return;
    P.tries++;
    if (P.tries > 12) {
      fail('Spojení s televizí se nepodařilo obnovit.');
      return;
    }
    if (P.joined) toast('Spojení přerušeno, obnovuji…', 1800);
    const delay = Math.min(8000, 700 * Math.pow(1.7, P.tries - 1));
    P.retryTimer = setTimeout(() => { P.retryTimer = 0; pconnect(); }, delay);
  }

  function playerMsg(m) {
    if (!m || typeof m !== 'object') return;

    switch (m.t) {
      case 'welcome':
        P.joined = true;
        P.name = m.name;
        P.score = m.score;
        $('p-name').textContent = m.name;
        $('p-score').textContent = m.score;
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

      case 'reading':
        $('btn-pstart').hidden = true;
        showWait('🔊 Otázka ' + m.n + ' z ' + m.total, 'Poslouchej zadání na televizi…', false);
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
    $('res-rank').textContent = m.rank + '. místo z ' + m.of + ' · ' + m.score + ' bodů';
    vibrate(ok ? [30, 60, 30] : 120);
    show('scr-result');
  }

  function renderPlayerEnd(m) {
    $('pe-icon').textContent = ['🥇', '🥈', '🥉'][m.rank - 1] || '🏁';
    $('pe-place').textContent = m.rank + '. místo z ' + m.of;
    $('pe-score').textContent = m.score + ' bodů';
    show('scr-pend');
    vibrate([40, 80, 40, 80, 120]);
  }

  /* ============================================================== ovládání */

  $('btn-host').addEventListener('click', () => { beep(600, 0.05, 0.03); hostStart(0); });

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
    if (!speechAvailable()) {
      b.hidden = true;
      return;
    }
    b.textContent = SPEECH.on ? '🔊 Čte otázky' : '🔇 Nečte otázky';
  }
  renderVoiceBtn();

  $('btn-voice').addEventListener('click', () => {
    SPEECH.on = !SPEECH.on;
    store('voice', SPEECH.on ? '1' : '0');
    if (!SPEECH.on) stopSpeech();
    renderVoiceBtn();
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
    else if (H.state === 'reading') { e.preventDefault(); startAnswering(); }
    else if (H.state === 'reveal') { e.preventDefault(); nextQuestion(); }
    else if (H.state === 'end') { e.preventDefault(); backToLobby(); }
  });

  /* telefon se probudí po uspání → hned zkusit spojení */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!document.body.classList.contains('mode-phone') || !P.name) return;
    if (!P.conn || !P.conn.open) { P.tries = 0; pconnect(); }
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
