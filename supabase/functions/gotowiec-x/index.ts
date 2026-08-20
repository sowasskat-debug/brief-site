// ════════════════════════════════════════════════════════════════════════════
// Edge Function: gotowiec pod X, generowany NA ŻĄDANIE
//
// Po co osobna funkcja, skoro panel mógłby wołać DeepSeeka sam:
// klucz DeepSeeka nie może trafić do przeglądarki. Strona jest publiczna, więc
// klucz w kodzie = klucz oddany światu i każdy pali cudze tokeny. Bramka logowania
// tego nie zmienia — klucz i tak wysyła się do przeglądarki, zanim cokolwiek sprawdzimy.
// Tutaj siedzi po stronie serwera i nigdy jej nie opuszcza.
//
// Dlaczego NA ŻĄDANIE, a nie w bocie dla każdego newsa (pierwotny plan):
// bot publikuje ~107 newsów dziennie, a właściciel wrzuca na X 3-4. Generowanie
// gotowca dla wszystkich to 96% pracy do kosza — $1,11-1,58/mies zamiast ~$0,01.
//
// WDROŻENIE — patrz SETUP_SUPABASE.md, sekcja „Gotowiec pod X".
// Wymaga sekretu DEEPSEEK_KEY (Supabase → Edge Functions → Secrets).
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OWNER_EMAIL = (Deno.env.get('OWNER_EMAIL') ?? 'sowass@outlook.com').toLowerCase();
const DEEPSEEK_KEY = Deno.env.get('DEEPSEEK_KEY') ?? '';

