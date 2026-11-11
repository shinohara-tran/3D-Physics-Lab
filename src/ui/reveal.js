export class RevealBoard {
  constructor(keys) { this.reset(keys); }
  isShown(key) { return this.shown.has(key); }
  toggle(key) { this.shown.has(key) ? this.shown.delete(key) : this.shown.add(key); }
  revealNext() {
    const k = this.keys.find((x) => !this.shown.has(x));
    if (k !== undefined) this.shown.add(k);
  }
  revealAll() { this.keys.forEach((k) => this.shown.add(k)); }
  hideAll() { this.shown.clear(); }
  reset(keys) { this.keys = [...keys]; this.shown = new Set(); }
}
