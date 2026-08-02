/* ------------------------------------------------------------------
   Animace pro wiki.
   V markdownu se vloží fenced blokem:  ```anim:<klic>```
   Každá funkce dostane prázdný <div> a vrátí funkci pro úklid.
------------------------------------------------------------------- */
const ANIMS = {};
window.ANIMS = ANIMS;

/* ---------------- pomocné ---------------- */

function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

function canvasIn(parent, height) {
  const c = el("canvas", "anim-canvas", parent);
  c.style.width = "100%";
  c.style.height = height + "px";
  const ctx = c.getContext("2d");
  const size = { w: 600, h: height };
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    size.w = c.clientWidth || 600;
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(c);
  return { ctx, size, stop: () => ro.disconnect() };
}

function slider(parent, opts) {
  const row = el("label", "anim-ctl", parent);
  const name = el("span", "anim-ctl-name", row, opts.label);
  const input = el("input", null, row);
  input.type = "range";
  input.min = opts.min; input.max = opts.max;
  input.step = opts.step; input.value = opts.value;
  const val = el("span", "anim-ctl-val", row);
  const sync = () => { val.textContent = opts.format(+input.value); };
  input.addEventListener("input", sync);
  sync();
  return { input, get value() { return +this.input.value; }, set value(v) { input.value = v; sync(); }, name, sync };
}

function buttons(parent, items, onPick) {
  const row = el("div", "anim-btns", parent);
  items.forEach(it => {
    const b = el("button", null, row, it.label);
    b.addEventListener("click", () => onPick(it));
  });
  return row;
}

function readout(parent) { return el("div", "anim-out", parent); }

function loop(fn) {
  let id, t0 = performance.now();
  const step = t => { fn((t - t0) / 1000); id = requestAnimationFrame(step); };
  id = requestAnimationFrame(step);
  return () => cancelAnimationFrame(id);
}

/* pásmo podle vlnové délky v metrech */
function band(l) {
  if (l > 1e-3) return "rádiové";
  if (l > 7e-7) return "infračervené";
  if (l > 3.8e-7) return "viditelné";
  if (l > 1e-8) return "ultrafialové";
  if (l > 1e-11) return "rentgenové";
  return "gama";
}

function fmtLambda(l) {
  if (l >= 1) return l.toFixed(2) + " m";
  if (l >= 1e-3) return (l * 1e3).toFixed(1) + " mm";
  if (l >= 1e-6) return (l * 1e6).toFixed(2) + " µm";
  if (l >= 1e-9) return (l * 1e9).toFixed(1) + " nm";
  return (l * 1e12).toFixed(1) + " pm";
}

const C = {
  fg: "#d8f4ee", dim: "#6b8a86", accent: "#00ffc8",
  warn: "#ffb454", bad: "#ff8f8f", metal: "#4a5a63"
};

/* Besselova funkce J1 — aproximace Abramowitz & Stegun 9.4.4 / 9.4.6 */
function besselJ1(x) {
  const ax = Math.abs(x);
  let r;
  if (ax < 3) {
    const t = x / 3, t2 = t * t;
    r = x * (0.5 - 0.56249985 * t2 + 0.21093573 * t2 ** 2 - 0.03954289 * t2 ** 3 +
             0.00443319 * t2 ** 4 - 0.00031761 * t2 ** 5 + 0.00001109 * t2 ** 6);
  } else {
    const u = 3 / ax;
    const f = 0.79788456 + 0.00000156 * u + 0.01659667 * u ** 2 + 0.00017105 * u ** 3 -
              0.00249511 * u ** 4 + 0.00113653 * u ** 5 - 0.00020033 * u ** 6;
    const th = ax - 2.35619449 + 0.12499612 * u + 0.00005650 * u ** 2 - 0.00637879 * u ** 3 +
               0.00074348 * u ** 4 + 0.00079824 * u ** 5 - 0.00029166 * u ** 6;
    r = f / Math.sqrt(ax) * Math.cos(th);
    if (x < 0) r = -r;
  }
  return r;
}

