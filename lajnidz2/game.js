'use strict';
/* Lajnidž II – Kronika nekonečného grindu
   Zjednodušená a nepříliš vážná single-player parodie na jedno korejské MMO. */
(() => {

// ============================================================
//  Pomocníci
// ============================================================
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = n => Math.floor(n).toLocaleString('cs-CZ');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SAVE_KEY = 'lajnidz2-save-v1';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

// ============================================================
//  Data
// ============================================================
const RACES = {
  human: { name: 'Člověk', body: '#3a6ea5', skin: '#f1d3b0', hp: 1, mp: 1, atk: 1, spd: 1, adena: 1, scale: 1,
    desc: 'Průměrný ve všem. Přesně jako v reálném životě.' },
  elf: { name: 'Elf', body: '#4fa36b', skin: '#f6e1c8', hp: .9, mp: 1.15, atk: .95, spd: 1.25, adena: 1, scale: 1, ears: 1,
    desc: 'O 25 % rychlejší. Krásný a dá ti to sežrat.' },
  delf: { name: 'Temný elf', body: '#5b3790', skin: '#a99cc8', hp: .85, mp: 1.1, atk: 1.25, spd: 1.1, adena: 1, scale: 1, ears: 1,
    desc: 'Nejvíc damage, nejmíň HP. Nosí černou, protože je to edgy.' },
  orc: { name: 'Ork', body: '#a5532f', skin: '#7a9a54', hp: 1.35, mp: .8, atk: 1.05, spd: .95, adena: 1, scale: 1.15, tusks: 1,
    desc: 'HP jako tank, slovník na 40 slov. Z toho 30 je „RAAAH".' },
  dwarf: { name: 'Trpaslík', body: '#b58b2a', skin: '#e8c29a', hp: 1.1, mp: .9, atk: .95, spd: .9, adena: 1.6, scale: .82, beard: 1,
    desc: 'Malé nohy, velká peněženka. +60 % adeny z každého moba.' },
};

const GRADES = ['–', 'D', 'C', 'B', 'A', 'S'];
const WEAPONS = [
  { name: 'Klacek', g: 0, atk: 4, price: 0, lv: 1, d: 'Nalezen u cesty. Voní lesem.' },
  { name: 'Rezavý meč', g: 0, atk: 10, price: 250, lv: 3, d: 'Tetanus v ceně.' },
  { name: 'Meč revoluce', g: 1, atk: 24, price: 1800, lv: 9, d: 'Revoluční hlavně cenou.' },
  { name: 'Katana', g: 2, atk: 46, price: 7000, lv: 17, d: 'Přeložena 1000× z angličtiny do češtiny.' },
  { name: 'Meč Valhally', g: 3, atk: 75, price: 22000, lv: 25, d: 'Vikingové ho vrátili, prý moc těžký.' },
  { name: 'Tallum Blade', g: 4, atk: 115, price: 55000, lv: 32, d: 'Svítí i na +0. Skoro.' },
  { name: 'Zapomenutá čepel', g: 5, atk: 170, price: 120000, lv: 40, d: 'Zapomněl ji tu někdo, kdo šel na oběd v roce 2006.' },
];
const ARMORS = [
  { name: 'Košile s dírou', g: 0, def: 0, hp: 0, price: 0, lv: 1, d: 'Ta díra je pro ventilaci.' },
  { name: 'Kožená zbroj', g: 0, def: 5, hp: 20, price: 200, lv: 3, d: 'Z keltíra. Promiň, keltíre.' },
  { name: 'Brigandina', g: 1, def: 14, hp: 60, price: 1500, lv: 9, d: 'Zní jako těstoviny, chrání jako zbroj.' },
  { name: 'Plnoplátová zbroj', g: 2, def: 28, hp: 140, price: 6000, lv: 17, d: 'Cinká. Mobové tě slyší z druhého kontinentu.' },
  { name: 'Zbroj Modrého vlka', g: 3, def: 46, hp: 250, price: 19000, lv: 25, d: 'Vlk byl modrý už předtím. Nevyptávej se.' },
  { name: 'Temná krystalová zbroj', g: 4, def: 70, hp: 400, price: 48000, lv: 32, d: 'Temná, krystalová a hlavně drahá.' },
  { name: 'Drakonská zbroj', g: 5, def: 100, hp: 600, price: 105000, lv: 40, d: 'Žádný drak nebyl zraněn. Jen trochu.' },
];
const SS_COST = [1, 2, 4, 7, 11, 16];               // adena za 1 soulshot podle gradu zbraně
const SCROLL_W = [60, 300, 900, 2400, 5500, 11000]; // svitek zaklínání zbraně
const SCROLL_A = [30, 140, 420, 1100, 2600, 5000];  // svitek zaklínání zbroje
const POT_PRICE = 20, SOE_PRICE = 150;

const SKILLS = [
  { id: 'ps', key: '1', icon: '💥', name: 'Silný úder', lv: 1, cd: 4, mp: L => 4 + L * .5, type: 'hit', mult: 2.2,
    d: 'Praštíš silněji. Revoluční technologie.' },
  { id: 'heal', key: '2', icon: '💚', name: 'Ošetři se', lv: 3, cd: 14, mp: L => 8 + L, type: 'heal',
    d: 'Obnoví 35 % HP. Doktoři tuhle dovednost nenávidí.' },
  { id: 'ww', key: '3', icon: '💨', name: 'Větrná chůze', lv: 7, cd: 40, mp: L => 10 + L * .5, type: 'buff', dur: 30,
    d: '+35 % rychlost pohybu na 30 s. Na útěk ideální.' },
  { id: 'whirl', key: '4', icon: '🌀', name: 'Vír čepelí', lv: 13, cd: 7, mp: L => 10 + L, type: 'aoe', mult: 1.5,
    d: 'Zasáhne všechno kolem. I moby, co ti nic neudělali.' },
  { id: 'ud', key: '5', icon: '🛡️', name: 'Ultimátní obrana', lv: 21, cd: 60, mp: L => 20 + L, type: 'ud', dur: 8,
    d: '−90 % poškození na 8 s, ale nehneš se z místa. Klasika.' },
  { id: 'lethal', key: '6', icon: '☠️', name: 'Smrtící úder', lv: 29, cd: 15, mp: L => 20 + L, type: 'hit', mult: 4, lethal: true,
    d: '4× poškození a 10% šance zabít běžného moba na fleku.' },
];

const BUFF_INFO = {
  might: { icon: '💪', name: 'Síla (+15 % útok)' },
  shield: { icon: '🧱', name: 'Štít (+15 % obrana)' },
  haste: { icon: '⚡', name: 'Spěch (+30 % rychlost útoku)' },
  wind: { icon: '🍃', name: 'Vítr (+15 % pohyb)' },
  ww: { icon: '💨', name: 'Větrná chůze (+35 % pohyb)' },
  ud: { icon: '🛡️', name: 'Ultimátní obrana' },
};

// typ moba: [jméno, emoji, level, vlastnosti]
const ZONES = {
  town: { name: 'Giran', town: true, w: 1400, h: 1000, spawn: [700, 640], base: '#6c6352', tile: '#7b715f' },
  ti: { name: 'Mluvící ostrov', lvTxt: '1–8', price: 0, w: 2000, h: 1500, spawn: [160, 750],
    base: '#3f7a3a', blot: '#57923f', decor: ['🌳', '🌲', '🌿', '🌼', '🌷', '🌾'], decorN: 110, count: 18,
    junk: ['Zvířecí kůže', 'Gremlinova ponožka'],
    note: 'Pro začátečníky. Mobové tu ještě nevědí, že by se měli bránit.',
    mobs: [
      ['Gremlin', '👺', 1, {}], ['Keltír', '🦊', 2, {}], ['Elpí', '🐰', 3, { flee: 1, spd: 1.2 }],
      ['Divočák', '🐗', 5, { agr: 1 }], ['Vlk', '🐺', 6, { agr: 1, spd: 1.2 }], ['Zlá houba', '🍄', 8, { hp: 1.3, spd: .6 }],
    ] },
  ruins: { name: 'Ruiny Agónie', lvTxt: '8–16', price: 500, w: 2200, h: 1600, spawn: [180, 800],
    base: '#5b5340', blot: '#6e6550', decor: ['🏚️', '⚰️', '🌵', '🦴', '🗿'], decorN: 90, count: 18,
    junk: ['Kostní prach', 'Rezavý hřebík'],
    note: 'Kostlivci, zombíci a jeden velmi nepříjemný daňový poradce.',
    mobs: [
      ['Kostlivec', '💀', 9, { agr: 1 }], ['Zombík', '🧟', 11, { hp: 1.3, spd: .6 }], ['Ork bojovník', '👹', 13, { agr: 1 }],
      ['Netopýr', '🦇', 14, { hp: .7, spd: 1.6 }], ['Nemrtvý daňový poradce', '🧛', 16, { agr: 1, adena: 2 }],
    ] },
  swamp: { name: 'Bažina Kruma', lvTxt: '16–24', price: 2000, w: 2200, h: 1600, spawn: [180, 800],
    base: '#34483a', blot: '#2c5a4a', decor: ['🌿', '🍂', '🌾', '🍄', '🌳'], decorN: 100, count: 18,
    junk: ['Bažinné bahno', 'Ještěří šupina'],
    note: 'Smrdí to tu. Mobové i hráči.',
    mobs: [
      ['Ještěrák', '🦎', 17, {}], ['Krokodýl', '🐊', 19, { agr: 1, hp: 1.2 }], ['Pavouk', '🕷️', 21, { agr: 1, spd: 1.3 }],
      ['Bažinný duch', '👻', 23, { hp: .9, atk: 1.2 }],
    ] },
  tower: { name: 'Věž Kruma', lvTxt: '24–32', price: 6000, w: 2000, h: 1500, spawn: [160, 750],
    base: '#47434f', tile: '#524d5c', decor: ['🕯️', '⛓️', '🏺', '🗝️'], decorN: 70, count: 18,
    junk: ['Úlomek golema', 'Šroubek'],
    note: 'Pozor na truhly. Ne každá truhla je truhla.',
    mobs: [
      ['Golem', '🗿', 25, { hp: 1.6, atk: .9, spd: .55 }], ['Robot', '🤖', 27, {}], ['Démon', '😈', 29, { agr: 1 }],
      ['Truhla (určitě ne mimik)', '📦', 31, { adena: 4, hp: 1.2, spd: .8, mimic: 1 }],
    ] },
  valley: { name: 'Dračí údolí', lvTxt: '32–42', price: 15000, w: 2400, h: 1700, spawn: [180, 850],
    base: '#6a4a33', blot: '#7d5a3c', decor: ['🌋', '🦴', '🌵', '🔥', '⛰️'], decorN: 90, count: 18,
    junk: ['Dračí šupina', 'Spálená sušenka'],
    note: 'Draci, dinosauři a ohnivé věci. Doporučeno vzít si lektvary. Hodně lektvarů.',
    mobs: [
      ['Dinosaurus', '🦖', 33, { agr: 1 }], ['Mladý drak', '🐉', 36, { hp: 1.2 }], ['Ohnivý elementál', '🔥', 39, { agr: 1, atk: 1.15 }],
      ['Kostěný drak', '☠️', 41, { hp: 1.4, agr: 1 }],
    ] },
  lair: { name: 'Antharasovo doupě', lvTxt: '40+', price: 50000, w: 1400, h: 1100, spawn: [700, 980],
    base: '#3a2420', blot: '#5a2a1c', decor: ['🦴', '💀', '🔥', '💎'], decorN: 40, boss: true,
    note: 'Raid boss Antharas. Na oficiálním serveru na něj chodí 200 lidí. Ty jdeš sám. Hodně štěstí.' },
};
const ZONE_ORDER = ['ti', 'ruins', 'swamp', 'tower', 'valley', 'lair'];

const TOWN_NPCS = [
  { id: 'gk', name: 'Gatekeeper Ludmila', title: 'Teleporty', e: '🧙', x: 700, y: 300 },
  { id: 'shop', name: 'Hokynář Vendelín', title: 'Smíšené zboží', e: '🤵', x: 420, y: 430 },
  { id: 'arm', name: 'Zbrojíř Bohouš', title: 'Zbraně a zbroj', e: '💂', x: 980, y: 430 },
  { id: 'smith', name: 'Kovář Pepa', title: 'Zaklínání', e: '👷', x: 1100, y: 650 },
  { id: 'buff', name: 'Bufferka Bára', title: 'Buffy pro nováčky', e: '🧚', x: 300, y: 650 },
  { id: 'wh', name: 'Skladník Ota', title: 'Sklad', e: '📦', x: 700, y: 860 },
];
const TOWN_SHOPS = [
  { id: 'scam', name: 'xX_Legolas_Xx', msg: 'WTS Draconic Bow LEVNĚ!!!', x: 540, y: 560, col: '#3d8b5a' },
  { id: 'ssbot', name: 'Bot_Pepa_07', msg: 'Soulshoty -40 %', x: 860, y: 560, col: '#555' },
  { id: 'babka', name: 'BabkaZGiranu', msg: 'Vykupuji VŠECHNO', x: 560, y: 740, col: '#9a5b8a' },
  { id: 'party', name: 'MegaOrk', msg: 'LF parta na Antharase (máme 2+bot)', x: 860, y: 740, col: '#a5532f' },
  { id: 'acc', name: 'Zlatokop69', msg: 'Prodám účet lvl 80, 3000 Kč', x: 1180, y: 860, col: '#b58b2a' },
];

const FAKE_NAMES = ['xXLegolasXx', 'ZabijakPetr', 'Bot_123', 'ElfíPrincezna', 'Tank_Tonda', 'DarkLord2006', 'HealPls', 'Kekel',
  'Orčík', 'Kuba_z_Brna', 'NoobSlayer', 'AFK_Mirek', 'SoulshotSam', 'Pavel_Spoil', 'Trpajzlík', 'Mág_Bohouš', 'Lucka_DE',
  'ShadowKiller', 'Babička', 'xXxDarkElfxXx', 'Farmář', 'Bot_456', 'Sven', 'Jarmila'];
const PK_NAMES = ['PKčko_Rambo', 'Zlobivý_Zdeněk', 'KarmaNula', 'RudýJarda', 'Gankster'];
const FAKE_COLORS = ['#3a6ea5', '#4fa36b', '#5b3790', '#a5532f', '#b58b2a', '#8a3a5a', '#2f7a7a', '#777'];

const CHAT_LINES = [
  ['trade', 'WTS Draconic Bow, PM'], ['trade', 'WTB soulshoty, platím adenou nebo objetím'],
  ['trade', '+++ PRODÁM ÚČET LVL 76 +++'], ['trade', 'WTS +3 Klacek, safe enchant, nabídněte'],
  ['trade', 'VYKUPUJI KOSTI. VŠECHNY. NEPTEJTE SE PROČ.'], ['trade', 'WTB Tallum Blade, mám 300 adena a dobrý úmysly'],
  ['trade', 'WTS Gremlinova ponožka, jen jednou nošená'], ['trade', 'WTT Elpí za Keltíra'],
  ['shout', 'LF healer do party, máme 3 warlordy a jednoho ztraceného elfa'], ['shout', 'GM POMOC zasekl jsem se v texturách od roku 2004'],
  ['shout', 'kdo jde Baiuma? spí, vzbudíme ho'], ['shout', 'Antharas se spawnul?? ne??? ok'],
  ['shout', 'KDO MI VYKRADL MOBA, UKAŽ SE'], ['shout', 'zase lag v Giranu'], ['shout', 'buff pls'],
  ['normal', 'kde je Kruma?'], ['normal', 'proč mi zase prasknul meč na +4'], ['normal', 'lol'],
  ['normal', 'kdo je ten bot u Elpí?'], ['normal', 'potřebuju 2 adeny na SoE, pls'], ['normal', 'jsem tank. tank čeho? nevím'],
  ['normal', 'Elpí mi utekla s dropem'], ['normal', 'máma volá na večeři, nezabíjejte mě, jsem AFK'],
  ['normal', 'kdo vypnul server? aha, to mi jen spadla wifi'], ['normal', 'hele, nekupujte od Legolase, je to podvod'],
  ['normal', 'mám lvl 40 a pořád nevím, co je CP'], ['normal', 'soulshoty sežraly víc adeny než můj nájem'],
  ['normal', '+5 safe? ne? ...aha'], ['normal', 'grindím 6 hodin a mám 3 % xp'], ['normal', 'kdo mi dá buff, dám mu lajk'],
];
const CHAT_REPLIES = ['lol', 'noob', 'kup si soulshoty', 'tohle není trade chat', 'kdo se ptal', '+1', 'jo jo', 'co?',
  'WTS odpověď, 500 adena', 'jsi bot?', 'zkus /unstuck', 'v Ruinách to jde dobře', 'hahaha', 'pls buff', 'teď ne, farmím',
  'souhlas', 'nesouhlas', '😂', 'gg', 'to zažil můj děda v C1', 'ok boomer', 'mám lag, opakuj to', 'sorry, AFK'];

// ============================================================
//  Stav
// ============================================================
let S = null;                  // ukládaná data postavy
const pl = {                   // runtime hráče
  x: 0, y: 0, r: 14, face: { x: 0, y: 1 }, moveTo: null, target: null, interact: null, attacking: false,
  atkCd: 0, swing: 0, sitting: false, dead: false, cast: null, queued: null, auto: false, jailUntil: 0, buffs: {}, hitT: 0, walkT: 0,
};
let Z = null, zoneId = 'town', bg = null;
let mobs = [], fakes = [], npcs = [], floats = [], fx = [], tele = [];
let T = 0;                      // herní čas v s
const cds = {};                 // cooldowny dovedností
let pkAt = 0, chatAt = 0, botCheckAt = 0, gm = null, onlineN = 3412, saveAt = 0, hudAt = 0;
const keys = {};
const bgCache = {};
let cam = { x: 0, y: 0 };
let running = false;

const freshSave = (name, race) => ({
  v: 1, name, race, level: 1, xp: 0, adena: 200, hp: 1e9, mp: 1e9,
  inv: { pot: 5, ss: 100, soe: 2, sw: 0, sa: 0 }, junk: {},
  weapon: { id: 0, e: 0 }, armor: { id: 0, e: 0 }, jewel: false, title: 'Nováček', ssOn: true,
  zone: 'town', bossDeadAt: 0,
  st: { kills: 0, deaths: 0, ks: 0, pks: 0, fails: 0, jails: 0, boss: 0, time: 0, best: 0 },
});

// ============================================================
//  Výpočty
// ============================================================
const xpNeed = L => Math.round(26 * Math.pow(L, 1.85) + 20);
const mobXp = lv => Math.round(10 * Math.pow(lv, 1.5) + 5);
const enchMul = e => e <= 3 ? e * .08 : .24 + (e - 3) * .15;
const enchChance = e => e < 3 ? 1 : Math.max(.25, .66 - (e - 3) * .06);   // e = aktuální stav, šance na +1

function stats() {
  const r = RACES[S.race], L = S.level, w = WEAPONS[S.weapon.id], a = ARMORS[S.armor.id];
  let patk = (6 + 2.2 * (L - 1)) * r.atk + w.atk * (1 + enchMul(S.weapon.e));
  let pdef = 2 + L + a.def * (1 + enchMul(S.armor.e));
  let maxHp = (80 + 22 * (L - 1)) * r.hp + a.hp * (1 + enchMul(S.armor.e) * .5);
  let maxMp = (40 + 9 * (L - 1)) * r.mp;
  let spd = 150 * r.spd, aspd = 1.1;
  const b = pl.buffs;
  if (b.might > T) patk *= 1.15;
  if (b.shield > T) pdef *= 1.15;
  if (b.haste > T) aspd *= 1.3;
  if (b.wind > T) spd *= 1.15;
  if (b.ww > T) spd *= 1.35;
  if (S.jewel) { patk *= 1.1; pdef *= 1.1; maxHp *= 1.1; }
  return { patk, pdef, maxHp: Math.round(maxHp), maxMp: Math.round(maxMp), spd, aspd, crit: r === RACES.delf ? .15 : .1 };
}

function mobColor(lv) {
  const d = lv - S.level;
  if (d <= -6) return '#9a9a9a';
  if (d <= -3) return '#7fb6ff';
  if (d <= 2) return '#ffffff';
  if (d <= 5) return '#ffd75e';
  return '#ff6b6b';
}

// ============================================================
//  Chat a hlášky
// ============================================================
const logEl = $('#log');
function chat(text, cls = 'sys', who = null) {
  const d = document.createElement('div');
  d.className = cls;
  const pre = cls === 'trade' ? '+' : cls === 'shout' ? '!' : '';
  d.innerHTML = who ? `${pre}<b>${esc(who)}</b>: ${esc(text)}` : esc(text);
  const atBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 30;
  logEl.appendChild(d);
  while (logEl.children.length > 120) logEl.removeChild(logEl.firstChild);
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}
const sys = t => chat(t, 'sys');
let lastSysSpam = {};
function sysOnce(key, t, sec = 6) { if ((lastSysSpam[key] || -99) + sec < T) { lastSysSpam[key] = T; sys(t); } }

function float(x, y, txt, col = '#fff', big = false) {
  floats.push({ x: x + rand(-6, 6), y, txt, col, t0: T, big });
}

let bannerTO = 0;
function banner(t1, t2 = '') {
  const b = $('#banner');
  b.innerHTML = `<div class="b1">${esc(t1)}</div><div class="b2">${esc(t2)}</div>`;
  b.classList.add('show');
  clearTimeout(bannerTO);
  bannerTO = setTimeout(() => b.classList.remove('show'), 2600);
}

// ============================================================
//  Zóny
// ============================================================
function seeded(str) {
  let s = 0;
  for (const c of str) s = (s * 31 + c.charCodeAt(0)) % 2147483647;
  s = s || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildBg(z, id) {
  const c = document.createElement('canvas');
  c.width = z.w; c.height = z.h;
  const g = c.getContext('2d');
  const r = seeded(id);
  g.fillStyle = z.base; g.fillRect(0, 0, z.w, z.h);
  if (z.tile) {
    const s = 56;
    for (let y = 0; y < z.h; y += s) for (let x = 0; x < z.w; x += s) {
      g.globalAlpha = .35 + r() * .5;
      g.fillStyle = ((x + y) / s) % 2 ? z.tile : z.base;
      g.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
    g.globalAlpha = 1;
  }
  if (z.blot) {
    for (let i = 0; i < 240; i++) {
      const x = r() * z.w, y = r() * z.h, rad = 30 + r() * 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() < .5 ? z.blot : 'rgba(0,0,0,.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = .25 + r() * .35;
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalAlpha = 1;
  }
  if (z.town) {
    // hlavní cesty a náměstí
    g.fillStyle = 'rgba(210,190,150,.18)';
    g.fillRect(z.w / 2 - 50, 0, 100, z.h);
    g.fillRect(0, 560, z.w, 90);
    g.beginPath(); g.arc(700, 600, 210, 0, 7); g.fill();
    g.font = `150px ${EMOJI_FONT}`; g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🏰', 700, 120);
    g.font = 'bold 16px Georgia'; g.fillStyle = '#f3dc9a'; g.fillText('Giranský hrad (obsazen klanem, o kterém nikdo nikdy neslyšel)', 700, 215);
    g.font = `64px ${EMOJI_FONT}`; g.fillStyle = '#000'; g.fillText('⛲', 700, 520);
    const dec = ['🌳', '🏠', '🏡', '🌳', '🛖', '🌲'];
    for (let i = 0; i < 46; i++) {
      const e = dec[Math.floor(r() * dec.length)];
      let x, y;
      do { x = 40 + r() * (z.w - 80); y = 40 + r() * (z.h - 80); }
      while ((x > 220 && x < 1220 && y > 240 && y < 920) || (x > 520 && x < 880 && y < 260));
      g.font = `${30 + r() * 26}px ${EMOJI_FONT}`;
      g.fillText(e, x, y);
    }
  } else if (z.decor) {
    g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < z.decorN; i++) {
      const x = 30 + r() * (z.w - 60), y = 30 + r() * (z.h - 60);
      if (Math.hypot(x - z.spawn[0], y - z.spawn[1]) < 120) continue;
      g.globalAlpha = .45 + r() * .3;
      g.font = `${18 + r() * 26}px ${EMOJI_FONT}`;
      g.fillText(z.decor[Math.floor(r() * z.decor.length)], x, y);
    }
    g.globalAlpha = 1;
  }
  // okraj světa
  const grd = 40;
  g.fillStyle = 'rgba(0,0,0,.45)';
  g.fillRect(0, 0, z.w, grd); g.fillRect(0, z.h - grd, z.w, grd);
  g.fillRect(0, 0, grd, z.h); g.fillRect(z.w - grd, 0, grd, z.h);
  return c;
}

function makeMob(type, x, y) {
  const [n, e, lv, o] = type;
  const hp = Math.round((35 * Math.pow(lv, 1.1) + 12) * (o.hp || 1));
  return {
    kind: 'mob', type, name: n, e, lv, x, y, hx: x, hy: y, r: 16, size: 36,
    maxHp: hp, hp, atk: (4 + 3.2 * lv) * (o.atk || 1), def: lv * 1.2, spd: 70 * (o.spd || 1),
    agr: !!o.agr, flee: !!o.flee, adena: o.adena || 1, mimic: !!o.mimic,
    aggro: false, atkCd: rand(.5, 1.5), wander: null, wanderAt: T + rand(1, 5), dead: false, respawnAt: 0, hitT: 0,
    playerDmg: 0, fleeUntil: 0, fakeHit: null, revealed: false, lunge: 0, bob: rand(0, 6),
  };
}

// band = [od, do] v ose x; slabší mobové blíž vstupu (vlevo), silnější dál
function spawnPos(margin = 70, band = null) {
  const x0 = band ? band[0] : margin, x1 = band ? band[1] : Z.w - margin;
  for (let i = 0; i < 30; i++) {
    const x = rand(x0, x1), y = rand(margin, Z.h - margin);
    if (Math.hypot(x - pl.x, y - pl.y) > 320 && Math.hypot(x - Z.spawn[0], y - Z.spawn[1]) > 260) return [x, y];
  }
  return [rand(margin, Z.w - margin), rand(margin, Z.h - margin)];
}

function mobBand(type) {
  const i = Z.mobs.indexOf(type), n = Z.mobs.length;
  const w = (Z.w - 300) / n;
  return [clamp(260 + i * w - w * .3, 70, Z.w - 70), clamp(260 + (i + 1) * w + w * .3, 70, Z.w - 70)];
}

function spawnMob(m) {
  const type = m ? m.type : Z.mobs[mobs.length % Z.mobs.length];
  const [x, y] = spawnPos(70, mobBand(type));
  const nm = makeMob(type, x, y);
  if (m) Object.assign(m, nm); else mobs.push(nm);
}

function makeBoss() {
  return {
    kind: 'mob', boss: true, name: 'Antharas', e: '🐲', lv: 45, x: 700, y: 360, hx: 700, hy: 360, r: 60, size: 130,
    maxHp: 70000, hp: 70000, atk: 240, def: 70, spd: 55, agr: true, adena: 1, aggro: false, atkCd: 2,
    dead: false, hitT: 0, playerDmg: 0, breathAt: T + 6, quakeAt: T + 14, said: {}, bob: 0,
  };
}

function makeFake(town) {
  const [x, y] = town ? [rand(250, 1150), rand(300, 900)] : spawnPos();
  return {
    kind: 'fake', name: pick(FAKE_NAMES), col: pick(FAKE_COLORS), skin: pick(['#f1d3b0', '#e8c29a', '#a99cc8', '#7a9a54']),
    x, y, r: 14, face: { x: 0, y: 1 }, moveTo: null, prey: null, idleAt: T + rand(1, 4), swing: 0, walkT: 0, town,
  };
}

function enterZone(id, pos) {
  zoneId = id; Z = ZONES[id]; S.zone = id;
  bg = bgCache[id] || (bgCache[id] = buildBg(Z, id));
  mobs = []; fakes = []; npcs = []; floats = []; fx = []; tele = [];
  Object.assign(pl, { target: null, interact: null, attacking: false, moveTo: null, queued: null, cast: null, sitting: false });
  const sp = pos || Z.spawn;
  pl.x = sp[0]; pl.y = sp[1];
  if (Z.town) {
    npcs = TOWN_NPCS.map(n => ({ ...n, kind: 'npc', r: 18 }))
      .concat(TOWN_SHOPS.map(s => ({ ...s, kind: 'shop', r: 16, skin: '#f1d3b0' })));
    for (let i = 0; i < 4; i++) fakes.push(makeFake(true));
  } else if (Z.boss) {
    const left = S.bossDeadAt + 5 * 60e3 - Date.now();
    if (left > 0) {
      const m = Math.ceil(left / 60e3);
      setTimeout(() => sys(`Antharas tu není. Respawne se za ~${m} min. (Na oficiálním serveru za 11 dní, takže si nestěžuj.)`), 300);
    } else {
      mobs.push(makeBoss());
    }
  } else {
    for (let i = 0; i < Z.count; i++) spawnMob();
    for (let i = 0; i < 3; i++) fakes.push(makeFake(false));
    pkAt = T + rand(70, 150);
  }
  $('#zoneName').textContent = Z.name;
  banner(Z.name, Z.town ? 'Město. Bezpečí, obchody a 400 lidí AFK na náměstí.' : (Z.boss ? 'Lair raid bosse' : `Doporučená úroveň ${Z.lvTxt}`));
  save();
}

// ============================================================
//  Uložení
// ============================================================
function save() {
  if (!S) return;
  const st = stats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* bez úložiště to prostě nepamatuje */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && d.v === 1 && RACES[d.race]) return d;
  } catch (e) { /* nic */ }
  return null;
}

// ============================================================
//  Boj
// ============================================================
const validTarget = () => pl.target && !pl.target.dead && mobs.includes(pl.target);

function setTarget(m) {
  pl.target = m;
  pl.interact = null;
}

function nearestMob(maxD = 1e9) {
  let best = null, bd = maxD;
  for (const m of mobs) {
    if (m.dead) continue;
    const d = dist(m, pl);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

function useSoulshot() {
  if (!S.ssOn) return false;
  if (S.inv.ss <= 0) {
    S.ssOn = false;
    sys('Došly ti soulshoty. Tvoje DPS a sebevědomí právě klesly na polovinu.');
    return false;
  }
  S.inv.ss--;
  fx.push({ type: 'ss', x: pl.x, y: pl.y, t0: T, dur: .35 });
  return true;
}

function hitMob(m, mult = 1, opts = {}) {
  const st = stats();
  const ss = useSoulshot();
  const crit = Math.random() < st.crit;
  let dmg = Math.max(1, st.patk * mult * (ss ? 2 : 1) * rand(.9, 1.1) - m.def * .5);
  if (crit) dmg *= 2;
  if (opts.lethal && !m.boss && Math.random() < .1) {
    dmg = m.hp;
    float(m.x, m.y - m.size * .6 - 14, 'LETHAL!', '#ff4d4d', true);
  }
  dmg = Math.round(dmg);
  m.hp -= dmg; m.playerDmg += dmg; m.hitT = T;
  float(m.x, m.y - m.size * .6, (crit ? 'KRIT! ' : '') + dmg, crit ? '#ffd75e' : '#fff', crit);
  if (m.flee) { m.fleeUntil = T + 3; m.aggro = false; }
  else m.aggro = true;
  if (m.mimic && !m.revealed) {
    m.revealed = true;
    float(m.x, m.y - 50, 'Byla to past! Kdo by to čekal.', '#ffb35c');
  }
  if (m.hp <= 0) killMob(m, 'player');
}

function killMob(m, by) {
  m.dead = true; m.hp = 0;
  m.respawnAt = T + rand(8, 14);
  fx.push({ type: 'die', x: m.x, y: m.y, e: m.e, size: m.size, t0: T, dur: .6 });
  const mine = by === 'player' || m.playerDmg >= m.maxHp * .5;
  if (pl.target === m) { pl.target = null; pl.attacking = false; pl.queued = null; }
  if (!mine) return;
  if (m.boss) return bossDefeated(m);
  if (m.pk) {
    S.st.pks++;
    const ad = Math.round(400 * m.lv * RACES[S.race].adena);
    S.adena += ad;
    chat(`${m.name}: ne!!! to je lag!!!`, 'pk', null);
    chat(`PK-čko ${m.name} padlo. Upustilo ${fmt(ad)} adeny a zbytky důstojnosti.`, 'loot');
    gainXp(mobXp(m.lv) * 3);
    return;
  }
  S.st.kills++;
  const d = S.level - m.lv;
  let mul = d > 5 ? Math.max(.05, 1 - (d - 5) * .2) : d < 0 ? Math.min(1.3, 1 - d * .06) : 1;
  if (d > 7) sysOnce('grey', 'Tenhle mob je pro tebe moc slabý. Dostáváš drobné XP a pocit trapnosti.', 60);
  gainXp(Math.round(mobXp(m.lv) * mul));
  // drop
  const ad = Math.max(1, Math.round(6 * Math.pow(m.lv, 1.3) * rand(.6, 1.4) * m.adena * RACES[S.race].adena));
  S.adena += ad;
  float(m.x, m.y - 10, `+${fmt(ad)} a`, '#ffe27a');
  if (Math.random() < .35) addJunk(pick(Z.junk), Math.max(1, m.lv * 3));
  if (Math.random() < .045) { S.inv.pot++; chat('Drop: Lektvar léčení. Mob ho zjevně nepotřeboval.', 'loot'); }
  if (Math.random() < .02) { S.inv.soe++; chat('Drop: Svitek návratu (SoE).', 'loot'); }
  if (Math.random() < .008) { S.inv.sw++; chat('Drop: Svitek zaklínání zbraně! Šance na drop byla 0,8 %. Kup si los.', 'loot'); }
  if (Math.random() < .01) { S.inv.sa++; chat('Drop: Svitek zaklínání zbroje!', 'loot'); }
  if (m.e === '🐰' && Math.random() < .3) float(m.x, m.y - 40, 'píp', '#fff');
}

function addJunk(name, v) {
  const j = S.junk[name] || (S.junk[name] = { q: 0, v });
  j.q++; j.v = Math.max(j.v, v);
  chat(`Drop: ${name}`, 'dmg');
}

function gainXp(x) {
  if (x <= 0) return;
  S.xp += x;
  float(pl.x, pl.y - 52, `+${fmt(x)} XP`, '#c6e88f');
  let up = false;
  while (S.level < 80 && S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level);
    S.level++; up = true;
    const sk = SKILLS.find(s => s.lv === S.level);
    chat(`Gratulujeme! Dosáhl jsi úrovně ${S.level}. Mobové jsou teď o stejně silnější, takže se vlastně nic nezměnilo.`, 'lvl');
    if (sk) chat(`Naučil ses: ${sk.icon} ${sk.name} (klávesa ${sk.key}). ${sk.d}`, 'lvl');
    if (S.level === 20) chat('Úroveň 20! Bufferka Bára už ti buffy zadarmo nedá. Vítej v dospělosti.', 'lvl');
  }
  if (up) {
    const st = stats();
    S.hp = st.maxHp; S.mp = st.maxMp;
    S.st.best = Math.max(S.st.best, S.level);
    fx.push({ type: 'lvl', x: pl.x, y: pl.y, t0: T, dur: 1.4 });
    banner(`ÚROVEŇ ${S.level}`, pick(['Jen 79 dalších a máš to!', 'Tvoje máma by byla hrdá. Asi.', 'Teď už jen grindit dál.', 'Ding!']));
    buildHotbar();
    save();
  }
}

function damagePlayer(raw, src) {
  if (pl.dead || pl.jailUntil > T) return;
  const st = stats();
  let dmg = Math.max(1, raw * rand(.85, 1.15) - st.pdef * .5);
  if (pl.buffs.ud > T) dmg *= .1;
  dmg = Math.round(dmg);
  S.hp -= dmg; pl.hitT = T;
  float(pl.x, pl.y - 40, '-' + dmg, '#ff6b6b');
  if (pl.sitting) { pl.sitting = false; sysOnce('sitHit', 'Vstal jsi, protože tě někdo mlátí. Rozumné rozhodnutí.'); }
  if (pl.cast && pl.cast.breakable) { pl.cast = null; sys('Kouzlo přerušeno.'); }
  if (S.hp <= 0) die(src);
}

function die(src) {
  S.hp = 0; pl.dead = true; pl.attacking = false; pl.target = null; pl.moveTo = null; pl.cast = null;
  S.st.deaths++;
  const loss = Math.round(xpNeed(S.level) * .04);
  const lost = Math.min(S.xp, loss);
  S.xp -= lost;
  const wasAuto = pl.auto;
  setAuto(false);
  fx.push({ type: 'die', x: pl.x, y: pl.y, e: '👻', size: 40, t0: T, dur: 1.5 });
  if (src && src.pk) chat(`${src.name}: gg ez 😎`, 'pk');
  save();
  setTimeout(() => {
    const why = src && src.boss ? 'Antharas tě snědl. Byl jsi prý křupavý.'
      : src && src.pk ? `Zabilo tě PK-čko ${src.name}. Teď se ti posmívá v chatu.`
      : src ? `Zabil tě ${src.name} (lv ${src.lv}).` : 'Zemřel jsi.';
    dialog('💀 Zemřel jsi', `
      <p>${esc(why)}</p>
      <p>Ztratil jsi <b>${fmt(lost)} XP</b> (4 %). Klasika.</p>
      ${wasAuto ? '<p class="muted">Auto-farm se vypnul. Bot by tohle neudělal. Teda udělal.</p>' : ''}
      <p class="muted">Tip: lektvary (Q), sednout si (X) a soulshoty (E) jsou tvoji přátelé.</p>`,
      [
        { t: 'Čekat na oživení', fn: () => { sys('Čekáš na resurrect… Nikdo nepřišel. Všichni healeři jsou boti.'); respawn(); } },
        { t: '🏃 Do města', cls: 'green', fn: respawn },
      ], true);
  }, 900);
}

function respawn() {
  closeDialog();
  pl.dead = false;
  enterZone('town');
  const st = stats();
  S.hp = st.maxHp * .7; S.mp = st.maxMp * .7;
}

function bossDefeated(m) {
  S.st.boss++;
  S.bossDeadAt = Date.now();
  const first = !S.jewel;
  S.jewel = true;
  S.title = 'Drakobijce';
  const ad = 50000;
  S.adena += ad;
  gainXp(mobXp(50) * 30);
  chat('!!! Antharas byl poražen! Celý server to viděl. Teda ty a 3 400 botů. !!!', 'gm');
  fx.push({ type: 'lvl', x: m.x, y: m.y, t0: T, dur: 2 });
  save();
  setTimeout(() => dialog('🐲 Antharas poražen!', `
    <p>Dokázal jsi to. Sám. Bez party, bez healera, bez clanu.</p>
    <p class="quote">„Na oficiálním serveru by drop stejně dostal clan leader, který se přihlásil 5 vteřin před koncem."</p>
    <p>Odměna: <b>${fmt(ad)} adeny</b>, spousta XP a titul <b>Drakobijce</b>.</p>
    ${first ? '<p>Získáváš <b>💎 Antharasův náhrdelník</b>: +10 % útok, obrana i HP. Navždy.</p>' : '<p class="muted">Náhrdelník už máš. Druhý ti nedá, není to Vánoce.</p>'}
    <p class="muted">Antharas se respawne za 5 minut. Na oficiálním serveru za 11 dní, tak si nestěžuj.</p>`,
    [{ t: 'Jsem legenda', cls: 'green', fn: closeDialog }]), 1200);
}

// ============================================================
//  Dovednosti a předměty
// ============================================================
function useSkill(i) {
  const sk = SKILLS[i];
  if (!sk || pl.dead || pl.jailUntil > T) return;
  if (S.level < sk.lv) return sysOnce('lock' + sk.id, `${sk.name} se naučíš na úrovni ${sk.lv}.`, 2);
  if ((cds[sk.id] || 0) > T) return sysOnce('cd', 'Dovednost se ještě nabíjí. Trpělivost.', 2);
  if (S.mp < sk.mp(S.level)) return sysOnce('mp', 'Nemáš dost MP. Zkus si sednout (X).', 3);
  if (Z.town && (sk.type === 'hit' || sk.type === 'aoe')) return sysOnce('townsk', 'Ve městě se nebojuje. Ani se strážemi, zkoušeli to jiní.', 3);
  if (sk.type === 'hit') {
    if (!validTarget()) return sysOnce('notg', 'Nejdřív si vyber cíl.', 2);
    pl.queued = i; pl.attacking = true; pl.sitting = false;
    return;
  }
  execSkill(i);
}

function execSkill(i, m) {
  const sk = SKILLS[i], st = stats();
  S.mp -= sk.mp(S.level);
  cds[sk.id] = T + sk.cd;
  pl.sitting = false;
  if (sk.type === 'hit') {
    pl.swing = T;
    fx.push({ type: 'slash', x: m.x, y: m.y, t0: T, dur: .3, big: sk.lethal });
    hitMob(m, sk.mult, { lethal: sk.lethal });
  } else if (sk.type === 'heal') {
    const h = Math.round(st.maxHp * .35);
    S.hp = Math.min(st.maxHp, S.hp + h);
    float(pl.x, pl.y - 44, '+' + h, '#8de07f');
    fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: .8 });
  } else if (sk.type === 'buff') {
    pl.buffs.ww = T + sk.dur;
    float(pl.x, pl.y - 44, 'Fííí!', '#bfe9ff');
  } else if (sk.type === 'ud') {
    pl.buffs.ud = T + sk.dur;
    pl.moveTo = null;
    float(pl.x, pl.y - 44, 'NEPROSTŘELNÝ', '#7fd0ff');
  } else if (sk.type === 'aoe') {
    pl.swing = T;
    fx.push({ type: 'whirl', x: pl.x, y: pl.y, t0: T, dur: .45 });
    const hit = mobs.filter(o => !o.dead && dist(o, pl) < 120 + o.r);
    if (!hit.length) float(pl.x, pl.y - 44, 'Mácháš do vzduchu. Působivé.', '#ccc');
    hit.forEach(o => hitMob(o, sk.mult));
  }
}

function usePotion() {
  if (pl.dead) return;
  if ((cds.pot || 0) > T) return sysOnce('potcd', 'Lektvar se ještě nevstřebal. Nepij to jak limonádu.', 2);
  if (S.inv.pot <= 0) return sysOnce('nopot', 'Nemáš lektvary. Hokynář Vendelín v Giranu jich má plnou bednu.', 3);
  const st = stats();
  S.inv.pot--;
  cds.pot = T + 5;
  const h = Math.round(st.maxHp * .4);
  S.hp = Math.min(st.maxHp, S.hp + h);
  float(pl.x, pl.y - 44, '+' + h, '#8de07f');
  fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: .6 });
}

