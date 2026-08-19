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
// 🔴 KARTA KWADRATOWA (`w=1&pelna=1`) — cała historia wątku do DRUGIEGO posta w nitce (2026-08-11,
// życzenie właściciela: „pierwszy wątek w tekście, potem w obrazku historia wątku").
// ⚠️ DLACZEGO KWADRAT, A NIE „DŁUGI" OBRAZEK: twardy limit X to 4096×4096 px i 5 MB, ale realnym
// ograniczeniem jest KADR W OSI CZASU — pojedynczy obrazek dostaje pełną szerokość kolumny, a wszystko
// wyższe niż mniej więcej 1:1 jest przycinane w feedzie i widoczne w całości dopiero po kliknięciu.
// 1200×1200 to więc maksimum, które czytelnik zobaczy CAŁE, bez wchodzenia w obrazek.
// 📊 Ile etapów wchodzi: kadr rośnie 630 → 1200 px, czyli ~570 px zapasu przy ~105 px na wiersz
// w przypadku SKRAJNYM (każdy etap zawinięty na dwie linie) → 4 + 5 = 9. Bierzemy 8, żeby przypadek
// skrajny miał margines — tak samo jak przy karcie 630, gdzie pierwsze podejście wychodziło poza kadr.
// Górna granica etapów na karcie kwadratowej. To NIE jest liczba etapów, które realnie wejdą —
// tę wylicza `ileWezlowNaKarte` z wysokości, bo długie nagłówki zajmują dwie linie, a krótkie jedną.
const MAX_WEZLOW_KARTA_KWADRAT = 12;

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
// że to cała saga. Najnowszy etap NA GÓRZE (zmiana 2026-08-07, spójnie z /watki i osią pod postem).
// 🔴 WYSOKOŚĆ KARTY PEŁNEJ OSI LICZONA Z TREŚCI (2026-08-11, uwaga właściciela: „długość zależna
// od liczby etapów, żeby nie zostało białe tło na dole"). Sztywne 1200 px przy sadze o 3 etapach
// dawało pół obrazka pustej płachty.
// ⚠️ SUFIT 1200 = kadr X: wszystko wyższe niż ~1:1 jest przycinane w osi czasu i widoczne w całości
// dopiero po kliknięciu. PODŁOGA 600 = 2:1, poniżej tego obrazek robi się paskiem i też bywa kadrowany.
// Liczby ze zmierzonego układu karty 630: szkielet (paddingi + nagłówek + tytuł + kreska) ~224 px,
// wiersz etapu = data 16 + odstęp 3 + linie tekstu po 28 px (23 px × lineHeight 1,22) + 13 px między
// wierszami. Limit `tnij` to 118 znaków, a przy ~1050 px szerokości w linię wchodzi ~62 znaki,
// więc etap zajmuje jedną albo dwie linie — nigdy więcej.
function wysokoscKartyWatku(wezly: { kiedy: string; text: string }[]) {
  // 🔴 STAŁE WYPROWADZONE Z RENDERU, nie z arytmetyki na oko (2026-08-19, przy powiększeniu czcionek).
  // Poprzednie (224/28/62) ZANIŻAŁY wysokość: dla 12 długich etapów model liczył 1267 px, a satori
  // rysował 1324 — czyli treść była CIĘTA dolną krawędzią (`overflow: hidden`), bez żadnego sygnału.
  // Teraz zmierzone realnym renderem (satori + resvg, skan pikseli) na 1, 4 i 12 etapach po pełnym
  // limicie 118 znaków — model trafia CO DO PIKSELA na wszystkich trzech:
  //     card = SZKIELET + Σ (STALA + LINIA × linie)
  // ⚠️ STALA zawiera także odstęp między wierszami. Forma jest zweryfikowana JAKO CAŁOŚĆ na obu
  //    krańcach zakresu, więc nie „porządkuj" jej, rozbijając margines na osobny składnik, bez
  //    ponownego pomiaru — dokładnie tak powstał poprzedni, zaniżający model.
  const SZKIELET = 243, STALA = 37, LINIA = 33, NA_LINIE = 76;
  let h = SZKIELET;
  wezly.forEach((w) => {
    const dl = Math.min((w.text || '').length, 118);
    const linie = Math.min(2, Math.max(1, Math.ceil(dl / NA_LINIE)));
    h += STALA + linie * LINIA;
  });
  return Math.max(600, Math.min(1200, Math.round(h)));
}

