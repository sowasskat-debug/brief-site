# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-08 (noc)**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest
niedokończone*, `CLAUDE.md` mówi *jak działa to, co skończone*.

> 🔴 **2026-08-07: `STAN.md`, `CLAUDE.md` i diagnostyka są już 404 pod brifup.com** (Jekyll `exclude`
> w `_config.yml`). Dalej widać je w PUBLICZNYM repo na GitHubie — to nie są pliki tajne, tylko zdjęte
> z domeny produktu i z Google. Edytuj normalnie.

---

## 🔴 A. „Saga × rynek" — ZAPROJEKTOWANA, CZEKA NA DANE (nie buduj przed czasem)

Pomysł zaakceptowany przez właściciela („zajebiste"): pod „Wpływ na rynek" przy sadze z instrumentem
wykres ceny (30 sesji) z **numerowanymi kropkami etapów sagi** naniesionymi na linię + legenda
numer → data → nagłówek. Makieta zrobiona na żywych danych (Ormuz × BNO) i zaakceptowana wizualnie.

✅ **Pomiar pokrycia `published_at` ZROBIONY (07/08.08 w nocy) — i wywrócił plan.** Wynik: **0/4693**
w archiwum i 0/130 w briefs — ale nie dlatego, że kod świeży. **Dwie ścieżki nie mogły pola wypełnić
NIGDY**, obie załatane w PR #113 (bot):
1. **Poczekalnia gubiła datę** — `_datyPublikacji` to mapa w pamięci procesu, a poczekalnia ponawia
   enrich w NASTĘPNYM biegu (nowy proces, pusta mapa). Zmierzone na logu Hetznera: przez poczekalnię
   idzie **1122 z 2399 publikacji (~47%)** — te nie dostałyby daty niezależnie od czekania.
2. **`CheckMultipleFeedsBatched` w ogóle nie wołało `ZapamietajDatePublikacji`** — czyli tor Bankiera
   (17,3% źródeł), ZeroHedge, Ars, The Verge, BBC ×2, Techmeme, Rest of World.

Do tego **PR #114 (bot): data z SAMEGO artykułu źródłowego** (życzenie właściciela: „myślałem, że ze
źródła, np. Onet/BBC, będziesz scrapował" + „kto pierwszy, ten lepszy"). Findery LICZYŁY ją i WYRZUCAŁY
(`_` w krotce). Reguła: **wcześniejsza z dwóch dat** (feedu vs artykułu) — kropka stoi tam, gdzie rynek
MÓGŁ się dowiedzieć; guard 48 h odrzuca artykuł tła. Zmierzone z Hetznera: 32/59 stron (54%) ma datę
w meta; 16/16 feedów selekcji oddaje `pubDate` w 100% pozycji. Reguła zweryfikowana refleksją na
`Bot.dll` — 8/8, w tym obie strony granicy północy.

🔴 **WARUNEK WEJŚCIA TERAZ: pokrycie liczy się od dawek z 08.08.** Sprawdź po 2-3 dniach:
`python3` po briefs+archiwum (published_at vs added_at) + liczniki `data_z_artykulu_wygrala/odrzucona`
w `brief_health`. Buduj, gdy pokrycie ustabilizuje się w okolicach sufitu; front MUSI mieć fallback
na `added_at` — **tor X-feeda ŚWIADOMIE nie dostaje daty nigdy** (pubDate skrótu dnia = czas tweeta,
nie newsów w nim opisanych) i stare newsy też jej nie mają.

⚠️ Znane do rozwiązania przy budowie:
- etapy z tego samego dnia **nakładają się na osi X** — skleić w jedną kropkę z listą w legendzie
  (widać na makiecie przy Ormuzie); rozdzielczość kropki = DZIEŃ (wykres ma 30 dziennych sesji),
- **serie krypto mają inną gęstość niż akcje**: BTC/ETH dają bar co dobę 7 dni w tygodniu (30 barów
  = 30 dni), akcje ~22 sesje na 30 dni — saga z instrumentem krypto zachowa się na osi X inaczej
  niż makieta z Ormuzem (BNO).

