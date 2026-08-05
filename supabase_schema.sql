-- ════════════════════════════════════════════════════════════════════════════
-- Brif.up — tabele diagnostyczne + RLS
-- Wklej CAŁOŚĆ do Supabase → SQL Editor → Run. Można puszczać wielokrotnie
-- (wszystko jest idempotentne: if not exists / drop policy if exists).
--
-- Po co: dziś lejek.json, bot_health.json, brief_health.json i deepseek_usage.json
-- leżą w publicznym repo — każdy pobiera je bezpośrednim URL-em. Po przeniesieniu
-- tutaj czyta je WYŁĄCZNIE właściciel, bo pilnuje tego RLS po e-mailu z tokena.
--
-- 🔴 Model uprawnień (nie mylić ról):
--   anon          — klucz publiczny we froncie. NIE dostaje dostępu do niczego poniżej.
--   authenticated — zalogowany e-mailem. Czyta TYLKO jeśli e-mail = WLASCICIEL.
--   service_role  — bot na Hetznerze. Omija RLS (BYPASSRLS), więc pisze bez polityk.
--                   Ten klucz jest TAJNY i nie ma prawa pojawić się we froncie.
-- ════════════════════════════════════════════════════════════════════════════

-- Zmieniasz właściciela? Podmień e-mail w KAŻDEJ polityce niżej (jest w 4 miejscach).
-- Świadomie nie chowam go w funkcji — jedna polityka mniej do debugowania,
-- a i tak zmienia się raz na nigdy.


-- ── 1. LEJEK ────────────────────────────────────────────────────────────────
-- Dziennik per-nagłówek: każdy kandydat z każdego RSS i jego los.
-- Kolumny typowane, bo panel po tym filtruje i szuka (status, feed, tytuł).
create table if not exists public.lejek (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null,
  feed      text,
  tytul     text,
  link      text,
  status    text,          -- odrzucony / telegram / main / poczekalnia / duplikat / powtorka / bramka / utknal
  tekst_pl  text,
  powod     text,
  wstawiono timestamptz not null default now()
);

-- Panel sortuje malejąco po czasie i filtruje po statusie — te dwa indeksy pokrywają oba widoki.
create index if not exists lejek_ts_idx     on public.lejek (ts desc);
create index if not exists lejek_status_idx on public.lejek (status);

-- Bot pisze ten sam wpis przy każdym biegu, dopóki kandydat nie dostanie finalnego losu.
-- Bez tego klucza powtórki dublowałyby się z każdym biegiem.
create unique index if not exists lejek_unikat_idx on public.lejek (ts, coalesce(link, ''), coalesce(tytul, ''));


