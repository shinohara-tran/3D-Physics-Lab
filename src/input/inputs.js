// Input state with no DOM: gestures only when a camera started; the keyboard always works.
import { keyToAction } from './keys.js';

export function startInputs({ cameraOk }) {
  const s = {
    cameraOk,
    wanted: true,                 // the user's choice via 'g', kept while the camera is still loading
    gesturesEnabled: cameraOk,
    dispatchKey(key) {
      const a = keyToAction(key);
      if (a?.type === 'toggleGestures') {
        s.wanted = s.cameraOk ? !s.gesturesEnabled : !s.wanted;
        s.gesturesEnabled = s.cameraOk && s.wanted;
      }
      return a;
    },
    /** Camera finished loading (ok) or was lost (!ok): gestures follow the camera and the user's last choice. */
    cameraReady(ok) { s.cameraOk = ok; s.gesturesEnabled = ok && s.wanted; },
  };
  return s;
}

/** Presenter clicker (PageDown/PageUp): step through layers, then cross into the next/previous scene. */
export function clickerAction(type, layer, layerCount) {
  if (type === 'nextStep') return { type: layer < layerCount ? 'nextLayer' : 'nextScene' };
  return { type: layer > 0 ? 'prevLayer' : 'prevScene' };
}

export const CAMERA_STALL_S = 3;
/** The camera is gone: poll threw, the video track ended, or no new frame for more than 3 s. */
export const cameraLost = ({ failed = false, ended = false, sinceFrameS = 0 }) => failed || ended || sinceFrameS > CAMERA_STALL_S;

export const WHEEL_STEP = 100;
/** Touchpads send many small deltas: accumulate, one notch per WHEEL_STEP units. Returns [notches (+ = wheel down), rest]. */
export function wheelSteps(acc, deltaY) {
  const sum = acc + deltaY, n = Math.trunc(sum / WHEEL_STEP);
  return [n, sum - n * WHEEL_STEP];
}
