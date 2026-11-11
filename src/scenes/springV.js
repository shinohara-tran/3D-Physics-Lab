// Bài 1, 2 — con lắc lò xo thẳng đứng (SGK Hình 1.2): x measured from VTCB, positive DOWNWARD.
// Gravity only shifts the equilibrium by Δℓ₀ = mg/k, so the oscillator is the same x'' = −(k/m)x as the horizontal one.
import { SpringSim } from './springH.js';
import { omegaSpring, period, frequency, staticStretch } from '../physics/formulas.js';
import { withUnit, phase } from '../format.js';
import { FONT } from '../draw/theme.js';
import { drawSpring, drawMass, drawArrow } from '../draw/primitives.js';
import { equationLine, drawEquationRow } from './common.js';

const G = 9.8;              // m/s², fixed
const XMAX = 0.1;           // drag limit, m (Δℓ₀ itself reaches 0,196 m)

// Stage geometry (CSS px). Spring hangs from the ceiling at `top` (below the title line); the strip chart sits to its LEFT, pen at the
// mass's height. px/m is fitted so the ceiling, natural-length mark, VTCB and the lowest mass position all stay inside the stage.
export function geom(L, dl = 0) {
  const s = L.stage, f = L.fontPx, pad = Math.round(f * 0.4);
  const top = s.y + f * 1.6, hv = L.H - pad - top, r = Math.min(s.w * 0.06, L.H * 0.06);
  const yEq = top + hv * 0.55;
  const upRoom = yEq - top - r - hv * 0.05, downRoom = L.H - pad - yEq - r;
  const scale = Math.min(1.6 * hv, upRoom / Math.max(dl, XMAX * 1.1), downRoom / (XMAX * 1.1));
  const cx = s.x + s.w * 0.6, xr = XMAX * 1.1;
  const penX = cx - r - f * 2.2, x0 = s.x + f * 0.5;
  const chart = { x: x0, y: yEq - xr * scale, w: penX - x0, h: 2 * xr * scale };
  return { top, scale, r, cx, yEq, xr, chart, eqY: chart.y + chart.h + f * 0.6, axisX: cx - r - f * 0.9 };
}

class SpringVSim extends SpringSim {
  xmax = XMAX;

  geom() { return geom(this.L, staticStretch(this.osc.m, G, this.osc.k)); }
  normY(xm) { const g = this.geom(); return (g.yEq + xm * g.scale) / this.L.H; }
  toMetres(ny) { const g = this.geom(); return (ny * this.L.H - g.yEq) / g.scale; }
  along(nx, ny) { return ny; }
  massPos() { return { x: this.geom().cx / this.L.W, y: this.normY(this.osc.x) }; }

  hits(nx, ny) {
    const p = this.massPos();
    return Math.hypot((nx - p.x) * this.L.W, (ny - p.y) * this.L.H) <= this.geom().r * 1.3;
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount, reveal } = view;
    this.L = L;
    const g = this.geom(), f = L.fontPx, my = g.yEq + this.osc.x * g.scale;
    const yNat = g.yEq - staticStretch(this.osc.m, G, this.osc.k) * g.scale;   // mass centre when the spring has its natural length

    // ceiling, natural-length mark, VTCB mark
    ctx.strokeStyle = th.muted; ctx.fillStyle = th.muted; ctx.lineWidth = 3;
    ctx.fillRect(g.cx - g.r * 2, g.top - f * 0.4, g.r * 4, f * 0.4);
    ctx.setLineDash([8, 8]);
    for (const y of [yNat, g.yEq]) { ctx.beginPath(); ctx.moveTo(g.cx - g.r * 1.4, y); ctx.lineTo(g.cx + g.r * 1.4, y); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left';
    const lx = g.cx + g.r * 1.5, room = L.stage.x + L.stage.w - lx;
    ctx.textBaseline = 'bottom'; ctx.fillText('chiều dài tự nhiên', lx, yNat - 4, room);
    ctx.textBaseline = 'top'; ctx.fillText('VTCB', lx, g.yEq + 4, room);

    drawSpring(ctx, g.cx, g.top, g.cx, my - g.r, 12, g.r * 0.9, th.spring);
    drawMass(ctx, g.cx, my, g.r, th.mass);
    ctx.fillStyle = th.bg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('m', g.cx, my);

    // x axis: origin at VTCB, positive downward
    ctx.fillStyle = th.fg;
    drawArrow(ctx, g.axisX, g.yEq, g.axisX, g.yEq + 0.1 * g.scale, th.fg);
    ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = th.fg;
    ctx.fillText('x', g.axisX - f * 0.3, g.yEq + 0.1 * g.scale);

    if (layerCount >= 1) this.drawChart(ctx, th, g, f, my);
    if (layerCount >= 2) {
      const c = g.chart;
      drawEquationRow(ctx, L, th, equationLine('x', this.A, this.osc.omega0(), this.phi, reveal), c.x + c.w / 2, g.eqY);
    }
  }

  // Strip chart beside the spring (Hình 1.2): the pen is at the mass's height, time runs to the left.
  drawChart(ctx, th, g, f, my) {
    const c = g.chart;
    ctx.strokeStyle = th.grid; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.beginPath(); ctx.moveTo(c.x, g.yEq); ctx.lineTo(c.x + c.w, g.yEq); ctx.stroke();
    this.chart.draw(ctx, c, th.accent, [g.xr, -g.xr]);        // reversed range: +x downward
    drawMass(ctx, c.x + c.w, my, f * 0.25, th.accent);
    ctx.fillStyle = th.muted; ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('x(t)', c.x, c.y - 4);
  }
}

export default {
  id: 'springV',
  title: 'Con lắc lò xo thẳng đứng',
  lesson: 'Bài 1, 2',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
    { key: 'g', label: 'g', unit: 'm/s²', min: G, max: G, step: 0.1, value: G },   // fixed: shown, not adjustable
  ],
  layers: ['Băng x(t)', 'Phương trình'],
  results({ k, m, g = G, A = 0, phi = 0 }) {
    const w = omegaSpring(k, m), dl = staticStretch(m, g, k);
    return [
      { key: 'omega', label: 'ω', formula: 'ω = √(k/m)', value: w, unit: 'rad/s' },
      { key: 'T', label: 'T', formula: 'T = 2π√(m/k)', value: period(w), unit: 's' },
      { key: 'f', label: 'f', formula: 'f = 1/T', value: frequency(w), unit: 'Hz' },
      { key: 'dl0', label: 'Δℓ₀', formula: 'Δℓ₀ = mg/k', value: dl, unit: 'm', text: withUnit(dl * 100, 'cm', 2) },
      { key: 'A', label: 'A', formula: 'A = √(x₀² + (v₀/ω)²)', value: A, unit: 'm', text: withUnit(A * 100, 'cm', 1) },
      { key: 'phi', label: 'φ', formula: 'cos φ = x₀/A', value: phi, unit: 'rad', text: phase(phi) },
    ];
  },
  create: (p) => new SpringVSim(p),
};
