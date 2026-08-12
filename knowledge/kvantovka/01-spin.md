# Spin elektronu

> Vlastní moment hybnosti elektronu, který nabývá jen dvou hodnot. Nemá klasickou obdobu — a přesto z něj plyne tvar periodické tabulky, existence chemické vazby, tvrdost hmoty i magnet na lednici.

## Co spin je

- **Vlastní moment hybnosti** částice. Pro elektron je spinové číslo `s = ½`, průmět do libovolné osy má jen dvě hodnoty: `+ħ/2` a `−ħ/2` — hovorově "nahoru" a "dolů".
- Spin nese **magnetický moment**: `μ = g · (e/2mₑ) · S`, velikost ≈ 1 **Bohrův magneton** = 9,274·10⁻²⁴ J/T. Elektron je tedy nepatrný magnet.
- `g = 2,002319…` Rozdíl od dvojky předpovídá kvantová elektrodynamika a souhlasí s měřením na ~12 desetinných míst — **nejpřesněji ověřená předpověď ve fyzice**.

### Co spin naopak není

Není to rotace kuličky kolem osy. Elektron je bodový (experimentálně < 10⁻¹⁸ m); aby taková koule měla naměřený moment hybnosti, musel by se její povrch pohybovat mnohonásobně rychleji než světlo. Spin je **vnitřní stupeň volnosti** — vyplyne automaticky z Diracovy rovnice (1928), tedy ze spojení kvantové mechaniky se speciální relativitou.

Další nezvyklost: aby se spinový stav vrátil do původní podoby, musí se otočit o **720°**, ne 360°.

## Jak se to ví: Stern–Gerlach (1922)

Svazek atomů stříbra letí nehomogenním magnetickým polem. Klasicky by měly být magnetické momenty natočené náhodně do všech směrů → na stínítku spojitý pruh. Naměřily se **dvě oddělené stopy**.

To je přímý důkaz, že projekce spinu je kvantovaná — dvě hodnoty, nic mezi tím.

```anim:stern```

## Pauliho vylučovací princip

Spin ½ dělá z elektronu **fermion**. Pro fermiony platí, že jejich souhrnná vlnová funkce musí být při záměně dvou částic antisymetrická, z čehož plyne:

> **Dva elektrony nemohou být ve stejném kvantovém stavu.** V jednom orbitalu tedy mohou být nejvýše dva — a musí mít opačný spin.

Klíčové je, že **nejde o sílu**. Je to důsledek symetrie vlnové funkce, tedy statistiky. Přesto má drtivé fyzikální následky:

| Důsledek | Proč |
|---|---|
| Atomy mají slupky | elektrony se nemohou všechny nasypat do nejnižší hladiny |
| Hmota má objem | elektronové obaly se nedají stlačit do sebe |
| Bílí trpaslíci a neutronové hvězdy | drží je **degenerovaný tlak** fermionů, ne fúze ([02-hvezdy.md](../vesmir/02-hvezdy.md)) |
| Chemie vůbec existuje | valenční elektrony zbývají navrch místo aby spadly do jádra |

## Role v chemii

### Periodická tabulka je tabulka spinů

Kapacita slupek — 2, 8, 18, 32 — je `2n²`. Ta dvojka je právě spin: každý prostorový orbital pojme dva elektrony s opačným spinem.

| Podslupka | Počet orbitalů | Elektronů |
|---|---|---|
| s | 1 | 2 |
| p | 3 | 6 |
| d | 5 | 10 |
| f | 7 | 14 |

Doplňují se dvě pravidla:
- **Výstavbový princip** — zaplňuje se od nejnižší energie: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p…
- **Hundovo pravidlo** — v rovnocenných orbitalech se elektrony nejdřív rozsadí po jednom se **souhlasnými** spiny; párují se až když jinak nelze. Důvod je energetický (výměnná energie), ne "vyhýbání se".

```anim:pauli```

### Chemická vazba je spinový pár

Kovalentní vazbu tvoří **dvojice elektronů s opačnými spiny**. Není to konvence, ale nutnost: jen se spárovanými spiny smí oba elektrony obsadit tentýž prostorový orbital mezi jádry, kde jejich hustota stahuje jádra k sobě.

- **Singlet** (spiny opačné, ↑↓) → vazebný stav. U H₂ délka vazby 74 pm, energie 4,52 eV.
- **Triplet** (spiny souhlasné, ↑↑) → Pauliho princip vytlačí elektrony z prostoru mezi jádry; křivka je **čistě odpudivá**, molekula nevznikne.

Dva atomy vodíku se tedy spojí, nebo odrazí, podle jediné věci — vzájemné orientace spinů.

```anim:vazba```

### Nespárované spiny = reaktivita

- **Radikály** (nespárovaný elektron) jsou agresivně reaktivní, protože elektron hledá partnera do páru.
- **Kyslík O₂ má tripletový základní stav** — dva nespárované elektrony. Proto je kapalný kyslík **přitahován magnetem** a proto hoření sice uvolňuje energii, ale potřebuje zážeh: přímá reakce tripletového O₂ se singletovými molekulami je spinově zakázaná. Život na vzduchu vděčí za svou existenci právě téhle pomalosti.
- **Magnetická rezonance** (NMR, MRI) čte spin jader, hlavně protonů ve vodě. Stejný princip, jen o tři řády slabší momenty.

