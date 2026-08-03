// ════════════════════════════════════════════════════════════════════════════
// Edge Function: og — obrazek podglądu linku (Open Graph) 1200×630
//
// Życzenie właściciela: gdy wysyłasz link do newsa należącego do wątku, karta
// podglądu ma pokazywać, że to KOLEJNY ETAP znanej sagi — a nie ten sam news
// drugi raz. Karta niesie więc nagłówek + poprzedni etap + pasek ciągłości.
//
// 🔴 DLACZEGO TO W OGÓLE MUSI BYĆ FUNKCJA, A NIE PLIK W REPO:
//   GitHub Pages to hosting statyczny — nie policzy obrazka na żądanie. Bot
//   mógłby renderować PNG-i co bieg, ale przy ~50 wątkach dziennie to dziesiątki
//   plików binarnych commitowanych co pół godziny, czyli dokładnie odwrotność
//   kierunku ze STAN.md (mniej śmiecenia repo, nie więcej).
//
// KTO TO WOŁA: wyłącznie scrapery (Facebook, Slack, WhatsApp, LinkedIn…), i tylko
//   w chwili, gdy ktoś wysyła link. Realnie dziesiątki–setki wywołań miesięcznie
//   wobec 500 000 w darmowym tierze. Obciążenie jest pomijalne.
//
// 🔴 FAIL-SAFE: KAŻDY błąd (brak newsa, zły parametr, padnięty render, timeout)
//   kończy się przekierowaniem na statyczną grafikę serwisu. Karta podglądu
//   nigdy nie zostaje bez obrazka — w najgorszym razie jest to grafika ogólna.
//
// ⚠️ GEOMETRIĘ TESTUJ LOKALNIE, NIE PRZEZ DEPLOY. Ta sama karta składa się w node
//   (`npm i satori @resvg/resvg-js`, fonty z `fonts/`, dane z `briefs.json`+`threads.json`)
//   i wychodzi pixel-perfect jak na Supabase. Pierwsza wersja pojechała na produkcję
//   nieprzejrzana i WSZYSTKIE 46 kart dawki miało tekst ucięty prawą krawędzią — objaw,
//   którego nie widać w kodzie, tylko na renderze. Sprawdzaj całą dawkę, nie jedną kartę.
//
// WDROŻENIE: supabase functions deploy og --no-verify-jwt
//   (--no-verify-jwt jest KONIECZNE: scraper nie ma i nie może mieć tokenu).
// ════════════════════════════════════════════════════════════════════════════

import satori from 'https://esm.sh/satori@0.10.13';
import { Resvg, initWasm } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2';

const ORIGIN = 'https://brifup.com';
const ZAPASOWY_OBRAZEK = `${ORIGIN}/og-image.png?v=2`;
const CZERWONY = '#DF1F0F';

// ── Zasoby ładowane RAZ na życie instancji (zimny start), potem z pamięci ──
let wasmGotowy: Promise<void> | null = null;
let fontyCache: Promise<any[]> | null = null;

function wasmInit() {
  wasmGotowy ??= initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm'));
  return wasmGotowy;
}

async function fonty() {
  fontyCache ??= (async () => {
    const we = async (plik: string) => new Uint8Array(await (await fetch(`${ORIGIN}/fonts/${plik}`)).arrayBuffer());
    const [serif, mono, monoB] = await Promise.all([
      we('DMSerifDisplay-Regular.ttf'), we('SpaceMono-Regular.ttf'), we('SpaceMono-Bold.ttf'),
    ]);
    return [
      { name: 'DMS', data: serif, weight: 400, style: 'normal' },
      { name: 'SM', data: mono, weight: 400, style: 'normal' },
      { name: 'SM', data: monoB, weight: 700, style: 'normal' },
    ];
  })();
  return fontyCache;
}