-- ── 2-4. ZDROWIE I ZUŻYCIE ──────────────────────────────────────────────────
-- Wszystkie trzy to snapshoty per bieg: {ts, ...liczniki}. Liczniki DOCHODZĄ
-- (brief_health ma ich już kilkadziesiąt, plan „gotowiec pod X" dokłada kolejne dwa),
-- więc payload trzymamy jako jsonb — inaczej każdy nowy licznik w bocie
-- wymagałby migracji bazy. Dashboardy i tak czytają to jako worek liczb.
create table if not exists public.bot_health (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null,
  payload   jsonb not null,
  wstawiono timestamptz not null default now(),
  unique (ts)
);

create table if not exists public.brief_health (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null,
  payload   jsonb not null,
  wstawiono timestamptz not null default now(),
  unique (ts)
);

create table if not exists public.deepseek_usage (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null,
  payload   jsonb not null,
  wstawiono timestamptz not null default now(),
  unique (ts)
);

create index if not exists bot_health_ts_idx     on public.bot_health (ts desc);
create index if not exists brief_health_ts_idx   on public.brief_health (ts desc);
create index if not exists deepseek_usage_ts_idx on public.deepseek_usage (ts desc);


-- ── 5. RLS ──────────────────────────────────────────────────────────────────
-- Projekt zakładany z „Enable automatic RLS", ale włączamy jawnie —
-- tabela bez RLS jest czytelna dla każdego, kto zna klucz anon (a ten jest publiczny).
alter table public.lejek          enable row level security;
alter table public.bot_health     enable row level security;
alter table public.brief_health   enable row level security;
alter table public.deepseek_usage enable row level security;

-- Jedyna polityka na tabelę: SELECT dla zalogowanego, którego e-mail w tokenie
-- zgadza się z właścicielem. Brak polityk INSERT/UPDATE/DELETE jest CELOWY —
-- pisze wyłącznie bot kluczem service_role, który omija RLS.
drop policy if exists "wlasciciel czyta lejek" on public.lejek;
create policy "wlasciciel czyta lejek" on public.lejek
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel czyta bot_health" on public.bot_health;
create policy "wlasciciel czyta bot_health" on public.bot_health
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel czyta brief_health" on public.brief_health;
create policy "wlasciciel czyta brief_health" on public.brief_health
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel czyta deepseek_usage" on public.deepseek_usage;
create policy "wlasciciel czyta deepseek_usage" on public.deepseek_usage
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');


-- ── 6. UPRAWNIENIA ──────────────────────────────────────────────────────────
-- ⚠️ KONIECZNE, bo projekt ma wyłączone „Automatically expose new tables".
-- Bez tego panel dostanie „relation does not exist" mimo poprawnego RLS —
-- RLS filtruje wiersze, ale najpierw rola musi w ogóle mieć prawo do tabeli.
grant usage on schema public to authenticated, service_role;

grant select on public.lejek, public.bot_health, public.brief_health, public.deepseek_usage
  to authenticated;

grant select, insert, update, delete
  on public.lejek, public.bot_health, public.brief_health, public.deepseek_usage
  to service_role;

-- anon NIE dostaje nic. Klucz anon siedzi jawnie w knaga.html, więc każde uprawnienie
-- dla tej roli byłoby równoznaczne z publikacją danych — czyli tym, co właśnie chowamy.
revoke all on public.lejek, public.bot_health, public.brief_health, public.deepseek_usage
  from anon;


-- ── 6b. SEKRETY (token GitHub) ──────────────────────────────────────────────
-- Po co: skasowanie newsa to commit do repo, a konto Supabase nie ma praw do GitHuba.
-- Bez tej tabeli panel przy każdej sesji karty prosiłby o token osobno — czyli dwa
-- logowania zamiast jednego. Tu token leży raz, a panel pobiera go po zalogowaniu.
--
-- ⚠️ ŚWIADOMY KOMPROMIS: token jest pobieralny ZAWSZE, gdy właściciel jest zalogowany
-- (wcześniej żył tylko w otwartej karcie). Kto zdobędzie hasło do panelu, zdobywa też
-- zapis do repo. Dlatego token MUSI być fine-grained i ograniczony do
-- `Contents: Read and write` na JEDNYM repo (brief-site) — nie klasyczny PAT do wszystkiego.
-- Wariant bez tego kompromisu (Edge Function, token nigdy nie trafia do przeglądarki)
-- był rozważany i odłożony jako dłuższa robota.
create table if not exists public.sekrety (
  klucz     text primary key,       -- na razie jedyny: 'github_token'
  wartosc   text not null,
  zmieniono timestamptz not null default now()
);

alter table public.sekrety enable row level security;

-- Tu, w odróżnieniu od tabel diagnostycznych, właściciel musi też PISAĆ —
-- to panel zapisuje token, nie bot.
drop policy if exists "wlasciciel czyta sekrety" on public.sekrety;
create policy "wlasciciel czyta sekrety" on public.sekrety
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel dodaje sekrety" on public.sekrety;
create policy "wlasciciel dodaje sekrety" on public.sekrety
  for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel zmienia sekrety" on public.sekrety;
create policy "wlasciciel zmienia sekrety" on public.sekrety
  for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com')
  with check (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

-- DELETE jest potrzebny: gdy GitHub odrzuci token (wygasł/odwołany), panel kasuje
-- go sam i prosi o nowy. Bez tego zostałby martwy wpis blokujący logowanie.
drop policy if exists "wlasciciel kasuje sekrety" on public.sekrety;
create policy "wlasciciel kasuje sekrety" on public.sekrety
  for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

grant select, insert, update, delete on public.sekrety to authenticated;
revoke all on public.sekrety from anon;


-- ── 6c. KOSZ (pełne kopie usuniętych newsów) ────────────────────────────────
-- Po co: `rejected.json` trzyma tylko text/flag/reason/date, bo karmi filtr bota
-- (REGUŁA 0, ostatnie 40 wpisów) i ma być chudy. Do PRZYWRÓCENIA newsa to za mało —
-- zginęłyby source_url, impact, image_url, reach, category, subItems.
-- Dlatego pełny item ląduje tutaj, a rejected.json zostaje nietknięty.
--
-- Czemu w Supabase, a nie w repo: to dane robocze panelu, nikomu poza właścicielem
-- niepotrzebne, a każdy plik w repo jest publiczny.
create table if not exists public.kosz (
  id        bigint generated always as identity primary key,
  tekst     text not null,           -- klucz dopasowania do wpisu w rejected.json
  dawka     text,                    -- morning / afternoon / evening
  item      jsonb not null,          -- PEŁNY BriefItem, gotowy do wstawienia z powrotem
  usuniete  timestamptz not null default now()
);

create index if not exists kosz_usuniete_idx on public.kosz (usuniete desc);
-- Dopasowanie po tekście musi być szybkie — panel sprawdza dla każdego wpisu
-- rejected.json, czy da się go przywrócić.
create index if not exists kosz_tekst_idx on public.kosz (tekst);

alter table public.kosz enable row level security;

drop policy if exists "wlasciciel czyta kosz" on public.kosz;
create policy "wlasciciel czyta kosz" on public.kosz
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel dodaje kosz" on public.kosz;
create policy "wlasciciel dodaje kosz" on public.kosz
  for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

drop policy if exists "wlasciciel kasuje kosz" on public.kosz;
create policy "wlasciciel kasuje kosz" on public.kosz
  for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

grant select, insert, delete on public.kosz to authenticated;
revoke all on public.kosz from anon;


-- ── 7. RETENCJA ─────────────────────────────────────────────────────────────
-- Te same limity co dziś w plikach: lejek 3 dni / max 1500 wpisów, zdrowie 200 biegów.
-- Wołane przez bota po zapisie (jeden RPC), więc nie trzeba pg_cron.
create or replace function public.sprzatnij_diagnostyke()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.lejek where ts < now() - interval '3 days';

  delete from public.lejek
   where id not in (select id from public.lejek order by ts desc limit 1500);

  delete from public.bot_health
   where id not in (select id from public.bot_health order by ts desc limit 200);

  delete from public.brief_health
   where id not in (select id from public.brief_health order by ts desc limit 200);

  delete from public.deepseek_usage
   where id not in (select id from public.deepseek_usage order by ts desc limit 200);
end;
$$;

revoke all on function public.sprzatnij_diagnostyke() from public, anon, authenticated;
grant execute on function public.sprzatnij_diagnostyke() to service_role;


-- ════════════════════════════════════════════════════════════════════════════
-- 8. TEST RLS — ZRÓB GO, nie zakładaj że działa
--
-- Bramka w panelu HTML to tylko UI. Realna ochrona to polityki wyżej i jedyny
-- sposób, żeby wiedzieć, że działają, to sprawdzić je od strony atakującego.
--
-- (a) JAKO ANON — tak widzi to ktoś obcy z kluczem anon z knaga.html.
--     Wklej w terminalu, podstawiając URL projektu i klucz anon:
--
--       curl "https://<projekt>.supabase.co/rest/v1/lejek?select=*&limit=5" \
--            -H "apikey: <klucz anon>"
--
--     ✅ POPRAWNIE: pusta tablica [] albo błąd uprawnień.
--     ❌ WPADKA: jakiekolwiek wiersze. Wtedy NIE usuwaj plików z repo —
--        dane byłyby dalej publiczne, tylko trudniej je było znaleźć.
--
-- (b) W SQL Editorze (działa jako service_role, czyli OMIJA RLS — dlatego
--     nie nadaje się na test dostępu, tylko na sprawdzenie czy dane doszły):
--
--       select count(*) from public.lejek;
--
-- (c) Kontrola, że polityki faktycznie stoją tam, gdzie myślisz:
--
--       select tablename, policyname, roles, cmd
--         from pg_policies where schemaname = 'public' order by tablename;
--
--     Spodziewane: 8 wierszy, wszystkie roles = {authenticated}:
--       lejek / bot_health / brief_health / deepseek_usage — po jednym, cmd = SELECT
--       sekrety — cztery: SELECT, INSERT, UPDATE, DELETE (panel musi tam PISAĆ token).
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- 9. LICZNIK WIZYT (2026-08-01)
--
-- Po co osobna tabela, skoro istnieje diagnostyka: tamte tabele to snapshoty
-- BOTA per bieg. To są odwiedziny CZYTELNIKÓW — inne źródło, inna retencja,
-- inna kadencja (zapis przy każdym wejściu, nie raz na godzinę).
--
-- 🔴 PRYWATNOŚĆ — dlaczego NIE MA tu baneru cookies i dlaczego nie musi być:
--   nie zapisujemy IP, nie stawiamy ciasteczka i nie używamy localStorage.
--   `odwiedzajacy` to sha256(IP + User-Agent + SÓL DNIA), liczone w Edge Function;
--   surowe IP nigdy nie opuszcza funkcji i nigdzie nie ląduje. Sól zmienia się
--   co dobę, więc ten sam człowiek ma INNY hash jutro — nie da się go śledzić
--   między dniami ani cofnąć hasha do adresu. To ta sama konstrukcja, której
--   używa Plausible; przy niej RODO nie wymaga zgody, bo nie ma danych osobowych.
--   ⚠️ Konsekwencja, o której trzeba pamiętać przy czytaniu liczb: „unikalni"
--   są liczeni W OBRĘBIE DOBY. Suma unikalnych z 7 dni ≠ unikalni z tygodnia
--   (ta sama osoba wchodząca 7 dni z rzędu liczy się 7 razy). To świadoma cena
--   za brak śledzenia — nie próbuj tego „naprawiać" stałą solą.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.wizyty (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),
  dzien        date not null,          -- doba wg Europe/Warsaw, liczona w funkcji
  sciezka      text not null,          -- '/', '/fala.html' … bez query i bez hasha
  odwiedzajacy text not null,          -- sha256(IP + UA + sól dnia) — patrz nagłówek
  referrer     text,                   -- SAM host ('news.google.com'), nigdy pełny URL
  urzadzenie   text,                   -- 'mobile' / 'desktop'
  wstawiono    timestamptz not null default now()
);

-- Panel liczy „ile dziś / ile w tym tygodniu" i rozbija na strony — te trzy pokrywają wszystko.
create index if not exists wizyty_dzien_idx    on public.wizyty (dzien desc);
create index if not exists wizyty_ts_idx       on public.wizyty (ts desc);
create index if not exists wizyty_unikat_idx   on public.wizyty (dzien, odwiedzajacy);

alter table public.wizyty enable row level security;

-- Ta sama zasada co przy diagnostyce: czyta WYŁĄCZNIE właściciel.
-- Brak polityki INSERT jest CELOWY — pisze Edge Function kluczem service_role,
-- który omija RLS. Gdyby INSERT dostała rola anon, każdy mógłby nabijać licznik
-- prosto z konsoli, z pominięciem funkcji i jej hashowania.
drop policy if exists "wlasciciel czyta wizyty" on public.wizyty;
create policy "wlasciciel czyta wizyty" on public.wizyty
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'sowass@outlook.com');

