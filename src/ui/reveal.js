// `last`: the most recently revealed result key (its formula is shown), or null.
export class RevealBoard {
  constructor(keys) { this.reset(keys); }
  isShown(key) { return this.shown.has(key); }
  toggle(key) {
    if (this.shown.delete(key)) { if (this.last === key) this.last = null; }
    else { this.shown.add(key); this.last = key; }
  }
  revealNext() {
    const k = this.keys.find((x) => !this.shown.has(x));
    if (k !== undefined) { this.shown.add(k); this.last = k; }
  }
  revealAll() {
    this.last = this.keys.find((x) => !this.shown.has(x)) ?? this.last;   // first newly revealed one
    this.keys.forEach((k) => this.shown.add(k));
  }
  hideAll() { this.shown.clear(); this.last = null; }
  reset(keys) { this.keys = [...keys]; this.shown = new Set(); this.last = null; }
}
