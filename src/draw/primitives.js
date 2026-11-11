// Canvas 2D drawing helpers. All coordinates in CSS px; callers set the font unless noted.
import { withUnit } from '../format.js';
import { FONT } from './theme.js';

export function drawSpring(ctx, x1, y1, x2, y2, coils, width, color) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux, lead = Math.min(len * 0.1, width);
  const n = coils * 2;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
  for (let i = 1; i <= n; i++) {
    const s = lead + (len - 2 * lead) * (i - 0.5) / n, side = (i % 2 ? 1 : -1) * width / 2;
    ctx.lineTo(x1 + ux * s + nx * side, y1 + uy * s + ny * side);
  }
  ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, width / 8); ctx.lineJoin = 'round'; ctx.stroke();
}

export function drawMass(ctx, x, y, r, color) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color; ctx.fill();
}

export function drawArrow(ctx, x1, y1, x2, y2, color, label) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return;
  const head = Math.min(len * 0.5, 18), ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
  ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
  ctx.closePath(); ctx.fill();
  if (label) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(label, x2, y2 - 6); }
}

/** Left axis + zero line; ticks: [{at (0 top .. 1 bottom), text}]. */
export function drawAxis(ctx, box, { label = '', ticks = [] } = {}) {
  const { x, y, w, h } = box, my = y + h / 2;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x, my); ctx.lineTo(x + w, my); ctx.stroke();
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const t of ticks) ctx.fillText(t.text, x - 6, y + t.at * h);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (label) ctx.fillText(label, x + 6, y);
}

/** Rolling time series: newest sample at the right edge, scrolls left; keeps capacitySeconds of history. */
export class StripChart {
  constructor(capacitySeconds) { this.cap = capacitySeconds; this.pts = []; }
  push(t, value) {
    this.pts.push([t, value]);
    while (this.pts[0][0] < t - this.cap) this.pts.shift();
  }
  draw(ctx, box, color, [lo, hi]) {
    if (!this.pts.length) return;
    const tN = this.pts.at(-1)[0];
    ctx.beginPath();
    this.pts.forEach(([t, v], i) => {
      const px = box.x + box.w * (1 - (tN - t) / this.cap), py = box.y + box.h * (hi - v) / (hi - lo);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
  }
}

/** Vertical bars, height value/max of the box (minus a label row). */
export function drawBars(ctx, box, items, max) {
  const lh = box.h * 0.2, bw = box.w / (items.length * 1.5 + 0.5);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  items.forEach((it, i) => {
    const x = box.x + bw * (0.5 + i * 1.5), hh = (box.h - lh) * Math.min(1, Math.max(0, it.value / max));
    ctx.fillStyle = it.color; ctx.fillRect(x, box.y + box.h - lh - hh, bw, hh);
    ctx.fillText(it.label, x + bw / 2, box.y + box.h - lh + 4);
  });
}

function roundRect(ctx, { x, y, w, h }, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function chipItems(params, reveal, results) {
  const items = [];
  for (const s of params.specs.values()) {
    const v = params.get(s.key);
    items.push({ key: s.key, kind: 'param', on: params.selected === s.key,
      text: `${s.label} = ${s.format ? s.format(v) : withUnit(s.toDisplay ? s.toDisplay(v) : v, s.unit)}` });
  }
  for (const r of results) {
    const shown = !reveal || reveal.isShown(r.key);
    items.push({ key: r.key, kind: 'result', shown, text: `${r.label} = ${shown ? r.text ?? withUnit(r.value, r.unit) : '?'}` });
  }
  return items;
}

const chipH = (fontPx) => Math.round(fontPx * 1.6), chipGap = (fontPx) => Math.round(fontPx * 0.3);

/** Flows chips left to right in `box.w`, wrapping; sets the font. Returns one rect per item. */
function flowChips(ctx, box, items, fontPx) {
  ctx.font = `${fontPx}px ${FONT}`;
  const padX = fontPx * 0.5, h = chipH(fontPx), gap = chipGap(fontPx);
  let x = box.x, y = box.y;
  return items.map((it) => {
    const w = Math.min(box.w, ctx.measureText(it.text).width + 2 * padX);
    if (x > box.x && x + w > box.x + box.w) { x = box.x; y += h + gap; }
    const rect = { x, y, w, h };
    x += w + gap;
    return rect;
  });
}

/** Rows the chips need with every result revealed (so revealing never moves the layout). Feed it to layoutFor. */
export function chipRows(ctx, box, params, results, fontPx) {
  const rects = flowChips(ctx, box, chipItems(params, null, results), fontPx);
  return new Set(rects.map((r) => r.y)).size;
}

/** Param chips (always shown: the "đề bài"), then result chips ("T = ?" until revealed). Flows left to right, wraps.
 *  Sets its own font. A result may carry a preformatted `text` (e.g. φ as "π"). */
export function drawChips(ctx, box, params, reveal, results, theme, fontPx) {
  const items = chipItems(params, reveal, results), rects = flowChips(ctx, box, items, fontPx);
  const padX = fontPx * 0.5;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  return items.map((it, i) => {
    const rect = rects[i], { w, h } = rect;
    roundRect(ctx, rect, h * 0.25);
    ctx.fillStyle = it.kind === 'result' && !it.shown ? theme.grid : theme.bg;
    ctx.fill();
    ctx.lineWidth = it.on ? 5 : 2;
    ctx.strokeStyle = it.on ? theme.accent : it.kind === 'param' ? theme.fg : theme.muted;
    ctx.stroke();
    ctx.fillStyle = it.kind === 'result' && it.shown ? theme.accent : theme.fg;
    ctx.fillText(it.text, rect.x + padX, rect.y + h / 2, w - 2 * padX);
    return { key: it.key, kind: it.kind, rect };
  });
}

/** "T = 2π√(m/k) = 0,63 s": the SGK formula, then the value (after "; φ = …" when the formula is not "label = …"). */
export function formulaText(r) {
  const value = r.text ?? withUnit(r.value, r.unit);
  return r.formula.startsWith(`${r.label} =`) ? `${r.formula} = ${value}` : `${r.formula}; ${r.label} = ${value}`;
}

/** "Công thức" header and the revealed result's formula, word-wrapped to the box. Sets its own font. */
export function drawFormula(ctx, box, result, theme, fontPx) {
  ctx.font = `${fontPx}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lh = fontPx * 1.3, lines = [];
  for (const word of formulaText(result).split(/ +/)) {
    const tryLine = lines.length ? `${lines.at(-1)} ${word}` : word;
    if (lines.length && ctx.measureText(tryLine).width <= box.w) lines[lines.length - 1] = tryLine;
    else lines.push(word);
  }
  ctx.fillStyle = theme.muted; ctx.fillText('Công thức', box.x, box.y, box.w);
  ctx.fillStyle = theme.accent;
  lines.forEach((l, i) => ctx.fillText(l, box.x, box.y + lh * (i + 1), box.w));
}
