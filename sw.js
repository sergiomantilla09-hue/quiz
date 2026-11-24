const CACHE_NAME = 'quiz-pwa-v20';
const APP_FILES = [
  './', './index.html', './index.html?v=20', './manifest.webmanifest',
  './styles.css?v=20', './embed.css?v=18', './siga-ui.css?v=18', './app.js?v=20',
  './theme.js?v=18', './variants.js?v=18', './pdf-download.js?v=18',
  './vendor/qrcode-2.0.4.js', './vendor/jsQR-1.4.0.js',
  './jspdf.umd.min.js', './html2canvas.min.js', './document-banners.css?v=18',
  './assets/icon-180.png', './assets/icon-192.png', './assets/icon-192.svg',
  './assets/quiz-mark.svg', './assets/escudo-colegio.png', './assets/siga-header-banner.svg', './assets/schedule-toolbar.svg',
  './assets/plantilla_quiz.svg', './assets/plantilla_quiz_20.svg', './assets/plantilla_quiz_30.svg',
  './recuperaciones/menu-icons.svg',
  './pliego/index.html?v=18', './pliego/app.js?v=18',
  './pliego/embed.css?v=18', './pliego/pliego-surface.css?v=18',
  './pliego/document-header.css?v=18', './pliego/document-header.js?v=18'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('quiz-pwa-') && key !== CACHE_NAME)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html?v=20') : Response.error())));
});