// ⚠️ MUSI być identyczne z `itemSlug` w index.html i z `ItemSlug` w bocie (Runner.cs).
// djb2-xor po pierwszych 80 jednostkach UTF-16, base36. Rozjazd = obrazek nie do pary z newsem.
function itemSlug(text: string): string {
  let h = 5381;
  for (let i = 0; i < Math.min(text.length, 80); i++) { h = ((h << 5) + h) ^ text.charCodeAt(i); h = h >>> 0; }
  return h.toString(36);
}
const normKlucz = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Cięcie na granicy SŁOWA — „…zalecając rozwag…" czyta się jak błąd renderu, nie jak skrót.
// Cofamy się do ostatniej spacji, ale nie dalej niż o 1/4 limitu (inaczej krótkie zdanie
// z jednym długim słowem straciłoby pół treści).
function tnij(s: string, max: number) {
  s = (s || '').trim();
  if (s.length <= max) return s;
  const kadlub = s.slice(0, max - 1);
  const spacja = kadlub.lastIndexOf(' ');
  return (spacja > max * 0.75 ? kadlub.slice(0, spacja) : kadlub).replace(/[\s,;:.–-]+$/, '') + '…';
}

// Front trzyma ten sam cap (WATEK_MAX_KROPEK w index.html): bot pozwala na 20 węzłów w wątku,
// a 20 kropek + tytuł sagi nie mieszczą się w stopce. Powyżej capa pozycja jest mapowana
// proporcjonalnie — kropki przestają być liczbą etapów, zostają wskaźnikiem „jak daleko".
const MAX_KROPEK = 12;

// Ile etapów wchodzi na kartę osi wątku. Bot trzyma do 20 węzłów na wątek, więc nagłówek karty
// mówi wprost „OSTATNIE N Z M", żeby nie sugerować, że to cała saga.
//
// 🔴 4 → 3 (2026-08-03, zgłoszenie właściciela „jest wciąż niewyraźnie"). To NIE była kwestia
// rozdzielczości — PNG jest ostry, 1200×630. Problem to GĘSTOŚĆ: X pokazuje kartę w osi czasu
// przy ~504 px (desktop) i ~380 px (telefon), czyli w 42% i 32% skali. Tekst etapu w 21 px
// schodził tam realnie do 8,8 / 6,7 px, a data w 12 px do 5,0 / 3,8 px. Do tego DM Serif Display
// jest krojem *display* — jego włoskowate kreski znikają przy pomniejszeniu pierwsze.
// ⚠️ Zmiana z 02.08 („przesuń kreskę w lewo, żeby się więcej zmieściło", limit 96→104) szła
// dokładnie w przeciwną stronę: więcej znaków w tym samym kadrze = mniejszy realny rozmiar liter.
// Te dwa cele się wykluczają i wybrano czytelność. Jeden etap mniej finansuje wzrost 21→30/34 px.
const MAX_WEZLOW_NA_KARCIE = 3;

// satori nie zna `text-transform` ani `-webkit-line-clamp` — wersaliki i skracanie robimy w kodzie.
const el = (type: string, style: any, children: any = null) => ({ type, props: { style, children } });