// Ile etapów realnie wejdzie pod sufit 1200 px. Zdejmujemy NAJSTARSZE, aż się zmieści — bo karta i tak
// pokazuje „OSTATNIE N Z M", a najnowszy etap jest najważniejszy.
// 🔴 BEZ TEGO SUFIT BY CIĄŁ TREŚĆ: `overflow: hidden` na kadrze oznacza, że przy 12 długich etapach
// (~1244 px wyliczonego) dwunasty zostałby po prostu obcięty dolną krawędzią, bez żadnego sygnału.
function ileWezlowNaKarte(wezly: { kiedy: string; text: string }[]) {
  let ile = Math.min(wezly.length, MAX_WEZLOW_KARTA_KWADRAT);
  while (ile > 1 && wysokoscKartyWatku(wezly.slice(0, ile)) >= 1200) ile--;
  return ile;
}

// 🔴 Ile etapów realnie wejdzie w SZTYWNY kadr 630 px karty `w=1` (2026-08-19, przy powiększeniu
// czcionek). Zasada ta sama co `ileWezlowNaKarte` dla kwadratu: zdejmujemy NAJSTARSZE, aż się mieści.
// POWÓD: przy etapie 27 px cztery pozycje po pełnym limicie 118 znaków potrzebują 655 px, czyli
// 25 px WIĘCEJ niż kadr — a `overflow: hidden` uciąłby czwarty etap bez żadnego sygnału. Dokładnie
// ta wpadka zdarzyła się już raz (pierwsze podejście 46/25 px). Lepiej pokazać 3 etapy z pełnym
// tekstem niż 4, z których ostatni jest przecięty w pół — nagłówek i tak mówi „OSTATNIE N Z M".
// ⚠️ Typowy nagłówek zajmuje jedną linię, więc realnie prawie zawsze wchodzą wszystkie cztery;
//    zejście do trzech dotyczy sag o wyjątkowo długich tytułach etapów.
function ileWezlowNa630(wezly: { kiedy: string; text: string }[]) {
  let ile = Math.min(wezly.length, MAX_WEZLOW_NA_KARCIE);
  while (ile > 1 && wysokoscKartyWatku(wezly.slice(0, ile)) > 630) ile--;
  return ile;
}

