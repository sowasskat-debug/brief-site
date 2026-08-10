// Service Worker — Brief PWA
// Cel: (1) umożliwić "Zainstaluj jako apkę" na Androidzie,
//      (2) podstawowy cache, żeby apka otwierała się nawet bez sieci,
//      (3) obsługa push notifications przez OneSignal.

// OneSignal z CDN bywa blokowany przez adblock/DNS — bez try padłaby CAŁA instalacja SW
// (razem z cache i obsługą offline), nie tylko push.
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js'); }
catch (e) { /* push niedostępny, reszta SW działa */ }

const CACHE_NAME = 'brifup-cache-v93';
// UWAGA: index.html NIE jest tu precache'owany — patrz komentarz przy jego fetch-handlerze niżej.
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
  './styles.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
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
          .catch(() => cached);
        return cached || siec;   // jest DOBRY cache → oddaj OD RAZU (sieć odświeża w tle); brak → czekaj na sieć
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
