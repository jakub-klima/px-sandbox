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

/* ==================================================================
   6) Rozpínání vesmíru — Hubbleův zákon a chybějící střed  (lekce 01)
================================================================== */
ANIMS.rozpinani = root => {
  const cv = canvasIn(root, 300);
  const out = readout(root);
  const s = slider(root, {
    label: "čas od velkého třesku", min: 1, max: 13.8, step: 0.05, value: 4,
    format: v => v.toFixed(1) + " mld. let"
  });
  let playing = true, obs = 15;
  buttons(root, [{ label: "⏯ rozpínání" }, { label: "jiný pozorovatel" }], it => {
    if (it.label.startsWith("⏯")) playing = !playing;
    else obs = (obs + 7) % gx.length;
  });

  const gx = [], seed = 1234;
  let r = seed;
  const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let iy = 0; iy < 4; iy++)
    for (let ix = 0; ix < 6; ix++)
      gx.push({ x: (ix - 2.5) / 2.6 + (rnd() - 0.5) * 0.22,
                y: (iy - 1.5) / 2.0 + (rnd() - 0.5) * 0.22, s: 3 + rnd() * 2.5 });

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    if (playing) {
      const t = s.value + 0.045;
      s.value = t > 13.8 ? 1 : t;
    }
    const a = s.value / 13.8;                    // relativní měřítko vesmíru
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.30;

    ctx.clearRect(0, 0, w, h);
    const O = gx[obs];
    const px = g => ({ x: cx + (g.x - O.x) * R * a, y: cy + (g.y - O.y) * R * a });

    gx.forEach((g, i) => {
      const p = px(g);
      if (i !== obs) {                            // šipka úniku, délka ~ vzdálenost
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
        if (d > 4) {
          const L = Math.min(38, d * 0.28);
          const ux = dx / d, uy = dy / d;
          ctx.strokeStyle = "rgba(255,180,84,0.75)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + ux * L, p.y + uy * L); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x + ux * L, p.y + uy * L);
          ctx.lineTo(p.x + ux * (L - 6) - uy * 4, p.y + uy * (L - 6) + ux * 4);
          ctx.lineTo(p.x + ux * (L - 6) + uy * 4, p.y + uy * (L - 6) - ux * 4);
          ctx.closePath(); ctx.fillStyle = C.warn; ctx.fill();
        }
      }
      ctx.fillStyle = i === obs ? C.accent : "rgba(216,244,238,0.8)";
      ctx.beginPath(); ctx.arc(p.x, p.y, i === obs ? g.s + 2 : g.s, 0, 7); ctx.fill();
      if (i === obs) {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, g.s + 9, 0, 7); ctx.stroke();
      }
    });

    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("tyrkysová = pozorovatel · šipky = rychlost vzdalování", 10, 20);
    ctx.fillText("měřítko vesmíru " + a.toFixed(2) + "×", 10, h - 12);

    out.innerHTML = "Galaxie se nepohybují prostorem — <b>roste prostor mezi nimi</b>. " +
      "Rychlost vzdalování je úměrná vzdálenosti (Hubbleův zákon), takže <b>z každé galaxie to vypadá stejně</b>. " +
      "Přepni pozorovatele: obrázek se nezmění. Vesmír nemá střed.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   7) Rudý posuv  (lekce 01)
