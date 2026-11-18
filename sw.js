// Service worker : l'app s'ouvre même hors connexion (les données en ligne restent nécessaires pour se synchroniser).
const VERSION = 'garderobe-v2';
const SHELL = ['./', './index.html', './css/app.css', './js/app.js', './js/catalog.js', './js/draw.js', './js/store.js', './js/image.js', './js/config.js', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase, polices : réseau direct
  // Réseau d'abord (pour avoir les mises à jour), cache en secours hors connexion.
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
