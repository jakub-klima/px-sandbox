# Měřítka — od Planckovy délky k obzoru

> Mezi nejmenší smysluplnou délkou (10⁻³⁵ m) a průměrem pozorovatelného vesmíru (10²⁷ m) je 62 řádů. Změřit se z nich dá jen prostředek; oba konce jsou dopočítané z modelu.

## Žebřík řádů

| Řád [m] | Délka | Co tam je |
|---|---|---|
| 10⁻³⁵ | 1,6·10⁻³⁵ m | **Planckova délka** — mez, kde pojem vzdálenosti nejspíš přestává dávat smysl |
| 10⁻¹⁹ | ~10⁻¹⁹ m | nejmenší přímo prozkoumaná vzdálenost (LHC) |
| 10⁻¹⁸ | < 10⁻¹⁸ m | elektron a kvark — jen **horní mez**, chovají se jako body; dosah slabé interakce |
| 10⁻¹⁵ | 0,84 fm | proton (fm = femtometr = 10⁻¹⁵ m) |
| 10⁻¹⁴ | ~1,5·10⁻¹⁴ m | jádro uranu |
| 10⁻¹⁰ | 1·10⁻¹⁰ m | atom (vodík: Bohrův poloměr 0,53·10⁻¹⁰ m) |
| 10⁻⁹ | 2 nm | šířka dvoušroubovice DNA |
| 10⁻⁷ | 5·10⁻⁷ m | vlnová délka viditelného světla; velikost viru |
| 10⁻⁶ | 1–5 µm | bakterie |
| 10⁻⁵ | ~10 µm | lidská buňka |
| 10⁻⁴ | ~70 µm | lidský vlas |
| 10⁰ | 1,7 m | člověk |
| 10⁴ | 8,8 km | Everest |
| 10⁷ | 1,27·10⁷ m | průměr Země |
| 10⁸ | 3,84·10⁸ m | Země–Měsíc |
| 10⁹ | 1,39·10⁹ m | průměr Slunce |
| 10¹¹ | 1,496·10¹¹ m | **AU** — Země–Slunce |
| 10¹² | 4,5·10¹² m | dráha Neptunu (30 AU) |
| 10¹³ | 1,8·10¹³ m | heliopauza (~120 AU), hranice slunečního větru |
| 10¹⁵ | 9,46·10¹⁵ m | **světelný rok**; parsek = 3,09·10¹⁶ m |
| 10¹⁶ | 4,0·10¹⁶ m | Proxima Centauri (4,25 ly = 1,30 pc); vnější Oortův oblak |
| 10²¹ | 9,5·10²⁰ m | průměr Mléčné dráhy (~100 000 ly) |
| 10²² | 2,4·10²² m | Andromeda (2,5 mil. ly) |
| 10²³ | ~10²³ m | Místní skupina (~10 mil. ly) |
| 10²⁴ | 5·10²⁴ m | Laniakea, naše nadkupa (~520 mil. ly) |
| 10²⁵ | ~10²⁵ m | **mez homogenity** (~300 mil. ly) — nad ní už vesmír vypadá všude stejně |
| 10²⁷ | 8,8·10²⁶ m | průměr pozorovatelného vesmíru (poloměr 46 mld. ly) |

Člověk stojí zhruba uprostřed: **35 řádů dolů** k Planckově délce, **27 řádů nahoru** k obzoru.

Nad ~10²⁵ m už žádné větší struktury nejsou — kosmická síť je největší, co existuje, a dál je vesmír jen statisticky rovnoměrná výplň (kosmologický princip, [01-zaklady.md](01-zaklady.md)). *Sporné:* občas ohlašované „obří stěny" o rozměru miliard světelných let (Hercules–Corona Borealis) většina kosmologů považuje za statistický artefakt.

```anim:meritka```

## Tři principy, na kterých stojí všechno měření délky

1. **Dolů: rozliší se jen to, co je větší než vlna sondy.** λ = h/p, takže menší detail = vyšší energie. Pohled do malých rozměrů je přímo úměrný výkonu urychlovače.
2. **Uprostřed: délka je čas.** Metr je od roku 1983 definován rychlostí světla (c = 299 792 458 m/s *přesně*). Neměří se tedy metr proti etalonu — měří se, jak dlouho tam světlo letí. A sekunda je z atomových hodin.
3. **Nahoru: nic nedoletí zpátky, takže se měří úhly a jasnosti.** Buď známá základna + úhel (paralaxa), nebo známá svítivost + jasnost (svíčka), nebo známá délka + úhlová velikost (standardní pravítko).

## Jak se měří — pásmo po pásmu

### 10⁻³⁵ – 10⁻¹⁹ m: nijak

Planckova délka `ℓ_P = √(ħG/c³) = 1,6·10⁻³⁵ m` **není naměřená hodnota**. Vypadne z rozměrové analýzy tří konstant (ħ, G, c) a je to škála, kde by kvantové efekty gravitace musely být silné — tedy tam, kde obecná relativita a kvantová mechanika obě přestanou platit ([03-sily.md](03-sily.md)).

