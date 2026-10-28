/* =====================================================================
   Service Worker für „Löffelweise“
   Aufgabe: Das Kochbuch auf dem Handy speichern, damit es ohne Internet läuft.
   - App-Dateien (Buch, Schriften, Icons) werden beim Installieren gespeichert.
   - Alle Rezeptfotos werden danach im Hintergrund nachgeladen.
   - Videos werden NICHT gespeichert (zu groß), die gehen nur mit Internet.
   ===================================================================== */

const VERSION = 'loeffelweise-v1';          // bei Änderungen hochzählen
const APP_CACHE = VERSION + '-app';
const FOTO_CACHE = 'loeffelweise-fotos';    // bleibt über Versionen erhalten

// Dateien, ohne die das Buch nicht startet
const APP_DATEIEN = [
  './',
  'index.html',
  'manifest.webmanifest',
  'page-flip.browser.js',
  'fotos.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'schriften/fraunces-latin-full-normal.woff2',
  'schriften/fraunces-latin-full-italic.woff2',
  'schriften/fraunces-latin-ext-full-normal.woff2',
  'schriften/fraunces-latin-ext-full-italic.woff2',
  'schriften/dm-sans-latin-opsz-normal.woff2',
  'schriften/dm-sans-latin-opsz-italic.woff2',
  'schriften/dm-sans-latin-ext-opsz-normal.woff2',
  'schriften/dm-sans-latin-ext-opsz-italic.woff2'
];

// 1) Installieren: App-Dateien speichern
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_DATEIEN)).then(() => self.skipWaiting()));
});

// 2) Aktivieren: alte Versionen löschen, dann Fotos im Hintergrund laden
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(namen.filter((n) => n !== APP_CACHE && n !== FOTO_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
    await fotosSpeichern();
  })());
});

// Lädt jedes Foto einmal und legt es ab. Fehler bei einzelnen Fotos sind egal.
async function fotosSpeichern() {
  try {
    const liste = await (await fetch('fotos.json', { cache: 'no-cache' })).json();
    const cache = await caches.open(FOTO_CACHE);
    const ergebnisse = await Promise.allSettled(liste.map(async (url) => {
      if (await cache.match(url)) return;
      let antwort;
      try { antwort = await fetch(url, { mode: 'cors' }); }
      catch (_) { antwort = await fetch(url, { mode: 'no-cors' }); }   // Notlösung ohne CORS
      if (antwort.ok || antwort.type === 'opaque') await cache.put(url, antwort);
    }));
    const geschafft = ergebnisse.filter((r) => r.status === 'fulfilled').length;
    // Der Seite Bescheid sagen, damit sie eine kurze Meldung zeigt
    const fenster = await self.clients.matchAll({ type: 'window' });
    fenster.forEach((f) => f.postMessage({ typ: 'offline-bereit', fotos: geschafft, von: liste.length }));
  } catch (_) { /* ohne Internet beim ersten Start: später nochmal */ }
}

// 3) Anfragen beantworten
self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;
  const url = new URL(anfrage.url);

  // Videos und Teil-Anfragen (Spulen) direkt ans Netz durchreichen
  if (anfrage.headers.has('range') || /\.mp4($|\?)/.test(url.pathname)) return;

  // Die Buchseite selbst: erst Netz (für Updates), bei Funkloch sofort den Speicher
  if (anfrage.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const netz = await mitZeitlimit(fetch(anfrage), 3500);
        const c = await caches.open(APP_CACHE);
        c.put('index.html', netz.clone());
        return netz;
      } catch (_) {
        return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Alles andere: erst Speicher, sonst Netz (und Fotos dabei gleich ablegen)
  e.respondWith((async () => {
    const gespeichert = await caches.match(anfrage, { ignoreVary: true });
    if (gespeichert) return gespeichert;
    try {
      const netz = await fetch(anfrage);
      if (url.hostname === 'images.unsplash.com' || url.hostname === 'assets.mixkit.co') {
        const c = await caches.open(FOTO_CACHE);
        c.put(anfrage, netz.clone());
      }
      return netz;
    } catch (fehler) {
      return Response.error();   // die Seite zeigt dann die gezeichnete Ersatz-Illustration
    }
  })());
});

// Hilfsfunktion: Netzanfrage nach x Millisekunden abbrechen
function mitZeitlimit(versprechen, ms) {
  return new Promise((ok, fehler) => {
    const t = setTimeout(() => fehler(new Error('Zeitlimit')), ms);
    versprechen.then((r) => { clearTimeout(t); ok(r); }, (f) => { clearTimeout(t); fehler(f); });
  });
}
