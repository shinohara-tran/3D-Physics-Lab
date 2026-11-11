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
