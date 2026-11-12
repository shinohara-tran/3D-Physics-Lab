import test from 'node:test';
import assert from 'node:assert/strict';
import { recorder } from './helpers.js';
import { drawFormula, formulaText } from '../src/draw/primitives.js';
import { layoutFor } from '../src/ui/layout.js';
import { THEMES } from '../src/draw/theme.js';
import { RevealBoard } from '../src/ui/reveal.js';
import { SCENES } from '../src/scenes/index.js';
import springH from '../src/scenes/springH.js';

test('formula text: "T = 2π√(m/k) = 0,63 s"; non "label =" formulas add the value after ";"', () => {
  const r = Object.fromEntries(springH.results({ k: 100, m: 1, A: 0.05, phi: 0 }).map((x) => [x.key, x]));
  assert.equal(formulaText(r.T), 'T = 2π√(m/k) = 0,63 s');
  assert.equal(formulaText(r.phi), 'cos φ = x₀/A; φ = 0');
});

for (const [W, H] of [[1366, 768], [730, 630]]) {
  test(`after revealNext the formula is drawn under the side panel, inside the canvas, at ≥ fontPx (${W}x${H})`, () => {
    const L = layoutFor(W, H, 1), res = springH.results({ k: 100, m: 1 });
    const board = new RevealBoard(res.map((r) => r.key));
    board.revealNext(); board.revealNext();
    const r = res.find((x) => x.key === board.last), rc = recorder(L.fontPx);
    drawFormula(rc, L.formula, r, THEMES.light, L.fontPx);
    assert.equal(rc.texts[0], 'Công thức');
    assert.equal(rc.texts.slice(1).join(' '), 'T = 2π√(m/k) = 0,63 s');
    assert.ok(parseInt(rc.font, 10) >= L.fontPx);
    for (const [x, y] of rc.pts) assert.ok(x >= L.formula.x - 1e-9 && x <= W && y <= H, `${x},${y}`);
  });
}

test('every scene formula fits the formula box at 730x630', () => {
  const L = layoutFor(730, 630, 1);
  for (const sc of SCENES) {
    for (const r of sc.results({ ...Object.fromEntries(sc.params.map((p) => [p.key, p.value])), A: 0.05, phi: 0 })) {
      const rc = recorder(L.fontPx);
      drawFormula(rc, L.formula, r, THEMES.light, L.fontPx);
      const maxY = Math.max(...rc.pts.map((p) => p[1]));
      assert.ok(maxY <= L.H, `${sc.id}.${r.key} overflows: ${maxY}`);
    }
  }
});

import { drawHelp, HELP } from '../src/ui/help.js';
for (const [W, H] of [[1366, 768], [730, 630]]) {
  test(`help overlay (${W}x${H}): Vietnamese rows inside the canvas at ≥ fontPx, no combining characters`, () => {
    const L = layoutFor(W, H, 1), rc = recorder(L.fontPx);
    drawHelp(rc, L, THEMES.dark);
    assert.ok(rc.texts.includes('Phím và cử chỉ') && rc.texts.includes('Dừng / Chạy'));
    assert.ok(parseInt(rc.font, 10) >= L.fontPx);
    for (const [x, y] of rc.pts) assert.ok(x >= 0 && y >= 0 && y <= H, `${x},${y}`);
    for (const row of HELP) for (const s of row) assert.doesNotMatch(s, /[\u0300-\u036f\u20d0-\u20ff]/);
  });
}
