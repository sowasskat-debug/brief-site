# STAN — od czego zacząć w nowej sesji

Zdjęcie stanu na **2026-08-01 (późny wieczór)**. Czytaj to PRZED `CLAUDE.md` — mówi *co jest
niedokończone*, `CLAUDE.md` mówi *jak działa to, co skończone*.

---

## 🔴 1. Diagnostyka — migracja do Supabase W POŁOWIE (pliki DALEJ publiczne)

**Co się zmieniło dziś:** bot **już pisze** do Supabase. Potwierdzone na biegu 21:31 UTC —
wszystkie cztery tabele dostały wpisy, klucz działa, RLS wpuszcza tylko właściciela.

**Czego NIE zrobiono:** pliki wciąż leżą w publicznym repo i każdy je pobierze:

```
curl https://brifup.com/lejek.json           # 200, ~466 KB
curl https://brifup.com/bot_health.json      # 200
curl https://brifup.com/brief_health.json    # 200
curl https://brifup.com/deepseek_usage.json  # 200
```

To jest **świadomy okres przejściowy**, nie zaniedbanie: bot pisze w OBA miejsca naraz, żeby
ciche przełączenie nie zostawiło diagnostyki bez żadnego źródła.

### Co zostało do zrobienia (kolejność istotna)

1. **Popatrzeć dobę**, czy dane płyną stabilnie: `select count(*) from public.lejek;` ma rosnąć
   z każdym biegiem (bot chodzi **co 30 minut**, nie co godzinę — `*/30` w cronie).
2. **Wtedy skasować pliki z repo** i wyłączyć ich push po stronie bota (4 funkcje `Zapisz*NaSite`).
3. Bonus: koniec commitów „Aktualizacja … [skip ci]" zaśmiecających historię brief-site.

⚠️ **`lejek.json` NIE MOŻE zniknąć wcześniej** — zakładka Lejek w knadze stoi na nim jako fallbacku
(`pobierzLejekDane` próbuje Supabase, spada na plik). Skasowanie przed potwierdzeniem urwie panel.

**Publiczne ZOSTAJE:** `briefs.json`, `threads.json`, `trending.json`, `quotes.json`, `archive/`,
`rejected.json` — to treść strony, a Flusso czyta je cross-origin.

---

## 🔴 2. OneSignal — push prawdopodobnie NIE DZIAŁA

Konsola na produkcji zgłasza `App not configured for web push`. **To nie jest udokumentowany
przypadek „adblock blokuje CDN"** — SDK się ładuje i mówi, że aplikacja po stronie OneSignal jest
źle skonfigurowana. Potwierdzone ponownie 2026-08-01 przy testach frontu.

Do sprawdzenia w panelu OneSignal (Settings → Web Configuration): czy domena to `brifup.com`
i czy web push jest włączony. **Z kodu tego nie naprawimy.**

---

## ⚠️ 3. ~8% newsów bez źródła — przyczyna NIEROZSTRZYGNIĘTA

**Zmierzone:** 54 pozycje z 561 w 7 dni (30 samodzielnych + 24 sub-itemy), stale 3–16% dziennie.
⚠️ Nie mylić z kotwicami klastrów — te też nie mają źródła, ale **tak mają działać**.

**Profil tych 54:** 100% ma `added_at`, artykuł i flagę; tylko 7% ma kategorię, 6% zasięg,
7% zdjęcie. Kategorię nadaje SELEKCJA, a zasięg i zdjęcie ENRICH — więc ominęły oba etapy.

**Wykluczone (nie trać na to czasu ponownie):**
- ❌ ręczne wpisy właściciela — wszystkie mają `added_at`, bot je zapisał
- ❌ zwijanie klastrów jednoelementowych — bierze sub-item ze źródłem, poprawnie
- ❌ przebudowa kotwic w RetroCleanup — dotyczy kotwic, nie samodzielnych
- ❌ `ReenrichItemArticles` — wołane TYLKO z trybu `REENRICH_DOSE` (ręcznego)

**Zalecane podejście: przestać czytać kod, zmierzyć.** Licznik `publikacja_bez_zrodla` + log
z tekstem newsa w miejscu wejścia do dawki. Dopiero potem decyzja o bramce.

