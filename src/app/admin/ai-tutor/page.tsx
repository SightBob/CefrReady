'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, MessageSquareText, Users } from 'lucide-react';

import ConfigTab from './ConfigTab';
import QuestionsTab from './QuestionsTab';
import TestersTab from './TestersTab';

type Tab = 'settings' | 'testers' | 'questions';

const TABS: Array<{ id: Tab; label: string; icon: typeof Bot }> = [
  { id: 'settings', label: 'ตั้งค่า', icon: Bot },
  { id: 'testers', label: 'ผู้ทดสอบ', icon: Users },
  { id: 'questions', label: 'คำถามผู้เรียน', icon: MessageSquareText },
];

type TutorStatus = {
  runtimeEnabled: boolean;
  masterEnabled: boolean;
  rolloutPercent: number;
};

export default function AdminAiTutorPage() {
  const [tab, setTab] = useState<Tab>('settings');
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    // อ่านสถานะ + rollout จาก API เพื่อแสดงในหัวหน้า (อ่านอย่างเดียว)
    void fetch('/api/admin/ai-tutor/config')
      .then((response) => response.json())
      .then((body) => {
        if (!body?.success) return;
        setStatus({
          runtimeEnabled: Boolean(body.data?.config?.runtimeEnabled),
          masterEnabled: Boolean(body.data?.envStatus?.masterEnabled),
          rolloutPercent: Number(body.data?.config?.rolloutPercent ?? 0),
        });
      })
      .catch(() => undefined);
  }, []);

  const active = status ? status.masterEnabled && status.runtimeEnabled : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── หัวหน้า: ระบุตำแหน่ง + ชื่อหน้า + สถานะย่อ ─── */}
      <header className="bg-white">
        <div className="mx-auto max-w-[1049px] px-4 pt-5 sm:px-6">
          <nav aria-label="เส้นทาง" className="flex items-center gap-1 text-xs font-medium text-slate-400">
            <Link href="/admin" className="rounded transition-colors hover:text-slate-600">Admin</Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="text-slate-600">AI Tutor</span>
          </nav>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                href="/admin"
                aria-label="กลับไปหน้า admin"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                    <Bot className="size-5" aria-hidden="true" />
                  </span>
                  AI Tutor
                </h1>
                <p className="mt-1 max-w-[62ch] text-sm leading-6 text-slate-500">
                  ตั้งค่าโมเดล โควตา และผู้ทดสอบของโหมด AI ในหน้าทำข้อสอบ — ไม่ต้องแก้ env หรือ redeploy
                </p>
              </div>
            </div>

            {/* สถานะรวม — อ่านจาก API เดียวกับแท็บตั้งค่า */}
            {status && (
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <span
                  className={`size-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                  aria-hidden="true"
                />
                {active ? 'เปิดใช้งานอยู่' : 'ปิดอยู่'}
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="font-medium text-slate-500">rollout {status.rolloutPercent}%</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── แท็บ: ติดขอบบนเมื่อเลื่อน (หน้าแท็บตั้งค่ายาวมาก) ───
          ต้องเป็น sibling ของ header ไม่ใช่ลูกของมัน — ถ้าอยู่ใน header ที่สูงเท่าแถบ
          sticky จะถูกจำกัดขอบเขตด้วยความสูงของ parent แล้วเลื่อนหายไปพร้อมกัน */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1049px] px-4 sm:px-6">
          <div
            role="tablist"
            aria-label="แท็บการตั้งค่า AI Tutor"
            className="flex gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="inline-flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1">
              {TABS.map((item) => {
                const Icon = item.icon;
                const selected = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${item.id}`}
                    id={`tab-${item.id}`}
                    onClick={() => {
                      if (item.id === tab) return;
                      setTab(item.id);
                      // สลับแท็บขณะเลื่อนลึกอยู่ → กลับขึ้นบนสุดของแท็บใหม่
                      window.scrollTo({ top: 0 });
                    }}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-semibold whitespace-nowrap transition-all ${
                      selected
                        ? 'bg-white text-primary-700 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`size-4 ${selected ? 'text-primary-600' : 'text-slate-400'}`} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1049px] px-4 py-6 sm:px-6">
        {notice && (
          <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {notice}
          </p>
        )}

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'settings'
            ? <ConfigTab />
            : tab === 'testers'
              ? <TestersTab rolloutPercent={status?.rolloutPercent ?? 0} />
              : <QuestionsTab />}
        </div>
      </main>
    </div>
  );
}