function kartaWatku(tytulWatku: string, wezly: { kiedy: string; text: string }[], ile: number, wysokosc = 630, rozciagnij = false) {
  // 🔴 UKŁAD PRZYWRÓCONY 2026-08-10 — logo w PRAWYM GÓRNYM rogu, treść na PEŁNĄ SZEROKOŚĆ.
  // Zgłoszenie właściciela ze zrzutem: „tak wyglądało wcześniej, nie wiem po co się zmieniło".
  // Miał rację, a przyczyna jest pouczająca: **tego układu NIGDY NIE BYŁO W REPO**. Wszystkie
  // wersje tego pliku od pierwszej (02.08 10:17) miały lewą kolumnę z logo 58-62 px i pionową
  // kreską; wariant pełnoszerokościowy żył WYŁĄCZNIE we wdrożonej funkcji, wgrany ręcznie i nigdy
  // niezacommitowany. 07.08 poszły dwa deploye z repo (#101 bramki wejścia, #109 najnowszy etap
  // na górze) i każdy z nich nadpisał go układem z repo.
  // ⚠️ **DLATEGO TEN UKŁAD MUSI ŻYĆ W REPO.** Deploy funkcji nie idzie przez git
  // (`supabase functions deploy og --no-verify-jwt`), więc wygląd trzymany tylko na serwerze ginie
  // przy pierwszej zmianie czegokolwiek innego. Nie wdrażaj tej funkcji z kopii innej niż repo.
  //
  // Zysk uboczny: bez lewej kolumny wiersz osi jest o ~250 px szerszy, więc limit znaków na etap
  // idzie 104 → 118 i typowe nagłówki przestają się urywać wielokropkiem w pół zdania
  // (drugie zgłoszenie właściciela z tego samego dnia).
  const naglowek = ile > wezly.length
    ? `OŚ WĄTKU · OSTATNIE ${wezly.length} Z ${ile} ETAPÓW`
    : `OŚ WĄTKU · ${ile} ${ile === 1 ? 'ETAP' : (ile < 5 ? 'ETAPY' : 'ETAPÓW')}`;

  // Najnowszy etap jest PIERWSZY (caller robi `.reverse()`), więc wyróżniamy `i === 0` — spójnie
  // z /watki.html i osią pod postem (decyzja właściciela z 2026-08-07).
  const wiersze = wezly.map((w, i) => {
    const akt = i === 0;
    const ostatni = i === wezly.length - 1;
    return el('div', { display: 'flex', marginTop: i === 0 ? 0 : 13, flexShrink: 0 }, [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }, [
        el('div', {
          width: akt ? 14 : 10, height: akt ? 14 : 10, borderRadius: 999, marginTop: akt ? 4 : 6,
          backgroundColor: akt ? CZERWONY : '#c9c9c9',
        }),
        // Kreska łączy w DÓŁ — znika przy ostatnim (najstarszym) wierszu, nie przy czerwonym.
        ...(ostatni ? [] : [el('div', { width: 2, flexGrow: 1, marginTop: 5, backgroundColor: '#e4e4e4' })]),
      ]),
      el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0, paddingLeft: 14 }, [
        el('div', { display: 'flex', fontFamily: 'SM', fontSize: 14, fontWeight: 700, letterSpacing: 1.6, color: akt ? CZERWONY : '#9a9a9a' }, w.kiedy),
        el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 27, color: akt ? '#111' : '#3d3d3d', lineHeight: 1.22, marginTop: 3 }, tnij(w.text, 118)),
      ]),
    ]);
  });

  // 🔴 ROZMIARY ZMIERZONE NA PRZYPADKU SKRAJNYM, nie dobrane na oko: cztery etapy po pełnym limicie
  // 118 znaków (każdy zawija się na dwie linie) + tytuł. Pierwsze podejście (tytuł 46 px, etap 25 px)
  // WYCHODZIŁO POZA KADR — czwarty etap był ucięty dolną krawędzią. Przy 38/23 px mieści się z zapasem.
  // ⚠️ Podnosząc którykolwiek rozmiar albo limit `tnij`, przerenderuj przypadek skrajny, nie typowy.
  // ⚠️ `flexShrink: 0` na nagłówku, tytule i bloku osi jest OBOWIĄZKOWE: bez tego satori przy nadmiarze
  // treści ściska pudełko tytułu i pozioma kreska wjeżdża w litery (złapane na podglądzie).
  return el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: wysokosc, backgroundColor: '#fff',
    color: '#111', boxSizing: 'border-box', padding: '54px 62px 50px', overflow: 'hidden',
  }, [
    el('div', { display: 'flex', flexShrink: 0, alignItems: 'flex-start', justifyContent: 'space-between' }, [
      el('div', { display: 'flex', fontFamily: 'SM', fontWeight: 700, fontSize: 16, letterSpacing: 3.4, color: CZERWONY, paddingTop: 8 }, naglowek),
      el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 44, color: '#111', flexShrink: 0 }, [
        el('span', {}, 'Brif'), el('span', { color: CZERWONY }, '.up'),
      ]),
    ]),
    el('div', { display: 'flex', flexShrink: 0, fontFamily: 'DMS', fontSize: 44, color: '#111', lineHeight: 1.12, marginTop: 10, paddingBottom: 2 }, tnij(tytulWatku, 54)),
    // ⚠️ `rozciagnij` = kadr jest WYŻSZY niż treść, bo wysokość uderzyła w podłogę 600 px (proporcja 2:1,
    // poniżej której X zaczyna kadrować). Zamiast zostawiać pas bieli na dole, rozkładamy nadmiar RÓWNO
    // między etapy — uwaga właściciela: „żeby nie zostało białe tło na dole bez sensu".
    el('div', {
      display: 'flex', flexDirection: 'column', flexShrink: 0, borderTop: '2px solid #111',
      marginTop: 12, paddingTop: 18,
      ...(rozciagnij ? { flexGrow: 1, justifyContent: 'space-between' } : {}),
    }, wiersze),
  ]);
}

