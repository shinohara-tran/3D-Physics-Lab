// Offline cache. Stale-while-revalidate for app code (cache answers at once, a background fetch refreshes it, so an
// update shows on the next load), cache-first for the big immutable models/ and vendor/ files.
const CACHE = 'dao-dong-v2';
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
  'src/ui/help.js',
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

// Only a 200 is cached: an error page or a partial response never replaces a good copy.
const store = (req, res) => (res.status === 200
  ? caches.open(CACHE).then((c) => c.put(req, res.clone())).then(() => res, () => res)
  : res);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (isBig(url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const fresh = fetch(req).then((res) => store(req, res));
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh.catch(() => (req.mode === 'navigate' ? caches.match('index.html') : undefined))
      .then((res) => res || Response.error());
  }));
});
