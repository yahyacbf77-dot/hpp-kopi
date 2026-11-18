// Menyimpan halaman aplikasi di HP supaya tetap bisa dibuka saat internet putus.
// Selalu coba ambil versi terbaru dulu; kalau offline, pakai salinan tersimpan.
// Data (Supabase) tidak disimpan di sini — transaksi offline diurus oleh index.html.
const CACHE = 'hpp-app-v2';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './logo.webp',
  './manifest.webmanifest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname.endsWith('supabase.co')) return;           // data selalu langsung ke server
  const boleh = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net' || url.hostname.endsWith('gstatic.com') || url.hostname === 'fonts.googleapis.com';
  if(!boleh) return;
  e.respondWith(
    fetch(req).then(res => {
      if(res && (res.ok || res.type === 'opaque')){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
