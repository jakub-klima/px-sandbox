'use strict';
/* Lajnidž II – Interlude
   Zjednodušená a nepříliš vážná single-player parodie na Lineage II: Interlude
   a na privátní servery, které ho drží při životě. */
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
const SAVE_KEY = 'lajnidz2-save-v2';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

// ============================================================
//  Data
// ============================================================
const RACES = {
  human: { name: 'Human', body: '#3a6ea5', skin: '#f1d3b0', hp: 1, mp: 1, atk: 1, spd: 1, adena: 1, scale: 1, crit: .1,
    classes: ['Human Fighter', 'Warrior', 'Gladiator', 'Duelist'],
    desc: 'Vyvážený. Na x50 serveru z něj bude Gladiator s Damascus*Damascus. Jako z každého druhého.' },
  elf: { name: 'Elf', body: '#4fa36b', skin: '#f6e1c8', hp: .9, mp: 1.15, atk: .95, spd: 1.25, adena: 1, scale: 1, ears: 1, crit: .1,
    classes: ['Elven Fighter', 'Elven Knight', 'Sword Singer', 'Sword Muse'],
    desc: 'Nejrychlejší. Skončí jako Sword Singer a celý život bude zpívat ostatním na rebuff.' },
  delf: { name: 'Dark Elf', body: '#5b3790', skin: '#a99cc8', hp: .85, mp: 1.1, atk: 1.2, spd: 1.1, adena: 1, scale: 1, ears: 1, crit: .14,
    classes: ['Dark Fighter', 'Palus Knight', 'Bladedancer', 'Spectral Dancer'],
    desc: 'Nejvíc P.Atk, nejmíň HP. Skončí jako BD a bude tančit, dokud party neřekne dost.' },
  orc: { name: 'Orc', body: '#a5532f', skin: '#7a9a54', hp: 1.3, mp: .8, atk: 1.05, spd: .95, adena: 1, scale: 1.15, tusks: 1, crit: .1,
    classes: ['Orc Fighter', 'Orc Raider', 'Destroyer', 'Titan'],
    desc: 'Nejvíc HP. Destroyer s Frenzy a Guts je nejnebezpečnější, když má skoro umřít.' },
  dwarf: { name: 'Dwarf', body: '#b58b2a', skin: '#e8c29a', hp: 1.1, mp: .9, atk: .95, spd: .9, adena: 1.6, scale: .82, beard: 1, crit: .1,
    classes: ['Dwarven Fighter', 'Scavenger', 'Bounty Hunter', 'Fortune Seeker'],
    desc: 'Spoil, Sweeper a +60 % adeny. Bez trpaslíka by server neměl materiály ani craftery.' },
};
const PROF_LV = [0, 20, 40, 76];
const PROF_PRICE = [0, 0, 150000, 800000];

const GRADES = ['NG', 'D', 'C', 'B', 'A', 'S'];
const gradeForLv = lv => lv >= 76 ? 5 : lv >= 61 ? 4 : lv >= 52 ? 3 : lv >= 40 ? 2 : lv >= 20 ? 1 : 0;
const WEAPONS = [
  { name: 'Short Sword', g: 0, atk: 8, price: 0, lv: 1, d: 'Startovní meč. Všichni s ním začínali.' },
  { name: 'Long Sword', g: 0, atk: 24, price: 4000, lv: 5, d: 'Klasika z Talking Islandu. Každý ho měl.' },
  { name: 'Sword of Revolution', g: 1, atk: 79, price: 90000, lv: 20, d: 'D-grade. První zbraň, se kterou ses necítil trapně.' },
  { name: 'Samurai Longsword', g: 2, atk: 136, price: 600000, lv: 40, d: 'Top C. Dva z nich a máš dual Samurai*Samurai.' },
  { name: 'Sword of Damascus', g: 3, atk: 194, price: 1400000, lv: 52, d: 'B-grade. Gladiátoři ho nosí po dvou.' },
  { name: 'Tallum Blade', g: 4, atk: 213, price: 2200000, lv: 61, d: 'A-grade. Na +4 svítí. Na +4 taky praská.' },
  { name: 'Forgotten Blade', g: 5, atk: 251, price: 3900000, lv: 76, d: 'S-grade, 251 P.Atk. Každý si pamatuje, kdo ho měl na serveru první.' },
];
const ARMORS = [
  { name: "Squire's Shirt", g: 0, def: 0, hp: 0, price: 0, lv: 1, d: 'Startovní košile. Ta díra tam byla už v betě.' },
  { name: 'Wooden Breastplate', g: 0, def: 6, hp: 30, price: 3000, lv: 5, d: 'Dřevo. Chrání hlavně před nudou.' },
  { name: 'Brigandine set', g: 1, def: 16, hp: 80, price: 70000, lv: 20, d: 'D-grade heavy. Ten zvuk kroků si pamatuješ dodnes.' },
  { name: 'Full Plate set', g: 2, def: 32, hp: 180, price: 450000, lv: 40, d: 'C-grade heavy. Cinká. Moby tě slyší až z Oren.' },
  { name: 'Blue Wolf set', g: 3, def: 52, hp: 320, price: 1100000, lv: 52, d: 'B-grade. Polovina serveru vypadá stejně.' },
  { name: 'Dark Crystal set', g: 4, def: 76, hp: 480, price: 1700000, lv: 61, d: 'A-grade. Temný, krystalový a hlavně drahý.' },
  { name: 'Imperial Crusader set', g: 5, def: 104, hp: 700, price: 3000000, lv: 76, d: 'S-grade heavy. Ve full IC tě poznají i v Giranu přes 400 offline shopů.' },
];
const SS_COST = [2, 8, 20, 40, 70, 120];
const EW_PRICE = [0, 20000, 60000, 140000, 280000, 550000];
const EA_PRICE = [0, 4000, 12000, 28000, 50000, 90000];
const SAFE_W = 3, SAFE_A = 4, MAX_ENCH = 16, ENCH_RATE = 2 / 3;
const POT_PRICE = 100, MPOT_PRICE = 200, SOE_PRICE = 400, BSOE_PRICE = 4000;

const BASE_SKILLS = [
  { id: 'ps', icon: '💥', name: 'Power Strike', lv: 1, cd: 4, mp: L => 4 + L * .5, type: 'hit', mult: 2.2,
    d: 'Praštíš silněji. Na tomhle skillu jsi strávil prvních 20 levelů.' },
  { id: 'warcry', icon: '📯', name: 'War Cry', lv: 10, cd: 60, mp: L => 8 + L * .4, type: 'buff', buff: 'warcry', dur: 45,
    d: '+20 % P.Atk na 45 s. Křičíš. Mobům je to jedno, tobě to pomáhá.' },
  { id: 'dash', icon: '💨', name: 'Dash', lv: 18, cd: 40, mp: L => 10 + L * .4, type: 'buff', buff: 'dash', dur: 15,
    d: '+35 % rychlost na 15 s. Před Tyrannosaurem to nestačí.' },
  { id: 'whirl', icon: '🌀', name: 'Whirlwind', lv: 28, cd: 8, mp: L => 10 + L, type: 'aoe', mult: 1.5,
    d: 'AoE kolem tebe. Ideální na tahání půlky Crumy.' },
  { id: 'ud', icon: '🛡️', name: 'Ultimate Defense', lv: 36, cd: 60, mp: L => 20 + L, type: 'ud', dur: 8,
    d: 'UD: −90 % poškození na 8 s, ale nehneš se. Každý tank ho zmáčkl o vteřinu později.' },
  { id: 'lethal', icon: '☠️', name: 'Lethal Blow', lv: 46, cd: 14, mp: L => 20 + L, type: 'hit', mult: 3.5, lethal: true,
    d: '3,5× poškození a šance na lethal. Na raid bosse lethal nefunguje, stejně jako na retailu.' },
];
const RACE_SKILL = {
  human: { icon: '⚔️', name: 'Triple Slash', lv: 40, prof: 2, cd: 10, mp: L => 25 + L, type: 'triple', mult: 1.3,
    d: 'Gladiátorův trojitý sek. Sonic Force nečekej, ten je na jiném patchi tvé paměti.' },
  elf: { icon: '🎵', name: 'Song of Hunter', lv: 40, prof: 2, cd: 90, mp: L => 30 + L, type: 'buff', buff: 'hunter', dur: 60,
    d: 'Sword Singer zpívá sám sobě. +30 % šance na krit. Party je offline.' },
  delf: { icon: '💃', name: 'Dance of Fury', lv: 40, prof: 2, cd: 90, mp: L => 30 + L, type: 'buff', buff: 'dof', dur: 60,
    d: 'BD tančí. +15 % rychlost útoku. Tentokrát konečně pro sebe.' },
  orc: { icon: '😡', name: 'Frenzy', lv: 40, prof: 2, cd: 120, mp: L => 20 + L, type: 'buff', buff: 'frenzy', dur: 30, low: .3,
    d: 'Jen pod 30 % HP: 2× P.Atk na 30 s. fr+guts, nejstarší destroyerský trik.' },
  dwarf: { icon: '🧤', name: 'Spoil', lv: 20, prof: 1, cd: 3, mp: L => 6 + L * .3, type: 'spoil',
    d: 'Označí cíl. Po zabití automaticky proběhne Sweeper a padnou materiály navíc.' },
};
let SK = [];   // skilly aktuální postavy (základní + rasový)

const BUFF_INFO = {
  might: { icon: '💪', name: 'Might (+12 % P.Atk)' },
  shield: { icon: '🧱', name: 'Shield (+15 % P.Def)' },
  haste: { icon: '⚡', name: 'Haste (+33 % rychlost útoku)' },
  ww: { icon: '🍃', name: 'Wind Walk (+20 % pohyb)' },
  btb: { icon: '❤️', name: 'Bless the Body (+30 % max HP)' },
  focus: { icon: '🎯', name: 'Focus (+15 % šance na krit)' },
  dw: { icon: '💀', name: 'Death Whisper (+krit. poškození)' },
  bers: { icon: '👹', name: 'Berserker Spirit' },
  warcry: { icon: '📯', name: 'War Cry (+20 % P.Atk)' },
  dash: { icon: '💨', name: 'Dash (+35 % pohyb)' },
  hunter: { icon: '🎵', name: 'Song of Hunter (+30 % krit)' },
  dof: { icon: '💃', name: 'Dance of Fury (+15 % rychlost útoku)' },
  frenzy: { icon: '😡', name: 'Frenzy (2× P.Atk)' },
  ud: { icon: '🛡️', name: 'Ultimate Defense' },
};

// typ moba: [jméno, emoji, level, vlastnosti]
const ZONES = {
  town: { name: 'Town of Giran', town: true, w: 1400, h: 1000, spawn: [700, 700], base: '#6c6352', tile: '#7b715f' },
  ti: { name: 'Talking Island', lvTxt: '1–15', price: 0, w: 2000, h: 1500, spawn: [160, 750],
    base: '#3f7a3a', blot: '#57923f', decor: ['🌳', '🌲', '🌿', '🌼', '🌷', '🌾'], decorN: 110, count: 18,
    junk: ['Animal Skin', 'Animal Bone', 'Stem'],
    note: 'Na retailu sem jede loď z Gludin Harbor. Tady teleport zdarma, je to x50.',
    mobs: [
      ['Gremlin', '👺', 1, {}], ['Young Keltir', '🦊', 3, { hp: .8 }], ['Elpy', '🐰', 5, { flee: 1, spd: 1.2 }],
      ['Keltir', '🦊', 7, {}], ['Wolf', '🐺', 9, { agr: 1, spd: 1.2 }], ['Orc Fighter', '👹', 12, {}], ['Orc Archer', '👹', 14, { agr: 1 }],
    ] },
  agony: { name: 'Ruins of Agony', lvTxt: '15–25', price: 8000, w: 2200, h: 1600, spawn: [180, 800],
    base: '#5b5340', blot: '#6e6550', decor: ['🏚️', '⚰️', '🌵', '🦴', '🗿'], decorN: 90, count: 18,
    junk: ['Coarse Bone Powder', 'Iron Ore', 'Charcoal', 'Thread'],
    note: 'Kostlivci, zombíci a spoileři, kteří ti seberou moba před nosem.',
    mobs: [
      ['Shield Skeleton', '💀', 16, { hp: 1.3 }], ['Skeleton Scout', '💀', 18, { agr: 1 }], ['Zombie Soldier', '🧟', 20, { hp: 1.3, spd: .6 }],
      ['Skeleton Bowman', '💀', 22, { agr: 1 }], ['Ruin Spartoi', '☠️', 24, { agr: 1 }],
    ] },
  marsh: { name: 'Cruma Marshlands', lvTxt: '25–35', price: 22000, w: 2200, h: 1600, spawn: [180, 800],
    base: '#34483a', blot: '#2c5a4a', decor: ['🌿', '🍂', '🌾', '🍄', '🌳'], decorN: 100, count: 18,
    junk: ['Suede', 'Steel', 'Varnish', 'Coal'],
    note: 'Stakato všude. Smrdí to tu, mobové i hráči.',
    mobs: [
      ['Marsh Stakato', '🦗', 26, {}], ['Marsh Stakato Worker', '🦗', 29, {}], ['Marsh Stakato Soldier', '🦗', 32, { agr: 1 }],
      ['Marsh Stakato Drone', '🦟', 34, { agr: 1, spd: 1.3 }],
    ] },
  cruma: { name: 'Cruma Tower', lvTxt: '35–48', price: 35000, w: 2000, h: 1500, spawn: [160, 750],
    base: '#47434f', tile: '#524d5c', decor: ['🕯️', '⛓️', '🏺', '🗝️'], decorN: 70, count: 18,
    junk: ['Mithril Ore', 'Silver Nugget', 'Stone of Purity', 'Oriharukon Ore'],
    note: 'Porta, Excuro, Mordeo, Krator… a nahoře Core, ke kterému tě stejně nikdo nevezme.',
    mobs: [
      ['Porta', '🗿', 36, { hp: 1.4, spd: .6 }], ['Excuro', '🦂', 39, { agr: 1 }], ['Mordeo', '👁️', 41, {}],
      ['Krator', '🦀', 43, { hp: 1.2 }], ['Catherok', '🐍', 45, { agr: 1 }],
      ['Treasure Chest', '📦', 47, { adena: 4, hp: 1.2, spd: .8, mimic: 1 }],
    ] },
  ant: { name: 'Ant Nest', lvTxt: '40+', price: 40000, w: 1400, h: 1100, spawn: [700, 980],
    base: '#5a4630', blot: '#6e5638', decor: ['🥚', '🦴', '🍂', '🕳️'], decorN: 50, boss: 'qa',
    note: 'Queen Ant. Nejdřív zabij Nurse Ants, jinak ji budou léčit do soudného dne.' },
  dv: { name: 'Dragon Valley', lvTxt: '48–65', price: 70000, w: 2400, h: 1700, spawn: [180, 850],
    base: '#6a4a33', blot: '#7d5a3c', decor: ['🌋', '🦴', '🌵', '🔥', '⛰️'], decorN: 90, count: 18,
    junk: ['Adamantite Nugget', 'Asofe', 'Thons', 'Enria'],
    note: 'Pěšky z Giranu daleko, teleportem draho. Drakové, gargoyly a Thunder Wyrmové.',
    mobs: [
      ['Cave Servant', '💀', 50, {}], ['Cave Keeper', '🗿', 53, { hp: 1.3, spd: .7 }], ['Dustwind Gargoyle', '🦇', 56, { agr: 1, spd: 1.3 }],
      ['Drake', '🐉', 60, { agr: 1 }], ['Thunder Wyrm', '🦕', 63, { hp: 1.4, agr: 1 }],
    ] },
  primeval: { name: 'Primeval Isle', lvTxt: '65–78', price: 120000, w: 2400, h: 1700, spawn: [180, 850],
    base: '#3d6b2c', blot: '#2f5a24', decor: ['🌴', '🌿', '🥚', '🌋', '🌴'], decorN: 110, count: 18,
    junk: ['Synthetic Cokes', 'Durable Metal Plate', 'Varnish of Purity', 'Mold Hardener'],
    note: 'Novinka z Interlude. Dinosauři. A Tyrannosaurus, který onehitne úplně každého.',
    mobs: [
      ['Ornithomimus', '🐓', 66, { spd: 1.3 }], ['Deinonychus', '🦎', 69, { agr: 1, spd: 1.2 }], ['Velociraptor', '🦖', 72, { agr: 1, spd: 1.3 }],
      ['Pterosaur', '🦅', 75, { agr: 1 }], ['Tyrannosaurus', '🦖', 78, { agr: 1, hp: 3, atk: 7, size: 78, rare: 1 }],
    ] },
  lair: { name: "Antharas' Lair", lvTxt: '76+', price: 150000, w: 1400, h: 1100, spawn: [700, 980],
    base: '#3a2420', blot: '#5a2a1c', decor: ['🦴', '💀', '🔥', '💎'], decorN: 40, boss: 'antharas', portal: true,
    note: 'Heart of Warding. Theodric tě bez Portal Stone nepustí. Na retailu tu je 200 lidí, ty jdeš sám.' },
};
const ZONE_ORDER = ['ti', 'agony', 'marsh', 'cruma', 'ant', 'dv', 'primeval', 'lair'];

