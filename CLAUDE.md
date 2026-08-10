# CLAUDE.md — brief-site (Brif.up / brifup.com)

> 🔴 **Nowa sesja: przeczytaj NAJPIERW [`STAN.md`](STAN.md)** — co jest niedokończone,
> co zmierzone, w co nie wdepnąć drugi raz i jakich pomysłów nie odgrzewać.
> Ten plik opisuje jak działa to, co JUŻ zrobione; `STAN.md` mówi, od czego zacząć.

Statyczna strona + PWA z newsami finansowo-polityczno-gospodarczymi po polsku.
Czysty HTML/CSS/JS (bez frameworka, bez builda). Dane generuje osobny bot
(repo `financialnewsbot`) i zapisuje jako `briefs.json`.

## Co NIE jest serwowane pod brifup.com — `_config.yml` (2026-08-07) 🔴
GitHub Pages serwuje **DOMYŚLNIE każdy plik z repo**, więc dokumentacja wewnętrzna i źródła lądowałyby
publicznie pod domeną produktu. `_config.yml` (`exclude:`) zdejmuje je z buildu Jekylla → **404 pod
brifup.com** (mierzone). Aktualnie wykluczone: `STAN.md`, `CLAUDE.md`, `SETUP_SUPABASE.md`,
`supabase_schema.sql`, `supabase/`, `graphify-out/`, `serve.py`, `marka/` oraz diagnostyka
`lejek.json`/`deepseek_usage.json`/`brief_health.json`/`bot_health.json` i panele
`brief-health.html`/`maszynownia.html`.
- 🔴 **Nowy plik wewnętrzny → DOPISZ do `exclude`.** Inaczej wyjdzie pod brifup.com.
- ⚠️ **`exclude` zamyka domenę i Google, NIE repo.** Repo jest publiczne, więc pliki dalej widać pod
  `github.com/sowasskat-debug/brief-site`. Pełne zamknięcie = prywatne repo (Pages z prywatnego wymaga
  płatnego planu) albo wyłączenie zapisu w bocie + kasacja plików.
- ⚠️ `exclude` zamiast `Disallow` w `robots.txt` — robots jest publiczny i SAM zdradziłby ścieżki
  (ta sama logika, dla której `knaga.html` nie trafia do robots).
- ⚠️ Wykluczenie `supabase/` NIE psuje wdrożenia funkcji — te idą przez `supabase functions deploy`,
  nie przez Pages.

## Archiwum ładowane leniwie — `ARCHIWUM_DNI_NA_STARCIE` (2026-08-07) ⚠️
🔴 **Wejście na stronę ładowało WSZYSTKIE pliki archiwum** (37 dni, 5,13 MB surowo / **1,63 MB gzip**),
i to **sekwencyjnie, dzień po dniu** — tylko po to, żeby `dtRenderSidebarCounts` policzyło newsy przy
tematach. Płacił za to KAŻDY czytelnik, przy każdym wejściu, także na telefonie, a koszt rósł o plik
dziennie. To było **93% wagi strony** i największy pojedynczy koszt wejścia.
- **`ARCHIWUM_DNI_NA_STARCIE = 7`** — `dtRenderArchiveSidebar` wczytuje tylko tyle najnowszych dni.
  📊 Zmierzone na 37 dniach: **1,63 MB → 0,34 MB gzip (−79,2%)**, round-tripów 38 → 8.
- **`wczytajDniArchiwum(daty)`** — wspólny loader, pobiera **równolegle** (`Promise.all`). Przy 37
  plikach sam łańcuch sekwencyjnych round-tripów trwał dłużej niż transfer. Kolejność wejścia jest
  zachowana, a widok cross-day i tak grupuje po dacie, więc porządek w tablicy nie ma znaczenia.
- **`dowczytajCaleArchiwum(poZaladowaniu)`** — dociąga resztę, wołane **WYŁĄCZNIE z widoku tematu**
  (`dtRenderCatFilter` na PC, `mobileFilterCat` na mobile), bo to jedyne miejsce, w którym dni starsze
  niż tydzień są w ogóle widoczne. Kto nie wchodzi w temat, nie płaci.
- 🔴 **`dtArchiveKompletne` to NIE zapasowy guard, tylko warunek zatrzymania.** `poZaladowaniu`
  przerysowuje widok tematu, a ten woła `dowczytajCaleArchiwum` ponownie — flaga MUSI być ustawiana
  wewnątrz łańcucha obietnicy (czyli zanim ruszą doczepione callbacki), inaczej re-render zapętla się
  w nieskończoność. `dtArchiveDniWczytane` podnosimy OD RAZU, a obietnicę trzymamy w
  `dtArchiveDoczytywanie` — bez tego dwa kliknięcia w temat pobrałyby archiwum dwa razy i **zdublowały
  itemy** (zweryfikowane: 3017 itemów, 0 duplikatów `data|dawka|tekst`, powtórne wołania nic nie zmieniają).
- ⚠️ **Po doczytaniu PRZYWRACAMY przewinięcie.** `mobileFilterCat` samo zjeżdża na górę, a wyrzucenie
  czytelnika na początek listy w trakcie czytania byłoby gorsze niż brak dopisanych dni. Starsze dni
  dochodzą NA DOLE, więc pozycja zostaje sensowna.
- ⚠️ **ŚWIADOMY KOSZT:** liczniki przy tematach (sidebar PC i panel mobile) startują z 7 dni i skaczą
  do pełnych po wejściu w temat. Każde rozwiązanie tego punktu zmieniało liczniki przy pierwszym
  renderze — to był warunek wejścia, nie regresja.
- Nietknięte: nakładka archiwum (`showArchiveDay`) pobierała zawsze dzień na żądanie, lista dni
  (`archiveDatesCache`) to jeden mały plik.

## Diagnostyka: Supabase-first, pliki zdjęte (2026-08-07)
Bot pisze diagnostykę RÓWNOLEGLE do Supabase (`SupabaseZapiszLejek`, `SupabaseZapiszSnapshot`) i do
plików. Migracja od strony danych **kompletna** — zweryfikowane z serwera 2026-08-07: `lejek` 1500
wierszy, snapshoty (`deepseek_usage`/`brief_health`/`bot_health`) po 200, wszystkie świeże. Pliki
zdjęte z Pages (patrz wyżej). Tabele mają RLS wpuszczające tylko właściciela.
- **knaga zakładka Lejek** czyta Supabase-first (`pobierzLejekDane`: `supa.from('lejek')`, plik jako
  fallback gdy tabela pusta — teraz nie pusta, więc plik nietykany).
- ✅ **Widget „DeepSeek dziś" w Kokpicie knagi — `pobierzUzycieDeepSeek()`, Supabase (2026-08-07 wieczorem).**
  🔴 **Świadomie BEZ zapasowego pliku — inaczej niż lejek.** Tam `lejek.json` jest realną drugą drogą;
  tu `deepseek_usage.json` siedzi w `exclude` w `_config.yml`, więc pod brifup.com oddaje 404 ZAWSZE.
  Fallback byłby martwym zapytaniem udającym bezpiecznik (ten sam wybór co w zakładce Ruch).
  ⚠️ **Doba liczona LOKALNIE, nie w UTC** — `.gte('ts', lokalna_północ.toISOString())`. Stary kod
  porównywał prefiks `new Date().toISOString().slice(0,10)`, więc między 00:00 a 02:00 czasu PL kafel
  pokazywał wczorajszy dzień jako „dziś". Kolumna jest `timestamptz`, więc granicę doby podajemy jako
  konkretny MOMENT — porównanie prefiksu daty rozjeżdżałoby się o 1-2 h zależnie od pory roku.
  To ta sama zasada, co `todayLocalISO()` na froncie.
  Suma z `total_in`/`total_out` (bot już je liczy), z awaryjnym sumowaniem `stages` dla wierszy bez tych pól.
  ⚠️ Zweryfikowane atrapą klienta Supabase na żywej stronie (zapytanie + obie gałęzie sumowania),
  **nie wobec prawdziwej tabeli** — logowanie do knagi ma wyłącznie właściciel.

## ?admin=PAT USUNIĘTY (2026-08-07) — nie przywracać 🔴
`index.html` miał legacy tryb administracyjny `?admin=<PAT>`: token GitHuba z prawem zapisu do repo
w `sessionStorage` na PUBLICZNYM originie brifup.com, bez bramki logowania. Każdy XSS na tym originie
= przejęcie repo (czyli produkcji). Usunięty w całości (237 linii); został jednorazowy sprzątacz
kasujący token z urządzeń. Moderacja WYŁĄCZNIE przez `knaga.html` (Supabase auth + RLS). Znikła też
druga ścieżka zapisu `rejected.json` (cap 200 obok knagowego 150) — teraz naprawdę jedna ścieżka.

## Deploy / hosting
- **GitHub Pages**, serwowane z gałęzi `main`. ⚠️ **SPROSTOWANIE 2026-08-01: `brifup.com` NIE idzie
  przez Cloudflare** (ten plik twierdził tak od początku i było to nieprawdą). Zmierzone: NS to
  `ns75/ns76.domaincontrol.com` (**GoDaddy**, tak samo jak Flusso), rekordy A wskazują wprost na
  IP GitHub Pages (`185.199.108-111.153`), a nagłówki odpowiedzi to `server: GitHub.com` + `via: varnish`
  (**Fastly**, własny CDN GitHuba) — zero `cf-ray`, zero `server: cloudflare`.
  **Dlaczego to ma znaczenie:** Cloudflare nie widzi ruchu, więc NIE MA statystyk brzegowych ani logów
  — to była przyczyna, dla której licznik wejść trzeba było zbudować od zera (patrz `SETUP_SUPABASE.md`,
  sekcja 8). Wzmianki o „cache Cloudflare" niżej w tym pliku (sekcja Service Worker) też są tym samym
  nieporozumieniem — realnie chodzi o cache HTTP GitHub Pages/Fastly, a opisany fix `cache:'reload'`
  działa i tak, bo dotyczy dowolnego cache HTTP.
- **Deploy = commit do `main`.** Brak builda. `index.html` ładuje się network-first,
  więc zmiany widać od razu przy następnym otwarciu.
- `briefs.json` bywa zapisywany **równolegle przez bota** → zawsze
  `git pull --rebase origin main` przed `git push`. Trzymać poprawny JSON.

## Pliki
- `index.html` — cała apka: HTML + **inline CSS-in-<style>? nie** (CSS w `styles.css`) + **inline JS**. Duży (~114 KB).
- `styles.css` — style (mobile + desktop). Motyw jasny/ciemny przez `:root[data-theme=...]`.
- `fala.html` — **"Flusso"**, osobna strona-mozaika trend-style. Czyta ten sam `briefs.json`,
  ale własny, niezależny render (nie dotyka `index.html`/`styles.css`). Patrz sekcja niżej.
- `knaga.html` — panel właściciela. **Przemianowany z `admin.html` 2026-08-01** — `admin.html` to adres,
  który zgaduje każdy skaner. ⚠️ **Przy okazji USUNIĘTY wpis z `robots.txt`** (`Disallow: /admin.html`):
  robots.txt jest publiczny, więc *ogłaszał* ścieżkę panelu — wpisanie tam nowej nazwy zniweczyłoby całe
  przemianowanie. Przed indeksacją broni `<meta name="robots" content="noindex, nofollow">` w samej stronie,
  a to nie wymaga zdradzania adresu. **Nie dopisywać `knaga.html` do robots.txt ani do sitemap.xml.**
  ⚠️ To obscurity, nie zabezpieczenie — realną bramką jest logowanie (Supabase) i RLS na tabelach.
  ⚠️ **Zapis = commit dopiero po sukcesie
  (2026-07-22):** `saveBriefs(data, sha, msg)` aktualizuje `briefsState` DOPIERO po udanym PUT. Wcześniej
  delete-funkcje robiły `briefsState = fresh` (z już wyciętym newsem) PRZED zapisem → po 409 (bot pisze
  briefs.json co bieg) DOM pokazywał news, a stan go nie miał, więc kolejne „Usuń" trafiało w PRZESUNIĘTY indeks
  i kasowało INNY news (+ dopisywało go do rejected.json, ucząc nim filtr bota). Teraz po 409 stan i DOM zostają
  spójne z GitHubem.
- `service-worker.js` — PWA cache + import OneSignal SDK.
- `briefs.json` — bieżące dane (patrz niżej). `archive/*.json` — archiwum dzienne (jeden plik na dzień,
  ta sama struktura dawek; `archive/index.json` = lista dostępnych dat). `rejected.json` — ręcznie odrzucone (uczy filtr bota).
- `trending.json` — **NOWY, osobny strumień "Flusso Trends"** (sport/rozrywka/świat/ciekawostki z Google Trends +
  trends24.in). Pisany przez bota (`UpdateTrendingOnSite`), NIEZALEŻNY od `briefs.json`. Kształt: `{ "date", "items":[…] }`,
  item = `flag, text, article, category, source_name, source_url, added_at, image_url, reach`. ⚠️ Front Flusso jeszcze
  go NIE czyta (czyta `briefs.json`) — podpięcie to następny krok. Patrz `financialnewsbot/CLAUDE.md` sekcja "Flusso Trends".
  - **`rejected.json` = warstwa PRZYKŁADÓW (few-shot):** bot czyta **tylko ostatnie 40 wpisów** jako REGUŁA 0, więc świeże odrzucenia wypierają stare. Dobre do „naucz filtr TEGO konkretnego newsa". **Trwałe kategorie** (np. „odrzucaj promo bankowe", „fixingi CB bez wpływu na EUR/PLN") NIE tu — idą do stałej `WSPOLNE_ODRZUCENIA` w bocie (repo `financialnewsbot`), inaczej po ~40 nowych odrzuceniach wzorzec wypadnie z okna. Kształt wpisu: `{ "text", "flag", "reason"? }` (pole `reason` opcjonalne — bot dokleja je jako „[powód: …]").