================================================================== */
ANIMS.rudyposuv = root => {
  const cv = canvasIn(root, 250);
  const out = readout(root);
  const s = slider(root, {
    label: "rudý posuv z", min: 0, max: 8, step: 0.05, value: 0.6,
    format: v => "z = " + v.toFixed(2)
  });

  const lines = [{ l: 393, n: "Ca" }, { l: 486, n: "Hβ" }, { l: 589, n: "Na" }, { l: 656, n: "Hα" }];
  const L0 = 350, L1 = 2400;                       // nm, zobrazený rozsah
  const colorOf = nm => {
    if (nm < 380) return "#8b5cf6";
    if (nm > 750) return "#5a2b2b";
    const t = (nm - 380) / 370;
    const hue = 280 - t * 280;
    return "hsl(" + hue + ",85%,55%)";
  };

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const z = s.value;
    const X = nm => 30 + (nm - L0) / (L1 - L0) * (w - 50);

    ctx.clearRect(0, 0, w, h);

    const strip = (y, shift, label) => {
      for (let px = 30; px < w - 20; px += 2) {
        const nm = L0 + (px - 30) / (w - 50) * (L1 - L0);
        ctx.fillStyle = colorOf(nm);
        ctx.globalAlpha = nm > 750 ? 0.35 : 0.9;
        ctx.fillRect(px, y, 2, 46);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
      ctx.fillText(label, 30, y - 8);
      lines.forEach(li => {
        const x = X(li.l * shift);
        if (x < w - 20) {
          ctx.fillStyle = "#05060a"; ctx.fillRect(x - 1.5, y, 3, 46);
          ctx.fillStyle = C.fg; ctx.font = "10px system-ui"; ctx.textAlign = "center";
          ctx.fillText(li.n, x, y + 58); ctx.textAlign = "left";
        }
      });
    };

    strip(40, 1, "klidové spektrum (laboratoř)");
    strip(150, 1 + z, "pozorované spektrum galaxie");

    // hranice viditelného
    ctx.strokeStyle = "rgba(216,244,238,0.35)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X(750), 30); ctx.lineTo(X(750), h - 30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("← viditelné | infračervené →", X(750) - 78, h - 12);

    const v = ((1 + z) ** 2 - 1) / ((1 + z) ** 2 + 1);      // relativistický vztah
    out.innerHTML = "Čáry se posunou na λ<sub>poz</sub> = λ<sub>klid</sub> · (1+z). " +
      "Při <b>z = " + z.toFixed(2) + "</b> letí zdroj rychlostí <b>" + (v * 100).toFixed(1) + " % c</b>" +
      (z > 1.2 ? " a Hα se dostane hluboko do infračervené oblasti — proto rané galaxie loví JWST, ne Hubble."
               : ". Posuv se měří z polohy známých spektrálních čar, ne z barvy jako takové.");
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   8) Měřítko vzdáleností a pohled do minulosti  (lekce 01)
================================================================== */
ANIMS.skala = root => {
  const cv = canvasIn(root, 230);
  const out = readout(root);
  const s = slider(root, {
    label: "vzdálenost", min: -8, max: 10.7, step: 0.01, value: 0.62,
    format: v => fmtLy(10 ** v)
  });

  function fmtLy(ly) {
    const km = ly * 9.4607e12;
    if (ly < 1 / 8766) return (ly * 8766 * 60).toFixed(0) + " světelných sekund";
    if (ly < 1 / 365) return (ly * 8766).toFixed(1) + " světelných hodin";
    if (ly < 1) return (ly * 365.25).toFixed(0) + " světelných dní";
    if (ly < 1e3) return ly.toFixed(1) + " sv. let";
    if (ly < 1e6) return (ly / 1e3).toFixed(1) + " tis. sv. let";
    if (ly < 1e9) return (ly / 1e6).toFixed(1) + " mil. sv. let";
    return (ly / 1e9).toFixed(1) + " mld. sv. let";
  }

  const marks = [
    { ly: 1.3 / 31.5e6, n: "Měsíc" },
    { ly: 8 / 525960, n: "Slunce" },
    { ly: 4.2, n: "Proxima" },
    { ly: 26000, n: "střed Galaxie" },
    { ly: 2.5e6, n: "Andromeda" },
    { ly: 6.5e7, n: "kupa v Panně" },
    { ly: 1.3e10, n: "nejstarší galaxie" },
    { ly: 4.6e10, n: "hranice viditelného" }
  ];

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const lg = s.value, ly = 10 ** lg;
    const X = v => 24 + (v + 8) / 18.7 * (w - 48);

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0,255,200,0.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(24, 120); ctx.lineTo(w - 24, 120); ctx.stroke();

    marks.forEach((m, i) => {
      const x = X(Math.log10(m.ly));
      ctx.strokeStyle = "rgba(216,244,238,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 114); ctx.lineTo(x, 126); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.font = "10px system-ui";
      const rows = [-42, -24, 26, 44];
      ctx.textAlign = "center";
      ctx.fillText(m.n, Math.max(30, Math.min(w - 34, x)), 120 + rows[i % 4]);
      ctx.strokeStyle = "rgba(216,244,238,0.12)";
      ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, 120 + rows[i % 4] + (rows[i % 4] < 0 ? 6 : -8)); ctx.stroke();
      ctx.textAlign = "left";
    });
    ctx.textAlign = "left";

    const px = X(lg);
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(px, 120, 6 + Math.sin(t * 4) * 1.2, 0, 7); ctx.fill();

    // foton letící k pozorovateli
    const ph = (t * 0.35) % 1;
    ctx.fillStyle = "rgba(255,180,84,0.9)";
    ctx.beginPath(); ctx.arc(px - (px - 24) * ph, 120, 3, 0, 7); ctx.fill();
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui";
    ctx.fillText("Země →", 8, 124);
    ctx.fillText("logaritmické měřítko", w - 140, 24);

    const yrs = ly;
    const back = yrs < 1 ? (yrs * 365.25).toFixed(0) + " dní"
      : yrs < 1e3 ? yrs.toFixed(0) + " let"
      : yrs < 1e6 ? (yrs / 1e3).toFixed(1) + " tisíce let"
      : yrs < 1e9 ? (yrs / 1e6).toFixed(1) + " milionu let"
      : (yrs / 1e9).toFixed(1) + " miliardy let";
    out.innerHTML = "Vzdálenost <b>" + fmtLy(ly) + "</b> — světlo odsud letí " + back +
      ", takže ten objekt vidíš takový, jaký byl <b>před " + back + "</b>. " +
      "Dívat se daleko znamená dívat se do minulosti.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   9) HR diagram a život hvězdy  (lekce 02)
================================================================== */
ANIMS.hrdiagram = root => {
  const cv = canvasIn(root, 320);
  const out = readout(root);
  const s = slider(root, {
    label: "hmotnost hvězdy", min: -1, max: 1.6, step: 0.01, value: 0,
    format: v => (10 ** v).toFixed(2) + " M☉"
  });
  let phase = 0, playing = false;
  buttons(root, [
    { label: "▶ přehrát život hvězdy" },
    { label: "0,3 M☉", m: 0.3 }, { label: "1 M☉", m: 1 },
    { label: "8 M☉", m: 8 }, { label: "30 M☉", m: 30 }
  ], it => {
    if (it.m) { s.value = Math.log10(it.m); phase = 0; playing = false; }
    else { phase = 0; playing = true; }
  });

  const msT = M => 5772 * M ** 0.55;                 // povrchová teplota hl. posloupnosti
  const msL = M => M ** 3.5;                         // svítivost v L☉
  const life = M => 10 * M ** -2.5;                  // mld. let

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const M = 10 ** s.value;
    const PL = 46, PR = 16, PT = 16, PB = 40;
    const X = T => PL + (Math.log10(40000) - Math.log10(T)) / (Math.log10(40000) - Math.log10(2200)) * (w - PL - PR);
    const Y = L => PT + (6 - Math.log10(L)) / 10 * (h - PT - PB);

    ctx.clearRect(0, 0, w, h);

    // osy
    ctx.strokeStyle = "rgba(0,255,200,0.25)"; ctx.lineWidth = 1;
    ctx.strokeRect(PL, PT, w - PL - PR, h - PT - PB);
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.save(); ctx.translate(12, PT + 90); ctx.rotate(-Math.PI / 2);
    ctx.fillText("svítivost", 0, 0); ctx.restore();
    ctx.fillText("← žhavější        teplota povrchu        chladnější →", PL + 4, h - 16);
    [[1e6, "10⁶ L☉"], [1, "1 L☉"], [1e-4, "10⁻⁴"]].forEach(([L, t]) => {
      ctx.fillText(t, 4, Y(L) + 4);
      ctx.strokeStyle = "rgba(216,244,238,0.08)";
      ctx.beginPath(); ctx.moveTo(PL, Y(L)); ctx.lineTo(w - PR, Y(L)); ctx.stroke();
    });

    // hlavní posloupnost
    ctx.strokeStyle = "rgba(0,255,200,0.5)"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath();
    for (let lm = -1; lm <= 1.7; lm += 0.05) {
      const m = 10 ** lm, x = X(msT(m)), y = Y(msL(m));
      lm === -1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.lineWidth = 1; ctx.lineCap = "butt";
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("hlavní posloupnost", X(24000), Y(9000));
    ctx.fillText("obři a veleobři", X(3600) - 60, Y(3000));
    ctx.fillText("bílí trpaslíci", X(15000) - 10, Y(0.004));

    // fáze života
    const fate = M < 0.08 ? "hnědý trpaslík" : M < 0.5 ? "červený trpaslík (ještě svítí)"
      : M < 8 ? "bílý trpaslík" : M < 25 ? "neutronová hvězda" : "černá díra";
    let pos = { T: msT(M), L: msL(M) }, label = "tvoje hvězda";
    if (playing) {
      phase += 0.004;
      if (phase > 1) { phase = 1; playing = false; }
      if (M >= 0.5) {
        if (phase < 0.55) label = "hlavní posloupnost (" + life(M).toFixed(life(M) < 1 ? 3 : 1) + " mld. let)";
        else if (phase < 0.8) {                       // expanze v obra
          const k = (phase - 0.55) / 0.25;
          pos = { T: msT(M) * (1 - 0.72 * k), L: msL(M) * (1 + 90 * k) };
          label = "rudý obr";
        } else {                                      // konec
          const k = (phase - 0.8) / 0.2;
          const end = M < 8 ? { T: 15000, L: 0.004 } : { T: 30000, L: 1e-3 };
          pos = { T: msT(M) * 0.28 + (end.T - msT(M) * 0.28) * k, L: msL(M) * 91 * (1 - k) + end.L * k };
          label = M < 8 ? "planetární mlhovina → bílý trpaslík" : "supernova → " + fate;
        }
      }
    }
    const px = X(Math.max(2300, Math.min(39000, pos.T))), py = Y(Math.max(1e-4, Math.min(1e6, pos.L)));
    ctx.fillStyle = C.warn;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = C.warn; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke();
    ctx.fillStyle = C.warn; ctx.font = "12px system-ui"; ctx.textAlign = "center";
    ctx.fillText(label, Math.min(w - 90, Math.max(80, px)), py - 18);
    ctx.textAlign = "left";

    const t = life(M);
    out.innerHTML = "<b>" + M.toFixed(2) + " M☉</b> · svítivost <b>" + (msL(M) < 0.01 ? msL(M).toExponential(1) : msL(M).toFixed(msL(M) < 10 ? 2 : 0)) +
      " L☉</b> (L ~ M³·⁵) · život na hlavní posloupnosti <b>" +
      (t > 1000 ? (t / 1000).toFixed(0) + " bilionu let" : t > 1 ? t.toFixed(1) + " mld. let" : (t * 1000).toFixed(0) + " mil. let") +
      "</b> (t ~ M⁻²·⁵) · konec: <b>" + fate + "</b>.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   10) Fúze: coulombovská bariéra a tunelování  (lekce 02)
================================================================== */
ANIMS.fuze = root => {
  const cv = canvasIn(root, 270);
  const out = readout(root);
  const s = slider(root, {
    label: "teplota jádra", min: 5.3, max: 8.3, step: 0.02, value: 7.15,
    format: v => { const T = 10 ** v; return T < 1e7 ? (T / 1e6).toFixed(1) + " mil. K" : (T / 1e6).toFixed(0) + " mil. K"; }
  });

  let x = 0, dir = 1, flash = 0, count = 0, tries = 0;

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const T = 10 ** s.value;
    const p = Math.exp(-Math.sqrt(1.5e7 / T) * 5.2);      // schematická pravděpodobnost tunelování
    const cx = w / 2, base = h - 56;

    ctx.clearRect(0, 0, w, h);

    // coulombovská bariéra
    ctx.beginPath();
    for (let px = 20; px <= w - 20; px += 2) {
      const d = Math.abs(px - cx);
      const y = base - Math.min(120, 2600 / (d + 22));
      px === 20 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = "rgba(255,143,143,0.8)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.bad; ctx.font = "12px system-ui";
    ctx.fillText("coulombovská bariéra (protony se odpuzují)", 22, 26);

    // energie odpovídající teplotě
    const eLevel = base - Math.min(118, 26 * Math.log10(T / 1e5));
    ctx.strokeStyle = C.warn; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, eLevel); ctx.lineTo(w - 20, eLevel); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.warn; ctx.font = "11px system-ui";
    ctx.fillText("tepelná energie protonů", 22, eLevel - 6);

    // pokus o sblížení
    x += dir * 1.6;
    if (x > 78) { dir = -1; tries++; if (Math.random() < p * 12) { flash = 1; count++; } }
    if (x < 4) dir = 1;

    const drawP = (px, col) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, base + 18, 9, 0, 7); ctx.fill();
      ctx.fillStyle = "#05060a"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center";
      ctx.fillText("+", px, base + 22); ctx.textAlign = "left";
    };

    if (flash > 0) {
      flash -= 0.02;
      const g = ctx.createRadialGradient(cx, base + 18, 0, cx, base + 18, 60 * flash + 10);
      g.addColorStop(0, "rgba(255,220,120," + flash + ")");
      g.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, base + 18, 60 * flash + 10, 0, 7); ctx.fill();
      ctx.fillStyle = C.accent; ctx.font = "12px system-ui"; ctx.textAlign = "center";
      ctx.fillText("fúze! 0,7 % hmoty → energie", cx, base + 48); ctx.textAlign = "left";
      drawP(cx - 6, C.accent); drawP(cx + 6, C.accent);
    } else {
      drawP(cx - x - 10, "#9fd8ce"); drawP(cx + x + 10, "#9fd8ce");
    }

    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("srážek: " + tries + " · fúzí: " + count, 22, h - 10);

    out.innerHTML = T < 4e6
      ? "Při <b>" + (T / 1e6).toFixed(1) + " mil. K</b> protony nemají dost energie, bariéru nepřekonají a hvězda se nezapálí."
      : "Při <b>" + (T / 1e6).toFixed(0) + " mil. K</b> se protony přiblíží tak, že občas <b>protunelují</b> bariéru — klasicky by to nešlo nikdy. " +
        "Právě ta malá pravděpodobnost drží tempo fúze pomalé, a proto Slunce hoří miliardy let místo aby vybuchlo.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   11) Konec hvězdy podle hmotnosti  (lekce 02)
================================================================== */
ANIMS.smrt = root => {
  const cv = canvasIn(root, 260);
  const out = readout(root);
  const s = slider(root, {
    label: "hmotnost", min: -1.4, max: 1.7, step: 0.01, value: 0,
    format: v => (10 ** v).toFixed(2) + " M☉"
  });

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const M = 10 ** s.value;
    ctx.clearRect(0, 0, w, h);

    const kind = M < 0.08 ? 0 : M < 0.5 ? 1 : M < 8 ? 2 : M < 25 ? 3 : 4;
    const info = [
      ["hnědý trpaslík", "fúze se nikdy nezapálí", "#8a6a4a", 30],
      ["červený trpaslík", "pálí vodík biliony let — žádný z nich ještě nedohořel", "#ff6b5a", 34],
      ["bílý trpaslík", "rudý obr odhodí obálku jako planetární mlhovinu; zbude jádro velikosti Země (mez 1,4 M☉)", "#dff3ff", 14],
      ["neutronová hvězda", "kolaps jádra a supernova II. typu; koule o průměru ~20 km", "#cfe8ff", 7],
      ["černá díra", "kolaps bez zastavení; Schwarzschildův poloměr r = 2GM/c²", "#000000", 10]
    ][kind];

    // hvězda před koncem
    const rs = 16 + 26 * Math.log10(M + 1.2);
    ctx.fillStyle = "rgba(255,200,120,0.9)";
    ctx.beginPath(); ctx.arc(w * 0.24, h / 2, rs, 0, 7); ctx.fill();
    ctx.fillStyle = C.dim; ctx.font = "12px system-ui"; ctx.textAlign = "center";
    ctx.fillText("hvězda " + M.toFixed(2) + " M☉", w * 0.24, h / 2 + rs + 22);

    // šipka
    ctx.strokeStyle = "rgba(0,255,200,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w * 0.24 + rs + 20, h / 2); ctx.lineTo(w * 0.62 - 60, h / 2); ctx.stroke();

    // supernova u hmotných
    if (kind >= 3) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      const g = ctx.createRadialGradient(w * 0.66, h / 2, 0, w * 0.66, h / 2, 70 + pulse * 20);
      g.addColorStop(0, "rgba(255,220,150,0.35)");
      g.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w * 0.66, h / 2, 90, 0, 7); ctx.fill();
      ctx.fillStyle = C.warn; ctx.font = "11px system-ui";
      ctx.fillText("supernova", w * 0.66, h / 2 - 74);
    }

    // zbytek
    const rr = info[3];
    if (kind === 4) {
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(w * 0.66, h / 2, rr, 0, 7); ctx.fill();
      ctx.strokeStyle = C.warn; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w * 0.66, h / 2, rr + 5 + Math.sin(t * 2) * 1.5, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = info[2];
      ctx.beginPath(); ctx.arc(w * 0.66, h / 2, rr, 0, 7); ctx.fill();
    }
    ctx.fillStyle = C.fg; ctx.font = "13px system-ui";
    ctx.fillText(info[0], w * 0.66, h / 2 + 48);
    ctx.textAlign = "left";

    // stupnice hmotnosti
    ctx.fillStyle = C.dim; ctx.font = "10px system-ui";
    const marks = [[0.08, "0,08"], [0.5, "0,5"], [8, "8"], [25, "25"]];
    ctx.strokeStyle = "rgba(216,244,238,0.15)";
    ctx.beginPath(); ctx.moveTo(20, h - 16); ctx.lineTo(w - 20, h - 16); ctx.stroke();
    const MX = m => 20 + (Math.log10(m) + 1.4) / 3.1 * (w - 40);
    marks.forEach(([m, lab]) => {
      ctx.beginPath(); ctx.moveTo(MX(m), h - 21); ctx.lineTo(MX(m), h - 11); ctx.stroke();
      ctx.fillText(lab + " M☉", MX(m) - 12, h - 24);
    });
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(MX(M), h - 16, 4, 0, 7); ctx.fill();

    out.innerHTML = "<b>" + info[0] + "</b> — " + info[1] + ".";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   12) Čtyři interakce: síla vs. vzdálenost  (lekce 03)