const BOSSES = {
  qa: { name: 'Queen Ant', e: '🐜', lv: 40, hp: 48000, atk: 185, def: 48, size: 110, r: 46, spd: 40, respawnMin: 3, ring: 'qa',
    adena: 300000, xpMul: 15 },
  antharas: { name: 'Antharas', e: '🐲', lv: 79, hp: 280000, atk: 460, def: 110, size: 140, r: 62, spd: 55, respawnMin: 5, ring: 'ant',
    adena: 3000000, xpMul: 25 },
};

const TOWN_NPCS = [
  { id: 'gk', name: 'Clarissa', title: 'Gatekeeper', e: '🧙', x: 700, y: 300 },
  { id: 'shop', name: 'Grocer', title: 'Lektvary, SoE, soulshoty', e: '🤵', x: 400, y: 410 },
  { id: 'gmshop', name: 'GM Shop', title: 'custom NPC', e: '💂', x: 1000, y: 410 },
  { id: 'gm', name: 'Grand Master', title: 'Učení skillů', e: '🧔', x: 230, y: 560 },
  { id: 'cm', name: 'Class Manager', title: 'custom NPC', e: '🎓', x: 1170, y: 560 },
  { id: 'buff', name: 'Newbie Helper', title: 'Buffy · NPC Buffer', e: '🧚', x: 300, y: 760 },
  { id: 'judge', name: 'Black Judge', title: 'Death Penalty', e: '⚖️', x: 1100, y: 760 },
  { id: 'gab', name: 'Gabrielle', title: 'Audience with the Land Dragon', e: '👸', x: 470, y: 900 },
  { id: 'wh', name: 'Warehouse Keeper', title: 'Sklad', e: '📦', x: 930, y: 900 },
];
const MAMMON = { id: 'mammon', name: 'Merchant of Mammon', title: 'Seven Signs', e: '🧞', x: 700, y: 820 };
// typ: sell = růžová, buy = žlutá, craft = modrá (jako bubliny soukromých obchodů v klientu)
const TOWN_SHOPS = [
  { id: 'scam', type: 'sell', name: 'xX_Legolas_Xx', msg: 'WTS +16 Draconic Bow {Focus}', x: 540, y: 540, col: '#3d8b5a' },
  { id: 'ssbot', type: 'sell', name: 'Bot_Pepa_07', msg: 'Soulshoty všech gradů -40 %', x: 860, y: 540, col: '#555' },
  { id: 'spoiler', type: 'buy', name: 'Spoiler_Pavel', msg: 'WTB Animal Bone, CBP, cokoliv', x: 520, y: 700, col: '#b58b2a' },
  { id: 'craft', type: 'craft', name: 'Craft_Trpajzlík', msg: 'Craft SS z tvých matů, 100 %', x: 880, y: 700, col: '#b58b2a' },
  { id: 'party', type: 'sell', name: 'MegaOrk', msg: 'LFP Antharas (máme 2 + bota)', x: 700, y: 470, col: '#a5532f' },
  { id: 'rmt', type: 'sell', name: 'Zlatokop69', msg: 'WTS adena za Kč, rychle', x: 1240, y: 870, col: '#777' },
];

const FAKE_NAMES = ['xXLegolasXx', 'DarkAvenger', 'ShilenKnight', 'BD_Boxik', 'SWS_Lucka', 'Spoiler_Pavel', 'HealPls', 'Kekel',
  'Warlord_Tonda', 'Prophet_Bufík', 'EEčko', 'SE_Monika', 'Necro_Pepa', 'Titan_2006', 'DaggerMan', 'Archer_Zdenál',
  'Doomcryer', 'OverlordKarel', 'Bot_123', 'Bot_456', 'AFK_Mirek', 'Farmář', 'Sven', 'Jarmila', 'Kuba_z_Brna', 'xXxDarkElfxXx'];
const PK_NAMES = ['PKčko_Rambo', 'Zlobivý_Zdeněk', 'KarmaNula', 'RudýJarda', 'Gankster', 'ChaoticDan'];
const FAKE_COLORS = ['#3a6ea5', '#4fa36b', '#5b3790', '#a5532f', '#b58b2a', '#8a3a5a', '#2f7a7a', '#777'];
const CLANS = ['HateYou', 'Legion', 'Elitní_Kočičky', 'DeathSquad', 'NoobAcademy', 'Rodina'];

const CHAT_LINES = [
  ['trade', 'WTS Draconic Bow {Focus} +6, PM nabídky'], ['trade', 'WTB EWS, platím adenou nebo slibem'],
  ['trade', 'WTS DC set + Tallum helma, levně'], ['trade', 'WTB Top LS 76, PM'], ['trade', 'WTS Ring of Queen Ant 50kk'],
  ['trade', 'WTB Stone of Purity a Coarse Bone Powder'], ['trade', 'WTS Arcana Mace {Acumen}, mágové PM'],
  ['trade', 'WTT Angel Slayer za Heaven\'s Divider'], ['trade', 'WTB Blessed EWS, zaplatím cokoliv'],
  ['trade', 'WTS Red Soul Crystal stage 13'], ['trade', 'WTB Giant\'s Codex'], ['trade', 'WTS Wolf Collar, vlčí mládě skoro necítí'],
  ['trade', 'WTS +3 Short Sword, safe enchant, nabídněte'], ['trade', 'WTB Varnish of Purity 200 ks'],
  ['shout', 'LFP Primeval, mám BD a SWS!'], ['shout', 'LF BD/SWS do party, máme Bishopa'], ['shout', 'LF SE na QA, nursky zvládneme'],
  ['shout', 'kdo jde Baiuma? kdo má Blooded Fabric?'], ['shout', 'Valakas za 3 dny, kdo má Floating Stone?'],
  ['shout', 'Frintezza CC hledá dva BD'], ['shout', 'Giran siege v sobotu ve 20:00, kdo za nás?'],
  ['shout', 'Kde je dnes kovář Mammona???'], ['shout', 'Dawn nebo Dusk? Dusk vede!'],
  ['shout', 'GM POMOC, zasekl jsem se v textuře u Cruma Tower'], ['shout', 'LF clan, 74 Gladiator, mám Damascus*Damascus'],
  ['shout', 'Antharas se spawnul?? ne??? ok'], ['shout', 'KDO MI KRADE MOBY NA PRIMEVALU'],
  ['normal', 'proč mi zase prasknul Tallum na +4'], ['normal', 'safe je +3, od +4 se modlíš'], ['normal', 'BD dance pls'],
  ['normal', 'buff pls'], ['normal', 'nemám SS, kdo půjčí?'], ['normal', 'zase lag v Giranu, 400 offline shopů'],
  ['normal', 'Elpy mi utekla s dropem'], ['normal', 'jsem AFK, nezabíjejte mě'], ['normal', 'lol'],
  ['normal', 'kde se mění Ancient Adena?'], ['normal', 'potřebuju 1 Varnish of Purity'], ['normal', 'Death Penalty 6, jdu za Black Judgem'],
  ['normal', 'kdo jde na Oly? hero je jistej'], ['normal', 'Noblesse quest je za trest'], ['normal', 'Tyrannosaurus mě onehitnul'],
  ['normal', 'kdo má Strider?'], ['normal', 'z Giranu do Dragon Valley pěšky? nikdy víc'], ['normal', 'měl jsem 99,99 % a umřel jsem'],
  ['normal', 'kde je Theodric?'], ['normal', 'proč je Elpy rychlejší než já'], ['normal', 'Seven Signs: zase vyhrál Dusk, Mammon nikde'],
  ['party', 'BD, dance!'], ['party', 'rebuff za minutu'], ['party', 'pozor, aggro'], ['party', 'SE kde je heal?!'], ['party', 'kdo tahá moby? já ne'],
  ['clan', 'clan war s HateYou zítra'], ['clan', 'kdo má CP poty?'], ['clan', 'leader offline 3 týdny, kdo má práva?'],
  ['clan', 'reputace klanu zase v mínusu'], ['clan', 'kdo jde v sobotu na siege, hlaste se'],
  ['hero', 'noobi, uvidíme se na Olympiádě'], ['hero', 'hero zbraň mám jen na týden, tak se dívejte'],
];
const ANNOUNCES = [
  'Raid Boss Core byl poražen klanem HateYou.', 'Seven Signs: Období soutěže začalo.', 'Olympiáda začala.',
  'Hlasujte pro server na topzone a získejte odměnu!', 'Raid Boss Orfen se objevil v Sea of Spores.',
  'Server restart za 5 minut. (Vtip. Nebo ne?)', 'Zaken byl poražen. Drop: Zaken\'s Earring. Gratulujeme, nevíme komu.',
  'Seven Signs: Dusk obsadil Seal of Avarice.', 'Hrad Giran bude obléhán v sobotu ve 20:00.',
  'Donate shop: nový Agathion! (V Interlude nejsou. Ale kdyby byly…)',
];
const CHAT_REPLIES = ['lol', 'noob', 'kup si SS', 'tohle není trade chat', 'kdo se ptal', '+1', 'jo jo', 'co?', 'WTS odpověď, 5kk',
  'jsi bot?', 'zkus /unstuck', 'na Primevalu to jde dobře', 'hahaha', 'pls buff', 'teď ne, farmím', 'BD dance?', 'gg',
  'to pamatuje už C1', 'mám lag, opakuj to', 'sorry, AFK', 'jdi na Oly', 'proč nejsi v klanu?', 'nab', 'ok'];

const TIPS = [
  'Sednutím (X) regeneruješ HP a MP rychleji. Mobové to vědí.',
  'Soulshoty zdvojnásobí poškození. Všichni je zapomínají zapnout.',
  'Do +3 je zaklínání bezpečné. U full body zbroje do +4.',
  'Elpy utíká. Je to normální. Nech ji být.',
  'Když tě zabije Tyrannosaurus, nic si z toho nedělej. Zabil každého.',
  'Death Penalty ti sníží Black Judge v Giranu. Za adenu, samozřejmě.',
  'Shift + klik na moba ukáže drop list. Na retailu nebyl, na custom serveru je.',
  'CP tě chrání jen proti hráčům. Proti mobům ti nepomůže.',
  'Do Antharasova doupěte potřebuješ Portal Stone od Gabrielle.',
  'Kdo si nevzal SoE, jde pěšky. Nebo umře. Smrt je rychlejší.',
  'L2Walker je zakázaný. GM to pozná. GM pozná všechno.',
  'Queen Ant léčí Nurse Ants. Zabij je první.',
  '.online ukáže, kolik je hráčů. .xpoff zastaví zisk XP.',
  'Nové skilly se učíš za SP u Grand Mastera. Samy od sebe se nenaučí.',
  'Na 20, 40 a 76 změň profesi u Class Managera.',
];

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
const cds = {};                 // cooldowny
let pkAt = 0, chatAt = 0, annAt = 0, botCheckAt = 0, gm = null, onlineN = 3412, saveAt = 0, hudAt = 0, loadingUntil = 0;
const keys = {};
const bgCache = {};
let cam = { x: 0, y: 0 };
let running = false;
let shift = false;

const freshSave = (name, race) => ({
  v: 2, name, race, level: 1, xp: 0, sp: 0, adena: 10000, hp: 1e9, mp: 1e9, cp: 1e9, prof: 0,
  learned: { ps: true },
  inv: { pot: 10, mpot: 0, ss: 500, soe: 2, bsoe: 0, portal: 0 }, scrolls: {}, junk: {},
  weapon: { id: 0, e: 0 }, armor: { id: 0, e: 0 }, rings: {}, title: '', ssOn: true, dp: 0, xpOff: false, goldbar: 0,
  zone: 'town', bossDead: {},
  st: { kills: 0, deaths: 0, ks: 0, pks: 0, fails: 0, jails: 0, boss: 0, time: 0, best: 1 },
});

// ============================================================
//  Výpočty
// ============================================================
const mobXp = lv => Math.round(10 * Math.pow(lv, 1.5) + 5);
const xpNeed = L => Math.round(mobXp(L) * (3 + L / 14));
const cumXp = [0];
for (let L = 1; L <= 81; L++) cumXp[L] = cumXp[L - 1] + xpNeed(L);
const skillSp = sk => sk.lv <= 1 ? 0 : Math.round(cumXp[sk.lv] / 8 * .3);
const enchMul = e => e <= 3 ? e * .08 : .24 + (e - 3) * .15;
const className = () => RACES[S.race].classes[S.prof];

