# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-01**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest niedokończone*,
`CLAUDE.md` mówi *jak działa to, co skończone*.

---

## 🔴 1. Diagnostyka WCIĄŻ PUBLICZNA — najważniejsze otwarte

To była pierwotna przyczyna całej roboty z logowaniem i **nadal nie jest zrobiona**.
Panel jest zamknięty, ale dane leżą obok, otwarte dla każdego:

```
curl https://brifup.com/lejek.json          # 200, ~466 KB
curl https://brifup.com/bot_health.json     # 200
curl https://brifup.com/brief_health.json   # 200
curl https://brifup.com/deepseek_usage.json # 200
```

⚠️ **Samo logowanie NICZEGO nie schowało** — bramka na stronie HTML nie chroni pliku,
który wisi pod bezpośrednim URL-em. To była kluczowa pułapka omówiona z właścicielem.

### Co trzeba zrobić (kolejność jest istotna)

1. **Bot pisze do Supabase** — `financialnewsbot/Runner.cs`, cztery miejsca zapisu przez
   GitHub Contents API (numery linii z 2026-08-01, mogły się przesunąć):
   - `ZapiszUzycieNaSite` ~7285 → tabela `deepseek_usage`
   - `ZapiszDziennikLejkaNaSite` ~7444 → tabela `lejek`
   - `ZapiszLejekBriefuNaSite` ~7841 → tabela `brief_health`
   - `ZapiszHealthNaSite` ~7909 → tabela `bot_health`

   **Okres przejściowy: pisać w OBA miejsca naraz.** Nie kasować plików, dopóki nie
   potwierdzimy, że dane realnie płyną do Supabase.

   Kształty tabel są już gotowe w `supabase_schema.sql` (i już utworzone w bazie):
   lejek ma kolumny typowane, trzy pozostałe biorą `{ts, payload jsonb}` — bo
   `brief_health` ma kilkadziesiąt liczników i wciąż przybywa, więc typowane kolumny
   znaczyłyby migrację bazy przy każdym nowym.

   Potrzebny `SUPABASE_SERVICE_KEY` w `/root/bot_secrets.env` na Hetznerze —
   🔴 klucz `service_role`, TAJNY, omija RLS. Nigdy w repo, nigdy w czacie.
   Do zapisu: `POST /rest/v1/<tabela>` + nagłówki `apikey` i `Authorization: Bearer`.
   Po zapisie wołać `sprzatnij_diagnostyke()` (RPC) — trzyma retencję 3 dni / 200 biegów.

2. **Potwierdzić, że dane doszły** — w panelu zakładka Lejek przełączy się sama
   (czyta najpierw Supabase, pomarańczowe ostrzeżenie zniknie), albo w SQL Editorze
   `select count(*) from public.lejek;`

3. **Dopiero wtedy skasować pliki z repo** i wyłączyć push po stronie bota.
   Bonus: koniec commitów „Aktualizacja … [skip ci]" zaśmiecających historię.

**Publiczne ZOSTAJE:** `briefs.json`, `threads.json`, `trending.json`, `quotes.json`,
`archive/`, `rejected.json` — to treść strony, a Flusso czyta je cross-origin.

---

## 🔴 2. OneSignal — push prawdopodobnie NIE DZIAŁA

Konsola na produkcji zgłasza `App not configured for web push`. **To nie jest
udokumentowany przypadek „adblock blokuje CDN"** — SDK się ładuje i mówi, że
aplikacja po stronie OneSignal jest źle skonfigurowana.

Do sprawdzenia w panelu OneSignal (Settings → Web Configuration): czy domena to
`brifup.com` i czy web push jest włączony. **Z kodu tego nie naprawimy.**

---

## ⚠️ 3. Dwa feedy wyglądają na martwe

Zmierzone 2026-08-01 (to NIE jest efekt weekendu — feedy tech nie milkną na dwie doby):

| Feed | Cisza | Ostatni sygnał |
|---|---|---|
| Yahoo Tech | 42 h | 2026-07-30 22:00 |
| Rest of World | 25 h | 2026-07-31 15:31 (i tylko 2 wpisy przez czw-pt) |

Widać je teraz na czerwono w kokpicie panelu. Do sprawdzenia, czy URL-e w bocie
jeszcze odpowiadają.

---

## ⚠️ 4. ~8% newsów bez źródła — przyczyna NIEROZSTRZYGNIĘTA