grant select on public.wizyty to authenticated;
grant select, insert, update, delete on public.wizyty to service_role;
revoke all on public.wizyty from anon;


-- Retencja 90 dni. ⚠️ Świadomie NIE dokładam tego do `sprzatnij_diagnostyke()`:
-- tamtą woła BOT po zapisie diagnostyki, a bot jeszcze nie pisze do Supabase
-- (STAN.md, punkt 1) — licznik czekałby na cudzą migrację, żeby zacząć sprzątać.
-- Osobna funkcja, wołana przez Edge Function co ~200. wejście, działa od pierwszego dnia.
create or replace function public.sprzatnij_wizyty()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.wizyty where ts < now() - interval '90 days';
end;
$$;

revoke all on function public.sprzatnij_wizyty() from public, anon, authenticated;
grant execute on function public.sprzatnij_wizyty() to service_role;


-- ── 9b. AGREGAT DLA PANELU ──────────────────────────────────────────────────
-- Po co RPC, skoro panel mógłby pobrać wiersze i policzyć w JS: PostgREST tnie
-- odpowiedź na `max_rows` (domyślnie 1000 w Supabase), więc przy kilkuset wejściach
-- dziennie panel po tygodniu po cichu pokazywałby OBCIĘTE liczby — a wyglądałyby
-- na prawdziwe. Agregat liczy baza, więc limit wierszy nie ma tu żadnego znaczenia.
--
-- ⚠️ `security invoker` (a NIE definer) jest tu celowe: funkcja ma działać w imieniu
-- wołającego, żeby RLS na `wizyty` dalej obowiązywał. Z `definer` każdy zalogowany
-- omijałby politykę właściciela i czytałby statystyki.
create or replace function public.statystyki_ruchu(dni int default 30)
returns jsonb
language sql
security invoker
stable
as $$
  with zakres as (
    select * from public.wizyty
     where dzien > ((now() at time zone 'Europe/Warsaw')::date - dni)
  )
  select jsonb_build_object(
    'dni', coalesce((
      select jsonb_agg(jsonb_build_object('dzien', dzien, 'wyswietlenia', w, 'unikalni', u)
                       order by dzien desc)
        from (select dzien, count(*) w, count(distinct odwiedzajacy) u
                from zakres group by dzien) d
    ), '[]'::jsonb),
    'strony', coalesce((
      select jsonb_agg(jsonb_build_object('sciezka', sciezka, 'wyswietlenia', w) order by w desc)
        from (select sciezka, count(*) w from zakres group by sciezka order by w desc limit 15) s
    ), '[]'::jsonb),
    'zrodla', coalesce((
      select jsonb_agg(jsonb_build_object('host', referrer, 'wyswietlenia', w) order by w desc)
        from (select referrer, count(*) w from zakres
               where referrer is not null group by referrer order by w desc limit 15) z
    ), '[]'::jsonb),
    'urzadzenia', coalesce((
      -- ⚠️ `coalesce` NIE jest kosmetyką: jsonb_object_agg rzuca „field name must not be null"
      -- przy pustym kluczu i wywaliłby CAŁĄ zakładkę Ruch, nie jeden kafel. Dziś Edge Function
      -- zawsze ustawia urządzenie, więc to zabezpieczenie na wiersz z innej drogi (ręczny
      -- insert, przyszła zmiana). Złapane lokalnym testem, nie na produkcji.
      select jsonb_object_agg(coalesce(urzadzenie, 'nieznane'), w)
        from (select urzadzenie, count(*) w from zakres group by urzadzenie) u
    ), '{}'::jsonb),
    -- Liczone osobno, bo „unikalni w okresie" to NIE suma unikalnych z dni
    -- (sól zmienia się co dobę — patrz sekcja 9). Podajemy oba, żeby panel
    -- mógł uczciwie pokazać, że to różne wielkości.
    'suma_wyswietlen', (select count(*) from zakres),
    'suma_odwiedzin_dobowych', (select count(distinct (dzien, odwiedzajacy)) from zakres),
    -- Rozbicie sygnału (2026-08-05, sekcja 9d). ⚠️ `suma_wyswietlen` CELOWO zostaje
    -- sumą obu — zmiana definicji zrobiłaby uskok na wykresie, który wyglądałby jak
    -- spadek ruchu, a nie jak zmiana licznika. To jest rozbicie, nie nowa miara.
    'wejscia',    (select count(*) from zakres where typ = 'wejscie'),
    'wznowienia', (select count(*) from zakres where typ = 'wznowienie'),
    'typ_od',     (select min(dzien) from zakres where typ = 'wznowienie')
  );