/* ==================================================================
   1) Odraz na kovu a plazmová frekvence
================================================================== */
ANIMS.odraz = root => {
  const cv = canvasIn(root, 230);
  const out = readout(root);
  const s = slider(root, {
    label: "vlnová délka", min: -10, max: 0, step: 0.05, value: -6.3,
    format: v => fmtLambda(10 ** v) + " · " + band(10 ** v)
  });

  const LP = 1e-7;                       // plazmová vlnová délka hliníku (~100 nm)

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const lam = 10 ** s.value;
    const R = 1 / (1 + (LP / lam) ** 4); // odrazivost
    const T = 1 - R;
    const Xs = Math.round(w * 0.62);
    const wl = 18 + 70 * (Math.log10(lam) + 10) / 10;   // vlnová délka v pixelech

    ctx.clearRect(0, 0, w, h);

    // kov
    ctx.fillStyle = "rgba(120,150,160,0.18)";
    ctx.fillRect(Xs, 0, w - Xs, h);
    ctx.strokeStyle = C.metal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Xs, 0); ctx.lineTo(Xs, h); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("kov (volné elektrony)", Xs + 10, 18);

    const wave = (y, x0, x1, amp, dir, alpha, color) => {
      if (amp < 0.02) return;
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        const y2 = y + amp * 22 * Math.sin(2 * Math.PI * (x / wl - dir * t * 1.2));
        x === x0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    };

    // horní dráha: dopadající vlna
    wave(70, 0, Xs, 1, 1, 0.95, C.accent);
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("dopadající vlna →", 8, 24);

    // dolní dráha: odražená + prošlá
    wave(165, 0, Xs, R, -1, 0.95, C.accent);
    wave(165, Xs, w, T, 1, 0.95, C.warn);
    ctx.fillStyle = C.dim;
    ctx.fillText("← odražená (" + Math.round(R * 100) + " %)", 8, 210);
    if (T > 0.05) ctx.fillText("prošlá →", Xs + 10, 210);

    // elektrony na rozhraní
    for (let i = 0; i < 9; i++) {
      const ey = 20 + i * 24;
      const off = R * 7 * Math.sin(2 * Math.PI * t * 1.2 - i * 0.3);
      ctx.fillStyle = C.accent; ctx.globalAlpha = 0.35 + 0.5 * R;
      ctx.beginPath(); ctx.arc(Xs + 14, ey + off, 3.2, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    out.innerHTML = R > 0.5
      ? "Elektrony stíhají kmitat s vlnou a vyzáří ji zpět → <b>odraz</b>. Zrcadlo funguje."
      : "Vlna kmitá rychleji, než elektrony stíhají reagovat → <b>projde skrz</b>. Kov přestává být zrcadlem (nad plazmovou frekvencí, u hliníku ~100 nm).";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   2) Hladkost povrchu — kritérium λ/20
================================================================== */
ANIMS.hladkost = root => {
  const cv = canvasIn(root, 250);
  const out = readout(root);
  const s = slider(root, {
    label: "nerovnost povrchu", min: 0, max: 50, step: 1, value: 2,
    format: v => v === 0 ? "dokonalá (0)" : "λ/" + Math.max(1, Math.round(100 / v))
  });

  const bumps = [];                       // pevný „náhodný“ profil
  for (let i = 0; i < 7; i++) bumps.push({ f: 0.9 + i * 0.7, p: i * 2.1, a: 1 / (1 + i * 0.4) });

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const ratio = s.value / 100;          // nerovnost v jednotkách λ
    const LPX = 44;                       // λ v pixelech
    const amp = ratio * LPX;
    const base = h - 70;

    ctx.clearRect(0, 0, w, h);

    const surf = x => {
      let y = 0;
      bumps.forEach(b => { y += b.a * Math.sin(x / (w / 3) * b.f * Math.PI + b.p); });
      return base + y * amp * 0.6;
    };

    // povrch
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) x === 0 ? ctx.moveTo(x, surf(x)) : ctx.lineTo(x, surf(x));
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = "rgba(120,150,160,0.18)"; ctx.fill();
    ctx.strokeStyle = C.metal; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) x === 0 ? ctx.moveTo(x, surf(x)) : ctx.lineTo(x, surf(x));
    ctx.stroke();

    // šikmo dopadající rovnoběžné paprsky, odraz podle lokální normály
    const d = { x: 0.53, y: 0.85 };          // směr dopadu (~32° od svislice)
    const N = 12, angles = [];
    for (let i = 0; i < N; i++) {
      const x = 40 + i * (w - 150) / N;
      const y = surf(x);
      const slope = (surf(x + 1) - surf(x - 1)) / 2;
      const nx = -slope, ny = -1, nl = Math.hypot(nx, ny);
      const dot = d.x * nx / nl + d.y * ny / nl;
      const r = { x: d.x - 2 * dot * nx / nl, y: d.y - 2 * dot * ny / nl };
      angles.push(Math.atan2(r.x, -r.y));

      const L = 150;
      ctx.strokeStyle = "rgba(0,255,200,0.3)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - d.x * L, y - d.y * L); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r.x * L, y + r.y * L); ctx.stroke();

      const ph = (t * 0.5 + i * 0.08) % 1;   // putující foton
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(x - d.x * L * (1 - ph), y - d.y * L * (1 - ph), 2.2, 0, 7); ctx.fill();
    }

    // rozptyl → kvalita obrazu (v samostatném rámečku)
    const mean = angles.reduce((a, b) => a + b, 0) / N;
    const spread = Math.sqrt(angles.reduce((a, b) => a + (b - mean) ** 2, 0) / N);
    const bx = w - 108, by = 12, bw = 96, bh = 96;
    ctx.fillStyle = "rgba(3,4,8,0.92)"; ctx.strokeStyle = "rgba(0,255,200,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke();
    const cx = bx + bw / 2, cy = by + bh / 2 - 6;
    const rad = Math.min(bh / 2 - 6, Math.max(5, 4 + spread * 200));
    ctx.save();
    ctx.beginPath(); ctx.roundRect(bx + 1, by + 1, bw - 2, bh - 2, 7); ctx.clip();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(216,244,238,0.95)");
    g.addColorStop(1, "rgba(216,244,238,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    ctx.fillText("obraz hvězdy", cx, by + bh - 8);
    ctx.textAlign = "left";
    ctx.fillText("rovnoběžné paprsky", 8, 20);

    const ok = ratio <= 0.05;
    out.innerHTML = ratio === 0
      ? "Dokonalý povrch: všechny paprsky odejdou rovnoběžně, obraz je bod."
      : (ok
        ? "Nerovnost pod <b>λ/20</b> — odražená vlna zůstává ve fázi, obraz je ostrý. <i>Tohle je hranice použitelnosti zrcadla.</i>"
        : "Nerovnost nad λ/20 — paprsky se rozbíhají, obraz se rozmazává. Pro rentgen by tahle tolerance znamenala hladkost pod velikost atomu.");
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   3) Spektrum, Wienův zákon a atmosférická okna
================================================================== */
ANIMS.spektrum = root => {
  const cv = canvasIn(root, 260);
  const out = readout(root);
  const s = slider(root, {
    label: "teplota tělesa", min: 0.4, max: 8, step: 0.02, value: 3.76,
    format: v => {
      const T = 10 ** v;
      return T < 1000 ? T.toFixed(0) + " K" : (T / 1000).toFixed(T < 1e5 ? 1 : 0) + " tis. K";
    }
  });
  buttons(root, [
    { label: "reliktní záření 2,7 K", T: 2.725 },
    { label: "prach 30 K", T: 30 },
    { label: "Slunce 5772 K", T: 5772 },
    { label: "plyn v kupě 10⁷ K", T: 1e7 }
  ], it => { s.value = Math.log10(it.T); });

  const L0 = 2, L1 = -13;                        // log10 λ od 100 m do 0,1 pm
  const bands = [
    { a: 2, b: -3, n: "rádiové", c: "#4f7cff" },
    { a: -3, b: -6.15, n: "infra", c: "#ff7a45" },
    { a: -6.15, b: -6.42, n: "vid.", c: "#7cff9a" },
    { a: -6.42, b: -8, n: "UV", c: "#b46cff" },
    { a: -8, b: -11, n: "rentgen", c: "#00d5ff" },
    { a: -11, b: -13, n: "gama", c: "#ff5f8f" }
  ];
  const windows = [{ a: 1, b: -2 }, { a: -6.5, b: -6.96 }];   // rádiové a optické okno

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const X = lg => 40 + (lg - L0) / (L1 - L0) * (w - 60);
    const T = 10 ** s.value;
    const lmax = 2.898e-3 / T;

    ctx.clearRect(0, 0, w, h);

    // pásma
    bands.forEach(b => {
      const x0 = X(b.a), x1 = X(b.b);
      ctx.fillStyle = b.c; ctx.globalAlpha = 0.25;
      ctx.fillRect(x0, 24, x1 - x0, 22);
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.c; ctx.font = "11px system-ui"; ctx.textAlign = "center";
      if (x1 - x0 > 26) ctx.fillText(b.n, (x0 + x1) / 2, 39);
    });
    ctx.textAlign = "left";
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("dlouhé vlny", 40, 18); ctx.textAlign = "right";
    ctx.fillText("krátké vlny", w - 20, 18); ctx.textAlign = "left";

    // atmosférická okna
    ctx.fillStyle = "rgba(120,140,150,0.25)";
    ctx.fillRect(40, 54, w - 60, 14);
    windows.forEach(o => {
      ctx.fillStyle = "rgba(0,255,200,0.5)";
      ctx.fillRect(X(o.a), 54, X(o.b) - X(o.a), 14);
    });
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText(w < 560
      ? "tyrkysově = projde atmosférou, šedě = jen z vesmíru"
      : "atmosféra: tyrkysově = projde (rádiové a optické okno), šedě = nutno do vesmíru", 40, 82);

    // křivka záření černého tělesa
    const yb = h - 24, ht = h - 130;
    let peak = 0;
    const vals = [];
    for (let px = 40; px <= w - 20; px += 2) {
      const lg = L0 + (px - 40) / (w - 60) * (L1 - L0);
      const l = 10 ** lg;
      const x = 1.4388e-2 / (l * T);
      const B = x > 60 ? 0 : 1 / (l ** 5 * (Math.exp(x) - 1));
      vals.push([px, B]);
      if (B > peak) peak = B;
    }
    ctx.beginPath();
    vals.forEach(([px, B], i) => {
      const y = yb - (peak ? B / peak : 0) * ht;
      i === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    });
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(w - 20, yb); ctx.lineTo(40, yb); ctx.closePath();
    ctx.fillStyle = "rgba(0,255,200,0.10)"; ctx.fill();

    // maximum
    const xm = X(Math.log10(lmax));
    ctx.strokeStyle = C.warn; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xm, 24); ctx.lineTo(xm, 48); ctx.moveTo(xm, 92); ctx.lineTo(xm, yb); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.warn; ctx.font = "12px system-ui"; ctx.textAlign = "center";
    ctx.fillText("λ max = " + fmtLambda(lmax), Math.min(w - 60, Math.max(60, xm)), h - 6);
    ctx.textAlign = "left";

    out.innerHTML = "Těleso o teplotě <b>" + (T < 1e4 ? Math.round(T) : T.toExponential(1)) +
      " K</b> vyzařuje nejvíc na <b>" + fmtLambda(lmax) + "</b> — pásmo <b>" + band(lmax) +
      "</b>. Wienův zákon: λ<sub>max</sub> ≈ 2898 / T [µm, K].";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   4) Úhlové rozlišení θ ≈ 1,22 λ/D