function toggleSS() {
  if (!S.ssOn && S.inv.ss <= 0) return sysOnce('noss', 'Nemáš soulshoty. Bez nich budeš grindit do důchodu.', 3);
  S.ssOn = !S.ssOn;
  sys(S.ssOn ? 'Soulshoty zapnuty. Teď to bude bolet. Tebe hlavně v peněžence.' : 'Soulshoty vypnuty. Šetříš? Chápu.');
}

function toggleSit() {
  if (pl.dead || pl.buffs.ud > T) return;
  pl.sitting = !pl.sitting;
  if (pl.sitting) { pl.moveTo = null; pl.attacking = false; pl.cast = null; sysOnce('sit', 'Sedíš. Regeneruješ 3× rychleji. Mobové to berou jako pozvánku.', 20); }
}

function useSoE() {
  if (pl.dead || pl.cast) return;
  if (Z.town) return sysOnce('soetown', 'Už jsi ve městě. Hlubší město není.', 3);
  pl.sitting = false; pl.moveTo = null; pl.attacking = false;
  if (S.inv.soe > 0) {
    pl.cast = { t0: T, dur: 3, label: 'Svitek návratu…', breakable: false, done: () => { S.inv.soe--; enterZone('town'); } };
  } else {
    sys('Nemáš Svitek návratu. Spouštím /unstuck – trvá to 15 s. (Nebo umři, to je rychlejší.)');
    pl.cast = { t0: T, dur: 15, label: '/unstuck…', breakable: true, done: () => enterZone('town') };
  }
}