================================================================== */
ANIMS.sily = root => {
  const cv = canvasIn(root, 280);
  const out = readout(root);
  const s = slider(root, {
    label: "vzdálenost dvou protonů", min: -18, max: 0, step: 0.05, value: -15,
    format: v => { const r = 10 ** v; return r < 1e-12 ? (r * 1e15).toFixed(2) + " fm" : r < 1e-9 ? (r * 1e12).toFixed(2) + " pm" : r < 1e-3 ? (r * 1e9).toFixed(2) + " nm" : (r * 1e3).toFixed(1) + " mm"; }
  });
  let neutral = false;
  buttons(root, [{ label: "hmota je elektricky neutrální: vypnout EM" }], () => { neutral = !neutral; });

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const r = 10 ** s.value;
    const em = 8.99e9 * (1.602e-19) ** 2 / r ** 2;
    const gr = 6.674e-11 * (1.673e-27) ** 2 / r ** 2;
    const st = 1e4 * Math.exp(-(r - 1e-15) / 4e-16) * (r < 3e-15 ? 1 : 0);
    const wk = 1e-2 * Math.exp(-(r - 1e-18) / 3e-19) * (r < 5e-18 ? 1 : 0);

    const rows = [
      ["silná", st, "#00ffc8"],
      ["elektromagnetická", neutral ? 0 : em, "#7cc4ff"],
      ["slabá", wk, "#b46cff"],
      ["gravitační", gr, "#ffb454"]
    ];
    const LO = -45, HI = 6;                       // log10 síly v newtonech
    const BX = 190, BW = w - BX - 90;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("síla mezi dvěma protony (log měřítko, newtony)", BX, 20);

    rows.forEach((row, i) => {
      const y = 44 + i * 52;
      const val = row[1];
      const lg = val > 0 ? Math.log10(val) : LO;
      const frac = Math.max(0, (lg - LO) / (HI - LO));
      ctx.fillStyle = C.fg; ctx.font = "13px system-ui";
      ctx.fillText(row[0], 12, y + 14);
      ctx.fillStyle = "rgba(216,244,238,0.07)";
      ctx.beginPath(); ctx.roundRect(BX, y, BW, 18, 5); ctx.fill();
      if (val > 0) {
        ctx.fillStyle = row[2];
        ctx.beginPath(); ctx.roundRect(BX, y, Math.max(3, BW * frac), 18, 5); ctx.fill();
      }
      ctx.fillStyle = val > 0 ? row[2] : C.dim; ctx.font = "11px system-ui";
      ctx.fillText(val > 0 ? val.toExponential(1) + " N" : (row[0] === "elektromagnetická" && neutral ? "vyrušena" : "mimo dosah"),
                   BX + BW + 8, y + 13);
    });

    out.innerHTML = "Na <b>" + (r < 1e-12 ? (r * 1e15).toFixed(2) + " fm" : (r * 1e9).toExponential(1) + " nm") + "</b>: " +
      (r > 3e-15
        ? (neutral
          ? "jaderné síly jsou dávno mimo dosah a náboje se v neutrální hmotě vyruší — <b>zbývá jen gravitace</b>. Proto ve velkém měřítku vládne nejslabší ze čtyř sil."
          : "jaderné síly už nepůsobí, zůstávají EM a gravitace. EM je zde <b>" + (em / gr).toExponential(1) + "×</b> silnější — dokud se náboje nevyruší.")
        : "všechny čtyři interakce jsou ve hře; silná drtivě převažuje a drží jádro pohromadě.");
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   13) Zakřivení časoprostoru  (lekce 03)
================================================================== */
ANIMS.zakriveni = root => {
  const cv = canvasIn(root, 300);
  const out = readout(root);
  const s = slider(root, {
    label: "hmotnost tělesa", min: 0, max: 7, step: 0.05, value: 2.4,
    format: v => { const M = 10 ** v; return M < 1000 ? M.toFixed(0) + " M☉" : (M / 1e6).toFixed(2) + " mil. M☉"; }
  });

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const M = 10 ** s.value;
    const k = 900 * Math.log10(M + 1) / 7;          // hloubka „jámy“
    const cx = w / 2, cy = h / 2 + 10;

    ctx.clearRect(0, 0, w, h);

    const warp = (x, y) => {                        // radiální posun k centru
      const dx = x - cx, dy = (y - cy) * 2.1, d = Math.hypot(dx, dy) + 12;
      const p = Math.min(0.85, k / (d * 1.6));
      return [x - dx * p, y - (y - cy) * p * 0.5 + p * 26];
    };

    ctx.strokeStyle = "rgba(0,255,200,0.22)"; ctx.lineWidth = 1;
    for (let gy = -6; gy <= 6; gy++) {
      ctx.beginPath();
      for (let gx = -12; gx <= 12; gx += 0.25) {
        const [X, Y] = warp(cx + gx * w / 24, cy + gy * 22);
        gx === -12 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }
    for (let gx = -12; gx <= 12; gx++) {
      ctx.beginPath();
      for (let gy = -6; gy <= 6; gy += 0.25) {
        const [X, Y] = warp(cx + gx * w / 24, cy + gy * 22);
        gy === -6 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.stroke();
    }

    // těleso
    const rs = 2 * 6.674e-11 * M * 1.989e30 / 9e16;  // Schwarzschildův poloměr v metrech
    const drawR = Math.max(6, Math.min(34, 5 + Math.log10(M + 1) * 6));
    ctx.fillStyle = "rgba(255,200,120,0.95)";
    ctx.beginPath(); ctx.arc(cx, cy, drawR, 0, 7); ctx.fill();

    // obíhající těleso
    const ang = t * 0.7, orb = 108;
    ctx.strokeStyle = "rgba(216,244,238,0.2)"; ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.ellipse(cx, cy + 8, orb, orb * 0.42, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.fg;
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * orb, cy + 8 + Math.sin(ang) * orb * 0.42, 4, 0, 7); ctx.fill();

    // paprsek světla, ohyb α = 4GM/(c²b)
    const b = 62;
    const alpha = Math.min(1.6, k / 260);        // schematicky zvětšený ohyb
    ctx.strokeStyle = C.warn; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const dx = (x - cx) / 40;
      const bend = alpha * 40 * (Math.tanh(dx) + 1) / 2;
      const y = cy - b - bend * 22;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = C.warn; ctx.font = "11px system-ui";
    ctx.fillText("paprsek světla (ohyb zvětšen)", 10, cy - b - 12);

    out.innerHTML = "Hmota zakřivuje časoprostor; obíhající těleso <b>neletí po zakřivené dráze silou</b>, ale rovně po zakřivené geometrii. " +
      "Světlo se ohýbá o α = 4GM/c²b → gravitační čočky. Schwarzschildův poloměr téhle hmotnosti: <b>" +
      (rs > 1e3 ? (rs / 1e3).toFixed(0) + " km" : rs.toFixed(2) + " m") + "</b> — kdyby se do něj těleso vešlo, je z něj černá díra.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   14) Slapové síly ~ 1/r³  (lekce 03)
================================================================== */
ANIMS.slapy = root => {
  const cv = canvasIn(root, 250);
  const out = readout(root);
  const s = slider(root, {
    label: "vzdálenost od tělesa", min: 0.6, max: 3, step: 0.01, value: 2,
    format: v => (10 ** v).toFixed(0) + " tis. km"
  });

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const d = 10 ** s.value;                       // tis. km
    const cy = h / 2;
    const px = 130 + (Math.log10(d) - 0.6) / 2.4 * (w - 250);

    ctx.clearRect(0, 0, w, h);

    // hmotné těleso vlevo
    const g = ctx.createRadialGradient(30, cy, 0, 30, cy, 60);
    g.addColorStop(0, "rgba(0,255,200,0.5)"); g.addColorStop(1, "rgba(0,255,200,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(30, cy, 60, 0, 7); ctx.fill();
    ctx.fillStyle = "#0b1a1a"; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(30, cy, 26, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("hmotné těleso", 6, cy + 48);

    // protažení ~ 1/r³
    const stretch = Math.min(62, 2200 / d ** 1.5);
    const squeeze = Math.min(0.8, stretch / 90);

    const rx = 20 + stretch * 0.62, ry = Math.max(7, 20 - stretch * 0.2);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, cy, rx, ry, 0, 0, 7); ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = "rgba(216,244,238,0.85)";
      ctx.beginPath(); ctx.arc(px + i * (rx - 6), cy, 4, 0, 7); ctx.fill();
    }

    // šipky: gravitace na bližší a vzdálenější okraj
    const arr = (x, y, len) => {
      ctx.strokeStyle = C.warn; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - len, y);
      ctx.lineTo(x - len + 7, y - 4); ctx.lineTo(x - len + 7, y + 4);
      ctx.closePath(); ctx.fillStyle = C.warn; ctx.fill();
    };
    const R0 = 5;                                  // poloměr tělesa v tis. km
    const ratio = ((d - R0) / (d + R0)) ** -2;     // o kolik je bližší okraj tažen silněji
    arr(px - rx - 4, cy - ry - 14, 74);
    arr(px + rx + 4, cy + ry + 14, 74 / ratio);
    ctx.fillStyle = C.warn; ctx.font = "11px system-ui";
    ctx.fillText("bližší okraj: silněji", px - rx - 4, cy - ry - 22);
    ctx.fillText("vzdálenější: slaběji", px + rx + 4, cy + ry + 30);

    out.innerHTML = "Gravitace klesá jako 1/r², ale její <b>rozdíl napříč tělesem</b> jako <b>1/r³</b> — proto slapy rostou při přiblížení mnohem rychleji. " +
      (d < 20 ? "Takhle blízko těleso přestává držet pohromadě: Rocheova mez, rozpad komet, u černé díry protažení do nudle."
              : "Na téhle vzdálenosti jde jen o mírné protažení — na Zemi se projeví jako příliv a odliv.") +
      " Bližší okraj je tažen <b>" + ratio.toFixed(2) + "×</b> silněji než vzdálenější.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   15) Rotační křivka galaxie  (lekce 04)
================================================================== */
ANIMS.rotacnikrivka = root => {
  const cv = canvasIn(root, 300);
  const out = readout(root);
  const s = slider(root, {
    label: "temné halo", min: 0, max: 100, step: 1, value: 0,
    format: v => v + " % očekávané hmoty"
  });

  const RD = 0.3;                                   // poloměr svítícího disku
  const mVis = r => Math.min(1, (r / RD) ** 3);     // hmota uvnitř r, jen svítící
  const mHalo = r => 2.2 * r;                       // M(r) ~ r
  const vis = r => Math.sqrt(mVis(r) / Math.max(r, 0.05));
  const tot = (r, f) => Math.sqrt((mVis(r) + f * mHalo(r)) / Math.max(r, 0.05));
  const VMAX = 3.1;

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const f = s.value / 100;
    const gw = Math.min(w * 0.42, 220), gx = gw / 2 + 10, gy = h / 2;
    const R = gw / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // pohled na galaxii
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
    gr.addColorStop(0, "rgba(255,240,200,0.55)");
    gr.addColorStop(0.35, "rgba(255,200,120,0.14)");
    gr.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, R, 0, 7); ctx.fill();
    if (f > 0.02) {
      ctx.strokeStyle = "rgba(124,196,255," + (0.15 + 0.35 * f) + ")"; ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.arc(gx, gy, R * (0.75 + i * 0.16), 0, 7); ctx.stroke();
      }
      ctx.fillStyle = "rgba(124,196,255,0.55)"; ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText("temné halo", gx, gy - R * 1.18); ctx.textAlign = "left";
    }

    [0.25, 0.5, 0.75, 1].forEach((rr, i) => {                 // obíhající hvězdy
      const v = tot(rr, f);
      const ang = t * v * 0.5 / rr + i;
      const rad = rr * R * 0.9;
      ctx.strokeStyle = "rgba(216,244,238,0.12)";
      ctx.beginPath(); ctx.arc(gx, gy, rad, 0, 7); ctx.stroke();
      ctx.fillStyle = C.fg;
      ctx.beginPath(); ctx.arc(gx + Math.cos(ang) * rad, gy + Math.sin(ang) * rad, 3.5, 0, 7); ctx.fill();
    });

    // graf v(r)
    const px = gw + 40, pw = w - px - 20, py = 30, ph = h - 80;
    ctx.strokeStyle = "rgba(0,255,200,0.25)";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    ctx.fillStyle = C.dim; ctx.font = "11px system-ui";
    ctx.fillText("rychlost", px - 2, py - 10);
    ctx.fillText("vzdálenost od středu →", px + 4, py + ph + 18);

    const curve = (fn, col, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const rr = 0.04 + i / 100 * 1.05;
        const v = fn(rr);
        const X = px + (rr / 1.1) * pw, Y = py + ph - Math.min(1, v / VMAX) * ph;
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    curve(vis, "rgba(255,143,143,0.75)", [5, 4]);
    curve(r => tot(r, f), C.accent);

    for (let i = 1; i <= 8; i++) {                             // „naměřené“ body
      const rr = i / 8 * 1.05;
      const X = px + (rr / 1.1) * pw, Y = py + ph - Math.min(1, tot(rr, 1) / VMAX) * ph;
      ctx.strokeStyle = "rgba(216,244,238,0.8)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(X, Y, 3.4, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,143,143,0.9)"; ctx.font = "11px system-ui";
    ctx.fillText("očekávání ze svítící hmoty", px + 6, py + ph - 14);
    ctx.fillStyle = C.fg;
    ctx.fillText("kroužky = měření", px + 6, py + 12);

    out.innerHTML = f < 0.1
      ? "Se samotnou svítící hmotou má rychlost od jistého poloměru klesat jako 1/√r. <b>Měření to nedělá</b> — kroužky leží vysoko nad čárkovanou křivkou."
      : "S halem, jehož hmotnost roste jako M(r) ~ r, křivka <b>zplošťuje</b> a sedne na měření. Okrajové hvězdy pak obíhají stejně rychle jako vnitřní.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   16) Kupa Kulka — oddělení plynu od hmoty  (lekce 04)
================================================================== */
ANIMS.kulka = root => {
  const cv = canvasIn(root, 280);
  const out = readout(root);
  const s = slider(root, {
    label: "průběh srážky", min: 0, max: 1, step: 0.005, value: 0.15,
    format: v => v < 0.35 ? "před srážkou" : v < 0.6 ? "průlet" : "po srážce"
  });
  let playing = true;
  buttons(root, [{ label: "⏯ přehrát srážku" }], () => { playing = !playing; });

  const stop = loop(() => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    if (playing) { const v = s.value + 0.0025; s.value = v > 1 ? 0 : v; }
    const p = s.value, cy = h / 2 - 10;
    const sep = (1 - Math.cos(Math.PI * Math.min(1, p * 1.15))) / 2;   // 0 → 1
    const dmX = [w / 2 - (0.5 - sep) * w * 0.62, w / 2 + (0.5 - sep) * w * 0.62];
    const gasDrag = Math.min(1, p * 1.5);
    const gasX = dmX.map((x, i) => x + (w / 2 - x) * Math.min(0.92, gasDrag * 0.95));

    ctx.clearRect(0, 0, w, h);

    // horký plyn (rentgen)
    gasX.forEach(x => {
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, 62);
      g.addColorStop(0, "rgba(255,150,80,0.55)");
      g.addColorStop(1, "rgba(255,150,80,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, 62, 0, 7); ctx.fill();
    });

    // temná hmota + galaxie
    dmX.forEach((x, k) => {
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, 70);
      g.addColorStop(0, "rgba(124,196,255,0.35)");
      g.addColorStop(1, "rgba(124,196,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, 70, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(124,196,255,0.6)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, cy, 52, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.1 + k, rr = 12 + (i % 4) * 11;
        ctx.fillStyle = "rgba(216,244,238,0.9)";
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, 2.4, 0, 7); ctx.fill();
      }
    });

    ctx.font = "12px system-ui";
    ctx.fillStyle = "rgba(255,150,80,0.95)"; ctx.fillText("● horký plyn (rentgen) — většina běžné hmoty", 14, h - 34);
    ctx.fillStyle = "rgba(124,196,255,0.95)"; ctx.fillText("○ hmota změřená čočkováním + galaxie", 14, h - 16);

    out.innerHTML = p < 0.35
      ? "Dvě kupy se blíží. Plyn i hmota jsou zatím na stejném místě."
      : p < 0.6
        ? "Při průletu se <b>plyn srazí sám se sebou</b> a zbrzdí, kdežto galaxie a temná hmota prolétnou bez interakce."
        : "Po srážce leží <b>gravitační centra jinde než většina běžné hmoty</b>. Upravená gravitace by musela působit tam, kde jsou baryony — tady nepůsobí.";
  });

  return () => { stop(); cv.stop(); };
};

/* ==================================================================
   17) Gravitační čočka  (lekce 04)
================================================================== */
ANIMS.cocka = root => {
  const cv = canvasIn(root, 280);
  const out = readout(root);
  const sm = slider(root, {
    label: "hmotnost čočky", min: 0, max: 1.6, step: 0.01, value: 0.9,
    format: v => (10 ** v).toFixed(1) + " × 10¹⁴ M☉"
  });
  const sb = slider(root, {
    label: "posun zdroje", min: 0, max: 95, step: 0.5, value: 34,
    format: v => v.toFixed(0) + " px"
  });

  const stop = loop(t => {
    const { ctx } = cv, w = cv.size.w, h = cv.size.h;
    const M = 10 ** sm.value;
    const thE = Math.min(104, 24 * Math.sqrt(M));  // Einsteinův poloměr ~ √M
    const b = sb.value;
    const cx = w / 2, cy = h / 2;

    // řešení čočkové rovnice pro bodovou čočku
    const tp = 0.5 * (b + Math.sqrt(b * b + 4 * thE * thE));
    const tm = 0.5 * (b - Math.sqrt(b * b + 4 * thE * thE));

    ctx.clearRect(0, 0, w, h);

    // Einsteinův prstenec
    ctx.strokeStyle = "rgba(216,244,238,0.15)"; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, thE, 0, 7); ctx.stroke(); ctx.setLineDash([]);

    // čočka (kupa galaxií)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46);
    g.addColorStop(0, "rgba(124,196,255,0.4)"); g.addColorStop(1, "rgba(124,196,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 46, 0, 7); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, rr = 8 + (i % 3) * 10;
      ctx.fillStyle = "rgba(216,244,238,0.75)";
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.2, 0, 7); ctx.fill();
    }

    // skutečná poloha zdroje
    ctx.strokeStyle = "rgba(255,180,84,0.5)"; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(cx + b, cy, 7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,180,84,0.9)";
    ctx.beginPath(); ctx.arc(cx + b, cy, 2.5, 0, 7); ctx.fill();

    // obrazy: oblouky kolem čočky
    const arc = (rad, weight) => {
      if (Math.abs(rad) < 1) return;
      const span = Math.min(2.2, 0.35 + thE / (Math.abs(b) + 6) * 0.5);
      const a0 = rad > 0 ? -span / 2 : Math.PI - span / 2;
      ctx.strokeStyle = "rgba(255,200,120," + Math.min(0.95, 0.35 + weight) + ")";
      ctx.lineWidth = 4 + weight * 8;
      ctx.beginPath(); ctx.arc(cx, cy, Math.abs(rad), a0, a0 + span); ctx.stroke();
    };
    const mu = th => Math.abs(th * th / (th * th - thE * thE * (thE ? 1 : 0) + 1e-6));
    arc(tp, Math.min(0.6, thE / (b + 14)));
    arc(tm, Math.min(0.6, thE / (b + 14)) * 0.7);

    ctx.font = "11px system-ui";
    ctx.fillStyle = "rgba(255,200,120,0.95)";
    ctx.fillText("oranžové oblouky = obrazy jedné galaxie za kupou", 12, h - 30);
    ctx.fillStyle = "rgba(255,180,84,0.75)";
    ctx.fillText("tečka = kde by galaxie byla bez čočky", 12, h - 16);
    ctx.fillStyle = C.dim;
    ctx.fillText("čárkovaně = Einsteinův prstenec", 300, h - 16);

    const ring = b < 4;
    out.innerHTML = ring
      ? "Zdroj, čočka a pozorovatel v jedné přímce → obraz se roztáhne do <b>Einsteinova prstence</b>."
      : "Hmota v popředí vytvoří <b>dva protažené obrazy</b> jedné galaxie. Z jejich polohy se spočítá hmotnost čočky — bez jakéhokoli předpokladu o pohybu, jen z geometrie. Vychází ~5× víc, než kolik svítí.";
  });

  return () => { stop(); cv.stop(); };
};
