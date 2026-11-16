/**
 * KodaPlayGames Service Worker
 * Uses relative paths so it works identically on GitHub Pages (/kodaplaygames/)
 * and after switching to your custom root domain (kodaplaygames.com).
 */

const CACHE_NAME = 'kodaplaygames-tactical-v2';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './assets/logo-transparent.png',
  './assets/banner.png',
  './assets/offline.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install: Pre-cache core app shell and brand assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for HTML navigation, Cache-first for static local assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Let third-party embeds and RSS requests bypass the local cache
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
      );
    })
  );
});