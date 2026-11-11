import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor } from '../src/ui/layout.js';
import { THEMES } from '../src/draw/theme.js';

const inside = (b, L) => b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0 && b.x + b.w <= L.W && b.y + b.h <= L.H;

for (const [w, h] of [[1366, 768], [1920, 1080], [3840, 2160]]) {
  for (const dpr of [1, 2]) {
    test(`layout ${w}x${h} @${dpr}`, () => {
      const L = layoutFor(w, h, dpr);
      assert.equal(L.W, w); assert.equal(L.H, h); assert.equal(L.dpr, dpr);
      assert.ok(L.fontPx >= h / 25, `fontPx ${L.fontPx} < ${h / 25}`);
      for (const k of ['stage', 'side', 'bottom', 'chips', 'cam']) assert.ok(inside(L[k], L), `${k} outside: ${JSON.stringify(L[k])}`);
    });
  }
}

import { geom } from '../src/scenes/springH.js';

for (const [w, h] of [[1366, 768], [1920, 1080], [730, 630]]) {
  test(`springH tape box ${w}x${h}: inside canvas, ≥ 0,3·H tall, centred on O, below the mass`, () => {
    const L = layoutFor(w, h, 1), g = geom(L), t = g.tape;
    assert.ok(inside(t, L), JSON.stringify(t));
    assert.ok(t.h >= 0.3 * h, `tape h ${t.h} < ${0.3 * h}`);
    assert.ok(Math.abs(t.x + t.w / 2 - g.cx) < 1e-9);
    assert.ok(t.y > g.cy + g.r);
    assert.ok(g.cy - g.r - 3.4 * L.fontPx >= L.stage.y, 'arrows above the mass fit in the stage');
  });
}

import { chipRows, drawChips } from '../src/draw/primitives.js';
import { recorder } from './helpers.js';
import { ParamSet } from '../src/ui/params.js';
import { RevealBoard } from '../src/ui/reveal.js';
import phase2 from '../src/scenes/phase2.js';
import springV from '../src/scenes/springV.js';
import damped from '../src/scenes/damped.js';
import { SCENES } from '../src/scenes/index.js';

for (const [w, h] of [[1024, 768], [730, 630]]) {
  for (const sc of [phase2, springV, damped]) {
    test(`${sc.id} at ${w}x${h}, all results revealed: no chip overlaps the stage, stage ≥ 0,5·H`, () => {
      const params = new ParamSet(sc.params), res = sc.results({ ...params.values(), A: 0.05, phi: Math.PI / 2 });
      const reveal = new RevealBoard(res.map((r) => r.key)); reveal.revealAll();
      const f = layoutFor(w, h, 1).fontPx, rc = recorder(f);
      const rows = chipRows(rc, layoutFor(w, h, 1).chips, params, res, f);
      const L = layoutFor(w, h, 1, rows);
      const hits = drawChips(rc, L.chips, params, reveal, res, THEMES.light, f);
      for (const { rect: r } of hits) assert.ok(r.y + r.h <= L.stage.y, `chip ${JSON.stringify(r)} overlaps stage y ${L.stage.y}`);
      assert.ok(L.stage.h >= 0.5 * h, `stage h ${L.stage.h}`);
      for (const k of ['stage', 'side', 'chips', 'formula']) assert.ok(inside(L[k], L), `${k} outside: ${JSON.stringify(L[k])}`);
    });
  }
}

test('2 chip rows (the default) keep the original layout', () => {
  assert.deepEqual(layoutFor(1366, 768, 1, 2), layoutFor(1366, 768, 1));
  assert.equal(layoutFor(1366, 768, 1).chips.h, Math.round(Math.ceil(768 / 25) * 3.6));
});

for (const [w, h] of [[1024, 768], [730, 630]]) {
  test(`every scene still fits the canvas with its real chip rows at ${w}x${h}`, () => {
    for (const sc of SCENES) {
      const params = new ParamSet(sc.params), res = sc.results({ ...params.values(), A: 0.05, phi: 0 });
      const f = layoutFor(w, h, 1).fontPx;
      const L = layoutFor(w, h, 1, chipRows(recorder(f), layoutFor(w, h, 1).chips, params, res, f));
      const sim = sc.create(params.values()), rc = recorder(f);
      sim.draw(rc, { layout: L, theme: THEMES.light, layerCount: sc.layers.length, paused: false, time: 0, reveal: new RevealBoard([]), results: res });
      for (const [x, y] of rc.pts) assert.ok(x >= -1 && x <= w + 1 && y >= -1 && y <= h + 1, `${sc.id}: ${x},${y}`);
    }
  });
}
