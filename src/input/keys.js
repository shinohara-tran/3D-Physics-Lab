const MAP = { ' ': 'togglePause', ArrowRight: 'nextLayer', PageDown: 'nextLayer', ArrowLeft: 'prevLayer', PageUp: 'prevLayer',
  Enter: 'revealNext', r: 'revealAll', h: 'hideAll', n: 'nextScene', p: 'prevScene', g: 'toggleGestures', t: 'toggleTheme', c: 'toggleCamera', s: 'slowMo' };

/** Keyboard equivalent of every gesture. Returns an Action or null. */
export function keyToAction(key) {
  if (MAP[key]) return { type: MAP[key] };
  if (/^[1-7]$/.test(key)) return { type: 'gotoScene', index: key - 1 };
  return null;
}
