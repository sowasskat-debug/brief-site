# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-02 (późny wieczór)**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest
niedokończone*, `CLAUDE.md` mówi *jak działa to, co skończone*.

---

## 🔴 0. ZACZNIJ TUTAJ — jedno wdrożenie Edge Function czeka

Na `main` leżą **dwie zmiany funkcji `og`, które nie są wdrożone**, bo deploy nie idzie przez git:

```
cd ~/Documents/brief-site && supabase functions deploy og --no-verify-jwt --project-ref utmvokfjvrthvcmxzowc
```

Co przez to nie działa:
1. **Karta wątku (`?w=1`)** — druga karta z osią ostatnich 4 etapów sagi, do wklejenia w komentarzu
   na X. Przycisk w knadze jest, funkcja na Supabase jeszcze o parametrze nie wie.
2. **CORS** — bez nagłówka `Access-Control-Allow-Origin` przyciski „Pobierz kartę" działają tylko
   w trybie awaryjnym (otwierają obrazek w nowej zakładce zamiast go zapisać).

⚠️ `supabase login` wygasa — jeśli deploy zwróci błąd tokenu, najpierw `supabase login`.
⚠️ `--no-verify-jwt` jest **konieczne**: scraper nie ma i nie może mieć tokenu.

**Weryfikacja po deployu** (da się z Maca):
```
curl -sS -D- -o /dev/null "https://utmvokfjvrthvcmxzowc.supabase.co/functions/v1/og?d=morning&s=<slug>" | grep -i access-control
curl -sS -o /tmp/w.png "https://utmvokfjvrthvcmxzowc.supabase.co/functions/v1/og?d=morning&s=<slug>&w=1" && file /tmp/w.png
```
Ma być nagłówek CORS i `PNG image data, 1200 x 630`.

---

## 🔴 1. Diagnostyka — migracja do Supabase W POŁOWIE (pliki DALEJ publiczne)

**Bez zmian od 2026-08-01.** Bot pisze w OBA miejsca naraz; pliki wciąż leżą w publicznym repo:

```
curl https://brifup.com/lejek.json           # 200, ~470 KB
curl https://brifup.com/bot_health.json      # 200
curl https://brifup.com/brief_health.json    # 200
curl https://brifup.com/deepseek_usage.json  # 200
```

Kolejność: (1) popatrzeć dobę czy dane płyną (`select count(*) from public.lejek;` ma rosnąć,
bot chodzi **co 30 min**), (2) skasować pliki z repo + wyłączyć 4 funkcje `Zapisz*NaSite`.

⚠️ **`lejek.json` NIE MOŻE zniknąć wcześniej** — zakładka Lejek w knadze stoi na nim jako fallbacku.

**Publiczne ZOSTAJE:** `briefs.json`, `threads.json`, `trending.json`, `quotes.json`, `archive/`,
`rejected.json` — to treść strony, a Flusso czyta je cross-origin.

---

## 🔴 2. OneSignal — push prawdopodobnie NIE DZIAŁA

Bez zmian. Konsola na produkcji: `App not configured for web push`. Do sprawdzenia w panelu
OneSignal (Settings → Web Configuration): czy domena to `brifup.com` i czy web push jest włączony.
**Z kodu tego nie naprawimy.**

---

## ⚠️ 3. GDELT — zmierzony, poprawka NIEZMERGOWANA (PR #96 w bocie)

**Zmierzone 2026-08-02, nie zgadnięte:** GDELT **żyje** (proste zapytanie → 200 + poprawny JSON,
bez klucza), ale odrzuca ~70% ruchu. 24 zapytania przy odstępie 6 s (ich dokumentowany limit):
**7×200, 17×429 = 29% skuteczności**, sukcesy rozrzucone bez regularności.

**Wykluczone eksperymentalnie:** kształt zapytania (krótkie/długie/PL/EN odbijają się tak samo)
oraz długość odstępu (120 s ciszy dało 429, a 6 s później 200).

🔴 **Przyczyna zera w licznikach:** po PIERWSZYM 429 kod otwiera breaker na **15 minut**, czyli gasi
finder na cały bieg. Przy ~70% szans na odbicie pierwszy item niemal zawsze wygasza GDELT, zanim
ten trafi w swoje 29%.

