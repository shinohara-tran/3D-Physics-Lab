import test from 'node:test';
import assert from 'node:assert/strict';
import { ParamSet } from '../src/ui/params.js';

const mk = () => new ParamSet([
  { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
  { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 1, step: 0.05, value: 0.1, toDisplay: (v) => v * 1000 },
]);

test('get / values', () => {
  const p = mk();
  assert.equal(p.get('k'), 100);
  assert.deepEqual(p.values(), { k: 100, m: 0.1 });
});
test('set clamps', () => {
  const p = mk();
  p.set('k', 5000); assert.equal(p.get('k'), 1000);
  p.set('k', -3); assert.equal(p.get('k'), 10);
});
test('set snaps to step relative to min, no float noise', () => {
  const p = mk();
  p.set('k', 123); assert.equal(p.get('k'), 120);
  p.set('m', 0.37); assert.equal(p.get('m'), 0.35);
  p.set('m', 0.3); assert.equal(p.get('m'), 0.3);
});
test('nudge(1) from min reaches max; incremental', () => {
  const p = mk();
  p.set('k', 10); p.nudge('k', 1); assert.equal(p.get('k'), 1000);
  p.set('k', 10); p.nudge('k', 0.5); p.nudge('k', 0.5); assert.equal(p.get('k'), 1000);
});
test('1000 random nudges stay in range', () => {
  const p = mk();
  for (let i = 0; i < 1000; i++) {
    p.nudge('k', Math.random() * 4 - 2); p.nudge('m', Math.random() * 4 - 2);
    assert.ok(p.get('k') >= 10 && p.get('k') <= 1000);
    assert.ok(p.get('m') >= 0.05 && p.get('m') <= 1);
  }
});
test('select', () => {
  const p = mk();
  p.select('m'); assert.equal(p.selected, 'm');
});
