// Service Worker — Brief PWA
// Cel: (1) umożliwić "Zainstaluj jako apkę" na Androidzie,
//      (2) podstawowy cache, żeby apka otwierała się nawet bez sieci,
//      (3) obsługa push notifications przez OneSignal.

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js');

const CACHE_NAME = 'brifup-cache-v2';
// Tylko zasoby statyczne które się nie zmieniają często
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
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

  // index.html — zawsze z sieci (żeby zmiany były widoczne od razu)
  if (url.endsWith('/') || url.includes('index.html') || !url.includes('.')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
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