function karta(naglowek: string, kicker: string, poprzedni: { kiedy: string; text: string } | null,
               stopkaTekst: string, kropki: { ile: number; akt: number } | null) {
  const lewa = el('div', {
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    width: 330, padding: '66px 0 66px 66px', boxSizing: 'border-box', flexShrink: 0,
  }, [
    el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 62, color: '#111' }, [
      el('span', {}, 'Brif'), el('span', { color: CZERWONY }, '.up'),
    ]),
    el('div', {
      display: 'flex', flexDirection: 'column', fontFamily: 'SM', fontSize: 12, fontWeight: 700,
      letterSpacing: 2.6, color: '#8f8f8f', marginTop: 20, lineHeight: 2,
    }, ['TYLKO NAJWAŻNIEJSZE', 'NEWSY RYNKOWE', 'I GEOPOLITYCZNE'].map((t) => el('div', {}, t))),
  ]);

  const kreska = el('div', { width: 2, backgroundColor: '#111', margin: '66px 0', flexShrink: 0 });

  const prawaDzieci: any[] = [
    el('div', { display: 'flex', fontFamily: 'SM', fontWeight: 700, fontSize: 16, letterSpacing: 4, color: CZERWONY }, kicker),
    // Limit zależy od tego, czy niżej stoi blok „poprzedni etap" — bez niego zostaje miejsce
    // na dwie linie więcej. Oba progi zmierzone renderem całej dawki (46/46 kart bez przelewu).
    el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 50, color: '#111', lineHeight: 1.12, marginTop: 18 },
      tnij(naglowek, poprzedni ? 95 : 150)),
  ];
  if (poprzedni) {
    prawaDzieci.push(el('div', {
      display: 'flex', flexDirection: 'column', marginTop: 22, paddingLeft: 15,
      borderLeft: '3px solid #e6e6e6', fontFamily: 'SM',
    }, [
      el('div', { display: 'flex', fontSize: 12, fontWeight: 700, letterSpacing: 1.6, color: '#9a9a9a' },
        `POPRZEDNI ETAP · ${poprzedni.kiedy}`),
      el('div', { display: 'flex', fontSize: 15, color: '#7a7a7a', marginTop: 4, lineHeight: 1.45 },
        tnij(poprzedni.text, 92)),
    ]));
  }
  const stopkaDzieci: any[] = [];
  if (kropki) {
    const ile = Math.min(kropki.ile, MAX_KROPEK);
    const akt = kropki.ile <= MAX_KROPEK ? kropki.akt : Math.round(kropki.akt / (kropki.ile - 1) * (ile - 1));
    stopkaDzieci.push(el('div', { display: 'flex', alignItems: 'center', flexShrink: 0 },
      Array.from({ length: ile }, (_, i) => el('div', {
        width: i === akt ? 15 : 10, height: i === akt ? 15 : 10, borderRadius: 999,
        backgroundColor: i === akt ? CZERWONY : '#d2d2d2', marginRight: 7, flexShrink: 0,
      }))));
  }
  // Kropki niosą sygnał i nigdy nie mogą zostać wypchnięte — kurczy się wyłącznie tytuł sagi
  // (ta sama zasada co `.ws-txt` w pasku ciągłości na froncie).
  stopkaDzieci.push(el('div', {
    display: 'flex', fontFamily: 'SM', fontSize: 15, color: '#111', fontWeight: 700,
    flexShrink: 1, minWidth: 0, overflow: 'hidden',
  }, tnij(stopkaTekst, 46)));
  prawaDzieci.push(el('div', {
    display: 'flex', alignItems: 'center', borderTop: '1.5px solid #111',
    paddingTop: 20, marginTop: 30,
  }, stopkaDzieci));

  // 🔴 `width` + `boxSizing` są OBOWIĄZKOWE, nie kosmetyką. Przy samym `flexGrow: 1` satori
  //   liczy 868 px jako szerokość TREŚCI i dokleja `padding` (62+48) NA ZEWNĄTRZ — kolumna
  //   robi się 978 px przy dostępnych 868, więc tekst zawija się do zbyt szerokiej miary
  //   i ostatnie ~110 px każdej linii wypada poza kadr 1200 px. Objaw: ucięte końcówki
  //   wyrazów przy prawej krawędzi (zgłoszenie właściciela 2026-08-02, dotyczyło 46/46 kart).
  const prawa = el('div', {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1,
    padding: '66px 62px 66px 48px', width: 868, boxSizing: 'border-box', minWidth: 0,
  }, prawaDzieci);

  return el('div', {
    display: 'flex', width: 1200, height: 630, backgroundColor: '#fff', color: '#111',
    boxSizing: 'border-box', overflow: 'hidden',
  }, [lewa, kreska, prawa]);
}

