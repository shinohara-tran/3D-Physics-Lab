// Bài 1, 2 — con lắc lò xo nằm ngang. Drag the mass, release from rest: A and φ come from the release point.
import { SpringOscillator } from '../physics/oscillator.js';
import { omegaSpring, period, frequency, fromInitial } from '../physics/formulas.js';
import { num, withUnit, phase } from '../format.js';
import { layoutFor } from '../ui/layout.js';
import { FONT } from '../draw/theme.js';
import { drawSpring, drawMass, drawArrow, StripChart } from '../draw/primitives.js';

const XMAX = 0.15;          // drag limit, m
const TAPE_S = 4;           // seconds of paper tape kept
const DEFAULT_LAYOUT = layoutFor(1600, 900, 1);   // until the first draw tells us the real screen

// Stage geometry (CSS px): equilibrium point (cx, cy), metres -> px scale, mass radius, paper tape box.
// Mass row sits high (room above for the status line and the v, a arrows); the tape fills the rest down to the canvas bottom.
export function geom(L) {
  const s = L.stage, f = L.fontPx, cx = s.x + s.w / 2;
  const scale = s.w * 0.3 / XMAX, r = Math.min(s.w * 0.06, L.H * 0.07);
  const cy = s.y + r + f * 4.7;
  const xr = XMAX * 1.1, pad = Math.round(f * 0.4);
  const eqY = cy + r + f * 1.6;                       // equation row, below the floor and the "O" label
  const ty = eqY + f * 1.4;
  const tape = { x: cx - xr * scale, y: ty, w: 2 * xr * scale, h: L.H - pad - ty };
  return { cx, cy, scale, r, xr, tape, eqY, wallX: s.x + s.w * 0.04 };
}

/** Maps StripChart-local coords (u = time along w, v = value down h, value hi at v = 0) onto the tape:
 *  newest sample at the top edge (pen), tape runs downward, +x on the right like the mass. A reflection, not a rotation. */
export const tapeTransform = (t) => [0, -1, -1, 0, t.x + t.w, t.y + t.h];

class SpringSim {
  constructor(p) { this.L = DEFAULT_LAYOUT; this.reset(p); }

  reset(p) {
    this.osc = new SpringOscillator({ k: p.k, m: p.m });
    this.A = 0; this.phi = 0; this.time = 0; this.dragging = false; this.off = 0;
    this.chart = new StripChart(TAPE_S);
  }

  /** k or m changed: keep the motion; A, φ are re-derived from the current state with t = 0 now. */
  setParams(p) {
    this.osc.setParams({ k: p.k, m: p.m });
    if (this.dragging || (this.osc.x === 0 && this.osc.v === 0)) return;
    ({ A: this.A, phi: this.phi } = fromInitial(this.osc.x, this.osc.v, this.osc.omega0()));
    this.osc.t = 0;
  }

  state() { return { A: this.A, phi: this.phi }; }

  normX(xm) { const g = geom(this.L); return (g.cx + xm * g.scale) / this.L.W; }
  toMetres(nx) { const g = geom(this.L); return (nx * this.L.W - g.cx) / g.scale; }
  massPos() { return { x: this.normX(this.osc.x), y: geom(this.L).cy / this.L.H }; }

  hits(nx, ny) {
    const p = this.massPos(), r = geom(this.L).r * 1.3;
    return Math.hypot((nx - p.x) * this.L.W, (ny - p.y) * this.L.H) <= r;
  }

  grab(nx, ny) {
    if (!this.hits(nx, ny)) return false;
    this.dragging = true; this.off = this.osc.x - this.toMetres(nx);
    this.osc.set(this.osc.x, 0);
    return true;
  }

  drag(nx) {
    if (!this.dragging) return;
    this.osc.set(Math.min(XMAX, Math.max(-XMAX, this.toMetres(nx) + this.off)), 0);
  }

  release() {
    if (!this.dragging) return;
    this.dragging = false;
    ({ A: this.A, phi: this.phi } = fromInitial(this.osc.x, 0, this.osc.omega0()));
    this.osc.t = 0; this.time = 0;
    this.chart = new StripChart(TAPE_S);       // fresh tape from the release
  }

  step(dt) {
    if (this.dragging || dt <= 0) return;
    this.osc.step(dt);
    this.time += Math.min(dt, 0.1);
    this.chart.push(this.time, this.osc.x);
  }