Prozkoumat ji by znamenalo dodat Planckovu energii 1,22·10¹⁹ GeV. LHC dává 1,4·10⁴ GeV, tedy **10¹⁵× méně**. Není to otázka lepšího přístroje: urychlovač schopný Planckovy energie by v současné technologii měl velikost galaxie.

### 10⁻¹⁹ – 10⁻¹⁴ m: srážky částic

Rozměr se nevidí, odvozuje se z **rozptylu**. Klasika je Rutherford (1911): alfa částice na zlaté fólii se občas odrazí zpět → jádro je maličké a tvrdé. Moderní verze je totéž při vyšší energii — z rozdělení úhlů rozptýlených částic se dopočítá **formfaktor** a z něj rozměr terče.

- Elektronový rozptyl (Hofstadter, 1950s) změřil rozložení náboje v protonu → 0,84 fm.
- LHC dohlédne asi na 10⁻¹⁹ m; do téhle vzdálenosti nikdo u kvarku ani elektronu nenašel vnitřní strukturu. Proto se udávají jen horní meze.

### 10⁻¹⁴ – 10⁻⁹ m: difrakce

Sonda musí mít vlnovou délku srovnatelnou s rozměrem:

| Sonda | λ | Na co |
|---|---|---|
| Rentgen | ~0,1 nm | rozestupy atomů v krystalu (rentgenová krystalografie) |
| Elektrony | 0,001–0,01 nm | elektronová difrakce, TEM |
| Neutrony | ~0,1 nm | polohy lehkých atomů, magnetické struktury |

Z **úhlů difrakčních maxim** (Braggova podmínka `2d·sinθ = nλ`) se počítá rozestup `d`. Takhle se zjistila struktura DNA i většiny bílkovin — obrázek to není, je to rekonstrukce z úhlů.

### 10⁻⁹ – 10⁻⁴ m: mikroskopy

- **Optický mikroskop** končí na difrakční mezi ~200 nm (θ ≈ 1,22 λ/D, [05-zrcadla-vlnove-delky.md](05-zrcadla-vlnove-delky.md)).
- **Elektronový mikroskop** — krátká de Broglieho vlna, korigovaný STEM rozliší ~0,05 nm, tedy jednotlivé atomy v mřížce.
- **STM/AFM** — hrot povrch doslova ohmatá; svislé rozlišení pod 0,01 nm. Jediná metoda, která atom „vidí" bez difrakce.

### 10⁻⁴ – 10⁷ m: přímé měření, interferometrie, triangulace

Tady se skutečně měří délka, a nejpřesněji přes čas nebo počet vlnových délek.

- **Interferometr** počítá interferenční proužky; posun o λ/2 = jeden proužek. LIGO takhle měří změnu délky 4km ramene o **10⁻¹⁸ m** — to je tisícina průměru protonu (měří se posun, ne rozměr; jde o statistiku miliard fotonů).
- **Geodézie** je stará triangulace: základna + úhly. Eratosthenés (~240 př. n. l.) změřil obvod Země ze stínů ve dvou městech s chybou ~1 %.
- **GNSS/GPS** = čas letu signálu z družic; **VLBI** měří vzdálenost antén na Zemi s přesností milimetrů.
- Zajímavá mezera: **gravitační zákon** je přímo ověřen jen do ~50 µm (torzní váhy). Pod tím se `1/r²` prostě předpokládá.

### 10⁷ – 10¹³ m: radar a laserové echo

Vyšli signál, změř čas návratu, vynásob `c/2`.

- **Radarová ozvěna od Venuše** (1961) poprvé přesně určila AU. Dnes je AU *definována* jako přesně 149 597 870 700 m — z měřené veličiny se stala jednotka.
- **Lunar Laser Ranging** — laserové pulzy na koutové odražeče, které tam nechala Apolla a Lunochody. Přesnost jednotky milimetrů; odhalila, že se Měsíc vzdaluje 3,8 cm/rok.
- **Sondy** — dvoucestné rádiové spojení dává vzdálenost i rychlost (Doppler). Takhle se ví, kde je Voyager (~2,5·10¹³ m).

Radar končí, protože ozvěna slábne jako `1/r⁴` (tam i zpět). Nejvzdálenější radarová ozvěna je z asteroidů, ne z hvězd.

### 10¹³ – 10²⁰ m: trigonometrická paralaxa

Jediná **přímo geometrická** metoda mimo sluneční soustavu. Za půl roku se Země posune o 2 AU; blízká hvězda se proti pozadí posune o dvojnásobek paralaxy `p`.

Definice parseku: **hvězda s paralaxou 1″ je vzdálená 1 pc = 3,26 ly.** Pak už jen `d [pc] = 1 / p [″]`.

