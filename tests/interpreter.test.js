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