  draw(ctx, view) {
    const { layout: L, theme: th, layerCount, reveal } = view;
    this.L = L;
    const g = geom(L), f = L.fontPx, x = this.osc.x, w = this.osc.omega0();
    const mx = g.cx + x * g.scale, floorY = g.cy + g.r;

    // floor, wall, equilibrium mark
    ctx.strokeStyle = th.muted; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(g.wallX, floorY); ctx.lineTo(L.stage.x + L.stage.w, floorY); ctx.stroke();
    ctx.fillStyle = th.muted; ctx.fillRect(g.wallX - f * 0.5, g.cy - g.r * 2, f * 0.5, g.r * 3);
    ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(g.cx, g.cy - g.r * 2.4); ctx.lineTo(g.cx, floorY + f * 0.4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('O', g.cx, floorY + f * 0.4);

    drawSpring(ctx, g.wallX, g.cy, mx - g.r, g.cy, 12, g.r * 0.9, th.spring);
    drawMass(ctx, mx, g.cy, g.r, th.mass);
    ctx.fillStyle = th.bg; ctx.textBaseline = 'middle'; ctx.fillText('m', mx, g.cy);

    // v and a arrows, scaled so their maxima equal the amplitude on screen
    if (w > 0) {
      ctx.font = `${f}px ${FONT}`;
      const vy = g.cy - g.r - f * 0.6, ay = vy - f * 1.6;
      // plain letters: combining arrow U+20D7 is missing from common fonts
      drawArrow(ctx, mx, vy, mx + this.osc.v / w * g.scale, vy, th.v, 'v');
      drawArrow(ctx, mx, ay, mx + this.osc.accel() / (w * w) * g.scale, ay, th.a, 'a');
    }

    if (layerCount >= 1) this.drawTape(ctx, th, g, f);
    if (layerCount >= 2) this.drawEquation(ctx, L, th, g, reveal);
  }

  // Paper tape under the mass (Hình 6.1): the pen sits at the mass's x and the tape runs downward.
  drawTape(ctx, th, g, f) {
    const t = g.tape;
    ctx.strokeStyle = th.grid; ctx.lineWidth = 2; ctx.strokeRect(t.x, t.y, t.w, t.h);
    ctx.beginPath(); ctx.moveTo(g.cx, t.y); ctx.lineTo(g.cx, t.y + t.h); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
    ctx.transform(...tapeTransform(t));
    this.chart.draw(ctx, { x: 0, y: 0, w: t.h, h: t.w }, th.accent, [-g.xr, g.xr]);
    ctx.restore();
    drawMass(ctx, g.cx + this.osc.x * g.scale, t.y, f * 0.25, th.accent);
    ctx.fillStyle = th.muted; ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('x(t)', t.x + t.w + f * 0.4, t.y);
  }

  // One line centred on O (clamped to the stage), so it never runs off the canvas.
  drawEquation(ctx, L, th, g, reveal) {
    const f = L.fontPx, show = (k, txt) => (reveal?.isShown(k) ? txt : '?');
    const ph = this.phi < 0 ? `− ${phase(-this.phi)}` : `+ ${phase(this.phi)}`;
    const line = `x = ${show('A', num(this.A * 100, 1))}·cos(${show('omega', num(this.osc.omega0()))}t ${reveal?.isShown('phi') ? ph.replace(' rad', '') : '+ ?'}) (cm)`;
    ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = th.accent;
    const s = L.stage, w = Math.min(s.w, ctx.measureText(line).width);
    const x = Math.min(s.x + s.w - w, Math.max(s.x, g.cx - w / 2));
    ctx.fillText(line, x, g.eqY, s.w);              // maxWidth: last-resort squeeze for extreme values
  }
}

export default {
  id: 'springH',
  title: 'Con lắc lò xo nằm ngang',
  lesson: 'Bài 1, 2',
  params: [
    { key: 'k', label: 'k', unit: 'N/m', min: 10, max: 1000, step: 10, value: 100 },
    { key: 'm', label: 'm', unit: 'kg', min: 0.05, max: 2, step: 0.05, value: 1 },
  ],
  layers: ['Băng x(t)', 'Phương trình'],
  results({ k, m, A = 0, phi = 0 }) {
    const w = omegaSpring(k, m);
    return [
      { key: 'omega', label: 'ω', formula: 'ω = √(k/m)', value: w, unit: 'rad/s' },
      { key: 'T', label: 'T', formula: 'T = 2π√(m/k)', value: period(w), unit: 's' },
      { key: 'f', label: 'f', formula: 'f = 1/T', value: frequency(w), unit: 'Hz' },
      { key: 'A', label: 'A', formula: 'A = √(x₀² + (v₀/ω)²)', value: A, unit: 'm', text: withUnit(A * 100, 'cm', 1) },
      { key: 'phi', label: 'φ', formula: 'cos φ = x₀/A', value: phi, unit: 'rad', text: phase(phi) },
    ];
  },
  create: (p) => new SpringSim(p),
};
