import test from 'node:test';
import assert from 'node:assert/strict';
import springV, { geom } from '../src/scenes/springV.js';
import { THEMES } from '../src/draw/theme.js';
import { drawChips } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));
const recorder = (texts = []) => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : k === 'fillText' ? (s) => texts.push(s) : k === 'measureText' ? (s) => ({ width: String(s).length * 10 }) : () => {}),
  set: (o, k, v) => { o[k] = v; return true; },
});

test('results k=100, m=0,1: Δℓ₀ = 0,0098 m shown in cm', () => {
  const r = byKey(springV.results({ k: 100, m: 0.1 }));
  assert.ok(Math.abs(r.dl0.value - 0.0098) < 1e-12);
  assert.equal(r.dl0.formula, 'Δℓ₀ = mg/k');
  assert.equal(r.dl0.text, '0,98 cm');
  assert.deepEqual(Object.keys(r), ['omega', 'T', 'f', 'dl0', 'A', 'phi']);
});

test('release 0,02 m below VTCB (+x is downward) => A = 0,02, φ = 0; g is a fixed chip', () => {
  const sim = springV.create({ k: 100, m: 1 });
  const { x, y } = sim.massPos();
  assert.equal(sim.grab(x, y), true);
  assert.ok(sim.normY(0.02) > y, 'positive x is lower on screen');
  sim.drag(x, sim.normY(0.02)); sim.release();
  const r = byKey(springV.results({ k: 100, m: 1, ...sim.state() }));
  assert.ok(Math.abs(r.A.value - 0.02) < 1e-9);
  assert.ok(Math.abs(r.phi.value) < 1e-12);
  const params = new ParamSet(springV.params);
  params.set('g', 3); params.nudge('g', 0.5);
  assert.equal(params.get('g'), 9.8);
});

test('drag clamps to ±0,1 m; grab misses away from the mass', () => {
  const sim = springV.create({ k: 100, m: 1 });
  assert.equal(sim.grab(0.02, 0.98), false);
  const { x, y } = sim.massPos();
  sim.grab(x, y); sim.drag(x, 0.99); sim.release();
  assert.ok(Math.abs(sim.state().A - 0.1) < 1e-9);
});

test('draw: marks labelled, equation in cm with "?" until revealed, chart left of the spring, all inside the canvas', () => {
  for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
    const layout = layoutFor(W, H, 1), g = geom(layout), texts = [];
    assert.ok(g.chart.x >= 0 && g.chart.x + g.chart.w < g.cx - g.r && g.chart.w > 0, 'chart left of the mass');
    assert.ok(g.chart.y > g.top && g.chart.y + g.chart.h < H && g.eqY + layout.fontPx * 1.2 <= H);
    const sim = springV.create({ k: 100, m: 1 });
    const reveal = new RevealBoard(['omega', 'T', 'f', 'dl0', 'A', 'phi']);
    const view = { layout, theme: THEMES.light, layerCount: 2, paused: false, time: 0, reveal };
    sim.draw(recorder(), view);
    const p = sim.massPos();
    sim.grab(p.x, p.y); sim.drag(p.x, sim.normY(0.05)); sim.release(); sim.step(0.01);
    sim.draw(recorder(texts), view);
    assert.ok(texts.includes('chiều dài tự nhiên') && texts.includes('VTCB'));
    assert.ok(texts.includes('x = ?·cos(?t + ?) (cm)'), texts.join('|'));
    reveal.revealAll(); texts.length = 0; sim.draw(recorder(texts), view);
    assert.ok(texts.includes('x = 5·cos(10t) (cm)'), texts.join('|'));
  }
});

test('chips: k, m, g, then results', () => {
  const layout = layoutFor(1366, 768, 1), params = new ParamSet(springV.params);
  const results = springV.results({ ...params.values() });
  const reveal = new RevealBoard(results.map((r) => r.key));
  const hits = drawChips(recorder(), layout.chips, params, reveal, results, THEMES.light, layout.fontPx);
  assert.deepEqual(hits.map((h) => h.key), ['k', 'm', 'g', 'omega', 'T', 'f', 'dl0', 'A', 'phi']);
});
