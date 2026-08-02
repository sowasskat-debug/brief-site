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

// Ile etapów wchodzi na kartę osi wątku. Cztery to granica czytelności przy 1200×630 — przy pięciu
// tekst musiałby zejść poniżej 13 px albo urywać się w pół zdania. Bot trzyma do 20 węzłów na wątek,
// więc nagłówek karty mówi wprost „OSTATNIE 4 Z N", żeby nie sugerować, że to cała saga.
const MAX_WEZLOW_NA_KARCIE = 4;

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
function kartaWatku(tytulWatku: string, wezly: { kiedy: string; text: string }[], ile: number) {
  // ⚠️ Lewa kolumna WĘŻSZA niż na karcie nagłówkowej (250 zamiast 330) — życzenie właściciela
  // 2026-08-02: „przesuń kreskę w lewo, żeby się więcej zmieściło". Oś wątku ma cztery etapy po
  // dwie linie, więc każdy piksel szerokości realnie skraca zawijanie; lewa kolumna niosła tylko
  // logo i dwa wiersze podpisu i miała nadmiar miejsca.
  // 🔴 Zmieniając `width` lewej, MUSISZ zmienić `width` prawej o tyle samo (330+2+868 = 250+2+948
  // = 1200). Satori NIE wylicza tego sam — patrz komentarz przy karcie nagłówkowej.
  // Logo zeszło 62→58, bo przy 48 px wcięcia „Brif.up" w 62 px zostawiało ~10 px zapasu do krawędzi
  // kolumny; zawinięcie logo na dwie linie byłoby brzydsze niż ta różnica wielkości.
  const lewa = el('div', {
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    width: 250, padding: '56px 0 56px 48px', boxSizing: 'border-box', flexShrink: 0,
  }, [
    el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 58, color: '#111' }, [
      el('span', {}, 'Brif'), el('span', { color: CZERWONY }, '.up'),
    ]),
    el('div', {
      display: 'flex', flexDirection: 'column', fontFamily: 'SM', fontSize: 12, fontWeight: 700,
      letterSpacing: 2.6, color: '#8f8f8f', marginTop: 20, lineHeight: 2,
    }, ['JAK ROZWIJAŁ SIĘ', 'TEN TEMAT'].map((t) => el('div', {}, t))),
  ]);
  const kreska = el('div', { width: 2, backgroundColor: '#111', margin: '56px 0', flexShrink: 0 });

  const naglowek = ile > wezly.length
    ? `OŚ WĄTKU · OSTATNIE ${wezly.length} Z ${ile} ETAPÓW`
    : `OŚ WĄTKU · ${ile} ${ile === 1 ? 'ETAP' : (ile < 5 ? 'ETAPY' : 'ETAPÓW')}`;

  const wiersze = wezly.map((w, i) => {
    const ostatni = i === wezly.length - 1;
    return el('div', { display: 'flex', marginTop: i === 0 ? 0 : 16 }, [
      // Kolumna osi: kropka + pionowa kreska. Bieżący (ostatni) etap wyróżniony czerwienią i rozmiarem.
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22, flexShrink: 0 }, [
        el('div', {
          width: ostatni ? 13 : 9, height: ostatni ? 13 : 9, borderRadius: 999, marginTop: ostatni ? 3 : 5,
          backgroundColor: ostatni ? CZERWONY : '#c9c9c9',
        }),
        ...(ostatni ? [] : [el('div', { width: 2, flexGrow: 1, marginTop: 4, backgroundColor: '#e4e4e4' })]),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, paddingLeft: 12 }, [
        el('div', { display: 'flex', fontFamily: 'SM', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: ostatni ? CZERWONY : '#9a9a9a' }, w.kiedy),
        // 96→104: szersza kolumna mieści więcej w tych samych DWÓCH liniach, więc podniesienie limitu
        // odzyskuje tekst, który wcześniej ginął w „…". ⚠️ Nie podnoś dalej bez sprawdzenia kadru —
        // trzecia linia w każdym z czterech etapów wypchnęłaby oś poza 630 px (zapas to ~57 px).
        el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 21, color: ostatni ? '#111' : '#4a4a4a', lineHeight: 1.25, marginTop: 3 }, tnij(w.text, 104)),
      ]),
    ]);
  });

  // 948 = 1200 − 250 (lewa) − 2 (kreska). Wcięcie od kreski 48→44, prawy margines 62 bez zmian.
  // Realna szerokość tekstu osi rośnie z 758 do 842 px (+11%).
  const prawa = el('div', {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1,
    padding: '52px 62px 52px 44px', width: 948, boxSizing: 'border-box', minWidth: 0,
  }, [
    el('div', { display: 'flex', fontFamily: 'SM', fontWeight: 700, fontSize: 15, letterSpacing: 3.4, color: CZERWONY }, naglowek),
    el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 30, color: '#111', lineHeight: 1.15, marginTop: 10 }, tnij(tytulWatku, 62)),
    el('div', { display: 'flex', flexDirection: 'column', borderTop: '1.5px solid #111', marginTop: 18, paddingTop: 18 }, wiersze),
  ]);

  return el('div', {
    display: 'flex', width: 1200, height: 630, backgroundColor: '#fff', color: '#111',
    boxSizing: 'border-box', overflow: 'hidden',
  }, [lewa, kreska, prawa]);
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