// Karta KLASTRA (`k=1`) — 2026-08-10, życzenie właściciela: „chcę udostępnić cały klaster".
// Klaster to jedno wydarzenie opisane przez kilka źródeł, a dotąd „WRZUĆ NA X" na grupie brało tekst
// samej kotwicy i gubiło całą jego wartość. Układ CELOWO taki sam jak karta wątku (logo w prawym górnym
// rogu, treść pełną szerokością) — obie lądują w tej samej nitce i mają wyglądać jak jedna rodzina.
// ⚠️ BEZ NAZW REDAKCJI (wybór właściciela): „3 ŹRÓDŁA" brzmi jak argument, dopóki nie przeczyta się
// jakie — realny klaster z tego dnia miał Wealth Professional, InvestmentNews i KELO-AM (lokalna stacja
// radiowa). Kicker mówi więc o LICZBIE NEWSÓW, nie o wiarygodności, której te nazwy nie dowożą.
// ⚠️ Trzy pozycje to granica kadru — czwarta wypycha oś poza 630 px. Rozmiary podniesione 2026-08-19
// razem z kartą wątku (tytuł 44 px, pozycje 27 px), bo obie idą w tej samej nitce i muszą wyglądać
// jak jedna rodzina. 📊 Zmierzone realnym renderem: trzy pozycje po pełnym limicie 118 znaków to
// 484 px przy kadrze 630 — zapas jest spory, ale CZWARTEJ nadal nie dokładaj bez ponownego pomiaru.
// Nagłówek mówi „3 Z N", gdy jest ich więcej.
const MAX_POZYCJI_KLASTRA = 3;

function kartaKlastra(tytul: string, pozycje: string[], ile: number) {
  const naglowek = ile > pozycje.length
    ? `JEDEN TEMAT · ${pozycje.length} Z ${ile} NEWSÓW`
    : `JEDEN TEMAT · ${ile} ${ile === 1 ? 'NEWS' : (ile < 5 ? 'NEWSY' : 'NEWSÓW')}`;

  const wiersze = pozycje.map((t, i) =>
    el('div', { display: 'flex', marginTop: i === 0 ? 0 : 15, flexShrink: 0 }, [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }, [
        el('div', { width: 10, height: 10, borderRadius: 999, marginTop: 9, backgroundColor: CZERWONY }),
      ]),
      el('div', { display: 'flex', flexGrow: 1, minWidth: 0, paddingLeft: 14, fontFamily: 'DMS', fontSize: 27, color: '#222', lineHeight: 1.22 },
         tnij(t, 118)),
    ]));

  return el('div', {
    display: 'flex', flexDirection: 'column', width: 1200, height: 630, backgroundColor: '#fff',
    color: '#111', boxSizing: 'border-box', padding: '54px 62px 50px', overflow: 'hidden',
  }, [
    el('div', { display: 'flex', flexShrink: 0, alignItems: 'flex-start', justifyContent: 'space-between' }, [
      el('div', { display: 'flex', fontFamily: 'SM', fontWeight: 700, fontSize: 16, letterSpacing: 3.4, color: CZERWONY, paddingTop: 8 }, naglowek),
      el('div', { display: 'flex', fontFamily: 'DMS', fontSize: 44, color: '#111', flexShrink: 0 }, [
        el('span', {}, 'Brif'), el('span', { color: CZERWONY }, '.up'),
      ]),
    ]),
    el('div', { display: 'flex', flexShrink: 0, fontFamily: 'DMS', fontSize: 44, color: '#111', lineHeight: 1.12, marginTop: 10, paddingBottom: 2 }, tnij(tytul, 54)),
    el('div', { display: 'flex', flexDirection: 'column', flexShrink: 0, borderTop: '2px solid #111', marginTop: 12, paddingTop: 18 }, wiersze),
  ]);
}

function zapasowa() {
  return new Response(null, { status: 302, headers: { Location: ZAPASOWY_OBRAZEK, 'Cache-Control': 'public, max-age=300' } });
}

// ══ Bramki wejścia (2026-08-07) ════════════════════════════════════════════
// Funkcja jest wdrażana z `--no-verify-jwt` (scraper nie ma i nie może mieć tokenu), więc każdy
// może ją wołać w pętli. Limit wywołań Edge Functions jest WSPÓLNY dla całego projektu, czyli
// wypalenie go kładzie także licznik wejść i gotowiec-x. Stąd trzy tanie bramki poniżej.
const DAWKI = new Set(['morning', 'afternoon', 'evening']);
const WZORZEC_SLUGU = /^[a-z0-9]{1,16}$/;     // itemSlug: djb2-xor → base36
const WZORZEC_DATY  = /^\d{4}-\d{2}-\d{2}$/;
// 🔴 `k` DOPISANE 2026-08-10 razem z kartą klastra. Nieznany parametr wraca `zapasowa()`, więc
// dodanie go do adresu BEZ dopisania tutaj zamieniłoby każdą kartę w statyczną grafikę.
// 🔴 KAŻDY NOWY PARAMETR MUSI TU WEJŚĆ — nieznany parametr wraca `zapasowa()`, czyli KAŻDA karta
// zamieniłaby się w statyczną grafikę. To nie formalność, tylko warunek działania (lekcja z `k=1`).
const ZNANE_PARAMY  = new Set(['s', 'd', 'a', 'w', 'k', 'pelna']);