**PR #96** zamienia to na 3 próby w jednym wywołaniu + breaker dopiero po 3 wywołaniach z rzędu i na
5 min. ⚠️ **Nie jest udowodniony:** zaraz po serii 29% cztery wywołania przez realny kod dały 0/4.
Najpewniej własnym ruchem testowym wpędziłem IP w ostrzejsze limitowanie — czyli GDELT karze
**skumulowanym wolumenem**, nie odstępem. Pomiar szedł z Maca, bot pyta z Hetznera.

⚠️ **Ze starych liczników NIE DA SIĘ tego rozstrzygnąć:** `finder_gdelt_proba` inkrementuje się PRZED
wywołaniem findera (`ProbujFindery`), więc liczy też przebiegi wycięte przez breaker. **Dopiero po
zmergowaniu #96 liczniki zaczną mówić prawdę.**

**Kryterium:** `finder_gdelt_fakty` przez dobę po deployu. Dalej zero = z IP datacenter GDELT nie
oddaje nic i uczciwą decyzją jest **wyrzucić go z łańcucha finderów** (kosztuje wtedy tylko czas,
do 3 × 5,5 s na item).

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

## ⚠️ 5. Bramka zapowiedzi tygodnia — WDROŻONA, ale bez licznika

`CzyZapowiedzWieluTematow` (bot, PR #103 → `d2a4971`) jest na `main` od 02.08 wieczorem, Hetzner
pobiera `main` przed każdym biegiem, więc działa od najbliższego uruchomienia. **Nie zweryfikowana
na produkcji** — pomiar był offline, na 4195 nagłówkach z archiwum.

⚠️ **Odstępstwo od konwencji repo, świadome:** każda inna bramka w bocie ma licznik w `brief_health.json`
(`naglowek_eskalacja_odrzucony`, `cross_bieg_cofniecie`…). Ta ma **tylko `Console.WriteLine`**, więc
częstość widać wyłącznie w logu Hetznera:

```
grep -E "zapowiedź wielu tematów" /var/log/bot.log
```

**Kryterium:** jeśli bramka odpala się na czymś, co zapowiedzią nie jest — zawęź `_frazyZapowiedziMocne`,
**nie** ruszaj `PROG_SPOJNOSCI_KLASTRA` (patrz uzasadnienie w `financialnewsbot/CLAUDE.md`).
Jeśli chcesz mierzyć bez czytania logów — dołożenie licznika to jedna linia w `LiczLejek`.

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

## Otwarte drobiazgi

- **Stare PR-y z 10 lipca, wszystkie w konflikcie:** #27 (dotyka `briefs.json` — 3-tygodniowy diff na
  żywych danych, **do zamknięcia, nie merge'a**), #31 (grafiki z Wikipedii — podejście PORZUCONE na
  rzecz `image_url`, plik `fala.html` to legacy), #34 (liczniki kategorii, `index.html` od lipca
  zmienił się nie do poznania).
- `bot-health.html` i `brief-health.html` — osierocone, do przeniesienia do knagi.
- Przycisk „Udostępnij na X" jest w knadze, ale **na `index.html` dla czytelników NADAL GO NIE MA**.
- Nieśledzone pliki w repo: `.claude/`, `marka/`, `serve.py`, `supabase/.temp/` — decyzja o `.gitignore`.
- 8 wpisów w `rejected.json` (pozycje 91–98) nie ma pól `date`/`dose` — panel pokazuje dla nich „—".

## Odrzucone pomysły (nie wracaj bez nowego powodu)

- **Logowanie Google**, **magic link/OTP** — wybrane e-mail + hasło.
- **Gotowiec `x_post` generowany przez bota** — `gotowiec-x` robi to na żądanie i nadpisuje wynik.
- **Fallback EN „odpalać wcześniej / podnieść limit"** — leczenie objawu. Przyczyną była utrata
  angielskiego oryginału na selekcji; naprawione u źródła.
- **Gotowe liczniki (GoatCounter, Plausible)**, **przeniesienie domeny na Cloudflare**,
  **stała sól w liczniku wejść** — patrz historia decyzji.
