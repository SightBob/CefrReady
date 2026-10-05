import { describe, it, expect } from 'vitest';
import { buildReviewRailCells, sortReviewItemsByOrder } from './review-rail';

describe('buildReviewRailCells', () => {
  it('fills columns top-down (1,3,5… | 2,4,6…) like the Figma rail', () => {
    const cells = buildReviewRailCells(4);
    expect(cells.map((cell) => cell.column)).toEqual([0, 1, 0, 1, 0]);
    expect(cells.slice(0, 4).map((cell) => cell.itemIndex)).toEqual([0, 1, 2, 3]);
  });

  it('always appends the arrow cell in the column after the last question', () => {
    // 13 ข้อ → ลูกศรอยู่คอลัมน์ขวา (Figma 200:692 อยู่คอลัมน์ 2)
    const odd = buildReviewRailCells(13);
    expect(odd[odd.length - 1]).toEqual({ itemIndex: null, column: 1 });

    const even = buildReviewRailCells(12);
    expect(even[even.length - 1]).toEqual({ itemIndex: null, column: 0 });
  });

  it('keeps every question exactly once and returns one arrow cell for 0 questions', () => {
    const cells = buildReviewRailCells(5);
    const items = cells.flatMap((cell) => (cell.itemIndex === null ? [] : [cell.itemIndex]));
    expect(items).toEqual([0, 1, 2, 3, 4]);
    expect(cells.filter((cell) => cell.itemIndex === null)).toHaveLength(1);
    expect(buildReviewRailCells(0)).toEqual([{ itemIndex: null, column: 0 }]);
  });
});

describe('sortReviewItemsByOrder', () => {
  const make = (orderIndex: number | null, id: number) => ({
    id,
    question: orderIndex === null ? null : { orderIndex },
  });

  it('orders by question orderIndex', () => {
    const items = [make(30, 1), make(10, 2), make(20, 3)];
    expect(sortReviewItemsByOrder(items).map((item) => item.id)).toEqual([2, 3, 1]);
  });

  it('is stable for equal orderIndex and pushes missing questions to the end', () => {
    const items = [make(5, 1), make(null, 2), make(5, 3), make(1, 4)];
    expect(sortReviewItemsByOrder(items).map((item) => item.id)).toEqual([4, 1, 3, 2]);
  });

  it('does not mutate the input array', () => {
    const items = [make(20, 1), make(10, 2)];
    const copy = [...items];
    sortReviewItemsByOrder(items);
    expect(items).toEqual(copy);
  });
});
