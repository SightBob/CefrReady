'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LockKeyhole, Send } from 'lucide-react';
import { FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';

/**
 * หน้าติดต่อเรา — ใช้ชุดธีมเดียวกับ redesign ตาม Figma
 * (ครีม #FFFEFA · ขาว + ขอบ #EAEAEA + เงาแข็ง #D5D3D3 · น้ำเงินแบรนด์ #5A95C6 · เหลือง #FFF0AE/#FFDB40)
 */
export default function ContactPage() {
  const { status } = useSession();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !message.trim()) return;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        toast.error(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        return;
      }

      toast.success('ขอบคุณสำหรับความคิดเห็น เราได้รับข้อความของคุณแล้ว');
      setMessage('');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA]">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[#808080] transition-colors hover:text-[#5A95C6]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับหน้าหลัก
        </Link>

        <h1 className="mb-3 text-4xl font-bold leading-none tracking-tighter text-[#556376] md:text-5xl">
          ติดต่อเรา
        </h1>
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-[#808080]">
          พูดคุยกับทีมงานผ่านช่องทางโซเชียลได้เลย หรือส่งความคิดเห็นถึงเราโดยตรงผ่านแบบฟอร์มด้านล่าง
        </p>

        <section aria-label="ช่องทางติดต่อ" className="mb-10 grid gap-4 sm:grid-cols-2">
          <a
            href="https://www.facebook.com/profile.php?id=61590152890102"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-44 flex-col rounded-[14px] border border-[#EAEAEA] bg-white p-6 shadow-[3px_4px_0px_#D5D3D3] transition-all hover:-translate-y-0.5 hover:shadow-[4px_6px_0px_#D5D3D3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A95C6]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#5A95C6]/10">
              <FacebookLogo className="h-6 w-6 text-[#5A95C6]" aria-hidden="true" weight="fill" />
            </span>
            <span className="mt-4 text-base font-bold text-[#3E3E3E]">Facebook</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-[#808080]">
              ทักแชตสอบถามข้อมูล สมัครเรียน หรือแจ้งปัญหาได้เร็วที่สุด
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#5A95C6]">
              เปิด Facebook
              <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </a>
          <a
            href="https://www.instagram.com/cefr_ready/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-44 flex-col rounded-[14px] border border-[#EAEAEA] bg-white p-6 shadow-[3px_4px_0px_#D5D3D3] transition-all hover:-translate-y-0.5 hover:shadow-[4px_6px_0px_#D5D3D3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A95C6]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#5A95C6]/10">
              <InstagramLogo className="h-6 w-6 text-[#5A95C6]" aria-hidden="true" weight="fill" />
            </span>
            <span className="mt-4 text-base font-bold text-[#3E3E3E]">Instagram</span>
            <span className="mt-1 flex-1 text-sm leading-relaxed text-[#808080]">
              ติดตามเทคนิคการสอบ เคล็ดลับ และข่าวสารจาก CEFR Ready
            </span>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#5A95C6]">
              เปิด Instagram
              <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </a>
        </section>

        <h2 className="mb-3 text-2xl font-bold leading-none tracking-tighter text-[#556376]">
          แจ้งปัญหาและข้อเสนอแนะ
        </h2>
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#808080]">
          พบปัญหาในการใช้งาน หรือมีไอเดียที่อยากให้เราปรับปรุง? บอกเราได้เลย ทุกความคิดเห็นช่วยให้ CEFR Ready ดีขึ้น
        </p>

        {status === 'loading' ? (
          <div className="flex min-h-64 items-center justify-center rounded-[14px] border border-[#EAEAEA] bg-white">
            <p className="text-sm text-[#808080]" role="status">กำลังโหลด...</p>
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="rounded-[14px] border border-[#EAEAEA] bg-white p-8 text-center shadow-[3px_4px_0px_#D5D3D3]">
            <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-[#808080]" aria-hidden="true" />
            <h3 className="text-lg font-bold text-[#3E3E3E]">เข้าสู่ระบบเพื่อส่งความคิดเห็น</h3>
            <p className="mt-2 text-sm text-[#808080]">
              เราจะผูกข้อความกับบัญชีของคุณเพื่อให้ตรวจสอบและติดต่อกลับได้
            </p>
            <button
              type="button"
              onClick={() => Promise.resolve(signIn('google', { callbackUrl: '/contact' })).catch(() => {})}
              className="mt-6 inline-flex items-center justify-center rounded-[14px] border-r-4 border-b-[5px] border-[#FFDB40] bg-[#FFF0AE] px-6 py-3 text-sm font-bold text-[#6D5E1C] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A95C6] focus-visible:ring-offset-2 active:translate-y-0"
            >
              เข้าสู่ระบบด้วย Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="feedback-message" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#3E3E3E]">
                รายละเอียดปัญหาหรือข้อเสนอแนะ
              </label>
              <textarea
                id="feedback-message"
                required
                minLength={1}
                maxLength={5000}
                rows={8}
                aria-describedby="feedback-message-count"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="เล่าให้เราฟังได้เลยว่าพบปัญหาอะไร หรืออยากให้เราปรับปรุงส่วนไหน..."
                className="w-full resize-y rounded-[14px] border border-[#EAEAEA] bg-white px-4 py-3 text-sm shadow-[3px_4px_0px_#D5D3D3] transition-all focus:border-[#5A95C6] focus:outline-none focus:ring-2 focus:ring-[#5A95C6]/20"
              />
              <p id="feedback-message-count" className="mt-1.5 text-right text-xs text-[#9B9B9B]">
                {message.length.toLocaleString()} / 5,000
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border-r-4 border-b-[5px] border-[#FFDB40] bg-[#FFF0AE] px-6 py-3 text-base font-bold text-[#6D5E1C] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? 'กำลังส่ง...' : 'ส่งความคิดเห็น'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
