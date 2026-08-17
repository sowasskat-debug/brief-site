# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-17 (przedpołudnie)**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest
niedokończone*, `CLAUDE.md` mówi *jak działa to, co skończone*.

## ✅ 17.08: cudzy artykuł pod nagłówkiem — dane naprawione (#180) + bramka w bocie (#184, ZMERGOWANE = deploy)

Zgłoszenie właściciela (zrzut + „artykuł powinien być o awarii"): kafel **„Anthropic informuje
o poważnej awarii Claude'a"** (awaria REALNA: 16.08 21:58–22:34 UTC, logowanie + 5 usług) miał artykuł
t3n o **wodoznaku SynthID** — enrich podpiął gorący artykuł tej samej firmy, werdykt `related`
przepuścił, a klastrowanie wsadziło awarię do parasola o wodoznaku. **Ta sama klasa co KCNA ×
start rakiety z pkt 12 poniżej** — i to jest jej domknięcie.
- **Dane (#180):** kafel awarii dostał artykuł z BleepingComputer (`text` nietknięty → slug/stub
  zostają), klaster rozdzielony (watermark Mashable osobno), `threads.json` zsynchronizowany
  (w994 → BC, ostatni węzeł w783 przepięty na tekst pozycji watermark + `seen`).
- **Bot (#184):** bramka `ArtykulOInnymWydarzeniu` — wąski werdykt `OPISUJE`/`INNE` po KAŻDYM
  `related=true` (polski nagłówek × polski artykuł + daty; `INNE` → kolejny finder, wzorzec bramki
  osób; fail-safe → publikuj). 📊 **Oba kandydaty na prefiltr deterministyczny ZMIERZONE
  i odrzucone — nie powtarzaj tych pomiarów:** „artykuł starszy o >6 h" ma **44,5% legalnych trafień**
  (mediana wieku artykułu przy publikacji to 4,5 h — kandydat z pkt 12 obalony), „wspólne wyłącznie
  encje" — 6,2% FP, a zgłoszony przypadek i tak przechodzi. Szczegóły: `FinancialNewsBot/CLAUDE.md`,
  sekcja „Cudzy artykuł pod nagłówkiem".
- 👀 **PO DEPLOYU OBEJRZEĆ:** proporcję `artykul_odrzucony_inne_wydarzenie` do
  `artykul_wydarzenie_sprawdzony` (odrzuty mają być RZADKIE — klasa wraca co kilka dni; odrzuty ≈
  sprawdzenia = model tnie wszystko → zawęź prompt werdyktu) oraz czy `do_poczekalni`/`utknal`
  nie rosną skokowo (bramka odrzucałaby też dobre artykuły). Log: „artykuł opisuje INNE wydarzenie
  niż nagłówek". Etap tokenów `brief-inne-wydarzenie` w `deepseek_usage` (~50-70 małych calli/dzień
  to norma — bramka działa świadomie BEZ prefiltru).

## ✅ 15.08 popołudnie: kafel Citi/kredyt syndykowany zdjęty + kontr-wskaźnik w feedzie Kalshi

Zgłoszenie właściciela („zbyt mało istotne dla Polaka"): „Citi dołącza do konsorcjum finansującego
kredytem syndykowanym 4,6 mld USD…" — citybiz (agregator komunikatów prasowych), reach 0, wszedł
batchem rodziny `CheckKalshiBatched` przez furtkę „duże transakcje" w REGULE 2.
- 📊 Klasa JEDNORAZOWA (1 trafienie na 46 dni / 5565 pozycji) → kontr-wskaźnik w prompcie jednego
  feedu, NIE w `WSPOLNE_ODRZUCENIA` (precedens BBC Science). Kontrola pozytywów: rundy dużych firm
  i wielkie emisje obligacji przechodzą dalej. Szczegóły: `FinancialNewsBot/CLAUDE.md`,
  sekcja „Udział banku w kredycie syndykowanym ≠ wydarzenie".
- 🔴 **Doprecyzowanie właściciela (chwilę po mergu): „chodzi o to, że to japońskie, a nie europejskie"**
  — kryterium jest GEOGRAFIA finansowanego projektu, nie sam kredyt syndykowany. Reguła przepisana:
  daleki świat bez haczyka na PL/UE = odrzut, ale finansowanie dużego projektu energetycznego
  w Polsce/Europie MOŻE przejść. Nie zawężać tej furtki przy kolejnych zgłoszeniach.
- Dane: kafel zdjęty z popołudniowej, jednowęzłowa saga w946 usunięta (tekst został w `seen`),
  wpis dopisany do `rejected.json` (REGUŁA 0).
- ⚠️ To zmiana promptu (miękka). Gdyby klasa wróciła — bramka deterministyczna wzorem
  `_agregatZRaportu`, nie kolejne zdanie w prompcie.

## ✅ 15.08: ten sam news po SZEŚCIU dniach — okno bramki było za krótkie (bot + dane, PR z tej sesji)

Zgłoszenie właściciela ze zrzutu osi wątku: saga **w719** miała trzy etapy, z czego dwa to TEN SAM news
— 09.08 „Netanjahu odrzuca 15-punktowy plan pokojowy dla Gazy" i 15.08 „Netanjahu odrzucił 15-punktowy
plan pokojowy Trumpa dla Strefy Gazy" (Vietnam.vn, przedruk sprzed tygodnia).
- 📊 **Tytuły tej pary: 0,600 przy progu 0,18** — miara zadziałałaby bez zarzutu, tylko **para nigdy do
  niej nie dotarła**: bramka czytała 3 DNI wstecz, a news był sprzed SZEŚCIU (plik miał zresztą retencję
  5 dni, więc 09.08 fizycznie w nim nie było). Selektor po opisach (14.08) też nie mógł — jego okno to
  bieżący `briefs.json`, czyli ~24-40 h; dla tej pary wyszło 0,148 przy progu 0,15.
- 🔴 **To INNA klasa niż 14.08.** Tam miara mierzyła nie to, co trzeba; tu miara była doskonała, a
  **materiału nie było w oknie**. Trzeci wariant rodziny „model nie miał JAK odpowiedzieć dobrze".
- **Naprawa: czwarty selektor — okno DALEKIE (dni 4-7) z własnym progiem `PROG_POWTORKI_DALEKIE = 0,35`**,
  retencja pliku 5 → 8 dni, kandydaci dopisywani do tej samej listy dla `OcenEtapKontynuacji`.
  📊 Próg wybrany pomiarem na 4417 pozycjach z 38 dni: 0,18 → 13,4 dodatkowych wywołań/dobę (pasmo
  0,18-0,35 to szum i realne nowe etapy sag), **0,35 → 0,9/dobę**, a zgłoszona para ma duży zapas.
  Szczegóły: `FinancialNewsBot/CLAUDE.md`, sekcja „Ten sam news po SZEŚCIU dniach".
- **Dane naprawione w tym samym PR:** pozycja z 15.08 usunięta z porannej dawki, węzeł zdjęty z sagi
  w719 (zostają 2 etapy z 09.08); tekst ZOSTAJE w `seen`, żeby nie wrócił na oś.
  ⚠️ `briefs.json`/`threads.json` commituje bot co ~30 min — przy mergu spodziewaj się konfliktu na
  tych dwóch plikach i przenieś TĘ SAMĄ edycję na świeży main (poprawka jest w OSOBNYM commicie).
- 👀 **PO DEPLOYU OBEJRZEĆ:** licznik `cross_bieg_kandydat_dalekie` (~1/dobę to norma z pomiaru) i to,
  czy `cross_bieg_powtorka` nie zaczyna ciąć realnych kolejnych etapów trwających sag.
  ⚠️ **Okno napełnia się dopiero po deployu** — `opublikowane_historia.txt` jest lokalny per-serwer
  i miał retencję 5 dni, więc pełne 7 dni historii bot będzie miał po ~3 dobach.

## ✅ 14.08 noc: deep-link „nie przewija do posta" — NAPRAWIONE (front, PR z tej sesji)

Zgłoszenie właściciela: link wysłany komuś często nie przewijał do posta, dopiero drugie wejście.
Routing i stuby były sprawne — **startowe re-rendery po `loadThreads()`/`loadQuotes()`** (goły
`renderDose` dla badge 🧵/wykresów) zerowały scroll i zwijały kartę otwartą przez deep-link, gdy
gotowce dojechały PO scrollu (zimne wejście = wyścig przegrany, drugie wejście = wygrany — stąd
„często"). Zreprodukowane i zweryfikowane w Chromium z opóźnionym `threads.json`.
Naprawa: `renderDoseZachowujacWidok()` (zachowuje otwarte karty, filtr, scroll + kotwiczenie do
otwartej karty). SW → v121. Szczegóły i pomiary: `CLAUDE.md`, sekcja „Deep-link «nie przewija do
posta»". ⚠️ Gdyby objaw wrócił: drugie znalezisko (bez naprawy) to `if (!el) return` bez ponowienia
w mobilnej gałęzi `tryOpen`.

## 🔴 14.08 ~19:15: AUTOMAT X WYŁĄCZONY — `X_AUTO=false`, stan TYLKO NA SERWERZE

Decyzja właściciela („wyłącz na razie X bota"). `X_AUTO=true→false` w `/root/bot_secrets.env`
(backup: `/root/bot_secrets.env.bak.20260814`). **W żadnym repo tego nie widać** — kod bramki
([Runner.cs] `OpublikujNajlepszyNaX`, pierwsza linia) jest bez zmian, przełącznik żyje wyłącznie
w env na Hetznerze. Jeśli automat „milczy na X" — to jest powód, nie awaria.
- Ostatni post bota przed wyłączeniem: 14.08 18:39 (licznik dnia stanął na 11/12).
- Bieg 19:00 wystartował jeszcze ze starym env, ale NIC nie opublikował — zablokowała go własna
  bramka odstępu („odstęp 32 min < 60 min"), potwierdzone w logu.
- Ponowne włączenie = `X_AUTO=true` w `bot_secrets.env` (żadnego deployu nie trzeba).

## ✅ 14.08 wieczór: klaster Lockheed–Musk — dane naprawione + bramka rdzenia w cross-dose NA PRODUKCJI

Zgłoszenie właściciela („post z Lockheed zniknął z porannej"): o 19:36 cross-dose merge zamienił
solo posta „Lockheed Martin: przyszłość obronności…" (poranna poz. 19) w klaster, doklejając
„Musk: obliczenia orbitalne…" (Tech/AI, UA.NEWS) — **zero wspólnych rdzeni nośnych, Jaccard 0,0**,
wbrew zakazowi „ten sam temat ≠ ten sam event" w promptcie. Front zmienia wtedy id kafla
(`item-`→`group-`) i tap przestaje otwierać artykuł — stąd wrażenie zniknięcia.
- ✅ **Dane naprawione** (brief-site `9b5e505ab`): Lockheed z powrotem solo, Musk jako osobny post
  w evening. Przeżyło kolejne biegi bota.
- ✅ **Bot naprawiony** (FinancialNewsBot #174, `591f033`, deploy zweryfikowany na biegu 22:30 —
  0 błędów kompilacji): (a) bramka `SpojneTematycznie` w pętli crossDose (dotąd NIE MIAŁA ŻADNEJ
  weryfikacji tematycznej — in-dose ma ją od 02.08); (b) fix GUBIENIA newsa przy pełnym klastrze
  (`uzyteNowe.Add` szedł przed capem 4 subów → odrzucony item nie trafiał ani do klastra, ani do
  fallbacku; realna ofiara z 14.08 rano: „Pentagon ogłosił zawarcie umów z Northrop Grumman…").
  Szczegóły i zasady: `FinancialNewsBot/CLAUDE.md`, sekcja o cross-dose merge.
- 👀 **PO DEPLOYU OBEJRZEĆ** (bramka jeszcze nie miała okazji zadziałać — cross-dose zdarza się
  kilka razy/dobę): log `bez wspólnego rdzenia tematycznego z klastrem … — publikuję osobno`.
  Ma ciąć parasole (wzorzec: Musk↔Lockheed), a przepuszczać to samo wydarzenie (Pentagon↔Lockheed —
  oba zmierzone na realnych funkcjach z `Bot.dll`). Fałszywy odrzut = news wychodzi osobno, nic nie ginie.
- ℹ️ Kopia kotwicy w `subItems[0]` (tekst == kotwica, ~19% klastrów, mierzone 21/110) to **CELOWY
  projekt, nie bug** — kontrakt „subItems = wszystkie ujęcia łącznie z ujęciem kotwicy" (confirmCount,
  render, promocja RetroCleanup). Nie „naprawiać".

## 🖼️ 14.08: banery X w `marka/` mają logo przesunięte ~90–94 px w prawo — DECYZJA OTWARTA

Zgłoszenie właściciela (zrzut profilu @brifup: logo ucieka w prawo pod przyciski aplikacji).
Zmierzone: wszystkie 4 pliki `marka/x-baner*.png` mają środek treści na ~840–844 px zamiast 750
(marginesy np. 607/418). Wyśrodkowane wersje wygenerowane przesunięciem PIKSELI (nie rerenderem —
fonty z CDN, ta sama zasada co przy `og-image.png`) i wysłane właścicielowi.
- OTWARTE: (a) właściciel wgrywa baner na X sam; (b) czy nadpisać pliki w `marka/` wersją
  wyśrodkowaną — nie zrobione bez decyzji; (c) błąd jest we WSPÓLNYM ŹRÓDLE (wszystkie 4 pliki
  identycznie przesunięte) — poprawić też w pliku źródłowym (Figma/Canva?), inaczej następny
  eksport wróci krzywy.

## ⏰ 14.08 wieczór: czujnik nagłówków OBSERWUJE — analiza ~16.08 (przypomnienie ZAUTOMATYZOWANE), decyzja o wdrożeniu OTWARTA

📊 **Pierwsza próbka (42 min, 18:30–19:12 warszawskiego, piątek — szczyt sesji US, ZA MAŁO na
decyzję):** 39× `NOWY`, 0 błędów; conditional GET tylko 9% (15/168 pobrań); mostki X (Juice,
Polymarket, PolymarketMoney, Kalshi, Kobeissi) = 28/39 nagłówków (72%). Symulacja wyzwoleń silnika:
odstęp 5 min → ~10/h, 10 min → ~5,7/h, 15 min → ~4,3/h (dziś cron daje 2/h) — ryzyko „biegów będzie
WIĘCEJ, koszt DeepSeeka ↑" pierwsze dane potwierdzają. Dwie hipotezy na pełną analizę:
(a) realna zwłoka wykrycia ~2,5–3 min, nie 2 (próg `FAST=120` s zderza się z siatką crona 60 s;
fix jedną liczbą `FAST=110`); (b) `nowe>0` to zły wyzwalacz — Juice wyrzucił 11 nagłówków
w 1 sekundę, w tym 7 zdań z JEDNEJ wypowiedzi Goolsbee'ego (próg musi liczyć wydarzenia, nie linie).
⏰ **Przypomnienie ustawione automatycznie:** scheduled task `brifup-czujnik-analiza` na Macu
właściciela, odpala się 16.08 9:00 London = 10:00 Warszawa (jednorazowo; wymaga włączonej aplikacji
Claude — przy zamkniętej odpali przy najbliższym starcie). Prompt zadania jest samowystarczalny.

Pomysł właściciela: zamiast sztywnego crona `*/30` bot ma reagować na nowe nagłówki zdarzeniowo.
Wybrany wariant A (tani poller-czujnik + wyzwalacz silnika), ale NAJPIERW pomiar — właściciel:
„sprawdzimy co i jak to działa a później podejmiemy decyzję o wdrożeniu".
- ✅ **Zrobione 1/2 — lock w `run_bot.sh`** (`flock -n /var/lock/brif_bot.lock`): łata ISTNIEJĄCĄ dziurę —
  bieg z serią timeoutów `SELEKCJA-JSON` (300 s, ~16% biegów łapie choć jeden) przekracza 30 min i cron
  stawiał mu drugi bieg na plecach → dubel publikacji nie do złapania żadną bramką + rozjechany git.
  Backup: `/root/run_bot.sh.bak.20260814`. Test kolizji przeszedł.
- ✅ **Zrobione 2/2 — czujnik `/root/czujnik.py`** w trybie CZYSTO OBSERWACYJNYM: cron co 1 min,
  16 feedów 1:1 z botem (fast 2 min / slow 10 min, conditional GET, nigdy artykuły), loguje
  `NOWY [feed] tytuł` do `/var/log/brif_czujnik.log`, stan w `/root/czujnik_state/`. NICZEGO nie wyzwala.
- ⏰ **DO ZROBIENIA ~16.08 (przypomnienie ZAUTOMATYZOWANE — patrz nagłówek sekcji):** analiza linii
  `NOWY` z 2–3 dób → ile wyzwoleń silnika/dobę przy min-odstępie 5/10/15 min → decyzja o wyzwalaczu.
- 📊 Zmierzone przy instalacji: conditional GET honoruje tylko 5/16 feedów; **rss.app zawsze pełne 200**
  (~25 KB) → przy wdrożeniu nie schodzić z interwałem rss.app poniżej 2 min (IP już dostaje 403/429).
- ⚠️ Znane ryzyka wdrożenia (spisane też w `FinancialNewsBot/CLAUDE.md`, sekcja o czujniku): w dzień
  biegów byłoby WIĘCEJ, nie mniej (koszt DeepSeeka ↑), mniejsze paczki mogą zmienić selekcję porównawczą,
  `dotnet run` kompiluje per bieg. Fallback-cron zostaje przy każdym wariancie.
- ⚠️ Oba skrypty żyją TYLKO na serwerze (jak dotąd `run_bot.sh` — nie jest w repo); przy decyzji
  „wdrażamy" zwersjonować.

## 🔴 14.08: klasa z punktu 12 UDERZYŁA NA PRODUKCJI dzień po diagnozie — NAPRAWIONE (bot, PR z tej sesji)

Zgłoszenie właściciela („karygodny fatalny błąd", zrzuty): saga paliwowa **w647** dostała TRZY kafle
jednego wydarzenia w ~20 h — 13.08 16:03 „Rząd obniża VAT na paliwa do 8 proc. …, decyzja zamiast
rozważań", 14.08 10:32 „Premier Donald Tusk zapowiada ponowne wprowadzenie mechanizmów obniżających
ceny paliw" (COFNIECIE: zapowiedź po opublikowanej decyzji), 14.08 11:34 „Wracamy do cen maksymalnych…"
(TOP STORY popołudniówki). 📊 Tytuły tych par: **0,053 / 0,000 / 0,056** — dokładnie klasa „żadna miara
słów tego nie łapie" z punktu 12.
- **Naprawa (bot): bramka cross-bieg PO OPISACH** — trzeci selektor kandydatów dla `OcenEtapKontynuacji`:
  `PROG_POWTORKI_PO_OPISIE = 0,15` na artykułach (+ wspólny rdzeń nośny), kandydaci z bieżącego
  `briefs.json`, werdykt zostaje przy modelu z memo sagi i fail-safe. Opisy tych samych par mierzą
  **0,171 / 0,214**, Anthropic z pkt 12 **0,160** — czyli 0,15 domyka OBIE klasy z punktu 12 naraz.
  Koszt zmierzony: ~17 małych calli/dzień. Szczegóły i liczniki: `FinancialNewsBot/CLAUDE.md`,
  sekcja „Trzy kafle jednego wydarzenia w 20 h".
- **Drugi front tego samego incydentu:** RetroMerge o 11:34 POPRAWNIE skleił oba dzisiejsze kafle,
  a RetroCleanup o 11:39 rozebrał klaster i OKALECZYŁ poranną pozycję (src/reach/impact → None).
  Przyczyna: model wpisał item i do `groups`, i do `crossDose` (duplikacja w dwóch dawkach) + okrojona
  kopia kotwicy promowana przy zwijaniu 1-elem. klastra. Oba bugi naprawione (guard + pełna kopia pól).
- **Dane naprawione w tym samym PR brief-site:** okaleczony duplikat (morning, Tusk) usunięty,
  węzeł sagi w647 + `seen` przepięte na kafel Bankiera („Wracamy do cen maksymalnych…").
  ⚠️ briefs.json/threads.json commituje bot co ~30 min — przy mergu tego PR spodziewaj się konfliktu
  na tych dwóch plikach i przenieś TĘ SAMĄ edycję na świeży main (poprawka jest w OSOBNYM commicie).
- **PO DEPLOYU OBEJRZEĆ:** log „Pominięto powtórkę wykrytą PO OPISIE" + liczniki
  `cross_bieg_kandydat_po_opisie` (~17/dzień to norma z pomiaru) vs `cross_bieg_powtorka_po_opisie`/
  `cross_bieg_cofniecie_po_opisie`. Gdyby realne eskalacje znikały — zawęź prompt werdyktu,
  NIE ruszaj progu 0,15 (zmierzony na recall).

> 🔴 **2026-08-07: `STAN.md`, `CLAUDE.md` i diagnostyka są już 404 pod brifup.com** (Jekyll `exclude`
> w `_config.yml`). Dalej widać je w PUBLICZNYM repo na GitHubie — to nie są pliki tajne, tylko zdjęte
> z domeny produktu i z Google. Edytuj normalnie.

---

## ✅ TRZY KOMENDY Z 10.08 RANO — WYKONANE

Klucz EIA wpisany (plik sekretów 17→18 linii, z `export`, więc `set -a` go podnosi), obie funkcje
Edge wdrożone z repo: `og` v16 i `gotowiec-x` v6, obie 10.08 o 19:37 UTC. Zweryfikowane na żywym
endpoincie: karta klastra `og?k=1` oddaje PNG dla wszystkich kotwic z dawki, karta wątku `og?w=1`
ma logo w prawym górnym rogu (układ z #121).
⚠️ Wcześniejszy wniosek „`&k=1` → 302, czyli funkcja nie zna `k`" był **błędny** — 302 brało się
stąd, że testowany news nie był klastrem. Diagnozując te karty, sprawdzaj NAJPIERW, czy news
ma `subItems` (dla `k`) i czy należy do sagi (dla `w`) — inaczej fail-safe zwraca grafikę zapasową
i wygląda to jak awaria deployu.

## 🔴🔴 NAJPILNIEJSZE — NIC nie czeka na komendę (stan 13.08 wieczór)

Wszystko z 13.08 zmergowane i wdrożone: **bot #170, #171**, **front #165**.
🟢 Automat X chodzi od 12.08 20:15, kadencja podniesiona 13.08 na **12/dobę, odstęp 60 min, okno 7-23**.

## 🔵 OD CZEGO ZACZĄĆ 14.08 — kolejność ustalona z właścicielem (sesja 13.08 noc)

Wieczór 13.08 zeszedł na diagnozę trzech zgłoszeń o powtórkach. **Dwa z trzech okazały się czymś
innym niż dubel** — dlatego kolejność poniżej jest od najlepiej rozpoznanego do najbardziej niepewnego.

1. **Tryb celowanego re-enrichu w bocie — ZACZNIJ OD TEGO.** Bot NIE MA sposobu, by wzbogacić
   POJEDYNCZY news: `REENRICH_DOSE` przepisuje CAŁĄ dawkę (39 pozycji, 39 wywołań modelu),
   a `RETRY_POCZEKALNIA` dotyczy tylko poczekalni. Potrzebny tryb „weź ten nagłówek, poszukaj artykułu
   od nowa, pokaż co znalazłeś" — potrzeba wróci przy KAŻDYM rozjeździe nagłówek↔artykuł.
   Przypadek testowy gotowy: `North Korea: U.S., Japan and South Korea military ties evolving into
   a nuclear pact` (Financial Juice, 13.08 21:30) — pozycja zdjęta z dawki, ale nagłówek jest w lejku.
2. **Sprawdź, czy bramka „fakty niezwiązane z nagłówkiem" w ogóle była wołana** przy tym newsie
   (punkt 12, blok o mechanizmie). **Jeśli nie była — moja hipoteza „mierzy związane zamiast to samo
   wydarzenie" jest nietrafiona i cała diagnoza idzie do kosza.** To jest warunek wstępny, nie detal.
3. **Bramka na podobieństwie OPISÓW, próg ~0,30** (punkt 12) — jedyna rzecz z wczoraj zmierzona
   i gotowa do wdrożenia. ⚠️ NIE obniżaj progu na podstawie przypadku Korei; ten przypadek został
   zdiagnozowany błędnie i sprostowany.
4. **Punkt 10** — ręczne posty na X niewidzialne dla automatu. Dwie decyzje właściciela otwarte.

**Od czego zacząć następną sesję — OBSERWACJE, nie roboty:**
1. **Log `X -> pominięto (agregat z raportu…)` i licznik `x_odrzut_agregat_z_raportu`** (bot #171).
   Zmierzona częstość to ~1 trafienie na 3 tygodnie — gdyby licznik rósł szybciej, wzorzec łapie
   za szeroko i tnie realne umowy. **Zawęź wzorzec, nie zdejmuj bramki.**
2. **Log `NAGŁÓWEK BEZ KONKRETU` i `naglowek_anonimowy_podmiot_podejrzenie`** (bot #170). Zmierzone
   0,09 wywołania modelu na dobę, więc licznik ma być prawie zawsze zerowy.
3. **Liczniki `x_*` w `brief_health`** — jak w poprzedniej sesji.
4. **Punkty 7, 8 i 10 niżej** — trzy realne problemy znalezione 13.08, wszystkie NIENAPRAWIONE.

## 🔴 12. DUBEL W FEEDZIE: ten sam raport dwa razy — ✅ NAPRAWIONE 14.08 (bramka po opisach, patrz sekcja na górze)
> ⚠️ **Aktualizacja 14.08:** obie drogi z „Kierunku na następną sesję" zrealizowane JEDNĄ bramką —
> podobieństwo OPISÓW przy progu **0,15** służy wyłącznie jako SELEKTOR KANDYDATÓW dla modelu
> (nie deterministyczne cięcie przy 0,30, które łapało tylko 29% dubli). Anthropic (opis-J 0,160)
> i trójka paliwowa (0,171/0,214) mieszczą się w progu. Pomiary niżej zostają jako historia diagnozy.
Zgłoszenie właściciela: *„podobny news już chyba był"*. Był — ten sam raport Anthropica o agentach
Claude wyszedł **05:30 (poranna)** i **23:03 (wieczorna)**. Pozycja wieczorna usunięta ręcznie z
`briefs.json`.

**Dlaczego bramka nie zadziałała.** Cross-bieg dedup ma DWA etapy (`Runner.cs`, ~L3269): tani filtr
Jaccarda, a dopiero nad progiem **`PROG_POWTORKI_MIEDZY_BIEGAMI = 0.18`** model orzeka
`POWTORKA`/`COFNIECIE`/`NOWE`. **Filtr jest odźwiernym — model dostaje tylko to, co filtr wpuści.**
Ta para dała ~0,15, więc model NIGDY nie został zapytany. Dowód: w logu Hetznera przy tym newsie nie ma
ŻADNEJ linii decyzyjnej (cisza = prefiltr nie zwrócił nic).

📊 **CZTERY DROGI ZMIERZONE, WSZYSTKIE ODPADAJĄ** — nie powtarzaj tych pomiarów:
| droga | wynik dla spornej pary | próg | werdykt |
|---|---|---|---|
| tytuł polski | 0,154 | 0,18 | za nisko |
| **tytuł angielski (oryginał)** | **0,148** | 0,18 | za nisko — GORZEJ niż polski |
| **opis polski (`article`)** | **0,160** | ≥0,25 użyteczny | za nisko |
| **to samo źródło + doba + nazwa własna** | — | — | **nie dotyczy, patrz niżej** |

- ⚠️ **Angielski NIE pomaga, mimo że brzmi lepiej.** Morfologia faktycznie działa (`turf war`/`turf wars`
  sklejają się, gdy `terytorium`/`terytorialne` NIE), ale obie redakcje napisały o tym raporcie inne
  zdania — jedna o sabotażu i self-replicating malware, druga o zmowie cenowej. 4 wspólne słowa na ~30.
- ⚠️ **Opis też nie pomaga**, bo opis generuje NASZ model dwa razy od zera i wychodzą dwie różne treści.
- 🔴 **`feed` ≠ `source_name` — TO JEST PUŁAPKA DIAGNOSTYCZNA.** W `briefs.json` oba newsy mają
  `source_name: Unite.AI`, ale dziennik lejka pokazuje, że przyszły z **RÓŻNYCH feedów: Polymarket
  (03:30) i Techmeme (21:03)**. `source_name` jest rozwiązywane PO wzbogaceniu, a bramka stoi PRZED nim
  i widzi wtedy tylko feed. **Każdy pomiar reguły działającej w bramce licz na `feed`, nigdy na
  `source_name` z `briefs.json`** — inaczej mierzysz pole, którego kod w tym miejscu nie ma.

📊 **Co pomiar dał POZYTYWNEGO** (44 dni archiwum, 4752 newsy z opisem): bramka na podobieństwie OPISÓW
rozdziela dobrze **inną** klasę dubli — pary bliskich dubli mają medianę 0,203, a różne etapy TEJ SAMEJ
sagi (54 sagi, 1121 par) tylko 0,061. Przy progu 0,30 łapie 29% dubli i wycina 0,3% etapów sag.
**Obawa, że taka bramka zje sagi, NIE potwierdziła się.** Widoczny realny problem: „Warszawa siedzibą
Centrum ESA" jest w archiwum **trzy razy** (opis-J 0,65 i 0,59), „Japonia: więcej zwierząt niż dzieci"
dwa razy. To jest osobny, łatwiejszy problem niż sporny Anthropic — i wart zrobienia.

🔴 **DRUGI PRZYPADEK, ZNALEZIONY TEGO SAMEGO WIECZORU — i on koryguje próg.** Zgłoszenie właściciela
(*„tutaj też był podobny news"*): kotwica **13.08 23:33** „Korea Północna: więzy wojskowe USA, Japonii
i Korei Południowej przekształcają się w pakt nuklearny" (30 źródeł, Vietnam.vn) — a jej ARTYKUŁ
opowiada start rakiety z Wonsan z 12 sierpnia, opublikowany **12.08 rano** jako trzy podpozycje klastra.
| porównanie | tytuł-J | opis-J |
|---|---|---|
| „Pocisk balistyczny… poza japońską strefą ekonomiczną" (12.08 00:03) | 0,048 | **0,231** |
| „Korea Północna wystrzeliła niezidentyfikowany pocisk" (12.08 00:35) | 0,143 | 0,171 |
| „Drugi start w niecały tydzień…" (12.08 01:30) | 0,000 | 0,162 |
🔴🔴 **SPROSTOWANIE TEGO SAMEGO WIECZORU — TO NIE JEST DUBEL I NIE JEST SPRAWA DEDUPU.**
Pytanie właściciela („a ty porównywałeś dwa tytuły po angielsku?") ujawniło, że pierwsza diagnoza była
błędna. Angielskie oryginały z dziennika lejka:
```
11.08 21:30-22:30 [Financial Juice/Polymarket] North Korea launches unidentified projectile
                                               North Korean missile … landed outside Japan's EEZ: NHK
13.08 21:30       [Financial Juice]  North Korea: U.S., Japan and South Korea military ties evolving into a nuclear pact
                                     North Korea condemns U.S.-South Korea military exercises: KCNA
```
- **Wczorajszy news w oryginale NIE jest powtórką** — to oświadczenie KCNA z 13.08 o sojuszu, jedno
  z czterech rodzeństwa tego wieczoru. Ze startem rakiety łączy je tylko kraj.
- 🔴 **Dubel powstał U NAS: nagłówek jest o oświadczeniu KCNA, a wygenerowany artykuł opowiada
  w całości start rakiety z Wonsan z 12.08.** To rozjazd **nagłówek ↔ artykuł**, czyli rodzina
  punktu 7 („`impact` przeczy własnemu artykułowi"), a NIE awaria bramki powtórek.
- ⚠️ **TO OBALA REKOMENDACJĘ „zejdź z progiem do 0,20", KTÓRA STAŁA TU WCZEŚNIEJ.** Opis-J 0,231 brał
  się z tego, że artykuł dociągnął TŁO poprzedniego wydarzenia — a artykuły robią to rutynowo. Bramka
  na opisie z niskim progiem wycinałaby legalnie nowe newsy za samo przypomnienie kontekstu.
  **Ten przypadek jest argumentem PRZECIW niskiemu progowi, nie za nim.** Zostaje ~0,30 z pomiaru
  na 44 dniach; nie obniżaj go na podstawie tego przypadku.
- **SKĄD SIĘ WZIĄŁ ROZJAZD (mechanizm):** Financial Juice to feed SAMYCH NAGŁÓWKÓW, bez artykułów.
  Bot dostał oświadczenie KCNA bez treści, więc `EnrichItem` musiał artykuł **doszukać** finderami —
  i wylądował na **vietnam.vn** (stąd to źródło w kaflu zamiast Financial Juice), a tamten tekst
  opowiadał start rakiety z Wonsan. Nagłówek został z KCNA, treść przyszła z cudzego wydarzenia.
- 🔴 **Bramka na to ISTNIEJE i bywa skuteczna** — w logu widać ją przy innym newsie:
  `[INFO] DeepSeek: fakty niezwiązane z nagłówkiem — szukamy kolejnego źródła: Indie — Nowy Delhi
  i Canberra podpisują pakt nuklearny…` (tam odrzuciła źródło i news poszedł do poczekalni).
  Hipoteza, dlaczego tu nie zadziałała: **mierzy „czy ZWIĄZANE", a nie „czy TO SAMO WYDARZENIE"**.
  Tekst z vietnam.vn jest o Korei Płn., o ćwiczeniach Ulchi Freedom Shield i o napięciu wokół sojuszu,
  więc na pytanie „czy związane z nagłówkiem o sojuszu?" uczciwa odpowiedź brzmi TAK. Był związany —
  opisywał inne zdarzenie. **Czwarty raz ta sama klasa** (po `CzyZapowiedzWieluTematow`, parasolu
  „małpy i SpaceX", cytacie-porównaniu z Zaporoża): sygnał policzony poprawnie, mierzył nie to, co trzeba.
- ✅ **ZWERYFIKOWANE 14.08 (nocna sesja) — bramka BYŁA wołana i orzekła `related=true`. Bez logu,
  strukturalnie:** bramka to pole `related` WEWNĄTRZ `DeepSeekWriteArticle` (Runner.cs ~7082), a linia
  „fakty niezwiązane…" loguje się WYŁĄCZNIE przy `related=false` — więc cisza w logu niczego nie
  dowodzi. Rozstrzyga kod + dane: `SourceUrl` przypisuje się w CAŁYM bocie w 3 miejscach i każde stoi
  za `related==true` (`ProbujFindery` L4755 wprost; L4504/4547 kopiują wynik `EnrichItem`, czyli tę samą
  ścieżkę). Opublikowany item (odzyskany z historii gita, commit `39bcd81`) MA `source_url` vietnam.vn
  + artykuł ⇒ bramka przepuściła. **Hipoteza „nie była wołana" obalona.**
  - ⚠️ **KOREKTA HIPOTEZY „związane vs to samo wydarzenie":** prompt JUŻ pyta o „DOKŁADNIE TO SAMO
    konkretne wydarzenie" z fail-closed („przy jakichkolwiek wątpliwościach related=false") — pytanie
    jest dobre, zawiódł WERDYKT na materiale splątanym: artykuł vietnam.vn opisuje start z Wonsan,
    ale RAMUJE go jako „sygnał przed ćwiczeniami USA–Korea" i wprost wymienia „więzy wojskowe" —
    czyli fakty zawierały temat nagłówka jako TŁO. Klasyczne „prompt negocjuje". Przeformułowanie
    promptu to NIE jest naprawa pierwszego wyboru.
  - 💡 **Kandydat deterministyczny do ZMIERZENIA (nie wdrożony):** `published_at` artykułu = 13.08
    03:10, a nagłówek KCNA wszedł feedem 21:30 — źródło **starsze o ~18 h od depeszy** fizycznie nie
    może opisywać wydarzenia, o którym depesza dopiero informuje. Prefiltr „artykuł starszy niż
    nagłówek feedu o >N h → zaostrzone pytanie/odrzut kandydata" jest tani i mierzalny na archiwum
    (`data_z_artykulu` już płynie). Zmierzyć rozkład, zanim cokolwiek stanie w potoku.
  - ℹ️ Bramka po OPISACH z 14.08 dziś by ten dubel PRZECHWYCIŁA (opis-J 0,231/0,171/0,162 ≥ 0,15 →
    werdykt modelu) — ale leczy OBJAW (dubel), nie przyczynę (cudzy artykuł pod nagłówkiem): news
    o oświadczeniu KCNA i tak by przepadł, tyle że po cichu jako powtórka.
  - ℹ️ Drobne znalezisko przy okazji: item ma `tytul_oryginalny = null`, mimo że wszedł Financial Juice
    (angielski oryginał był w lejku) — mapa `_tytulyOryginalne` nie dopięła się do tego itemu.
    Nie zbadane głębiej; jeśli powtarzalne, EN-fallback enrichu traci wejście, które miał mieć.
- ⚠️ **METODA, NIE JEDNORAZOWA WPADKA: przy podejrzeniu powtórki sprawdź NAJPIERW angielskie oryginały
  w `lejek` (pola `tytul` + `feed`), zanim policzysz cokolwiek na polskich tytułach i opisach.** Polska
  warstwa jest wygenerowana przez nasz model i potrafi upodobnić do siebie dwa różne wydarzenia albo
  rozjechać dwa te same. Diagnoza z niej jest niepewna z definicji.

**Kierunek na następną sesję:** to są DWA rozłączne problemy.
1. **Duble o podobnym tytule i opisie** (ESA ×3) → bramka na opisie, próg ~0,30, na końcu potoku
   (po tłumaczeniu i wzbogaceniu). Obie strony porównania to nasz własny tekst, a opublikowane pozycje
   MAJĄ już `article` w `briefs.json` — **żadnej zmiany formatu utrwalonych plików**. Koszt: płacimy
   za enrich, zanim wyrzucimy. Zmierzone, gotowe do wdrożenia.
2. **Ten sam news napisany zupełnie inaczej** (Anthropic) → żadna miara słów tego nie łapie. Złapałby
   MODEL, gdyby parę zobaczył. Zostało wyłącznie obniżenie progu 0,18 — **NIE ruszaj go bez pomiaru
   pozytywów i negatywów na archiwum** (ta sama zasada co przy `PROG_SPOJNOSCI_KLASTRA`).
- ⚠️ Usunięcie poszło **wprost przez `briefs.json` w gicie, nie przez knagę** — więc pominięty jest kosz
  w Supabase (brak odwracalności jednym kliknięciem) i wpis do `rejected.json` (filtr bota się na tym
  NIE uczy). Przy następnym takim usunięciu rozważ panel.

## ✅ 11. Nazwa klastra zmieniała się po publikacji — NAPRAWIONE (13.08 wieczór, bot)
Zgłoszenie właściciela: *„jestem przekonany, że nazwa tego klastra była inna"*. Była: 18:37
„Nowe modele AI od Google i OpenAI" → 18:43 „Google wypuszcza Gemini 3.7 Flash", te same podpozycje.
Przyczyna: model przemianowywał klaster, do którego środka nie widział (`[ISTNIEJĄCY]` szedł jako sama
kotwica). Poprawka w bocie: podpozycje `↳` + zakaz zmiany tytułu, który dalej pokrywa grupę.
📊 Zmierzone: 9 zmian nazwy na 47 klastrach w 3 dniach, **2 pogorszyły pokrycie**. Szczegóły i miara
w `FinancialNewsBot/CLAUDE.md`, sekcja „Tytuł istniejącego klastra".
- ⚠️ **DO OBEJRZENIA:** to zmiana promptu, więc miękka. Skrypt pomiarowy da się powtórzyć na historii
  `briefs.json` — jeśli po kilku dniach dalej wychodzą przemianowania gubiące podpozycje, dołożyć
  twardą bramkę pokrycia zamiast kolejnego zdania w prompcie.

## 🔴 10. DUBEL NA X: ręczny post jest NIEWIDZIALNY dla automatu — NIENAPRAWIONE (13.08 wieczór)
Zgłoszenie właściciela ze zrzutu profilu @brifup: **dwa posty o tym samym Terafabie Tesli/SpaceX
w ~26 minut** (19:44 i 20:10 czasu warszawskiego).
- **Automat wypuścił TYLKO JEDEN z nich** — ten o 20:10 („Ruszyła budowa Terafabu Tesli, SpaceX
  i Intela w Teksasie", id `2087965020629959102`, wpis `9/12` w logu Hetznera i w `wyslane_na_x.txt`).
  Zachował się poprawnie: odstęp 62 min, limit 9/12, świeżość OK.
- **Postów z 19:44 (Terafab „największy budynek świata") i 19:46 (crack spread diesla) NIE MA
  ani w logu, ani w stanie bota.** Poszły 2 minuty po sobie, a `XMinOdstepMinut` = 60, więc automat
  fizycznie nie mógł ich wysłać. To ręczna ścieżka: knaga → „Wrzuć na X" → `gotowiec-x` →
  `x.com/intent/post` (`knaga.html`, `otworzX`).
- 🔴 **PRZYCZYNA: `otworzX` nie zostawia ŻADNEGO śladu.** Automat zna wyłącznie własny
  `wyslane_na_x.txt` (plik per-serwer, świadomie poza gitem), więc bramka różnorodności
  `XRoznorodnyWobec` nie widzi ręcznych postów, a licznik dobowy ich nie liczy — realnie na profilu
  może wyjść WIĘCEJ niż `XMaxPostowNaDobe`.
- ⚠️ **To NIE jest za słaba bramka.** Gdyby ręczny post był w pliku, złapałaby go bez zmiany progów:
  te dwa nagłówki mają wysokie podobieństwo rdzeni (próg 0,10) **i wspólny `chart` `SPCX,TSLA`**.
  Nie ruszaj `PROG_X_TEN_SAM_TEMAT` — problem jest w ślepej plamie stanu, nie w mierze.
- ✅ **Sprawdzone i ODPADA: druga instancja automatu.** `bot.yml` nie przekazuje `X_API_KEY`/
  `X_ACCESS_TOKEN`, więc GitHub Actions na X nie publikuje — publikuje wyłącznie Hetzner (cron 30 min).

**Kierunek uzgodniony z właścicielem (13.08, NIC nie zbudowane): warianty 1 i 2 naraz, w tej kolejności
w przepływie — najpierw OSTRZEŻENIE, potem ZAPIS.**
1. **Ostrzeżenie w knadze (2)** — przy „Wrzuć na X" panel mówi, że ta pozycja stoi wysoko w rankingu
   automatu i prawdopodobnie pójdzie sama.
2. **Wspólny stan w Supabase (1)** — po kliknięciu „Otwórz X" knaga dopisuje wpis (slug, tekst,
   `chart`, czas), a bot dokleja te wpisy do historii z `wyslane_na_x.txt`.
- 🔴 **OSTRZEŻENIE JEST W PRZÓD, NIE W TYŁ** — musi wiedzieć „co automat ZARAZ wypuści", nie „co już
  poszło". W incydencie ręczny post był PIERWSZY, więc bramka patrząca wstecz nic by nie dała.
- 🔴 **NIE przepisywać rankingu do JS.** Ranking (`pilne` → `reach` → wielkość klastra → pozycja)
  plus bramki świeżości/`XNudnyAgregatZRaportu`/różnorodności siedzą w `XKandydaci` (`Runner.cs`).
  Druga implementacja rozjedzie się przy pierwszej zmianie progu — ta lekcja jest już kupiona
  (podpowiedzi wątków, 04.08). Zamiast tego **bot publikuje swoją listę kandydatów** do Supabase
  co bieg, knaga tylko czyta i porównuje slug. Czyli 1 i 2 dzielą JEDNĄ rurę, ruch w dwie strony.

**Dwie decyzje OTWARTE — obie zmieniają kod, właściciel ich jeszcze nie podjął:**
- **Kiedy zapisywać ręczny post?** Klik „Otwórz X" otwiera sam intent i NIE dowodzi wysyłki. Zapis na
  klik może uciszyć automat na temat, który nigdy nie wyszedł (cisza, ale bez duplikatu). Alternatywa:
  knaga pyta po powrocie „poszło?" i zapisuje na potwierdzenie — dokładniejsze, ale to klik więcej.
- **Czy ręczny post zjada slot z limitu 12/dobę?** Jeśli tak, wrzutki właściciela obniżają liczbę
  postów automatu; jeśli nie, może wyjść 12 + ile ręcznych.

## ✅ 7. `impact` PRZECZY WŁASNEMU ARTYKUŁOWI — BRAMKA WDROŻONA (16.08, FinancialNewsBot#182)
Znalezione przy zgłoszeniu o nudnym poście SanDiska (dawka wieczorna, poz. 0, `TradingNEWS`):
`article` *„…które **zbiegły się z prognozami**"*, `impact` *„**CPI poniżej oczekiwań**"* — ta wersja
poszła na X. Dotąd linia wpływu nie przechodziła przez żadną bramkę spójności z tekstem pod nią.
- 📊 **Pomiar wykonany zgodnie z planem** (47 dni, 2572 pary impact+article, realne metody z `Bot.dll`):
  klasa KIERUNKOWA („poniżej oczekiwań" × „zgodnie z konsensusem") — **3 trafienia, wszystkie
  prawdziwe, 0 FP**; klasa LICZBOWA (liczba nośna bez pokrycia) — 16 przypadków, w połowie fałszywki
  z zaokrągleń („904" vs „903,86") + jedna czysta fabrykacja (Caterpillar +41% pod newsem o SpaceX).
- **Wdrożone: `SprawdzSpojnoscImpactu`** — prefiltr (regexy kierunkowe + liczby z TOLERANCJĄ
  ZAOKRĄGLEŃ wobec facts+article+nagłówka) → werdykt modelu PRZECZY/MILCZY (etap
  `brief-impact-rozjazd`, fail-safe MILCZY) → cięcie ogona wyjaśnienia po myślniku albo `impact=null`.
  Wpięte na końcu `DeepSeekWriteArticle`, kryje Haiku i DeepSeeka. Szczegóły + zasady odczytu
  liczników `impact_rozjazd_*`: `financialnewsbot/CLAUDE.md`, sekcja „`impact` nie może przeczyć…".
- ⚠️ **Nietestowane na żywym DeepSeeku** — po deployu obejrzeć log `ROZJAZD IMPACT/TREŚĆ` i proporcje
  liczników (podejrzeń ~0,4/dzień to norma z pomiaru; „potwierdzony" ≈ suma podejrzeń = prompt
  werdyktu za szeroki).
- ⚠️ **Czego bramka NIE łapie (świadomie):** doklejenia CPI jako PRZYCZYNY ruchu jednej spółki
  w `article` (druga połowa zgłoszenia SanDiska — to wada opisu, nie linii wpływu) ani błędnego
  KIERUNKU strzałki bez sprzeczności słownej (kierunek to osąd rynkowy modelu, nie weryfikowalny fakt).

## ⬜ 8. Jednoźródłowy news jako TOP STORY — do rozważenia (13.08)
Ta sama pozycja SanDiska miała **`reach` = 1** i źródło `tradingnews.com` (blog giełdowy, w slugu URL
literówka „jumnps"), a mimo to stanęła na `items[0]` dawki wieczornej i wygrała ranking automatu X
(`pilne` → `reach` → wielkość klastra → pozycja — pozycja 0 wygrywa mimo `reach` 1).
- To NIE jest bug, tylko konsekwencja rankingu. Otwarte pytanie redakcyjne: czy top story powinno mieć
  próg `reach`, czy raczej listę źródeł, które nie kwalifikują się na kotwicę.
- ⚠️ Przed zmianą rankingu **przemierz go** — repo ma na to harness (`X_SYMULACJA`), a zasada
  „zmieniając miarę, przemierz KAŻDY próg" była już raz kupiona drogo (podpowiedzi wątków, 04.08).

## ⬜ 9. Personalizacja feedu — ROZMOWA PROJEKTOWA, nic nie zbudowane (13.08)
Właściciel: *„zapamiętaj tę rozmowę, wrócimy do niej później"*. Kierunek wybrany: **przycisk
„nie pokazuj mi" pod każdym postem**, a w nim zaawansowane kategorie („nie pokazuj mi wyników
kwartalnych"). Uznane za LEPSZY pierwszy krok niż lajk/dislajk — jawne, czytelne i odwracalne.
- ✅ **Manualny wybór per temat JUŻ DZIAŁA** — `brifup_cat_pct`, suwak „top X% tematu", `meatScore`,
  `filterByCatMeat`, z podłogą (top story zawsze, min. 1 na temat). To jest połowa zadania.
- **Do dołożenia: druga oś `typ`** (kształt newsa), PROSTOPADŁA do `category` (temat). Połowę
  kształtów da się oznaczyć **za darmo** regexami, które już są i już są zmierzone
  (`_metrykaWyniku`+`_porownanieDoKonsensusu`, `_agregatZRaportu`, `_akcjaAnalityka`,
  `_decyzjaBankuCentralnego`, `_izbyParlamentu`, `_ruchKursuWNaglowku`, `_prawyboryUSA`).
  Resztę (premiera, M&A, katastrofa, sondaż) — od modelu w JSON selekcji, wzorcem `kategoria` z 17.07.
- **Menu: 5 z 6 osi już jest w danych** — `category`, `flag`, `chart`, `source_name`, saga; brakuje `typ`.
- **Wycena:** `typ` z regexów + menu + panel ukrytych ≈ 2 sesje; `typ` od modelu +1; zliczanie do
  Supabase +1. Konta i synchronizacja między urządzeniami — osobne 2-3 sesje i głównie decyzja
  PRODUKTOWA. Collaborative filtering — bez sensu poniżej tysięcy użytkowników.
- ⚠️ **Odwracalność ważniejsza od filtra** (jedno miejsce „ukryte przez Ciebie: … ×"), `pilne` (🚨)
  niechowalne żadną osią, zamknięta lista NAJPIERW front POTEM bot, archiwum bez `typ` → fallback.
- 🔴 **Sygnały czytelników NIE MOGĄ karmić selekcji bota** — agregat „N osób schowało X" to informacja
  dla właściciela, nigdy automat do `WSPOLNE_ODRZUCENIA`. Ta sama granica co „X bot ma inne reguły".
- ⚠️ **Nie ruszać `meatScore`** (4 wywołania, w tym widoki cross-day) — blendować w funkcji NAD nim.

## 🔴 AUTOMAT PUBLIKUJĄCY NA X — 🟢 DZIAŁA NA PRODUKCJI od 12.08 20:15

Właściciel: *„da rade zrobic skrypt zeby mi sam posty z brifup na x dawal?"*. Decyzja: **automat
wybiera i publikuje sam**, plus osobno **przycisk na feedzie tylko dla właściciela**.
Format posta: **B+C** — nagłówek + jedno konkretne zdanie z artykułu + linia wpływu, gdy news ją ma.
**Bez linku** (tekst $0,015, z linkiem $0,20 — 13× drożej).

### ✅ CO JUŻ DZIAŁA (nie odtwarzaj tego)
- **Klucze X na Hetznerze** — OAuth 1.0a, cztery zmienne `X_API_KEY`/`X_API_SECRET`/`X_ACCESS_TOKEN`/
  `X_ACCESS_SECRET` w `/root/bot_secrets.env`, z `export`. Wpisywarka: `/root/dodaj_klucze_x.sh`.
- **OAuth 1.0a DZIAŁA na pay-per-use** — zweryfikowane na żywo: `GET /2/users/me` → 200 (@brifup,
  id 2083551034404700160), `POST /2/tweets` → 201. ⚠️ Dokumentacja endpointu wymienia dziś tylko
  OAuth 2.0 i to jest mylące — 1.0a działa i jest lepszy (tokeny nie wygasają).
- **`gotowiec-x` przyjmuje klucz `service_role`** (front #146, WDROŻONE) — bot dostaje ten sam
  gotowiec co knaga. Zweryfikowane z serwera.
- **Bot #156** — `XOpublikujPost`, `XPct`, `PierwszeEmoji`, `BezEmoji`, tryb `X_DIAG=true`.
- **Kredyt kupiony.** Minimalne doładowanie $10, bez abonamentu, kredyty nie wygasają.
  Przy 4 postach/dobę to ~$1,80/mies (~7 zł).

### ✅ PUNKTY 1-5 ZROBIONE I URUCHOMIONE 12.08 (bot #157–#162)
Wybór kandydata, bramka różnorodności, `wyslane_na_x.txt`, bezpieczniki i pomiar na archiwum —
wszystko w `Runner.cs`, szczegóły w `FinancialNewsBot/CLAUDE.md`, sekcja „Automat publikujący
na X — warstwa druga".

**USTAWIENIA KOŃCOWE (wszystkie decyzje właściciela z 12.08):**

| co | wartość | skąd ta liczba |
|---|---|---|
| postów na dobę | **4**, max 1 na bieg | decyzja właściciela („3-4 najlepsze dziennie") |
| odstęp | **150 min** | rozkłada posty w oknie, bo cron chodzi co 30 min |
| okno publikacji | **7:00–23:00** | bez niego posty schodziły o 22:30 / 01:00 / 03:30 |
| świeżość | **1 h** od `added_at` | zgłoszenie „to nie jest świeże"; pomiar: 3,98 posta/dobę nawet przy 0,5 h |
| budżet znaków | **270** | pierwszy post miał 283 i wpadł pod „Pokaż więcej" (~280) |
| spójność klastra | mediana ≥ **0,30** | poniżej → publikujemy pojedynczą podpozycję, nie parasol |

🟢 **WŁĄCZONY:** `export X_AUTO=true` w `/root/bot_secrets.env` (kopia sprzed zmiany:
`/root/bot_secrets.env.bak-przed-xauto`). **Wyłączenie = usunięcie tej linii, działa od razu.**
⚠️ Bez tej zmiennej automat wychodzi **całkowicie po cichu, bez linii w logu** — więc „zero wpisów
`[X]`" znaczy „wyłączony", a nie „zepsuty". Diagnozując, sprawdź to NAJPIERW.

✅ **Pierwszy post: 12.08 20:15**, id `2087603956079804856`. Cały łańcuch przeszedł (ranking →
bramki → `gotowiec-x` z kluczem `service_role` → publikacja → zapis stanu).

**Tryby do diagnozy (na Hetznerze, `set -a; source /root/bot_secrets.env; set +a`):**
- `X_SUCHY=true` — realny wybór i realny gotowiec, ZERO wysyłki. Kluczy X nie wymaga.
- `X_DAWKA=morning|afternoon|evening` — podgląd innej dawki, działa TYLKO z `X_SUCHY`.
- `X_SYMULACJA=true` — pomiar reguły na archiwum, bez sekretów, działa też z Maca.
- `X_KLASTRY=true` — histogram spójności klastrów.

📊 **Pomiar z punktu 5 — 42 dni archiwum, 124 posty w każdym wariancie:**

| wariant | najdłuższa seria o tym samym temacie | najpodobniejsza para sąsiadów |
|---|---|---|
| BAZA — top story każdej dawki | **4** (Iran/Ormuz) | J = **1,000** |
| KONTROLA — sam ranking, BEZ bramki | **2** | J = 0,571 |
| REGUŁA — ranking + bramka | **1** | J = 0,091 |

Czyli **tak, seria spada z 4 do 1**. 🔴 Ale wariant KONTROLNY zmienia interpretację: serię łamie
głównie **ranking po całej dawce** (4→2), a bramka domyka resztę (2→1) — odrzuca tylko 8 kandydatów
na 124 sloty. Domyka za to dosłownie obawę właściciela: „xAI zmienia nazwę na SpaceXAI" × „SpaceX
przejmuje xAI i zmienia nazwę na SpaceXAI". Harness zwalidowany bazą — odtworzył pomiar z 12.08
co do liczby (124 posty, seria 4, ta sama para o Ormuzie).

📊 **PROFIL POSTÓW — trzy poprawki po drodze, każda go polepszyła:**

| etap | pilnych 🚨 | z wykresem |
|---|---|---|
| BAZA (top story) | 24 | 17 |
| sam ranking | 70 | 10 |
| + świeżość 3 h | 46 | 12 |
| + bramka klastra | 36 | 14 |
| **+ świeżość 1 h (stan końcowy)** | **23** | **15** |

Czyli automat wrócił do normalnego profilu bazy (24 pilne), ale z serią **1 zamiast 4**.
⚠️ Ostrzeżenie „automat będzie wrzucał głównie pilne" z pierwszej wersji **jest już nieaktualne** —
zdezaktualizowały je uwagi właściciela o świeżości i o klastrach. Gdyby jednak wróciło:
**przestaw kolejność kluczy rankingu (`pilne` jest pierwszy), nie ruszaj bramek.**

⚠️ Próg tekstowy bramki zjechał **0,18 → 0,10** (0,18 nie odrzucał niczego, patrz pomiary niżej),
ale z warunkiem wspólnego rdzenia NOŚNEGO — bez niego dwa dowolne newsy „o pieniądzach" blokowałyby
się przez `dolar`/`wzrosł`.

⚠️ Przy okazji: **`Senat` wyrzucony ze słownika „krajowych"** — na 4490 itemach dał 6 trafień
i wszystkie dotyczyły Senatu USA. Ta sama klasa co znany zakaz `PO`/`KO`.

### ⬜ CO ZOSTAŁO
6. **Przycisk na feedzie** (`index.html`, bramka właściciela jak przy `adminDeleteItem`) + publikacja
   przez **NOWĄ** Edge Function. ⚠️ Schowanie przycisku to NIE zabezpieczenie — klucze X nie mogą
   trafić do przeglądarki, więc sama funkcja jest tu połową roboty (`gotowiec-x` tylko GENERUJE
   treść, nie publikuje). Automat z punktów 1-5 tego nie obejmuje i nie zastępuje.

### ⬜ OTWARTE PO URUCHOMIENIU (drobne, żadne nie blokuje)
- **Post klastrowy potrafi być wyliczanką** — bramka spójności 0,30 tnie parasole, ale gdy klaster
  PRZEJDZIE i mimo to wyjdzie lista, zostają dwie drogi: zawęzić prompt klastrowy w `gotowiec-x`
  albo podnieść próg. ⚠️ **Rusz próg w GÓRĘ, nie w dół** — rozkład nie ma doliny, więc próg wynika
  z asymetrii kosztów, nie z separacji (szczegóły w `FinancialNewsBot/CLAUDE.md`).
- **Próg „Pokaż więcej" ~280 znaków NIEZWERYFIKOWANY** — liczba pochodzi z notatki w repo, nie
  z pomiaru. Na @brifup wisi post na **283 znaki** (ten pierwszy, 20:15): jeśli widać go w osi czasu
  w całości, budżet 270 można podnieść. Jeden rzut oka rozstrzyga.
- **Świeżość mierzy `added_at` (czas NASZEJ publikacji), nie `published_at` (czas źródła).** Tak
  brzmiało życzenie („było U NAS na brifupie"), ale news bywa świeży u nas i mieć kilka godzin
  u źródła — pierwszy post: my 17:18, źródło 15:22. Gdyby przeszkadzało, dołóż drugi warunek.
  ⚠️ `published_at` NIE MAJĄ starsze itemy ani feedy bez `pubDate`, więc fail-closed uciąłby je wszystkie.

### 📊 POMIARY, KTÓRE ZDECYDOWAŁY O PROJEKCIE (nie licz ich od nowa)
- **Symulacja „publikuj top story każdej dawki" na 43 dniach = 124 posty:** najdłuższa seria o tym
  samym temacie to **4 POSTY POD RZĄD** (Iran/Ormuz, 14-15.07), jedna para miała **J = 1,00** (dwa posty
  o dosłownie identycznej treści). Obawa właściciela („nie chcę 4 postów pod rząd o SpaceX") jest
  zmierzona, nie hipotetyczna. Zderzeń ogólnie mało (4,1% par), ale **kumulują się w kryzysach**.
- 🔴 **`category` i `chart` NIE NADAJĄ SIĘ na sygnał różnorodności:** **72 ze 124 top story mają
  `category: null`**, `chart` ma tylko ~25 ze 124 (parasole klastrów tych pól nie niosą). Reguła oparta
  na kategorii milczałaby w 58% przypadków i nikt by tego nie zauważył. **Sygnałem są RDZENIE nagłówka.**
- 🔴 **Top story to zły kandydat** — w kryzysie jest z definicji o tym samym przez trzy dni. Dawka ma
  ~20 pozycji, więc jest z czego wybierać.
- **Test na 78 kandydatach z 12.08:** bramka instrumentu odrzuciła 2 newsy o Iranie/ropie, natomiast
  **Jaccard 0,18 na nagłówkach nie odrzucił NICZEGO** — „Iran produkuje rakiety" i „brak rozmów Iran-USA"
  to inne słowa, ta sama historia. ⚠️ **Próg tekstowy trzeba obniżyć i przemierzyć**, bo dziś działa
  faktycznie jedna z dwóch bramek.
- ⚠️ **`reach` premiuje polski mainstream** — 5 z 8 wybranych to sprawy krajowe (NFZ, ZUS, sondaż).
  Właściciel chce miksu → potrzebna kwota krajowe/zagraniczne.
- **Detektor „krajowy" = flaga 🇵🇱** (19,2% z 3470 itemów, flagę ma 100% pozycji) + wąski słownik
  instytucji (NFZ/ZUS/GUS/UOKiK/KNF/NBP/RPP/GPW/Sejm/JSW/Orlen…), który dokłada 6 pozycji, wszystkie
  poprawne. 🔴 **NIE dawaj do słownika `PO` ani `KO`** — przy `IgnoreCase` `PO` łapie przyimek „po"
  i „USA wznawiają płatności **po** miesiącach" wychodzi jako news krajowy (zmierzone: 27,1% zamiast 19,3%).

### ⚠️ PUŁAPKI ZŁAPANE PO DRODZE
- **X odrzuca posty z >1 emoji przy „Boost"** — automat musi używać `PierwszeEmoji`/`BezEmoji` (są w bocie).
  Testowy post z 12.08 miał dwie flagi (`🇺🇦🇷🇺`) i przeszedł, bo to ograniczenie dotyczy Boostu, nie publikacji.
- **Odczyty w X kosztują osobno ($0,005), bez darmowej puli** — ścieżka ma zostać CZYSTO ZAPISOWA.
- **Publikacja bez linku wymaga, żeby post niósł całą wartość** — sam nagłówek to ślepy zaułek.

## ✅ Co zrobiono 2026-08-13 (wieczór) — trzy zgłoszenia właściciela

**bot #170 — nagłówek MUSI nazwać podmiot z nazwy.** Zgłoszenie: *„nie ten kraj tylko Rumunia, znowu
clickbaitowy nagłówek"* — kafel „Susza uderza w energetykę jądrową. **Ten kraj** wyłącza ostatni
reaktor" przy artykule o Cernavodzie. Trzeci kształt rodziny „nagłówek nie nazywa rzeczy", wpięty
w `NaprawNaglowekBezKonkretu` jako `_anonimowyPodmiotWskazujacy` + warstwa w prompcie selekcji.
Zmierzone realnym regexem z `Bot.dll` na 5353 nagłówkach: **4 trafienia (0,07%), ~0,09 wywołania
modelu na dobę**, zero nachodzenia na dwa istniejące prefiltry. Świadomie bez gołego „to" (kopula).

**front #165 — poprawka kafla w danych.** Nowy tytuł: „Rumunia wyłącza ostatni reaktor w Cernavodzie
przez rekordowo niski poziom Dunaju", flaga `🚨` → `🇷🇴`.
- ⚠️ **`🚨` to JEDYNY nośnik statusu `pilne`** — `XCzyPilne` czyta go z pola `flag`, osobnego pola
  w `briefs.json` NIE MA. Podmiana zdjęła pozycji pilność (decyzja właściciela: „nie jest pilna").
  Diagnozując „dziwną flagę", sprawdzaj NAJPIERW, czy to nie znacznik pilnego.
- ⚠️ Slug `1bk3248` → `1a21p99`: stary stub osierocony (wygaśnie po 14 dniach), nowy powstaje przy
  najbliższym biegu. Zsynchronizowany węzeł sagi i wpis w `seen` w `threads.json`.
- 🔴 **Poprawkę danych trzeba było przenosić na świeży `main` TRZY RAZY** — bot dopisał w międzyczasie
  27 commitów i PR robił się `CONFLICTING`. **To jest reguła, nie wyjątek:** przy każdej ręcznej
  poprawce `briefs.json` licz się z przeniesieniem między przygotowaniem a mergem.

**bot #171 — X nie publikuje agregatów z raportu.** Zgłoszenie pod postem @brifup: *„niech bot nie
dodaje takich nudnych wyników jak to"* („Sandisk: ośmiu klientów odpowiada za 93,9 mld USD wartości
kontraktów" — pozycja księgowa, nie zdarzenie).
- 🔴 **Filtr WYŁĄCZNIE po stronie X**, po uwadze właściciela *„pamiętaj że to X bot jest na innych
  regułach niż main"*. Pierwsza wersja dopisywała klauzulę do `WSPOLNE_ODRZUCENIA` i **została
  cofnięta** — news zostaje na brifup.com, po prostu nie kandyduje na post.
- ⚠️ **`XKandydaci` nie miało dotąd ŻADNEGO filtra redakcyjnego** (tylko świeżość, obecność artykułu
  i ranking), czyli automat dziedziczył wszystko z dawki. To pierwszy filtr własny tej ścieżki.
- Zmierzone na 5374 pozycjach: **2 trafienia, oba w klasie**; kontrola na 118 pozycjach o kontraktach —
  tnie te 2, ani jednej realnej umowy. ⚠️ Nigdy `\bRPO\b` (to Rzecznik Praw Obywatelskich).

## ✅ Co zrobiono 2026-08-12 (wieczór) — FRONT, przy okazji automatu X

Trzy zgłoszenia właściciela, wszystkie zmergowane i **potwierdzone na produkcji** (nie tylko w repo).
Szczegóły w `CLAUDE.md` frontu; tu tylko to, co trzeba wiedzieć na start.

- **Knaga otwiera się na AKTUALNEJ dawce** (front #149). `currentDose` było zaszyte na `'morning'`.
  🔴 **Godzina liczona w `Europe/Warsaw`, NIE lokalnie w przeglądarce** — złapane PRZY WERYFIKACJI:
  maszyna deweloperska chodziła na `Europe/London`, więc `getHours()` dawało 19 przy warszawskiej 20
  i przy granicy panel wybrałby POPOŁUDNIOWĄ, gdy bot pisze już do WIECZORNEJ. Rozjazd trwałby
  godzinę przy każdej granicy, codziennie. Ustawiane RAZ przy wczytaniu, bez przełączania na żywo.
- **Pastylka PILNE tylko na desktopie** (front #150). Życzenie: *„usuń to na mobilnej, na PC zostaw"*.
  `aktualizujPilne` nie dotyka już `.live-pill` w ogóle. ⚠️ **Nie da się tego zrobić samym CSS-em** —
  JS podmieniał `innerHTML`, więc ukrycie zostawiłoby pastylkę z treścią PILNE pod spodem.
- 🔴 **Koniec fałszywego mrugania kafli** (front #151). Zgłoszenie: *„na PC cały czas mrugają te
  posty… fałszywy alarm"*. **`_flashedItems` — strażnik przed powtórnym błyskiem — trzymał `it.id`,
  a `pollLiveUpdates` nadaje itemom NOWE `id: uid()` przy każdym live-updacie.** Po każdym zapisie
  bota strażnik nie trafiał i wszystko nowsze od progu sesji błyskało od nowa; efekt narastał, bo
  `sessionNewThreshold` stoi na chwili wejścia. Klucz to teraz **slug**. `it.id` zostaje wyłącznie
  do znalezienia elementu w DOM — te dwie role były zmieszane i stąd błąd.

## ⚠️ PUŁAPKI ZŁAPANE 12.08 — nie wdepnij drugi raz

- 🔴 **Pomiar dający 100% dla KAŻDEGO wariantu to nie wynik, tylko zepsuta miara.** Pierwszy pomiar
  świeżości („124/124 slotów ma kandydata nawet przy 1 h") przyjmował „teraz" = najnowszy `added_at`
  w dawce, więc pozycja w wieku 0 h istniała ZAWSZE. Odczytałem to jako „1 h jest ryzykowne",
  dołożyłem zapas do 3 h — i to wypuściło nieświeży post na produkcję. Pomiar wierny (tiki co 30 min
  z zegara) pokazał, że nawet 0,5 h daje 3,98 posta/dobę.
- ⚠️ **Klucz strażnika musi przeżyć re-render.** Cokolwiek pamiętasz „żeby nie zrobić czegoś drugi
  raz", nie klucz tego po wartości nadawanej przy renderze (`uid()`). Ta sama klasa co błysk kafli.
- ⚠️ **Tytuł parasola klastra dzieli słowa z KAŻDĄ podpozycją** — jest tak napisany, żeby je objąć.
  Mierząc spójność klastra, porównuj podpozycje ZE SOBĄ. Ta sama pułapka co `CzyZapowiedzWieluTematow`.
- ⚠️ **`gh pr merge` potrafi odbić się o „not mergeable" tuż po pushu** — GitHub nie zdążył przeliczyć
  stanu. Sprawdź `gh pr view <nr> --json mergeable,mergeStateStatus` i ponów, zamiast szukać konfliktu.
- ⚠️ **`dotnet build | grep -E "error|Build succ" && <uruchom>`** przepuszcza uruchomienie przy
  NIEUDANYM buildzie (grep kończy się sukcesem, bo COŚ znalazł) — odpala się wtedy stary `Bot.dll`.
  Bramkuj kodem wyjścia builda, nie wynikiem grepa.

## 🔴 CO OBEJRZEĆ PO NAJBLIŻSZYCH BIEGACH — z sesji 11.08

- 🔴 **SPCX tylko przy realnych newsach SpaceX** (bot #148). FAKT AKTUALNY o tickerze SPCX w promptach
  impactu zadziałał jak PRIMING — pierwszy bieg po deployu (11.08 23:10) dokleił „↑ SPCX, ↑ Nasdaq 100"
  do newsa o ANTHROPICU i trzech kolejnych (CoreWeave, Golden Dome ×2). Dane naprawione ręcznie
  (`0b9e77b1`), bramka `SpacexJestTematemNewsa` wdrożona. Sprawdzić w nowych dawkach: SPCX ma się
  pojawiać wyłącznie, gdy spacex/starlink/starship/grok pada w nagłówku albo artykule.
- **Strony sag `w/` przepiszą się przy najbliższym NOWYM dniu archiwum** (~57 plików jednym commitem —
  to OCZEKIWANE po #147, nie awaria). Po przepisaniu tapnąć etap na dowolnej stronie sagi: ma się
  rozsunąć skrót ze źródłem i przyciskiem „Otwórz news →", nie przekierować do archiwum.

- 🔴 **BIAŁY EKRAN PWA — poprawka jest na produkcji, ale ZADZIAŁA DOPIERO po zainstalowaniu SW v94+.**
  Właściciel zgłosił: „czasami po otwarciu apki na Androidzie muszę zrestartować". Przyczyna
  udowodniona eksperymentem: gałąź nawigacyjna SW oddawała `undefined` (pusty cache + padnięta sieć),
  a `respondWith` z czymś, co nie jest `Response`, kończy nawigację BŁĘDEM — w PWA to czysta biel bez
  żadnego skryptu, który mógłby ją naprawić (watchdog siedzi w `index.html`, którego nie ma).
  **Jeśli biel wróci PO wejściu v94+, kolejnym podejrzanym jest OneSignal**, nie service worker.
- **Liczniki nowych bramek w `brief_health`** — `bramka_wyniki_kwartalne_w_metrykach`,
  `bramka_prognoza_wyborcza`, `naglowek_zajawka_zdjeta`, `impact_spacex_prywatny_zdjety`.
  ⚠️ Ten ostatni jest **testem warstwy promptowej**: jeśli rośnie tak samo szybko jak przed wdrożeniem,
  znaczy że model ignoruje „FAKT AKTUALNY" o giełdowym SpaceX i problem jest w prompcie, nie w bramce.
- **`quotes.json`: SPCX, PALLAD, PLATYNA** — serie dopisałem RĘCZNIE danymi z Alpaki/Yahoo, żeby kafle
  były widoczne od razu. Bot nadpisze plik przy pierwszym biegu z nową mapą; sprawdzić, czy nie zniknęły
  (zniknięcie = symbol nie trafił do `potrzebne`, czyli coś jest nie tak z mapą, nie z danymi).
- **Baner instalacji na iPhonie** — gałąź iOS jest nowa i nietestowana na realnym Safari (panel podglądu
  nie obsługuje instalacji PWA). Sprawdzić na telefonie: od DRUGIEGO wejścia ma wyskoczyć pasek
  „Udostępnij → Do ekranu początkowego", bez przycisku „Dodaj".

## ✅ Co zrobiono 2026-08-11/12 (druga sesja nocna) — wątki + luka SPCX

- **Wątki chronologicznie od góry** (front #140, SW v98): `watki.html` zaczyna każdą oś od NAJSTARSZEGO
  etapu; zwijany jest ŚRODEK osi (widoczny początek + 2 najnowsze etapy + znacznik „… N etapów pośrodku").
  ⚠️ To ODWRACA decyzję z 07.08 „najnowszy na górze" — ale tylko dla `watki.html` i strony sagi;
  oś pod postem i karta `og?w=1` zostają z najnowszym na górze.
- **Strona sagi `w/<slug>.html`: klik w etap rozsuwa skrót** (bot #147) — `<details>`/`<summary>`,
  zero JS; skróty dociągane z archiwum raz na dobę (`WczytajDzienArchiwum` + `SkrotEtapu` z regułą
  kotwicy klastra). Link do pełnego newsa został W ŚRODKU rozsuniętego bloku.
- **Luka SPCX zamknięta** (bot #148 + dane `0b9e77b1`) — szczegóły w bloku „CO OBEJRZEĆ" wyżej.

## ✅ Co zrobiono 2026-08-11 (wieczór i noc) — sesja zgłoszeń właściciela

Dziewięć zmian na produkcji, wszystkie ze zgłoszeń „to mi nie pasuje". Kolejność jak w rozmowie.

**Kafle notowań przestały pokazywać nie ten instrument.**
- **Para walutowa musi być TEMATEM newsa** (bot #141). Pod newsem o rosyjskim ataku na hutę stał wykres
  EUR/PLN, bo linia wpływu kończyła się dopiskiem „polska waluta słabnie na niepewności". 📊 Zmierzone:
  **17 z 76 linii wpływu ze SpaceX** i **133 ze 222 par walutowych** to taki dopisek, nie wskazanie
  instrumentu (Geopolityka 62, Wojna w Iranie 12, Wojna na Ukrainie 8). Kryterium: waluta musi paść
  w nagłówku albo artykule; bezpiecznik na NBP/EBC/RPP/stopy ratuje newsy monetarne bez nazwy waluty.
- **Ticker SpaceX `SPCX`** (bot #142) — to było **sprostowanie faktu, nie poszerzenie mapy**: komentarz
  z 07.08 wykluczał SpaceX zdaniem „spółka jest prywatna", a **nasze własne archiwum** opisało jej debiut
  12.06.2026 i wejście do Nasdaq-100. 82 pozycje zyskały trafniejszy instrument, zero straciło.
- **„(private)" przy SpaceX zdejmowane z linii wpływu** (bot #143) — 17 z 76 wzmianek, w 14 wariantach.
  Prompt + bramka, bo sam prompt nie wystarcza.
- **Pallad i platyna** (`PA=F`, `PL=F`) oraz **polska odmiana w mapie** (bot #144) — news o wierceniach
  w złożu palladu dostawał wykres ZŁOTA, bo mapa znała z trzech metali tylko złoto. Przy okazji: news
  o kursie FRANKA dostawał EUR/PLN, bo słownik zna wyłącznie formę podstawową.

**Bramki na klasy, które przeciekały mimo reguł** (bot #145, #146) — wyniki kwartalne w metrykach
i prognozy wyborcze. Szczegóły i wyjątki: `FinancialNewsBot/CLAUDE.md`. **16 odrzuceń na 5012 nagłówków.**

**Front.**
- **Biały ekran PWA** (#132, SW v94) — patrz blok „CO OBEJRZEĆ" wyżej.
- **Baner instalacji: iOS + termin ważności „Nie teraz"** (#135, v95). Na iPhonie nie było ŻADNEJ
  podpowiedzi, bo `beforeinstallprompt` to API Chromium. „Nie teraz" wyciszało baner na zawsze — teraz
  30 dni, a zabytek `'1'` przepisujemy na DZIŚ, żeby nie wrócił wszystkim naraz.
- **Wątek na X** (#136 v96, #137 v97) — kwadratowa karta `w=1&pelna=1` z historią sagi (wysokość liczona
  z treści, liczba etapów dobierana do sufitu 1200 px), tekst do pierwszego posta składany
  deterministycznie z `threads.json`, oraz **linki do 1. etapu i do całej sagi**.
- **Dane dzisiejszych dawek** przepięte na nowe reguły (#129, #130, #131, #133, #134).

## ⚠️ PUŁAPKI ZŁAPANE 11.08 — nie wdepnij drugi raz

- 🔴 **Porównuj KOD Z KODEM, nie kod z zapisanymi danymi.** Pierwszy pomiar instrumentów pokazał 32 zyski
  i wyglądał świetnie — porównywał nowy kod z polem `chart` zapisanym w archiwum, czyli z wynikiem sprzed
  WSZYSTKICH zmian tego dnia. Uczciwe porównanie stary vs nowy `Bot.dll` dało **2 zmiany, zero strat**.
- 🔴 **Tekst węzła sagi NIE JEST kluczem trwałym.** Zmierzone na czterech sagach: dla jednej slug policzony
  z tekstu węzła **nie istnieje w archiwum żadnej dawki** — bot przepisuje nagłówki po publikacji, a węzeł
  zachowuje tekst z chwili dopięcia. Cokolwiek adresujesz slugiem z `threads.json`, **sprawdź istnienie**.
- 🔴 **Panel podglądu ZAMRAŻA animacje CSS** — `getComputedStyle` zwracał wartość początkową nawet po
  ustawieniu `transform` inline. To nie kaskada, tylko strona w tle. Diagnozując: najpierw `transition: none`.
- ⚠️ **`w=1&pelna=1` wymaga deployu funkcji `og`** (`supabase functions deploy og --no-verify-jwt
  --project-ref utmvokfjvrthvcmxzowc`) — nie idzie przez git. Wdrożone z repo 11.08.

## ❌ ODRZUCONE 11.08 — zmierzone i NIE warte robienia (nie odgrzewaj)

- **Polskie nazwy walut jako osobne klucze mapy** — „frank" 0 wystąpień w liniach wpływu, „korona" 0,
  „funt" 4, z czego **dwa to funt LIBAŃSKI**. Zrobione mimo to na życzenie właściciela, ale wartość
  jest w ścieżce fallbacku na tytuł, nie w liniach wpływu.
- **Zdejmowanie sufiksu portalu z nagłówka** („| ITReseller") — **3 realne przypadki wobec 24 atrybucji**,
  których ruszyć nie wolno („– Ushakov", „– NYT", „– KCNA" mówią KTO to powiedział).
- **Łapanie duplikatu między dawkami przez próg podobieństwa** — para „Bank centralny Rosji zezwala na
  handel Bitcoinem" × „Rosja zezwoliła na regulowany obrót kryptowalutami" ma **0,133** przy progu 0,18.
  Zmierzone lekarstwa: próg 0,13 = **+163% wywołań modelu**; miara zawierania ≥0,60 = tania (+1%), ale
  **tej pary nie łapie** (0,40). Te nagłówki dzielą dwa rdzenie — żadna miara leksykalna tego nie złapie
  za rozsądną cenę. Realnym lekarstwem byłby sygnał semantyczny, czyli decyzja o koszcie na każdy bieg.

## 🔴 Co obejrzeć po najbliższych biegach (to są pomiary, nie kosmetyka)

- **`przyrost_WIG20` w `brief_health`** — notatka z liczbą punktów serii. Ma rosnąć o 1 dziennie.
  Jeśli stoi na 1 przez kilka dni: albo Yahoo przestał oddawać `WIG20.WA`, albo scalanie nie
  widzi starego `quotes.json`. Pełny wykres (30 sesji) dopiero ok. 20.09 — **do tego czasu kafla
  WIG20 NIE MA i to jest zapowiedziany koszt, nie usterka** (front wymaga ≥2 punktów).
- **Reguła postaci-topki (#134)** — czy nie zaczęły przechodzić plotki o miliarderach spoza
  biznesu. Jeśli tak: **zawęź listę nazwisk, nie kasuj wyjątku**.
- **Kody odrzuceń po #133** — czy zniknęły kody `tech-nowinka`/`ciekawostka` (to były nazwy
  kategorii MILE WIDZIANYCH użyte jako powód odrzucenia) i czy duże premiery przechodzą.
- **BBC Science po zawężeniu reguły (#128)** — jeśli przez tydzień dowiezie ~0 newsów, to znak, że
  feed nie zarabia na siebie. ⚠️ Właściciel powiedział „wybacz BBC Science", czyli **feed ZOSTAJE** —
  nie proponuj ponownie jego usunięcia.
- 🔴 **Chrome/VPN — PRZYCZYNA ZNALEZIONA I NAPRAWIONA 10.08 wieczorem, ZOSTAJE DO POTWIERDZENIA
  NA ŻYWEJ STRONIE.** Właściciel zgłosił, że problem wraca mimo poprawki #120 i mimo wyłączonego
  VPN-a. Przyczyną nie były HEAD-y ani tunel: **`loading="lazy"` na zdjęciach artykułów nic nie
  odraczało**, bo `.card-expand` ma `display:none` (obrazek bez pudełka layoutu jest pobierany od
  razu). Zmierzone na produkcji: **33 zdjęcia z ~25 obcych domen w chwili wczytania strony**, przy
  44 hostach w całej dawce. Pula gniazd i DNS w Chrome są wspólne dla profilu, więc to zapychało
  całą przeglądarkę, a wyłączenie VPN-a nie czyściło ani gniazd, ani nieudanych wpisów DNS —
  robiło to dopiero „wyczyść dane przeglądania". Poprawka: `data-src` + podstawienie `src`
  w `setCardOpen` (0 obcych hostów przy wczytaniu, jedno zdjęcie na otwarty artykuł).
  Szczegóły i zasada: `CLAUDE.md`, sekcja „Zdjęcia artykułów ładowane DOPIERO PRZY OTWARCIU karty".
  ⚠️ **Do sprawdzenia przez właściciela:** czy po tym wydaniu (SW v93) problem znika BEZ czyszczenia
  cache'u. Jeśli wróci mimo tego — kolejnym podejrzanym jest OneSignal, nie zdjęcia.

---

## ✅ Co zrobiono 2026-08-10 (dzień + wieczór) — duża sesja notowań i higieny

**Notowania przestały jechać na funduszach zastępczych.** Zgłoszenia właściciela: „wig20 to jest
epol, a nie powinien tak być", „index nasdaq to qqq też nie powinien być", „nie znalazło akcji
GameStopu". Mapa instrumentów podstawiała ETF-y pod indeksy, bo Alpaca oddaje wyłącznie papiery
z USA. Nowe źródło **Yahoo** (bez klucza, testowane Z HETZNERA) zdjęło to ograniczenie:
- spółki GPW w złotych (Orlen, KGHM, PGE, Tauron, PKO BP, Pekao, PZU, CD Projekt, Dino),
- indeksy WPROST: KOSPI, Hang Seng, Nikkei 225, DAX, FTSE 100, Shanghai (były EWY/EWJ/EWG/ASHR),
- Samsung i SK Hynix (Seul), plus brakujące spółki z USA (Boeing, Berkshire, GameStop, eBay,
  Chevron, Visa, Archer) — te istniejącą ścieżką Alpaki.
📊 Pokrycie artykułów z linią wpływu **82,8% → 88,8%**, 28 pozycji zyskało wykres, **0 straciło**,
zero fałszywych trafień na 25 nowych haseł (skan całego archiwum).

🔴 **ROPA ZJECHAŁA Z EIA NA YAHOO tego samego dnia.** Warunek ze `STAN.md` brzmiał „3-4 dni =
temat zamknięty" — pierwszy pomiar dał **7 DNI** (`stan_na 2026-08-03` przy biegu 10.08), czyli
kafel pokazywał 88,90 USD pod artykułem o 84. Kontrakty `BZ=F`/`CL=F` to dokładnie to, co cytują
nagłówki (EIA podaje spot FOB). **Klucze serii `BRENT`/`WTI` bez zmian → zero migracji.**
EIA został **fallbackiem**: gdy Yahoo padnie, seria idzie z niego, ale podpisana jako EIA
z `stan_na` = data odczytu, żeby kafel nie udawał świeżości.
⚠️ Sprawdzone i odrzucone przy okazji: FRED (to przepakowane EIA, ta sama data), repo
`datasets/oil-prices` (też z EIA), OilPriceAPI (darmowy plan „internal use only" — publiczne
wyświetlanie zabronione), oilprice.com (feed Barchart, **bez historii**, tylko ostatnia cena;
pokazuje te same liczby co Yahoo co do centa — to potwierdziło wybór).

**WIG20 — jedyny instrument bez dostępnej historii.** Yahoo zna `WIG20.WA` i oddaje prawdziwy
poziom w złotych, ale **1 bar niezależnie od zakresu**; gpw.pl i gpwbenchmark.pl oddają
`Connection reset` z serwera, Stooq ma bramkę antybotową. Decyzja właściciela: **zbieramy historię
sami** (`_symboleAkumulowane` + `DopiszDoSeriiPrzyrostowej` w bocie). 7 referencji `EPOL`
przepiętych na `WIG20`.

**Kropki „Sagi na wykresie" tylko dla etapów z wpływem na rysowany instrument.** Zgłoszenie ze
zrzutem: saga „Rekordy giełdowe w USA i Polsce" nanosiła etapy o Dow Jonesie i S&P 500 na wykres
polskiego rynku. Węzeł sagi niesie teraz własny `chart` (bot go MIAŁ i wyrzucał — ta sama klasa co
`published_at`), a front filtruje po nim. Backfill 131/300 istniejących węzłów.
⚠️ Pełna, niefiltrowana oś została w „Wątku tematu" — tniemy WYŁĄCZNIE kropki.

**Trzy newsy uratowane ręcznie przez poczekalnię + trwałe reguły do bota:**
- GPT-5.6-Cyber i dwa inne duże premiery AI odrzucone kodem `tech-nowinka` — czyli nazwą kategorii
  z BIAŁEJ listy. Pole na kod (wdrożone 09.08) stworzyło pułapkę semantyczną: wypełniona rubryka
  wygląda modelowi na uzasadnione odrzucenie. Kontrakt mówi teraz wprost, że kod nazywa REGUŁĘ (#133).
- Burry o Berkshire/Ablu (kod `plotka/opinia`) i Bezos × Liverpool FC (`popkultura/sport`) → nowy
  wyjątek **postaci-topki** (#134) w 3 miejscach: stała + oba feedy, którymi to weszło.

**Front — cztery rzeczy widoczne dla czytelnika:**
- **Zdjęcia artykułów na DESKTOPIE** — nigdy nie istniały (`image_url` był tylko w ścieżkach
  mobilnych), a 99% pozycji z artykułem ma zdjęcie.
- **`watki.html` dostało tagi `og:`/`twitter:` + canonical** — podstrona istniała od 07.08 z ZEREM
  tagów, więc udostępniony link dawał gołą kartę.
- **Paski przewijania** — brakowało deklaracji `color-scheme`, więc w motywie ciemnym przeglądarka
  malowała biały systemowy pasek. To naprawa dla PRZEGLĄDARKI, nie styl elementu.
- **Pastylka LIVE → kanał PILNE** — była czysto dekoracyjna; teraz przy świeżym (≤4 h) newsie
  z flagą 🚨 zmienia się w klikalny pasek prowadzący do artykułu.

**Diagnostyka przestała jechać do publicznego repo** (#137) — 802 663 bajty (`lejek.json` 474 KB
z 1417 ocenionymi nagłówkami i 13 feedami źródłowymi, `deepseek_usage` 165 KB, `brief_health`
107 KB, `bot_health` 56 KB) usunięte. Dane żyją w Supabase — **zweryfikowane przed odcięciem**
kluczem bota z serwera: `lejek` 800 wierszy, snapshoty po 200, wszystkie z ostatniego biegu.
⚠️ Bezpiecznik: bez `SUPABASE_SERVICE_KEY` pliki wracają jako jedyna droga.

**Bomba z opóźnionym zapłonem rozbrojona:** JSON-LD `datePublished` miał zaszyte `+02:00`, więc od
ostatniej niedzieli października wszystkie daty strukturalne szłyby do Google o godzinę za wysokie.
Offset liczy się teraz z bazy stref DLA DANEJ DATY.

## ✅ Co zrobiono w nocy 09/10.08

- **Ropa: `BNO`/`USO` → `BRENT`/`WTI`** (FinancialNewsBot#123). Fundusze ETF nie są ceną baryłki
  i nie ma mnożnika — potrzebne było inne źródło. **95 referencji `chart` w briefs+archiwum przepięte.**
- **Stooq WYKLUCZONY DWUKROTNIE** — notowania (#125, #126) i newsy (#129, #130). Oddaje HTTP 200
  ze stroną „This site requires JavaScript to verify your browser" na **całej domenie**, obu domenach
  (`.pl` i `.com`). Bramka antybotowa; **nie obchodzimy jej headless-przeglądarką.**
  ⛔ Nie proponuj Stooq ponownie w żadnej formie bez sprawdzenia, czy bramkę zdjęli.
- **Ropa jedzie z EIA** (#127) — `RBRTE`/`RWTC`, domena publiczna. `stan_na` tej serii to **data
  odczytu, nie czas biegu**, bo EIA publikuje raz w tygodniu.
- **`NotujDiag` → notatki TEKSTOWE w `brief_health.json`** (#126). To dzięki temu poznaliśmy przyczynę
  awarii Stooq bez logowania na serwer. 📌 **Wzorzec do powtarzania:** gdy ani sandbox, ani właściciel
  nie mogą czegoś sprawdzić — niech sprawdzi to produkcja.
  🔴 Przy okazji: `AktualizujNotowaniaNaSite` przesunięte PRZED zapis health, bo licznik dokładany do
  etapu biegnącego PO zapisie **nie istnieje** (notatki żyją w pamięci procesu).
- **Karta wątku `og?w=1` przywrócona** (#121) — logo w prawym górnym rogu. 🔴 Ten układ **nigdy nie był
  w repo**, żył tylko we wdrożonej funkcji i zginął przy deployu #101/#109. Teraz jest w repo.
- **Karta klastra `og?k=1` + gotowiec spinający** (#123) — parametr `k` **dopisany do `ZNANE_PARAMY`**.
- **26 żądań HEAD przy każdym wczytaniu strony → 0** (#120). `sprawdzStub` siedziało w funkcji
  GENERUJĄCEJ HTML. **ZASADA: nic sieciowego w funkcjach budujących HTML.**
- **BBC Science: zawężona klauzula „decyzja klimatyczna z kwotami"** (#128) — reguła sama otwierała
  furtkę. Zakres naprawy z pomiaru: wzorzec „pieniądze + środowisko" ma **0 trafień na 4936 pozycjach**,
  więc poszła do promptu JEDNEGO feedu, nie do `WSPOLNE_ODRZUCENIA`.
- **Karta nagłówkowa (bez `w=1`/`k=1`) ZOSTAJE z logo po lewej** — świadoma decyzja właściciela:
  „do zwykłych postów ma być z logiem po lewej, a do wątków bez". ⛔ Nie wyrównuj ich „dla spójności".

---

> ✅ **AKTUALIZACJA 2026-08-09:** punkt A ZBUDOWANY (front: `sagaRynekHtml` w tym PR; bot: `daty`
> w `quotes.json` + retencja sag 30 dni / wątek gaśnie po 7 dniach ciszy — FinancialNewsBot#115).
> Pomiar pokrycia z warunku wejścia: **93,9%** w briefs, **76,9%** w dawkach z 08.08 — sufit osiągnięty.
> Punkt 4 (powody odrzuceń) też ZAMKNIĘTY — kody w polu `powod` lejka, front bez zmian.
> Kropki pojawią się po pierwszym biegu bota z nowym kodem (stare serie nie mają `daty`).

## 🔴 B. Karta podglądu linku na Facebooku — NAPRAWIONE 09.08, DO POTWIERDZENIA JUTRO

Zgłoszenie właściciela: link wysłany z brifup.com na Messengera pokazywał kartę z **samą domeną
„brifup.com"** — bez tytułu i **bez żadnej grafiki, nawet tej podstawowej**.

**Przyczyna była podwójna, obie tej samej klasy — fragment `#` nie dociera do serwera:**
1. Publiczny przycisk „Udostępnij" wysyłał adres **hashowy** (`brifup.com/#evening/<slug>`), więc
   crawler FB nie miał z czego zbudować karty. Knaga używa stuba od sierpnia (`linkDoUdostepnienia`),
   front tej poprawki nigdy nie dostał. Stub z pełną kartą **istniał przez cały czas** — zmierzone:
   `brifup.com/s/bn2vb6.html` oddaje 200 z poprawnym `og:title`/`og:image`.
2. Sam stub podawał w `og:url` i `canonical` **adres hashowy apki**. FB traktuje `og:url` jako
   kanoniczny identyfikator obiektu, więc odsyłał sam siebie pod adres, którego nie umie odczytać.
   X był pobłażliwy (idzie za `twitter:*`) — stąd wrażenie „na X działa, na FB nie".

Naprawione: brief-site#115 (front) + FinancialNewsBot#119 (stub). Zweryfikowane przechwyconym
`navigator.share`: klik wysyła `https://brifup.com/s/13vpjg8.html`, a slug spoza stubów zostaje
przy adresie hashowym (żaden link nie prowadzi w 404).

🔴 **DO SPRAWDZENIA:** udostępnij ŚWIEŻY news i zobacz kartę. ⚠️ **Facebook trzyma podgląd w cache
per URL** — linki już wysłane zostaną bez grafiki na zawsze, tego się nie odzyska. Wymuszenie:
Sharing Debugger → „Scrape Again" na `https://brifup.com/s/<slug>.html`.

⚠️ **Efekt pełny dopiero po biegu bota z 09.08 wieczorem** — istniejące stuby mają stary `og:url`,
dopóki bot ich nie przepisze (funkcja samolecząca, jeden commit).

**Otwarte w tym temacie:**
- `watki.html` **nie ma ŻADNYCH tagów `og:`** — udostępnienie podstrony Wątków daje gołą kartę.
- Stuby archiwalne bez `a=<data>`: karta-obrazek dla newsa z archiwum wraca do grafiki zapasowej,
  bo stub nie przekazuje daty do funkcji `og`. Front ma fallback routingu, obrazek nie.
- `fb:app_id` — debugger o niego marudzi. To NIE jest przyczyna braku grafiki (służy statystykom
  udostępnień), ale warto dodać. Czeka na App ID od właściciela z developers.facebook.com/apps.

---

## 🔴 C. Tytuł sagi — ODŚWIEŻANY OD 09.08, OBSERWOWAĆ TYDZIEŃ

Zgłoszenie właściciela („czyli po prostu stary wątek jest?"): karta OG wątku z Lipska miała nad osią
nagłówek z **05.08**, choć oś pokazywała etapy do 09.08 — a etap, który dał ten tytuł, **wypadł już
z osi** przy cięciu do 4 ostatnich z 5.

Przyczyna: `title` był zapisywany WYŁĄCZNIE przy zakładaniu wątku, więc saga na zawsze nosiła nagłówek
pierwszego etapu. Ten sam zamrożony tytuł szedł w trzy miejsca: karta OG, oś pod postem i `/watki.html`.

Naprawione w FinancialNewsBot#118: prompt inkrementalny dostał pole `tytul` (zero dodatkowych calli —
jedzie tym samym wywołaniem co `memo`), z bramkami: tylko wątek istniejący przed biegiem, ≤90 znaków,
inny niż obecny, nie wyciek/angielszczyzna, nie dosłowny tekst dopinanego newsa.

🔴 **Przy okazji zamrożony `slug` wątku** — strona sagi `w/<slug>.html` liczyła adres z BIEŻĄCEGO
tytułu, więc samo przemianowanie przenosiłoby ją pod nowy URL i zostawiało sierotę w sitemapie.
Backfill liczy slug z dzisiejszego tytułu, więc 53 istniejące sagi zachowują dotychczasowe adresy.
Trafiło się dobrze: `w/` było jeszcze puste na produkcji i nie ma go w `sitemap.xml`.

⚠️ **DO OBEJRZENIA:** `watki_przemianowane` w `brief_health` oraz log `Wątki[INKR] -> tytuł [wN]`.
Jeśli przemianowań jest tyle co dopięć, prompt jest za luźny i strony sag przepisują się co dobę.
⚠️ Sagi, którym nie dojdzie etap, zostaną ze starym tytułem — odświeżenie dzieje się tylko przy
dopięciu. Jednorazowy przebieg po wszystkich sagach to osobna decyzja (~50 calli).
⚠️ Testowane JEDNYM wywołaniem modelu na jednym wątku (zwróciło „Incydenty dronowe w Lipsku").
Zachowanie na pełnym biegu z kilkunastoma dopięciami — dopiero w logu.

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

## ✅ 3. GDELT — ZOSTAJE, ale PRZESUNIĘTY NA KONIEC łańcucha (2026-08-09)

**Rozstrzygnięte dwuetapowo.** 2026-08-07 kryterium („`finder_gdelt_fakty` przez dobę > 0") uznano
za spełnione: tygodniowe sumy PL 5 / EN 26. 🔴 **2026-08-09 szersze okno pokazało, że werdykt był
zbyt hojny wobec toru PODSTAWOWEGO.** Zmierzone na `brief_health.json`, 200 biegów (05.08 → 09.08):

| tor | próby | fakty | sukcesy |
|---|---|---|---|
| `gdelt` (podstawowy, stał na **2. pozycji**) | 654 | 2 | **0** |
| `gdelt_en` (awaryjny, stoi na końcu) | 304 | 24 | 7 (2,3%) |

Dla porównania w tym samym oknie: `googlenews_en` 31,7%, `wiarygodne` 15,7%, `googlenewspl` 8,6%.

🔴 **Kosztem była LATENCJA, nie tokeny:** `GdeltFindFacts` trzyma globalny `_gdeltLock` z odstępem
5,5 s, więc 958 wywołań w 4 dni to do **~1,5 h czekania wciśniętego w ścieżkę publikacji** — za zero
faktów na torze, który dostawał niemal każdy item. Finder **przesunięty na KONIEC** głównego łańcucha
(FinancialNewsBot#120): odpala się tylko dla itemów, którym i tak nikt nie znalazł źródła. Tor EN
nietknięty — tam dowozi 7 uratowanych newsów i już stoi ostatni.

⚠️ **Do sprawdzenia po tygodniu:** czy `do_poczekalni` nie urosło (byłby to znak, że tor podstawowy
jednak coś ratował, tylko liczniki tego nie pokazywały). ⚠️ Skuteczności finderów **nie porównuj
wprost** — każdy widzi inną resztkę populacji zależnie od pozycji w łańcuchu; dla GDELT to bez
znaczenia, bo zero jest zerem niezależnie od pozycji.

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

## 🔴 7. Otwarte po sesji 10.08 — od tego zacząć

Wszystkie cztery są SAMODZIELNE, nic nie czeka na nic innego.

1. **Przycisk „Udostępnij na X" dla czytelników na `index.html`** — knaga go ma, publiczny front NIE.
   Cała infrastruktura (stuby, funkcja `og`, deep-linki, `shareItem`) już działa; brakuje samego
   guzika w 3 miejscach: `expandBlock`, `expandBlockArchive`, `dtShowDetail`. To najkrótsza droga
   do widocznego efektu z całej listy.
2. **Stuby archiwalne nie przekazują `a=<data>`** — `BudujStubHtml(it, dawka, obraz)` nie ma
   parametru daty, więc karta-obrazek newsa z archiwum wraca do grafiki zapasowej. Front ma
   fallback routingu (#100), obrazek nie.
3. **`fb:app_id`** — czeka na App ID właściciela z developers.facebook.com/apps. Nie jest przyczyną
   braku grafiki (to było naprawione 09.08), służy statystykom udostępnień.
4. **WIG20 przez ~6 tygodni bez kafla** — patrz `przyrost_WIG20` wyżej. Gdyby okazało się to zbyt
   długie, jedyną alternatywą z ceną bieżącą I historią jest płatne źródło (Databento).

## 📊 8. Pomiary, które WYPADŁY DOBRZE (10.08) — nie badać ponownie bez powodu

Trzy obawy zapisane w tym pliku sprawdzone na licznikach i **niepotwierdzone**:
- `published_at` ma **92% pokrycia** (108/117) — warunek wejścia „Sagi × rynek" spełniony z zapasem
- **recall dopięć do sag 75%** (`watki_dopiete` 3 vs `watki_nowy_watek` 1) — punkt „Recall dopięć"
  bał się ~10%; `watki_przemianowane: 0`, czyli prompt nie mieli nazw sag co bieg
- `do_poczekalni: 1` — przesunięcie GDELT na koniec łańcucha (#120) niczego nie zepsuło
- `data_z_artykulu_wygrala: 9` / `odrzucona: 1` — guard 48 h dobrze wykalibrowany

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
| 🆕 **Amerykański wyścig wyborczy** | zakładka Lejek (Polymarket, Kalshi) | prawybory/kursy wyścigów mają być `odrzucony`; ustawy Kongresu mają PRZECHODZIĆ |
| 🆕 **`watki_przemianowane`** | `brief_health` | ma być DUŻO mniej niż `watki_dopiete`; równe = prompt za luźny |
| 🆕 **`do_poczekalni` po przesunięciu GDELT** | `brief_health` | było 134 / 4 dni; wzrost = tor podstawowy jednak coś ratował |
| 🆕 **Karta linku na Facebooku** | świeżo udostępniony news | ma być grafika newsa; stare linki zostaną bez |

---

## ✅ Co zrobiono 2026-08-09 — amerykański wyścig wyborczy wypada z selekcji (bot, PR)

Zgłoszenie właściciela ze zrzutów dawki porannej: *„zbyt mało istotne newsy z punktu widzenia
Polaka/Europejczyka"* — prawybory na gubernatora Minnesoty i wyścig do Senatu z Teksasu, obok siebie.
W `lejek.json` widać, że w oryginale to były **kursy zakładów** (Polymarket „55% chance", Kalshi
„NEW FRONTRUNNER"), które selekcja przepisała na zdanie faktograficzne — a reguła o czystych
prawdopodobieństwach celuje w FORMĘ zapisu (procent w nagłówku), nie w przedmiot newsa.
Do tego dwa wyjątki działały jak przepustka: „kluczowe wybory federalne" (mandat federalny, ale
wyścig stanowy) i „przełomowe sondaże UE/G7/G20" (mówi wprost „zmiana lidera rankingu", a nagłówek
brzmiał „NEW FRONTRUNNER"; USA jest w G7/G20).

Naprawa w `WSPOLNE_ODRZUCENIA` (nowa reguła + zawężone dwa wyjątki) i w promptach obu feedów,
którymi to weszło. Zmierzone na 4885 opublikowanych pozycjach z 40 dni: **9 wydarzeń tej klasy**,
plus **7 wpisów tej samej klasy w `rejected.json`** — właściciel kasuje je ręcznie od 01.07, ale to
warstwa 40 przykładów, więc lipcowy wzorzec dawno z niej wypadł. Szczegóły i lista kontrolna
„co ma dalej przechodzić" w `financialnewsbot/CLAUDE.md`, sekcja „Amerykański wyścig wyborczy jak sport".

⚠️ **Dwa newsy ze zrzutów siedzą jeszcze w `briefs.json`** (dawka poranna, poz. 07 i 08) — reguła
działa od najbliższego biegu po merge'u, danych wstecz nie ruszy. Do usunięcia z knagi przyciskiem
„Usuń" (dopisze je przy okazji do `rejected.json`).

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
- **Mobile: PANEL WĄTKÓW nad feedem** (2026-08-13) — pociągnięcie w dół (>60 px, na puszczenie)
  rozwija PEŁNE sagi tej dawki, zamiast dawnego paska-linku do `/watki`. 🔴 Gest **nie odświeża już
  treści** (decyzja właściciela) — od tego jest ↻ w topbarze i `liveTick`. Najnowsza saga na DOLE
  panelu, starsze wyżej (panel wysuwa się nad feedem, więc „im wyżej, tym starsze"); wewnątrz sagi
  oś bez zmian, najnowszy etap na górze. Panel żyje POZA `#content`, więc przeżywa re-rendery;
  desktop go nie pokazuje. **Zmiana dawki ZAMYKA panel** — wraca wyłącznie gestem, już z wątkami
  nowej dawki. **Przewijanie w panelu jest ZWYKŁE** — po serii prób (scroll-snap, stepper gestu,
  klamra przycinająca natywny scroll) właściciel wybrał: szybko pojawia się tylko pierwszy wątek,
  reszta to normalny scroll. Odrzucone warianty i ich objawy — łącznie z WIBRACJĄ na telefonie przy
  klamrze — opisuje blok `⛔ STEPPER GESTU` w `index.html`; nie odgrzewaj ich.
  ⚠️ Kotwica przy otwarciu korygowana DWA razy: zakładki dawek wjeżdżają przejściem 0,25 s i psuły
  pomiar o −28 px. Szczegóły i pułapki: `CLAUDE.md`, sekcja
  „Panel wątków nad feedem".
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
2. 🔴 **`s/_index.json` ODDAJE 404 POD DOMENĄ — Jekyll pomija pliki z `_` na początku nazwy.**
   Manifest stubów JEST w repo i bot go utrzymuje (retencja 14 dni), ale front go NIE ZOBACZY.
   Kosztowało to jedną wersję poprawki „Udostępnij" (09.08), która czytała manifest i **po cichu
   nie działałaby na produkcji** — `loadStuby` łapało 404 w `catch` i zostawiało pusty zbiór, więc
   każdy link wracał do adresu hashowego. Zmierzone: `brifup.com/s/_index.json` → **404**,
   `brifup.com/s/13vpjg8.html` → **200**. Przepisane na HEAD po samym stubie. Gdyby manifest
   kiedyś był potrzebny frontowi — wpisz go wprost w `include:` w `_config.yml`.
3. 🔴 **`navigator.share` wymaga ŚWIEŻEJ aktywacji użytkownika — `await` przed nim ją zabiera.**
   Na iOS arkusz udostępniania wtedy NIE OTWIERA SIĘ WCALE. Dlatego podmiana linku na stub jest
   synchroniczna (odczyt z mapy), a pytanie o istnienie stuba leci wcześniej, przy otwarciu artykułu.
   Knaga może sobie pozwolić na HEAD po kliknięciu, bo tam przycisk tylko wypełnia pole tekstowe —
   **nie kopiuj stamtąd wzorca bezmyślnie**.
4. 🔴 **`gotowiec-x` NADPISUJE `x_post` od bota.** Knaga woła Edge Function przy każdym otwarciu
   panelu X. Generowanie gotowca w bocie było więc podwójną robotą — wycofane. Nie dodawaj z powrotem.
5. **Lejek stempluje czasem WARSZAWSKIM, `brief_health` UTC.** Porównując godziny z różnych plików
   (albo z zegarem Maca) najpierw sprawdź, w której strefie są.
6. **X przy „Boost" odrzuca posty z więcej niż jednym emoji** — potwierdzone przez właściciela na
   żywym poście. Pole `flag` bywa wieloflagowe (11 z 49 itemów), więc do X idzie tylko pierwsza flaga.
   ⚠️ Dotyczy **wyłącznie** X — strona renderuje pełną flagę.
7. **macOS blokuje `http.server` na `~/Documents`** (ochrona prywatności) — podgląd lokalny serwuj
   z kopii w scratchpadzie. Wpis `brief-site-repo` w `~/.claude/launch.json` już tak robi.
8. **`brifup.com` NIE idzie przez Cloudflare** — NS to GoDaddy, rekordy A wprost na GitHub Pages.
9. **`bot_secrets.env` ma NIESPÓJNY format** — część linii z `export`, część bez. Naprawione `set -a`
   w `run_bot.sh`. ⚠️ „przecież Haiku działa" NIE dowodzi, że inne klucze działają.
10. **Nowy feed testuj Z SERWERA, nie z Maca** (TVN24: 200 z laptopa, 403 z Hetznera).
11. **Feed przez rss.app sprawdzaj LICZBĄ POZYCJI i DATĄ najnowszej**, nie kodem HTTP.
12. **Bump `CACHE_NAME` przy każdej zmianie CSS/JS** — świeżość daje `cache:'reload'` w SW.
13. **Nie dopisuj `knaga.html` do `robots.txt` ani `sitemap.xml`.**
14. **Panel szczegółów: nie zwężaj poniżej 440 px** bez sprawdzenia kafli notowań.
15. **`rejected.json` UCZY FILTR** (ostatnie 40 wpisów) — pomyłka przy „Usuń" psuje selekcję.
16. **Link do X NIE idzie w treść posta** — obcina zasięg. Idzie jako odpowiedź.
17. 🔴 **News schowany w klastrze NIE MA stuba, więc nie da się go udostępnić z podglądem.**
    `ZapiszStubyNaSite` iteruje po `d.Items`, czyli **wyłącznie po pozycjach top-level** — do `subItems`
    nie wchodzi. Knaga liczy slug z `item.text` KAŻDEGO newsa (też sub-itemu), więc dla newsa w klastrze
    dostaje adres, którego nie ma → HEAD 404 → fallback na link hashowy → **X pokazuje generyczną kartę
    strony głównej**. Objaw wygląda jak awaria funkcji `og`, a `og` działa poprawnie.
    ⚠️ Diagnozując „nie generuje podglądu" sprawdź NAJPIERW, czy news jest top-level, a nie sub-itemem.
    Lek: rozdzielić klaster — stub odtworzy się sam w kolejnym biegu (mechanizm jest samoleczący).
    ⚠️ Stubów **nie dopisuj ręcznie** (patrz `CLAUDE.md`) — bot i tak odtwarza stan z `briefs.json`.
18. 🔴 **`exclude` w `_config.yml` NIE wystarcza — repo jest PUBLICZNE.** Pliki zdjęte z domeny 07.08
    dalej leżały na GitHubie do przejrzenia (802 KB diagnostyki). Zamknięte 10.08 od strony ŹRÓDŁA:
    bot przestał je pisać, gdy działa Supabase. **Wnioskując o „ukryciu" pliku, rozróżniaj domenę
    od repo** — to dwie różne drogi i `exclude` zamyka tylko pierwszą.
19. 🔴 **`new Date('smiec')` NIE zawsze daje Invalid Date.** Zmierzone: `new Date('smiec:00Z')`
    parsuje się na 1 stycznia 2000, więc guard na `isNaN(new Date(x))` **przepuszcza śmieć**.
    Walidując datę, sprawdzaj KSZTAŁT regexem. Złapane testem przy poprawce stref, nie recenzją kodu.
20. 🔴 **Element systemowy ≠ styl elementu.** Biały pasek przewijania w motywie ciemnym brał się
    z braku `color-scheme`, a nie ze złych stylów — `background: var(--bg)` na kontenerze tego nie
    naprawia. Ta sama klasa dotyczy pól formularzy i tła canvasa.
21. ⚠️ **Karta `og?k=1`/`og?w=1` wraca grafiką zapasową także dla POPRAWNIE wdrożonej funkcji** —
    gdy news nie jest klastrem (`k`) albo nie należy do sagi (`w`). Wygląda to jak nieudany deploy.
    Sprawdź `subItems`/przynależność do wątku ZANIM zaczniesz podejrzewać wdrożenie.
22. 🔴 **Nowy plik wewnętrzny → dopisz go do `exclude` w `_config.yml`.** GitHub Pages serwuje
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
