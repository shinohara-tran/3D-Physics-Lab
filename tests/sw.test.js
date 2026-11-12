import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs sw.js's fetch handler against an in-memory cache and a scripted network.
function worker(network) {
  const store = new Map(), handlers = {};
  const cache = { put: async (req, res) => { store.set(req.url, res); }, match: async (req) => store.get(req.url ?? req) };
  const ctx = {
    URL, Response: { error: () => 'ERROR' }, location: { origin: 'https://x.test' },
    self: { addEventListener: (type, fn) => { handlers[type] = fn; } },
    caches: { open: async () => cache, match: (req) => cache.match(req.url ? req : { url: `https://x.test/app/${req}` }) },
    fetch: async (req) => network(req),
  };
  vm.runInNewContext(readFileSync('sw.js', 'utf8'), ctx);
  const get = async (path, mode = 'cors') => {
    const req = { url: `https://x.test/app/${path}`, method: 'GET', mode };
    let res; const waits = [];
    handlers.fetch({ request: req, respondWith: (p) => { res = p; }, waitUntil: (p) => waits.push(p) });
    const out = await res; await Promise.all(waits); await new Promise((r) => setTimeout(r));
    return out;
  };
  return { get, store };
}
const resp = (status, body) => ({ status, body, clone() { return resp(status, body); } });

test('app code: stale-while-revalidate (cache now, refresh in background)', async () => {
  let version = 'v1';
  const w = worker(async () => resp(200, version));
  assert.equal((await w.get('src/app.js')).body, 'v1', 'no cache: network');
  version = 'v2';
  assert.equal((await w.get('src/app.js')).body, 'v1', 'cached copy served immediately');
  assert.equal((await w.get('src/app.js')).body, 'v2', 'update shows on the next load');
});

test('non-200 responses never replace the cache; offline falls back to the cache', async () => {
  let net = async () => resp(200, 'good');
  const w = worker((r) => net(r));
  await w.get('styles.css');
  net = async () => resp(404, 'bad');
  await w.get('styles.css');
  assert.equal(w.store.get('https://x.test/app/styles.css').body, 'good');
  net = async () => { throw new Error('offline'); };
  assert.equal((await w.get('styles.css')).body, 'good');
  assert.equal(await w.get('missing.js'), 'ERROR');
});

test('models/ and vendor/ stay cache-first', async () => {
  let calls = 0;
  const w = worker(async () => { calls++; return resp(200, 'model'); });
  await w.get('models/hand_landmarker.task'); await w.get('models/hand_landmarker.task');
  assert.equal(calls, 1);
});