function nextTarget() {
  if (Z.town) return;
  const m = nearestMob(700);
  if (m) { setTarget(m); pl.attacking = true; pl.sitting = false; }
  else sysOnce('nomob', 'Žádný mob poblíž. Ostatní hráči je asi vyfarmili.', 3);
}

const buffActive = () => Object.keys(pl.buffs).filter(k => pl.buffs[k] > T);

// ============================================================
//  Auto-farm a GM kontrola
// ============================================================
function setAuto(on) {
  pl.auto = on;
  $('#autoBtn').classList.toggle('on', on);
  if (on) {
    botCheckAt = T + rand(50, 100);
    sys('Auto-farm zapnut. Porušuješ ToS. GM se možná dívá. 👀');
    if (Z.town) sys('V Giranu není co farmit. Kromě nervů. Teleportuj se do lovecké oblasti.');
  } else if (gm) {
    gm = null;
  }
}

function updateAuto(st) {
  if (!pl.auto || pl.dead || Z.town || pl.cast) return;
  if (!gm && T > botCheckAt) startBotCheck();
  if (S.hp < st.maxHp * .45 && S.inv.pot > 0 && (cds.pot || 0) <= T) usePotion();
  if (S.level >= 3 && S.hp < st.maxHp * .5 && (cds.heal || 0) <= T && S.mp >= SKILLS[1].mp(S.level)) execSkill(1);
  // kdo mě mlátí, toho beru první
  const attacker = mobs.find(m => !m.dead && m.aggro && dist(m, pl) < 260);
  if (pl.sitting) {
    if (attacker || S.hp >= st.maxHp * .95) pl.sitting = false;
    else return;
  }
  if (!validTarget() || (attacker && !pl.target.aggro)) {
    if (!attacker && S.hp < st.maxHp * .35 && S.inv.pot <= 0) {
      pl.attacking = false; pl.target = null; pl.sitting = true;
      sysOnce('botsit', 'Bot si sedl, aby si odpočinul. Velmi lidské chování.', 60);
      return;
    }
    let m = attacker;
    if (!m) {
      let bd = 1400;
      for (const o of mobs) {
        if (o.dead || (o.lv > S.level + 2 && !o.boss) || fakeBusy(o)) continue;
        const d = dist(o, pl) + (o.lv < S.level - 5 ? 700 : 0);   // šedé moby jen z nouze
        if (d < bd) { bd = d; m = o; }
      }
    }
    if (m) { setTarget(m); pl.attacking = true; pl.sitting = false; }
    else sysOnce('botnone', 'Bot nenašel moba pro tvůj level. Bot je zmatený. Bot chce domů.', 30);
  } else if (!pl.attacking) pl.attacking = true;
  if (pl.attacking && pl.queued == null && (cds.ps || 0) <= T && S.mp > SKILLS[0].mp(S.level) * 3) pl.queued = 0;
}

