// Bài 9 — tắt dần, dao động cưỡng bức, cộng hưởng: one horizontal spring with damping b and a driving force F₀·cos(2πft).
import { SpringSim } from './springH.js';
import { omegaSpring, period, frequency, steadyAmplitude } from '../physics/formulas.js';
import { withUnit } from '../format.js';
import { FONT } from '../draw/theme.js';
import { drawArrow } from '../draw/primitives.js';
import { drawTape } from './common.js';

const B_MIN = 0.02;         // kg/s: keeps A(f) finite at resonance
const SAMPLES = 60;
const FORCE_FULL = 1;       // N: pusher arrow length scale

const driving = (p) => ({ k: p.k, m: p.m, b: p.b, F0: p.F0, f: p.f });

// A(f) lives in the side panel; plot area leaves room for the "f" / "f₀" labels below.
function curveBox(L) {
  const s = L.side, f = L.fontPx;
  return { x: s.x + f * 0.8, y: s.y + f * 1.6, w: s.w - f * 1.2, h: s.h - f * 3.4 };
}

class DampedSim extends SpringSim {
  reset(p) {
    super.reset(p);
    this.osc.setParams(driving(p));
  }

  /** Any parameter change keeps the motion running (the driving phase is the oscillator's own clock). */
  setParams(p) { this.osc.setParams(driving(p)); }

  step(dt) {
    super.step(dt);
    const { x } = this.osc;
    // shortcut: a hard stop at the drag limit (the tape is that wide), so resonance with b≈0 stays on screen
    if (Math.abs(x) > this.xmax) this.osc.set(Math.sign(x) * this.xmax, 0);
  }

  drawPusher(ctx, g, f, th) {
    const { F0, f: fd, t } = this.osc;
    if (!(F0 > 0)) return;
    const y = g.cy - g.r * 1.6, x0 = g.wallX + f * 0.6, len = this.L.stage.w * 0.12 * F0 / FORCE_FULL * Math.cos(2 * Math.PI * fd * t);
    ctx.strokeStyle = th.muted; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(g.wallX, y); ctx.lineTo(x0, y); ctx.stroke();          // rod from the wall
    ctx.font = `${f}px ${FONT}`; ctx.fillStyle = th.a;
    drawArrow(ctx, x0, y, x0 + len, y, th.a, 'F');
  }

  drawCurve(ctx, L, th) {
    const b = curveBox(L), f = L.fontPx, w0 = this.osc.omega0(), f0 = w0 / (2 * Math.PI), fmax = 2 * f0;
    const { b: damp, m, f: fd } = this.osc, bb = Math.max(damp, B_MIN);
    const A = (fr) => steadyAmplitude(1, m, w0, bb, 2 * Math.PI * fr);            // shape only (F₀ scales it): normalised to its peak
    let peak = 0;
    for (let i = 0; i <= SAMPLES; i++) peak = Math.max(peak, A(fmax * i / SAMPLES));
    peak = Math.max(peak, A(f0));
    const xAt = (fr) => b.x + b.w * Math.min(1, Math.max(0, fr / fmax)), yAt = (fr) => b.y + b.h * (1 - A(fr) / peak);
    ctx.strokeStyle = th.grid; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.stroke();
    ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(xAt(f0), b.y); ctx.lineTo(xAt(f0), b.y + b.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `${f}px ${FONT}`; ctx.fillStyle = th.muted; ctx.textBaseline = 'top';
    ctx.textAlign = 'center'; ctx.fillText('f₀', xAt(f0), b.y + b.h + 4);
    ctx.textAlign = 'right'; ctx.fillText('f', b.x + b.w, b.y + b.h + 4);
    ctx.textAlign = 'left'; ctx.fillText('A(f)', b.x, b.y - f * 1.3);
    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) { const fr = fmax * i / SAMPLES; (i ? ctx.lineTo : ctx.moveTo).call(ctx, xAt(fr), yAt(fr)); }
    ctx.strokeStyle = th.accent; ctx.lineWidth = 4; ctx.stroke();
    if (this.osc.F0 > 0) {                         // moving dot at the driving frequency
      const cf = Math.min(fd, fmax);
      ctx.beginPath(); ctx.arc(xAt(cf), yAt(cf), f * 0.35, 0, 2 * Math.PI); ctx.fillStyle = th.mass; ctx.fill();
    }
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount } = view;
    const { g, f } = this.drawRig(ctx, L, th);
    this.drawPusher(ctx, g, f, th);
    if (layerCount >= 1) drawTape(ctx, th, f, g.tape, this.chart, g.xr, this.osc.x, 'x(t)');
    if (layerCount >= 2) this.drawCurve(ctx, L, th);
  }
}

export default {
  id: 'damped',
  title: 'Tắt dần, cưỡng bức, cộng hưởng',
  lesson: 'Bài 9',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
    { key: 'b', label: 'lực cản', unit: 'kg/s', min: 0, max: 2, step: 0.05, value: 0.3 },
    { key: 'F0', label: 'F₀', unit: 'N', min: 0, max: 1, step: 0.05, value: 0 },
    { key: 'f', label: 'f', unit: 'Hz', min: 0.2, max: 5, step: 0.05, value: 1 },
  ],
  layers: ['Băng x(t)', 'Đường A(f)'],
  results({ k, m }) {
    const w = omegaSpring(k, m);
    return [
      { key: 'f0', label: 'f₀', formula: 'f₀ = (1/2π)√(k/m)', value: frequency(w), unit: 'Hz' },
      { key: 'T0', label: 'T₀', formula: 'T₀ = 2π√(m/k)', value: period(w), unit: 's' },
    ];
  },
  create: (p) => new DampedSim(p),
};
