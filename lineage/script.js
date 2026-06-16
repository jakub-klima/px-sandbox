// Drobné oživení stránky — fiktivní počítadlo hráčů online.
// (Privátní server nemá veřejné API, tak jen simulujeme živé číslo.)
(function () {
  const el = document.getElementById("player-count");
  if (!el) return;

  // Základní hodnota podle denní doby — večer bývá víc lidí.
  function baseByHour() {
    const h = new Date().getHours();
    if (h >= 18 && h <= 23) return 120; // prime time
    if (h >= 9 && h < 18) return 70;
    return 35; // noc / brzké ráno
  }

  let current = baseByHour() + Math.floor(Math.random() * 20);

  function render() {
    el.textContent = current;
  }

  // Lehké kolísání, ať to vypadá živě.
  function tick() {
    const drift = Math.floor(Math.random() * 7) - 3; // -3..+3
    current = Math.max(8, current + drift);
    render();
  }

  render();
  setInterval(tick, 4000);
})();