// Pamięć podręczna w instancji funkcji. Kilkanaście kart z jednej dawki (typowa wrzutka na X,
// albo pętla nadużycia) pobierało briefs.json + threads.json ZA KAŻDYM RAZEM — po ~360 KB
// z brifup.com na jedno wywołanie. TTL 60 s: karty zostają świeże, a ruch do originu spada
// do jednego pobrania na minutę niezależnie od liczby żądań.
const TTL_MS = 60_000;
const podreczne = new Map<string, { czas: number; dane: any }>();
async function pobierzJSON(url: string): Promise<any | null> {
  const teraz = Date.now();
  const wpis = podreczne.get(url);
  if (wpis && teraz - wpis.czas < TTL_MS) return wpis.dane;
  const r = await fetch(url);
  if (!r.ok) return null;
  const dane = await r.json();
  podreczne.set(url, { czas: teraz, dane });
  return dane;
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);

    // Nieznany parametr = nie nasze żądanie. Bez tego dowolny `&x=<losowe>` tworzył NOWY klucz
    // cache CDN mimo `s-maxage`, więc każde takie żądanie wymuszało pełny render satori+resvg.
    for (const klucz of u.searchParams.keys()) {
      if (!ZNANE_PARAMY.has(klucz)) return zapasowa();
    }

    const slug = u.searchParams.get('s') || '';
    const dawka = u.searchParams.get('d') || 'morning';
    const archiwum = u.searchParams.get('a');   // YYYY-MM-DD dla itemów z archiwum
    if (!WZORZEC_SLUGU.test(slug)) return zapasowa();
    if (!DAWKI.has(dawka)) return zapasowa();
    // 🔴 `archiwum` wchodzi do ŚCIEŻKI URL-a, więc bez tego wzorca `a=../../coś` wyprowadzało
    // pobieranie poza katalog archive/ (podstawienie ścieżki). Data albo nic.
    if (archiwum !== null && !WZORZEC_DATY.test(archiwum)) return zapasowa();

    const zrodlo = archiwum ? `${ORIGIN}/archive/${archiwum}.json` : `${ORIGIN}/briefs.json`;
    const [briefs, threadsDane] = await Promise.all([
      pobierzJSON(zrodlo),
      pobierzJSON(`${ORIGIN}/threads.json`),
    ]);
    if (!briefs) return zapasowa();
    // ⚠️ SZUKAMY TAKŻE W PODPOZYCJACH KLASTRA (2026-08-04, zgłoszenie właściciela: „przy tym poście nie
    // generuje mi zdjęcia z wątkami"). Wcześniej `items.find(...)` przeglądał WYŁĄCZNIE poziom top-level,
    // więc dla slugu podpozycji `item` wychodził null i funkcja wracała `zapasowa()` — czyli statyczną
    // grafikę strony głównej. Objaw mylił: knaga poprawnie pokazywała przycisk „Pobierz kartę wątku
    // (9 etapów)", bo ona ma obiekt newsa w ręku i wątek znajdowała; padał dopiero generator obrazka.
    // Realny przypadek: „SpaceX nawiązuje współpracę z Nvidią…" (slug zkowbz) to podpozycja klastra,
    // a jednocześnie węzeł sagi w7 „SpaceX po debiucie giełdowym".
    // `_kotwica` niesie tekst kotwicy — patrz dziedziczenie wątku niżej.
    const items = briefs?.[dawka]?.items ?? [];
    const plaskie: any[] = [];
    for (const it of items) {
      plaskie.push(it);
      for (const s of (it?.subItems ?? [])) plaskie.push({ ...s, _kotwica: it?.text || '' });
    }
    const item = plaskie.find((it: any) => it?.text && itemSlug(it.text) === slug);
    if (!item) return zapasowa();

    // Wątek: mapa znormalizowany tekst węzła → {tytuł, pozycja, ile}. Brak wątku = karta bez osi.
    let watek: { tytul: string; etap: number; ile: number; poprzedni: any } | null = null;
    // Osobno CAŁY wątek — dla karty osi (`w=1`) potrzebujemy wszystkich węzłów, także gdy news jest
    // pierwszym etapem (tam `watek` zostaje null, bo pierwszy etap nie jest kontynuacją).
    let pelnyWatek: { tytul: string; nodes: any[] } | null = null;
    if (threadsDane) {
      const th = threadsDane;
      // Podpozycja klastra DZIEDZICZY wątek po kotwicy, tak samo jak front (brief-site #93): bot buduje
      // sagi wyłącznie z pozycji top-level, a klaster znaczy „to samo wydarzenie z różnych źródeł",
      // więc podpozycja jest tym samym etapem co kotwica. Najpierw próbujemy dopasować własny tekst.
      const klucze = [normKlucz(item.text)];
      if (item._kotwica) klucze.push(normKlucz(item._kotwica));
      for (const t of th?.threads ?? []) {
        const nodes = t?.nodes ?? [];
        if (nodes.length < 2) continue;
        let i = -1;
        for (const k of klucze) {
          i = nodes.findIndex((n: any) => normKlucz(n?.text) === k);
          if (i >= 0) break;
        }
        if (i < 0) continue;
        pelnyWatek ??= { tytul: t.title || '', nodes };
        // Etap 1 nie jest kontynuacją — nie ma czego zapowiadać, więc traktujemy jak news bez wątku.
        if (i > 0) { watek = { tytul: t.title || '', etap: i + 1, ile: nodes.length, poprzedni: nodes[i - 1] }; break; }
      }
    }

    const kiedy = (a: string) => { const s = a || ''; return `${s.slice(8, 10)}.${s.slice(5, 7)} ${s.slice(11, 16)}`; };

    // `k=1` → karta KLASTRA: kotwica plus ujęcia pozostałych źródeł tego samego wydarzenia.
    // Slug może wskazywać KOTWICĘ albo dowolną PODPOZYCJĘ — w obu przypadkach rysujemy całą grupę,
    // bo właściciel udostępnia klaster jako jedną rzecz, niezależnie od tego, w co kliknął.
    if (u.searchParams.get('k') === '1') {
      const kotwica = item.subItems?.length
        ? item
        : items.find((t: any) => (t?.subItems ?? []).some((x: any) => x?.text && itemSlug(x.text) === slug));
      const pod = (kotwica?.subItems ?? []).map((x: any) => String(x?.text ?? '').trim()).filter(Boolean);
      // Brak podpozycji = to nie jest klaster i nie ma czego rysować. Knaga pokazuje ten przycisk
      // tylko dla grup, więc to zabezpieczenie drugiej warstwy (wzorzec z `w=1`).
      if (!kotwica || pod.length === 0) return zapasowa();
      const svgK = await satori(kartaKlastra(kotwica.text, pod.slice(0, MAX_POZYCJI_KLASTRA), pod.length) as any,
                                { width: 1200, height: 630, fonts: await fonty() });
      await wasmInit();
      const pngK = new Resvg(svgK, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
      return new Response(pngK, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=1800, s-maxage=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // `w=1` → druga karta: oś ostatnich etapów, do wklejenia w KOMENTARZU pod postem.
    // Gdy news nie należy do żadnego wątku, nie ma czego rysować — wracamy do statycznej grafiki
    // (knaga i tak pokazuje ten przycisk tylko dla newsów z sagą, to jest zabezpieczenie drugiej warstwy).
    if (u.searchParams.get('w') === '1') {
      if (!pelnyWatek) return zapasowa();
      // `pelna=1` → kwadrat 1200×1200 z całą osią (do 8 etapów). Bez niej klasyczne 1200×630 z 4 etapami.
      const pelna = u.searchParams.get('pelna') === '1';
      const wszystkie = pelnyWatek.nodes.slice(-MAX_WEZLOW_KARTA_KWADRAT).reverse()
        .map((n: any) => ({ kiedy: kiedy(n?.added_at), text: n?.text || '' }));
      const ostatnie = pelna ? wszystkie.slice(0, ileWezlowNaKarte(wszystkie))
                             : wszystkie.slice(0, ileWezlowNa630(wszystkie));
      const wys = pelna ? wysokoscKartyWatku(ostatnie) : 630;
      // Policzona wysokość uderzyła w PODŁOGĘ (treść niższa niż 600 px) → rozciągamy odstępy zamiast bielić dół.
      const rozciagnij = pelna && wysokoscKartyWatku(ostatnie) === 600 && ostatnie.length < 7;
      const svgW = await satori(kartaWatku(pelnyWatek.tytul, ostatnie, pelnyWatek.nodes.length, wys, rozciagnij) as any,
                               { width: 1200, height: wys, fonts: await fonty() });
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