function startBotCheck() {
  const a = randi(2, 9), b = randi(2, 9);
  gm = { ans: a + b, until: T + 20 };
  chat('Ahoj, tady GM Ondra. Jen kontrola, nic osobního. 👀', 'gm', 'GM_Ondra');
  dialog('🛡️ GM kontrola proti botům', `
    <p class="quote">„Dobrý den, tady GM Ondra. Všiml jsem si, že už 3 hodiny mlátíš ${esc(validTarget() ? pl.target.name : 'moby')} se stejným rytmem. Jsi bot?"</p>
    <p>Dokaž, že jsi člověk: <b>Kolik je ${a} + ${b}?</b></p>
    <input id="gmIn" inputmode="numeric" autocomplete="off" maxlength="3">
    <div class="muted" id="gmT">Zbývá 20 s</div>`,
    [{ t: 'Odpovědět', cls: 'green', fn: answerGm }], true);
  setTimeout(() => {
    const i = $('#gmIn');
    if (i) {
      i.focus();
      i.addEventListener('keydown', e => { if (e.key === 'Enter') answerGm(); e.stopPropagation(); });
    }
  }, 50);
}

function answerGm() {
  if (!gm) return closeDialog();
  const v = parseInt(($('#gmIn') || {}).value, 10);
  closeDialog();
  if (v === gm.ans) {
    chat('OK, vypadáš jako člověk. Ale sleduju tě. 👀', 'gm', 'GM_Ondra');
    gm = null;
    botCheckAt = T + rand(80, 140);
  } else {
    chat(`${isNaN(v) ? 'Žádná odpověď?' : v + '? Opravdu?'} Tohle by bot napsal přesně takhle. Do vězení.`, 'gm', 'GM_Ondra');
    jail();
  }
}

function jail() {
  gm = null;
  setAuto(false);
  S.st.jails++;
  pl.jailUntil = T + 30;
  pl.target = null; pl.attacking = false; pl.moveTo = null; pl.cast = null;
  closeDialog();
  $('#jail').classList.remove('hidden');
  save();
}

// ============================================================
//  Dialogy
// ============================================================
let dlgModal = false;
function dialog(title, html, btns = [], modal = false) {
  dlgModal = modal;
  dlgRefresh = null;
  $('#dlgTitle').innerHTML = title;
  $('#dlgBody').innerHTML = html;
  const bb = $('#dlgBtns');
  bb.innerHTML = '';
  btns.forEach(b => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || '');
    el.textContent = b.t;
    el.onclick = b.fn;
    bb.appendChild(el);
  });
  $('#dlgX').classList.toggle('hidden', modal);
  $('#dlg').classList.remove('hidden');
}
let dlgRefresh = null;
function closeDialog() { $('#dlg').classList.add('hidden'); dlgModal = false; dlgRefresh = null; }
// dialog, který se po každé akci překreslí
function panel(show) { show(); dlgRefresh = show; }
$('#dlgX').onclick = closeDialog;
$('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg' && !dlgModal) closeDialog(); });

// kliky na tlačítka uvnitř dialogů – data-a="akce" data-i="index"
$('#dlgBody').addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const fn = ACTIONS[b.dataset.a];
  const r = dlgRefresh;
  if (fn) fn(b.dataset.i);
  if (r && dlgRefresh === r) panel(r);
});

const gTag = g => `<span class="grade">${GRADES[g]}</span>`;
const eTag = e => e ? `<span class="ench">+${e} </span>` : '';
const btn = (a, i, t, dis = false, cls = '') => `<button class="btn ${cls}" data-a="${a}" data-i="${i}" ${dis ? 'disabled' : ''}>${t}</button>`;

function openNpc(n) {
  pl.moveTo = null;
  if (n.kind === 'shop') return openShop(n);
  ({ gk: openGatekeeper, shop: openMerchant, arm: openArmory, smith: openSmith, buff: openBuffer, wh: openWarehouse })[n.id]();
}

function openGatekeeper() {
  const show = () => {
    const rows = ZONE_ORDER.map(id => {
      const z = ZONES[id];
      return `<div class="item"><div class="ic">${id === 'lair' ? '🐲' : '🌀'}</div>
        <div class="tx"><b>${z.name}</b> <small>Úroveň ${z.lvTxt}. ${z.note}</small></div>
        <div class="pr">${z.price ? fmt(z.price) + ' a' : 'zdarma'}</div>
        ${btn('tp', id, 'Jdi', S.adena < z.price)}</div>`;
    }).join('');
    dialog('🧙 Gatekeeper Ludmila', `
      <p class="quote">„Kam to bude? Ceny teleportů se nezměnily od roku 2004. Teda změnily. Nahoru."</p>
      <div class="list">${rows}</div>`);
  };
  show();
}

function openMerchant() {
  const show = () => {
    const g = WEAPONS[S.weapon.id].g, ga = ARMORS[S.armor.id].g;
    const ssPack = 100 * SS_COST[g];
    const junkVal = Object.values(S.junk).reduce((s, j) => s + j.q * j.v, 0);
    dialog('🤵 Hokynář Vendelín', `
      <p class="quote">„Lektvary, soulshoty, svitky. Vracet se nic nedá, reklamace u Gatekeepera."</p>
      <div class="list">
        <div class="item"><div class="ic">🧪</div><div class="tx"><b>Lektvar léčení</b><small>+40 % HP. Máš ${S.inv.pot} ks.</small></div>
          <div class="pr">${POT_PRICE} a</div>${btn('buyPot', 1, '×1', S.adena < POT_PRICE)}${btn('buyPot', 10, '×10', S.adena < POT_PRICE * 10)}</div>
        <div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshoty ×100</b> ${gTag(g)}<small>2× poškození. Cena podle gradu zbraně, nikdo neví proč. Máš ${fmt(S.inv.ss)}.</small></div>
          <div class="pr">${fmt(ssPack)} a</div>${btn('buySS', 1, '×100', S.adena < ssPack)}${btn('buySS', 10, '×1000', S.adena < ssPack * 10)}</div>
        <div class="item"><div class="ic">📜</div><div class="tx"><b>Svitek návratu (SoE)</b><small>Teleport do města. Máš ${S.inv.soe}.</small></div>
          <div class="pr">${SOE_PRICE} a</div>${btn('buySoe', 1, '×1', S.adena < SOE_PRICE)}</div>
        <div class="item"><div class="ic">🗡️</div><div class="tx"><b>Svitek zaklínání zbraně</b> ${gTag(g)}<small>Pro tvou zbraň. Máš ${S.inv.sw}.</small></div>
          <div class="pr">${fmt(SCROLL_W[g])} a</div>${btn('buySw', 1, '×1', S.adena < SCROLL_W[g])}</div>
        <div class="item"><div class="ic">🛡️</div><div class="tx"><b>Svitek zaklínání zbroje</b> ${gTag(ga)}<small>Pro tvou zbroj. Máš ${S.inv.sa}.</small></div>
          <div class="pr">${fmt(SCROLL_A[ga])} a</div>${btn('buySa', 1, '×1', S.adena < SCROLL_A[ga])}</div>
      </div>
      <div class="sect">Výkup</div>
      <p>Haraburdí v inventáři: <b>${fmt(junkVal)} adeny</b>. ${btn('sellJunk', 1, 'Prodat všechno', !junkVal)}</p>`);
  };
  panel(show);
}

function openArmory() {
  const show = () => {
    const row = (list, kind) => list.map((it, i) => {
      const cur = (kind === 'w' ? S.weapon.id : S.armor.id) === i;
      const stat = kind === 'w' ? `Útok ${it.atk}` : `Obrana ${it.def}, +${it.hp} HP`;
      if (!it.price) return '';
      return `<div class="item ${cur ? 'cur' : ''}"><div class="ic">${kind === 'w' ? '⚔️' : '🥋'}</div>
        <div class="tx"><b>${it.name}</b>${gTag(it.g)}<small>${stat} · lv ${it.lv}+ · ${it.d}</small></div>
        <div class="pr">${fmt(it.price)} a</div>
        ${cur ? '<span class="muted">nošeno</span>' : btn(kind === 'w' ? 'buyW' : 'buyA', i, 'Koupit', S.adena < it.price || S.level < it.lv)}</div>`;
    }).join('');
    dialog('💂 Zbrojíř Bohouš', `
      <p class="quote">„Starou výbavu ti vykoupím za 20 %. Byznys je byznys."</p>
      <p class="muted">Máš: ${eTag(S.weapon.e)}${WEAPONS[S.weapon.id].name} · ${eTag(S.armor.e)}${ARMORS[S.armor.id].name}</p>
      <div class="sect">Zbraně</div><div class="list">${row(WEAPONS, 'w')}</div>
      <div class="sect">Zbroje</div><div class="list">${row(ARMORS, 'a')}</div>`);
  };
  panel(show);
}

