import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-identity';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Admin Panel | CEFR Ready',
  description: 'หน้าจัดการระบบสำหรับผู้ดูแล',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let isAdmin = session?.user?.isAdmin === true || isAdminEmail(session?.user?.email);

  // Refresh the DB flag for older JWTs that were issued before the admin claim
  // was added or after an account was promoted.
  if (!isAdmin && session?.user?.email) {
    const dbUser = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)
      .then((rows) => rows[0]);
    isAdmin = dbUser?.isAdmin === true;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl">🔒</div>
          <h1 className="text-xl font-bold text-slate-900">ไม่มีสิทธิ์เข้าหน้า Admin</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล แล้วลองเปิดหน้านี้อีกครั้ง</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">กลับหน้าหลัก</Link>
            <Link href="/api/auth/signin?callbackUrl=%2Fadmin" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">เข้าสู่ระบบ</Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}