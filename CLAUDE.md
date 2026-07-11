# CLAUDE.md — brief-site (brifup.com)

Statyczny serwis (GitHub Pages, `CNAME` → `brifup.com`), bez build-stepu — czyste
HTML/CSS/JS. Dane produkuje `FinancialNewsBot` (osobne repo) przez GitHub Contents API,
co godzinę na produkcji (serwer Hetzner). **Merge do `main` w tym repo = od razu widoczne
na `brifup.com`** (Pages serwuje bezpośrednio z brancha).

## Pliki
- `index.html` + `styles.css` — główny czytnik brief'ów (poranek/popołudnie/wieczór),
  desktop od 1024px w kontenerze **max-width: 1600px** (`.dt-app`).
- `fala.html` — **"Flusso"**, osobna strona-mozaika trend-style (patrz niżej).
- `briefs.json` — źródło danych obu powyższych. Struktura: `{morning|afternoon|evening: {date, items[]}, poczekalnia: {...}}`.
  Item: `flag, text, article, impact, source_name, source_url, added_at, image_url, subItems, enrich_attempts`
  (`coverage` jeszcze nie istnieje — patrz `FinancialNewsBot/CLAUDE.md`).
- `archive/` — jeden JSON per dzień (`YYYY-MM-DD.json`, ta sama struktura dawek) + `index.json`
  (lista dostępnych dat, najstarsza→najnowsza). Obecnie ~7 dni wstecz.
- `rejected.json` — ręcznie odrzucone przykłady, czytane przez bota jako few-shot (nie edytować ręcznie bez potrzeby).
- `admin.html`, `service-worker.js`, `manifest.json` — panel/PWA, osobny temat.

## Flusso (`fala.html`) — jak działa
Cały kod w jednym pliku (inline `<style>`/`<script>`, bez zależności zewnętrznych poza
zdjęciami z `image_url`). Zbudowany, żeby działał na *obecnym* `briefs.json` bez czekania
na zmiany w bocie:
- **Dane:** `pickNewestDose()` wybiera najświeższą z morning/afternoon/evening po `date`+kolejności dawki.
  `flatten()` spłaszcza `items[]`, `subItems` trafiają jako `rel` (powiązane wątki w bottom sheet).
- **Wielkość kafla:** `weightOf()` — używa `coverage` **jeśli jest** w danych, inaczej fallback
  na pozycję w `items[]` (bot i tak układa top story na górze, więc ranking działa jako proxy).
  Gdy bot zacznie zapisywać `coverage`, strona **sama** zacznie skalować się realną liczbą źródeł —
  zero zmian po stronie frontu.
- **Filtr czasu (1H/4H/12H/24H/7D):** filtruje po `added_at`. Kotwica "teraz" (`NOW`) = **najnowszy
  `added_at` w danych**, nie zegar systemowy — dzięki temu siatka jest zawsze pełna, nawet gdy
  `briefs.json` jest stary (np. bot chwilowo nie działa). Osobna zmienna `NOWREAL` (prawdziwy zegar)
  służy tylko do etykiety "X min/godz/dni temu" — ta ma być uczciwa, nie podkręcona.
  `7D` doładowuje leniwie `archive/index.json` + ostatnie 7 plików przy pierwszym kliknięciu.
- **Sygnał na kaflu:** `🔥 N źródeł` (gdy `coverage>0`) + świeżość. **Świadomie NIE ma fejkowego
  "+847%"** — jeśli nie mamy prawdziwego tempa wzrostu, nie udajemy że mamy.
  Fake-trend to co było w oryginalnej makiecie sprzed przejścia na `briefs.json`.
- **Zdjęcia:** bezpośrednio z `image_url` (bot je już pobiera przy `EnrichItem`) — **nie Wikipedia**.
  Wcześniejsza wersja makiety próbowała ciągnąć zdjęcia z Wikipedia API (najpierw REST, potem
  MediaWiki+JSONP) — zarzucone przy przejściu na dane bota, bo `image_url` jest prostsze i pewniejsze.
  Fallback gdy brak/błąd zdjęcia: kolorowy tint z `.tile::before` (hash koloru z `source_name`/`text`).
- **Bottom sheet:** pełny `article` + `impact` (kolor paska ↑/↓ z prostego regexu) + `subItems` jako
  "powiązane wątki" + link do `source_url`.
- **Layout PC vs mobile:** `layoutProfile()` — mobile 2→4 kafli/rząd, PC 3→7. Kontener zawsze
  `max-width: 1600px` (spójne z `index.html`).

## Plan rozwoju (świadomie odłożone)
1. **Pole `coverage` w bocie** — patrz `FinancialNewsBot/CLAUDE.md`, sekcja "Konsument: Flusso".
   Blokuje realne skalowanie kafli (teraz fallback na ranking).
2. **Prawdziwy sygnał "co ludzie klikają/szukają" (nie tylko "ile się pisze")** — rozważane:
   **Wikipedia Pageviews API** (darmowe, bez klucza, godzinowe, realne liczby odsłon — najlepszy
   kandydat na "trend" zamiast fejkowego %), Reddit `.json` endpoints (nieoficjalne, darmowe),
   Hacker News Firebase API (oficjalne, wąska nisza tech). Google Trends odrzucone — brak
   oficjalnego API, tylko płatne pośredniki albo kruche scrapery (pytrends).
3. Nazwa "Flusso" robocza — może się zmienić.

## Deploy / weryfikacja
Brak build-stepu i CI budującego PR. Testować lokalnie: `python3 -m http.server` w katalogu
repo + otwórz `fala.html`/`index.html` w przeglądarce. Sanity-check JS: `node --check` na
wyciągniętym `<script>` (brak transpilacji, czysty ES2017+ z `async/await`, ma działać wprost
w przeglądarce). Merge do `main` = produkcja natychmiast (GitHub Pages), nie ma cofnięcia poza
kolejnym commitem.
