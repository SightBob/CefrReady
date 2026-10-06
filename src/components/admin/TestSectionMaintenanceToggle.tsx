'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import { Wrench } from 'lucide-react';

/**
 * Admin switch ปิดปรับปรุงรายพาร์ทข้อสอบ (แยกจาก maintenance mode ทั้งเว็บ)
 * อ่าน/เขียนผ่าน /api/admin/test-sections-maintenance
 */

interface SectionsMap {
  [sectionId: string]: boolean;
}

const PARTS: Array<{ id: string; label: string; description: string }> = [
  { id: 'focus-form', label: 'Focus on Form', description: 'ปิดพาร์ท Focus on Form' },
  { id: 'focus-meaning', label: 'Focus on Meaning', description: 'ปิดพาร์ท Focus on Meaning' },
  { id: 'form-meaning', label: 'Form & Meaning', description: 'ปิดพาร์ท Form & Meaning' },
  { id: 'listening', label: 'Listening', description: 'ปิดพาร์ท Listening' },
  { id: 'full', label: 'Full Test', description: 'ปิด Full Test (สอบจำลองเต็มรูปแบบ)' },
];

export default function TestSectionMaintenanceToggle() {
  const [sections, setSections] = useState<SectionsMap | null>(null);
  const [pendingPart, setPendingPart] = useState<{ id: string; enabled: boolean } | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    fetch('/api/admin/test-sections-maintenance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { sections?: SectionsMap } | null) => setSections(data?.sections ?? null))
      .catch(() => setSections(null));
  }, []);

  const confirmToggle = async () => {
    if (!pendingPart) return;
    setIsToggling(true);
    try {
      const res = await fetch('/api/admin/test-sections-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: pendingPart.id, enabled: pendingPart.enabled }),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; sections?: SectionsMap; error?: string }
        | null;
      if (!res.ok || !data?.success) throw new Error(data?.error ?? 'toggle failed');
      setSections(data.sections ?? null);
      const label = PARTS.find((p) => p.id === pendingPart.id)?.label ?? pendingPart.id;
      toast.success(
        pendingPart.enabled ? `ปิดปรับปรุง ${label} แล้ว` : `เปิด ${label} กลับมาปกติแล้ว`,
      );
    } catch (error) {
      console.error('[TestSectionMaintenanceToggle] toggle failed:', error);
      toast.error('สลับสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsToggling(false);
      setPendingPart(null);
    }
  };

  const isUnknown = sections === null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 p-3 rounded-lg">
            <Wrench className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">ปิดปรับปรุงรายพาร์ทข้อสอบ</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isUnknown
                ? 'ไม่ทราบสถานะ (โหลดล้มเหลว)'
                : 'ปิดเฉพาะพาร์ทที่เลือก — พาร์ทอื่นและเว็บไซต์ยังใช้งานปกติ'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARTS.map((part) => {
          const isOn = sections?.[part.id] === true;
          return (
            <div
              key={part.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                isOn ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{part.label}</p>
                <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${isOn ? 'text-red-600' : 'text-slate-500'}`}>
                  <span
                    className={`h-2 w-2 rounded-full inline-block shrink-0 ${
                      isUnknown ? 'bg-slate-300' : isOn ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  {isUnknown ? 'ไม่ทราบสถานะ' : isOn ? 'ปิดปรับปรุงอยู่' : 'เปิดใช้งานปกติ'}
                </p>
              </div>
              <button
                type="button"
                disabled={isUnknown || isToggling}
                onClick={() => setPendingPart({ id: part.id, enabled: !isOn })}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isOn ? 'เปิดคืน' : 'ปิดปรับปรุง'}
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={pendingPart !== null}
        title={
          pendingPart?.enabled
            ? `ปิดปรับปรุง ${PARTS.find((p) => p.id === pendingPart?.id)?.label ?? ''}?`
            : `เปิด ${PARTS.find((p) => p.id === pendingPart?.id)?.label ?? ''} กลับมาปกติ?`
        }
        description={
          pendingPart?.enabled
            ? 'ผู้เรียนจะเข้าพาร์ทนี้ไม่ได้ และจะเห็นหน้า "ปิดปรับปรุง" แทน (พาร์ทอื่นยังใช้ได้ปกติ)'
            : 'ผู้เรียนจะกลับมาเข้าพาร์ทนี้ได้ตามปกติทันที'
        }
        confirmLabel={pendingPart?.enabled ? 'ยืนยันปิดพาร์ทนี้' : 'เปิดคืน'}
        type={pendingPart?.enabled ? 'danger' : 'info'}
        onConfirm={confirmToggle}
        onCancel={() => setPendingPart(null)}
        isLoading={isToggling}
      />
    </div>
  );
}