- `lejek.json` + `lejek.html` — **dziennik lejka per-nagłówek** (2026-07-17): bot zapisuje KAŻDEGO kandydata
  z każdego RSS + jego los (`odrzucony`/`telegram`/`main`/`poczekalnia`/`duplikat`/`powtorka`/`bramka`/`utknal`),
  wpis = `{ts, feed, tytul, link, status, tekst_pl, powod}`, retencja 3 dni / max 1500. `lejek.html` (publiczna,
  diagnostyczna, wariant „redakcyjna tabela") grupuje po biegu→feedzie, badge'e losów, filtry+szukajka, u góry
  pasek ZDROWIA FEEDÓW (kiedy feed ostatnio dał kandydatów; >4h żółty, >12h czerwony — od razu widać martwe RSS).
  Patrz `financialnewsbot/CLAUDE.md` sekcja „Dziennik lejka".
- `bot_health.json` — **diagnostyczny lejek** Flusso Trends (dodane 2026-07-11, bez DeepSeek): czyste liczniki
  per bieg (6 źródeł → kandydaci → unikalne → nowe → fakty → wybrane przez DeepSeek → opublikowane → kafle
  meczowe), pisane przez bota (`ZapiszHealthNaSite`) w `finally` — więc powstaje NAWET gdy bieg urwał się
  wcześnie. Trzyma ostatnie 200 biegów. Czytane przez `bot-health.html` (tabela + paski lejka, publiczny
  odczyt bez auth jak `briefs.json`/`trending.json`) — narzędzie diagnostyczne dla właściciela, NIE dotyczy
  Flusso ani Briefu. Patrz `financialnewsbot/CLAUDE.md` sekcja "Diagnostyczny lejek".
- `s/<slug>.html` — **stuby pod podgląd linku** (2026-08-02), pisane przez bota jednym commitem na bieg.
  🔴 **Po co:** deep linki apki są HASHOWE, a fragment nie dociera do serwera i scrapery nie wykonują JS —
  więc każdy udostępniony link oddawał meta strony głównej. Stub ma własne `og:*` + przekierowanie **tylko
  JS-em** (`meta http-equiv="refresh"` byłby błędem: część scraperów podąża za nim i czyta meta strony
  głównej). `s/_index.json` to manifest retencji (14 dni). **Nie edytuj ręcznie** — bot odtwarza stan
  z `briefs.json` przy każdym biegu. Szczegóły: `financialnewsbot/CLAUDE.md`, sekcja „Stuby pod podgląd linku".
- ⚠️ **`og` szuka newsa TAKŻE w podpozycjach klastra (2026-08-04):** zgłoszenie właściciela („przy tym
  poście nie generuje mi zdjęcia z wątkami"). Funkcja przeglądała WYŁĄCZNIE poziom top-level
  (`items.find(...)`), więc dla slugu podpozycji `item` wychodził null i wracała `zapasowa()` — statyczna
  grafika strony głównej. **Objaw myli:** knaga poprawnie pokazywała przycisk „Pobierz kartę wątku
  (9 etapów)", bo ma obiekt newsa w ręku; padał dopiero generator obrazka. Realny przypadek: „SpaceX
  nawiązuje współpracę z Nvidią…" (slug `zkowbz`) to podpozycja klastra, a zarazem 7. z 9 węzłów sagi w7.
  Po spłaszczeniu podpozycja dziedziczy też wątek po kotwicy (`_kotwica`), spójnie z frontem.
  ⚠️ Kolejność w spłaszczonej liście: **najpierw top-level**, więc przy hipotetycznej kolizji slugów
  wygrywa kotwica (zmierzone na 4434 pozycjach z briefs+archiwum: 0 kolizji).
- 🔴 **UKŁAD KARTY WĄTKU PRZYWRÓCONY 2026-08-10 — i to jest ostrzeżenie, nie notatka kosmetyczna.**
  Zgłoszenie właściciela ze zrzutem: „tak wyglądało wcześniej, nie wiem po co się zmieniło". Miał rację.
  **Tego układu (logo w PRAWYM GÓRNYM rogu, treść na pełną szerokość) NIGDY NIE BYŁO W REPO** — wszystkie
  8 commitów `og/index.ts`, od pierwszego z 02.08 10:17, miały lewą kolumnę z logo i pionową kreską.
  Wariant pełnoszerokościowy żył WYŁĄCZNIE we wdrożonej funkcji, wgrany ręcznie i niezacommitowany.
  07.08 poszły dwa deploye z repo (#101 bramki wejścia 18:14, #109 kolejność etapów 21:10) i każdy
  nadpisał go tym, co było w repo. Zrzut właściciela ma najnowszy etap na dole, czyli sprzed #109 —
  zgadza się co do godziny.
  ⚠️ **ZASADA: wygląd trzymany tylko na serwerze NIE ISTNIEJE.** Deploy `og` nie idzie przez git, więc
  każda zmiana czegokolwiek innego w tym pliku kasuje niezacommitowany wygląd. Nie wdrażaj tej funkcji
  z kopii innej niż repo.
  📊 Rozmiary (tytuł 38 px, etap 23 px, limit `tnij` 118) **zmierzone na przypadku skrajnym** — cztery
  etapy po pełnym limicie, każdy zawijany na dwie linie. Pierwsze podejście (46/25 px) wychodziło poza
  kadr i ucinało czwarty etap. Podnosząc cokolwiek, przerenderuj przypadek SKRAJNY, nie typowy.
  ⚠️ `flexShrink: 0` na nagłówku, tytule i bloku osi jest obowiązkowe — bez tego satori przy nadmiarze
  treści ściska pudełko tytułu i pozioma kreska wjeżdża w litery.
  ✅ Zysk uboczny: bez lewej kolumny wiersz jest o ~250 px szerszy, limit znaków 104 → 118, więc typowe
  nagłówki przestały się urywać wielokropkiem (drugie zgłoszenie z tego samego dnia).
  ⚠️ **Karta NAGŁÓWKOWA (`karta`, bez `w=1`) DALEJ MA LEWĄ KOLUMNĘ** — nie było dla niej wzorca, więc
  jej nie ruszałem. Obie karty idą w jednej nitce na X, więc wyglądają teraz różnie.
- `supabase/functions/og/index.ts` — generator obrazka karty 1200×630 (nagłówek + poprzedni etap + pasek
  ciągłości sagi). Wołany WYŁĄCZNIE przez scrapery przy wysyłce linku. ⚠️ Deploy **musi** iść
  z `--no-verify-jwt` (scraper nie ma tokenu). FAIL-SAFE: każdy błąd = przekierowanie na `og-image.png`,
  karta nigdy nie zostaje bez obrazka. Wdrożenie i weryfikacja: `SETUP_SUPABASE.md`, sekcja 9.
  - ⚠️ **Bramki wejścia (2026-08-07)** — endpoint jest otwarty (`--no-verify-jwt`), a limit wywołań
    Edge Functions jest WSPÓLNY dla projektu (wypalenie kładzie też licznik wejść i `gotowiec-x`).
    Stąd: `a=` musi pasować do wzorca daty (**inaczej `a=../../` wyprowadzał pobieranie poza `archive/`**),
    `s=`/`d=` walidowane wzorcem (`^[a-z0-9]{1,16}$` + whitelista dawek), **nieznane parametry odrzucane**
    (`&x=<losowe>` omijał cache CDN i wymuszał pełny render), a `briefs.json`+`threads.json` idą przez
    pamięć podręczną instancji (TTL 60 s) zamiast ~360 KB na każde wywołanie. Każda bramka wraca przez
    `zapasowa()` (302 → grafika), więc fail-safe nietknięty.
- `fonts/*.ttf` — DM Serif Display + Space Mono (licencja OFL, redystrybucja dozwolona). **Potrzebne
  wyłącznie funkcji `og`** (satori musi dostać kroje jako bajty); sama strona bierze fonty z CDN Google.
  ⚠️ Nie kasować — bez nich generator obrazka leci w gałąź awaryjną.
- `manifest.json`, ikony, `og-image.png`, `CNAME`, `robots.txt`, `sitemap.xml`.
  ⚠️ **`og-image.png` (1200×630) NIE MA generatora w repo** — to gotowy PNG, nie ma pliku źródłowego.
  Przy zmianie treści: fonty (DM Serif Display / Space Mono) idą z CDN, którego sandbox nie widzi, więc
  render od zera wychodzi z podmienionymi krojami. **Edytuj piksele istniejącego PNG-a** (Pillow), zamiast
  składać obrazek na nowo. Czerwień panelu to `(224,31,15)`, panel zaczyna się na `x=730`.
  2026-08-02 tak właśnie usunięto linię „3× DZIENNIE" (życzenie właściciela) — zamalowana prostokątem
  w kolorze panelu, reszta obrazka pixel-perfect nietknięta.
  ⚠️ **Zmiana obrazka WYMAGA cache-bustera w meta-tagach** (`og-image.png?v=N` w `og:image` ORAZ
  `twitter:image`) — Facebook/Slack/X trzymają podgląd linku w cache'u i bez zmiany URL-a serwowałyby
  starą wersję w nieskończoność. ⚠️ Pamiętaj też o `og:description`/`twitter:description`: to TEKST pod
  obrazkiem przy wysyłce linku, więc hasła wycięte z grafiki trzeba wyciąć również stamtąd (przy tej
  zmianie „Trzy razy dziennie." siedziało w obu opisach).

## Kształt danych (`briefs.json`)
```
{ "morning"|"afternoon"|"evening"|"poczekalnia": { "date":"YYYY-MM-DD", "items":[ BriefItem ] } }
```
BriefItem (klucze małą literą): `text`, `flag`, `article`, `impact`, `source_name`,
`source_url`, `rssLink`, `added_at`, `category`, `image_url`, `subItems` (klaster = tablica BriefItem).
**`category` (2026-07-17):** kategoria tematyczna nadawana przez SELEKCJĘ bota (zamknięta lista = klucze
`DT_CAT_COLORS`/`DT_CAT_ORDER`; bot waliduje po swojej stronie). `dtGetCategory` używa jej wprost, gdy jest
znaną nazwą (klaster: kotwica bez pola bierze kategorię pierwszego sub-itemu z polem); brak/null/nieznana →
dotychczasowe zgadywanie po słowach kluczowych (stare itemy działają bez zmian). ⚠️ Przy dodawaniu nowej
kategorii: NAJPIERW front (DT_CAT_ORDER/COLORS/FLAG + dtGetCategory), POTEM `_dozwoloneKategorie` + prompt
`FORMAT_JSON_SELEKCJI` w bocie — inaczej bot będzie emitował nazwę, której front nie zna (walidacja bota ją zresztą utnie).
Pozycja `items[0]` = **top story** (bot ją tam ustawia).
**Sygnał "ile źródeł" = pole `reach`** (int, opcjonalne) — liczba różnych redakcji piszących o temacie
(`GoogleNewsReachPL` w bocie). ⚠️ NAZYWA SIĘ `reach`, NIE `coverage` — Flusso musi czytać `it.reach`
(historyczny błąd: front czytał nieistniejące `coverage`, naprawione 2026-07-11). Gdy brak → `fala.html` ma
fallback na pozycję w `items[]`.

## Architektura JS (kluczowe funkcje w index.html)
- **Ładowanie:** `loadDose(dose)` → `fetchFromBriefsJson` (z cache-busterem `?_=ts`)
  → fallback `fetchFromSupabase` (NIEskonfigurowany, placeholdery) → `SAMPLE`.
  ⚠️ **Pusta dawka ≠ awaria (2026-07-20):** świeżo założona dawka z `items:[]` (normalne okno tuż po granicy,
  np. 17:00-18:00 dla wieczornej — bot funduje pustą i dosypuje kolejnymi biegami) pokazywała mylące
  „Nie udało się pobrać… sprawdź połączenie" (SAMPLE). Teraz `fetchFromBriefsJson` zwraca sentinel `'PUSTA'`
  → `loadDose` renderuje kartę `PUSTA_DAWKA` („⏳ dawka w przygotowaniu"); `pollLiveUpdates` ignoruje `'PUSTA'`
  (nie nadpisuje widoku), a gdy bot dosypie itemy, live-tick podmienia kartę na realne newsy automatycznie.
  SAMPLE zostaje wyłącznie dla realnej awarii pobierania (fetch padł / zły JSON / brak dawki w pliku).
- **Render mobile:** `renderDose(dose,items)` → `#content`. Hero = `items[0]`, reszta niżej. Klastry rozwijane (`toggleGroup`/`toggleSubItem`).
- **Render desktop (≥1024px):** `renderDesktop` → `dtRenderFeed` (`#dtFeedList`) + `dtShowDetail` (`#dtDetail`, panel po prawej). Top story = `i===0` → klasa `.top-item` (styl „gazeta": kicker ★ TOP STORY + większy nagłówek).
- **Auto-odświeżanie na żywo:** `liveTick()` co 60 s — najpierw tania sonda `probeBriefsTag()` (HEAD, ETag/rozmiar), pełne dane `pollLiveUpdates()` **tylko gdy się zmieniło**. Zachowuje scroll + otwarty artykuł na PC.
- **Wznowienie apki (2026-07-16):** `syncDoseToTime` (na `visibilitychange`/`pageshow`) dla TEJ SAMEJ dawki odświeża teraz **w miejscu** przez `pollLiveUpdates()` (podmiana tylko gdy podpis treści się zmienił), a NIE `delete cache + loadDose(force)`. Wcześniej każdy powrót do apki kasował dane i przeładowywał dawkę od zera: stary DOM → skeleton → świeże = migotanie „stare artykuły, potem nowe" nawet bez zmian. Zmiana dawki (poranna→południowa) dalej robi pełny `switchDose` ze skeletonem. ⚠️ Osobno: pełny `reload()` przy wznowieniu robi `checkAppShellUpdate` gdy zmienił się `index.html` (network-first app-shell) — to główna przyczyna „wolnego ładowania po powrocie" przy częstych deployach; świadomie NIE ruszane bez zgody właściciela (trauma „zawieszenia na starej wersji").
- **Deep linki:** `#dawka/slug` i `#archive/data/dawka/slug` → otwierają news (mobile: toggle+scroll; desktop: `dtPickItem`). Slug = `itemSlug(text)`.
  - 🔴 **Fallback do archiwum w `routeDoseHash` (2026-08-07):** stuby `s/<slug>.html` (podgląd linku na X)
    żyją 14 DNI, ale ich cel `#<dawka>/<slug>` bot liczy z BIEŻĄCEGO `briefs.json` — a news wypada do
    archiwum po dobie. Bez fallbacku `routeDoseHash` kończył `if (!found) return` = pusta strona główna,
    czyli **każdy udostępniony link umierał następnego dnia**. Teraz przy nietrafieniu w bieżącą dawkę
    woła `otworzSlugZArchiwum(slug)` (skan do 14 dni archiwum wstecz, sekwencyjnie — trafienie w 1. dniu
    = jeden fetch). **Fix po stronie FRONTU celowo: naprawia też linki JUŻ wrzucone na X** (zmiana w bocie
    nie ruszyłaby starych stubów). ⚠️ Ogon niezałatany: karta-OBRAZEK (`og`) dla archiwalnego slugu bez
    `a=` wraca do grafiki zapasowej — bot powinien ustawiać `a=<data>` w `BudujStubHtml`.
  ⚠️ **Nasłuch `hashchange` (2026-07-22):** routing wydzielony z 2 IIFE do `routeArchiveHash`/`routeDoseHash` +
  dyspozytor `routeHashDeepLink` wołany na starcie ORAZ na `hashchange`. Wcześniej deep-linki działały TYLKO
  przy załadowaniu strony — klik w węzeł „Wątków dnia" (ustawia `location.hash` na żywej stronie) zamykał overlay
  i nic nie otwierał (feature był martwy). Teraz każda zmiana hasha routuje do newsa.
- ⚠️ **Wyścig `loadDose` (2026-07-22):** render bramkowany `if (dose === currentDose)` — dwa równoległe `loadDose`
  (deep-link `#evening` tuż po starcie na `morning`, szybkie klikanie zakładek) wrzucały treść jednej dawki pod
  zakładkę drugiej. Cache wypełniany zawsze (deep-link `tryOpen` go czyta), gate tylko na renderze.
- ⚠️ **Desktop: koniec podwójnego filtra suwakiem (2026-07-22):** `renderDose` trzyma `fullItems` (bez filtra
  suwaka) osobno i podaje je do `renderDesktop` (dtAllItems MUSI być pełne — liczniki sidebaru, widoki tematów,
  dtItemsMap; desktop filtruje SAM raz w `dtRenderFeed`) oraz `mobSwpBuildCats` (liczniki tematów). Wcześniej
  renderDesktop dostawał już przefiltrowaną listę → filtr aplikował się DRUGI raz (przy 50% widać było ~25%).
- ⚠️ **Live-tick/wznowienie zachowuje widok tematu (2026-07-22):** `pollLiveUpdates` zapamiętuje
  `mobActiveCat`/`dtActiveFilter` przed re-renderem i przywraca po (`mobileFilterCat`/`dtRenderCatFilter`, ten sam
  wzorzec co po zmianie suwaka). Wcześniej każdy zapis bota (~30-60 min) wyrzucał użytkownika z widoku tematu do
  pełnego feedu. Usunięte też zbędne drugie `renderDesktop` (renderDose woła je wewnętrznie — niszczyło błysk `.is-new`).
- ⚠️ **„Dziś" liczone LOKALNIE, nie w UTC (2026-07-22):** `watekWhen`/`watekNodeLink`/`dtRenderCatFilter`/
  `mobileFilterCat` używały `new Date().toISOString().slice(0,10)` (UTC) — między 00:00 a 02:00 czasu PL węzeł
  z dziś dostawał link `#archive/dziś/...` do nieistniejącego pliku. Teraz `todayLocalISO()` (jak `isPrevEdition`).
  ⚠️ Pełna poprawność cross-strefowa wymaga stempla strefy w `added_at` od bota — do zrobienia po stronie bota.
- **Panel szczegółów na PC** zostaje przy zmianie dawki — świadomie, żeby nie wyrzucać czytelnika
  z otwartego artykułu. ⚠️ **Zmiana 2026-08-01 (życzenie właściciela): na WEJŚCIU otwiera się od razu
  TOP STORY**, zamiast pustego placeholdera „wybierz news" — pusty panel marnował pół ekranu i zmuszał
  do kliknięcia czegokolwiek. Warunek `if (!dtCurrentItemId)` w `renderDesktop` sprawia, że dotyczy to
  **tylko pierwszego renderu**: przy zmianie dawki i live-ticku wybór użytkownika zostaje nietknięty.
  Deep-link nie koliduje — gdy routing zdążył wybrać artykuł, `dtCurrentItemId` jest już ustawione;
  gdy zdąży później, po prostu nadpisze top story. Fallback `dtShowEmpty()` został na pustą dawkę.
  ⚠️ **Konsekwencja do zapamiętania:** po zmianie dawki panel dalej pokazuje artykuł z POPRZEDNIEJ
  dawki (tak było zawsze). Gdyby właściciel chciał, żeby top story otwierał się też przy każdej zmianie
  dawki, wystarczy zerować `dtCurrentItemId` w `switchDose` — świadomie NIE zrobione, bo to zmienia
  udokumentowane zachowanie „panel zostaje".
- **Klik w logo „Brif.up" = powrót na aktualną dawkę** (`logoDoAktualnejDawki`, 2026-08-01). Logo działa
  jak przycisk „strona główna": wylicza dawkę z zegara (`getCurrentDose`), przełącza na nią, czyści
  `location.hash` (inaczej `routeHashDeepLink` przy najbliższym `hashchange` otworzyłby stary artykuł),
  zeruje `dtCurrentItemId` (żeby wrócił top story) i przewija oba panele na górę. Gdy jesteśmy JUŻ na
  właściwej dawce — nie przeładowuje (to dałoby zbędny skeleton), tylko otwiera top story wprost, żeby
  kliknięcie zawsze dawało widoczny efekt. Wpięte w oba loga: `.logo` (mobile) i `.dt-logo` (desktop),
  z `role="button"`, `tabindex` i obsługą Enter/Spacji.
- **Szerokość panelu szczegółów** (`.dt-body` w `styles.css`): **440px**, powyżej 1500px **510px**
  (zwężone 2026-08-01 z 480/560 na życzenie „trochę mniejszy, nieznacznie"). 🔴 **Nie schodź niżej bez
  sprawdzenia kafli notowań:** `.q-row` ma sztywne `.q-spark` 110px i `.q-vals` auto, a kurczy się
  WYŁĄCZNIE `.q-name` — przy 440px zostaje jej ~150px, czyli nazwa instrumentu jest skrócona
  wielokropkiem, ale widoczna. ⚠️ Nie myl tego z `@media (max-width:460px)` w sekcji notowań — tamto
  dotyczy VIEWPORTU (telefony), nie szerokości tego panelu, więc na desktopie nie zadziała jako zabezpieczenie.

## Helpery warte znać
- `displaySource(item)` — nazwa źródła; gdy brak `source_name`, pokazuje domenę z linku zamiast „—".
- `confirmCount(item)` / `srcBadge(item)` — badge „✓ N źródeł" (liczba różnych źródeł w klastrze). Styl stonowany; na telefonie w rogu kafelka (`.card-corner`).
- `impactHtml(item)` — linia „Wpływ na rynek" z kolorowaniem ↑/↓.
- `itemSlug`, `escAttr`, `NormalizujTekst`-brak (to bot).

## Wątek tematyczny — oś czasu (timeline) pod „Wpływ na rynek" (2026-07-14)
- **`watekHtml(item)`** — przycisk „🧵 Wątek tematu · N etapów" pod `impactHtml`, rozwija **pionową oś** (wariant A):
  kropki na osi, bieżący news = grubsza czerwona kropka + „TEN NEWS", chipy dawek (☀amber/◑blue/☽violet)+godziny,
  relacje przyczyna/skutek czerwonym mono, nagłówki DM Serif. Wpięte w **3 miejsca**: `expandBlock` (mobile ×2) +
  `dtShowDetail` (desktop). CSS klasy `.watek-*` w styles.css (zmienne `--rule/--bg/--red/--muted`, fonty z @import).
- **Dane:** `loadThreads()` fetchuje **`threads.json`** → mapa `THREAD_BY_TEXT` (match po znorm. tekście
  węzła; tylko wątki ≥2 węzły). Przycisk pojawia się TYLKO gdy post należy do wątku. **0 tokenów per klik** (gotowiec z bota).
  ⚠️ **Mapa wątków musi się ODŚWIEŻAĆ w otwartej apce (2026-07-26):** dawniej `loadThreads()` leciało TYLKO raz przy
  starcie, a live-tick odświeżał wyłącznie `briefs.json` → gdy bot przepisał nagłówek kontynuacji (nowe
  `DeepSeekDopiszEskalacjeDoTytulu`: „…drugiego drona w ciągu 24 godzin") albo dorzucił węzły w kolejnym biegu,
  klucz `normThreadKey(item.text)` przestawał pasować do mapy z chwili startu i **badge 🧵 znikał** — mimo że dane
  po obu stronach były poprawne (zgłoszenie właściciela: „nie miałeś tego dodać do wątku? przecież to eskalacja").
  Fix: `refreshThreadsIfChanged()` (porównuje `generated_at`) wołane w `liveTick` przy KAŻDEJ realnej zmianie
  `briefs.json` — bot zapisuje oba pliki w tym samym biegu, więc to 1 mały fetch na bieg. Gdy zmieniły się SAME
  wątki (treść dawki bez zmian), `pollLiveUpdates(wymusRender = true)` pomija check `doseSignature` i re-renderuje,
  żeby badge pojawił się bez czekania na kolejny zapis newsów. **ZASADA:** każdy nowy gotowiec od bota czytany
  raz przy starcie (mapy po TEKŚCIE newsa) trzeba odświeżać razem z `briefs.json` — teksty bywają przepisywane.
- **Pasek ciągłości sagi na kaflu w feedzie — `watekPasekHtml` (2026-08-02):** zgłoszenie właściciela
  („przecież masakra", dwa zrzuty z telefonu): w jednej dawce stały **dwa kafle o tym samym** — poz. 02
  „Interwencja walutowa USA i Japonii w obronie jena" i poz. 04 „USA **rozważa** zakup jenów za 5–10 mld USD",
  przy czym ten późniejszy opisywał WCZEŚNIEJSZY etap. Czytelnik odbiera to jako „portal się powtarza".
  Kafel niósł tylko ciche `🧵 7`, które nie mówiło ANI że to kontynuacja, ANI jakiego tematu.
  **Pasek:** kropki (pozycja w sadze) + `ciąg dalszy: <tytuł wątku>`, wstawiany NAD nagłówkiem w mobile
  (hero + oba szablony `restBlocks`) i desktopie (4 szablony `dt-item`). ⚠️ **Pokazywany DOPIERO OD 2. ETAPU**
  (`watekEtapInfo` zwraca `null` dla `idx < 1`) — pierwszy news sagi nie jest kontynuacją; bez tego warunku
  oznaczylibyśmy pół feedu i sygnał przestałby cokolwiek znaczyć. Dane z już wczytanej `THREAD_BY_TEXT`
  → **0 dodatkowych fetchy, 0 tokenów**. `WATEK_MAX_KROPEK = 12`: bot trzyma do 20 węzłów/wątek, więc powyżej
  capa kropki przestają być liczbą etapów, a zostają wskaźnikiem „jak daleko" (pozycja mapowana proporcjonalnie);
  dokładne „N z M" jest w `title`/`aria-label`. W `.watek-strip` kurczy się WYŁĄCZNIE `.ws-txt` — kropki niosą
  sygnał i nigdy nie mogą zostać wypchnięte.
  - **Badge `🧵 N` znika, gdy jest pasek** (`watekBadgeHtml` zwraca `''`, gdy `watekEtapInfo` niepuste) —
    inaczej ten sam fakt stał w kaflu dwa razy. Badge zostaje tam, gdzie paska nie ma (1. etap sagi).
  - ⚠️ **Wariant wizualny wybrany przez właściciela: B (stonowany pasek), NIE czerwony kicker** — przy dniu
    gęstym od sag mocny kicker zamieniał feed w ścianę czerwieni (widoczne na podglądzie: oznaczenie dostawały
    naraz sagi jena, Iranu i Ceuty). Kolor niesie sama kropka bieżącego etapu.
  - ⚠️ **Przy okazji naprawione: zdublowane „✓ N ŹRÓDŁA" na kaflach-klastrach** (mobile `restBlocks`) — licznik
    szedł RAZ w `catMetaRow`, a DRUGI raz jako `srcBadge` w `.card-corner`. `.card-corner` usunięty z tego
    szablonu; **hero go zachowuje**, bo hero nie renderuje `catMetaRow`.
  - 🔴 To jest **łagodzenie objawu, nie przyczyny** — dwa kafle o tym samym wydarzeniu nadal nie powinny
    powstawać. Naprawa u źródła jest po stronie bota (werdykt `COFNIĘCIE` w bramce cross-bieg dedupu) —
    patrz `financialnewsbot/CLAUDE.md`, sekcja „Retrogresja etapu sagi".
- ⚠️ **Podpozycja klastra DZIEDZICZY wątek po kotwicy (2026-08-04):** zgłoszenie właściciela — „skoro
  jakiś post znajduje się w wątku, to powinien ten wątek być do niego przyczepiony". Bot buduje sagi
  WYŁĄCZNIE z pozycji top-level, więc news wchłonięty do klastra przestawał być węzłem i tracił
  oznaczenie — mimo że klaster z definicji znaczy „to samo wydarzenie z różnych źródeł", czyli
  podpozycja jest TYM SAMYM etapem sagi co kotwica. Zmierzone: 9 takich podpozycji w jednym wydaniu
  (wobec 1, która była węzłem sama z siebie). `threadForItem` ma fallback na `_parentText`, nadawane
  przez `oznaczKotwice` przy budowie cache — **wpięte w 3 ścieżki**: `loadDose`, archiwum i SAMPLE.
  ⚠️ `watekKluczBiezacego` podświetla na osi węzeł KOTWICY (tekst podpozycji nie pasuje do żadnego
  węzła, więc bez tego oś nie miałaby zaznaczonego „ten news").
  ⚠️ Dziedziczenie dotyczy WYŁĄCZNIE podpozycji — pozycje top-level działają jak dotąd, więc paski
  ciągłości i logika „badge milczy, gdy jest pasek" pozostają nietknięte. Do obserwacji: w gęstym
  wydaniu badge dostaje większość podpozycji (10 z 12 zmierzone) — klastry powstają wokół dużych
  wydarzeń, a te tworzą sagi; gdyby sygnał zaczął szumieć, zawęzić do kotwic będących ≥2 etapem.
- 🔴 **Rozwinięcie klastra na desktopie OTWIERA TEŻ KOTWICĘ w panelu (2026-08-04):** zgłoszenie
  właściciela — „wchodzę na «USA wprowadzają cła i cenę minimalną» i dalej nie mam wątku po prawej".
  `dtToggleGroup` **tylko rozwijał listę i nigdy nie wołał `dtShowDetail`**, więc kotwicy klastra
  na desktopie NIE DAŁO SIĘ otworzyć — klikalne były wyłącznie podpozycje. A wątki bot buduje
  z pozycji TOP-LEVEL, czyli to właśnie kotwica jest węzłem sagi (tu: „Cła Trumpa na cały świat",
  etap 6/6), a podpozycje węzłami nie są. Efekt: dla KAŻDEGO klastra-węzła oś wątku była nieosiągalna,
  mimo że `dtShowDetail` renderuje ją poprawnie. ⚠️ Badge z poprzedniej poprawki mówił „tu jest saga",
  a kliknięcie i tak jej nie pokazywało — czyli tamta zmiana odsłoniła dopiero POŁOWĘ problemu.
  Kotwica bez artykułu (parasol) też ma co pokazać: nagłówek, oś wątku i „Inne wpisy".
- ⚠️ **Podpozycje klastra też mają badge — `watekBadgeSubHtml` (2026-08-04):** zgłoszenie właściciela
  („jak wchodzę w klaster, to wątku nie widać, tylko jak są osobne posty"). Wiersz podpozycji renderował
  WYŁĄCZNIE flagę i tekst, więc news schowany w klastrze nie miał ŻADNEGO oznaczenia sagi — mimo że po
  rozwinięciu artykułu oś wątku była na miejscu (`expandBlock`/`dtShowDetail` wołają `watekHtml`). Dane
  i timeline były poprawne; brakowało sygnału NA LIŚCIE, żeby wiedzieć, że warto tam wejść. Zmierzone:
  42 podpozycje w briefs+archiwum są węzłami sag. Wpięte w **3 szablony**: `renderSubItems` (mobile),
  archiwalny wiersz podpozycji i oba `dt-sub-item` (desktop).
  🔴 **Osobna funkcja, NIE `watekBadgeHtml`:** tamta MILCZY od 2. etapu, bo na kaflu tę samą informację
  niesie pasek `watekPasekHtml` — a w wierszu podpozycji paska NIE MA, więc badge musi się pokazać ZAWSZE.
  Świadomie badge, nie pasek: pasek to cała linia z tytułem sagi i rozwaliłby zwarty układ listy w klastrze.
- **Badge `🧵 N` na kaflach (2026-07-17):** `watekBadgeHtml(item)` w `catMetaRow` (mobile) i wszystkich 3 szablonach
  `dt-item-meta` (desktop; warunek meta rozszerzony o `threadForItem`) — wątki widać z LISTY, nie dopiero po otwarciu
  artykułu. Po dociągnięciu threads.json `loadThreads().then(...)` robi re-render bieżącej dawki (badge bez czekania
  na live-tick). CSS `.watek-badge` (czerwony mono chip, wariant dark).
- **Sagi wielodniowe (2026-07-17):** bot trzyma węzły do 7 dni (cap 20/wątek) — `watekWhen` dokleja przedrostek daty
  „16.07" dla węzłów z innego dnia niż dziś. Patrz `financialnewsbot/CLAUDE.md` sekcja „Wątki".
- **Widok „Wątki dnia" (2026-07-17):** przycisk 🧵 w topbarze → overlay `#watkiOverlay` (klasy `.archive-overlay` +
  własne `.watki-*`): lista sag ≥2 węzły sortowana po świeżości ostatniego etapu (tytuł serif + memo kursywą +
  licznik), tap rozwija oś (`.watek-timeline`), klik w węzeł = deep link `#dawka/slug` (węzły z poprzednich dni →
  `#archive/data/dawka/slug`). Render z już wczytanego THREADS — 0 dodatkowych fetchy.
- `threads.json` pisze bot (`BuildThreadsOnSite`, tryb `BUILD_THREADS`/normalny bieg) — kształt `{date, generated_at,
  threads:[{id,title,memo,nodes:[{text,added_at,dose,flag,source_url,relacja}]}], seen:[...]}`.
- **Uwaga:** `let`-zmienne (THREADS, THREAD_BY_TEXT) NIE są na `window` (eval w preview ich nie widzi — testuj przez funkcje).
- **Podgląd lokalny:** sandbox BLOKUJE serwowanie z `~/Documents` (http.server --directory tam → 404). Kopiuj pliki do
  scratchpada i serwuj stamtąd. Bump `CACHE_NAME` (SW) przy każdej zmianie — inaczej desktop/mobile trzymają starą wersję (cache).

## Mobile: panel Tematy (swipe + peek) i suwak jakości PER TEMAT (2026-07-11)
- **Zmiana dawki swipe'em** (`.scroll-area` touchstart/touchend, IIFE „Swipe między dawkami") — dojście do
  granicy (np. `afternoon→morning`, potem jeszcze raz w tę samą stronę) **kontynuuje ten sam gest**: zamiast
  nic nie robić, wysuwa panel `#mobSwpPanel` do **peeku** (klasa `.peek`, `width: min(60vw, 270px)` — 60%
  **szerokości ekranu**, NIE sztywnego 270px panelu, inaczej na szerszych telefonach wygląda jak mniej niż 60%).
  Kolejny swipe w tę stronę → pełne `open`; swipe w drugą stronę podczas peeku → `mobSwpClose()`.
- **Stary gest** (przeciąganie `#mobEdgeGrip`, prawy/lewy skraj) działa równolegle, bez zmian.
- **Suwak jakości PER TEMAT** (zastąpił globalny suwak „SAMO MIĘSO↔WSZYSTKO", usunięty 2026-07-11 z mobile
  i desktopu — HTML/CSS/JS, `onMeatSlide`/`meatBar`/`dtMeatBar` skasowane). Każdy temat pamięta WŁASNY próg:
  `catMeatMin` (obiekt `{kategoria: meatMin}`) w `localStorage['brifup_cat_meat']`, dzielony między mobile i
  desktop. `getCatPct(cat)`/`setCatPct(cat,pct)` (klucz `localStorage['brifup_cat_pct']`).
  - ⚠️ **PERCENTYL per-temat, nie próg absolutny (2026-07-14):** wcześniej suwak = absolutny próg `meatScore`
    (skala 0-40, `MEAT_MAX`) — niesprawiedliwy: „Wojna Iran" ma reach 30-40, „Tech" 5-15, więc ten sam próg kosił
    Tech a Iran zostawiał w całości (user to zgłosił). Teraz suwak = **„pokaż top X% newsów TEGO tematu"** wg
    `meatScore` (`topPctByScore`, min 1 = podłoga). Auto-normalizuje się względem każdego tematu osobno.
  - **`meatScore` = `reach + (klaster>1 ? klaster*6 : 0) + (ma impact ? 12 : 0)`.** Impact (linia „Wpływ na rynek")
    liczy się TYLKO gdy jest — a że jest rzadki w „Świat"/„Polityka lokalna" (8-9% wpisów) a częsty w Iran/Surowce/
    Fed (37-71%, zmierzone), bonus sam się dobiera do tematu, BEZ konfiguracji per-kategoria. Percentyl sprawia,
    że liczy się RANKING w temacie, nie skala absolutna — dlatego sygnały można mieszać.
  - **UI = wariant B (od 2026-07-14): cienka linia na DOLE wiersza** (`catFillBarHtml(cat)` → `.cat-fill-bar`):
    nazwa tematu + `%` (niebieski, bold) w wierszu, a pod spodem 3px pasek — niebieskie wypełnienie
    (`.cat-fill-bar-fill`) do pct% na szarym tracku (`.cat-fill-bar::after`). Sticky nad listą tematu.
    Wcześniej było wariant „E" (całe tło wiersza jako fill) — user wybrał B jako lżejszy. **Zmiana była CZYSTO CSS**
    (`styles.css` `.cat-fill-bar*`) — markup i gest przeciągania bez zmian.
  - **Read-only wskaźnik poziomu pod KAŻDYM tematem na LIŚCIE (2026-07-14):** `catLevelBarHtml(cat)` → `.cat-level-bar`
    (osobna klasa niż interaktywny `.cat-fill-bar`, `pointer-events:none`, żeby gest przeciągania go nie łapał i
    tapnięcie w temat działało). Cienki 2px pasek na dole wiersza (miękkie niebieskie wypełnienie do pct%), wstrzykiwany
    w `dtRenderSidebar`/`dtRenderSidebarCounts` (desktop `.dt-index-item`) i `mobSwpBuildCats` (mobile `.mob-swp-cat`).
    **Regulacja NADAL tylko w widoku tematu** (sticky `.cat-fill-bar`); lista to sam podgląd. Po zmianie progu
    `refreshCatLevelBars(cat)` aktualizuje paski na listach na żywo. User chciał „pod każdym tematem, tylko wizualnie".
  - **Gest = przeciągnięcie WPROST po pasku** (pointer events, działa touch+mysz, delegacja na `document`
    przez `.closest('.cat-fill-bar')` — przeżywa re-render przy każdym puszczeniu). Na mobile wpięte w
    `mobileFilterCat`, na desktopie w `dtRenderCatFilter` + `#dtCatFillBarWrap` (w `.dt-feed`, nad `dtFeedList`).
  - Podłoga: wąski temat nigdy nie pustoszeje — przy skrajnym filtrze pokazuje przynajmniej najgrubszy news.
  - ⚠️ **Próg działa też na GŁÓWNYM feedzie (naprawione 2026-07-14):** wcześniej `catMeatMin` filtrował TYLKO widok
    pojedynczego tematu (`mobileFilterCat`/`dtRenderCatFilter`); główny feed go ignorował, bo `renderDose` wołał
    martwą globalną `filterByMeat` (`meatMin=0` od usunięcia globalnego suwaka), a `dtRenderFeed` nie filtrował wcale.
    User zgłosił: „ustawiam 50% a na porannej dawce nic się nie zmienia". Teraz oba główne feedy wołają
    **`filterByCatMeat(items)`** — każdy news oceniany progiem SWOJEJ kategorii (`dtGetCategory`), `items[0]` (top
    story) zawsze zostaje, podłoga per-temat (najgrubszy news zostaje) — spójne z widokiem tematu.

## Kategorie: grupa „KONFLIKTY" + rename wojen (2026-07-16)
- **Rename** (życzenie właściciela): `Wojna Ukraina` → **`Wojna na Ukrainie`**, `Wojna Iran` → **`Wojna w Iranie`**. Zmienione WSZĘDZIE gdzie nazwa jest kluczem: zwroty `dtGetCategory`, `DT_CAT_COLORS`, `DT_CAT_FLAG`, `DT_CAT_ORDER`. (Uwaga: progi per-temat w localStorage `catMeatMin`/`catMeatPct` były kluczowane starą nazwą → po rename wracają do domyślnych dla przemianowanej kategorii; świadomie bez migracji, drobiazg.)
- **Kolejność:** obie wojny przeniesione na **DÓŁ** `DT_CAT_ORDER` (były na górze).
- **Grupa „⚔ KONFLIKTY"** — nagłówek sekcji nad wojnami (wariant A: czysto wizualny, NIE osobny filtr). `KONFLIKTY_CATS = ['Wojna na Ukrainie','Wojna w Iranie']` + helper `konfliktyHeaderHtml(c, obecne, cssClass)` — zwraca nagłówek tylko przed PIERWSZĄ obecną kategorią-konfliktem. Wpięte w **3 renderery**: `dtRenderSidebar`, `dtRenderSidebarCounts` (desktop, klasa `.dt-index-group`) i `mobSwpBuildCats` (mobile, klasa `.mob-swp-group`). CSS obu klas w `styles.css` (czerwony mono nagłówek + górna kreska). Zweryfikowane renderem realnej strony (desktop + mobile, liczniki żywe).

## Podświetlenie NOWYCH artykułów od ostatniej wizyty (2026-07-14)
Bez żadnych napisów „NOWE" — sam **chwilowy błysk** artykułów, które pojawiły się od poprzedniego wejścia
(user: „na chwilę dosłownie podświetla się artykuły które są nowe").
- **Baseline** = `localStorage['brifup_last_seen']` (ms, najnowszy widziany `added_at`). Ustalany RAZ na starcie
  sesji (`sessionNewThreshold`, IIFE) — nie rusza się przy zmianie dawki, żeby wszystkie dawki mierzyć względem
  tego samego momentu wejścia. **Pierwsza wizyta** (brak zapisu) → `Infinity` = nic nie błyska (nie zalewamy
  nowego usera całym feedem).
- **`markNewItems(items)`** — dla itemów z `itemTimestamp(it) > sessionNewThreshold` dokłada klasę `.is-new` na
  element (`_flashedItems` Set pilnuje, żeby ten sam item nie błysnął ponownie przy re-renderze/live-update).
  Prefiks id dobierany jak w renderze: desktop `dti-`, mobile klaster `group-`, mobile pojedynczy `item-`.
  Po `animationend` klasa jest zdejmowana. Wołane w `renderDose` (mobile) i `dtRenderFeed` (desktop).
  Na końcu przesuwa `brifup_last_seen` do `maxTs` — następna wizyta liczy się od najnowszego już zobaczonego.
- **CSS** (`styles.css`): `.is-new::after` — nakładka `inset:0` `rgba(29,78,216,.16)` (dark `rgba(96,165,250,.22)`),
  `pointer-events:none`, `@keyframes brifNewFade` 2.6s → opacity 1→0. Nakładka, nie tło elementu — nie rusza
  czytelności tekstu. Klasy: `.news-item`/`.hero-card` (mobile) + `.dt-item` (desktop).

## ⚠️ Service Worker cache — BUMPOWAĆ PRZY KAŻDEJ zmianie CSS/JS
`service-worker.js`: `CACHE_NAME = 'brifup-cache-vN'`. Użytkownicy dostają PWA z cache — jeśli nie zbumpujesz
wersji, zmiany w `index.html`/`styles.css` są niewidoczne mimo poprawnego push (user zgłosił to 2026-07-11:
"nic nie widzę" mimo że kod na produkcji był już poprawny — przyczyna: stary cache). Bumpuj **przy każdym
commicie** dotykającym CSS/JS, nawet drobnym.
- ⚠️ **Bump CACHE_NAME to NIE wszystko — cache HTTP też (2026-07-16):** telefon dostał NOWY `index.html`
  (pobierany z `cache:'reload'`) + STARY `styles.css` = rozjechany render (flaga sklejona z kategorią, brak
  wersalików/badge'a). Przyczyna: SW pobierał CSS/JS zwykłym `fetch(request)` (gałąź „pozostałe statyczne"),
  który respektuje cache przeglądarki/Cloudflare (GitHub Pages daje `styles.css` max-age) → stary plik mimo
  bumpa CACHE_NAME (to był cache HTTP, nie SW). **Fix:** CSS/JS pobierane z `{cache:'reload'}` (jak `index.html`),
  regex `wymusSwiezyCssJs` w fetch-handlerze. Teraz zmiana stylów jest widoczna od razu, bez czekania aż wygaśnie
  cache HTTP. Zasada: bump CACHE_NAME dalej rób (warstwa offline/precache), ale realną świeżość daje `cache:'reload'`.
- **Po deployu telefon z już zainstalowanym starym SW potrzebuje ~2 odświeżeń:** 1. instaluje nowy SW
  (skipWaiting+clients.claim), 2. nowy SW serwuje świeży CSS. Pierwszy load po zmianie bywa jeszcze stary.
- ⚠️ **Zatruty cache powłoki = białe tło przy starcie (2026-07-17, zgłoszenie właściciela):** `cache.put` szedł BEZ
  sprawdzenia `response.ok` — błędna odpowiedź (5xx/zaślepka Cloudflare) lądowała w cache jako `./index.html`, a
  stale-while-revalidate serwował ją NATYCHMIAST przy każdym starcie → biały ekran do czasu nadpisania dobrą kopią.
  Fix (SW v45): (1) do cache trafia tylko `response.ok` (nawigacja + statyczne), (2) zatruty wpis w cache jest
  ignorowany i kasowany, (3) `importScripts` OneSignal w try (zablokowany CDN nie ubija całego SW), (4) watchdog
  w index.html: 8 s bez żadnego renderu → czyszczenie cache + reload raz na sesję (normalny start renderuje
  skeleton w <1 s, więc przy zdrowej apce nie odpala się nigdy).
- ⚠️ **App-shell `index.html` = STALE-WHILE-REVALIDATE dla NAWIGACJI (2026-07-16, zgłoszenie „apka wolno się ładuje"):**
  fetch-handler dla `event.request.mode === 'navigate'` oddaje `index.html` NATYCHMIAST z cache (szybkie ładowanie),
  a świeży pobiera w tle. Wersję/świeżość pilnuje dalej `checkAppShellUpdate` (index.html) — pobiera index.html
  SIECIĄ żądaniem NIE-nawigacyjnym (`fetch('./index.html',{cache:'reload'})` → trafia w gałąź network-first
  „pozostałe statyczne", która AKTUALIZUJE cache pod `./index.html`), porównuje ETag i przy zmianie robi `reloadOnce`
  → reload serwuje już nową powłokę z cache. **Bezpiecznik zachowany:** apka NIE MOŻE utknąć na starej wersji
  (detekcja+reload łapią zmianę w ciągu jednego powrotu). **Fail-safe:** gdyby `navigate`/klucze cache się nie zgadzały,
  degraduje do starego network-first (brak przyspieszenia, ale bez zepsucia). ⚠️ Nie dało się w pełni przetestować w
  sandboxie (SW nie rejestruje się — `importScripts` OneSignal CDN zablokowany egress; na produkcji działa) — zweryfikować
  realny czas ładowania na urządzeniu.

- ⚠️ **Gałąź `navigate` TYLKO dla powłoki głównej (2026-07-22, SW v47):** scope SW to cały origin, więc w
  stale-while-revalidate wpadały też wejścia na PODSTRONY (`lejek.html`/`knaga.html`/`fala.html`/`bot-health.html`):
  (a) serwowały `index.html` ZAMIAST właściwej strony (wejście na lejek → widać główną apkę), (b) rewalidacja
  w tle robiła `cache.put('./index.html', <treść podstrony>)` → ZATRUCIE powłoki (`response.ok=true`, więc check
  `!cached.ok` tego nie łapał) → każdy kolejny start PWA otwierał lejek jako stronę główną, aż watchdog (8 s
  białego ekranu) wyczyścił cache. **Fix:** gałąź navigate bramkowana `new URL(url).pathname === '/' ||
  endsWith('/index.html')`; podstrony lecą do network-first (cache pod WŁASNYM URL-em, nie nadpisują powłoki).

## Bezpieczeństwo — sanityzacja URL w href (2026-07-22) ⚠️
`source_url`/`rssLink` pochodzą z zewnętrznego łańcucha (RSS wydawców, dekoder Google News, Bing apiclick) —
traktujemy je jak wrogie. Wszystkie inne pola (`text`/`article`/`source_name`/`image_url`) były escapowane
(`escHtml`/`escAttr`), ale href-y przycisków „Czytaj →"/„CZYTAJ →" szły do innerHTML SUROWO (`index.html` ×3:
`expandBlock`/`expandBlockArchive`/`dtShowDetail`; `fala.html` `cta.href`). URL z `"` mógł wyłamać się z atrybutu
i dokleić `on*=`, a `javascript:`/`data:` — wykonać kod na origin brifup.com (ten sam origin trzyma token GitHub
admina w sessionStorage). **Fix — `safeUrl(u)`** (przy `escHtml`): przepuszcza WYŁĄCZNIE `^https?://`, na wyjściu
`escAttr`; zły schemat/pusty → `''` = brak przycisku. W `fala.html` (przypisanie przez DOM property, nie innerHTML)
sam guard schematu inline. **ZASADA:** każdy nowy href z danych → przez `safeUrl`, nigdy surowo.

## Wykresy notowań pod „Wpływ na rynek" — quotes.json (2026-07-31)
Życzenie właściciela („a co gdyby dodać prawdziwe wykresy jak ma X, ale bez wysokich zużyć tokenów").
**Koszt DeepSeeka: 0** — instrument wykrywa bot deterministycznie z pola `impact`, front tylko rysuje.
- **`quotes.json`** (nowy plik, pisany przez bota) — `{generated_at, stan_na, series:{SYMBOL:{nazwa,waluta,dec,
  ostatnia,zmiana_pct,zrodlo,punkty:[...30 dziennych zamknięć]}}}`. **OSOBNY od `briefs.json`**, bo notowania
  starzeją się co bieg, a briefs i archiwum mają zostać niezmienne. Item niesie tylko `chart:["META","QQQ"]`.
- **`loadQuotes()` + `refreshQuotesIfChanged()`** — wzorzec 1:1 jak `threads.json`. ⚠️ Odświeżane w `liveTick`
  przy KAŻDEJ realnej zmianie `briefs.json` — inaczej kafel pokazuje cenę sprzed godzin przy świeżym newsie
  (dokładnie ta sama pułapka co z mapą wątków, 2026-07-26).
- **`sparklineSvg()`** — wykres czystym SVG z tablicy zamknięć (ścieżka + gradient pod nią). Zero bibliotek,
  zgodnie z zasadą „bez frameworka, bez builda".
- **`quotesHtml(item)`** wpięte pod `impactHtml` w **3 miejscach** (`expandBlock`, `expandBlockArchive`,
  `dtShowDetail`) — ten sam zestaw co przy `safeUrl`. FAIL-SAFE na każdym kroku: brak `quotes.json`, brak pola
  `chart`, nieznany symbol albo seria <2 punktów = pusty string = nic się nie renderuje.
- ⚠️ **`zmiana_pct` = zmiana SESYJNA (od 2026-08-03).** Wcześniej bot liczył ją od pierwszego punktu serii,
  czyli za ~30 sesji, a front stawia ją tuż przy cenie i koloruje na zielono/czerwono — czytelnik odbierał to
  jako „dziś". Zgłoszenie właściciela: pod newsem o rekordowym zamknięciu Wall Street kafel pokazywał
  `QQQ −5,13%`, gdy dwa ostatnie punkty tej samej serii dawały +1,76%. Zmiana za cały okres jest dalej
  w danych (`zmiana_okres_pct` + `punktow_okres`) i ląduje w podpowiedzi wiersza (`title`), żeby nie zniknęła
  bez śladu. ⚠️ Sparkline dalej rysuje **cały** okres, więc zielona liczba może stać przy opadającej linii —
  to nie jest błąd, tylko dwa różne horyzonty; podpowiedź podaje oba.
- ⚠️ **Stopka „stan na …" jest OBOWIĄZKOWA** — dane są godzinne i opóźnione, nie live. Bez niej kafel sugeruje
  notowania w czasie rzeczywistym.
- ⚠️ **Szerokości w `.q-row`: jedynym elementem, który wolno ścisnąć, jest `.q-name`.** Pierwsza wersja miała
  sztywne `min-width` na cenie i zmianie — w panelu szczegółów na desktopie (~440 px) procent zmiany był
  wypychany poza `overflow:hidden` kontenera i ZNIKAŁ. Złapane na renderze realnej strony, nie w mockupie.
  Stąd układ `[.q-head] [.q-spark] [.q-vals]`, gdzie tylko `.q-head` ma `flex:1 1 auto; min-width:0`.
  Poniżej 460 px nazwa chowa się całkiem (zostawała z niej sama wielokropkowa końcówka).
- Wariant wizualny wybrany przez właściciela: **A (pasek gazetowy)**, nie ciemny kafel w stylu X.
- Źródła danych i ich granice — patrz `financialnewsbot/CLAUDE.md`, sekcja „Notowania".
- 🔴 **KLUCZE SERII ROPY ZMIENIONE `BNO`→`BRENT`, `USO`→`WTI` (2026-08-10).** Zgłoszenie właściciela: pod
  artykułem „Brent przebyła 84 USD/bbl" stał kafel `BNO 46,93 USD`. Ropa jechała na funduszach ETF, a te
  trzymają kontrakty terminowe — **nie ma mnożnika** na cenę baryłki, więc bot przeszedł na realne notowania
  ze Stooq. **95 referencji `chart:[...]` w `briefs.json` i `archive/*.json` PRZEPIĘTE** w tym samym commicie
  — bez tego pozycje z archiwum zostałyby z kluczem, którego `quotes.json` już nie zna, czyli bez wykresu.
  ⚠️ **Dokładając instrument, którego klucz kiedykolwiek trzeba będzie zmienić, licz się z migracją archiwum**
  — front dopasowuje serię po kluczu DOSŁOWNIE. Przy XAU dlatego klucz zamrożono; tu zmieniał się instrument,
  nie jednostka, a **na telefonie (<460 px) `.q-name` jest ukryta**, więc czytelnik widziałby sam ticker `BNO`.

## Udostępnij na X — ✅ W PANELU (2026-08-01), ⚠️ na `index.html` DALEJ NIEZAIMPLEMENTOWANE
Życzenie właściciela: wrzucać 3-4 najlepsze newsy dziennie na X. Wybrany wariant: **właściciel sam wybiera
news na stronie i klika „Udostępnij" — composer X otwiera się z GOTOWĄ treścią.** Żadnego API X, żadnych
kluczy, zero kosztu (X zlikwidował darmowy tier w lutym 2026 i liczy $0,20 za post z linkiem — szczegóły
rozpoznania w `financialnewsbot/CLAUDE.md`, sekcja „Gotowiec pod X").

**Stan na 2026-08-01:** przycisk „Wrzuć na X" działa w `knaga.html` (panel — właściciel przegląda dawkę
i wybiera newsy do wrzucenia; to było realne życzenie: wybierać z panelu, nie z publicznej strony).
Wpięty w 3 miejsca renderu panelu: kotwica grupy, każdy news w klastrze, post samodzielny.
Na `index.html` (dla czytelników) przycisku NADAL NIE MA — opis „gdzie wpiąć" niżej zostaje aktualny.
⚠️ `x_post` od bota **nie istnieje** (zmierzone 2026-08-01: 0/70 itemów) — panel jedzie w całości
na fallbacku `item.text`, dlatego fallback jest OBOWIĄZKOWY, a nie „na wszelki wypadek".

- 🔴 **Link do komentarza = STUB, nie hash (2026-08-02):** pole `xLink` w knadze podawało
  `brifup.com/#dawka/slug`, który na X i Slacku daje **generyczną kartę strony głównej** — fragment nigdy
  nie dociera do crawlera. Teraz `linkDoUdostepnienia` podstawia `brifup.com/s/<slug>.html` (stub z własnymi
  `og:*`/`twitter:*`, przekierowujący człowieka JS-em do apki). ⚠️ **Sprawdzane HEAD-em przed podmianą** —
  stub powstaje dopiero pod koniec biegu bota i ma retencję 14 dni, więc dla newsa świeżo opublikowanego
  albo starego może go nie być; wtedy wracamy do adresu hashowego (lepiej gorsza karta niż link w 404).
  ⚠️ Zasada „link NIE idzie w treść głównego posta" **bez zmian** — to dotyczy wyłącznie adresu do komentarza.
- ⚠️ **Stub POWSTAJE PÓŹNIEJ NIŻ NEWS — panel ponawia sprawdzenie (2026-08-04):** zgłoszenie
  właściciela („dlaczego się zły link wygenerował?"). Nic nie było zepsute: news był top-level, slug
  poprawny, stub i manifest w porządku — **to wyścig**. W jednym biegu bota `briefs.json` leci NA
  POCZĄTKU, a `ZapiszStubyNaSite` na KOŃCU; zmierzone na 8 biegach: **mediana 5,2 min, maksimum
  6,1 min** odstępu, plus deploy Pages. Knaga sprawdzała stub JEDEN raz przy otwarciu panelu, więc
  kliknięcie świeżego newsa (czyli dokładnie wtedy, kiedy chce się go wrzucić) zostawiało link
  hashowy NA STAŁE. Teraz `xSledzStub` dosprawdza w rosnących odstępach (0/5/10/20/30/60 s), dopóki
  panel jest otwarty na TYM newsie, i podmienia link w chwili pojawienia się stuba; `zamknijX`
  przerywa pętlę. Do tego komunikat pod polem, żeby było wiadomo, że warto poczekać.
  ⚠️ Diagnozując podobne: manifest `s/_index.json` trzyma PEŁNE ŚCIEŻKI (`s/jtgyxr.html`), nie same
  slugi — sprawdzenie „czy slug jest w manifeście" po samym slugu zawsze zwróci fałszywy brak.
- 🔴 **NEWS W KLASTRZE NIE MA STUBA — fallback odpala się ZAWSZE (2026-08-02, zgłoszenie właściciela):**
  „chciałem udostępnić post SpaceX, ale nie wygenerowało naszego linku z podglądem". Przyczyna nie leży
  we froncie ani w funkcji `og`: **`ZapiszStubyNaSite` w bocie iteruje po `d.Items`, czyli wyłącznie po
  pozycjach TOP-LEVEL** — do `subItems` nie wchodzi. `linkDoUdostepnienia` liczy tymczasem slug z
  `item.text` KAŻDEGO newsa, także sub-itemu, więc dla newsa schowanego w klastrze dostaje adres,
  który nie istnieje → HEAD 404 → link hashowy → **X pokazuje generyczną kartę strony głównej**.
  ⚠️ **Objaw myli:** wygląda jak awaria generatora obrazka, a `og` odpowiada poprawnie — po prostu
  nikt go nie pyta, bo crawler nigdy nie dostaje stuba. **Diagnozując „nie ma podglądu" sprawdź
  NAJPIERW, czy news jest top-level, czy sub-itemem** (`briefs.json`, pole `subItems` kotwicy).
  **Lek: rozdzielić klaster** — `ZapiszStubyNaSite` jest samoleczące i odtworzy stub w kolejnym biegu.
  Zweryfikowane 02.08 na realnym przypadku (SpaceX): po rozdzieleniu `s/1jj229t.html` → 200 w ciągu
  jednego biegu, karta 1200×630 z właściwym nagłówkiem i kategorią.
  ⚠️ **Nie obchodź tego dopisując stub ręcznie** — patrz sekcja „Pliki", `s/<slug>.html`.
- **Skąd treść:** bot dopisuje do każdego itema pole **`x_post`** w `briefs.json` (hook + 1 zdanie z liczbami
  z artykułu, ≤250 zn.). Front go tylko czyta — 0 tokenów per klik, jak przy `threads.json`.
  **FALLBACK obowiązkowy:** brak/`null` `x_post` (stare itemy, gotowiec odrzucony przez bramkę pokrycia liczb)
  → użyj samego `item.text`. Przycisk ma działać ZAWSZE.
- **Mechanizm:** `https://x.com/intent/post?text=<encodeURIComponent>&url=<deep link>` otwierany w nowej
  karcie. Web Intent działa bez auth (dokumentacja X aktualizowana 2026-06-03).
- **Deep link = `https://brifup.com/#<dawka>/<itemSlug(text)>`** — klikający ląduje na OTWARTYM artykule,
  nie na stronie głównej. Slug liczy istniejąca `itemSlug` (djb2-xor po pierwszych 80 zn., base36).
  Dla itemów z archiwum: `#archive/<data>/<dawka>/<slug>` (ten sam format co węzły wątków).
  ⚠️ Deep-linki routują się na żywo od 2026-07-22 (`routeHashDeepLink` na `hashchange`) — działa.
- **Gdzie wpiąć:** obok istniejącego „Czytaj →" w **3 miejscach** `index.html` — `expandBlock` (mobile),
  `expandBlockArchive` (mobile-archiwum), `dtShowDetail` (desktop). Ten sam zestaw co przy `safeUrl`.
- ⚠️ **URL intentu buduj przez `encodeURIComponent`, a href przepuść przez `safeUrl`** (patrz sekcja
  „Bezpieczeństwo" wyżej) — `x_post` to tekst z modelu, wchodzi do atrybutu.
- ⚠️ Zmiana dotyka JS+CSS → **bump `CACHE_NAME`** w `service-worker.js`.
- **Budżet treści posta = 300 znaków** (`X_TEXT_MAX` w knadze + `MAX_ZNAKOW` w `gotowiec-x` — zmieniaj OBA
  naraz; podniesione z 250 na życzenie właściciela 2026-08-04, „często ucina"). Stare 250 zakładało link
  w treści (280 − 23 na t.co), ale link idzie do KOMENTARZA. ⚠️ Standardowe konto X tnie na 280 — 300
  wymaga Premium; gdyby X odrzucał posty, wróć do 280. ⚠️ Zmiana `MAX_ZNAKOW` wymaga redeployu funkcji
  (`supabase functions deploy gotowiec-x`) — sama zmiana w repo NIE wystarcza.

## Udostępnij: link do STUBA, nie adres hashowy (2026-08-09) 🔴
Zgłoszenie właściciela: link wysłany na Messengera pokazywał kartę z **samą domeną „brifup.com"** —
bez tytułu i **bez żadnej grafiki, nawet tej podstawowej**.
- 🔴 **Przycisk „Udostępnij" wysyłał adres HASHOWY** (`brifup.com/#<dawka>/<slug>`). Fragment po `#`
  nigdy nie dociera do serwera, więc crawler FB czytał meta STRONY GŁÓWNEJ. Knaga rozwiązała to
  w sierpniu (`linkDoUdostepnienia`), publiczny front nigdy tej poprawki nie dostał — dokładnie ta
  klasa dryfu, dla której istnieje `WSPOLNE_ODRZUCENIA` w bocie.
- **Stub z pełną kartą ISTNIAŁ przez cały czas** — zmierzone: `brifup.com/s/bn2vb6.html` oddaje 200
  z poprawnym `og:title`/`og:image`. Objaw mylił: wyglądało na awarię generatora obrazka, a nikt go
  po prostu nie pytał (ta sama pomyłka diagnostyczna co przy podpozycjach klastra 02.08).
- **Podmiana w `shareItem`, czyli W CHWILI KLIKNIĘCIA**, nie przy renderze. Pierwsza wersja liczyła
  adres w `expandBlock`/`dtShowDetail` — a manifest/HEAD dociąga się RÓWNOLEGLE z pierwszym renderem
  i zwykle przychodzi po nim, więc przycisk miał adres hashowy mimo istniejącego stuba. Ofiarą tego
  wyścigu jest dokładnie ten, kto wchodzi i od razu udostępnia.
- 🔴 **PODMIANA MUSI BYĆ SYNCHRONICZNA.** `navigator.share` wymaga świeżej aktywacji użytkownika,
  więc `await` tuż przed nim zabiera ją na iOS i **arkusz udostępniania nie otwiera się wcale**.
  Stąd podział: `sprawdzStub(slug)` (HEAD) leci przy OTWARCIU artykułu, a kliknięcie robi zwykły
  odczyt z `STUB_ZNANE`. Knaga może czekać na HEAD po kliknięciu, bo tam przycisk tylko wypełnia
  pole tekstowe — **nie kopiuj stamtąd wzorca bezmyślnie**.
- 🔴 **`s/_index.json` ODDAJE 404 POD DOMENĄ** — Jekyll pomija pliki z `_` na początku nazwy.
  Manifest jest w repo i bot go utrzymuje, ale front go nie zobaczy; pierwsza wersja poprawki czytała
  właśnie jego i **po cichu by nie działała** (404 w `catch` → pusty zbiór → każdy link hashowy).
  Gdyby był kiedyś potrzebny — wpisz go wprost w `include:` w `_config.yml`.
- **Fallback na adres hashowy zostaje** dla trzech realnych przypadków: news sprzed chwili (stub
  powstaje na końcu biegu bota, mediana 5,2 min), news starszy niż 14 dni (retencja stubów),
  podpozycja klastra (bot stuba nie tworzy). Gorsza karta jest lepsza niż link w 404.
- 🔴 **`sprawdzStub` woła `setCardOpen`, NIE `expandBlock` (2026-08-10).** Wywołanie siedziało w
  `expandBlock`/`expandBlockArchive`, czyli w funkcjach **generujących HTML** — a te lecą dla każdego
  kafla, bohatera i podpozycji przy KAŻDYM renderze, nie przy otwarciu artykułu (jak twierdził
  komentarz obok `sprawdzStub`). 📊 Zmierzone w Chromium na produkcyjnym wydaniu, widok telefonu:
  **26 równoległych żądań HEAD do brifup.com w chwili wczytania → 0 po poprawce**, a otwarcie karty
  daje **dokładnie jedno**, o własny slug. Render bez zmian (hero + 22 kafle), zero błędów JS,
  podmiana linku na stub dalej synchroniczna (warunek `navigator.share` na iOS).
  ⚠️ Serię pogarszał `liveTick`: kasuje negatywne wpisy z `STUB_ZNANE` przy każdej zmianie
  `briefs.json`, więc całe 26 odpalało się OD NOWA po każdym zapisie bota (~co 30 min przy otwartej
  karcie). **ZASADA: nic sieciowego w funkcjach budujących HTML** — one wyglądają jak „render
  jednego kafla", a wołane są dla wszystkich naraz.
  ⚠️ `.card-expand` jest **rodzeństwem** karty, nie dzieckiem — wiązanie po `parentElement` trafiłoby
  w cudzy kafel; `setCardOpen` szuka po id (`item-<id>`/`group-<id>` → `exp-<id>`).
  ⚠️ Desktopowy `dtShowDetail` woła `sprawdzStub` dalej wprost i **tak ma zostać** — tam otwarcie
  panelu to realne otwarcie jednego artykułu, czyli jedno żądanie na klik.
- **Negatywne wpisy w `STUB_ZNANE` czyszczone przy każdej realnej zmianie `briefs.json`** — bez tego
  czytelnik siedzący w otwartej apce udostępniałby świeży news bez karty aż do przeładowania.
  Pozytywy zostają: stub nie znika w trakcie wizyty.
- ⚠️ **Facebook trzyma podgląd w cache per URL** — linki wysłane przed poprawką zostaną bez grafiki
  na zawsze. Wymuszenie: Sharing Debugger → „Scrape Again".
- ⚠️ Uzupełnienie po stronie bota: `og:url`/`canonical` stuba wskazują teraz sam stub (FinancialNewsBot#119).
  Bez tego FB kanonizował obiekt pod adres hashowy i karta i tak wychodziła pusta.
- ✅ **`watki.html` DOSTAŁO tagi `og:` 2026-08-10** — punkt zamknięty, szczegóły w sekcji „`watki.html` — tagi `og:`" niżej.

## Ruch: powroty, sesje, pory dnia (2026-08-05) ⚠️
Życzenie właściciela: *„bardziej szczegółowy panel z wyświetleniami, np. ile razy ktoś wracał
ponownie"*. Pytanie rozpada się na DWA i tylko jedno dało się odpowiedzieć z danych, które już były:
- **Powroty W DOBIE** — ten sam hash kilka razy tego samego dnia. Policzalne **wstecz**, zero zmian
  w mechanizmie. Stąd też sesje (przerwa >30 min = nowa sesja), głębokość i pory dnia.
- 🔴 **Powroty MIĘDZY DNIAMI były NIEPOLICZALNE z definicji** — sól rotuje co dobę, więc jutro ta
  sama osoba ma inny hash. To nie był brak funkcji, tylko konstrukcja, na której stoi brak baneru zgody.
- **Rozwiązanie (decyzja właściciela): flaga powrotu liczona przy zapisie.** Edge Function liczy hashe
  tego samego człowieka dla 7 poprzednich dób (formuła ta sama, zmienia się data) i sprawdza, czy któryś
  już w bazie leży. Do wiersza trafia `powrot_dni` — **LICZBA 1-7**, nie identyfikator — oraz
  `pierwsza_dnia`. W bazie dalej nie ma czym połączyć dwóch dni tej samej osoby.
  🔴 **GRANICA, której nie wolno przekroczyć: nikt nigdy nie zapisuje tego hasha.** Zapisany zostaje
  WYNIK porównania, materiał ginie z pamięcią żądania. Zapis hasha = trwały identyfikator = wraca
  obowiązek baneru zgody, którego ta strona świadomie nie ma.
- **`statystyki_powrotow(dni)`** (schemat 9c) — osobna RPC od `statystyki_ruchu`, bo panel ma działać
  także gdy schemat 9c nie jest jeszcze wklejony (drugie zapytanie leci równolegle i **wolno mu paść**;
  wtedy sekcja pokazuje instrukcję zamiast wywalać całą zakładkę).
- ⚠️ **Mianownik retencji to `pierwsza_dnia`, NIE `czytelnikodni`** — kolumny wypełniają się od wdrożenia,
  więc liczenie po wszystkich wierszach zaniżałoby procent i wyglądałoby na spadek zainteresowania
  zamiast na brak danych. Kafel podaje datę, od której mierzy.
- ⚠️ **„Mediana sesji" to NIE czas czytania** — mierzy odstęp pierwsza↔ostatnia odsłona, więc sesje
  jednoodsłonowe są z niej WYŁĄCZONE (inaczej każda dawałaby 0 min i zjechała wynik do zera). Czasu na
  ostatniej stronie nie zmierzy żaden licznik bez śledzenia w tle, którego tu nie ma.
- ⚠️ **Powroty to DOLNE oszacowanie:** hash zawiera IP, a na komórce IP zmienia się samo z siebie —
  ta sama osoba bywa wtedy liczona jako nowa. Ta liczba nie może być zawyżona, bywa zaniżona.
  To samo dotyczy `LICZNIK_SOL`: podmiana zrywa ciągłość i przez 7 dni wszyscy są „nowi".
- **Zweryfikowane lokalnym Postgresem na syntetycznych danych** (SQL, nie tylko przeczytany):
  granica sesji 29 min → ta sama sesja, 31 min → nowa; retencja liczona po pierwszych wejściach doby.
  Render sekcji sprawdzony zrzutem — 0 błędów JS. ⚠️ Na żywej bazie nietestowane (brak dostępu z sandboxa).
- Wdrożenie (dwa kroki: schemat + redeploy funkcji) — `SETUP_SUPABASE.md`, sekcja 8f.

## Wejście ≠ wznowienie apki — kolumna `typ` (2026-08-05) ⚠️
Zgłoszenie właściciela przy pierwszym spojrzeniu na świeży kafel „Sesje" (*„a to co oznacza"*).
Liczby były prawdziwe, ale **dwie miary mówiły to samo**, i dopiero to zmusiło do przeczytania beacona:
- 🔴 **Beacon zgłasza wznowienie apki dopiero po 30 minutach** (`index.html`, `visibilitychange`),
  a `statystyki_powrotow` tnie sesję **na tym samym progu 30 minut**. Dwa kolejne wznowienia są więc
  Z DEFINICJI oddalone o >30 min → każde zaczyna nową sesję → „sesje" ≈ „odsłony", a kafel
  „wrócili tego samego dnia" (≥2 sygnały) i „% wróciło po przerwie" (≥2 sesje) dawały prawie
  identyczną liczbę. **Zaprojektowane jako dwie miary, w praktyce jedna.**
- ⚠️ **Sesje NIE są zepsute w całości** — załadowania stron nie mają throttlingu, więc `/` → `/fala.html`
  w odstępie 2 minut to poprawnie JEDNA sesja o dwóch odsłonach. Ślepota dotyczy wyłącznie powrotów
  do już otwartej apki.
- **Wybór właściciela: NIE ruszamy progu beacona** (wariant „2 i 3"), tylko rozdzielamy rodzaj sygnału
  i porządkujemy kafle. Kolumna **`typ`** (`wejscie` | `wznowienie`, check w bazie, whitelist w funkcji).
- 🔴 **`suma_wyswietlen` CELOWO zostaje sumą OBU rodzajów.** Pierwsza wersja planu przewidywała
  zawężenie „wyświetleń" do samych wejść — ale to miało sens tylko razem ze skróceniem progu beacona
  (inaczej nie ma czego kompensować). Bez tamtej zmiany zawężenie zrobiłoby **uskok na wykresie
  wyglądający jak spadek ruchu**, za który nie stoi żadna zmiana w rzeczywistości. Rozbicie idzie
  osobnym kaflem („Powroty do otwartej apki"), definicja głównego licznika bez zmian.
- ⚠️ **Stare wiersze dostają `wejscie` z defaultu — to ZAŁOŻENIE, nie pomiar.** Przed tą zmianą nie ma
  czym odróżnić wznowienia od wejścia. Dlatego kafel pokazuje się dopiero, gdy istnieje choć jedno
  `wznowienie`, i podaje datę, od której rozróżnienie jest realne (`typ_od`).
- **Kafle po porządkach:** „% wróciło po przerwie" USUNIĘTE (duplikat), „Mediana sesji" → **„Mediana
  wizyty" ZAWSZE z próbką** (`sesji_minut_n`); przy n<5 pokazuje „za mało danych" zamiast liczby.
  Wizyty na ≥2 stronach są rzadkie, więc bez próbki panel podawałby medianę z trzech sesji jako fakt.
- 🐛 **Przy okazji, znaleziona lokalnym testem, NIE moja zmiana:** `jsonb_object_agg(urzadzenie, w)`
  rzuca „field name must not be null" przy pustym `urzadzenie` i **położyłoby CAŁĄ zakładkę Ruch**,
  nie jeden kafel. W produkcji nieosiągalne (Edge Function zawsze ustawia pole), ale wystarczy jeden
  wiersz z innej drogi. Dodane `coalesce(urzadzenie, 'nieznane')`.
- **Zweryfikowane lokalnym Postgresem:** check odrzuca obcą etykietę, brak pola → default `wejscie`,
  rozbicie `wejscia`/`wznowienia`/`typ_od` zgodne z wstawionymi danymi, `suma_wyswietlen` niezmieniona.
- ⚠️ Wdrożenie znów DWA kroki (schemat + redeploy `licznik`) — `SETUP_SUPABASE.md`, sekcja 8g.
  **Kolejność ma znaczenie:** najpierw schemat. Funkcja wysyłająca `typ` do bazy bez kolumny dostałaby
  błąd na KAŻDYM wejściu i licznik przestałby zapisywać cokolwiek.
- 🔴 **WPADKA PRZY WDROŻENIU — KOLEJNOŚĆ W PLIKU JEST CZĘŚCIĄ KONTRAKTU.** Pierwsza wersja dopisywała
  `alter table … add column typ` na KOŃCU `supabase_schema.sql`, a funkcja `statystyki_ruchu` z sekcji
  9b (WYŻEJ) już się do tej kolumny odwoływała. Postgres sprawdza treść funkcji przy `CREATE`
  (`check_function_bodies`), więc cały skrypt padał u właściciela na `column "typ" does not exist`.
  DDL przeniesione nad definicje funkcji, tuż za indeksy tabeli `wizyty`.
  **ZASADA: po każdej zmianie w `supabase_schema.sql` przepuść CAŁY plik od góry na czystej bazie,
  nie same dopisane sekcje.** Testowanie fragmentów w kolejności, w jakiej się je pisało, ukrywa
  dokładnie tę klasę błędu. Zweryfikowane lokalnym Postgresem: dwa przebiegi z rzędu na świeżej
  bazie, kod wyjścia 0, zero błędów (czyli plik jest też realnie idempotentny, nie tylko z założenia).

## Licznik wejść: wykluczenie urządzeń właściciela (2026-08-04) ⚠️
Życzenie właściciela: „w statystykach chcę usunąć mój telefon i PC". Mechanizm — flaga
`localStorage['brifup_pomin_licznik']`, którą beacon w `index.html` sprawdza PRZED wysyłką (beacon
w ogóle nie wychodzi). Flagę ustawia: (a) automatycznie udane logowanie do `knaga.html` (loguje się
tam wyłącznie właściciel; wspólny origin = wspólny localStorage), (b) ręcznie `brifup.com/?licznik=off`
(cofnięcie `?licznik=on` — na wypadek nowej przeglądarki/incognito).
- 🔴 **CELOWO nie po IP:** właściciel chodzi po VPN — adres wyjściowy jest zmienny i WSPÓŁDZIELONY,
  filtr po IP wycinałby też obcych czytelników za tym samym VPN-em. Poza tym licznik z założenia
  IP nie zapisuje (hash z solą dnia), więc nie ma go po czym filtrować.
- **Wstecznie nie da się nic usunąć** — hash rotuje co dobę i nie sposób wskazać, które wpisy były
  właściciela. Flaga działa od momentu ustawienia.
- ⚠️ Deklaracja „zero wpisów w localStorage" przy liczniku dotyczy CZYTELNIKÓW (brak identyfikatora
  śledzącego) — flaga opt-out niczego nie mierzy, tylko wyłącza pomiar. Nie jest to sprzeczność.
- ⚠️ MAC-a nie zbiera nikt — przeglądarka nie ma do niego dostępu; to częste pytanie.

## OneSignal (push)
SDK z `cdn.onesignal.com` — **bywa blokowany przez adblock/DNS** → stąd baner
„Nie można załadować powiadomień". To po stronie przeglądarki usera, nie bug apki.
App ID w `index.html`. Klik w push prowadzi na `brifup.com` (ustawiane w bocie).

## Flusso (`fala.html`) — osobna strona-mozaika
⚠️ **Przeniesione do OSOBNEGO repo `sowasskat-debug/flusso` + domeny `flusso.brifup.com`** (2026-07-11).
Tam plik nazywa się `index.html`, ma `CNAME` z `flusso.brifup.com`, i czyta dane **cross-origin z `brifup.com`**
(zmienna `DATA_ORIGIN='https://brifup.com/'` — `briefs.json` + `archive/`). GitHub Pages ustawia
`Access-Control-Allow-Origin: *` na statycznych plikach, więc cross-origin fetch działa. DNS w **GoDaddy**
(nie Cloudflare — domena wskazuje wprost na GitHub Pages): TXT-challenge weryfikacji + CNAME `flusso`→`sowasskat-debug.github.io`
(propagacja w trakcie na 2026-07-11). **Kopia `brief-site/fala.html` działa równolegle** na `brifup.com/fala.html`
podczas przejścia — TE DWA PLIKI trzeba trzymać zsynchronizowane, dopóki subdomena nie przejmie ruchu.
Opis niżej dotyczy obu (ten sam kod).

Kod w jednym pliku (inline `<style>`/`<script>`), zero zależności zewnętrznych poza
zdjęciami z `image_url`. Zbudowany tak, żeby działał na *obecnym* `briefs.json` bez czekania
na zmiany w bocie — celowo osobny od `index.html`, nie współdzieli CSS/JS.
- **Dane:** `pickNewestDose()` wybiera najświeższą z morning/afternoon/evening po `date`+kolejności
  dawki. `flatten()` spłaszcza `items[]`; `subItems` trafiają jako `rel` (powiązane wątki w bottom sheet).
- **Wielkość kafla:** `weightOf()` — używa pola `reach` (**czytane z `it.reach`**, patrz "Kształt danych"
  wyżej — NIE `coverage`!) jeśli jest w danych, inaczej fallback na pozycję w `items[]` (bot układa top story
  na górze, więc ranking działa jako proxy). Bot już zapisuje `reach`, więc realne skalowanie działa.
- **Filtr czasu (1H/4H/12H/24H/7D):** filtruje po `added_at`. Kotwica „teraz" (`NOW`) = **najnowszy
  `added_at` w danych**, nie zegar systemowy — dzięki temu siatka jest zawsze pełna, nawet gdy
  `briefs.json` jest stary (np. bot chwilowo nie działa). Osobna zmienna `NOWREAL` (prawdziwy zegar)
  służy tylko do etykiety „X min/godz/dni temu" — ta ma być uczciwa, nie podkręcona.
  `7D` doładowuje leniwie `archive/index.json` + ostatnie 7 plików przy pierwszym kliknięciu.
- **Sygnał na kaflu:** `🔥 N źródeł` (gdy `coverage>0`) + świeżość. **Świadomie NIE ma fejkowego
  „+847%"** — jeśli nie mamy prawdziwego tempa wzrostu, nie udajemy że mamy. Fake-trend to co było
  w oryginalnej makiecie sprzed przejścia na `briefs.json`.
- **Zdjęcia:** bezpośrednio z `image_url` (bot je już pobiera przy `EnrichItem`) — **nie Wikipedia**.
  Wcześniejsza wersja makiety próbowała ciągnąć zdjęcia z Wikipedia API (najpierw REST, potem
  MediaWiki+JSONP) — zarzucone przy przejściu na dane bota, bo `image_url` jest prostsze i pewniejsze.
  Fallback gdy brak/błąd zdjęcia: kolorowy tint z `.tile::before` (hash koloru z `source_name`/`text`).
- **Bottom sheet:** pełny `article` + `impact` (kolor paska ↑/↓ z prostego regexu) + `subItems` jako
  „powiązane wątki" + link do `source_url`.
- **Layout PC vs mobile:** `layoutProfile()` — mobile 2→4 kafli/rząd, PC 3→7. Kontener zawsze
  `max-width: 1600px` (spójne z desktopowym `.dt-app` w `index.html`).
- **Plan rozwoju (świadomie odłożone):**
  1. Pole `coverage` w bocie (blokuje realne skalowanie kafli, patrz wyżej).
  2. Prawdziwy sygnał „co ludzie klikają/szukają" (nie tylko „ile się pisze") — rozważane:
     **Wikipedia Pageviews API** (darmowe, bez klucza, godzinowe, realne liczby odsłon — najlepszy
     kandydat), Reddit `.json` endpoints (nieoficjalne, darmowe), Hacker News Firebase API
     (oficjalne, wąska nisza tech). Google Trends odrzucone — brak oficjalnego API, tylko płatne
     pośredniki albo kruche scrapery (pytrends).
  3. Nazwa „Flusso" robocza — może się zmienić.

## Testowanie UI lokalnie
```
python3 -m http.server 8099   # w katalogu repo
# Playwright (chromium): /opt/pw-browsers/chromium-1194/chrome-linux/chrome
```
Wtedy można wyrenderować widok mobile/desktop i zrobić zrzut do weryfikacji zmian.
Dla `fala.html` (czysty ES2017+, bez transpilacji): sanity-check składni JS przez
`node --check` na wyciągniętym `<script>` przed wdrożeniem.

## Konwencje
- Estetyka: minimalistyczna, „gazetowa". Fonty DM Serif Display + Space Mono. Akcent czerwony (`--red`). UI po polsku. Motyw jasny/ciemny (theme-aware).
- Zmiany wizualne: **pokazać podgląd (zrzut) przed wdrożeniem** — user tak woli.
- Commity po polsku.

## Dwie karty pod X — `og?w=1` + przyciski w knadze (2026-08-02)
Właściciel wrzuca na X **post samym tekstem**, w 1. komentarzu kartę z osią sagi, w 2. link
(podgląd renderuje się sam). Dzięki temu w nitce są **dwie różne** grafiki, a nie ta sama trzy razy.
- **`og?w=1`** → `kartaWatku`: tytuł wątku + **ostatnie 4 etapy** z datami, najnowszy na DOLE
  (czerwona kropka). ⚠️ **Cztery to granica czytelności przy 1200×630**, nie kaprys — przy pięciu
  węzłach tekst musiałby zejść poniżej 13 px albo urywać się w pół zdania. Stała `MAX_WEZLOW_NA_KARCIE`.
  Nagłówek mówi wprost „OSTATNIE 4 Z 20 ETAPÓW", żeby nie sugerować, że to cała saga.
- **Osobne wyszukanie `pelnyWatek`** — karta osi ma sens także gdy news jest PIERWSZYM etapem, a tam
  zmienna `watek` zostaje `null` z definicji (pierwszy etap nie jest kontynuacją).
- **Knaga: dwa przyciski** — „Pobierz kartę" i „Pobierz kartę wątku (N etapów)". Drugi pokazuje się
  WYŁĄCZNIE dla newsów z sagi; `threads.json` wczytywany leniwie przy pierwszym otwarciu panelu X,
  błąd pobrania = pusta mapa = przycisk się nie pojawia.
- ⚠️ **CORS na funkcji `og` jest KONIECZNY** — bez `Access-Control-Allow-Origin` `fetch` z brifup.com
  odbija się o politykę pochodzenia, a `<a download>` cross-origin jest **ignorowane** (przeglądarka
  tylko otwiera obrazek). FAIL-SAFE: przy błędzie karta otwiera się w nowej zakładce.
- 🔴 **Deploy funkcji NIE idzie przez git** — `supabase functions deploy og --no-verify-jwt --project-ref …`.

## Udostępnianie CAŁEGO KLASTRA — karta `og?k=1` + gotowiec spinający (2026-08-10)
Życzenie właściciela: *„chcę ulepszyć to, jak jadę «udostępnij cały klaster» — z tekstem generowanym
pod postami oraz grafiką"*. Dotąd „WRZUĆ NA X" na grupie brało tekst samej kotwicy i **gubiło całą
wartość klastra** — że to jedno wydarzenie opisane przez kilka źródeł, każde z innym szczegółem.
- **Karta klastra** (`og?k=1` → `kartaKlastra`): kotwica jako tytuł, pod kreską do 3 ujęć.
  🔴 **Układ CELOWO identyczny z kartą wątku** (logo w prawym górnym rogu, pełna szerokość) — obie
  lądują w tej samej nitce na X i mają wyglądać jak jedna rodzina. Zmieniając jedną, zmień drugą.
  ⚠️ **BEZ nazw redakcji — wybór właściciela po zobaczeniu podglądu.** „3 ŹRÓDŁA" brzmi jak argument,
  dopóki nie przeczyta się jakie: realny klaster z tego dnia miał Wealth Professional, InvestmentNews
  i KELO-AM (lokalna stacja radiowa). Kicker mówi więc o LICZBIE NEWSÓW, nie o wiarygodności.
  ⚠️ Cap 3 pozycje (`MAX_POZYCJI_KLASTRA`); przy większym klastrze nagłówek mówi „3 Z N".
  Zweryfikowane renderem realnej funkcji z pliku, łącznie z przypadkiem skrajnym (3 × pełny limit).
  🔴 Parametr `k` **dopisany do `ZNANE_PARAMY`** — bez tego nieznany parametr wraca `zapasowa()`
  i KAŻDA karta stałaby się statyczną grafiką. To nie jest formalność, tylko warunek działania.
- **Gotowiec spinający** (`gotowiec-x`, pole `pozycje`): przy klastrze funkcja dostaje kotwicę
  i wszystkie podpozycje, a prompt każe napisać JEDEN post łączący ujęcia, nie streszczenie po kolei.
  ⚠️ **Bramka pokrycia liczb patrzy teraz na CAŁY materiał**, nie na sam artykuł kotwicy — przy
  klastrze kotwica bywa parasolem bez artykułu, więc stara wersja odrzucałaby każdą liczbę jako
  zmyśloną. Z tego samego powodu wymóg „musi być artykuł" nie obowiązuje w trybie klastra.
  Bez pola `pozycje` funkcja zachowuje się dokładnie jak dotąd — zero regresji dla pojedynczych newsów.
- **Knaga:** przycisk „Pobierz kartę klastra (N newsy)" pokazywany tylko dla pozycji z `subItems`.
  `pobierzKarte` przyjmuje teraz RODZAJ (`''` / `'w'` / `'k'`) zamiast boola „czy wątek" — trzeci
  rodzaj karty się w boola nie mieścił.
- ⚠️ **Wymaga deployu OBU funkcji** (`og` i `gotowiec-x`) — nie idą przez git. Do czasu deployu knaga
  pokaże przycisk, ale karta wróci jako grafika zapasowa, a gotowiec będzie jak dotąd.

## Post na X: jedna flaga, zero emoji w treści (2026-08-02) ⚠️
**X przy „Boost" odrzuca posty z więcej niż jednym emoji** — potwierdzone przez właściciela na żywym
poście, nie teoria. Konsekwencje w `knaga.html`:
- **`pierwszeEmoji`** — pole `flag` bywa wieloflagowe (zmierzone: 11 z 49 itemów ma 2-3 flagi,
  `🇮🇱🇮🇷`, `🇷🇺🇨🇳🇮🇳`). Do posta idzie tylko PIERWSZA. Cięcie po **grafemach** (`Intl.Segmenter`),
  bo flaga to para regional indicators i `slice(0,1)` rozsypałby ją na literę.
  ŚWIADOMY KOSZT: `🇮🇱🇮🇷` → `🇮🇱` gubi drugą stronę konfliktu.
- **`bezEmoji`** — treść czyszczona deterministycznie. Oba źródła gotowca (fallback `item.text`
  i Edge Function `gotowiec-x`) tylko PROSZĄ model w prompcie o brak emoji, a instrukcja w prompcie
  **nie jest bramką**. ZOSTAJĄ strzałki ↑/↓ z linii `impact` — to symbole matematyczne, nie
  piktogramy, i niosą kierunek ruchu.
- ⚠️ **ZAKRES: wyłącznie publikacja na X.** Strona i listy postów w knadze renderują PEŁNĄ flagę
  (10 miejsc renderu w `index.html`). `zFlaga` wołane tylko z panelu X.
- **Licznik znaków w punktach kodowych**, nie `.length` — flaga to 4 jednostki UTF-16, a X liczy 2.

## Notowania: znacznik czasu bez widocznej stopki (2026-08-02)
Linia „Notowania: stan na … · dane opóźnione" **zdjęta z ekranu** na życzenie właściciela, ale
znacznik ZOSTAJE w `title` kafla (podpowiedź po najechaniu) i w `data-stan`.
⚠️ **Nie kasuj go całkiem:** dane są godzinne, a bot potrafi ZACHOWAĆ serię z poprzedniego biegu,
gdy źródło nie odpowiedziało — bez znacznika nie odróżnisz kursu sprzed 20 minut od wczorajszego.
Przywrócenie widocznej stopki to jedna linia (`stan` jest dalej liczone z najstarszej serii).

## Odrzucone: jedna ścieżka zapisu, głośne porażki (2026-08-02) ⚠️
Cztery ścieżki zapisu `rejected.json` robiły „pobierz sha → PUT" bez ponowienia, a DWIE połykały błąd
do konsoli. Najgorsza (z poczekalni) po nieudanym zapisie wyświetlała bezwarunkowe „Wyrzucono — bot
się tego uczy", czyli **zapewniała o nauce, której nie było**.
- **`zapiszRejected(mutuj, message)`** — `mutuj` dostaje ZAWSZE świeżą listę i zwraca nową, więc
  ponowienie nakłada zmianę na aktualny stan zamiast nadpisywać cudzą. Ponowienie do 3× **wyłącznie
  na 409**; 401/403/sieć nie naprawią się ponowieniem. Zwrot `null` = nie ma czego zapisywać.
- Komunikaty mówią prawdę: „News usunięty, ale NIE nauczył filtra: …".
- ⚠️ **SPROSTOWANIE:** bot NIE dopisuje do `rejected.json`, tylko go czyta (ostatnie 40 wpisów jako
  REGUŁA 0). Konflikt może powstać wyłącznie między dwoma zapisami z panelu.
- ⚠️ **Zakładka Odrzucone = TWOJE ręczne odrzucenia.** Odrzucenia bota są w zakładce Lejek i nie mają
  powodu (patrz `STAN.md` punkt 4) — to częste nieporozumienie.

## Podgląd lokalny na macOS (2026-08-02) ⚠️
**macOS blokuje `python3 -m http.server` na `~/Documents`** (ochrona prywatności „Files and Folders")
— serwer wstaje, ale każdy plik oddaje 404. Kopiuj pliki do scratchpada i serwuj stamtąd; wpis
`brief-site-repo` w `~/.claude/launch.json` już tak działa. To NIE jest to samo co dawne ograniczenie
sandboxa — objaw identyczny, przyczyna inna.

## Wątki jako osobna sekcja — `watki.html` + wejścia + jeden język osi (2026-08-07) 🧵
Wątki przestały być dodatkiem do artykułu i stały się **osobnym produktem**. Trzy powierzchnie
pokazują TE SAME dane w TEJ SAMEJ konwencji — zmieniając jedną, sprawdź pozostałe dwie.

- **`watki.html`** — publiczna podstrona (jest w `sitemap.xml`, inaczej niż knaga). Czyta
  `threads.json` + `briefs.json`; dni archiwalne dociąga LENIWIE, per plik, dopiero przy tapnięciu
  w etap z tamtego dnia (`ensureDay`), więc wejście kosztuje dwa pliki.
  Saga zwinięta do 3 etapów → tap w nagłówek rozsuwa pełną oś → tap w etap wysuwa **skrót artykułu**
  z deep-linkiem `#dawka/slug` (albo `#archive/data/dawka/slug`).
  🔴 **`itemSlug` jest tu SKOPIOWANY** (djb2-xor, 80 znaków, base36) — czwarta kopia obok
  `index.html`, `knaga.html`, `Runner.cs` i `og/index.ts`. Zmiana algorytmu w jednym miejscu
  rozjeżdża deep-linki i stuby; trzymać identyczne.
  🔴 **Kotwica klastra bywa zbiorcza — bez `article` i `source_name`.** Skrót sięga wtedy do podpozycji
  z artykułem, ale **NIE do pierwszej z brzegu — do pierwszej, której NIE MA na osi jako osobnego etapu**
  (#111, 2026-08-08, zgłoszenie właściciela ze zrzutem): podpozycja klastra bywa równocześnie węzłem tej
  samej sagi i saga „Trump o kryptowalutach" pokazywała pod OBOMA etapami ten sam artykuł bloomingbit,
  choć właściwa treść kotwicy (A News) leżała w `sub[1]`. Fallback na „pierwszą z artykułem" zostaje,
  gdyby wszystkie podpozycje stały już na osi (powtórzony fragment lepszy niż żaden). Etykieta awaryjna
  to „Brif.up", nigdy „archiwum" (mylące przy dzisiejszym newsie). Ta sama klasa pułapki co przy stubach:
  najpierw sprawdź, czy węzeł to kotwica.
- **Wejście mobilne = pasek nad feedem, DOMYŚLNIE SCHOWANY.** Odsłania go PŁYTSZE pociągnięcie
  w dół (>24 px) w `pull-to-refresh`; głębsze (>60 px) odświeża jak dotąd — jeden gest, dwa progi.
  ⚠️ Pasek leży POZA `#content`, bo `renderDose` nadpisuje `#content` przy każdym renderze i pasek
  znikałby po każdym live-ticku. Raz odsłonięty zostaje do końca wizyty (klasa `.show`).
- **Wejście desktopowe = `.dt-watki-btn`** obok zakładek dawek, z żywym licznikiem sag.
  Czerwony obrys, NIE fioletowy — fiolet znaczy „aktywna dawka" i przycisk czytałby się jak czwarta dawka.
- **Ikona wątku: stała `WATEK_ICN`** (SVG, wariant „naprzemienna oś"). Zastąpiła emoji 🧵, które
  renderowało się inaczej na każdym systemie i było kolorową plamą w monochromatycznym UI.
  Używaj stałej, nie wklejaj SVG drugi raz; osobne kopie są tylko w statycznym HTML (topbar, pasek).

### Chronologia: NAJNOWSZY ETAP NA GÓRZE — we WSZYSTKICH trzech miejscach
Decyzja właściciela 2026-08-07. Dotyczy `watki.html`, osi pod postem (`watekHtml`) i karty
podglądu `og?w=1`. Węzły w `threads.json` przychodzą od bota **od najstarszego**, więc każde z tych
miejsc odwraca listę u siebie — zmieniając jedno, zmień pozostałe, inaczej ta sama saga czyta się
w dwie różne strony.
- `watekHtml`: pełne kropki, największa i czerwona na PIERWSZYM (najnowszym) wierszu, metka
  „MM-DD · dawka → relacja". „TEN NEWS" zostaje jako czerwony pierścień, gdy bieżący news nie jest
  najnowszym etapem — na podstronie nie ma odpowiednika tej informacji.
- **Klaster otwiera oś JUŻ ROZWINIĘTĄ**, pojedynczy news — zwiniętą. Powód: kotwica klastra jest
  zwykle węzłem sagi i dodatkowy tap był zbędny, a przy pojedynczym newsie treścią główną jest artykuł.

## Kafle notowań mówią, JAKI TO OKRES (2026-08-07) ⚠️
Zgłoszenie właściciela: *„nie jest napisane, z jakiego terminu jest ten wykres — użytkownik nie widzi,
czy to ostatni dzień czy 30 dni"*. W jednym wierszu stoją **dwie różne skale**: linia rysuje ~30 sesji,
a procent obok to zmiana SESYJNA — stąd zielony procent bywa przy opadającej linii (to nie jest błąd).
- **chip `.q-per` („N sesji") przy symbolu** nazywa okres LINII, **dopisek `.q-chg-per` („dziś")**
  przy procencie nazywa okres ZMIANY. Dotąd mówiła o tym wyłącznie podpowiedź `title` — niedostępna
  na telefonie, czyli dla większości czytelników nie istniała.
- ⚠️ **Poniżej 460 px symbol i chip stoją JEDEN POD DRUGIM** (`.q-head` w kolumnie). W jednej linii
  chip był obcinany — zmierzone: głowa potrzebowała 92 px, dostawała 68. To rozwinięcie starej zasady
  „w `.q-row` wolno ścisnąć wyłącznie nazwę instrumentu".

## Placeholder pod zdjęciem artykułu (2026-08-07)
`.expand-image` ma tło z animowanym „shimmerem" (osobny wariant dla motywu ciemnego). Bez niego
`loading="lazy"` + wolne łącze zostawiały **180 px gołej dziury** — białej w motywie jasnym, czarnej
w ciemnym — którą właściciel zgłosił jako „zdjęcie, które się nie załadowało". `onerror` chowa obrazek
dopiero po BŁĘDZIE; ładowanie trwające sekundy nie jest błędem i wcześniej nie miało żadnej reprezentacji.

## Zdjęcia artykułów na DESKTOPIE — `.dt-detail-image` (2026-08-10)
Zgłoszenie właściciela: „na wersji desktopowej nie ma zdjęć z artykułów". To **nie była regresja** —
funkcja nigdy tam nie istniała: `image_url` występowało WYŁĄCZNIE w `expandBlock` i `expandBlockArchive`
(obie ścieżki mobilne), a `dtShowDetail` go nie renderował wcale. 📊 Zmierzone: **99% pozycji z artykułem
ma zdjęcie** (109/110 w bieżących dawkach, 93% w sierpniowym archiwum) — brakowało go praktycznie zawsze.
- Wstawiane między metką czasu a treścią, czyli w tej samej kolejności co na mobile (pod nagłówkiem).
- Pełna szerokość panelu: `calc(100% + 52px)` i marginesy `-26px` (padding `.dt-detail-content` to 26px).
- **Tylko gdy JEST artykuł** — zdjęcie nad komunikatem „brak rozszerzonego artykułu" byłoby mylące.
- Placeholder z shimmerem i wariant ciemny jak przy `.expand-image` (bez niego wolne łącze zostawia
  180 px gołej dziury — osobne zgłoszenie z 07.08).

## `color-scheme` — biały pasek przewijania w motywie ciemnym (2026-08-10) 🔴
Zgłoszenie ze zrzutem: „pasek na nocnym wygląda chujowo". **Przyczyna NIE była w stylach paska, tylko
w braku deklaracji `color-scheme`.** Strona nie mówiła przeglądarce, że jest ciemna, więc elementy
SYSTEMOWE (paski przewijania, pola formularzy, tło canvasa) malowały się w wariancie jasnym niezależnie
od naszych zmiennych. `background: var(--bg)` na kontenerze tego NIE załatwia — to informacja **dla
przeglądarki**, nie styl naszego elementu.
- `:root { color-scheme: light }` + `[data-theme="dark"] { color-scheme: dark }` — to jest naprawa właściwa.
- Dodatkowo stonowany kciuk w kolorze `--rule` (ta sama linia, którą rozdzielamy wpisy), wcięcie 3 px.
- ⚠️ **Stylowanie TYLKO kontenerów desktopowych i nakładki archiwum.** Na telefonie pasek jest
  nakładkowy (znika sam) i ostylowanie zrobiłoby z niego stale widoczną kreskę — `.scroll-area`
  celowo zostaje na `scrollbar-width: auto`.

## JSON-LD: offset strefy LICZONY, nie zaszyty — `offsetWarszawy` (2026-08-10) 🔴
W `datePublished` siedziało na sztywno `+02:00`, czyli czas LETNI. `added_at` jest warszawski, więc
**od ostatniej niedzieli października** (powrót na CET) wszystkie daty strukturalne szłyby do Google
o godzinę za wysokie — po cichu, bo JSON-LD nikt nie ogląda gołym okiem. Ta sama klasa co `SupabaseTs`
w bocie: znacznik bez offsetu plus zgadywana strefa.
- Offset liczony z bazy stref przeglądarki **DLA DANEJ DATY**, nie dla „teraz" — wpisy z archiwum
  sprzed przestawienia zegarków dostają swój własny.
- 🔴 **Guard sprawdza KSZTAŁT regexem, NIE `isNaN(new Date(...))`.** Zmierzone: `new Date('smiec:00Z')`
  nie daje Invalid Date, tylko 1 stycznia 2000 (silnik parsuje pobłażliwie) — pierwsza wersja fail-safe
  przepuszczała śmieć i zwracała styczniowe `+01:00`. **Złapane testem, nie recenzją kodu.**
- Zweryfikowane na 9 przypadkach: obie strony OBU zmian czasu (marzec i październik), śmieć, pusty, null.

## `watki.html` — tagi `og:` (2026-08-10)
Podstrona istniała od 07.08 i jest w `sitemap.xml`, ale miała **ZERO tagów `og:`**, więc wysłany link
dawał kartę z samą domeną. Stub `s/<slug>.html` jest tu **niepotrzebny**: adres NIE jest hashowy, więc
crawler dostaje statyczny HTML wprost.
- ⚠️ Wartości celowo **STAŁE**, nie generowane z `threads.json` — scraper nie wykonuje JS, więc cokolwiek
  dopisałby skrypt, i tak by tego nie zobaczył.
- `canonical` i `og:url` bez ukośnika na końcu — inaczej FB kanonizuje dwa obiekty.

## Kropki „Sagi na wykresie" filtrowane po instrumencie ETAPU (2026-08-10) 🔴
Zgłoszenie ze zrzutem: saga „Rekordy giełdowe w USA i Polsce" nanosiła etapy o Dow Jonesie i S&P 500
na wykres polskiego rynku. Właściciel: *„w sadze powinny się znajdować newsy do tickerów, które
NAPRAWDĘ REALNIE mają wpływ na dany ticker"*.
- `sagaRynekHtml` bierze kropkę tylko gdy `n.chart.includes(sym)`. Pole `chart` węzła kopiuje bot
  z itemu, a ono pochodzi z **linii WPŁYWU** — więc etap o Iranie bez słowa „ropa" w nagłówku i tak
  ląduje na wykresie BRENT (to było wprost pytanie właściciela).
- Odfiltrowane etapy są **policzone w stopce**, nie przemilczane („+ N etapów sagi bez wpływu na SYM").
- ⚠️ **Pełna, niefiltrowana oś zostaje w „Wątku tematu"** — tniemy WYŁĄCZNIE kropki na wykresie.
- Węzeł bez pola `chart` (item bez wpływu na żaden instrument albo zabytek sprzed backfillu) = kropka
  nigdzie. Sekcja znika, gdy po filtrze zostaje <2 kropki — „jedna kropka nie opowiada historii".

## Pastylka LIVE = kanał PILNE (2026-08-10)
`LIVE` była czysto dekoracyjna (statyczna kropka, niepodpięta do niczego). Gdy bieżąca dawka ma
**ŚWIEŻY** news z flagą 🚨, pastylka zmienia się w klikalny pasek `PILNE · <nagłówek>` prowadzący do
artykułu (`location.hash` → `routeHashDeepLink` robi resztę, także dla podpozycji klastrów).
- 🔴 **Okno 4 h (`PILNE_OKNO_MS`) jest warunkiem sensu, nie kosmetyką** — 🚨 pojawia się kilka razy
  dziennie (zmierzone: 209 itemów w 40 dniach archiwum), więc bez okna pastylka krzyczałaby cały
  wieczór o porannym wydarzeniu i sygnał spowszedniałby natychmiast.
- **PILNE nie ma osobnego pola w `briefs.json`** — selekcja wyraża je WYŁĄCZNIE flagą 🚨 (kontrakt bota).
- Bez świeżego 🚨 pastylka wraca do oryginalnego markupu (`pilneDomyslne`), więc zero regresji.
- Wariant mobilny: czerwone tło + biały tekst. Desktopowy: stonowany, nagłówek ucinany przy 340 px.

## Zdjęcia artykułów ładowane DOPIERO PRZY OTWARCIU karty — `data-src` (2026-08-10) 🔴
Zgłoszenie właściciela, powtarzane od tygodni: *„po tym, jak wchodzę na brifup, nie mogę wejść na inne
strony — nawet jak wyłączę VPN; muszę wyczyścić pamięć podręczną Chrome i dopiero wtedy działa"*.
Wcześniej podejrzewaliśmy VPN i serię 26 HEAD-ów (#120). **Przyczyna była inna i leżała we froncie.**

- 🔴 **`loading="lazy"` na `.expand-image` NIC NIE ODRACZAŁO.** `.card-expand` ma `display:none`, więc
  obrazek nie ma pudełka layoutu; przeglądarka nie potrafi zmierzyć odległości od ekranu i pobiera go
  **natychmiast**. Atrybut wyglądał jak zabezpieczenie i nim nie był — przez cały czas.
- 📊 **Zmierzone w Chromium na produkcyjnym wydaniu (widok telefonu):** 44 `<img>` w DOM, **33 zdjęcia
  z ~25 OBCYCH domen pobierane w chwili wczytania strony**, przy 44 różnych hostach w całej dawce
  (78 adresów zdjęć). Czytelnik nie otworzył wtedy ANI JEDNEGO artykułu. Otwarcie nakładki archiwum
  dokładało kolejne 27 (zmierzone na 09.08).
- 🔴 **DLACZEGO TO PSUŁO CAŁĄ PRZEGLĄDARKĘ, nie tylko naszą kartę:** pula gniazd i pamięć podręczna DNS
  w Chrome są **wspólne dla profilu**, nie per zakładka. Ćwierć setki pierwszych kontaktów z obcymi
  CDN-ami naraz (DNS + TLS), w dodatku przez tunel VPN, zapycha tę pulę — i inne strony nie mają czym
  się połączyć. **Wyłączenie VPN-a nie pomaga**, bo nieudane wpisy DNS i zajęte gniazda siedzą dalej
  w pamięci Chrome; pomaga dopiero „wyczyść dane przeglądania", które czyści host cache i gniazda.
  Dokładnie ten opis objawu podawał właściciel.
- **Poprawka:** `expandBlock`/`expandBlockArchive` renderują `data-src`, a `setCardOpen` podstawia
  `src` przy **faktycznym otwarciu karty** (i kasuje `data-src`, żeby drugie otwarcie nic nie robiło).
  To ten sam hook i ta sama logika co przy `sprawdzStub` — obie połowy tej samej pomyłki.
  📊 Po poprawce: **0 obcych hostów przy wczytaniu** (zostają tylko fonty Google + OneSignal),
  a otwarcie artykułu daje **dokładnie jedno** zdjęcie, swoje. Zweryfikowane na trzech ścieżkach:
  feed główny, podpozycja klastra, nakładka archiwum.
- ⚠️ **`loading="lazy"` USUNIĘTY z markupu.** Po podstawieniu `src` obrazek jest już widoczny, więc
  atrybut i tak nic nie odracza, a sugerowałby ochronę, której nie daje. Shimmer w `.expand-image`
  (07.08) zostaje i dopiero teraz robi to, po co powstał.
- ⚠️ **Desktopowy `.dt-detail-image` zostaje z `src`** — tam render panelu to już otwarcie JEDNEGO
  artykułu, czyli jedno zdjęcie na kliknięcie. Ta sama granica co przy `sprawdzStub` i `dtShowDetail`.
- **ZASADA (rozszerzenie tej z #120):** *nic sieciowego w funkcjach budujących HTML* dotyczy nie tylko
  jawnych `fetch`, ale też **atrybutów, które sieć wywołują** (`src`, `srcset`, `poster`, `<link
  rel=preload>`). Wyglądają jak treść, a są żądaniem. Przy zdjęciach z OBCYCH domen koszt nie kończy
  się na naszej stronie — płaci nim cała przeglądarka czytelnika.
