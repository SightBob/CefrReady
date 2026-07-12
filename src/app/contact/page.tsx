'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LockKeyhole, Send } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';

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
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#787774] transition-colors hover:text-[#111]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับหน้าหลัก
        </Link>

        <h1 className="mb-3 text-4xl font-bold leading-none tracking-tighter text-[#111] md:text-5xl">
          แจ้งปัญหาและข้อเสนอแนะ
        </h1>
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-[#787774]">
          พบปัญหาในการใช้งาน หรือมีไอเดียที่อยากให้เราปรับปรุง? บอกเราได้เลย ทุกความคิดเห็นช่วยให้ CEFR Ready ดีขึ้น
        </p>

        {status === 'loading' ? (
          <div className="flex min-h-64 items-center justify-center rounded-[1.5rem] border border-[#EAEAEA] bg-white">
            <p className="text-sm text-[#787774]" role="status">กำลังโหลด...</p>
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="rounded-[1.5rem] border border-[#EAEAEA] bg-white p-8 text-center shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)]">
            <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-[#787774]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[#111]">เข้าสู่ระบบเพื่อส่งความคิดเห็น</h2>
            <p className="mt-2 text-sm text-[#787774]">
              เราจะผูกข้อความกับบัญชีของคุณเพื่อให้ตรวจสอบและติดต่อกลับได้
            </p>
            <button
              type="button"
              onClick={() => Promise.resolve(signIn('google', { callbackUrl: '/contact' })).catch(() => {})}
              className="mt-6 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              เข้าสู่ระบบด้วย Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="feedback-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#111]">
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
                className="w-full resize-y rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <p id="feedback-message-count" className="mt-1.5 text-right text-xs text-[#6B6B68]">
                {message.length.toLocaleString()} / 5,000
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18)] transition-all hover:bg-[#2a2a2a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