function stats() {
  const r = RACES[S.race], L = S.level, w = WEAPONS[S.weapon.id], a = ARMORS[S.armor.id];
  const pm = Math.pow(1.08, S.prof);
  let patk = ((6 + 2.2 * (L - 1)) * r.atk + w.atk * (1 + enchMul(S.weapon.e))) * pm;
  let pdef = 2 + L + a.def * (1 + enchMul(S.armor.e));
  let maxHp = ((80 + 22 * (L - 1)) * r.hp + a.hp * (1 + enchMul(S.armor.e) * .5)) * pm;
  let maxMp = (40 + 9 * (L - 1)) * r.mp;
  let spd = 150 * r.spd, aspd = 1.1, crit = r.crit, critDmg = 2;
  const b = k => pl.buffs[k] > T;
  if (b('might')) patk *= 1.12;
  if (b('warcry')) patk *= 1.2;
  if (b('frenzy')) patk *= 2;
  if (b('shield')) pdef *= 1.15;
  if (b('haste')) aspd *= 1.33;
  if (b('dof')) aspd *= 1.15;
  if (b('ww')) spd *= 1.2;
  if (b('dash')) spd *= 1.35;
  if (b('btb')) maxHp *= 1.3;
  if (b('focus')) crit += .15;
  if (b('hunter')) crit += .3;
  if (b('dw')) critDmg += .5;
  if (b('bers')) { patk *= 1.08; aspd *= 1.08; spd *= 1.08; pdef *= .92; }
  if (S.rings.qa) crit += .08;
  if (S.rings.ant) { patk *= 1.1; pdef *= 1.1; maxHp *= 1.1; }
  if (S.dp) { const f = 1 - .04 * S.dp; patk *= f; pdef *= f; }
  return { patk, pdef, maxHp: Math.round(maxHp), maxMp: Math.round(maxMp), maxCp: Math.round(maxHp * .6), spd, aspd, crit: Math.min(.8, crit), critDmg };
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
const CH_PRE = { trade: '+', shout: '!', party: '#', clan: '@', hero: '%' };
function chat(text, cls = 'sys', who = null) {
  const d = document.createElement('div');
  d.className = cls;
  const pre = CH_PRE[cls] || '';
  d.innerHTML = who ? `${pre}<b>${esc(who)}</b>: ${esc(text)}` : esc(text);
  const atBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 30;
  logEl.appendChild(d);
  while (logEl.children.length > 140) logEl.removeChild(logEl.firstChild);
  if (atBottom) logEl.scrollTop = logEl.scrollHeight;
}
const sys = t => chat(t, 'sys');
const lastSysSpam = {};
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
    g.beginPath(); g.arc(700, 600, 230, 0, 7); g.fill();
    g.font = `150px ${EMOJI_FONT}`; g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🏰', 700, 120);
    g.font = 'bold 15px Georgia'; g.fillStyle = '#f3dc9a';
    g.fillText('Giran Castle · siege v sobotu ve 20:00 · majitel: klan HateYou (už 3 roky)', 700, 215);
    g.font = `64px ${EMOJI_FONT}`; g.fillStyle = '#000'; g.fillText('⛲', 700, 600);
    const dec = ['🌳', '🏠', '🏡', '🌳', '🛖', '🌲'];
    for (let i = 0; i < 46; i++) {
      const e = dec[Math.floor(r() * dec.length)];
      let x, y;
      do { x = 40 + r() * (z.w - 80); y = 40 + r() * (z.h - 80); }
      while ((x > 160 && x < 1300 && y > 240 && y < 960) || (x > 520 && x < 880 && y < 260));
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
  const hp = Math.round((35 * Math.pow(lv, 1.15) + 12) * (o.hp || 1));
  const size = o.size || 36;
  return {
    kind: 'mob', type, name: n, e, lv, x, y, hx: x, hy: y, r: Math.round(size * .44), size,
    maxHp: hp, hp, atk: (4 + 3.4 * lv + .012 * lv * lv) * (o.atk || 1), def: lv * 1.2, spd: 70 * (o.spd || 1),
    agr: !!o.agr, flee: !!o.flee, adena: o.adena || 1, mimic: !!o.mimic, rare: !!o.rare, nurse: !!o.nurse,
    aggro: false, atkCd: rand(.5, 1.5), wander: null, wanderAt: T + rand(1, 5), dead: false, respawnAt: 0, hitT: 0,
    playerDmg: 0, fleeUntil: 0, fakeHit: null, revealed: false, lunge: 0, spoiled: false, bob: rand(0, 6),
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
  let type = m ? m.type : Z.mobs[mobs.length % Z.mobs.length];
  // vzácný mob (Tyrannosaurus) jen jeden
  if (!m && type[3].rare && mobs.some(o => o.rare)) type = Z.mobs[0];
  const [x, y] = spawnPos(70, mobBand(type));
  const nm = makeMob(type, x, y);
  if (m) Object.assign(m, nm); else mobs.push(nm);
}

function makeBoss(id) {
  const b = BOSSES[id];
  return {
    kind: 'mob', boss: id, name: b.name, e: b.e, lv: b.lv, x: 700, y: 360, hx: 700, hy: 360, r: b.r, size: b.size,
    maxHp: b.hp, hp: b.hp, atk: b.atk, def: b.def, spd: b.spd, agr: true, adena: 1, aggro: false, atkCd: 2,
    dead: false, hitT: 0, playerDmg: 0, breathAt: T + 6, quakeAt: T + 14, healAt: T + 2, said: {}, bob: 0,
  };
}
const NURSE = ['Nurse Ant', '🐜', 38, { hp: .6, nurse: 1 }];

function makeFake(town) {
  const [x, y] = town ? [rand(250, 1150), rand(300, 900)] : spawnPos();
  return {
    kind: 'fake', name: pick(FAKE_NAMES), col: pick(FAKE_COLORS), skin: pick(['#f1d3b0', '#e8c29a', '#a99cc8', '#7a9a54']),
    x, y, r: 14, face: { x: 0, y: 1 }, moveTo: null, prey: null, idleAt: T + rand(1, 4), swing: 0, walkT: 0, town,
  };
}

function bossLeft(id) {
  const b = BOSSES[id];
  return (S.bossDead[id] || 0) + b.respawnMin * 60e3 - Date.now();
}

function enterZone(id, pos) {
  zoneId = id; Z = ZONES[id]; S.zone = id;
  bg = bgCache[id] || (bgCache[id] = buildBg(Z, id));
  mobs = []; fakes = []; npcs = []; floats = []; fx = []; tele = [];
  Object.assign(pl, { target: null, interact: null, attacking: false, moveTo: null, queued: null, cast: null, sitting: false });
  const sp = pos || Z.spawn;
  pl.x = sp[0]; pl.y = sp[1];
  if (Z.town) {
    const list = TOWN_NPCS.concat(Math.random() < .4 ? [MAMMON] : []);
    npcs = list.map(n => ({ ...n, kind: 'npc', r: 18 }))
      .concat(TOWN_SHOPS.filter(s => !(s.id === 'rmt' && S.rmtBanned)).map(s => ({ ...s, kind: 'shop', r: 16, skin: '#f1d3b0' })));
    for (let i = 0; i < 4; i++) fakes.push(makeFake(true));
  } else if (Z.boss) {
    const left = bossLeft(Z.boss);
    const b = BOSSES[Z.boss];
    if (left > 0) {
      const m = Math.ceil(left / 60e3);
      setTimeout(() => sys(`${b.name} tu není. Respawn za ~${m} min. Na retailu podle okna respawnu, na tvém serveru podle configu, který nikdo nečetl.`), 300);
    } else {
      const boss = makeBoss(Z.boss);
      mobs.push(boss);
      if (Z.boss === 'qa') for (let i = 0; i < 4; i++) mobs.push(makeMob(NURSE, 700 + Math.cos(i * 1.57) * 120, 380 + Math.sin(i * 1.57) * 90));
    }
  } else {
    for (let i = 0; i < Z.count; i++) spawnMob();
    for (let i = 0; i < 3; i++) fakes.push(makeFake(false));
    pkAt = T + rand(70, 150);
  }
  $('#zoneName').textContent = Z.name;
  save();
}

// teleport s loading obrazovkou jako v klientu
function teleport(id) {
  enterZone(id);
  const z = ZONES[id];
  $('#ldZone').textContent = z.name;
  $('#ldTip').textContent = 'Tip: ' + pick(TIPS);
  const bar = $('#ldBar');
  bar.style.transition = 'none'; bar.style.width = '0';
  $('#loading').classList.remove('hidden');
  loadingUntil = performance.now() + 1500;
  requestAnimationFrame(() => { bar.style.transition = 'width 1.4s linear'; bar.style.width = '100%'; });
  setTimeout(() => {
    $('#loading').classList.add('hidden');
    banner(z.name, z.town ? 'Bezpečná zóna. 400 offline shopů a jeden lagující fontánový AFK.' : z.boss ? 'Lair grand bosse' : `Doporučená úroveň ${z.lvTxt}`);
  }, 1500);
}
const isLoading = () => performance.now() < loadingUntil;

// ============================================================
//  Uložení
// ============================================================
function save() {
  if (!S) return;
  const st = stats();
  S.hp = clamp(S.hp, 0, st.maxHp); S.mp = clamp(S.mp, 0, st.maxMp); S.cp = clamp(S.cp, 0, st.maxCp);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* bez úložiště to prostě nepamatuje */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && d.v === 2 && RACES[d.race]) return d;
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
    sys('Nemáš dostatek soulshotů. Automatické použití bylo zrušeno.');
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
  if (crit) dmg *= st.critDmg;
  if (opts.lethal && Math.random() < .08) {
    if (m.boss) float(m.x, m.y - m.size * .6 - 14, 'imunní vůči lethal', '#aaa');
    else { dmg = m.hp; float(m.x, m.y - m.size * .6 - 14, 'Lethal Strike!', '#ff4d4d', true); }
  }
  dmg = Math.round(dmg);
  m.hp -= dmg; m.playerDmg += dmg; m.hitT = T;
  float(m.x, m.y - m.size * .6, (crit ? 'Kritický zásah! ' : '') + dmg, crit ? '#ffd75e' : '#fff', crit);
  if (m.flee) { m.fleeUntil = T + 3; m.aggro = false; }
  else m.aggro = true;
  if (m.mimic && !m.revealed) {
    m.revealed = true;
    float(m.x, m.y - 50, 'Treasure Chest byl mimik! Kdo by to čekal.', '#ffb35c');
  }
  if (m.hp <= 0) killMob(m, 'player');
}

function killMob(m, by) {
  m.dead = true; m.hp = 0;
  m.respawnAt = T + (m.nurse ? 25 : rand(8, 14));
  fx.push({ type: 'die', x: m.x, y: m.y, e: m.e, size: m.size, t0: T, dur: .6 });
  const mine = by === 'player' || m.playerDmg >= m.maxHp * .5;
  if (pl.target === m) { pl.target = null; pl.attacking = false; pl.queued = null; }
  if (!mine) return;
  if (m.boss) return bossDefeated(m);
  if (m.pk) {
    S.st.pks++;
    const ad = Math.round(6 * Math.pow(m.lv, 2.2) * 15 * RACES[S.race].adena);
    S.adena += ad;
    chat('ne!!! to je lag!!!', 'pk', m.name);
    chat(`${m.name} (karma) padl a upustil ${fmt(ad)} adeny. PK s karmou dropuje, to ví každý.`, 'loot');
    if (S.level >= 46) { addJunk(lifeStoneName(m.lv), Math.round(8 * Math.pow(m.lv, 2.2))); }
    gainXp(mobXp(m.lv) * 3);
    return;
  }
  S.st.kills++;
  const d = S.level - m.lv;
  const mul = d > 5 ? Math.max(.05, 1 - (d - 5) * .2) : d < 0 ? Math.min(1.3, 1 - d * .06) : 1;
  if (d > 7) sysOnce('grey', 'Šedý mob. XP skoro žádné, ostuda velká.', 60);
  gainXp(Math.round(mobXp(m.lv) * mul));
  // drop
  const ad = Math.max(1, Math.round(6 * Math.pow(m.lv, 2.2) * rand(.6, 1.4) * m.adena * RACES[S.race].adena));
  S.adena += ad;
  float(m.x, m.y - 10, `+${fmt(ad)} a`, '#ffe27a');
  const jv = Math.max(1, Math.round(1.2 * Math.pow(m.lv, 2.2)));
  if (!m.nurse && Z.junk && Math.random() < .35) addJunk(pick(Z.junk), jv);
  if (m.spoiled && Z.junk) {
    const n = randi(2, 4);
    for (let i = 0; i < n; i++) addJunk(pick(Z.junk), jv, true);
    chat(`Sweeper: nasbíráno ${n} materiálů. Trpaslík se usmál.`, 'loot');
  }
  if (Math.random() < .04) { S.inv.pot++; chat('Získal jsi Greater Healing Potion.', 'loot'); }
  if (Math.random() < .02) { S.inv.soe++; chat('Získal jsi Scroll of Escape.', 'loot'); }
  const g = gradeForLv(m.lv);
  if (g && Math.random() < .006) { addScroll('ew' + g); chat(`Získal jsi Scroll: Enchant Weapon (${GRADES[g]}-Grade)! Drop rate x1. Kup si los.`, 'loot'); }
  if (g && Math.random() < .012) { addScroll('ea' + g); chat(`Získal jsi Scroll: Enchant Armor (${GRADES[g]}-Grade).`, 'loot'); }
  if (m.lv >= 46 && Math.random() < .012) {
    addJunk(lifeStoneName(m.lv), Math.round(8 * Math.pow(m.lv, 2.2)));
    sysOnce('ls', 'Life Stone! Augmentace přijde v příštím patchi. Jako všechno.', 120);
  }
  if (m.e === '🐰' && Math.random() < .3) float(m.x, m.y - 40, 'píp', '#fff');
}

function lifeStoneName(lv) {
  const lvls = [46, 49, 52, 55, 58, 61, 64, 67, 70, 76];
  const l = lvls.filter(x => x <= lv).pop() || 46;
  return `${Math.random() < .1 ? 'Top-grade ' : ''}Life Stone: level ${l}`;
}

function addJunk(name, v, quiet) {
  const j = S.junk[name] || (S.junk[name] = { q: 0, v });
  j.q++; j.v = Math.max(j.v, v);
  if (!quiet) chat(`Získal jsi ${name}.`, 'dmg');
}
function addScroll(k, n = 1) { S.scrolls[k] = (S.scrolls[k] || 0) + n; }

function gainXp(x) {
  if (x <= 0) return;
  const sp = Math.round(x / 8);
  S.sp += sp;
  if (S.xpOff) { chat(`Získal jsi 0 XP (.xpoff) a ${fmt(sp)} SP.`, 'dmg'); return; }
  S.xp += x;
  chat(`Získal jsi ${fmt(x)} XP a ${fmt(sp)} SP.`, 'dmg');
  float(pl.x, pl.y - 52, `+${fmt(x)} XP`, '#c6e88f');
  let up = false;
  while (S.level < 80 && S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level);
    S.level++; up = true;
    chat('Tvoje úroveň se zvýšila!', 'lvl');
    const nsk = SK.filter(s => s.lv === S.level);
    nsk.forEach(s => chat(`Nový skill k naučení u Grand Mastera: ${s.icon} ${s.name}.`, 'lvl'));
    if (PROF_LV.includes(S.level) && S.level > 1) chat(`Úroveň ${S.level}! Class Manager v Giranu ti změní profesi.`, 'lvl');
    if (S.level === 40) chat('Newbie Helper tě od teď ignoruje. Vítej mezi dospělými. Buffy za adenu u NPC Bufferu.', 'lvl');
    if (S.level === 80) chat('Úroveň 80! Konec. Teď už jen subclass, Noblesse, Olympiáda a 4 roky života.', 'lvl');
  }
  if (S.level >= 80 && S.xp > xpNeed(80)) S.xp = xpNeed(80);
  if (up) {
    const st = stats();
    S.hp = st.maxHp; S.mp = st.maxMp; S.cp = st.maxCp;
    S.st.best = Math.max(S.st.best, S.level);
    fx.push({ type: 'lvl', x: pl.x, y: pl.y, t0: T, dur: 1.4 });
    banner(`Úroveň ${S.level}`, pick(['Ding!', 'Na x1 bys na tohle čekal týden.', 'Tvoje máma by byla hrdá. Asi.', 'Teď už jen grindit dál.',
      'Ještě pár levelů a máš S-grade. Ha ha.']));
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
  // CP chrání jen proti hráčům
  if (src && src.pk && S.cp > 0) {
    const a = Math.min(S.cp, dmg);
    S.cp -= a; dmg -= a;
    float(pl.x, pl.y - 46, '-' + a + ' CP', '#f2c94c');
  }
  S.hp -= dmg; pl.hitT = T;
  if (dmg > 0) float(pl.x, pl.y - 40, '-' + dmg, '#ff6b6b');
  if (pl.sitting) { pl.sitting = false; sysOnce('sitHit', 'Vstal jsi, protože tě někdo mlátí. Rozumné.'); }
  if (pl.cast && pl.cast.breakable) { pl.cast = null; sys('Sesílání přerušeno.'); }
  if (S.hp <= 0) die(src);
}

function die(src) {
  S.hp = 0; pl.dead = true; pl.attacking = false; pl.target = null; pl.moveTo = null; pl.cast = null;
  S.st.deaths++;
  const loss = Math.round(xpNeed(S.level) * .04);
  const lost = Math.min(S.xp, loss);
  S.xp -= lost;
  let dpUp = false;
  if (S.level >= 10 && S.dp < 15 && Math.random() < .35) { S.dp++; dpUp = true; }
  const wasAuto = pl.auto;
  setAuto(false);
  fx.push({ type: 'die', x: pl.x, y: pl.y, e: '👻', size: 40, t0: T, dur: 1.5 });
  if (src && src.pk) chat('gg ez 😎', 'pk', src.name);
  if (src && src.rare) chat('zase někoho onehitnul T-Rex lol', 'shout', pick(FAKE_NAMES));
  save();
  setTimeout(() => {
    const why = src && src.boss === 'antharas' ? 'Antharas tě snědl. Byl jsi prý křupavý.'
      : src && src.boss === 'qa' ? 'Queen Ant tě ušlapala. Nursky tleskaly.'
      : src && src.rare ? 'Tyrannosaurus. Nic si z toho nedělej, onehitne každého.'
      : src && src.pk ? `Zabil tě ${src.name}. Teď se ti posmívá v chatu a jeho karma roste.`
      : src ? `Zabil tě ${src.name} (lv ${src.lv}).` : 'Zemřel jsi.';
    dialog('💀 Zemřel jsi', `
      <p>${esc(why)}</p>
      <p>Ztratil jsi <b>${fmt(lost)} XP</b>.${dpUp ? ` Byl na tebe uvalen <b>Death Penalty úrovně ${S.dp}</b>. Black Judge v Giranu ho za adenu sníží.` : ''}</p>
      ${wasAuto ? '<p class="muted">L2Walker se odpojil. Jak nečekané.</p>' : ''}
      <p class="muted">Kam se chceš vrátit?</p>`,
      [
        { t: 'Do Clan Hallu', dis: true },
        { t: 'Do hradu', dis: true },
        { t: 'Do Siege HQ', dis: true },
        { t: 'Čekat na resurrect', fn: () => { sys('Čekáš na Resurrection… Bishop je AFK. Jako vždycky.'); respawn(); } },
        { t: '🏘️ Do vesnice', cls: 'green', fn: respawn },
      ], true);
  }, 900);
}

function respawn() {
  closeDialog();
  pl.dead = false;
  teleport('town');
  const st = stats();
  S.hp = st.maxHp * .7; S.mp = st.maxMp * .7; S.cp = 0;
}

function bossDefeated(m) {
  const b = BOSSES[m.boss];
  S.st.boss++;
  S.bossDead[m.boss] = Date.now();
  const first = !S.rings[b.ring];
  S.rings[b.ring] = true;
  S.adena += b.adena;
  gainXp(mobXp(b.lv) * b.xpMul);
  // nursky padají s královnou
  mobs.forEach(o => { if (o.nurse) o.dead = true, o.respawnAt = 1e12; });
  const item = b.ring === 'qa' ? 'Ring of Queen Ant' : 'Earring of Antharas';
  if (m.boss === 'antharas') S.title = 'Dragon Slayer';
  chat(`Announcements: Grand Boss ${b.name} byl poražen hráčem ${S.name}!`, 'ann');
  fx.push({ type: 'lvl', x: m.x, y: m.y, t0: T, dur: 2 });
  save();
  const extra = m.boss === 'qa'
    ? '<p class="quote">„Na retailu by o QA ring hrály čtyři party a vyhrál by ten s nejrychlejším internetem."</p>'
    : '<p class="quote">„Na retailu by drop dostal clan leader, který se přihlásil pět vteřin před koncem."</p>';
  setTimeout(() => dialog(`${b.e} ${b.name} poražen!`, `
    <p>Sám. Bez party, bez Bishopa, bez BD a SWS.</p>${extra}
    <p>Odměna: <b>${fmt(b.adena)} adeny</b> a spousta XP.</p>
    ${first ? `<p>Získáváš <b>💍 ${item}</b>${b.ring === 'qa' ? ': +8 % šance na krit. Nejžádanější šperk do 76.' : ': +10 % P.Atk, P.Def a HP. A titul Dragon Slayer.'}</p>`
      : `<p class="muted">${item} už máš. Prodej ho v Giranu za 50kk. Teda nemůžeš, je to single player.</p>`}
    <p class="muted">Respawn za ${b.respawnMin} min. Na retailu podle okna respawnu, takže si nestěžuj.</p>`,
    [{ t: 'Jsem legenda', cls: 'green', fn: closeDialog }]), 1200);
}

// ============================================================
//  Dovednosti a předměty
// ============================================================
function canLearn(sk) { return S.level >= sk.lv && S.prof >= (sk.prof || 0); }

function useSkill(i) {
  const sk = SK[i];
  if (!sk || pl.dead || pl.jailUntil > T) return;
  if (!S.learned[sk.id]) {
    if (!canLearn(sk)) return sysOnce('lock' + sk.id, `${sk.name}: od úrovně ${sk.lv}${sk.prof ? ` a ${sk.prof}. profese` : ''}.`, 2);
    return sysOnce('learn' + sk.id, `${sk.name} se musíš naučit u Grand Mastera v Giranu (${fmt(skillSp(sk))} SP).`, 3);
  }
  if ((cds[sk.id] || 0) > T) return sysOnce('cd', 'Skill se ještě nabíjí.', 2);
  if (S.mp < sk.mp(S.level)) return sysOnce('mp', 'Nemáš dost MP. Sedni si (X), nebo vypij Mana Potion (custom).', 3);
  if (Z.town && ['hit', 'aoe', 'triple', 'spoil'].includes(sk.type)) return sysOnce('townsk', 'Tady nemůžeš útočit. Je to mírová zóna.', 3);
  if (sk.low && S.hp > stats().maxHp * sk.low) return sysOnce('frenzy', 'Frenzy jde použít jen pod 30 % HP. Nejdřív se nech zmlátit.', 3);
  if (['hit', 'triple', 'spoil'].includes(sk.type)) {
    if (!validTarget()) return sysOnce('notg', 'Neplatný cíl.', 2);
    pl.queued = i; pl.attacking = true; pl.sitting = false;
    return;
  }
  execSkill(i);
}

function execSkill(i, m) {
  const sk = SK[i];
  S.mp -= sk.mp(S.level);
  cds[sk.id] = T + sk.cd;
  pl.sitting = false;
  if (sk.type === 'hit') {
    pl.swing = T;
    fx.push({ type: 'slash', x: m.x, y: m.y, t0: T, dur: .3, big: sk.lethal });
    hitMob(m, sk.mult, { lethal: sk.lethal });
  } else if (sk.type === 'triple') {
    pl.swing = T;
    for (let k = 0; k < 3; k++) setTimeout(() => {
      if (!m.dead && mobs.includes(m)) { fx.push({ type: 'slash', x: m.x, y: m.y, t0: T, dur: .25 }); hitMob(m, sk.mult); }
    }, k * 140);
  } else if (sk.type === 'spoil') {
    pl.swing = T;
    if (m.boss || m.pk) { float(m.x, m.y - 50, 'Tohle spoilnout nejde', '#aaa'); return; }
    m.spoiled = true;
    float(m.x, m.y - 50, 'Spoil aktivován', '#c6e88f');
    hitMob(m, .5);
  } else if (sk.type === 'buff') {
    pl.buffs[sk.buff] = T + sk.dur;
    float(pl.x, pl.y - 44, sk.name, '#bfe9ff');
    fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: .6 });
  } else if (sk.type === 'ud') {
    pl.buffs.ud = T + sk.dur;
    pl.moveTo = null;
    float(pl.x, pl.y - 44, 'Ultimate Defense', '#7fd0ff');
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
  if ((cds.pot || 0) > T) return sysOnce('potcd', 'Lektvar ještě účinkuje.', 2);
  if (S.inv.pot <= 0) return sysOnce('nopot', 'Došly ti Greater Healing Potiony. Grocer v Giranu jich má plnou bednu.', 3);
  const st = stats();
  S.inv.pot--;
  cds.pot = T + 5;
  const h = Math.round(st.maxHp * .4);
  S.hp = Math.min(st.maxHp, S.hp + h);
  float(pl.x, pl.y - 44, '+' + h, '#8de07f');
  fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: .6 });
}

