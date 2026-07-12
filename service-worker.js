// Service Worker — Brief PWA
// Cel: (1) umożliwić "Zainstaluj jako apkę" na Androidzie,
//      (2) podstawowy cache, żeby apka otwierała się nawet bez sieci,
//      (3) obsługa push notifications przez OneSignal.

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js');

const CACHE_NAME = 'brifup-cache-v16';
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

  // Zewnętrzne API — nie przechwytuj
  if (url.includes('api.anthropic.com') || url.includes('rss2json') ||
      url.includes('supabase') || url.includes('onesignal') ||
      url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    return;
  }

  // Dane (briefs.json, archive/*, rejected.json) — WYŁĄCZNIE sieć, bez cache i bez fallbacku.
  // To newsy: po cichu pokazana stara treść jest groźniejsza niż krótki błąd — a front i tak ma
  // własny łańcuch zapasowy (Supabase, potem dane przykładowe), który przy fallbacku z tego SW
  // nigdy się nie uruchamiał, bo "udany" (choć nieaktualny) wynik z cache maskował awarię sieci.
  if (url.includes('briefs.json') || url.includes('/archive/') || url.includes('rejected.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html — zawsze z sieci, z pominięciem cache przeglądarki (GitHub Pages daje HTML max-age=600,
  // przez co inaczej widać starą wersję nawet przy network-first). cache:'reload' wymusza świeży pobór.
  // Udaną odpowiedź NA BIEŻĄCO zapisujemy jako fallback (cache.put) — dzięki temu w razie zerwania
  // sieci telefon dostanie "ostatnią znaną dobrą wersję", a nie zamrożony stan sprzed pierwszej
  // instalacji PWA (to było źródło sytuacji, w której telefon utykał na starej, zepsutej wersji
  // na całe tygodnie, mimo że komputer zawsze widział najnowszą).
  if (url.endsWith('/') || url.includes('index.html') || !url.includes('.')) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Pozostałe pliki statyczne — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
