import test from 'node:test';
import assert from 'node:assert/strict';
import { startInputs } from '../src/input/inputs.js';

test('no camera: gestures disabled, keyboard still dispatches', () => {
  const inp = startInputs({ cameraOk: false });
  assert.equal(inp.gesturesEnabled, false);
  assert.deepEqual(inp.dispatchKey('Enter'), { type: 'revealNext' });
  assert.deepEqual(inp.dispatchKey(' '), { type: 'togglePause' });
  assert.deepEqual(inp.dispatchKey('g'), { type: 'toggleGestures' });
  assert.equal(inp.gesturesEnabled, false, 'g cannot enable gestures without a camera');
  assert.equal(inp.dispatchKey('F11'), null);
});

test('with camera: g toggles gestures', () => {
  const inp = startInputs({ cameraOk: true });
  assert.equal(inp.gesturesEnabled, true);
  inp.dispatchKey('g'); assert.equal(inp.gesturesEnabled, false);
  inp.dispatchKey('g'); assert.equal(inp.gesturesEnabled, true);
});

test('app.js imports without a DOM (main() only runs in the browser)', async () => {
  const m = await import('../src/app.js');
  assert.equal(typeof m.startCamera, 'function');
});

test('notice hides after the delay and on click', async () => {
  const { showNotice } = await import('../src/app.js');
  const el = {}, timers = [];
  showNotice(el, 'x', 6000, (fn, ms) => timers.push([fn, ms]));
  assert.equal(el.hidden, false); assert.equal(el.textContent, 'x');
  assert.equal(timers[0][1], 6000);
  timers[0][0]();
  assert.equal(el.hidden, true);
  el.hidden = false; el.onclick();
  assert.equal(el.hidden, true);
});

import { clickerAction, cameraLost, wheelSteps } from '../src/input/inputs.js';

test('gestures turned off with g while the camera loads stay off when it is ready', () => {
  const off = startInputs({ cameraOk: false });
  off.dispatchKey('g'); off.cameraReady(true);
  assert.equal(off.gesturesEnabled, false);
  off.dispatchKey('g'); assert.equal(off.gesturesEnabled, true);
  const on = startInputs({ cameraOk: false });
  on.cameraReady(true); assert.equal(on.gesturesEnabled, true);
  on.cameraReady(false); assert.equal(on.gesturesEnabled, false, 'camera lost → gestures off');
});

test('clicker: PageDown at the last layer → nextScene, PageUp at layer 0 → prevScene', () => {
  assert.deepEqual(clickerAction('nextStep', 0, 2), { type: 'nextLayer' });
  assert.deepEqual(clickerAction('nextStep', 2, 2), { type: 'nextScene' });
  assert.deepEqual(clickerAction('prevStep', 1, 2), { type: 'prevLayer' });
  assert.deepEqual(clickerAction('prevStep', 0, 2), { type: 'prevScene' });
});

test('camera lost: poll error, track ended, or no frame for > 3 s', () => {
  assert.equal(cameraLost({ sinceFrameS: 0.5 }), false);
  assert.equal(cameraLost({ sinceFrameS: 3 }), false);
  assert.equal(cameraLost({ sinceFrameS: 3.1 }), true);
  assert.equal(cameraLost({ failed: true }), true);
  assert.equal(cameraLost({ ended: true }), true);
});

test('wheel: touchpad deltas accumulate, one notch per 100 units', () => {
  let acc = 0, n = 0, total = 0;
  for (let i = 0; i < 10; i++) { [n, acc] = wheelSteps(acc, 25); total += n; }
  assert.equal(total, 2); assert.equal(acc, 50);
  assert.deepEqual(wheelSteps(0, -100), [-1, 0]);
  assert.deepEqual(wheelSteps(0, 300), [3, 0]);
});

test('reach: inner camera box maps to the whole stage, same gain on x and y', async () => {
  const { reach } = await import('../src/input/inputs.js');
  const [[x0, y0], [x1, y1]] = reach([[0.15, 0.1], [0.85, 0.8]]);
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(y0) < 1e-9 && Math.abs(x1 - 1) < 1e-9 && Math.abs(y1 - 1) < 1e-9);
});