function useManaPotion() {
  if (pl.dead) return;
  if ((cds.mpot || 0) > T) return sysOnce('mpotcd', 'Mana Potion ještě účinkuje.', 2);
  if (S.inv.mpot <= 0) return sysOnce('nompot', 'Nemáš Mana Potion. Na retailu neexistoval, tady je u Grocera.', 3);
  const st = stats();
  S.inv.mpot--;
  cds.mpot = T + 8;
  S.mp = Math.min(st.maxMp, S.mp + st.maxMp * .3);
  float(pl.x, pl.y - 44, '+MP', '#7fb6ff');
}

function toggleSS() {
  if (!S.ssOn && S.inv.ss <= 0) return sysOnce('noss', 'Nemáš soulshoty. Bez nich budeš grindit do důchodu.', 3);
  S.ssOn = !S.ssOn;
  sys(S.ssOn ? `Automatické použití Soulshot (${GRADES[WEAPONS[S.weapon.id].g]}-Grade) aktivováno.` : 'Automatické použití soulshotů zrušeno.');
}

function toggleSit() {
  if (pl.dead || pl.buffs.ud > T) return;
  pl.sitting = !pl.sitting;
  if (pl.sitting) { pl.moveTo = null; pl.attacking = false; pl.cast = null; sysOnce('sit', 'Sedíš. Regeneruješ 3× rychleji. Mobové to berou jako pozvánku.', 30); }
}

function useSoE(blessed) {
  if (pl.dead || pl.cast) return;
  if (Z.town) return sysOnce('soetown', 'Už jsi ve městě.', 3);
  pl.sitting = false; pl.moveTo = null; pl.attacking = false;
  if (blessed === undefined) blessed = S.inv.bsoe > 0;
  if (blessed && S.inv.bsoe > 0) {
    pl.cast = { t0: T, dur: 1, label: 'Blessed Scroll of Escape', breakable: false, done: () => { S.inv.bsoe--; teleport('town'); } };
  } else if (S.inv.soe > 0) {
    pl.cast = { t0: T, dur: 8, label: 'Scroll of Escape…', breakable: true, done: () => { S.inv.soe--; teleport('town'); } };
  } else {
    sys('Nemáš SoE. Spouštím /unstuck – 30 s. (Smrt je rychlejší.)');
    pl.cast = { t0: T, dur: 30, label: '/unstuck…', breakable: true, done: () => teleport('town') };
  }
}

function nextTarget() {
  if (Z.town) return;
  const m = nearestMob(700);
  if (m) { setTarget(m); pl.attacking = true; pl.sitting = false; }
  else sysOnce('nomob', 'Žádný cíl v dosahu. Spoileři to tu vyčistili.', 3);
}

const buffActive = () => Object.keys(pl.buffs).filter(k => pl.buffs[k] > T);

// ============================================================
//  L2Walker a GM kontrola
// ============================================================
function setAuto(on) {
  pl.auto = on;
  $('#autoBtn').classList.toggle('on', on);
  if (on) {
    botCheckAt = T + rand(50, 100);
    sys('L2Walker v10.9.6 připojen. Porušuješ pravidla serveru. GM se možná dívá. 👀');
    if (Z.town) sys('V Giranu není co farmit. Teleportuj se do lovecké oblasti.');
  } else if (gm) {
    gm = null;
  }
}

function updateAuto(st) {
  if (!pl.auto || pl.dead || Z.town || pl.cast) return;
  if (!gm && T > botCheckAt) startBotCheck();
  if (S.hp < st.maxHp * .45 && S.inv.pot > 0 && (cds.pot || 0) <= T) usePotion();
  if (S.mp < st.maxMp * .2 && S.inv.mpot > 0 && (cds.mpot || 0) <= T) useManaPotion();
  // buffy, které umí sám
  for (let i = 0; i < SK.length; i++) {
    const sk = SK[i];
    if (sk.type !== 'buff' || !S.learned[sk.id] || sk.id === 'dash' || (cds[sk.id] || 0) > T || S.mp < sk.mp(S.level) * 2) continue;
    if (sk.low && S.hp > st.maxHp * sk.low) continue;
    if (validTarget()) execSkill(i);
  }
  // kdo mě mlátí, toho beru první
  const attacker = mobs.find(m => !m.dead && m.aggro && dist(m, pl) < 260);
  if (pl.sitting) {
    if (attacker || S.hp >= st.maxHp * .95) pl.sitting = false;
    else return;
  }
  // nursky mají přednost i před útočící královnou
  const nurse = mobs.find(o => !o.dead && o.nurse);
  if (nurse && validTarget() && pl.target.boss) setTarget(nurse);
  if (!validTarget() || (attacker && !pl.target.aggro && !pl.target.nurse)) {
    if (!attacker && S.hp < st.maxHp * .35 && S.inv.pot <= 0) {
      pl.attacking = false; pl.target = null; pl.sitting = true;
      sysOnce('botsit', 'L2Walker si sedl na regen. Velmi lidské chování.', 60);
      return;
    }
    let m = nurse || attacker;
    if (!m) {
      let bd = 1400;
      // Tyrannosaurus je v ignore listu
      for (const o of mobs) {
        if (o.dead || o.rare || (o.lv > S.level + 2 && !o.boss) || fakeBusy(o)) continue;
        const d = dist(o, pl) + (o.lv < S.level - 5 ? 700 : 0);   // šedé moby jen z nouze
        if (d < bd) { bd = d; m = o; }
      }
    }
    if (m) { setTarget(m); pl.attacking = true; pl.sitting = false; }
    else sysOnce('botnone', 'L2Walker nenašel moba pro tvůj level. Zkus jinou oblast.', 30);
  } else if (!pl.attacking) pl.attacking = true;
  if (pl.attacking && pl.queued == null) {
    const si = SK.findIndex(s => s.id === 'spoil');
    if (si >= 0 && S.learned.spoil && validTarget() && !pl.target.spoiled && !pl.target.boss && (cds.spoil || 0) <= T) pl.queued = si;
    else if ((cds.ps || 0) <= T && S.mp > SK[0].mp(S.level) * 3) pl.queued = 0;
  }
}

