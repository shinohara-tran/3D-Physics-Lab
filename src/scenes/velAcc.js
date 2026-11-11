// Bài 3 — vận tốc, gia tốc (SGK Hình 3.1/3.2): one horizontal spring (drag/release as springH) plus stacked time graphs x, v, a.
import { SpringSim } from './springH.js';
import { omegaSpring, period, vMax, aMax } from '../physics/formulas.js';
import { withUnit } from '../format.js';
import { FONT } from '../draw/theme.js';
import { drawArrow, StripChart } from '../draw/primitives.js';

const CHART_S = 4;          // seconds of history on the strips
// scale(A, ω): amplitude of each quantity; the strip range is ±1,1 of it
const STRIPS = [
  { label: 'x (cm)', layer: 2, scale: (A) => A },
  { label: 'v (cm/s)', layer: 3, scale: (A, w) => vMax(w, A) },
  { label: 'a (m/s²)', layer: 4, scale: (A, w) => aMax(w, A) },
];

// Strips fill the canvas below the spring row; they share the right edge ("now").
export function stripBoxes(L, g) {
  const s = L.stage, f = L.fontPx, pad = Math.round(f * 0.4);
  const y0 = g.cy + g.r + f * 1.7, gap = f * 0.2, h = (L.H - pad - y0 - 2 * gap) / 3;
  return STRIPS.map((_, i) => ({ x: s.x + f * 0.5, y: y0 + i * (h + gap), w: s.w - f, h }));
}

class VelAccSim extends SpringSim {
  // No class fields here: SpringSim's constructor calls reset() before subclass fields would initialise.
  reset(p) {
    super.reset(p);
    this.freshCharts();
  }

  freshCharts() { this.chart = new StripChart(CHART_S); this.vChart = new StripChart(CHART_S); this.aChart = new StripChart(CHART_S); }

  release() {
    if (!this.dragging) return;
    super.release();
    this.freshCharts();
  }

  step(dt) {
    const t0 = this.time;
    super.step(dt);
    if (this.time === t0) return;
    this.vChart.push(this.time, this.osc.v); this.aChart.push(this.time, this.osc.accel());
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount } = view;
    const { g, f, mx } = this.drawRig(ctx, L, th), w = this.osc.omega0(), A = this.A;
    ctx.font = `${f}px ${FONT}`;

    if (layerCount >= 1 && A > 0) {              // arrows from the mass, length ∝ v/vmax and a/amax
      const len = L.stage.w * 0.15, vy = g.cy - g.r - f * 0.6, ay = vy - f * 1.6;
      drawArrow(ctx, mx, vy, mx + len * this.osc.v / vMax(w, A), vy, th.v, 'v');
      drawArrow(ctx, mx, ay, mx + len * this.osc.accel() / aMax(w, A), ay, th.a, 'a');
    }

    const boxes = stripBoxes(L, g), charts = [this.chart, this.vChart, this.aChart], cols = [th.accent, th.v, th.a];
    STRIPS.forEach((s, i) => {
      if (layerCount < s.layer) return;
      const b = boxes[i], r = 1.1 * (A > 0 ? s.scale(A, w) : 1);
      ctx.strokeStyle = th.grid; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h / 2); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.stroke();
      charts[i].draw(ctx, b, cols[i], [-r, r]);
      ctx.fillStyle = th.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(s.label, b.x + f * 0.3, b.y + 2);
    });
    if (layerCount >= 2) {                        // shared "now" line at the right edge
      const x = boxes[0].x + boxes[0].w, last = boxes[2];
      ctx.strokeStyle = th.fg; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, boxes[0].y); ctx.lineTo(x, last.y + last.h); ctx.stroke();
    }
  }
}

export default {
  id: 'velAcc',
  title: 'Vận tốc, gia tốc',
  lesson: 'Bài 3',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
  ],
  layers: ['Mũi tên v, a', 'Đồ thị x(t)', 'Đồ thị v(t)', 'Đồ thị a(t)'],
  results({ k, m, A = 0 }) {
    const w = omegaSpring(k, m), vm = vMax(w, A), am = aMax(w, A);
    return [
      { key: 'omega', label: 'ω', formula: 'ω = √(k/m)', value: w, unit: 'rad/s' },
      { key: 'T', label: 'T', formula: 'T = 2π√(m/k)', value: period(w), unit: 's' },
      { key: 'A', label: 'A', formula: 'A = √(x₀² + (v₀/ω)²)', value: A, unit: 'm', text: withUnit(A * 100, 'cm', 1) },
      { key: 'vmax', label: 'vmax', formula: 'vmax = ωA', value: vm, unit: 'm/s', text: withUnit(vm * 100, 'cm/s', 1) },
      { key: 'amax', label: 'amax', formula: 'amax = ω²A', value: am, unit: 'm/s²', text: withUnit(am, 'm/s²', 2) },
    ];
  },
  create: (p) => new VelAccSim(p),
};