let smithMsg = { t: '', cls: '' };
function openSmith() {
  smithMsg = { t: '', cls: '' };
  const show = () => {
    const w = WEAPONS[S.weapon.id], a = ARMORS[S.armor.id];
    const ch = e => Math.round(enchChance(e) * 100);
    dialog('👷 Kovář Pepa', `
      <p class="quote">„Do +3 je to bezpečný. Potom… no, uvidíme. Já za nic neručím."</p>
      <div class="list">
        <div class="item"><div class="ic">⚔️</div><div class="tx"><b>${eTag(S.weapon.e)}${w.name}</b>${gTag(w.g)}
          <small>Šance na +${S.weapon.e + 1}: ${ch(S.weapon.e)} % · svitků: ${S.inv.sw}</small></div>
          ${btn('enchW', 0, 'Zaklínat', S.inv.sw <= 0, 'red')}</div>
        <div class="item"><div class="ic">🥋</div><div class="tx"><b>${eTag(S.armor.e)}${a.name}</b>${gTag(a.g)}
          <small>Šance na +${S.armor.e + 1}: ${ch(S.armor.e)} % · svitků: ${S.inv.sa}</small></div>
          ${btn('enchA', 0, 'Zaklínat', S.inv.sa <= 0, 'red')}</div>
      </div>
      <p class="muted">Při neúspěchu nad +3 se předmět rozpadne na krystaly. Svitky koupíš u Hokynáře, zbraň od +4 svítí.</p>
      <div class="result ${smithMsg.cls}">${smithMsg.t || '&nbsp;'}</div>`);
  };
  panel(show);
}

function enchant(kind) {
  const isW = kind === 'w';
  const slot = isW ? S.weapon : S.armor;
  const list = isW ? WEAPONS : ARMORS;
  const key = isW ? 'sw' : 'sa';
  if (S.inv[key] <= 0) return;
  S.inv[key]--;
  const it = list[slot.id];
  if (Math.random() < enchChance(slot.e)) {
    slot.e++;
    smithMsg = { cls: 'ok', t: `✨ Úspěch! ${it.name} je teď +${slot.e}. ${slot.e >= 4 ? 'A svítí! Všichni v Giranu ti závidí.' : ''}` };
    if (slot.e >= 6) chat(`${S.name} má ${it.name} +${slot.e}! Nějaký šťastlivec…`, 'shout', pick(FAKE_NAMES));
  } else {
    S.st.fails++;
    const cr = Math.round(it.price * .1);
    S.adena += cr;
    smithMsg = { cls: 'bad', t: `💥 PRÁSK. ${it.name} +${slot.e} je fuč, zbyly jen krystaly (prodány za ${fmt(cr)} a). Pepa ti zatím půjčí ${isW ? 'Klacek' : 'děravou košili'}.` };
    chat(`${S.name} právě rozbil ${it.name} +${slot.e}. F v chatu.`, 'shout', pick(FAKE_NAMES));
    setTimeout(() => chat('F', 'normal', pick(FAKE_NAMES)), 700);
    setTimeout(() => chat('F', 'normal', pick(FAKE_NAMES)), 1300);
    slot.id = 0; slot.e = 0;
    const st = stats();
    S.hp = Math.min(S.hp, st.maxHp);
  }
  save();
}

function openBuffer() {
  const cost = S.level < 20 ? 0 : 500;
  dialog('🧚 Bufferka Bára', `
    <p class="quote">${cost ? '„Už jsi velký. Buffy stojí 500 adeny. Nebo si kup bufferbota jako všichni ostatní."' : '„Ahoj, nováčku! Buffy pro tebe zadarmo. Do úrovně 20. Pak tě budu ignorovat."'}</p>
    <p>💪 Síla +15 % útok · 🧱 Štít +15 % obrana · ⚡ Spěch +30 % rychlost útoku · 🍃 Vítr +15 % pohyb</p>
    <p class="muted">Trvání 5 minut. Na oficiálním serveru 20 minut, ale tady je inflace.</p>`,
    [{ t: cost ? `Buffy za ${cost} a` : 'Dej mi všechny buffy', cls: 'green', fn: () => {
      if (S.adena < cost) return sys('Nemáš na buffy. Bára se otočila zády.');
      S.adena -= cost;
      ['might', 'shield', 'haste', 'wind'].forEach(k => pl.buffs[k] = T + 300);
      fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: 1 });
      sys('Jsi nabuffovaný. Cítíš se o 15 % lepší člověk.');
      closeDialog();
    } }]);
}

function openWarehouse() {
  dialog('📦 Skladník Ota', `
    <p class="quote">„Sklad je plný. Jako vždycky. Je tam 4 000 kostí od nějakého trpaslíka a jedna ponožka. Přijď zítra."</p>`,
    [{ t: 'Aha, díky', fn: closeDialog }]);
}

function openShop(s) {
  const show = () => {
    let body = '';
    if (s.id === 'scam') {
      body = `<p class="quote">„Draconic Bow, úplně pravej, žádnej podvod, jen 5 000 adeny. Rychle, než si to rozmyslím!"</p>
        <div class="list"><div class="item"><div class="ic">🏹</div><div class="tx"><b>„Draconic Bow"</b><small>Určitě pravý. Na 100 %. Možná 90 %.</small></div>
        <div class="pr">5 000 a</div>${btn('scam', 0, 'Koupit', S.adena < 5000)}</div></div>`;
    } else if (s.id === 'ssbot') {
      const p = Math.round(100 * SS_COST[WEAPONS[S.weapon.id].g] * .6);
      body = `<p class="quote">„Bip bop. Prodávám soulshoty. Nejsem bot. Bip."</p>
        <div class="list"><div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshoty ×100</b><small>O 40 % levněji než u Vendelína. Odkud je má? Nevyptávej se.</small></div>
        <div class="pr">${fmt(p)} a</div>${btn('botSS', p, '×100', S.adena < p)}</div></div>`;
    } else if (s.id === 'babka') {
      const v = Object.values(S.junk).reduce((t, j) => t + j.q * j.v, 0);
      body = `<p class="quote">„Kupuju kůže, kosti, ponožky, cokoliv. Platím dvojnásob než ten skrblík Vendelín. Na co to potřebuju? To je moje věc."</p>
        <p>Tvoje haraburdí: <b>${fmt(v * 2)} adeny</b> u babky. ${btn('babka', 0, 'Prodat babce', !v)}</p>`;
    } else if (s.id === 'party') {
      body = `<p class="quote">„Hledáme lidi na Antharase! Zatím jsme já, můj kámoš a jeho bot. Ty máš ${S.level}? Hmm… my máme 12. Ale máme odhodlání!"</p>
        <p class="muted">MegaOrk tě do party nevzal. Prý by ses mu nevešel do lootu.</p>`;
    } else if (s.id === 'acc') {
      body = `<p class="quote">„Účet lvl 80, full S-grade, 40 hrdinů, jen 3000 Kč. Platba předem, přes Western Union, je to bezpečný."</p>
        <p class="muted">Tohle se kupovat nedá. Naštěstí.</p>`;
    }
    dialog(`🛒 ${esc(s.name)} <small style="font-size:12px;color:#ff9ed1">(soukromý obchod)</small>`, body);
  };
  panel(show);
}

function openInventory() {
  const show = () => {
    const st = stats();
    const junk = Object.entries(S.junk).filter(([, j]) => j.q > 0)
      .map(([n, j]) => `<div class="item"><div class="ic">🦴</div><div class="tx"><b>${esc(n)}</b> ×${j.q}<small>á ${j.v} adeny</small></div></div>`).join('');
    dialog('🎒 Inventář', `
      <div class="sect">Výbava</div>
      <div class="list">
        <div class="item"><div class="ic">⚔️</div><div class="tx"><b>${eTag(S.weapon.e)}${WEAPONS[S.weapon.id].name}</b>${gTag(WEAPONS[S.weapon.id].g)}<small>${WEAPONS[S.weapon.id].d}</small></div></div>
        <div class="item"><div class="ic">🥋</div><div class="tx"><b>${eTag(S.armor.e)}${ARMORS[S.armor.id].name}</b>${gTag(ARMORS[S.armor.id].g)}<small>${ARMORS[S.armor.id].d}</small></div></div>
        ${S.jewel ? '<div class="item"><div class="ic">💎</div><div class="tx"><b>Antharasův náhrdelník</b><small>+10 % útok, obrana a HP. Ostatní ti ho závidí.</small></div></div>' : ''}
      </div>
      <div class="sect">Spotřební</div>
      <div class="list">
        <div class="item"><div class="ic">🧪</div><div class="tx"><b>Lektvar léčení</b> ×${S.inv.pot}<small>Klávesa Q</small></div>${btn('pot', 0, 'Vypít', !S.inv.pot)}</div>
        <div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshoty</b> ×${fmt(S.inv.ss)}<small>Klávesa E · ${S.ssOn ? 'zapnuto' : 'vypnuto'}</small></div>${btn('ss', 0, S.ssOn ? 'Vypnout' : 'Zapnout')}</div>
        <div class="item"><div class="ic">📜</div><div class="tx"><b>Svitek návratu</b> ×${S.inv.soe}<small>Klávesa R</small></div>${btn('soe', 0, 'Použít', Z.town)}</div>
        <div class="item"><div class="ic">🗡️</div><div class="tx"><b>Svitek zaklínání zbraně</b> ×${S.inv.sw}</div></div>
        <div class="item"><div class="ic">🛡️</div><div class="tx"><b>Svitek zaklínání zbroje</b> ×${S.inv.sa}</div></div>
      </div>
      <div class="sect">Haraburdí</div>
      <div class="list">${junk || '<span class="muted">Nic. Ani ponožka.</span>'}</div>
      <p style="margin-top:10px">Adena: <b style="color:#ffe27a">${fmt(S.adena)}</b> · Útok ${Math.round(st.patk)} · Obrana ${Math.round(st.pdef)}</p>`);
  };
  panel(show);
}

function openChar() {
  const st = stats(), r = RACES[S.race];
  const mins = Math.floor(S.st.time / 60);
  dialog(`📜 ${esc(S.name)}`, `
    <p class="muted">${r.name} · ${r.desc}</p>
    <div class="kv">
      <span>Úroveň</span><span>${S.level} (${(S.xp / xpNeed(S.level) * 100).toFixed(2)} %)</span>
      <span>Titul</span><span>${esc(S.title || '–')}</span>
      <span>HP / MP</span><span>${Math.round(S.hp)}/${st.maxHp} · ${Math.round(S.mp)}/${st.maxMp}</span>
      <span>Útok / Obrana</span><span>${Math.round(st.patk)} / ${Math.round(st.pdef)}</span>
      <span>Rychlost</span><span>${Math.round(st.spd)}</span>
      <span>Šance na kritický zásah</span><span>${Math.round(st.crit * 100)} %</span>
      <span>CP</span><span>nikdo neví, co to je</span>
    </div>
    <div class="sect">Statistiky</div>
    <div class="kv">
      <span>Zabitých mobů</span><span>${fmt(S.st.kills)}</span>
      <span>Smrtí</span><span>${fmt(S.st.deaths)}</span>
      <span>Ukradených mobů (KS)</span><span>${fmt(S.st.ks)}</span>
      <span>Zabitých PK-ček</span><span>${fmt(S.st.pks)}</span>
      <span>Rozbitých předmětů</span><span>${fmt(S.st.fails)}</span>
      <span>Pobyty ve vězení</span><span>${fmt(S.st.jails)}</span>
      <span>Antharas poražen</span><span>${S.st.boss}×</span>
      <span>Odehráno</span><span>${mins} min (z toho grind: ${mins} min)</span>
    </div>`);
}

function openHelp() {
  dialog('❓ Jak hrát', `
    <p><b>Cíl:</b> grindit, grindit, koupit lepší výbavu, rozbít ji při zaklínání, grindit znovu a nakonec porazit raid bosse <b>Antharase</b>.</p>
    <div class="kv">
      <span>Klik na zem</span><span>jdi tam</span>
      <span>Klik na moba / F / Tab</span><span>cíl + útok</span>
      <span>WASD / šipky</span><span>chůze</span>
      <span>1 – 6</span><span>dovednosti</span>
      <span>Q</span><span>lektvar</span>
      <span>E</span><span>soulshoty on/off</span>
      <span>X</span><span>sednout (3× regenerace)</span>
      <span>R</span><span>svitek návratu do města</span>
      <span>B</span><span>auto-farm (porušuje ToS)</span>
      <span>I / C</span><span>inventář / postava</span>
      <span>Enter</span><span>chat (/unstuck, /gm, /sit)</span>
    </div>
    <p class="muted">V Giranu: Gatekeeper tě teleportuje, Hokynář prodá lektvary a soulshoty, Zbrojíř výbavu, Kovář zaklíná. Bufferka buffuje nováčky zadarmo. Soukromé obchody hráčů… na vlastní riziko.</p>
    <p class="muted">Hra se ukládá automaticky.</p>`);
}