================================================================== */
ANIMS.rozliseni = root => {
  const cv = canvasIn(root, 300);
  const out = readout(root);
  const sl = slider(root, {
    label: "vlnová délka", min: -7, max: 0, step: 0.05, value: -6.3,
    format: v => fmtLambda(10 ** v) + " · " + band(10 ** v)
  });
  const sd = slider(root, {
    label: "průměr zrcadla", min: -1, max: 3, step: 0.02, value: 0.38,
    format: v => { const D = 10 ** v; return D < 1 ? (D * 100).toFixed(0) + " cm" : D.toFixed(1) + " m"; }
  });

  const buf = document.createElement("canvas");
  buf.width = 220; buf.height = 110;
  const bctx = buf.getContext("2d");
  const img = bctx.createImageData(buf.width, buf.height);

  const SEP = 46;                          // úhlová vzdálenost dvojice v pixelech
  let shown = 30;

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const lam = 10 ** sl.value, D = 10 ** sd.value;
    const thRad = 1.22 * lam / D;
    const thArc = thRad * 206265;
    // převod: rozlišovací mez v pixelech obrázku (kalibrace přes SEP = 0,1")
    const want = thArc / 0.1 * SEP;
    const capped = want > 130;
    const target = Math.max(2, Math.min(130, want));
    shown += (target - shown) * 0.2;

    // Airyho obrazce dvou zdrojů
    const airy = r => {
      const x = 3.8317 * r / shown;
      if (x < 1e-4) return 1;
      const v = 2 * besselJ1(x) / x;
      return v * v;
    };
    for (let y = 0; y < buf.height; y++) {
      for (let x = 0; x < buf.width; x++) {
        const r1 = Math.hypot(x - (buf.width / 2 - SEP / 2), y - buf.height / 2);
        const r2 = Math.hypot(x - (buf.width / 2 + SEP / 2), y - buf.height / 2);
        const I = Math.min(1, airy(r1) + airy(r2));
        const v = Math.pow(I, 0.45);
        const i = (y * buf.width + x) * 4;
        img.data[i] = 216 * v; img.data[i + 1] = 244 * v; img.data[i + 2] = 238 * v; img.data[i + 3] = 255;
      }
    }
    bctx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, w, h);
    const dw = Math.min(w - 20, 420, 2 * (h - 120)), dh = dw * buf.height / buf.width;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(buf, (w - dw) / 2, 12, dw, dh);

    // profil jasu pod obrázkem
    const y0 = 12 + dh + 52;
    ctx.beginPath();
    for (let px = 0; px < buf.width; px++) {
      const r1 = Math.abs(px - (buf.width / 2 - SEP / 2)), r2 = Math.abs(px - (buf.width / 2 + SEP / 2));
      const I = Math.min(1, airy(r1) + airy(r2));
      const X = (w - dw) / 2 + px * dw / buf.width;
      px === 0 ? ctx.moveTo(X, y0 - I * 44) : ctx.lineTo(X, y0 - I * 44);
    }
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();

    const ratio = SEP / shown;
    const verdict = ratio > 1.3 ? ["dvě hvězdy rozlišeny", C.accent]
      : ratio > 0.85 ? ["na hranici (Rayleighovo kritérium)", C.warn]
      : ["splynuly v jeden objekt", C.bad];
    ctx.fillStyle = verdict[1]; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    ctx.fillText(verdict[0] + (capped ? " (rozmazání je mimo měřítko obrázku)" : ""), w / 2, h - 8);
    ctx.textAlign = "left";

    out.innerHTML = "θ ≈ 1,22 λ/D = <b>" + (thArc < 0.01 ? (thArc * 1000).toFixed(1) + " mas" :
      thArc < 60 ? thArc.toFixed(2) + "″" : (thArc / 60).toFixed(1) + "′") +
      "</b> · dvojice je vzdálená 0,1″. Delší vlna nebo menší zrcadlo = horší rozlišení — proto rádiová astronomie potřebuje interferometrii.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   5) Odraz pod malým úhlem a Wolterova optika
