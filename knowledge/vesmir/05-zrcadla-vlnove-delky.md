# Zrcadla, vlnové délky a teleskopy

> Zrcadlo odráží světlo jen tehdy, když má volné elektrony, které stihnou kmitat v rytmu vlny, a když je jeho povrch hladší než ~λ/20. Obojí přestává platit u rentgenu — a u gama záření zrcadlo neexistuje vůbec.

## Jak zrcadlo vlastně funguje

Světlo je elektromagnetická vlna ([03-sily.md](03-sily.md)). Když dopadne na kov:

1. Její elektrické pole rozkmitá **volné elektrony** v povrchové vrstvě (u kovu jsou desítky nanometrů).
2. Kmitající elektrony samy vyzařují novou vlnu.
3. Do materiálu se nové vlny navzájem vyruší, ven se sečtou → vzniká odražená vlna se stejnou fází napříč povrchem.

Odraz tedy není "odskok kuličky", ale **koherentní znovuvyzáření**. Z toho plynou obě zásadní omezení.

### Omezení 1: plazmová frekvence

Elektrony mají setrvačnost. Nad určitou frekvencí (**plazmová frekvence**) už kmitání nestíhají a vlna kovem projde místo aby se odrazila. U hliníku leží tahle hranice v ultrafialové oblasti — proto hliník odráží rádio, infračervené i viditelné světlo, ale rentgen jím prolétne.

Proto se povlaky vybírají podle pásma:

| Povlak | Dobře odráží | Kde se používá |
|---|---|---|
| Hliník (+ ochranná vrstva) | UV, viditelné | běžné astronomické dalekohledy |
| Stříbro | viditelné, blízké IR | vysoká odrazivost, ale koroduje |
| **Zlato** | IR (nad ~700 nm), špatně modrou | **JWST**, infračervená optika |

```anim:odraz```

### Omezení 2: hladkost povrchu

Odražená vlna se musí sejít ve fázi. Nerovnost o výšce `h` prodlouží dráze cestu o `2h`, takže platí zhruba: **nepřesnost tvaru musí být pod λ/20**. Čím kratší vlna, tím tvrdší požadavek:

| Pásmo | λ | Tolerance povrchu | Náročnost |
|---|---|---|---|
| Rádio | 1 cm | 0,5 mm | stačí drátěná síť |
| Infračervené | 10 µm | 0,5 µm | běžné broušení |
| Viditelné | 500 nm | 25 nm | ~1/2000 tloušťky vlasu |
| Rentgen | 1 nm | 0,05 nm | menší než atom → **nelze** |

Odtud i rádiové "síto": pokud jsou oka menší než ~λ/20, vlna je nerozezná od plné plochy — proto jsou rádiové paraboly děrované a lehké.

```anim:hladkost```

## Spektrum: co je za viditelným světlem

Viditelné světlo (380–750 nm) je jen úzký proužek. Kratší vlna = vyšší frekvence = **energičtější foton** (`E = hc/λ`).

| Pásmo | Vlnová délka | Energie fotonu | Co v kosmu vyzařuje | Projde atmosférou? |
|---|---|---|---|---|
| Rádiové | > 1 mm | < 1 meV | studený vodík, pulsary, CMB | **ano** (rádiové okno) |
| Mikrovlnné | 1 mm–30 cm | ~meV | reliktní záření | ano |
| Infračervené | 700 nm–1 mm | meV–eV | prach, protohvězdy, vzdálené galaxie | jen částečně |
| **Viditelné** | 380–750 nm | ~2–3 eV | hvězdy jako Slunce | **ano** (optické okno) |
| Ultrafialové | 10–380 nm | 3–100 eV | horké mladé hvězdy | ne (ozon) |
| Rentgenové | 0,01–10 nm | 0,1–100 keV | plyn v kupách (10⁷ K), akreční disky | ne |
| Gama | < 0,01 nm | > 100 keV | supernovy, aktivní jádra, gama záblesky | ne |

Dvě pravidla, proč se vůbec vyplatí koukat mimo viditelné:

- **Wienův zákon**: `λ_max [µm] ≈ 2898 / T [K]`. Těleso o 6000 K září ve viditelném, prach o 30 K v daleké IR, plyn o 10 milionech K v rentgenu. **Každé pásmo ukazuje jinou teplotu, tedy jinou fyziku.**
- **Rudý posuv** ([01-zaklady.md](01-zaklady.md)): světlo nejvzdálenějších galaxií se roztáhne do infračervené oblasti. Proto je JWST infračervený dalekohled — jinak by rané galaxie neviděl.

Vše mimo optické a rádiové okno se musí pozorovat **z vesmíru**. To není rozmar, ale nutnost.

```anim:spektrum```

## Dvě čísla, která rozhodují o konstrukci

- **Sběrná plocha ~ D²** — víc světla, slabší objekty.
- **Rozlišení**: `θ ≈ 1,22 λ/D`. Pro dvojnásobnou vlnovou délku potřebuješ dvojnásobné zrcadlo, abys viděl stejné detaily.

Hubble (2,4 m, 500 nm) rozliší 0,05″. Stejně velká rádiová anténa na vlně 21 cm rozliší jen ~6° — beznadějně rozmazaně. Odtud plyne celá podoba rádiové astronomie.

```anim:rozliseni```

## Teleskopy pásmo po pásmu

### Rádiové — zrcadla mají snadný život

Přesnost i pár milimetrů stačí, takže se dají stavět obří antény (FAST 500 m). Problém je rozlišení, které se řeší **interferometrií**: signály z antén vzdálených stovky až tisíce km se skládají a soustava se chová jako jeden přístroj o průměru rovném vzdálenosti antén. ALMA, VLA, a v extrému **Event Horizon Telescope** — základna velikosti Země, rozlišení ~20 mikrovteřin, dost na obraz stínu černé díry.