| Přístroj | Přesnost | Dosah na 10 % chyby |
|---|---|---|
| Bessel 1838 (61 Cygni, první změřená paralaxa 0,31″) | ~20 mas | ~50 pc |
| Ze země ve 20. století (limituje atmosféra) | ~10 mas | ~100 pc |
| Hipparcos (1989) | ~1 mas | ~1 000 pc, 118 000 hvězd |
| **Gaia** (2013) | ~25 µas | ~4 000 pc, 1,5 mld. hvězd |

Žádná hvězda nemá paralaxu ani 1″ — nejbližší, Proxima, má 0,769″. Proto se paralaxa nedařila změřit dvě století po Koperníkovi a byla to hlavní námitka proti heliocentrismu.

```anim:paralaxa```

### Nad 10²⁰ m: kosmický žebřík vzdáleností

Paralaxa dosáhne sotva za polovinu naší Galaxie. Dál se staví **žebřík** (cosmic distance ladder): každá metoda se kalibruje tou předchozí a chyby se násobí.

| Příčka | Princip | Dosah |
|---|---|---|
| Paralaxa | geometrie | ~4 kpc |
| Cefeidy | perioda pulzace → svítivost (Leavittová, 1912) | ~40 Mpc |
| TRGB | vrchol větve červených obrů má pevnou jasnost | ~20 Mpc |
| Tullyho–Fisherův vztah | rychlost rotace galaxie → svítivost | ~200 Mpc |
| **Supernovy Ia** | vždy stejná exploze bílého trpaslíka, M ≈ −19,3 | ~3 000 Mpc (z ≈ 1,5) |
| Rudý posuv + Hubbleův zákon | `v = H₀·d`, H₀ ≈ 70 km/s/Mpc | jakkoli daleko |
| BAO | **standardní pravítko** 147 Mpc otisknuté v CMB | celý pozorovaný objem |
| CMB | úhlová velikost prvního akustického vrcholu (~1°) | 13,8 mld. let zpět |

Dvě poznámky, které se často zamlčují:

- **Rudý posuv sám o sobě není vzdálenost.** Dává `z`; na metry se převede jen skrze kosmologický model (ΛCDM) a hodnotu H₀. Proto se u velmi vzdálených objektů uvádí spíš `z` než kilometry.
- **Hubbleovo napětí (Hubble tension), sporné:** žebřík (cefeidy + SN Ia) dává H₀ = 73,0 ± 1,0, zatímco CMB + model dává 67,4 ± 0,5. Rozdíl je ~5σ a nikdo neví, jestli je to chyba v kalibraci žebříku, nebo chybějící fyzika.

## Kde měření končí

Oba konce žebříku jsou **dopočítané, ne naměřené**:

- Planckova délka je kombinace tří konstant, ne výsledek experimentu.
- Poloměr 46 mld. sv. let vychází z integrace rozpínání podle ΛCDM. Přímo změřené je jen stáří světla (13,8 mld. let) a rudý posuv CMB (z ≈ 1100).

Přímé, geometrické měření pokrývá překvapivě úzký pás: zhruba **10⁻¹⁹ až 10²⁰ m**, tedy 39 řádů z 62. Zbytek stojí na fyzikálních modelech — a je proto stejně pevný jako ony.

## Slovníček

| Termín | Anglicky | Význam |
|---|---|---|
| Planckova délka | Planck length | √(ħG/c³) = 1,6·10⁻³⁵ m |
| řád velikosti | order of magnitude | násobek deseti |
| formfaktor | form factor | rozměr terče odvozený z úhlů rozptylu |
| Braggova podmínka | Bragg's law | `2d·sinθ = nλ`, základ difrakčního měření |
| paralaxa | parallax | zdánlivý posun blízkého objektu při posunu pozorovatele |
| parsek | parsec | vzdálenost s paralaxou 1″ = 3,26 ly |
| mas / µas | milli-/microarcsecond | 10⁻³ / 10⁻⁶ úhlové vteřiny |
| standardní svíčka | standard candle | objekt se známou svítivostí |
| standardní pravítko | standard ruler | struktura se známou skutečnou velikostí (BAO) |
| žebřík vzdáleností | cosmic distance ladder | řetěz metod kalibrovaných jedna druhou |
| mez homogenity | homogeneity scale | ~300 mil. ly, nad níž je vesmír rovnoměrný |

## Zapamatuj si

- Rozsah je 62 řádů (10⁻³⁵ až 10²⁷ m) a člověk je zhruba uprostřed.
- Dolů rozhoduje vlnová délka sondy (λ = h/p) → menší detail se platí energií; Planckova délka je 10¹⁵× za dosahem LHC.
- Uprostřed je metr definován rychlostí světla, takže měření délky = měření času.
- Nahoru se měří úhly a jasnosti: paralaxa (geometrie, do ~4 kpc), pak svíčky, pak rudý posuv + model.
- Žebřík vzdáleností se kalibruje příčku po příčce — proto se chyby sčítají a proto existuje Hubbleovo napětí.
- Oba konce škály nejsou naměřené, ale dopočítané z modelu.
