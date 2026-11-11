import test from 'node:test';
import { recorder } from './helpers.js';
import assert from 'node:assert/strict';
import springV, { geom } from '../src/scenes/springV.js';
import { THEMES } from '../src/draw/theme.js';
import { drawChips } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));

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
    sim.draw(recorder(20, texts), view);
    assert.ok(texts.includes('chiều dài tự nhiên') && texts.includes('VTCB'));
    assert.ok(texts.includes('x = ?·cos(?t + ?) (cm)'), texts.join('|'));
    reveal.revealAll(); texts.length = 0; sim.draw(recorder(20, texts), view);
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

// ---- fix round 1 ----
const SIZES = [[1366, 768], [1920, 1080], [730, 630]];

/** Same path as app.js: CSS px -> normalized (offset / L.W, L.H) -> sim.grab / drag / release. */
function mouseDrag(sim, L, from, to) {
  const n = (p) => ({ x: p.x / L.W, y: p.y / L.H });
  const a = n(from), b = n(to);
  assert.equal(sim.hits(a.x, a.y), true);
  assert.equal(sim.grab(a.x, a.y), true);
  sim.drag(b.x, b.y);
  sim.release();
}

test('mouse path (draw first, then px -> normalized -> grab/drag/release) sets A for the layout in use', () => {
  for (const [W, H] of SIZES) {
    const L = layoutFor(W, H, 1), sim = springV.create({ k: 100, m: 1 });
    sim.draw(recorder(), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
    const m = sim.massPos(), g = sim.geom();
    mouseDrag(sim, L, { x: m.x * L.W, y: m.y * L.H }, { x: m.x * L.W, y: m.y * L.H + 0.05 * g.scale });
    assert.ok(Math.abs(sim.state().A - 0.05) < 1e-6, `${W}x${H}: A = ${sim.state().A}`);
    assert.ok(Math.abs(sim.state().phi) < 1e-9);
  }
});

test('geometry: title clear; ceiling, natural mark, VTCB and lowest mass stay inside the stage (soft/heavy and stiff/light)', () => {
  for (const [W, H] of SIZES) {
    const L = layoutFor(W, H, 1), f = L.fontPx;
    for (const [k, m] of [[10, 2], [10, 1], [1000, 0.05], [100, 1]]) {
      const sim = springV.create({ k, m }), dl = m * 9.8 / k;
      sim.draw(recorder(), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
      const g = sim.geom();
      assert.ok(g.top - 0.4 * f >= L.stage.y + f, 'ceiling bar starts below the title line');
      const yNat = g.yEq - dl * g.scale, low = g.yEq + 0.1 * g.scale + g.r, high = g.yEq - Math.max(dl, 0.1) * g.scale - g.r;
      assert.ok(yNat >= g.top && high >= g.top, `${W}x${H} k=${k} m=${m}: marks below the ceiling`);
      assert.ok(low <= H && g.eqY + 1.2 * f <= H, 'lowest mass and equation inside the canvas');
    }
  }
});

for (const [W, H] of SIZES) {
  for (const [k, m, x0] of [[100, 1, 0.05], [10, 2, 0.1], [1000, 0.05, -0.1]]) {
    test(`equation fits the canvas at ${W}x${H} (k=${k}, m=${m})`, () => {
      const layout = layoutFor(W, H, 1), boxes = [];
      const ctx = new Proxy({}, {
        get: (o, key) => (key in o ? o[key]
          : key === 'measureText' ? (s) => ({ width: s.length * 0.6 * layout.fontPx })
          : key === 'fillText' ? (s, x, y) => { if (s.startsWith('x = ')) boxes.push({ x, y, w: s.length * 0.6 * layout.fontPx, align: o.textAlign }); }
          : () => {}),
        set: (o, key, v) => { o[key] = v; return true; },
      });
      const sim = springV.create({ k, m });
      sim.draw(ctx, { layout, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
      const p = sim.massPos(), g = sim.geom();
      sim.grab(p.x, p.y); sim.drag(p.x, sim.normY(x0)); sim.release(); sim.step(0.01);
      const reveal = new RevealBoard(['omega', 'T', 'f', 'dl0', 'A', 'phi']); reveal.revealAll();
      sim.draw(ctx, { layout, theme: THEMES.light, layerCount: 2, paused: false, time: 0, reveal });
      assert.equal(boxes.length, 1);
      const b = boxes[0], f = layout.fontPx;
      assert.ok(b.x >= layout.stage.x && b.x + b.w <= layout.stage.x + layout.stage.w, 'inside the stage');
      assert.ok(b.y >= g.chart.y + g.chart.h && b.y + f <= H, 'below the chart, inside the canvas');
    });
  }
}
