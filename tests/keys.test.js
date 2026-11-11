import test from 'node:test';
import assert from 'node:assert/strict';
import { keyToAction } from '../src/input/keys.js';

const T = { ' ': 'togglePause', ArrowRight: 'nextLayer', PageDown: 'nextStep', ArrowLeft: 'prevLayer', PageUp: 'prevStep',
  Enter: 'revealNext', r: 'revealAll', h: 'hideAll', n: 'nextScene', p: 'prevScene', g: 'toggleGestures', t: 'toggleTheme', c: 'toggleCamera', s: 'slowMo',
  '?': 'toggleHelp', F1: 'toggleHelp', Escape: 'closeHelp' };
for (const [k, type] of Object.entries(T)) test(`key ${JSON.stringify(k)} → ${type}`, () => assert.deepEqual(keyToAction(k), { type }));
for (let i = 1; i <= 7; i++) test(`key ${i} → gotoScene ${i - 1}`, () => assert.deepEqual(keyToAction(String(i)), { type: 'gotoScene', index: i - 1 }));
test('unmapped key → null', () => assert.equal(keyToAction('x'), null));
test('Caps Lock / Shift: upper-case letters work', () => {
  assert.deepEqual(keyToAction('G'), { type: 'toggleGestures' });
  assert.deepEqual(keyToAction('R'), { type: 'revealAll' });
});
test('inherited object keys are not actions', () => {
  assert.equal(keyToAction('constructor'), null);
  assert.equal(keyToAction('toString'), null);
});
