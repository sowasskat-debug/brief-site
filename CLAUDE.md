# CLAUDE.md — brief-site (Brif.up / brifup.com)

> 🔴 **Nowa sesja: przeczytaj NAJPIERW [`STAN.md`](STAN.md)** — co jest niedokończone,
> co zmierzone, w co nie wdepnąć drugi raz i jakich pomysłów nie odgrzewać.
> Ten plik opisuje jak działa to, co JUŻ zrobione; `STAN.md` mówi, od czego zacząć.

Statyczna strona + PWA z newsami finansowo-polityczno-gospodarczymi po polsku.
Czysty HTML/CSS/JS (bez frameworka, bez builda). Dane generuje osobny bot
(repo `financialnewsbot`) i zapisuje jako `briefs.json`.

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
- `supabase/functions/og/index.ts` — generator obrazka karty 1200×630 (nagłówek + poprzedni etap + pasek
  ciągłości sagi). Wołany WYŁĄCZNIE przez scrapery przy wysyłce linku. ⚠️ Deploy **musi** iść
  z `--no-verify-jwt` (scraper nie ma tokenu). FAIL-SAFE: każdy błąd = przekierowanie na `og-image.png`,
  karta nigdy nie zostaje bez obrazka. Wdrożenie i weryfikacja: `SETUP_SUPABASE.md`, sekcja 9.
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
- ⚠️ **Stopka „stan na …" jest OBOWIĄZKOWA** — dane są godzinne i opóźnione, nie live. Bez niej kafel sugeruje
  notowania w czasie rzeczywistym.
- ⚠️ **Szerokości w `.q-row`: jedynym elementem, który wolno ścisnąć, jest `.q-name`.** Pierwsza wersja miała
  sztywne `min-width` na cenie i zmianie — w panelu szczegółów na desktopie (~440 px) procent zmiany był
  wypychany poza `overflow:hidden` kontenera i ZNIKAŁ. Złapane na renderze realnej strony, nie w mockupie.
  Stąd układ `[.q-head] [.q-spark] [.q-vals]`, gdzie tylko `.q-head` ma `flex:1 1 auto; min-width:0`.
  Poniżej 460 px nazwa chowa się całkiem (zostawała z niej sama wielokropkowa końcówka).
- Wariant wizualny wybrany przez właściciela: **A (pasek gazetowy)**, nie ciemny kafel w stylu X.
- Źródła danych i ich granice — patrz `financialnewsbot/CLAUDE.md`, sekcja „Notowania".

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
- **Limit X = 280 znaków**, link liczy się jako 23 niezależnie od długości → budżet na tekst ~250.

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
