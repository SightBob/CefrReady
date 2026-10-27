'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { canShowToast } from '@/lib/toast-routes';

const Toaster = dynamic(() => import('sonner').then((m) => m.Toaster), { ssr: false });

/**
 * sonner ถูกโหลดทุกหน้าเดิมเพราะ `<Toaster/>` อยู่ใน root layout — ตอนนี้ mount
 * เฉพาะเส้นทางที่ยิง toast ได้จริง (ดูรายการและเหตุผลใน src/lib/toast-routes.ts)
 * หน้าตาไม่เปลี่ยน: ที่มี toast อยู่แล้วยังได้ toaster ตัวเดิม ตำแหน่งเดิม
 */
export default function ToasterWrapper() {
  const pathname = usePathname();

  if (!canShowToast(pathname)) return null;

  return <Toaster position="top-center" richColors />;
}
