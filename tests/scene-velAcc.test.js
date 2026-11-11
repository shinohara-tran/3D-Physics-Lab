import test from 'node:test';
import assert from 'node:assert/strict';
import velAcc, { stripBoxes } from '../src/scenes/velAcc.js';
import { geom } from '../src/scenes/springH.js';
import { THEMES } from '../src/draw/theme.js';
import { layoutFor } from '../src/ui/layout.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));

// Records every drawn point/box (text width = 0.6·font per char) and text, so layout can be checked against the canvas.
function recorder(fontPx) {
  const pts = [], texts = [], o = {};
  const add = (x, y) => pts.push([x, y]);
  const box = (x, y, w, h) => { add(x, y); add(x + w, y + h); };
  const fns = {
    moveTo: add, lineTo: add, strokeRect: box, fillRect: box, rect: box,
    arc: (x, y, r) => { add(x - r, y - r); add(x + r, y + r); },
    measureText: (s) => ({ width: s.length * 0.6 * fontPx }),
    fillText: (s, x, y) => {
      texts.push(s);
      const w = s.length * 0.6 * fontPx, left = o.textAlign === 'center' ? x - w / 2 : o.textAlign === 'right' ? x - w : x;
      add(left, y - fontPx); add(left + w, y + fontPx);
    },
  };
  return Object.assign(new Proxy(o, {
    get: (t, k) => (k in t ? t[k] : fns[k] ?? (() => {})),
    set: (t, k, v) => { t[k] = v; return true; },
  }), { pts, texts });
}

test('results k=100, m=1, A=0,05: vmax 0,5 m/s (50 cm/s), amax 5 m/s²', () => {
  const r = byKey(velAcc.results({ k: 100, m: 1, A: 0.05 }));
  assert.deepEqual(Object.keys(r), ['omega', 'T', 'A', 'vmax', 'amax']);
  assert.ok(Math.abs(r.vmax.value - 0.5) < 1e-12 && Math.abs(r.amax.value - 5) < 1e-12);
  assert.equal(r.vmax.text, '50 cm/s');
  assert.equal(r.amax.text, '5 m/s²');
  assert.equal(r.A.text, '5 cm');
  assert.equal(r.vmax.formula, 'vmax = ωA');
  assert.deepEqual(velAcc.layers, ['Mũi tên v, a', 'Đồ thị x(t)', 'Đồ thị v(t)', 'Đồ thị a(t)']);
});

test('strips only appear with their layer; at the extreme the v arrow vanishes and the a arrow stays', () => {
  const L = layoutFor(1366, 768, 1), sim = velAcc.create({ k: 100, m: 1 });
  sim.L = L;
  const m = sim.massPos(), g = geom(L);
  sim.grab(m.x, m.y); sim.drag((g.cx + 0.05 * g.scale) / L.W, m.y); sim.release();
  const texts = (n) => { const rc = recorder(L.fontPx); sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: n }); return rc.texts; };
  assert.ok(!texts(1).includes('x (cm)') && texts(2).includes('x (cm)') && !texts(2).includes('v (cm/s)') && texts(4).includes('a (m/s²)'));
  assert.ok(texts(1).includes('a') && !texts(1).includes('v'));
  assert.ok(!texts(0).includes('a'));
});

for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
  test(`mouse path at ${W}x${H}: draw → px → normalized → grab/drag/release sets A`, () => {
    const L = layoutFor(W, H, 1), sim = velAcc.create({ k: 100, m: 1 });
    sim.draw(recorder(L.fontPx), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
    const g = geom(L), m = sim.massPos();
    assert.equal(sim.grab(m.x, m.y), true);
    sim.drag((g.cx + 0.07 * g.scale) / L.W, m.y);
    sim.release();
    assert.ok(Math.abs(sim.state().A - 0.07) < 1e-9);
  });

  test(`everything is inside the canvas at ${W}x${H}; strips share one time axis`, () => {
    const L = layoutFor(W, H, 1), f = L.fontPx;
    for (const x0 of [0.15, -0.15, 0.01]) {
      const sim = velAcc.create({ k: 100, m: 1 }), rc = recorder(f);
      sim.L = L;
      const m = sim.massPos(), g = geom(L);
      sim.grab(m.x, m.y); sim.drag((g.cx + x0 * g.scale) / W, m.y); sim.release();
      for (let i = 0; i < 40; i++) sim.step(0.02);
      const reveal = new RevealBoard(['omega', 'T', 'A', 'vmax', 'amax']); reveal.revealAll();
      sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: 4, paused: false, time: 1, reveal });
      for (const [x, y] of rc.pts) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `${W}x${H} x0=${x0}: ${x},${y}`);
      assert.ok(rc.texts.every((s) => !/[̀-ͯ⃐-⃿]/.test(s)));
      const b = stripBoxes(L, g);
      assert.ok(b.every((s) => s.x === b[0].x && s.w === b[0].w && s.h >= f * 1.4), 'same time axis, tall enough for a label');
      assert.ok(b[0].y > g.cy + g.r + f && b[2].y + b[2].h <= H);
    }
  });
}

test('no scene title, lesson or layer contains combining characters', async () => {
  const { SCENES } = await import('../src/scenes/index.js');
  for (const s of SCENES) for (const t of [s.title, s.lesson, ...s.layers]) assert.ok(!/[\u0300-\u036f\u20d0-\u20ff]/.test(t), `${s.id}: ${t}`);
});