// Druga droga uwierzytelnienia: BOT (2026-08-12).
// Automat publikujący na X potrzebuje tego samego gotowca co knaga, ale nie ma i nie może mieć
// sesji właściciela — jest procesem cronowym na Hetznerze. Bez tej ścieżki dostawałby 403.
// ⚠️ ŚWIADOMIE nie budujemy drugiego generatora w bocie: dokładnie ten błąd wycofaliśmy 02.08
// (pole `x_post`), bo dwa generatory rozjeżdżają się i panel zaczyna produkować inny post niż automat.
// Klucz `SUPABASE_SERVICE_ROLE_KEY` Supabase wstrzykuje sam — nie trzeba zakładać nowego sekretu.
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Budżet treści: 300 zn. (podniesione z 250 na życzenie właściciela 2026-08-04 — „często ucina").
// Stare 250 zakładało link w treści (280 − 23 na t.co), ale link idzie do KOMENTARZA, nie do posta.
// ⚠️ Standardowe konto X ma twardy limit 280; 300 wymaga Premium. Ta sama wartość co X_TEXT_MAX
// w knaga.html — zmieniaj OBA naraz. ⚠️ Zmiana tutaj wymaga redeployu funkcji (nie idzie przez git):
//   supabase functions deploy gotowiec-x --project-ref utmvokfjvrthvcmxzowc
// 🔴 270, NIE 300 (obniżone 2026-08-12 po PIERWSZYM realnym poście automatu). Premium pozwala na
// znacznie więcej, ale wiążący jest KADR OSI CZASU: powyżej ~280 znaków X zwija resztę pod
// „Pokaż więcej". Pierwszy post automatu wyszedł na 283 znaki — zmieścił się w budżecie 300 i mimo
// to wpadł pod zwijanie, czyli stary limit gwarantował dokładnie to, czego chcieliśmy uniknąć.
// ⚠️ Przy poście BEZ LINKU kosztuje to podwójnie: czytelnik ma zobaczyć całą wartość w kadrze,
// bo nigdzie nie kliknie. 270 + flaga + spacja = najwyżej 273.
// ⚠️ ZMIENIAJ RAZEM z `X_TEXT_MAX` w knadze i `XBudzetZnakow` w bocie — trzy miejsca, jedna liczba.
const MAX_ZNAKOW = 270;

// ── Granica zdania po polsku ─────────────────────────────────────────────────
// 🔴 ZNALEZIONE 2026-08-20 na podglądzie wątku: `lastIndexOf('.')` traktowało kropkę
// w SKRÓCIE jak koniec zdania, więc post urywał się na „Wzrosły spółki wrażliwe na stopy,
// m.in." — zdanie ucięte w pół, a formalnie „na kropce". Polski tekst finansowy jest pełen
// takich skrótów (m.in., tys., mln, mld, pp, pkt, r., proc.), więc trafiało się to często:
// po jednej pozycji na pięć w OBU podglądach wątku.
// Kropka kończy zdanie tylko wtedy, gdy po niej jest koniec tekstu albo spacja i początek
// nowego zdania (wielka litera lub cyfra — zdania w tych postach zaczynają się też od liczby),
// a przed nią NIE stoi znany skrót ani pojedyncza litera (inicjał „J. Kowalski").
const SKROTY_Z_KROPKA = new Set([
  'm.in', 'ok', 'tys', 'mln', 'mld', 'bln', 'pp', 'pb', 'pkt', 'proc', 'r', 'ul', 'al',
  'godz', 'np', 'tzw', 'itd', 'itp', 'str', 'nr', 'dr', 'prof', 'inż', 'św', 'gen', 'płk',
  'ws', 'tj', 'ang', 'mies', 'kw', 'egz', 'wg', 'ds', 'poł', 'cd', 'br', 'min', 'maks', 'śr',
]);

function ostatniKoniecZdania(t: string): number {
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] !== '.') continue;
    const po = t.slice(i + 1);
    if (po.length > 0 && !/^\s+[A-ZĄĆĘŁŃÓŚŹŻ0-9]/.test(po)) continue;
    const przed = t.slice(0, i);
    const ostatni = (przed.match(/[\p{L}\p{N}.]+$/u) || [''])[0].toLowerCase();
    if (SKROTY_Z_KROPKA.has(ostatni)) continue;
    if (/^\p{L}$/u.test(ostatni)) continue;
    return i;
  }
  return -1;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (dane: unknown, status = 200) =>
  new Response(JSON.stringify(dane), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── BRAMKA POKRYCIA LICZB ───────────────────────────────────────────────────
// Zasada wzięta z bota (sekcja „Eskalacja MUSI być widać w nagłówku"): sama
// instrukcja w prompcie NIE wystarcza. Udowodnione wpadką z 2026-07-26 — model
// dopisał „jako drugi gość tego samego dnia", choć artykuł mówił o jednej wizycie.
// Dlatego sprawdzamy deterministycznie: każda liczba z gotowca MUSI występować
// w artykule albo w oryginalnym nagłówku. Inaczej gotowiec leci do kosza.
function liczbyZ(tekst: string): string[] {
  // Normalizacja pod polski zapis: 4,66 i 4.66 to ta sama liczba; spacje
  // i twarde spacje jako separator tysięcy znikają (1 200 → 1200).
  const bezSeparatorow = tekst.replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1');
  return (bezSeparatorow.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((l) => l.replace(',', '.').replace(/\.0+$/, ''));
}

function pokrycieOk(post: string, zrodlo: string): { ok: boolean; brakuje: string[] } {
  const wZrodle = new Set(liczbyZ(zrodlo));
  const brakuje = liczbyZ(post).filter((l) => !wZrodle.has(l));
  return { ok: brakuje.length === 0, brakuje };
}

// Model bywa rozmowny mimo instrukcji — zdejmujemy typowe ozdobniki.
function posprzataj(surowy: string): string {
  let s = surowy.trim();
  s = s.replace(/^```[a-z]*\s*|\s*```$/g, '').trim();
  s = s.replace(/^(post|tweet|treść|propozycja)\s*:\s*/i, '').trim();
  s = s.replace(/^["„”']|["„”']$/g, '').trim();
  return s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ blad: 'Tylko POST' }, 405);

  // ── Kto pyta ──────────────────────────────────────────────────────────────
  // Bez tego każdy z publicznym kluczem anon paliłby tokeny właściciela.
  // ⚠️ Ta kontrola idzie PRZED sprawdzeniem konfiguracji: inaczej obcy dostawał
  // odpowiedź o stanie funkcji, zanim ktokolwiek sprawdził, kim jest.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ blad: 'Brak autoryzacji' }, 401);

  // Bot przedstawia się kluczem service_role. Porównanie długości PRZED treścią, żeby nie
  // przepuścić pustego klucza (gdyby zmiennej zabrakło, `'' === ''` wpuściłoby każdego z gołym
  // „Bearer "). Klucz service_role ma wyłącznie bot — knaga go nigdy nie widzi.
  const token = authHeader.slice(7).trim();
  const odBota = SERVICE_KEY.length > 20 && token === SERVICE_KEY;

  if (!odBota) {
    const supa = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supa.auth.getUser();
    const email = (userData?.user?.email ?? '').toLowerCase();
    if (userErr || !email) return json({ blad: 'Nieprawidłowa sesja' }, 401);
    if (email !== OWNER_EMAIL) return json({ blad: 'Brak dostępu' }, 403);
  }

  // Dopiero tu, gdy już wiadomo, że pyta właściciel ALBO bot.
  if (!DEEPSEEK_KEY) {
    return json({ blad: 'Brak sekretu DEEPSEEK_KEY w konfiguracji funkcji' }, 500);
  }

  // ── Wejście ───────────────────────────────────────────────────────────────
  // `pozycje` = tryb KLASTRA (2026-08-10, życzenie właściciela „udostępnij cały klaster"): kotwica plus
  // wszystkie podpozycje. Bez tego pola funkcja działa dokładnie jak dotąd — pojedynczy news.
  let body: { text?: string; article?: string; impact?: string; maxZnakow?: number; wariant?: string; pozycje?: Array<{ text?: string; article?: string }> };
  try {
    body = await req.json();
  } catch {
    return json({ blad: 'Nieprawidłowy JSON' }, 400);
  }

  const text = String(body.text ?? '').trim();
  const article = String(body.article ?? '').trim();
  const impact = String(body.impact ?? '').trim();
  if (!text) return json({ blad: 'Brak pola text' }, 400);

  // Budżet znaków może nadpisać WOŁAJĄCY (2026-08-12). Powód: knaga wkleja treść do composera X,
  // który sam pilnuje limitu i nie da wysłać za długiego — a bot publikuje przez API, gdzie za długi
  // post wraca BŁĘDEM i news po prostu nie idzie.
  // ✅ Konto @brifup MA PREMIUM (potwierdzone przez właściciela 2026-08-12), więc 300 jest bezpieczne
  // i domyślne dla obu ścieżek. ⚠️ Nie podnoś wyżej bez powodu: X zwija w osi czasu wszystko powyżej
  // ~280 pod „Pokaż więcej", więc dłuższy post czytelnik widzi jako URWANY. Premium daje tu swobodę
  // od twardego limitu, nie zachętę do dłuższych postów.
  const maxZnakow = Number.isFinite(Number(body.maxZnakow))
    ? Math.min(MAX_ZNAKOW, Math.max(120, Math.floor(Number(body.maxZnakow))))
    : MAX_ZNAKOW;

  // ── WARIANT „bio" (2026-08-20, życzenie właściciela) ──────────────────────
  // Cel: wizyty profilu. Post kończy się stałą linią kierującą do bio, bo bio niesie link
  // do serwisu — czyli droga jest „post → bio → profil → strona".
  // 🔴 DOKLEJKA JEST STAŁA, NIE GENEROWANA. To NIE jest drugi generator (zasada z 02.08:
  // panel i automat mają jedno źródło) — model dostaje po prostu mniejszy budżet, a linia
  // dopina się po bramkach. Dzięki temu knaga i bot dla `wariant: 'bio'` dostają to samo.
  // ⚠️ Budżet treści MALEJE o długość doklejki, żeby całość zmieściła się w 270 znakach.
  // Powód jest ten sam co przy MAX_ZNAKOW: X zwija w osi czasu wszystko powyżej ~280 pod
  // „Pokaż więcej", a urwany NAGŁÓWEK kosztuje więcej niż zyskuje doklejka pod zwinięciem.
  const CTA_BIO = 'Cała dzisiejsza dawka — link w bio.';
  const zBio = String(body.wariant ?? '').trim() === 'bio';
  const budzetTresci = zBio ? Math.max(120, maxZnakow - CTA_BIO.length - 2) : maxZnakow;

  const pozycje = Array.isArray(body.pozycje)
    ? body.pozycje.map((p) => ({ text: String(p?.text ?? '').trim(), article: String(p?.article ?? '').trim() }))
                  .filter((p) => p.text.length > 0).slice(0, 6)
    : [];
  const klaster = pozycje.length > 0;

  // MATERIAŁ = wszystko, z czego wolno czerpać liczby. Przy klastrze kotwica bywa PARASOLEM bez
  // artykułu (tytuł zbiorczy nadany przez bota), więc treść siedzi wyłącznie w podpozycjach —
  // gdyby bramka pokrycia patrzyła dalej tylko na `article`, odrzucałaby każdą liczbę jako zmyśloną.
  const material = klaster
    ? [text, article, ...pozycje.flatMap((p) => [p.text, p.article])].filter(Boolean).join('\n')
    : `${text}\n${article}`;

  // Brak artykułu = nie ma z czego wziąć liczb i nie ma czego sprawdzić bramką.
  // Zwracamy null zamiast zmyślać — front podstawi sam nagłówek.
  // ⚠️ Przy klastrze artykuł kotwicy NIE jest wymagany: materiałem są podpozycje.
  if (!article && !klaster) {
    return json({ post: null, powod: 'Brak treści artykułu — nie ma z czego zbudować gotowca' });
  }

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  const zapytanie = {
    model: 'deepseek-v4-flash',
    thinking: { type: 'disabled' },   // proste zadanie — reasoning tylko zjadłby max_tokens
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content:
          'Piszesz krótki post na X po polsku na podstawie newsa finansowo-politycznego. ' +
          (klaster
            ? 'MATERIAŁ TO KLASTER: jedno wydarzenie opisane przez kilka źródeł, każde dokładające inny szczegół. ' +
              'Napisz JEDEN post spinający całość — nie streszczaj pozycji po kolei i nie wymieniaj ich listą. ' +
              'Linia 1 to HOOK z najmocniejszym konkretem, potem jedno zdanie łączące pozostałe ujęcia. ' +
              'Pomiń ujęcia, które powtarzają to samo. '
            : 'Struktura: linia 1 to HOOK — nagłówek przerobiony tak, by konkret był na przodzie. ' +
              'Potem JEDNO zdanie z artykułu, złożone z samych twardych faktów i liczb. ') +
          // ── ODBIORCA: szerokie grono, nie inwestor (decyzja właściciela 2026-08-13) ──
          // Post idzie na publiczny profil, nie na terminal. Zmierzone na realnej parze gotowców
          // do tego samego newsa (zwroty ceł): wariant „firmy z S&P 500 zaksięgowały 9,6 mld"
          // przegrał z „sześć firm technologicznych 2,5 mld" — agregat wymaga od czytelnika
          // wiedzy, czym jest indeks, a „zaksięgowały" to żargon księgowy (ujęcie ≠ gotówka).
          'ODBIORCA to szeroka publiczność, nie inwestor. Nazwany konkret (nazwa firmy, ile firm, ' +
          'jaki kraj) BIJE agregat rynkowy — nie pisz "spółki z S&P 500" ani "firmy z indeksu", ' +
          'gdy materiał pozwala nazwać podmioty. Używaj prostych słów zamiast żargonu (np. "dostały" ' +
          'zamiast "zaksięgowały"), ale NIGDY kosztem prawdziwości: jeśli materiał mówi o ujęciu ' +
          'księgowym, a nie o wypłacie, zostaw znaczenie i uprość samo zdanie. ' +
          'PRZYCZYNA JEST OBOWIĄZKOWA, gdy materiał ją podaje (wyrok, decyzja urzędu, ustawa, ' +
          'wynik spółki) — bez niej post jest listą liczb i czytelnik nie wie, dlaczego to się dzieje. ' +
          'Najwyżej CZTERY liczby w poście. Gdy materiał podaje kilka etapów tej samej rury ' +
          '(np. kwota autoryzowana, zatwierdzona i wypłacona), podaj SKRAJNE i pomiń środkowe. ' +
          `TWARDY LIMIT: ${budzetTresci} znaków łącznie. ` +
          'ZAKAZANE: zmyślanie jakichkolwiek liczb — każda liczba w poście MUSI dosłownie występować ' +
          'w materiale źródłowym. Jeśli materiał nie podaje liczb, napisz post bez liczb. ' +
          'Zero hashtagów, zero emoji, zero linków, zero clickbaitu, zero pytań retorycznych. ' +
          'Nie dopisuj komentarza od siebie. Zwróć WYŁĄCZNIE treść posta.',
      },
      {
        role: 'user',
        content: `NAGŁÓWEK:\n${text}` +
                 (article ? `\n\nARTYKUŁ:\n${article}` : '') +
                 (klaster
                   ? `\n\nPOZOSTAŁE UJĘCIA TEGO SAMEGO WYDARZENIA:\n` +
                     pozycje.map((p, i) => `${i + 1}. ${p.text}${p.article ? `\n   ${p.article}` : ''}`).join('\n')
                   : '') +
                 (impact ? `\n\nWPŁYW NA RYNEK:\n${impact}` : ''),
      },
    ],
  };

  let surowy = '';
  try {
    const odp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zapytanie),
    });
    if (!odp.ok) {
      const tresc = await odp.text();
      return json({ post: null, powod: `DeepSeek zwrócił ${odp.status}`, szczegoly: tresc.slice(0, 300) });
    }
    const dane = await odp.json();
    surowy = dane?.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    return json({ post: null, powod: `Błąd wywołania DeepSeek: ${(e as Error).message}` });
  }

  const post = posprzataj(surowy);
  if (!post) return json({ post: null, powod: 'Model zwrócił pustą odpowiedź' });

  // ── Bramki ────────────────────────────────────────────────────────────────
  const { ok, brakuje } = pokrycieOk(post, material);
  if (!ok) {
    // Świadomie NIE próbujemy ratować gotowca (obcinać/poprawiać) — zmyślona
    // liczba w poście finansowym to gorsza szkoda niż brak gotowca.
    return json({
      post: null,
      powod: `Bramka pokrycia: liczby spoza artykułu (${brakuje.join(', ')})`,
      odrzucony: post,
    });
  }

  // Doklejka wariantu „bio" dopina się PO bramce pokrycia i PO przycięciu — jest stałym
  // tekstem, więc bramce liczb nie podlega, a przycinaniu podlegać nie może (obcięta zachęta
  // to najgorszy z możliwych wyników).
  const zDoklejka = (tresc: string) => (zBio ? `${tresc}\n\n${CTA_BIO}` : tresc);

  if (post.length > budzetTresci) {
    // Przycinamy na granicy zdania, nie w połowie słowa.
    const doKropki = ostatniKoniecZdania(post.slice(0, budzetTresci));
    const przyciety = doKropki > budzetTresci * 0.6
      ? post.slice(0, doKropki + 1)
      : post.slice(0, budzetTresci - 1).trimEnd() + '…';
    const gotowy = zDoklejka(przyciety);
    return json({ post: gotowy, przyciety: true, wariant: zBio ? 'bio' : 'bazowy', dlugosc: gotowy.length });
  }

  const gotowy = zDoklejka(post);
  return json({ post: gotowy, wariant: zBio ? 'bio' : 'bazowy', dlugosc: gotowy.length });
});
