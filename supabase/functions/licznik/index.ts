// ════════════════════════════════════════════════════════════════════════════
// Edge Function: licznik wejść na stronę
//
// Po co własny licznik, skoro są gotowce (GoatCounter, Cloudflare, Plausible):
//   (1) adblock. Domeny analityczne siedzą na listach filtrów — OneSignal już
//       dziś bywa blokowany u naszych czytelników (patrz CLAUDE.md, sekcja
//       OneSignal), więc gotowiec pokazywałby ułamek ruchu i nie wiedzielibyśmy
//       jaki. Supabase jest na tych listach nieporównanie rzadziej.
//   (2) baner cookies. Każdy licznik z ciasteczkiem albo identyfikatorem w
//       localStorage wymaga zgody. Ten nie stawia żadnego — patrz niżej.
//   (3) dane zostają u nas, w tej samej bazie co reszta panelu.
//
// 🔴 CZEGO TA FUNKCJA NIE ROBI — i to jest cecha, nie brak:
//   nie zapisuje IP, nie stawia ciasteczka, nie czyta localStorage.
//   `odwiedzajacy` = sha256(IP + User-Agent + sól dnia). Surowe IP żyje wyłącznie
//   w pamięci tej funkcji przez czas jednego żądania i NIGDZIE nie jest zapisywane.
//   Sól zmienia się co dobę → ten sam człowiek ma jutro inny hash, więc nie da
//   się go śledzić między dniami ani odzyskać z hasha adresu.
//   ⚠️ Konsekwencja: „unikalni" są liczeni W OBRĘBIE DOBY (szczegóły w
//   supabase_schema.sql, sekcja 9). Nie da się z tego policzyć unikalnych
//   za tydzień i to jest świadoma cena za brak śledzenia.
//
// ── POWROTY MIĘDZY DNIAMI (2026-08-05, decyzja właściciela) ─────────────────
// Pytanie „czy ludzie do nas wracają" było nieodpowiadalne: hash dobowy z definicji
// nie łączy się z jutrzejszym. Rozwiązanie, które NIE wprowadza identyfikatora:
// przy zapisie liczymy hashe TEGO SAMEGO człowieka dla 7 poprzednich dób (formuła
// jest ta sama, zmienia się tylko data w środku) i sprawdzamy, czy któryś już
// w bazie leży. Do wiersza trafia wyłącznie `powrot_dni` — LICZBA (1-7) mówiąca
// „ostatnio był tyle dni temu" — i `pierwsza_dnia`.
// 🔴 CO SIĘ PRZEZ TO ZMIENIA, uczciwie: w bazie dalej nie ma nic, co łączy wiersze
//   tej samej osoby z dwóch dni — `powrot_dni` to liczba, nie identyfikator, i nie
//   da się po niej pogrupować ludzi. Ale ta funkcja przez czas jednego żądania
//   POTRAFI policzyć wczorajszy hash, czego wcześniej nie robiła. Kto by kiedyś
//   chciał ten hash ZAPISAĆ — dostaje trwały identyfikator i wraca obowiązek
//   baneru zgody. Nie rób tego; wartość tej konstrukcji polega właśnie na tym,
//   że wynik porównania jest liczbą, a materiał do porównania ginie z pamięcią.
// ⚠️ Zmiana sekretu LICZNIK_SOL zrywa też ciągłość powrotów (stare hashe przestają
//   pasować) — przez 7 dni po podmianie wszyscy wyglądają na nowych.
// ⚠️ Powroty są DOLNYM oszacowaniem: hash zawiera IP, a na komórce IP zmienia się
//   między dniami sam z siebie. Ten sam człowiek na innym adresie = nowy człowiek.
//
// WDROŻENIE — patrz SETUP_SUPABASE.md, sekcja „Licznik wejść".
// Wymaga sekretu LICZNIK_SOL (Supabase → Edge Functions → Secrets).
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SOL = Deno.env.get('LICZNIK_SOL') ?? '';

