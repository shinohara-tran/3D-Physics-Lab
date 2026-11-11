import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor } from '../src/ui/layout.js';

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
