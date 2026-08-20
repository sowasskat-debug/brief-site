// Service Worker — Brief PWA
// Cel: (1) umożliwić "Zainstaluj jako apkę" na Androidzie,
//      (2) podstawowy cache, żeby apka otwierała się nawet bez sieci,
//      (3) obsługa push notifications przez OneSignal.

// OneSignal z CDN bywa blokowany przez adblock/DNS — bez try padłaby CAŁA instalacja SW
// (razem z cache i obsługą offline), nie tylko push.
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js'); }
catch (e) { /* push niedostępny, reszta SW działa */ }

const CACHE_NAME = 'brifup-cache-v131';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
  './styles.css',
  './flagi.js',
];

// ⚠️ `fonts/TwemojiCountryFlags.woff2` CELOWO NIE JEST precache'owany. Font naprawia flagi
// na Windowsie i pobiera go wyłącznie ten, komu system ich nie rysuje (patrz `flagi.js`);
// wpisanie go tutaj kazałoby ściągnąć 78 KB KAŻDEMU — także na telefonie, gdzie flagi działają.
// Gdy jest realnie potrzebny, i tak trafi do cache zwykłą gałęzią „pozostałe statyczne".

// 🔴 STRONA AWARYJNA — ostatnia deska ratunku dla NAWIGACJI (2026-08-11, zgłoszenie właściciela:
// „czasami po otwarciu apki na Androidzie muszę zrestartować, żeby się odpalił brifup", zrzut czystej bieli).
// Gałąź nawigacyjna potrafiła oddać `undefined` (pusty cache + padnięta sieć), a `respondWith` z czymś,
// co nie jest Response, kończy nawigację BŁĘDEM. Zweryfikowane eksperymentem w Chromium na odtworzonej
// gałęzi: `chrome-error://chromewebdata/`, dokument 39 znaków, zero treści. W zwykłej karcie przeglądarka
// dorysowuje swój komunikat — w PWA (standalone) nie ma ani paska, ani strony błędu, więc zostaje BIEL.
// 🔴 I to jest powód, dla którego watchdog z `index.html` nie ratował: pusty dokument = żaden skrypt się
// nie wykonuje, a watchdog siedzi WEWNĄTRZ strony, której nie ma. Jedynym wyjściem był restart apki.
// Ta strona sama próbuje wrócić (3 podejścia z rosnącą przerwą), a potem daje przycisk — czyli nawet
// przy trwałym braku sieci czytelnik widzi komunikat, nie białą płachtę.
const STRONA_AWARYJNA = `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Brif.up</title>
<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:flex;align-items:center;
justify-content:center;background:#fbfbf9;color:#111;font:16px/1.5 system-ui,-apple-system,sans-serif;
text-align:center;padding:24px}@media(prefers-color-scheme:dark){body{background:#101014;color:#e7e7ea}}
.b{font:700 30px Georgia,serif;letter-spacing:-.5px}.b i{color:#e01f0f;font-style:normal}
p{color:#6b7280;max-width:20rem;margin:14px auto 22px}
button{font:600 15px system-ui;padding:11px 22px;border:1px solid #e01f0f;background:#e01f0f;color:#fff;
border-radius:8px;cursor:pointer}</style></head><body><div>
<div class="b">Brif<i>.</i>up</div>
<p id="m">Nie udało się wczytać wydania. Próbuję ponownie…</p>
<button onclick="sessionStorage.removeItem('brifup_retry');location.reload()">Spróbuj ponownie</button>
</div><script>
// Auto-powrót: 3 podejścia (1,5 s / 3 s / 6 s). Licznik w sessionStorage, żeby przy trwałej awarii
// nie wpaść w nieskończone przeładowania — po trzecim zostaje przycisk.
var n = parseInt(sessionStorage.getItem('brifup_retry') || '0', 10);
if (n < 3) { sessionStorage.setItem('brifup_retry', String(n + 1));
  setTimeout(function(){ location.reload(); }, 1500 * Math.pow(2, n)); }
else { document.getElementById('m').textContent = 'Brak połączenia z siecią. Sprawdź internet i spróbuj ponownie.'; }
</script></body></html>`;

