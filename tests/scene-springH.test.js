import test from 'node:test';
import assert from 'node:assert/strict';
import springH, { geom, tapeTransform } from '../src/scenes/springH.js';
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
  assert.equal(r.A.text, '5 cm');
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

test('tape transform: newest samples for +A, 0, −A land on the pen row inside the tape, +x right of O', () => {
  const g = geom(layoutFor(1366, 768, 1)), t = g.tape;
  const [a, b, c, d, e, f] = tapeTransform(t);
  // StripChart.draw local coords for box {0,0,w:t.h,h:t.w}, range [−xr, xr]
  const local = (age, v) => [t.h * (1 - age / 4), t.w * (g.xr - v) / (2 * g.xr)];
  const screen = ([u, v]) => [a * u + c * v + e, b * u + d * v + f];
  const A = 0.15;
  const [pA, p0, pm] = [A, 0, -A].map((v) => screen(local(0, v)));
  for (const [x, y] of [pA, p0, pm]) {
    assert.ok(x >= t.x - 1e-9 && x <= t.x + t.w + 1e-9 && y >= t.y - 1e-9 && y <= t.y + t.h + 1e-9);
  }
  assert.ok(pA[0] > p0[0] && p0[0] > pm[0], '+A right of 0, 0 right of −A');
  assert.ok(Math.abs(p0[0] - g.cx) < 1e-9 && Math.abs(pA[0] - (g.cx + A * g.scale)) < 1e-9, 'pen exactly under the mass');
  assert.ok(Math.abs(pA[1] - t.y) < 1e-9, 'newest sample on the top edge');
  const old = screen(local(4, 0));
  assert.ok(Math.abs(old[1] - (t.y + t.h)) < 1e-9, 'oldest sample at the bottom edge');
});

test('canvas text: equation in cm with "?" until revealed, no combining characters', () => {
  const texts = [];
  const ctx = new Proxy({}, {
    get: (o, k) => (k in o ? o[k] : k === 'fillText' ? (s) => texts.push(s) : k === 'measureText' ? (s) => ({ width: s.length * 10 }) : () => {}),
    set: (o, k, v) => { o[k] = v; return true; },
  });
  const layout = layoutFor(1366, 768, 1), p = { k: 100, m: 1 };
  const sim = springH.create(p);
  const { x, y } = sim.massPos();
  sim.grab(x, y); sim.drag(sim.normX(-0.05), y); sim.release(); sim.step(0.05);
  const reveal = new RevealBoard(['omega', 'T', 'f', 'A', 'phi']);
  const view = { layout, theme: THEMES.light, layerCount: 2, paused: false, time: 0, reveal };
  sim.draw(ctx, view);
  assert.ok(texts.includes('x = ?·cos(?t + ?) (cm)'), texts.join(' | '));
  reveal.revealAll(); texts.length = 0; sim.draw(ctx, view);
  assert.ok(texts.includes('x = 5·cos(10t + π) (cm)'), texts.join(' | '));
  assert.ok(texts.every((s) => !/[\u0300-\u036f\u20d0-\u20ff]/.test(s)));
});

// Stub whose measureText width = length·0.6·fontPx; records equation fillText boxes.
for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
  for (const [k, m, x0] of [[100, 1, -0.05], [1000, 0.05, 0.15]]) {
    test(`equation fits the canvas at ${W}x${H} (k=${k}, m=${m})`, () => {
      const layout = layoutFor(W, H, 1), boxes = [];
      const ctx = new Proxy({}, {
        get: (o, key) => (key in o ? o[key]
          : key === 'measureText' ? (s) => ({ width: s.length * 0.6 * layout.fontPx })
          : key === 'fillText' ? (s, x, y) => { if (s.startsWith('x = ')) boxes.push({ s, x, y, align: o.textAlign, w: s.length * 0.6 * layout.fontPx }); }
          : () => {}),
        set: (o, key, v) => { o[key] = v; return true; },
      });
      const sim = springH.create({ k, m });
      sim.draw(ctx, { layout, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });   // sim learns the layout
      const p = sim.massPos();
      sim.grab(p.x, p.y); sim.drag(sim.normX(x0), p.y); sim.release(); sim.step(0.01);
      const reveal = new RevealBoard(['omega', 'T', 'f', 'A', 'phi']); reveal.revealAll();
      sim.draw(ctx, { layout, theme: THEMES.light, layerCount: 2, paused: false, time: 0, reveal });
      assert.equal(boxes.length, 1);
      const b = boxes[0], f = layout.fontPx;
      assert.ok(b.s.includes('·cos('));
      assert.equal(b.align, 'left');
      assert.ok(b.x >= 0 && b.x + b.w <= W && b.y >= 0 && b.y + f <= H, JSON.stringify(b));
      assert.ok(b.x >= layout.stage.x && b.x + b.w <= layout.stage.x + layout.stage.w, 'inside the stage');
      const g = geom(layout);
      assert.ok(b.y > g.cy + g.r && b.y + 1.2 * f <= g.tape.y, 'between floor and tape');
    });
  }
}
