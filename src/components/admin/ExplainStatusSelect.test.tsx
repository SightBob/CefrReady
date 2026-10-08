import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplainStatusSelect from './ExplainStatusSelect';

const render = (value: 'draft' | 'review' | 'published' | 'hidden') =>
  renderToStaticMarkup(<ExplainStatusSelect value={value} onChange={() => undefined} />);

describe('ExplainStatusSelect', () => {
  it('แสดงครบทั้ง 4 สถานะ และทำเครื่องหมายอันที่เลือกอยู่', () => {
    const html = render('published');
    expect(html).toContain('ฉบับร่าง');
    expect(html).toContain('รอตรวจสอบ');
    expect(html).toContain('เผยแพร่');
    expect(html).toContain('ปิดชั่วคราว');
    // aria-pressed อยู่บนปุ่มที่เลือกเท่านั้น
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it('published → บอกว่าผู้เรียนเห็น และอธิบายว่าผู้เรียนเห็นส่วนที่พร้อมแล้ว', () => {
    const html = render('published');
    expect(html).toContain('ผู้เรียนเห็นเนื้อหานี้');
    expect(html).toContain('ผู้เรียนเห็นเนื้อหาส่วนที่พร้อมแล้ว');
  });

  it('draft/review/hidden → บอกชัดว่าผู้เรียนยังไม่เห็น พร้อมเหตุผลต่างกัน', () => {
    expect(render('draft')).toContain('กำลังพัฒนา — ผู้เรียนยังไม่เห็นเนื้อหานี้');
    expect(render('review')).toContain('กำลังตรวจสอบ — ผู้เรียนยังไม่เห็น');
    expect(render('hidden')).toContain('ปิดไม่ให้ผู้เรียนเห็น (maintenance)');
    expect(render('hidden')).toContain('ผู้เรียนยังไม่เห็นเนื้อหานี้');
  });
});