const odpowiedzAwaryjna = () => new Response(STRONA_AWARYJNA, {
  status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    // 🔴 POWŁOKA PRECACHE'OWANA JUŻ PRZY INSTALACJI (2026-08-11) — to druga połowa naprawy białego ekranu.
    // `activate` kasuje cache o innej nazwie, więc po KAŻDYM bumpie `CACHE_NAME` cache powłoki był PUSTY,
    // a `index.html` świadomie nie był precache'owany. Pierwsze otwarcie apki po deployu szło więc wyłącznie
    // z sieci — i wystarczyło, żeby Android wstający z uśpienia nie dowiózł pierwszego żądania. Przy tempie
    // deployów tego projektu to okno wypadało kilka razy dziennie.
    // ⚠️ OSOBNO od `addAll`, we własnym try: `addAll` jest wszystko-albo-nic, więc nieudane pobranie powłoki
    // wywaliłoby CAŁĄ instalację SW (czyli i offline, i push). Brak powłoki w cache = zachowanie jak dotąd.
    // ⚠️ Świeżość bez zmian: pilnują jej dalej stale-while-revalidate + `checkAppShellUpdate` (ETag).
    try {
      const powloka = await fetch('./index.html', { cache: 'reload' });
      if (powloka.ok) await cache.put('./index.html', powloka);
    } catch (_) { /* brak sieci przy instalacji — powłoka dojdzie przy pierwszej udanej nawigacji */ }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nie-GET (HEAD z sond wersji, ewentualne POST-y) — czysta sieć; cache.put dla nie-GET rzuca.
  if (event.request.method !== 'GET') { event.respondWith(fetch(event.request)); return; }

  // Zewnętrzne API — nie przechwytuj
  if (url.includes('api.anthropic.com') || url.includes('rss2json') ||
      url.includes('onesignal') ||
      url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    return;
  }

  // Dane (briefs.json, archive/*, rejected.json) — WYŁĄCZNIE sieć, bez cache i bez fallbacku.
  // To newsy: po cichu pokazana stara treść jest groźniejsza niż krótki błąd — a front i tak ma
  // własny łańcuch zapasowy (Supabase, potem dane przykładowe), który przy fallbacku z tego SW
  // nigdy się nie uruchamiał, bo "udany" (choć nieaktualny) wynik z cache maskował awarię sieci.
  // ⚠️ threads.json/quotes.json DOPISANE 2026-08-07 — bez nich wpadały w gałąź „pozostałe statyczne"
  // na samym dole, która robi `cache.put(event.request)`. A front pobiera je z cache-busterem
  // `?_=${Date.now()}`, więc KAŻDE odświeżenie zapisywało NOWY wpis pod nowym URL-em, a nic nigdy
  // ich nie kasowało (jedyne czyszczenie to zmiana CACHE_NAME). Otwarta apka przy ~20 zapisach bota
  // na dobę dokładała ~3 MB dziennie do Cache Storage. Te pliki są danymi jak briefs.json i mają
  // dokładnie ten sam powód, żeby iść czystą siecią: stara treść pokazana po cichu jest groźniejsza
  // niż błąd. Diagnostyczne brief_health/deepseek_usage/bot_health — tak samo (czyta je panel).
  if (url.includes('briefs.json') || url.includes('/archive/') || url.includes('rejected.json') ||
      url.includes('lejek.json') || url.includes('threads.json') || url.includes('quotes.json') ||
      url.includes('brief_health.json') || url.includes('deepseek_usage.json') || url.includes('bot_health.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html (app-shell) — STALE-WHILE-REVALIDATE, ale TYLKO dla realnych NAWIGACJI (wejście/odświeżenie
  // strony). Serwujemy natychmiast z cache (szybkie ładowanie, koniec czekania na sieć), a w tle pobieramy
  // świeży i podmieniamy cache na następny raz.
  // ⚠️ Świeżość/wersję pilnuje OSOBNO `checkAppShellUpdate` w index.html: przy każdym wejściu i powrocie do
  // apki pobiera index.html SIECIĄ (żądanie NIE-nawigacyjne, `fetch('./index.html',{cache:'reload'})` →
  // NIE trafia w tę gałąź, tylko w network-first niżej, która AKTUALIZUJE ten sam cache pod './index.html'),
  // porównuje ETag i gdy się zmienił — przeładowuje raz. Dzięki temu:
  //   1. zwykłe ładowanie = błyskawiczne (z cache),
  //   2. po deployu bezpiecznik pobiera świeżą powłokę siecią → wpisuje do cache → reload serwuje już NOWĄ,
  //   3. apka NIE MOŻE utknąć na starej wersji — bezpiecznik łapie zmianę w ciągu jednego powrotu do apki
  //      (to była trauma „zamrożenia na starej, zepsutej wersji na tygodnie"; tu detekcja + reload zostają).
  // ⚠️ TYLKO nawigacja do powłoki głównej (/, /index.html) dostaje app-shell z cache. Scope SW to cały
  // origin, więc w tę gałąź wpadały też wejścia na PODSTRONY (lejek.html/knaga.html/fala.html/maszynownia.html):
  //   (a) serwowały index.html ZAMIAST właściwej strony (użytkownik wchodzi na lejek → widzi główną apkę),
  //   (b) rewalidacja w tle robiła cache.put('./index.html', <treść podstrony>) → ZATRUCIE powłoki treścią
  //       lejka (response.ok=true, więc check !cached.ok tego nie łapał) → każdy kolejny start PWA otwierał
  //       lejek jako stronę główną, do czasu aż watchdog (8 s białego ekranu) wyczyścił cache.
  // Podstrony puszczamy do network-first niżej — cache'ują się pod WŁASNYM URL-em, nie nadpisują powłoki.
  let sciezkaNav = '/';
  try { sciezkaNav = new URL(url).pathname; } catch (_) {}
  const toPowlokaGlowna = sciezkaNav === '/' || sciezkaNav.endsWith('/index.html');
  if (event.request.mode === 'navigate' && toPowlokaGlowna) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // ⚠️ ZATRUTY CACHE (2026-07-17, „białe tło przy starcie"): wcześniej cache.put szedł BEZ
        // sprawdzenia response.ok — błąd 5xx/zaślepka Cloudflare lądowała w cache jako powłoka
        // i stale-while-revalidate serwował ją NATYCHMIAST przy każdym starcie. Teraz: (1) do cache
        // trafia wyłącznie response.ok, (2) zatruty/niepełny wpis w cache jest ignorowany.
        let cached = await cache.match('./index.html');
        if (cached && !cached.ok) { cached = undefined; cache.delete('./index.html'); }
        const siec = fetch(event.request, { cache: 'reload' })
          .then((response) => { if (response.ok) cache.put('./index.html', response.clone()); return response; })
          .catch(() => null);
        // 🔴 `respondWith` MUSI dostać Response. Wcześniej `.catch(() => cached)` przy pustym cache oddawał
        // `undefined` → nawigacja kończyła się błędem → w PWA czysta biel bez żadnego skryptu, który mógłby
        // to naprawić (patrz STRONA_AWARYJNA). Teraz każda ścieżka kończy się realną odpowiedzią.
        // ⚠️ Strony awaryjnej NIGDY nie zapisujemy do cache — wylądowałaby tam jako powłoka i apka
        // startowałaby z niej przy każdym otwarciu. To ta sama pułapka co „zatruty cache" z 17.07.
        return cached || (await siec) || odpowiedzAwaryjna();
      })
    );
    return;
  }

  // Pozostałe pliki statyczne — network first, cache fallback.
  // ⚠️ CSS/JS pobieramy z cache:'reload' (tak jak index.html wyżej) — inaczej zwykły fetch bierze STARĄ
  // wersję z cache przeglądarki/Cloudflare (GitHub Pages daje styles.css max-age), więc po zmianie stylów
  // telefon dostaje NOWY index.html + STARY styles.css = rozjechany render (flaga sklejona z kategorią,
  // brak wersalików i czerwonego badge'a — zgłoszone 2026-07-16). Bump CACHE_NAME nie wystarczał, bo
  // problemem był cache HTTP, nie cache SW. cache:'reload' wymusza świeży pobór, z cache fallbackiem offline.
  // ⚠️ PODSTRONY .html TEŻ (2026-08-01): regex łapał tylko css|js, więc `knaga.html`
  // (panel — cały kod inline w HTML) szedł zwykłym fetch, który respektuje cache
  // przeglądarki. GitHub Pages daje `max-age=600`, czyli po deployu właściciel przez
  // 10 MINUT widział starą wersję panelu i myślał, że zmiana nie weszła — zgłoszone
  // („wrzuciłeś update? bo chyba wciąż to samo"), plik na produkcji był już poprawny.
  // Ta sama przyczyna co przy CSS 2026-07-16: problemem jest cache HTTP, nie cache SW,
  // więc sam bump CACHE_NAME tego NIE rozwiązuje. Powłoka główna ma własną gałąź wyżej.
  const wymusSwiezyCssJs = /\.(css|js|html)(\?|$)/i.test(event.request.url);
  event.respondWith(
    fetch(event.request, wymusSwiezyCssJs ? { cache: 'reload' } : undefined)
      .then((response) => {
        if (response.ok) {   // nie cache'uj błędów/zaślepek — patrz komentarz przy nawigacji
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
