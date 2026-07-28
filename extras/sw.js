'use strict';

const CACHE_NAME = 'gameforge-lite-v2.1.1-advanced-weapons-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/core.js',
  './js/generators.js',
  './js/app.js',
  './local-vocabulary.js',
  './vocabulary-data.js',
  './vocabulary-pack.js',
  './core-mechanisms.js',
  './advanced-weapon-mechanics.js',
  './advanced-weapon-context-patch.js',
  './jar-entry.js',
  './jar.html',
  './jar-builder.js',
  './jar-filename.js',
  './runtime.html',
  './favicon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
