// Offline cache. Network-first for app code (updates arrive when online), cache-first for big immutable files.
const CACHE = 'dao-dong-v1';
const PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'models/hand_landmarker.task',
  'src/app.js',
  'src/draw/primitives.js',
  'src/draw/theme.js',
  'src/format.js',
  'src/input/gestures.js',
  'src/input/hands.js',
  'src/input/inputs.js',
  'src/input/interpreter.js',
  'src/input/keys.js',
  'src/physics/formulas.js',
  'src/physics/oscillator.js',
  'src/scenes/common.js',
  'src/scenes/damped.js',
  'src/scenes/energy.js',
  'src/scenes/index.js',
  'src/scenes/pendulum.js',
  'src/scenes/phase2.js',
  'src/scenes/springH.js',
  'src/scenes/springV.js',
  'src/scenes/velAcc.js',
  'src/ui/layout.js',
  'src/ui/params.js',
  'src/ui/reveal.js',
  'vendor/mediapipe/vision_bundle.mjs',
  'vendor/mediapipe/wasm/vision_wasm_internal.js',
  'vendor/mediapipe/wasm/vision_wasm_internal.wasm',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('dao-dong-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isBig = (url) => /\/(models|vendor)\//.test(url.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const store = (res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  };
  if (isBig(url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(store)));
    return;
  }
  e.respondWith(
    fetch(req).then(store).catch(() =>
      caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
