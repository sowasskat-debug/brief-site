# CLAUDE.md — brief-site (Brif.up / brifup.com)

Statyczna strona + PWA z newsami finansowo-polityczno-gospodarczymi po polsku.
Czysty HTML/CSS/JS (bez frameworka, bez builda). Dane generuje osobny bot
(repo `financialnewsbot`) i zapisuje jako `briefs.json`.

## Deploy / hosting
- **GitHub Pages** (domena `brifup.com` przez Cloudflare CDN). Serwowane z gałęzi `main`.
- **Deploy = commit do `main`.** Brak builda. `index.html` ładuje się network-first,
  więc zmiany widać od razu przy następnym otwarciu.
- `briefs.json` bywa zapisywany **równolegle przez bota** → zawsze
  `git pull --rebase origin main` przed `git push`. Trzymać poprawny JSON.

## Pliki
- `index.html` — cała apka: HTML + **inline CSS-in-<style>? nie** (CSS w `styles.css`) + **inline JS**. Duży (~114 KB).
- `styles.css` — style (mobile + desktop). Motyw jasny/ciemny przez `:root[data-theme=...]`.
- `fala.html` — **"Flusso"**, osobna strona-mozaika trend-style. Czyta ten sam `briefs.json`,
  ale własny, niezależny render (nie dotyka `index.html`/`styles.css`). Patrz sekcja niżej.
- `admin.html` — panel admina (osobny, token GitHub w sessionStorage).
- `service-worker.js` — PWA cache + import OneSignal SDK.
- `briefs.json` — bieżące dane (patrz niżej). `archive/*.json` — archiwum dzienne (jeden plik na dzień,
  ta sama struktura dawek; `archive/index.json` = lista dostępnych dat). `rejected.json` — ręcznie odrzucone (uczy filtr bota).
- `trending.json` — **NOWY, osobny strumień "Flusso Trends"** (sport/rozrywka/świat/ciekawostki z Google Trends +
  trends24.in). Pisany przez bota (`UpdateTrendingOnSite`), NIEZALEŻNY od `briefs.json`. Kształt: `{ "date", "items":[…] }`,
  item = `flag, text, article, category, source_name, source_url, added_at, image_url, reach`. ⚠️ Front Flusso jeszcze
  go NIE czyta (czyta `briefs.json`) — podpięcie to następny krok. Patrz `financialnewsbot/CLAUDE.md` sekcja "Flusso Trends".
  - **`rejected.json` = warstwa PRZYKŁADÓW (few-shot):** bot czyta **tylko ostatnie 40 wpisów** jako REGUŁA 0, więc świeże odrzucenia wypierają stare. Dobre do „naucz filtr TEGO konkretnego newsa". **Trwałe kategorie** (np. „odrzucaj promo bankowe", „fixingi CB bez wpływu na EUR/PLN") NIE tu — idą do stałej `WSPOLNE_ODRZUCENIA` w bocie (repo `financialnewsbot`), inaczej po ~40 nowych odrzuceniach wzorzec wypadnie z okna. Kształt wpisu: `{ "text", "flag", "reason"? }` (pole `reason` opcjonalne — bot dokleja je jako „[powód: …]").
- `manifest.json`, ikony, `og-image.png`, `CNAME`, `robots.txt`, `sitemap.xml`.

## Kształt danych (`briefs.json`)
```
{ "morning"|"afternoon"|"evening"|"poczekalnia": { "date":"YYYY-MM-DD", "items":[ BriefItem ] } }
```
BriefItem (klucze małą literą): `text`, `flag`, `article`, `impact`, `source_name`,
`source_url`, `rssLink`, `added_at`, `image_url`, `subItems` (klaster = tablica BriefItem).
Pozycja `items[0]` = **top story** (bot ją tam ustawia).
**Sygnał "ile źródeł" = pole `reach`** (int, opcjonalne) — liczba różnych redakcji piszących o temacie
(`GoogleNewsReachPL` w bocie). ⚠️ NAZYWA SIĘ `reach`, NIE `coverage` — Flusso musi czytać `it.reach`
(historyczny błąd: front czytał nieistniejące `coverage`, naprawione 2026-07-11). Gdy brak → `fala.html` ma
fallback na pozycję w `items[]`.

## Architektura JS (kluczowe funkcje w index.html)
- **Ładowanie:** `loadDose(dose)` → `fetchFromBriefsJson` (z cache-busterem `?_=ts`)
  → fallback `fetchFromSupabase` (NIEskonfigurowany, placeholdery) → `SAMPLE`.
- **Render mobile:** `renderDose(dose,items)` → `#content`. Hero = `items[0]`, reszta niżej. Klastry rozwijane (`toggleGroup`/`toggleSubItem`).
- **Render desktop (≥1024px):** `renderDesktop` → `dtRenderFeed` (`#dtFeedList`) + `dtShowDetail` (`#dtDetail`, panel po prawej). Top story = `i===0` → klasa `.top-item` (styl „gazeta": kicker ★ TOP STORY + większy nagłówek).
- **Auto-odświeżanie na żywo:** `liveTick()` co 60 s — najpierw tania sonda `probeBriefsTag()` (HEAD, ETag/rozmiar), pełne dane `pollLiveUpdates()` **tylko gdy się zmieniło**. Zachowuje scroll + otwarty artykuł na PC.
- **Deep linki:** `#dawka/slug` i `#archive/data/dawka/slug` → otwierają news (mobile: toggle+scroll; desktop: `dtPickItem`). Slug = `itemSlug(text)`.
- **Panel szczegółów na PC** zostaje przy zmianie dawki (czyszczony tylko na starcie — `if(!dtCurrentItemId) dtShowEmpty()`).

## Helpery warte znać
- `displaySource(item)` — nazwa źródła; gdy brak `source_name`, pokazuje domenę z linku zamiast „—".
- `confirmCount(item)` / `srcBadge(item)` — badge „✓ N źródeł" (liczba różnych źródeł w klastrze). Styl stonowany; na telefonie w rogu kafelka (`.card-corner`).
- `impactHtml(item)` — linia „Wpływ na rynek" z kolorowaniem ↑/↓.
- `itemSlug`, `escAttr`, `NormalizujTekst`-brak (to bot).

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
