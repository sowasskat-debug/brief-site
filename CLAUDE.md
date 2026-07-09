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
- `admin.html` — panel admina (osobny, token GitHub w sessionStorage).
- `service-worker.js` — PWA cache + import OneSignal SDK.
- `briefs.json` — bieżące dane (patrz niżej). `archive/*.json` — archiwum dzienne. `rejected.json` — ręcznie odrzucone (uczy filtr bota).
  - **`rejected.json` = warstwa PRZYKŁADÓW (few-shot):** bot czyta **tylko ostatnie 40 wpisów** jako REGUŁA 0, więc świeże odrzucenia wypierają stare. Dobre do „naucz filtr TEGO konkretnego newsa". **Trwałe kategorie** (np. „odrzucaj promo bankowe", „fixingi CB bez wpływu na EUR/PLN") NIE tu — idą do stałej `WSPOLNE_ODRZUCENIA` w bocie (repo `financialnewsbot`), inaczej po ~40 nowych odrzuceniach wzorzec wypadnie z okna. Kształt wpisu: `{ "text", "flag", "reason"? }` (pole `reason` opcjonalne — bot dokleja je jako „[powód: …]").
- `manifest.json`, ikony, `og-image.png`, `CNAME`, `robots.txt`, `sitemap.xml`.

## Kształt danych (`briefs.json`)
```
{ "morning"|"afternoon"|"evening"|"poczekalnia": { "date":"YYYY-MM-DD", "items":[ BriefItem ] } }
```
BriefItem (klucze małą literą): `text`, `flag`, `article`, `impact`, `source_name`,
`source_url`, `rssLink`, `added_at`, `subItems` (klaster = tablica BriefItem).
Pozycja `items[0]` = **top story** (bot ją tam ustawia).

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

## Testowanie UI lokalnie
```
python3 -m http.server 8099   # w katalogu repo
# Playwright (chromium): /opt/pw-browsers/chromium-1194/chrome-linux/chrome
```
Wtedy można wyrenderować widok mobile/desktop i zrobić zrzut do weryfikacji zmian.

## Konwencje
- Estetyka: minimalistyczna, „gazetowa". Fonty DM Serif Display + Space Mono. Akcent czerwony (`--red`). UI po polsku. Motyw jasny/ciemny (theme-aware).
- Zmiany wizualne: **pokazać podgląd (zrzut) przed wdrożeniem** — user tak woli.
- Commity po polsku.
