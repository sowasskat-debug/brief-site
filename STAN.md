# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-12 (późny wieczór)**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest
niedokończone*, `CLAUDE.md` mówi *jak działa to, co skończone*.

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

## 🔴🔴 NAJPILNIEJSZE — NIC nie czeka na komendę (stan 12.08 późny wieczór)

Wszystko z 12.08 zmergowane i wdrożone: **bot #157–#162**, **front #147–#151**.
🟢 **AUTOMAT X JEST WŁĄCZONY I OPUBLIKOWAŁ PIERWSZY POST** (12.08, 20:15). Nic nie czeka na komendę.

**Od czego zacząć następną sesję — same OBSERWACJE, nie roboty:**
1. **Obejrzeć posty automatu na @brifup** po pierwszej pełnej dobie. Czy 4/dobę to dobre tempo,
   czy profil postów odpowiada właścicielowi, czy nie wraca wyliczanka klastrowa.
2. **Liczniki `x_*` w `brief_health`** (`x_kandydatow`, `x_odrzut_temat`/`_instrument`/`_kwota_krajowa`,
   `x_klaster_rozbity`, `x_gotowiec_pusty`, `x_opublikowany`, `x_bieg_wstrzymany`). Gdyby
   `x_gotowiec_pusty` dominował — bramka pokrycia liczb tnie za dużo i post nie wychodzi.
3. **Punkt 6** (przycisk na feedzie) — jedyna realna robota, opis niżej.

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
  nowej dawki. **Przewijanie panelu idzie skokami po wątkach** — stepper w JS (`wpSkok`), NIE
  `scroll-snap`: snap tylko dociągał po płynnym przewijaniu i właściciel to odrzucił („nie
  przeskakuje tak jak przy pierwszym"). Skok działa **tylko w górę listy** (palec w dół, ku starszym)
  i jest **natychmiastowy** — animacja trwała dłużej niż odstęp między machnięciami, więc kolejny gest
  łapał ją w locie i lądował byle gdzie (stąd „czasem nie działa"; zmierzone A/B: 1 z 5 trafień vs 5 z 5).
  Ze ŚRODKA wątku pierwszy skok wraca na jego początek, kolejny idzie do starszego — bez tego
  po każdym zjeździe w dół gest był martwy, dopóki nie doscrollowało się ręcznie do góry. Szczegóły i pułapki: `CLAUDE.md`, sekcja
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
