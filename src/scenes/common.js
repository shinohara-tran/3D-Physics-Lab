// Pieces shared by the oscillation scenes (springH, springV, pendulum).
import { num, phase } from '../format.js';
import { FONT } from '../draw/theme.js';
import { drawMass } from '../draw/primitives.js';

/** Maps StripChart-local coords (u = time along w, v = value down h, value hi at v = 0) onto the tape:
 *  newest sample at the top edge (pen), tape runs downward, +x on the right like the mass. A reflection, not a rotation. */
export const tapeTransform = (t) => [0, -1, -1, 0, t.x + t.w, t.y + t.h];

/** Paper tape under the mover (Hình 6.1): the pen sits at `value` (range ±xr across the tape) and the tape runs downward. */
export function drawTape(ctx, th, f, tape, chart, xr, value, label) {
  const t = tape, cx = t.x + t.w / 2;
  ctx.strokeStyle = th.grid; ctx.lineWidth = 2; ctx.strokeRect(t.x, t.y, t.w, t.h);
  ctx.beginPath(); ctx.moveTo(cx, t.y); ctx.lineTo(cx, t.y + t.h); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
  ctx.transform(...tapeTransform(t));
  chart.draw(ctx, { x: 0, y: 0, w: t.h, h: t.w }, th.accent, [-xr, xr]);
  ctx.restore();
  drawMass(ctx, cx + value * t.w / (2 * xr), t.y, f * 0.25, th.accent);
  ctx.fillStyle = th.muted; ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(label, t.x + t.w + f * 0.4, t.y);
}

/** "x = A·cos(ωt + φ) (cm)" with "?" for every part not yet revealed. A in metres, shown in cm. */
export function equationLine(sym, A, omega, phi, reveal) {
  const show = (k, txt) => (reveal?.isShown(k) ? txt : '?');
  const ph = phi < 0 ? `− ${phase(-phi)}` : phase(phi) === '0' ? '' : `+ ${phase(phi)}`;   // φ = 0: no phase term
  return `${sym} = ${show('A', num(A * 100, 1))}·cos(${show('omega', num(omega))}t${reveal?.isShown('phi') ? (ph && ' ' + ph).replace(' rad', '') : ' + ?'}) (cm)`;
}

/** One line centred on cx (clamped to the stage), so it never runs off the canvas. */
export function drawEquationRow(ctx, L, th, line, cx, y) {
  const f = L.fontPx;
  ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = th.accent;
  const s = L.stage, w = Math.min(s.w, ctx.measureText(line).width);
  const x = Math.min(s.x + s.w - w, Math.max(s.x, cx - w / 2));
  ctx.fillText(line, x, y, s.w);                  // maxWidth: last-resort squeeze for extreme values
}
