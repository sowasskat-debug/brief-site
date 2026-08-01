# Setup Supabase + logowanie e-mailem — kroki po stronie właściciela

Jednorazowo, ~10 minut. Bez tego panel nie ruszy — kod jest gotowy, ale nie ma czego wpiąć.
Po skończeniu przekaż do sesji **dwie wartości z kroku 4**.

Wszystko w darmowym tierze. **Żadnych maili nie wysyłamy** — konto zakładasz ręcznie,
więc nie ma tematu SMTP-a, limitów wysyłki ani linków aktywacyjnych.

---

## 1. Projekt Supabase

1. [supabase.com](https://supabase.com) → zaloguj się → **New project**.
2. Nazwa dowolna (np. `brifup`), hasło do bazy — **zapisz w menedżerze haseł**.
   (To hasło do samego Postgresa, nie do panelu. Przyda się rzadko.)
3. Region: **Frankfurt (eu-central-1)** — najbliżej Polski i Hetznera.
4. Sekcja **Security** na tym samym ekranie:

   | Opcja | Ustawienie | Dlaczego |
   |---|---|---|
   | **Enable Data API** | ✅ włączone | Panel czyta przez `supabase-js`; bez tego nie ma czym gadać z bazą |
   | **Automatically expose new tables** | ❌ wyłączone | Rekomendacja samego Supabase. Tabele wystawiamy świadomie |
   | **Enable automatic RLS** | ✅ włączone | Każda nowa tabela startuje z RLS — siatka na wypadek zapomnienia |

   ⚠️ Wyłączony auto-expose oznacza, że nowe tabele nie dostają uprawnień automatycznie —
   dlatego `supabase_schema.sql` zawiera jawne `GRANT`. Bez nich panel zobaczyłby
   „relation does not exist" mimo poprawnie ustawionego RLS.
5. Poczekaj aż projekt wstanie (~2 min).

## 2. Załóż sobie konto (ręcznie)

**Authentication → Users → Add user → Create new user**

- **Email:** `sowass@outlook.com`
  ⚠️ Musi się zgadzać co do znaku z `OWNER_EMAIL` w `knaga.html` i z e-mailem w politykach
  RLS w `supabase_schema.sql`. Inny adres = „Brak dostępu" mimo poprawnego hasła.
- **Password:** wygeneruj **długie, losowe** hasło w menedżerze haseł i tam je zostaw.
  To jedyny klucz do panelu — nie wymyślaj go z głowy i nigdzie nie wklejaj w czacie.
- ✅ **Auto Confirm User** — zaznacz. Bez tego Supabase czekałby na potwierdzenie mailem,
  a my świadomie nie konfigurujemy wysyłki.

## 3. Zamknij rejestrację

**Authentication → Sign In / Providers → Email**

- **Allow new users to sign up** → ❌ **wyłącz**

Klucz `anon` jest publiczny i siedzi jawnie w `knaga.html`, więc przy włączonej rejestracji
ktoś obcy mógłby założyć sobie konto w Twoim projekcie. Samego panelu by nie zobaczył
(RLS i tak sprawdza e-mail), ale nie ma powodu trzymać otwartych drzwi.

Przy okazji sprawdź, że **Confirm email** jest wyłączone albo nieistotne — konto masz już
potwierdzone z kroku 2, a nowych i tak nie będzie.

## 4. ⬅️ To przekaż do sesji Claude

**Settings → API Keys** (albo **Project Settings → Data API**):

| Co | Jak wygląda |
|---|---|
| **Project URL** | `https://<twoj-projekt>.supabase.co` |
| **klucz `anon` / `publishable`** | długi string `eyJ...` albo `sb_publishable_...` |

⚠️ **Oba są PUBLICZNE z założenia** — wchodzą do `knaga.html` w repo i każdy je zobaczy.
Dostępu pilnuje RLS na tabelach, nie tajność klucza. To normalny model Supabase, nie wpadka.

🔴 **Hasła z kroku 2 NIE przekazuj** — nigdzie nie jest mi potrzebne.

## 5. Tabele

Otwórz **SQL Editor** → wklej całą zawartość `supabase_schema.sql` → **Run**.
Skrypt jest idempotentny, można puszczać wielokrotnie.

Na końcu pliku jest **test RLS** — zrób go. Sprawdza od strony atakującego, czy dane
faktycznie są niewidoczne bez logowania. To jedyny sposób, żeby wiedzieć, że działa.

## 6. Hetzner — klucz dla bota (dopiero przy etapie „bot pisze do Supabase")

W tym samym miejscu co klucz `anon` jest **`service_role`** (albo `secret`).

🔴 **Ten jest TAJNY.** Omija całe RLS — kto go ma, czyta i pisze wszystko.
- **NIGDY** w repo, nigdy w `knaga.html`, nigdy we froncie, nie wklejaj go do czatu.
- Tylko na serwerze, w `/root/bot_secrets.env`:
  ```
  SUPABASE_URL=https://<twoj-projekt>.supabase.co
  SUPABASE_SERVICE_KEY=<klucz service_role>
  ```

## 7. Gotowiec pod X (Edge Function)

Panel generuje treść posta dopiero **w momencie kliknięcia „Wrzuć na X"** — 3-4 razy dziennie,
a nie dla wszystkich ~107 publikowanych newsów. Koszt DeepSeeka: ~$0,01/mies zamiast ~$1,50.

Robi to funkcja po stronie serwera, bo **klucz DeepSeeka nie może trafić do przeglądarki** —
strona jest publiczna, więc klucz w kodzie panelu byłby kluczem oddanym światu.

### 7a. Wdrożenie funkcji

**Prościej — przez panel Supabase:**
1. **Edge Functions** → **Deploy a new function** (albo **Create function**).
2. Nazwa: **`gotowiec-x`** — musi się zgadzać co do znaku, panel woła ją po nazwie.
3. Wklej całą zawartość `supabase/functions/gotowiec-x/index.ts` z tego repo.
4. **Deploy**.

**Albo przez CLI**, jeśli wolisz (z katalogu repo):
```
supabase functions deploy gotowiec-x
```

### 7b. Klucz DeepSeeka jako sekret

**Edge Functions → Secrets** (albo **Settings → Edge Functions**) → dodaj:

| Nazwa | Wartość |
|---|---|
| `DEEPSEEK_KEY` | ten sam klucz, którego używa bot (`/root/bot_secrets.env` na Hetznerze) |

🔴 **Tego klucza NIE wklejaj do czatu** — nie jest mi do niczego potrzebny. Kopiujesz go
z serwera prosto do Supabase.

Opcjonalnie `OWNER_EMAIL`, jeśli kiedyś zmienisz adres — domyślnie funkcja ma `sowass@outlook.com`
wpisane na sztywno.

### 7c. Sprawdzenie

W panelu kliknij **„Wrzuć na X"** przy dowolnym newsie:
- ✅ po ~2 s treść w okienku podmienia się na wygenerowanego gotowca
- ⚠️ „Gotowiec odrzucony: Bramka pokrycia…" — to **działa poprawnie**: model wymyślił liczbę,
  której nie ma w artykule, więc gotowiec został skasowany, a zostaje sam nagłówek.
  W poście finansowym zmyślona liczba jest gorsza niż brak gotowca.
- ❌ „Nie udało się wygenerować" — sprawdź, czy funkcja jest wdrożona pod nazwą `gotowiec-x`
  i czy sekret `DEEPSEEK_KEY` jest ustawiony (Edge Functions → Logs pokaże powód).

Panel **zawsze** działa: gdy generowanie padnie, w okienku zostaje sam nagłówek newsa
i możesz go wrzucić albo dopisać treść ręcznie.

---

## Jedno logowanie — i co za tym stoi

Logujesz się **wyłącznie e-mailem i hasłem**. Token GitHub wpisujesz **raz w życiu**:
panel zapisuje go w tabeli `sekrety` (RLS jak przy diagnostyce) i przy kolejnych wejściach
pobiera sam — także na innym urządzeniu.

Token jest w ogóle potrzebny, bo skasowanie newsa to commit do repo, a konto Supabase
nie ma do niego żadnych praw.

Kiedy panel zapyta o token ponownie:
- przy **pierwszym** użyciu (nic jeszcze nie zapisano),
- gdy GitHub go **odrzuci** — fine-grained tokeny wygasają. Panel wykryje 401/403, skasuje
  martwy wpis i poprosi o nowy. Bez tego widziałbyś w kółko „błąd 401".
- gdy sam klikniesz **„Zmień token"** w panelu (rotacja).

🔴 **Cena tej wygody:** token jest pobieralny zawsze, gdy jesteś zalogowany — wcześniej żył
tylko w otwartej karcie. Kto zdobędzie hasło do panelu, zdobywa razem z nim zapis do repo.
Dlatego token **musi być fine-grained i ograniczony do `Contents: Read and write` na jednym
repo `brief-site`** — nie klasyczny PAT do wszystkiego.

Wariant bez tego kompromisu (Edge Function trzymająca token po stronie serwera, token nigdy
nie trafia do przeglądarki) był rozważany i odłożony — jest bezpieczniejszy, ale to dłuższa robota.

## Czego ten setup NIE załatwia

Samo logowanie **nie chowa danych diagnostycznych**. Dopóki `lejek.json`, `bot_health.json`,
`brief_health.json` i `deepseek_usage.json` leżą w publicznym repo, każdy pobierze je
bezpośrednim URL-em — bramka na stronie HTML tego nie zmienia.

Realne schowanie = bot przestaje pushować te pliki i zapisuje je do Supabase (krok 6 i dalej).
Dopiero wtedy wolno skasować pliki z repo.

---

## 8. Licznik wejść (2026-08-01)

Do 2026-08-01 strona **nie liczyła wejść w żaden sposób** — nie było ani skryptu
analitycznego, ani logów. Warto to wiedzieć, zanim ktoś zacznie szukać danych wstecz:
**ich nie ma i nie da się ich odzyskać.** Licznik mierzy od chwili wdrożenia w przód.

Sprawdzone przy okazji: `brifup.com` **nie idzie przez Cloudflare** (NS to GoDaddy,
rekordy A wskazują wprost na GitHub Pages), więc statystyk brzegowych Cloudflare
też nie ma z czego wziąć.

### 8a. Tabela i agregat

Wklej **`supabase_schema.sql`** do SQL Editora jeszcze raz — sekcje **9** i **9b**
dokładają tabelę `wizyty`, RLS, retencję 90 dni i funkcję `statystyki_ruchu()`.
Plik jest idempotentny, więc puszczenie całości nic nie psuje.

### 8b. Wdrożenie funkcji

Jak przy `gotowiec-x`, ale nazwa **`licznik`**, treść z `supabase/functions/licznik/index.ts`.

🔴 **Jedyna różnica, i jest istotna: ta funkcja musi mieć wyłączoną weryfikację JWT.**
Woła ją przeglądarka **niezalogowanego czytelnika**, który żadnego tokenu nie ma.
Z domyślną weryfikacją każde wejście dostawałoby 401 i licznik pokazywałby zero.

- w panelu: przy tworzeniu funkcji odznacz **„Verify JWT with legacy secret"**
- z CLI: `supabase functions deploy licznik --no-verify-jwt`

⚠️ To NIE otwiera dostępu do danych. Funkcja tylko zapisuje i zwraca pustą odpowiedź
(204), a czytanie tabeli `wizyty` chroni RLS po e-mailu właściciela — tak samo jak przy
diagnostyce.

### 8c. Sekret z solą

**Edge Functions → Secrets** → dodaj:

| Nazwa | Wartość |
|---|---|
| `LICZNIK_SOL` | dowolny długi losowy ciąg, np. z `openssl rand -hex 32` |

🔴 **Nie wklejaj go do czatu.** Bez tego sekretu funkcja **świadomie nie zapisuje nic**
i loguje „Brak sekretu LICZNIK_SOL" — bo bez soli identyfikator odwiedzającego byłby
liczony z samego IP+UA, czyli byłby trwałym identyfikatorem człowieka. Wolimy nie
liczyć niczego niż zbierać to, czego obiecaliśmy nie zbierać.

⚠️ Zmiana soli zeruje ciągłość „unikalnych" na styku dni — nie podmieniaj jej bez powodu.

### 8d. Sprawdzenie

1. Wejdź na `https://brifup.com` (musi być **produkcja** — beacon celowo milczy na
   localhoście, żeby testy nie pompowały statystyk).
2. Supabase → SQL Editor: `select count(*) from public.wizyty;` → powinno rosnąć.
3. Panel `knaga.html` → zakładka **Ruch**.

Gdy liczba stoi na zerze, kolejność sprawdzania: logi funkcji (brak sekretu?) →
zakładka Network w przeglądarce (czy POST na `/functions/v1/licznik` wychodzi i czy
nie wraca 401 — 401 znaczy, że `--no-verify-jwt` nie zadziałało) → czy adblock nie
blokuje domeny `supabase.co`.

### 8e. Czego ten licznik NIE zrobi

- **Nie odtworzy przeszłości.** Liczy od dnia wdrożenia.
- **„Unikalni" to unikalni W DOBIE.** Sól zmienia się co dobę, więc ta sama osoba
  przez tydzień to 7 odwiedzin dobowych, nie 1. To cena za brak śledzenia między
  dniami — i powód, dla którego nie potrzeba baneru zgody. Nie „naprawiaj" tego
  stałą solą: wtedy zaczynasz śledzić ludzi i baner staje się wymagany.
- **Nie policzy tych, u których adblock zablokuje `supabase.co`.** Rzadsze niż przy
  domenach analitycznych, ale niezerowe — traktuj liczby jako dolne oszacowanie.
- **Nie liczy robotów** (filtr po User-Agent) ani wejść spoza `brifup.com`.
