'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { absoluteCallbackUrl } from '@/lib/redirect-safety';
import { usePostHog } from '@/lib/posthog';

/**
 * ปุ่มเริ่มเข้าสู่ระบบด้วย Google — ใช้วิธีเดียวกับปุ่มใน header (HeaderClient)
 * เพื่อให้พฤติกรรม (callbackUrl, การจัดการ error) เหมือนกันทุกจุด
 */
export default function LoginPanel({ callbackUrl }: { callbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const posthog = usePostHog();

  // gate_viewed — เห็นหน้ากำแพงล็อกอินแล้ว (ก่อนกด Google)
  // เดิมเห็นแค่ signup_started (คนที่กดปุ่ม) ทำให้ไม่รู้ว่ามีคนมากี่คน
  // ที่ถูกกันไว้ก่อนถึงปุ่ม และหลุดไปกี่ % ระหว่างหน้า login กับ Google
  useEffect(() => {
    if (!posthog) return;
    posthog.capture('gate_viewed', {
      callback_url: callbackUrl,
      // /tests = ถูกเด้งจากหน้าข้อสอบ (กำแพงของ funnel หลัก)
      from: callbackUrl.startsWith('/tests') ? 'tests_gate' : 'login_page',
    });
  }, [posthog, callbackUrl]);

  const handleLogin = () => {
    setBusy(true);
    setFailed(false);
    // เติมขั้นที่หายไปของ funnel: หน้า login → กด Google → user_signed_in
    // (เดิมเห็นแค่ "เข้าสู่ระบบสำเร็จ" จึงไม่รู้ว่าคนหลุดที่ปุ่มหรือที่ Google)
    posthog?.capture('signup_started', {
      from: 'login_page',
      callback_url: callbackUrl,
    });
    // ต้องส่ง URL เต็ม (ไม่ใช่ path) — next-auth เก็บ path อย่างเดียวไม่ได้
    // แล้วจะพากลับหน้าแรกแทนหน้าปลายทาง (ดู absoluteCallbackUrl)
    const target = absoluteCallbackUrl(callbackUrl, window.location.origin);
    // signIn จะพาออกไปหน้า Google เอง — ถ้าหลุดกลับมาเป็น error ค่อยคืนสถานะปุ่ม
    Promise.resolve(signIn('google', { callbackUrl: target }))
      .catch(() => {
        setBusy(false);
        setFailed(true);
      });
  };

  return (
    <div className="mx-auto w-full max-w-[460px] px-4 py-16">
      <div className="rounded-[20px] border border-[#E6F0F8] bg-white px-6 py-8 shadow-[0_0_3.3px_0_rgba(172,172,172,0.25)] sm:px-8">
        <h1 className="text-[22px] font-bold leading-8 text-[#343434]">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-[15px] leading-7 text-[#666]">
          เข้าสู่ระบบด้วยบัญชี Google เพื่อทำข้อสอบ บันทึกความก้าวหน้า และถาม AI Tutor
        </p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#5A95C6] text-[16px] font-semibold text-white transition-colors hover:bg-[#4A85B6] disabled:cursor-default disabled:opacity-60"
        >
          {busy ? 'กำลังพาไปหน้าเข้าสู่ระบบ…' : 'ดำเนินการต่อด้วย Google'}
        </button>

        {failed && (
          <p className="mt-3 text-[13px] leading-6 text-[#b42318]">
            เริ่มการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        )}

        <p className="mt-6 text-center text-[13px] leading-6 text-[#888]">
          ยังไม่มีบัญชี? การเข้าสู่ระบบครั้งแรกจะสร้างบัญชีให้อัตโนมัติ
          <br />
          <Link href="/" className="font-semibold text-[#5A95C6] hover:underline">
            กลับหน้าแรก
          </Link>
        </p>
      </div>
    </div>
  );
}
