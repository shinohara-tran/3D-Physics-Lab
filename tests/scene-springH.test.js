import test from 'node:test';
import assert from 'node:assert/strict';
import springH from '../src/scenes/springH.js';
import { SCENES } from '../src/scenes/index.js';
import { THEMES } from '../src/draw/theme.js';
import { drawChips } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));

test('results k=100, m=1', () => {
  const r = byKey(springH.results({ k: 100, m: 1 }));
  assert.ok(Math.abs(r.T.value - 0.6283185) < 1e-6);
  assert.equal(r.T.formula, 'T = 2π√(m/k)');
  assert.deepEqual(Object.keys(r), ['omega', 'T', 'f', 'A', 'phi']);
  for (const x of Object.values(r)) for (const f of ['key', 'label', 'formula', 'value', 'unit']) assert.ok(f in x);
});

test('drag to x = -0,05 m and release => A = 0,05 m, phi = pi', () => {
  const p = { k: 100, m: 1 };
  const sim = springH.create(p);
  const { x, y } = sim.massPos();
  assert.equal(sim.grab(x, y), true);
  sim.drag(sim.normX(-0.05), y);
  sim.release();
  const r = byKey(springH.results({ ...p, ...sim.state() }));
  assert.ok(Math.abs(r.A.value - 0.05) < 1e-9);
  assert.ok(Math.abs(r.phi.value - Math.PI) < 1e-9);
  assert.equal(r.phi.text, 'π');
  for (let i = 0; i < 10; i++) sim.step(0.6283185 / 20);   // half a period later the mass is at +A
  assert.ok(Math.abs(sim.osc.x - 0.05) < 1e-4);
});

test('grab misses away from the mass; drag clamps to ±0,15 m', () => {
  const sim = springH.create({ k: 100, m: 1 });
  assert.equal(sim.grab(0.02, 0.98), false);
  const { x, y } = sim.massPos();
  sim.grab(x, y); sim.drag(0, y); sim.release();
  assert.ok(Math.abs(sim.state().A - 0.15) < 1e-9);
});

test('setParams keeps the motion running (no reset)', () => {
  const sim = springH.create({ k: 100, m: 1 });
  const { x, y } = sim.massPos();
  sim.grab(x, y); sim.drag(sim.normX(0.1), y); sim.release();
  sim.step(0.05);
  const x0 = sim.osc.x;
  sim.setParams({ k: 400, m: 1 });
  assert.equal(sim.osc.x, x0);
  assert.equal(sim.osc.k, 400);
  assert.ok(sim.state().A > 0);
});

// Canvas stub: every method is a no-op, measureText returns a width.
const fakeCtx = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : k === 'measureText' ? (s) => ({ width: String(s).length * 10 }) : () => {}),
  set: (o, k, v) => { o[k] = v; return true; },
});

test('draw and chips run against a canvas stub', () => {
  assert.deepEqual(SCENES.map((s) => s.id), ['springH']);
  const layout = layoutFor(1366, 768, 1);
  const params = new ParamSet(springH.params);
  const sim = springH.create(params.values());
  const results = springH.results({ ...params.values(), ...sim.state() });
  const reveal = new RevealBoard(results.map((r) => r.key));
  reveal.revealNext();
  sim.step(0.016);
  for (const theme of Object.values(THEMES)) sim.draw(fakeCtx(), { layout, theme, layerCount: 2, paused: false, time: 1, reveal, results });
  const hits = drawChips(fakeCtx(), layout.chips, params, reveal, results, THEMES.light, layout.fontPx);
  assert.deepEqual(hits.map((h) => h.key), ['k', 'm', 'omega', 'T', 'f', 'A', 'phi']);
  assert.deepEqual([...new Set(hits.map((h) => h.kind))], ['param', 'result']);
  for (const h of hits) assert.ok(h.rect.x + h.rect.w <= layout.chips.x + layout.chips.w + 1e-9);
});