// ── DRUGA KARTA: OŚ WĄTKU (2026-08-02) ───────────────────────────────────────────────────────
// Życzenie właściciela: post na X niesie kartę z nagłówkiem, a w KOMENTARZU ma iść druga karta —
// z etapami sagi zamiast tytułu. Czytelnik widzi wtedy, że temat ma historię, bez wchodzenia na stronę.
// ⚠️ MAKSYMALNIE 4 OSTATNIE ETAPY — nie z lenistwa, tylko dlatego, że przy 1200×630 pięć węzłów
// schodzi poniżej granicy czytelności (tekst musiałby zejść pod 13 px albo urywać się w pół zdania).
// Bot trzyma do 20 węzłów na wątek, więc nagłówek mówi wprost „OSTATNIE 4 Z 12", żeby nie sugerować,
// że to cała saga. Najnowszy etap na DOLE — oś czasu czyta się z góry na dół.
// Karta osi wątku (`?w=1`) — układ JEDNOKOLUMNOWY, pełna szerokość.
//
// 🔴 PRZEBUDOWA 2026-08-03 (wybrany wariant „B1"). Lewa kolumna z logo i podpisem „JAK ROZWIJAŁ SIĘ
// TEN TEMAT" ZNIKNĘŁA, logo poszło do prawego górnego rogu obok kickera. Powód nie jest estetyczny:
// tamta kolumna zjadała 252 px = 21% szerokości karty na treść, której przy 32–42% skali w osi
// czasu X i tak nikt nie przeczyta (podpis szedł w 12 px, realnie 3,8–5,0 px). Odzyskane piksele
// płacą za wzrost typografii — patrz komentarz przy MAX_WEZLOW_NA_KARCIE.
//
// ✅ EFEKT UBOCZNY, KTÓRY WARTO ZNAĆ: znika sprzężenie szerokości kolumn (330+2+868 = 250+2+948
// = 1200), przez które satori ucięło kadr w 46/46 kartach. Jedna kolumna = ta klasa błędu nie
// ma jak wystąpić. Nie przywracaj podziału bez bardzo dobrego powodu.
//
// Realna szerokość tekstu osi: 1076 px (1200 − 2×62 padding) wobec 842 px wcześniej, czyli +28%.
// Dlatego limit tekstu etapu MÓGŁ wzrosnąć 104 → 118 mimo znacznie większego fontu.
// ════════════════════════════════════════════════════════════════════════════
// 🔴 GEOMETRIA KARTY OSI JEST STAŁA, NIE ZALEŻY OD TREŚCI — i tak ma zostać.
//
// Pierwsze podejście (2026-08-03) opierało kadr na limitach znakowych i przeszło na wszystkich
// 53 realnych wątkach z threads.json. Test skrajny (trzy etapy po 118 znaków z samych szerokich
// glifów + najdłuższy tytuł) rozwalił je w drobny mak: tytuł nachodził na kreskę, a ostatni etap
// wychodził poza dolną krawędź. To DOKŁADNIE ta klasa błędu, przez którą 46/46 kart dawki miało
// ucięty kadr — „przeszło na dzisiejszych danych" nie jest dowodem.
//
// Dlatego każdy blok, który może urosnąć od treści, ma TWARDĄ wysokość + `overflow: hidden`
// (zweryfikowane: satori to respektuje, blok się nie rozpycha). Bilans pionowy:
//   630 − 48 (padding góra) − 40 (padding dół) − 44 (głowa) − 52 (tytuł) − 50 (kreska+odstępy)
//   = 396 px na etapy, przy zapotrzebowaniu (20+5+78)×2 + (20+5+130) + 2×12 marginesów = 385 px.
// ⚠️ Zmieniasz którykolwiek z tych rozmiarów → przelicz bilans i puść `render.mjs` RAZEM z testem
// skrajnym, nie samą dawką.
//
// ⚠️ Wysokości są o kilka pikseli WIĘKSZE niż iloczyn `linie × fontSize × lineHeight`. To nie
// zapas „na wszelki wypadek": przy dokładnym iloczynie satori ścina ostatnią linię w pół wysokości
// glifów (widać na renderze skrajnym — dolne połówki liter zostają na karcie). Nie obcinaj tego.
//
// 🔴 To `maxHeight`, NIE `height` — i to jest istotne. Przy sztywnym `height` etap jednoliniowy
// rezerwował pełne dwie linie i zostawiał pod sobą dziurę, przez co odstępy między etapami były
// nierówne. `maxHeight` zwija krótkie etapy do ich własnej wysokości, a długie przycina tak samo
// twardo — gwarancja kadru zostaje, bo górne ograniczenie jest to samo.
// (Zweryfikowane: satori obsługuje oba; przy `height` krótki tekst NIE zwijał się.)
// ════════════════════════════════════════════════════════════════════════════
const WYS_TYTULU = 52;            // jedna linia przy 46 px (46 × 1,1 = 50,6)
const WYS_TEKSTU_ETAPU = 78;      // dwie linie przy 30 px (73,2 + zapas na glify)
const WYS_TEKSTU_BIEZACEGO = 130; // trzy linie przy 34 px (124,4 + zapas) — bieżący etap jest najdłuższy