function startBotCheck() {
  const a = randi(2, 9), b = randi(2, 9);
  gm = { ans: a + b, until: T + 20 };
  chat('Dobrý den, tady GM. Jen rutinní kontrola. 👀', 'gm', 'GM_Ondra');
  dialog('🛡️ Kontrola proti botům', `
    <p class="quote">„Dobrý den, tady GM Ondra. Už tři hodiny mlátíš ${esc(validTarget() ? pl.target.name : 'moby')} ve stejném rytmu a na stejném místě. Nejsi náhodou L2Walker?"</p>
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
    chat('OK, vypadáš jako člověk. Ale sleduju tě.', 'gm', 'GM_Ondra');
    gm = null;
    botCheckAt = T + rand(80, 140);
  } else {
    chat(`${isNaN(v) ? 'Žádná odpověď?' : v + '? Opravdu?'} Přesně tohle by napsal L2Walker. Jail.`, 'gm', 'GM_Ondra');
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
let dlgRefresh = null;
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
    el.disabled = !!b.dis;
    if (b.fn) el.onclick = b.fn;
    bb.appendChild(el);
  });
  $('#dlgX').classList.toggle('hidden', modal);
  $('#dlg').classList.remove('hidden');
}
function closeDialog() { $('#dlg').classList.add('hidden'); dlgModal = false; dlgRefresh = null; }
// dialog, který se po každé akci překreslí
function panel(show) { show(); dlgRefresh = show; }
$('#dlgX').onclick = closeDialog;
$('#dlg').addEventListener('pointerdown', e => { if (e.target.id === 'dlg' && !dlgModal) closeDialog(); });

// kliky na tlačítka uvnitř dialogů – data-a="akce" data-i="parametr"
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
const junkValue = () => Object.values(S.junk).reduce((s, j) => s + j.q * j.v, 0);
const scrollName = k => {
  const g = +k.slice(-1), w = k.includes('ew');
  return `${k.startsWith('b') ? 'Blessed ' : ''}Scroll: Enchant ${w ? 'Weapon' : 'Armor'} (${GRADES[g]}-Grade)`;
};
const scrollAbbr = k => k.toUpperCase().replace(/\d/, '') + GRADES[+k.slice(-1)];

function openNpc(n) {
  pl.moveTo = null;
  if (n.kind === 'shop') return openShop(n);
  ({ gk: openGatekeeper, shop: openGrocer, gmshop: openGmShop, gm: openGrandMaster, cm: openClassManager, buff: openBuffer,
    judge: openJudge, gab: openGabrielle, wh: openWarehouse, mammon: openMammon })[n.id]();
}

function openGatekeeper() {
  const rows = ZONE_ORDER.map(id => {
    const z = ZONES[id];
    const lock = z.portal && !S.inv.portal;
    return `<div class="item"><div class="ic">${z.boss ? (z.boss === 'qa' ? '🐜' : '🐲') : '🌀'}</div>
      <div class="tx"><b>${z.name}</b> <small>Úroveň ${z.lvTxt}. ${z.note}${lock ? ' <b style="color:#ff7b6b">Chybí Portal Stone.</b>' : ''}</small></div>
      <div class="pr">${z.price ? fmt(z.price) + ' a' : 'zdarma'}</div>
      ${btn('tp', id, 'Teleport', S.adena < z.price || lock)}</div>`;
  }).join('');
  dialog('🧙 Gatekeeper Clarissa', `
    <p class="quote">„Vítej v Giranu. Kam to bude? Ceny teleportů jsou stejné jako v C1. Teda, nejsou."</p>
    <div class="list">${rows}</div>`);
}

function openGrocer() {
  const show = () => {
    const g = WEAPONS[S.weapon.id].g;
    const ssPack = 100 * SS_COST[g];
    dialog('🤵 Grocer', `
      <p class="quote">„Lektvary, svitky, soulshoty. Spiritshoty taky, ale ty jsi fighter, tak se nedívej."</p>
      <div class="list">
        <div class="item"><div class="ic">🧪</div><div class="tx"><b>Greater Healing Potion</b><small>+40 % HP. Máš ${S.inv.pot}.</small></div>
          <div class="pr">${POT_PRICE} a</div>${btn('buy', 'pot:1', '×1', S.adena < POT_PRICE)}${btn('buy', 'pot:20', '×20', S.adena < POT_PRICE * 20)}</div>
        <div class="item"><div class="ic">🔷</div><div class="tx"><b>Mana Potion</b> <small>+30 % MP. Na retailu neexistoval, na custom serveru je. Máš ${S.inv.mpot}.</small></div>
          <div class="pr">${MPOT_PRICE} a</div>${btn('buy', 'mpot:1', '×1', S.adena < MPOT_PRICE)}${btn('buy', 'mpot:20', '×20', S.adena < MPOT_PRICE * 20)}</div>
        <div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshot (${GRADES[g]}-Grade)</b><small>Grade podle zbraně. Máš ${fmt(S.inv.ss)}.</small></div>
          <div class="pr">${fmt(ssPack)} a / 100</div>${btn('buySS', 1, '×100', S.adena < ssPack)}${btn('buySS', 10, '×1000', S.adena < ssPack * 10)}</div>
        <div class="item"><div class="ic">📜</div><div class="tx"><b>Scroll of Escape</b><small>Do města, kouzlí se dlouho. Máš ${S.inv.soe}.</small></div>
          <div class="pr">${SOE_PRICE} a</div>${btn('buy', 'soe:1', '×1', S.adena < SOE_PRICE)}${btn('buy', 'soe:5', '×5', S.adena < SOE_PRICE * 5)}</div>
        <div class="item"><div class="ic">📜</div><div class="tx"><b>Blessed Scroll of Escape</b><small>Do města skoro hned. Máš ${S.inv.bsoe}.</small></div>
          <div class="pr">${fmt(BSOE_PRICE)} a</div>${btn('buy', 'bsoe:1', '×1', S.adena < BSOE_PRICE)}</div>
      </div>
      <div class="sect">Výkup</div>
      <p>Materiály v inventáři: <b>${fmt(junkValue())} adeny</b>. ${btn('sellJunk', 1, 'Prodat vše', !junkValue())}</p>
      <p class="muted">Spoiler_Pavel na náměstí vykupuje za dvojnásobek. Grocer to ví a je mu to jedno.</p>`);
  };
  panel(show);
}

function openGmShop() {
  const show = () => {
    const row = (list, kind) => list.map((it, i) => {
      if (!it.price) return '';
      const cur = (kind === 'w' ? S.weapon.id : S.armor.id) === i;
      const stat = kind === 'w' ? `P.Atk ${it.atk}` : `P.Def +${it.def}, +${it.hp} HP`;
      return `<div class="item ${cur ? 'cur' : ''}"><div class="ic">${kind === 'w' ? '⚔️' : '🥋'}</div>
        <div class="tx"><b>${it.name}</b>${gTag(it.g)}<small>${stat} · lv ${it.lv}+ · ${it.d}</small></div>
        <div class="pr">${fmt(it.price)} a</div>
        ${cur ? '<span class="muted">nošeno</span>' : btn(kind === 'w' ? 'buyW' : 'buyA', i, 'Koupit', S.adena < it.price || S.level < it.lv)}</div>`;
    }).join('');
    const scr = [1, 2, 3, 4, 5].map(g => {
      const items = [['ew' + g, EW_PRICE[g]], ['ea' + g, EA_PRICE[g]], ['bew' + g, EW_PRICE[g] * 4], ['bea' + g, EA_PRICE[g] * 4]];
      return items.map(([k, p]) => `<div class="item"><div class="ic">${k.startsWith('b') ? '🌟' : '📃'}</div>
        <div class="tx"><b>${scrollAbbr(k)}</b> <small>${scrollName(k)} · máš ${S.scrolls[k] || 0}</small></div>
        <div class="pr">${fmt(p)} a</div>${btn('buyScroll', k + ':' + p, 'Koupit', S.adena < p)}</div>`).join('');
    }).join('');
    dialog('💂 GM Shop <small style="font-size:12px;color:#9a927e">(custom NPC)</small>', `
      <p class="quote">„Na retailu bys tohle farmil půl roku. Tady je to v obchodě, protože x50. Starou výbavu vykoupím za 20 %."</p>
      <p class="muted">Máš: ${eTag(S.weapon.e)}${WEAPONS[S.weapon.id].name} · ${eTag(S.armor.e)}${ARMORS[S.armor.id].name}</p>
      <div class="sect">Zbraně</div><div class="list">${row(WEAPONS, 'w')}</div>
      <div class="sect">Zbroje</div><div class="list">${row(ARMORS, 'a')}</div>
      <div class="sect">Enchant scrolly</div>
      <p class="muted">Zaklínáš z inventáře (I), jako v klientu. Safe +${SAFE_W} (zbraň), +${SAFE_A} (full body). Šance ${Math.round(ENCH_RATE * 10000) / 100} %, max +${MAX_ENCH} podle configu. Blessed při neúspěchu vrátí na +0 místo krystalizace.</p>
      <div class="list">${scr}</div>
      <div class="item"><div class="ic">💠</div><div class="tx"><b>Augmentace (Life Stone)</b><small>Novinka z Interlude. V tomhle obchodě „už brzy". Od roku 2007.</small></div>${btn('noop', 0, 'Brzy', true)}</div>`);
  };
  panel(show);
}

function openGrandMaster() {
  const show = () => {
    const rows = SK.map(sk => {
      const learned = S.learned[sk.id], cost = skillSp(sk);
      return `<div class="item ${learned ? 'cur' : ''}"><div class="ic">${sk.icon}</div>
        <div class="tx"><b>${sk.name}</b><small>lv ${sk.lv}${sk.prof ? ` · ${sk.prof}. profese` : ''} · ${sk.d}</small></div>
        <div class="pr">${learned ? '' : fmt(cost) + ' SP'}</div>
        ${learned ? '<span class="muted">naučeno</span>' : btn('learn', sk.id, 'Naučit', !canLearn(sk) || S.sp < cost)}</div>`;
    }).join('');
    dialog('🧔 Grand Master', `
      <p class="quote">„Skilly se učí za SP. Kdo se nenaučí, ten pak v partě jen stojí. Giant's Codexy na enchant skillů si sežeň sám."</p>
      <p>Máš <b>${fmt(S.sp)} SP</b>.</p>
      <div class="list">${rows}</div>`);
  };
  panel(show);
}

function openClassManager() {
  const show = () => {
    const r = RACES[S.race], next = S.prof + 1;
    let body = `<p>Aktuální profese: <b>${className()}</b></p>`;
    if (next > 3) {
      body += '<p class="quote">„Víc profesí už není. Teda je, subclass. Ale to je Fate\'s Whisper, Noblesse a další rok života. Ne."</p>';
    } else {
      const lv = PROF_LV[next], price = PROF_PRICE[next];
      const quest = next === 1 ? `Path of the ${r.classes[1]}` : next === 2 ? '3 marky (jednu z nich nikdo nedokončil bez wiki)' : `Saga of the ${r.classes[3]}`;
      body += `<p>Další: <b>${r.classes[next]}</b> (od úrovně ${lv}).</p>
        <p class="quote">„Na retailu: ${esc(quest)}. Tady stačí ${price ? fmt(price) + ' adeny' : 'kliknout'}, protože custom server. Nebo si ten quest odběhej, jestli máš čas."</p>
        <div class="list">
          <div class="item"><div class="ic">💰</div><div class="tx"><b>Změnit profesi hned</b><small>+8 % P.Atk a HP za každou profesi.</small></div>
            <div class="pr">${price ? fmt(price) + ' a' : 'zdarma'}</div>${btn('prof', 'pay', 'Změnit', S.level < lv || S.adena < price)}</div>
          <div class="item"><div class="ic">🏃</div><div class="tx"><b>Udělat quest</b><small>${esc(quest)}. Zabere to chvíli. Zdarma.</small></div>
            ${btn('prof', 'quest', 'Běžím', S.level < lv)}</div>
        </div>`;
    }
    dialog('🎓 Class Manager <small style="font-size:12px;color:#9a927e">(custom NPC)</small>', body);
  };
  panel(show);
}

function openBuffer() {
  const newbie = S.level < 40;
  const fullPrice = 15000;
  dialog('🧚 Newbie Helper · NPC Buffer', `
    <p class="quote">${newbie ? '„Ahoj, nováčku! Do úrovně 39 tě buffuju zadarmo. Pak tě budu ignorovat, jako na retailu."' : '„Už jsi velký. Zadarmo nic. Ale tady vedle mám custom NPC buffer, ten bere adenu."'}</p>
    <p><b>Newbie buffy</b> (do lv 39, 10 min): 💪 Might · 🧱 Shield · ⚡ Haste · 🍃 Wind Walk · ❤️ Bless the Body</p>
    <p><b>Full buff</b> (custom, 20 min): všechno výše + 🎯 Focus · 💀 Death Whisper · 👹 Berserker Spirit · 💃 Dance of Fury</p>
    <p class="muted">Na privátních serverech buffy vydrží dvě hodiny. Tady 20 minut, aby sis vzpomněl, jak se rebuffuje.</p>`,
    [
      { t: 'Newbie buffy', dis: !newbie, fn: () => { giveBuffs(['might', 'shield', 'haste', 'ww', 'btb'], 600); closeDialog(); } },
      { t: `Full buff (${fmt(fullPrice)} a)`, cls: 'green', fn: () => {
        if (S.adena < fullPrice) return sys('Nemáš na full buff. NPC Buffer se otočil zády.');
        S.adena -= fullPrice;
        giveBuffs(['might', 'shield', 'haste', 'ww', 'btb', 'focus', 'dw', 'bers', 'dof'], 1200);
        closeDialog();
      } },
    ]);
}
function giveBuffs(list, dur) {
  list.forEach(k => pl.buffs[k] = T + dur);
  fx.push({ type: 'heal', x: pl.x, y: pl.y, t0: T, dur: 1 });
  const st = stats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  sys('Jsi nabuffovaný. Jsi o 30 % lepší člověk. A o 30 % víc HP.');
}

function openJudge() {
  const price = S.dp * (5000 + 600 * S.level);
  dialog('⚖️ Black Judge', S.dp
    ? `<p class="quote">„Vidím na tobě Death Penalty úrovně ${S.dp}. To máš z toho, že umíráš. Za ${fmt(price)} adeny tě ho zbavím."</p>
       <p class="muted">Death Penalty: −${S.dp * 4} % P.Atk a P.Def.</p>`
    : '<p class="quote">„Jsi čistý. Žádný Death Penalty. Přijď, až zase umřeš. A ty umřeš."</p>',
    S.dp ? [{ t: `Zbavit DP (${fmt(price)} a)`, cls: 'green', fn: () => {
      if (S.adena < price) return sys('Nemáš dost adeny. Black Judge nedává slevy.');
      S.adena -= price; S.dp = 0;
      sys('Death Penalty byl odstraněn.');
      closeDialog();
    } }] : [{ t: 'Díky', fn: closeDialog }]);
}

function openGabrielle() {
  const price = 500000;
  if (S.inv.portal) return dialog('👸 Gabrielle', '<p class="quote">„Portal Stone už máš. Theodric v Heart of Warding tě pustí. Pozdravuj Antharase."</p>', [{ t: 'Jdu na to', fn: closeDialog }]);
  dialog('👸 Gabrielle', `
    <p class="quote">„Chceš za Antharasem? Bez Portal Stone tě Theodric nepustí. Quest Audience with the Land Dragon trvá věčnost.
    Můžu ti ho zkrátit. Za poplatek, samozřejmě."</p>
    <p class="muted">Podmínka: úroveň 70+. Cena ${fmt(price)} adeny.</p>`,
    [{ t: `Získat Portal Stone (${fmt(price)} a)`, cls: 'green', fn: () => {
      if (S.level < 70) return sys('Gabrielle: „Na Antharase jsi moc malý. Vrať se na úrovni 70."');
      if (S.adena < price) return sys('Gabrielle: „Bez adeny žádný kámen."');
      S.adena -= price; S.inv.portal = 1;
      sys('Získal jsi Portal Stone.');
      closeDialog();
    } }]);
}

function openWarehouse() {
  dialog('📦 Warehouse Keeper', `
    <p class="quote">„Sklad je plný. Je tam 40 000 Animal Bone od nějakého trpaslíka a jedna Gremlinova ponožka. Adenu si ulož přes .bank, to je custom příkaz."</p>
    <p class="muted">Goldbary v bance: ${S.goldbar}. (.deposit uloží 1 000 000 adeny, .withdraw vybere.)</p>`,
    [{ t: 'Aha, díky', fn: closeDialog }]);
}

function openMammon() {
  dialog('🧞 Merchant of Mammon', `
    <p class="quote">„Seal of Avarice teď drží Dusk. Pro Dawn nemám nic. Ancient Adena vyměním… příští týden. Možná."</p>
    <p class="muted">Blacksmith of Mammon je dnes někde v katakombách. Kde přesně? To ví jen Seven Signs a jeden člověk na fóru.</p>`,
    [{ t: 'Dusk forever', fn: closeDialog }]);
}

function openShop(s) {
  const show = () => {
    let body = '';
    const typ = { sell: '(soukromý obchod – prodej)', buy: '(soukromý obchod – nákup)', craft: '(dwarven manufacture)' }[s.type];
    if (s.id === 'scam') {
      body = `<p class="quote">„+16 Draconic Bow {Focus}, úplně pravej, žádnej scam. Jen 50 000 adeny. Rychle, než si to rozmyslím!"</p>
        <div class="list"><div class="item"><div class="ic">🏹</div><div class="tx"><b>„+16 Draconic Bow {Focus}"</b><small>Určitě pravý. Na 100 %. Možná 90 %.</small></div>
        <div class="pr">50 000 a</div>${btn('scam', 0, 'Koupit', S.adena < 50000)}</div></div>`;
    } else if (s.id === 'ssbot') {
      const p = Math.round(100 * SS_COST[WEAPONS[S.weapon.id].g] * .6);
      body = `<p class="quote">„Bip bop. Prodávám soulshoty. Nejsem bot. Jsem offline shop. To je rozdíl. Bip."</p>
        <div class="list"><div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshot (${GRADES[WEAPONS[S.weapon.id].g]}-Grade) ×100</b><small>O 40 % levněji než u Grocera. Odkud je má? Nevyptávej se.</small></div>
        <div class="pr">${fmt(p)} a</div>${btn('botSS', p, '×100', S.adena < p)}</div></div>`;
    } else if (s.id === 'spoiler') {
      const v = junkValue();
      body = `<p class="quote">„Kupuju Animal Bone, Coarse Bone Powder, Stone of Purity… prostě všechno. Dvojnásobek co Grocer. Craftím z toho A-grade, neptej se."</p>
        <p>Tvoje materiály: <b>${fmt(v * 2)} adeny</b>. ${btn('spoiler', 0, 'Prodat', !v)}</p>`;
    } else if (s.id === 'craft') {
      const v = junkValue(), per = SS_COST[WEAPONS[S.weapon.id].g];
      const n = Math.floor(v * 1.5 / per);
      body = `<p class="quote">„Dwarven Manufacture. Dáš materiály, dostaneš soulshoty. Success 100 %, ne jako ten tvůj enchant."</p>
        <p>Z tvých materiálů ucraftím <b>${fmt(n)} soulshotů (${GRADES[WEAPONS[S.weapon.id].g]})</b>. ${btn('craft', n, 'Craftit', !n)}</p>`;
    } else if (s.id === 'party') {
      body = `<p class="quote">„Hledáme lidi na Antharase! Zatím jsme já, můj kámoš a jeho bot. Ty máš ${S.level}? Hmm… Máš BD? Ne? SWS? Taky ne? Tak nic."</p>
        <p class="muted">MegaOrk tě do party nevzal. Prý by ses mu nevešel do lootu.</p>`;
    } else if (s.id === 'rmt') {
      body = `<p class="quote">„100kk adeny za 200 Kč, platba předem na účet. Je to bezpečný, mám reference na fóru."</p>
        <p class="muted">RMT je proti pravidlům serveru.</p>${btn('rmt', 0, 'Nahlásit GM', false, 'red')}`;
    }
    dialog(`🛒 ${esc(s.name)} <small style="font-size:12px;color:#ff9ed1">${typ}</small>`, body);
  };
  panel(show);
}

