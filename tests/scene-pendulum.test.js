import test from 'node:test';
import assert from 'node:assert/strict';
import pendulum, { geom } from '../src/scenes/pendulum.js';
import { THEMES } from '../src/draw/theme.js';
import { drawChips } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));
const D = Math.PI / 180;
const recorder = (texts = []) => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : k === 'fillText' ? (s) => texts.push(s) : k === 'measureText' ? (s) => ({ width: String(s).length * 10 }) : () => {}),
  set: (o, k, v) => { o[k] = v; return true; },
});
const dragTo = (sim, deg) => {
  const m = sim.massPos();
  assert.equal(sim.grab(m.x, m.y), true);
  const t = sim.normAt(deg * D);
  sim.drag(t.x, t.y); sim.release();
};

test('results ℓ = 1 m: T ≈ 2,0071 s', () => {
  const r = byKey(pendulum.results({ l: 1 }));
  assert.ok(Math.abs(r.T.value - 2.00709) < 1e-4);
  assert.equal(r.T.formula, 'T = 2π√(ℓ/g)');
  assert.deepEqual(Object.keys(r), ['omega', 'T', 'f', 'A', 'alpha0', 'phi']);
});

test('drag to 20° clamps to 10°; A = ℓα₀ in cm, α₀ in degrees, φ = 0', () => {
  const p = { l: 1, g: 9.8 }, sim = pendulum.create(p);
  dragTo(sim, 20);
  const r = byKey(pendulum.results({ ...p, ...sim.state() }));
  assert.ok(Math.abs(r.alpha0.value - 10 * D) < 1e-9);
  assert.equal(r.alpha0.text, '10°');
  assert.equal(r.A.text, '17,5 cm');
  assert.ok(Math.abs(r.phi.value) < 1e-12);
});

test('release at α₀ < 0 gives φ = π; half a period later the bob is at +α₀', () => {
  const sim = pendulum.create({ l: 1, g: 9.8 });
  dragTo(sim, -5);
  assert.ok(Math.abs(sim.state().phi - Math.PI) < 1e-9);
  const T = 2 * Math.PI / Math.sqrt(9.8);
  for (let i = 0; i < 20; i++) sim.step(T / 40);
  assert.ok(Math.abs(sim.osc.alpha - 5 * D) < 2e-3);
});

test('ℓ range 0,2–2 step 0,05, default 1; setParams keeps swinging', () => {
  const s = pendulum.params[0];
  assert.deepEqual([s.min, s.max, s.step, s.value], [0.2, 2, 0.05, 1]);
  const sim = pendulum.create({ l: 1, g: 9.8 });
  dragTo(sim, 8); sim.step(0.1);
  const a = sim.osc.alpha;
  sim.setParams({ l: 0.5, g: 9.8 });
  assert.equal(sim.osc.alpha, a);
  assert.ok(sim.state().A > 0);
});

test('draw: s equation in cm, "?" until revealed; tape ≥ 0,3·H inside the canvas; ℓ = 2 m clears the equation', () => {
  for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
    const layout = layoutFor(W, H, 1);
    for (const l of [0.2, 2]) {
      const g = geom(layout, l);
      assert.ok(g.tape.h >= 0.3 * H && g.tape.y + g.tape.h <= H, 'tape size');
      assert.ok(g.pivotY + 2 * g.scale + g.r < g.eqY, 'bob clears the equation row');
    }
    const texts = [], sim = pendulum.create({ l: 1, g: 9.8 });
    const reveal = new RevealBoard(['omega', 'T', 'f', 'A', 'alpha0', 'phi']);
    const view = { layout, theme: THEMES.dark, layerCount: 2, paused: false, time: 0, reveal };
    sim.draw(recorder(), view);
    dragTo(sim, 10); sim.step(0.01);
    sim.draw(recorder(texts), view);
    assert.ok(texts.includes('s = ?·cos(?t + ?) (cm)'), texts.join('|'));
    reveal.revealAll(); texts.length = 0; sim.draw(recorder(texts), view);
    assert.ok(texts.includes('s = 17,5·cos(3,13t) (cm)'), texts.join('|'));
  }
});

test('chips: ℓ, g, then results', () => {
  const layout = layoutFor(1366, 768, 1), params = new ParamSet(pendulum.params);
  const results = pendulum.results(params.values());
  const reveal = new RevealBoard(results.map((r) => r.key));
  const hits = drawChips(recorder(), layout.chips, params, reveal, results, THEMES.light, layout.fontPx);
  assert.deepEqual(hits.map((h) => h.key), ['l', 'g', 'omega', 'T', 'f', 'A', 'alpha0', 'phi']);
});
