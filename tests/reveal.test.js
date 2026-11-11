import test from 'node:test';
import assert from 'node:assert/strict';
import { RevealBoard } from '../src/ui/reveal.js';

test('starts hidden, revealNext in order', () => {
  const b = new RevealBoard(['T', 'f', 'v']);
  assert.ok(!b.isShown('T') && !b.isShown('f') && !b.isShown('v'));
  b.revealNext(); assert.ok(b.isShown('T') && !b.isShown('f'));
  b.toggle('v'); b.revealNext(); assert.ok(b.isShown('f'));
  b.revealNext(); assert.ok(b.isShown('v'));
});
test('toggle, revealAll, hideAll', () => {
  const b = new RevealBoard(['T', 'f']);
  b.toggle('f'); assert.ok(b.isShown('f')); b.toggle('f'); assert.ok(!b.isShown('f'));
  b.revealAll(); assert.ok(b.isShown('T') && b.isShown('f'));
  b.hideAll(); assert.ok(!b.isShown('T') && !b.isShown('f'));
});
test('reset with new keys hides everything', () => {
  const b = new RevealBoard(['T']);
  b.revealAll(); b.reset(['x', 'A']);
  assert.ok(!b.isShown('x') && !b.isShown('A') && !b.isShown('T'));
  b.revealNext(); assert.ok(b.isShown('x'));
});

test('last: the most recently revealed key (its formula is shown)', () => {
  const b = new RevealBoard(['T', 'f', 'v']);
  assert.equal(b.last, null);
  b.revealNext(); assert.equal(b.last, 'T');
  b.toggle('v'); assert.equal(b.last, 'v');
  b.toggle('v'); assert.equal(b.last, null, 'hiding it clears the formula');
  b.revealAll(); assert.equal(b.last, 'f', 'first newly revealed');
  b.hideAll(); assert.equal(b.last, null);
  b.revealNext(); b.reset(['x']); assert.equal(b.last, null);
});
