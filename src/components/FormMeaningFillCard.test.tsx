import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FormMeaningFillCard from './FormMeaningFillCard';

/**
 * การ์ดบทความ Form and Meaning (Figma 172:11331) — ใช้ทั้งหน้าสอบชุด, Full Test
 * และหน้า /review/[attemptId] (หลังบ้านแก้ให้ใช้การ์ดนี้แทน FormMeaningArticleCard เก่า)
 *
 * บั๊กเดิมของหน้า review: ส่งท่อนข้อความเข้า SelectableText โดยไม่ส่ง `inline`
 * → แต่ละท่อนกลายเป็น <div>/<p> block ทำให้บทความถูกตัดบรรทัดละท่อน
 * เทสต์ชุดนี้ล็อกว่าท่อนข้อความต้องเป็น span อินไลน์เท่านั้น (ห้ามมี <p> ในเนื้อเรื่อง)
 */
const article = {
  title: 'The Jones Family',
  text: 'John Jones lives {{20}} the United States with {{21}} wife, Mary. They {{22}} two children.',
  blanks: [
    { id: 20, correctAnswer: 'in' },
    { id: 21, correctAnswer: 'his' },
    { id: 22, correctAnswer: 'have' },
  ],
};

const render = (answers: Record<number, string>) =>
  renderToStaticMarkup(
    <FormMeaningFillCard
      article={article}
      answers={answers}
      onInputChange={() => {}}
      revealed
      disabled
    />,
  );

/** เนื้อเรื่อง = ระหว่าง div เนื้อหา (leading-[64.45px]) กับเส้นคั่นล่าง */
const articleBodyOf = (html: string) => {
  const start = html.indexOf('leading-[64.45px]');
  const end = html.indexOf('<div class="mt-[9px] h-px', start); // เส้นคั่นล่าง = จบเนื้อเรื่อง
  return html.slice(start, end);
};

describe('FormMeaningFillCard — สถานะเฉลย (หน้า review)', () => {
  it('ท่อนข้อความเรนเดอร์เป็นอินไลน์ ไม่แตกเป็น block — บทความต้องไม่ถูกตัดบรรทัดละท่อน', () => {
    // ตอบถูกครบ = ไม่มี chip เฉลยคั่น จึงเทียบได้ว่าทั้งบทความคือข้อความอินไลน์ล้วน
    const body = articleBodyOf(render({ 20: 'in', 21: 'his', 22: 'have' }));
    // block element (div/p) = ท่อนกลายเป็นก้อน → ข้อความขึ้นบรรทัดใหม่ทุกท่อน (บั๊กเดิม)
    expect(body).not.toMatch(/<(p|div)[\s>]/);
    // คำยังเรียงต่อกันเป็นประโยคเดิมตามลำดับ
    const order = ['>John<', '>Jones<', '>lives<', '>United<', '>States<', '>children<']
      .map((word) => body.indexOf(word));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('ตอบผิด → ช่องแดงมี line-through และมี chip เฉลยสีเขียวใต้ช่อง', () => {
    const html = render({ 20: 'x1', 21: 'his' });
    const body = articleBodyOf(html);
    expect(body).toContain('line-through');
    expect(body).toContain('border-red-500');
    expect(body).toContain('>in<'); // เฉลยของช่องที่ตอบผิด
  });

  it('ตอบถูก → ช่องเขียว ไม่มี chip เฉลยซ้ำ', () => {
    const body = articleBodyOf(render({ 20: 'in', 21: 'his' }));
    expect(body).toContain('border-emerald-500');
    expect(body).toContain('text-emerald-700');
  });

  it('ไม่ได้ตอบ → ช่องเหลืองพร้อม chip "Answer:"', () => {
    const body = articleBodyOf(render({ 20: 'x1' }));
    expect(body).toContain('border-amber-400');
    expect(body).toContain('Answer:');
  });

  it('ทุกช่องถูกล็อกไม่ให้แก้ในโหมดทบทวน', () => {
    const body = articleBodyOf(render({ 20: 'x1' }));
    expect(body.match(/disabled/g)?.length ?? 0).toBe(3);
  });
});
