import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import TestSetExplainView from './TestSetExplainView';

// การ์ดแบบ rule แสดง chip + description (heading ไม่ได้ถูกวาดในการ์ดนี้) — ใช้ข้อความที่เห็นจริง
const props = {
  title: 'Present Simple',
  intro: 'บทนำ',
  tip: 'ทริค',
  sections: [{ type: 'rule' as const, chip: 'โครงสร้าง', description: 'ประธาน + กริยาเติม s' }],
  sectionId: 'focus-form',
  quizHref: '/tests/focus-form/1',
  backHref: '/tests/focus-form/1/intro',
};

describe('TestSetExplainView', () => {
  it('เป็นหน้าอธิบายของผู้เรียนตามปกติเมื่อไม่ส่ง notice', () => {
    const html = renderToStaticMarkup(<TestSetExplainView {...props} />);
    expect(html).toContain('ประธาน + กริยาเติม s');
    expect(html).toContain('ทำข้อสอบต่อ');
    expect(html).not.toContain('พรีวิวสำหรับแอดมิน');
  });

  it('แสดงแบนเนอร์สถานะและปุ่มที่กำหนดในโหมดพรีวิวของแอดมิน', () => {
    const html = renderToStaticMarkup(
      <TestSetExplainView
        {...props}
        notice="พรีวิวสำหรับแอดมิน · สถานะ รอตรวจสอบ — ผู้เรียนยังไม่เห็นเนื้อหาเรื่องนี้"
        noticeTone="warning"
        primaryLabel="ไปหน้าทำข้อสอบ"
      />
    );
    expect(html).toContain('พรีวิวสำหรับแอดมิน');
    expect(html).toContain('สถานะ รอตรวจสอบ');
    expect(html).toContain('border-amber-300 bg-amber-50 text-amber-800');
    expect(html).toContain('ไปหน้าทำข้อสอบ');
    expect(html).not.toContain('ทำข้อสอบต่อ');
  });

  it('เพิ่มลิงก์ไปหน้าทำข้อสอบจริงได้ในแบนเนอร์ (โหมดพรีวิวของแอดมิน)', () => {
    const html = renderToStaticMarkup(
      <TestSetExplainView
        {...props}
        notice="พรีวิวสำหรับแอดมิน · สถานะ รอตรวจสอบ"
        noticeTone="warning"
        noticeAction={{ label: 'เปิดหน้าทำข้อสอบจริง (โหมดพรีวิวของแอดมิน)', href: '/tests/focus-form/1?preview=1' }}
      />
    );
    expect(html).toContain('/tests/focus-form/1?preview=1');
    expect(html).toContain('เปิดหน้าทำข้อสอบจริง');
  });

  it('ไม่มีลิงก์ในแบนเนอร์เมื่อไม่ส่ง noticeAction', () => {
    const html = renderToStaticMarkup(<TestSetExplainView {...props} notice="พรีวิวสำหรับแอดมิน" />);
    expect(html).not.toContain('preview=1');
  });

  it('ใช้โทนสีปกติเมื่อเนื้อหานั้นผู้เรียนเห็นอยู่แล้ว', () => {
    const html = renderToStaticMarkup(
      <TestSetExplainView {...props} notice="พรีวิวสำหรับแอดมิน · สถานะ เผยแพร่" noticeTone="info" />
    );
    expect(html).toContain('border-sky-200 bg-sky-50 text-sky-800');
    expect(html).not.toContain('border-amber-300 bg-amber-50 text-amber-800');
    expect(html).toContain('ทำข้อสอบต่อ');
  });
});
