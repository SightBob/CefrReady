'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { DEFAULT_TAP_AI_SETTINGS, UNDERSTANDING_LABELS, tapAiSettingsSchema, type TapAiSettings, type TapAiFeedback } from '@/lib/tap-ai';

export default function AdminAiSettingsPage() {
  const [settings, setSettings] = useState<TapAiSettings>(DEFAULT_TAP_AI_SETTINGS);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [notice, setNotice] = useState('');
  const [testResult, setTestResult] = useState<TapAiFeedback | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/ai-settings').then(async response => {
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'โหลดการตั้งค่าไม่สำเร็จ');
      if (cancelled) return;
      setSettings(body.data);
      setKeyConfigured(body.keyConfigured);
      setLoaded(true);
    }).catch(error => { if (!cancelled) setNotice(error instanceof Error ? error.message : 'โหลดการตั้งค่าไม่สำเร็จ'); });
    return () => { cancelled = true; };
  }, []);

  const run = async (action: 'save' | 'test') => {
    const parsed = tapAiSettingsSchema.safeParse(settings);
    if (!parsed.success) { setNotice(parsed.error.issues[0].message); return; }
    if (action === 'test') setTestResult(null);
    setBusy(action);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/ai-settings${action === 'test' ? '/test' : ''}`, {
        method: action === 'save' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'ดำเนินการไม่สำเร็จ');
      if (action === 'save') {
        setSettings(body.data);
        setKeyConfigured(body.keyConfigured);
        setNotice('บันทึกการตั้งค่าแล้ว');
      } else {
        setTestResult(body.data);
        setNotice('เชื่อมต่อ OpenRouter และรับ feedback สำเร็จ');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'ดำเนินการไม่สำเร็จ');
    } finally { setBusy(null); }
  };

  const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-primary-500';
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1049px] px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/admin" aria-label="กลับหน้า admin" className="grid min-h-11 min-w-11 place-items-center text-slate-500"><ArrowLeft /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Sparkles className="shrink-0 text-primary-600" /> จัดการ AI</h1>
            <p className="mt-1 text-sm text-slate-500">OpenRouter · ตรวจเหตุผลเฉพาะ Tap & Select</p>
          </div>
        </div>
        {notice && <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-2 text-sm font-semibold text-slate-700">API key: {keyConfigured ? 'ตั้งค่าที่ server แล้ว' : 'ยังไม่ได้ตั้งค่าที่ server'}</p>
          <p className="mb-6 break-words text-sm leading-6 text-slate-500">ตั้ง OPENROUTER_API_KEY ใน environment ของ server แล้ว restart/redeploy ค่า key จะไม่แสดงในหน้านี้ การตั้งค่า AI บันทึกแยกจาก maintenance mode</p>
          <fieldset disabled={!loaded || busy !== null} className="space-y-6 disabled:opacity-60">
            <label className="flex min-h-11 items-center gap-3 text-base text-slate-700">
              <input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} className="h-5 w-5" />
              เปิด AI ตรวจเหตุผล
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              OpenRouter model ID
              <input value={settings.model} maxLength={200} onChange={event => setSettings({ ...settings, model: event.target.value })} placeholder="provider/model-id" className={inputClass} />
              <span className="mt-2 block text-sm font-normal text-slate-500">ใช้โมเดลที่รองรับ structured outputs (JSON Schema) · <a href="https://openrouter.ai/models?supported_parameters=structured_outputs" target="_blank" rel="noreferrer" className="text-primary-600 underline">ดูโมเดล</a></span>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              แนวทางอธิบาย feedback
              <textarea value={settings.feedbackInstructions} maxLength={2000} rows={4} onChange={event => setSettings({ ...settings, feedbackInstructions: event.target.value })} className={inputClass} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              จำกัด output tokens ต่อการตรวจ (300–2000)
              <input type="number" min={300} max={2000} step={1} value={settings.maxTokens} onChange={event => setSettings({ ...settings, maxTokens: Number(event.target.value) })} className={inputClass} />
            </label>
          </fieldset>
          <p className="mt-5 text-sm leading-6 text-slate-500">ส่งเฉพาะโจทย์ ตัวเลือก เฉลย และเหตุผลไป OpenRouter ไม่ส่งชื่อหรืออีเมลผู้เรียน จำกัดผู้เรียน 6 ครั้ง/นาที และ timeout 25 วินาที ผล AI ใช้เพื่อเรียนรู้ ไม่เปลี่ยนคะแนนสอบ</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={!loaded || busy !== null} onClick={() => void run('save')} className="btn-primary min-h-11 disabled:opacity-50">{busy === 'save' ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}</button>
            <button type="button" disabled={!loaded || busy !== null || !keyConfigured || !settings.model.trim()} onClick={() => void run('test')} className="btn-secondary min-h-11 disabled:opacity-50">{busy === 'test' ? 'กำลังทดสอบ…' : 'ทดสอบการเชื่อมต่อ'}</button>
            {busy && <Loader2 className="self-center animate-spin text-primary-600" aria-hidden="true" />}
          </div>
          <p className="mt-3 text-sm text-slate-500">ทดสอบด้วยโจทย์ตัวอย่างและค่าบนฟอร์ม ไม่บันทึกหรือเปิด AI อัตโนมัติ และอาจใช้เครดิต OpenRouter</p>
        </section>
        {testResult && <section aria-live="polite" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800">ผลทดสอบ: {UNDERSTANDING_LABELS[testResult.understanding]}</h2>
          <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-slate-700">{testResult.feedback}</p>
        </section>}
      </main>
    </div>
  );
}
