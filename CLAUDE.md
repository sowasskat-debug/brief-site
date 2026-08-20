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
- 🔴 **KLUCZ `_flashedItems` TO SLUG, NIE `it.id` (naprawione 2026-08-12).** Zgłoszenie właściciela:
  *„na PC cały czas mrugają te posty… na chwilę mruga jakby był nowy, a to fałszywy alarm"*.
  **`pollLiveUpdates` nadaje itemom NOWE `id: uid()` przy KAŻDYM live-updacie**, więc strażnik trzymający
  `it.id` nigdy nie trafiał — po każdym zapisie bota wszystko nowsze od progu sesji błyskało OD NOWA.
  Efekt narastał w czasie: `sessionNewThreshold` stoi na chwili wejścia, więc im dłużej karta otwarta,
  tym więcej pozycji łapie się na „nowe". Drugie źródło tego samego objawu: `refreshThreadsIfChanged`
  woła `pollLiveUpdates(wymusRender = true)`, co POMIJA porównanie `doseSignature` — re-render zdarzał
  się nawet przy niezmienionej treści dawki.
  ⚠️ **`it.id` zostaje WYŁĄCZNIE do `getElementById`** (tam musi być id z bieżącego renderu). Te dwie
  role były zmieszane i stąd błąd. **ZASADA: cokolwiek pamiętasz „żeby nie zrobić czegoś drugi raz",
  nie kluczuj po wartości nadawanej przy renderze.**
  ⚠️ Świadomy koszt: przepisanie nagłówka przez bota zmienia slug, więc taki news błyśnie drugi raz.
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
- 🔴 **TO SAMO Z NASDAQIEM: `QQQ`→`NASDAQ100`, `ONEQ`→`NASDAQ` (2026-08-13).** Zgłoszenie właściciela
  pod newsem o IPO Anthropica + zrzuty „Nasdaq Composite · INDEXNASDAQ: .IXIC": QQQ to **fundusz**
  (~600 USD), a nagłówki mówią o poziomie indeksu (~26 500 pkt). Bot bierze teraz `^IXIC`/`^NDX` z Yahoo.
  **93 referencje `chart` w 12 plikach przepięte.**
  ⚠️ **Inaczej niż przy `BNO`/`USO`, token „QQQ" występuje TEŻ W TREŚCI** — 7 pól `impact`/`article`
  mówi o samym funduszu („↑ Invesco QQQ", „waga ok. 1% w funduszu Invesco QQQ"). Zamiana po całym pliku
  sfałszowałaby artykuły; migracja szła **wyłącznie po `"chart":[…]`**, a wybór NASDAQ vs NASDAQ100
  z linii wpływu tego itemu (45/48). **Klucz `QQQ` w bocie ZOSTAJE** dla newsów o samym ETF-ie.
  ⚠️ Serie `NASDAQ`/`NASDAQ100` pojawią się w `quotes.json` dopiero po pierwszym biegu bota po deployu
  — do tego czasu te pozycje są bez kafla (fail-safe „brak serii = brak kafla").
  ✅ **`SPY`→`SP500` i `DIA`→`DJIA` zdjęte z funduszy w tej samej turze** (`^GSPC` / `^DJI`),
  49 referencji przepiętych — czyli w danych nie ma już ANI JEDNEGO klucza funduszu pod indeksem.
  ⚠️ Token `DIA` w treści to **Defense Intelligence Agency**, nie fundusz — kolejny powód, dla którego
  migracja idzie wyłącznie po `"chart":[…]`, nigdy po całym pliku.

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

## `gotowiec-x` przyjmuje też BOTA — klucz `service_role` (2026-08-12) 🔴
Automat publikujący na X potrzebuje tego samego gotowca co knaga, ale jest **procesem cronowym
na Hetznerze** i nie ma jak mieć sesji właściciela — `auth.getUser()` nie zwróci mu maila, więc
dostawał **403**.
- **Druga droga uwierzytelnienia:** gdy `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, kontrola
  właściciela jest pomijana. Klucz `service_role` ma WYŁĄCZNIE bot; knaga go nigdy nie widzi.
  Supabase wstrzykuje tę zmienną sam — nie trzeba zakładać nowego sekretu.
  ⚠️ Warunek `SERVICE_KEY.length > 20` jest konieczny: bez niego brak zmiennej dawałby `'' === ''`
  i **każdy z gołym „Bearer " wchodziłby jak bot**.
- 🔴 **ŚWIADOMIE NIE budujemy drugiego generatora w bocie** — dokładnie ten błąd wycofaliśmy 02.08
  (pole `x_post`). Dwa generatory rozjeżdżają się i panel zaczyna produkować inny post niż automat.
- **Nowe pole wejścia `maxZnakow`** (clamp 120–300): knaga wkleja treść do composera X, który sam
  pilnuje limitu i nie da wysłać za długiego — a bot publikuje przez API, gdzie **za długi post wraca
  BŁĘDEM i news po prostu nie idzie**.
  ✅ Konto @brifup MA PREMIUM (potwierdzone 12.08), więc 300 zostaje domyślne dla obu ścieżek.
  ⚠️ Nie podnoś wyżej: X zwija w osi czasu wszystko powyżej ~280 pod „Pokaż więcej", więc dłuższy
  post czytelnik widzi jako URWANY. Premium daje swobodę od twardego limitu, nie zachętę do esejów.
- ✅ **Zweryfikowane Z SERWERA po deployu:** klucz bota przechodzi bramkę, funkcja zwraca gotowca
  (223 znaki, format „hook + twarde liczby").
- ⚠️ **Deploy NIE idzie przez git:** `supabase functions deploy gotowiec-x --project-ref utmvokfjvrthvcmxzowc`.
  CLI jest zainstalowane lokalnie (`/opt/homebrew/bin/supabase`) i zalogowane; projekt NIE jest
  „linked", więc `--project-ref` jest obowiązkowy.

## Gotowiec X pisze do SZEROKIEGO GRONA, nie do inwestora (2026-08-13) 🔴
Decyzja właściciela po zestawieniu **dwóch gotowców do tego samego newsa** (zwroty ceł po wyroku SN):
wariant *„firmy z S&P 500 zaksięgowały ok. 9,6 mld USD"* PRZEGRAŁ z *„sześć firm technologicznych
2,5 mld USD"* — *„łatwiejszy do zrozumienia dla szerokiego grona"*.
- **Agregat rynkowy wymaga od czytelnika dwóch rzeczy naraz:** żeby wiedział, czym jest indeks,
  i żeby wyczuł, że „zaksięgowały" ≠ „dostały" (ujęcie księgowe vs gotówka). Nazwany konkret
  (nazwa firmy, ile firm, jaki kraj) nie wymaga niczego. Post idzie na publiczny profil, nie na terminal.
- 🔴 **PRZYCZYNA JEST OBOWIĄZKOWA, gdy materiał ją podaje.** Przegrany wariant nie miał ANI SŁOWA
  o wyroku Sądu Najwyższego — został z czterech liczb pod rząd, po których nie wiadomo, dlaczego
  cokolwiek się dzieje. To był drugi powód wyboru właściciela i ważniejszy niż sam żargon.
- **Najwyżej 4 liczby; przy kilku etapach tej samej rury podaj SKRAJNE.** Materiał o cłach dawał
  autoryzowane 128,7 → zatwierdzone 104,29 → wypłacone 71,06 — trzy etapy w osi czasu to o jeden
  za dużo, kontrast „autoryzowane vs wypłacone" niesie tę samą historię.
- ⚠️ **Uproszczenie NIE MOŻE zmieniać znaczenia** — gdy materiał mówi o ujęciu księgowym, a nie
  o wypłacie, zostaje ujęcie księgowe; upraszczamy zdanie, nie fakt.
- ⚠️ **To zmiana PROMPTU, czyli miękka** (repo zna zasadę „prompt negocjuje, regex nie"). Sprawdzone
  na 3 kolejnych wywołaniach wdrożonej funkcji tym samym materiałem: 2 trafione (nazwany konkret
  + wyrok SN, bez „S&P 500"/„zaksięgowały"), **1 odrzucony przez bramkę pokrycia liczb** — model
  zaokrąglił `71,06` do `71`, a bramka wymaga dosłownego wystąpienia w materiale. Fail-safe zadziałał
  (front podstawia sam nagłówek), ale **instrukcja „mniej liczb" popycha model do zaokrąglania**
  i to jest realny ogon do obserwacji. Gdyby odrzuty rosły — dopuścić zaokrąglenie w bramce,
  nie luzować promptu.
- ⚠️ **Deploy NIE idzie przez git:** `supabase functions deploy gotowiec-x --project-ref utmvokfjvrthvcmxzowc`.
- ⚠️ **`X_TEXT_MAX` w knadze to 270, nie 300** — ten plik twierdził „300" w sekcji o budżecie treści
  i było to nieaktualne (zmierzone w kodzie: `knaga.html`, `const X_TEXT_MAX = 270`).

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

## Knaga otwiera się na AKTUALNEJ dawce — `dawkaZZegara()` (2026-08-12)
Życzenie właściciela: *„muszę za każdym razem manualnie przeskakiwać"*. `currentDose` było zaszyte
na `'morning'`, więc panel po każdym wejściu wymagał kliknięcia w zakładkę.
- 🔴 **GODZINA LICZONA W `Europe/Warsaw`, NIE lokalnie w przeglądarce.** Dawka jest własnością DANYCH
  (bot stempluje ją czasem warszawskim), a nie tego, kto patrzy. **Złapane przy weryfikacji tej
  zmiany, nie w recenzji:** maszyna deweloperska chodziła na `Europe/London`, więc
  `new Date().getHours()` dawało 19 przy warszawskiej 20. Przy granicy panel wybrałby POPOŁUDNIOWĄ,
  gdy bot pisze już do WIECZORNEJ — rozjazd trwałby GODZINĘ przy każdej granicy, codziennie,
  i wyglądał jak „panel pokazuje starą dawkę". Ta sama klasa co `SupabaseTs` w bocie i `offsetWarszawy`
  w JSON-LD. FAIL-SAFE: gdy `Intl` zawiedzie → czas lokalny (przybliżenie lepsze niż wywalony panel).
- ⚠️ **Granice muszą zostać zgodne z `getCurrentDose` w `index.html` i `doseKey` w bocie** —
  `<11` / `<17` / reszta. Trzy miejsca, jedna reguła; rozjazd znaczyłby, że panel moderuje INNĄ dawkę,
  niż widzi czytelnik.
- ⚠️ **Ustawiane RAZ, przy wczytaniu — świadomie BEZ przełączania na żywo.** Panel bywa otwarty długo
  w trakcie moderowania i wyrwanie zakładki spod ręki (o 11:00, w środku kasowania newsów z porannej)
  byłoby gorsze niż jedno kliknięcie. Ten sam wybór co „panel szczegółów zostaje przy zmianie dawki".
- ⚠️ **`getCurrentDose` w `index.html` ma ten sam mechanizm na czasie LOKALNYM** i dla czytelnika
  spoza Polski wskaże nie tę dawkę co bot. Świadomie NIE ruszane przy tej zmianie (dotyczy publicznego
  frontu, nie panelu) — ale to jest realny, otwarty ogon.

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

## Znacznik kafla: ikona tematyczna + flaga kraju — `znacznikHtml` (2026-08-20) 🔴
Życzenie właściciela po obejrzeniu podglądu czterech wariantów: *„dobra C, ale też możesz dawać
flagę obok"* i *„daj rozmiar 16"*. Znacznik ma teraz DWIE części: **ikona (CZEGO dotyczy news)
+ flaga (GDZIE)**, np. 🤖🇺🇸 Anthropic, 🎧🇸🇪 Spotify, 🔬🇹🇼 TSMC.
- 🔴 **Dlaczego ikony, a nie emoji: systemowego emoji NIE DA SIĘ przefarbować.** To gotowy obrazek
  w foncie systemu — 🪙 jest żółtą kropką, 🔬 przy 13 px nieczytelny, a każdy system rysuje je
  inaczej. Rysowana ikona w `currentColor` działa w obu motywach bez osobnych reguł i wygląda
  identycznie wszędzie. **Ten sam powód, dla którego 🧵 zostało zastąpione przez `WATEK_ICN`.**
- ⚠️ **FLAGI ZOSTAJĄ EMOJI** — niosą tożsamość, mają własny font na Windowsie (`flagi.js`),
  a w kresce przy tym rozmiarze byłyby nieczytelne. Odrzucone warianty: filtr CSS na emoji (szare plamy,
  w ciemnym motywie moneta gubi kształt) i ikony w czerwieni (czerwień niesie już numer pozycji
  i akcent marki — dwie czerwienie konkurują).
- **`ZNACZNIK_IKONY`** (19 pozycji) + **`znacznikHtml(flaga)`** — dzieli pole `flag` na GRAFEMY
  (`Intl.Segmenter`; `[...s]` rozsypałby flagę na dwie litery — ta sama pułapka co w `pierwszeEmoji`),
  mapuje znane emoji na `<svg class="zn-ico">`, resztę zostawia jako tekst. Wpięte w **17 miejsc
  renderu** w `index.html`.
- ⚠️ **Emoji spoza mapy renderuje się jak dotąd** — zero regresji dla archiwum i dla znaczników,
  których jeszcze nie przewidzieliśmy. Świadomie BEZ mapy: **🚨** (PILNE — czerwona syrena niesie
  sygnał, nie temat) oraz 📰/📢 (fallbacki).
- **Rozmiar znacznika** we wszystkich kontenerach listy (`.news-flag`, `.hero-flag`, `.sub-item-flag`,
  `.dt-item-flag`, `.dt-sub-flag`) — wybór właściciela z podglądu 13 / 14,5 / 16, ostatecznie **14 px**.
  `.dt-detail-flag` (26 px) zostaje: to znacznik nagłówkowy panelu, nie wiersz listy.
  ⚠️ `.zn-ico` ma **1.15em**, nie 1em — kreska jest rzadsza niż pełnokolorowe emoji i przy 1:1
  wygląda na mniejszą od flagi stojącej obok. Jedna liczba w kontenerze ustawia obie części.
- ⚠️ **Bot musi emitować OBA znaczniki** (`FORMAT_JSON_SELEKCJI`, ikona przed flagą, maks. dwa
  łącznie) — front sam kraju nie zna, w danych nie ma osobnego pola. Bez tamtej zmiany feed
  wygląda jak dotąd, tylko większy.
- ⚠️ **`XCzyKrajowy` w bocie wykrywa 🇵🇱 w polu `flag`** — złożony znacznik ⚡🇵🇱 dalej ją zawiera,
  więc bramka różnorodności na X działa jak dotąd. `pierwszeEmoji` (post na X) weźmie IKONĘ, bo
  stoi pierwsza — na X i tak nie wyślemy SVG, a jedno emoji to twarda reguła tamtej ścieżki.
- ⚠️ **ZNANA LUKA: `watki.html` i `fala.html` dalej renderują surowe emoji.** Mapa siedzi
  w `index.html`, a skopiowanie jej do drugiego pliku to gwarantowany dryf (precedens `itemSlug`).
  Objęcie ich wymaga wyciągnięcia wspólnego `znaczniki.js` (wzorzec `flagi.js`) + wpisu
  w `STATIC_ASSETS`. Do zrobienia, gdy właściciel zdecyduje, że ma być wszędzie.
### Wsteczne rozpoznanie tematu — `znacznikTematyczny` (życzenie: „żeby działało na poprzednich postach")
Ikonę wskazuje BOT w polu `flag`, ale robi to dopiero od dzisiejszej reguły — całe archiwum ma tam
samą flagę kraju. Dlatego pozycja BEZ znacznika tematycznego dostaje ikonę wyprowadzoną z treści
**przy renderze**. ⚠️ Plików `archive/*.json` NIE ruszamy: zamknięty dzień jest niezmienny.
- 🔴 **TYLKO NAGŁÓWEK, nigdy artykuł.** Pierwsza wersja skanowała `text + article` i dawała
  **57,9% pozycji** z bzdurnymi trafieniami („Udział Alphabet w Anthropic" → 🚀, bo o SpaceX
  wspominał artykuł pod spodem). Znacznik opisuje news TAK, JAK JEST ZATYTUŁOWANY.
- 📊 **Kalibracja na 6128 pozycjach, cztery tury zawężania — każde pudło znalezione PRÓBKĄ, nie
  recenzją:** 57,9% → 38,5% → 34,8% → **32,3%**. Wycięte kolejno:
  `kolej\w*` łapało **„kolejną transzę"** (398 poz. dostawało 🏗 — ta sama pułapka co `frank\w*`
  na „Frankfurt"); `satelit` łapało zdjęcia satelitarne z wojny; `lotnisk` łapało **lotniskowiec**;
  `żeglug` robiło z Ormuza infrastrukturę; **`rakiet` łapało rakiety BALISTYCZNE** (293 poz. — newsy
  wojenne dostawały 🚀, teraz wymagane `rakiet\w* nośn`); gołe `amazon` robiło z nakładów na AI
  handel detaliczny; kategoria **`Tech / AI` → 🤖** dawała robota wynikom Apple'a (549 poz.).
- **Kolejność w `IKONA_ZE_SLOW` JEST regułą** — pierwszy trafiony wzorzec wygrywa, więc szczegółowe
  (bitcoin, chipy) stoją nad ogólnymi. Kategoria to sygnał SŁABSZY, wchodzi dopiero gdy żadne słowo
  nie trafiło, i zostały tylko trzy bezpieczne: `Fed / Banki` → 🏦, `Rynki` → 📈, `Surowce` → 🛢.
  Kategorie polityczne i wojenne świadomie POMINIĘTE — tam flaga niesie więcej niż ikona.
- ⚠️ **Nowe newsy od bota WYGRYWAJĄ zawsze** — fallback odpala się wyłącznie, gdy pozycja nie ma
  własnego znacznika tematycznego. Model widzi treść, regex widzi słowa.
- ⚠️ **🚨 nietykane** — pozycja PILNA nie dostaje ikony, bo ten znacznik niesie sygnał, nie temat.
- ⚠️ **Dokładając wzorzec: wąsko i ZAWSZE ze skanem archiwum na fałszywe trafienia** (zasada
  z `AngielskieStopwordy`). Lepiej zostawić samą flagę niż dokleić ikonę nie na temat.

### Flaga tylko gdy kraj w nagłówku + dwie ikony przy dwóch tematach (doprecyzowania tego samego dnia)
- 🔴 **`KRAJ_W_NAGLOWKU`** — *„flagi tylko wtedy, kiedy jest kraj w nagłówku wzięty pod uwagę, bo np.
  przy Anthropic nie trzeba dawać flagi USA"*. Przy pozycji, której ikonę wyprowadziliśmy wstecznie,
  ikona **ZASTĘPUJE** flagę, gdy w nagłówku nie ma kraju. 📊 Zmierzone na 1987 pozycjach z ikoną:
  **60% traci flagę** („Walmart z najwolniejszym wzrostem" → 🛒, „Bitcoin przebija 72 000 USD" → 🪙),
  **40% ją zachowuje** („Ceny ropy w USA rosną" → 🛢🇺🇸, „Trump podpisuje dyrektywę…" → 🚀🇺🇸).
  Lista obejmuje nazwy, przymiotniki i INSTYTUCJE jednoznacznie wskazujące kraj (Fed, NBP, Sejm,
  Kreml, Biały Dom, Bruksela) — „Fed obniża stopy" mówi o USA bez słowa „USA".
  ⚠️ Przymiotniki wyliczone z końcówkami, nigdy `\w*` po rdzeniu (`polsk\w*` złapałoby „polskość").
- 🔴 **DWA TEMATY = DWIE IKONY** — *„jak jest pamięć i AI, to również dwie ikonki, jak jest bitcoin
  i AI, to też dwie"*. `znacznikiTematyczne` zwraca do dwóch trafień w kolejności `IKONA_ZE_SLOW`
  (szczegółowe nad ogólnymi), więc para układa się sama: 🔬🤖, 🪙🤖, 🚀🤖. Dwie ikony wypełniają
  budżet znacznika, więc flaga wtedy ustępuje.
  📊 Zmierzone na 6138 pozycjach: **2,0% dostaje dwie ikony** — najczęściej 🔬🤖 (64, m.in. realny
  przypadek ze zgłoszenia: „CEO Microna: pamięć to strategiczna infrastruktura dla AI"), 🚀🤖 (14),
  🔒🤖 (9), 🪙🤖 (8). ⚠️ Kategoria NIE tworzy drugiej ikony — sygnał za słaby.
- **Rozmiar 14 px** (korekta z 16 tego samego wieczoru) we wszystkich kontenerach listy.
- 🔴 **OPIS JAKO OSTATNIA DESKA: dwa wystąpienia + biała lista czterech ikon.** Pytanie właściciela
  („z opisu nie możesz też brać emoji? bez kosztów?") — kosztów nie ma (regex, 0 tokenów), kosztem
  jest TRAFNOŚĆ i to ona wyznaczyła kształt reguły. 📊 Zmierzone na 4151 pozycjach bez ikony:
  **próg 1 wystąpienia → 830 (20%) i próbki bezużyteczne** („Tusk tłumaczy reformę podatków" → 🛢,
  bo artykuł wspomina paliwa; „Piąty wyciek GTA" → ✈ przez „Flight Simulator"); **próg 2 → 300 (7%),
  ale trafność ROZJEŻDŻA SIĘ PER IKONA** i dopiero rozbicie po ikonach pokazało, co z tym zrobić:
  🚀 13/13, 🛢/🔬/💊 ~80%, ale 🤖 i ⚡ ~50%, 🪙 ~40%, ✈ i 🚗 ~30%, 🔒 ~25%.
  Stąd `IKONA_Z_OPISU` = **wyłącznie 🚀 🛢 🔬 💊** przy `MIN_TRAFIEN_W_OPISIE = 2`.
  📊 Efekt stary vs nowy detektor na 6140 pozycjach: **32,4% → 34,9% (+154), ZERO pozycji traci ikonę.**
  ⚠️ **Nie dopisuj tu ikony bez powtórzenia pomiaru** — połowa zestawu go nie przeszła.
  ⚠️ Opis daje najwyżej JEDNĄ ikonę (nigdy pary): to sygnał słabszy niż nagłówek i nie wolno mu
  wypchnąć flagi z budżetu znacznika.

- ⚠️ **Knaga świadomie pokazuje surowe emoji** — tam patrzysz na to, co realnie pójdzie na X.
- ✅ Zweryfikowane na PRAWDZIWYM froncie (lokalna kopia, `briefs.json` z podmienionymi znacznikami):
  ikona + flaga obok siebie w hero, w wierszach listy i przy dwóch flagach (🇺🇸🇨🇺 bez ikony),
  0 błędów JS. SW → v130.

## Budżet znaków posta X: liczy go GENERATOR, nie przycinanie po fakcie (2026-08-20) 🔴
Zgłoszenie właściciela ze zrzutu panelu (*„ucina mi"*): przy dopisku „link w bio" post kończył się
**„Cała dzisiejsza dawka — link w…"** — ucięta była sama DOKLEJKA, czyli jedyna część, której
`gotowiec-x` **celowo nie przycina** („obcięta zachęta to najgorszy z możliwych wyników").
- 🔴 **PRZYCZYNA: DWA BUDŻETY. Knaga nie podawała funkcji `maxZnakow`** — jako jedyna z trzech
  ścieżek. Funkcja budżetowała więc pełne 270 znaków, nic nie wiedząc o **fladze kraju, którą
  `zFlaga` dokleja z przodu** już w przeglądarce. Wynik przekraczał limit o flagę i spację,
  a `zFlaga` ścinała nadmiar **ŚLEPO OD KOŃCA** — a końcem jest doklejka.
- 📊 **Odtworzone REALNYMI funkcjami z `knaga.html`** (nie z lektury): flaga 🇮🇷, doklejka 35 zn. →
  funkcja oddaje 270, `zFlaga` tnie do 267 → z „…link w bio." zostaje „…link w…", licznik
  **269/270** — dokładnie to, co widać na zrzucie. Po poprawce: `maxZnakow` = **267**, funkcja
  oddaje 267, `zFlaga` **nie tnie nic**, w polu 270/270 i doklejka w całości.
- **Naprawa: knaga podaje budżet, tak jak bot od 2026-08-12** (`XPobierzGotowiec`:
  `XBudzetZnakow − flaga − 1`). Wspólny helper `xBudzetTresci(flaga)` — jedna formuła dla
  generatora i dla składania posta.
- ⚠️ **Cięcie w `zFlaga` ZOSTAJE jako ostatnia deska ratunku** (ręczna edycja pola), ale przy
  poprawnym budżecie się nie odpala. **Nie jest to bramka na doklejkę** — tnie od końca i nie wie,
  co tnie.
- ⚠️ **Dotyczyło TEŻ wariantu bez dopiska** — tam ślepe cięcie zabierało 2-3 znaki z końca zdania
  i dokładało drugi wielokropek. Zmierzone na 6 kombinacjach (flaga 1 i 2 punkty kodowe, dopisek
  wł./wył.): przed poprawką drugie cięcie w 5 z 6, po poprawce w 0 z 6.
- 🔴 **ZASADA: budżet znaków ma JEDNEGO właściciela — generator.** Kto dokleja cokolwiek PO
  generowaniu (flaga, doklejka, prefiks), musi to ODJĄĆ od budżetu z góry, nigdy dociąć po fakcie.
- ⚠️ **Trzy miejsca, jedna liczba**: `MAX_ZNAKOW` w `gotowiec-x` (wymaga redeployu!), `X_TEXT_MAX`
  w knadze, `XBudzetZnakow` w bocie.
- ⚠️ **Ta poprawka NIE dotyka przycinania treści przez samą funkcję** — gdy model przegada budżet,
  post dalej urywa się na granicy zdania (albo wielokropkiem, gdy granicy nie ma powyżej 60%
  budżetu). To osobna sprawa i **wymaga redeployu `gotowiec-x`**, więc nie idzie przez git.

### 🔴 Druga tura tego samego dnia: doklejka „link w bio" WYCHODZI PONAD KADR
Pomysł właściciela zaraz po pierwszej poprawce: *„można limit zwiększyć na 400 i chyba nawet lepiej
będzie, jak dopisek pojawi się dopiero po «czytaj dalej»"*. Sedno jest trafne: **doklejka to nie
jest wartość posta, tylko prośba** — a dotąd odbierała newsowi **37 znaków** (model dostawał 233
zamiast 270), czyli płaciliśmy treścią za CTA.
- **Wybór właściciela (z trzech przedstawionych): news w kadrze, doklejka pod zwinięciem.**
  `budzetTresci = maxZnakow` (koniec odejmowania), a `CTA_BIO` dopina się PONAD limit → w polu
  **307 znaków**, z czego **270 w kadrze osi czasu** i 35 pod „Pokaż więcej".
  ⛔ Wariant „twarde 400 na wszystko" ODRZUCONY: przy nim pod zwinięciem lądowała TEŻ końcówka
  newsa, a post idzie BEZ LINKU — w kadrze musi być treść, nie urwane zdanie.
- 🔴 **LIMIT POLA ≠ LIMIT KADRU.** `X_TEXT_MAX` (270) pilnuje tego, co widać bez klikania;
  `xLimitPola` to ile wolno mieć CAŁEMU polu. Licznik w knadze pokazuje przy dopisku **307** i to
  nie jest przekroczenie. Kto tego nie rozdzieli, wraca do ucinania doklejki.
- **Długość doklejki knaga bierze z ODPOWIEDZI funkcji** (nowe pole `doklejka`), nie z własnej
  kopii napisu — treść CTA zostaje w jednym miejscu, panel potrzebuje wyłącznie liczby znaków.
- ✅ **Kolejność wdrożenia NIE jest pułapką W ŻADNĄ STRONĘ** — i to jest zapewnione po OBU stronach:
  (a) stara funkcja nie zwraca `doklejka`, więc panel zostaje na limicie 270, a tamta wersja i tak
  odejmowała CTA od budżetu; (b) 🔴 **wołający, który NIE podaje `maxZnakow`, dostaje z funkcji
  wariant zachowawczy** (doklejka wewnątrz limitu) — bo nie zna kontraktu i przytnie wynik po fakcie.
  Bez tego bezpiecznika redeploy funkcji PRZED mergem panelu kasowałby CAŁĄ doklejkę (41 znaków
  nadmiaru wobec 37-znakowej doklejki), czyli byłoby GORZEJ niż przed poprawką.
  📊 Zmierzone na czterech kombinacjach (stara/nowa knaga × stara/nowa funkcja), realnym `zFlaga`
  z pliku: `stara+stara` = dzisiejszy błąd (CTA ucięta), **`stara+nowa` = identycznie jak dziś,
  ani gorzej**, `nowa+stara` = CTA cała, news 233 zn., `nowa+nowa` = CTA cała, news 270 zn. w kadrze.
- 📊 Zweryfikowane realnym `zFlaga`/`xUstawLimitPola` z pliku × wierny port obu wersji funkcji,
  5 scenariuszy: bio z flagą 2 i 1 punktu kodowego (307/307, kadr 270, CTA cała), kontrola bez
  dopiska (270/270, bez zmian), krótki post (89/307), stara funkcja + nowy panel (270/270, CTA cała).
- ⚠️ **ŚWIADOMY KOSZT: zachętę pod zwinięciem widzi mniej ludzi**, a wariant powstał właśnie dla
  wizyt profilu (20,1 tys. wyświetleń → 12 wizyt). Jeśli wizyt nie przybędzie, **pierwszym
  podejrzanym jest ten wybór**, nie treść doklejki.
- ⚠️ **Automat NIE używa wariantu `bio`** (bot: „uruchamia go WYŁĄCZNIE człowiek z panelu"), więc
  `XZlozPost` w bocie nic nie przycina. Gdyby kiedyś bot miał publikować z dopiskiem — **musi
  najpierw dostać limit świadomy doklejki**, inaczej utnie ją dokładnie tak, jak robiła to knaga.
- ⚠️ **Wymaga redeployu:** `supabase functions deploy gotowiec-x --project-ref utmvokfjvrthvcmxzowc`.

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
- **Wejście mobilne = PANEL WĄTKÓW nad feedem** (2026-08-13; zastąpił cienki pasek-link z 07.08) —
  pociągnięcie w dół rozwija pełne sagi tej dawki. Szczegóły w sekcji „Panel wątków" niżej.
  ⚠️ Panel leży POZA `#content`, bo `renderDose` nadpisuje `#content` przy każdym renderze i panel
  znikałby po każdym live-ticku (ten sam powód co przy dawnym pasku).
- **Wejście desktopowe = `.dt-watki-btn`** obok zakładek dawek, z żywym licznikiem sag.
  Czerwony obrys, NIE fioletowy — fiolet znaczy „aktywna dawka" i przycisk czytałby się jak czwarta dawka.
- **Ikona wątku: stała `WATEK_ICN`** (SVG, wariant „naprzemienna oś"). Zastąpiła emoji 🧵, które
  renderowało się inaczej na każdym systemie i było kolorową plamą w monochromatycznym UI.
  Używaj stałej, nie wklejaj SVG drugi raz; osobne kopie są tylko w statycznym HTML (topbar, pasek).

### Panel wątków nad feedem — pociągnięcie w dół zamiast odświeżania (2026-08-13) 🔴
Życzenie właściciela: *„zamiast odświeżania i tego małego panelu wątku niech pojawią się wątki
w całości, tak jak na osobnym linku, i tylko te, które matchują z porannym/wieczornym"*.
Pasek z 07.08 był wyłącznie linkiem do `/watki` — teraz gest oddaje same wątki, na miejscu.
- 🔴 **GEST PRZESTAŁ ODŚWIEŻAĆ** (decyzja właściciela). Jeden próg zamiast dawnych dwóch,
  panel otwiera się na PUSZCZENIE — otwieranie dużego bloku w trakcie ruchu palca szarpałoby widokiem.
  Odświeżanie zostaje pod przyciskiem ↻ w topbarze, a `liveTick` (60 s) i tak dociąga zmiany sam,
  więc znika skrót gestem, nie dostęp do świeżych danych.
- 🔴 **CZUŁOŚĆ ZDJĘTA 2026-08-14** (zgłoszenie właściciela: *„to pociągnięcie w dół jest zbyt czułe"*):
  próg **60 → 120 → 150 px** (60 px ≈ 7 mm otwierało panel od drgnięcia przy top story; 150 = drugie
  „jeszcze troszkę zwiększ" od właściciela tego samego wieczoru — próg jest KALIBROWANY jego kciukiem,
  nie pomiarem, więc kolejne korekty to jedna stała `PROG`) + **guard kierunku
  `dy > |dx| · 1,5`** — dotąd liczyła się sama oś pionowa, więc ukośne machnięcie (np. zmiana dawki
  swipe'em zahaczająca o pion) też otwierało panel. Wskaźnik `↓ Wątki` pokazuje się od 24 px zamiast 10.
  ✅ Zweryfikowane w Chromium realnym dotykiem (CDP `Input.dispatchTouchEvent`, 390 px): 80 px pion →
  zamknięty, 160 px pion → otwarty + kotwica na najnowszej sadze, ukos 160/140 → zamknięty, zamierzony
  lekki ukos 200/60 → otwarty, start przy `scrollTop>0` → zamknięty; 0 błędów JS. SW → v122.
  ⚠️ Zmieniając próg ponownie, testuj DOTYKIEM, nie kółkiem — znana pułapka z sekcji o stepperze.
- 🔴 **KOLEJNOŚĆ SAG ODWROTNA NIŻ NA `/watki` — i to jest zamierzone.** Panel wysuwa się NAD feedem,
  więc najnowszy wątek stoi na jego DOLE (pierwszy pod ręką po geście), a im wyżej, tym starsze:
  przewijanie w górę = cofanie się w czasie. Stąd `watkiDlaDawki` sortuje **rosnąco** po ostatnim
  etapie, a `wpPrzewinDoNajnowszej` po otwarciu ustawia przewinięcie na ostatnią sagę — bez tego
  czytelnik lądowałby na początku listy, czyli na NAJSTARSZYM wątku, odwrotnie do zamówienia.
  ⚠️ **Wewnątrz jednej sagi oś zostaje jak wszędzie: najnowszy etap na górze** (patrz sekcja niżej).
  To dwie różne osie i nie wolno „ujednolicić" ich przez pomyłkę.
- **Zakres = etap Z TEJ DAWKI i z dnia, który ta dawka realnie pokazuje.** Dzień bierzemy
  z `doseDates`, nie z zegara — po północy, zanim bot założy nową dawkę, feed pokazuje WCZORAJSZE
  wydanie i panel musi mówić o tym samym dniu. 📊 Zmierzone na produkcyjnym `threads.json` (12.08):
  poranna 9 sag, popołudniowa 8, wieczorna 4 — panel ma czym żyć w każdej dawce.
- **Belka jest na DOLE panelu**, bo to ona ląduje pod ręką po geście; nagłówek u góry byłby o kilka
  ekranów stąd. ⚠️ Etykieta KRÓTKA (`4 wątki · wieczorna`): zmierzone, że „4 wątki dawki wieczornej"
  nie mieści się obok „Wszystkie →" i „Zwiń ▴" i jest ucinane w połowie słowa, czyli z odmianą,
  która wtedy kłamie. Nazwy dawek jak na MOBILNYCH zakładkach („południowa", nie „popołudniowe").
- **Pusty panel MUSI się otworzyć i powiedzieć dlaczego** — gest, po którym nic się nie dzieje, czyta
  się jak zepsuta apka (ta sama zasada co karta „dawka w przygotowaniu").
- 🔴 **ZMIANA DAWKI ZAMYKA PANEL** (życzenie właściciela: „jak przeskakuję na poranną, to ma być
  schowane — dopiero jak w danej dawce pójdę w górę, ma się pokazać"). Pierwsza wersja przerysowywała
  go i zostawiała otwarty, więc kliknięcie w zakładkę wrzucało czytelnika w środek listy wątków
  zamiast na feed nowej dawki. Panel wraca **wyłącznie gestem**, już z wątkami nowej dawki.
  ⚠️ To jest ODWROTNIE niż „panel szczegółów na PC zostaje przy zmianie dawki" — tam wybór artykułu
  jest stanem czytelnika, tu panel jest doraźnym podglądem wywołanym gestem. Nie ujednolicaj tego.
  ⚠️ Treść panelu zostaje w DOM po zamknięciu (stara belka, stare sagi) — jest niewidoczna, a przy
  otwarciu i tak leci `renderWatkiPanel`. Nie diagnozuj tego jako „panel pokazuje złą dawkę".
- 🔴 **PRZEWIJANIE SKOKAMI PO WĄTKACH — stepper w JS, po nieudanym podejściu przez `scroll-snap`.**
  Życzenie: „kolejne przeciągnięcie też tak przeskakuje, czyli co wątek przeskok". Pierwsza wersja
  dokładała `scroll-snap-type: proximity` + `scroll-snap-stop: always` i **na telefonie nie dała
  tego efektu** („nie przeskakuje tak jak przy pierwszym"): snap tylko DOCIĄGA po zwykłym
  przewijaniu palcem, więc ruch jest płynny i kończy się po wygaśnięciu inercji, a oczekiwany był
  ten sam natychmiastowy skok co przy otwarciu panelu. **Pomiar kółkiem myszy pokazywał ładne
  stopnie i mimo to mylił** — dotyk zachowuje się inaczej, a `Input.synthesizeScrollGesture` (touch)
  w sandboxie nie przewija wcale. `Input.dispatchTouchEvent` przewija i to ono nadaje się do testów.
  Teraz: listener na `#watkiPanel` (`touchmove` z `passive:false`) blokuje natywne przewijanie
  w pionie i na puszczenie woła `wpSkok(±1)` → `scrollTo({behavior:'smooth'})` do sąsiedniej kotwicy.
  - 🔴 **PRZEWIJANIE W PANELU JEST ZWYKŁE** (ostateczna decyzja właściciela 2026-08-13, po serii prób:
    „zróbmy tak jak na początku, tylko pierwszy wątek się szybko pojawia, reszta to ma być scroll
    zwykły"). Zostaje WYŁĄCZNIE natychmiastowe zakotwiczenie na najnowszym wątku przy otwarciu panelu
    — to ono podobało się od początku („fajnie przeskakuje od razu") — a stepper gestu został
    usunięty. Czego nie odgrzewać i dlaczego: patrz blok komentarza `⛔ STEPPER GESTU` w `index.html`
    (scroll-snap nie daje skoku, animowany skok gubi się przy szybkiej kadencji, `preventDefault` po
    progu jest bezsilny, a przycinanie natywnego przewijania w `scroll` WIBRUJE na telefonie).
  - 🔴 **KOTWICA KOREGOWANA DWA RAZY — inaczej wątek staje krzywo.** `.dose-tabs` chowają się przy
    przewijaniu, a `.scroll-area` ma wtedy inny `margin-top` i wysokość, zmieniane przejściem 0,25 s.
    Gest otwierający panel jest przewinięciem W GÓRĘ, więc SAM wywołuje powrót zakładek: pomiar
    w `requestAnimationFrame` łapie layout w połowie animacji. Zmierzone: wątek stawał **−28 px**
    za wysoko. Druga korekta po 320 ms (koniec przejścia) daje **0 px** we wszystkich trzech
    sytuacjach: zakładki widoczne, zakładki wjeżdżające, zakładki schowane.
  - Powtórzony gest przy samej górze panelu wraca na najnowszy wątek (skrót zamiast przewijania
    przez całą listę).
- 🔴 **`data-bez-wykresu` na wierszu etapu to nie ozdoba.** `sagaToggleSkrot`/`sagaPodswietlKropke`
  szukają legendy `.sr-box` W GÓRĘ drzewa, a panel i `#content` siedzą w tej samej `.scroll-area` —
  bez znacznika tap w panelu przestawiałby kropkę na wykresie OTWARTEGO ARTYKUŁU pod spodem
  i zamykał rozwinięty tam skrót. Znacznik zawęża zasięg „jednego otwartego naraz" do `#watkiPanel`.
  ✅ Zweryfikowane w Chromium: przy dwóch wykresach w feedzie tap w panelu daje 0 kropek `.sel`.
- **Zero dodatkowych fetchy przy otwarciu** — panel jedzie z wczytanego `threads.json` i dawek
  z `cache`; skrót etapu dociąga się leniwie po tapnięciu (`sagaToggleSkrot`, wspólny z osią pod
  postem i `/watki`, razem z pułapką kotwicy klastra i sięganiem po dzień ±1).
- ⚠️ **Etap, którego nagłówek bot przepisał po publikacji, pokaże „Pełna treść w wydaniu z tego dnia"**
  — znana klasa („tekst węzła sagi nie jest kluczem trwałym"), identycznie jak na `/watki`. Zmierzone
  na dzisiejszych danych: węzły z DZIŚ trafiają w `briefs.json` w 45/47 przypadkach.
- ✅ Zweryfikowane w Chromium (390 px, gest przez CDP `Input.dispatchTouchEvent`): płytkie pociągnięcie
  nie otwiera, pełne otwiera i kotwiczy na najnowszej sadze, kolejność rosnąca po dacie, rozsuwanie
  środka osi 3 → 30 węzłów, przełączanie dawek 9/8/4, „Zwiń" wraca na górę, desktop panelu nie
  pokazuje, belka mieści się od 320 px, zero błędów JS.
  ⚠️ **Do testu w sandboxie trzeba UCIĄĆ egress i SW**: fonty Google i SDK OneSignal wiszą na proxy
  i blokują parsowanie (`document.body === null`, dokument zostaje w `readyState=loading`), a
  `checkAppShellUpdate` przeładowuje stronę po ~3 s, bo `python http.server` nie daje ETagu — reload
  kasuje stan panelu i wygląda jak bug w kodzie. Obie pułapki złapane pomiarem, nie lekturą.

### Chronologia osi — JEDNA konwencja: NAJNOWSZY NA GÓRZE (2026-08-12) 🔴
Węzły w `threads.json` przychodzą od bota **od najstarszego**, a **każde** miejsce renderujące oś
odwraca je u siebie: `watekHtml` (oś pod postem), `watki.html`, strona sagi `w/<slug>.html` (bot)
i karta `og?w=1`. Zmieniasz kolejność w jednym miejscu → zmień we wszystkich.
- 🔴 **HISTORIA TEJ POMYŁKI — warto ją znać, bo kosztowała dwa razy.** Od 07.08 wszystkie powierzchnie
  miały najnowszy na górze. 11.08 zdanie właściciela *„udostępnij wątek ma być od góry do dołu
  chronologicznie"* zostało odczytane jako „chronologicznie = od początku historii" i PR #140 usunął
  `reverse()` w `watki.html`, a bot dostał bliźniaczą zmianę na stronach sag; do tego powstał tu cały
  akapit o „dwóch konwencjach". 12.08 właściciel zgłosił to ze zrzutem: *„miało być od góry do dołu,
  u góry najnowsze"* — czyli chodziło o **KIERUNEK CZYTANIA** (kolejno w dół), nie o kolejność zdarzeń.
  **ZASADA: „od góry do dołu" opisuje układ, nie chronologię — przy takim zdaniu dopytaj, który etap
  ma stać pierwszy.**
- ⚠️ `watki.html` zwija ŚRODEK osi, nie ogon: **2 najnowsze na górze + znacznik „… N etapów pośrodku"
  + początek historii na dole**. Pokazanie „trzech od góry" ucięłoby początek sagi, a wcześniejszy
  wariant (początek + 2 najnowsze) chował świeży etap — potrzebne są OBA końce.
- ⚠️ Czerwona kropka = NAJNOWSZY etap, więc na stronie sagi to `li:first-child::before`, nie
  `last-child`. Przy odwracaniu osi łatwo o tym zapomnieć i oznaczyć początek historii.
- ⚠️ Nagłówek strony sagi `Oś wydarzeń · N etapów · <data> → <data>` ZOSTAJE chronologiczny —
  to zakres trwania historii, nie kolejność czytania.
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
- 🔴 **WARIANT MOBILNY USUNIĘTY 2026-08-12** (decyzja właściciela: *„usuń to na mobilnej wersji, zrób
  jak było wcześniej, ale na PC zostaw"*). `aktualizujPilne` **nie dotyka już `.live-pill` w ogóle**,
  mobilna pastylka wróciła do statycznego „Live". Reguły `.live-pill.pilne` skasowane ze `styles.css`.
  ⚠️ **Nie da się tego zrobić samym CSS-em** — JS podmieniał `innerHTML`, więc ukrycie wariantu
  zostawiłoby pastylkę z treścią PILNE pod spodem, gotową pokazać się przy pierwszej zmianie stylów.
  Jedyne czyste wyjście to nie ruszać tego elementu.
  ⚠️ **`.topbar-right { min-width: 0 }` i `.topbar-date { white-space: nowrap }` ZOSTAJĄ** mimo że
  powstały pod mobilny pasek: opisują zachowanie CAŁEGO topbara przy ciasnocie (dwie zmierzone
  regresje — data na trzeciej linii, przycisk 9 px poza ekranem), a nie samej pastylki.
- Wariant desktopowy: stonowany, nagłówek ucinany przy 340 px.

## Wątek na X: tekst w poście, pełna oś w obrazku — `w=1&pelna=1` (2026-08-11)
Życzenie właściciela: *„panel udostępnienia wątków na X — pierwszy wątek będzie w tekście, a później
w obrazku historia wątku"*. Nitka wygląda teraz tak: **post 1 = tekst sagi**, **komentarz 1 = kwadratowa
oś z historią**, komentarz 2 = link (podgląd renderuje się sam).

### Jak wysoki może być obrazek na X — ODPOWIEDŹ, bo ona wyznacza projekt
Twardy limit platformy to **4096×4096 px i 5 MB**. Ale realnym ograniczeniem jest **kadr w osi czasu**:
pojedynczy obrazek dostaje pełną szerokość kolumny, a wszystko **wyższe niż ~1:1 jest przycinane**
i widoczne w całości dopiero po kliknięciu. W drugą stronę tak samo: **poniżej 2:1** (czyli obrazek
bardzo szeroki i niski) X też kadruje. Stąd granice karty: **szerokość 1200 stała, wysokość 600–1200**.
- ⚠️ Nie ma sensu robić „długiego" obrazka z całą sagą — czytelnik zobaczy w feedzie tylko jego środek.

### Wysokość LICZONA Z TREŚCI, liczba etapów DOBIERANA DO SUFITU
Dwie osobne rzeczy, obie wymuszone uwagą właściciela („żeby nie zostało białe tło na dole"):
- **`wysokoscKartyWatku`** — szkielet ~224 px + wiersz etapu (data 16 + 3 + linie po 28 px + 13 px
  odstępu). Etap zajmuje jedną albo dwie linie, bo `tnij` ucina na 118 znakach, a w linię wchodzi ~62.
- **`ileWezlowNaKarte`** — zdejmuje NAJSTARSZE etapy, dopóki wyliczona wysokość nie zejdzie pod 1200.
  🔴 Bez tego sufit CIĄŁBY treść: kadr ma `overflow: hidden`, więc dwunasty etap zniknąłby bez śladu.
- **`rozciagnij`** — gdy treść jest NIŻSZA niż podłoga 600 px, nadmiar rozkładamy równo między etapy
  (`flexGrow` + `justifyContent: space-between`) zamiast zostawiać pas bieli.
- 📊 **Zweryfikowane na WDROŻONEJ funkcji, nie na szacunku:** saga 29-etapowa → `1200×1155`, pokazane
  **12 z 29**, ostatni wiersz cały, nic nie ucięte; saga 3-etapowa → `1200×600` z równo rozłożonymi
  odstępami i bez białego pasa. Rozmiary plików 66 i 156 KB, czyli daleko od limitu 5 MB.
- ⚠️ `MAX_WEZLOW_KARTA_KWADRAT = 12` to GÓRNA GRANICA, nie liczba realnie pokazanych etapów — tę
  wylicza `ileWezlowNaKarte`, bo długie nagłówki zajmują dwa razy więcej miejsca niż krótkie.
- 🔴 **`pelna` DOPISANE do `ZNANE_PARAMY`** — bez tego nieznany parametr wraca `zapasowa()` i KAŻDA
  karta stałaby się statyczną grafiką (ta sama pułapka co przy `k=1`).

### Dwa adresy wątku: 1. etap i CAŁA saga
Życzenie właściciela: *„żeby generowało link do 1 posta z wątku oraz link do całego wątku"*.
- **Link do całego wątku JUŻ ISTNIAŁ** — bot generuje statyczne strony sag `w/<slug>.html` (57 sztuk
  na dziś), z własnymi tagami `og:`, więc na X renderują kartę. Panel po prostu ich nie oferował.
  Slug bierzemy z pola `slug` wątku w `threads.json` (ZAMROŻONE przy założeniu sagi — patrz
  „Tytuł sagi ODŚWIEŻANY" w repo bota; liczenie go z tytułu przeniosłoby stronę pod nowy adres).
- ⚠️ **Strona sagi powstaje RAZ NA DOBĘ**, więc świeża saga może jej jeszcze nie mieć → sprawdzamy
  HEAD-em i przy braku wracamy do `watki.html`. Ten sam wzorzec co przy stubach `s/<slug>.html`.
- 🔴 **ADRES 1. ETAPU MUSI BYĆ ZWERYFIKOWANY, NIE ZBUDOWANY W CIEMNO.** Zmierzone na czterech realnych
  sagach: dla jednej slug policzony z tekstu węzła **nie istnieje w archiwum żadnej dawki** tego dnia
  ani następnego. Powód: bot PRZEPISUJE nagłówki po publikacji (eskalacja, tytuł z polskiego źródła,
  clickbait) i przebudowuje klastry, a węzeł sagi zachowuje tekst z chwili dopięcia. `ustalLinkPierwszegoEtapu`
  szuka slugu we WSZYSTKICH dawkach dnia (pole `dose` węzła też bywa nieaktualne), a gdy go nie ma —
  oddaje pustkę i panel kieruje na stronę sagi, gdzie ten etap i tak jest na osi.
  **Trafiony adres jest lepszy niż dokładny, ale martwy.**
- ⚠️ To jest **klasa do zapamiętania: tekst węzła sagi nie jest kluczem trwałym.** Cokolwiek adresujesz
  slugiem liczonym z `threads.json`, sprawdź istnienie, zanim pokażesz.

### Panel w knadze
- **„Wstaw wątek jako tekst"** (`xWatekTekst`) — składany **deterministycznie z `threads.json`**, zero
  tokenów: najnowszy etap + tytuł sagi + memo (dokładane tylko, gdy realnie mieści się w 300 znakach)
  + stopka „Oś wątku: N etapów". Model tu nie jest potrzebny — tytuł i memo SĄ już streszczeniem,
  a `gotowiec-x` opisuje POJEDYNCZY news, nie sagę.
- **„Pobierz oś wątku — pełna (N z M)"** — pokazywana **dopiero od 5 etapów**: przy czterech i mniej
  klasyczna karta 630 niesie to samo, a kwadrat zajmowałby dwa razy więcej miejsca w nitce.
- ⚠️ **Deploy funkcji `og` NIE idzie przez git** (`supabase functions deploy og --no-verify-jwt
  --project-ref utmvokfjvrthvcmxzowc`). Wdrożone z repo — patrz ostrzeżenie „wygląd trzymany tylko
  na serwerze NIE ISTNIEJE".

## Baner instalacji: iOS dostał podpowiedź, „Nie teraz" dostało termin (2026-08-11)
Pytanie właściciela: *„czy nowi użytkownicy widzą powiadomienie, żeby zainstalować stronę jako aplikację?"*.
Odpowiedź brzmiała: **przy pierwszej wizycie NIE** (twardy warunek `_visits >= 2`), a **na iPhonie NIGDY**.
Decyzja właściciela: próg drugiej wizyty ZOSTAJE, dochodzi iOS i termin ważności wyciszenia.
- 🔴 **iOS nie ma `beforeinstallprompt` i nigdy nie będzie miał** — to API Chromium. Cały baner wisiał
  na tym zdarzeniu, więc użytkownik Safari nie dostawał ŻADNEJ podpowiedzi (zmierzone: zero wystąpień
  `iPhone`/`iPad`/`navigator.standalone` w `index.html`). Osobna gałąź pokazuje ten sam baner **bez
  przycisku „Dodaj"** (nie ma czego wywołać programowo) i z instrukcją „Udostępnij → «Do ekranu
  początkowego»" zamiast obietnicy.
- ⚠️ **iPadOS 13+ PODAJE SIĘ ZA MACA** w `userAgent` — sam test na „iPad" go nie łapie. Stąd drugi
  warunek: `platform === 'MacIntel' && maxTouchPoints > 1`. `czyIOS(ua, platforma, dotyk)` jest
  **funkcją czystą**, żeby dało się ją sprawdzić na cudzym UA bez podmieniania przeglądarki —
  zweryfikowane na 7 UA: iPhone/iPad/iPadOS 13+/Chrome iOS → true, Android/Mac bez dotyku/Windows → false.
- **Gałąź iOS odpala się 1,5 s po `load` i ustępuje Chromium** (`if (deferredInstallPrompt) return`),
  żeby przy przeglądarce mającej prawdziwe zdarzenie wygrał wariant z działającym przyciskiem.
- 🔴 **„Nie teraz" ma teraz TERMIN WAŻNOŚCI (30 dni).** Dotąd zapisywało `'1'` bez daty, czyli JEDNO
  kliknięcie wyciszało baner NA ZAWSZE. ⚠️ Zabytek `'1'` przepisujemy na **DZIŚ**, nie na przeszłość —
  inaczej wszyscy, którzy kiedykolwiek kliknęli, zobaczyliby baner od razu po wdrożeniu.
- **Instalacja = cisza na zawsze**, nie na 30 dni: `appinstalled` oraz `outcome === 'accepted'` ustawiają
  `brifup_install_done`. Do tego `instalacjaZbedna()` sprawdza trzy niezależne sygnały, bo żaden nie działa
  wszędzie: `display-mode: standalone` (Chromium), `navigator.standalone` (iOS), własna flaga.
- ✅ Zweryfikowane w przeglądarce na 6 stanach `localStorage`: brak wpisu → baner wolno pokazać; zabytek
  `'1'` → ukryty i przepisany na dziś; kliknięte przed chwilą i 29 dni temu → ukryty; **31 dni temu →
  baner wraca**; śmieć (`'NaN'`) → traktowany jak świeże kliknięcie (fail-safe: nie zasypujemy banerem).
- ⚠️ **`brifup_visits` liczy ZAŁADOWANIA, nie wizyty** — rośnie też przy przeładowaniach, które apka robi
  sobie sama (nowa powłoka, `controllerchange`, watchdog). Próg „drugiej wizyty" bywa więc osiągany
  w pierwszej minucie. Działa to na korzyść baneru, ale przypadkiem — nie opieraj na tym liczniku niczego,
  co ma mierzyć realne wizyty (od tego jest beacon licznika, patrz sekcja „Wejście ≠ wznowienie apki").

## ⚠️ Panel podglądu ZAMRAŻA animacje CSS (2026-08-11)
Baner instalacji dostawał klasę `.show`, a `getComputedStyle` uparcie zwracał `translateY(100%)` —
także po ustawieniu `transform` **inline**, co wygląda na niemożliwe. Przyczyna nie jest w CSS: gdy
panel Browser jest schowany, strona idzie w tło i **przejścia CSS się nie wykonują**, więc computed
style zostaje na wartości początkowej. Diagnozując „styl się nie stosuje", najpierw wyłącz przejście
(`el.style.transition = 'none'`) i dopiero wtedy mierz — po tym baner od razu pokazał
`translateY(0)` i poprawną pozycję przy dolnej krawędzi.

## BIAŁY EKRAN PRZY STARCIE PWA — `respondWith(undefined)` (2026-08-11) 🔴
Zgłoszenie właściciela ze zrzutem czystej bieli: *„czasami takie coś się zdarza po otwarciu aplikacji
na Androidzie, muszę zrestartować, żeby się odpalił brifup"*.
- 🔴 **Przyczyna — gałąź nawigacyjna SW potrafiła oddać `undefined` zamiast strony:**
  ```js
  const siec = fetch(...).catch(() => cached);   // cached bywa undefined
  return cached || siec;                         // → undefined
  ```
  `respondWith` z czymś, co nie jest `Response`, **kończy nawigację BŁĘDEM**. 📊 Zweryfikowane
  EKSPERYMENTEM w Chromium na odtworzonej gałęzi (nie z lektury kodu): nawigacja ląduje na
  `chrome-error://chromewebdata/`, dokument ma **39 znaków HTML-a, zero treści**. W zwykłej karcie
  przeglądarka dorysowuje własny komunikat — **w PWA (standalone) nie ma ani paska, ani strony błędu,
  więc zostaje BIEL**.
- 🔴 **Dlatego watchdog nie ratował.** Watchdog „8 s białego ekranu" (17.07) siedzi w `index.html` —
  a przy pustym dokumencie **żaden skrypt się nie wykonuje**. Zabezpieczenie było wewnątrz strony,
  której nie ma. Restart apki był jedynym wyjściem i to się zgadza ze zgłoszeniem.
- 🔴 **KIEDY cache powłoki bywał pusty — to nie był rzadki zbieg okoliczności:** `activate` kasuje
  cache o innej nazwie, a `index.html` **świadomie nie był precache'owany**. Czyli po KAŻDYM bumpie
  `CACHE_NAME` pierwsze otwarcie apki szło wyłącznie z sieci. Wystarczyło, że Android wstający
  z uśpienia nie dowiózł pierwszego żądania. Przy tempie deployów tego projektu okno wypadało
  kilka razy dziennie.
- **Naprawa dwuczęściowa (SW v94):**
  1. `return cached || (await siec) || odpowiedzAwaryjna()` — każda ścieżka kończy się realną
     odpowiedzią. `.catch(() => null)` zamiast `.catch(() => cached)`.
  2. **`index.html` precache'owany przy `install`**, OSOBNO od `addAll` i we własnym `try` — `addAll`
     jest wszystko-albo-nic, więc nieudane pobranie powłoki wywaliłoby CAŁĄ instalację SW (razem
     z offline i pushem). Brak powłoki = zachowanie jak dotąd.
- **`STRONA_AWARYJNA`** — samodzielny HTML w SW (logo, komunikat, przycisk). Sama próbuje wrócić:
  **3 podejścia z rosnącą przerwą** (1,5 / 3 / 6 s, licznik w `sessionStorage`), potem zostaje przycisk.
  Bez licznika trwała awaria sieci dałaby nieskończoną pętlę przeładowań.
  ⚠️ **Strony awaryjnej NIGDY nie zapisujemy do cache** — wylądowałaby tam jako powłoka i apka
  startowałaby z niej przy każdym otwarciu. To ta sama pułapka co „zatruty cache" z 17.07.
- ✅ Zweryfikowane w Chromium REALNYM kodem strony awaryjnej: po poprawce nawigacja **udaje się**
  (adres docelowy, tytuł „Brif.up", widoczny komunikat i przycisk), licznik prób zatrzymuje się na 3.
  Kontrola normalnej ścieżki: apka wstaje, 50 kafli, `index.html` obecny w `brifup-cache-v94`,
  w konsoli tylko OneSignal (na localhoście nie ma konfiguracji push).
- ⚠️ **Świeżość powłoki bez zmian** — pilnują jej dalej stale-while-revalidate + `checkAppShellUpdate`
  (ETag). Precache dokłada tylko DOLNĄ granicę: zawsze jest co pokazać.
- ⚠️ **ZASADA: w `fetch`-handlerze SW każda gałąź musi kończyć się `Response`.** `respondWith` nie
  wybacza `undefined`/`null` — a skutek widzi użytkownik jako białą stronę bez żadnego komunikatu,
  więc jest to najgorsza możliwa awaria do zdiagnozowania ze zgłoszenia.

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

## Strony statyczne były SIEROTAMI — linkowanie wewnętrzne pod indeksację (2026-08-12) 🔴
Zgłoszenie właściciela (zrzut z Google dla „brifup com"): w wynikach jest sama strona główna,
żadnego artykułu — *„po tym updejcie co robiliśmy kilka dni wcześniej miały się pokazywać"*.
- 🔴 **Dowód, że to nie kwestia czekania, jest W SAMYM ZRZUCIE:** opis wyniku cytuje newsy
  z **24 lipca** („USA rozpoczynają nowe cła Sekcji 301 … 24 lipca"), a tytuł to nagłówek o Ormuzie.
  Czyli ostatni render strony głównej przez Googlebota jest sprzed ~3 tygodni — **zanim strony
  dzienne w ogóle powstały** (09.08). Nic, co wdrożyliśmy 09.08, nie mogło się tam pojawić.
- 🔴 **Druga, realna wada — zmierzony graf linków:** cała apka miała **JEDEN** crawlowalny
  `<a href>` (do `watki.html`). Do **42 stron `d/`** nie prowadził żaden link ze strony głównej,
  a do **64 stron sag `w/`** — **ani jeden link z całego serwisu**: `watki.html` renderuje sagi
  JS-em i nie linkuje do wersji statycznej, strony dnia też nie. Jedyną drogą był `sitemap.xml`.
  Strona-sierota jest crawlowana rzadko i rankowana nisko — a dotyczyło to akurat powierzchni
  opisanej w repo bota jako „pod SEO warta więcej niż strony dzienne".
- **Naprawa (linki, nie treść):** stopka `.brif-footer` w `index.html` (statyczny markup, nie JS)
  → `d/`, `w/`, `watki.html`; `d/index.html` linkuje do `w/` i `watki.html`; nowy **`w/index.html`**
  (bot) — spis żywych sag z tytułami i datą ostatniego etapu; `/w/` dopisane do `sitemap.xml`.
- ⚠️ Stopka jest **ukryta na desktopie** (`@media min-width:1024px`), bo feed ma tam własny
  przewijany panel. Zostaje w DOM, więc crawler ją widzi — Googlebot i tak indeksuje mobile-first.
- ⚠️ **Czego to NIE załatwia:** samo linkowanie nie każe Google przyjść. Najmocniejszy ruch to
  zgłoszenie `sitemap.xml` w Search Console + „Request indexing" — to po stronie właściciela,
  konta GSC nie ma w repo. Bez tego świeże adresy czekają na crawl tygodniami.
- 📊 Zweryfikowane renderem w Chromium: stopka jest w DOM z linkami `d/`, `w/`, `watki.html`,
  zawija się na szerokości telefonu (358 px → dwie linie), zero błędów JS.

## Google zaindeksował stan AWARYJNY — dane zastępcze nie wchodzą do metadanych (2026-08-13) 🔴
Zgłoszenie właściciela ze zrzutu wyników Google dla „brifup com" (*„może coś źle dodałem na tym
googlu wczoraj?"* — nie, to nasz bug). Pierwszy wynik wyszukiwarki brzmiał:
**„Nie udało się pobrać wieczornej dawki — sprawdź połączenie i odśwież."**, a w opisie stało
*„To dane zastępcze: aplikacja nie mogła pobrać pliku z newsami"*.
- 🔴 **Mechanizm:** Googlebot wyrenderował stronę w chwili, gdy pobranie `briefs.json` nie doszło do
  skutku, `loadDose` podstawiło `SAMPLE`, a `updatePageMeta` **lojalnie wpisało jego pierwszą pozycję
  do `document.title`** (`if (top?.text) document.title = …`). Struktura danych mówiła Google to samo:
  `ItemList` z komunikatem awarii jako `NewsArticle`, z opisem i datą publikacji.
- ⚠️ **Awaria pobrania jest CHWILOWA, a wpis w indeksie NIE JEST** — jeden nieudany render psuje wynik
  wyszukiwania na tygodnie. To jest asymetria, która uzasadnia tę poprawkę.
- **Naprawa: `daneZastepcze[dose]`** ustawiane w `loadDose` (SAMPLE **oraz** `PUSTA_DAWKA`) i w gałęzi
  `catch`. Przy takim stanie `updatePageMeta` zostawia statyczny `<title>` z HTML-a i **USUWA** blok
  JSON-LD, zamiast go nadpisywać.
- 🔴 **Flaga jest ZDEJMOWANA w `pollLiveUpdates`**, gdy dane wrócą — bez tego jedno nieudane pobranie
  przy starcie wyciszało metadane na CAŁĄ sesję, mimo że apka dawno pokazuje prawdziwą treść.
  (Znalezione przy sprawdzaniu ścieżki odzyskiwania, nie w recenzji kodu.)
- ⚠️ **Świadomie BEZ `noindex` przy awarii** — chwilowa wpadka renderu kazałaby Google wyrzucić stronę
  główną z indeksu, co jest dużo gorsze niż nijaki tytuł.
- ⚠️ **Kafel `SAMPLE` dalej się renderuje** — człowiek MUSI wiedzieć, że dane się nie pobrały. Zmiana
  dotyczy wyłącznie tego, co idzie do wyszukiwarek.
- 📊 Zweryfikowane w Chromium na trzech stanach, 0 błędów JS: (a) normalnie → tytuł = top story,
  JSON-LD z realnym nagłówkiem; (b) `briefs.json` → 404 → tytuł zostaje `BrifUp`, JSON-LD usunięty,
  kafel awaryjny widoczny; (c) sieć wraca w trakcie sesji → tytuł i JSON-LD wracają do realnych newsów.
- ⚠️ **Google poprawi wynik dopiero przy kolejnym crawlu.** Przyspiesza to wyłącznie „Request indexing"
  w Search Console — po stronie właściciela, konta GSC nie ma w repo.

## Deep-link „nie przewija do posta" — startowe re-rendery kasowały efekt routingu (2026-08-14) 🔴
Zgłoszenie właściciela: *„jak wysyłam komuś link, często nie przewija do posta, tylko dopiero jak
wejdę drugi raz"*. Stuby i routing były SPRAWNE — deep-link otwierał kartę i przewijał poprawnie,
a potem **własna apka to cofała**.
- 🔴 **Przyczyna:** przy starcie lecą równolegle `briefs.json`, `threads.json` i `quotes.json`, a dwa
  ostatnie miały w `.then()` GOŁY `renderDose` (żeby badge 🧵 i wykresy pojawiły się bez czekania na
  live-tick). Goły render buduje `#content` od zera przez `innerHTML`: karty wychodzą zwinięte
  (`aria-expanded="false"`), a podmiana treści **zeruje `scrollTop` kontenera**. Gdy trafił PO tym,
  jak `routeDoseHash`/`tryOpen` otworzył i przewinął — czytelnik lądował z powrotem na górze feedu.
- 📊 **Zmierzone w Chromium** (390 px, `threads`/`quotes` opóźnione o 3,5 s = zimne pierwsze wejście):
  t=1,5 s scroll 3902 px + karta otwarta → t=4,5 s (dojechał threads.json) **scroll 0 + karta
  zwinięta**. Kontrola bez opóźnienia: scroll stoi całe 10 s.
- 🔴 **Dlaczego „drugi raz działa": to WYŚCIG, nie brak funkcji.** Przy zimnym wejściu gotowce
  dojeżdżają po scrollu deep-linka; przy drugim wejściu (rozgrzane łącze, powłoka z SW) rozstrzygają
  się ZANIM łańcuch `tryOpen` (150 ms + otwarcie + 160 ms) skończy — finalny scroll przeżywa.
  Stąd „często", nie „zawsze". Ta sama klasa co `pollLiveUpdates`, który przy live-ticku ŚWIADOMIE
  zachowuje scroll — startowe re-rendery nigdy tej ochrony nie dostały.
- **Naprawa — `renderDoseZachowujacWidok()`** (oba startowe `.then()`): przed renderem zapamiętuje
  otwarte karty, filtr tematu i scroll obu paneli; po renderze przywraca (kolejność jak
  w `pollLiveUpdates`: najpierw filtr, scroll na końcu). Do tego **kotwiczenie**: badge 🧵 dokładane
  przez re-render zmieniają wysokość treści NAD postem, więc sam `scrollTop` nie wystarcza (post
  zjeżdżał ~350 px, zmierzone) — scroll jest dosuwany o przesunięcie OSTATNIEJ otwartej karty.
- 🔴 **Otwarte karty wracają PO ID ELEMENTU — poprawne WYŁĄCZNIE tu**, bo helper renderuje TEN SAM
  obiekt `cache[dose]` (id-ki stabilne). `pollLiveUpdates` nadaje itemom NOWE id (`uid()`) i ma
  własne zachowanie widoku — **nie używać tego helpera w ścieżce live-ticku** (znana zasada:
  nie kluczuj po wartości nadawanej przy renderze; tu render jest ten sam, więc wolno).
- 📊 Zweryfikowane w Chromium po naprawie: zimne wejście — po dojechaniu gotowców karta otwarta,
  post przypięty co do piksela (108 px, scroll dosunięty 3902→4247); szybkie wejście bez zmian;
  zwykłe wejście bez hasha — scroll 0, 19 badge'ów sag dojechało, nic samo się nie otworzyło,
  0 błędów JS. SW → v121.
- ⚠️ Drugie znalezisko przy okazji (NIE naprawiane): mobilna gałąź `tryOpen` ma `if (!el) return`
  bez ponowienia — gdy element nie zdążył powstać w DOM, routing poddaje się po cichu. W praktyce
  cache i render są w tym samym bloku synchronicznym, więc nie zaobserwowano; gdyby objaw wrócił
  mimo tej naprawy, zacznij tam.

## Etap sagi ROZSUWA SKRÓT zamiast wyrzucać do innego newsa (2026-08-12) 🔴
Dwa zgłoszenia właściciela tego samego dnia okazały się jedną sprawą:
*„po kliknięciu w dany wątek przeskakuje czerwone kółko np. z 6 na 2"* oraz *„a także ma się opis
rozwijać"* (dla OBU list: legendy „Sagi na wykresie" i osi „Wątek tematu").
- 🔴 **Przyczyna skaczącej kropki:** wiersz legendy był `<a href>` do INNEGO newsa. Tap przełączał
  całą kartę, wykres stawał się wykresem tamtego artykułu, a czerwona kropka — która znaczy
  **„ten news"**, nie „najnowszy" — siadała na jego etapie. Do tego numery są liczone **per wykres**,
  po etapach mających dany instrument we własnym `chart` (w sadze o Ormuzie: 10 z 29 węzłów na BRENT,
  reszta na USDPLN/XAU albo bez wykresu), więc ten sam etap bywa raz „5", a raz zupełnie czym innym.
- **Naprawa: `sagaToggleSkrot` + `sagaSkrotHtml`** — tap rozsuwa skrót W MIEJSCU, a wyjście do newsa
  zostaje linkiem „Otwórz news →" WEWNĄTRZ bloku. Nigdzie nie nawigujemy, więc nic nie przeskakuje.
  Mechanika 1:1 jak `exToggle` na `watki.html` i `<details>` na stronach sag — łącznie z pułapką
  kotwicy klastra (podpozycja, której NIE MA na osi jako osobny etap).
- **Wiersze osi „Wątek tematu" też są klikalne** — do 12.08 były martwym tekstem (ani linku, ani
  rozwijania). `data-ni` to indeks w ORYGINALNEJ tablicy `t.nodes` (od najstarszego); lista jest
  odwracana wyłącznie na potrzeby wyświetlania.
- 🔴 **LEGENDA WYKRESU TEŻ OD NAJNOWSZEGO** (życzenie: „w sadze ma też być kolejność najnowsze od
  góry"). **NUMERY zostają chronologiczne**, bo przywiązują wiersz do KROPKI, a oś czasu biegnie
  w lewo→prawo i odwrócić się jej nie da — lista czyta się więc `5 → 1` w dół i to jest zamierzone:
  najnowszy etap jest zarazem najwyżej i najbardziej na prawo. W grupie (kilka etapów tej samej
  sesji) też najnowszy pierwszy, kolejne z „↳".
- 🔴 **KROPKA IDZIE ZA KLIKNIĘTYM ETAPEM** (doprecyzowanie właściciela: „po kliknięciu w dany tytuł
  kropka powinna się przesuwać w zależności gdzie klikniesz"). Domyślnie czerwona jest kropka
  BIEŻĄCEGO newsa (`.on`); wybór wiersza przenosi podświetlenie na jego kropkę (`.sel`), a zwinięcie
  przywraca stan wyjściowy. To warstwa WYŁĄCZNIE wizualna — nadal nigdzie nie nawigujemy, więc nie
  wraca „przeskakuje z 6 na 2" (tamto brało się z przełączania całej karty).
  ⚠️ Wiersz odnajduje swoją kropkę po `data-nis` (indeksy węzłów grupy w `t.nodes`), bo JEDNA kropka
  bywa wspólna dla kilku etapów tej samej sesji. Etap spoza wykresu (inny instrument, sprzed okna)
  kropki nie ma — wtedy nic nie podświetlamy, zamiast wskazywać nie ten punkt.
  ⚠️ Reguły odsuwające „ten news" wiszą na `.sr-box.ma-wybor`, więc **wygląd DOMYŚLNY jest nietknięty**;
  dopiero przy wyborze bieżąca kropka schodzi do obwódki, żeby nie było dwóch czerwonych plam.
  ⚠️ `r` to atrybut SVG, nie własność CSS — rozmiar ustawiamy przez `setAttribute`.
  ⚠️ **Jeden rozwinięty etap naraz** (akordeon w obrębie karty): przy kilku otwartych kropka
  pokazywałaby ostatnio kliknięty i wykres przestałby odpowiadać na pytanie „gdzie jestem".
- 🔴 **PODETAPY JEDNEJ SESJI SĄ SCHOWANE** (życzenie właściciela: „te podkategorie mają być schowane,
  dopiero po kliknięciu np. w wątek nr 2 się rozwijają"). Jedna kropka bywa wspólna dla kilku etapów
  (weekend spada na piątkowe zamknięcie) i cztery wiersze jednej sesji rozpychały listę tak, że numery
  ginęły w ścianie tekstu. Widać tylko wiersz-głowę z licznikiem **`+N`** przy numerze; klik wysuwa
  resztę (`.sr-podetapy`) RAZEM z rozwinięciem skrótu głowy.
  ⚠️ Licznik `+N` jest warunkiem odkrywalności — bez niego schowana treść nie istnieje dla czytelnika.
  ⚠️ `.sr-podetapy` ma własne `display:flex`, więc potrzebuje JAWNEGO `[hidden]{display:none}` —
  dokładnie ta sama pułapka co przy `.sr-legenda`.
  ⚠️ Zwinięcie grupy zamyka też opisy jej podetapów: inaczej po ponownym rozwinięciu wyglądałoby to
  na przypadkowo otwarty wiersz.
- ⚠️ **Skąd brać treść skrótu:** `SAGA_ART` indeksuje bieżące dawki ORAZ doczytywane dni archiwum.
  Dwie pułapki, obie zmierzone i obie obsłużone:
  (a) `fetchFromBriefsJson` indeksuje **WSZYSTKIE dzisiejsze dawki**, nie tylko ładowaną — plik i tak
      jest sparsowany, więc to zero dodatkowej sieci; bez tego 3 z 6 etapów pokazywały „Pełna treść
      w wydaniu z tego dnia", bo dzisiejszego dnia nie ma jeszcze w `archive/`;
  (b) data etapu pochodzi z `published_at` (czas ŹRÓDŁA), a news leży w archiwum dnia NASZEJ
      publikacji → przy pudle sięgamy po dzień **±1** (na stronach sag ta sama klasa to 18 z 68 braków).
- 📊 Zweryfikowane w Chromium na produkcyjnych danych: 10 rozwiniętych wierszy w obu listach,
  **2 z fallbackiem** (etapy, których tytuł przepisano po publikacji — znana klasa), **0 błędów JS**;
  kolejność legendy `5, 4, ↳, ↳, ↳, 3, 2, 1` przy datach `12.08 → 06.08`.

## ↻ = odśwież **i wróć na początek** — `wrocNaPoczatekWidoku` (2026-08-13)
Zgłoszenie właściciela: *„przycisk odświeżyć w prawym górnym rogu zawsze cofa użytkownika do top story
na początku aktualnej dawki, nawet jak jesteśmy przy wątkach"* — decyzja: tak ma być, ↻ jest przyciskiem
„do góry", a nie zachowaniem pozycji.
- 🔴 **Dotąd robił to POŁOWICZNIE i właśnie ta połowa myliła.** Zmierzone w Chromium (390 px, panel
  wątków otwarty): `scrollTop` szedł **1341 → 0, ale panel ZOSTAWAŁ otwarty**. Panel leży NAD feedem
  i sortuje sagi **rosnąco**, więc pozycja 0 to jego góra, czyli **NAJSTARSZY wątek** — czytelnik
  lądował kilka ekranów nad feedem, w najstarszej sadze, zamiast na top story.
- **To ten sam wniosek, który stoi przy `logoDoAktualnejDawki` od 01.08** („bez tego płynny scroll do
  zera zostawiałby czytelnika NAD najstarszym wątkiem") — przycisk ↻ po prostu nigdy go nie dostał.
  Stąd wspólny `wrocNaPoczatekWidoku()` (zamknij panel + przewiń `.scroll-area`, `#dtFeedList`,
  `#dtDetail`), używany przez OBA wejścia; logo straciło własną kopię tych czterech linii.
- ⚠️ **`dtCurrentItemId = null` MUSI stać PRZED `loadDose`** — `renderDesktop` otwiera top story tylko
  przy pustym `dtCurrentItemId`, więc zerowanie po renderze byłoby spóźnione o cały render.
- ⚠️ **To ŚWIADOME odstępstwo od zasady „panel szczegółów na PC zostaje"** — tamta reguła dotyczy
  zmiany dawki i live-ticku (czytelnik nie prosił o ruch). ↻ to jawne kliknięcie „odśwież", więc
  zachowuje się jak logo. Gdyby na desktopie miało jednak zostawiać otwarty artykuł — wystarczy nie
  zerować `dtCurrentItemId` w `refresh()`, reszta zostaje.
- 📊 Zweryfikowane w Chromium, **trzy warianty, 0 błędów JS**: (a) panel wątków otwarty → panel
  zamknięty, `scrollTop` 0, hero na `y=130` (stan identyczny jak po świeżym wejściu); (b) mobilny feed
  przewinięty na 2958 → 0; (c) desktop — otwarty inny artykuł wraca do top story, `#dtFeedList` na 0.

## Flagi krajów na Windowsie — font Twemoji ładowany WARUNKOWO (2026-08-15) 🔴
Zgłoszenie właściciela: *„na Windowsie jak wchodzę to flag nie widać, tylko «PL»"*.
**To nie był błąd w naszym kodzie.** Flaga w emoji to PARA wskaźników regionalnych
(🇵🇱 = U+1F1F5 U+1F1F1), którą font ma skleić w jeden glif — Segoe UI Emoji tego glifu
NIE MA, więc Chrome i Edge na Windowsie rysują dwie literki w ramkach. Pole `flag` jest
w KAŻDEJ pozycji `briefs.json`, więc dotyczyło to całego feedu.
- ⚠️ **Firefox na Windowsie wozi własne Twemoji i flagi POKAZUJE** — sprawdzając w nim
  NIE zobaczysz objawu. Na macOS, Androidzie i iOS objawu nie ma w ogóle.
- **Lek: `fonts/TwemojiCountryFlags.woff2`** (Twemoji Mozilla, COLR/CPAL, 261 par flag,
  78 KB, CC BY 4.0 — licencja w `fonts/FLAGI-LICENCJA.txt`, atrybucja w stopce `index.html`
  z `rel="nofollow"`, bo stopka powstała pod linkowanie WEWNĘTRZNE).
- 🔴 **DWA ZABEZPIECZENIA, ŻEBY NIE PŁACIŁ ZA TO KAŻDY CZYTELNIK** — to repo raz już
  odchudzało wejście z 1,63 MB do 0,34 MB i nie dokładamy 78 KB komuś, kto flagi widzi:
  1. `@font-face` wstrzykiwany WYŁĄCZNIE po wykryciu, że system flag nie rysuje — na Macu,
     Androidzie i iOS nie powstaje nawet deklaracja, więc nie ma czego pobierać;
  2. `unicode-range: U+1F1E6-1F1FF` — font obsługuje TYLKO wskaźniki regionalne. Reszta pola
     `flag` (🚨 🌍 🛢 📰) idzie dalej z fontu systemowego, a teksty z DM Serif / Inter.
     Dlatego wolno go dopisać do stosu `body`.
- ⚠️ **WYKRYWANIE PO SZEROKOŚCI GLIFU, NIE po `navigator.platform`.** Sniffing systemu
  skłamałby w OBIE strony: Firefox na Windowsie flagi ma, a kolejne wydania Windowsa mogą
  je kiedyś dostać. Mierzymy SKUTEK — czy shaper SKLEJA parę wskaźników w jeden glif.
- 🔴 **PIERWSZA WERSJA TESTU BYŁA MARTWA — zwracała „system ma flagi" NA KAŻDYM systemie,
  więc font nie był wstrzykiwany nigdy (naprawione 2026-08-18).** Zgłoszenie właściciela
  *„flagi wciąż nie działają na windowsie"* przyszło **trzy dni po wdrożeniu poprawki**, a poprawka
  po prostu nie miała jak się odpalić. Stary test porównywał PARĘ z POJEDYNCZYM wskaźnikiem
  i zakładał, że dwie literki w ramkach są ~2× szersze niż jedna. 📊 Zmierzone w Chromium bez fontu
  emoji (czyli w stanie, w jakim jest Windows): **para 39,9 px, pojedynczy 28,3 px → 1,41**, przy
  progu **1,5**. Warunek `para < jeden * 1.5` wychodził PRAWDZIWY także tam, gdzie flag nie ma.
  Założenie „×2" było błędne, bo pojedynczy wskaźnik ma własne boczne marginesy i nie jest połową
  pary — porównanie DWÓCH znaków z JEDNYM mierzy metryki fontu zastępczego, nie sklejanie.
  **Teraz pytamy wprost o sklejanie:** para tworząca flagę (🇵🇱) kontra para, która flagi NIE tworzy
  (🇿🇿 — kod zarezerwowany, nie ma go w żadnym foncie). Oba napisy mają tę samą długość, więc różnica
  bierze się wyłącznie z ligatury. 📊 **Bez flag 39,9/39,9 = 1,00; z Twemoji 32/64 = 0,50** — próg
  **0,9** stoi w bezpiecznej odległości od obu, a separacja jest DWUKROTNA zamiast 6-procentowej.
  ⚠️ **Nie wracaj do porównania „para vs pojedynczy znak"** — to jest dokładnie ten pomiar, który
  zawiódł, i zawiódł CICHO: bez błędu, bez śladu w konsoli, przy poprawnym foncie i poprawnym CSS.
  ⚠️ **`?flagi=on` działało przez cały czas**, więc podgląd wyglądał na dowód, że wszystko gra —
  weryfikując taką bramkę, sprawdzaj ŚCIEŻKĘ AUTOMATYCZNĄ, nie przełącznik.
  ✅ Zweryfikowane w Chromium (390 px, przeglądarka bez fontu flag = odpowiednik Windowsa),
  3 warianty, 0 błędów JS: bez parametru → `@font-face` wstrzyknięty, woff2 **200**, stosunek
  w realnym stosie elementu **0,50** (flaga sklejona); `?flagi=on` → to samo; `?flagi=off` → brak
  wstrzyknięcia, **woff2 w ogóle nie pobrany**, stosunek 1,00.
- ⚠️ **Świadomie `measureText`, a NIE `getImageData`** (test na kolor): rozszerzenia
  anty-fingerprintingowe zaszumiają odczyt pikseli i test koloru zacząłby kłamać.
- **FAIL-SAFE W STRONĘ „NIC NIE RÓB":** każdy wyjątek i każdy dziwny pomiar = zostawiamy
  stan obecny. Najgorsze, co się stanie, to że Windows dalej pokazuje „PL" — czyli dokładnie
  to, co było. Odwrotny fail-safe kazałby pobierać font ludziom, którzy go nie potrzebują.
- **PRZEŁĄCZNIKI DO PODGLĄDU** (bo na Macu objawu nie da się zobaczyć):
  `brifup.com/?flagi=on` wymusza font, `?flagi=off` wyłącza nawet tam, gdzie wykrywanie go chce.
- **Wpięte w CZTERY strony:** `index.html`, `watki.html`, `fala.html`, `knaga.html`.
- ⚠️ **`flagi.js` JEST w `STATIC_ASSETS` service-workera, a font CELOWO NIE.** Wpisanie
  woff2 do precache kazałoby ściągnąć 78 KB KAŻDEMU — także na telefonie, gdzie flagi
  działają. Gdy jest realnie potrzebny, trafia do cache zwykłą gałęzią „pozostałe statyczne".

## Etapy sagi PO KOŃCU SERII idą za kreskowaną luką (2026-08-18) 🔴
Zgłoszenie właściciela ze zrzutu sagi „Polityka Fed a dane z rynku pracy": *„zobacz gdzie jest «1»
na grafice, a kiedy była dodana ta jedynka jako post — nie zgadza się z grafiką"*. Kropka **1**
(13.08) stała tuż obok kropki **2** (18.08), jakby dzieliła je jedna sesja.
- 🔴 **Przyczyna nie leżała w numeracji ani w danych sagi — daty w legendzie były poprawne.**
  `doIndeksu` miało zabezpieczenie na etap ZA STARY (`-1` → licznik „sprzed okna wykresu"), a na
  etap za NOWY **żadnego**: wszystko po ostatniej sesji siadało na ostatnim punkcie. Seria SP500
  stała wtedy na **14.08**, więc etapy z 14, 16 i 18.08 zlały się w jedną kropkę („2 +3"),
  a 13.08 wylądowało slot obok. Wykres mówił „jedna sesja odstępu", legenda „pięć dni".
- **Naprawa jest w SKALI OSI, nie w danych:** `maxSlot` liczy się z najdalszego etapu, nie z długości
  serii. Etap po końcu serii dostaje `IDX_KONCA + sesjiPo(ostatnia_sesja, data_etapu)`, linia ceny
  ściska się w lewo, a odcinek bez notowań idzie **kreskowany** (`stroke-dasharray`, bez wypełnienia
  pod spodem — inaczej wyglądałby jak płaski kurs, a nie jak brak danych).
- ⚠️ **`ext === 0` ZOSTAJE na ostatniej sesji i to jest poprawne** — news z soboty ma siedzieć na
  piątkowym zamknięciu, bo wcześniej rynek nie miał jak zareagować. Bariera dotyczy wyłącznie
  etapów oddzielonych od serii realnymi SESJAMI, nie kalendarzem.
- ⚠️ **Świąt giełdowych nie znamy** — dzień wolny liczy się jak sesja i najwyżej odsuwa kropkę o slot
  za daleko. Przesada w stronę „widać lukę" jest bezpieczniejsza niż w stronę „luki nie widać".
- **Powyżej `EXT_MAX = 5` sesji kropki NIE MA** — etap idzie do stopki („+ N etapów po ostatniej
  sesji wykresu (DD.MM) — brak notowań z tych dni"). Doklejanie pół wykresu kreskowanej pustki byłoby
  gorsze niż uczciwy licznik, a przy takiej dziurze problemem jest źródło notowań, nie rysowanie.
- 🔴 **Nagłówek pokazuje wtedy `do DD.MM` ZAMIAST liczby sesji, nie obok niej.** `.sr-sym` ma
  `nowrap` + `text-overflow: ellipsis`, więc czwarty człon ucinał się na „do 14.…" i cała informacja
  przepadała (złapane na zrzucie z podglądu, przed wdrożeniem). „do 14.08" ma tyle samo znaków co
  „30 sesji". Długość okna jest tu ozdobą, data końca serii — nie.
- **To jest bariera, nie naprawa danych.** Świeżość notowań pilnuje osobno czujka
  (`brifup-kontrola`, klasa `wykres-serii-przestarzaly`); przyczyna po stronie bota — Yahoo oddaje
  **HTTP 429 całemu IP Hetznera** dla indeksów USA — zostaje otwarta.

## Flagi na Windowsie, tura trzecia — panel `?flagi=diag` i odwrócony fail-safe (2026-08-19) 🔴
Zgłoszenie właściciela: *„flagi wciąż na windowsie nie działają"*, doprecyzowane: **Microsoft Edge**.
To TRZECIA tura tej samej naprawy (15.08 zły próg, 18.08 martwy test) — i pierwsza, w której
**cały mechanizm okazał się sprawny**, a mimo to objaw został.
- ✅ **Sprawdzone i WYKLUCZONE po kolei** (żeby następna sesja tego nie powtarzała):
  `main` ma poprawiony `flagi.js` (próg 0,9, `PARA_BEZ_FLAGI`) — potwierdzone przez API GitHuba,
  nie przez lokalny klon (jest płytki, `git log` pokazuje jeden commit i myli); `index.html` na
  `main` ma tag `<script defer src="flagi.js">`; `fonts/` NIE jest w `exclude` w `_config.yml`;
  SW ma `flagi.js` w `STATIC_ASSETS` i wymusza `cache:'reload'` dla `.js`, więc **nie serwuje
  starej wersji**; sam plik fontu jest poprawny — `wOF2`, COLR/CPAL, **261 ligatur flag**,
  cmap 37 znaków (zweryfikowane `fontTools`).
- ✅ **Mechanizm działa END-TO-END** w Chromium bez systemowego fontu flag (czyli w stanie, w jakim
  jest Windows): detekcja zwraca stosunek **1,000** → wstrzykuje styl → font się pobiera →
  **kafel renderuje prawdziwą, kolorową flagę** (zrzut elementu, nie tylko `font-family`).
- 🔴 **Czego NIE DA SIĘ tu rozstrzygnąć:** sandbox nie ma dostępu do `brifup.com` (egress blokuje
  curl i WebFetch), a Windowsa nie ma jak odtworzyć. Dwie poprzednie tury poszły „na ślepo"
  i obie padły — więc zamiast trzeciego strzału powstał **panel diagnostyczny**.

### `?flagi=diag` — jeden zrzut zamiast kolejnej tury zgadywania
Panel pokazuje DOKŁADNIE liczby, na których zapada decyzja, plus dwa fakty niewidoczne z zewnątrz.
Rozdziela trzy przyczyny, których inaczej nie odróżnimy:
| co widać w panelu | przyczyna |
|---|---|
| `stosunek < 0,9`, werdykt „system MA flagi" | wina **detekcji** |
| `styl wstrzyknięty: TAK`, `font DZIAŁA: NIE` | wina **dostarczenia** (404 / blokada / MIME) |
| oba TAK, a kafle dalej „PL" | wina **CSS** (reguła nie dociera do elementu) |
Do tego próbka 🇵🇱🇺🇸🇺🇦🇮🇱 renderowana wprost w rodzinie Twemoji.

### 🔴 TRZY ŚLEPE ULICZKI W SAMEJ DIAGNOSTYCE — wszystkie kłamały „NIE" przy DZIAŁAJĄCYM foncie
Każda wyglądała rozsądnie i każda wysłałaby następną sesję w złą stronę. Nie odgrzewaj ich:
1. **`document.fonts.check()`** — przy `unicode-range` zwraca `false`, choć font rysuje flagi.
2. **`canvas.measureText` z rodziną webfontu** — canvas 2D **nie stosuje `unicode-range`**,
   więc mierzy font zastępczy. (Dlatego detekcja w canvasie mierzy tylko font SYSTEMOWY — i to
   akurat jest poprawne, bo o niego właśnie pyta.)
3. **`document.fonts.ready`** — rozwiązuje się NATYCHMIAST, bo font jest ładowany LENIWIE, a panel
   powstaje zanim feed wyrenderuje pierwszą flagę: nic nie jest „pending", więc nie ma na co czekać.
   Trzeba **`document.fonts.load()`**, który żąda go wprost.
📊 Zweryfikowane pomiarem w DOM: `🇵🇱 32 px` wobec `🇿🇿 64 px` (stosunek 0,50) — DOM mierzy dobrze,
canvas nie. **ZASADA: diagnostyka, która kłamie, jest gorsza od jej braku** — to dokładnie ta klasa
błędu, przez którą ta poprawka stoi tu trzeci raz.

### 🔴 FAIL-SAFE ODWRÓCONY — najważniejsza zmiana tej tury
Dotąd każdy nieudany albo dziwny pomiar zwracał „system ma flagi", czyli **nie wstrzykiwał fontu**.
Uzasadnienie („nie każmy nikomu pobierać 78 KB") jest dalej prawdziwe, ale skutek jest taki, że
**każda usterka pomiaru wyłącza całą poprawkę CICHO i NA ZAWSZE** — i tak padła dwa razy, bez błędu
i bez śladu w konsoli. Teraz wstrzykujemy font, **dopóki nie ma DOWODU ligatury**.
- ⚠️ Koszt jest asymetryczny i dlatego tak: „ktoś pobiera 78 KB bez potrzeby" jest odwracalne
  i niewidoczne, „cały Windows nie widzi flag" jest widoczne i trwałe.
- ⚠️ Systemy, które flagi MAJĄ, mierzą ~0,50 i dalej nic nie pobierają — odwrócenie dotyczy
  WYŁĄCZNIE przypadków nierozstrzygniętych.
- **Pomiar przeniesiony z `sans-serif` na stos `body`** — flagi dziedziczą font po `body`, więc
  dotąd pytaliśmy o INNY font niż ten, którym strona realnie rysuje. W sandboxie oba dają ten sam
  wynik, więc tej hipotezy NIE dało się tu potwierdzić; zmiana jest darmowa i usuwa jedną z
  ostatnich różnic wobec produkcji.
- `PROG_LIGATURY` + `maFlagi(p)` = jedno źródło prawdy, żeby panel nie mógł pokazać innej liczby
  niż ta, na której zapadła decyzja.

⚠️ **Strony `d/*.html` i `w/*.html` generuje BOT i nadal NIE MAJĄ tego skryptu** — jeśli objaw
widać właśnie tam, naprawa jest po stronie `Runner.cs`, nie tutaj.
✅ Zweryfikowane w Chromium, 4 ścieżki, 0 błędów JS: auto → wstrzykuje + pobiera font,
`?flagi=on` → to samo, `?flagi=off` → brak wstrzyknięcia i **woff2 w ogóle nie pobrany**,
`?flagi=diag` → panel z prawdziwymi wartościami we wszystkich wierszach. SW → v128.

## Karty OG: większa czcionka + bramka wysokości na kadr 630 (2026-08-19) 🔴
Życzenie właściciela ze zrzutu karty wątku: *„możesz trochę większą czcionką to zrobić? i żeby wciąż
wszystko się mieściło?"*. Podniesione **w OBU kartach naraz** (wątku i klastra — idą w tej samej nitce
na X i mają wyglądać jak jedna rodzina):

| element | przed | po |
|---|---|---|
| tytuł | 38 | **44** |
| tekst etapu / pozycji | 23 | **27** |
| logo | 40 | **44** |
| kicker | 15 | **16** |
| data etapu | 13 | **14** |

### 🔴 Powiększenie ROZBIŁO BY kartę 630 — stąd `ileWezlowNa630`
Karta `w=1` (ta ze zrzutu) ma **SZTYWNE 630 px**; dynamiczną wysokość ma dopiero wariant `pelna=1`.
📊 Zmierzone realnym renderem: przy 27 px cztery etapy po pełnym limicie 118 znaków potrzebują
**655 px**, czyli 25 px więcej niż kadr — a `overflow: hidden` uciąłby czwarty etap **bez żadnego
sygnału**. Dokładnie ta wpadka zdarzyła się już raz (pierwsze podejście 46/25 px).
**Naprawa wzorcem, który już istniał dla kwadratu: zdejmujemy NAJSTARSZY etap, aż się mieści.**
Lepiej pokazać 3 etapy z pełnym tekstem niż 4 z przeciętym — nagłówek i tak mówi „OSTATNIE N Z M".
⚠️ Typowy etap zajmuje jedną linię, więc realnie prawie zawsze wchodzą wszystkie cztery.
✅ Zmierzone na trzech scenariuszach w kadrze 630: realna karta ze zgłoszenia **4 etapy**, wszystkie
krótkie **4**, skrajny (4 × 118 znaków) **3** — w żadnym nic nie wychodzi poza kadr.

### 🔴 Model wysokości ZANIŻAŁ i to była istniejąca, nieujawniona wada
Stary `SZKIELET 224, LINIA 28, NA_LINIE 62` dla 12 długich etapów liczył **1267 px**, a satori rysował
**1324** — czyli karta kwadratowa przy długich sagach już wcześniej mogła ciąć treść dolną krawędzią.
Nowy model **wyprowadzony z renderu, nie z arytmetyki**: `SZKIELET 243, STALA 37, LINIA 33, NA_LINIE 76`,
wzór `card = SZKIELET + Σ(STALA + LINIA × linie)`. Trafia **co do piksela** na 1, 4 i 12 etapach.
⚠️ `STALA` zawiera też odstęp między wierszami — forma jest zweryfikowana JAKO CAŁOŚĆ, więc nie
„porządkuj" jej, rozbijając margines na osobny składnik, bez ponownego pomiaru. Właśnie tak powstał
poprzedni, zaniżający model.
⚠️ `NA_LINIE 76` jest CELOWO zachowawcze — realne łamanie przy 27 px wypada między 80 a 90 znakami
(zmierzone). Zaniżenie znaków na linię zawyża liczbę linii, czyli **zawyża wysokość** — czyli myli się
w stronę bezpieczną (biały pas), nie w stronę cięcia treści.

### Czego pomiar NIE kazał ruszać
- **Limit `tnij` 118 znaków ZOSTAJE** — sprawdzone, że przy 27 px (a nawet 28) tekst dalej mieści się
  w dwóch liniach. Obniżenie limitu przywróciłoby urywanie w pół zdania, na które właściciel już raz
  się skarżył (dlatego limit podniesiono ze 104).
- **Tytuł przy 44 px nie zawija się** nawet przy pełnym limicie 54 znaków — zmierzone na długościach
  30/40/45/50/54. Gdyby zawinął, dołożyłby ~49 px poza model.

### 🔬 Jak to zmierzyć ponownie
Sandbox nie ma Deno, ale **satori i resvg da się uruchomić z npm w Node** i wyrenderować kartę tym samym
kodem: `npm i satori @resvg/resvg-js`, render na kadrze 3000 px, potem skan pikseli (Pillow) po ostatnim
wierszu ciemniejszym niż 245 → to jest realna dolna krawędź treści. **Nie szacuj arytmetyką — ten plik
ma już dwa modele wyprowadzone „na oko" i oba zaniżały.**

⚠️ **DEPLOY NIE IDZIE PRZEZ GIT:** `supabase functions deploy og --no-verify-jwt --project-ref utmvokfjvrthvcmxzowc`.
Do czasu wdrożenia karty wyglądają jak dotąd. Zmiana JEST w repo — i musi tam być, patrz ostrzeżenie
„wygląd trzymany tylko na serwerze NIE ISTNIEJE".
