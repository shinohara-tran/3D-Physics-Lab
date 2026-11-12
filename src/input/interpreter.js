// Turns per-frame hand landmarks into actions (see plan Task 4 rules). Pure: no DOM, time comes from the caller.
import { classify, pinched, PoseDebouncer, SnapDetector, OPEN, PEACE, POINT } from './gestures.js';

const PINCH_FRAMES = 3, LOST_S = 0.35, HOVER_S = 0.3;
const OPEN_AFTER_PINCH_S = 1;   // opening the hand to end a pinch must not also toggle pause

export class GestureInterpreter {
  constructor({ holdOpenS = 0.5 } = {}) {
    this.holdOpenS = holdOpenS;
    this.cursor = null; this.lastLabel = ''; this.lastLabelT = -1e9;
    this.deb = new PoseDebouncer(); this.snap = new SnapDetector();
    this.pinchN = 0; this.mode = null;            // mode: null | 'drag' | 'adjust'
    this.key = null; this.y0 = 0;                 // adjust target and pinch-start y
    this.selected = null; this.hoverKey = null; this.hoverT = 0;
    this.openSince = null; this.openFired = false; this.lostSince = null; this.lastPinchT = -1e9;
  }

  update(lm, t, hit = {}) {
    const out = [];
    const say = (label) => { this.lastLabel = label; this.lastLabelT = t; };
    const snapped = this.snap.update(lm, t);

    if (!lm) {
      this.lostSince ??= t;
      this.openSince = null;
      if (t - this.lostSince > LOST_S) {
        if (this.mode === 'drag') out.push({ type: 'release', ...this.cursor });   // at the last pinched position
        this.mode = null; this.selected = null; this.hoverKey = null; this.openFired = false;
        this.cursor = null;                        // no ghost cursor once the hand is gone
      }
      return out;
    }
    this.lostSince = null;
    // midpoint of thumb tip and index tip: stays put while the fingers close, so the aim doesn't jump at pinch time
    this.cursor = { x: (lm[4][0] + lm[8][0]) / 2, y: (lm[4][1] + lm[8][1]) / 2 };
    const { x, y } = this.cursor;
    const p = pinched(lm);
    this.pinchN = p ? this.pinchN + 1 : 0;
    if (p) this.lastPinchT = t;
    const [stable, changed] = this.deb.update(classify(lm));

    if (this.mode && !p) {
      if (this.mode === 'drag') out.push({ type: 'release', x, y });
      this.mode = null; this.selected = null;
    } else if (this.mode === 'drag') {
      out.push({ type: 'drag', x, y }); return out;
    } else if (this.mode === 'adjust') {
      out.push({ type: 'adjust', key: this.key, delta: -(y - this.y0) }); return out;
    } else if (p && this.pinchN >= PINCH_FRAMES) {
      const key = hit.massAt?.(x, y) ? null : (hit.paramAt?.(x, y) ?? this.selected);
      if (!key && hit.massAt?.(x, y)) {
        this.mode = 'drag'; out.push({ type: 'grab', x, y }); say('🤏 Kéo vật');
      } else if (key) {
        this.mode = 'adjust'; this.key = key; this.y0 = y; say(`🤏 Chỉnh ${hit.labelOf?.(key) ?? key}`);
        out.push({ type: 'adjust', key, delta: 0 });
      }
      return out;
    }

    // ☝ hovering a chip ≥ 0.3 s selects it, so a later pinch anywhere adjusts it
    if (!p && this.selected && hit.paramAt?.(x, y) !== this.selected) this.selected = null;  // finger left the chip
    const hover = !p && stable === POINT ? hit.paramAt?.(x, y) ?? null : null;
    if (hover !== this.hoverKey) { this.hoverKey = hover; this.hoverT = t; }
    else if (hover && t - this.hoverT >= HOVER_S && this.selected !== hover) {
      this.selected = hover; out.push({ type: 'selectParam', key: hover });
    }

    if (stable === OPEN && t - this.lastPinchT >= OPEN_AFTER_PINCH_S) {
      this.openSince ??= t;
      if (!this.openFired && t - this.openSince >= this.holdOpenS) {
        this.openFired = true; out.push({ type: 'togglePause' }); say('✋ Dừng / Chạy');
      }
    } else { this.openSince = null; this.openFired = false; }

    if (changed && stable === PEACE) { out.push({ type: 'nextLayer' }); say('✌ Lớp tiếp'); }
    if (snapped) { out.push({ type: 'revealNext' }); say('Búng tay: Hiện đáp án'); }
    return out;
  }
}
