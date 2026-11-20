// Service worker de Garde-robe
// - Fichiers de l'app : réseau d'abord (mises à jour), copie en cache si hors connexion.
// - Bibliothèque Supabase (CDN, version figée) et polices : cache d'abord.
// - Photos (liens signés Supabase) : cache d'abord, indexées sans le jeton du lien,
//   pour rester visibles hors connexion même quand le lien a expiré. Cache vidé à la déconnexion.
// - Les données (API Supabase) ne passent jamais par ce cache : elles sont gérées par l'app.
const VERSION = 'garderobe-v35';
const SHELL = VERSION + '-app';
const LIBS = 'garderobe-libs-v1';
const PHOTOS = 'garderobe-photos';
const FILES = ['./', './index.html', './css/app.css', './js/app.js', './js/catalog.js', './js/draw.js', './js/avatar.js', './js/store.js', './js/sync.js', './js/image.js', './js/flatlay.js', './js/cutout.js', './js/retouch.js', './js/cropper.js', './js/colorpick.js', './js/stylist.js', './js/weather.js', './js/config.js', './manifest.webmanifest', './icons/icon.svg', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
const NETWORK_TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  // cache: 'reload' : on prend les fichiers sur le serveur, jamais une vieille copie du cache HTTP du navigateur.
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('garderobe-v') && k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data === 'clear-photos') e.waitUntil(caches.delete(PHOTOS));
});

const isLib = (u) => u.hostname === 'esm.sh' || u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'staticimgly.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
const isPhoto = (u) => u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/sign/photos/');

async function cacheFirst(req, cacheName, key) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key || req);
  // Une copie « opaque » (gardée pour une balise <img>) ne peut pas servir à une lecture par l'app
  if (hit && !(hit.type === 'opaque' && req.mode === 'cors')) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(key || req, res.clone()).catch(() => {});
  return res;
}
// Réseau d'abord. Si le réseau est lent, on sert la copie en cache au bout de NETWORK_TIMEOUT, mais la réponse
// du réseau continue d'arriver et remplace la copie : l'ouverture suivante a la nouvelle version.
async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  // no-cache : le navigateur revérifie auprès du serveur (réponse 304 légère si rien n'a changé).
  const net = fetch(req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' })).then((res) => {
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NETWORK_TIMEOUT))]);
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) { net.catch(() => {}); return hit; }
    if (req.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
    return net.catch(() => Response.error());
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