$$;

revoke all on function public.statystyki_ruchu(int) from public, anon;
grant execute on function public.statystyki_ruchu(int) to authenticated;


-- ── 9c. POWROTY, SESJE, PORY DNIA (2026-08-05) ──────────────────────────────
-- Zgłoszenie właściciela: „bardziej szczegółowy panel z wyświetleniami, np. ile
-- razy ktoś wracał ponownie". Pytanie rozpada się na dwa i tylko jedno dało się
-- odpowiedzieć z danych, które już były:
--   (a) POWROTY W DOBIE — ten sam hash kilka razy tego samego dnia. Policzalne
--       wstecz, bez żadnej zmiany mechanizmu.
--   (b) POWROTY MIĘDZY DNIAMI — niepoliczalne z definicji, bo hash rotuje co dobę.
--       Stąd dwie nowe kolumny, wypełniane przez Edge Function przy zapisie.
--
-- 🔴 `powrot_dni` to LICZBA (1-7) „ostatnio był tyle dni temu", a NIE identyfikator:
--    nie da się po niej pogrupować wierszy tej samej osoby ani jej rozpoznać.
--    Porównanie hashy robi funkcja w pamięci i materiał do niego ginie z żądaniem —
--    szczegóły i granica tej konstrukcji w nagłówku supabase/functions/licznik/index.ts.
-- ⚠️ Obie kolumny są wypełniane od DNIA WDROŻENIA. Starsze wiersze mają NULL
--    i dlatego panel liczy retencję wyłącznie po `pierwsza_dnia = true` — inaczej
--    stare dane rozwodniłyby mianownik i procent wyszedłby zaniżony bez ostrzeżenia.
alter table public.wizyty add column if not exists pierwsza_dnia boolean not null default false;
alter table public.wizyty add column if not exists powrot_dni    smallint;