✅ Przy okazji tej sesji (07/08.08): **ticker bitcoina naprawiony** — „Bitcoin" w linii wpływu dawało
wykres funduszu IBIT (podmiana rynku, brak nocnych ruchów); teraz BTC/USD + ETH/USD z endpointu crypto
Alpaki (PR #113, zweryfikowane na żywym API z Hetznera). **Oś sagi nie powiela artykułu** — kotwica
klastra brała pierwszą podpozycję, która bywała sąsiednim etapem osi (brief-site #111).

---

## ✅ 0. Edge Function `og` — WDROŻONA I ZWERYFIKOWANA (02.08 wieczorem)

Ten punkt mówił „dwie zmiany czekają na deploy" — **nieaktualne, obie działają.** Sprawdzone na
żywym endpoincie: `?w=1` oddaje `PNG image data, 1200 x 630`, a nagłówek `access-control-allow-origin: *`
jest obecny (czyli „Pobierz kartę" zapisuje plik, nie otwiera zakładki).

🔴 **Zapamiętaj mechanizm, bo wróci:** deploy funkcji **NIE IDZIE PRZEZ GIT**. Commit do `main` nic
nie wdraża — po każdej zmianie w `supabase/functions/og/index.ts` trzeba ręcznie:
```
cd ~/Documents/brief-site && supabase functions deploy og --no-verify-jwt --project-ref utmvokfjvrthvcmxzowc
```
⚠️ `--no-verify-jwt` jest **konieczne** (scraper nie ma i nie może mieć tokenu).
⚠️ `supabase login` wygasa — przy błędzie tokenu najpierw `supabase login`.
⚠️ Ostrzeżenie `Docker is not running` przy deployu jest **nieszkodliwe** — funkcja i tak się wgrywa.

**Weryfikacja po każdym deployu** (z Maca):
```
curl -sS -D- -o /dev/null ".../og?d=morning&s=<slug>" | grep -i access-control
curl -sS -o /tmp/w.png ".../og?d=morning&s=<slug>&w=1" && file /tmp/w.png
```

**Ostatnia zmiana 02.08 (życzenie właściciela: „przesuń kreskę w lewo, żeby się więcej zmieściło"):**
lewa kolumna karty wątku 330→250 px, prawa 868→948, limit tekstu etapu 96→104 znaki.
Szerokość tekstu osi urosła o 11%. 🔴 **Zmieniając szerokość jednej kolumny, MUSISZ zmienić drugą
o tyle samo** — satori tego nie wylicza (to ta sama pułapka, przez którą 46/46 kart miało ucięty
kadr). Zweryfikowane pikselowo: treść w granicach x 48–1148, zapas 51 px z prawej.

---

## ✅ 1. Diagnostyka — ZDJĘTA Z PAGES 2026-08-07 (migracja Supabase potwierdzona)

**Warunek z tego punktu spełniony i domknięty.** Zweryfikowane 2026-08-07 z serwera (klucz bota,
`curl` na Supabase REST): `lejek` **1500 wierszy**, `deepseek_usage`/`brief_health`/`bot_health`
po **200**, wszystkie z najświeższym wpisem z tego samego dnia — dual-write działa od dawna.

`lejek.json`, `deepseek_usage.json`, `brief_health.json`, `bot_health.json` + panele
`brief-health.html`, `maszynownia.html` → **wszystkie 404 pod brifup.com** (`_config.yml` exclude,
PR #100). knaga czyta `lejek` **Supabase-first**, więc zakładka Lejek działa dalej.

✅ **Ogon 1 ZAMKNIĘTY 2026-08-07 wieczorem — widget „DeepSeek dziś" czyta Supabase.**
`pobierzUzycieDeepSeek()` w knadze woła `.from('deepseek_usage')`. **Świadomie BEZ zapasowego
pliku** (inaczej niż lejek): `deepseek_usage.json` jest w `exclude`, więc pod brifup.com oddaje
404 ZAWSZE — fallback byłby martwym zapytaniem udającym bezpiecznik. Przy okazji doba liczona
LOKALNIE zamiast w UTC (`.gte('ts', lokalna_północ)`) — stary kod porównywał prefiks daty UTC,
więc między 00:00 a 02:00 czasu PL kafel pokazywał wczorajszy dzień jako „dziś".
⚠️ Sprawdzone atrapą klienta Supabase na żywej stronie (zapytanie + oba warianty sumowania:
`total_in`/`total_out` oraz awaryjne po `stages`), **nie wobec prawdziwej tabeli** — logowanie
do knagi ma wyłącznie właściciel.

🔴 **Otwarty ogon:**
- **Repo jest PUBLICZNE na GitHubie**, więc pliki dalej widać pod `github.com/sowasskat-debug/brief-site`.
   `exclude` zamyka tylko drogę „brifup.com/plik" i Google. Pełne zamknięcie = prywatne repo (Pages
   z prywatnego wymaga płatnego planu) ALBO wyłączyć 4 funkcje `Zapisz*NaSite` w bocie + skasować
   pliki z repo (zmiana w bocie, brak CI — `dotnet build` przed pushem).

**Publiczne ZOSTAJE (treść strony, Flusso czyta cross-origin):** `briefs.json`, `threads.json`,
`trending.json`, `quotes.json`, `archive/`, `rejected.json`.

---

## 🔴 2. OneSignal — push prawdopodobnie NIE DZIAŁA

Bez zmian. Konsola na produkcji: `App not configured for web push`. Do sprawdzenia w panelu
OneSignal (Settings → Web Configuration): czy domena to `brifup.com` i czy web push jest włączony.
**Z kodu tego nie naprawimy.**

---

## ✅ 3. GDELT — KRYTERIUM SPEŁNIONE (sprawdzone 2026-08-07), finder ZOSTAJE

**Rozstrzygnięte.** Zmierzone 2026-08-07 z serwera po tygodniu działania poprawki: sumy tygodniowe
`finder_gdelt_fakty` **> 0** (PL 5, EN 26 — fallback EN dowozi więcej niż tor podstawowy). Kryterium
z tego punktu („`finder_gdelt_fakty` przez dobę > 0 → zostaje") **spełnione — GDELT zostaje w łańcuchu.**
Poniżej oryginalny zapis dochodzenia dla kontekstu.

---

### (archiwum dochodzenia) GDELT — poprawka ZMERGOWANA 02.08, kryterium do sprawdzenia 03.08

**Zmierzone 2026-08-02, nie zgadnięte:** GDELT **żyje** (proste zapytanie → 200 + poprawny JSON,
bez klucza), ale odrzuca ~70% ruchu. 24 zapytania przy odstępie 6 s (ich dokumentowany limit):
**7×200, 17×429 = 29% skuteczności**, sukcesy rozrzucone bez regularności.

**Wykluczone eksperymentalnie:** kształt zapytania (krótkie/długie/PL/EN odbijają się tak samo)
oraz długość odstępu (120 s ciszy dało 429, a 6 s później 200).

🔴 **Przyczyna zera w licznikach:** po PIERWSZYM 429 kod otwiera breaker na **15 minut**, czyli gasi
finder na cały bieg. Przy ~70% szans na odbicie pierwszy item niemal zawsze wygasza GDELT, zanim
ten trafi w swoje 29%.

✅ **PR #96 ZMERGOWANY 02.08 wieczorem → `a6a0661`** (3 próby w jednym wywołaniu + breaker dopiero po
3 wywołaniach z rzędu i na 5 min zamiast 15). Wdroży się przy najbliższym biegu Hetznera.
⚠️ **Nadal NIE JEST UDOWODNIONY:** zaraz po serii 29% cztery wywołania przez realny kod dały 0/4.
Najpewniej własnym ruchem testowym wpędziłem IP w ostrzejsze limitowanie — czyli GDELT karze
**skumulowanym wolumenem**, nie odstępem. Pomiar szedł z Maca, bot pyta z Hetznera.

⚠️ **Ze starych liczników NIE DA SIĘ tego rozstrzygnąć:** `finder_gdelt_proba` inkrementuje się PRZED
wywołaniem findera (`ProbujFindery`), więc liczy też przebiegi wycięte przez breaker. **Dopiero teraz
liczniki zaczną mówić prawdę** — breaker przestał maskować realne strzały.

**Powód zmergowania (02.08, pomiar dnia):** z 77 newsów, które przeszły selekcję, **10 odpadło bez
źródła (13,0%)** wobec 3,7–7,9% w trzech poprzednich dniach. W licznikach dnia GDELT dał **zero faktów
ze 134 zarejestrowanych prób**, polskie Google News 5 na 165, a cały enrich stał na Google News EN
(31 faktów / 73 próby). Fallback EN: 73 próby → 26 sukcesów (36%), w tym 18 dzięki poprawce
„oryginalny tytuł przeżywa selekcję".

🔴 **KRYTERIUM ROZSTRZYGAJĄCE — sprawdź to 03.08:** `finder_gdelt_fakty` przez dobę.
- **> 0** → GDELT działa, zostaje.
- **dalej ZERO** → z IP datacenter nie oddaje nic i uczciwą decyzją jest **wyrzucić go z łańcucha
  finderów**. ⚠️ Ta zmiana **potroiła jego koszt czasowy**: do 3 × 5,5 s na item zamiast 5,5 s, a GDELT
  stoi w łańcuchu PRZED finderami, które realnie dowożą. Przy ~20 itemach na bieg to do ~5 min
  dokładane do biegu za nic. Nie zostawiaj tego w zawieszeniu „na później".

---

## ⚠️ 4. Selekcja nie zapisuje POWODU odrzucenia — ZMIERZONE PONOWNIE

**1019 z 1019 odrzuceń selekcji nie ma pola `powod`.** Dla porównania bramki PO selekcji mają je
komplet: `powtorka` 68/68, `utknal` 28/28, `odrzucony_enrich` 5/5.

To nie bug, tylko kontrakt: `odrzucony` jest stanem STARTOWYM każdego kandydata
(`LejekZarejestrujBatch`), a selekcja zwraca w JSON **wyłącznie WYBRANE**.

⚠️ **Zgłoszenie właściciela 2026-08-02:** *„myślałem, że jak coś bot usunie i da powód dlaczego,
to tam się będą pojawiać"* — czyli oczekiwanie jest, żeby odrzucenia bota z powodem były widoczne
w panelu. Zakładka **Odrzucone pokazuje wyłącznie RĘCZNE odrzucenia** (`rejected.json`, lista ucząca
filtr); odrzucenia bota są w zakładce **Lejek** i nie mają powodu.

**Propozycja (właściciel wstrzymał: „nie tykaj nic"):** krótki KOD przyczyny przy `idx` w odpowiedzi
selekcji (`makro-rutyna`, `lokalna-polityka`, `runda-finansowania`). Koszt ~+3% zużycia.
⚠️ **Ryzyko nie jest w cenie, tylko w miejscu:** dotyka `FORMAT_JSON_SELEKCJI`, wspólnego dla
**wszystkich 6 ścieżek** i najbardziej cache'owanego promptu w bocie. Nowe pole w części STAŁEJ
przebuduje prefiks cache raz; w części zmiennej nie ruszy nic.

**Korzyść uboczna:** dziś nie da się zweryfikować poprawki reguł inaczej niż „poczekajmy i zobaczmy".

---

## ⚠️ 5. Klastrowanie po rdzeniach + re-klastrowanie odrzuconych — WDROŻONE 02.08 wieczorem, OBSERWOWAĆ

Wieczorem 02.08 dawka rozsypała się na 5 kafli tej samej sagi Ormuz (trzy bliźniacze oświadczenia
MSZ Iranu obok siebie — zgłoszenie właściciela ze zrzutem). ⚠️ **Bramka zapowiedzi (#103) była
podejrzana i log ją UNIEWINNIŁ** (zero jej linii w biegu 19:00) — winne dwie starsze wady, obie
naprawione w **PR #105 → `7dacaf9`**:
1. filtr spójności klastra liczył Jaccarda po SUROWYCH słowach — polska fleksja („przekierowują
   statki" vs „przekierował statków" = J 0,0) rozrzucała poprawne grupy DeepSeeka → teraz rdzenie,
2. odrzuceni z kotwicy spadali na top-level POJEDYNCZO → teraz sklejają się między sobą.

Dane naprawione ręcznie (`b3459800`): dwa parasole (top story+Centcom, trio MSZ).
Pomiar offline w `financialnewsbot/CLAUDE.md` (sekcja „Filtr spójności klastra: RDZENIE…").

**Co obejrzeć po kilku biegach:**
- liczniki `klaster_odrzut_kotwicy` / `klaster_odrzut_sklejony` / `klaster_zapowiedz_solo`
  w `brief_health.json` (dołożone w #105 — domyka odstępstwo „bramka bez licznika" z #103),
- czy dawki przestały mieć bliźniacze kafle obok siebie,
- czy RetroMerge nie zaczął scalać ZA DUŻO (negatywy na rdzeniach 3,8% vs 2,0% surowo — podłoga
  otwarta szerzej; werdykt i tak należy do AI, ale jak zobaczysz sklejone RÓŻNE zdarzenia, patrz
  progi w sekcji CLAUDE.md bota).

**Kryterium dla bramki zapowiedzi bez zmian:** odpala się na nie-zapowiedzi → zawęź
`_frazyZapowiedziMocne`, **nie** ruszaj `PROG_SPOJNOSCI_KLASTRA`.

---

## 📊 6. Do obejrzenia

| Co | Gdzie | Punkt odniesienia |
|---|---|---|
| Udział Bankier.pl w źródłach | kokpit / archiwum | było **17,3%** (następne źródło 2,5%) |
| `zrodlo_rozcienczone` | `brief_health` | jak ~0 przez tydzień → próg 0.45 za wysoki |
| Czy Techmeme i The Verge realnie dowożą | zakładka Lejek | Techmeme max 2/bieg, Verge max 1 |
| Koszt Haiku za `impact` | `brief_health` | `impact_haiku_tok_in` / `_tok_out` |
| ⚠️ Wykresy notowań | `briefs.json`, pole `chart` | inne nazewnictwo Haiku może dać MNIEJ wykresów |
| **Skuteczność fallbacku EN** | `brief_health` | `enrich_enfallback_z_oryginalu` vs `_sukces` |
| **`poczekalnia_utknelo`** | `brief_health` | było **5 na 10** trafiających do poczekalni |

---

## ✅ Co zrobiono 2026-08-07 WIECZOREM/NOCĄ — Wątki jako osobny produkt (nie ruszaj bez powodu)

Sesja mobilno-wizualna. Wszystko zmergowane do `main` i **zweryfikowane na produkcji** (SW v81).

### Podstrona `/watki.html` (PR #104) + poprawki (#105)
- Wszystkie sagi z `threads.json`, **najnowszy etap NA GÓRZE**, saga zwinięta do 3 etapów
  (tap w nagłówek rozsuwa pełną oś), **tap w etap wysuwa SKRÓT artykułu** z `briefs.json`;
  dni archiwalne doładowywane leniwie per plik (`ensureDay`), deep-link „Otwórz news →".
- 🔴 **Kotwica klastra bywa zbiorcza — bez `article` i `source_name`** (#105). Skrót pokazywał wtedy
  tekst zastępczy i mylącą etykietę „archiwum" przy DZISIEJSZYM newsie. Teraz sięga do pierwszej
  podpozycji z artykułem; etykieta awaryjna to „Brif.up". ⚠️ Ta sama pułapka co przy stubach:
  diagnozując „brak treści", sprawdź NAJPIERW, czy węzeł to kotwica klastra.
- Wpis w `sitemap.xml` (podstrona jest publiczna, w odróżnieniu od knagi).

### Wejścia do Wątków
- **Mobile: pasek nad feedem SCHOWANY**, odsłania go PŁYTSZE pociągnięcie w dół (>24 px), głębsze
  (>60 px) odświeża jak dotąd. Pasek żyje POZA `#content`, więc przeżywa re-rendery; raz odsłonięty
  zostaje do końca wizyty. Wariant „hairline" (wybór właściciela), desktop go nie pokazuje.
- **Desktop: przycisk „WĄTKI N"** obok zakładek dawek (PR #106), czerwony obrys (fiolet jest zajęty
  przez aktywną dawkę), licznik żywy z `threads.json`.

### Oś wątku — jeden język w 3 miejscach
- **Klaster otwiera się z osią JUŻ ROZWINIĘTĄ** (#107); pojedynczy news dalej ma ją zwiniętą,
  bo tam treścią główną jest artykuł.
- **Oś pod postem przestylizowana na wzór /watki** (#108): najnowszy etap na górze, pełne kropki,
  metka „MM-DD · dawka → relacja". „TEN NEWS" zostaje (czerwony pierścień, gdy nie jest najnowszy).
- **Karta podglądu `og?w=1` też odwrócona** (#109) — funkcja WDROŻONA osobno przez
  `supabase functions deploy`, zweryfikowana na żywym endpoincie. ⚠️ X/Slack cache'ują podgląd,
  więc STARE posty mogą jeszcze pokazywać starą kolejność.
- **Ikona wątku: emoji 🧵 → SVG** (wariant 2c, naprzemienna oś) w topbarze, badge'ach, przycisku
  „Wątek tematu" i nakładce. Powód: emoji renderowało się inaczej na każdym systemie i było kolorową
  plamą w monochromatycznym UI. Stała `WATEK_ICN` w `index.html` — używaj jej, nie wklejaj SVG drugi raz.

### Poprawki mobilne (PR #103) i kafle notowań (PR #110)
- `.expand-image`: **szare tło z shimmerem na czas ładowania** — bez niego wolne łącze zostawiało
  180 px białej (jasny motyw) / czarnej dziury nad artykułem (zgłoszenie właściciela).
- `.expand-read-btn`: `white-space: nowrap` — „Czytaj →" łamało się na dwie linie.
- `.cat-level-bar`: ukryty przy domyślnych 100% (pełny pasek pod KAŻDYM tematem czytał się jak gruby
  separator); wraca, gdy suwak realnie przycina.
- „Wątki dnia" ≤700 px: metka „N etapów · ost." schodzi POD tytuł — obok zjadała ponad połowę wiersza
  i tytuły sag łamały się po jednym słowie.
- 🔴 **Kafel notowań mówi teraz, JAKI TO OKRES** (#110, zgłoszenie: „nie wiadomo, czy to ostatni dzień
  czy 30 dni"): chip „N sesji" przy symbolu = okres LINII, dopisek „dziś" przy procencie = okres ZMIANY.
  To dwie różne skale w jednym wierszu i stąd zielony procent bywa przy opadającej linii.
  ⚠️ Poniżej 460 px symbol i chip stoją JEDEN POD DRUGIM — w linii chip był obcinany (zmierzone:
  głowa potrzebowała 92 px, dostawała 68).

---

## ✅ Co zrobiono 2026-08-07 — przegląd i hardening przed publicznym startem (nie ruszaj bez powodu)

Pełny przegląd całego Brif.upu (8 finderów + weryfikatory). Dwa PR-y zmergowane do `main`,
funkcja `og` wdrożona osobno. Wszystko zweryfikowane na produkcji.

### Bezpieczeństwo (PR #100)
- **`?admin=PAT` USUNIĘTY z `index.html`** (237 linii). Trzymał token GitHuba z prawem zapisu do repo
  w `sessionStorage` na publicznym originie, bez bramki logowania — wystarczał link `?admin=<token>`,
  a każdy XSS = przejęcie repo (= produkcji). Moderacja WYŁĄCZNIE w knadze. Zniknęła druga ścieżka
  zapisu `rejected.json` (cap 200 obok knagowego 150). ⚠️ **Nie przywracaj.**
- **`_config.yml` (Jekyll exclude)** — `STAN.md`, `CLAUDE.md`, `SETUP_SUPABASE.md`, `supabase_schema.sql`,
  `supabase/` + cała diagnostyka (patrz punkt 1) → 404 pod brifup.com. `exclude`, NIE `Disallow`
  w robots.txt (robots jest publiczny i zdradziłby ścieżki — ta sama logika co `knaga.html`).

### Linki udostępniane na X (PR #100)
- 🔴 **Stuby przestały umierać po dobie.** Żyją 14 dni, ale celowały w `#dawka/slug` z BIEŻĄCEGO
  `briefs.json`, a news wypada do archiwum następnego dnia → `routeDoseHash` kończył pustą stroną.
  Teraz `otworzSlugZArchiwum(slug)` szuka w archiwum, gdy sluga nie ma w bieżącej dawce.
  **Fallback po stronie FRONTU celowo — naprawia też linki JUŻ wrzucone na X.** Weryfikacja:
  `#morning/18hh119` (news z 6.08) otwiera nakładkę archiwum. ⚠️ Osobny, NIENAPRAWIONY ogon:
  karta-obrazek (`og`) dla archiwalnego slugu bez `a=` wraca do grafiki zapasowej — bot powinien
  ustawiać `a=<data>` w stubie (`BudujStubHtml` w Runner.cs), wtedy `og` sięgnie archiwum.
- **`expandBlock`** buduje link „Udostępnij" z `_archiveDate`/`_dose` dla wpisów archiwalnych
  (mobilny widok tematu mieszał dni i dawał martwe linki; desktop miał to od początku).

### Poprawność (PR #100)
- **`liveTick`** zapisuje ETag DOPIERO po udanym pobraniu (`if (pobrano) lastBriefsTag = tag`).
  Dotąd szedł przed fetchem, więc jeden nieudany poll gasił auto-odświeżanie na 30-60 min.
- **`pollLiveUpdates`** woła `oznaczKotwice` i zwraca status. Była JEDYNĄ z 4 ścieżek cache bez
  `oznaczKotwice` → po każdym live-updacie podpozycje klastrów traciły badge 🧵 i oś sagi.
- **Numeracja mobilna** `padStart(2,'0')` zamiast `0${i+2}` (od 10. pozycji było `010`, `011`).
- **Service worker**: `threads.json`/`quotes.json` + diagnostyka na czystą sieć (wpadały w gałąź
  statyczną z cache-busterem → nowy wpis Cache Storage co odświeżenie, ~3 MB/dobę). `CACHE_NAME` v74.

### Funkcja `og` — hardening (PR #101, WDROŻONA osobno przez `supabase functions deploy`)
- 🔴 **Path traversal w `a=`** — parametr wchodził wprost do `${ORIGIN}/archive/${a}.json`; `a=../../`
  wyprowadzało pobieranie poza katalog. Teraz wymagany wzorzec daty.
- **Nieznane parametry odrzucane** — dowolny `&x=<losowe>` omijał cache CDN (nowy klucz mimo `s-maxage`)
  i wymuszał pełny render satori+resvg. To był mechanizm nadużycia otwartego endpointu.
- **Slug/dawka walidowane wzorcem** (`^[a-z0-9]{1,16}$` + whitelista dawek). Sprawdzone na 623 stubach.
- **Pamięć podręczna TTL 60 s** — `briefs.json`+`threads.json` szły przy KAŻDYM wywołaniu (~360 KB).
- Weryfikacja na produkcji: legalny slug 200 PNG, karta `w=1` 200, `&x=999`/`&a=../` → 302, `d=xxx` → 302.

---

## ✅ Co zrobiono 2026-08-02 (nie ruszaj bez powodu)

### Zapowiedź tygodnia nie klei się z konkretnym newsem
Zgłoszenie właściciela (zrzut): w jednej karcie stały zapowiedź kluczowych wydarzeń tygodnia
(Iran, ISM, JOLTS, ADP, AMD, SpaceX) i raport kwartalny SpaceX. **Zmierzone:** klaster przeszedł
deterministyczny filtr spójności na Jaccardzie **0,065 przy progu 0,06** — o 0,005, na dwóch
wspólnych słowach (`raport`, `spacex`). Item-zapowiedź wymienia cudze tematy z nazwy, więc dzieli
słowa z każdym newsem, o którym wspomina.
- **Dane:** klaster rozbity na dwie pozycje top-level (`978aad11`). Przeżył trzy zapisy bota
  i `RetroCleanup` — potwierdza, że `RetroMergeSameEvent` ich nie sklei (bramka 0,12 > 0,065).
- **Przyczyna:** bramka `CzyZapowiedzWieluTematow` w bocie (PR #103 → `d2a4971`), opis
  w `financialnewsbot/CLAUDE.md`. **Progu 0,06 świadomie NIE podnoszono.**

### Karta podglądu X dla newsa w klastrze — przyczyna znaleziona
Zgłoszenie: „chciałem udostępnić post SpaceX, ale nie wygenerowało naszego linku z podglądem".
To był **skutek tego samego błędu**, nie druga usterka — patrz nowa pułapka 15 niżej.
Po rozdzieleniu bot dogenerował stub sam w ciągu jednego biegu; `s/1jj229t.html` → 200,
`og?d=evening&s=1jj229t` → PNG 1200×630 z właściwym nagłówkiem i kategorią.

### Karta podglądu linku — naprawiona i wdrożona
- **Kadr:** prawa kolumna miała `flexGrow: 1` bez `width`, więc satori liczył 868 px jako szerokość
  TREŚCI i doklejał padding NA ZEWNĄTRZ → tekst wypadał poza kadr 1200 px. **Dotyczyło 46 z 46 kart**,
  nie tylko długich nagłówków. Po poprawce 46/46 czystych na żywym endpoincie.
- `✓` renderował się jako pusty prostokąt (Space Mono nie ma U+2713) — usunięty.
- Kropki sagi dostały cap 12 (bot trzyma do 20 węzłów).
- **`OG_IMAGE_BASE` ustawione na Hetznerze**, stuby wskazują na funkcję `og` (47/48).

### Bramka cross-bieg widzi WSZYSTKIE etapy
`ZnajdzPodobnePublikowane` oddaje top-4 dopasowań w kolejności PUBLIKACJI zamiast jednego
najpodobniejszego. Potwierdzone w produkcji: `POWTORKA` i `COFNIECIE` zadziałały na realnych newsach.

### Oryginalny tytuł przeżywa selekcję
Mapa `tekst_pl → tytuł oryginalny` + `BriefItem.TytulOryginalny` (przeżywa poczekalnię między
biegami). Angielski oryginał karmi `DeepSeekWyszukiwarkaQueryEN` zamiast być odtwarzanym z polskiego.

### Front i knaga
- **Notowania:** stopka „stan na …" zdjęta z ekranu, znacznik został w `title` i `data-stan`.
- **Post na X:** flaga kraju z przodu (tylko PIERWSZA), emoji w treści wycinane deterministycznie.
- **Dwie karty do pobrania** w panelu X: nagłówkowa i wątku (ostatnie 4 etapy).
- **Odrzucone:** jedna ścieżka zapisu z ponowieniem na 409 i GŁOŚNYMI komunikatami.

---

## ⚠️ Pułapki, w które łatwo wdepnąć ponownie

1. 🔴 **Pusta lista jest ścieżką GŁÓWNĄ, nie brzegową.** `trafienia[Count-1]` bez guarda na pustą
   listę wywalił bramkę dla każdego newsa BEZ podobnych w historii — a wyjątek łapał dopiero `catch`
   na końcu `UpdateBriefOnSite`, więc **ubijał całą partię feedu razem z finalnym PUT-em**.
   Zniknęło 5 newsów (tytuły spalone w historii = bezpowrotnie). Symulacja przed wdrożeniem testowała
   trzy warianty — wszystkie z NIEPUSTĄ listą. **Testuj przypadek zerowy zawsze.**
2. 🔴 **`gotowiec-x` NADPISUJE `x_post` od bota.** Knaga woła Edge Function przy każdym otwarciu
   panelu X. Generowanie gotowca w bocie było więc podwójną robotą — wycofane. Nie dodawaj z powrotem.
3. **Lejek stempluje czasem WARSZAWSKIM, `brief_health` UTC.** Porównując godziny z różnych plików
   (albo z zegarem Maca) najpierw sprawdź, w której strefie są.
4. **X przy „Boost" odrzuca posty z więcej niż jednym emoji** — potwierdzone przez właściciela na
   żywym poście. Pole `flag` bywa wieloflagowe (11 z 49 itemów), więc do X idzie tylko pierwsza flaga.
   ⚠️ Dotyczy **wyłącznie** X — strona renderuje pełną flagę.
5. **macOS blokuje `http.server` na `~/Documents`** (ochrona prywatności) — podgląd lokalny serwuj
   z kopii w scratchpadzie. Wpis `brief-site-repo` w `~/.claude/launch.json` już tak robi.
6. **`brifup.com` NIE idzie przez Cloudflare** — NS to GoDaddy, rekordy A wprost na GitHub Pages.
7. **`bot_secrets.env` ma NIESPÓJNY format** — część linii z `export`, część bez. Naprawione `set -a`
   w `run_bot.sh`. ⚠️ „przecież Haiku działa" NIE dowodzi, że inne klucze działają.
8. **Nowy feed testuj Z SERWERA, nie z Maca** (TVN24: 200 z laptopa, 403 z Hetznera).
9. **Feed przez rss.app sprawdzaj LICZBĄ POZYCJI i DATĄ najnowszej**, nie kodem HTTP.
10. **Bump `CACHE_NAME` przy każdej zmianie CSS/JS** — świeżość daje `cache:'reload'` w SW.
11. **Nie dopisuj `knaga.html` do `robots.txt` ani `sitemap.xml`.**
12. **Panel szczegółów: nie zwężaj poniżej 440 px** bez sprawdzenia kafli notowań.
13. **`rejected.json` UCZY FILTR** (ostatnie 40 wpisów) — pomyłka przy „Usuń" psuje selekcję.
14. **Link do X NIE idzie w treść posta** — obcina zasięg. Idzie jako odpowiedź.
15. 🔴 **News schowany w klastrze NIE MA stuba, więc nie da się go udostępnić z podglądem.**
    `ZapiszStubyNaSite` iteruje po `d.Items`, czyli **wyłącznie po pozycjach top-level** — do `subItems`
    nie wchodzi. Knaga liczy slug z `item.text` KAŻDEGO newsa (też sub-itemu), więc dla newsa w klastrze
    dostaje adres, którego nie ma → HEAD 404 → fallback na link hashowy → **X pokazuje generyczną kartę
    strony głównej**. Objaw wygląda jak awaria funkcji `og`, a `og` działa poprawnie.
    ⚠️ Diagnozując „nie generuje podglądu" sprawdź NAJPIERW, czy news jest top-level, a nie sub-itemem.
    Lek: rozdzielić klaster — stub odtworzy się sam w kolejnym biegu (mechanizm jest samoleczący).
    ⚠️ Stubów **nie dopisuj ręcznie** (patrz `CLAUDE.md`) — bot i tak odtwarza stan z `briefs.json`.
16. 🔴 **Nowy plik wewnętrzny → dopisz go do `exclude` w `_config.yml`.** GitHub Pages serwuje
    DOMYŚLNIE każdy plik z repo. Dokumenty, diagnostyka, źródła funkcji są zdejmowane WYŁĄCZNIE przez
    listę `exclude` — plik spoza niej wyląduje pod brifup.com. ⚠️ `exclude` chowa z domeny i z Google,
    ale NIE z publicznego repo na GitHubie.

## Otwarte drobiazgi z przeglądu 2026-08-07 (niższa ranga, potwierdzone)

- **JSON-LD `datePublished` ma zaszyte `+02:00`** (index.html, ~1286). `added_at` jest warszawski,
  więc od końca października (CET, +01:00) wszystkie daty strukturalne będą o godzinę za wysokie.
- **15 kopii wołania DeepSeek** w `Runner.cs` (różnią się promptem/modelem) i **rozjechana kopia
  klasyfikatora kategorii** (`brief-health.html` była kopią `dtGetCategory` z index.html, już z driftem)
  — panel zdjęty, ale wzorzec duplikacji zostaje w innych miejscach.
- **Slug djb2-xor w 3 miejscach** (index.html, knaga.html, Runner.cs, og/index.ts) — zmiana algorytmu
  w jednym rozjeżdża deep-linki i stuby. Trzymać identyczne.

## Otwarte drobiazgi

- **Stare PR-y z 10 lipca, wszystkie w konflikcie:** #27 (dotyka `briefs.json` — 3-tygodniowy diff na
  żywych danych, **do zamknięcia, nie merge'a**), #31 (grafiki z Wikipedii — podejście PORZUCONE na
  rzecz `image_url`, plik `fala.html` to legacy), #34 (liczniki kategorii, `index.html` od lipca
  zmienił się nie do poznania).
- ✅ **Archiwum na wejściu — ZAMKNIĘTE 2026-08-07 wieczorem.** Było 1,63 MB gzip (38 plików
  sekwencyjnie), jest **0,34 MB (8 plików równolegle) = −79,2%**, zmierzone na tym archiwum.
  `ARCHIWUM_DNI_NA_STARCIE = 7`, resztę dociąga `dowczytajCaleArchiwum` dopiero przy otwarciu
  widoku tematu — patrz `CLAUDE.md`, sekcja „Archiwum ładowane leniwie".
  ⚠️ **Widoczna zmiana:** liczniki przy tematach startują z tygodnia i skaczą do pełnych po
  wejściu w temat. To zapowiedziany koszt, nie usterka.
- `brief-health.html` i `maszynownia.html` — **ZDJĘTE Z PAGES 2026-08-07 (404).** Ich funkcję ma
  przejąć knaga na Supabase (na razie tylko zakładka Lejek + pusty widget DeepSeek — patrz punkt 1).
- Przycisk „Udostępnij na X" jest w knadze, ale **na `index.html` dla czytelników NADAL GO NIE MA**.
- Nieśledzone pliki w repo: `.claude/`, `marka/`, `serve.py`, `supabase/.temp/` — `_config.yml` już
  wyklucza `marka/` i `serve.py` z Pages; decyzja o `.gitignore` osobno.
- 8 wpisów w `rejected.json` (pozycje 91–98) nie ma pól `date`/`dose` — panel pokazuje dla nich „—".

## Odrzucone pomysły (nie wracaj bez nowego powodu)

- **Logowanie Google**, **magic link/OTP** — wybrane e-mail + hasło.
- **Gotowiec `x_post` generowany przez bota** — `gotowiec-x` robi to na żądanie i nadpisuje wynik.
- **Fallback EN „odpalać wcześniej / podnieść limit"** — leczenie objawu. Przyczyną była utrata
  angielskiego oryginału na selekcji; naprawione u źródła.
- **Gotowe liczniki (GoatCounter, Plausible)**, **przeniesienie domeny na Cloudflare**,
  **stała sól w liczniku wejść** — patrz historia decyzji.
