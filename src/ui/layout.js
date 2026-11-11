// Screen regions in CSS px for layout "C — sân khấu": param/result chips on top, camera tile top-right,
// big stage in the middle, side panel on the right, bottom band for strips/graphs.
// chipRows: rows the chips need (chipRows() in draw/primitives.js); the stage starts below them.
export function layoutFor(widthCss, heightCss, dpr, chipRows = 2) {
  const W = widthCss, H = heightCss;
  const fontPx = Math.ceil(H / 25);                 // number text >= 1/25 of the screen height
  const pad = Math.round(fontPx * 0.4);
  const camW = Math.round(W * 0.18), camH = Math.round(camW * 9 / 16);
  const cam = { x: W - pad - camW, y: pad, w: camW, h: camH };
  const rows = Math.max(1, chipRows), chipH = Math.round(fontPx * 1.6), gap = Math.round(fontPx * 0.3);
  const chips = { x: pad, y: pad, w: W - 3 * pad - camW, h: Math.max(Math.round(fontPx * 3.6), rows * chipH + (rows - 1) * gap) };
  const top = Math.max(chips.y + chips.h, cam.y + cam.h) + pad;
  const bh = Math.round(H * 0.28);
  const bottom = { x: pad, y: H - pad - bh, w: W - 2 * pad, h: bh };
  const sw = Math.round(W * 0.3);
  const side = { x: W - pad - sw, y: top, w: sw, h: bottom.y - pad - top };
  // scenes draw their tapes/graphs down to the canvas bottom inside the stage column, so the stage runs to H − pad
  const stage = { x: pad, y: top, w: side.x - 2 * pad, h: H - pad - top };
  // under the side panel: the "Công thức" line of the last revealed result (no scene draws there)
  const fy = side.y + side.h + pad;
  const formula = { x: side.x, y: fy, w: sw, h: H - pad - fy };
  return { W, H, dpr, fontPx, stage, side, bottom, chips, cam, formula };
}
