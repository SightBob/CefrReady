import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/link', () => ({
  default: ({ children }: { children?: unknown }) => children,
}));
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react');
  return { ...actual, Loader2: () => null, Search: () => null };
});

import AdminVerbBankPage from './page';

/** ตรวจว่าหน้า admin เรนเดอร์ได้จริงในโครงสร้างเดิม (การ์ดเพิ่ม + ตาราง + ปุ่มจัดการ) */
describe('admin /admin/verb-banks (server render)', () => {
  it('renders the header and the create form for all three forms', () => {
    const html = renderToStaticMarkup(<AdminVerbBankPage />);
    expect(html).toContain('คลังกริยา 3 ช่อง');
    expect(html).toContain('เพิ่มกริยาใหม่');
    expect(html).toContain('เพิ่มลงคลัง');
    expect(html).toContain('>V.1<');
    expect(html).toContain('>V.2<');
    expect(html).toContain('>V.3<');
  });

  it('renders the table headers and the empty state before data loads', () => {
    const html = renderToStaticMarkup(<AdminVerbBankPage />);
    expect(html).toContain('จัดการ');
    expect(html).toContain('กำลังโหลดคลังกริยา');
    expect(html).toContain('ค้นหาจาก V.1 / V.2 / V.3');
  });
});