const ACTIONS = {
  tp: id => {
    const z = ZONES[id];
    if (S.adena < z.price) return;
    S.adena -= z.price;
    closeDialog();
    if (id === 'lair' && S.level < 38) sys('Gatekeeper Ludmila: „S tvým levelem? No, peníze nevracím."');
    enterZone(id);
  },
  buyPot: n => { n = +n; if (S.adena >= POT_PRICE * n) { S.adena -= POT_PRICE * n; S.inv.pot += n; } },
  buySS: n => { n = +n; const p = 100 * SS_COST[WEAPONS[S.weapon.id].g] * n; if (S.adena >= p) { S.adena -= p; S.inv.ss += 100 * n; S.ssOn = true; } },
  buySoe: () => { if (S.adena >= SOE_PRICE) { S.adena -= SOE_PRICE; S.inv.soe++; } },
  buySw: () => { const p = SCROLL_W[WEAPONS[S.weapon.id].g]; if (S.adena >= p) { S.adena -= p; S.inv.sw++; } },
  buySa: () => { const p = SCROLL_A[ARMORS[S.armor.id].g]; if (S.adena >= p) { S.adena -= p; S.inv.sa++; } },
  sellJunk: () => {
    const v = Object.values(S.junk).reduce((s, j) => s + j.q * j.v, 0);
    S.adena += v; S.junk = {};
    sys(`Prodal jsi haraburdí za ${fmt(v)} adeny. Vendelín se usmál. To nevěstí nic dobrého.`);
  },
  buyW: i => buyGear('w', +i),
  buyA: i => buyGear('a', +i),
  enchW: () => enchant('w'),
  enchA: () => enchant('a'),
  pot: () => usePotion(),
  ss: () => toggleSS(),
  soe: () => { closeDialog(); useSoE(); },
  scam: () => {
    if (S.adena < 5000) return;
    S.adena -= 5000;
    addJunk('„Draconic Bow" (klacek s nálepkou)', 1);
    chat('díky za nákup!! reklamace nepřijímám', 'whisper', 'xX_Legolas_Xx');
    sys('Koupil jsi „Draconic Bow". Je to klacek s nálepkou. Hodnota: 1 adena. Vítej v Giranu.');
  },
  botSS: p => { p = +p; if (S.adena >= p) { S.adena -= p; S.inv.ss += 100; S.ssOn = true; chat('bip. díky. bip.', 'whisper', 'Bot_Pepa_07'); } },
  babka: () => {
    const v = Object.values(S.junk).reduce((s, j) => s + j.q * j.v, 0) * 2;
    S.adena += v; S.junk = {};
    sys(`Babka ti dala ${fmt(v)} adeny a pohladila tě po hlavě. Nevíš, co s tou ponožkou udělá.`);
  },
};

function buyGear(kind, i) {
  const isW = kind === 'w';
  const it = (isW ? WEAPONS : ARMORS)[i];
  const slot = isW ? S.weapon : S.armor;
  if (S.adena < it.price || S.level < it.lv) return;
  const old = (isW ? WEAPONS : ARMORS)[slot.id];
  const refund = Math.round(old.price * .2);
  S.adena += refund - it.price;
  slot.id = i; slot.e = 0;
  sys(`Koupil jsi ${it.name}.${refund ? ` Za starou výbavu ti Bohouš dal ${fmt(refund)} adeny.` : ''}`);
  buildHotbar();
  save();
}

// ============================================================
//  Chat vstup
// ============================================================
const chatIn = $('#chatIn');
chatIn.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape') { chatIn.blur(); return; }
  if (e.key !== 'Enter') return;
  const t = chatIn.value.trim();
  chatIn.value = '';
  chatIn.blur();
  if (!t) return;
  if (t[0] === '/') return command(t.slice(1).toLowerCase());
  chat(t, 'me', S.name);
  if (Math.random() < .85) setTimeout(() => chat(pick(CHAT_REPLIES), 'normal', pick(FAKE_NAMES)), rand(800, 2600));
});

function command(c) {
  if (c === 'unstuck') {
    if (Z.town) sys('Ve městě se zaseknout nedá. Jen psychicky.');
    else if (!pl.dead && !pl.cast) {
      sys('/unstuck: za 15 s budeš v Giranu. Nehýbej se.');
      pl.sitting = false; pl.moveTo = null; pl.attacking = false;
      pl.cast = { t0: T, dur: 15, label: '/unstuck…', breakable: true, done: () => enterZone('town') };
    }
  }
  else if (c === 'sit') toggleSit();
  else if (c === 'gm') { sys('Petice odeslána. GM odpoví do 3–5 pracovních let.'); setTimeout(() => chat('Dobrý den, prosím restartujte klienta. S pozdravem, GM tým', 'gm', 'GM_Ondra'), 6000); }
  else if (c === 'help') openHelp();
  else if (c === 'loc') sys(`Souřadnice: ${Math.round(pl.x)}, ${Math.round(pl.y)}, ${Z.name}. Teď už jen najít, kde je to na mapě.`);
  else sys(`Neznámý příkaz /${c}. Zkus /unstuck, /sit, /gm, /loc nebo /help.`);
}

// ============================================================
//  Vstupy
// ============================================================
const isTyping = () => document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
addEventListener('keydown', e => {
  if (!running) return;
  if (isTyping()) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!dlgModal) closeDialog(); return; }
  if (k === 'enter') { e.preventDefault(); chatIn.focus(); return; }
  if (pl.jailUntil > T) return;
  keys[k] = true;
  const si = SKILLS.findIndex(s => s.key === k);
  if (si >= 0) { useSkill(si); return; }
  if (k === 'q') usePotion();
  else if (k === 'e') toggleSS();
  else if (k === 'x') toggleSit();
  else if (k === 'r') useSoE();
  else if (k === 'f' || k === 'tab') { e.preventDefault(); nextTarget(); }
  else if (k === 'b') setAuto(!pl.auto);
  else if (k === 'i') openInventory();
  else if (k === 'c') openChar();
  else if (k === 'h') openHelp();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

cv.addEventListener('pointerdown', e => {
  if (!running || pl.dead || pl.jailUntil > T) return;
  if (isTyping()) document.activeElement.blur();
  const wx = e.clientX + cam.x, wy = e.clientY + cam.y;
  const p = { x: wx, y: wy };
  // moby
  let best = null, bd = 1e9;
  for (const m of mobs) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - wx, m.y - m.size * .3 - wy);
    if (d < m.r + 16 && d < bd) { bd = d; best = m; }
  }
  if (best) {
    if (Z.town) return;
    setTarget(best);
    pl.attacking = true; pl.moveTo = null; pl.sitting = false;
    return;
  }
  for (const n of npcs) {
    if (Math.hypot(n.x - wx, n.y - 14 - wy) < 32) {
      pl.interact = n; pl.attacking = false; pl.sitting = false;
      pl.moveTo = { x: n.x, y: n.y + 30 };
      return;
    }
  }
  for (const f of fakes) {
    if (dist(f, p) < 24) {
      chat(pick(['nekupuju, neprodávám, jsem AFK', 'co čumíš', 'buff?', 'nejsem bot', 'hele, nevíš kde je Kruma?', 'pls nezabíjej']), 'whisper', f.name);
      return;
    }
  }
  if (pl.buffs.ud > T) return sysOnce('udmove', 'Při Ultimátní obraně se nehneš. Proto je ultimátní.', 3);
  pl.sitting = false;
  pl.interact = null;
  pl.attacking = false;
  pl.queued = null;
  pl.moveTo = { x: clamp(wx, 20, Z.w - 20), y: clamp(wy, 20, Z.h - 20) };
  if (pl.cast && pl.cast.breakable) { pl.cast = null; sys('Přerušeno. Chození a kouzlení zároveň neumíš.'); }
  fx.push({ type: 'click', x: pl.moveTo.x, y: pl.moveTo.y, t0: T, dur: .4 });
});

document.querySelector('.menu').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'inv') openInventory();
  else if (a === 'char') openChar();
  else if (a === 'auto') setAuto(!pl.auto);
  else if (a === 'help') openHelp();
  b.blur();
});

// ============================================================
//  Hotbar
// ============================================================
const HB_EXTRA = [
  { key: 'Q', icon: '🧪', name: 'Lektvar léčení', fn: usePotion },
  { key: 'E', icon: '✨', name: 'Soulshoty on/off', fn: toggleSS },
  { key: 'X', icon: '🪑', name: 'Sednout / vstát', fn: toggleSit },
  { key: 'F', icon: '🎯', name: 'Nejbližší cíl', fn: nextTarget },
  { key: 'R', icon: '📜', name: 'Svitek návratu', fn: useSoE },
];
let hbEls = [];
function buildHotbar() {
  const hb = $('#hotbar');
  hb.innerHTML = '';
  hbEls = [];
  SKILLS.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'hk' + (S.level < s.lv ? ' locked' : '');
    b.title = `${s.name} (${s.key}) – ${s.d}${S.level < s.lv ? ` [od úrovně ${s.lv}]` : ''}`;
    b.innerHTML = `${s.icon}<span class="k">${s.key}</span><span class="cd"></span>`;
    b.onclick = () => { useSkill(i); b.blur(); };
    hb.appendChild(b);
    hbEls.push({ el: b, cd: b.querySelector('.cd'), id: s.id, total: s.cd });
  });
  HB_EXTRA.forEach((h, i) => {
    const b = document.createElement('button');
    b.className = 'hk' + (i === 0 ? ' sep' : '');
    b.title = `${h.name} (${h.key})`;
    b.innerHTML = `${h.icon}<span class="k">${h.key}</span><span class="n"></span><span class="cd"></span>`;
    b.onclick = () => { h.fn(); b.blur(); };
    hb.appendChild(b);
    hbEls.push({ el: b, cd: b.querySelector('.cd'), n: b.querySelector('.n'), extra: h.key, id: h.key === 'Q' ? 'pot' : null, total: 5 });
  });
}

// ============================================================
//  HUD
// ============================================================
function setBar(sel, v, max, txt) {
  const b = $(sel);
  b.querySelector('i').style.width = clamp(v / max * 100, 0, 100) + '%';
  b.querySelector('span').textContent = txt;
}
let lastBuffs = null;
function updateHud() {
  const st = stats();
  $('#stName').textContent = S.name;
  $('#stLv').textContent = 'Lv ' + S.level;
  $('#stTitle').textContent = S.title || '';
  setBar('#status .hp', S.hp, st.maxHp, `${Math.round(S.hp)} / ${st.maxHp}`);
  setBar('#status .mp', S.mp, st.maxMp, `${Math.round(S.mp)} / ${st.maxMp}`);
  setBar('#status .xp', S.xp, xpNeed(S.level), (S.xp / xpNeed(S.level) * 100).toFixed(2) + ' %');
  $('#adena').textContent = `💰 ${fmt(S.adena)} adena`;
  $('#online').textContent = `Online: ${fmt(onlineN)} (z toho ${fmt(onlineN - 12)} botů)`;
  // buffy
  const bh = buffActive().map(k => `<div class="buff" title="${BUFF_INFO[k].name}">${BUFF_INFO[k].icon}<b>${Math.ceil(pl.buffs[k] - T)}</b></div>`).join('')
    + (pl.sitting ? '<div class="buff" title="Sedíš">🪑</div>' : '')
    + (S.ssOn ? '<div class="buff" title="Soulshoty zapnuty">✨</div>' : '');
  if (bh !== lastBuffs) { $('#buffs').innerHTML = bh; lastBuffs = bh; }
  // cíl
  const tg = $('#target');
  const t = validTarget() ? pl.target : null;
  if (t) {
    tg.classList.remove('hidden');
    $('#tgName').innerHTML = `<span style="color:${t.pk ? '#ff5c5c' : mobColor(t.lv)}">${esc(t.name)}</span> <small style="color:#9a927e">Lv ${t.lv}</small>`;
    setBar('#target .hp', t.hp, t.maxHp, `${Math.round(t.hp / t.maxHp * 100)} %`);
  } else tg.classList.add('hidden');
  // hotbar
  for (const h of hbEls) {
    if (h.id) {
      const left = (cds[h.id] || 0) - T;
      h.cd.style.height = left > 0 ? (left / h.total * 100) + '%' : '0';
    }
    if (h.extra === 'Q') h.n.textContent = S.inv.pot;
    if (h.extra === 'E') { h.n.textContent = S.inv.ss > 999 ? Math.floor(S.inv.ss / 1000) + 'k' : S.inv.ss; h.el.classList.toggle('on', S.ssOn); }
    if (h.extra === 'R') h.n.textContent = S.inv.soe;
    if (h.extra === 'X') h.el.classList.toggle('on', pl.sitting);
  }
  // cast
  const cb = $('#castbar');
  if (pl.cast) {
    cb.classList.remove('hidden');
    cb.querySelector('i').style.width = clamp((T - pl.cast.t0) / pl.cast.dur * 100, 0, 100) + '%';
    cb.querySelector('span').textContent = pl.cast.label;
  } else cb.classList.add('hidden');
  // vězení
  if (pl.jailUntil > T) $('#jailT').textContent = Math.ceil(pl.jailUntil - T) + ' s';
}

// ============================================================
//  Update
// ============================================================
function moveToward(e, tx, ty, spd, dt, stopAt = 0) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d <= stopAt + .5) return true;
  const step = Math.min(spd * dt, d - stopAt);
  e.x += dx / d * step; e.y += dy / d * step;
  if (e.face) { e.face.x = dx / d; e.face.y = dy / d; }
  e.walkT = (e.walkT || 0) + dt;
  return d - step <= stopAt + .5;
}

