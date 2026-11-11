const tidy = (v) => Math.round(v * 1e10) / 1e10;

export class ParamSet {
  constructor(specs) {
    this.specs = new Map(specs.map((s) => [s.key, s]));
    this.vals = new Map(specs.map((s) => [s.key, s.value]));
    this.selected = specs.length ? specs[0].key : null;
    for (const s of specs) this.set(s.key, s.value);
  }
  get(key) { return this.vals.get(key); }
  values() { return Object.fromEntries(this.vals); }
  set(key, v) {
    const { min, max, step, values } = this.specs.get(key);
    if (values) { this.vals.set(key, values.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b))); return; }   // discrete list (e.g. φ)
    const c = Math.min(max, Math.max(min, v));
    // snap relative to min; re-clamp since rounding can pass max when (max-min) isn't a step multiple
    const s = tidy(min + Math.round((c - min) / step) * step);
    this.vals.set(key, Math.min(max, s));
  }
  /** One notch up (dir > 0) or down: next list entry for discrete params, else ± step. */
  stepBy(key, dir) {
    const { step, values } = this.specs.get(key), v = this.get(key);
    if (!values) return this.set(key, v + Math.sign(dir) * step);
    const i = values.indexOf(v) + Math.sign(dir);
    this.vals.set(key, values[Math.min(values.length - 1, Math.max(0, i))]);
  }
  nudge(key, delta01) {
    const { min, max } = this.specs.get(key);
    this.set(key, this.get(key) + delta01 * (max - min));
  }
  select(key) { this.selected = key; }
}