-- Sprawdzenie powrotu pyta po samym hashu w oknie 7 dni; istniejący indeks
-- (dzien, odwiedzajacy) prowadzi kolumnami w złej kolejności dla tego zapytania.
create index if not exists wizyty_odw_idx on public.wizyty (odwiedzajacy, dzien desc);

create or replace function public.statystyki_powrotow(dni int default 30)
returns jsonb
language sql
security invoker
stable
as $$
  with zakres as (
    select dzien, odwiedzajacy, sciezka, ts, pierwsza_dnia, powrot_dni
      from public.wizyty
     where dzien > ((now() at time zone 'Europe/Warsaw')::date - dni)
  ),
  -- ⚠️ Jednostką jest CZYTELNIKO-DOBA, nie człowiek: hash rotuje co dobę, więc
  -- ta sama osoba w dwa dni to dwa wiersze i nie wolno ich sumować jako „ludzi".
  na_dobe as (
    select dzien, odwiedzajacy,
           count(*)                as odslon,
           count(distinct sciezka) as stron
      from zakres group by dzien, odwiedzajacy
  ),
  -- Sesja = ciąg odsłon bez przerwy dłuższej niż 30 minut (próg branżowy).
  -- Granica zweryfikowana testem: przerwa 29 min zostaje w sesji, 31 min ją tnie.
  ze_znacznikiem as (
    select dzien, odwiedzajacy, ts,
           case when ts - lag(ts) over (partition by dzien, odwiedzajacy order by ts)
                     > interval '30 minutes'
                  or lag(ts) over (partition by dzien, odwiedzajacy order by ts) is null
                then 1 else 0 end as nowa
      from zakres
  ),
  ponumerowane as (
    select dzien, odwiedzajacy, ts,
           sum(nowa) over (partition by dzien, odwiedzajacy order by ts
                           rows between unbounded preceding and current row) as nr
      from ze_znacznikiem
  ),
  sesje as (
    select dzien, odwiedzajacy, nr, count(*) as odslon,
           extract(epoch from (max(ts) - min(ts))) / 60.0 as minut
      from ponumerowane group by dzien, odwiedzajacy, nr
  ),
  sesji_na_czytelnika as (
    select dzien, odwiedzajacy, count(*) as ile from sesje group by dzien, odwiedzajacy
  )
  select jsonb_build_object(
    'czytelnikodni',      (select count(*) from na_dobe),
    'wracajacy_w_dobie',  (select count(*) from na_dobe where odslon >= 2),
    'rozklad_wejsc', coalesce((
      select jsonb_agg(jsonb_build_object('koszyk', koszyk, 'ile', ile) order by kolejnosc)
        from (select case when odslon = 1 then '1 wejście'
                          when odslon between 2 and 3 then '2-3'
                          when odslon between 4 and 9 then '4-9'
                          else '10 i więcej' end as koszyk,
                     case when odslon = 1 then 1 when odslon between 2 and 3 then 2
                          when odslon between 4 and 9 then 3 else 4 end as kolejnosc,
                     count(*) as ile
                from na_dobe group by 1, 2) r
    ), '[]'::jsonb),
    'rozklad_stron', coalesce((
      select jsonb_agg(jsonb_build_object('koszyk', koszyk, 'ile', ile) order by kolejnosc)
        from (select case when stron = 1 then '1 strona' when stron = 2 then '2 strony'
                          else '3 i więcej' end as koszyk,
                     case when stron = 1 then 1 when stron = 2 then 2 else 3 end as kolejnosc,
                     count(*) as ile
                from na_dobe group by 1, 2) s
    ), '[]'::jsonb),
    'sesji',                  (select count(*) from sesje),
    'sesji_odslon_sr',        (select round(avg(odslon)::numeric, 2) from sesje),
    'sesji_jednoodslonowych', (select count(*) from sesje where odslon = 1),
    -- ⚠️ Czas WYŁĄCZNIE z sesji o ≥2 odsłonach: przy jednej odsłonie nie ma drugiego
    -- znacznika, więc taka sesja wyszłaby jako 0 minut i zjechałaby średnią do zera.
    -- To nie jest „czas na stronie" — ostatniej odsłony nikt nie domyka.
    'sesji_minut_mediana',    (select round(percentile_cont(0.5) within group (order by minut)::numeric, 1)
                                 from sesje where odslon >= 2),
    -- ⚠️ Próbka MUSI iść razem z medianą. Sesje o ≥2 odsłonach powstają niemal wyłącznie
    -- z przejść między STRONAMI serwisu w ciągu pół godziny, a takie wizyty są rzadkie —
    -- bez tej liczby panel podawałby „4 min" wyliczone z trzech sesji jako fakt o ruchu.
    'sesji_minut_n',          (select count(*) from sesje where odslon >= 2),
    'wielosesyjnych',         (select count(*) from sesji_na_czytelnika where ile >= 2),
    -- Retencja: mianownikiem są WYŁĄCZNIE pierwsze wejścia doby zapisane już przez
    -- nową funkcję (starsze wiersze mają pierwsza_dnia=false), więc procent liczy się
    -- z mniejszej, ale uczciwej próby zamiast po cichu wliczać dane sprzed wdrożenia.
    'retencja_baza',          (select count(*) from zakres where pierwsza_dnia),
    'retencja_wrocilo',       (select count(*) from zakres where pierwsza_dnia and powrot_dni is not null),
    'retencja_od',            (select min(dzien) from zakres where pierwsza_dnia),
    'retencja_rozklad', coalesce((
      select jsonb_agg(jsonb_build_object('dni', powrot_dni, 'ile', ile) order by powrot_dni)
        from (select powrot_dni, count(*) as ile from zakres
               where pierwsza_dnia and powrot_dni is not null group by powrot_dni) p
    ), '[]'::jsonb),
    'godziny', coalesce((
      select jsonb_agg(jsonb_build_object('godzina', g, 'wyswietlenia', coalesce(w, 0)) order by g)
        from generate_series(0, 23) g
        left join (select extract(hour from ts at time zone 'Europe/Warsaw')::int as h,
                          count(*) as w from zakres group by 1) x on x.h = g
    ), '[]'::jsonb),
    'dni_tygodnia', coalesce((
      select jsonb_agg(jsonb_build_object('dzien', d, 'wyswietlenia', coalesce(w, 0)) order by d)
        from generate_series(0, 6) d
        left join (select extract(isodow from ts at time zone 'Europe/Warsaw')::int - 1 as dt,
                          count(*) as w from zakres group by 1) y on y.dt = d
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.statystyki_powrotow(int) from public, anon;
grant execute on function public.statystyki_powrotow(int) to authenticated;


-- ── 9d. RODZAJ SYGNAŁU: wejście vs wznowienie apki (2026-08-05) ─────────────
-- Zgłoszenie właściciela przy pierwszym spojrzeniu na kafel „Sesje": liczby były
-- prawdziwe, ale dwie miary mówiły to samo. Diagnoza: beacon zgłasza wznowienie
-- apki dopiero po 30 minutach od poprzedniego sygnału, a sesja tnie się dokładnie
-- na tym samym progu — więc KAŻDE wznowienie z definicji zaczynało nową sesję
-- i „sesje" zlewały się z „odsłonami".
--
-- Sesje dalej poprawnie grupują WIELE ZAŁADOWAŃ STRON (te nie mają throttlingu:
-- '/' → '/fala.html' w odstępie 2 minut to jedna sesja o dwóch odsłonach), więc
-- mechanizm nie jest zepsuty — jest ślepy wyłącznie na powroty do otwartej apki.
--
-- 🔴 CZEGO TA KOLUMNA NIE ZMIENIA: „wyświetlenia" liczą się DALEJ ze WSZYSTKICH
--    sygnałów, tak jak dotąd. Rozdzielenie służy rozbiciu i przyszłej zmianie progu
--    beacona — gdyby ktoś kiedyś skrócił throttling wznowień, bez tej kolumny
--    napompowałby licznik odsłon i wyglądałoby to na wzrost ruchu.
-- ⚠️ Stare wiersze dostają 'wejscie' (default). To ZAŁOŻENIE, nie pomiar: przed tą
--    zmianą nie ma czym odróżnić wznowienia od wejścia. Rozbicie jest więc wiarygodne
--    dopiero od dnia wdrożenia — panel podaje datę, od której realnie rozróżnia.
alter table public.wizyty add column if not exists typ text not null default 'wejscie';

-- Zawężamy do dwóch wartości: kolumnę wypełnia publiczny endpoint, więc bez tego
-- dowolny POST mógłby wstrzyknąć własną etykietę i rozsypać rozbicie w panelu.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wizyty_typ_check') then
    alter table public.wizyty add constraint wizyty_typ_check
      check (typ in ('wejscie', 'wznowienie'));
  end if;
end $$;

-- Od kiedy rozbicie jest realnym pomiarem, a nie domyślną wartością kolumny.
create or replace function public.rozroznia_typ_od()
returns date
language sql
security invoker
stable
as $$
  select min(dzien) from public.wizyty where typ = 'wznowienie';
$$;

revoke all on function public.rozroznia_typ_od() from public, anon;
grant execute on function public.rozroznia_typ_od() to authenticated;