function updatePlayer(dt, st) {
  if (pl.dead) return;
  if (pl.jailUntil) {
    if (pl.jailUntil > T) return;
    pl.jailUntil = 0;
    $('#jail').classList.add('hidden');
    chat('Propuštěn z vězení. Chovej se slušně. A lidsky.', 'gm', 'GM_Ondra');
    enterZone('town');
    return;
  }
  // regenerace
  const mul = (pl.sitting ? 3 : 1) * (Z.town ? 4 : 1);
  S.hp = Math.min(st.maxHp, S.hp + st.maxHp * .008 * mul * dt);
  S.mp = Math.min(st.maxMp, S.mp + st.maxMp * .012 * mul * dt);

  if (pl.cast) {
    if (T - pl.cast.t0 >= pl.cast.dur) { const c = pl.cast; pl.cast = null; c.done(); }
    return;
  }
  const rooted = pl.buffs.ud > T;
  // klávesnice
  let kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let ky = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if ((kx || ky) && !rooted) {
    const l = Math.hypot(kx, ky);
    pl.sitting = false; pl.moveTo = null; pl.attacking = false; pl.interact = null; pl.queued = null;
    if (pl.cast && pl.cast.breakable) pl.cast = null;
    pl.x = clamp(pl.x + kx / l * st.spd * dt, 20, Z.w - 20);
    pl.y = clamp(pl.y + ky / l * st.spd * dt, 20, Z.h - 20);
    pl.face = { x: kx / l, y: ky / l };
    pl.walkT += dt;
    return;
  }
  if (pl.sitting) return;
  pl.atkCd -= dt;
  if (pl.attacking && validTarget()) {
    const m = pl.target;
    const range = pl.r + m.r + 22;
    const d = dist(pl, m);
    if (d > range) {
      if (!rooted) moveToward(pl, m.x, m.y, st.spd, dt, range - 4);
    } else {
      pl.face = { x: (m.x - pl.x) / d || 0, y: (m.y - pl.y) / d || 1 };
      if (pl.queued != null) {
        const sk = SKILLS[pl.queued];
        const ok = (cds[sk.id] || 0) <= T && S.mp >= sk.mp(S.level);
        const q = pl.queued;
        pl.queued = null;
        if (ok) { execSkill(q, m); pl.atkCd = Math.max(pl.atkCd, .4); return; }
      }
      if (pl.atkCd <= 0) {
        pl.atkCd = 1 / st.aspd;
        pl.swing = T;
        hitMob(m, 1);
      }
    }
    return;
  }
  if (pl.attacking && !validTarget()) { pl.attacking = false; pl.queued = null; }
  if (pl.moveTo && !rooted) {
    if (moveToward(pl, pl.moveTo.x, pl.moveTo.y, st.spd, dt)) {
      pl.moveTo = null;
      if (pl.interact) { const n = pl.interact; pl.interact = null; openNpc(n); }
    } else if (pl.interact && dist(pl, pl.interact) < 50) {
      const n = pl.interact; pl.interact = null; pl.moveTo = null; openNpc(n);
    }
  }
}

const fakeBusy = m => !!(m.fakeHit && m.fakeHit.prey === m);

function updateMobs(dt) {
  for (const m of mobs) {
    if (m.dead) {
      if (!m.boss && !m.pk && T > m.respawnAt) spawnMob(m);
      continue;
    }
    const dP = dist(m, pl);
    const canSee = !pl.dead && !pl.jailUntil;
    if (m.boss) { updateBoss(m, dP, dt); continue; }
    if (m.flee && m.fleeUntil > T && canSee) {
      // Elpí utíká
      const dx = m.x - pl.x, dy = m.y - pl.y, l = Math.hypot(dx, dy) || 1;
      m.x = clamp(m.x + dx / l * m.spd * 1.3 * dt, 40, Z.w - 40);
      m.y = clamp(m.y + dy / l * m.spd * 1.3 * dt, 40, Z.h - 40);
      m.walkT = (m.walkT || 0) + dt;
      continue;
    }
    if (!m.aggro && m.agr && canSee && dP < (m.pk ? 600 : 150) && !fakeBusy(m)) {
      m.aggro = true;
      if (m.mimic && !m.revealed) { m.revealed = true; float(m.x, m.y - 50, 'Byla to past!', '#ffb35c'); }
    }
    if (m.aggro && canSee) {
      if (!m.pk && Math.hypot(m.x - m.hx, m.y - m.hy) > 650) {
        m.aggro = false; m.hp = m.maxHp; m.playerDmg = 0;
        float(m.x, m.y - 40, 'Vrací se domů a léčí se. Typické.', '#9a927e');
        if (pl.target === m) { pl.target = null; pl.attacking = false; }
        continue;
      }
      const range = m.r + pl.r + 14;
      if (dP > range) moveToward(m, pl.x, pl.y, m.spd * (m.pk ? 1.8 : 1.15), dt, range - 2);
      else {
        m.atkCd -= dt;
        if (m.atkCd <= 0) {
          m.atkCd = m.pk ? 1.1 : 1.6;
          m.lunge = T;
          damagePlayer(m.atk, m);
        }
      }
      continue;
    }
    if (m.aggro && !canSee) m.aggro = false;
    if (fakeBusy(m)) continue;   // stojí a bojuje s falešným hráčem
    // procházka
    if (!m.wander && T > m.wanderAt) {
      m.wander = { x: clamp(m.hx + rand(-120, 120), 40, Z.w - 40), y: clamp(m.hy + rand(-120, 120), 40, Z.h - 40) };
    }
    if (m.wander && moveToward(m, m.wander.x, m.wander.y, m.spd * .45, dt)) {
      m.wander = null; m.wanderAt = T + rand(2, 6);
    }
  }
  // odstranit mrtvé PK-čko
  mobs = mobs.filter(m => !(m.pk && m.dead));
}

function updateBoss(m, dP, dt) {
  if (pl.dead) { m.aggro = false; return; }
  if (!m.aggro && dP < 520) {
    m.aggro = true;
    chat('ROOOAAAR! (překlad: „Další sólista? Vážně?")', 'shout', 'Antharas');
    m.breathAt = T + 5; m.quakeAt = T + 12;
  }
  if (!m.aggro) return;
  const pct = m.hp / m.maxHp;
  for (const [p, line] of [[.75, 'Tohle bylo jen lechtání. Moje máma kouše víc.'], [.5, 'Dobře, teď jsem naštvaný. Fakt hodně.'],
    [.25, 'ENRAGE! (Prosím, mám rodinu. Malé dráčky.)']]) {
    if (pct < p && !m.said[p]) { m.said[p] = 1; chat(line, 'shout', 'Antharas'); }
  }
  const enr = pct < .25;
  const range = m.r + pl.r + 10;
  if (dP > range) moveToward(m, pl.x, pl.y, m.spd * (enr ? 1.4 : 1), dt, range - 2);
  else {
    m.atkCd -= dt;
    if (m.atkCd <= 0) { m.atkCd = enr ? 1.4 : 2; m.lunge = T; damagePlayer(m.atk, m); }
  }
  if (T > m.breathAt) {
    m.breathAt = T + (enr ? 5.5 : 8);
    tele.push({ x: pl.x, y: pl.y, r: 115, t0: T, dur: 1.7, dmg: .32, src: m });
    float(m.x, m.y - 90, 'nadechuje se…', '#ffb35c', true);
  }
  if (T > m.quakeAt) {
    m.quakeAt = T + 15;
    fx.push({ type: 'quake', x: m.x, y: m.y, t0: T, dur: .8 });
    damagePlayer(stats().pdef * .5 + stats().maxHp * .08, m);
    sysOnce('quake', 'Antharas dupl. Celé doupě se třese. Tvoje kolena taky.', 30);
  }
}

function updateTele() {
  for (const t of tele) {
    if (T - t.t0 >= t.dur && !t.done) {
      t.done = true;
      fx.push({ type: 'boom', x: t.x, y: t.y, r: t.r, t0: T, dur: .6 });
      if (!pl.dead && Math.hypot(pl.x - t.x, pl.y - t.y) < t.r) {
        const st = stats();
        damagePlayer(st.maxHp * t.dmg + st.pdef * .5, t.src);
        sysOnce('breath', 'Stál jsi v ohni. Tip: v ohni se nestojí.', 20);
      }
    }
  }
  tele = tele.filter(t => !t.done);
}

function updateFakes(dt) {
  for (const f of fakes) {
    if (f.prey) {
      const m = f.prey;
      if (m.dead || !mobs.includes(m) || m.boss || m.pk) { f.prey = null; continue; }
      const d = dist(f, m);
      if (d > m.r + 30) { moveToward(f, m.x, m.y, 120, dt, m.r + 26); continue; }
      m.fakeHit = f;
      f.swing = (f.swing || 0) + dt;
      if (f.swing > .9) {
        f.swing = 0; f.lastSwing = T;
        const dmg = Math.round(m.maxHp / rand(5, 9));
        m.hp -= dmg; m.hitT = T;
        if (m.hp <= 0) {
          const wasMine = pl.target === m;
          const mine = m.playerDmg >= m.maxHp * .5;
          killMob(m, mine ? 'player' : 'fake');
          if (wasMine && !mine) {
            S.st.ks++;
            chat(pick(['sorry KS 😇', 'můj mob, sorry', 'KS? jaký KS?', 'byl jsem tu první (nebyl)', 'lol díky za tank']), 'normal', f.name);
            sysOnce('ks', 'Někdo ti ukradl moba. Vítej v Lineage… teda v Lajnidži.', 10);
          }
          m.fakeHit = null;
          f.prey = null; f.idleAt = T + rand(1, 3);
        }
      }
      continue;
    }
    if (f.moveTo) {
      if (moveToward(f, f.moveTo.x, f.moveTo.y, 100, dt)) { f.moveTo = null; f.idleAt = T + rand(1, 5); }
      continue;
    }
    if (T > f.idleAt) {
      const cand = !f.town && mobs.filter(m => !m.dead && !m.aggro && !m.boss && !m.pk && !fakeBusy(m) && dist(m, f) < 500);
      if (cand && cand.length && Math.random() < .7) {
        // občas si vybere zrovna hráčův cíl
        f.prey = validTarget() && !fakeBusy(pl.target) && dist(pl.target, f) < 400 && Math.random() < .35 ? pl.target : pick(cand);
      } else {
        const r = f.town ? [250, 1150, 300, 920] : [60, Z.w - 60, 60, Z.h - 60];
        f.moveTo = { x: clamp(f.x + rand(-250, 250), r[0], r[1]), y: clamp(f.y + rand(-250, 250), r[2], r[3]) };
      }
    }
  }
}

function updatePk() {
  if (Z.town || Z.boss || zoneId === 'ti' || pl.dead) return;
  if (T < pkAt) return;
  pkAt = T + rand(100, 200);
  if (mobs.some(m => m.pk)) return;
  const lv = S.level + 1;
  const a = rand(0, Math.PI * 2);
  const name = pick(PK_NAMES);
  mobs.push({
    kind: 'mob', pk: true, name, e: '🥷', lv, x: clamp(pl.x + Math.cos(a) * 500, 40, Z.w - 40), y: clamp(pl.y + Math.sin(a) * 500, 40, Z.h - 40),
    hx: 0, hy: 0, r: 15, size: 32, maxHp: Math.round((35 * Math.pow(lv, 1.1) + 12) * 3), hp: 0, atk: (4 + 3.2 * lv) * 1.1, def: lv * 1.2,
    spd: 75, agr: true, adena: 1, aggro: true, atkCd: 1, dead: false, hitT: 0, playerDmg: 0, col: '#2a2a2a', bob: 0,
  });
  const p = mobs[mobs.length - 1]; p.hp = p.maxHp;
  chat(pick(['hehe 🔪', 'čau, máš hezký věci', 'nic osobního, jen karma', 'tvůj drop je můj drop']), 'pk', name);
  sys(`⚠️ Pozor! Blíží se PK-čko ${name} (rudé jméno). Buď utíkej, nebo mu ukaž.`);
}

function updateWorld(dt) {
  // falešný chat
  if (T > chatAt) {
    chatAt = T + rand(5, 12);
    const [c, t] = pick(CHAT_LINES);
    chat(t, c, pick(FAKE_NAMES));
  }
  if (Math.random() < .03) onlineN = clamp(onlineN + randi(-6, 6), 3300, 3600);
  for (const k in pl.buffs) if (pl.buffs[k] <= T) delete pl.buffs[k];
  if (gm) {
    const left = Math.ceil(gm.until - T);
    const el = $('#gmT');
    if (el) el.textContent = `Zbývá ${left} s`;
    if (T > gm.until) { chat('Žádná odpověď. Bot jak vyšitý. Do vězení.', 'gm', 'GM_Ondra'); jail(); }
  }
  floats = floats.filter(f => T - f.t0 < (f.big ? 1.6 : 1.1));
  fx = fx.filter(f => T - f.t0 < f.dur);
}