================================================================== */
ANIMS.dopad = root => {
  const cv = canvasIn(root, 320);
  const out = readout(root);
  const s = slider(root, {
    label: "úhel od povrchu", min: 0.2, max: 30, step: 0.1, value: 12,
    format: v => v.toFixed(1) + "°"
  });
  const TC = 2;                                  // kritický úhel (schematicky)

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const a = s.value, ok = a <= TC;
    const rad = a * Math.PI / 180;

    ctx.clearRect(0, 0, w, h);

    /* --- horní panel: jeden povrch --- */
    const sy = 130;
    ctx.fillStyle = "rgba(120,150,160,0.18)"; ctx.fillRect(0, sy, w, 40);
    ctx.strokeStyle = C.metal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(w, sy); ctx.stroke();

    const hitX = w * 0.5, len = 300;
    const startX = hitX - Math.cos(rad) * len, startY = sy - Math.sin(rad) * len;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(hitX, sy); ctx.stroke();

    if (ok) {
      ctx.beginPath(); ctx.moveTo(hitX, sy);
      ctx.lineTo(hitX + Math.cos(rad) * len, sy - Math.sin(rad) * len); ctx.stroke();
      ctx.fillStyle = C.accent; ctx.font = "12px system-ui";
      ctx.fillText("odraz (pod kritickým úhlem ~" + TC + "°)", hitX + 20, sy - 40);
    } else {
      const g = ctx.createLinearGradient(hitX, sy, hitX + 60, sy + 40);
      g.addColorStop(0, "rgba(255,143,143,0.9)"); g.addColorStop(1, "rgba(255,143,143,0)");
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(hitX, sy); ctx.lineTo(hitX + 60, sy + 40); ctx.stroke();
      ctx.fillStyle = C.bad; ctx.font = "12px system-ui";
      ctx.fillText("rentgen pohlcen — kolmější dopad nefunguje", hitX + 20, sy - 40);
    }
    // putující foton
    const ph = (t * 0.5) % 1;
    ctx.fillStyle = ok ? C.accent : C.bad;
    ctx.beginPath();
    ctx.arc(startX + (hitX - startX) * ph, startY + (sy - startY) * ph, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("rentgenový foton", 8, 20);

    /* --- dolní panel: Wolterova optika --- */
    const oy = 248, foc = w - 40;
    ctx.strokeStyle = "rgba(0,255,200,0.25)"; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(w, oy); ctx.stroke(); ctx.setLineDash([]);

    [22, 38].forEach((r, k) => {
      [1, -1].forEach(sgn => {
        const y = oy - sgn * r;
        const x0 = 30, x1 = 150, x2 = 250;
        const y1 = y + sgn * 4, y2 = y + sgn * 12;
        ctx.strokeStyle = C.metal; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // paprsek
        ctx.strokeStyle = ok ? "rgba(0,255,200,0.85)" : "rgba(255,143,143,0.5)";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, y - sgn * 2); ctx.lineTo(x1 - 10, y1 - sgn * 1);
        if (ok) { ctx.lineTo(x2, y2); ctx.lineTo(foc, oy); }
        ctx.stroke();
        if (ok) {
          const p = (t * 0.35 + k * 0.3 + (sgn > 0 ? 0 : 0.15)) % 1;
          const px = p * foc, py = px < x2 ? y - sgn * 2 + (px / x2) * (y2 - y + sgn * 2)
                                          : y2 + (px - x2) / (foc - x2) * (oy - y2);
          ctx.fillStyle = C.accent;
          ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill();
        }
      });
    });
    ctx.fillStyle = ok ? C.accent : C.dim;
    ctx.beginPath(); ctx.arc(foc, oy, ok ? 4 : 2, 0, 7); ctx.fill();
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("Wolterova optika: vnořená zrcadla téměř rovnoběžná se svazkem", 8, 196);
    ctx.fillText(ok ? "ohnisko" : "bez ohniska", foc - 90, oy + 46);

    out.innerHTML = ok
      ? "Pod kritickým úhlem (jednotky stupňů) nastane <b>totální vnější odraz</b> — jako kámen skákající po hladině. Zrcadla proto leží skoro rovnoběžně se svazkem a sběrnou plochou je jen tenký prstenec."
      : "Při strmějším dopadu se foton do zrcadla zaboří a <b>pohltí se</b>. Proto rentgenová optika nemůže vypadat jako klasické zrcadlo.";
  });

  return () => { stop(); cv.stop(); };
};
