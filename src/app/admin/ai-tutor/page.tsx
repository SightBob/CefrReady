'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Loader2, Users } from 'lucide-react';

import ConfigTab from './ConfigTab';
import TestersTab from './TestersTab';

type Tab = 'settings' | 'testers';

export default function AdminAiTutorPage() {
  const [tab, setTab] = useState<Tab>('settings');
  const [rolloutPercent, setRolloutPercent] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    // อ่านค่า rollout จาก API เพื่อแสดงในแท็บผู้ทดสอบ (อ่านอย่างเดียว)
    void fetch('/api/admin/ai-tutor/config')
      .then((response) => response.json())
      .then((body) => {
        if (body?.success) setRolloutPercent(body.data?.config?.rolloutPercent ?? 0);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1049px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <Link href="/admin" aria-label="กลับไปหน้า admin" className="grid min-h-11 min-w-11 place-items-center text-slate-500">
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Bot className="shrink-0 text-primary-600" /> AI Tutor
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ตั้งค่าโมเดล โควตา และผู้ทดสอบของโหมด AI ในหน้าทำข้อสอบ — ไม่ต้องแก้ env หรือ redeploy
            </p>
          </div>
        </div>

        {notice && <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p>}

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="แท็บการตั้งค่า AI Tutor">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'settings'}
            onClick={() => setTab('settings')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'settings' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            <Bot className="size-4" aria-hidden="true" /> ตั้งค่า
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'testers'}
            onClick={() => setTab('testers')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === 'testers' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            <Users className="size-4" aria-hidden="true" /> ผู้ทดสอบ
          </button>
        </div>

        {tab === 'settings'
          ? <ConfigTab />
          : <TestersTab rolloutPercent={rolloutPercent} />}
      </main>
    </div>
  );
}