// ============================================================
//  Kreslení
// ============================================================
function drawText(t, x, y, col, size = 12, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px "Trebuchet MS", sans-serif`;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}

function drawPawn(e, o) {
  const sc = o.scale || 1;
  ctx.save();
  ctx.translate(e.x, e.y);
  // stín
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 15 * sc, 6 * sc, 0, 0, 7); ctx.fill();
  ctx.scale(sc, sc);
  const sit = o.sit ? 7 : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.walkT * 12)) * 2.5 : 0;
  ctx.translate(0, -bob + sit);
  const f = e.face || { x: 0, y: 1 };
  const behind = f.y < -.2;
  // zbraň
  const drawWeapon = () => {
    const sw = o.swing != null && T - o.swing < .25 ? Math.sin((T - o.swing) / .25 * Math.PI) * 1.4 : 0;
    const ang = Math.atan2(f.y, f.x) - .9 + sw;
    ctx.save();
    ctx.translate(f.x * 6, -10 + f.y * 3);
    ctx.rotate(ang);
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 12; }
    ctx.strokeStyle = o.wcol || '#c9c9d4'; ctx.lineWidth = o.wide || 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4 + (o.wlen || 22), 0); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.restore();
  };
  if (behind) drawWeapon();
  // tělo
  ctx.fillStyle = o.body;
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -8, 11, 13 - sit * .4, 0, 0, 7); ctx.fill(); ctx.stroke();
  // pásek
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-10, -6, 20, 3);
  // hlava
  const hy = -25;
  if (o.ears) {
    ctx.fillStyle = o.skin;
    ctx.beginPath(); ctx.moveTo(-6, hy - 2); ctx.lineTo(-15, hy - 8); ctx.lineTo(-7, hy + 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, hy - 2); ctx.lineTo(15, hy - 8); ctx.lineTo(7, hy + 3); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = o.skin;
  ctx.beginPath(); ctx.arc(0, hy, 8.5, 0, 7); ctx.fill(); ctx.stroke();
  if (!behind) {
    ctx.fillStyle = '#111';
    const ex = f.x * 2.5;
    ctx.fillRect(ex - 4, hy - 1 + f.y, 2, 2.5); ctx.fillRect(ex + 2, hy - 1 + f.y, 2, 2.5);
    if (o.beard) { ctx.fillStyle = '#8a4a1a'; ctx.beginPath(); ctx.moveTo(-7, hy + 2); ctx.lineTo(7, hy + 2); ctx.lineTo(0, hy + 14); ctx.fill(); }
    if (o.tusks) { ctx.fillStyle = '#fff'; ctx.fillRect(ex - 4, hy + 4, 2, 4); ctx.fillRect(ex + 2, hy + 4, 2, 4); }
    if (o.mask) { ctx.fillStyle = '#111'; ctx.fillRect(-8, hy + 1, 16, 6); }
  }
  if (!behind) drawWeapon();
  ctx.restore();
}

function weaponGlow(e) {
  if (e >= 10) return '#ff4d6d';
  if (e >= 7) return '#c36bff';
  if (e >= 4) return '#4db8ff';
  return null;
}

function drawMob(m) {
  const s = m.size;
  const bob = Math.sin(T * 3 + m.bob) * (m.boss ? 4 : 1.5);
  // stín
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, s * .42, s * .15, 0, 0, 7); ctx.fill();
  let lx = 0, ly = 0;
  if (m.lunge && T - m.lunge < .2) {
    const k = Math.sin((T - m.lunge) / .2 * Math.PI) * 8;
    const d = dist(m, pl) || 1;
    lx = (pl.x - m.x) / d * k; ly = (pl.y - m.y) / d * k;
  }
  ctx.save();
  ctx.font = `${s}px ${EMOJI_FONT}`;
  ctx.fillStyle = '#000';   // barevné emoji přebírají alfu z fillStyle
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (m.mimic && !m.revealed) ctx.globalAlpha = 1;
  ctx.fillText(m.e, m.x + lx, m.y + ly + bob - s * .05);
  if (T - m.hitT < .12) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .5;
    ctx.fillText(m.e, m.x + lx, m.y + ly + bob - s * .05);
  }
  ctx.restore();
}

function drawEntityLabels(e) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (e.kind === 'mob') {
    if (e.mimic && !e.revealed) return;
    const top = e.y - e.size * (e.boss ? 1 : .95);
    const show = e === pl.target || e.hp < e.maxHp || e.boss || e.pk;
    drawText(`${e.name}${e.pk ? '' : ' ' + e.lv}`, e.x, top - (show ? 8 : 0), e.pk ? '#ff4d4d' : mobColor(e.lv), e.boss ? 15 : 11, e.boss || e.pk);
    if (show) {
      const w = e.boss ? 120 : 40;
      ctx.fillStyle = '#000'; ctx.fillRect(e.x - w / 2 - 1, top - 5, w + 2, 5);
      ctx.fillStyle = '#d33'; ctx.fillRect(e.x - w / 2, top - 4, w * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
  } else if (e.kind === 'npc') {
    drawText(e.title, e.x, e.y - 52, '#ffe08a', 10);
    drawText(e.name, e.x, e.y - 40, '#9fe0ff', 12, true);
  } else if (e.kind === 'fake' || e.kind === 'shop') {
    drawText(e.name, e.x, e.y - 40, '#fff', 11);
  }
}

function drawShopBox(s) {
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  const w = ctx.measureText(s.msg).width + 14;
  const x = s.x - w / 2, y = s.y - 74;
  ctx.fillStyle = 'rgba(120, 30, 80, .85)';
  ctx.strokeStyle = '#ff9ed1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, w, 18, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe3f2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s.msg, s.x, y + 9.5);
  ctx.textBaseline = 'alphabetic';
}

function drawFx() {
  for (const f of fx) {
    const k = (T - f.t0) / f.dur;
    ctx.save();
    if (f.type === 'ss') {
      ctx.strokeStyle = `rgba(120,200,255,${1 - k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y - 10, 10 + k * 28, 0, 7); ctx.stroke();
    } else if (f.type === 'die') {
      ctx.globalAlpha = 1 - k;
      ctx.font = `${f.size}px ${EMOJI_FONT}`; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      ctx.translate(f.x, f.y - k * 30);
      ctx.rotate(k * 1.2);
      ctx.fillText(f.e, 0, 0);
    } else if (f.type === 'slash') {
      ctx.strokeStyle = f.big ? `rgba(255,60,60,${1 - k})` : `rgba(255,240,160,${1 - k})`; ctx.lineWidth = f.big ? 6 : 4;
      ctx.beginPath(); ctx.arc(f.x, f.y - 14, 22 + k * 10, -2.4 + k, -0.6 + k); ctx.stroke();
      ctx.beginPath(); ctx.arc(f.x, f.y - 14, 16 + k * 10, 0.6 + k, 2.2 + k); ctx.stroke();
    } else if (f.type === 'whirl') {
      ctx.strokeStyle = `rgba(200,230,255,${1 - k})`; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.x, f.y - 8, 40 + k * 90, i * 2.1 + k * 6, i * 2.1 + k * 6 + 1.2); ctx.stroke(); }
    } else if (f.type === 'heal') {
      ctx.fillStyle = `rgba(140,255,140,${1 - k})`;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + k * 2;
        ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 18, f.y - 10 - k * 40 + Math.sin(a) * 6, 2.5, 0, 7); ctx.fill();
      }
    } else if (f.type === 'lvl') {
      ctx.strokeStyle = `rgba(255,220,100,${1 - k})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 + k * 60, 8 + k * 22, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,230,140,${(1 - k) * .4})`;
      ctx.fillRect(f.x - 14, f.y - 140 * (1 - k * .3), 28, 140 * (1 - k * .3));
    } else if (f.type === 'click') {
      ctx.strokeStyle = `rgba(140,255,140,${1 - k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 12 * (1 - k * .5), 5 * (1 - k * .5), 0, 0, 7); ctx.stroke();
    } else if (f.type === 'boom') {
      ctx.fillStyle = `rgba(255,120,30,${(1 - k) * .7})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.8 + k * .3), 0, 7); ctx.fill();
    } else if (f.type === 'quake') {
      ctx.strokeStyle = `rgba(200,150,90,${1 - k})`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, 60 + k * 600, 25 + k * 250, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }
}

function render() {
  const st = stats();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, W, H);
  cam.x = Z.w <= W ? (Z.w - W) / 2 : clamp(pl.x - W / 2, 0, Z.w - W);
  cam.y = Z.h <= H ? (Z.h - H) / 2 : clamp(pl.y - H / 2, 0, Z.h - H);
  let sx = 0, sy = 0;
  if (T - pl.hitT < .15 && S.hp < st.maxHp * .3) { sx = rand(-3, 3); sy = rand(-3, 3); }
  ctx.translate(-Math.round(cam.x) + sx, -Math.round(cam.y) + sy);
  ctx.drawImage(bg, 0, 0);

  // telegrafy dechu
  for (const t of tele) {
    const k = (T - t.t0) / t.dur;
    ctx.fillStyle = `rgba(255,60,20,${.15 + k * .3})`;
    ctx.strokeStyle = 'rgba(255,90,40,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, 7); ctx.stroke();
  }
  // kroužek pod cílem
  const tgt = validTarget() ? pl.target : pl.interact;
  if (tgt) {
    ctx.strokeStyle = tgt.kind === 'mob' ? (tgt.pk ? '#ff4d4d' : '#ffcf4d') : '#7fd0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]); ctx.lineDashOffset = -T * 20;
    const rr = tgt.r || 18;
    ctx.beginPath(); ctx.ellipse(tgt.x, tgt.y + 2, rr + 8, (rr + 8) * .4, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
  }

  // entity seřazené podle y
  const ents = [];
  for (const m of mobs) if (!m.dead) ents.push(m);
  ents.push(...fakes, ...npcs);
  if (!pl.dead) ents.push(pl);
  ents.sort((a, b) => a.y - b.y);
  const r = RACES[S.race];
  for (const e of ents) {
    if (e === pl) {
      drawPawn(pl, {
        body: r.body, skin: r.skin, scale: r.scale, ears: r.ears, beard: r.beard, tusks: r.tusks,
        moving: !!(pl.moveTo || (pl.attacking && validTarget() && dist(pl, pl.target) > pl.r + pl.target.r + 22) || keys.w || keys.a || keys.s || keys.d),
        walkT: pl.walkT, sit: pl.sitting, swing: pl.swing, glow: weaponGlow(S.weapon.e),
        wlen: 14 + WEAPONS[S.weapon.id].g * 3 + (S.weapon.id ? 4 : 0), wide: S.weapon.id ? 3 : 4,
        wcol: S.weapon.id ? '#d4d6e0' : '#7a5a2a',
      });
      if (pl.buffs.ud > T) {
        ctx.strokeStyle = `rgba(120,200,255,${.5 + Math.sin(T * 8) * .2})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pl.x, pl.y - 16, 30, 0, 7); ctx.stroke();
      }
      ctx.textAlign = 'center';
      if (S.title) drawText(S.title, pl.x, pl.y - 54 * r.scale, '#c6e88f', 10);
      drawText(S.name, pl.x, pl.y - 42 * r.scale, '#fff', 12, true);
    } else if (e.kind === 'mob') {
      if (e.pk) drawPawn(e, { body: '#2a2a2a', skin: '#c9a184', moving: true, walkT: T, swing: e.lunge, mask: 1, glow: '#ff4d6d', wcol: '#eee' });
      else drawMob(e);
      drawEntityLabels(e);
    } else if (e.kind === 'fake') {
      drawPawn(e, { body: e.col, skin: e.skin, moving: !!(e.moveTo || (e.prey && dist(e, e.prey) > e.prey.r + 30)), walkT: e.walkT, swing: e.lastSwing });
      drawEntityLabels(e);
    } else if (e.kind === 'npc') {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, 16, 6, 0, 0, 7); ctx.fill();
      ctx.font = `36px ${EMOJI_FONT}`; ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(e.e, e.x, e.y + Math.sin(T * 2 + e.x) * 1.5);
      drawEntityLabels(e);
    } else if (e.kind === 'shop') {
      drawPawn(e, { body: e.col, skin: e.skin, sit: true });
      drawEntityLabels(e);
      drawShopBox(e);
    }
  }
  drawFx();
  // plovoucí texty
  ctx.textAlign = 'center';
  for (const f of floats) {
    const k = (T - f.t0) / (f.big ? 1.6 : 1.1);
    ctx.globalAlpha = 1 - k * k;
    drawText(f.txt, f.x, f.y - k * 34, f.col, f.big ? 18 : 13, true);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // nízké HP = rudé okraje
  if (!pl.dead && S.hp < st.maxHp * .25) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, `rgba(180,0,0,${.35 + Math.sin(T * 6) * .1})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (pl.dead) { ctx.fillStyle = 'rgba(40,40,40,.45)'; ctx.fillRect(0, 0, W, H); }
}

// ============================================================
//  Smyčka
// ============================================================
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
}
addEventListener('resize', resize);
resize();

let last = 0, speed = 1;   // speed jen pro ladění z konzole
function frame(now) {
  const dt0 = Math.min(.05, (now - last) / 1000 || 0);
  last = now;
  for (let i = 0; i < speed && running; i++) {
    const dt = dt0;
    T += dt;
    S.st.time += dt;
    const st = stats();
    updateAuto(st);
    updatePlayer(dt, st);
    updateMobs(dt);
    updateTele();
    updateFakes(dt);
    updatePk();
    updateWorld(dt);
    render();
    if (T > hudAt) { hudAt = T + .1; updateHud(); }
    if (T > saveAt) { saveAt = T + 10; save(); }
  }
  requestAnimationFrame(frame);
}

// ============================================================
//  Tvorba postavy
// ============================================================
let selRace = 'human';
function buildCreate() {
  const rc = $('#races');
  rc.innerHTML = Object.entries(RACES).map(([id, r]) =>
    `<button class="race ${id === selRace ? 'sel' : ''}" data-r="${id}"><b>${r.name}</b><small>${r.desc}</small></button>`).join('');
  rc.onclick = e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    selRace = b.dataset.r;
    rc.querySelectorAll('.race').forEach(x => x.classList.toggle('sel', x === b));
  };
  const old = load();
  if (old) {
    $('#cContinue').classList.remove('hidden');
    $('#btnContinue').textContent = `▶ Pokračovat: ${old.name} (${RACES[old.race].name}, lv ${old.level})`;
    $('#btnContinue').onclick = () => start(old);
  }
  $('#btnStart').onclick = () => {
    let n = $('#cName').value.trim().replace(/\s+/g, '_');
    if (!n) n = pick(['xXLegolasXx', 'Nováček', 'DarkSlayer', 'Pepa_Zabiják', 'Elfíček']) + randi(1, 99);
    if (old && !confirm(`Opravdu smazat postavu ${old.name} (lv ${old.level}) a začít znovu?`)) return;
    start(freshSave(n, selRace));
  };
  $('#cName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnStart').click(); e.stopPropagation(); });
}

function start(save0) {
  S = save0;
  // doplnění chybějících polí ze starších uložení
  const f = freshSave(S.name, S.race);
  for (const k in f) if (S[k] === undefined) S[k] = f[k];
  for (const k in f.inv) if (S.inv[k] === undefined) S.inv[k] = f.inv[k];
  for (const k in f.st) if (S.st[k] === undefined) S.st[k] = f.st[k];
  $('#create').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  buildHotbar();
  running = true;
  const z = S.zone && ZONES[S.zone] ? S.zone : 'town';
  enterZone(z);
  const st = stats();
  S.hp = Math.min(S.hp, st.maxHp); S.mp = Math.min(S.mp, st.maxMp);
  if (S.hp <= 0) S.hp = st.maxHp * .5;
  chatAt = T + 3;
  if (S.st.kills === 0 && S.level === 1) {
    sys(`Vítej v Adenu, ${S.name}! Svět potřebuje hrdinu. Zatím má 3 400 botů.`);
    sys('Tip: zajdi za Gatekeeperkou Ludmilou (nahoře 🧙) a teleportuj se zdarma na Mluvící ostrov.');
    sys('Klikni na moba = útok. 1–6 dovednosti, Q lektvar, E soulshoty, X sednout. ❓ = nápověda.');
  } else {
    sys(`Vítej zpět, ${S.name}. Mobové se mezitím respawnuli. Překvapivě.`);
  }
  updateHud();
}

buildCreate();
requestAnimationFrame(frame);

// pro ladění v konzoli
window.__l2 = { get S() { return S; }, pl, get mobs() { return mobs; }, enterZone, gainXp, setSpeed: v => { speed = v; } };
})();
