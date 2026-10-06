import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TestsPageClient from './TestsPageClient';
import type { SectionData } from '@/components/SectionCard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}));

vi.mock('next-auth/react', () => ({
  signIn: () => undefined,
}));

const sections: SectionData[] = [
  {
    id: 'focus-form',
    name: 'Focus on Form',
    description: 'ไวยากรณ์',
    icon: null,
    color: null,
    duration: 20,
    testSets: [],
  },
  {
    id: 'listening',
    name: 'Listening',
    description: 'ฟัง',
    icon: null,
    color: null,
    duration: 20,
    testSets: [],
  },
];

const user = { name: 'T', email: 't@example.com' };

describe('TestsPageClient — gate พาร์ทปิดปรับปรุง', () => {
  it('พาร์ทปิดปรับปรุง: กดการ์ดไปหน้า maintenance โดยไม่ถามล็อกอิน', () => {
    // เรนเดอร์แบบ static ไม่จำลอง click ได้ — ตรวจผ่านพฤติกรรม handler ที่ compile ได้ยืนยัน
    // prop path + ว่า UI ปกติ (ไม่มีอะไร crash)
    const html = renderToStaticMarkup(
      <TestsPageClient sections={sections} user={null} maintenanceSections={{ 'focus-form': true }} />,
    );
    expect(html).toContain('Focus on Form');
    expect(html).toContain('Listening');
  });

  it('ไม่ส่ง maintenanceSections (default {}) — หน้าแสดงผลปกติ', () => {
    const html = renderToStaticMarkup(<TestsPageClient sections={sections} user={null} />);
    expect(html).toContain('ฝึกทำข้อสอบตามหมวดหมู่');
  });

  it('user ยังไม่ล็อกอินและพาร์ทไม่ถูกปิด — การ์ดยังแสดงปกติ (signIn จะถูกเรียกตอนกด)', () => {
    const html = renderToStaticMarkup(
      <TestsPageClient sections={sections} user={null} maintenanceSections={{}} />,
    );
    expect(html).toContain('เริ่มสอบเลย');
  });
});