---

## ⚠️ 4. Selekcja nie zapisuje POWODU odrzucenia

**0 z 1086 odrzuconych ma wypełnione pole `powod`.** To nie bug, tylko kontrakt: `odrzucony` jest
stanem STARTOWYM każdego kandydata (`LejekZarejestrujBatch`), a selekcja zwraca w JSON wyłącznie
WYBRANE. Model nigdy nie mówi nic o odrzuconych.

**Dlaczego to boli:** każda poprawka reguł (a 2026-08-01 weszły trzy) jest weryfikowalna wyłącznie
obserwacyjnie — „poczekajmy i zobaczmy, czy podobne przejdzie". Nie da się zmierzyć, KTÓRA reguła ile kosi.

**Propozycja (nie zrobiona, właściciel wybrał najpierw łatanie reguł):** krótki KOD przyczyny przy
`idx` w odpowiedzi selekcji — kilka tokenów na kandydata, nie free-text (przy ~360 odrzutach dziennie).
Wtedy `lejek.html`/panel od razu pokazuje rozkład powodów.

---

## 📊 5. Do obejrzenia po weekendzie

**Sobota ma za mało newsów — realny obraz da poniedziałek.**

| Co | Gdzie | Punkt odniesienia |
|---|---|---|
| Udział Bankier.pl w źródłach | kokpit / archiwum | było **17,3%** (następne źródło 2,5%) |
| `zrodlo_rozcienczone` | `brief_health` | jak ~0 przez tydzień → próg 0.45 za wysoki |
| Czy Techmeme i The Verge realnie dowożą | zakładka Lejek | Techmeme max 2/bieg, Verge max 1 |
| Czy reguła o rundach finansowania nie tnie za szeroko | Lejek | ma kosić seedy, nie duże spółki |
| Czy wydarzenia rangi państwowej przechodzą | dawki | reguła dodana 2026-08-01 |
| Koszt Haiku za `impact` | `brief_health` | `impact_haiku_tok_in` / `_tok_out` |
| ⚠️ Wykresy notowań | `briefs.json`, pole `chart` | inne nazewnictwo Haiku może dać MNIEJ wykresów |

---

## ✅ Co zrobiono 2026-08-01 (nie ruszaj bez powodu)

- **Licznik wejść** — własny, na Supabase: Edge Function `licznik` + tabela `wizyty` + zakładka
  **Ruch** w knadze. Działa na produkcji. 🔴 Do tego dnia strona **nie liczyła wejść w ogóle**,
  więc danych wstecz NIE MA i nie da się ich odzyskać.