// Tytuł ma zostać w JEDNEJ linii: druga i tak zostanie odcięta klamrą WYS_TYTULU, więc rozmiar
// dobieramy tak, żeby do tego nie doszło. Progi zmierzone renderem 53 realnych tytułów
// (skrypt kalibracyjny, 2026-08-03): przy 46 px zawijały się 3 (od 52 znaków), przy 40 px jeden
// (63 znaki), przy 36 px żaden. Ustawione z zapasem, bo o zawijaniu decyduje szerokość znaków,
// nie ich liczba — klamra jest zabezpieczeniem na wypadek, gdy heurystyka spudłuje.
function rozmiarTytulu(t: string) {
  if (t.length <= 48) return 46;
  if (t.length <= 56) return 40;
  return 36;
}

function kartaWatku(tytulWatku: string, wezly: { kiedy: string; text: string }[], ile: number) {
  const tytul = tnij(tytulWatku, 62);
  const naglowek = ile > wezly.length
    ? `OŚ WĄTKU · OSTATNIE ${wezly.length} Z ${ile} ETAPÓW`
    : `OŚ WĄTKU · ${ile} ${ile === 1 ? 'ETAP' : (ile < 5 ? 'ETAPY' : 'ETAPÓW')}`;

  // Kicker i logo w jednym wierszu, wyrównane do linii bazowej.
  const glowa = el('div', { display: 'flex', height: 44, overflow: 'hidden', alignItems: 'baseline', justifyContent: 'space-between' }, [
    el('div', { display: 'flex', fontFamily: 'SM', fontWeight: 700, fontSize: 18, letterSpacing: 3.4, color: CZERWONY }, naglowek),
    el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 34, color: '#111' }, [
      el('span', {}, 'Brif'), el('span', { color: CZERWONY }, '.up'),
    ]),
  ]);

  const wiersze = wezly.map((w, i) => {
    const ostatni = i === wezly.length - 1;
    // ⚠️ `marginTop` to PODŁOGA odstępu, nie jego wartość docelową — `space-between` niżej dokłada
    // resztę wolnej wysokości. Bez tej podłogi karta z dwuliniowym tytułem zjadała cały luz i data
    // kolejnego etapu siadała tuż pod tekstem poprzedniego (złapane na wątku „Dyplomacja USA-Izrael”).
    return el('div', { display: 'flex', marginTop: i === 0 ? 0 : 12 }, [
      // Kolumna osi: kropka + pionowy łącznik. Bieżący (ostatni) etap wyróżniony czerwienią i rozmiarem.
      // ⚠️ Kropki urosły 13/9 → 16/11, bo przy 42% skali dziewięciopikselowa kropka to 3,8 px i ginie.
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 26, flexShrink: 0 }, [
        el('div', {
          width: ostatni ? 16 : 11, height: ostatni ? 16 : 11, borderRadius: 999, marginTop: ostatni ? 6 : 9,
          backgroundColor: ostatni ? CZERWONY : '#b4b4b4',
        }),
        ...(ostatni ? [] : [el('div', { width: 2, flexGrow: 1, marginTop: 6, backgroundColor: '#dcdcdc' })]),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, paddingLeft: 16 }, [
        // Data 12 → 16 px. Kontrast też w górę (#9a9a9a → #767676): przy tej skali zbyt jasna szarość
        // rozpada się w kaszę szybciej, niż maleje sam rozmiar.
        el('div', { display: 'flex', maxHeight: 20, overflow: 'hidden', fontFamily: 'SM', fontSize: 16, fontWeight: 700, letterSpacing: 1.6, color: ostatni ? CZERWONY : '#767676' }, w.kiedy),
        // 21 → 30 px (bieżący etap 34), kolor poprzednich #4a4a4a → #2a2a2a.
        // Limity znakowe są dobrane pod te wysokości: bieżący etap ma trzy linie, poprzednie dwie.
        // ⚠️ Wysokość jest TWARDA — tekst dłuższy niż klamra zostanie ucięty BEZ wielokropka, więc
        // limit `tnij` musi być niższy niż pojemność klamry, a nie odwrotnie.
        el('div', {
          display: 'flex', maxHeight: ostatni ? WYS_TEKSTU_BIEZACEGO : WYS_TEKSTU_ETAPU, overflow: 'hidden',
          fontFamily: 'DMS', fontSize: ostatni ? 34 : 30, color: ostatni ? '#111' : '#2a2a2a',
          lineHeight: 1.22, marginTop: 5,
        }, tnij(w.text, ostatni ? 118 : 104)),
      ]),
    ]);
  });

  return el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: 630,
    backgroundColor: '#fff', color: '#111',
    padding: '48px 62px 40px 62px', boxSizing: 'border-box', overflow: 'hidden',
  }, [
    glowa,
    el('div', {
      display: 'flex', maxHeight: WYS_TYTULU, overflow: 'hidden',
      fontFamily: 'DMS', fontSize: rozmiarTytulu(tytul), color: '#111', lineHeight: 1.1, marginTop: 10,
    }, tytul),
    // `space-between` rozkłada etapy na całą wysokość — bez tego przy krótkich nagłówkach zostawało
    // ~110 px pustki pod ostatnim etapem, a karta wyglądała na uciętą w pionie.
    el('div', {
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1,
      borderTop: '2px solid #111', marginTop: 22, paddingTop: 26,
    }, wiersze),
  ]);
}