### Infračervené — zrcadlo je snadné, teplo těžké

Zrcadlo pro 10 µm se brousí snadněji než optické. Potíž je, že **teplý dalekohled sám září právě v IR** a přezáří pozorovaný objekt. Řešení: chladit. JWST má 6,5m zlacené beryliové zrcadlo z 18 segmentů, sluneční štít velikosti tenisového kurtu a pracuje při ~40 K, 1,5 mil. km od Země.

### Viditelné a UV — klasická zrcadla na hranici

Skleněné zrcadlo s hliníkovým povlakem, u velkých průměrů segmentované. Ze země limituje **atmosférická turbulence** (seeing ~1″), řeší ji **adaptivní optika**: deformovatelné zrcadlo mění tvar stokrát za sekundu podle měřené deformace vlnoplochy. UV navíc vyžaduje speciální povlaky a kvůli ozonu let do vesmíru.

### Rentgenové — konec kolmého odrazu

Rentgenový foton dopadající kolmo se zrcadlem buď pohltí, nebo projde. Funguje jediný trik: **odraz pod velmi malým úhlem** (grazing incidence) — pod kritickým úhlem, typicky pod ~1°, nastane totální vnější odraz, podobně jako když kámen skáče po hladině.

Důsledky konstrukce:
- Zrcadla jsou téměř rovnoběžná se svazkem — dlouhé vnořené válcové a kuželové plochy (**Wolterova optika typu I**, dva odrazy za sebou). Chandra má 4 vnořené páry, XMM-Newton 58.
- Sběrná plocha je proti průměru přístroje mizivá — foton musí trefit tenký prstenec.
- Malý úhel naopak **zmírní požadavek na hladkost**: chyba dráhy je `2h·sinθ`, takže při 1° je tolerance asi 50× volnější. I tak se leští na desetiny nanometru, tedy na úroveň jednotlivých atomů. Zrcadla Chandry jsou nejhladší velké plochy, jaké kdy lidstvo vyrobilo.
- Tvrdší rentgen (nad ~10 keV) vyžaduje **multivrstvá zrcadla** (stovky střídavých vrstev, odraz na Braggově principu). NuSTAR takto dosáhne 79 keV — a to je zhruba strop.

```anim:dopad```

### Gama — žádná zrcadla neexistují

Foton s energií nad ~100 keV se neodrazí ani při sebemenším úhlu; s hmotou interaguje jen fotoefektem, Comptonovým rozptylem nebo tvorbou párů. Nedá se **fokusovat vůbec**. Místo optiky se používá:

- **Kódovaná maska** — vzor z neprůhledných bloků vrhá stín na detektor, směr se dopočítá (INTEGRAL).
- **Párový detektor** — foton se v detektoru promění na elektron a pozitron, jejichž dráhy se vystopují (Fermi-LAT).
- **Čerenkovovy teleskopy** — ze země: gama foton vytvoří v atmosféře spršku částic, které září slabým modrým světlem. Zrcadlo se použije, ale sbírá **to modré světlo**, ne gama záření (H.E.S.S., CTA). Zrcadlo přitom může být hrubé, protože jde jen o sběr fotonů, ne o obraz.

## Kde končí zrcadla — shrnutí

| Vlnová délka | Optika |
|---|---|
| > 1 mm (rádio) | kovová síť, tolerance milimetry |
| 1 mm – 300 nm (IR, viditelné, blízké UV) | klasické zrcadlo s kolmým dopadem |
| 300–10 nm (daleké UV, EUV) | jen speciální multivrstvá zrcadla, nízká odrazivost |
| 10–0,1 nm (měkký a tvrdý rentgen) | **pouze odraz pod malým úhlem** (Wolter), malá sběrná plocha |
| < 0,015 nm (nad ~80 keV, gama) | **žádná optika** — masky, dráhové detektory, Čerenkov |

## Slovníček

| Termín | Anglicky | Význam |
|---|---|---|
| plazmová frekvence | plasma frequency | mez, nad níž kov přestává odrážet |
| tolerance λ/20 | surface accuracy | nejvyšší přípustná nerovnost zrcadla |
| úhlové rozlišení | angular resolution | `θ ≈ 1,22 λ/D` |
| interferometrie | interferometry | spojení antén v jeden virtuální přístroj |
| adaptivní optika | adaptive optics | průběžná korekce atmosférické turbulence |
| odraz pod malým úhlem | grazing incidence | jediný způsob odrazu rentgenu |
| Wolterova optika | Wolter type I | vnořená rentgenová zrcadla |
| kódovaná maska | coded mask | stínový vzor místo optiky v gama pásmu |
| Wienův zákon | Wien's law | teplota určuje vlnovou délku maxima záření |

## Zapamatuj si

- Odraz = rozkmitání volných elektronů a jejich koherentní znovuvyzáření; nad plazmovou frekvencí přestává fungovat.
- Přesnost zrcadla musí být lepší než ~λ/20 — proto je rádiová anténa síto a rentgenové zrcadlo leštěné na atomy.
- Každé pásmo ukazuje jinou teplotu (Wienův zákon); mimo optické a rádiové okno se musí pozorovat z vesmíru.
- Rozlišení `θ ≈ 1,22 λ/D`: dlouhé vlny vyžadují obří rozměry → rádiová interferometrie.
- Rentgen jde odrazit jen pod úhlem ~1° (Wolterova optika); nad ~80 keV nefunguje **žádné** zrcadlo a gama astronomie se obejde bez optiky.