function openInventory() {
  const show = () => {
    const st = stats();
    const junk = Object.entries(S.junk).filter(([, j]) => j.q > 0)
      .map(([n, j]) => `<div class="item"><div class="ic">🦴</div><div class="tx"><b>${esc(n)}</b> ×${j.q}<small>á ${fmt(j.v)} adeny</small></div></div>`).join('');
    const scrolls = Object.entries(S.scrolls).filter(([, n]) => n > 0)
      .map(([k, n]) => `<div class="item"><div class="ic">${k.startsWith('b') ? '🌟' : '📃'}</div><div class="tx"><b>${scrollAbbr(k)}</b> ×${n}<small>${scrollName(k)}</small></div>${btn('useScroll', k, 'Použít')}</div>`).join('');
    const rings = [S.rings.qa && '<div class="item"><div class="ic">💍</div><div class="tx"><b>Ring of Queen Ant</b><small>+8 % šance na krit. Nejžádanější šperk do 76.</small></div></div>',
      S.rings.ant && '<div class="item"><div class="ic">💎</div><div class="tx"><b>Earring of Antharas</b><small>+10 % P.Atk, P.Def a HP. Ostatní ti ho závidí.</small></div></div>'].filter(Boolean).join('');
    dialog('🎒 Inventář', `
      <div class="sect">Výbava</div>
      <div class="list">
        <div class="item"><div class="ic">⚔️</div><div class="tx"><b>${eTag(S.weapon.e)}${WEAPONS[S.weapon.id].name}</b>${gTag(WEAPONS[S.weapon.id].g)}<small>${WEAPONS[S.weapon.id].d}</small></div></div>
        <div class="item"><div class="ic">🥋</div><div class="tx"><b>${eTag(S.armor.e)}${ARMORS[S.armor.id].name}</b>${gTag(ARMORS[S.armor.id].g)}<small>${ARMORS[S.armor.id].d}</small></div></div>
        ${rings}
      </div>
      <div class="sect">Spotřební</div>
      <div class="list">
        <div class="item"><div class="ic">🧪</div><div class="tx"><b>Greater Healing Potion</b> ×${S.inv.pot}<small>Klávesa Q</small></div>${btn('pot', 0, 'Vypít', !S.inv.pot)}</div>
        <div class="item"><div class="ic">🔷</div><div class="tx"><b>Mana Potion</b> ×${S.inv.mpot}<small>Klávesa G</small></div>${btn('mpot', 0, 'Vypít', !S.inv.mpot)}</div>
        <div class="item"><div class="ic">✨</div><div class="tx"><b>Soulshot</b> ×${fmt(S.inv.ss)}<small>Klávesa E · ${S.ssOn ? 'auto zapnuto' : 'vypnuto'}</small></div>${btn('ss', 0, S.ssOn ? 'Vypnout' : 'Zapnout')}</div>
        <div class="item"><div class="ic">📜</div><div class="tx"><b>Scroll of Escape</b> ×${S.inv.soe} · <b>Blessed</b> ×${S.inv.bsoe}<small>Klávesa R</small></div>${btn('soe', 0, 'Použít', Z.town)}</div>
        ${S.inv.portal ? '<div class="item"><div class="ic">🪨</div><div class="tx"><b>Portal Stone</b><small>Vstupenka k Antharasovi.</small></div></div>' : ''}
      </div>
      <div class="sect">Enchant scrolly</div>
      <div class="list">${scrolls || '<span class="muted">Žádné. Kup si je v GM Shopu, nebo čekej na drop rate x1.</span>'}</div>
      <div class="sect">Materiály</div>
      <div class="list">${junk || '<span class="muted">Nic. Ani Animal Bone.</span>'}</div>
      <p style="margin-top:10px">Adena: <b style="color:#ffe27a">${fmt(S.adena)}</b> · SP ${fmt(S.sp)} · P.Atk ${Math.round(st.patk)} · P.Def ${Math.round(st.pdef)}</p>`);
  };
  panel(show);
}

// okno zaklínání jako v klientu
let enchMsg = null;
function openEnchant(k) {
  enchMsg = null;
  const show = () => {
    const isW = k.includes('ew'), g = +k.slice(-1), blessed = k.startsWith('b');
    const slot = isW ? S.weapon : S.armor;
    const it = (isW ? WEAPONS : ARMORS)[slot.id];
    const safe = isW ? SAFE_W : SAFE_A;
    let warn = '';
    if (it.g !== g) warn = `Scroll je na ${GRADES[g]}-Grade, ale tvůj předmět je ${GRADES[it.g]}-Grade.${it.g === 0 ? ' No-grade se zaklínat nedá. Ani na retailu.' : ''}`;
    else if (slot.e >= MAX_ENCH) warn = `Max enchant je +${MAX_ENCH}. Tak to máme v configu.`;
    const chance = slot.e < safe ? 100 : Math.round(ENCH_RATE * 10000) / 100;
    dialog(`${blessed ? '🌟' : '📃'} ${scrollName(k)}`, `
      <div class="list"><div class="item"><div class="ic">${isW ? '⚔️' : '🥋'}</div>
        <div class="tx"><b>${eTag(slot.e)}${it.name}</b>${gTag(it.g)}<small>Šance na +${slot.e + 1}: ${chance} % ${slot.e < safe ? '(safe)' : blessed ? '(při neúspěchu +0)' : '(při neúspěchu krystalizace)'}</small></div></div></div>
      <p class="muted">Scrollů: ${S.scrolls[k] || 0}.${warn ? ` <b style="color:#ff7b6b">${warn}</b>` : ''}</p>
      ${btn('enchant', k, 'Zaklínat', !!warn || !(S.scrolls[k] > 0), 'red')}
      <div class="result ${enchMsg ? enchMsg.cls : ''}">${enchMsg ? enchMsg.t : '&nbsp;'}</div>`);
  };
  panel(show);
}

function enchant(k) {
  const isW = k.includes('ew'), blessed = k.startsWith('b');
  const slot = isW ? S.weapon : S.armor;
  const list = isW ? WEAPONS : ARMORS;
  const it = list[slot.id];
  if (!(S.scrolls[k] > 0) || it.g !== +k.slice(-1) || slot.e >= MAX_ENCH) return;
  S.scrolls[k]--;
  const safe = isW ? SAFE_W : SAFE_A;
  if (slot.e < safe || Math.random() < ENCH_RATE) {
    slot.e++;
    enchMsg = { cls: 'ok', t: `Zaklínání proběhlo úspěšně: +${slot.e} ${it.name}.${isW && slot.e === 4 ? ' Zbraň začala svítit!' : ''}` };
    if (slot.e >= 7) chat(`gz k +${slot.e} ${it.name}! kolik scrollů to stálo?`, 'shout', pick(FAKE_NAMES));
  } else if (blessed) {
    S.st.fails++;
    enchMsg = { cls: 'bad', t: `Zaklínání selhalo. Blessed scroll tě zachránil: ${it.name} je teď +0. Stejně to bolí.` };
    slot.e = 0;
  } else {
    S.st.fails++;
    const n = Math.max(1, Math.round(it.price / 2000));
    addJunk(`Crystal: ${GRADES[it.g]}-Grade`, Math.round(it.price * .15 / n), true);
    S.junk[`Crystal: ${GRADES[it.g]}-Grade`].q += n - 1;
    enchMsg = { cls: 'bad', t: `Zaklínání selhalo! Tvůj +${slot.e} ${it.name} byl krystalizován. Získal jsi Crystal: ${GRADES[it.g]}-Grade ×${n}. Zbyl ti ${isW ? 'Short Sword' : "Squire's Shirt"}.` };
    chat(`${S.name} právě krystalizoval +${slot.e} ${it.name}. F do chatu.`, 'shout', pick(FAKE_NAMES));
    setTimeout(() => chat('F', 'normal', pick(FAKE_NAMES)), 700);
    setTimeout(() => chat('F', 'normal', pick(FAKE_NAMES)), 1300);
    setTimeout(() => chat('safe je +3 bro', 'normal', pick(FAKE_NAMES)), 2000);
    slot.id = 0; slot.e = 0;
  }
  const st = stats();
  S.hp = Math.min(S.hp, st.maxHp);
  save();
}

function openChar() {
  const st = stats(), r = RACES[S.race];
  const mins = Math.floor(S.st.time / 60);
  dialog(`📜 ${esc(S.name)}`, `
    <p class="muted">${r.name} · ${className()} · ${r.desc}</p>
    <div class="kv">
      <span>Úroveň</span><span>${S.level} (${(S.xp / xpNeed(S.level) * 100).toFixed(2)} %)</span>
      <span>Profese</span><span>${className()}</span>
      <span>Titul</span><span>${esc(S.title || '–')}</span>
      <span>CP / HP / MP</span><span>${Math.round(S.cp)} / ${Math.round(S.hp)} / ${Math.round(S.mp)}</span>
      <span>P.Atk / P.Def</span><span>${Math.round(st.patk)} / ${Math.round(st.pdef)}</span>
      <span>Rychlost / Atk.Spd</span><span>${Math.round(st.spd)} / ${st.aspd.toFixed(2)}</span>
      <span>Krit</span><span>${Math.round(st.crit * 100)} %</span>
      <span>SP</span><span>${fmt(S.sp)}</span>
      <span>Death Penalty</span><span>${S.dp ? 'úroveň ' + S.dp : 'žádný'}</span>
      <span>Karma / PvP / PK</span><span>0 / 0 / 0 (single player)</span>
      <span>Noblesse / Hero</span><span>ne / ne (zatím)</span>
    </div>
    <div class="sect">Statistiky</div>
    <div class="kv">
      <span>Zabitých mobů</span><span>${fmt(S.st.kills)}</span>
      <span>Smrtí</span><span>${fmt(S.st.deaths)}</span>
      <span>Ukradených mobů (KS)</span><span>${fmt(S.st.ks)}</span>
      <span>Zabitých PK</span><span>${fmt(S.st.pks)}</span>
      <span>Krystalizovaných / spadlých na +0</span><span>${fmt(S.st.fails)}</span>
      <span>Pobytů v GM Jailu</span><span>${fmt(S.st.jails)}</span>
      <span>Poražených grand bossů</span><span>${S.st.boss}</span>
      <span>Odehráno</span><span>${mins} min (na x1 by to bylo ${fmt(mins * 50)} min)</span>
    </div>`);
}

function openHelp() {
  dialog('❓ Jak hrát', `
    <p><b>Cíl:</b> z Talking Islandu až k Antharasovi. Po cestě Queen Ant, profese na 20/40/76 a pár krystalizovaných zbraní.</p>
    <div class="kv">
      <span>Klik na zem / WASD</span><span>chůze</span>
      <span>Klik na moba / F / Tab</span><span>cíl a útok</span>
      <span>Shift + klik na moba</span><span>drop list (custom)</span>
      <span>F1–F7 nebo 1–7</span><span>skilly</span>
      <span>Q / G</span><span>Healing / Mana Potion</span>
      <span>E</span><span>soulshoty auto on/off</span>
      <span>X</span><span>sednout (3× regenerace)</span>
      <span>R</span><span>SoE do města</span>
      <span>B</span><span>L2Walker (zakázáno)</span>
      <span>I / C</span><span>inventář / postava</span>
      <span>Enter</span><span>chat: !shout, +trade, #party, @clan, %hero</span>
      <span>Příkazy</span><span>/unstuck /loc /target /assist /gmlist /olympiadstat /petition</span>
      <span>Custom</span><span>.online .menu .xpoff .xpon .deposit .withdraw</span>
    </div>
    <p class="muted">Giran: Gatekeeper Clarissa (teleporty), Grocer (poty, SS, SoE), GM Shop (výbava, scrolly), Grand Master (skilly za SP), Class Manager (profese), Newbie Helper/Buffer, Black Judge (Death Penalty), Gabrielle (Portal Stone). Někdy i Merchant of Mammon.</p>
    <p class="muted">Hra se ukládá automaticky.</p>`);
}

function showDropList(m) {
  const g = gradeForLv(m.lv);
  const rows = [];
  if (m.boss) {
    const b = BOSSES[m.boss];
    rows.push(['Adena', fmt(b.adena), '100 %'], [b.ring === 'qa' ? 'Ring of Queen Ant' : 'Earring of Antharas', '1', '100 % (single player bonus)']);
  } else {
    const a = 6 * Math.pow(m.lv, 2.2) * m.adena;
    rows.push(['Adena', `${fmt(a * .6)}–${fmt(a * 1.4)}`, '100 %']);
    (Z.junk || []).forEach(j => rows.push([j, '1', `${(35 / Z.junk.length).toFixed(1)} %`]));
    rows.push(['Greater Healing Potion', '1', '4 %'], ['Scroll of Escape', '1', '2 %']);
    if (g) rows.push([`Scroll: Enchant Weapon (${GRADES[g]})`, '1', '0,6 %'], [`Scroll: Enchant Armor (${GRADES[g]})`, '1', '1,2 %']);
    if (m.lv >= 46) rows.push(['Life Stone', '1', '1,2 %']);
  }
  dialog(`📋 Drop list: ${esc(m.name)} (lv ${m.lv})`, `
    <p class="muted">HP ${fmt(m.maxHp)} · P.Atk ${Math.round(m.atk)} · ${m.agr ? 'agresivní' : 'pasivní'}${m.spoiled ? ' · spoilnutý' : ''}</p>
    <div class="kv">${rows.map(([n, q, c]) => `<span>${esc(n)} ×${q}</span><span>${c}</span>`).join('')}</div>
    <p class="muted">Shift+klik droplist je custom feature. Na retailu jsi to zjišťoval ze stránky, která měla polovinu dat špatně.</p>`);
}