function zapasowa() {
  return new Response(null, { status: 302, headers: { Location: ZAPASOWY_OBRAZEK, 'Cache-Control': 'public, max-age=300' } });
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const slug = u.searchParams.get('s') || '';
    const dawka = u.searchParams.get('d') || 'morning';
    const archiwum = u.searchParams.get('a');   // YYYY-MM-DD dla itemów z archiwum
    if (!slug) return zapasowa();

    const zrodlo = archiwum ? `${ORIGIN}/archive/${archiwum}.json` : `${ORIGIN}/briefs.json`;
    const [briefsRes, threadsRes] = await Promise.all([
      fetch(`${zrodlo}?_=${Date.now()}`),
      fetch(`${ORIGIN}/threads.json?_=${Date.now()}`),
    ]);
    if (!briefsRes.ok) return zapasowa();
    const briefs = await briefsRes.json();
    const items = briefs?.[dawka]?.items ?? [];
    const item = items.find((it: any) => it?.text && itemSlug(it.text) === slug);
    if (!item) return zapasowa();

    // Wątek: mapa znormalizowany tekst węzła → {tytuł, pozycja, ile}. Brak wątku = karta bez osi.
    let watek: { tytul: string; etap: number; ile: number; poprzedni: any } | null = null;
    // Osobno CAŁY wątek — dla karty osi (`w=1`) potrzebujemy wszystkich węzłów, także gdy news jest
    // pierwszym etapem (tam `watek` zostaje null, bo pierwszy etap nie jest kontynuacją).
    let pelnyWatek: { tytul: string; nodes: any[] } | null = null;
    if (threadsRes.ok) {
      const th = await threadsRes.json();
      for (const t of th?.threads ?? []) {
        const nodes = t?.nodes ?? [];
        if (nodes.length < 2) continue;
        const i = nodes.findIndex((n: any) => normKlucz(n?.text) === normKlucz(item.text));
        if (i < 0) continue;
        pelnyWatek ??= { tytul: t.title || '', nodes };
        // Etap 1 nie jest kontynuacją — nie ma czego zapowiadać, więc traktujemy jak news bez wątku.
        if (i > 0) { watek = { tytul: t.title || '', etap: i + 1, ile: nodes.length, poprzedni: nodes[i - 1] }; break; }
      }
    }

    const kiedy = (a: string) => { const s = a || ''; return `${s.slice(8, 10)}.${s.slice(5, 7)} ${s.slice(11, 16)}`; };

    // `w=1` → druga karta: oś ostatnich etapów, do wklejenia w KOMENTARZU pod postem.
    // Gdy news nie należy do żadnego wątku, nie ma czego rysować — wracamy do statycznej grafiki
    // (knaga i tak pokazuje ten przycisk tylko dla newsów z sagą, to jest zabezpieczenie drugiej warstwy).
    if (u.searchParams.get('w') === '1') {
      if (!pelnyWatek) return zapasowa();
      const ostatnie = pelnyWatek.nodes.slice(-MAX_WEZLOW_NA_KARCIE)
        .map((n: any) => ({ kiedy: kiedy(n?.added_at), text: n?.text || '' }));
      const svgW = await satori(kartaWatku(pelnyWatek.tytul, ostatnie, pelnyWatek.nodes.length) as any,
                               { width: 1200, height: 630, fonts: await fonty() });
      await wasmInit();
      const pngW = new Resvg(svgW, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
      return new Response(pngW, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=1800, s-maxage=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const drzewo = watek
      ? karta(item.text, `WĄTEK · ETAP ${watek.etap} Z ${watek.ile}`,
              { kiedy: kiedy(watek.poprzedni?.added_at), text: watek.poprzedni?.text || '' },
              watek.tytul, { ile: watek.ile, akt: watek.etap - 1 })
      : karta(item.text, (item.category || 'Brif.up').toUpperCase(), null,
              // ⚠️ Bez „✓" — satori dostaje WYŁĄCZNIE DM Serif + Space Mono, a Space Mono nie ma
              // U+2713, więc ptaszek renderował się jako pusty prostokąt (tofu). Na froncie ten
              // sam znak działa, bo tam fonty bierze przeglądarka i ma z czego zrobić fallback.
              [kiedy(item.added_at), item.reach ? `${item.reach} źródeł` : null, item.source_name]
                .filter(Boolean).join('  ·  '), null);

    const svg = await satori(drzewo as any, { width: 1200, height: 630, fonts: await fonty() });
    await wasmInit();
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        // Scrapery i tak cache'ują kartę po swojej stronie; to skraca powtórne renderowanie.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        // ⚠️ CORS jest KONIECZNY, odkąd knaga pobiera tę kartę do wrzutki na X (2026-08-02).
        // Scraperom nagłówek nie przeszkadza (nie wykonują JS), a bez niego `fetch` z brifup.com
        // odbija się o politykę pochodzenia i przycisk „Pobierz kartę" nie ma jak zapisać pliku.
        // Obrazek i tak jest publiczny — powstaje z publicznego briefs.json.
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('[og] błąd renderu:', e);
    return zapasowa();
  }
});
