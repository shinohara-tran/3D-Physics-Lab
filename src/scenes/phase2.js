// Bài 3 — hai dao động cùng tần số: độ lệch pha Δφ = φ₂ − φ₁ (SGK Hình 2.2/2.4). Two springs stacked, shared k, m, A.
import { SpringOscillator } from '../physics/oscillator.js';
import { omegaSpring, period } from '../physics/formulas.js';
import { phase } from '../format.js';
import { layoutFor } from '../ui/layout.js';
import { FONT } from '../draw/theme.js';
import { drawSpring, drawMass, StripChart } from '../draw/primitives.js';
import { equationLine, drawEquationRow } from './common.js';

const CHART_S = 4;          // seconds of history on the chart
const EPS = 1e-9;
const PHASES = [-Math.PI, -Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, Math.PI];
const SUB = ['x₁', 'x₂'];
const DEFAULT_LAYOUT = layoutFor(1600, 900, 1);   // until the first draw tells us the real screen

/** φ₂ − φ₁ wrapped into (−π, π]. */
export function wrapPhase(d) {
  while (d > Math.PI + EPS) d -= 2 * Math.PI;
  while (d <= -Math.PI + EPS) d += 2 * Math.PI;
  return d;
}

export function relationOf(d) {
  const a = Math.abs(d);
  if (a < EPS) return 'cùng pha';
  if (Math.abs(a - Math.PI) < EPS) return 'ngược pha';
  if (Math.abs(a - Math.PI / 2) < EPS) return 'vuông pha';
  return 'lệch pha';
}

// Stage geometry (CSS px): two spring rows, then the shared chart, then two equation rows at the bottom.
export function geom(L, A = 0.05) {
  const s = L.stage, f = L.fontPx, pad = Math.round(f * 0.4);
  const top = s.y + f * 1.6, bot = L.H - pad, rowH = (bot - top) * 0.17, eqH = f * 1.3;
  const r = Math.min(s.w * 0.05, rowH * 0.28), cx = s.x + s.w / 2, scale = s.w * 0.4 / 0.11;
  const rows = [0, 1].map((i) => ({ top: top + i * rowH, cy: top + (i + 0.5) * rowH }));
  const cy0 = top + 2 * rowH + f * 0.3;
  const chart = { x: s.x + f * 0.5, y: cy0, w: s.w - f, h: bot - 2 * eqH - f * 0.2 - cy0 };
  return { rows, r, cx, scale, wallX: s.x + s.w * 0.04, chart, eqY: [bot - 2 * eqH, bot - eqH], xr: 1.1 * A };
}

class Phase2Sim {
  constructor(p) { this.L = DEFAULT_LAYOUT; this.reset(p); }

  /** Both start at t = 0 with x = A·cos φ, v = −ωA·sin φ. */
  reset(p) {
    this.p = { k: p.k, m: p.m, A: p.A, phi1: p.phi1, phi2: p.phi2 };
    const w = omegaSpring(p.k, p.m);
    this.osc = [p.phi1, p.phi2].map((phi) => {
      const o = new SpringOscillator({ k: p.k, m: p.m });
      o.set(p.A * Math.cos(phi), -w * p.A * Math.sin(phi));
      return o;
    });
    this.charts = [new StripChart(CHART_S), new StripChart(CHART_S)];
    this.time = 0;
  }

  setParams(p) { this.reset(p); }          // any change restarts both at t = 0
  state() { return {}; }
  massPos() { return { x: 0.5, y: geom(this.L, this.p.A).rows[0].cy / this.L.H }; }
  hits() { return false; }                 // nothing to drag in this scene
  grab() { return false; }
  drag() {}
  release() {}

  step(dt) {
    if (dt <= 0) return;
    this.osc.forEach((o) => o.step(dt));
    this.time += Math.min(dt, 0.1);
    this.osc.forEach((o, i) => this.charts[i].push(this.time, o.x));
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount, reveal } = view;
    this.L = L;
    const g = geom(L, this.p.A), f = L.fontPx, cols = [th.accent, th.a];
    ctx.font = `${f}px ${FONT}`;
    this.osc.forEach((o, i) => {
      const { top, cy } = g.rows[i], mx = g.cx + o.x * g.scale, floorY = cy + g.r;
      ctx.strokeStyle = th.muted; ctx.fillStyle = th.muted; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(g.wallX, floorY); ctx.lineTo(L.stage.x + L.stage.w, floorY); ctx.stroke();
      ctx.fillRect(g.wallX - f * 0.4, cy - g.r * 1.5, f * 0.4, g.r * 2.5);
      ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(g.cx, cy - g.r * 1.5); ctx.lineTo(g.cx, floorY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = cols[i];
      ctx.fillText(`Vật ${i + 1}`, g.wallX + f * 0.5, top);
      drawSpring(ctx, g.wallX, cy, mx - g.r, cy, 12, g.r * 0.9, th.spring);
      drawMass(ctx, mx, cy, g.r, th.mass);
      ctx.fillStyle = th.bg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), mx, cy);
    });

    if (layerCount >= 1) {
      const c = g.chart;
      ctx.strokeStyle = th.grid; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h / 2); ctx.lineTo(c.x + c.w, c.y + c.h / 2); ctx.stroke();
      this.charts.forEach((ch, i) => ch.draw(ctx, c, cols[i], [-g.xr, g.xr]));   // same scale for both curves
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      SUB.forEach((s, i) => { ctx.fillStyle = cols[i]; ctx.fillText(`${s}(t)`, c.x + f * (0.3 + 3.2 * i), c.y + 2); });
    }
    if (layerCount >= 2) {
      const rv = { isShown: (k) => (k === 'omega' ? !!reveal?.isShown('omega') : true) };   // A, φ are given; only ω waits
      const w = omegaSpring(this.p.k, this.p.m);
      [this.p.phi1, this.p.phi2].forEach((phi, i) =>
        drawEquationRow(ctx, L, th, equationLine(SUB[i], this.p.A, w, phi, rv), g.cx, g.eqY[i]));
    }
  }
}

export default {
  id: 'phase2',
  title: 'Hai con lắc — độ lệch pha',
  lesson: 'Bài 2',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
    { key: 'A', label: 'A', unit: 'cm', min: 0.01, max: 0.1, step: 0.005, value: 0.05, toDisplay: (v) => v * 100 },
    { key: 'phi1', label: 'φ₁', unit: 'rad', min: -Math.PI, max: Math.PI, step: Math.PI / 4, values: PHASES, value: 0, format: phase },
    { key: 'phi2', label: 'φ₂', unit: 'rad', min: -Math.PI, max: Math.PI, step: Math.PI / 4, values: PHASES, value: -Math.PI / 2, format: phase },
  ],
  layers: ['Đồ thị x₁(t), x₂(t)', 'Phương trình'],
  results({ k, m, phi1 = 0, phi2 = -Math.PI / 2 }) {
    const w = omegaSpring(k, m), d = wrapPhase(phi2 - phi1), rel = relationOf(d);
    return [
      { key: 'omega', label: 'ω', formula: 'ω = √(k/m)', value: w, unit: 'rad/s' },
      { key: 'T', label: 'T', formula: 'T = 2π√(m/k)', value: period(w), unit: 's' },
      { key: 'dphi', label: 'Δφ', formula: 'Δφ = φ₂ − φ₁', value: d, unit: 'rad', text: phase(d) },
      { key: 'relation', label: 'Quan hệ', formula: 'Δφ = 0, ±π, ±π/2', value: rel, unit: '', text: rel },
    ];
  },
  create: (p) => new Phase2Sim(p),
};
