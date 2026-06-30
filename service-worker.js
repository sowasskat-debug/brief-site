// Service Worker — Brief PWA
// Cel: (1) umożliwić "Zainstaluj jako apkę" na Androidzie,
//      (2) podstawowy cache, żeby apka otwierała się nawet bez sieci,
//      (3) obsługa push notifications przez OneSignal.

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js');

const CACHE_NAME = 'brief-cache-v1';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Instalacja — cache podstawowych plików apki (nie danych z briefs.json,
// te mają być zawsze świeże z sieci)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Aktywacja — usuń stare wersje cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — strategia "network first, cache fallback"
// Dla briefs.json zawsze próbuj sieć najpierw (świeże dane),
// dla resztek (HTML/CSS/ikony) cache jest wystarczający offline.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nie cache'uj wywołań do Anthropic API / RSS proxy / zewnętrznych API
  if (url.includes('api.anthropic.com') || url.includes('rss2json') || url.includes('supabase')) {
    return; // pozwól przejść normalnie do sieci, bez przechwytywania
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Zapisz świeżą wersję do cache w tle
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return response;
      })
      .catch(() => caches.match(event.request)) // offline fallback
  );
});
