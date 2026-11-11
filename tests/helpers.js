// Records every drawn point/box (text width = 0.6·font per char) and text, so layout can be checked against the canvas.
export function recorder(fontPx = 20, texts = []) {
  const pts = [], o = {};
  const add = (x, y) => pts.push([x, y]);
  const box = (x, y, w, h) => { add(x, y); add(x + w, y + h); };
  const fns = {
    moveTo: add, lineTo: add, strokeRect: box, fillRect: box, rect: box,
    arc: (x, y, r) => { add(x - r, y - r); add(x + r, y + r); },
    measureText: (s) => ({ width: s.length * 0.6 * fontPx }),
    fillText: (s, x, y) => {
      texts.push(s);
      const w = s.length * 0.6 * fontPx, left = o.textAlign === 'center' ? x - w / 2 : o.textAlign === 'right' ? x - w : x;
      add(left, y - fontPx); add(left + w, y + fontPx);
    },
  };
  return Object.assign(new Proxy(o, {
    get: (t, k) => (k in t ? t[k] : fns[k] ?? (() => {})),
    set: (t, k, v) => { t[k] = v; return true; },
  }), { pts, texts });
}
