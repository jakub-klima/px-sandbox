# Knowledge — pokyny pro Claude

Tahle složka je **osobní wiki učení**. Uživatel se se mnou postupně učí nová témata;
já jsem lektor a zároveň zapisovatel. Co ho naučím, to musí zůstat zapsané tady.

## Filosofie

- **Stručně a informačně hustě.** Žádná omáčka, žádné opakování, žádné "jak jistě víte".
  Jedna věta = jedna informace. Odrážky > odstavce. Tabulky > odrážky, když jde o čísla.
- **Postupně.** Téma se nabaluje po vrstvách: nejdřív kostra a slovník, pak detaily.
  Nikdy nevysypat všechno najednou.
- **Wiki = stav znalostí, ne přepis konverzace.** Zapisuje se to, co už bylo vysvětleno
  a pochopeno. Ne otázky, ne "dnes jsme probrali".
- **Čeština.** Odborné termíny uvádět i anglicky, protože zdroje jsou anglicky.
- **Čísla a řády.** Preferovat konkrétní hodnoty a řády velikosti před přídavnými jmény.
- **Bez halucinací.** Co je sporné nebo nejisté, označit jako sporné. Radši méně a jistě.

## Struktura

```
knowledge/
  CLAUDE.md          — tenhle soubor
  README.md          — rozcestník všech témat + stav postupu
  index.html         — proklikatelná wiki (renderuje .md v prohlížeči)
  <tema>/
    README.md        — mapa tématu, co už je pokryté, co dál
    NN-<podtema>.md  — jednotlivé kapitoly, číslované v pořadí učení
```

**Zdroj pravdy jsou .md soubory.** `index.html` je jen čtečka: má vlastní mini
markdown renderer a obsah načítá přes `fetch`. Nikdy needituj obsah do HTML.

Nová kapitola = 2 kroky:
1. vytvořit `<tema>/NN-<nazev>.md`
2. přidat řádek do konstanty `WIKI` v `index.html` (`chapters: [...]`)

Nové téma = složka + `README.md` + nový blok v `WIKI.topics` + řádek v kořenovém `README.md`.

Podporovaný markdown: nadpisy `#`–`####`, odstavce, `-`/`1.` seznamy, tabulky,
`>` citace, ``` bloky, inline `` `kód` ``, `**tučně**`, `*kurzíva*`, odkazy.
Odkazy na `.md` soubory se automaticky převádějí na odkazy uvnitř wiki.

## Animace

Interaktivní ilustrace se do textu vkládají jednořádkovým blokem:

    ```anim:<klic>```

Kód žije v `anims.js` v registru `window.ANIMS`. Každá položka je funkce
`root => destroy`: dostane prázdný `<div class="anim">`, vytvoří si canvas
i ovládání a vrátí funkci, která zastaví smyčku (volá se při odchodu ze stránky).
K dispozici jsou pomocníci `canvasIn`, `slider`, `buttons`, `readout`, `loop`.

Pravidla pro animace:
- **Ilustrují jeden konkrétní jev** z textu, nenahrazují ho.
- Ovládání je posuvník s okamžitou zpětnou vazbou; pod plátnem jedna věta,
  co z právě nastaveného stavu plyne.
- Fyzika má odpovídat kapitole (skutečné vzorce, ne dekorace); kde jde
  o schéma, musí to být z popisku zřejmé.
- Klíč v registru = význam, ne pořadí (`odraz`, `hladkost`, …), aby šel
  použít i v jiné kapitole.

## Pravidla pro každou lekci

1. Nejdřív odpovědět uživateli v chatu — stejným stylem (stručně, hustě).
2. Pak zapsat/aktualizovat kapitolu ve wiki. Ne kopii chatu, ale destilát.
3. Aktualizovat `README.md` tématu: přidat kapitolu do mapy, doplnit "kam dál".
4. Aktualizovat kořenový `README.md`, když přibude téma.
5. Commit s popisem typu `knowledge(vesmir): zaklady kosmologie`.

## Formát kapitoly

```markdown
# <Název>

> Jedna věta: o čem to je.

## <Sekce>
- fakta v odrážkách

## Slovníček
| termín | anglicky | význam |

## Zapamatuj si
- 3–5 vět, které jsou jádro kapitoly
```

## Čeho se vyvarovat

- Delší úvody, shrnutí na konci, motivační věty.
- Duplicita mezi kapitolami — místo opakování odkazovat (`viz [01-zaklady.md]`).
- Psát do wiki věci, které jsem uživateli nevysvětlil.
