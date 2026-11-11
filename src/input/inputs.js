// Input state with no DOM: gestures only when a camera started; the keyboard always works.
import { keyToAction } from './keys.js';

export function startInputs({ cameraOk }) {
  const s = {
    cameraOk,
    gesturesEnabled: cameraOk,
    dispatchKey(key) {
      const a = keyToAction(key);
      if (a?.type === 'toggleGestures') s.gesturesEnabled = s.cameraOk && !s.gesturesEnabled;
      return a;
    },
  };
  return s;
}
