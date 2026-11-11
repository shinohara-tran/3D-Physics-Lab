import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureInterpreter } from '../src/input/interpreter.js';

// tips: y of index/middle/ring/pinky tips (0.4 extended, 0.72 curled). Translated so the index tip is at `at`.
function hand(pose, at = { x: 0.4, y: 0.4 }) {
  const tipY = { open: [0.4, 0.4, 0.4, 0.4], pinch: [0.4, 0.72, 0.72, 0.72], peace: [0.4, 0.4, 0.72, 0.72], point: [0.4, 0.72, 0.72, 0.72] }[pose];
  const lm = Array.from({ length: 21 }, () => [0.5, 0.9]);
  [5, 9, 13, 17].forEach((mcp, i) => {
    const x = 0.4 + i * 0.07;
    lm[mcp] = [x, 0.7]; lm[mcp + 1] = [x, 0.6]; lm[mcp + 3] = [x, tipY[i]];
  });
  lm[4] = pose === 'pinch' ? [0.4, 0.4] : [0.2, 0.7];
  const dx = at.x - 0.4, dy = at.y - 0.4;
  return lm.map(([x, y]) => [x + dx, y + dy]);
}
const run = (it, frames, hit, t0 = 0) => frames.flatMap((lm, i) => it.update(lm, t0 + i / 30, hit));
const rep = (lm, n) => Array(n).fill(lm);
const types = (a) => a.map((x) => x.type);
const mass = { massAt: (x, y) => Math.hypot(x - 0.4, y - 0.4) < 0.1, paramAt: () => null };

test('pinch on mass → grab, move → drag, open → release', () => {
  const it = new GestureInterpreter();
  const acts = run(it, [...rep(hand('pinch'), 3), ...rep(hand('pinch', { x: 0.45, y: 0.5 }), 2), ...rep(hand('open', { x: 0.45, y: 0.5 }), 1)], mass);
  assert.deepEqual(types(acts), ['grab', 'drag', 'drag', 'release']);
  assert.equal(acts[0].x, 0.4);
  assert.ok(Math.abs(acts[1].x - 0.45) < 1e-9 && Math.abs(acts[1].y - 0.5) < 1e-9);
  assert.equal(it.lastLabel, '🤏 Kéo vật');
});

test('hand lost mid-drag → release after 0.35 s, at last cursor', () => {
  const it = new GestureInterpreter();
  const pin = hand('pinch', { x: 0.42, y: 0.43 });
  const acts = run(it, [...rep(pin, 5), ...rep(null, 15)], mass);
  const rel = acts.filter((a) => a.type === 'release');
  assert.equal(rel.length, 1);
  assert.ok(Math.abs(rel[0].x - 0.42) < 1e-9 && Math.abs(rel[0].y - 0.43) < 1e-9);
});

test('open held 0.5 s → one togglePause; still holding → no repeat', () => {
  const it = new GestureInterpreter();
  const acts = run(it, rep(hand('open'), 60), mass);
  assert.deepEqual(types(acts), ['togglePause']);
  assert.equal(it.lastLabel, '✋ Dừng / Chạy');
});

test('pinch on chip k then move up 0.1 → adjust delta ≈ +0.1', () => {
  const it = new GestureInterpreter();
  const hit = { massAt: () => false, paramAt: () => 'k' };
  const acts = run(it, [...rep(hand('pinch', { x: 0.8, y: 0.8 }), 4), ...rep(hand('pinch', { x: 0.8, y: 0.7 }), 2)], hit);
  const adj = acts.filter((a) => a.type === 'adjust');
  assert.ok(adj.length >= 2);
  assert.equal(adj[0].key, 'k');
  assert.ok(Math.abs(adj.at(-1).delta - 0.1) < 1e-9);
  assert.equal(it.lastLabel, '🤏 Chỉnh k');
});

test('peace → one nextLayer', () => {
  const it = new GestureInterpreter();
  assert.deepEqual(types(run(it, rep(hand('peace'), 12), mass)), ['nextLayer']);
  assert.equal(it.lastLabel, '✌ Lớp tiếp');
});

test('null frames alone → no actions', () => {
  const it = new GestureInterpreter();
  assert.deepEqual(run(it, rep(null, 30), mass), []);
});

test('selected chip does not linger: hand lost, or finger leaves chip → pinch on empty space does nothing', () => {
  const onChip = { massAt: () => false, paramAt: (x) => (x > 0.7 ? 'k' : null) };
  const chip = { x: 0.8, y: 0.8 }, empty = { x: 0.2, y: 0.3 };
  const lost = new GestureInterpreter();
  const a1 = run(lost, [...rep(hand('point', chip), 20), ...rep(null, 15), ...rep(hand('pinch', empty), 6)], onChip);
  assert.ok(types(a1).includes('selectParam'));
  assert.ok(!types(a1).includes('adjust'));
  const moved = new GestureInterpreter();
  const a2 = run(moved, [...rep(hand('point', chip), 20), ...rep(hand('point', empty), 3), ...rep(hand('pinch', empty), 6)], onChip);
  assert.ok(types(a2).includes('selectParam'));
  assert.ok(!types(a2).includes('adjust'));
});

test('hand lost → cursor null after 0.35 s (no ghost cursor); a brief dropout keeps it', () => {
  const it = new GestureInterpreter();
  run(it, [...rep(hand('point'), 3), ...rep(null, 5)], mass);
  assert.ok(it.cursor, 'still shown during a short dropout');
  run(it, rep(null, 10), mass, 8 / 30);
  assert.equal(it.cursor, null);
});

test('opening the hand to end a pinch-drag does not pause: ignored for 1 s after the pinch', () => {
  const frames = [...rep(hand('pinch'), 6), ...rep(hand('open'), 54)];   // last pinched frame at t = 5/30 s
  const pauseAt = (n) => {
    const it = new GestureInterpreter();
    for (let i = 0; i < n; i++) if (it.update(frames[i], i / 30, mass).some((a) => a.type === 'togglePause')) return i / 30;
    return null;
  };
  const pinchEnd = 5 / 30;
  assert.equal(pauseAt(6 + 24), null, 'open held 0,8 s after the drag → no pause');
  const t = pauseAt(frames.length);
  assert.ok(t !== null && t - pinchEnd >= 1.5 - 1e-9 && t - pinchEnd < 1.6, `pause at ${t}`);
  const it = new GestureInterpreter();
  assert.deepEqual(types(run(it, frames.slice(0, 7), mass)), ['grab', 'drag', 'drag', 'drag', 'release']);
});

test('adjust label uses the parameter label, not the raw key', () => {
  const it = new GestureInterpreter();
  const hit = { massAt: () => false, paramAt: () => 'phi1', labelOf: (k) => ({ phi1: 'φ₁' })[k] };
  run(it, rep(hand('pinch', { x: 0.8, y: 0.8 }), 4), hit);
  assert.equal(it.lastLabel, '🤏 Chỉnh φ₁');
});

test('snap label avoids the 🫰 glyph (missing on Windows 10)', async () => {
  const { readFileSync } = await import('node:fs');
  assert.doesNotMatch(readFileSync('src/input/interpreter.js', 'utf8'), /🫰/);
});