// Beacon leci z przeglądarki czytelnika, więc origin jest dowolny.
// Funkcja niczego nie zwraca i niczego nie czyta — nie ma tu czego chronić originem.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Odpowiedź jest CELOWO pusta. Front i tak ją ignoruje, a każdy zwrócony szczegół
// (ile mamy wejść, czy hash się powtórzył) byłby wyciekiem przez publiczny endpoint.
const pusto = (status = 204) => new Response(null, { status, headers: CORS });

// Roboty potrafią wygenerować więcej „wejść" niż ludzie. Bez tego filtra licznik
// mierzyłby głównie crawlery Google/Bing/AI i liczba nie znaczyłaby nic.
const ROBOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|monitor/i;

async function sha256(tekst: string): Promise<string> {
  const bufor = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
  return Array.from(new Uint8Array(bufor)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Doba wg Warszawy, nie UTC — inaczej wejścia między 00:00 a 02:00 czasu polskiego
// wpadałyby do POPRZEDNIEGO dnia i „dziś" w panelu nie zgadzałoby się z zegarem
// właściciela. Ta sama pułapka co z `todayLocalISO()` na froncie (2026-07-22).
function dzienWarszawski(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Ile dób wstecz sprawdzamy powrót. 7 to jeden pełny tydzień — dłuższy horyzont
// to dłuższa lista hashy w zapytaniu, a odpowiedź „wrócił po 3 tygodniach" i tak
// niewiele wnosi przy serwisie, który wydaje trzy dawki dziennie.
const HORYZONT_POWROTU = 7;

// ⚠️ Odejmowanie dób liczone od POŁUDNIA UTC, nie od „teraz minus 24 h": przy zmianie
// czasu doba ma 23 albo 25 godzin i naiwne odejmowanie potrafi wylądować na tej samej
// dacie (albo przeskoczyć o dwie). Kotwica w środku dnia jest od tego odporna.
function dzienWarszawskiMinus(dzien: string, ile: number): string {
  const kotwica = Date.parse(`${dzien}T12:00:00Z`) - ile * 86400000;
  return new Date(kotwica).toISOString().slice(0, 10);
}

function roznicaDni(od: string, doDnia: string): number {
  return Math.round((Date.parse(`${doDnia}T12:00:00Z`) - Date.parse(`${od}T12:00:00Z`)) / 86400000);
}

// Zostawiamy sam host. Pełny URL referrera bywa nośnikiem danych osobowych
// (parametry sesji, zapytania wyszukiwarki), a do „skąd przyszli" wystarcza host.
function samHost(ref: string): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    // Wejście z własnej strony to nawigacja wewnętrzna, nie źródło ruchu.
    return host.endsWith('brifup.com') ? null : host;
  } catch { return null; }
}

function oczysc(sciezka: string): string {
  try {
    // Bierzemy sam pathname — query i hash odpadają (hash to u nas deep link do newsa,
    // czyli potencjalnie długi i zmienny; nie chcemy tysięcy unikalnych „stron").
    const p = new URL(sciezka, 'https://brifup.com').pathname.toLowerCase();
    const czysty = p.replace(/[^a-z0-9/._-]/g, '');
    return (czysty || '/').slice(0, 100);
  } catch { return '/'; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return pusto(405);

  // Brak soli = liczylibyśmy po samym IP+UA, czyli po stabilnym identyfikatorze.
  // Wolę nie liczyć nic niż zbierać coś, czego obiecaliśmy nie zbierać.
  // (W logach funkcji widać powód; front i tak ignoruje odpowiedź.)
  if (!SOL) {
    console.error('[LICZNIK] Brak sekretu LICZNIK_SOL — nie zapisuję wejścia.');
    return pusto(500);
  }

  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || ROBOT.test(ua)) return pusto();   // robot — cicho, bez zapisu

  let body: { sciezka?: string; referrer?: string; typ?: string };
  try { body = await req.json(); } catch { return pusto(400); }

  // x-forwarded-for bywa listą („klient, proxy1, proxy2") — klient jest pierwszy.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
          || req.headers.get('cf-connecting-ip')
          || 'nieznane';

  const dzien = dzienWarszawski();
  const odwiedzajacy = await sha256(`${ip}|${ua}|${SOL}|${dzien}`);

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Powrót: czy ten sam człowiek był tu w ciągu ostatnich 7 dób ────────────
  // Jedno zapytanie na odsłonę (indeks `wizyty_odw_idx`). FAIL-SAFE: gdy sprawdzenie
  // padnie, zapisujemy odsłonę BEZ danych o powrocie — statystyka ruchu nie może
  // zależeć od dodatkowej statystyki. `pierwsza_dnia=false` jest wtedy celowo
  // zachowawcze: wiersz nie wejdzie do mianownika retencji, więc procent policzy
  // się z mniejszej próby, ale nie skłamie.
  let pierwszaDnia = false;
  let powrotDni: number | null = null;
  try {
    const wczesniejsze: string[] = [];
    for (let i = 1; i <= HORYZONT_POWROTU; i++) {
      wczesniejsze.push(await sha256(`${ip}|${ua}|${SOL}|${dzienWarszawskiMinus(dzien, i)}`));
    }
    const { data: slady, error: bladSladow } = await supa
      .from('wizyty')
      .select('dzien, odwiedzajacy')
      .in('odwiedzajacy', [odwiedzajacy, ...wczesniejsze])
      .gte('dzien', dzienWarszawskiMinus(dzien, HORYZONT_POWROTU));
    if (bladSladow) throw bladSladow;

    // Hash jest z definicji przypisany do konkretnej doby, więc trafienie na hash
    // sprzed N dni może pochodzić wyłącznie z wiersza tamtej doby — nie trzeba
    // dopasowywać pary (hash, data), wystarczy wziąć najświeższy dzień z trafień.
    pierwszaDnia = !(slady ?? []).some((s) => s.odwiedzajacy === odwiedzajacy);
    if (pierwszaDnia) {
      const dniWstecz = (slady ?? [])
        .filter((s) => s.odwiedzajacy !== odwiedzajacy)
        .map((s) => roznicaDni(String(s.dzien), dzien))
        .filter((d) => d >= 1 && d <= HORYZONT_POWROTU);
      if (dniWstecz.length) powrotDni = Math.min(...dniWstecz);
    }
  } catch (e) {
    console.error('[LICZNIK] Sprawdzenie powrotu nieudane:', (e as Error).message);
  }

  const { error } = await supa.from('wizyty').insert({
    dzien,
    sciezka: oczysc(String(body.sciezka ?? '/')),
    odwiedzajacy,
    referrer: samHost(String(body.referrer ?? '')),
    urzadzenie: /mobile|android|iphone|ipad|ipod/i.test(ua) ? 'mobile' : 'desktop',
    pierwsza_dnia: pierwszaDnia,
    powrot_dni: powrotDni,
    // ⚠️ Whitelista, nie przepisanie tego, co przyszło: endpoint jest publiczny, a kolumna
    // ma w bazie `check (typ in (...))`. Nieznana etykieta zostałaby ODRZUCONA przez bazę
    // i całe wejście przepadłoby — dlatego wszystko spoza listy ląduje jako 'wejscie'.
    // Starsza wersja strony (z cache) nie wysyła pola w ogóle i też trafia na 'wejscie'.
    typ: body.typ === 'wznowienie' ? 'wznowienie' : 'wejscie',
  });

  if (error) console.error('[LICZNIK] Zapis nieudany:', error.message);

  // Retencja bez pg_cron i bez czekania na migrację bota: co ~200. wejście
  // sprzątamy starsze niż 90 dni. Przy kilkuset wejściach dziennie wypada
  // to kilka razy na dobę — wystarczająco, a nie obciąża każdego żądania.
  if (Math.random() < 0.005) {
    const { error: bladSprzatania } = await supa.rpc('sprzatnij_wizyty');
    if (bladSprzatania) console.error('[LICZNIK] Sprzątanie nieudane:', bladSprzatania.message);
  }

  return pusto();
});
