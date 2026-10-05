/**
 * Layout ของ rail ตัวเลขข้อบนหน้า /review/[attemptId] (Figma 200:660-692)
 *
 * ดีไซน์เติมคอลัมน์จากบนลงล่าง: คอลัมน์ซ้ายได้ข้อ 1, 3, 5… และคอลัมน์ขวาได้ข้อ 2, 4, 6…
 * ช่องสุดท้ายเป็นลูกศร (ปุ่มไปข้อถัดไป) ต่อท้ายรายการเสมอ
 */

export interface ReviewRailCell {
  /** ดัชนีข้อในรายการที่เรียงแล้ว หรือ null เมื่อเป็นช่องลูกศร */
  itemIndex: number | null;
  /** คอลัมน์ (0 = ซ้าย, 1 = ขวา) */
  column: number;
}

export function buildReviewRailCells(questionCount: number, columns = 2): ReviewRailCell[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  const cells: ReviewRailCell[] = [];
  for (let index = 0; index < questionCount; index += 1) {
    cells.push({ itemIndex: index, column: index % safeColumns });
  }
  // ช่องลูกศร: ต่อท้ายข้อสุดท้ายเสมอ → อยู่คอลัมน์ถัดไปตามการเติมแบบ column-major
  cells.push({ itemIndex: null, column: questionCount % safeColumns });
  return cells;
}

/**
 * เรียงข้อตามลำดับข้อสอบจริง (orderIndex) — API คืน userAnswers ตามลำดับที่ฐานข้อมูล
 * ส่งมา ซึ่งไม่การันตีว่าตรงกับลำดับข้อ ทำให้เลขข้อบน rail ไม่ตรงกับลำดับจริง
 * ข้อที่หา question ไม่พบจะถูกย้ายไปท้ายสุด (ไม่ทิ้งข้อมูล)
 */
export function sortReviewItemsByOrder<
  T extends { question: { orderIndex: number } | null },
>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const orderA = a.item.question?.orderIndex;
      const orderB = b.item.question?.orderIndex;
      if (orderA == null && orderB == null) return a.index - b.index;
      if (orderA == null) return 1;
      if (orderB == null) return -1;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map((entry) => entry.item);
}
