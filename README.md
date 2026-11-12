Mô phỏng dao động điều hòa (Vật lí 11) cho giáo viên, chạy trên trình duyệt, không cần cài đặt.
Chạy: `npm start`
Kiểm thử: `npm test`

Ghi công: một số tệp được sao chép từ WonderSnap (MIT, © 2026 Akbar Sheikh); thư viện MediaPipe trong `vendor/mediapipe/` và mô hình `models/hand_landmarker.task` của Google, giấy phép Apache-2.0; xem LICENSE.

## Phím và cử chỉ
Bấm `?` (hoặc `F1`) để mở bảng trợ giúp ngay trong ứng dụng; bấm lại hoặc `Esc` để đóng.

| Phím / chuột / cử chỉ | Tác dụng |
|---|---|
| `Space` · ✋ giữ bàn tay mở 0,5 s | Dừng / Chạy |
| `→` · `PageDown` · ✌ | Lớp tiếp (`PageDown` ở lớp cuối: sang cảnh sau) |
| `←` · `PageUp` | Lớp trước (`PageUp` ở lớp đầu: về cảnh trước) |
| `Enter` · búng tay | Hiện đáp án tiếp theo (kèm công thức) |
| `r` / `h` | Hiện tất cả / Ẩn tất cả đáp án |
| `n` / `p` | Cảnh sau / Cảnh trước |
| `1`–`7` | Chọn cảnh |
| `g` | Bật / tắt cử chỉ |
| `t` | Nền sáng (máy chiếu) / tối (TV) |
| `c` | Ẩn / hiện khung camera |
| `s` | Chạy chậm ×0,25 |
| `F11` | Toàn màn hình |
| Kéo chuột · 🤏 chụm ngón trên vật | Kéo vật rồi thả |
| Kéo chuột lên/xuống · 🤏 chụm trên ô tham số | Chỉnh tham số |
| Lăn chuột trên ô tham số | Tăng / giảm một nấc |
| ☝ trỏ giữ trên ô tham số | Chọn tham số (chụm ở đâu cũng chỉnh được) |
| Bấm vào ô "?" | Hiện / ẩn một đáp án |
| `?` · `F1` · `Esc` | Mở / đóng trợ giúp |

## Đưa lên GitHub Pages
1. Tạo repo **công khai** (public) trên GitHub, đẩy nhánh `main` lên.
2. Settings → Pages → Deploy from branch → `main` / `(root)` → Save.
3. Địa chỉ: `https://<user>.github.io/<repo>/`.

Lưu ý:
- Repo công khai: ai có đường link cũng dùng được.
- Lần mở đầu tiên cần có internet; các lần sau chạy offline (service worker lưu bộ nhớ đệm).
- Camera chỉ hoạt động qua https (GitHub Pages) hoặc `localhost`.
- Sau khi cập nhật: bản mới hiện ra ở lần tải trang thứ hai khi có mạng (lần đầu vẫn chạy bản đã lưu, đồng thời tải bản mới về).
