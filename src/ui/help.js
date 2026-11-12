// In-app help ('?' or F1; Esc closes): the same keys and gestures as the README table.
import { FONT } from '../draw/theme.js';

export const HELP = [
  ['Space · ✋ giữ bàn tay mở', 'Dừng / Chạy'],
  ['→ · PageDown · ✌', 'Lớp tiếp (PageDown ở lớp cuối: cảnh sau)'],
  ['← · PageUp', 'Lớp trước (PageUp ở lớp đầu: cảnh trước)'],
  ['Enter · búng tay', 'Hiện đáp án tiếp theo'],
  ['r · h', 'Hiện tất cả / Ẩn tất cả đáp án'],
  ['n · p · 1–7', 'Cảnh sau / Cảnh trước / Chọn cảnh'],
  ['g · t · c · s', 'Bật/tắt cử chỉ · Nền sáng/tối · Ẩn/hiện camera · Chậm ×0,25'],
  ['F11', 'Toàn màn hình'],
  ['🤏 chụm ngón · kéo chuột', 'Kéo vật; trên ô tham số: kéo lên/xuống để chỉnh'],
  ['☝ trỏ giữ trên ô · lăn chuột', 'Chọn / chỉnh tham số'],
  ['Bấm vào ô "?"', 'Hiện / ẩn một đáp án'],
  ['? · F1 · Esc', 'Đóng trợ giúp'],
];

/** Full-screen panel over the stage; text at fontPx (≥ H/25). */
export function drawHelp(ctx, L, th) {
  const f = L.fontPx, lh = f * 1.35, pad = f;
  const h = Math.min(L.H - 2 * L.chips.y, lh * (HELP.length + 1) + 2 * pad), w = L.W - 2 * L.chips.y;
  const x = L.chips.y, y = (L.H - h) / 2;
  ctx.fillStyle = th.bg; ctx.globalAlpha = 0.96; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  ctx.strokeStyle = th.accent; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
  ctx.font = `${f}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = th.accent; ctx.fillText('Phím và cử chỉ', x + pad, y + pad, w - 2 * pad);
  const col = w * 0.38;
  HELP.forEach(([k, what], i) => {
    const ry = y + pad + lh * (i + 1);
    ctx.fillStyle = th.fg; ctx.fillText(k, x + pad, ry, col - pad);
    ctx.fillStyle = th.muted; ctx.fillText(what, x + col, ry, w - col - pad);
  });
}
