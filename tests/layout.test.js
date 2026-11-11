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
