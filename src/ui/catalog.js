// SGK Vật lí KNTT 10/11/12 table of contents (from the books' "Mục lục"), grouped by grade → semester → chapter.
// `scenes` lists the simulation ids (src/scenes) available for a lesson; empty = "Sắp có".
// shortcut: the HK1/HK2 split follows the usual school schedule, not the book; edit `sem` here if a school differs.

const ch = (sem, no, title, lessons) => ({ sem, no, title, lessons: lessons.map(([n, t, scenes = []]) => ({ n, t, scenes })) });

export const CATALOG = {
  10: [
    ch(1, 'I', 'Mở đầu', [[1, 'Làm quen với Vật lí'], [2, 'Các quy tắc an toàn trong phòng thực hành Vật lí'], [3, 'Thực hành tính sai số trong phép đo']]),
    ch(1, 'II', 'Động học', [[4, 'Độ dịch chuyển và quãng đường đi được'], [5, 'Tốc độ và vận tốc'], [7, 'Đồ thị độ dịch chuyển – thời gian'],
      [8, 'Chuyển động biến đổi. Gia tốc'], [9, 'Chuyển động thẳng biến đổi đều'], [10, 'Sự rơi tự do'], [12, 'Chuyển động ném']]),
    ch(1, 'III', 'Động lực học', [[13, 'Tổng hợp và phân tích lực. Cân bằng lực'], [14, 'Định luật 1 Newton'], [15, 'Định luật 2 Newton'],
      [16, 'Định luật 3 Newton'], [17, 'Trọng lực và lực căng'], [18, 'Lực ma sát'], [19, 'Lực cản và lực nâng'], [21, 'Moment lực. Cân bằng của vật rắn']]),
    ch(2, 'IV', 'Năng lượng, công, công suất', [[23, 'Năng lượng. Công cơ học'], [24, 'Công suất'], [25, 'Động năng, thế năng'],
      [26, 'Cơ năng và định luật bảo toàn cơ năng'], [27, 'Hiệu suất']]),
    ch(2, 'V', 'Động lượng', [[28, 'Động lượng'], [29, 'Định luật bảo toàn động lượng']]),
    ch(2, 'VI', 'Chuyển động tròn', [[31, 'Động học của chuyển động tròn đều'], [32, 'Lực hướng tâm và gia tốc hướng tâm']]),
    ch(2, 'VII', 'Biến dạng của vật rắn. Áp suất chất lỏng', [[33, 'Biến dạng của vật rắn'], [34, 'Khối lượng riêng. Áp suất chất lỏng']]),
  ],
  11: [
    ch(1, '1', 'Dao động', [[1, 'Dao động điều hoà', ['springH', 'springV', 'pendulum']], [2, 'Mô tả dao động điều hoà', ['phase2']],
      [3, 'Vận tốc, gia tốc trong dao động điều hoà', ['velAcc']], [5, 'Động năng. Thế năng. Sự chuyển hoá năng lượng', ['energy']],
      [6, 'Dao động tắt dần. Dao động cưỡng bức. Hiện tượng cộng hưởng', ['damped']]]),
    ch(1, '2', 'Sóng', [[8, 'Mô tả sóng'], [9, 'Sóng ngang. Sóng dọc. Sự truyền năng lượng của sóng cơ'], [11, 'Sóng điện từ'],
      [12, 'Giao thoa sóng'], [13, 'Sóng dừng']]),
    ch(2, '3', 'Điện trường', [[16, 'Lực tương tác giữa hai điện tích'], [17, 'Khái niệm điện trường'], [18, 'Điện trường đều'],
      [19, 'Thế năng điện'], [20, 'Điện thế'], [21, 'Tụ điện']]),
    ch(2, '4', 'Dòng điện. Mạch điện', [[22, 'Cường độ dòng điện'], [23, 'Điện trở. Định luật Ohm'], [24, 'Nguồn điện'], [25, 'Năng lượng điện và công suất điện']]),
  ],
  12: [
    ch(1, 'I', 'Vật lí nhiệt', [[1, 'Cấu trúc của chất. Sự chuyển thể'], [2, 'Nội năng. Định luật I của nhiệt động lực học'],
      [3, 'Nhiệt độ. Thang nhiệt độ – nhiệt kế'], [4, 'Nhiệt dung riêng'], [5, 'Nhiệt nóng chảy riêng'], [6, 'Nhiệt hoá hơi riêng']]),
    ch(1, 'II', 'Khí lí tưởng', [[8, 'Mô hình động học phân tử chất khí'], [9, 'Định luật Boyle'], [10, 'Định luật Charles'],
      [11, 'Phương trình trạng thái của khí lí tưởng'], [12, 'Áp suất khí theo mô hình động học phân tử']]),
    ch(2, 'III', 'Từ trường', [[14, 'Từ trường'], [15, 'Lực từ tác dụng lên dây dẫn mang dòng điện. Cảm ứng từ'], [16, 'Từ thông. Hiện tượng cảm ứng điện từ'],
      [17, 'Máy phát điện xoay chiều'], [18, 'Ứng dụng hiện tượng cảm ứng điện từ'], [19, 'Điện từ trường. Mô hình sóng điện từ']]),
    ch(2, 'IV', 'Vật lí hạt nhân', [[21, 'Cấu trúc hạt nhân'], [22, 'Phản ứng hạt nhân và năng lượng liên kết'], [23, 'Hiện tượng phóng xạ'], [24, 'Công nghiệp hạt nhân']]),
  ],
};

/** Where a scene lives in the curriculum: { grade, sem, chapter, lesson } (first match). */
export function locate(sceneId) {
  for (const [grade, chapters] of Object.entries(CATALOG))
    for (const c of chapters) for (const l of c.lessons) if (l.scenes.includes(sceneId)) return { grade: +grade, sem: c.sem, chapter: c, lesson: l };
  return null;
}
