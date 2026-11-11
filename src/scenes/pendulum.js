// Bài 1, 2 — con lắc đơn. Drag the bob to set α (|α| ≤ 10°), release from rest: s = ℓα follows s = A·cos(ωt + φ).
import { PendulumOscillator } from '../physics/oscillator.js';
import { omegaPendulum, period, frequency, fromInitial } from '../physics/formulas.js';
import { num, withUnit, phase } from '../format.js';
import { layoutFor } from '../ui/layout.js';
import { FONT } from '../draw/theme.js';
import { drawMass, StripChart } from '../draw/primitives.js';
import { drawTape, equationLine, drawEquationRow } from './common.js';

const G = 9.8;
const ALPHA_MAX = 10 * Math.PI / 180;     // drag limit
const TAPE_S = 4;
const DEFAULT_LAYOUT = layoutFor(1600, 900, 1);

// Stage geometry (CSS px). Pivot just under the title line; the tape fills the rest down to the canvas bottom (≥ 0,3·H).
// The string is drawn at 80–100 % of the room above the equation row (ℓ = 0,2 → 2 m), so even the default ℓ swings visibly.
export function geom(L, l = 1) {
  const s = L.stage, f = L.fontPx, pad = Math.round(f * 0.4), cx = s.x + s.w / 2;
  const pivotY = s.y + f * 1.45, r = Math.min(s.w * 0.04, L.H * 0.035);
  const ty = Math.round(L.H * 0.68), eqY = ty - f * 1.2;
  const room = eqY - f * 0.2 - r - pivotY;
  const lenPx = (ll) => room * (0.8 + 0.2 * (ll - 0.2) / 1.8);
  const xr = ALPHA_MAX * 1.1 * l;                                   // tape half-range (m): 10° swing at this ℓ, with margin
  const tw = Math.min(s.w * 0.7, L.H * 0.5);
  return { cx, pivotY, d: lenPx(l), lenPx, r, eqY, xr, tape: { x: cx - tw / 2, y: ty, w: tw, h: L.H - pad - ty } };
}

class PendulumSim {
  constructor(p) { this.L = DEFAULT_LAYOUT; this.reset(p); }

  reset(p) {
    this.osc = new PendulumOscillator({ l: p.l, g: p.g ?? G });
    this.Aa = 0; this.phi = 0; this.time = 0; this.dragging = false;
    this.chart = new StripChart(TAPE_S);
  }

  /** ℓ changed: keep swinging; amplitude and φ are re-derived from the current state with t = 0 now. */
  setParams(p) {
    this.osc.setParams({ l: p.l, g: p.g ?? G });
    if (this.dragging || (this.osc.alpha === 0 && this.osc.omegaDot === 0)) return;
    ({ A: this.Aa, phi: this.phi } = fromInitial(this.osc.alpha, this.osc.omegaDot, this.osc.omega0()));
    this.osc.t = 0;
  }

  /** A = s₀ = ℓα₀ in metres; alpha0 = amplitude angle in rad. */
  state() { return { A: this.osc.l * this.Aa, alpha0: this.Aa, phi: this.phi }; }

  /** Normalized stage position of the bob at angle alpha. */
  normAt(alpha) {
    const g = geom(this.L, this.osc.l), d = g.d;
    return { x: (g.cx + d * Math.sin(alpha)) / this.L.W, y: (g.pivotY + d * Math.cos(alpha)) / this.L.H };
  }
  massPos() { return this.normAt(this.osc.alpha); }

  hits(nx, ny) {
    const p = this.massPos(), r = geom(this.L, this.osc.l).r * 1.3;
    return Math.hypot((nx - p.x) * this.L.W, (ny - p.y) * this.L.H) <= r;
  }

  grab(nx, ny) {
    if (!this.hits(nx, ny)) return false;
    this.dragging = true; this.osc.set(this.osc.alpha, 0);
    return true;
  }

  drag(nx, ny) {
    if (!this.dragging) return;
    const g = geom(this.L, this.osc.l);
    const a = Math.atan2(nx * this.L.W - g.cx, ny * this.L.H - g.pivotY);
    this.osc.set(Math.min(ALPHA_MAX, Math.max(-ALPHA_MAX, a)), 0);
  }

  release() {
    if (!this.dragging) return;
    this.dragging = false;
    // φ = 0 for α₀ > 0, π for α₀ < 0 (fromInitial)
    ({ A: this.Aa, phi: this.phi } = fromInitial(this.osc.alpha, 0, this.osc.omega0()));
    this.osc.t = 0; this.time = 0;
    this.chart = new StripChart(TAPE_S);
  }

  step(dt) {
    if (this.dragging || dt <= 0) return;
    this.osc.step(dt);
    this.time += Math.min(dt, 0.1);
    this.chart.push(this.time, this.osc.l * this.osc.alpha);       // s = ℓα
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount, reveal } = view;
    this.L = L;
    const { l, alpha } = this.osc, g = geom(L, l), f = L.fontPx, d = g.d;
    const bx = g.cx + d * Math.sin(alpha), by = g.pivotY + d * Math.cos(alpha);

    // ceiling and the vertical through the pivot (VTCB)
    ctx.strokeStyle = th.muted; ctx.fillStyle = th.muted; ctx.lineWidth = 3;
    ctx.fillRect(g.cx - g.r * 2, g.pivotY - f * 0.4, g.r * 4, f * 0.4);
    ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(g.cx, g.pivotY); ctx.lineTo(g.cx, g.pivotY + d + g.r * 1.4); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = th.spring; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(g.cx, g.pivotY); ctx.lineTo(bx, by); ctx.stroke();
    drawMass(ctx, bx, by, g.r, th.mass);

    if (layerCount >= 1) drawTape(ctx, th, f, g.tape, this.chart, g.xr, l * alpha, 's(t)');
    if (layerCount >= 2) drawEquationRow(ctx, L, th, equationLine('s', this.osc.l * this.Aa, this.osc.omega0(), this.phi, reveal), g.cx, g.eqY);
  }
}

export default {
  id: 'pendulum',
  title: 'Con lắc đơn',
  lesson: 'Bài 1, 2',
  params: [
    { key: 'l', label: 'ℓ', unit: 'm', min: 0.2, max: 2, step: 0.05, value: 1 },
    { key: 'g', label: 'g', unit: 'm/s²', min: G, max: G, step: 0.1, value: G },   // fixed: shown, not adjustable
  ],
  layers: ['Băng s(t)', 'Phương trình'],
  results({ l, g = G, A = 0, alpha0 = 0, phi = 0 }) {
    const w = omegaPendulum(g, l);
    return [
      { key: 'omega', label: 'ω', formula: 'ω = √(g/ℓ)', value: w, unit: 'rad/s' },
      { key: 'T', label: 'T', formula: 'T = 2π√(ℓ/g)', value: period(w), unit: 's' },
      { key: 'f', label: 'f', formula: 'f = 1/T', value: frequency(w), unit: 'Hz' },
      { key: 'A', label: 'A', formula: 'A = s₀ = ℓα₀', value: A, unit: 'm', text: withUnit(A * 100, 'cm', 1) },
      { key: 'alpha0', label: 'α₀', formula: 'α₀ = A/ℓ', value: alpha0, unit: 'rad', text: `${num(alpha0 * 180 / Math.PI, 1)}°` },
      { key: 'phi', label: 'φ', formula: 'α₀ > 0: φ = 0;  α₀ < 0: φ = π', value: phi, unit: 'rad', text: phase(phi) },
    ];
  },
  create: (p) => new PendulumSim(p),
};
