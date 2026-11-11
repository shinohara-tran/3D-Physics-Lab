// Bài 5 — năng lượng: one horizontal spring (drag/release as springH) plus bars Wđ, Wt, W and the parabolas Wđ(x), Wt(x).
import { SpringSim } from './springH.js';
import { omegaSpring, energy, kinetic, potential } from '../physics/formulas.js';
import { num, withUnit } from '../format.js';
import { FONT } from '../draw/theme.js';
import { drawBars } from '../draw/primitives.js';

const SAMPLES = 40;
/** Bar colours Wđ, Wt, W: W is the neutral text colour so it differs from both in either theme. */
export const barColors = (th) => [th.Wd, th.Wt, th.fg];
// One unit per state: mJ while W < 1 J, else J. Returns [unit, factor from J].
const unitFor = (W) => (W < 1 ? ['mJ', 1000] : ['J', 1]);
const fmtEnergy = (J) => { const [u, k] = unitFor(J); return withUnit(J * k, u, 2); };

// Boxes below the rig: bars on the left, parabolas on the right; each has a header row of f above it.
function boxes(L, g) {
  const s = L.stage, f = L.fontPx, pad = Math.round(f * 0.4);
  const y = g.eqY + f * 1.5, h = L.H - pad - y;
  return {
    bars: { x: s.x + f * 0.5, y, w: s.w * 0.3, h },
    para: { x: s.x + s.w * 0.4, y, w: s.w * 0.6 - f * 0.5, h: h - f * 1.3 },   // plot only; tick labels go below
    headY: g.eqY + f * 0.1,
  };
}

class EnergySim extends SpringSim {
  /** Live Wđ, Wt (J) at the current x; while dragging the amplitude is the drag position (released from rest). */
  energies() {
    const w = this.osc.omega0(), x = this.osc.x, A = this.dragging ? Math.abs(x) : this.A;
    const W = energy(this.osc.m, w, A), xc = Math.min(A, Math.max(-A, x));
    return { A, W, Wd: Math.max(0, kinetic(this.osc.m, w, A, xc)), Wt: potential(this.osc.m, w, xc), x: xc };
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount, reveal } = view;
    const { g, f } = this.drawRig(ctx, L, th), b = boxes(L, g);
    const { A, W, Wd, Wt, x } = this.energies();
    if (!(A > 0) || layerCount < 1) return;
    const [unit, k] = unitFor(W), bc = barColors(th);
    ctx.font = `${f}px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = th.muted;
    ctx.fillText(`W (${unit})${reveal?.isShown('W') ? ` = ${num(W * k, 2)}` : ''}`, b.bars.x, b.headY);
    drawBars(ctx, b.bars, [{ label: 'Wđ', value: Wd, color: bc[0] }, { label: 'Wt', value: Wt, color: bc[1] }, { label: 'W', value: W, color: bc[2] }], W);
    if (layerCount < 2) return;

    const p = b.para, yAt = (E) => p.y + p.h * (1 - E / W), xAt = (u) => p.x + p.w * (u + A) / (2 * A);
    ctx.fillStyle = th.Wd; ctx.fillText('Wđ(x)', p.x, b.headY);
    ctx.fillStyle = th.Wt; ctx.fillText('Wt(x)', p.x + ctx.measureText('Wđ(x)  ').width, b.headY);
    ctx.strokeStyle = th.grid; ctx.lineWidth = 2;                        // shared axis: x across the bottom, Wđ = Wt = 0 line
    ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.moveTo(xAt(0), p.y); ctx.lineTo(xAt(0), p.y + p.h); ctx.stroke();
    ctx.fillStyle = th.muted; ctx.textAlign = 'left'; ctx.fillText('−A', p.x, p.y + p.h + 4);
    ctx.textAlign = 'right'; ctx.fillText('A', p.x + p.w, p.y + p.h + 4);
    ctx.textAlign = 'center'; ctx.fillText('x', xAt(0), p.y + p.h + 4);
    ctx.textAlign = 'left'; ctx.fillText('W', p.x + 4, p.y + 2);
    const w = this.osc.omega0();
    for (const [E, col] of [[(u) => kinetic(this.osc.m, w, A, u), th.Wd], [(u) => potential(this.osc.m, w, u), th.Wt]]) {
      ctx.beginPath();
      for (let i = 0; i <= SAMPLES; i++) { const u = -A + 2 * A * i / SAMPLES; (i ? ctx.lineTo : ctx.moveTo).call(ctx, xAt(u), yAt(E(u))); }
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(xAt(x), yAt(E(x)), f * 0.3, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    }
  }
}

export default {
  id: 'energy',
  title: 'Năng lượng',
  lesson: 'Bài 5',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
  ],
  layers: ['Thanh Wđ, Wt, W', 'Parabol Wđ(x), Wt(x)'],
  results({ k, m, A = 0 }) {
    const W = energy(m, omegaSpring(k, m), A), text = fmtEnergy(W);
    return [
      { key: 'W', label: 'W', formula: 'W = ½mω²A²', value: W, unit: 'J', text },
      { key: 'Wdmax', label: 'Wđmax', formula: 'Wđmax = ½mω²A²', value: W, unit: 'J', text },
      { key: 'Wtmax', label: 'Wtmax', formula: 'Wtmax = ½kA²', value: W, unit: 'J', text },
    ];
  },
  create: (p) => new EnergySim(p),
};
