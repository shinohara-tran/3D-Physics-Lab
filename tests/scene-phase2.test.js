import test from 'node:test';
import assert from 'node:assert/strict';
import phase2, { geom } from '../src/scenes/phase2.js';
import { THEMES } from '../src/draw/theme.js';
import { drawChips } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';

const byKey = (rs) => Object.fromEntries(rs.map((r) => [r.key, r]));
const P = Math.PI;
const rel = (phi1, phi2) => byKey(phase2.results({ k: 100, m: 1, phi1, phi2 }));

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

test('relation and Δφ', () => {
  assert.equal(rel(0, 0).relation.text, 'cùng pha');
  assert.equal(rel(0, P).relation.text, 'ngược pha');
  assert.equal(rel(0, P / 2).relation.text, 'vuông pha');
  assert.equal(rel(P / 4, 0).relation.text, 'lệch pha');
  assert.equal(rel(0, P / 2).dphi.text, 'π/2');
  assert.equal(rel(0, -P / 2).dphi.text, '−π/2');
  assert.equal(rel(-P, P).relation.text, 'cùng pha');       // 2π wraps to 0
  assert.equal(rel(0, -P).dphi.text, 'π');                  // −π wraps to (−π, π]
  assert.deepEqual(Object.keys(rel(0, 0)), ['omega', 'T', 'dphi', 'relation']);
});

test('φ params step through the exact list; chip shows phase() text; A in cm', () => {
  const ps = new ParamSet(phase2.params);
  assert.equal(ps.get('phi1'), 0);
  assert.equal(ps.get('phi2'), -P / 2);
  const seen = [];
  ps.set('phi1', -P); seen.push(ps.get('phi1'));
  for (let i = 0; i < 6; i++) { ps.stepBy('phi1', 1); seen.push(ps.get('phi1')); }
  assert.deepEqual(seen, [-P, -P / 2, -P / 4, 0, P / 4, P / 2, P]);
  ps.stepBy('phi1', 1); assert.equal(ps.get('phi1'), P);
  ps.set('phi1', 0.5); assert.equal(ps.get('phi1'), P / 4);
  ps.set('A', 0.123); assert.equal(ps.get('A'), 0.1);
  ps.set('A', 0.053); assert.equal(ps.get('A'), 0.055);
  const rc = recorder(20), L = layoutFor(1366, 768, 1);
  ps.set('A', 0.05); ps.set('phi1', 0);
  drawChips(rc, L.chips, ps, new RevealBoard(['omega', 'T', 'dphi', 'relation']), phase2.results(ps.values()), THEMES.light, L.fontPx);
  assert.ok(rc.texts.includes('φ₁ = 0') && rc.texts.includes('φ₂ = −π/2') && rc.texts.includes('A = 5 cm'), rc.texts.join(' | '));
});

test('both start at x = A cos φ, v = −ωA sin φ; changing a param restarts at t = 0', () => {
  const p = { k: 100, m: 1, A: 0.05, phi1: 0, phi2: -P / 2 };
  const sim = phase2.create(p);
  assert.ok(Math.abs(sim.osc[0].x - 0.05) < 1e-12 && Math.abs(sim.osc[0].v) < 1e-12);
  assert.ok(Math.abs(sim.osc[1].x) < 1e-12 && Math.abs(sim.osc[1].v - 10 * 0.05) < 1e-9);
  sim.step(0.05);
  assert.ok(Math.abs(sim.osc[0].x - 0.05 * Math.cos(10 * 0.05)) < 1e-4);
  assert.ok(sim.charts[0].pts.length > 0);
  sim.setParams({ ...p, phi2: P });
  assert.equal(sim.time, 0);
  assert.ok(Math.abs(sim.osc[1].x + 0.05) < 1e-12 && sim.charts[0].pts.length === 0);
});

for (const [W, H] of [[1366, 768], [1920, 1080], [730, 630]]) {
  test(`mouse path at ${W}x${H}: there is nothing to grab`, () => {
    const L = layoutFor(W, H, 1), sim = phase2.create({ k: 100, m: 1, A: 0.05, phi1: 0, phi2: 0 });
    sim.draw(recorder(L.fontPx), { layout: L, theme: THEMES.light, layerCount: 0, paused: false, time: 0 });
    const m = sim.massPos();
    assert.equal(sim.hits(m.x, m.y), false);
    assert.equal(sim.grab(m.x, m.y), false);
    sim.drag(0.2, 0.2); sim.release();
  });

  test(`everything is inside the canvas at ${W}x${H}`, () => {
    const L = layoutFor(W, H, 1);
    for (const A of [0.01, 0.1]) {
      const params = new ParamSet(phase2.params); params.set('A', A);
      const sim = phase2.create(params.values()), rc = recorder(L.fontPx);
      const reveal = new RevealBoard(['omega', 'T', 'dphi', 'relation']); reveal.revealAll();
      for (let i = 0; i < 50; i++) sim.step(0.02);
      sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: 2, paused: false, time: 1, reveal });
      for (const [x, y] of rc.pts) assert.ok(x >= 0 && x <= W && y >= 0 && y <= H, `${W}x${H} A=${A}: ${x},${y}`);
      assert.ok(rc.texts.includes('x₁ = 1·cos(10t) (cm)') || rc.texts.includes('x₁ = 10·cos(10t) (cm)'), rc.texts.join(' | '));
      const g = geom(L, A);
      assert.ok(g.chart.h > 0.15 * H && g.chart.y > g.rows[1].cy + g.r, 'chart has room below the springs');
    }
  });
}
