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

// Limit X = 280 znaków, link liczy się jako 23 NIEZALEŻNIE od długości (t.co) →
// budżet na sam tekst ~250. Front dokleja link sam, więc tu go nie ma.
const MAX_ZNAKOW = 250;

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

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supa.auth.getUser();
  const email = (userData?.user?.email ?? '').toLowerCase();
  if (userErr || !email) return json({ blad: 'Nieprawidłowa sesja' }, 401);
  if (email !== OWNER_EMAIL) return json({ blad: 'Brak dostępu' }, 403);

  // Dopiero tu, gdy już wiadomo, że pyta właściciel.
  if (!DEEPSEEK_KEY) {
    return json({ blad: 'Brak sekretu DEEPSEEK_KEY w konfiguracji funkcji' }, 500);
  }

  // ── Wejście ───────────────────────────────────────────────────────────────
  let body: { text?: string; article?: string; impact?: string };
  try {
    body = await req.json();
  } catch {
    return json({ blad: 'Nieprawidłowy JSON' }, 400);
  }

  const text = String(body.text ?? '').trim();
  const article = String(body.article ?? '').trim();
  const impact = String(body.impact ?? '').trim();
  if (!text) return json({ blad: 'Brak pola text' }, 400);

  // Brak artykułu = nie ma z czego wziąć liczb i nie ma czego sprawdzić bramką.
  // Zwracamy null zamiast zmyślać — front podstawi sam nagłówek.
  if (!article) {
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
          `Struktura: linia 1 to HOOK — nagłówek przerobiony tak, by konkret był na przodzie. ` +
          'Potem JEDNO zdanie z artykułu, złożone z samych twardych faktów i liczb. ' +
          `TWARDY LIMIT: ${MAX_ZNAKOW} znaków łącznie. ` +
          'ZAKAZANE: zmyślanie jakichkolwiek liczb — każda liczba w poście MUSI dosłownie występować ' +
          'w artykule albo w nagłówku. Jeśli artykuł nie podaje liczb, napisz post bez liczb. ' +
          'Zero hashtagów, zero emoji, zero linków, zero clickbaitu, zero pytań retorycznych. ' +
          'Nie dopisuj komentarza od siebie. Zwróć WYŁĄCZNIE treść posta.',
      },
      {
        role: 'user',
        content: `NAGŁÓWEK:\n${text}\n\nARTYKUŁ:\n${article}` +
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
  const { ok, brakuje } = pokrycieOk(post, `${text}\n${article}`);
  if (!ok) {
    // Świadomie NIE próbujemy ratować gotowca (obcinać/poprawiać) — zmyślona
    // liczba w poście finansowym to gorsza szkoda niż brak gotowca.
    return json({
      post: null,
      powod: `Bramka pokrycia: liczby spoza artykułu (${brakuje.join(', ')})`,
      odrzucony: post,
    });
  }

  if (post.length > MAX_ZNAKOW) {
    // Przycinamy na granicy zdania, nie w połowie słowa.
    const doKropki = post.slice(0, MAX_ZNAKOW).lastIndexOf('.');
    const przyciety = doKropki > MAX_ZNAKOW * 0.6
      ? post.slice(0, doKropki + 1)
      : post.slice(0, MAX_ZNAKOW - 1).trimEnd() + '…';
    return json({ post: przyciety, przyciety: true, dlugosc: przyciety.length });
  }

  return json({ post, dlugosc: post.length });
});
