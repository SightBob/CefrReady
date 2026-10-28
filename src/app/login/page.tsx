import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { DEFAULT_LOGIN_CALLBACK, safeCallbackUrl } from '@/lib/redirect-safety';
import LoginPanel from './LoginPanel';

/**
 * /login — หน้าเข้าสู่ระบบสำหรับลิงก์ที่แชร์/บุ๊กมาร์กไว้
 *
 * เดิม path นี้ไม่มีอยู่ → 404 (ลิงก์ที่เคยส่งให้ผู้เรียนพัง)
 * ตัวเว็บใช้ next-auth (Google) โดย pages.signIn = '/login' (หน้านี้เอง) — ปุ่มใน header
 * และหน้า /login เริ่ม flow เดียวกันคือ signIn('google', { callbackUrl })
 *
 * รับ ?callbackUrl= (path ภายในเว็บเท่านั้น — ผ่าน safeCallbackUrl กัน open redirect)
 * ค่านี้มักมาเป็น URL เต็มจาก next-auth จึงเทียบ origin กับ request ปัจจุบันก่อนรับ
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

  // next-auth แปลง callbackUrl เป็น URL เต็มเสมอ (http://host/path) — ใช้ host ของ request
  // เป็น origin ที่อนุญาต แล้วตัดเหลือ path
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http';
  const origin = host ? `${proto}://${host}` : undefined;
  const callbackUrl = safeCallbackUrl(params?.callbackUrl, DEFAULT_LOGIN_CALLBACK, origin);

  // ล็อกอินอยู่แล้ว = ไม่ต้องเห็นหน้านี้ซ้ำ
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  return (
    <main className="min-h-[70vh] bg-[#FFFEF9] pt-16">
      <LoginPanel callbackUrl={callbackUrl} />
    </main>
  );
}