const ACTIONS = {
  noop: () => {},
  tp: id => {
    const z = ZONES[id];
    if (S.adena < z.price || (z.portal && !S.inv.portal)) return;
    S.adena -= z.price;
    closeDialog();
    if (z.boss === 'antharas' && S.level < 76) sys('Theodric: „S tvým levelem? No, tvoje věc."');
    teleport(id);
  },
  buy: arg => {
    const [k, n0] = arg.split(':'); const n = +n0;
    const price = { pot: POT_PRICE, mpot: MPOT_PRICE, soe: SOE_PRICE, bsoe: BSOE_PRICE }[k] * n;
    if (S.adena >= price) { S.adena -= price; S.inv[k] += n; }
  },
  buySS: n => { n = +n; const p = 100 * SS_COST[WEAPONS[S.weapon.id].g] * n; if (S.adena >= p) { S.adena -= p; S.inv.ss += 100 * n; S.ssOn = true; } },
  buyScroll: arg => { const [k, p0] = arg.split(':'); const p = +p0; if (S.adena >= p) { S.adena -= p; addScroll(k); } },
  sellJunk: () => {
    const v = junkValue();
    S.adena += v; S.junk = {};
    sys(`Prodal jsi materiály za ${fmt(v)} adeny. Spoiler_Pavel by dal dvakrát tolik, ale to už je pozdě.`);
  },
  buyW: i => buyGear('w', +i),
  buyA: i => buyGear('a', +i),
  learn: id => {
    const sk = SK.find(s => s.id === id), cost = skillSp(sk);
    if (!sk || !canLearn(sk) || S.sp < cost) return;
    S.sp -= cost; S.learned[id] = true;
    sys(`Naučil ses ${sk.name}.`);
    buildHotbar();
    save();
  },
  prof: how => {
    const next = S.prof + 1;
    if (next > 3 || S.level < PROF_LV[next]) return;
    if (how === 'pay') {
      if (S.adena < PROF_PRICE[next]) return;
      S.adena -= PROF_PRICE[next];
      changeProf();
    } else {
      closeDialog();
      const steps = next === 2 ? ['Mark of Trust…', 'Mark of Challenger…', 'kde je ten NPC?!', 'třetí mark…'] : next === 3 ? ['Saga: část 1…', 'Saga: Archon of Halisha…', 'Saga: tablet…'] : ['Path of the ' + RACES[S.race].classes[1] + '…'];
      const dur = next === 1 ? 4 : next === 2 ? 12 : 15;
      steps.forEach((s, i) => setTimeout(() => sys(`Quest: ${s}`), i * dur * 1000 / steps.length));
      pl.cast = { t0: T, dur, label: 'Plníš quest…', breakable: false, done: changeProf };
    }
  },
  pot: () => usePotion(),
  mpot: () => useManaPotion(),
  ss: () => toggleSS(),
  soe: () => { closeDialog(); useSoE(); },
  useScroll: k => openEnchant(k),
  enchant: k => enchant(k),
  scam: () => {
    if (S.adena < 50000) return;
    S.adena -= 50000;
    addJunk('„+16 Draconic Bow" (Long Bow s nálepkou)', 1);
    chat('díky za nákup!! reklamace nepřijímám', 'whisper', 'xX_Legolas_Xx');
    sys('Koupil jsi „+16 Draconic Bow {Focus}". Je to Long Bow s nálepkou. Hodnota: 1 adena. Vítej v Giranu.');
  },
  botSS: p => { p = +p; if (S.adena >= p) { S.adena -= p; S.inv.ss += 100; S.ssOn = true; chat('bip. díky. bip.', 'whisper', 'Bot_Pepa_07'); } },
  spoiler: () => {
    const v = junkValue() * 2;
    S.adena += v; S.junk = {};
    sys(`Spoiler_Pavel ti dal ${fmt(v)} adeny. Craftí z toho A-grade a prodává ho tobě.`);
  },
  craft: n => {
    n = +n; if (!n) return;
    S.inv.ss += n; S.junk = {}; S.ssOn = true;
    chat('crafted. 100 %. gl', 'whisper', 'Craft_Trpajzlík');
    sys(`Získal jsi ${fmt(n)} soulshotů.`);
  },
  rmt: () => {
    S.rmtBanned = true;
    closeDialog();
    npcs = npcs.filter(n => n.id !== 'rmt');
    chat('Zlatokop69 byl zabanován za RMT. Díky za nahlášení.', 'gm', 'GM_Ondra');
    chat('Announcements: Hráč Zlatokop69 byl zabanován.', 'ann');
  },
};

function changeProf() {
  S.prof++;
  const st = stats();
  S.hp = st.maxHp; S.mp = st.maxMp;
  fx.push({ type: 'lvl', x: pl.x, y: pl.y, t0: T, dur: 1.6 });
  banner(className(), 'Gratulujeme ke změně profese!');
  chat(`Gratulujeme! Tvoje nová profese: ${className()}.`, 'lvl');
  const rs = SK.find(s => s.prof === S.prof && !S.learned[s.id] && canLearn(s));
  if (rs) chat(`Nový skill k naučení u Grand Mastera: ${rs.icon} ${rs.name}.`, 'lvl');
  if (S.prof === 3) chat(`Gz 3rd class! ${className()}! Teď už jen Noblesse.`, 'shout', pick(FAKE_NAMES));
  buildHotbar();
  save();
}

function buyGear(kind, i) {
  const isW = kind === 'w';
  const it = (isW ? WEAPONS : ARMORS)[i];
  const slot = isW ? S.weapon : S.armor;
  if (S.adena < it.price || S.level < it.lv) return;
  const old = (isW ? WEAPONS : ARMORS)[slot.id];
  const refund = Math.round(old.price * .2);
  S.adena += refund - it.price;
  slot.id = i; slot.e = 0;
  sys(`Získal jsi ${it.name}.${refund ? ` Za starou výbavu ti GM Shop dal ${fmt(refund)} adeny.` : ''}`);
  if (isW && SS_COST[it.g] !== SS_COST[old.g]) sys(`Pozor: nová zbraň potřebuje Soulshot (${GRADES[it.g]}-Grade). Tvoje staré SS se přepočítaly, protože jsme líní.`);
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
  if (t[0] === '/') return command(t.slice(1));
  if (t[0] === '.') return voiced(t.slice(1).toLowerCase());
  const ch = { '!': 'shout', '+': 'trade', '#': 'party', '@': 'clan', '%': 'hero' }[t[0]];
  if (ch === 'party') return sys('Nejsi v partě. Nikdo tě nevzal, nemáš BD.');
  if (ch === 'clan') return sys('Nejsi v klanu. Zkus NoobAcademy, berou každého.');
  if (ch === 'hero') return sys('Nejsi Hero. Olympiáda je v pondělí.');
  chat(ch ? t.slice(1) : t, ch || 'me', S.name);
  if (Math.random() < .85) setTimeout(() => chat(pick(CHAT_REPLIES), 'normal', pick(FAKE_NAMES)), rand(800, 2600));
});

function command(raw) {
  const [c, ...rest] = raw.split(' ');
  const arg = rest.join(' ').trim().toLowerCase();
  switch (c.toLowerCase()) {
    case 'unstuck':
      if (Z.town) sys('Ve městě se zaseknout nedá. Jen psychicky.');
      else if (!pl.dead && !pl.cast) {
        sys('/unstuck: za 30 s budeš ve vesnici. Nehýbej se.');
        pl.sitting = false; pl.moveTo = null; pl.attacking = false;
        pl.cast = { t0: T, dur: 30, label: '/unstuck…', breakable: true, done: () => teleport('town') };
      }
      break;
    case 'sit': if (!pl.sitting) toggleSit(); break;
    case 'stand': if (pl.sitting) toggleSit(); break;
    case 'gm': case 'petition':
      sys('Petice byla odeslána. Pořadí ve frontě: 147.');
      setTimeout(() => chat('Dobrý den, prosím restartujte klienta. S pozdravem, GM tým', 'gm', 'GM_Ondra'), 6000);
      break;
    case 'gmlist': sys('Žádný GM není online. (Je. Jen je neviditelný a dívá se na tebe.)'); break;
    case 'olympiadstat': sys('Olympiáda: 0 zápasů, 0 výher, 0 bodů. Nejsi Noblesse.'); break;
    case 'partymatching': sys('Party Matching: 0 místností. Všichni hledají BD.'); break;
    case 'assist': sys('/assist: nejsi v partě, není koho asistovat. Smutné.'); break;
    case 'time': sys('Herní čas: noc. Vždycky je noc, když je online Valakas.'); break;
    case 'loc': sys(`Současná poloha: ${Math.round(pl.x)}, ${Math.round(pl.y)}, ${Math.round(rand(-3600, -3500))} (${Z.name})`); break;
    case 'target': {
      const m = mobs.find(o => !o.dead && o.name.toLowerCase().includes(arg));
      if (arg && m) { setTarget(m); sys(`Cíl: ${m.name}.`); }
      else sys('Neplatný cíl.');
      break;
    }
    case 'help': openHelp(); break;
    default: sys(`Neznámý příkaz /${c}. Zkus /unstuck, /loc, /target, /gmlist, /petition nebo /help.`);
  }
}

function voiced(c) {
  if (c === 'online') sys(`Online: ${fmt(onlineN)} hráčů (z toho ${fmt(onlineN - 32)} offline shopů a botů).`);
  else if (c === 'menu') sys('.menu: [Auto-loot: ON] [Exp gain: ' + (S.xpOff ? 'OFF' : 'ON') + '] [Trade refusal: OFF] [Vote reward: zítra]');
  else if (c === 'xpoff' || c === 'expoff') { S.xpOff = true; sys('Zisk XP vypnut. SP dál přibývá.'); }
  else if (c === 'xpon' || c === 'expon') { S.xpOff = false; sys('Zisk XP zapnut.'); }
  else if (c === 'bank') sys('.deposit: 1 000 000 adeny → 1 Goldbar · .withdraw: 1 Goldbar → 1 000 000 adeny');
  else if (c === 'deposit') {
    if (S.adena < 1e6) sys('Nemáš milion adeny. Goldbar není pro chudé.');
    else { S.adena -= 1e6; S.goldbar++; sys(`Uložen 1 Goldbar. Celkem ${S.goldbar}.`); }
  } else if (c === 'withdraw') {
    if (!S.goldbar) sys('Nemáš žádný Goldbar.');
    else { S.goldbar--; S.adena += 1e6; sys('Vybrán 1 Goldbar → 1 000 000 adeny.'); }
  } else sys(`Neznámý příkaz .${c}. Zkus .online, .menu, .xpoff, .xpon, .bank.`);
}

// ============================================================
//  Vstupy
// ============================================================
const isTyping = () => document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
addEventListener('keydown', e => {
  shift = e.shiftKey;
  if (!running || isLoading()) return;
  if (isTyping()) return;
  const k = e.key.toLowerCase();
  if (/^f\d+$/.test(k)) e.preventDefault();
  if (k === 'escape') { if (!dlgModal) closeDialog(); return; }
  if (k === 'enter') { e.preventDefault(); chatIn.focus(); return; }
  if (pl.jailUntil > T) return;
  if (e.altKey && k === 'v') { e.preventDefault(); return openInventory(); }
  if (e.altKey && k === 't') { e.preventDefault(); return openChar(); }
  keys[k] = true;
  const m = k.match(/^f?([1-9])$/);
  if (m && +m[1] <= SK.length) { useSkill(+m[1] - 1); return; }
  if (k === 'q') usePotion();
  else if (k === 'g') useManaPotion();
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
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; shift = e.shiftKey; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; shift = false; });

