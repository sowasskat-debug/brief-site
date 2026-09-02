# Handoff 02.09.2026 — awaria selekcji, otwarte wątki (sesja z Windowsa, bez SSH)

Pisane z Windowsa, gdzie nie ma klucza SSH do Hetznera ani SDK .NET. Wszystko poniżej jest **zmierzone**,
chyba że napisano „hipoteza". Kolejność = kolejność roboty na Macu.

## 1. AWARIA: selekcja nie dostaje odpowiedzi od biegu 07:02 UTC (08:02 czasu właściciela)

**Objaw.** Od biegu 06:31 UTC (ostatni żywy) każdy kolejny bieg (07:02, 07:32, … co 30 min) wypycha
notowania i Flusso, ale **zero wierszy w lejku, zero historii, zero briefu**. Poranna dawka 02.09 została
z 13 pozycjami, popołudniowa zaczęła się pusta.

**Co pokazał nowy kafel w Knadze „DeepSeek per bieg"** (tabela `deepseek_usage`, wiersz = bieg, kolumna =
etap, komórka = wywołania / tokeny in / tokeny out):
- `brief-selekcja` do 06:31 UTC: `3 / 79k / 225`, `2 / 54k / 430`, `4 / 105k / 599` — ok. **26 tys. tokenów
  wejścia na jedno wywołanie**, odpowiedzi wracały;
- `brief-selekcja` od 07:02 UTC: **`·`** w każdym biegu;
- pozostałe etapy (`brief-enrich-*`, `flusso-article`, `flusso-selekcja`) — wywołania i odpowiedzi
  **w każdym biegu, także w czasie awarii**, ten sam model `deepseek-v4-flash`, ten sam endpoint.

**Semantyka `·`:** `RejestrujUzycieTokenow` zlicza etap **tylko gdy odpowiedź ma `usage`**. Więc `·` to:
timeout (`_watkiClient`, 300 s), HTTP 4xx/5xx (`continue` → 2 próby → `null`) albo wyjątek przed
wysłaniem. Z zewnątrz nie do odróżnienia.

