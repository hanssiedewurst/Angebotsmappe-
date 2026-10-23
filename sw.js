/* Offline-Speicher der Angebotsmappe.
   Bei jeder Änderung an den App-Dateien VERSION hochzählen (v1 -> v2 ...),
   damit die Geräte die neue Fassung abholen. Die echten Preise kommen aus der Preisdatei (siehe README). */
const VERSION = 'v4';
const CACHE = 'angebotsmappe-' + VERSION;

const CORE = [
  './',
  './index.html',
  './preise.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
  './angebot-pdf.js',
  './lib/pdf-lib.min.js',
  './lib/fontkit.umd.min.js',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './fonts/DejaVuSans.ttf',
  './fonts/DejaVuSans-Bold.ttf',
  './fonts/DejaVuSans-Oblique.ttf',
  './fonts/OpenSans-Regular.ttf',
  './fonts/OpenSans-Bold.ttf'
];
// PDF-Bibliotheken und Schriften gehören dazu, damit das Angebots-PDF auch ohne Netz entsteht.

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('angebotsmappe-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Mit Netz die neueste Fassung holen und ablegen, ohne Netz (oder im Funkloch nach 3 s) aus dem Speicher.
function networkFirst(event, req, key) {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromCache = async () => (await cache.match(key, { ignoreSearch: true })) || (await cache.match('./'));
    try {
      const net = fetch(req, { cache: 'no-cache' }).then(async (res) => {
        if (res.ok && !res.redirected) await cache.put(key, res.clone());
        return res;
      });
      const timeout = new Promise((resolve) => setTimeout(resolve, 3000, null));
      const res = await Promise.race([net, timeout]);
      return res || (await fromCache()) || (await net);
    } catch (e) {
      return (await fromCache()) || Response.error();
    }
  })());
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') return networkFirst(event, req, './index.html');
  // Preise kommen zentral aus preise.json: immer zuerst die aktuelle Fassung holen
  if (url.pathname.endsWith('/preise.json')) return networkFirst(event, req, './preise.json');

  // Alles andere: zuerst aus dem Speicher, sonst holen und ablegen.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
      return res;
    } catch (e) {
      return Response.error();
    }
  })());
});
