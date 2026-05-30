'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Facebook, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('ส่งข้อความเรียบร้อยแล้ว! ทางเราจะติดต่อกลับโดยเร็ว');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#111] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        <h1 className="text-4xl md:text-5xl tracking-tighter leading-none font-bold text-[#111] mb-3">
          ติดต่อเรา
        </h1>
        <p className="text-[#787774] text-sm leading-relaxed max-w-lg mb-10">
          มีคำถาม ข้อเสนอแนะ หรือต้องการรายงานปัญหา? กรอกฟอร์มด้านล่างหรือติดต่อเราผ่าน Facebook
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#111] uppercase tracking-widest mb-1.5">
                ชื่อ
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] uppercase tracking-widest mb-1.5">
                อีเมล
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] uppercase tracking-widest mb-1.5">
                หัวข้อ
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="เรื่องที่ต้องการติดต่อ"
                className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#111] uppercase tracking-widest mb-1.5">
                ข้อความ
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="รายละเอียด..."
                className="w-full px-4 py-3 rounded-xl border border-[#EAEAEA] bg-white text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#111] text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-[#2a2a2a] active:scale-[0.98] transition-all shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'กำลังส่ง...' : 'ส่งข้อความ'}
            </button>
          </form>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#EAEAEA] rounded-[1.5rem] p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <p className="font-semibold text-[#111] text-sm">Facebook</p>
                  <p className="text-xs text-[#787774]">พูดคุยกับเราได้โดยตรง</p>
                </div>
              </div>
              <a
                href="https://www.facebook.com/profile.php?id=61590152890102"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm font-semibold bg-[#1877F2] text-white rounded-full px-4 py-2.5 hover:bg-[#1565C0] transition-colors"
              >
                ไปที่ Facebook
              </a>
            </div>

            <div className="bg-white border border-[#EAEAEA] rounded-[1.5rem] p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-[#111] text-sm">ฟอร์มติดต่อ</p>
                  <p className="text-xs text-[#787774]">ตอบกลับภายใน 24 ชม.</p>
                </div>
              </div>
              <p className="text-xs text-[#AAAAAA]">
                กรอกฟอร์มด้านซ้าย เราจะตอบกลับไปที่อีเมลของคุณ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
