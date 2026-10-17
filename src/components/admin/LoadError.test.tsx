import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import LoadError from './LoadError';

/**
 * หน้า admin 3 หน้าเคยกลืน error เงียบ ๆ (catch แค่ console.error และไม่มี else
 * สำหรับ success:false) แอดมินจึงเห็นหน้าว่างที่ดูเหมือนไม่มีข้อมูล
 */
describe('LoadError', () => {
  it('แสดงข้อความ error และปุ่มลองใหม่', () => {
    const html = renderToStaticMarkup(<LoadError message="ไม่สามารถโหลดข้อมูลได้" onRetry={() => {}} />);
    expect(html).toContain('ไม่สามารถโหลดข้อมูลได้');
    expect(html).toContain('ลองอีกครั้ง');
  });

  it('ใช้สไตล์เดียวกับที่ contacts/page.tsx ใช้อยู่แล้ว', () => {
    const html = renderToStaticMarkup(<LoadError message="x" onRetry={() => {}} />);
    expect(html).toContain('text-red-600');
    expect(html).toContain('btn-primary');
  });
});

describe('หน้า admin ที่เคยกลืน error ต้องใช้ fetchAdminJson + LoadError', () => {
  const pages = [
    'src/app/admin/question-pool/page.tsx',
    'src/app/admin/reports/page.tsx',
    'src/app/admin/question-reports/page.tsx',
  ];

  for (const p of pages) {
    it(p, () => {
      const src = readFileSync(join(process.cwd(), p), 'utf8');
      expect(src).toContain('fetchAdminJson');
      expect(src).toContain('LoadError');
      expect(src).toMatch(/setError\(/);
    });
  }
});