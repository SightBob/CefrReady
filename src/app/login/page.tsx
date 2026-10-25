import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { safeCallbackUrl } from '@/lib/redirect-safety';
import LoginPanel from './LoginPanel';

/**
 * /login — หน้าเข้าสู่ระบบสำหรับลิงก์ที่แชร์/บุ๊กมาร์กไว้
 *
 * เดิม path นี้ไม่มีอยู่ → 404 (ลิงก์ที่เคยส่งให้ผู้เรียนพัง)
 * ตัวเว็บใช้ next-auth (Google) โดย pages.signIn = '/' จึงไม่มีหน้า login ของ
 * next-auth ให้ใช้ — หน้านี้จึงเป็นหน้าของเราเองที่เริ่ม flow เดียวกับปุ่มใน header
 *
 * รับ ?callbackUrl= (path ภายในเว็บเท่านั้น — ผ่าน safeCallbackUrl กัน open redirect)
 * ถ้าล็อกอินอยู่แล้วก็พาไปปลายทางทันที
 */

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ',
  description: 'เข้าสู่ระบบ CEFR Ready ด้วยบัญชี Google เพื่อทำข้อสอบและติดตามความก้าวหน้า',
  alternates: { canonical: 'https://cefr-ready.site/login' },
  // หน้าเข้าสู่ระบบไม่ควรอยู่ในผลค้นหาและไม่ควรถูกแคช
  robots: { index: false, follow: true },
  openGraph: {
    title: 'เข้าสู่ระบบ | CEFR Ready',
    description: 'เข้าสู่ระบบ CEFR Ready ด้วยบัญชี Google เพื่อทำข้อสอบและติดตามความก้าวหน้า',
    url: 'https://cefr-ready.site/login',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'เข้าสู่ระบบ | CEFR Ready',
    description: 'เข้าสู่ระบบ CEFR Ready ด้วยบัญชี Google เพื่อทำข้อสอบและติดตามความก้าวหน้า',
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params?.callbackUrl);

  // ล็อกอินอยู่แล้ว = ไม่ต้องเห็นหน้านี้ซ้ำ
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  return (
    <main className="min-h-[70vh] bg-[#FFFEF9] pt-16">
      <LoginPanel callbackUrl={callbackUrl} />
    </main>
  );
}
