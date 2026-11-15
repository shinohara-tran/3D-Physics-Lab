// PageDown/PageUp are the presenter clicker: next/prev layer, crossing into the next/prev scene at the ends (app decides).
const MAP = { ' ': 'togglePause', ArrowRight: 'nextLayer', PageDown: 'nextStep', ArrowLeft: 'prevLayer', PageUp: 'prevStep',
  Enter: 'revealNext', r: 'revealAll', h: 'hideAll', n: 'nextScene', p: 'prevScene', g: 'toggleGestures', t: 'toggleTheme', c: 'toggleCamera', s: 'slowMo',
  m: 'toggleHome', '?': 'toggleHelp', F1: 'toggleHelp', Escape: 'closeHelp' };

/** Keyboard equivalent of every gesture. Returns an Action or null. Letters ignore Caps Lock / Shift. */
export function keyToAction(key) {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (Object.hasOwn(MAP, k)) return { type: MAP[k] };
  if (/^[1-7]$/.test(k)) return { type: 'gotoScene', index: k - 1 };
  return null;
}