cv.addEventListener('pointerdown', e => {
  if (!running || pl.dead || pl.jailUntil > T || isLoading()) return;
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
    if (e.shiftKey) return showDropList(best);
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
      chat(pick(['nekupuju, neprodávám, jsem AFK', 'co čumíš', 'BD dance?', 'nejsem bot', 'nevíš kde je Theodric?', 'pls nezabíjej',
        'chceš do klanu? NoobAcademy bere každého', 'mám offline shop, kup si něco']), 'whisper', f.name);
      return;
    }
  }
  if (pl.buffs.ud > T) return sysOnce('udmove', 'Při Ultimate Defense se nehneš. Proto je ultimate.', 3);
  pl.sitting = false;
  pl.interact = null;
  pl.attacking = false;
  pl.queued = null;
  pl.moveTo = { x: clamp(wx, 20, Z.w - 20), y: clamp(wy, 20, Z.h - 20) };
  if (pl.cast && pl.cast.breakable) { pl.cast = null; sys('Sesílání přerušeno. Chodit a kouzlit zároveň neumíš.'); }
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
  { key: 'Q', icon: '🧪', name: 'Greater Healing Potion', fn: usePotion, cd: 'pot', total: 5 },
  { key: 'G', icon: '🔷', name: 'Mana Potion', fn: useManaPotion, cd: 'mpot', total: 8 },
  { key: 'E', icon: '✨', name: 'Soulshot (auto)', fn: toggleSS },
  { key: 'X', icon: '🪑', name: 'Sednout / vstát', fn: toggleSit },
  { key: 'F', icon: '🎯', name: 'Další cíl', fn: nextTarget },
  { key: 'R', icon: '📜', name: 'Scroll of Escape', fn: () => useSoE() },
];
let hbEls = [];
function buildHotbar() {
  const hb = $('#hotbar');
  hb.innerHTML = '';
  hbEls = [];
  SK.forEach((s, i) => {
    const b = document.createElement('button');
    const ok = S.learned[s.id];
    b.className = 'hk' + (ok ? '' : ' locked');
    b.title = `${s.name} (F${i + 1}) – ${s.d}${ok ? '' : canLearn(s) ? ` [nauč u Grand Mastera: ${fmt(skillSp(s))} SP]` : ` [od úrovně ${s.lv}${s.prof ? `, ${s.prof}. profese` : ''}]`}`;
    b.innerHTML = `${s.icon}<span class="k">F${i + 1}</span><span class="cd"></span>`;
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
    hbEls.push({ el: b, cd: b.querySelector('.cd'), n: b.querySelector('.n'), extra: h.key, id: h.cd || null, total: h.total || 1 });
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
const buffTime = t => t > 99 ? Math.ceil(t / 60) + 'm' : Math.ceil(t);
function updateHud() {
  const st = stats();
  $('#stName').textContent = S.name;
  $('#stLv').textContent = `Lv ${S.level} ${className()}`;
  $('#stTitle').textContent = S.title || '';
  setBar('#status .cp', S.cp, st.maxCp, `CP ${Math.round(S.cp)} / ${st.maxCp}`);
  setBar('#status .hp', S.hp, st.maxHp, `HP ${Math.round(S.hp)} / ${st.maxHp}`);
  setBar('#status .mp', S.mp, st.maxMp, `MP ${Math.round(S.mp)} / ${st.maxMp}`);
  setBar('#status .xp', S.xp, xpNeed(S.level), (S.xp / xpNeed(S.level) * 100).toFixed(2) + ' %');
  $('#adena').textContent = `💰 ${fmt(S.adena)} adena`;
  $('#online').textContent = `Online: ${fmt(onlineN)} (z toho ${fmt(onlineN - 32)} offline shopů)`;
  // buffy
  const bh = buffActive().map(k => `<div class="buff" title="${BUFF_INFO[k].name}">${BUFF_INFO[k].icon}<b>${buffTime(pl.buffs[k] - T)}</b></div>`).join('')
    + (S.dp ? `<div class="buff" title="Death Penalty úroveň ${S.dp} (−${S.dp * 4} % P.Atk/P.Def)">⚰️<b>${S.dp}</b></div>` : '')
    + (pl.sitting ? '<div class="buff" title="Sedíš">🪑</div>' : '')
    + (S.ssOn ? '<div class="buff" title="Soulshoty auto">✨</div>' : '');
  if (bh !== lastBuffs) { $('#buffs').innerHTML = bh; lastBuffs = bh; }
  // cíl
  const tg = $('#target');
  const t = validTarget() ? pl.target : null;
  if (t) {
    tg.classList.remove('hidden');
    $('#tgName').innerHTML = `<span style="color:${t.pk ? '#ff5c5c' : mobColor(t.lv)}">${esc(t.name)}</span> <small style="color:#9a927e">Lv ${t.lv}${t.spoiled ? ' · spoil' : ''}</small>`;
    setBar('#target .hp', t.hp, t.maxHp, `${Math.round(t.hp / t.maxHp * 100)} %`);
  } else tg.classList.add('hidden');
  // hotbar
  for (const h of hbEls) {
    if (h.id) {
      const left = (cds[h.id] || 0) - T;
      h.cd.style.height = left > 0 ? (left / h.total * 100) + '%' : '0';
    }
    if (h.extra === 'Q') h.n.textContent = S.inv.pot;
    if (h.extra === 'G') h.n.textContent = S.inv.mpot;
    if (h.extra === 'E') { h.n.textContent = S.inv.ss > 999 ? Math.floor(S.inv.ss / 1000) + 'k' : S.inv.ss; h.el.classList.toggle('on', S.ssOn); }
    if (h.extra === 'R') h.n.textContent = S.inv.soe + S.inv.bsoe;
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
    chat('Propuštěn z GM Jailu. Příště ban.', 'gm', 'GM_Ondra');
    teleport('town');
    return;
  }
  // regenerace
  const mul = (pl.sitting ? 3 : 1) * (Z.town ? 4 : 1);
  S.hp = Math.min(st.maxHp, S.hp + st.maxHp * .008 * mul * dt);
  S.mp = Math.min(st.maxMp, S.mp + st.maxMp * .012 * mul * dt);
  S.cp = Math.min(st.maxCp, S.cp + st.maxCp * .02 * mul * dt);

  if (pl.cast) {
    if (T - pl.cast.t0 >= pl.cast.dur) { const c = pl.cast; pl.cast = null; c.done(); }
    return;
  }
  const rooted = pl.buffs.ud > T;
  // klávesnice
  const kx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const ky = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if ((kx || ky) && !rooted) {
    const l = Math.hypot(kx, ky);
    pl.sitting = false; pl.moveTo = null; pl.attacking = false; pl.interact = null; pl.queued = null;
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
        const sk = SK[pl.queued];
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
  const boss = mobs.find(m => m.boss && !m.dead);
  for (const m of mobs) {
    if (m.dead) {
      if (m.nurse) {
        if (boss && T > m.respawnAt) {
          Object.assign(m, makeMob(NURSE, boss.x + rand(-140, 140), boss.y + rand(-100, 100)));
          sysOnce('nurse', 'Nurse Ant se vrátila. Queen Ant je zase v bezpečí.', 20);
        }
      } else if (!m.boss && !m.pk && T > m.respawnAt) spawnMob(m);
      continue;
    }
    const dP = dist(m, pl);
    const canSee = !pl.dead && !pl.jailUntil;
    if (m.boss) { updateBoss(m, dP, dt); continue; }
    if (m.nurse) {
      // nursky stojí u královny a léčí ji
      if (boss) {
        if (dist(m, boss) > 170) moveToward(m, boss.x, boss.y, m.spd, dt, 140);
        if (T > (m.healAt || 0)) {
          m.healAt = T + 2;
          if (boss.hp < boss.maxHp) {
            const h = Math.round(boss.maxHp * .012);
            boss.hp = Math.min(boss.maxHp, boss.hp + h);
            float(boss.x + rand(-30, 30), boss.y - boss.size * .7, '+' + h, '#8de07f');
            fx.push({ type: 'beam', x: m.x, y: m.y - 14, x2: boss.x, y2: boss.y - 40, t0: T, dur: .4 });
          }
        }
      }
      continue;
    }
    if (m.flee && m.fleeUntil > T && canSee) {
      // Elpy utíká
      const dx = m.x - pl.x, dy = m.y - pl.y, l = Math.hypot(dx, dy) || 1;
      m.x = clamp(m.x + dx / l * m.spd * 1.3 * dt, 40, Z.w - 40);
      m.y = clamp(m.y + dy / l * m.spd * 1.3 * dt, 40, Z.h - 40);
      m.walkT = (m.walkT || 0) + dt;
      continue;
    }
    if (!m.aggro && m.agr && canSee && dP < (m.pk ? 600 : 150) && !fakeBusy(m)) {
      m.aggro = true;
      if (m.mimic && !m.revealed) { m.revealed = true; float(m.x, m.y - 50, 'Treasure Chest byl mimik!', '#ffb35c'); }
      if (m.rare) chat('T-REX!!! UTÍKEJTE!!!', 'shout', pick(FAKE_NAMES));
    }
    if (m.aggro && canSee) {
      if (!m.pk && Math.hypot(m.x - m.hx, m.y - m.hy) > 650) {
        m.aggro = false; m.hp = m.maxHp; m.playerDmg = 0;
        float(m.x, m.y - 40, 'Vrací se domů a léčí se. Geodata.', '#9a927e');
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
  // odstranit mrtvé PK
  mobs = mobs.filter(m => !(m.pk && m.dead));
}

function updateBoss(m, dP, dt) {
  if (pl.dead) { m.aggro = false; return; }
  const ant = m.boss === 'antharas';
  if (!m.aggro && dP < 520) {
    m.aggro = true;
    if (ant) chat('ROOOAAAR! (překlad: „Další sólista? Vážně?")', 'shout', 'Antharas');
    else chat('Kšššš! (překlad: „Nursky, k noze!")', 'shout', 'Queen Ant');
    m.breathAt = T + 5; m.quakeAt = T + 12;
  }
  if (!m.aggro) return;
  const pct = m.hp / m.maxHp;
  const lines = ant
    ? [[.75, 'Tohle bylo jen lechtání.'], [.5, 'Dobře, teď jsem naštvaný. Behemoth! Tarask! …aha, ti nejsou naskriptovaní.'], [.25, 'ENRAGE! (Prosím, mám rodinu. Malé dráčky.)']]
    : [[.5, 'Nursky, léčit! LÉČIT!'], [.2, 'To není fér, já jsem královna!']];
  for (const [p, line] of lines) {
    if (pct < p && !m.said[p]) { m.said[p] = 1; chat(line, 'shout', m.name); }
  }
  const enr = ant && pct < .25;
  const range = m.r + pl.r + 10;
  if (dP > range) moveToward(m, pl.x, pl.y, m.spd * (enr ? 1.4 : 1), dt, range - 2);
  else {
    m.atkCd -= dt;
    if (m.atkCd <= 0) { m.atkCd = enr ? 1.6 : 2; m.lunge = T; damagePlayer(m.atk, m); }
  }
  if (!ant) return;
  if (T > m.breathAt) {
    m.breathAt = T + (enr ? 5.5 : 8);
    tele.push({ x: pl.x, y: pl.y, r: 115, t0: T, dur: 1.7, dmg: .32, src: m });
    float(m.x, m.y - 90, 'nadechuje se…', '#ffb35c', true);
  }
  if (T > m.quakeAt) {
    m.quakeAt = T + 15;
    fx.push({ type: 'quake', x: m.x, y: m.y, t0: T, dur: .8 });
    const st = stats();
    damagePlayer(st.pdef * .5 + st.maxHp * .08, m);
    sysOnce('quake', 'Antharas dupl. Celý lair se třese. Tvoje kolena taky.', 30);
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
            chat(pick(['sorry KS 😇', 'můj mob, sorry', 'KS? jaký KS?', 'byl jsem tu první (nebyl)', 'lol díky za tank', 'spoil byl můj']), 'normal', f.name);
            sysOnce('ks', 'Někdo ti ukradl moba. Vítej na Interlude.', 10);
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
      const cand = !f.town && mobs.filter(m => !m.dead && !m.aggro && !m.boss && !m.pk && !m.rare && !m.nurse && !fakeBusy(m) && dist(m, f) < 500);
      if (cand && cand.length && Math.random() < .7) {
        // občas si vybere zrovna hráčův cíl
        f.prey = validTarget() && !pl.target.rare && !pl.target.boss && !fakeBusy(pl.target) && dist(pl.target, f) < 400 && Math.random() < .35 ? pl.target : pick(cand);
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
  const lv = Math.min(80, S.level + 1);
  const a = rand(0, Math.PI * 2);
  const name = pick(PK_NAMES);
  const pk = makeMob([name, '🥷', lv, { hp: 3, atk: 1.1, agr: 1 }], clamp(pl.x + Math.cos(a) * 500, 40, Z.w - 40), clamp(pl.y + Math.sin(a) * 500, 40, Z.h - 40));
  Object.assign(pk, { pk: true, aggro: true, spd: 75, size: 32, r: 15 });
  mobs.push(pk);
  chat(pick(['hehe 🔪', 'čau, máš hezký věci', 'nic osobního, jen karma', 'tvůj drop je můj drop', 'flagni se, nebo umři']), 'pk', name);
  sys(`⚠️ Blíží se ${name} s rudým jménem (karma). CP tě chrání jen proti hráčům, tak ho máš teď využít.`);
}

function updateWorld(dt) {
  // falešný chat
  if (T > chatAt) {
    chatAt = T + rand(5, 12);
    const [c, t] = pick(CHAT_LINES);
    chat(t, c, c === 'hero' ? pick(['Titan_2006', 'DaggerMan', 'Archer_Zdenál']) : c === 'clan' ? pick(FAKE_NAMES) + ` [${pick(CLANS)}]` : pick(FAKE_NAMES));
  }
  if (T > annAt) {
    annAt = T + rand(60, 120);
    chat('Announcements: ' + pick(ANNOUNCES), 'ann');
  }
  if (Math.random() < .03) onlineN = clamp(onlineN + randi(-6, 6), 3300, 3600);
  for (const k in pl.buffs) if (pl.buffs[k] <= T) delete pl.buffs[k];
  if (gm) {
    const left = Math.ceil(gm.until - T);
    const el = $('#gmT');
    if (el) el.textContent = `Zbývá ${left} s`;
    if (T > gm.until) { chat('Žádná odpověď. L2Walker jak vyšitý. Jail.', 'gm', 'GM_Ondra'); jail(); }
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
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 12; }
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

// záře zbraně podle enchantu (+4 slabá modrá, pak silnější, +16 rudá)
function weaponGlow(e) {
  if (e >= 16) return ['#ff2d55', 22];
  if (e >= 10) return ['#ff4dd2', 18];
  if (e >= 7) return ['#9b6bff', 15];
  if (e >= 4) return ['#4db8ff', 10];
  return [null, 0];
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
    if (e.mimic && !e.revealed) { drawText('Treasure Chest', e.x, e.y - e.size * .95, '#ffe08a', 11); return; }
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

const SHOP_COL = {
  sell: ['rgba(120, 30, 80, .88)', '#ff9ed1', '#ffe3f2'],
  buy: ['rgba(110, 85, 10, .88)', '#ffd75e', '#fff3c4'],
  craft: ['rgba(20, 60, 120, .88)', '#7fb6ff', '#dbeaff'],
};
function drawShopBox(s) {
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  const w = ctx.measureText(s.msg).width + 14;
  const x = s.x - w / 2, y = s.y - 74;
  const [bgc, bd, tx] = SHOP_COL[s.type] || SHOP_COL.sell;
  ctx.fillStyle = bgc;
  ctx.strokeStyle = bd; ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, 18, 4); else ctx.rect(x, y, w, 18);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = tx; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
    } else if (f.type === 'beam') {
      ctx.strokeStyle = `rgba(140,255,140,${(1 - k) * .8})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
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
      const [glow, glowBlur] = weaponGlow(S.weapon.e);
      drawPawn(pl, {
        body: r.body, skin: r.skin, scale: r.scale, ears: r.ears, beard: r.beard, tusks: r.tusks,
        moving: !!(pl.moveTo || (pl.attacking && validTarget() && dist(pl, pl.target) > pl.r + pl.target.r + 22) || keys.w || keys.a || keys.s || keys.d),
        walkT: pl.walkT, sit: pl.sitting, swing: pl.swing, glow, glowBlur,
        wlen: 14 + WEAPONS[S.weapon.id].g * 3 + (S.weapon.id ? 4 : 0), wide: S.weapon.id ? 3 : 3,
        wcol: '#d4d6e0',
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
  const dt = Math.min(.05, (now - last) / 1000 || 0);
  last = now;
  for (let i = 0; i < speed && running; i++) {
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
    if (T > hudAt) { hudAt = T + .1; updateHud(); }
    if (T > saveAt) { saveAt = T + 10; save(); }
  }
  if (running) render();
  requestAnimationFrame(frame);
}

// ============================================================
//  Login, výběr serveru, tvorba postavy
// ============================================================
const SERVERS = [
  { name: 'Bartz', st: 'full', label: 'Plný', n: '5 000/5 000', msg: 'Bartz je plný. Ve frontě je 4 812 lidí. Jako v roce 2006.' },
  { name: 'Sieghardt', st: 'down', label: 'Mimo provoz', n: '–', msg: 'Sieghardt je mimo provoz. Údržba trvá od merge serverů.' },
  { name: 'Kain', st: 'full', label: 'Plný', n: '5 000/5 000', msg: 'Kain je plný. Kain je vždycky plný.' },
  { name: 'Lionna', st: 'heavy', label: 'Těžký', n: '4 702/5 000', msg: 'Lionna je přetížená. Polovina online jsou farmáři adeny.' },
  { name: 'Teon', st: 'down', label: 'Mimo provoz', n: '–', msg: 'Teon? Ten už dávno není. F.' },
  { name: 'PxSandbox Interlude x50', st: 'normal', label: 'Normální', n: '3 412/5 000', ours: true },
];
function buildLogin() {
  $('#btnAgree').onclick = () => { $('#login').classList.add('hidden'); $('#servers').classList.remove('hidden'); };
  $('#btnDisagree').onclick = () => {
    $('#eula').insertAdjacentHTML('beforeend', '<p style="color:#ff7b6b"><b>Bez souhlasu to nepůjde. Jako u každého EULA, které nikdo nečte.</b></p>');
    $('#eula').scrollTop = 1e6;
  };
  $('#srvList').innerHTML = '<tr><th>Server</th><th>Stav</th><th>Hráči</th></tr>' + SERVERS.map((s, i) =>
    `<tr class="srv ${s.ours ? 'ours' : ''}" data-i="${i}"><td>${s.ours ? '⭐ ' : ''}${s.name}</td><td class="st-${s.st}">${s.label}</td><td>${s.n}</td></tr>`).join('');
  $('#srvList').onclick = e => {
    const tr = e.target.closest('tr.srv');
    if (!tr) return;
    const s = SERVERS[+tr.dataset.i];
    if (!s.ours) { $('#srvMsg').textContent = s.msg; return; }
    $('#servers').classList.add('hidden');
    $('#create').classList.remove('hidden');
  };
}

let selRace = 'human';
function buildCreate() {
  const rc = $('#races');
  rc.innerHTML = Object.entries(RACES).map(([id, r]) =>
    `<button class="race ${id === selRace ? 'sel' : ''}" data-r="${id}"><b>${r.name}</b><small>${r.classes.slice(1).join(' → ')}</small><small>${r.desc}</small></button>`).join('');
  rc.onclick = e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    selRace = b.dataset.r;
    rc.querySelectorAll('.race').forEach(x => x.classList.toggle('sel', x === b));
  };
  const old = load();
  // starší verze hry = wipe serveru
  try {
    const v1 = !old && JSON.parse(localStorage.getItem('lajnidz2-save-v1'));
    if (v1 && v1.name) {
      $('#cContinue').classList.remove('hidden');
      $('#btnContinue').classList.add('hidden');
      $('#cContinue .or').innerHTML = `⚠️ <b>Server byl wipnut.</b> Tvoje postava ${esc(v1.name)} (lv ${+v1.level || 1}) je pryč. Jako na každém privátním serveru, když majitel dostane nápad.`;
    }
  } catch (e) { /* nic */ }
  if (old) {
    $('#cContinue').classList.remove('hidden');
    $('#btnContinue').textContent = `▶ ${old.name} · Lv ${old.level} ${RACES[old.race].classes[old.prof || 0]}`;
    $('#btnContinue').onclick = () => start(old);
  }
  $('#btnStart').onclick = () => {
    let n = $('#cName').value.trim().replace(/\s+/g, '_');
    if (!n) n = pick(['xXLegolasXx', 'DarkAvenger', 'Gladiátor', 'BD_Boxik', 'Spoiler']) + randi(1, 99);
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
  for (const k of ['inv', 'st']) for (const j in f[k]) if (S[k][j] === undefined) S[k][j] = f[k][j];
  SK = BASE_SKILLS.concat([{ ...RACE_SKILL[S.race], id: S.race === 'dwarf' ? 'spoil' : 'race' }]);
  $('#create').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  buildHotbar();
  running = true;
  const z = S.zone && ZONES[S.zone] && !ZONES[S.zone].boss ? S.zone : 'town';
  teleport(z);
  const st = stats();
  S.hp = Math.min(S.hp, st.maxHp); S.mp = Math.min(S.mp, st.maxMp); S.cp = Math.min(S.cp, st.maxCp);
  if (S.hp <= 0) S.hp = st.maxHp * .5;
  chatAt = T + 3; annAt = T + 20;
  chat('Announcements: Vítejte na PxSandbox Interlude x50! Rates: XP ×50 · SP ×50 · Adena ×30 · Drop ×1.', 'ann');
  chat('Announcements: Nezapomeňte hlasovat na topzone. Za hlas dostanete… dobrý pocit.', 'ann');
  if (S.st.kills === 0 && S.level === 1) {
    sys(`Vítej v Adenu, ${S.name}! Na retailu bys začínal ve své rasové vesnici. Tady rovnou Giran, protože x50.`);
    sys('Tip: Gatekeeper Clarissa (nahoře 🧙) tě zdarma pošle na Talking Island. Skilly se učí u Grand Mastera za SP.');
    sys('Klik na moba = útok, Shift+klik = drop list. F1–F7 skilly, Q pot, E soulshoty, X sednout. ❓ = nápověda.');
  } else {
    sys(`Vítej zpět, ${S.name}. Server mezitím restartoval. Dvakrát.`);
  }
  updateHud();
}

buildLogin();
buildCreate();
requestAnimationFrame(frame);

// pro ladění v konzoli
window.__l2 = { get S() { return S; }, pl, get mobs() { return mobs; }, enterZone, teleport, gainXp, setSpeed: v => { speed = v; }, buildHotbar, ACTIONS, skillSp, get SK() { return SK; }, get tele() { return tele; } };
})();
