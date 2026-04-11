import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Admin Panel | CEFR Ready',
  description: 'หน้าจัดการระบบสำหรับผู้ดูแล',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect('/');
  }

  return <>{children}</>;
}