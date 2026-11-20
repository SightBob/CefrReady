import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * HeaderClient — เมนู "ข้อสอบ CEFR" ต้องพาคนที่ยังไม่ล็อกอินไปหน้าเข้าสู่ระบบก่อน
 * (เดิมส่งไป /demo/intro ทำให้ไม่เห็นหน้า login เลย) แล้วกลับมาที่ /tests หลังล็อกอิน
 */
const authState = vi.hoisted(() => ({
  session: null as null | { user: { id: string; name?: string; email?: string; isAdmin?: boolean } },
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: authState.session, status: authState.status }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

import HeaderClient from './HeaderClient';

const render = () => renderToStaticMarkup(<HeaderClient />);

describe('HeaderClient — ข้อสอบ CEFR ต้องผ่านหน้าเข้าสู่ระบบเมื่อยังไม่ล็อกอิน', () => {
  it('ยังไม่ล็อกอิน → ลิงก์ไป /login พร้อม callbackUrl=/tests', () => {
    authState.session = null;
    authState.status = 'unauthenticated';

    const html = render();

    expect(html).toContain('href="/login?callbackUrl=%2Ftests"');
    // ต้องไม่พาไปเดโมเงียบ ๆ เหมือนเดิม
    expect(html).not.toContain('href="/demo/intro"');
  });

  it('ล็อกอินแล้ว → ลิงก์ไป /tests ตามปกติ', () => {
    authState.session = { user: { id: 'user-1', name: 'Learner' } };
    authState.status = 'authenticated';

    const html = render();

    expect(html).toContain('href="/tests"');
    expect(html).not.toContain('href="/login?callbackUrl=%2Ftests"');
  });

  it('ระหว่างโหลด session → คงลิงก์เดิมไว้ ไม่กระพริบเป็นหน้า login', () => {
    authState.session = null;
    authState.status = 'loading';

    const html = render();

    expect(html).toContain('href="/tests"');
    expect(html).not.toContain('href="/login?callbackUrl=%2Ftests"');
  });
});