**Zmierzone:** 54 pozycje z 561 w 7 dni (30 samodzielnych + 24 sub-itemy), stale 3–16%
dziennie. ⚠️ Nie mylić z kotwicami klastrów — te też nie mają źródła, ale **tak mają
działać** (źródła siedzą w sub-itemach, front liczy z nich badge „✓ N źródeł").

**Profil tych 54:** 100% ma `added_at`, artykuł i flagę; tylko 7% ma kategorię,
6% zasięg, 7% zdjęcie. Kategorię nadaje SELEKCJA, a zasięg i zdjęcie ENRICH —
więc ominęły oba etapy, a mimo to dostały artykuł.

**Wykluczone (nie trać na to czasu ponownie):**
- ❌ ręczne wpisy właściciela — wszystkie mają `added_at`, bot je zapisał
- ❌ zwijanie klastrów jednoelementowych — bierze sub-item ze źródłem, poprawnie
- ❌ przebudowa kotwic w RetroCleanup — dotyczy kotwic, nie samodzielnych
- ❌ `ReenrichItemArticles` — wołane TYLKO z trybu `REENRICH_DOSE` (ręcznego)

**Znaleziona przy okazji realna wada** (wąska, nie jest przyczyną): `Runner.cs`
~3448, `ReenrichItemArticles` bramkuje ponowne szukanie źródła warunkiem
„nie ma artykułu" — więc news z artykułem, ale bez źródła, nigdy go nie dostanie.
Dotyczy tylko ręcznego trybu.

**`selekcja_kategoria_nieznana` = 1 na 200 biegów** — czyli te newsy nie przeszły
normalną ścieżką selekcji, bo miałyby kategorię.

**Zalecane dalsze podejście: przestać czytać kod, zmierzyć.** Dwie zmiany w bocie:
1. licznik `publikacja_bez_zrodla` + log z tekstem newsa w miejscu wejścia do dawki
2. (opcjonalnie, decyzja właściciela) bramka: item bez `SourceUrl` → poczekalnia,
   zgodnie z tym, co `financialnewsbot/CLAUDE.md` deklaruje jako projekt
   („bez źródła → poczekalnia, front jej NIE renderuje")

⚠️ Ryzyko punktu 2: jeśli te 8% to newsy, które właściciel CHCE mieć mimo braku
źródła, bramka zdejmie je ze strony. Najpierw sam licznik, popatrzeć dzień, potem decyzja.

---

## 📊 5. Do sprawdzenia po weekendzie — efekt zmian w bocie

Zmergowane 2026-08-01 ([PR #90](https://github.com/sowasskat-debug/FinancialNewsBot/pull/90)),
wchodzi przy najbliższym biegu. **Sobota ma za mało newsów — realny obraz da poniedziałek.**

| Co | Gdzie | Punkt odniesienia |
|---|---|---|
| Udział Bankier.pl w źródłach | kokpit / archiwum | było **17,3%** (następne źródło 2,5%) |
| `zrodlo_rozcienczone` | `brief_health.json` | jak ~0 przez tydzień → próg 0.45 za wysoki |
| Czy nowe feedy nie dają 403 z Hetznera | logi / lejek | sprawdzane były z Maca, nie z serwera |

⚠️ Nowe feedy (money.pl, Business Insider, WNP, Puls Biznesu, Rzeczpospolita) testowałem
**z Maca**. IP datacenter bywa blokowane — jeśli któryś oddaje 403, dopisać go do
`_redakcjeBlokujaceDatacenter`.

---

## ✅ Co jest ZROBIONE i zweryfikowane (nie ruszaj bez powodu)

- **Panel `knaga.html`** (przemianowany z `admin.html` — patrz `CLAUDE.md`, sekcja Pliki):
  logowanie e-mailem przez Supabase, kokpit, zakładki Posty / Czeka / Odrzucone / Lejek,
  usuwanie z kosza + przywracanie, „Wrzuć na X" z gotowcem z Edge Function.
- **Supabase**: 6 tabel + RLS, zweryfikowane od strony atakującego (401 na wszystkich,
  także INSERT), rejestracja zamknięta, Edge Function `gotowiec-x` wdrożona.
- **Bot**: +5 polskich źródeł, `ZamienNaRzadszeZrodlo` (build 0 błędów, próg zmierzony
  na realnych parach tytułów).
- **Marka pod X**: `marka/` — awatar 400×400, baner 1500×500 (⚠️ NIE commitowane).

## ⚠️ Pułapki, w które łatwo wdepnąć ponownie

1. **Nie dopisuj `knaga.html` do `robots.txt` ani `sitemap.xml`** — robots.txt jest
   publiczny i OGŁASZAŁby ścieżkę panelu. Chroni `<meta robots noindex>` w stronie.
2. **Nie podmieniaj samej nazwy źródła przy rozcieńczaniu Bankiera** — treść pochodzi
   z konkretnego URL-a, podmiana etykiety to fałszywa atrybucja. Podmieniamy CAŁEGO
   kandydata (tytuł + link).
3. **Link do X NIE idzie w treść posta** — X obcina 30-50% zasięgu, a bez Premium
   takie posty mają zerowe zaangażowanie. Parametr `url` w intencie jest usunięty
   CELOWO; link wkleja się jako odpowiedź.
4. **Bump `CACHE_NAME` przy każdej zmianie CSS/JS** — i pamiętaj, że sam bump nie
   wystarcza: świeżość daje `cache:'reload'` w SW (regex łapie teraz `css|js|html`).
5. **Odrzucone: `rejected.json` UCZY FILTR** (ostatnie 40 wpisów) — pomyłka przy
   „Usuń" psuje selekcję na kolejne dni.

## Odrzucone pomysły (nie wracaj bez nowego powodu)

- **Logowanie Google** — za dużo setupu (Google Cloud OAuth). Wybrane: e-mail + hasło.
- **Magic link / OTP** — wbudowany mailer Supabase limitowany do ~2 maili/h, „tylko do testów".
- **Gotowiec `x_post` generowany przez bota dla każdego newsa** — publikowanych jest
  107/dzień, na X idą 3-4, więc 96% do kosza ($1,11-1,58/mies vs ~$0,01). Zastąpione
  generowaniem na żądanie (Edge Function).
- **Haiku 4.5 do „Wpływu na rynek"** — policzone (~$1,45/mies, +4,7%), właściciel odpuścił.
- **Edge Function do tokenu GitHub** — bezpieczniejsza (token nigdy w przeglądarce),
  ale dłuższa robota. Wybrany token w tabeli `sekrety`. Kompromis opisany w SETUP_SUPABASE.md.
