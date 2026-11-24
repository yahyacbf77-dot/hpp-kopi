// Menyimpan halaman aplikasi di HP supaya tetap bisa dibuka saat internet putus.
// Selalu coba ambil versi terbaru dulu; kalau offline atau internet terlalu lambat, pakai salinan tersimpan.
// Data (Supabase) tidak disimpan di sini — transaksi offline diurus oleh index.html.
const CACHE = 'hpp-app-v3';
const BATAS = 4000;   // ms menunggu internet sebelum memakai salinan tersimpan
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './logo.webp',
  './ikon-192.png',
  './ikon-512.png',
  './manifest.webmanifest',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
];

// Satu file gagal diambil tidak membatalkan yang lain
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('hpp-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname.endsWith('supabase.co')) return;           // data selalu langsung ke server
  const boleh = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net' || url.hostname.endsWith('gstatic.com') || url.hostname === 'fonts.googleapis.com';
  if(!boleh) return;
  const tersimpan = () => caches.match(req, {ignoreSearch: url.origin === self.location.origin})
    .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
  const internet = fetch(req);
  const simpan = internet.then(res => {
    if(!res || !(res.ok || res.type === 'opaque')) return;
    const copy = res.clone();
    return caches.open(CACHE).then(c => c.put(req, copy));
  });
  e.waitUntil(simpan.catch(() => {}));
  e.respondWith(new Promise((ok, gagal) => {
    const jam = setTimeout(() => { tersimpan().then(r => { if(r) ok(r); }).catch(() => {}); }, BATAS);
    internet.then(res => { clearTimeout(jam); ok(res); })
      .catch(err => { clearTimeout(jam); tersimpan().then(r => r ? ok(r) : gagal(err)).catch(() => gagal(err)); });
  }));
});