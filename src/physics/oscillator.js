// RK4 oscillators in SI units. State is [q, qdot]; subclasses supply accel(q, qdot, t).
export const MAX_DT = 0.1;

class Oscillator {
  constructor() { this.t = 0; }

  setParams(p) { Object.assign(this, p); }

  step(dt) {
    dt = Math.min(Math.max(dt, 0), MAX_DT);
    const n = Math.ceil(dt / Math.min(1 / 240, 0.05 / this.omega0()));
    if (!n) return;
    const h = dt / n;
    for (let i = 0; i < n; i++) this.rk4(h);
  }

  rk4(h) {
    const [q, p, t] = [this.pos(), this.vel(), this.t];
    const a = (qq, pp, tt) => this.force(qq, pp, tt);
    const k1q = p, k1p = a(q, p, t);
    const k2q = p + h / 2 * k1p, k2p = a(q + h / 2 * k1q, k2q, t + h / 2);
    const k3q = p + h / 2 * k2p, k3p = a(q + h / 2 * k2q, k3q, t + h / 2);
    const k4q = p + h * k3p, k4p = a(q + h * k3q, k4q, t + h);
    this.setState(q + h / 6 * (k1q + 2 * k2q + 2 * k3q + k4q), p + h / 6 * (k1p + 2 * k2p + 2 * k3p + k4p));
    this.t = t + h;
  }
}

export class SpringOscillator extends Oscillator {
  constructor({ k, m, b = 0, F0 = 0, f = 0 }) {
    super(); Object.assign(this, { k, m, b, F0, f, x: 0, v: 0 });
  }
  set(x, v) { this.x = x; this.v = v; }
  omega0() { return Math.sqrt(this.k / this.m); }
  pos() { return this.x; }
  vel() { return this.v; }
  setState(x, v) { this.x = x; this.v = v; }
  force(x, v, t) { return (-this.k * x - this.b * v + this.F0 * Math.cos(2 * Math.PI * this.f * t)) / this.m; }
  accel() { return this.force(this.x, this.v, this.t); }
}

export class PendulumOscillator extends Oscillator {
  constructor({ l, g, b = 0 }) {
    super(); Object.assign(this, { l, g, b, alpha: 0, omegaDot: 0 });
  }
  set(alpha, omegaDot) { this.alpha = alpha; this.omegaDot = omegaDot; }
  omega0() { return Math.sqrt(this.g / this.l); }
  pos() { return this.alpha; }
  vel() { return this.omegaDot; }
  setState(a, w) { this.alpha = a; this.omegaDot = w; }
  force(a, w) { return -(this.g / this.l) * Math.sin(a) - this.b * w; }
  accel() { return this.force(this.alpha, this.omegaDot, this.t); }
}