- **Bot dubluje diagnostykę do Supabase** — cztery tabele, potwierdzone na biegu 21:31.
- **Reguły selekcji:** tech-nowinki jako KRYTERIUM zamiast zamkniętej listy firm (przepuszcza
  Trump Media/Truth API), wydarzenia rangi państwowej (Godzina „W"), rundy finansowania startupów
  do odrzucenia.
- **Feedy:** +Techmeme (max 2/bieg), Yahoo Tech → The Verge, ⛔ TVN24 usunięty.
- **Front:** top story otwiera się na wejściu w panelu szczegółów, panel zwężony 480→440 px,
  klik w logo wraca na aktualną dawkę. SW v56.
- **Panel `knaga.html`** (przemianowany z `admin.html`): logowanie e-mailem przez Supabase, kokpit,
  zakładki Posty / Czeka / Odrzucone / Lejek / **Ruch**, „Wrzuć na X".
- **Usunięty `lejek.html`** — osierocony, ten sam render działa w zakładce Lejek w knadze.

## ⚠️ Pułapki, w które łatwo wdepnąć ponownie

1. **`brifup.com` NIE idzie przez Cloudflare** — `CLAUDE.md` twierdził tak od początku i było to
   nieprawdą. NS to GoDaddy, rekordy A wprost na GitHub Pages, w nagłówkach Fastly. Skutek: nie ma
   statystyk brzegowych ani logów, dlatego licznik trzeba było budować od zera.
2. **`bot_secrets.env` ma NIESPÓJNY format** — część linii ma `export`, część nie. Bez `export`
   `source` ustawia tylko zmienną powłoki i `dotnet run` JEJ NIE WIDZI. Naprawione `set -a` wokół
   `source` w `run_bot.sh` (kopia: `/root/run_bot.sh.bak-20260801`). ⚠️ Mylący trop: `ANTHROPIC_API_KEY`
   działa mimo braku `export` w swojej drugiej linii, bo wcześniejsza linia nadała atrybut na stałe —
   więc „przecież Haiku działa" NIE dowodzi, że inne klucze działają.
3. **Nowy feed testuj Z SERWERA, nie z Maca.** TVN24 przez cały czas wyglądał na skonfigurowany
   i nie dał ANI JEDNEGO kandydata — 403 z IP datacenter, 200 z laptopa.
4. **Feed przez rss.app sprawdzaj LICZBĄ POZYCJI i DATĄ najnowszej**, nie kodem HTTP. Martwy mostek
   Yahoo Tech oddawał 200 z jedną pozycją sprzed dwóch dni — w monitoringu nie do odróżnienia od zdrowego.
5. **Bump `CACHE_NAME` przy każdej zmianie CSS/JS** — i pamiętaj, że sam bump nie wystarcza:
   świeżość daje `cache:'reload'` w SW.
6. **Nie dopisuj `knaga.html` do `robots.txt` ani `sitemap.xml`** — robots.txt jest publiczny
   i OGŁASZAŁby ścieżkę panelu.
7. **Panel szczegółów: nie zwężaj poniżej 440 px** bez sprawdzenia kafli notowań — kurczy się
   wyłącznie `.q-name`. `@media (max-width:460px)` dotyczy VIEWPORTU, nie tego panelu.
8. **Odrzucone: `rejected.json` UCZY FILTR** (ostatnie 40 wpisów) — pomyłka przy „Usuń" psuje
   selekcję na kolejne dni. Uwaga: wpis „zapowiedź przyszłego wydarzenia" prawdopodobnie kosił
   uchwałę Saylora o sprzedaży BTC za 5 mld USD (właściciel świadomie zostawił bez zmian).
9. **Link do X NIE idzie w treść posta** — X obcina zasięg. Parametr `url` usunięty CELOWO.

## Otwarte drobiazgi

- `bot-health.html` i `brief-health.html` — osierocone, do **przeniesienia do knagi**, a dopiero
  potem skasowania (ich zawartości NIE ma jeszcze w panelu, w odróżnieniu od lejka).
- Zdublowana linia `SUPABASE_SERVICE_KEY` w `bot_secrets.env` — nieszkodliwa (ta sama wartość).
- Przycisk „Udostępnij na X" jest w knadze, ale **na `index.html` dla czytelników NADAL GO NIE MA**.
- `x_post` od bota **nie istnieje** (0/70 itemów) — panel jedzie w całości na fallbacku `item.text`.

## Odrzucone pomysły (nie wracaj bez nowego powodu)

- **Logowanie Google** — za dużo setupu. Wybrane: e-mail + hasło.
- **Magic link / OTP** — mailer Supabase limitowany do ~2 maili/h.
- **Gotowiec `x_post` dla każdego newsa** — 96% do kosza. Zastąpione generowaniem na żądanie.
- **Gotowe liczniki (GoatCounter, Cloudflare Web Analytics, Plausible)** — odrzucone na rzecz
  własnego: domeny analityczne siedzą na listach adblocka (OneSignal już dziś bywa blokowany),
  a licznik z ciasteczkiem wymaga baneru zgody.
- **Przeniesienie domeny na Cloudflare** dla statystyk brzegowych — rozważone i odrzucone:
  zmiana NS dla całej domeny (dotknie też `flusso.`), ryzyko przestoju, a danych wstecz i tak nie odzyska.
- **Stała sól w liczniku wejść** (żeby liczyć unikalnych w tygodniu) — to zamienia licznik
  w śledzenie i wymusza baner zgody. „Unikalni w dobie" to świadoma cena.
