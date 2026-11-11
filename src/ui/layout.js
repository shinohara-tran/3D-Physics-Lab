// Screen regions in CSS px for layout "C — sân khấu": param/result chips on top, camera tile top-right,
// big stage in the middle, side panel on the right, bottom band for strips/graphs.
export function layoutFor(widthCss, heightCss, dpr) {
  const W = widthCss, H = heightCss;
  const fontPx = Math.ceil(H / 25);                 // number text >= 1/25 of the screen height
  const pad = Math.round(fontPx * 0.4);
  const camW = Math.round(W * 0.18), camH = Math.round(camW * 9 / 16);
  const cam = { x: W - pad - camW, y: pad, w: camW, h: camH };
  const chips = { x: pad, y: pad, w: W - 3 * pad - camW, h: Math.round(fontPx * 3.6) };
  const top = Math.max(chips.y + chips.h, cam.y + cam.h) + pad;
  const bh = Math.round(H * 0.28);
  const bottom = { x: pad, y: H - pad - bh, w: W - 2 * pad, h: bh };
  const sw = Math.round(W * 0.3);
  const side = { x: W - pad - sw, y: top, w: sw, h: bottom.y - pad - top };
  const stage = { x: pad, y: top, w: side.x - 2 * pad, h: side.h };
  return { W, H, dpr, fontPx, stage, side, bottom, chips, cam };
}