## Role v magnetismu

Magnetismus látek pochází **především ze spinu elektronů**, méně z jejich orbitálního pohybu (v pevných látkách je orbitální příspěvek často "zmrazený" krystalovým polem).

| Typ | Co ho způsobuje | Chování | Příklad |
|---|---|---|---|
| **Diamagnetismus** | indukovaná odezva všech elektronů | slabé **odpuzování**, má ho každá látka | voda, měď, grafit |
| **Paramagnetismus** | nespárované spiny, neuspořádané | slabé přitahování, mizí bez pole | hliník, kyslík, radikály |
| **Feromagnetismus** | spiny uspořádané **výměnnou interakcí** | silné, zůstává i bez pole | Fe, Co, Ni, Gd |
| **Antiferomagnetismus** | sousední spiny opačné | navenek nemagnetické | MnO, chrom |
| **Ferimagnetismus** | opačné, ale nestejně velké | magnetické | magnetit, ferity |

### Proč vůbec existuje permanentní magnet

Naivní představa je, že se atomové magnetky přitahují navzájem jako střelky kompasu. **To je o tři řády vedle**: magnetická interakce dvou sousedních atomových momentů odpovídá teplotě ~1 K, takže by feromagnetismus zmizel hned nad bodem varu helia.

Skutečnou příčinou je **výměnná interakce** — kvantový efekt, který vznikne kombinací Pauliho principu a elektrostatického odpuzování. Souhlasně orientované spiny nutí elektrony držet se dál od sebe, což **sníží** jejich vzájemnou elektrostatickou energii. Uspořádání spinů se tedy platí elektrostatikou, ne magnetismem — proto vydrží až do stovek stupňů.

- **Curieho teplota** = teplota, nad níž tepelný pohyb uspořádání rozbije: železo 1043 K, kobalt 1394 K, nikl 627 K, gadolinium 292 K (tedy 19 °C — v ruce zmagnetizuje a povolí).
- **Domény** — kus železa je rozdělený na oblasti s různým směrem uspořádání, aby se snížila energie pole vně. Vnější pole hranice domén posune, a to trvale → **hystereze**, tedy paměť. Právě to je fyzika pevného disku i magnetu na lednici.

```anim:domeny```

### Časté omyly

- **Zemské magnetické pole nepochází z permanentního magnetu.** Jádro má přes 5 000 K, tedy hluboko nad Curieho teplotou železa; pole vytváří dynamo proudící tekutého jádra.
- **Magnet brzděný v měděné trubce** nedokazuje, že měď je magnetická (je diamagnetická). Jde o **indukované vířivé proudy** — jiný jev.
- Nemagnetičnost mědi nebo hliníku není tím, že by neměly spiny, ale tím, že jsou spárované a jejich vodivostní elektrony nesplňují podmínku pro spontánní uspořádání.

### Kam to vede dál

**Spintronika** — elektronika, která místo náboje využívá spin. Objev obrovské magnetorezistence (GMR, Nobelova cena 2007) umožnil čtecí hlavy pevných disků a s nimi skok v hustotě záznamu; MRAM ukládá bit do orientace spinů.

## Slovníček

| Termín | Anglicky | Význam |
|---|---|---|
| spin | spin | vlastní moment hybnosti částice |
| Bohrův magneton | Bohr magneton | přirozená jednotka magnetického momentu, 9,274·10⁻²⁴ J/T |
| fermion | fermion | částice s poločíselným spinem, podléhá Pauliho principu |
| Pauliho princip | Pauli exclusion principle | dva fermiony nesmí být ve stejném stavu |
| Hundovo pravidlo | Hund's rule | v rovnocenných orbitalech nejdřív po jednom, souhlasné spiny |
| singlet / triplet | singlet / triplet | spiny opačné (vazebné) / souhlasné (odpudivé) |
| výměnná interakce | exchange interaction | kvantový původ feromagnetismu |
| Curieho teplota | Curie temperature | mez, nad níž feromagnetismus mizí |
| doména | magnetic domain | oblast se souhlasně uspořádanými spiny |
| degenerovaný tlak | degeneracy pressure | odpor fermionů proti stlačení |

## Zapamatuj si

- Spin má dvě hodnoty a **není to rotace** — je to vnitřní vlastnost plynoucí z relativistické kvantové mechaniky.
- Ze spinu ½ plyne Pauliho princip, a z něj slupky, periodická tabulka i tvrdost hmoty.
- Kovalentní vazba potřebuje **opačné spiny**; se souhlasnými je výsledek odpudivý.
- Feromagnetismus nedělá magnetická přitažlivost atomů, ale **výměnná interakce** — proto vydrží do 1043 K, a ne do 1 K.
- Nad Curieho teplotou magnet přestává být magnetem; zemské pole proto pohání dynamo, ne magnetizované jádro.
