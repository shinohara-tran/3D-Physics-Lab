import test from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './helpers.js';
import energy, { barColors } from '../src/scenes/energy.js';
import { geom } from '../src/scenes/springH.js';
import { THEMES } from '../src/draw/theme.js';
import { layoutFor } from '../src/ui/layout.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));

test('SGK Bài 7 VD2: m=0,2, ω=2π, A=0,1 => W = 0,039478 J, shown in mJ; Wđmax = Wtmax = W', () => {
  const m = 0.2, k = m * (2 * Math.PI) ** 2;
  const r = byKey(energy.results({ k, m, A: 0.1 }));
  assert.deepEqual(Object.keys(r), ['W', 'Wdmax', 'Wtmax']);
  assert.ok(Math.abs(r.W.value - 0.039478) < 1e-6);
  assert.equal(r.W.text, '39,48 mJ');
  assert.equal(r.Wdmax.value, r.W.value); assert.equal(r.Wtmax.text, r.W.text);
  assert.equal(r.W.formula, 'W = ½mω²A²');
  assert.equal(r.Wdmax.formula, 'Wđmax = ½mω²A²', 'formula must not give the answer away');
  assert.equal(r.Wtmax.formula, 'Wtmax = ½kA²');
  assert.equal(byKey(energy.results({ k: 1000, m: 1, A: 0.15 })).W.text, '11,25 J');
  assert.deepEqual(energy.layers, ['Thanh Wđ, Wt, W', 'Parabol Wđ(x), Wt(x)']);
});

test('Wđ + Wt = W within 1 % along a run (live ½mv² + ½kx² too)', () => {
  const sim = energy.create({ k: 100, m: 1 }), L = layoutFor(1366, 768, 1);
  sim.L = L;
  const g = geom(L), m = sim.massPos();
  sim.grab(m.x, m.y); sim.drag((g.cx + 0.1 * g.scale) / L.W, m.y); sim.release();
  for (let i = 0; i < 300; i++) {
    sim.step(0.02);
    const e = sim.energies(), live = 0.5 * sim.osc.m * sim.osc.v ** 2 + 0.5 * sim.osc.k * sim.osc.x ** 2;
    assert.ok(Math.abs(e.Wd + e.Wt - e.W) <= 0.01 * e.W);
    assert.ok(Math.abs(live - e.W) <= 0.01 * e.W);
  }
});

test('bars show only with layer 1, parabolas with layer 2; W unit label is mJ, number hidden until revealed', () => {
  const L = layoutFor(1366, 768, 1), sim = energy.create({ k: 100, m: 1 }), reveal = new RevealBoard(['W', 'Wdmax', 'Wtmax']);
  sim.L = L;
  const g = geom(L), m = sim.massPos();
  sim.grab(m.x, m.y); sim.drag((g.cx + 0.1 * g.scale) / L.W, m.y); sim.release();
  const texts = (n) => { const rc = recorder(L.fontPx); sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: n, reveal }); return rc.texts; };
  assert.ok(!texts(0).includes('Wđ') && texts(1).includes('Wđ') && texts(1).includes('W (mJ)') && !texts(1).includes('Wđ(x)'));
  assert.ok(texts(2).includes('Wđ(x)') && texts(2).includes('Wt(x)'));
  reveal.revealAll();
  assert.ok(texts(1).includes('W (mJ) = 500'));
});

for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
  test(`mouse path at ${W}x${H}: draw → px → normalized → grab/drag/release sets A`, () => {
    const L = layoutFor(W, H, 1), sim = energy.create({ k: 100, m: 1 });
    sim.draw(recorder(L.fontPx), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
    const g = geom(L), m = sim.massPos();
    assert.equal(sim.grab(m.x, m.y), true);
    sim.drag((g.cx + 0.07 * g.scale) / L.W, m.y);
    sim.release();
    assert.ok(Math.abs(sim.state().A - 0.07) < 1e-9);
  });

  test(`everything is inside the canvas at ${W}x${H}`, () => {
    const L = layoutFor(W, H, 1);
    for (const x0 of [0.15, -0.15, 0.01]) {
      const sim = energy.create({ k: 100, m: 1 }), rc = recorder(L.fontPx);
      sim.L = L;
      const m = sim.massPos(), g = geom(L);
      sim.grab(m.x, m.y); sim.drag((g.cx + x0 * g.scale) / W, m.y); sim.release();
      for (let i = 0; i < 40; i++) sim.step(0.02);
      const reveal = new RevealBoard(['W', 'Wdmax', 'Wtmax']); reveal.revealAll();
      sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: 2, paused: false, time: 1, reveal });
      for (const [x, y] of rc.pts) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `${W}x${H} x0=${x0}: ${x},${y}`);
      assert.ok(rc.texts.every((s) => !/[̀-ͯ⃐-⃿]/.test(s)));
    }
  });
}

test('lesson is Bài 5; Wđ, Wt, W bar colours are all different in both themes', () => {
  assert.equal(energy.lesson, 'Bài 5');
  for (const th of Object.values(THEMES)) assert.equal(new Set(barColors(th)).size, 3);
});
