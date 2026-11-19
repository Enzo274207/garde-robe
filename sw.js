// Service worker de Garde-robe
// - Fichiers de l'app : réseau d'abord (mises à jour), copie en cache si hors connexion.
// - Bibliothèque Supabase (CDN, version figée) et polices : cache d'abord.
// - Photos (liens signés Supabase) : cache d'abord, indexées sans le jeton du lien,
//   pour rester visibles hors connexion même quand le lien a expiré. Cache vidé à la déconnexion.
// - Les données (API Supabase) ne passent jamais par ce cache : elles sont gérées par l'app.
const VERSION = 'garderobe-v16';
const SHELL = VERSION + '-app';
const LIBS = 'garderobe-libs-v1';
const PHOTOS = 'garderobe-photos';
const FILES = ['./', './index.html', './css/app.css', './js/app.js', './js/catalog.js', './js/draw.js', './js/store.js', './js/sync.js', './js/image.js', './js/flatlay.js', './js/cutout.js', './js/config.js', './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
const NETWORK_TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('garderobe-v') && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data === 'clear-photos') e.waitUntil(caches.delete(PHOTOS));
});

const isLib = (u) => u.hostname === 'esm.sh' || u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
const isPhoto = (u) => u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/sign/photos/');

async function cacheFirst(req, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(key || req, res.clone()).catch(() => {});
  return res;
}
async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NETWORK_TIMEOUT))]);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (isPhoto(u)) { e.respondWith(cacheFirst(req, PHOTOS, u.origin + u.pathname)); return; }
  if (isLib(u)) { e.respondWith(cacheFirst(req, LIBS)); return; }
  if (u.origin === self.location.origin) { e.respondWith(networkFirst(req)); return; }
  // tout le reste (API Supabase…) : réseau direct, jamais mis en cache
});
