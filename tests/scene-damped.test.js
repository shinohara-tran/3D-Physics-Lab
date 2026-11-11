import test from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './helpers.js';
import damped from '../src/scenes/damped.js';
import { geom } from '../src/scenes/springH.js';
import { THEMES } from '../src/draw/theme.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));
const P = { k: 100, m: 1, b: 0.3, F0: 0, f: 1 };
const peak = (sim, s) => { let a = 0; for (let i = 0; i < s * 50; i++) { sim.step(0.02); a = Math.max(a, Math.abs(sim.osc.x)); } return a; };
const pull = (sim, L, x0) => { const g = geom(L), m = sim.massPos(); sim.grab(m.x, m.y); sim.drag((g.cx + x0 * g.scale) / L.W, m.y); sim.release(); };

test('results k=100, m=1: f₀ = 1,5915 Hz, T₀ = 0,6283 s; params and layers as specified', () => {
  const r = byKey(damped.results(P));
  assert.deepEqual(Object.keys(r), ['f0', 'T0']);
  assert.ok(Math.abs(r.f0.value - 1.5915) < 1e-4 && Math.abs(r.T0.value - 0.62832) < 1e-4);
  assert.equal(r.f0.formula, 'f₀ = (1/2π)√(k/m)');
  const ps = new ParamSet(damped.params);
  assert.equal(damped.params.find((s) => s.key === 'b').label, 'lực cản');
  assert.deepEqual(damped.params.map((s) => s.key), ['k', 'm', 'b', 'F0', 'f']);
  ps.set('b', 5); assert.equal(ps.get('b'), 2);
  ps.set('F0', 5); assert.equal(ps.get('F0'), 1);
  ps.set('f', 0); assert.equal(ps.get('f'), 0.2);
  ps.set('f', 9); assert.equal(ps.get('f'), 5);
  assert.deepEqual(damped.layers, ['Băng x(t)', 'Đường A(f)']);
});

test('F0 = 0: amplitude decays; driving at f₀ makes it climb; setParams keeps the motion', () => {
  const L = layoutFor(1366, 768, 1), sim = damped.create(P);
  sim.L = L; pull(sim, L, 0.1);
  const a1 = peak(sim, 2), a2 = peak(sim, 2);
  assert.ok(a2 < a1 && a1 < 0.1, `${a1} ${a2}`);
  const { x, v, t } = sim.osc;
  sim.setParams({ ...P, b: 0.2, F0: 1, f: 1.5915 });
  assert.deepEqual([sim.osc.x, sim.osc.v, sim.osc.t], [x, v, t]);
  assert.equal(sim.osc.b, 0.2);
  const forced = peak(sim, 6);
  assert.ok(forced > 2 * a2, `${forced} ${a2}`);
});

test('resonance with no damping stays inside the tape (hard stop at the drag limit)', () => {
  const sim = damped.create({ ...P, b: 0, F0: 1, f: 1.5915 });
  assert.ok(peak(sim, 20) <= sim.xmax + 1e-12);
});

test('texts: f₀ marker and A(f) only with layer 2, no digits on the curve; pusher only when F0 > 0', () => {
  const L = layoutFor(1366, 768, 1), sim = damped.create({ ...P, F0: 0.5 });
  sim.L = L; pull(sim, L, 0.05); sim.step(0.1);
  const texts = (s, n) => { const rc = recorder(L.fontPx); s.draw(rc, { layout: L, theme: THEMES.light, layerCount: n }); return rc.texts; };
  assert.ok(!texts(sim, 1).includes('f₀') && texts(sim, 2).includes('f₀') && texts(sim, 2).includes('A(f)'));
  assert.ok(texts(sim, 2).every((s) => !/\d/.test(s)), texts(sim, 2).join('|'));
  assert.ok(texts(sim, 0).includes('F') && !texts(sim, 0).includes('x(t)') && texts(sim, 1).includes('x(t)'));
  const sim0 = damped.create(P); sim0.L = L;
  assert.ok(!texts(sim0, 0).includes('F'), 'no pusher when F0 = 0');
});

for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
  test(`mouse path at ${W}x${H}: draw → px → normalized → grab/drag/release sets A`, () => {
    const L = layoutFor(W, H, 1), sim = damped.create(P);
    sim.draw(recorder(L.fontPx), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
    const g = geom(L), m = sim.massPos();
    assert.equal(sim.grab(m.x, m.y), true);
    sim.drag((g.cx + 0.07 * g.scale) / L.W, m.y);
    sim.release();
    assert.ok(Math.abs(sim.state().A - 0.07) < 1e-9);
  });

  test(`everything is inside the canvas at ${W}x${H}`, () => {
    const L = layoutFor(W, H, 1);
    for (const [x0, F0, f] of [[0.15, 1, 0.2], [-0.15, 0.5, 5], [0.01, 1, 1.5]]) {
      const sim = damped.create({ ...P, F0, f }), rc = recorder(L.fontPx);
      sim.L = L; pull(sim, L, x0);
      for (let i = 0; i < 40; i++) sim.step(0.02);
      const reveal = new RevealBoard(['f0', 'T0']); reveal.revealAll();
      sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: 2, paused: false, time: 1, reveal });
      for (const [x, y] of rc.pts) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `${W}x${H} x0=${x0}: ${x},${y}`);
      assert.ok(rc.texts.every((s) => !/[̀-ͯ⃐-⃿]/.test(s)));
    }
  });
}