**Wykluczone (zmierzone):** saldo DeepSeeka (OK), incydent DeepSeeka (0 nierozwiązanych), sieć (inne
etapy odpowiadają), flaga konta GitHub (bot czyta/pisze przez `api.github.com` z tokenem, brak odczytów
anonimowych), `tytuly.txt` (poprawny UTF-8, bez surogatów, jedyna nowa linia to Microsoft z „ ” cudzysłowami),
zmiana kodu (ostatnia: PR #247 01.09 17:38 UTC, noc działała), feedy (21/21 HTTP 200, RSS).

**Hipoteza (stawka, nie dowód):** duży prompt selekcji (~26k tokenów) przestał wracać w 300 s, małe
prompty wracają. Nie tłumaczy, czemu od 07:02.

**ROZSTRZYGA jedna komenda na Hetznerze:**
```bash
grep -E "SELEKCJA-JSON|zwrócił status|Błąd Check" /var/log/brif_bot.log | tail -12
```
- `Błąd (próba 2): …Timeout` → DeepSeek nie wyrabia na dużym prompcie; opcje: dłuższy timeout, mniejsza
  paczka, cięcie sekcji historii (ona jest w KAŻDYM prompcie selekcji);
- `zwrócił status: 400/429/5xx` + `Detale` → czytać treść;
- `Brak obiektu JSON` → odpowiedź ucięta na `max_tokens = 2500` w `SelekcjaJson` → podnieść;
- `Błąd CheckJuiceBatched: …` (ta sama treść dla wszystkich źródeł) → wyjątek na wspólnej ścieżce przed
  DeepSeekiem — prawie na pewno `SekcjaHistoriiSelekcji` / `ZbudujSekcjeHistoriiSelekcji`.

**Po naprawie — odzyskać stracone godziny** (okno selekcji ma 60 min, wszystko z czasu awarii przepadło):
```bash
CATCHUP_MINUTES=360 <komenda, którą cron uruchamia bota>    # Runner.cs ok. 139: OknoSelekcjiMinut = _catchup
```

## 2. Synchronizacja brief-site z GitHubem — możliwe, że ją zatrzymałem

Wypchnąłem do `brief-site/main` trzy commity w 15 min (10:01, 10:08, 10:15 UTC): `7504920`, `52a770a`,
`f6cefb0` — wszystkie dotyczą wyłącznie `knaga.html` (kafle diagnostyczne). Serwer pobrał tylko pierwszy
(`Last-Modified` knaga.html: 10:05:03 UTC). Od 09:32 UTC bot **nie wypchnął** żadnego commitu na GitHub,
choć biegi 10:02 i 10:32 się odbyły. Podejrzenie: `brifup-push.sh` (`pull --rebase` + push co 5 min) stanął
na rebase. Strona działa (Caddy serwuje pliki lokalne), ale backup i deploy frontu stoją.
```bash
cd <klon brief-site na Hetznerze> && git status
git rebase --abort 2>/dev/null; git pull --rebase && git push
```
Wniosek na przyszłość: **nie pchać na `brief-site/main` częściej niż raz na 10 minut** z zewnątrz.

## 3. PR #248 w FinancialNewsBot — NIE ZBUDOWANY, czeka na merge

Gałąź `selekcja/seria-sabotazu-wyjatek`, 1 linia w `WSPOLNE_ODRZUCENIA`: trzeci wyjątek od kroniki —
eksplozja / ładunek / dron / sabotaż infrastruktury w kraju UE lub NATO przechodzi, **gdy w
`[OPUBLIKOWANE WCZEŚNIEJ]` jest seria takich zdarzeń** w tym kraju/regionie (Augsburg 02.09 odpadł jako
„wypadek", choć wątek w691 miał z 01.09 dron w Lipsku, dron z bombą na lotnisku, rakietę przy granicy).
```bash
git fetch && git checkout selekcja/seria-sabotazu-wyjatek && dotnet build Bot.csproj   # 0 błędów → merge
```
Merge = deploy (Hetzner pobiera main przed biegiem). Po tygodniu sprawdzić w lejku, czy wyjątek nie
przepuszcza zwykłych wybuchów gazu.

## 4. Pozostałe ustalenia z 02.09 (nie ma ich w repo)

- **Ruch do DeepSeeka podwoił się od 31.08**: zapytań/dzień 1,2–1,5 tys. → 2,4–2,8 tys., wejście 4–5 mln →
  6–7,6 mln tokenów (eksport z platformy). Koreluje z #244 (feedy 30.08), #245 (GDELT 31.08), #247
  (klastrowanie 01.09). Do zmierzenia, co dokłada 1200 wywołań dziennie.
- **Konto GitHub `sowasskat-debug` jest oflagowane** („flagged as spammy") od kilku dni: profil i publiczne
  repo oddają 404 anonimowo, OAuth do Supabase nie działa (konto Supabase jest tylko przez GitHub — reset
  hasła niemożliwy). Bot i strona nietknięte (Hetzner + token). Odwołanie: support.github.com → „Account
  flagged"; przyczyna prawie na pewno ~140 automatycznych commitów/dzień.
- **Czujka `brifup-kontrola` jest ślepa** (`BŁĄD_INFRASTRUKTURY`, czyta repo anonimowo → 404 przez flagę).
  Dzisiejsza awaria to dowód, po co ją podpiąć pod Hetzner.
- **Dedup między dawkami** (`kv.Value?.Date == dzisiaj`, Runner.cs 725/3820) nie łapie parafraz (0,36
  przy progu 0,65) — poszerzanie o wczoraj bezpieczne (0 fałszywych na archiwum), ale bezużyteczne od
  sierpnia. Jedyna warstwa parafraz to model w `MergeNewItemsIntoClusters` (9381/9390): limit 25 klastrów
  w kolejności morning→afternoon→evening (wieczór by się nie zmieścił), `[SKIP]` w kodzie, ale prompt o nie
  nie prosi, a gdy klaster jest pełny (`MAX_SUBITEMOW_KLASTRA = 6`) news **dodaje się osobno** (9856).
  Zmierzone: sytuacja „pełny klaster + spóźnione ujęcie" wystąpiła **1 raz na 187 dawek** (dziś). Decyzja:
  nie ruszać bez `grep -c "Cross-dose merge: pominięto.*klaster pełny" /var/log/brif_bot.log`.
- **PAP martwy**: `pap.pl/rss.xml` (finder, Runner.cs 7849) i `biznes.pap.pl/pl/rss` oddają 200 + HTML
  Incapsuli. PAP Biznes nie jest w puli selekcji wcale — a stamtąd są PGE, ARP i większość polskich liczb.
- **Feed X** (`rss.app/feeds/mF9gRdHx7vZIGiZN.xml`) martwy od 18.08, odpytywany co bieg — do zdjęcia.
- **Investing.com Commodities**: `pubDate` bez strefy (`2026-09-02 08:30:32`) — C# parsuje jako czas
  lokalny serwera; sprawdzić TZ Hetznera.
- **Eurostat** (odłożone przez właściciela): Atom `…/news/euro-indicators?…p_p_resource_id=atom…
  collection=CAT_PREREL`, `<entry>` nie `<item>` (obecny parser da 0). Plan: biała lista tytułów
  (inflation|unemployment|GDP|government deficit/debt|house prices|labour costs) + wiersz „Poland" ze
  strony komunikatu (618 kB HTML, tabela). Reguła 28 odrzuca rutynowe odczyty — bez polskiego wiersza
  feed da ~1 pozycję/miesiąc.
- **Zabawa w Sherlocka 02.09** (skrót „Informacje Giełdowe", 33 punkty): 9 pełnych + 6 częściowych trafień.
  Brakujące pasy: Eurostat, PAP Biznes, `portalsamorzadowy.pl` (ten sam wydawca PTWP co `wnp.pl`),
  Bloomberg/OilPrice (surowce), Agentstwo/Meduza. Najcenniejsze: PGE 2,06 mld **było w paczce o 17:06 UTC
  01.09 i odpadło** (naprawia się bez dokładania źródeł).
- **rss.app lag + okno 60 min gubi tweety**: Takata 05:24Z i 05:30Z, Israel×Syria 05:28Z, Xi w Egipcie
  06:18Z — brak w lejku, choć biegi miały je w oknie (mostek podał je za późno). Kod to zna (komentarz przy
  Insider Paper), dziś pierwszy raz zmierzone.
- **Selekcja niespójna**: „brak oficjalnego potwierdzenia" (19FortyFive) przeszło wieczorem, Kermanshah/
  Tasnim z Juice rano odpadł.
- Czas: telefon właściciela pokazuje UTC+1; `ts` w Supabase i commity — UTC; `added_at` w `briefs.json` —
  czas lokalny bota. Przy porównywaniu godzin zawsze sprowadzać do UTC.
- `gospodarka.xml` Bankiera nigdy nie istniało (pusta 200 = odpowiedź na dowolną nieistniejącą nazwę);
  stoi tylko w martwej `ZeroPlDiagnostyka` — nie usterka.

## 5. Kafle dodane do Knagi (wszystkie z własnym try/catch, nie ruszają istniejących)

- `7504920` „DeepSeek per bieg" — działa, sprawdzone na telefonie.
- `52a770a` — etapy z „selekcj" jako pierwsze kolumny — **nie wdrożone** (patrz p. 2).
- `f6cefb0` „Liczniki bota per bieg" z `brief_health` (`prefiltr_sprawdzone`, `selekcja_json_blad`, …) —
  **nie wdrożone**; po odblokowaniu synchronizacji pokaże, czy paczka w ogóle powstała.
